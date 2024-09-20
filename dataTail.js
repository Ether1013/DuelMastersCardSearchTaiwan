	//依照種族列表去產生種族下拉選單
	//	var raceSelectors = [ gobi( "race" ), gobi( "race2" ) ];
	translatePageInit();
	var raceSelectors = gosbcn( "raceSelector" );
	for ( var r = 0 ; r < raceSelectors.length ; r++ ){
		var raceSelector = raceSelectors[r];
		var option = document.createElement('option');
		option.value = "";
		option.text = translateText( "全種族", isTC2C );
		raceSelector.appendChild( option );
		var races = [];
		for ( var i = 0 ; i < raceMapping.map.length ; i++ ){
			races.insertSingleOption( raceMapping.map[i].Jap );
		}
		var raceText = [];
		var t = 0;
		for ( var i = 0 ; i < races.length ; i++ ){
			var raceObj = raceMapping.getDataByJap( races[i] );
			var raceText = raceObj.Jap;
			if ( raceObj != null && raceObj.isCategory ){
				raceText += " " + translateText( " (類別種族)", isTC2C );
			}
			option = document.createElement('option');
			option.value = races[i];
			option.text = raceText;
			option.setAttribute("NT","1");
			raceSelector.appendChild( option );
		}
		
		races = null;
	}
	
	//依照卡名分類取產生下拉選單
	var nameSelector = gobi("ab_name");
	var option = document.createElement('option');
	option.value = "";
	option.text = translateText( "不指定", isTC2C );
	nameSelector.appendChild( option );
	var supportCNames = [];
	for ( var i = 0 ; i < cardDatas.map.length ; i++ ){
		var cd = cardDatas.map[i];
		var abs = [];
		if ( cd.wData == null ){
			abs.push( cd.sp );
		} else {
			for ( var w = 0 ; w < cd.wData.length ; w++ ){
				abs.push( cd.wData[w].sp );
			}
		}
		for ( var a = 0 ; a < abs.length ; a++ ){
			for ( var ab = 0 ; ab < abs[a].length ; ab++ ){
				var abText = (abs[a])[ab];
				var tags = keyWords.transTags( abText );
				for ( var t = 0 ; t < tags.length ; t++ ){
					if ( tags[t].getAttribute != null && tags[t].getAttribute("sTagType") == "N" ){
						var cname = tags[t].getAttribute("keyJap");
						//標記自己不列入
						if ( cname == cd.name )
							continue;
						//翻面不列入
						if ( cd.back != null ){
							var backs = cd.back instanceof Array ? cd.back : [ cd.back ];
							var isBack = false;
							for ( var b = 0 ; b < backs.length ; b++ ){
								if ( backs[b] == cname ){
									isBack = true;
								}
							}
							if ( isBack )
								continue;
						}
						//不重複
						if ( supportCNames.include( cname ) )
							continue;
						
						supportCNames.push( cname );
					}
				}
			}
		}
	}
	for ( var i = 0 ; i < supportCNames.sort().length ; i++ ){
		option = document.createElement('option');
		option.value = supportCNames[i];
		option.text = supportCNames[i];
		nameSelector.appendChild( option );
	}
	
	//依照能力列表去產生能力下拉選單
	var abSelectors = gosbn( "abilities" );
	for ( var r = 0 ; r < abSelectors.length ; r++ ){
		var abSelector = abSelectors[r];
		var option = document.createElement('option');
		option.value = "";
		option.text = "不過濾";
		abSelector.appendChild( option );
		option = document.createElement('option');
		option.value = "empty";
		option.text = "無能力";
		abSelector.appendChild( option );
		var abs = [];
		for ( var i = 0 ; i < abilityMapping.map.length ; i++ ){
			abs.insertSingleOption( abilityMapping.map[i].Jap );
		}
		var abText = [];
		for ( var i = 0 ; i < abs.length ; i++ ){
			var abObj = abilityMapping.getDataByJap( abs[i] );
			var abText = abObj.Jap;
			option = document.createElement('option');
			option.value = abs[i];
			option.text = abText;
			option.setAttribute("NT","1");
			abSelector.appendChild( option );
		}
		
		abs = null;
	}
	
	//產生語言連結
	var tranSpans = [ 
		[ gobi("tran_tw"), ( !isHK && !isTC2C ), "tran=" ],
		[ gobi("tran_hk"), isHK, "tran=isHK" ],
		[ gobi("tran_cn"), isTC2C, "tran=isTC2C" ]
	];
	for ( var t = 0 ; t < tranSpans.length ; t++ ){
		var spanObj = (tranSpans[t])[0];
		if ( spanObj == null )
			continue;
		var typeCheck = (tranSpans[t])[1];
		if ( !typeCheck ){
			spanObj.style.cursor = "pointer";
			spanObj.style.color = isMobile() ? "#AAAAFF" : "blue";
			spanObj.style.textDecoration = "underline";
			
			spanObj.onclick = (function(){
				var parameterPatten = (tranSpans[t])[2];
				return function(){
					if ( window.location.search == "" ){
						location.href = window.location.href + "?" + parameterPatten;
					} else {
						var targetURLs = window.location.href.split("?");
						var parameters = targetURLs[1].split("&");
						var hadTranReplace = false;
						for ( var p = 0 ; p < parameters.length ; p++ ){
							if ( parameters[p].indexOf( "tran=" ) == 0 ){
								parameters[p] = parameterPatten;
								hadTranReplace = true;
							}
							targetURLs[0] += ( p == 0 ? "?" : "&" ) + parameters[p];
						}
						if ( !hadTranReplace ){
							targetURLs[0] += "&" + parameterPatten;
						}
						location.href = targetURLs[0];
					}
				}
			})();
		}
	}

	//產生卡種checkbox
	var carTypeSpan = gobi( "carTypeSpan" );
	var carTypeSpanEx = gobi( "carTypeSpanEx" );
//	var spanLineLength = 0;
	for ( var i = 0 ; i < cardTypeMapping.map.length ; i++ ){
		if ( cardTypeMapping.map[i].value == null ){
			continue;
		}
/*		
		if ( spanLineLength > 11 ){
			carTypeSpan.appendChild( document.createElement('br') );
//			carTypeSpan.appendChild( document.createTextNode( "　　　" ) );
			spanLineLength = 0;
		}
*/		
		var checkDIV = document.createElement("div");
		if ( !cardTypeMapping.map[i].main ){
			checkDIV.setAttribute("class","subType");
			checkDIV.setAttribute("style","display:none");
		}

		var checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = cardTypeMapping.map[i].value;
		checkbox.name = "cardType";
//		checkbox.checked = cardTypeMapping.map[i].main;
		checkbox.style.cursor = "pointer";
		checkbox.onclick = function(){
			clearSkipType();
			checkCTAllBtn();
		}
		checkDIV.appendChild( checkbox );
		var cbSpan = document.createElement('span')
		cbSpan.style.cursor = "pointer";
		cbSpan.onclick = function(){
			clearSkipType();
			checkedBrother( this , true );
			checkCTAllBtn();
		}
//		cbSpan.setAttribute( "title" , cardTypeMapping.map[i].Jap );
		cbSpan.appendChild( document.createTextNode( cardTypeMapping.map[i].text ) );
		checkDIV.appendChild( cbSpan );
		if ( cardTypeMapping.map[i].Location == 'M' ){
			carTypeSpan.appendChild( checkDIV );
		} else {
			carTypeSpanEx.appendChild( checkDIV );
		}
//		spanLineLength += ( 1 + cardTypeMapping.map[i].text.length );
	}

	//產生Cost過濾下拉選單資料群
	var costSelectorDatas = [];
	for ( var i = 1 ; i <= 14 ; i++ ){
		costSelectorDatas.push( i );
	}
	
	//產生Power過濾下拉選單資料群
	var powerSelectorDatas = [];
	for ( var i = 0 ; i <= 17000 ; i+=500 ){
		powerSelectorDatas.push( i );
	}
		
	//跑一次所有資料，把不存在的Cost跟Power加進去
	for ( var i = 0 ; i < cardDatas.map.length ; i++ ){
		var cardData = cardDatas.map[i];
		if ( cardData.cost != null && !costSelectorDatas.include( cardData.cost ) ){
			costSelectorDatas.insertSingleOption( cardData.cost );
		}
		if ( cardData.power != null && !powerSelectorDatas.include( cardData.power ) ){
			powerSelectorDatas.insertSingleOption( cardData.power );
		}
	}
	
	//產生Cost過濾下拉選單
	var costSelectors = [ gobi( "cost" ), gobi( "cost2" ) ];
	for ( var c = 0 ; c < costSelectors.length ; c++ ){
		var costSelector = costSelectors[c];
		for ( var i = 0 ; i < costSelectorDatas.length ; i++ ){
			option = document.createElement('option');
			option.value = costSelectorDatas[i];
			option.text = ( costSelectorDatas[i] == Number.MAX_SAFE_INTEGER ? "∞" : costSelectorDatas[i] );
			costSelector.appendChild( option );
		}
	}

	//產生Power過濾下拉選單
	var powerSelectors = [ gobi( "power" ), gobi( "power2" ) ];
	for ( var p = 0 ; p < powerSelectors.length ; p++ ){
		powerSelector = powerSelectors[p];
		for ( var i = 0 ; i < powerSelectorDatas.length ; i++ ){
			option = document.createElement('option');
			option.value = powerSelectorDatas[i];
			option.text = ( powerSelectorDatas[i] == Number.MAX_SAFE_INTEGER ? "∞" : powerSelectorDatas[i] );
			powerSelector.appendChild( option );
		}
	}
	
	//紀錄指定SET
	lastSelectedSetCode = getParameter("setCode");
	
	//判斷指定的SET有沒有效
	if ( lastSelectedSetCode != null && setDatas.getSetDatas( setCode ) == null ){
		lastSelectedSetCode = null;
	}
	
	var popListOnly = "J,C,E,P".split(",").include( getParameter("justPop") );
	
	//產生SET下拉選單
	if ( lastSelectedSetCode == null ){
		var setCodeSelector = gobi( "setCode" );
		/*
		var addRutenDeck = "RUT" == getParameter("addDeck");
		var setCodeSelector = gobi( "setCode" );
		var option = document.createElement('option');
		option.value = "";
		option.text = "";
		setCodeSelector.appendChild( option );
		for ( var i = 0 ; i < setDatas.set.length ; i++ ){
			if ( !addRutenDeck && ( !setDatas.set[i].setCode.indexOf( "DM" ) == 0 && !setDatas.set[i].setCode.indexOf( "NET" ) == 0 ) )
				continue;
			if ( setDatas.set[i].isListSkip )
				continue;
			option = document.createElement('option');
			option.value = setDatas.set[i].setCode;
			option.text = setDatas.set[i].setCode + " " + setDatas.set[i].setName;
			if ( setDatas.set[i].optionColor != null ){
				option.style.color = setDatas.set[i].optionColor;
			}
			setCodeSelector.appendChild( option );
		}
		*/
		changeSetCode( null );
		//指定"初始化"SETCODE
		var initSetCode = getParameter("initSetCode");
		if ( initSetCode != null ){
			setSelectValue( "setCode" , initSetCode );		
			if ( setCodeSelector.value != "" ){
				setCodeSelector.onchange();
				query();
			//如果非設定的SETCODE的話，就當作是DMVault的deckID
			} else {
				importDMVaultDeck( initSetCode );
			}
		}
		/*
		setSelectValue( "setCode" , initSetCode );		
		if ( setCodeSelector.value != "" ){
			setCodeSelector.onchange();
			query();
		//如果非設定的SETCODE的話，就當作是DMVault的deckID
		} else if ( initSetCode != null ){
			importDMVaultDeck( initSetCode );
		}
		*/
	} else {
		//有強制指定SETCODE時，不開放歷史查詢
		gobi( "queryHistoryBtn" ).style.display = 'none';
		gobi( "logBtn" ).style.width = '244px';
		//有強制指定SETCODE時，不開放SETCODE切換
		gobi( "setCodeSpan" ).style.display = 'none';
		gobi( "setCodeType" ).style.display = 'none';
		//指定SETCODE
		var setCodeSelector = gobi( "setCode" );
		option = document.createElement('option');
		option.value = lastSelectedSetCode;
		option.text = "";
		setCodeSelector.appendChild( option );
		query();
		
		//如果有指定自動匯出的話，就清除body並寫入卡表
		if ( popListOnly ){
			popList( getParameter("justPop") , false , true );
			var spans = document.getElementsByTagName("span");
			for ( var i = 0 ; i < spans.length ; i++ ){
				if ( spans[i].title != null && spans[i].title != 'undefined' && spans[i].title != '' ){
					setTitleAlert( spans[i] );
				}
			}
		}
	}
	
	//如果不是只寫出卡表的話，就處理畫面按鍵
	if ( !popListOnly ){
			
		//指定"初始卡牌"(ByID)
		var initCard = getParameter("initCard");
		if ( initCard != null ){
			queryByCode( decodeURIComponent( initCard ) , false );
		}
		
		//如果有動態匯入牌組的話，則開始解析
		var importDeckList = getParameter("import");
		if ( importDeckList != null ){
			parseDeckString( decodeURIComponent( importDeckList ).replace( /:/g, "*" ).replace( /,/g, "\n" ), true );
		}
		
		//更新日誌按鍵
		setButtonValueOfUpdateLog();

		//導入用字港語化
		if ( isHK || isTC2C ){
			
			//強制使用或以上/或以下
			gobi("HK").checked = true;
			gobi("HKSpan").style.display="none";
			
			//導入簡體化
			if ( isTC2C ){
				translatePage();
			}
		}
		
		//如果不是行動裝置的話，就隱藏方向鍵區塊
		if ( !isVM() ){
			if ( !isMobile() ){
				gobi("arrowsArea").style.display="none";
				gobi("arrowsArea2").style.display="none";
			//如果是行動裝置的話，就把匯入功能disabled掉
			} else {
//				gobi("importDeckBtn").disabled = true;
				gobi("importStringDeckBtn").disabled = true;
			}
		} else {
//			gobi("importDeckBtn").disabled = true;
			gobi("importStringDeckBtn").disabled = true;
		}
		
		//預設關閉所有方向鍵
		processArrows( false, false, false, false);
	}
	
	//新增最新SET快速連結
	if ( getParameter("setCode") == null ){
//		var withoutInitSetCode = window.location.search.substring(1).replace(/&?initSetCode=[^$|&]+/g,"");
		for ( var n = 0 ; n < newestSets.length ; n++ ){
			
			if ( n == 0 ){
				var redSpan = document.createElement("span");
				redSpan.setAttribute("style","color:red;");
				redSpan.appendChild( document.createTextNode("HOT!!") );
				gobi("newest").appendChild(redSpan);
			} else {
				var br = document.createElement("br");
				gobi("newest").appendChild(br);
			}
			
			var theHref = document.createElement("span");
			var theText = document.createTextNode(newestSets[n]+"【"+setDatas.getSetDatas( newestSets[n] ).setName+"】");
			theHref.setAttribute("style","color:blue;cursor:pointer;text-decoration:underline;");
			theHref.onclick = (function(){
//				var toLink = window.location.href.split("?")[0] + "?" + withoutInitSetCode + ( withoutInitSetCode == ""  ? "" : "&" ) + "initSetCode=" + newestSets[n];
				var sCode = newestSets[n];
				return function(){
//					location.href = toLink;
					limitsReset();
					setSelectValue( "setCodeType" , "" );
					changeSetCode("");
					setSelectValue( "setCode" , sCode );		
					if ( setCodeSelector.value != "" ){
						setCodeSelector.onchange();
						query();
					}
				}
			})();
			theHref.appendChild(theText);
			gobi("newest").appendChild(theHref);
		}
	}
	