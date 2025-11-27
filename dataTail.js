	//依照種族列表去產生種族下拉選單
	translatePageInit();
	const raceSelectors = getByClass( "raceSelector" );
	for (const raceSelector of raceSelectors) {
		let option = document.createElement('option');
		option.value = "";
		option.text = translateText( "全種族", isTC2C );
		raceSelector.appendChild( option );
		
		const races = Array.from(raceMapping.map.keys()).filter(key => {
			const data = raceMapping.map.get(key);
			return data && !data.isCategory; // 過濾掉分類種族，只保留實際種族
		}).sort();

		for (const raceJap of races) {
			const raceObj = raceMapping.getDataByJap( raceJap );
			let raceText = raceObj.Jap;
			if ( raceObj != null && raceObj.isCategory ){
				raceText += " " + translateText( " (類別種族)", isTC2C );
			}
			option = document.createElement('option');
			option.value = raceJap;
			option.text = raceText;
			option.setAttribute("NT","1");
			if ( raceObj.pop ){
				option.setAttribute("pop","1");
			}
			raceSelector.appendChild( option );
		}
	}
	changeRaceLan();
	
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