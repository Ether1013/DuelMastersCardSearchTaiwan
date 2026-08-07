	//依照種族列表去產生種族下拉選單
	translatePageInit();
	// PC 版初始化
	const containerPC = document.getElementById("raceContainer_PC");
	if (containerPC) {
		containerPC.innerHTML = ""; // 清空防止重複
		createRaceInput(containerPC, false); // 建立第一列 (不可刪除, 帶有 [+] 鈕)
	}

	// Mobile 版初始化
	const containerMobile = document.getElementById("raceContainer_Mobile");
	if (containerMobile) {
		containerMobile.innerHTML = "";
		createRaceInput(containerMobile, false);
	}
	
	//依照卡名分類取產生下拉選單
	const nameSelector = getById("ab_name");
	let option = document.createElement('option');
	option.value = "";
	option.text = translateText( "不指定", isTC2C );
	nameSelector.appendChild( option );
	const supportCNames = new Set(); 

	for (const cd of cardDatas.map.values()) {
		const spStrings = cd.wData == null ? [ cd.sp ] : cd.wData.map(w => w.sp);
		
		for (const abs of spStrings) {
			for (const abText of abs) {
				const tags = keyWords.transTags( abText );
				for (const tag of tags) {
					if ( tag.getAttribute != null && tag.getAttribute("sTagType") === "N" ){
						const cname = tag.getAttribute("keyJap");
						// 標記自己不列入
						if ( cname === cd.name ) continue;
						
						// 翻面不列入
						if ( cd.back != null ){
							const backs = Array.isArray( cd.back ) ? cd.back : [ cd.back ];
							if ( backs.includes(cname) ) continue;
						}
						
						supportCNames.add( cname );
					}
				}
			}
		}
	}
	
	Array.from(supportCNames).sort().forEach(cname => {
		option = document.createElement('option');
		option.value = cname;
		option.text = cname;
		nameSelector.appendChild( option );
	});
	
	//依照能力列表去產生能力下拉選單
	const abSelectors = getByName( "abilities" );
	for (const abSelector of abSelectors) {
		let option = document.createElement('option');
		option.value = "";
		option.text = "不過濾";
		abSelector.appendChild( option );
		option = document.createElement('option');
		option.value = "empty";
		option.text = "無能力";
		abSelector.appendChild( option );
		
		const abs = Array.from(abilityMapping.map.keys()).filter(key => {
			const data = abilityMapping.map.get(key);
			// 排除那些沒有 Jap 屬性的非標準物件（例如上面直接加入的 "empty"）
			return data && data.Jap; 
		}).sort();

		for (const abJap of abs) {
			const abObj = abilityMapping.getDataByJap( abJap );
			let abText = abObj.Jap;
			option = document.createElement('option');
			option.value = abJap;
			option.text = abText;
			option.setAttribute("NT","1");
			if ( abObj.pop ){
				option.setAttribute("pop","1");
			}
			abSelector.appendChild( option );
		}
	}
	changeKeyWordLan();
	
	//產生語言連結
	const tranSpans = [ 
		[ getById("tran_tw"), ( !isHK && !isTC2C ), "tran=" ],
		[ getById("tran_hk"), isHK, "tran=isHK" ],
		[ getById("tran_cn"), isTC2C, "tran=isTC2C" ]
	];
	for (const tranSpan of tranSpans) {
		const [spanObj, typeCheck, parameterPatten] = tranSpan;

		if ( spanObj == null ) continue;

		if ( !typeCheck ){
			spanObj.style.cursor = "pointer";
			spanObj.style.color = isMobile() ? "#AAAAFF" : "blue";
			spanObj.style.textDecoration = "underline";
			
			spanObj.onclick = (() => {
				return function(){
					let newHref = window.location.href.split("?")[0];
					let params = [];
					if (window.location.search) {
						params = window.location.search.substring(1).split("&");
					}

					let hadTranReplace = false;
					for ( let i = 0; i < params.length; i++ ){
						if ( params[i].startsWith("tran=") ){
							params[i] = parameterPatten;
							hadTranReplace = true;
						}
					}
					if ( !hadTranReplace ){
						params.push(parameterPatten);
					}
					
					newHref += "?" + params.join("&");
					location.href = newHref;
				}
			})();
		}
	}

	//產生卡種checkbox
	const carTypeSpan = getById( "carTypeSpan" );
	const carTypeSpanEx = getById( "carTypeSpanEx" );

	for (const cardType of cardTypeMapping.initMap.values()) {
		if ( cardType.value == null ){
			continue;
		}
		
		const checkDIV = document.createElement("div");
		if ( !(cardType.main || cardType.catagory) ){
			checkDIV.setAttribute("class","subType");
			checkDIV.style.display = "none";
		}

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = cardType.value;
		checkbox.name = "cardType";
		checkbox.style.cursor = "pointer";
		checkbox.onclick = () => {
			clearSkipType();
			checkCTAllBtn();
		}
		checkDIV.appendChild( checkbox );
		const cbSpan = document.createElement('span')
		cbSpan.style.cursor = "pointer";
		cbSpan.onclick = function(){
			clearSkipType();
			checkedBrother( this , true );
			checkCTAllBtn();
		}
		cbSpan.appendChild( document.createTextNode( cardType.text ) );
		checkDIV.appendChild( cbSpan );
		if ( cardType.Location === 'M' ){
			carTypeSpan.appendChild( checkDIV );
		} else {
			carTypeSpanEx.appendChild( checkDIV );
		}
	}

	//產生Cost過濾下拉選單資料群
	const costSelectorDatas = new Set();
	for ( let i = 1 ; i <= 14 ; i++ ){
		costSelectorDatas.add( i );
	}
	
	//產生Power過濾下拉選單資料群
	const powerSelectorDatas = new Set();
	for ( let i = 0 ; i <= 17000 ; i+=500 ){
		powerSelectorDatas.add( i );
	}
		
	//跑一次所有資料，把不存在的Cost跟Power加進去
	for (const cardData of cardDatas.map.values()) {
		if ( cardData.cost != null ){
			costSelectorDatas.add( cardData.cost );
		}
		if ( cardData.power != null ){
			powerSelectorDatas.add( cardData.power );
		}
	}
	const sortedCostData = Array.from(costSelectorDatas).sort((a,b) => a - b);
	const sortedPowerData = Array.from(powerSelectorDatas).sort((a,b) => a - b);

	//產生Cost過濾下拉選單
	const costSelectors = [ getById( "cost" ), getById( "cost2" ) ];
	for (const costSelector of costSelectors) {
		for (const costValue of sortedCostData) {
			option = document.createElement('option');
			option.value = costValue;
			option.text = costValue === Number.MAX_SAFE_INTEGER ? "∞" : costValue;
			costSelector.appendChild( option );
		}
	}

	//產生Power過濾下拉選單
	const powerSelectors = [ getById( "power" ), getById( "power2" ) ];
	for (const powerSelector of powerSelectors) {
		for (const powerValue of sortedPowerData) {
			option = document.createElement('option');
			option.value = powerValue;
			option.text = powerValue === Number.MAX_SAFE_INTEGER ? "∞" : powerValue;
			powerSelector.appendChild( option );
		}
	}
	
	//紀錄指定SET
	lastSelectedSetCode = getParameter("setCode");
	
	//判斷指定的SET有沒有效
	if ( lastSelectedSetCode != null && setDatas.getSetDatas( lastSelectedSetCode ) == null ){
		lastSelectedSetCode = null;
	}
	
	const popListOnly = ["J","C","E","P"].includes( getParameter("justPop") );
	
	//產生SET下拉選單
	if ( lastSelectedSetCode == null ){
		const setCodeSelector = getById( "setCode" );
		changeSetCode( null );
		//指定"初始化"SETCODE
		const initSetCode = getParameter("initSetCode");
		if ( initSetCode != null ){
			setSelectValue( "setCode" , initSetCode );		
			if ( setCodeSelector.value !== "" ){
				setCodeSelector.onchange();
				query();
			//如果非設定的SETCODE的話，就當作是DMVault的deckID
			} else {
				importDMVaultDeck( initSetCode );
			}
		}
	} else {
		//有強制指定SETCODE時，不開放歷史查詢
		getById( "queryHistoryBtn" ).style.display = 'none';
		getById( "logBtn" ).style.width = '244px';
		//有強制指定SETCODE時，不開放SETCODE切換
		getById( "setCodeSpan" ).style.display = 'none';
		getById( "setCodeType" ).style.display = 'none';
		//指定SETCODE
		const setCodeSelector = getById( "setCode" );
		option = document.createElement('option');
		option.value = lastSelectedSetCode;
		option.text = "";
		setCodeSelector.appendChild( option );
		query();
		
		//如果有指定自動匯出的話，就清除body並寫入卡表
		if ( popListOnly ){
			popList( getParameter("justPop") , false , true );
			const spans = document.getElementsByTagName("span");
			for (const span of spans) {
				if ( span.title != null && span.title !== 'undefined' && span.title !== '' ){
					setTitleAlert( span );
				}
			}
		}
	}
	
	//如果不是只寫出卡表的話，就處理畫面按鍵
	if ( !popListOnly ){
			
		//指定"初始卡牌"(ByID)
		const initCard = getParameter("initCard");
		if ( initCard != null ){
			queryByCode( decodeURIComponent( initCard ) , false );
		}
		
		//如果有動態匯入牌組的話，則開始解析
		const importDeckList = getParameter("import");
		if ( importDeckList != null ){
			//如果符合ガチまとめ的牌組ID格式的話，就去抓資料
			const match = importDeckList.match( /^\w{8}\-\w{4}-\w{4}-\w{4}-\w{12}$/ );
			if ( match != null ){
				parseGachiMatome( importDeckList );
			//不是的話就當作文字進行匯入
			} else {
				parseDeckString( decodeURIComponent( importDeckList ).replace( /:/g, "*" ).replace( /,/g, "\n" ), true );
			}
		}
		
		//更新日誌按鍵
		setButtonValueOfUpdateLog();

		//導入用字港語化
		if ( isHK || isTC2C ){
			
			//強制使用或以上/或以下
			getById("HK").checked = true;
			getById("HKSpan").style.display="none";
			
			//導入簡體化
			if ( isTC2C ){
				translatePage();
			}
		}
		
		//如果不是行動裝置的話，就隱藏方向鍵區塊
		if ( !isVM() ){
			if ( !isMobile() ){
				getById("arrowsArea").style.display="none";
				getById("arrowsArea2").style.display="none";
			//如果是行動裝置的話，就把匯入功能disabled掉
			} else {
				getById("importStringDeckBtn").disabled = true;
			}
		} else {
			getById("importStringDeckBtn").disabled = true;
		}
		
		//預設關閉所有方向鍵
		processArrows( false, false, false, false);
	}

	//新站引導
	{
		// 計算關閉倒數天數 (目標時間: 2026/08/08 00:00:00)
		const targetDate = new Date("2026-08-08T00:00:00");
		const now = new Date();
		const diffTime = targetDate - now;
		// 計算剩餘天數 (不足一天以 1 天計，小於 0 則為 0)
		const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

		const redSpan = document.createElement("span");
		redSpan.style.color = "red";
		redSpan.appendChild( document.createTextNode("NEW!!") );
		getById("newest").appendChild(redSpan);

		const theHref = document.createElement("span");
		// 動態帶入剩餘天數 X
		const theText = document.createTextNode(`舊站關閉倒數${daysLeft}天，想看龍娘包內容？點這邊！`);
		theHref.style.color = "blue";
		theHref.style.fontWeight = "big";
		theHref.style.cursor = "pointer";
		theHref.style.textDecoration = "underline";
		theHref.onclick = (() => {
			return function(){
				location.href = "https://duelmasterscardsearchtaiwan.onrender.com/";
			}
		})();
		theHref.appendChild(theText);
		getById("newest").appendChild(theHref).appendChild(document.createElement("hr"));
	}
	//新增最新SET快速連結
	if ( getParameter("setCode") == null ){
		for ( let n = 0 ; n < newestSets.length ; n++ ){
			
			if ( n === 0 ){
				const redSpan = document.createElement("span");
				redSpan.style.color = "red";
				redSpan.appendChild( document.createTextNode("HOT!!") );
				getById("newest").appendChild(redSpan);
			} else {
				const br = document.createElement("br");
				getById("newest").appendChild(br);
			}
			
			const theHref = document.createElement("span");
			const theText = document.createTextNode(newestSets[n]+"【"+setDatas.getSetDatas( newestSets[n] ).setName+"】");
			theHref.style.color = "blue";
			theHref.style.cursor = "pointer";
			theHref.style.textDecoration = "underline";
			theHref.onclick = (() => {
				const sCode = newestSets[n];
				return function(){
					limitsReset();
					setSelectValue( "setCodeType" , "" );
					changeSetCode("");
					setSelectValue( "setCode" , sCode );		
					if ( getById("setCode").value !== "" ){
						getById("setCode").onchange();
						query();
					}
				}
			})();
			theHref.appendChild(theText);
			getById("newest").appendChild(theHref);
		}
	}
	
	/**
	 * 舊站關閉與新站引導跳轉邏輯
	 * @param {boolean} debug - 若傳入 true，則會忽略時間直接觸發跳轉提示（Debug 模式）
	 */
	function checkSiteStatus(debug = false) {
		// 設定關閉時間點：2026/08/09 00:00:00 (相當於 8/8 23:59:59 剛過)
		const targetDate = new Date("2026-08-09T00:00:00");
		const currentDate = new Date();

		// 判斷是否超過關閉時間或啟動 Debug 模式
		if (debug || currentDate >= targetDate) {
			showRedirectionOverlay();
		}
	}

	/**
	 * 建立並渲染全螢幕跳轉 UI 畫面
	 */
	function showRedirectionOverlay() {
		const targetUrl = "https://duelmasterscardsearchtaiwan.onrender.com/";
		let countdown = 5;

		// 注入 CSS 樣式 (現代微漸層與 Glassmorphism 風格)
		const style = document.createElement("style");
		style.innerHTML = `
			@keyframes overlayFadeIn {
				from { opacity: 0; transform: scale(0.95); }
				to { opacity: 1; transform: scale(1); }
			}
			@keyframes pulseGlow {
				0%, 100% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.4); }
				50% { box-shadow: 0 0 45px rgba(168, 85, 247, 0.6); }
			}
			#redirect-overlay {
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				background: radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%);
				z-index: 999999;
				display: flex;
				justify-content: center;
				align-items: center;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
				color: #f8fafc;
				padding: 20px;
				box-sizing: border-box;
			}
			.redirect-card {
				background: rgba(30, 41, 59, 0.7);
				backdrop-filter: blur(16px);
				-webkit-backdrop-filter: blur(16px);
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 24px;
				padding: 40px 32px;
				max-width: 480px;
				width: 100%;
				text-align: center;
				animation: overlayFadeIn 0.5s ease-out forwards, pulseGlow 4s infinite ease-in-out;
			}
			.redirect-icon {
				width: 64px;
				height: 64px;
				margin: 0 auto 20px;
				background: linear-gradient(135deg, #6366f1, #a855f7);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.redirect-icon svg {
				width: 32px;
				height: 32px;
				fill: #ffffff;
			}
			.redirect-title {
				font-size: 24px;
				font-weight: 700;
				margin: 0 0 12px 0;
				background: linear-gradient(to right, #ffffff, #cbd5e1);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
			}
			.redirect-msg {
				font-size: 16px;
				color: #94a3b8;
				margin: 0 0 28px 0;
				line-height: 1.6;
			}
			.timer-badge {
				display: inline-block;
				background: rgba(99, 102, 241, 0.2);
				color: #818cf8;
				font-weight: 700;
				padding: 2px 10px;
				border-radius: 12px;
				border: 1px solid rgba(129, 140, 248, 0.3);
				margin: 0 4px;
			}
			.redirect-btn {
				display: inline-block;
				width: 100%;
				padding: 14px 24px;
				background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
				color: #ffffff !important;
				font-size: 16px;
				font-weight: 600;
				text-decoration: none;
				border-radius: 12px;
				transition: all 0.2s ease;
				box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
				box-sizing: border-box;
			}
			.redirect-btn:hover {
				transform: translateY(-2px);
				box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
				background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
			}
		`;
		document.head.appendChild(style);

		// 建立 HTML 遮罩結構
		const overlay = document.createElement("div");
		overlay.id = "redirect-overlay";
		overlay.innerHTML = `
			<div class="redirect-card">
				<div class="redirect-icon">
					<svg viewBox="0 0 24 24">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
					</svg>
				</div>
				<h2 class="redirect-title">舊站已關閉</h2>
				<p class="redirect-msg">
					將於 <span id="redirect-timer" class="timer-badge">${countdown}</span> 秒鐘後轉至新站。<br>
					若無法跳轉，請點擊下方按鈕以進入新站。
				</p>
				<a href="${targetUrl}" class="redirect-btn">點擊此處進入新站</a>
			</div>
		`;

		// 蓋住頁面並禁止捲動
		document.body.appendChild(overlay);
		document.body.style.overflow = "hidden";

		// 倒數計時與自動跳轉 logic
		const timerElement = document.getElementById("redirect-timer");
		const interval = setInterval(() => {
			countdown--;
			if (timerElement) {
				timerElement.textContent = countdown;
			}
			if (countdown <= 0) {
				clearInterval(interval);
				window.location.href = targetUrl;
			}
		}, 1000);
	}

	// 頁面載入後自動執行判斷
	checkSiteStatus();