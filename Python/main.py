import os
import json
import uuid  # 用來產生唯一 ID
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

# 產生伺服器啟動 ID，讓前端判斷是否需要清除 Cache API 緩存
SERVER_INSTANCE_ID = str(uuid.uuid4())

# --- 全域緩存變數區 ---
carddata_cache = []
card_types_cache = []
races_cache = []
abilities_cache = []
categoryname_cache = []  # 新增：分類名稱快取
nickname_cache = []      # 新增：暱稱快取

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

# --- 伺服器啟動時執行：一次性載入與預先計算 ---
@app.on_event("startup")
def load_and_process_caches():
    global carddata_cache, card_types_cache, races_cache, abilities_cache, card_stats_cache, categoryname_cache, nickname_cache
    
    print("正在從本機 JSON 檔案載入所有資料至伺服器記憶體緩存...")
    try:
        # 1. 載入 carddata
        carddata_cache = load_json_file("carddata.json")
        print(f"-> carddata 載入完成，共計 {len(carddata_cache)} 筆。")

        # 2. 載入其他靜態資料
        card_types_cache = load_json_file("card_type.json")
        races_cache = load_json_file("races.json")
        abilities_cache = load_json_file("abilities.json")
        # 2.5 載入新增的 JSON
        categoryname_cache = load_json_file("categoryname.json")
        nickname_cache = load_json_file("nickname.json")

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
    
@app.get("/api/card_stats")
def get_card_stats():
    """
    直接回傳已經在開機時算好的 card_stats 緩存，達到 0 運算消耗。
    """
    return card_stats_cache