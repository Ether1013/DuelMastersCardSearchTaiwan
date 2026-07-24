import streamlit as st

# 1. 網頁大標題與文字
st.title("🚀 我的第一個 Streamlit 應用")
st.write("歡迎來到 Python Web 應用的世界！這裡完全不需要寫 HTML。")

# 2. 互動輸入框
user_name = st.text_input("請輸入你的名字：", "訪客")

# 3. 按鈕與條件判斷
if st.button("打個招呼"):
    st.success(f"你好，{user_name}！很高興認識你！")

# 4. 滑桿互動
age = st.slider("選擇你的年齡：", min_value=0, max_value=100, value=25)
st.write(f"你選擇的年齡是：**{age}** 歲")