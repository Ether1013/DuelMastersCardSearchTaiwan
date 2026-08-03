import os
import json
import uuid  # 用來產生唯一 ID
from fastapi import FastAPI, HTTPException, Query, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse
import httpx
from pathlib import Path
from urllib.parse import urlparse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import time
from collections import OrderedDict
from pydantic import BaseModel
from dotenv import load_dotenv


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

def send_line_notification(report: ReportModel):
    """背景任務：將回報訊息發送至你的個人 LINE 帳號"""
    # 💡 1. 清除金鑰字串頭尾可能誤貼的空白字元
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

    # 💡 2. 組裝內文
    msg_text = (
        f"🚨 【卡牌翻譯錯誤回報】\n\n"
        f"📌 卡名：{report.card_name}\n"
        f"🆔 卡號：{report.card_id or '未提供'}\n"
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
        # 💡 使用 json 參數讓 httpx 自動處理 UTF-8 序列化
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
    
    # 透過 BackgroundTasks 進行非同步發送
    background_tasks.add_task(send_line_notification, report)
    
    # 💡 確保回報者名稱有預設值，並動態組裝回應訊息
    name = report.reporter_name.strip() if report.reporter_name and report.reporter_name.strip() else "熱情的決鬥者"
    
    return {
        "status": "success", 
        "message": f"回報成功！感謝{name}！"
    }