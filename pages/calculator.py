import streamlit as st

# 設定網頁標題與圖示
st.set_page_config(
    page_title="簡易加減乘除計算機", page_icon="🧮", layout="centered"
)

page_calc = st.Page(
    "pages/calculator.py",
    title="🧮 簡易計算機",    # 側邊欄顯示的名稱
    icon="🧮"
)

# 頁面主標題
st.title("🧮 簡易加減乘除計算機")
st.write("請在下方輸入數字並選擇運算子：")

# 建立兩欄式排版，讓輸入框並排更美觀
col1, col2 = st.columns(2)

with col1:
    # 數字 1 輸入框（預設值為 0.0，支援浮點數與負數）
    num1 = st.number_input("請輸入第一個數字 (Num 1)", value=0.0, step=1.0)

with col2:
    # 數字 2 輸入框
    num2 = st.number_input("請輸入第二個數字 (Num 2)", value=0.0, step=1.0)

# 下拉式選單選擇運算子
operation = st.selectbox(
    "請選擇運算符號",
    ("➕ 加法 (+)", "➖ 減法 (-)", "✖️ 乘法 (×)", "➗ 除法 (÷)"),
)

# 點擊計算按鈕
if st.button("開始計算", type="primary", use_container_width=True):
    result = None
    error_msg = None

    # 根據選單進行計算
    if "加法" in operation:
        result = num1 + num2
        symbol = "+"
    elif "減法" in operation:
        result = num1 - num2
        symbol = "-"
    elif "乘法" in operation:
        result = num1 * num2
        symbol = "×"
    elif "除法" in operation:
        # 防呆機制：檢查分母是否為 0
        if num2 == 0:
            error_msg = "❌ 錯誤：除數不能為 0！"
        else:
            result = num1 / num2
            symbol = "÷"

    # 顯示結果或錯誤訊息
    st.divider()  # 分隔線
    if error_msg:
        st.error(error_msg)
    else:
        # 美化顯示計算結果 (移除不必要的小數點末尾 0)
        formatted_num1 = int(num1) if num1.is_integer() else num1
        formatted_num2 = int(num2) if num2.is_integer() else num2
        formatted_result = (
            int(result) if isinstance(result, float) and result.is_integer() else f"{result:.4f}".rstrip("0").rstrip(".")
        )

        st.success(
            f"### 計算算式： `{formatted_num1} {symbol} {formatted_num2}`"
        )
        st.metric(label="計算結果", value=formatted_result)