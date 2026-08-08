import os
import json
import uuid  # 用來產生唯一 ID
import asyncio
import base64
import re
import time
from collections import OrderedDict
from pathlib import Path
from typing import List, Dict, Any
from urllib.parse import quote, unquote

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse
from lzstring import LZString
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()
lz_compressor = LZString()

# 自動讀取同目錄下的 .env 檔案
load_dotenv()
LINE_ACCESS_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "你的_LINE_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID", "你的_LINE_USER_ID")

# GitHub 自動批次 Commit 設定
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.getenv("GITHUB_REPO", "").strip()  # 範例："ether1013/DuelMastersCardSearchTaiwan"

# --- 1. Rate Limiter 設定 ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 快取配置
MAX_CACHE_SIZE = 200          # 最多快取 200 張卡圖 (約 30~50MB RAM)
CACHE_TTL_SECONDS = 7 * 86400 # 圖片快取有效期限：7 天 (秒)

proxy_cache = OrderedDict()
SERVER_INSTANCE_ID = str(uuid.uuid4())

# --- 全域緩存變數區 ---
carddata_cache = []
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []  # 分類名稱快取
nickname_cache = []      # 暱稱快取
diary_cache = []         # 日記快取
setlist_cache = {}       # 系列清單合併快取

# 英文卡名快取全域變數與同步鎖 ( Lock 避免並發寫檔問題 )
ENGLISH_NAME_FILE = BASE_DIR / "englishname.json"
english_name_cache = {}
has_unsynced_en_names = False
file_write_lock = asyncio.Lock()

class CustomDeckModel(BaseModel):
    deck_list: str

class DeckItem(BaseModel):
    name: str
    count: int = 1

class ExportDeckRequest(BaseModel):
    items: List[DeckItem]

card_stats_cache = {"powers": [], "costs": []}

def load_json_file(filename: str):
    """輔助函式：從伺服器本機讀取 JSON 檔案"""
    file_path = BASE_DIR / filename
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        print(f"警告: 找不到檔案 {file_path}，將回傳空陣列。")
        return []

def load_english_names():
    """啟動時讀取 englishname.json"""
    global english_name_cache
    if ENGLISH_NAME_FILE.exists():
        try:
            with open(ENGLISH_NAME_FILE, 'r', encoding='utf-8') as f:
                english_name_cache = json.load(f)
                print(f"-> englishname.json 載入完成，共計 {len(english_name_cache)} 筆對照。")
        except Exception as e:
            print(f"錯誤: 讀取 englishname.json 失敗: {e}")
            english_name_cache = {}
    else:
        english_name_cache = {}
        save_english_names_sync()

def save_english_names_sync():
    """同步版本的原子寫檔，僅供啟動初始化使用"""
    tmp_file = ENGLISH_NAME_FILE.with_suffix(".tmp")
    try:
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(english_name_cache, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, ENGLISH_NAME_FILE)
    except Exception as e:
        print(f"寫入 englishname.json 失敗: {e}")
        if tmp_file.exists():
            os.remove(tmp_file)

async def save_english_names_async():
    """非同步 Atomic Write 安全寫入檔案，確保多執行緒/任務不會寫入髒值"""
    async with file_write_lock:
        tmp_file = ENGLISH_NAME_FILE.with_suffix(".tmp")
        try:
            # 於獨立 ThreadPool 執行阻塞型 I/O 操作
            def _write():
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(english_name_cache, f, ensure_ascii=False, indent=2)
                os.replace(tmp_file, ENGLISH_NAME_FILE)
            await asyncio.to_thread(_write)
        except Exception as e:
            print(f"非同步寫入 englishname.json 失敗: {e}")
            if tmp_file.exists():
                os.remove(tmp_file)

def push_english_names_to_github():
    """自動將 englishname.json 批次 Commit 並 Push 至 GitHub Repo"""
    if not GITHUB_TOKEN or not GITHUB_REPO or "你的_" in GITHUB_TOKEN:
        print("[GitHub Sync] 未設定正確的 GITHUB_TOKEN 或 GITHUB_REPO，跳過 Commit")
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
            sha = ""
            if get_resp.status_code == 200:
                sha = get_resp.json().get("sha", "")

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

            put_resp = client.put(url, headers=headers, json=payload, timeout=10.0)
            if put_resp.status_code in [200, 201]:
                print(f"[GitHub Sync 成功] 新增的英文卡名已批次 Commit 至 Repo: {GITHUB_REPO}")
            else:
                print(f"[GitHub Sync 失敗] 狀態碼 {put_resp.status_code}: {put_resp.text}")

    except Exception as e:
        print(f"[GitHub Sync 網路錯誤]: {e}")

def load_all_setlists():
    """載入 setlist 資料夾下所有 _setlist_xxxxx.json"""
    merged_setlist = {}
    setlist_dir = BASE_DIR / "setlist"
    
    if not setlist_dir.exists() or not setlist_dir.is_dir():
        print(f"警告: 找不到資料夾 {setlist_dir}，將回傳空物件。")
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

            print(f"  └─ 已成功載入系列檔: {file_path.name}")
        except Exception as e:
            print(f"錯誤: 讀取系列檔案 {file_path.name} 失敗: {e}")

    return merged_setlist

# --- 伺服器啟動時執行 ---
@app.on_event("startup")
def load_and_process_caches():
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache, diary_cache
    
    print("正在從本機 JSON 檔案載入所有資料至伺服器記憶體緩存...")
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

        powers = set()
        costs = set()
        for card_dict in carddata_cache:
            wdata_list = card_dict.get("wdata", [])
            if isinstance(wdata_list, list):
                for w in wdata_list:
                    if isinstance(w, dict):
                        p = w.get("power")
                        if p is not None:
                            try: powers.add(int(p))
                            except ValueError: pass
                        c = w.get("cost")
                        if c is not None:
                            try: costs.add(int(c))
                            except ValueError: pass
                            
        card_stats_cache = {
            "powers": sorted(list(powers)),
            "costs": sorted(list(costs))
        }

        async def periodic_github_sync_loop():
            global has_unsynced_en_names
            while True:
                await asyncio.sleep(10800)  # 每 3 小時檢查一次
                if has_unsynced_en_names:
                    print("[GitHub Sync] 偵測到有未同步的新英文卡名，發起批次 Commit...")
                    push_english_names_to_github()
                    has_unsynced_en_names = False

        asyncio.create_task(periodic_github_sync_loop())

        print("所有緩存與預處理載入完畢！")
    except Exception as e:
        print(f"載入緩存失敗: {e}")

class ReportModel(BaseModel):
    card_name: str
    card_id: str = ""
    reporter_name: str = "熱情的決鬥者"
    error_desc: str = ""

def send_line_notification(report: ReportModel, base_url: str = ""):
    token = LINE_ACCESS_TOKEN.strip() if LINE_ACCESS_TOKEN else ""
    user_id = LINE_USER_ID.strip() if LINE_USER_ID else ""

    if not token or not user_id or "你的_" in token:
        return

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {token}"
    }

    raw_id = report.card_id.strip() if report.card_id and report.card_id.strip() != "(無對應卡號)" else ""
    target_param = raw_id if raw_id else report.card_name.strip()
    card_link = f"{base_url.rstrip('/')}/card.html?p={quote(target_param)}" if base_url else f"https://your-site.com/card.html?p={quote(target_param)}"

    msg_text = (
        f"🚨 【卡牌翻譯錯誤回報】\n\n"
        f"📌 卡名：{report.card_name}\n"
        f"🆔 卡號：{report.card_id or '未提供'}\n"
        f"🔗 連結：\n{card_link}\n\n"
        f"👤 回報者：{report.reporter_name}\n"
        f"📝 錯誤內容：{report.error_desc or '（無簡答內容）'}"
    )

    payload = {"to": user_id, "messages": [{"type": "text", "text": msg_text}]}

    try:
        with httpx.Client() as client:
            client.post(url, headers=headers, json=payload, timeout=5.0)
    except Exception as e:
        print(f"[LINE Push 網路錯誤]: {e}")

# --- 核心不同步查詢英文名 logic ---
async def fetch_english_name_from_fandom(jp_name: str, client: httpx.AsyncClient) -> str:
    """抽出的核心邏輯：查詢單張日文卡牌的英文名（含快取與爬蟲）"""
    global has_unsynced_en_names

    jp_name_clean = jp_name.strip()
    if not jp_name_clean:
        return jp_name

    # 1. 優先命中快取
    if jp_name_clean in english_name_cache:
        return english_name_cache[jp_name_clean]

    # 2. 清理卡名並打 Fandom API
    clean_search_name = re.sub(r'（.*?）|\(.*?\)|《.*?》|＜.*?＞', '', jp_name_clean).strip() or jp_name_clean
    search_url = f"https://duelmasters.fandom.com/api.php?action=query&list=search&srsearch={quote(clean_search_name)}&format=json"

    try:
        resp = await client.get(search_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        if resp.status_code == 200:
            data = resp.json()
            search_results = data.get("query", {}).get("search", [])

            if search_results:
                en_title = search_results[0].get("title", "").strip()
                if en_title:
                    english_name_cache[jp_name_clean] = en_title
                    await save_english_names_async()
                    has_unsynced_en_names = True
                    return en_title
    except Exception as e:
        print(f"[Fandom Fetch Error] {jp_name_clean} -> {e}")

    # 若查無英文名，降級回傳原日文名
    return jp_name_clean


# --- 路由區 ---

@app.get("/")
async def serve_index():
    return FileResponse("index.html")

@app.get("/pop.html")
async def get_pop_page():
    return FileResponse("pop.html")

@app.get("/card.html")
async def get_card_page():
    return FileResponse("card.html")

@app.get("/api/server_id")
async def get_server_id():
    return {"server_id": SERVER_INSTANCE_ID}

@app.get("/api/card_types")
async def get_card_types():
    return card_types_cache

@app.get("/api/races")
async def get_races():
    return races_cache

@app.get("/api/abilities")
async def get_abilities():
    return abilities_cache

@app.get("/api/carddata")
async def get_carddata():
    return carddata_cache

@app.get("/api/categoryname")
async def get_categoryname():
    return categoryname_cache

@app.get("/api/nickname")
async def get_nickname():
    return nickname_cache

@app.get("/api/setlist")
async def get_setlist():
    return setlist_cache

# 取得單張英文卡名 API (使用抽出後的核心)
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
        return {
            "status": "success",
            "jp_name": jp_name,
            "en_name": en_name,
            "from_cache": from_cache
        }

    raise HTTPException(status_code=404, detail=f"查無卡牌「{jp_name}」的英文名稱")

# 新增：匯出牌組英文卡名列表 API (限制 Concurrent Request 避免 Fandom 封鎖)
@app.post("/api/export_english_deck")
@limiter.limit("10/minute")
async def export_english_deck(request: Request, payload: ExportDeckRequest):
    if not payload.items:
        raise HTTPException(status_code=400, detail="牌組清單不可為空")

    # 限制最大併發請求數為 3，避免同時 request 導致對方伺服器拒絕 (Rate Limit / 429)
    semaphore = asyncio.Semaphore(3)

    async def fetch_item_with_throttle(item: DeckItem, client: httpx.AsyncClient):
        async with semaphore:
            # 微小的延遲，平滑併發請求
            await asyncio.sleep(0.15)
            en_name = await fetch_english_name_from_fandom(item.name, client)
            return {
                "jp_name": item.name,
                "en_name": en_name,
                "count": item.count
            }

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

    return {
        "set_info": current_set,
        "cards": matched_cards
    }

@app.get("/api/card_stats")
def get_card_stats():
    return card_stats_cache

@app.get("/api/proxy-image")
@limiter.limit("5/minute")
async def proxy_image(request: Request, url: str = Query(...)):
    now = time.time()

    if url in proxy_cache:
        item = proxy_cache[url]
        if now - item["timestamp"] < CACHE_TTL_SECONDS:
            item["timestamp"] = now
            proxy_cache.move_to_end(url)
            return Response(
                content=item["content"],
                media_type=item["content_type"],
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )
        else:
            del proxy_cache[url]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"},
                timeout=8.0,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch image")

            content_type = resp.headers.get("content-type", "image/jpeg")

            if len(proxy_cache) >= MAX_CACHE_SIZE:
                proxy_cache.popitem(last=False)

            proxy_cache[url] = {
                "content": resp.content,
                "content_type": content_type,
                "timestamp": now
            }

            return Response(
                content=resp.content,
                media_type=content_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image proxy error: {str(e)}")

@app.get("/api/diary")
async def get_diary():
    return diary_cache

@app.post("/api/report_error")
@limiter.limit("3/minute")
async def report_error(request: Request, report: ReportModel, background_tasks: BackgroundTasks):
    if not report.card_name:
        raise HTTPException(status_code=400, detail="卡牌名稱為必填項目")
    
    base_url = str(request.base_url)
    background_tasks.add_task(send_line_notification, report, base_url)
    name = report.reporter_name.strip() if report.reporter_name and report.reporter_name.strip() else "熱情的決鬥者"
    
    return {
        "status": "success", 
        "message": f"回報成功！感謝{name}！"
    }

@app.get("/api/get_all_english_names")
async def get_all_english_names():
    return english_name_cache