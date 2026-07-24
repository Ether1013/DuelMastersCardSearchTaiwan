import streamlit as st

# 定義頁面與側邊欄顯示名稱
page_guess = st.Page(
    "pages/guessnumber.py", title="猜數字小遊戲", icon="🎯", default=True
)
page_calc = st.Page(
    "pages/calculator.py", title="簡易計算機", icon="🧮"
)

# 建立選單並執行
pg = st.navigation([page_guess, page_calc])
pg.run()