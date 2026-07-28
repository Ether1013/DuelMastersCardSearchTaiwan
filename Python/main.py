import os
import json
import uuid  # 用來產生唯一 ID
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
import httpx
from pathlib import Path
from urllib.parse import urlparse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

# --- 1. Rate Limiter 設定 (每個 IP 1 分鐘最多呼叫 12 次截圖 Proxy) ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- 2. 記憶體快取 (Simple In-Memory Cache) ---
# 避免重複抓取同一張卡，極大節省 Render 的出站流量與 CPU 消耗
proxy_cache = {}

# 產生伺服器啟動 ID，讓前端判斷是否需要清除 Cache API 緩存
SERVER_INSTANCE_ID = str(uuid.uuid4())

# --- 全域緩存變數區 ---
carddata_cache = []
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []  # 分類名稱快取
nickname_cache = []      # 暱稱快取
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
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache, setlist_cache
    
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


# --- 路由區 ---

@app.get("/")
async def serve_index():
    return FileResponse("index.html")

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
@limiter.limit("5/minute")  # 防刷：1分鐘內最多 5 次
async def proxy_image(
    request: Request, url: str = Query(..., description="要代理下載的卡圖 URL")
):
  # A. 域名安全檢查：防範有人拿你的 Proxy 去拿其他網站圖片
  parsed = urlparse(url)
  allowed_hosts = ["takaratomy.co.jp", "dm.takaratomy.co.jp"]
  if parsed.netloc not in allowed_hosts and not any(
      parsed.netloc.endswith("." + host) for host in allowed_hosts
  ):
    raise HTTPException(
        status_code=400, detail="Only Takara Tomy domain images are allowed."
    )

  # B. Referer 檢查：只允許你自己的前端發出請求 (防止外接盜連)
  referer = request.headers.get("referer", "")
  # 可以把你的 Render 網域放近來，例如 "my-dm-app.onrender.com"
  if referer and not any(
      domain in referer
      for domain in [
          "localhost",
          "127.0.0.1",
          "onrender.com",  # 允許 Render 網域
      ]
  ):
    raise HTTPException(status_code=403, detail="Forbidden domain.")

  # C. 快取檢查 (Hit Cache)
  if url in proxy_cache:
    content, content_type = proxy_cache[url]
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",  # 讓瀏覽器快取 1 天
        },
    )

  # D. 下載圖片 (Miss Cache)
  try:
    async with httpx.AsyncClient() as client:
      resp = await client.get(
          url,
          headers={
              "User-Agent": (
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
              )
          },
          timeout=8.0,
      )
      if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code, detail="Failed to fetch image"
        )

      content_type = resp.headers.get("content-type", "image/jpeg")

      # 寫入快取 (如果快取數量太大可清理，防暴記憶體)
      if len(proxy_cache) > 200:
        proxy_cache.clear()  # 簡易清空機制，維持記憶體在 512MB 內

      proxy_cache[url] = (resp.content, content_type)

      return Response(
          content=resp.content,
          media_type=content_type,
          headers={
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=86400",
          },
      )
  except Exception as e:
    raise HTTPException(
        status_code=500, detail=f"Image proxy error: {str(e)}"
    )