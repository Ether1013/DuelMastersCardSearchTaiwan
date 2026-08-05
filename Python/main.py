import os
import json
import uuid  # 用來產生唯一 ID
from fastapi import FastAPI, HTTPException, Query, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse
import httpx
from pathlib import Path
from urllib.parse import urlparse, quote
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import time
from collections import OrderedDict
from pydantic import BaseModel
from dotenv import load_dotenv
import re


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

# 自動讀取同目錄下的 .env 檔案
load_dotenv()
LINE_ACCESS_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "你的_LINE_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID", "你的_LINE_USER_ID")

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
diary_cache = []         # 💡 新增：日記快取
setlist_cache = {}       # 新增：系列清單合併快取 (以 dict 儲存)

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

def load_all_setlists():
    """載入 setlist 資料夾下所有 _setlist_xxxxx.json，並將每個商品以 setcode 為 key 放入大字典中"""
    merged_setlist = {}
    setlist_dir = BASE_DIR / "setlist"
    
    if not setlist_dir.exists() or not setlist_dir.is_dir():
        print(f"警告: 找不到資料夾 {setlist_dir}，將回傳空物件。")
        return merged_setlist

    # 尋找所有檔名為 _setlist_*.json 的檔案
    for file_path in setlist_dir.glob("_setlist_*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # 情況 1：JSON 檔本身就是「單一商品物件」
                # 例如：{"setcode": "DM26-SD1", "setname": "...", "setcardlist": [...]}
                if isinstance(data, dict) and ("setcode" in data or "code" in data or "id" in data):
                    set_code = data.get("setcode") or data.get("code") or data.get("id")
                    if set_code:
                        merged_setlist[set_code] = data
                    else:
                        print(f"警告: 檔案 {file_path.name} 缺少 setcode/code/id 欄位。")

                # 情況 2：JSON 檔本身就是以 setcode 作為 Key 的物件
                # 例如：{"DM26-SD1": {"setname": "...", "setcardlist": [...]}}
                elif isinstance(data, dict):
                    merged_setlist.update(data)

                # 情況 3：JSON 檔是一個包含了多個商品的陣列/清單 (List)
                # 例如：[{"setcode": "DM26-SD1", ...}, {"setcode": "DM26-SD2", ...}]
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
    # 💡 記得在 global 後面加上 diary_cache！
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache, diary_cache
    
    print("正在從本機 JSON 檔案載入所有資料至伺服器記憶體緩存...")
    try:
        # 1. 載入 carddata
        carddata_cache = load_json_file("carddata.json")
        print(f"-> carddata 載入完成，共計 {len(carddata_cache)} 筆。")

        # 2. 載入其他靜態資料
        card_types_cache = load_json_file("card_type.json")
        races_cache = load_json_file("races.json")
        abilities_cache = load_json_file("abilities.json")
        categoryname_cache = load_json_file("categoryname.json")
        nickname_cache = load_json_file("nickname.json")
        # 💡 新增：載入 diary.json
        diary_cache = load_json_file("diary.json")
        print(f"-> diary 載入完成，共計 {len(diary_cache)} 筆。")

        # 2.6 載入所有 setlist 資料庫
        print("正在載入 setlist 資料夾底下的系列資料庫...")
        setlist_cache = load_all_setlists()
        print(f"-> setlist 合併載入完成，共計 {len(setlist_cache)} 個系列項目。")

        # 3. 預先計算 card_stats（開機時只算這一次）
        print("正在預先計算 card_stats 結果...")
        powers = set()
        costs = set()
        
        for card_dict in carddata_cache:
            wdata_list = card_dict.get("wdata", [])
            if isinstance(wdata_list, list):
                for w in wdata_list:
                    if isinstance(w, dict):
                        # 處理 Power
                        p = w.get("power")
                        if p is not None:
                            try: powers.add(int(p))
                            except ValueError: pass
                        
                        # 處理 Cost
                        c = w.get("cost")
                        if c is not None:
                            try: costs.add(int(c))
                            except ValueError: pass
                            
        card_stats_cache = {
            "powers": sorted(list(powers)),
            "costs": sorted(list(costs))
        }
        print("-> card_stats 預先計算完成！")

        print("所有緩存與預處理載入完畢！")
    except Exception as e:
        print(f"載入緩存失敗: {e}")

class ReportModel(BaseModel):
    card_name: str
    card_id: str = ""
    reporter_name: str = "熱情的決鬥者"
    error_desc: str = ""

def send_line_notification(report: ReportModel, base_url: str = ""):
    """背景任務：將回報訊息發送至你的個人 LINE 帳號"""
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

    # 正規化剔除非英數字（用於比對）
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
        return re.sub(r'[^A-Z0-9]', '', "".join(res).upper())

    # 💡 1. 判斷傳進來的 ID 是否有效
    raw_id = report.card_id.strip() if report.card_id and report.card_id.strip() != "(無對應卡號)" else ""
    target_param = ""

    if raw_id:
        clean_user_id = normalize_id(raw_id)
        found_native_id = None

        # 🔍 在 setlist_cache 裡面周遊尋找對應的商品與原生 ID
        if isinstance(setlist_cache, dict):
            for set_info in setlist_cache.values():
                card_list = set_info.get("setcardlist") or set_info.get("cardlist") or []
                if isinstance(card_list, list):
                    for item in card_list:
                        if isinstance(item, dict) and "id" in item:
                            ids = item["id"] if isinstance(item["id"], list) else [item["id"]]
                            for single_id in ids:
                                # 比對去除符號後的 ID 是否相同
                                if normalize_id(single_id) == clean_user_id:
                                    found_native_id = str(single_id).strip()
                                    break
                        if found_native_id:
                            break
                if found_native_id:
                    break

        # 💡 判斷原生 ID 是否有 DM 前綴
        if found_native_id:
            target_param = found_native_id
        else:
            # 若周遊找不到，但前端傳來的 ID 是以 DM 開頭，嘗試把開頭的 DM 拿掉作為備援
            if raw_id.upper().startswith("DM"):
                target_param = raw_id[2:].strip()
            else:
                target_param = raw_id
    else:
        # 無卡號時，退回使用卡名
        target_param = report.card_name.strip()

    encoded_param = quote(target_param)

    # 💡 2. 拼成可點擊的完整網址
    if base_url:
        card_link = f"{base_url.rstrip('/')}/card.html?p={encoded_param}"
    else:
        card_link = f"https://your-site.com/card.html?p={encoded_param}"

    # 💡 3. 組裝推播內文
    msg_text = (
        f"🚨 【卡牌翻譯錯誤回報】\n\n"
        f"📌 卡名：{report.card_name}\n"
        f"🆔 卡號：{report.card_id or '未提供'}\n"
        f"🔗 連結：\n{card_link}\n\n"
        f"👤 回報者：{report.reporter_name}\n"
        f"📝 錯誤內容：{report.error_desc or '（無簡答內容）'}"
    )

    payload = {
        "to": user_id,
        "messages": [
            {
                "type": "text", 
                "text": msg_text
            }
        ]
    }

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
    
# 1. 新增 pop.html 的路由
@app.get("/pop.html")
async def get_pop_page():
    return FileResponse("pop.html") # 請確認 pop.html 與 index.html 放在同一個目錄下
    
# 1. 提供 card.html 靜態頁面路由
@app.get("/card.html")
async def get_card_page():
    return FileResponse("card.html")  # 請確保 card.html 與 main.py 放在同一個目錄下

# 讓前端確認伺服器是否有重啟過的輕量級 API
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

# 回傳卡牌資料 (直接回傳記憶體緩存)
@app.get("/api/carddata")
async def get_carddata():
    return carddata_cache
    
@app.get("/api/categoryname")
async def get_categoryname():
    return categoryname_cache

@app.get("/api/nickname")
async def get_nickname():
    return nickname_cache

# 新增：回傳合併後的 setlist 快取
@app.get("/api/setlist")
async def get_setlist():
    return setlist_cache
    
# 💡 新增：POP 頁面專用 API，直接回傳商品資料 + 該商品所屬卡牌詳細資料
@app.get("/api/pop/{set_code}")
async def get_pop_data(set_code: str):
    # 1. 檢查商品是否存在
    current_set = setlist_cache.get(set_code)
    if not current_set:
        raise HTTPException(status_code=404, detail=f"找不到代碼為 '{set_code}' 的商品資料")

    set_card_list = current_set.get("setcardlist") or current_set.get("cardlist") or []

    # 2. 建立該商品卡名的 Quick Map 順序索引
    order_map = {}
    for index, item in enumerate(set_card_list):
        item_name = item.get("name") if isinstance(item, dict) else item
        if isinstance(item_name, str):
            clean_name = item_name.strip()
            if clean_name not in order_map:
                order_map[clean_name] = index

    # 3. 從記憶體中的 9000 筆 carddata 篩選出屬於該商品的卡片 (只抓需要的幾十張)
    matched_cards = []
    for card in carddata_cache:
        c_name = card.get("name")
        if c_name and c_name.strip() in order_map:
            matched_cards.append(card)

    # 4. 依照商品原本的順序排序
    matched_cards.sort(key=lambda c: order_map.get(c.get("name", "").strip(), 999999))

    # 5. 回傳精簡後的完整資料包
    return {
        "set_info": current_set,
        "cards": matched_cards
    }
    
@app.get("/api/card_stats")
def get_card_stats():
    """
    直接回傳已經在開機時算好的 card_stats 緩存，達到 0 運算消耗。
    """
    return card_stats_cache
    
@app.get("/api/proxy-image")
@limiter.limit("5/minute")
async def proxy_image(request: Request, url: str = Query(...)):
    # A. 安全檢查 (保持原本邏輯)...
    # B. Referer 檢查 (保持原本邏輯)...

    now = time.time()

    # C. 快取檢查 (Hit Cache & 時間戳記檢查)
    if url in proxy_cache:
        item = proxy_cache[url]
        # 判斷是否在有效期內 (TTL)
        if now - item["timestamp"] < CACHE_TTL_SECONDS:
            # 💡 關鍵：更新時間戳記 (Slide Expiration) 並移到最新位置
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
            # 已超過 7 天過期，主動刪除舊快取，準備重新發送 GET 請求更新
            del proxy_cache[url]

    # D. 下載圖片 (Miss Cache)
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

            # 💡 容量管理：如果超過上限，移除最舊 (Least Recently Used) 的一筆
            if len(proxy_cache) >= MAX_CACHE_SIZE:
                proxy_cache.popitem(last=False)

            # 寫入包含時間戳記的物件
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
    
# 💡 在 main.py 的 report_error 路由進行以下修改：
@app.post("/api/report_error")
@limiter.limit("3/minute")
async def report_error(request: Request, report: ReportModel, background_tasks: BackgroundTasks):
    if not report.card_name:
        raise HTTPException(status_code=400, detail="卡牌名稱為必填項目")
    
    # 💡 自動抓取當前發起請求的網站完整 Base URL (例: https://example.com)
    base_url = str(request.base_url)

    # 透過 BackgroundTasks 進行非同步發送，並帶入站台網址
    background_tasks.add_task(send_line_notification, report, base_url)
    
    name = report.reporter_name.strip() if report.reporter_name and report.reporter_name.strip() else "熱情的決鬥者"
    
    return {
        "status": "success", 
        "message": f"回報成功！感謝{name}！"
    }
    
def format_card_wdata_types(card_dict):
    """
    深層複製卡牌資料並將 wdata 內的 type/cardtype 替換/新增中文翻譯 cardtype_chi
    """
    if not card_dict or "wdata" not in card_dict or not isinstance(card_dict["wdata"], list):
        return card_dict

    import copy
    card_copy = copy.deepcopy(card_dict)

    # 建立多向比對字典 (全自動轉大寫、去空白)
    cardtype_map = {}
    if isinstance(card_types_cache, list):
        for item in card_types_cache:
            if isinstance(item, dict):
                chi_val = item.get("text") or item.get("chi") or item.get("cht") or item.get("jap")
                if not chi_val:
                    continue
                for k in ["value", "jap", "id", "key"]:
                    val = item.get(k)
                    if val is not None:
                        cardtype_map[str(val).strip().upper()] = chi_val

    for w in card_copy["wdata"]:
        if isinstance(w, dict):
            # 💡 抓取原始 type (相容字串與陣列)
            raw_val = w.get("type") if w.get("type") is not None else (w.get("cardtype") if w.get("cardtype") is not None else w.get("card_type"))
            
            # 若是陣列，取第一個元素
            if isinstance(raw_val, list) and len(raw_val) > 0:
                target_key = raw_val[0]
            else:
                target_key = raw_val

            if target_key is not None and str(target_key).strip() != "":
                clean_key = str(target_key).strip().upper()
                # 查表轉中文；若查無對照則保留 target_key
                w["cardtype_chi"] = cardtype_map.get(clean_key, target_key)

    return card_copy
    
# 2. Card 頁面專用 API (當 p=卡名 時不主動指定 ID)
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
            "abilities": abilities_cache
        }

    # ----------------------------------------------------
    # 邏輯 B：若卡名找不到，才以「ID / 卡號」搜尋特定商品版本
    # ----------------------------------------------------
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

            if matched_setdata:
                break
        if matched_setdata:
            break

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
    """取得收錄商品列表 (分成 tw / non_tw / net 三個區塊)"""
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
                    if is_net:
                        net_sets.append(display_str)
                    elif is_tw:
                        tw_sets.append(display_str)
                    else:
                        non_tw_sets.append(display_str)

    return {
        "tw": tw_sets,
        "non_tw": non_tw_sets,
        "net": net_sets
    }