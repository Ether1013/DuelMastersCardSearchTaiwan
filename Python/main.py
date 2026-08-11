import os
import json
import gzip  # 👈 新增這一行
import uuid  # 用來產生唯一 ID
import asyncio
import base64
import re
import time
import copy
from collections import OrderedDict
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.parse import quote, unquote

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from lzstring import LZString
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)
lz_compressor = LZString()

# 自動讀取同目錄下的 .env 檔案
load_dotenv()
LINE_ACCESS_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "你的_LINE_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID", "你的_LINE_USER_ID")
# 新增 user 系統參數 (可從 .env 讀取，預設為 "admin")
TRACK_STATS_USER = os.getenv("TRACK_STATS_USER", "admin")

# GitHub 自動批次 Commit 設定
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.getenv("GITHUB_REPO", "").strip()

# --- Rate Limiter 設定 ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 快取配置
MAX_CACHE_SIZE = 200          # 最多快取 200 張卡圖
CACHE_TTL_SECONDS = 7 * 86400 # 圖片快取有效期限：7 天

proxy_cache = OrderedDict()
SERVER_INSTANCE_ID = str(uuid.uuid4())
TZ_UTC8 = timezone(timedelta(hours=8))

# --- 全域緩存變數區 ---
carddata_cache = []
carddata_gzip_cache = b""  # 👈 新增：存放 carddata 壓縮檔
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []
nickname_cache = []
diary_cache = []
setlist_cache = {}
setlist_gzip_cache = b""   # 👈 新增：存放 setlist 壓縮檔
# --- 在全域變數區新增參數化名單 ---
EXCLUDED_COUNTRIES = ["JP", "TW"]
one_time_tokens = {}

# 💡 Wiki 網址檢查快取配置 (最多快取 500 筆卡片判斷結果，快取 3 天)
wiki_url_cache = OrderedDict()
WIKI_CACHE_MAX_SIZE = 500
WIKI_CACHE_TTL = 3 * 86400

ENGLISH_NAME_FILE = BASE_DIR / "englishname.json"
english_name_cache = {}
has_unsynced_en_names = False
file_write_lock = asyncio.Lock()

# 1. 記憶體計數器 (Render 重啟後自動歸零)
feature_counter = defaultdict(int)
country_counter = defaultdict(int)  # 👈 新增：全域國籍次數統計
user_counter = defaultdict(int)     # 👈 新增：全域使用者次數統計
# 💡 新增：只保留最新 50 筆使用者過濾條件、參數與匯入卡表 Detail (記憶體極小且絕對不爆)
action_details_log = deque(maxlen=50)
# 新增：紀錄各國籍目前的發放編號數，以及 IP 對應的編號
ip_counter_by_country = defaultdict(int)
ip_to_user_id = {}

class PrettyJSONResponse(JSONResponse):
    # 💡 增加 media_type，確保 Response Header 包含 utf-8 編碼宣告
    media_type = "application/json; charset=utf-8"

    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,  # 💡 關鍵：保持日文/中文原字，不編碼成 \uXXXX
            indent=2
        ).encode("utf-8")

class ConsoleConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

console_manager = ConsoleConnectionManager()

# --- 定義預設標籤結構 ---
DEFAULT_TAGS = {
    "version": 1,
    "target": ["我方", "對手", "雙方"],
    "buff": [
        {"id": "b1", "name": "Buff", "is_deletable": False, "is_renamable": False},
        {"id": "b2", "name": "Debuff", "is_deletable": False, "is_renamable": False}
    ],
    "trigger_time": [
        { "id": "tr_1", "name": "攻擊", "children": [] },
        { "id": "tr_2", "name": "出場", "children": [] },
        { "id": "tr_3", "name": "離場", "children": [] },
        { "id": "tr_4", "name": "戰鬥", "children": [] },
        { "id": "tr_5", "name": "回合初", "children": [] },
        { "id": "tr_6", "name": "回合結束時", "children": [] },
        { "id": "tr_7", "name": "戰鬥後", "children": [] },
        { "id": "tr_8", "name": "攻擊後", "children": [] }
    ],
    "target_obj": [
        { "id": "t_ele", "name": "元素", "children": [
            { "id": "t_ele_bio", "name": "元素-生物", "children": [] },
            { "id": "t_ele_soul", "name": "元素-魂種", "children": [] },
            { "id": "t_ele_cg", "name": "元素-CrossGear", "children": [] },
            { "id": "t_ele_field", "name": "元素-領域", "children": [] },
            { "id": "t_ele_beat", "name": "元素-鼓動", "children": [] }
        ]},
        { "id": "t_spell", "name": "咒文", "children": [] },
        { "id": "t_nonbio", "name": "非生物", "children": [] },
        { "id": "t_castle", "name": "城", "children": [
            { "id": "t_castle_gal", "name": "城-銀河城", "children": [] }
        ]},
        { "id": "t_player", "name": "玩家", "children": [] }
    ],
    "free": []
}

TAGS_FILE = BASE_DIR / "tags.json"
tags_cache = copy.deepcopy(DEFAULT_TAGS)

# 負責管理 WebSocket 連線
class TagConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict, exclude: WebSocket = None):
        for connection in self.active_connections:
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except:
                    pass

tag_manager = TagConnectionManager()

# 1 分鐘防抖任務
tag_sync_task = None

# --- 修正後的非同步 GitHub Push 函式 ---
async def push_tags_to_github():
    if not GITHUB_TOKEN or not GITHUB_REPO or "你的_" in GITHUB_TOKEN:
        print("[Tags GitHub Sync 警告]: GITHUB_TOKEN 或 GITHUB_REPO 未設定/為預設值，跳過 Commit")
        return

    file_path = "tags.json"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{file_path}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "FastAPI-AutoCommit"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. 取得目標檔案最新的 SHA (若檔案存在)
            get_resp = await client.get(url, headers=headers)
            sha = get_resp.json().get("sha", "") if get_resp.status_code == 200 else ""

            # 2. 讀取最新本地檔案內容並轉成 Base64
            if not TAGS_FILE.exists():
                print(f"[Tags GitHub Sync 錯誤]: 找不到本地檔案 {TAGS_FILE}")
                return

            with open(TAGS_FILE, 'r', encoding='utf-8') as f:
                content_str = f.read()

            content_base64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
            payload = {
                "message": "auto: sync tags.json [skip ci]",
                "content": content_base64,
                "branch": "main"
            }
            if sha:
                payload["sha"] = sha

            # 3. 發送 PUT 請求進行 Commit & Push
            put_resp = await client.put(url, headers=headers, json=payload)
            if put_resp.status_code in [200, 201]:
                print("[Tags] 成功 Commit 併 Push 至 GitHub！")
            else:
                print(f"[Tags GitHub Sync 失敗]: HTTP {put_resp.status_code} - {put_resp.text}")

    except Exception as e:
        print(f"[Tags GitHub Sync 網路/系統錯誤]: {e}")


async def tag_debounce_timer():
    await asyncio.sleep(60)  # 等待 60 秒防抖
    try:
        # 1. 寫入本地檔案
        def _write():
            with open(TAGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(tags_cache, f, ensure_ascii=False, indent=2)
        await asyncio.to_thread(_write)

        # 2. 推送到 GitHub
        await push_tags_to_github()
    except Exception as e:
        print(f"[Tag Debounce Error]: {e}")

def get_user_id_by_ip(ip: str, country: str) -> str:
    if ip not in ip_to_user_id:
        count = ip_counter_by_country[country]
        ip_counter_by_country[country] += 1
        
        # 將數字轉為 A, B, C ... Z, AA, AB 編碼
        letters = ""
        n = count
        while True:
            letters = chr(65 + (n % 26)) + letters
            n = n // 26 - 1
            if n < 0:
                break
        ip_to_user_id[ip] = f"{country}-{letters}"
    return ip_to_user_id[ip]
    
def trigger_tag_sync():
    """每次異動時呼叫，重置 60 秒倒數計時器"""
    global tag_sync_task
    if tag_sync_task:
        tag_sync_task.cancel()
    tag_sync_task = asyncio.create_task(tag_debounce_timer())
    
    
class CustomDeckModel(BaseModel):
    deck_list: str

class DeckItem(BaseModel):
    name: str
    count: int = 1

class ExportDeckRequest(BaseModel):
    items: List[DeckItem]

card_stats_cache = {"powers": [], "costs": []}

def load_json_file(filename: str):
    file_path = BASE_DIR / filename
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f: # 💡 必須有 encoding='utf-8'
            return json.load(f)
    else:
        print(f"警告: 找不到檔案 {file_path}，將回傳空陣列。")
        return []

def load_english_names():
    global english_name_cache
    if ENGLISH_NAME_FILE.exists():
        try:
            with open(ENGLISH_NAME_FILE, 'r', encoding='utf-8') as f:
                english_name_cache = json.load(f)
        except Exception as e:
            english_name_cache = {}
    else:
        english_name_cache = {}
        save_english_names_sync()

def save_english_names_sync():
    tmp_file = ENGLISH_NAME_FILE.with_suffix(".tmp")
    try:
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(english_name_cache, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, ENGLISH_NAME_FILE)
    except Exception as e:
        if tmp_file.exists():
            os.remove(tmp_file)

async def save_english_names_async():
    async with file_write_lock:
        tmp_file = ENGLISH_NAME_FILE.with_suffix(".tmp")
        try:
            def _write():
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(english_name_cache, f, ensure_ascii=False, indent=2)
                os.replace(tmp_file, ENGLISH_NAME_FILE)
            await asyncio.to_thread(_write)
        except Exception as e:
            if tmp_file.exists():
                os.remove(tmp_file)

def push_english_names_to_github():
    if not GITHUB_TOKEN or not GITHUB_REPO or "你的_" in GITHUB_TOKEN:
        return

    file_path = "englishname.json"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{file_path}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "FastAPI-AutoCommit"
    }

    try:
        with httpx.Client() as client:
            get_resp = client.get(url, headers=headers, timeout=10.0)
            sha = get_resp.json().get("sha", "") if get_resp.status_code == 200 else ""

            with open(ENGLISH_NAME_FILE, 'r', encoding='utf-8') as f:
                content_str = f.read()

            content_base64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
            payload = {
                "message": "auto: batch update englishname.json [skip ci]",
                "content": content_base64,
                "branch": "main"
            }
            if sha:
                payload["sha"] = sha

            client.put(url, headers=headers, json=payload, timeout=10.0)
    except Exception as e:
        print(f"[GitHub Sync 網路錯誤]: {e}")

def load_all_setlists():
    merged_setlist = {}
    setlist_dir = BASE_DIR / "setlist"
    if not setlist_dir.exists() or not setlist_dir.is_dir():
        return merged_setlist

    for file_path in setlist_dir.glob("_setlist_*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and ("setcode" in data or "code" in data or "id" in data):
                    set_code = data.get("setcode") or data.get("code") or data.get("id")
                    if set_code:
                        merged_setlist[set_code] = data
                elif isinstance(data, dict):
                    merged_setlist.update(data)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            set_code = item.get("setcode") or item.get("code") or item.get("id")
                            if set_code:
                                merged_setlist[set_code] = item
        except Exception as e:
            print(f"錯誤: 讀取系列檔案 {file_path.name} 失敗: {e}")

    return merged_setlist

@app.on_event("startup")
def load_and_process_caches():
    # 👈 修改 global 宣告，補上 carddata_gzip_cache 與 setlist_gzip_cache
    global carddata_cache, carddata_gzip_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache, setlist_gzip_cache, diary_cache, tags_cache
    try:
        carddata_cache = load_json_file("carddata.json")
        # 👈 新增：預先壓縮 carddata
        carddata_json_bytes = json.dumps(carddata_cache, ensure_ascii=False).encode('utf-8')
        carddata_gzip_cache = gzip.compress(carddata_json_bytes)

        card_types_cache = load_json_file("card_type.json")
        races_cache = load_json_file("races.json")
        abilities_cache = load_json_file("abilities.json")
        categoryname_cache = load_json_file("categoryname.json")
        nickname_cache = load_json_file("nickname.json")
        diary_cache = load_json_file("diary.json")
        load_english_names()
        
        setlist_cache = load_all_setlists()
        # 👈 新增：預先壓縮 setlist
        setlist_json_bytes = json.dumps(setlist_cache, ensure_ascii=False).encode('utf-8')
        setlist_gzip_cache = gzip.compress(setlist_json_bytes)
        
        # 新增 tags 載入
        loaded_tags = load_json_file("tags.json")
        if loaded_tags:
            # 將讀取到的資料寫入 cache，同時確保舊版檔案若少了特定鍵值也能補上預設值
            tags_cache = loaded_tags
            if "target_obj" not in tags_cache:
                tags_cache["target_obj"] = copy.deepcopy(DEFAULT_TAGS["target_obj"])
            if "trigger_time" not in tags_cache:
                tags_cache["trigger_time"] = copy.deepcopy(DEFAULT_TAGS["trigger_time"])
        else:
            # 如果本地沒檔案，存一份預設的
            with open(TAGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(tags_cache, f, ensure_ascii=False, indent=2)
                

        powers, costs = set(), set()
        for card_dict in carddata_cache:
            wdata_list = card_dict.get("wdata", [])
            if isinstance(wdata_list, list):
                for w in wdata_list:
                    if isinstance(w, dict):
                        p, c = w.get("power"), w.get("cost")
                        if p is not None:
                            try: powers.add(int(p))
                            except ValueError: pass
                        if c is not None:
                            try: costs.add(int(c))
                            except ValueError: pass
                            
        card_stats_cache = {"powers": sorted(list(powers)), "costs": sorted(list(costs))}

        async def periodic_github_sync_loop():
            global has_unsynced_en_names
            while True:
                await asyncio.sleep(10800)
                if has_unsynced_en_names:
                    push_english_names_to_github()
                    has_unsynced_en_names = False

        asyncio.create_task(periodic_github_sync_loop())
    except Exception as e:
        print(f"載入緩存失敗: {e}")

# --- LINE 通知共用模型與函式 ---

class LineNotificationModel(BaseModel):
    reporter_name: str = "使用者"
    email: str = ""
    emojis: str = ""
    message: str = ""
    
# 💡 新增 email 欄位 (預設為空字串，非必填)
class ReportModel(BaseModel):
    card_name: str
    card_id: str = ""
    reporter_name: str = "熱情的決鬥者"
    email: str = ""  # 👈 新增這行
    error_desc: str = ""

class AuthorMessageModel(BaseModel):
    nickname: str = "使用者"
    email: str = ""
    emojis: str = ""
    message: str
    
def push_line_message(msg_text: str):
    """共用的 LINE Push Notification 呼叫式"""
    token, user_id = LINE_ACCESS_TOKEN.strip(), LINE_USER_ID.strip()
    if not token or not user_id or "你的_" in token:
        return

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {token}"
    }
    payload = {"to": user_id, "messages": [{"type": "text", "text": msg_text}]}
    try:
        with httpx.Client() as client:
            client.post(url, headers=headers, json=payload, timeout=5.0)
    except Exception as e:
        print(f"[LINE Push 網路錯誤]: {e}")
        
def send_line_notification(report: ReportModel, base_url: str = ""):
    raw_id = report.card_id.strip() if report.card_id and report.card_id.strip() != "(無對應卡號)" else ""
    target_param = raw_id if raw_id else report.card_name.strip()
    card_link = f"{base_url.rstrip('/')}/card.html?p={quote(target_param)}" if base_url else f"https://your-site.com/card.html?p={quote(target_param)}"

    # 動態組裝訊息行
    lines = [
        "🚨 【卡牌翻譯錯誤回報】\n",
        f"📌 卡名：{report.card_name}"
    ]

    # 有卡號才顯示
    if raw_id:
        lines.append(f"🆔 卡號：{raw_id}")

    lines.append(f"🔗 連結：\n{card_link}\n")
    lines.append(f"👤 回報者：{report.reporter_name}")

    # 有 Email 才顯示
    clean_email = report.email.strip() if report.email else ""
    if clean_email:
        lines.append(f"📧 Email：{clean_email}")

    lines.append(f"📝 錯誤內容：{report.error_desc or '（無簡答內容）'}")

    msg_text = "\n".join(lines)
    push_line_message(msg_text)

def send_author_message_notification(msg_data: AuthorMessageModel):
    """處理留言給作者的 LINE 通知格式"""
    msg_text = (
        f"💬 【收到給作者的新留言】\n\n"
        f"👤 暱稱：{msg_data.nickname or '使用者'}\n"
        f"📧 Email：{msg_data.email or '未提供'}\n"
        f"😀 表情：{msg_data.emojis or '無'}\n\n"
        f"📝 留言內容：\n{msg_data.message}"
    )
    push_line_message(msg_text)

async def fetch_english_name_from_fandom(jp_name: str, client: httpx.AsyncClient) -> str:
    global has_unsynced_en_names
    jp_name_clean = jp_name.strip()
    if not jp_name_clean:
        return jp_name

    if jp_name_clean in english_name_cache:
        return english_name_cache[jp_name_clean]

    clean_search_name = re.sub(r'（.*?）|\(.*?\)|《.*?》|＜.*?＞', '', jp_name_clean).strip() or jp_name_clean
    search_url = f"https://duelmasters.fandom.com/api.php?action=query&list=search&srsearch={quote(clean_search_name)}&format=json"

    try:
        resp = await client.get(search_url, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            search_results = resp.json().get("query", {}).get("search", [])
            if search_results:
                en_title = search_results[0].get("title", "").strip()
                if en_title:
                    english_name_cache[jp_name_clean] = en_title
                    await save_english_names_async()
                    has_unsynced_en_names = True
                    return en_title
    except Exception as e:
        print(f"[Fandom Fetch Error] {jp_name_clean} -> {e}")

    return jp_name_clean

# ----------------------------------------------------
# 工具函式區（必須放在 API 路由宣告的「上方」）
# ----------------------------------------------------
def format_card_wdata_types(card_dict):
    if not card_dict or "wdata" not in card_dict or not isinstance(card_dict["wdata"], list):
        return card_dict

    card_copy = copy.deepcopy(card_dict)
    cardtype_map = {}
    if isinstance(card_types_cache, list):
        for item in card_types_cache:
            if isinstance(item, dict):
                chi_val = item.get("text") or item.get("chi") or item.get("cht") or item.get("jap")
                if not chi_val: continue
                for k in ["value", "jap", "id", "key"]:
                    val = item.get(k)
                    if val is not None:
                        cardtype_map[str(val).strip().upper()] = chi_val

    for w in card_copy["wdata"]:
        if isinstance(w, dict):
            raw_val = w.get("type") if w.get("type") is not None else (w.get("cardtype") if w.get("cardtype") is not None else w.get("card_type"))
            target_key = raw_val[0] if isinstance(raw_val, list) and len(raw_val) > 0 else raw_val

            if target_key is not None and str(target_key).strip() != "":
                clean_key = str(target_key).strip().upper()
                w["cardtype_chi"] = cardtype_map.get(clean_key, target_key)

    return card_copy

def get_card_set_list(card_name: str):
    tw_sets, non_tw_sets, net_sets = [], [], []
    clean_target = card_name.strip()

    if isinstance(setlist_cache, dict):
        for key, set_obj in setlist_cache.items():
            card_list = set_obj.get("setcardlist") or set_obj.get("cardlist") or []
            if isinstance(card_list, list):
                has_card = any(
                    (i.get("name", "").strip() == clean_target if isinstance(i, dict) else str(i).strip() == clean_target)
                    for i in card_list
                )
                if has_card:
                    setcode = set_obj.get("setcode") or set_obj.get("code") or set_obj.get("id") or key
                    setname = set_obj.get("setname") or set_obj.get("name") or setcode
                    is_tw = set_obj.get("istw") == True
                    upper_code = str(setcode).strip().upper()
                    is_net = not upper_code.startswith('D') and not upper_code.startswith('O')

                    display_str = f"{setcode}{setname}"
                    if is_net:
                        net_sets.append(display_str)
                    elif is_tw:
                        tw_sets.append(display_str)
                    else:
                        non_tw_sets.append(display_str)

    return {"tw": tw_sets, "non_tw": non_tw_sets, "net": net_sets}


# ----------------------------------------------------
# 路由區
# ----------------------------------------------------
@app.get("/")
async def serve_index(): return FileResponse("index.html")

@app.get("/pop.html")
async def get_pop_page(): return FileResponse("pop.html")

@app.get("/card.html")
async def get_card_page(): return FileResponse("card.html")

@app.get("/relationship.html")
async def get_relationship_page(): return FileResponse("relationship.html")

@app.get("/api/server_id")
async def get_server_id(): return {"server_id": SERVER_INSTANCE_ID}

@app.get("/api/card_types")
async def get_card_types(): return card_types_cache

@app.get("/api/races")
async def get_races(): return races_cache

@app.get("/api/abilities")
async def get_abilities(): return abilities_cache

@app.get("/api/carddata")
async def get_carddata(): 
    # 👈 直接回傳記憶體中的壓縮 Bytes，附帶 gzip 標頭
    return Response(
        content=carddata_gzip_cache, 
        media_type="application/json", 
        headers={"Content-Encoding": "gzip"}
    )

@app.get("/api/categoryname")
async def get_categoryname(): return categoryname_cache

@app.get("/api/nickname")
async def get_nickname(): return nickname_cache

@app.get("/api/setlist")
async def get_setlist(): 
    # 👈 直接回傳記憶體中的壓縮 Bytes，附帶 gzip 標頭
    return Response(
        content=setlist_gzip_cache, 
        media_type="application/json", 
        headers={"Content-Encoding": "gzip"}
    )

@app.get("/api/card_detail")
@limiter.limit("6/minute")
async def get_card_detail(request: Request, p: str = Query(..., description="卡牌名稱或ID/卡號")):
    query_str = p.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="請提供卡牌名稱或ID")

    # 正規化 ID (全形轉半形、轉大寫、剔除非英數字)
    def normalize_id(s: str) -> str:
        if not s:
            return ""
        res = []
        for ch in str(s):
            code = ord(ch)
            if 0xFF01 <= code <= 0xFF5E:
                res.append(chr(code - 0xfee0))
            else:
                res.append(ch)
        import re
        return re.sub(r'[^A-Z0-9]', '', "".join(res).upper())

    clean_query = normalize_id(query_str)

    # ----------------------------------------------------
    # 邏輯 A：先嘗試以「卡名」精確或暱稱模糊尋找卡牌
    # ----------------------------------------------------
    matched_card = None
    target_card_name = None

    for card in carddata_cache:
        c_name = card.get("name", "").strip()
        if c_name == query_str:
            matched_card = card
            target_card_name = c_name
            break

    if not matched_card and isinstance(nickname_cache, list):
        for nick_item in nickname_cache:
            nicknames = nick_item.get("nicknames", [])
            if query_str in nicknames:
                real_name = nick_item.get("realname")
                matched_card = next((c for c in carddata_cache if c.get("name", "").strip() == real_name), None)
                if matched_card:
                    target_card_name = real_name
                    break

    # 🎯 當以卡名找到時：不上鎖任何特定商品 ID
    if matched_card and target_card_name:
        import copy
        card_to_return = copy.deepcopy(matched_card)

        # 💡 若卡片本尊 pic 為空，向其他商品「借用」圖片
        if not card_to_return.get("pic"):
            borrowed_pic = ""
            for set_info in setlist_cache.values():
                card_list = set_info.get("setcardlist") or set_info.get("cardlist") or []
                for item in card_list:
                    if isinstance(item, dict) and item.get("name", "").strip() == target_card_name:
                        pics = item.get("pic")
                        if isinstance(pics, list) and len(pics) > 0 and pics[0]:
                            borrowed_pic = pics[0]
                            break
                        elif isinstance(pics, str) and pics:
                            borrowed_pic = pics
                            break
                if borrowed_pic:
                    break
            if borrowed_pic:
                card_to_return["pic"] = borrowed_pic

        processed_card = format_card_wdata_types(card_to_return)
        return {
            "found_by": "name",
            "card": processed_card,
            "setdata": None,        # 不指定任何特定商品
            "matched_id": "",       # 不載入任何 ID
            "matched_index": 0,
            "set_list": get_card_set_list(target_card_name),
            "races": races_cache,
            "abilities": abilities_cache,
            "card_types": card_types_cache
        }

    # ----------------------------------------------------
    # 邏輯 B：若卡名找不到，才以「ID / 卡號」搜尋特定商品版本
    # ----------------------------------------------------
    def search_by_id(target_id_clean: str):
        """輔助函式：傳入正規化後的 ID 進行 setlist 掃描"""
        m_setdata = None
        t_card_name = None
        m_id_val = ""
        m_index = 0

        for set_code, set_info in setlist_cache.items():
            card_list = set_info.get("setcardlist") or set_info.get("cardlist") or []
            name_occurrence_counter = {}

            for item in card_list:
                if isinstance(item, dict):
                    item_name = item.get("name", "").strip()
                    current_occ = name_occurrence_counter.get(item_name, 0)
                    
                    if "id" in item:
                        ids = item["id"] if isinstance(item["id"], list) else [item["id"]]
                        for idx, single_id in enumerate(ids):
                            if normalize_id(single_id) == target_id_clean:
                                m_setdata = set_info
                                t_card_name = item_name
                                m_id_val = single_id
                                m_index = current_occ + idx
                                break
                    
                    ids_count = len(item["id"]) if isinstance(item.get("id"), list) else 1
                    name_occurrence_counter[item_name] = current_occ + ids_count

                if m_setdata:
                    break
            if m_setdata:
                break
        return m_setdata, t_card_name, m_id_val, m_index

    # 第一次比對：使用原始規整後的 clean_query
    matched_setdata, target_card_name, matched_id_val, matched_index = search_by_id(clean_query)

    # 💡 第一次找不到，且輸入以 DM (不分大小寫) 開頭時：去處 DM 再找第二次
    if not matched_setdata and query_str.upper().startswith("DM"):
        stripped_query = query_str[2:].strip()
        if stripped_query:
            clean_query_stripped = normalize_id(stripped_query)
            matched_setdata, target_card_name, matched_id_val, matched_index = search_by_id(clean_query_stripped)

    # 如果找到商品與卡牌名稱，打包成果回傳
    if matched_setdata and target_card_name:
        matched_card = next((c for c in carddata_cache if c.get("name", "").strip() == target_card_name), None)
        if not matched_card:
            matched_card = {"name": target_card_name, "wdata": []}

        processed_card = format_card_wdata_types(matched_card)

        return {
            "found_by": "id",
            "card": processed_card,
            "setdata": matched_setdata,
            "matched_id": matched_id_val,
            "matched_index": matched_index,
            "set_list": get_card_set_list(target_card_name),
            "races": races_cache,
            "abilities": abilities_cache,
            "card_types": card_types_cache
        }

    raise HTTPException(status_code=404, detail=f"查無卡名或 ID 為 '{p}' 的卡牌資料")

@app.get("/api/get_english_name")
@limiter.limit("20/minute")
async def get_english_name(request: Request, name: str = Query(..., description="日文卡名")):
    jp_name = name.strip()
    if not jp_name:
        raise HTTPException(status_code=400, detail="請提供日文卡名")

    from_cache = jp_name in english_name_cache
    async with httpx.AsyncClient(timeout=6.0) as client:
        en_name = await fetch_english_name_from_fandom(jp_name, client)

    if en_name and en_name != jp_name:
        return {"status": "success", "jp_name": jp_name, "en_name": en_name, "from_cache": from_cache}

    raise HTTPException(status_code=404, detail=f"查無卡牌「{jp_name}」的英文名稱")

@app.post("/api/export_english_deck")
@limiter.limit("10/minute")
async def export_english_deck(request: Request, payload: ExportDeckRequest):
    if not payload.items:
        raise HTTPException(status_code=400, detail="牌組清單不可為空")

    semaphore = asyncio.Semaphore(3)
    async def fetch_item_with_throttle(item: DeckItem, client: httpx.AsyncClient):
        async with semaphore:
            await asyncio.sleep(0.15)
            en_name = await fetch_english_name_from_fandom(item.name, client)
            return {"jp_name": item.name, "en_name": en_name, "count": item.count}

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [fetch_item_with_throttle(item, client) for item in payload.items]
        results = await asyncio.gather(*tasks)

    return {"status": "success", "result": results}

@app.get("/api/pop/{set_code}")
async def get_pop_data(set_code: str):
    current_set = setlist_cache.get(set_code)
    if not current_set:
        raise HTTPException(status_code=404, detail=f"找不到代碼為 '{set_code}' 的商品資料")

    set_card_list = current_set.get("setcardlist") or current_set.get("cardlist") or []
    order_map = {}
    for index, item in enumerate(set_card_list):
        item_name = item.get("name") if isinstance(item, dict) else item
        if isinstance(item_name, str):
            clean_name = item_name.strip()
            if clean_name not in order_map:
                order_map[clean_name] = index

    matched_cards = []
    for card in carddata_cache:
        c_name = card.get("name")
        if c_name and c_name.strip() in order_map:
            matched_cards.append(card)

    matched_cards.sort(key=lambda c: order_map.get(c.get("name", "").strip(), 999999))
    return {"set_info": current_set, "cards": matched_cards}

@app.post("/api/pop_custom")
async def get_pop_custom_data(payload: CustomDeckModel):
    compressed = payload.deck_list.strip()
    if not compressed:
        raise HTTPException(status_code=400, detail="密碼不可為空")

    decompressed = lz_compressor.decompressFromEncodedURIComponent(compressed) or compressed
    raw_items = decompressed.split(',')
    custom_card_list = []
    
    for item in raw_items:
        item = item.strip()
        if not item: continue
        if '*' in item:
            parts = item.split('*', 1)
            try:
                count, cname = int(parts[0]), parts[1].strip()
            except ValueError:
                count, cname = 1, item
        else:
            count, cname = 1, item
            
        custom_card_list.append({"name": cname, "count": count})

    order_map = {str(item["name"]).strip(): index for index, item in enumerate(custom_card_list)}
    matched_cards = [card for card in carddata_cache if card.get("name") and card.get("name").strip() in order_map]
    matched_cards.sort(key=lambda c: order_map.get(c.get("name", "").strip(), 999999))

    return {
        "set_info": {
            "setcode": "NET-CUSTOM", "setname": "自訂分享卡表", "isdeck": True, "istw": True, "setcardlist": custom_card_list
        },
        "cards": matched_cards
    }

@app.get("/api/card_stats")
def get_card_stats(): return card_stats_cache

@app.get("/api/proxy-image")
@limiter.limit("5/minute")
async def proxy_image(request: Request, url: str = Query(...)):
    now = time.time()
    if url in proxy_cache:
        item = proxy_cache[url]
        if now - item["timestamp"] < CACHE_TTL_SECONDS:
            item["timestamp"] = now
            proxy_cache.move_to_end(url)
            return Response(content=item["content"], media_type=item["content_type"], headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400"})
        else:
            del proxy_cache[url]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}, timeout=8.0)
            if resp.status_code != 200: raise HTTPException(status_code=resp.status_code, detail="Failed to fetch image")

            content_type = resp.headers.get("content-type", "image/jpeg")
            if len(proxy_cache) >= MAX_CACHE_SIZE: proxy_cache.popitem(last=False)

            proxy_cache[url] = {"content": resp.content, "content_type": content_type, "timestamp": now}
            return Response(content=resp.content, media_type=content_type, headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image proxy error: {str(e)}")

@app.get("/api/diary")
async def get_diary(): return diary_cache

@app.post("/api/report_error")
@limiter.limit("3/minute")
async def report_error(request: Request, report: ReportModel, background_tasks: BackgroundTasks):
    if not report.card_name: raise HTTPException(status_code=400, detail="卡牌名稱為必填項目")
    background_tasks.add_task(send_line_notification, report, str(request.base_url))
    name = report.reporter_name.strip() if report.reporter_name and report.reporter_name.strip() else "熱情的決鬥者"
    return {"status": "success", "message": f"回報成功！感謝{name}！"}

@app.get("/api/get_all_english_names")
async def get_all_english_names(): return english_name_cache

@app.post("/api/message_author")
@limiter.limit("3/minute")
async def message_author(request: Request, payload: AuthorMessageModel, background_tasks: BackgroundTasks):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="留言內容為必填項目")
    
    # 限制表情文字上限（避免惡意過長輸入）
    if len(payload.emojis) > 20:
        raise HTTPException(status_code=400, detail="表情符號最多選擇 20 個")

    background_tasks.add_task(send_author_message_notification, payload)
    nickname = payload.nickname.strip() if payload.nickname and payload.nickname.strip() else "使用者"
    return {"status": "success", "message": f"留言已成功送出！感謝 {nickname} 的建議與支持！"}
    
@app.post("/api/track")
async def track_feature(request: Request):
    try:
        client_host = request.client.host if request.client else ""
        request_host = request.headers.get("host", "")

        is_localhost = (
            client_host in ["127.0.0.1", "::1"] or 
            "localhost" in request_host or 
            "127.0.0.1" in request_host
        )

        if is_localhost:
            return {"status": "skipped", "reason": "localhost environment"}

        data = await request.json()
        feature_name = data.get("feature")
        detail = data.get("detail")
        country = get_client_country(request)
        
        # 💡 新增：取得真實 IP 並生成 User ID
        client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for") or client_host
        if client_ip and "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        user_id = get_user_id_by_ip(client_ip, country)

        if feature_name:
            feature_counter[feature_name] += 1
            country_counter[country] += 1       # 👈 新增：全域國籍次數累加
            user_counter[user_id] += 1         # 👈 新增：全域使用者次數累加
            now_utc8 = datetime.now(TZ_UTC8).strftime("%Y-%m-%d %H:%M:%S")

            entry = {
                "feature": feature_name,
                "country": country,
                "user": user_id,
                "detail": detail,
                "time": now_utc8
            }

            action_details_log.appendleft(entry)

            # 廣播給所有連接在 WebSocket Console 的用戶
            sorted_stats = dict(sorted(feature_counter.items(), key=lambda item: item[1], reverse=True))
            sorted_country_stats = dict(sorted(country_counter.items(), key=lambda item: item[1], reverse=True))
            sorted_user_stats = dict(sorted(user_counter.items(), key=lambda item: item[1], reverse=True))

            await console_manager.broadcast({
                "total_events": sum(sorted_stats.values()),
                "stats": sorted_stats,
                "country_stats": sorted_country_stats,  # 👈 新增：全域國籍統計
                "user_stats": sorted_user_stats,        # 👈 新增：全域使用者統計
                "recent_50_details": list(action_details_log)
            })

    except Exception:
        pass
    return {"status": "ok"}

@app.get("/api/track/stats")
async def get_feature_stats(
    request: Request, 
    admin: Optional[str] = Query(None, description="admin"),
    token: Optional[str] = Query(None, description="token"),
    format: Optional[str] = Query(None)
):
    accept_header = request.headers.get("accept", "")
    is_html = "text/html" in accept_header and format != "json"

    # 💡 清理已過期的 Token
    now = time.time()
    for k in list(one_time_tokens.keys()):
        if one_time_tokens[k]["expires_at"] < now:
            del one_time_tokens[k]

    # 💡 權限驗證邏輯
    authorized = False
    if admin and admin == TRACK_STATS_USER:
        authorized = True
    elif token and token in one_time_tokens:
        if is_html:
            # 如果是載入網頁 (F5 或首次進入)，檢查是否已被存取過 HTML
            if one_time_tokens[token]["html_accessed"]:
                raise HTTPException(status_code=403, detail="此 Token 已被使用或已失效 (重新整理即失效)")
            one_time_tokens[token]["html_accessed"] = True
        authorized = True

    if not authorized:
        raise HTTPException(status_code=404, detail="Not Found")

    # 若為瀏覽器網頁請求，回傳 console.html
    if is_html:
        if Path("console.html").exists():
            return FileResponse("console.html")

    # 否則回傳原有 JSON 統計資料
    sorted_stats = dict(sorted(feature_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_country_stats = dict(sorted(country_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_user_stats = dict(sorted(user_counter.items(), key=lambda item: item[1], reverse=True))

    result = {
        "total_events": sum(sorted_stats.values()),
        "stats": sorted_stats,
        "country_stats": sorted_country_stats,  # 👈 新增全域資料
        "user_stats": sorted_user_stats,        # 👈 新增全域資料
        "recent_50_details": list(action_details_log)
    }
    return PrettyJSONResponse(content=result)  # 👈 請補上這一行

@app.websocket("/ws/console")
async def websocket_console(
    websocket: WebSocket, 
    admin: Optional[str] = Query(None),
    token: Optional[str] = Query(None)
):
    now = time.time()
    authorized = False
    if admin and admin == TRACK_STATS_USER:
        authorized = True
    elif token and token in one_time_tokens:
        if one_time_tokens[token]["expires_at"] >= now:
            authorized = True

    if not authorized:
        await websocket.close(code=4008)
        return

    await console_manager.connect(websocket)
    # 建立連線時立即發送一次當前最新數據
    sorted_stats = dict(sorted(feature_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_country_stats = dict(sorted(country_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_user_stats = dict(sorted(user_counter.items(), key=lambda item: item[1], reverse=True))

    await websocket.send_json({
        "total_events": sum(sorted_stats.values()),
        "stats": sorted_stats,
        "country_stats": sorted_country_stats,  # 👈 新增全域資料
        "user_stats": sorted_user_stats,        # 👈 新增全域資料
        "recent_50_details": list(action_details_log)
    })

def get_client_country(request: Request) -> str:
    """取得請求來源的國籍 ISO 代碼（含 localhost = TW 判斷）"""
    # 1. 判斷是否為 Localhost
    client_host = request.client.host if request.client else ""
    request_host = request.headers.get("host", "")
    
    if client_host in ["127.0.0.1", "::1"] or "localhost" in request_host or "127.0.0.1" in request_host:
        return "TW"
        
    # 2. 優先從 Render / Cloudflare 轉發的 Header 取得國籍代碼
    country = request.headers.get("cf-ipcountry") or request.headers.get("x-country-code")
    if country and country.upper() != "XX":  # XX 代表未知國籍
        return country.upper()
    
    return "Unknown"
    
def find_and_remove_node(node_list, target_id):
    """遞迴在樹狀結構中尋找並移除節點，回傳該節點與其內容"""
    for i, node in enumerate(node_list):
        if node.get("id") == target_id:
            return node_list.pop(i)
        if "children" in node:
            found = find_and_remove_node(node["children"], target_id)
            if found: return found
    return None

def find_node(node_list, target_id):
    """遞迴尋找節點"""
    for node in node_list:
        if node.get("id") == target_id: return node
        if "children" in node:
            found = find_node(node["children"], target_id)
            if found: return found
    return None

@app.get("/tags.html")
async def get_tags_page(): 
    return FileResponse("tags.html")

@app.get("/EtherLineQRCode.jpg")
async def getLineQRCode(): 
    return FileResponse("EtherLineQRCode.jpg")

@app.websocket("/ws/tags")
async def websocket_tags(websocket: WebSocket):
    await tag_manager.connect(websocket)
    await websocket.send_json({"type": "FULL_SYNC", "data": tags_cache})
    
    try:
        while True:
            msg = await websocket.receive_json()
            action = msg.get("action")
            category = msg.get("category")
            data = msg.get("data", {})
            
            # (約在接收 msg 之後)
            if category not in ["buff", "free", "target_obj", "trigger_time"]:
                continue
                
            cat_list = tags_cache[category]
            
            # 判斷當前操作的分類是否屬於「樹狀結構」
            is_tree_category = category in ["free", "target_obj", "trigger_time"]
            
            # --- 處理相對操作 ---
            if action == "ADD":
                new_node = {
                    "id": data["id"],
                    "name": data["name"],
                    "is_deletable": True, "is_renamable": True
                }
                if is_tree_category:
                    new_node["children"] = []
                    parent_id = data.get("parent_id")
                    if parent_id:
                        parent_node = find_node(cat_list, parent_id)
                        if parent_node: 
                            parent_node.setdefault("children", []).append(new_node)
                        else: 
                            cat_list.append(new_node)
                    else:
                        cat_list.append(new_node)
                else: 
                    cat_list.append(new_node)
                    
            elif action == "RENAME":
                target = find_node(cat_list, data["id"]) if is_tree_category else next((n for n in cat_list if n["id"] == data["id"]), None)
                if target and target.get("is_renamable", True):
                    target["name"] = data["name"]
                    
            elif action == "DELETE":
                if is_tree_category:
                    find_and_remove_node(cat_list, data["id"])
                else:
                    target = next((n for n in cat_list if n["id"] == data["id"]), None)
                    if target and target.get("is_deletable", True):
                        cat_list.remove(target)
                        
            elif action == "MOVE" and is_tree_category:
                node_id = data["id"]
                target_parent_id = data.get("target_parent_id") # null 代表移到根目錄
                
                # 1. 先把它從舊位置拔出來
                moved_node = find_and_remove_node(cat_list, node_id)
                if moved_node:
                    # 2. 塞入新位置
                    if target_parent_id:
                        parent_node = find_node(cat_list, target_parent_id)
                        if parent_node:
                            parent_node.setdefault("children", []).append(moved_node)
                        else:
                            cat_list.append(moved_node) # 找不到父節點就放根目錄
                    else:
                        cat_list.append(moved_node)

            # 廣播異動
            await tag_manager.broadcast({
                "type": "UPDATE_CATEGORY",
                "category": category,
                "data": tags_cache[category]
            })
            
            # 觸發 60 秒防抖存檔
            trigger_tag_sync()

    except WebSocketDisconnect:
        tag_manager.disconnect(websocket)
        
# --- 新增這支 API 供 3 支前端共用判斷 ---
@app.get("/api/check_sp_replace")
async def check_sp_replace(request: Request):
    country = get_client_country(request)
    # 如果國籍「不在」排除名單內，就代表需要執行替換
    need_replace = country not in EXCLUDED_COUNTRIES
    return {"country": country, "need_replace": need_replace}
    
@app.post("/api/console/generate_token")
async def generate_console_token(admin: str = Query(...)):
    # 只有真正的 Admin 才能產生 Token
    if admin != TRACK_STATS_USER:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    new_token = uuid.uuid4().hex
    one_time_tokens[new_token] = {
        "expires_at": time.time() + 3600,  # 1 小時後過期
        "html_accessed": False             # 記錄是否已經被讀取過網頁 HTML
    }
    return {"status": "success", "token": new_token}
    
    
@app.get("/api/check_wiki_url")
async def check_wiki_url(card_name: str = Query(..., description="處理後的卡名")):
    clean_name = card_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="請提供卡名")

    now = time.time()

    # 1. 優先從記憶體快取讀取結果 (0 流量、秒回)
    if clean_name in wiki_url_cache:
        item = wiki_url_cache[clean_name]
        if now - item["timestamp"] < WIKI_CACHE_TTL:
            wiki_url_cache.move_to_end(clean_name)
            return item["data"]
        else:
            del wiki_url_cache[clean_name]

    direct_url = f"https://dmwiki.net/《{quote(clean_name)}》"
    fallback_google_url = f"https://www.google.com/search?q={quote(clean_name + ' site:dmwiki.net')}"

    # 模擬更完整的瀏覽器 Header，降低被防護機制誤判的機率
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,zh-TW;q=0.9,en;q=0.8"
    }
    result_data = {"target_url": fallback_google_url, "type": "fallback"}

    try:
        # 2. 超時限制設為 2.5 秒，讀取前 8KB 進行判定
        async with httpx.AsyncClient(timeout=2.5, follow_redirects=True) as client:
            async with client.stream("GET", direct_url, headers=headers) as resp:
                if resp.status_code == 200:
                    chunk_text = ""
                    async for chunk in resp.aiter_text():
                        chunk_text += chunk
                        if len(chunk_text) >= 8192:
                            break  # 判定資訊已足夠，主動中斷傳輸
                    
                    # 💡 關鍵修復：擴充無效頁面與錯誤訊息的判斷關鍵字
                    invalid_keywords = [
                        "は存在しません", 
                        "ページ名変更", 
                        "Spam check failed", 
                        "Runtime error", 
                        "Match:ipcountry"
                    ]
                    
                    # 只要不包含任何錯誤關鍵字，才判定為正常的直連頁面
                    if not any(kw in chunk_text for kw in invalid_keywords):
                        result_data = {"target_url": direct_url, "type": "direct"}

    except Exception as e:
        print(f"[Wiki Check Exception/Timeout] {e}")

    # 3. 寫入快取，保護伺服器與 Wiki 流量
    if len(wiki_url_cache) >= WIKI_CACHE_MAX_SIZE:
        wiki_url_cache.popitem(last=False)
    wiki_url_cache[clean_name] = {"data": result_data, "timestamp": now}

    return result_data
    
@app.delete("/api/track/delete_user_logs")
async def delete_user_logs(
    user_id: str = Query(..., description="要刪除 Log 的使用者代稱，例如 TW-A"),
    admin: Optional[str] = Query(None)
):
    # 權限驗證：僅允許 Admin 執行刪除，Token 無權呼叫
    if not admin or admin != TRACK_STATS_USER:
        raise HTTPException(status_code=403, detail="Forbidden")

    # 1. 局部刪除主機記憶體 action_details_log 中的該使用者紀錄
    global action_details_log
    filtered_logs = [log for log in action_details_log if (log.get("user") or log.get("country") or "Unknown") != user_id]
    action_details_log = deque(filtered_logs, maxlen=50)

    # 1.5 扣除/重置該使用者的累計計數
    if user_id in user_counter:
        del user_counter[user_id]

    # 2. 重新計算統計數據並廣播給 console manager
    sorted_stats = dict(sorted(feature_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_country_stats = dict(sorted(country_counter.items(), key=lambda item: item[1], reverse=True))
    sorted_user_stats = dict(sorted(user_counter.items(), key=lambda item: item[1], reverse=True))

    await console_manager.broadcast({
        "total_events": sum(sorted_stats.values()),
        "stats": sorted_stats,
        "country_stats": sorted_country_stats,
        "user_stats": sorted_user_stats,
        "recent_50_details": list(action_details_log)
    })