import os
import json
import uuid  # 用來產生唯一 ID
import asyncio
import base64
import re
import time
from collections import OrderedDict
from pathlib import Path
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

# --- 1. Rate Limiter 設定 (每個 IP 1 分鐘最多呼叫 12 次截圖 Proxy) ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 快取配置
MAX_CACHE_SIZE = 200          # 最多快取 200 張卡圖 (約 30~50MB RAM)
CACHE_TTL_SECONDS = 7 * 86400 # 圖片快取有效期限：7 天 (秒)

# 結構：proxy_cache[url] = { "content": bytes, "content_type": str, "timestamp": float }
proxy_cache = OrderedDict()

# 產生伺服器啟動 ID，讓前端判斷是否需要清除 Cache API 緩存
SERVER_INSTANCE_ID = str(uuid.uuid4())

# --- 全域緩存變數區 ---
carddata_cache = []
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []  # 分類名稱快取
nickname_cache = []      # 暱稱快取
diary_cache = []         # 日記快取
setlist_cache = {}       # 系列清單合併快取 (以 dict 儲存)

# 英文卡名快取全域變數
ENGLISH_NAME_FILE = BASE_DIR / "englishname.json"
english_name_cache = {}
has_unsynced_en_names = False  # 標記是否有未同步到 GitHub 的新資料

class CustomDeckModel(BaseModel):
    deck_list: str  # 接收解壓縮後的 4*卡名A,2*卡名B... 或直接傳密碼

# 專門用來存放已計算好的 card_stats 結果
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
        save_english_names()

def save_english_names():
    """將目前的英文對照表寫入實體檔案 englishname.json"""
    try:
        with open(ENGLISH_NAME_FILE, 'w', encoding='utf-8') as f:
            json.dump(english_name_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"寫入 englishname.json 失敗: {e}")

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
    """載入 setlist 資料夾下所有 _setlist_xxxxx.json，並將每個商品以 setcode 為 key 放入大字典中"""
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
                    else:
                        print(f"警告: 檔案 {file_path.name} 缺少 setcode/code/id 欄位。")

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

# --- 伺服器啟動時執行：一次性載入與預先計算 ---
@app.on_event("startup")
def load_and_process_caches():
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache, diary_cache
    
    print("正在從本機 JSON 檔案載入所有資料至伺服器記憶體緩存...")
    try:
        carddata_cache = load_json_file("carddata.json")
        print(f"-> carddata 載入完成，共計 {len(carddata_cache)} 筆。")

        card_types_cache = load_json_file("card_type.json")
        races_cache = load_json_file("races.json")
        abilities_cache = load_json_file("abilities.json")
        categoryname_cache = load_json_file("categoryname.json")
        nickname_cache = load_json_file("nickname.json")
        diary_cache = load_json_file("diary.json")
        print(f"-> diary 載入完成，共計 {len(diary_cache)} 筆。")

        # 載入英文卡名快取
        load_english_names()

        print("正在載入 setlist 資料夾底下的系列資料庫...")
        setlist_cache = load_all_setlists()
        print(f"-> setlist 合併載入完成，共計 {len(setlist_cache)} 個系列項目。")

        print("正在預先計算 card_stats 結果...")
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
        print("-> card_stats 預先計算完成！")

        # 啟動 3 小時批次檢查 GitHub Sync 排程
        async def periodic_github_sync_loop():
            global has_unsynced_en_names
            while True:
                await asyncio.sleep(10800)  # 每 3 小時 (10800 秒) 檢查一次
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
        print("[LINE Alert] 未設定正確的 LINE 金鑰，跳過訊息發送")
        return

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {token}"
    }

    def normalize_id(s: str) -> str:
        if not s: return ""
        res = []
        for ch in str(s):
            code = ord(ch)
            if 0xFF01 <= code <= 0xFF5E: res.append(chr(code - 0xfee0))
            else: res.append(ch)
        return re.sub(r'[^A-Z0-9]', '', "".join(res).upper())

    raw_id = report.card_id.strip() if report.card_id and report.card_id.strip() != "(無對應卡號)" else ""
    target_param = ""

    if raw_id:
        clean_user_id = normalize_id(raw_id)
        found_native_id = None

        if isinstance(setlist_cache, dict):
            for set_info in setlist_cache.values():
                card_list = set_info.get("setcardlist") or set_info.get("cardlist") or []
                if isinstance(card_list, list):
                    for item in card_list:
                        if isinstance(item, dict) and "id" in item:
                            ids = item["id"] if isinstance(item["id"], list) else [item["id"]]
                            for single_id in ids:
                                if normalize_id(single_id) == clean_user_id:
                                    found_native_id = str(single_id).strip()
                                    break
                        if found_native_id: break
                if found_native_id: break

        if found_native_id:
            target_param = found_native_id
        else:
            if raw_id.upper().startswith("DM"):
                target_param = raw_id[2:].strip()
            else:
                target_param = raw_id
    else:
        target_param = report.card_name.strip()

    encoded_param = quote(target_param)
    card_link = f"{base_url.rstrip('/')}/card.html?p={encoded_param}" if base_url else f"https://your-site.com/card.html?p={encoded_param}"

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
            response = client.post(url, headers=headers, json=payload, timeout=5.0)
            if response.status_code == 200:
                print(f"[LINE Push 成功] 訊息已順利推送到 User ID: {user_id[:6]}...")
            else:
                print(f"[LINE Push 失敗] 狀態碼 {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[LINE Push 網路錯誤]: {e}")


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

# 💡 新增：取得英文卡名 API
@app.get("/api/get_english_name")
@limiter.limit("20/minute")
async def get_english_name(request: Request, name: str = Query(..., description="日文卡名")):
    global has_unsynced_en_names

    jp_name = name.strip()
    if not jp_name:
        raise HTTPException(status_code=400, detail="請提供日文卡名")

    # 1. 命中快取（記憶體/本機檔）
    if jp_name in english_name_cache:
        return {
            "status": "success",
            "jp_name": jp_name,
            "en_name": english_name_cache[jp_name],
            "from_cache": True
        }

    # 2. 清理卡名並打 Fandom API
    clean_search_name = re.sub(r'（.*?）|\(.*?\)|《.*?》|＜.*?＞', '', jp_name).strip() or jp_name
    search_url = f"https://duelmasters.fandom.com/api.php?action=query&list=search&srsearch={quote(clean_search_name)}&format=json"

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(search_url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                data = resp.json()
                search_results = data.get("query", {}).get("search", [])

                if search_results:
                    en_title = search_results[0].get("title", "").strip()

                    if en_title:
                        # 寫入記憶體與 Render 本機 englishname.json
                        english_name_cache[jp_name] = en_title
                        save_english_names()

                        # 標記有新資料，等待每 3 小時一輪的排程 Commit
                        has_unsynced_en_names = True

                        return {
                            "status": "success",
                            "jp_name": jp_name,
                            "en_name": en_title,
                            "from_cache": False
                        }
    except Exception as e:
        print(f"[Fandom Search Error] {jp_name} -> {e}")

    raise HTTPException(status_code=404, detail=f"查無卡牌「{jp_name}」的英文名稱")

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

@app.get("/api/proxy-relationship-image")
@limiter.limit("60/minute")
async def proxy_relationship_image(request: Request, url: str = Query(...)):
    now = time.time()

    try:
        target_url = unquote(url).strip()
    except Exception:
        target_url = url.strip()

    if target_url in proxy_cache:
        item = proxy_cache[target_url]
        if now - item["timestamp"] < CACHE_TTL_SECONDS:
            item["timestamp"] = now
            proxy_cache.move_to_end(target_url)
            return Response(
                content=item["content"],
                media_type=item["content_type"],
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )
        else:
            del proxy_cache[target_url]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(target_url, headers=headers)

            if resp.status_code != 200:
                print(f"[Proxy Fail] Target returned status: {resp.status_code} for URL: {target_url}")
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Failed to fetch image: HTTP {resp.status_code}"
                )

            content_type = resp.headers.get("content-type", "image/jpeg")

            if len(proxy_cache) >= MAX_CACHE_SIZE:
                proxy_cache.popitem(last=False)

            proxy_cache[target_url] = {
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

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Proxy Fatal Error] {target_url} -> Exception: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proxy internal error: {str(e)}")

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

def format_card_wdata_types(card_dict):
    if not card_dict or "wdata" not in card_dict or not isinstance(card_dict["wdata"], list):
        return card_dict

    import copy
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
            
            if isinstance(raw_val, list) and len(raw_val) > 0:
                target_key = raw_val[0]
            else:
                target_key = raw_val

            if target_key is not None and str(target_key).strip() != "":
                clean_key = str(target_key).strip().upper()
                w["cardtype_chi"] = cardtype_map.get(clean_key, target_key)

    return card_copy

@app.get("/api/card_detail")
@limiter.limit("6/minute")
async def get_card_detail(request: Request, p: str = Query(..., description="卡牌名稱或ID/卡號")):
    query_str = p.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="請提供卡牌名稱或ID")

    def normalize_id(s: str) -> str:
        if not s: return ""
        res = []
        for ch in str(s):
            code = ord(ch)
            if 0xFF01 <= code <= 0xFF5E: res.append(chr(code - 0xfee0))
            else: res.append(ch)
        return re.sub(r'[^A-Z0-9]', '', "".join(res).upper())

    clean_query = normalize_id(query_str)

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

    if matched_card and target_card_name:
        import copy
        card_to_return = copy.deepcopy(matched_card)

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
                if borrowed_pic: break
            if borrowed_pic:
                card_to_return["pic"] = borrowed_pic

        processed_card = format_card_wdata_types(card_to_return)
        return {
            "found_by": "name",
            "card": processed_card,
            "setdata": None,
            "matched_id": "",
            "matched_index": 0,
            "set_list": get_card_set_list(target_card_name),
            "races": races_cache,
            "abilities": abilities_cache
        }

    matched_setdata = None
    target_card_name = None
    matched_id_val = ""
    matched_index = 0

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
                        if normalize_id(single_id) == clean_query:
                            matched_setdata = set_info
                            target_card_name = item_name
                            matched_id_val = single_id
                            matched_index = current_occ + idx
                            break
                
                ids_count = len(item["id"]) if isinstance(item.get("id"), list) else 1
                name_occurrence_counter[item_name] = current_occ + ids_count

            if matched_setdata: break
        if matched_setdata: break

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
            "abilities": abilities_cache
        }

    raise HTTPException(status_code=404, detail=f"查無卡名或 ID 為 '{p}' 的卡牌資料")

def get_card_set_list(card_name: str):
    tw_sets = []
    non_tw_sets = []
    net_sets = []
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
                    if is_net: net_sets.append(display_str)
                    elif is_tw: tw_sets.append(display_str)
                    else: non_tw_sets.append(display_str)

    return {"tw": tw_sets, "non_tw": non_tw_sets, "net": net_sets}

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
                count = int(parts[0])
                cname = parts[1].strip()
            except ValueError:
                count = 1
                cname = item
        else:
            count = 1
            cname = item
            
        custom_card_list.append({"name": cname, "count": count})

    order_map = {}
    for index, item in enumerate(custom_card_list):
        clean_name = str(item["name"]).strip()
        if clean_name not in order_map: order_map[clean_name] = index

    matched_cards = []
    for card in carddata_cache:
        c_name = card.get("name")
        if c_name and c_name.strip() in order_map:
            matched_cards.append(card)

    matched_cards.sort(key=lambda c: order_map.get(c.get("name", "").strip(), 999999))

    custom_set_info = {
        "setcode": "NET-CUSTOM",
        "setname": "自訂分享卡表",
        "isdeck": True,
        "istw": True,
        "setcardlist": custom_card_list
    }

    return {"set_info": custom_set_info, "cards": matched_cards}

@app.get("/relationship.html")
async def get_relationship_page():
    return FileResponse("relationship.html")
    
@app.get("/api/get_all_english_names")
async def get_all_english_names():
    """回傳目前已累積的所有英文卡名對照表"""
    return english_name_cache