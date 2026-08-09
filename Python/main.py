import os
import json
import uuid  # 用來產生唯一 ID
import asyncio
import base64
import re
import time
import copy
from collections import OrderedDict
from pathlib import Path
from typing import List, Dict, Any
from urllib.parse import quote, unquote

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from lzstring import LZString
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()
lz_compressor = LZString()

# 自動讀取同目錄下的 .env 檔案
load_dotenv()
LINE_ACCESS_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "你的_LINE_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID", "你的_LINE_USER_ID")

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

# --- 全域緩存變數區 ---
carddata_cache = []
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []
nickname_cache = []
diary_cache = []
setlist_cache = {}

ENGLISH_NAME_FILE = BASE_DIR / "englishname.json"
english_name_cache = {}
has_unsynced_en_names = False
file_write_lock = asyncio.Lock()

# 1. 記憶體計數器 (Render 重啟後自動歸零)
feature_counter = defaultdict(int)


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

def push_tags_to_github():
    if not GITHUB_TOKEN or not GITHUB_REPO or "你的_" in GITHUB_TOKEN:
        return
    file_path = "tags.json"
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
            with open(TAGS_FILE, 'r', encoding='utf-8') as f:
                content_str = f.read()
            content_base64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
            payload = {
                "message": "auto: sync tags.json [skip ci]",
                "content": content_base64,
                "branch": "main"
            }
            if sha: payload["sha"] = sha
            client.put(url, headers=headers, json=payload, timeout=10.0)
            print("[Tags] 成功 Push 至 GitHub")
    except Exception as e:
        print(f"[Tags GitHub Sync 錯誤]: {e}")

async def tag_debounce_timer():
    await asyncio.sleep(60) # 等待 60 秒
    def _write():
        with open(TAGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(tags_cache, f, ensure_ascii=False, indent=2)
    await asyncio.to_thread(_write)
    await asyncio.to_thread(push_tags_to_github)

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
        with open(file_path, 'r', encoding='utf-8') as f:
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
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache, diary_cache, tags_cache
    try:
        carddata_cache = load_json_file("carddata.json")
        card_types_cache = load_json_file("card_type.json")
        races_cache = load_json_file("races.json")
        abilities_cache = load_json_file("abilities.json")
        categoryname_cache = load_json_file("categoryname.json")
        nickname_cache = load_json_file("nickname.json")
        diary_cache = load_json_file("diary.json")
        load_english_names()
        setlist_cache = load_all_setlists()
        
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
    
# 重構 ReportModel 繼承 Base 或獨立定義，此處展示獨立定義
class ReportModel(BaseModel):
    card_name: str
    card_id: str = ""
    reporter_name: str = "熱情的決鬥者"
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

    msg_text = (
        f"🚨 【卡牌翻譯錯誤回報】\n\n📌 卡名：{report.card_name}\n🆔 卡號：{report.card_id or '未提供'}\n"
        f"🔗 連結：\n{card_link}\n\n👤 回報者：{report.reporter_name}\n📝 錯誤內容：{report.error_desc or '（無簡答內容）'}"
    )
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
async def get_carddata(): return carddata_cache

@app.get("/api/categoryname")
async def get_categoryname(): return categoryname_cache

@app.get("/api/nickname")
async def get_nickname(): return nickname_cache

@app.get("/api/setlist")
async def get_setlist(): return setlist_cache

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
    
# 2. 接收前端埋點 API (靜默接收，不阻擋)
@app.post("/api/track")
async def track_feature(request: Request):
    try:
        data = await request.json()
        feature_name = data.get("feature")
        if feature_name:
            feature_counter[feature_name] += 1
    except Exception:
        pass  # 隨緣統計，出現例外直接忽略
    return {"status": "ok"}

# 3. 讓你查看統計數據的 API
@app.get("/api/track/stats")
async def get_feature_stats():
    # 依照點擊次數由大到小排序回傳
    sorted_stats = dict(sorted(feature_counter.items(), key=lambda item: item[1], reverse=True))
    return {
        "total_events": sum(sorted_stats.values()),
        "stats": sorted_stats
    }
    
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