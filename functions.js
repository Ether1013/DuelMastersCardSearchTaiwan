	//瀏覽器判斷區塊
	// Opera 8.0+
	const isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	// Firefox 1.0+
	const isFirefox = typeof InstallTrigger !== 'undefined';
	// At least Safari 3+: "[object HTMLElementConstructor]"
	const isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	// Internet Explorer 6-11
	const isIE = /*@cc_on!@*/false || !!document.documentMode;
	// Edge 20+
	const isEdge = !isIE && !!window.StyleMedia;
	// Chrome 1+
	const isChrome = !!window.chrome && !!window.chrome.webstore;
	// Blink engine detection
	const isBlink = (isChrome || isOpera) && !!window.CSS;	//取得有效的CSS backgroundImage Header

	// 自定義 Object 工具 (保留原功能，使用 ES6+ 語法)
	// 為避免污染原型，此功能已重寫，原有的 Element.prototype.documentOffsetTop 已移除
	const getDocumentOffsetTop = (element) => {
		let offset = 0;
		let current = element;
		while (current) {
			offset += current.offsetTop;
			current = current.offsetParent;
		}
		return offset;
	};

	// 自定義陣列工具 (已移除原型污染，使用原生方法)
	const arrayInsert = (arr, index, item) => {
		arr.splice(index, 0, item);
	};

	const arrayInsertSingleOption = (arr, str) => {
		let insertIndex = 0;
		for (const item of arr) {
			if (item === str) {
				insertIndex = -1;
				break;
			} else if (item < str) {
				insertIndex++;
			}
		}
		if (insertIndex > -1) {
			arrayInsert(arr, insertIndex, str);
		}
	};
	
	const arrayIncludeLike = (arr, object) => arr.some(item => item.includes(object));

	const arrayOr = (arr1, arr2) => {
		const arrayObject = Array.isArray(arr2) ? arr2 : [arr2];
		return arr1.filter(item => arrayObject.includes(item));
	};
	
	const arrayAnd = (arr1, arrayObject) => {
		const newArray = Array.isArray(arrayObject) ? arrayObject : [arrayObject];
		newArray.forEach(item => {
			if (!arr1.includes(item)) {
				arr1.push(item);
			}
		});
		return arr1;
	};
	
	const arrayEquals = (arr1, arr2) => {
		if (!Array.isArray(arr2) || arr1.length !== arr2.length) {
			return false;
		}
		return arr1.length === arrayOr(arr1, arr2).length;
	};

	//讓IMAGE可以增加多重onload (保留原功能，使用 ES6+ 語法)
	// 原型的擴展已移除，改為靜態函數
	const addLoadEvent = (img, func) => {
		const oldonload = img.onload;
		if (typeof oldonload !== 'function') {
			img.onload = func;
		} else {
			img.onload = function() {
				oldonload();
				func();
			}
		}
	};
	
	//取得parameter
	const getParameter = (name) => {
		const AllVars = window.location.search.substring(1);
		const Vars = AllVars.split("&");
		for (const Var of Vars) {
			const [key, value] = Var.split("=");
			if (key === name) return value;
		}
		return null;
	};
	
	//取得FRAME物件Container
	const getIFrameContainer = (frameObj) => {
		if (frameObj == null)
			return null;
		else if (frameObj.contentWindow != null)
			return frameObj.contentWindow;
		else if (frameObj.contentDocument.document != null)
			return frameObj.contentDocument.document;
		else
			return container.contentDocument
	};
	
	//複製物件
	const clone = (obj) => {
		// Handle the 3 simple types, and null or undefined
		if (null == obj || "object" != typeof obj) return obj;

		// Handle Date
		if (obj instanceof Date) {
			const copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}

		// Handle Array
		if (obj instanceof Array) {
			const copy = [];
			for (let i = 0; i < obj.length; ++i) {
				copy[i] = clone(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			const copy = {};
			for (const attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
			}
			return copy;
		}

		throw new Error("Unable to copy obj! Its type isn't supported.");
	};
//... (接續於 clone 函數之後)


	/**
	 * UI 樣式 Alert 替代函數
	 * 替換所有原生的 customAlert() 調用
	 */
	const customAlert = (message) => {
		// 檢查訊息是否為空，若為空則不顯示
		if (message == null || message === "") return;

		const $overlay = $('#customAlertOverlay');
		const $message = $('#customAlertMessage');
		const $button = $('#customAlertButton');

		// 1. 設置內容
		$message.text(message);

		// 2. 顯示並置中
		$overlay.css('display', 'flex'); 
		
		// 3. 處理點擊事件 (點擊按鈕或 overlay 隱藏)
		$button.off('click').on('click', function() {
			$overlay.hide();
		});
	};

	//特殊標籤
	const keyWords = {
	
		keywordHeaderTag : "(K)",		//關鍵字首標籤
		keywordTailTag : "(/K)",		//關鍵字尾標籤
		raceHeaderTag : "(R)",			//種族首標籤
		raceTailTag : "(/R)",			//種族尾標籤
		nameHeaderTag : "(N)",			//卡名首標籤
		nameTailTag : "(/N)",			//卡名尾標籤
		absoluteNameHeaderTag : "(AN)",	//卡名首標籤(不考慮卡名種類)
		absoluteNameTailTag : "(/AN)",	//卡名尾標籤(不考慮卡名種類)
		typeHeaderTag : "(T)",			//卡種首標籤
		typeTailTag : "(/T)",			//卡種尾標籤
		soulHeaderTag : "(S)",			//魂首標籤
		soulTailTag : "(/S)",			//魂尾標籤
		exNameHeaderTag : "(XN)",		//放逐生物卡名關鍵字首標籤
		exNameTailTag : "(/XN)",		//放逐生物卡名關鍵字尾標籤
	
		//標籤集合，兩兩一組
		tagPackages : [
			"(K)", "(/K)",
			"(R)", "(/R)",
			"(N)", "(/N)",
			"(AN)", "(/AN)",
			"(T)", "(/T)",
			"(S)", "(/S)",
			"(XN)", "(/XN)",
		],
		
		//找出目前能力內容當中的第一組標籤資料
		findFirstTagInfo : function( str ){

			const indexes = [];
			for ( let i = 0 ; i < this.tagPackages.length ; i++ ){
				indexes.push( str.indexOf( this.tagPackages[i] ) );
			}
			let minIndexOfStr = -1;
			let minIndexOfIndexes = -1;
			for ( let i = 0 ; i < indexes.length ; i+=2 ){
				if ( indexes[i] !== -1 && ( ( minIndexOfStr === -1 ) || ( indexes[i] < minIndexOfStr ) ) ){
					minIndexOfStr = indexes[i];
					minIndexOfIndexes = i;
				}
			}
			if ( minIndexOfIndexes === -1 ){
				return null;
			} else {
				return {
					headerTag : this.tagPackages[ minIndexOfIndexes ],			//首標籤
					tailTag : this.tagPackages[ minIndexOfIndexes + 1 ],		//尾標籤
					headerIndex : indexes[ minIndexOfIndexes ],					//首標籤index
					tailIndex : indexes[ minIndexOfIndexes + 1 ],				//尾標籤index
				}
			}
		},
		
		//將能力字串轉換成DOM Object陣列
		transTags : function( str ){
		
			// [新增] 預設行為：若有 IG 標籤，移除標籤殼，保留內部文字供顯示用
			if (str) {
				str = str.replace(/\(IG\)/g, "").replace(/\(\/IG\)/g, "");
			}
			
			const rtnElements = [];
			let findTag = null;
			let currentStr = str;
			
			while( ( findTag = this.findFirstTagInfo( currentStr ) ) != null ){
			
				const hTag = findTag.headerTag;
				const tTag = findTag.tailTag;
				
				const hIndex = findTag.headerIndex;
				const tIndex = findTag.tailIndex;

				
				const beforeTextNode = document.createTextNode( currentStr.substr( 0 , hIndex ) );
				let kWord = currentStr.substr( hIndex + hTag.length , tIndex - ( hIndex + hTag.length ) );
				let showName = kWord;
				//如果kWord裡有<=>記號的話、則視為一種特殊格式，表示<=>前者為原文、<=>後者為實際目標
				const showAndReal = kWord.split("<=>");
				if ( showAndReal.length === 2 ){
					showName = showAndReal[0];
					kWord = showAndReal[1];
				}
				const keywordSpan = document.createElement('span');
				keywordSpan.setAttribute( "keyJap" , kWord );
				keywordSpan.style.cursor = "pointer";
				keywordSpan.style.color = "blue";
				
				//依TAG不同處理不同的EVENT
				if ( hTag === this.raceHeaderTag ){
					const raceObject = raceMapping.getDataByJap( kWord );
					if ( raceObject != null ){
						keywordSpan.setAttribute( "title" , ( ( raceObject.isCategory ? "(類別種族) " : "" ) + raceObject.Jap + " / " + raceObject.Chi + " / " + raceObject.Eng ) );
						keywordSpan.setAttribute( "sTagType" , "R" );
					}
				} else if ( hTag === this.keywordHeaderTag ){
					const abilityObject = abilityMapping.getDataByJap( kWord );
					if ( abilityObject != null ){
						keywordSpan.setAttribute( "title" , abilityObject.Jap + " / " + abilityObject.Chi + " / " + abilityObject.Eng + "\n" + abilityObject.descript );
						keywordSpan.setAttribute( "sTagType" , "K" );
					}
				} else if ( hTag === this.nameHeaderTag || hTag === this.absoluteNameHeaderTag ){
				
					//如果是指定卡名、但資料裡沒有的話就不處理標籤
					let doWork = true;
					if ( hTag === this.nameHeaderTag ){
						if ( !nameCategory.isCategory( kWord ) && cardDatas.getDataByName( kWord ) == null ){
							doWork = false;
						}
					} else if ( hTag === this.absoluteNameHeaderTag ){
						if ( cardDatas.getDataByName( kWord ) == null ){
							doWork = false;
						}
					}
					if ( !doWork ){
						keywordSpan.style.cursor = "";
						keywordSpan.style.color = "black";
					} else {
						keywordSpan.setAttribute( "sTagType" , "N" );
						keywordSpan.style.textDecoration = "underline";
						keywordSpan.setAttribute( "queryByName" , kWord );
						if ( kWord !== showName ){
							keywordSpan.setAttribute( "title" , clearSubName( kWord ) );
						}
						//如果是類別卡名的話，就進行搜尋
						if ( hTag === this.nameHeaderTag && nameCategory.isCategory( kWord ) ){
							keywordSpan.onclick = function(){
								const cardName = this.getAttribute( "queryByName" );
								queryByNameOnly( cardName , false );
								//如果是手機版型的話，就跳去列表頁
								if ( isVM() ){
									getById("listBar").onclick();
								}
							}
						//不是的話就直接跳內容
						} else {
							keywordSpan.onclick = function(){
								const cardName = this.getAttribute( "queryByName" );
								lastSelectedCardName = cardName;
								openDataBlock();
								changeListCSS();
							}
						}
					}
				} else if ( hTag === this.typeHeaderTag ){
					const typeObject = cardTypeMapping.getObjByJap( kWord );
					if ( typeObject != null ){
						keywordSpan.setAttribute( "title" , "卡牌類型：" + typeObject.text + ( ( typeObject.descript == null ) ? "" : ( "\n" + typeObject.descript ) ) );
					}
				} else if ( hTag === this.soulHeaderTag ){
					const typeObject = soulMapping.getObjByJap( kWord );
					if ( typeObject != null ){
						keywordSpan.setAttribute( "title" , typeObject.Chi + " / " + typeObject.Eng );
					}
				} else if ( hTag === this.exNameHeaderTag ){
					//如果是放逐生物類別卡名的話，就進行搜尋
					if ( exNameCategory.isKeyName( kWord ) ){
						keywordSpan.style.textDecoration = "underline";
						keywordSpan.setAttribute( "queryByName" , kWord );
						keywordSpan.onclick = function(){
							const cardName = this.getAttribute( "queryByName" );
							queryByNameOnly( cardName , true );
							//如果是手機版型的話，就跳去列表頁
							if ( isVM() ){
								getById("listBar").onclick();
							}
						}
					}
				}
				//如果關鍵字沒有點擊效果、又有說明的話、又是行動裝置的話，就增加點擊ALERT詳細說明
				setTitleAlert( keywordSpan );
				//TAG本文不進行繁簡轉換
				const tagMainWords = document.createElement('span');
				tagMainWords.appendChild( document.createTextNode( showName ) );
				keywordSpan.appendChild( tagMainWords );
				setNoTrans( keywordSpan );
				
				currentStr = currentStr.substr( tIndex + tTag.length );
								
				rtnElements.push( beforeTextNode );
				rtnElements.push( keywordSpan );
			}
			if ( currentStr.length > 0 ){
				rtnElements.push( document.createTextNode( currentStr ) );
			}
			return rtnElements;
		},
	};

	// DOM 選擇器簡化 (原 gobi, gosbn, gosbcn 已移除)
	const getById = (id) => document.getElementById(id);
	const getByName = (name) => document.getElementsByName(name);
	const getByClass = (className) => document.querySelectorAll(`.${className}`);


	//圖片ID字首
	let picIdHeader = "list_";
	//目前所選擇的卡片名
	let lastSelectedCardName = null;
	//目前所限制的SETCODE
	let lastSelectedSetCode = null;
	//目前所限制的aaIndex
	let lastSelectedAAIndex = null;
	//雙極卡選項
	let lastSelectedUdIndex = null;
	//是否默許開放圖片列表
	let allowPictureList = false;
	//是否不再詢問流量問題
	let askSkip = false;
	//是否進行港化
	let isHK = "isHK" == getParameter("tran");
	//是否進行簡體化
	let isTC2C = "isTC2C" == getParameter("tran");
	//特殊符號
	const spHeader = [ "✪","⌂","✚","✡" ];

	//依照過濾條件找出相符資料
	const query = () => {

		const listType = $('input[name="listType"]:checked').val();
		const sort = $('input[name="sortBy"]:checked').val();
		const desc = "true" === $('input[name="desc"]:checked').val();
		const twsd = $('#TWSD').prop('checked');
	
		const $nameTable = $('#names');
		
		//清除所有子項
		$nameTable.empty();
		//清除AAIndex
		lastSelectedAAIndex = null;
		
		//依照條件進行過濾、並依照指定進行排序
		let fuzzyName = null;
		let cardDataBySort = getSortList( sort , desc , twsd );
		let noQueryData = cardDataBySort.length === 0;
		if ( noQueryData ){
			const filterByName = $('#cardName').val();
			if ( filterByName !== '' ){
				fuzzyName = searchForCardByName( filterByName );
				if ( fuzzyName != null ){
					cardDataBySort = [ cardDatas.getDataByName( fuzzyName ) ];
					noQueryData = false;
				}
			}
		}
		let theSet = null;
		if ( noQueryData ){
			const noQueryDataMsg = translateText( "查無資料" , isTC2C );
			clearListAndSetOneLine( noQueryDataMsg );	
			customAlert( noQueryDataMsg );
		} else {
		
			if ( listType === "picture" && !allowPictureList ){
				if ( confirm( "警告！您所選擇的列表顯示方式為「圖片」，此作業將可能造成下載流量大幅增加(預計將載入"+cardDataBySort.length+"張圖片)，請問是否確定要執行？" ) ){
					if ( !askSkip ){
						askSkip = true;
						if ( confirm("請問是否不要再詢問這個問題？") ){
							allowPictureList = true;
						}
					}
				} else {
					$('input[name="listType"][value="name"]').prop('checked', true);
					// 重新獲取 listType 變量，雖然在這個函數內它不會被使用，但保持邏輯完整性
					// listType = $('input[name="listType"]:checked').val(); 
				}
			}

			//先把tr物件記在陣列裡以方便非超次元/超次元的排序
			const tableTrList = [];
			const tableTrExList = [];
			const tableTrGrList = [];
			const tableTrExistList = [];
			//如果有限定牌庫的話就找出牌庫資訊
			theSet = lastSelectedSetCode ? setDatas.getSetDatas( lastSelectedSetCode ) : null;
			
			let rowSpan = 1;
			for ( let i = 0 ; i < cardDataBySort.length ; i++ ){
		
				const tr = document.createElement('tr');
				//卡名不得進行簡繁轉換
				setNoTrans( tr );
				let bgCivil = 0;
				//沒有指定SET的時候，會拿到完整資料
				if ( lastSelectedSetCode == null ){
					bgCivil = cardDataBySort[i].civil;
					if ( bgCivil == null ){
						bgCivil = 0;
						for (const wData of cardDataBySort[i].wData) {
							bgCivil |= wData.civil;
						}
					}
				//指定SET的時候，雙極卡只會拿到上半部資料
				} else {
					bgCivil = cardDataBySort[i].civil;
					if ( cardDataBySort[i].ws != null ){
						bgCivil = 0;
						// 改用索引來遍歷，直接將索引作為 udIndex 傳入
						for (let udIndex = 0; udIndex < cardDataBySort[i].ws.length; udIndex++) {
							const theFullData = cardDatas.getDataByName( cardDataBySort[i].name , null , null, udIndex );
							if ( theFullData != null ){
								bgCivil |= theFullData.civil;
							}
						}
					}
				}
				const backgroundImage = civilMapping.getBackgroundCSS( bgCivil );
				tr.style.backgroundImage = backgroundImage;
				//如果有指定SET的話，就多一個TD顯示張數或編號
				if ( theSet != null ){
					const tdNum = document.createElement('td');
					const theCardData = theSet.getCardData( cardDataBySort[i].name , lastSelectedAAIndex );
					let numberic = "    ";
					let hasAAIndex = false;
					if ( theCardData != null ){
						if ( theSet.isDeck ){
							if ( theCardData.count != null ){
								numberic = theCardData.count + " × ";
							}
						} else if ( theCardData.id != null ){
							let theIdStr = theCardData.id;
							let bi = theIdStr.indexOf( " " );
							if ( bi === -1 ){
								bi = 0;
							}
							let ai = theIdStr.indexOf( "/" );
							if ( ai === -1 ){
								ai = theIdStr.length;
							}
							if ( ai < bi ){
								theIdStr = theIdStr.substring( 0 , ai );
							} else {
								theIdStr = theIdStr.substring( bi , ai );
							}
							numberic = theIdStr;
							if ( theCardData.lastAAIndex != null || theCardData.nextAAIndex != null ){
								hasAAIndex = true;
							}
						}
					}
					const idSpan = document.createElement('span');
					idSpan.appendChild( document.createTextNode( numberic ) );
					if ( hasAAIndex ){
						idSpan.style.textDecoration = "underline";
					}
					tdNum.appendChild( idSpan );
					tdNum.style.width = "30px";
					tdNum.style.textAlign = "center";
					if ( theSet.isDeck && lastSelectedSetCode !== queryHistorySetCode ){
						
						let addTdNum = true;
						if ( rowSpan !== 1 ){
							addTdNum = false;
						} else if ( cardDataBySort[i].back == null ){
							addTdNum = true;
						} else {
							addTdNum = false;
							const names = [];
							let backs = [];
							for ( let n = i ; n < cardDataBySort.length ; n++ ){
								
								names.push( cardDataBySort[n].name );
								backs = arrayAnd( backs, cardDataBySort[n].back );
								
								if ( arrayEquals( names, backs ) ){
									rowSpan = names.length;
									addTdNum = true;
									break;
								}
							}
							
							if ( !addTdNum && !arrayEquals( names, backs ) ){
								addTdNum = true;
							}
						}
						if ( addTdNum ){
							tdNum.setAttribute("rowspan",rowSpan);
							rowSpan++;
							tr.appendChild( tdNum );
						}
						if ( rowSpan > 1 ){
							rowSpan--;
						}

					} else {
						tr.appendChild( tdNum );
					}
				//沒有的話，則新增一個流水號TD
				} else {
					const tdNum = document.createElement('td');
					tdNum.appendChild( document.createTextNode( ( i + 1 ) ) );
					tdNum.style.width = "20px";
					tdNum.style.textAlign = "center";
					tr.appendChild( tdNum );
				}
				const td = document.createElement('td');
				tr.setAttribute("tr_cardName",cardDataBySort[i].name);
				tr.onclick = (() => {
					const thisCardName = cardDataBySort[i].name;
					return () => {
						lastSelectedCardName = null;
						lastSelectedAAIndex = null;
						lastSelectedUdIndex = null;
						openDataBlock();
						lastSelectedCardName = thisCardName;
						openDataBlock();
						changeListCSS();
						document.body.focus();
					}
				})();
				//如果以卡名作為列表，則顯示卡名
				if ( "name" === listType ){
					td.appendChild( document.createTextNode( clearSubName( cardDataBySort[i].name ) ) );
				//如果以卡圖做為列表，則顯示卡圖
				} else if ( "picture" === listType ){
					const picObjs = getImgFromOutSite( cardDataBySort[i] , 120 , null , i );
					for (const picObj of picObjs) {
						td.appendChild( picObj );
					}
				}
				td.style.padding = '5 10 5 10';
				td.style.textAlign = "center";
				tr.appendChild( td );
				tr.onmouseover = function(){
					this.style.backgroundColor = "#00A2E8";
					this.style.backgroundImage = 'none';
				};
				tr.onmouseout = (() => {
					const cssSetting = backgroundImage;
					return function(){
						this.style.backgroundColor = "#FFFFFF";
						this.style.backgroundImage = cssSetting;
 					};
				})();
				tr.style.cursor = "pointer";
				tr.ondblclick = function(){
					const value = clearSubName( this.getAttribute("tr_cardName") );
					Clipboard.copy( value );
				}
				
				const theLocation = cardTypeMapping.getDataByValue( Array.isArray(cardDataBySort[i].type) ? cardDataBySort[i].type[0] : cardDataBySort[i].type )?.Location;
				
				//牌庫+沒排序+超次元牌庫的話就塞超次元TR暫存陣列
				if ( theSet != null && theSet.isDeck && sort === "" && theLocation === "I" ){
					tableTrExistList.push( tr );
				} else if ( theSet != null && theSet.isDeck && sort === "" && theLocation === "P" ){
					tableTrExList.push( tr );
				} else if ( theSet != null && theSet.isDeck && sort === "" && theLocation === "G" ){
					tableTrGrList.push( tr );
				//其他直接塞
				} else {
					tableTrList.push( tr );
				}
			}
			
			//如果有指定SETCODE的話，就把資料未存在的也列入List裡
			if ( theSet != null && theSet.isDeck ){
			
				for (const setCard of theSet.setCards) {
					const nameInSet = setCard.name;
					const nameNoData = setCard.noData || ( cardDatas.getDataByName( nameInSet , null , null ) == null );
					
					if ( nameNoData ){

						const tr = document.createElement('tr');
						//卡名不得進行簡繁轉換
						setNoTrans( tr );
						tr.style.backgroundColor = "#7F7F7F";
				
						const tdNum = document.createElement('td');
						const numberic = setCard.count + " × ";
						const idSpan = document.createElement('span');
						idSpan.appendChild( document.createTextNode( numberic ) );
						tdNum.appendChild( idSpan );
						tdNum.style.width = "30px";
						tdNum.style.textAlign = "center";
						
						tr.appendChild( tdNum );
						
						const tdNoDataName = document.createElement('td');
						const cardName = document.createTextNode( clearSubName( nameInSet ) );
						tdNoDataName.appendChild( cardName );
						tdNoDataName.style.textAlign = "center";
						if ( setCard.link != null ){
							tdNoDataName.style.textDecoration = "underline";
							tdNoDataName.style.color = "blue";
							tr.style.cursor = "pointer";
							// DMVault 連結已移除，此處功能失效
							tr.onclick = (() => {
								const dmVaultLink = setCard.link;
								return () => {
									console.log("DMVault link is disabled: " + dmVaultLink);
								}
							})();
							tr.setAttribute("tr_cardName_vaultLink",nameInSet);
						}
						tr.appendChild( tdNoDataName );
						//牌庫+沒排序+超次元牌庫的話就塞超次元TR暫存陣列
						if ( theSet != null && theSet.isDeck && sort === "" && setCard.isEx ){
							tableTrExList.push( tr );
						//其他直接塞
						} else {
							tableTrList.push( tr );
						}
					}
				}
			}
			//塞進TABLE裡
			for (const tr of tableTrList) {
				$nameTable.append( tr );
			}
			//插進一個"以下超次元區"的分隔用TR
			if ( tableTrExList.length > 0 ){
				const tr = document.createElement('tr');
				tr.style.backgroundColor = "#370d00";
				tr.style.height = "10px;";
		
				const td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				$nameTable.append( tr );
			}
			//塞進TABLE裡
			for (const tr of tableTrExList) {
				$nameTable.append( tr );
			}
			//插進一個"以下GR區"的分隔用TR
			if ( tableTrGrList.length > 0 ){
				const tr = document.createElement('tr');
				tr.style.backgroundColor = "#370d00";
				tr.style.height = "10px;";
		
				const td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				$nameTable.append( tr );
			}
			//塞進TABLE裡
			for (const tr of tableTrGrList) {
				$nameTable.append( tr );
			}
			//插進一個"以下初始區"的分隔用TR
			if ( tableTrExistList.length > 0 ){
				const tr = document.createElement('tr');
				tr.style.backgroundColor = "#370d00";
				tr.style.height = "10px;";
		
				const td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				$nameTable.append( tr );
			}
			//塞進TABLE裡
			for (const tr of tableTrExistList) {
				$nameTable.append( tr );
			}
			changeListCSS();
			
			if ( fuzzyName != null ){
				customAlert( translateText( "查無正確資料，請參考【】" , isTC2C ).replace("【】","【"+fuzzyName+"】") );
			}
		}
		//繁轉簡
		if ( isTC2C ){
			translatePage();
		}
		$('#popList1').css('display', 'inline');
		$('#popList2').css('display', 'inline');
		$('#popList3').css('display', 'inline');
		$('#popList4').css('display', 'inline');
		let listCardNCs = "";
		if ( theSet != null && theSet.isDeck ){
			for (const setCard of theSet.setCards) {
				listCardNCs += ( listCardNCs === "" ? "" : "," ) + clearSubName( setCard.name ) + "," + setCard.count;
			}
		}
		//估價功能初始化
		priceBtnInit( listCardNCs );
		return cardDataBySort.length;
	};
	
	const singleToArray = (objs) => Array.isArray(objs) ? objs : [objs];
	
	const priceBtnInit = (listCardNCs) => {
		const priceBtn = document.getElementById("priceBtn");
		if ( priceBtn != null ){
			if ( listCardNCs !== "" ){
				priceBtn.setAttribute( "deckPrice", 0 );
				priceBtn.setAttribute( "listCardNCs", listCardNCs );
				priceBtn.setAttribute( "noData", "" );
				priceBtn.value = "估價("+ ( listCardNCs.split(",").length/2 )+"/$0)";
				priceBtn.disabled = false;
			} else {
				priceBtn.value = "估價(0/$0)";
				priceBtn.disabled = true;
			}
		}
	};
	
	const popPrice = (queryPrice) => {
	
		const priceBtn = document.getElementById("priceBtn");
		const listCardNCs = priceBtn.getAttribute( "listCardNCs" ).split(",");
		const cardName = listCardNCs[ listCardNCs.length - 2 ];
		
		//沒有查到價格
		if ( queryPrice == null || queryPrice < 0 ){

			let noData = priceBtn.getAttribute( "noData" );
			noData += ( noData === "" ? "" : "\n" ) + cardName;
			priceBtn.setAttribute( "noData", noData );
			
		} else {

			let deckPrice = parseInt( priceBtn.getAttribute("deckPrice") );
			deckPrice += queryPrice;
			priceBtn.setAttribute( "deckPrice", deckPrice );
			priceBtn.value = "估價("+( listCardNCs.length/2-1 )+"/$"+deckPrice+")";
		}
		
		let returnList = "";
		for ( let i = 0 ; i < listCardNCs.length-2 ; i++ ){
			returnList += ( i === 0 ? "" : "," ) + listCardNCs[i];
		}
		priceBtn.setAttribute( "listCardNCs", returnList );

	};
	
	//取得所有指定name的物件值
	const getValuesByName = (name) => {
		const rtnValues = [];
		const objs = getByName(name);
		for (const obj of objs) {
			rtnValues.push( obj.value );			
		}
		return rtnValues;
	};

	//取得所有指定class的物件值
	const getValuesByCN = (name) => {
		const rtnValues = [];
		const objs = getByClass(name);
		for (const obj of objs) {
			rtnValues.push( obj.value );			
		}
		return rtnValues;
	};
	
	//取得所有指定name的checkbox的值，沒有勾選則該值為null
	const getCheckedByName = (rcName) => {
		const rtnValues = [];
		const objs = getByName(rcName);
		for (const obj of objs) {
			rtnValues.push( obj.checked );			
		}
		return rtnValues;
	};
	
	//取得RADIO的值
	const getSelectedByName = (rcName) => {
		const objs = getByName(rcName);
		for (const obj of objs) {
			if ( obj.checked ){
				return obj.value;
			}
		}
		return null;
	};
	
	//將卡牌基本資料跟set卡牌專屬資料結合
	const cloneCardData = (cardData, setCardData) => {
		const rtnObj = clone( cardData );
		if ( setCardData != null ){

			//換成該set的卡圖
			if ( setCardData.pic != null ){
				rtnObj.pic = setCardData.pic;
			}
			if ( setCardData.flavor != null && setCardData.flavor !== "" ){
				rtnObj.flavor = setCardData.flavor;
			}
			if ( setCardData.rarity != null && setCardData.rarity !== "" ){
				rtnObj.rarity = setCardData.rarity;
			}
			if ( setCardData.lastAAIndex != null ){
				rtnObj.lastAAIndex = setCardData.lastAAIndex;
			}
			if ( setCardData.nextAAIndex != null ){
				rtnObj.nextAAIndex = setCardData.nextAAIndex;
			}
			rtnObj.id = setCardData.id;
			//追加總版本數
			rtnObj.idSize = setCardData.idSize;
		}
		return rtnObj;
	};
	
	//設定物件內容不得進行簡繁轉換
	const setNoTrans = (obj) => {
		if ( obj != null ){
			obj.setAttribute("NT","1");
		}
	};
	//判斷物件是否不得進行簡繁轉換
	const isNoTrans = (obj) => {
		if ( obj == null )
			return true;
		else if ( obj.tagName == null )
			return false;
		else
			return "1" === obj.getAttribute("NT");
	};
	
	//新增歷史流程
	let queryHistory = [];
	let historyIndex = -1;
	const queryHistorySetCode = "DM-HISTORY";
	//新增卡牌至歷史紀錄
	const addHistory = (cardName) => {
	
		//記錄歷史流程(上下步驟)
		const historyObj = {
			qCardName : lastSelectedCardName,
			qSetCode : lastSelectedSetCode,
			qSetAA : lastSelectedAAIndex,
			equals : function( obj ){
				if ( obj == null )
					return false;
				if ( obj.qCardName !== this.qCardName )
					return false;
				if ( obj.qSetCode !== this.qSetCode )
					return false;
				if ( obj.qSetAA !== this.qSetAA )
					return false;
				return true;
			},
		};
		//如果沒有上下頁記錄就直接存入
		if ( queryHistory.length === 0 ){
			queryHistory.push( historyObj );
			historyIndex = 0;
		//如果historyIndex=-1、或是如果historyIndex>陣列長度的話表示違法操作、不執行處理
		} else if ( historyIndex === -1 || ( historyIndex > queryHistory.length - 1 ) ){
		//如果物件相同的話，表示是按上下頁或是RELOAD、僅執行上下頁顯示
		} else if ( historyObj.equals( queryHistory[historyIndex] ) ){
		} else {
			//步驟一：斷尾
			while( ( queryHistory.length - 1 ) > historyIndex ){
				queryHistory.pop();
			}
			//步驟二：新增物件
			queryHistory.push( historyObj );
			historyIndex++;
		}
		//處理上下頁功能顯示
		if ( getById("arrow_his_last") != null ){
			getById("arrow_his_last").style.color = ( historyIndex === 0 ) ? "#370d00" : "#FFFFFF";
			getById("arrow_his_last").style.cursor = ( historyIndex === 0 ) ? "auto" : "pointer";
		}
		if ( getById("arrow_his_next") != null ){
			getById("arrow_his_next").style.color = ( historyIndex === ( queryHistory.length - 1 ) ) ? "#370d00" : "#FFFFFF";
			getById("arrow_his_next").style.cursor = ( historyIndex === ( queryHistory.length - 1 ) ) ? "auto" : "pointer";
		}

		//記錄到歷史紀錄(不重覆記錄相同卡牌)
		const queryHistorySet = setDatas.getSetDatas( queryHistorySetCode );
		if (queryHistorySet) {
			const existingCard = queryHistorySet.setCards.find(c => c.name === cardName);
			if (existingCard) {
				if (isRD()) {
					existingCard.count = (existingCard.count || 0) + 1;
				}
			} else {
				arrayInsert(queryHistorySet.setCards, 0, { name: cardName, count: isRD() ? 1 : null });
			}
		}
	};
	
	//上下頁操作
	const goLastNext = (isLast) => {
		if ( historyIndex === 0 && isLast ){
			return;
		} else if ( historyIndex > queryHistory.length - 1 && !isLast ){
			return;
		} else {
			historyIndex += ( isLast ? -1 : 1 );
			const hisObj = queryHistory[ historyIndex ];
			lastSelectedCardName = hisObj.qCardName;
			lastSelectedSetCode = hisObj.qSetCode;
			lastSelectedAAIndex = hisObj.qSetAA;
			openDataBlock();
		}
	};
	
	//開啟歷史紀錄
	const showQueryHistory = () => {
		limitsReset();
		lastSelectedSetCode = queryHistorySetCode;
		query();
		limitsReset();
	};
	
	//取得卡牌SRC
	const proxyDomain = "https://api.allorigins.win/raw?url=";
	const getImgSrc = (dmCard) => {
		if ( dmCard == null || dmCard === "" ){
			return "./noPic.png";
		} else if ( dmCard.startsWith("http") || dmCard.startsWith("./") ){
			if ( dmCard.startsWith("https://dm.takaratomy.co.jp/") ){
				return dmCard;
			} else {
				return proxyDomain + dmCard;
			}
		} else if ( dmCard.match( /\w\/\w{2}\/[\w\-\(\)%]+/ ) ){
			return "http://vignette.wikia.nocookie.net/duelmasters/images/" + dmCard + ".jpg/revision/latest/scale-to-width-down/450";
		} else {
			return "./noPic.png";
		}
	};
	
	//設定圖片大小
	const setPicObjSize = (imgObj, picTargetObjId, picWidth, picHeight, openTitle) => {

		let widthPercent = 0;
		if ( picWidth != null ){
			widthPercent = parseInt( picWidth ) / parseInt( imgObj.width );
		}
		let heightPercent = 0;
		if ( picHeight != null ){
			heightPercent = parseInt( picHeight ) / parseInt( imgObj.height );
		}
		const whPercent = Math.max( 0.01 , widthPercent , heightPercent );
		const picObj = getById( picTargetObjId );
		
		if ( picWidth != null ){
			picObj.width = ( parseInt( imgObj.width ) * whPercent );
		}
		if ( picHeight != null ){
			picObj.height = ( parseInt( imgObj.height ) * whPercent );
		}
		picObj.style.display = 'block';
		picObj.style.cursor = 'pointer';
		picObj.onclick = function(){
			const w = window.open();
			if ( openTitle != null ){
				w.document.write( `<head><title>${openTitle}</title></head>` );
			}
			if ( isMobile() ){
				w.document.write( "<body>" );
			} else {
				w.document.write( `<body width='${this.width}' height='${this.height}'>` );
			}
			w.document.write( `<img src='${this.src}' onclick='window.close();' style='cursor:pointer;' id='img'>` );
			w.document.write( "</body>" );
		};
	};
	
	//自gathe.jp/wikia取得卡圖
	const getImgFromOutSite = (dmCardData, width, height, index) => {
		
		let dmCard = dmCardData.pic;
		let isBackReadData = false;
		if ( dmCard === "" ){
			const backReadData = cardDatas.getDataByName( dmCardData.name );
			if ( backReadData != null ){
				dmCard = backReadData.pic;
				isBackReadData = true;
			}
		}
		const img = document.createElement('img');
		img.src = getImgSrc( dmCard );		
		img.id = picIdHeader + index;

		const pic = new Image();
		pic.src = img.src;
		pic.crossorigin="anonymous";
		if ( index != null ){
			img.style.display = 'none';
			if ( isBackReadData ){
				img.style.opacity = '0.5';
			}
			//圖片讀取完成之後，進行大小調整
			pic.onload = (() => {
				const picTargetObjId = img.id;				
				const picWidth = width;
				const picHeight = height;
				const openTitle = dmCardData.name + ( dmCardData.id != null ? "( " + dmCardData.id + " )" : "" );
				return function(){
					setPicObjSize( this, picTargetObjId , picWidth , picHeight , openTitle );
					showDataPicture( true );
				};
			})();
		} else {
			if ( width != null ){
				img.style.width = width;
			}
			if ( height != null ){
				img.style.height = height;
			}
		}
		let noPic = null;
		//如果沒有特定圖片，而由總資料裡拿卡圖來使用的話，就多回傳一個[無圖]圖片
		if ( isBackReadData ){
			noPic = document.createElement('img');
			noPic.src = getImgSrc( "" );
			noPic.style.position = "absolute";
			if ( isMobile() ){
				noPic.style.left = "-100px";
			}
			noPic.style.width = "200px";
			noPic.style.height = "200px";
		}
		return noPic == null ? [ img ] : [ noPic, img ];
	};
	
	//依費用/攻擊力排序
	const sortObjectsByCost = (arr, sortStand, ascending = true) => {

		// 確保是陣列（因為要排序）
		if (!Array.isArray(arr)) arr = [arr];

		// 定義一個取代表值的函式
		const getRepresentativeValue = (obj) => {
			// 若有 wData，取其中的最小或最大 Cost/Power
			if (Array.isArray(obj.wData)) {
				const values = [];
				if ( sortStand === 'Cost' ){
					values.push(...obj.wData.map(o => o.cost ?? null));
				}
				if ( sortStand === 'Power' ){
					values.push(...obj.wData.map(o => o.power ?? null));
				}
				const filtered = values.filter(v => v !== null);
				if (filtered.length === 0) 
					return null;
				return ascending ? Math.min(...filtered) : Math.max(...filtered);
			} else {
				// 單一物件
				if ( sortStand === 'Cost' )
					return obj.cost ?? null;
				if ( sortStand === 'Power' )
					return obj.power ?? null;
				return null;
			}
		};

		// 排序
		arr.sort((a, b) => {
			const valA = getRepresentativeValue(a);
			const valB = getRepresentativeValue(b);

			// 處理 null（視為最小）
			if (valA === null && valB === null) return 0;
			if (valA === null) return ascending ? -1 : 1;
			if (valB === null) return ascending ? 1 : -1;

			// 一般數值比較
			return ascending ? valA - valB : valB - valA;
		});

		return arr;
	};
	
	//取得過濾、排序後的資料列表
	const getSortList = (sort, desc, twsd) => {

		let sortCardDatas = [];
		const sortCardExDatas = [];
		
		if ( desc == null )
			desc = false;
			
		//過濾種族
		const raceLimits = getValuesByName( "filter_race" );
		//過濾種族是否完全指定
		const raceAbsoluteCheckeds = getCheckedByName( "filter_absoluteRace" );
		//卡種是否涵蓋子類別
		const ctIncludeChildren = $("#downSearch").is(":checked");
		//卡種
		const ctValues = [];
		const _ctVs = getCheckboxValues( "cardType" );
		for (const _ctV of _ctVs) {
			const checkedCTCode = _ctV;
			ctValues.push( checkedCTCode );
			//如果使用者勾選了類別卡種、或是允許向下尋找的話，則將所有子卡種加進來
			if ( ctIncludeChildren || cardTypeMapping.getDataByValue( checkedCTCode ).catagory ){
				for (const mapItem of cardTypeMapping.map.values()) {
					if ( cardTypeMapping.hasParent( mapItem.value, checkedCTCode ) ){
						if ( !ctValues.includes( mapItem.value ) ){
							ctValues.push( mapItem.value );
						}
					}
				}
			}
		}
		//雙極與否
		const wValue = getSelectedByName('wType');
		//允許文明
		const allowCivilValues = [];
		const allowCivilBtns = getByName("allowCivil");
		for (const btn of allowCivilBtns) {
			if ( btn.getAttribute("class") === "btnClick" ){
				allowCivilValues.push( parseInt( btn.getAttribute("civil") ) );
			}
		}
		//允許文明總值
		const allowCivilTotal = allowCivilValues.reduce((a, b) => a + b, 0);
		//單多色卡
		let allowTypeValus = "";
		const atBtns = getByName("allowType");
		for (const btn of atBtns) {
			if ( btn.getAttribute("class") === "btnClick" ){
				allowTypeValus += btn.getAttribute("allowType");
			}
		}
		//必須文明
		const civilValues = [];
		const civilBtns = getByName("civil");
		for (const btn of civilBtns) {
			if ( btn.getAttribute("class") === "btnClick" ){
				civilValues.push( parseInt( btn.getAttribute("civil") ) );
			}
		}
		//必須文明總值
		const civilTotal = civilValues.reduce((a, b) => a + b, 0);
		//必須文明類型
		let civilType = "";
		const civilTypeBtns = getByName("civilType");
		for (const btn of civilTypeBtns) {
			if ( btn.getAttribute("class") === "btnClick" ){
				civilType = btn.getAttribute("allowType");
			}
		}
		
		const soulValues = getCheckboxValues( "soul" );
		const detailFilter = "－" === getById("filter_plus").innerText;
		const costValue = getById( "cost" ).value;
		const costValue2 = getById( "cost2" ).value;
		const powerValue = getById( "power" ).value;
		const powerValue2 = getById( "power2" ).value;
		const cardNameValue = getById( "cardName" ).value.toUpperCase();

		//指定能力關鍵字
		const customerAbilitiesFilterValue = getById("customerAbilitiesFilter").value.split(/\s/g).filter(s => s !== '');
		const abilitiesValues = getValuesByName( "abilities" );
		//指定種族關鍵字
		const abilitiesRaceValues = getById("ab_race").value;
		//指定卡名關鍵字
		const abilitiesNameValues = getById("ab_name").value;
		//為求便利，將種族關鍵字跟卡名關鍵字放進能力關鍵字值陣列末
		abilitiesValues.push( abilitiesRaceValues );
		abilitiesValues.push( abilitiesNameValues );
		//稀有度
		const rarilityValues = getCheckboxValues( "rarility" );
		//沒選等同於全選
		if ( rarilityValues.length === getByName("rarility").length ){
			rarilityValues.length = 0; // 清空以表示全選
		}
		
		//如果有指定SET的話，就只查那個SET的內容
		let baseList = cardDatas.getList( lastSelectedSetCode );
		//過濾台灣環境
		if ( twsd ){
			baseList = baseList.filter(card => twsdCards.includes(card.name));
		}
		//如果沒有指定SET的話，就依照卡名進行排序
		if ( lastSelectedSetCode == null || lastSelectedSetCode === "" ){
			baseList.sort((a, b) => {
			  if (a.name > b.name) {
				return 1;
			  }
			  if (a.name < b.name) {
				return -1;
			  }
			  return 0;
			});
		}
		
		for (const theCard of baseList) {
			const insertDatas = [];
			if ( theCard.wData == null ){
				insertDatas.push( cardDatas.getSelectedCardByUdIndex( theCard ) );
			} else {
				//先檢查雙極卡有沒有符合上下大小條件，沒有的話就踢掉
				if ( theCard.mType === 'T' ){
					const uCost = theCard.wData[0].cost;
					const dCost = theCard.wData[1].cost;
					if ( uCost > dCost && !$('input[name=wUdCase][value=U]').is(":checked") )
						continue;
					if ( uCost === dCost && !$('input[name=wUdCase][value=S]').is(":checked") )
						continue;
					if ( uCost < dCost && !$('input[name=wUdCase][value=D]').is(":checked") )
						continue;
				}
				//能力混找
				if ( $('input[name=wSearchType]').is(":checked") ){
					let allSps = [];
					const wDatas = [];
					for ( let udIndex = 0 ; udIndex < theCard.wData.length ; udIndex++ ){
						allSps = arrayAnd( allSps, theCard.wData[udIndex].sp );
						wDatas.push( cardDatas.getSelectedCardByUdIndex( theCard, udIndex ) );
					}
					for (const wData of wDatas) {
						// [修改] 在覆蓋 sp 之前，先將原始能力備份到 orgSp
						wData.orgSp = wData.sp;
						
						wData.sp = allSps;
						insertDatas.push( wData );
					}
				//能力不混找
				} else {
					for ( let udIndex = 0 ; udIndex < theCard.wData.length ; udIndex++ ){
						insertDatas.push( cardDatas.getSelectedCardByUdIndex( theCard, udIndex ) );
					}
				}
			}
			for (const insertData of insertDatas) {
				let idCivil = insertData.civil;
				//過濾卡牌時，如果有指定卡種的話，則雙極卡只使用其中一邊的文明進行過濾、沒有指定的話，則雙極卡的文明由上下兩者合計
				if ( insertData.ws != null && ctValues.length === 0 ){
					idCivil = cardDatas.getDataByName( insertData.name, null, null, 0 ).civil | cardDatas.getDataByName( insertData.name, null, null, 1 ).civil;
				}
				let insertIndex = 0;
				//判斷過濾條件
				//A.文明
				//A-1.許可文明
				if ( ( allowCivilTotal & idCivil ) !== idCivil ){
					continue;
				}
				//A-1.1非多色
				if ( allowTypeValus === "S" ){
					//無色不影響單／多色判斷
					if ( !singleColors.includes( idCivil > 32 ? idCivil % 32 : idCivil ) ){
						continue;
					}
				//A-1.2多色
				} else if ( allowTypeValus === "M" ){
					//無色不影響單／多色判斷
					if ( singleColors.includes( idCivil > 32 ? idCivil % 32 : idCivil ) ){
						continue;
					}
				//A-1.3不指定
				}
				//A-2.必須文明
				if ( civilTotal > 0 ){
					//A-2.1全數符合
					if ( civilType === 'A' ){
						if ( ( civilTotal | idCivil ) !== idCivil ){
							continue;
						}
					//A-2.2部分符合
					} else if ( civilType === 'O' ){
						if ( ( civilTotal & idCivil ) === 0 ){
							continue;
						}
					}
				}
				// B.種族 (修正版)
				let isErrorRace = false;

				// 1. [關鍵修正] 只抓取 "主種族過濾器" 容器內的 race-row
				// 這樣可以避免 ab_race (位於 abilityContainer) 被誤認為是卡片種族條件
				const raceRows = document.querySelectorAll("#raceContainer_PC .race-row, #raceContainer_Mobile .race-row");
				
				// 2. 遍歷每一列條件
				for (const row of raceRows) {
					const valInput = row.querySelector('input[name="raceValue"]');
					const absCheck = row.querySelector('input[name="raceAbsolute"]');

					if (valInput && valInput.value && valInput.value !== "") {
						const rValue = valInput.value; 
						const isAbsolute = absCheck ? absCheck.checked : false;

						if ( insertData.race == null || insertData.race.length === 0 ){
							isErrorRace = true;
							break;
						}
						if (isAbsolute) {
							if ( !insertData.race.includes( rValue ) ){
								isErrorRace = true;
								break;
							}
						} else {
							if ( !arrayIncludeLike( insertData.race, rValue ) ){
								isErrorRace = true;
								break;
							}
						}
					}
				}

				if ( isErrorRace ){
					continue;
				}
				//C.類型
				if ( !getById("skipType").checked ){
					let typeMatched = false;
					for (const type of insertData.type) {
						if ( ctValues.includes( type ) ){
							typeMatched = true;
							break;
						}
					}
					if ( !typeMatched ){
						continue;
					}
				}
				//C-2.雙極
				if ( wValue === 'W' && insertData.mType !== 'T' ){
					continue;
				}
				if ( wValue === 'NW' && insertData.mType === 'T' ){
					continue;
				}
				//D.Cost
				if ( costValue !== "" || costValue2 !== "" ){
					if ( insertData.cost == null )
						continue;
					if ( !detailFilter ){
						if ( costValue !== "" && insertData.cost !== parseInt(costValue) )
							continue;
					} else {
						if ( costValue !== "" && insertData.cost < parseInt(costValue) )
							continue;
						if ( costValue2 !== "" && insertData.cost > parseInt(costValue2) )
							continue;
					}
				}
				//E.Power
				if ( powerValue !== "" || powerValue2 !== "" ){
					if ( insertData.power == null )
						continue;
					if ( !detailFilter ){
						if ( powerValue !== "" && insertData.power !== parseInt(powerValue) )
							continue;
					} else {
						if ( powerValue !== "" && insertData.power < parseInt(powerValue) )
							continue;
						if ( powerValue2 !== "" && insertData.power > parseInt(powerValue2) )
							continue;
					}
				}
				//F.Name
				if ( cardNameValue !== "" ){
					const cardNameUpper = insertData.name.replace(/[ 　]/g,"").toUpperCase();
					const clearNameUpper = clearSubName( insertData.name.replace(/[ 　]/g,"") ).toUpperCase();
					const filterNameUpper = cardNameValue.replace(/[ 　]/g,"");

					if ( cardNameUpper.indexOf( filterNameUpper ) === -1 && 
						clearNameUpper.indexOf( filterNameUpper ) === -1 ) {
						continue;
					}
				}
				//G.Soul
				if ( soulValues.length > 0 ){
					if ( insertData.soul == null || insertData.soul.length === 0 ){
						continue;
					} else {
						const hasAllSoul = soulValues.every(soul => insertData.soul.includes(soul));
						if ( !hasAllSoul ){
							continue;
						}
					}
				}
				//H.能力
				let absAllow = true;
				for ( let abs = 0 ; abs < abilitiesValues.length ; abs++ ){
					//最後一個是過濾值是種族，而非能力
					const isKW = ( abs < ( abilitiesValues.length - 2 ) );
					const isRC = ( abs === abilitiesValues.length - 2 );
					const isCN = ( abs === abilitiesValues.length - 1 );
					const abilitiesValue = abilitiesValues[abs];
					if ( abilitiesValue !== "" ){
					
						let hasKeyWordAbility = false;
						//如果是無能力卡牌
						//如果是無能力卡牌
						if ( isKW && abilitiesValue === "empty" ){
							
							// [修改] 決定檢查對象：若有備份的原始能力(orgSp)則優先使用，否則使用目前能力(sp)
							const checkTargetSp = insertData.orgSp || insertData.sp;

							//如果無能力、或是能力數量為0的話就通過
							// [修改] 改檢查 checkTargetSp
							if ( checkTargetSp == null || checkTargetSp.length === 0 ){
								hasKeyWordAbility = true;
							} else {
								// [修改] 嚴謹判斷：檢查是否為「實質」無能力 (忽略 IG 標籤內容)
								// 預設假設它沒有能力，只要發現任何一行有「實質內容」就翻盤
								let isVanilla = true;
								
								// [修改] 改遍歷 checkTargetSp
								for (const spItem of checkTargetSp) {
									// 1. 先把 IG 內容挖乾淨，並去除前後空白
									const cleanStr = spItem.replace(/\(IG\)[\s\S]*?\(\/IG\)/g, "").trim();
									
									// 2. 如果挖完還有剩字，且剩下的不是「沒有書寫任何能力」這種官方廢話
									if ( cleanStr.length > 0 && !cleanStr.includes( "沒有書寫任何能力" ) ){
										isVanilla = false; // 抓到了！你有寫實質效果！
										break;
									}
								}
								
								if ( isVanilla ){
									hasKeyWordAbility = true;
								}
							}
						//搜尋目標不是無能力卡牌的話
						} else {
						
							//能力設定有問題，打掉
							if ( insertData.sp == null ){
								absAllow = false;
							} else {
							
								for (const spItem of insertData.sp) {
									
									// [修改] 搜尋時：先將 (IG)...(/IG) 整段內容挖空
									const searchTargetStr = spItem.replace(/\(IG\)[\s\S]*?\(\/IG\)/g, "");

									//先判斷能力裡面有沒有關鍵字，有再往下做以節省時間
									// [修改] 改用 searchTargetStr 判斷
									if ( searchTargetStr.indexOf( abilitiesValue ) === -1 ){
										continue;
									}
									//將能力轉成TAG
									// [修改] 改用 searchTargetStr 轉換，確保不會產生隱藏內容的 TAG
									const parseTags = keyWords.transTags( searchTargetStr );
									if ( parseTags != null ){
										for (const tag of parseTags) {
											//要有getAttribute
											if ( tag.getAttribute == null )
												continue;
											const sTagType = tag.getAttribute( "sTagType" );
											if ( isKW && ( sTagType !== "K" ) )
												continue;
											if ( isRC && ( sTagType !== "R" ) )
												continue;
											if ( isCN && ( sTagType !== "N" ) )
												continue;
											//只允許能力TAG
											if ( tag.getAttribute("keyJap").includes( abilitiesValue ) ){
												hasKeyWordAbility = true;
												break;
											}
										}
										if ( hasKeyWordAbility ) break;
									}							
								}
							}
						}
						//關鍵字不符，查詢spTagExtends
						if ( !hasKeyWordAbility && insertData.spTagExtends != null ){
							if ( insertData.spTagExtends.includes( abilitiesValue )  ){
								hasKeyWordAbility = true;
							}
						}
						//能力標籤跟關鍵字都不符就踢掉
						if ( !hasKeyWordAbility ){
							absAllow = false;
						}
					}
				}
				if ( customerAbilitiesFilterValue.length > 0 ){
					let abText = "";
					for (const spItem of insertData.sp) {
						
						// [修改] 搜尋時：先將 (IG)...(/IG) 整段內容挖空
						const searchTargetStr = spItem.replace(/\(IG\)[\s\S]*?\(\/IG\)/g, "");

						// [修改] 改用 searchTargetStr
						const parseTags = keyWords.transTags( searchTargetStr );
						for (const tag of parseTags) {
							abText += ( tag.innerText == null ? tag.data : tag.innerText );
						}
					}
					abText = translateText( abText, isTC2C );
					for (const filterValue of customerAbilitiesFilterValue) {
						if ( !abText.includes( filterValue ) ){ 
							absAllow = false;
							break;
						}
					}
				}
				if ( !absAllow ){
					continue;
				}
				//I.稀有度
				if ( rarilityValues.length > 0 ){
					let isInRarility = false;
					for (const setMap of setDatas.map.values()) {
						if (isInRarility) break;
						for (const cardDataInSet of setMap) {
							if ( cardDataInSet.name === insertData.name ){
								const ir = Array.isArray( cardDataInSet.rarity ) ? cardDataInSet.rarity : [ cardDataInSet.rarity ];
								for (const rarity of ir) {
									if ( rarilityValues.includes( rarity ) ){
										isInRarility = true;
										break;
									}
								}
								if (isInRarility) break;
							}
						}
					}
					if ( !isInRarility ){
						continue;
					}
				}
				if ( sort === "" ){
					// 如果沒有指定排序順序、又有指定牌庫的話，就把超次元牌庫的卡牌排到最下面
					const sd = setDatas.getSetDatas( lastSelectedSetCode );
					if ( sd != null && sd.isDeck ){
						if ( insertData.back != null ){
							sortCardExDatas.push( theCard );
						} else {
							sortCardDatas.push( theCard );
						}
					// 其他狀況就不考慮排序直接塞入資料
					} else {
						sortCardDatas.push( theCard );
					}
					// 由於沒有排序，一旦卡片被加入，就跳出內層循環，避免雙極卡重複處理 (已優化為在外層處理完畢)
					break; 
				} else {
					
					// 執行排序插入
					const insertSortValue = insertData[sort] === null ? "" : insertData[sort];
					let foundInsertIndex = false;
					
					for (let i = 0; i < sortCardDatas.length; i++) {
						const savedCard = cardDatas.getDataByName(sortCardDatas[i].name);
						const saveSortValue = savedCard[sort] === null ? "" : savedCard[sort];

						if (desc) {
							if (insertSortValue > saveSortValue) {
								arrayInsert(sortCardDatas, i, theCard);
								foundInsertIndex = true;
								break;
							}
						} else {
							if (insertSortValue < saveSortValue) {
								arrayInsert(sortCardDatas, i, theCard);
								foundInsertIndex = true;
								break;
							}
						}
					}
					
					if (!foundInsertIndex) {
						sortCardDatas.push(theCard);
					}
					// 由於已處理排序，一旦卡片被加入，就跳出內層循環，避免雙極卡重複處理 (已優化為在外層處理完畢)
					break; 
				}
			}
		}

		//把超次元牌庫資料接在非超次元牌庫之後
		sortCardDatas = sortCardDatas.concat(sortCardExDatas);

		//判斷最後顯示點選的卡片是否存在於新的查詢列表裡，沒有的話就要清除最後的卡片詳述
		const hadOldTarget = sortCardDatas.some(card => card.name === lastSelectedCardName);
		if ( !hadOldTarget )
			lastSelectedCardName = null;
		openDataBlock();
		
		return sortCardDatas;
	};
	
	//開啟/關閉資料頁圖片
	const showDataPicture = (isShowPicture) => {
		getById( "card_picture" ).style.display = isShowPicture ? "inline" : "none";
		getById( "card_picture_empty" ).style.display = isShowPicture ? "none" : "inline";
	};
	
	//開啟卡牌詳細資料
	const openDataBlock = () => {
	
		//用卡名去查詢資料
		const selectedCardDats = cardDatas.getDataByName( lastSelectedCardName , lastSelectedSetCode , lastSelectedAAIndex, lastSelectedUdIndex );

		//將詳細資料表格初始化並隱藏
		$('#cardDataBlock').hide();
		$('#card_name_header').css('background', '');
		$('#card_rarity, #card_name, #card_picture, #card_type, #card_cost, #card_civil, #card_mana, #card_race, #card_soul, #card_power, #card_back, #card_flavor, #card_sets, #card_sanctuary, #card_abilities').empty();
		
		showDataPicture( false );
		
		$('#tr_cost, #tr_race, #tr_soul, #tr_power, #tr_back, #tr_flavor, #tr_card_sanctuary').show();
		
		getByClass( "sell_ruten" ).forEach(span => span.style.display = "");
		
		getById( "lastAAIndex" ).value = "";
		getById( "nextAAIndex" ).value = "";
		if ( !isVM() ){
			$('#tr_card_sanctuary').show();
		}

		//依是否有資料來進行處理
		if ( selectedCardDats != null ){
		
			//紀錄查詢歷史
			addHistory( lastSelectedCardName );
			
			//嵌入內容並顯示區塊
			$('#cardDataBlock').show();
			//卡圖
			let t_w = 200;
			let t_h = null;
			let isHorizontal = true;
			for (const type of selectedCardDats.type) {
				if ( !cardTypeMapping.getDataByValue( type ).horizontal ){
					isHorizontal = false;
				}
			}
			if ( isHorizontal ){
				t_w = null;
				t_h = 180;
			}
			const cardImages = getImgFromOutSite( selectedCardDats , t_w , t_h , "block" );
			for (const img of cardImages) {
				getById( "card_picture" ).appendChild( img );
			}
			//文明標頭圖
			getById( "card_name_header" ).style.backgroundImage = civilMapping.getBackgroundCSS( selectedCardDats.civil );
			//卡名
			let showCardName = selectedCardDats.name;
			//如果有指定SET的話，則加上ID
			if ( lastSelectedSetCode != null && selectedCardDats.id != null ){
				showCardName += " ( " + selectedCardDats.id + " ) ";
			}
			const cardNameSpan = document.createElement('span');
			cardNameSpan.appendChild( document.createTextNode( showCardName ) );
			setNoTrans( cardNameSpan );
			getById( "card_name" ).appendChild( cardNameSpan );
			getById( "card_name" ).ondblclick = () => {
				Clipboard.copy( selectedCardDats.name );
			};
			
			//如果有稀有度的話就加上去
			if ( selectedCardDats.rarity != null && selectedCardDats.rarity !== "" ){
				const card_rarity_TD = getById( "card_rarity" );
				const rarityPics = rarityPic.getRarityPicture( selectedCardDats.rarity );
				for (const img of rarityPics) {
					card_rarity_TD.appendChild( img );
				}
			}
			//殿堂
			let sanc = -1;
			let sancChi = "";
			let sancTitle = "";
			let queryName = null;
			let scIndex = -1;
			if ( sanctuary.sanctuary1.has( selectedCardDats.name ) ){
				sanc = 1;
				sancChi = "殿堂";
				sancTitle = "此卡只能放一張在牌庫裡";
			} else if ( sanctuary.sanctuary0.has( selectedCardDats.name ) ){
				sanc = 0;
				sancChi = "白金殿堂";
				sancTitle = "此卡不能放在牌庫裡";
			} else if ( ( scIndex = sanctuary.getSanctuaryCIndex( selectedCardDats.name ) ) !== -1 ){
				sanc = 4;
				sancChi = "組合殿堂";
				const partnerIndex = scIndex + ( scIndex % 2 === 0 ? 1 : -1 );
				queryName = sanctuary.sanctuaryC[partnerIndex];
				if ( nameCategory.isCategory( queryName ) ){
					sancTitle = "此卡不能跟名中有《" + queryName + "》的卡一起放在牌庫裡";
				} else {
					sancTitle = "此卡不能跟《" + queryName + "》一起放在牌庫裡";
				}
			}
			if ( sanc !== -1 ){
				const sanctuarySpan = document.createElement('span');
				sanctuarySpan.appendChild( document.createTextNode( "★" + sancChi ) );
				sanctuarySpan.title = sancTitle;
				sanctuarySpan.style.cursor = "pointer";
				if ( sanc === 4 ){
					sanctuarySpan.style.textDecoration = "underline";
					sanctuarySpan.onclick = (() => {
						const cardName = queryName;
						return () => {
							//如果是類別卡名的話，就進行搜尋
							if ( nameCategory.isCategory( cardName ) ){
								queryByNameOnly( cardName , false );
							//不是的話就直接跳內容
							} else if ( cardDatas.getDataByName( cardName , null ) != null ){
								lastSelectedCardName = cardName;
								openDataBlock();
								changeListCSS();
							}
						};
					})();
				}
				getById( "card_sanctuary" ).appendChild( sanctuarySpan );
			} else {
				if ( isVM() ){
					$('#tr_card_sanctuary').hide();
				}
			}
			//種類
			const cws = selectedCardDats.ws == null ? [ selectedCardDats.type ] : selectedCardDats.ws;
			for ( let w = 0 ; w < cws.length ; w++ ){
				if ( w > 0 ){
					getById( "card_type" ).appendChild( document.createTextNode( " / " ) );
				}
				const nameSpan = document.createElement('span');
				nameSpan.setAttribute("name", "nameSpan");
				let typeText = "";
				for ( let wt = 0 ; wt < cws[w].length ; wt++ ){
					if ( wt > 0 ){
						typeText += "/";
					}
					if ( selectedCardDats.mType === 'H' && w > 0 && cws[w][0] === cws[w][wt] ){
						typeText += "超化";
					} else {
						typeText += cardTypeMapping.getTextByValue( cws[w][wt] );
					}
				}
				nameSpan.appendChild( document.createTextNode( typeText ) );
				const lsui = lastSelectedUdIndex == null ? 0 : lastSelectedUdIndex;
				if ( lsui !== w ){
					nameSpan.style.cursor = 'pointer';
					nameSpan.style.color = "blue";
					nameSpan.style.textDecoration = "underline";
					nameSpan.onclick = (() => {
						const selectedUdIndex = w;
						return () => {
							lastSelectedUdIndex = selectedUdIndex;
							openDataBlock();
							changeListCSS();
						};
					})();
				}
				getById( "card_type" ).appendChild( nameSpan );
			}
			//費用
			if ( selectedCardDats.cost != null ){
				getById( "card_cost" ).appendChild( document.createTextNode( ( selectedCardDats.cost === Number.MAX_SAFE_INTEGER ? "∞" : selectedCardDats.cost ) ) );
			} else {
				$('#tr_cost').hide();
			}
			//文明
			getById( "card_civil" ).appendChild( document.createTextNode( civilMapping.getTextByValue( selectedCardDats.civil ) ) );
			//種族
			if ( selectedCardDats.race == null ){
				$('#tr_race').hide();
			} else {
				for ( let i = 0 ; i < selectedCardDats.race.length ; i++ ){
					if ( i > 0 ){
						//四種族以內用<BR>、超過就用"/"
						getById( "card_race" ).appendChild( 
							selectedCardDats.race.length <= 4 ? 
								document.createElement('br') :
								document.createTextNode( " / " )
						);
					}
					const raceSpan = document.createElement('span');
					raceSpan.appendChild( document.createTextNode( selectedCardDats.race[i] ) );
					raceSpan.style.cursor = "pointer";
					raceSpan.style.color = "blue";
					const raceObject = raceMapping.getDataByJap( selectedCardDats.race[i] );
					if ( raceObject != null ){
						raceSpan.setAttribute( "title" , raceObject.Chi + " / " + raceObject.Eng );
						setTitleAlert( raceSpan );
					}
					getById( "card_race" ).appendChild( raceSpan );
				}
			}
			//魂
			if ( selectedCardDats.soul == null ){
				$('#tr_soul').hide();
			} else {
				for ( let i = 0 ; i < selectedCardDats.soul.length ; i++ ){
					const soul = soulMapping.getDataByCode( selectedCardDats.soul[i] );
					if ( i > 0 ){
						getById( "card_soul" ).appendChild( document.createTextNode( " / " ) );
					}
					const soulSpan = document.createElement('span');
					soulSpan.appendChild( document.createTextNode( soul.Jap ) );
					soulSpan.style.cursor = "pointer";
					soulSpan.style.color = "blue";
					soulSpan.setAttribute( "title" , soul.Chi + " / " + soul.Eng );
					setTitleAlert( soulSpan );
					getById( "card_soul" ).appendChild( soulSpan );
				}
			}
			//攻擊力
			if ( selectedCardDats.power == null ){
				$('#tr_power').hide();
			} else {
				let power = "";
				if ( selectedCardDats.pc != null && selectedCardDats.type === "OA" ){
					power += ( selectedCardDats.pc ? "+" : "-" );
				}
				power += "" + ( selectedCardDats.power === Number.MAX_SAFE_INTEGER ? "∞" : selectedCardDats.power );
				if ( selectedCardDats.pc != null && selectedCardDats.type !== "OA" ){
					power += ( selectedCardDats.pc ? "+" : "-" );
				}
				getById( "card_power" ).appendChild( document.createTextNode( power ) );
			}
			//特殊能力
			const isHK = getById("HK").checked;
			const caObj = getById( "card_abilities" );
			if ( selectedCardDats.sp == null || selectedCardDats.sp.length === 0 ){
				caObj.appendChild( document.createTextNode( "　" ) );
			} else {
				const abHints = [];
				for ( let i = 0 ; i < selectedCardDats.sp.length ; i++ ){
					const isHint = selectedCardDats.sp[i].startsWith( abilitiesHintHeader );
					let spLinesStr = selectedCardDats.sp[i];
					if ( isHint ){
						spLinesStr = "( " + spLinesStr.substring( abilitiesHintHeader.length ) + " )";
					}
					const spLines = spLinesStr.split("##");
					const ulBlock = document.createElement('ul');
					ulBlock.style.margin = "0px";
					for ( let spl = 0 ; spl < spLines.length ; spl++ ){
						let abis = ( spl === 0 && !isHint && !spHeader.includes( spLines[spl].substring(0,1) ) ? "■" : "" ) + spLines[spl];
						if ( isHK ){
							abis = transHK_MathWords( abis );
						}
						const singleAbilityParts = transAbilitiesTags( abis );
						for (const part of singleAbilityParts) {
							if ( part.tagName === "SPAN" && part.getAttribute("sTagType") === "K" ){
								if ( !abHints.includes( part.getAttribute("title") ) ){
									abHints.push( part.getAttribute("title") );
								}
							}
						}
						if ( spl === 0 ){
							for (const part of singleAbilityParts) {
								caObj.appendChild( part );
							}
						} else {
							const subLine = document.createElement('li');
							for (const part of singleAbilityParts) {
								subLine.appendChild( part );
							}
							ulBlock.appendChild( subLine );
						}
						if ( i < selectedCardDats.sp.length - 1 && spLines.length === 1 ){
							getById( "card_abilities" ).appendChild( document.createElement('br') );
						}
					}
					if ( spLines.length > 1 ){
						caObj.appendChild( ulBlock );
					}
				}
				
				//效果解說
				if ( abHints.length > 0 ){

					const abHintsDiv = document.createElement("div");
					abHintsDiv.style.fontSize = "12px";
					abHintsDiv.style.display = "none";
					abHintsDiv.setAttribute("id","abHintsDiv");
					abHintsDiv.append( document.createElement("hr") );
					for (const hint of abHints) {
						const titleTexts = hint.split("\n");
						for (const text of titleTexts) {
							abHintsDiv.append( document.createTextNode( text ) );
							abHintsDiv.append( document.createElement("br") );
						}
						abHintsDiv.append( document.createElement("br") );
					}
					caObj.append( abHintsDiv );

					const abHintsBtn1 = document.createElement("div");
					abHintsBtn1.style.fontSize = "12px";
					abHintsBtn1.style.textAlign = "right";
					abHintsBtn1.appendChild( document.createElement('br') );
					abHintsBtn1.append( document.createTextNode( "▼顯示能力註釋" ) );
					abHintsBtn1.setAttribute("id","absHintsBtn1");
					abHintsBtn1.style.cursor = "pointer";
					abHintsBtn1.style.textDecoration = "underline";
					abHintsBtn1.onclick = () => {
						getById("absHintsBtn1").style.display = "none";
						getById("absHintsBtn2").style.display = "block";
						getById("abHintsDiv").style.display = "block";
					};
					caObj.appendChild( abHintsBtn1 );

					const abHintsBtn2 = document.createElement("div");
					abHintsBtn2.style.fontSize = "12px";
					abHintsBtn2.style.textAlign = "right";
					abHintsBtn2.appendChild( document.createElement('br') );
					abHintsBtn2.append( document.createTextNode( "▲關閉能力註釋" ) );
					abHintsBtn2.setAttribute("id","absHintsBtn2");
					abHintsBtn2.style.display = "none";
					abHintsBtn2.style.cursor = "pointer";
					abHintsBtn2.style.textDecoration = "underline";
					abHintsBtn2.onclick = () => {
						getById("absHintsBtn2").style.display = "none";
						getById("absHintsBtn1").style.display = "block";
						getById("abHintsDiv").style.display = "none";
					};
					caObj.appendChild( abHintsBtn2 );
					
				}
			}
			//魔力支付
			if ( selectedCardDats.mana == null ){
				$('#tr_mana').hide();
			} else {
				getById( "card_mana" ).appendChild( document.createTextNode( selectedCardDats.mana) );
			}
			//翻面
			if ( selectedCardDats.back != null ){
				
				const card_back = getById( "card_back" );
				const backNames = Array.isArray( selectedCardDats.back ) ? selectedCardDats.back : [ selectedCardDats.back ];
				for (const backName of backNames) {
					if ( card_back.firstChild ){
						card_back.appendChild( document.createElement('br') );
					}
					const backSpan = document.createElement('span');
					//卡名不作簡繁轉換
					setNoTrans( backSpan );
					backSpan.appendChild( document.createTextNode( clearSubName( backName ) ) );
					//判斷該卡是否存在
					if ( cardDatas.getDataByName( backName ) != null ){
						backSpan.style.cursor = "pointer";
						backSpan.style.color = "blue";
						backSpan.onclick = (() => {
							const backNameClosure = backName;
							return () => {
								lastSelectedCardName = backNameClosure;
								openDataBlock();
								changeListCSS();
							};
						})();
					}
					card_back.appendChild( backSpan );
				}
				
			} else {
				$('#tr_back').hide();
			}			
			//敘述
			if ( selectedCardDats.flavor == null ){
				$('#tr_flavor').hide();
			} else {
				const cFlavor = getById( "card_flavor" );
				const flavors = Array.isArray( selectedCardDats.flavor ) ? selectedCardDats.flavor : [ selectedCardDats.flavor ];
				for (const flavor of flavors) {
					if ( cFlavor.firstChild ){
						cFlavor.appendChild( document.createElement('br') );
					}
					const singleFlavorParts = transAbilitiesTags( flavor );
					for (const part of singleFlavorParts) {
						cFlavor.appendChild( part );
					}
				}
			}
			//同彈他繪與ID
			$('#card_picture_aa, #lastAATd, #nextAATd').hide();
			let hasLeft = false;
			let hasRight = false;
			if ( selectedCardDats.lastAAIndex != null || selectedCardDats.nextAAIndex != null ){
				$('#card_picture_aa').show();
				//異動版本說明
				getById( 'aaIndexHint' ).innerText = ( parseInt( lastSelectedAAIndex == null ? 0 : lastSelectedAAIndex ) + 1 ) + " / " + selectedCardDats.idSize;
				//網頁版才處理">>""<<"
				if ( selectedCardDats.lastAAIndex != null ){
					if ( !isVM() )
						$('#lastAATd').show();
					getById( 'lastAAIndex' ).value = selectedCardDats.lastAAIndex;
					hasLeft = true;
				}
				if ( selectedCardDats.nextAAIndex != null ){
					if ( !isVM() )
						$('#nextAATd').show();
					getById( 'nextAAIndex' ).value = selectedCardDats.nextAAIndex;
					hasRight = true;
				}
			}
			//處理功能箭頭(不含上下頁)
			processArrows( hasLeft , true , true , hasRight );
			//收錄
			const inSetTd = getById( "card_sets" );
			const jpOnly = [];
			const twIncluded = [];
			for (const set of setDatas.set.values()) {
				const cardDataOfSet = setDatas.getCardDataInSet( set.setCode , lastSelectedCardName );
				if ( cardDataOfSet != null && cardDataOfSet.id != null ){
					//收錄
					const inSet = document.createElement('span');
					let inSetName = set.setCode + " " + set.setName;
					if ( set.setCode === lastSelectedSetCode ){
						inSetName = "【" + inSetName + "】";
						inSet.style.color = "#FFB300";
					} else {
						inSet.style.color = set.isTWSurroundings ? "#003A5F" : "#2FA8FF";
						inSet.style.cursor = "pointer";
						inSet.style.textDecoration = "underline";
						inSet.onclick = (() => {
							const gotoId = Array.isArray( cardDataOfSet.id ) ? cardDataOfSet.id[0] : cardDataOfSet.id;
							return () => {
								queryByCode( gotoId , false );
							}
						})();
					}
					inSet.appendChild( document.createTextNode( inSetName ) );
					inSet.setAttribute( "code", set.setCode );
					( set.isTWSurroundings ? twIncluded : jpOnly ).push( inSet );
				}
			}
			const jptw = [ jpOnly, twIncluded ];
			for (const list of jptw) {
				list.sort((a, b) => a.getAttribute("code").localeCompare( b.getAttribute("code") ));
				for (const item of list) {
					if ( inSetTd.firstChild ){
						inSetTd.appendChild( document.createElement('br') );
					}
					inSetTd.appendChild( item );	
				}
			}
			//露天
			if ( !twsdCards.includes( lastSelectedCardName ) ){
				getByClass( "sell_ruten" ).forEach(span => span.style.display = "none");
			}
			
			if ( isVM() && !inSetTd.firstChild ){
				inSetTd.appendChild( document.createTextNode("--") );
			}
		}
		//處理scrollBar
		if ( !isVM() ){
			autoHeight( getById("card_data_rPart") );
		}
		//簡體化
		if ( isTC2C ){
			translatePage();
		}
	};
	
	//如果是行動裝置的話，就增加customAlert( this.title )的功能
	const setTitleAlert = (obj) => {
		if ( ( obj.onclick == null ) && ( obj.title != null ) ){
			obj.onclick = function(){
				customAlert( translateText( this.title, isTC2C ) );
			}
		}
	};
	
	//自動調整物件高度(縮小)
	const autoHeight = (obj) => {
		if ( obj != null ){
			//先把高度設定移除
			obj.style.height = null;
			//如果會產生scrollbar的話再來計算高度設定
			if ( isHasScrollY() ){
				let initHeight = 1600;
				obj.style.height = initHeight + 'px';
				initHeight -= ( document.documentElement.offsetHeight - document.documentElement.clientHeight );
				if ( initHeight < 100 ){
					initHeight = 100;
				}
				obj.style.height = initHeight + 'px';
			}
		}
	};
	
	//搜尋條件初始化
	const limitsReset = () => {
		changeSetCode( null );
		const $formObj = $('#queryForm');
		$formObj[0].reset();
		
		$('input[name="cardType"]').prop('checked', false);

		changeSetSetting( getById( "setCode" ).value );
		//簡體化時，強制轉以上以下用詞
		if ( isTC2C || isHK ){
			getById("HK").checked = true;
		}
		getByName("rLan")[0].click();
		//文明過濾初始化
		getByName("allowCivil").forEach(btn => btn.className = "btnClick");
		getByName("allowType").forEach(btn => btn.className = "btnClick");
		getByName("civil").forEach(btn => btn.className = "btnUnClick");
		getByName("civilType")[0].click();
		lastSelectedAAIndex = null;
	};
	
	//更改SET指定
	const changeSetSetting = (value) => {
		lastSelectedSetCode = value;
		if ( lastSelectedSetCode === "" )
			lastSelectedSetCode = null;
	};
	
	//進行卡名搜尋
	const queryByNameOnly = (cardName, isXC) => {
	
		limitsReset();
		getById( "cardName" ).value = cardName;
		//判斷是不是要查放逐生物
		if ( isXC != null && isXC ){
			getById( "skipType" ).checked = false;
			setCheckboxValue( "cardType" , [ "XC" , "EXC" ] );
		}
		const result = query();
		//如果找出來的卡只有一筆的話，就直接顯示資料
		if ( result === 1 ){
			getById( "names" ).children[0].onclick();
		}
	};
	
	//設置物件長寬
	const calcPicSize = (picId, width, height) => {
		getById( picId ).style.width = width;
		getById( picId ).style.height = height;
	};
	
	//取得選項物件值 (已替換為原生或 jQuery)
	const getRadioValue = (radioName) => $('input[name="'+radioName+'"]:checked').val();
	
	//取得勾選物件值(陣列)
	const getCheckboxValues = (checkboxName) => {
		const results = [];
		const cbObjs = getByName(checkboxName);
		for (const obj of cbObjs) {
			if (obj.checked) {
				results.push(obj.value);
			}
		}
		return results;
	};
	
	//清除物件底下的所有子項目
	const clearChildren = (parentObject) => {
		if ( parentObject != null ){
			while ( parentObject.firstChild ) {
				parentObject.removeChild(parentObject.firstChild);
			}
		}
	};

	//將單一能力字串轉成DOM物件群
	const transAbilitiesTags = (ability) => keyWords.transTags( ability );
	
	/**
	 * [修正版 v2] 變更種族輸入框的顯示語言
	 * 修正重點：
	 * 1. 修正 placeholder 強制轉簡體的問題：不再自行判斷 isTC，而是直接讀取全域變數 isTC2C。
	 * 2. 分離「語言選擇(Chi/Eng/Jap)」與「繁簡轉換(isTC2C)」的邏輯。
	 */
	function changeRaceLan() {
		// 1. 取得全域設定的繁簡轉換參數 (依賴 tw_cn.js 中的設定)
		// 通常 isTC2C=true 為轉簡體，false 為繁體
		const getIsTC = () => (typeof isTC2C !== 'undefined' ? isTC2C : false);
		const globalIsTC = getIsTC();

		// 2. 取得目前選中的語言
		const rLanVal = $('input[name=rLan]:checked').val(); // "Jap", "Chi", "Eng"

		// 3. 遍歷所有顯示框進行更新
		const displays = document.getElementsByClassName("race-input-display");
		
		for (const disp of displays) {
			// A. 更新 Placeholder
			if (rLanVal === "Eng") {
				disp.placeholder = "All Races";
			} else {
				// 中文或日文模式下，使用全域設定來決定是否轉簡體
				disp.placeholder = translateText("全種族", globalIsTC);
			}

			// B. 更新已顯示的值
			const row = disp.parentNode;
			if (!row) continue;
			
			// 抓取 hidden input (相容 ab_race 與 raceValue)
			const hidden = row.querySelector('input[type="hidden"]');
			
			if (hidden && hidden.value && hidden.value !== "") {
				const raceID = hidden.value;
				if (typeof raceMapping !== 'undefined') {
					const raceObj = raceMapping.getDataByJap(raceID);
					if (raceObj) {
						let newText = "";
						
						// 根據語言選取對應欄位
						if (rLanVal === "Chi") {
							// 只有在選中中文時，才讀取 Chi 欄位並套用繁簡轉換
							if (raceObj.Chi) {
								newText = translateText(raceObj.Chi, globalIsTC);
							} else {
								newText = raceObj.Jap; // 防呆
							}
						} else if (rLanVal === "Eng") {
							newText = raceObj.Eng;
						} else {
							// Jap
							newText = raceObj.Jap;
						}

						// 處理類別後綴
						if (raceObj.isCategory) {
							let suffix = "(類別種族)";
							if (rLanVal === "Eng") {
								suffix = "(Category)";
							} else {
								suffix = translateText(suffix, globalIsTC);
							}
							newText += " " + suffix;
						}

						disp.value = newText;
					}
				}
			}
		}
	}

	//帶入radio物件值
	const setRadioValue = (radioName, value) => {
		if ( radioName == null || radioName === "" )
			return;
		const radioObjs = getByName(radioName);
		for (const obj of radioObjs) {
			if ( obj.value === value ){
				obj.checked = true;
				break;
			}
		}
	};
	
	//帶入checkbox物件值
	const setCheckboxValue = (ckName, values) => {
		if ( ckName != null ){
			const ckObjs = getByName(ckName);
			if ( values == null )
				values = [];
			for (const obj of ckObjs) {
				obj.checked = values.includes( obj.value );
			}
		}
	};
	
	//帶入select物件值
	const setSelectValue = (sName, value) => {
		if ( sName == null || sName === "" )
			return;
		const selectObj = getById( sName );
		if ( selectObj == null )
			return;
		for (const option of selectObj.options) {
			if ( option.value === value ){
				option.selected = true;
				break;
			}
		}
	};
	
	//帶入select物件值
	const setSelectValue2 = (selectObj, value) => {
		if ( selectObj == null )
			return;		
		for (const option of selectObj.options) {
			if ( option.value === value ){
				option.selected = true;
				break;
			}
		}
	};
	
	//改變前後物件checked
	const checkedBrother = (obj, isBefore) => {
		if ( obj != null ){
			if ( isBefore && obj.previousSibling ){
				obj.previousSibling.checked = !obj.previousSibling.checked;
			}
			if ( !isBefore && obj.nextSibling ){
				obj.nextSibling.checked = !obj.nextSibling.checked;
			}
		}
	};

	//改變搜尋列表的CSS	
	const changeListCSS = () => {

		//切換至列表頁籤
		if ( !isVM() ){
			getById("listBar").onclick();
		} else {
			switch( whichPage() ){
				//如果正在過濾頁的話，就跳去列表頁
				case 0 : getById("listBar").onclick();		break;
				//如果正在列表頁的話，就跳回詳細頁
				case 1 : getById("detailBar").onclick();	break;
				default:								break;
			}
		}
	
		const trs = document.getElementsByTagName( "tr" );
		let focusTrObject = null;
		const queryResultNames = [];
		for (const tr of trs) {
			const trCardName = tr.getAttribute( "tr_cardName" );
			if ( trCardName != null ){
				queryResultNames.push( trCardName );
				if ( trCardName === lastSelectedCardName ){
					tr.style.fontWeight = "bold";
					tr.style.color = "red";
					focusTrObject = tr;
				} else {
					tr.style.fontWeight = "normal";
					tr.style.color = "black";
				}
			}
		}
		//處理↑↓的顯示與否
		const indexOfFocus = queryResultNames.indexOf( lastSelectedCardName );
		const showLastArrow = indexOfFocus > 0;
		const showNextArrow = indexOfFocus > -1 && indexOfFocus < queryResultNames.length - 1;
		processArrows( null , showLastArrow , showNextArrow , null );
		
		//自動捲scroll
		autoScrollIfNotOnView( focusTrObject , getById("listBlock") );
	};
	
	//取得物件畫面屬性
	const getWindowProperties = (elem) => window.getComputedStyle(elem, null);
	
	//取得物件畫面高
	const getWindow_height = (elem) => {
		const heightPropertiesNums = getWindowProperties( elem ).height.match( /\d*/g );
		return heightPropertiesNums.length === 0 ? 0 : parseInt( heightPropertiesNums[0] );
	};
	
	//如果指定物件不在scroll可見範圍內，則自動拉捲軸拉到可見為止
	const autoScrollIfNotOnView = (targetObject, scrollOwner) => {
		if ( targetObject == null || scrollOwner == null )
			return;
		// 重構：使用新的 getDocumentOffsetTop 函數
		const trTop = getDocumentOffsetTop(targetObject) - getDocumentOffsetTop(scrollOwner);				//TR頂
		const trBottom = trTop + getWindow_height( targetObject );									//TR底
		const tableScrollTop = scrollOwner.scrollTop;													//Scroll頂
		const tableOffsetHeight = getWindow_height( scrollOwner );
		const tableScrollBottom = tableScrollTop + tableOffsetHeight;									//Scroll底
		if ( 
				( trTop - tableScrollTop > 0 ) && ( trTop - tableScrollTop < tableOffsetHeight ) &&
				( trBottom - tableScrollTop > 0 ) && ( trBottom - tableScrollTop < tableOffsetHeight ) ){
		} else {
			targetObject.scrollIntoView();
		}
	};
	
	//去除卡名注音
	const clearSubName = (name) => {
		let beforeIndex = -1;
		let endIndex = -1;
		while( ( beforeIndex = name.indexOf( "（" ) ) !== -1 && ( endIndex = name.indexOf( "）" ) ) !== -1 ){
			name = name.substring( 0 , beforeIndex ) + name.substring( endIndex + 1 );
		}
		while( ( beforeIndex = name.indexOf( "(" ) ) !== -1 && ( endIndex = name.indexOf( ")" ) ) !== -1 ){
			name = name.substring( 0 , beforeIndex ) + name.substring( endIndex + 1 );
		}
		return name;
	};
	
	//指定編號
	const queryByCode = (code, doConfirmAndAlert) => {
		if ( code == null && doConfirmAndAlert ){
			code = prompt( translateText( '請輸入卡片右下角的號碼，EX:[DMR13 6/110]。\n目前僅有收錄於「系列」當中的卡片可以以此方式找到資料', isTC2C ) );
		}
		if ( code == null || code.trim() === "" )
			return;

		code = code.toUpperCase().trim();
		let setCode = null;
		let cardName = null;
		let aaIndex = null;
		
		//判斷指定ID資料找到幾筆(因為該死的DMX19發生同ID不同卡的狀況，所以追加此變數
		let findTheCard = 0;
		
		const cleanCode = code.toUpperCase().replace(/[^A-Z0-9-/]/g,"");

		for (const setData of setDatas.set.values()) {
			if (setCode != null && cardName != null) break;
			
			for (const setCard of setData.setCards) {
				if (setCode != null && cardName != null) break;

				//如果沒有提示訊息的話則表示是點選了詳細資料的SET變換
				if ( !doConfirmAndAlert ){
					//此時，因為某些SET會有同ID不同卡的情況，所以卡名不同就跳過
					if ( lastSelectedCardName !== setCard.name )
						continue;
				}
			
				if ( setCard.id != null ){
				
					const isMultiID = Array.isArray(setCard.id);
					const ids = isMultiID ? setCard.id : [ setCard.id ];
					for ( let i = 0 ; i < ids.length ; i++ ){
						const id = ids[i];
						if ( id != null && cleanCode === id.toUpperCase().replace(/[^A-Z0-9-/]/g,"") ){
							//如果這是第一次找到這個ID的話就把資料記起來
							if ( findTheCard++ === 0 ){
								setCode = setData.setCode;
								cardName = setCard.name;
								if ( isMultiID ){
									aaIndex = i;
								}
							}
						}
					}
				}			
			}
		}

		let alertMsg = "";
		if ( setCode != null && cardName != null ){
			limitsReset();
			changeSetCode( null );
			setSelectValue( "setCode" , setCode );
			changeSetSetting( setCode );
			query();
			lastSelectedCardName = cardName;
			lastSelectedAAIndex = aaIndex;
			openDataBlock();
			changeListCSS();
			if ( findTheCard > 1 && doConfirmAndAlert ){
				alertMsg = "此ID一共找到" + findTheCard + "筆資料，請自行切換卡牌版本進行瀏覽。";
			}
		} else if ( doConfirmAndAlert ){
			alertMsg = "很抱歉，未能找到資料。";
		}
		if ( alertMsg !== "" ){
			customAlert( translateText( alertMsg, isTC2C ) );
		}
	};
	
	//選擇其他版本(MC、DC、SECRET...)
	const shiftAA = (aaIndex) => {
		lastSelectedAAIndex = aaIndex;
		openDataBlock();
	};
	
	//處理畫面上的方向鍵
	const processArrows = (l, u, d, r) => {
		const arrow_tf = [ l , u , d , r ];
		const arrow_ids = [
			["arrow_left", "arrow_last", "arrow_next", "arrow_right"],
		];

		if ( !isVM() ){
			arrow_ids.push(
				["arrow_left2", "arrow_last2", "arrow_next2", "arrow_right2"]
			);
		}
		
		for (const ids of arrow_ids) {
			for ( let i = 0 ; i < arrow_tf.length ; i++ ){
				if ( arrow_tf[i] != null ){
					const arrow_obj = getById(ids[i]);
					if (arrow_obj) {
						if ( !isVM() ){
							arrow_obj.style.color = arrow_tf[i] ? "black" : "gray";
						} else {
							arrow_obj.style.color = arrow_tf[i] ? "#FFFFFF" : "#370d00";
						}
						arrow_obj.style.cursor = arrow_tf[i] ? "pointer" : "auto";
					}
				}
			}
		}
	};
	
	//按方向鍵時進行版本更換或換卡(主程式)
	const doKeybordFunction = (keyCode) => {
	
		switch( keyCode ){

			//←
			case 37 :
			//→
			case 39 :
					const isLeft = keyCode === 37;
					const shiftAAIndex = getById( isLeft ? "lastAAIndex" : "nextAAIndex" ).value;
					if ( shiftAAIndex != null && shiftAAIndex !== "" ){
						shiftAA( shiftAAIndex );
					//雙極切換
					} else {
						//lastSelectedUdIndex
						const $nss = $('span[name="nameSpan"]');
						let shiftUdIndex = lastSelectedUdIndex + ( isLeft ? -1 : 1 );
						$nss.get((shiftUdIndex + $nss.length) % $nss.length).click();
					}
					break;
			//↓
			case 40 :
			//↑	
			case 38 :
					const isUp = ( keyCode === 38 );
					let lastTr = null;
					let selectedTr = null;
					let nextTr = null;
					const trs = document.getElementsByTagName( "tr" );
					for (const tr of trs) {
						const attribute_cardName = tr.getAttribute( "tr_cardName" );
						if ( attribute_cardName != null ){
							lastTr = selectedTr;
							selectedTr = nextTr;
							nextTr = tr;
							if ( selectedTr != null && ( selectedTr.getAttribute( "tr_cardName" ) === lastSelectedCardName ) ){
								break;
							}
						}
					}
					//處理最後一張按"上"無反應的邏輯補足
					if ( selectedTr != null && ( selectedTr.getAttribute( "tr_cardName" ) !== lastSelectedCardName ) ){
						lastTr = selectedTr;
						selectedTr = nextTr;
						nextTr = null;
					}
					const newClickTr = isUp ? lastTr : nextTr;
					if ( newClickTr != null ){
						newClickTr.click();
						autoScrollIfNotOnView( newClickTr , getById("listBlock") );
					}
					break;
		}
	};
	
	//按方向鍵時進行版本更換或換卡
	const keybordFunction = () => {
		
		if ( document.activeElement.type === 'textarea' )
			return;
		
		switch( event.keyCode ){

			//←
			case 37 :
			//→
			case 39 :
					if ( document.activeElement.type === 'text' )
						break;
			//↓
			case 40 :
			//↑	
			case 38 :
					if ( document.activeElement.tagName === 'SELECT' )
						break;
					event.preventDefault();
					doKeybordFunction( event.keyCode );
					break;
				
			//O=條件初始化
			case 79 : 
					if ( document.activeElement.type === 'text' )
						break;
					limitsReset();	
					getById('filterBar').onclick();
					break;
					
			//E=文明選項初始化
			case 69 : 
					if ( document.activeElement.type === 'text' )
						break;
					getByName("allowCivil").forEach(btn => btn.className = "btnUnClick");
					getByName("allowType").forEach(btn => btn.className = "btnUnClick");
					getById('filterBar').onclick();
					break;
					
			//L=光文明
			case 76 : 
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(16).click();
					getById('filterBar').onclick();					
					break;
					
			//W=水文明
			case 87 : 
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(8).click();
					getById('filterBar').onclick();					
					break;
					
			//D=闇文明
			case 68 :
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(4).click();
					getById('filterBar').onclick();					
					break;
					
			//F=火文明
			case 70 :
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(2).click();
					getById('filterBar').onclick();					
					break;
					
			//N=自然文明
			case 78 :
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(1).click();
					getById('filterBar').onclick();					
					break;
					
			//Z=無色文明
			case 90 :
					if ( document.activeElement.type === 'text' )
						break;
					getCivilBtn(32).click();
					getById('filterBar').onclick();					
					break;
					
			//R=多色
			case 82 : 
					if ( document.activeElement.type === 'text' )
						break;
					const allowTypeM = Array.from(getByName("allowType")).find(btn => btn.getAttribute("allowType") === "M");
					if (allowTypeM) allowTypeM.click();
					getById('filterBar').onclick();		
					break;
					
			//S=單色
			case 83 :
					if ( document.activeElement.type === 'text' )
						break;
					const allowTypeS = Array.from(getByName("allowType")).find(btn => btn.getAttribute("allowType") === "S");
					if (allowTypeS) allowTypeS.click();
					getById('filterBar').onclick();		
					break;
											
			case 48 :
			case 49 :
			case 50 :
			case 51 :
			case 52 :
			case 53 :
			case 54 : 
			case 55 :
			case 56 :
			case 57 :
			case 96 :
			case 97 :
			case 98 :
			case 99 :
			case 100:
			case 101:
			case 102:
			case 103:
			case 104:
			case 105:
			case 110:
			case 190:
					if ( document.activeElement.type === 'text' )
						break;
					saveString( event.key );
					break;
						
			case 13 :
					event.preventDefault();
					query();
					break;
						
		}
	};
	
	let _saveString = '';
	let _ss = '';
	const saveString = (code) => {
		_saveString += code;
		setTimeout( () => { _ss += code; checkSS(); }, 500 );
	};
	
	const checkSS = () => {
		if ( _saveString === _ss ){
			let cost = null;
			let power = null;
			const nums = _saveString.split(".");
			if ( nums.length === 1 ){
				if ( nums[0].length >= 3 ){
					power = parseInt( nums[0] ).toString();
				} else {
					cost = parseInt( nums[0] ).toString();
				}
			} else if ( nums.length === 2 ){
				const num1 = parseInt( nums[0] );
				const num2 = parseInt( nums[1] );
				cost = Math.min( num1, num2 ).toString();
				power = Math.max( num1, num2 ).toString();
			}
			if ( cost != null ){
				if ( cost === '0' ){
					getById("cost").value = '';
				} else {
					getById("cost").value = cost;
				}
			}
			if ( power != null ){
				if ( power === '0' ){
					getById("power").value = '';
				} else {
					getById("power").value = power;
				}
			}
			getById('filterBar').onclick();
			_saveString = '';
			_ss = '';
		}
	};
	
	//將以上以下用語改成港制
	const transHK_MathWords = (words) => words.replace( /(\d+.?)(以上|以下)/g , '$1或$2' );
	
	//取消勾選所有卡種過濾
	const clearCTAll = () => checkCTAll( false );
	
	//勾選所有卡種過濾
	const checkedCTAll = () => checkCTAll( true );
	
	//操作所有卡種過濾
	const checkCTAll = (checked) => {
		const ctCks = getByName( "cardType" );
		for (const ck of ctCks) {
			if ( ck.parentElement.style.display !== "none" ){
				ck.checked = checked;				
			}
		}
		checkCTAllBtn();
	};
	
	//判斷類別過濾是否全部都沒有被勾選
	const checkCTAllNoChecked = () => {
		const ctCks = getByName( "cardType" );
		for (const ck of ctCks) {
			if ( ck.checked )
				return false;
		}
		return true;
	};
	
	//如果卡種類別全被取消勾選、顯示"全勾"按鍵、否則顯示"全消"按鍵
	const checkCTAllBtn = () => {
		const noChecked = checkCTAllNoChecked();
		getById('ctaF').style.display = noChecked ? "none" : "inline";
		getById('ctaT').style.display = noChecked ? "inline" : "none";
	};
	
	//判斷畫面上是否產生scrollBarY
	const isHasScrollY = () => document.documentElement.clientHeight < document.documentElement.offsetHeight;
	
	//動態載入JS
	const importJavascript = (jsId, jsUrl, onloadCode) => {
		
		const oHead = document.getElementsByTagName('HEAD')[0]; 
		const oScript= document.createElement("script"); 
		oScript.type = "text/javascript"; 
		oScript.src = jsUrl; 
		oScript.id = jsId;
		if ( onloadCode != null ){
			oScript.onload = onloadCode;
		}
		oHead.appendChild( oScript); 
	};
	
	//取得http/https
	const getHTTPHeader = () => {
		const isHttps = window.location.href.startsWith("https");
		return "http" + ( isHttps ? "s" : "" );
	};
	
	//把列表清除掉並插入指定文字一行
	const clearListAndSetOneLine = (msg) => {
		const nameTable = getById( "names" );
		clearChildren( nameTable );
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.style.textAlign = "center";
		td.appendChild( document.createTextNode( msg ) );
		tr.appendChild( td );
		nameTable.appendChild( tr );
	};
	
	//行動裝置關鍵字群
	const mobiles = [
		"midp", "j2me", "avant", "docomo", "novarra", "palmos", "palmsource",
		"240x320", "opwv", "chtml", "pda", "windows ce", "mmp/",
		"blackberry", "mib/", "symbian", "wireless", "nokia", "hand", "mobi",
		"phone", "cdm", "up.b", "audio", "sie-", "sec-", "samsung", "htc",
		"mot-", "mitsu", "sagem", "sony", "alcatel", "lg", "eric", "vx",
		"NEC", "philips", "mmm", "xx", "panasonic", "sharp", "wap", "sch",
		"rover", "pocket", "benq", "java", "pt", "pg", "vox", "amoi",
		"bird", "compal", "kg", "voda", "sany", "kdd", "dbt", "sendo",
		"sgh", "gradi", "jb", "dddi", "moto", "iphone", "android",
		"iPod", "incognito", "webmate", "dream", "cupcake", "webos",
		"s8000", "bada", "googlebot-mobile"
	];
	//判別是否為行動裝置
	const isMobile = () => {
		const ua = navigator.userAgent.toLowerCase();
		return mobiles.some(mobile => ua.includes(mobile));
	};
	//判別是否為行動裝置專用版
	const isVM = () => typeof mVersion !== 'undefined' ? mVersion : false;
	
	//切換頁籤
	const changeLeftPage = (obj) => {

		const bars = [
			[ getById( "filterBar" ), getById( "listBar" ), getById( "fbBar" ) ],
			[ getById( "filterBar2" ), getById( "listBar2" ), getById( "fbBar2" ) ]
		];
		const blocks = [
			getById( "filterBlock" ), getById( "listBlock" ), getById( "fbBlock" )
		];
		for ( let i = 0 ; i < blocks.length ; i++ ){
			const isClickTd = bars[0][i] === obj;
			bars[0][i].style.fontWeight = isClickTd ? "bold" : "normal";
			bars[1][i].style.fontWeight = isClickTd ? "bold" : "normal";
			blocks[i].style.display = isClickTd ? "block" : "none";
		}
		getById( "leftMain" ).style.backgroundColor = obj.style.backgroundColor;
	};
		
	//調整手機版主版高度
	const resizeContent = () => {
		const mainHeight = $(window).height() - ( $('#header').height() + $('#footer').height() + 10 + document.body.scrollHeight - document.body.clientHeight );
		getById("content").style.height = mainHeight;
		getById("content").style.maxHeight = mainHeight;
	};

	//切換頁籤(手機版)
	const changePage = (obj) => {
		const $bars = $('.pageBar');
		const $mains = $('.mainBlock');
		let index = 0;
		if ( obj != null ){
			index = ( typeof obj === "object" ? $bars.get().indexOf( obj ) : parseInt( obj ) );
		}
		for ( let i = 0 ; i < $bars.length ; i++ ){
			if ( i === index ){
				$bars.eq(i).css({ 'backgroundColor': "#FFC6CA", 'fontWeight': "bold" });
				$mains.eq(i).show();
			} else {
				$bars.eq(i).css({ 'backgroundColor': "#FFE5E7", 'fontWeight': "normal" });
				$mains.eq(i).hide();
			}
		}
		//如果是第一頁的話，開啟感謝列表，不是的話，開啟箭頭工具
		if ( index === 0 ){
			$('#thanks').show();
			$('#functionArrow').hide();
		} else {
			$('#thanks').hide();
			$('#functionArrow').show();
		}
		//如果是手機版的第二頁的話，將BODY.SCROLL捲到最上方
		if ( isVM() && index === 1 ){
			document.body.scrollTop = 0;
		}
		//將BODY.SCROLL轉到最左邊
		document.body.scrollLeft = 0;

	};
	
	//判斷現在是哪個頁籤
	const whichPage = () => {
		const mains = $('.mainBlock');
		for ( let i = 0 ; i < mains.length ; i++ ){
			if ( mains.eq(i).css('display') !== 'none' ){
				return i;
			}
		}
		return -1;
	};
	
	/**
		印出物件內容
	*/
	const parseObjectToSring = (obj) => JSON.stringify(obj, null, 4);

	/** 複製文字 */
	/** * [修正版] 複製文字工具
	 * 修正說明：優先使用現代 navigator.clipboard API 以解決手機版失效問題
	 */
	window.Clipboard = (() => {
		
		// 舊版 iOS/通用 Fallback 複製法
		function fallbackCopyTextToClipboard(text) {
			var textArea = document.createElement("textarea");
			textArea.value = text;
			
			// 避免手機版鍵盤彈出或畫面跳動
			textArea.style.top = "0";
			textArea.style.left = "0";
			textArea.style.position = "fixed";
			textArea.style.opacity = "0";

			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				var successful = document.execCommand('copy');
				if (successful) {
					customAlert("已複製卡名：\n" + text);
				} else {
					customAlert("複製失敗");
				}
			} catch (err) {
				console.error('Fallback: Oops, unable to copy', err);
				customAlert("您的瀏覽器不支援複製功能");
			}

			document.body.removeChild(textArea);
		}

		const copy = (text) => {
			if (!text) return;

			// 1. 優先嘗試現代 API (HTTPS 環境下手機版主要靠這個)
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).then(() => {
					// 成功時跳出提示 (手機版因為沒有滑鼠游標變化，需要提示)
					customAlert("已複製卡名：\n" + text);
				}).catch(err => {
					console.error('Async: Could not copy text: ', err);
					// 失敗則回退舊版
					fallbackCopyTextToClipboard(text);
				});
			} else {
				// 2. 舊版瀏覽器或非 HTTPS 環境
				fallbackCopyTextToClipboard(text);
			}
		};

		return {
			copy: copy
		};
	})();
	
	const popListToOutter = () => {
		let rtn = null;
		const theSet = setDatas.getSetDatas( lastSelectedSetCode );
		for (const setCard of theSet.setCards) {
			if ( rtn == null ){
				rtn = "";
			} else {
				rtn += ",";
			}
			rtn += setCard.count + ":" + setCard.name;
		}
		const etherUri = "https://ether1013.github.io/DuelMastersCardSearchTaiwan/indexMobile2.html?import="+encodeURIComponent( rtn );
		const tinyUri = "http://tinyurl.com/api-create.php?url=" + encodeURIComponent( etherUri );
		const proxyUri = "https://api.allorigins.win/get?url="+encodeURIComponent( tinyUri );
		
		$.get(proxyUri, (response) => {
			if ( response.status.http_code !== 200 ){
				customAlert( "ErrorCode( "+response.http_code+" )" );
			} else {
				Clipboard.copy( response.contents );
				customAlert("複製完畢");
			}
		});
	};
	
	//匯出卡表
	const popList = (language, ask, writeSelf) => {
	
		if ( ask == null ){
			ask = true;
		}
		if ( writeSelf == null ){
			writeSelf = false;
		}
	
		const resultHTML = [];
		const queryListResults = [];
		const trs = document.getElementsByTagName( "tr" );
		for (const tr of trs) {
			if ( tr.getAttribute( "tr_cardName" ) != null ){
				queryListResults.push( tr.getAttribute( "tr_cardName" ) );
			} else if ( tr.getAttribute( "tr_cardName_vaultLink" ) != null ){
				queryListResults.push( tr.getAttribute( "tr_cardName_vaultLink" ) );
			}
		}

		//計算官方收錄最大值做為POP上限
		let popMax = 0;
		for (const setMap of setDatas.map.values()) {
			popMax = Math.max( popMax , setMap.length );
		}
		let returnHint = null;
		if ( queryListResults.length === 0 ){
			returnHint = "查無資料";
		} else if ( queryListResults.length > popMax ){
			returnHint = "很抱歉，此匯出功能目前最多僅允許"+popMax+"筆資料。";
		}
		if ( returnHint != null ){
			customAlert( translateText( returnHint, isTC2C ) );
			return;
		}
		for ( let q = 0 ; q < queryListResults.length ; q++ ){
			let localDatas = cardDatas.getDataByName( queryListResults[q] , lastSelectedSetCode );
			//如果有資料的話，就帶入資料
			if ( localDatas != null ){
				queryListResults[q] = localDatas;
			//沒有資料的話表示是無資料或是從DMVault匯進來的
			} else {
				queryListResults[q] = {
					noLocalDataButVaultLink : true,
					name : queryListResults[q],
				};
			}
		}
		const doCanvas = isCanvasSupported() && language === "P";
		let isDeck = false;
		let loadingSize = parseInt(173*queryListResults.length);
		if ( loadingSize > 1024 ){
			loadingSize = parseInt( loadingSize / 1024 ) + "MB";
		} else {
			loadingSize = loadingSize + "KB";
		}
		let showPicture = true;
		if ( ask ){
			showPicture = confirm( translateText( "請問是否顯示圖片(預計流量大小最高可能會超過"+loadingSize+")？", isTC2C ) );
		}
		let theSet = null;
		if ( lastSelectedSetCode != null && lastSelectedSetCode !== queryHistorySetCode ){
			theSet = setDatas.getSetDatas( lastSelectedSetCode );
			if ( theSet != null ){
				isDeck = theSet.isDeck;
			}
		}
		//紀錄已經寫過的能力標籤
		const writtenTags = [];
		for ( let i = 0 ; i < queryListResults.length ; i++ ){
			const popCData = queryListResults[i];	
			if ( theSet != null ){
				const cDataInSet = theSet.setCards.find(c => c.name === popCData.name);
				if ( cDataInSet != null ){
					if ( cDataInSet.id != null ){
						popCData.id = cDataInSet.id;
					}
					if ( cDataInSet.pic != null ){
						popCData.pic = cDataInSet.pic;
					}
					if ( cDataInSet.flavor != null ){
						popCData.flavor = cDataInSet.flavor;
					}
					if ( cDataInSet.count != null ){
						popCData.count = cDataInSet.count;
					}
					// DMVault 連結已移除
					// if ( cDataInSet.link != null ){
					// 	popCData.link = cDataInSet.link;
					// }
				}
			}
			//牌組不匯出多版本清單
			const versions = isDeck ? 1 : (( popCData.id == null ) ? 1 : ( Array.isArray(popCData.id) ? popCData.id.length : 1 ));
			for ( let v = 0 ; v < versions ; v++ ){
			
				//判斷有沒有雙極
				const udCData = popCData.ws == null ? null : cardDatas.getDataByName( popCData.name , lastSelectedSetCode, v, 1 );
				//紀錄第一次出現的TAG
				const absTags = [];
				const popCDataAbsUandD = [];
				if ( udCData == null ){
					popCDataAbsUandD.push( popCData.sp );
				} else {
					popCDataAbsUandD.push( popCData.sp );
					popCDataAbsUandD.push( udCData.sp );
				}
				for (const abs of popCDataAbsUandD) {
					for (const spItem of abs) {
						const tags = keyWords.transTags( spItem );
						for (const tag of tags) {
							if ( !tag.data ){
								const keyWordTagName = tag.innerText;
								if ( keyWordTagName != null ){
									if ( writtenTags.includes( keyWordTagName ) ){
										continue;
									} else {
										writtenTags.push( keyWordTagName );
										absTags.push( keyWordTagName );
									}
								}
							}
						}
					}
				}
				
				let singleCardHTML = getPopListHTMLCode( true, showPicture, true, isDeck, language, popCData, i, v, udCData == null ? absTags : [] );
				if ( udCData != null ){
					const udSingleCardHTML = getPopListHTMLCode( true, false, true, isDeck, language, udCData, i, v, absTags );
					singleCardHTML += ( language === "P" ? "" : "↑↓<BR>" ) + udSingleCardHTML;
				}
				resultHTML.push( singleCardHTML );
			}
			// DMVault 相關邏輯已移除
			// if ( popCData.noLocalDataButVaultLink ){
			// 	afterMethodParameters.push({
			// 		popSpanIndex : i,
			// 		link : popCData.link,
			// 	});
			// }
		}
		let returnHTMLStr = "";
		for ( let rh = 0 ; rh < resultHTML.length ; rh++ ){
			returnHTMLStr += ( ( rh > 0 && language !== "P" ) ? "<BR><BR>" : "" ) + resultHTML[rh];
		}
		let w = window;
		if ( !writeSelf ){
			w = window.open();
			w.document.write( "<head>" );
			w.document.write( "<title>" + ( ( theSet == null ) ? "" : ( "《" + theSet.setName + "》" ) ) + "卡表匯出</title>" );
			w.document.write( "<"+"script>" );
			w.document.write( setPicObjSize.toString() + getById.toString().replace(/gobi/g, "gobi") );
			w.document.write( "</"+"script>" );
			w.document.write( "</head>" );
		} else {
			w.document.body.innerHTML = "";
		}
		w.document.write( "<body>" );
		w.document.write( "<div id='popDIV'>" );
		if ( doCanvas ){
			if ( isCanvasSupported() ){
				w.document.write( "<input type='button' value='"+translateText( "圖片合併", isTC2C )+"' style='cursor:pointer;width:100%;height:100px;font-size:40px;' onclick='opener.doWriteCanvas(window);'><BR>" );
			} else {
				w.document.write( "<input type='button' value='"+translateText( "圖片合併(您的瀏覽器不支援)", isTC2C )+"' disabled style='width:100%;height:100px;font-size:40px;'><BR>" );
			}
		}
		w.document.write( returnHTMLStr );
		w.document.write( "</div>" );
		if ( doCanvas ){
			w.document.write( "<canvas id='canvas'></canvas>" );
		}
		w.document.write( "</body>" );
		
		// DMVault 動態匯入邏輯已移除
		
		w.document.close();
		returnHTMLStr = null;
	};
	
	const copyCanvasToClipboard = (canvas) => {
	  return new Promise((resolve, reject) => {
		canvas.toBlob(async (blob) => {
		  if (!blob) {
			reject(new Error("Canvas 轉 Blob 失敗"));
			return;
		  }
		  try {
			await navigator.clipboard.write([
			  new ClipboardItem({
				[blob.type]: blob
			  })
			]);
			resolve();
		  } catch (err) {
			reject(err);
		  }
		}, "image/png");
	  });
	};
	
	const doWriteCanvasMain = (main, fileName) => {

		if ( fileName == null || fileName === '' ){
			fileName = "截圖";
		}
		html2canvas(
			getById( main ), 
			{ 
				useCORS: true,
				ignoreElements: (el) => {
					return el.id === 'tr_sell' ||
						el.id === 'tr_trade' ||
						el.id === 'tr_sets' ||
						el.id === 'absHintsBtn1' ||
						el.id === 'card_picture_aa' ||
						el.classList?.contains('downloadBtn');
				}
			}
		).then(canvas => {
			document.body.appendChild(canvas);
			Canvas2Image.saveAsPNG( canvas, canvas.width, canvas.height, fileName );
			$(canvas).remove();
			$(".backdrop").hide();
		}).catch(err => {
			customAlert("截圖下載失敗");
		}).finally(() => {
		});
	};
	
	//截圖
	const doWriteCanvas2 = (main, beforeAlert, fileName) => {
		
		if ( beforeAlert ){
			$(".backdrop").show();
		}
		const $imgs = $( getById(main) ).find("img");
		let count = $imgs.length;
		let anyError = false;

		if ( count === 0 ){
			doWriteCanvasMain( main, fileName );
		} else {
			$imgs.each(function(){
				const $this = $(this);
				let imgSrc = $this.attr("src");
				
				if ( imgSrc.startsWith("http") ){
					const pic = new Image();
					if ( imgSrc.startsWith( proxyDomain ) ){
						pic.src = imgSrc;
					} else {
						pic.src = proxyDomain + imgSrc;
					}
					pic.crossorigin="anonymous";
					
					pic.onload = function() {
						$this.attr("src", pic.src);
						if ( --count === 0 ){
							if ( anyError ){
								$(".backdrop").hide();
								customAlert( "截圖失敗" );
							} else {
								doWriteCanvasMain( main, fileName );
							}
						}
					};

					pic.onerror = function() {
						anyError = true;
						if ( --count === 0 ){
							if ( anyError ){
								$(".backdrop").hide();
								customAlert( "截圖失敗" );
							} else {
								doWriteCanvasMain( main, fileName );
							}
						}
					};
				} else {
					const pic = new Image();
					pic.src = imgSrc;
					pic.crossorigin="anonymous";
					if ( --count === 0 ){
						doWriteCanvasMain( main, fileName );
					}
				}
			});
		}
	};
	
	const doWriteCanvasMobile = () => {
		const page = whichPage();
		switch( page ){
			case 1 : doWriteCanvas2( "names", true, lastSelectedSetCode );			break;
			case 2 : doWriteCanvas2( "cardDataBlock", true, lastSelectedCardName );	break;
			default : 																break;
		}
	};

	//將圖片進行合併
	const doWriteCanvas = (w) => {
		
		const domPics = w.document.getElementsByTagName("IMG");
		let chk = true;
		for (const domPic of domPics) {
			const tempImg = new Image();
			tempImg.src = domPic.src;
			if ( !tempImg.complete ){
				chk = false;
			}
			if ( !chk ){
				break;
			}
		}
		if ( !chk ){
//			w.customAlert( translateText( "圖片尚未全數讀取完成，請稍候再試！", isTC2C ) );
//			return;
		}
		const percent = 0.9;
		const domPicsArray = [];
		//計算canvas的寬與高
		let canvasWidth = 0;
		let canvasHeight = 0;
		if ( domPics.length <= 40 ){
			const cprs = [
				1 , 2 , 3 , 2 , 3 , 3 , 4 , 4 , 3 , 4 , 
				4 , 4 , 4 , 4 , 5 , 4 , 6 , 6 , 5 , 5 , 
				7 , 8 , 8 , 8 , 5 , 6 , 6 , 6 , 6 , 6 , 
				7 , 7 , 7 , 7 , 7 , 8 , 8 , 8 , 8 , 8
			];
			const cpr = cprs[ domPics.length - 1 ];
			for ( let i = 0 ; i < domPics.length ; i+=cpr ){
				const tempArr = [];
				let tempWidth = 0;
				let tempHeight = 0;
				for ( let ti = 0 ; ti < cpr && ( ti + i ) < domPics.length ; ti++ ){
					const tempImg = domPics[ i + ti ];
					tempArr.push( tempImg );
					tempWidth += tempImg.width * percent;
					tempHeight = Math.max( tempHeight , tempImg.height * percent );
				}
				canvasWidth = Math.max( canvasWidth , tempWidth );
				canvasHeight += tempHeight;
				domPicsArray.push( tempArr );
			}
		} else {
			const originWidth = 200;
			//原則上八張一排
			const cpr = 8;
			const maxWidth = cpr * originWidth * percent;
			let tempArr = [];
			let tempWidth = 0;
			let tempHeight = 0;
			for ( let i = 0 ; i < domPics.length ; i++ ){
				const tempImg = domPics[ i ];
				tempArr.push( tempImg );
				tempWidth += tempImg.width * percent;
				tempHeight = Math.max( tempHeight , tempImg.height * percent );
				//如果再加進一張會超寬或這是最後一張的話就換行
				if ( i === domPics.length - 1 || ( tempWidth + domPics[ i+1 ].width * percent ) > maxWidth ){
					canvasWidth = Math.max( canvasWidth , tempWidth );
					canvasHeight += tempHeight;
					domPicsArray.push( tempArr );
					tempArr = [];
					tempWidth = 0;
					tempHeight = 0;
				}
			}
		}
		
		const theCanvas = w.document.getElementById("canvas");
		theCanvas.width = canvasWidth;
		theCanvas.height = canvasHeight;
		const context = theCanvas.getContext('2d');
		context.globalAlpha = 1.0;
		let insertHeight = 0;
		for (const row of domPicsArray) {
			let tempMaxHeight = 0;
			let tempWidth = 0;
			for (const tempPic of row) {
				context.drawImage( tempPic , tempWidth, insertHeight , tempPic.width * percent , tempPic.height * percent );
				tempWidth += tempPic.width * percent;
				tempMaxHeight = Math.max( tempMaxHeight , tempPic.height * percent );
			}
			insertHeight += tempMaxHeight;
		}
		w.getById("popDIV").style.display = 'none';
		w.customAlert( translateText( "已成功轉為一張圖片！", isTC2C ) );
	};
	
	const getPopListHTMLCode = (writePCNCPPart, showPicture, writeDataPart, isDeck, language, popCData, listIndex, aaIndex, absHints) => {
		let singleCardHTML = "";
		//是否寫出圖片、張數、卡名、文明、攻擊力
		if ( writePCNCPPart ){
			let picWidth = 200;
			if ( isMobile() && isDeck && getParameter("justPop") != null ){
				picWidth = 85;
			}
			//圖片
			if ( showPicture && !popCData.noLocalDataButVaultLink ){
				let isHorizontal = true;
				for (const type of popCData.type) {
					if ( !cardTypeMapping.getDataByValue( type ).horizontal ){
						isHorizontal = false;
					}
				}

				singleCardHTML += "<div style='display:inline-block;'>";
				for ( let pc = 0 ; pc < ( popCData.count == null ? 1 : popCData.count ) ; pc++ ){
					let isBackReadData = false;
					const loadPicArray = Array.isArray( popCData.pic ) ? popCData.pic : [ popCData.pic ];
					let loadPic = loadPicArray[aaIndex];

					if ( loadPic === "" ){
						const backReadData = cardDatas.getDataByName( popCData.name );
						if ( backReadData != null ){
							loadPic = backReadData.pic;
							isBackReadData = true;
						}
					}
					singleCardHTML += `<img id='pop_pic_${listIndex}_${pc}_${aaIndex}' src='${getImgSrc( loadPic )}' onload='setPicObjSize( this, this.id , ${isHorizontal ? " null , " + picWidth : picWidth + " , null "} , this.title );' title='${popCData.name + ( popCData.id != null ? "( " + ( Array.isArray( popCData.id ) ? popCData.id : [ popCData.id ] )[aaIndex] + " )" : "" )}' style='float:left;${isBackReadData ? "Opacity: 0.6;" : ""}' >`;
				}
				singleCardHTML += "</div>";
			}
			if ( language === "P" ){
				if ( popCData.noLocalDataButVaultLink ){
					for ( let pc = 0 ; pc < ( popCData.count == null ? 1 : popCData.count ) ; pc++ ){
						singleCardHTML += "<div style='display:inline-block;'>";
						singleCardHTML += `<img id='pop_pic_${listIndex}_${pc}_${aaIndex}' src='${getImgSrc( null )}' onload='setPicObjSize( this, this.id , ${isHorizontal ? " null , " + picWidth : picWidth + " , null "} , this.title );' title = '${popCData.name + ( popCData.id != null ? "( " + ( Array.isArray( popCData.id ) ? popCData.id : [ popCData.id ] )[aaIndex] + " )" : "" )}' style='float:left;' >`;
						singleCardHTML += clearSubName( popCData.name );
						singleCardHTML += "</div>";
					}
				}
				return singleCardHTML;
			}

			let hasCountOrId = false;
			//張數
			if ( popCData.count != null ){
				if ( !showPicture || popCData.noLocalDataButVaultLink ){
					singleCardHTML += "【" + popCData.count + "張】";
				}
				hasCountOrId = true;
			}
			//ID
			if ( popCData.id != null ){
				const idArray = Array.isArray( popCData.id ) ? popCData.id : [ popCData.id ];
				const showId = idArray[aaIndex];
				if ( showId != null && showId !== 'undefined' ){
					if ( showPicture ){
						singleCardHTML += "<BR>";
					}
					singleCardHTML += "( " + showId + " )";
					hasCountOrId = true;
				}
			}
			if ( hasCountOrId ){
				singleCardHTML += "<BR>";
			} else {
				if ( showPicture ){
					singleCardHTML += "<BR>";
				}
			}
			//卡名、卡種、文明與種族
			let c_rs = "";
			if ( !popCData.noLocalDataButVaultLink ){
				singleCardHTML += popCData.name + "<BR>";
				for (const type of popCData.type) {
					c_rs += ( c_rs.length > 0 ? "/" : "" ) + cardTypeMapping.getTextByValue( type );
				}
				c_rs += " / "
				const civilWords = civilMapping.getDatasByValue( popCData.civil );
				for ( let c = 0 ; c < civilWords.length ; c++ ){
					c_rs += ( c > 0 ? "." : "" ) + ( ( language === 'E' ) ? civilWords[c].eText : civilWords[c].text.replace( "文明" , "" ) );
				}
				if ( popCData.race != null ){
					c_rs += " / ";
					for ( let r = 0 ; r < popCData.race.length ; r++ ){
						const theRace = raceMapping.getDataByJap( popCData.race[r] );
						if ( r > 0 ){
							c_rs += ".";
						}

						let spanShow = null;
						if ( theRace == null ){
							spanShow = popCData.race[r];
						} else if ( language === 'E' ){
							spanShow = theRace.Eng;
						} else if ( language === 'C' ){
							spanShow = theRace.Chi;
						} else if ( language === 'J' ){
							spanShow = theRace.Jap;
						}

						if ( theRace == null ){
							c_rs += popCData.race[r];
						} else {
							const getRaceWithTag = keyWords.transTags( "(R)"+theRace.Jap+"(/R)" );
							c_rs += getRaceWithTag[1].outerHTML.replace(`<span>${theRace.Jap}</span>`, `<span>${spanShow}</span>`);
						}
					}
				}
				singleCardHTML += " ( " + c_rs + " )";
			} else {
				singleCardHTML += `<span id='popListVaultCRSpan_${listIndex}_${aaIndex}'></span>`;
			}
			singleCardHTML += "<BR>";
		}
		if ( writeDataPart ){
			if ( !popCData.noLocalDataButVaultLink ){
				//魂
				if ( popCData.soul != null ){
					singleCardHTML += "《";
					for ( let s = 0 ; s < popCData.soul.length ; s++ ){
						const theSoul = soulMapping.getDataByCode( popCData.soul[s] );
						if ( s > 0 ){
							singleCardHTML += ".";
						}
						if ( theSoul == null ){
							singleCardHTML += popCData.soul[s];
						} else if ( language === 'E' ){
							singleCardHTML += theSoul.Eng;
						} else if ( language === 'C' ){
							singleCardHTML += theSoul.Chi;
						} else if ( language === 'J' ){
							singleCardHTML += theSoul.Jap;
						}
					}
					singleCardHTML += "》<BR>";
				}
				//Cost&Power
				if ( popCData.cost != null ){
					singleCardHTML += "Cost " + ( popCData.cost === Number.MAX_SAFE_INTEGER ? "∞" : popCData.cost );
				}
				if ( popCData.power != null ){
					singleCardHTML += " / Power " + ( popCData.power === Number.MAX_SAFE_INTEGER ? "∞" : popCData.power ) + ( popCData.pc == null ? "" : ( popCData.pc ? "+" : "-" ) );
				}
				singleCardHTML += "<BR>";
				//特殊能力
				if ( popCData.sp != null ){
					for ( let ab = 0 ; ab < popCData.sp.length ; ab++ ){
						const isHint = popCData.sp[ab].startsWith( abilitiesHintHeader );
						let abLinesStr = popCData.sp[ab];
						if ( isHint ){
							abLinesStr = "( " + abLinesStr.substring( abilitiesHintHeader.length ) + " )";
						}
						const abLines = abLinesStr.split("##");
						for ( let abl = 0 ; abl < abLines.length ; abl++ ){
							if ( abl === 1 ){
								singleCardHTML += "<ul style='margin:0px;'>";
							}
							if ( abl > 0 ){
								singleCardHTML += "<li>";
							}
							
							singleCardHTML += ( abl === 0 && !isHint && !spHeader.includes( abLines[abl].substring(0,1) ) ? "■" : "" );
							const getAbilityWithTag = keyWords.transTags( abLines[abl] );
							for (const tag of getAbilityWithTag) {
								let theText = tag.innerText;
								if ( theText == null ){
									theText = tag.data;
								} else {
									//將種族與能力切換成指定語言
									const kRace = raceMapping.getDataByJap( theText );
									if ( kRace != null ){
										if ( language === "E" ){
											theText = kRace.Eng;
										} else if ( language === "C" ){
											theText = kRace.Chi;
										} else if ( language === "J" ){
											theText = kRace.Jap;
										}
									} else {
										const kAbility = abilityMapping.getDataByJap( theText );
										if ( kAbility != null ){
											if ( language === "E" ){
												theText = kAbility.Eng;
											} else if ( language === "C" ){
												theText = kAbility.Chi;
											} else if ( language === "J" ){
												theText = kAbility.Jap;
											}
										}
									}
								}
								if ( getById("HK").checked ){
									theText = transHK_MathWords( theText );
								}
								if ( language === "C" || !isNoTrans( tag ) ){
									theText = translateText( theText, isTC2C );
								}
								if ( tag.innerHTML == null ){
									singleCardHTML += theText;
								} else {
									singleCardHTML += tag.outerHTML.replace( `<span>${tag.innerText}</span>`, `<span>${theText}</span>` );
								}
							}
							if ( abl > 0 ){
								singleCardHTML += "</li>";
							}
							if ( abl === abLines.length - 1 ){
								singleCardHTML += "</ul>";
							}
							if ( ab < popCData.sp.length - 1 && abLines.length === 1 ){
								singleCardHTML += "<BR>";
							}
						}					
					}
					if ( popCData.sp.length > 0 ){
						singleCardHTML += "<BR>";
					}
				}
				//敘述文
				if ( popCData.flavor != null ){
					
					// 1. 取得對應版本/單版本的 flavor 數據
					let flavorData = popCData.flavor;

					if ( Array.isArray( popCData.id ) ) {
						// 只有在是多版本卡時，才根據 aaIndex 從 flavor 陣列中取值
						const aaIndexInt = aaIndex === null || aaIndex === undefined ? 0 : parseInt(aaIndex);
						if ( aaIndexInt >= 0 && aaIndexInt < popCData.id.length ) {
							flavorData = popCData.flavor[aaIndexInt];
						} else {
							flavorData = popCData.flavor[0]; 
						}
					} else {
						// 單版本卡，不需要根據 aaIndex 取值，但 flavorData 可能本身就是一個 array 或 string
						// flavorData 已經是 popCData.flavor
					}

					// 2. 確保 flavorData 是陣列 (如果它不是陣列，就用陣列包裝它)
					const flavorInVersion = Array.isArray(flavorData) ? flavorData : [flavorData];

					if ( !Array.isArray( flavorInVersion ) ){
						flavorInVersion = [ flavorInVersion ];
					}
					singleCardHTML += "<i style='font-size:13px;'>";
					for (const flavor of flavorInVersion) {
						if ( flavor == null )
							continue;
						singleCardHTML += ( singleCardHTML.endsWith("<i style='font-size:13px;'>") ? "" : "<BR>" );
						const getFlavorWithTag = keyWords.transTags( translateText( flavor , isTC2C ) );
						for (const tag of getFlavorWithTag) {
							let theText = tag.innerText;
							if ( theText == null ){
								theText = tag.data;
							} else {
								//將種族與能力切換成指定語言
								const kRace = raceMapping.getDataByJap( theText );
								if ( kRace != null ){
									if ( language === "E" ){
										theText = kRace.Eng;
									} else if ( language === "C" ){
										theText = kRace.Chi;
									} else if ( language === "J" ){
										theText = kRace.Jap;
									}
								} else {
									const kAbility = abilityMapping.getDataByJap( theText );
									if ( kAbility != null ){
										if ( language === "E" ){
											theText = kAbility.Eng;
										} else if ( language === "C" ){
											theText = kAbility.Chi;
										} else if ( language === "J" ){
											theText = kAbility.Jap;
										}
									}
								}
							}
							if ( language === 'C' || !isNoTrans( tag ) ){
								theText = translateText( theText, isTC2C );
							}
							singleCardHTML += theText;
						}
					}
					singleCardHTML += "</i>";
					if ( flavorInVersion.length > 0 && flavorInVersion[0] !== "" ){
						singleCardHTML += "<BR>";
					}
				}
				//能力說明
				if ( absHints != null && Array.isArray(absHints) ){
					for (const hint of absHints) {
						const abTag = abilityMapping.getDataByJap( hint );
						if ( abTag != null ){
							let tagName = abTag.Jap;
							if ( language === 'E' ){
								tagName = abTag.Eng;
							} else if ( language === 'C' ){
								tagName = abTag.Chi;
							}
							singleCardHTML += "<br><i style='font-size:13px;'>";
							singleCardHTML += `※${tagName}：${abTag.descript}`;
							singleCardHTML += "</i>";
						}
					}
				}
			} else {
				singleCardHTML += `<span id='popListVaultBodySpan_${listIndex}_${aaIndex}'></span>`;
			}
		}
		return singleCardHTML;
	};
	
	//尋找最接近的卡牌
	const searchForCardByName = (fuzzyName) => {
		const options = {
			keys: [ 'name' ],
			id : 'name',
			caseSensitive : true,
		};
		const f = new Fuse( addCardDatas , options );
		const fuzzuResult = f.search( fuzzyName );
		if ( fuzzuResult == null || fuzzuResult.length === 0)
			return null;

		//因為Fuse.js所作的模糊比對是不分順序的，所以接著要再依照自寫的、要求順序嚴謹的邏輯計算分數，並取得分高者(錯誤字數不能超過2個)
		let errChars = 2.1;
		//如果字串長度小於5的話則一個都不能錯
		if ( fuzzyName.length < 5 ){
			errChars = 0.1;
		}
		let rtnName = null;
		for (const resultName of fuzzuResult) {
			const localErrScore = calcErrChars( fuzzyName, resultName );
			if ( localErrScore < errChars ){
				errChars = localErrScore;
				rtnName = resultName;
			}
		}
		return rtnName;
	};
	
	//英文全型轉半型
	const fhConverter = {
		full : "ＱＡＺＷＳＸＥＤＣＲＦＶＴＧＢＹＨＮＵＪＭＩＫＯＬＰｑａｚｗｓｘｅｄｃｒｆｖｔｇｂｙｈｎｕｊｍｉｋｏｌｐ0123456789　！？＜＞",
		helf : "QAZWSXEDCRFVTGBYHNUJMIKOLPqazwsxedcrfvtgbyhnujmikolp01234567890!?<>",
		fullToHalf : function( str ){
			if ( str == null )
				return null;
			let returnStr = "";
			for ( let i = 0 ; i < str.length ; i++ ){
				const theChar = str.substr( i , 1 );
				const indexOfFull = this.full.indexOf( theChar );
				returnStr += ( ( indexOfFull === -1 ) ? theChar : this.helf.substr( indexOfFull, 1 ) );
			}
			return returnStr;
		},
	};	
	
	//SETCODE類型選擇器
	const changeSetCode = (categoryValue) => {
		const options = [];
		const eValue = ( categoryValue == null || categoryValue === "" );
		const categoryValues = eValue ? [] : categoryValue.split(",");
		if ( eValue ){
			options.push( {
				value : "",
				text : "",
			} );
		}
		const addRutenDeck = "RUT" === getParameter("addDeck");
		for (const setData of setDatas.set.values()) {
			let doAdd = false;
			if ( !addRutenDeck && 
				( !setData.setCode.startsWith( "DM" ) && 
				!setData.setCode.startsWith( "NET" ) && 
				!setData.setCode.startsWith( "OF" ) && 
				!setData.setCode.startsWith( "deck" ) && 
				!setData.setCode.startsWith( "TW" ) && 
				!setData.setCode.startsWith( "PS" ) ) )
				continue;
			if ( setData.isListSkip )
				continue;
			if ( eValue ){
				doAdd = true;
			} else {
				for (const cv of categoryValues) {
					if ( setData.setCode.startsWith( cv ) ){
						doAdd = true;
					}
				}
			}
			if ( doAdd ){
				options.push( {
					value : setData.setCode,
					text : setData.setCode + " " + setData.setName,
					optionColor : setData.optionColor,
					isListSkip : setData.isListSkip,
				} );
			}
		}
		
		options.sort((a, b) => a.value.localeCompare( b.value ));
		
		const setCodeSelector = getById( "setCode" );
		clearChildren( setCodeSelector );
		for (const optionData of options) {
			const option = document.createElement('option');
			option.value = optionData.value;
			option.text = optionData.text;
			if ( optionData.optionColor != null ){
				option.style.color = optionData.optionColor;
			}
			setCodeSelector.appendChild( option );
		}
		if ( !eValue ){
			setSelectValue( "setCode" , lastSelectedSetCode );
			setCodeSelector.onchange();
		} else {
			lastSelectedSetCode = null;
		}
	};
	
	/**
		清空系列選擇
	*/
	const cleanSetCode = () => {
		setSelectValue( "setCodeType" , '' );
		getById("setCodeType").onchange();
		setSelectValue( "setCode" , '' );
		getById("setCode").onchange();
	};
	
	//比對兩字串，回傳不符合字數。[ッ][っ]只算半個，[．][．]只算0.1，全形英數符號沒找到的話可以用半形再找一次
	const helfChars = [ "ッ" , "っ" ];
	const skipChars = [ "．" , "．" ];
	const calcErrChars = (mustStr, compareStr) => {
		let missMatchLength = 0.0;
		while ( mustStr.length > 0 ){
			const theChar = mustStr.substring( 0 , 1 );
			let matchIndex = compareStr.indexOf( theChar );
			if ( matchIndex === -1 ){
				if ( helfChars.includes( theChar ) )
					missMatchLength += 0.5;
				else if ( skipChars.includes( theChar ) )
					missMatchLength += 0.1;
				else{
					const charF2H = fhConverter.fullToHalf( theChar );
					if ( charF2H != null ){
						matchIndex = compareStr.indexOf( charF2H );
					}
					if ( matchIndex === -1 )
						missMatchLength += 1.0;
				}	
					
			}
			if ( matchIndex !== -1 ) {
				compareStr = compareStr.substring( matchIndex+1 );
			}
			mustStr = mustStr.substring( 1 );
		}
		return missMatchLength;
	};
	
	const clearSkipType = () => {
		getById("skipType").checked = false;
	};
	
	//版本訊息
	const checkUpdate = (jspValue) => {
		if ( updateLog.logAndDate[0].date.replace( /\//g, "" ) !== jspValue ){
			customAlert( translateText( "請重新整理(Ctrl+F5)以取得最新版本(最新版本：v."+jspValue.replace(/\//g,"")+"/當前版本："+updateLog.logAndDate[0].date.replace(/\//g,"")+")", isTC2C ) );
		}
	};
	
	//判斷是否為作者
	const isRD = () => window.location.href.startsWith("file") || getParameter("user") === "Ether" || getParameter("user") === "Sky";

	//判斷是否支援Canvas
	const isCanvasSupported = () => {
		const elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	};
	
	//RD專用，將當前牌庫做JS Code匯出
	const codingDeck = () => {
	
		const tab = "\t";
		const br = "\r\n";
	
		let htmlCode = "";
		const setData = setDatas.getSetDatas( lastSelectedSetCode );
		if ( setData == null || !setData.isDeck ){
			customAlert("Not A Deck!!");
			return;
		}
		htmlCode += tab + `const setCode = "${setData.setCode}";${br}`;
		htmlCode += tab + `const setName = "${setData.setName}";${br}`;
		htmlCode += tab + `const isDeck = true;${br}`;
		htmlCode += tab + `const setCardList = [${br}`;
		for (const setCard of setData.setCards) {
			htmlCode += tab + tab + `{ name : "${setCard.name}", count : ${setCard.count}, },${br}`;
		}
		htmlCode += tab + `];${br}`;
		htmlCode += tab + `setDatas.addSet( setCode , setName , isDeck , setCardList );${br}`;
	
		const w = window.open();
		w.document.write( `<XMP>${htmlCode}</XMP>` );
		w.document.close();
	};

	const getCssValuePrefix = () => {
	
		let rtrnVal = '';//default to standard syntax
		const prefixes = ['-o-', '-ms-', '-moz-', '-webkit-'];
		
		if ( isFirefox )
			return prefixes[2];

		// Create a temporary DOM object for testing
		const dom = document.createElement('div');

		for (const prefix of prefixes) {
			// Attempt to set the style 
			dom.style.background = prefix + 'linear-gradient(0deg, #370d00 0%, #ffffff 100%)';

			// Detect if the style was successfully set
			if (dom.style.backgroundImage )
			{
				rtrnVal = prefix;
			}
		}

		return rtrnVal;
	};
	const backgroundImageHeader = getCssValuePrefix();

	//開啟/關閉Textarea輸入區塊
	const openPDBSBlock = (doCloseIfThisIsTheSubmitBtn, afterFunction) => {
		if ( doCloseIfThisIsTheSubmitBtn == null ){
			const blockPercentW = 0.98;
			const blockPercentH = 0.98;
			const pdbsDIV = document.createElement('div');
			pdbsDIV.style.width = parseInt( document.body.clientWidth * blockPercentW ) +'px';
			pdbsDIV.style.height = parseInt( document.body.clientHeight * blockPercentH ) +'px';
			pdbsDIV.style.left = '0px';
			pdbsDIV.style.top = '0px';
			pdbsDIV.style.paddingLeft = parseInt( document.body.clientWidth * ( 1 - blockPercentW ) * 2 ) + 'px';
			pdbsDIV.style.paddingTop = parseInt( document.body.clientHeight * ( 1 - blockPercentH ) * 2 ) + 'px';
			pdbsDIV.style.backgroundColor = "#666666";
			pdbsDIV.style.position = "absolute";
			const pdbsTextarea = document.createElement('textarea');
			pdbsTextarea.style.width = ( blockPercentW * 100 - 10 ) + "%";
			pdbsTextarea.style.height = ( blockPercentH * 100 - 10 ) + "%";
			const initString = "請在此輸入牌庫內文，例：\r\n3x 神帝ムーラ\r\n 4 * 神帝アージュ\r\n2 時空の庭園";
			pdbsTextarea.placeholder = translateText( initString, isTC2C );
			pdbsDIV.appendChild( pdbsTextarea );
			pdbsDIV.appendChild( document.createElement('br') );
			const submitBtn = document.createElement('input');
			submitBtn.type = "button";
			submitBtn.value = "-匯入-";
			submitBtn.onclick = (() => {
				const af = afterFunction;
				return function(){
					const textAreaValue = this.parentNode.firstChild.value;
					if ( af != null ){
						af( textAreaValue );
					}
					openPDBSBlock( this, null );
				}
			})()
			pdbsDIV.appendChild( submitBtn );
			const closeBtn = document.createElement('input');
			closeBtn.type = "button";
			closeBtn.value = "-關閉-";
			closeBtn.onclick = function(){
				openPDBSBlock( this, null );
			}
			pdbsDIV.appendChild( closeBtn );
			document.body.appendChild( pdbsDIV );
		} else {
			doCloseIfThisIsTheSubmitBtn.parentNode.remove();
		}
	};
	
	// LoadExtPage 函數已移除，因為它使用了已棄用的 ActiveXObject
	
	const convertImageToBase64 = (imgObj, doCanvas) => {
		
		customAlert( "請等候10秒鐘" );
		const proxy = "https://api.allorigins.win/get?url=";
		const url = proxy+encodeURIComponent( imgObj.src );
		
		try{
			$.get(url, (data) => {
				imgObj.src = data.contents;			

				if ( doCanvas ){
					setTimeout( getCanvas, 3000 );
				}
			});
			
		} catch(e){
			customAlert( "失敗了" );			
		}
	};
	
	const screenshot = () => {
		
		convertImageToBase64( getById( "list_block" ), true );
	};
	
	const getCanvas = () => {
		const mainBlock = isMobile() ? getById( "card_data_rPart" ) : getById( "cardDataBlockMainTable" );
		html2canvas( mainBlock ).then(function(canvas) {
			document.body.appendChild(canvas);
			const a = document.createElement('a');
			a.href = canvas.toDataURL("image/jpeg").replace("image/jpeg", "image/octet-stream");
			a.download = 'image.jpg';
			a.click();
			document.body.removeChild(canvas);
			customAlert("完成");
		});
	};

	/** 全形轉半形*/
	const ToCDB = (str) => { 
		let tmp = ""; 
		for(let i=0;i<str.length;i++){ 
			if (str.charCodeAt(i) === 12288){
				tmp += String.fromCharCode(str.charCodeAt(i)-12256);
				continue;
			}
			if(str.charCodeAt(i) > 65280 && str.charCodeAt(i) < 65375){ 
				tmp += String.fromCharCode(str.charCodeAt(i)-65248); 
			} 
			else{ 
				tmp += String.fromCharCode(str.charCodeAt(i)); 
			} 
		} 
		return tmp 
	}; 
	
	//自ガチまとめ匯入牌組(UI)
	const importGachi = (ignore) => {
		if ( ignore ){
			customAlert( "請將ガチまとめ的牌組網址私訊給系統管理員，系統管理員有空的時候會幫您手動產生專屬翻譯用網址" );
		} else {
			const match = prompt("請輸入ガチまとめ的牌組網址").match( /\w{8}\-\w{4}-\w{4}-\w{4}-\w{12}/ );
			const deckId = match ? match[0] : null;
			if ( deckId == null || deckId === "" ){
				customAlert( "格式不符，請聯絡系統管理員" );
			} else {
				parseGachiMatome( deckId );
			}
		}
	};
	
	/**外部連結用工具 (已移除，因為它使用了已停用的 Yahoo YQL 服務)*/
	const domainParse = (qUrl , successMethod , successParameters , failureMethod , failureParameters) => {
		console.error("domainParse is disabled as it relied on a deprecated service.");
		if (failureMethod) failureMethod(failureParameters);
	};
	
	const getCivilBtn = (civil) => {
		const allowedCivilBtns = getByName("allowCivil");
		for (const btn of allowedCivilBtns) {
			if ( parseInt(btn.getAttribute("civil")) === civil )
				return btn;
		}
		return null;
	};
	
	const changeClass = (obj, likeRadio) => {
		if ( obj.getAttribute("class") === "btnUnClick" ){
			if ( likeRadio ){
				const objs = getByName( obj.getAttribute("name") );
				for (const o of objs) {
					o.setAttribute("class","btnUnClick");
				}
			}
			obj.setAttribute("class","btnClick");
		} else {
			if ( likeRadio ){
				return;
			} else {
				obj.setAttribute("class","btnUnClick");
			}
		}
	};
	
	const searchKTag = (str) => {
		const tags = [];
		let is = -1;
		let ie = -1;
		let currentStr = str;
		while ( ( is = currentStr.indexOf("(K)") ) > -1 && ( ie = currentStr.indexOf("(/K)") ) > -1 ){
			const tag = currentStr.substring( is+3, ie );
			tags.push( tag );
			currentStr = currentStr.substring(ie+4);
		}
		return tags;
	};
	
	const findOfficial = () => {
		window.open(`https://dm.takaratomy.co.jp/card/?v=%7B%22suggest%22:%22on%22,%22keyword%22:%22${encodeURIComponent(lastSelectedCardName)}%22,%22keyword_type%22:%5B%22card_name%22%5D,%22culture_cond%22:%5B%22%E5%8D%95%E8%89%B2%22,%22%E5%A4%9A%E8%89%B2%22%5D,%22pagenum%22:%221%22,%22sort%22:%22release_new%22%7D`,"_blank");
	};
	
	const findOfficialQA = () => {
		window.open(`https://dm.takaratomy.co.jp/rule/qa/?qa_w=${encodeURIComponent(lastSelectedCardName)}`,"_blank");
	};
	
	const findWiki = () => {
		const keyword = clearSubName( ToCDB( lastSelectedCardName ) );
		const _link = `https://www.google.co.jp/search?q=${encodeURIComponent(keyword)}+site%3Admwiki.net`;
		window.open( _link, '_blank' );
	};
	
	const findEnWiki = () => {
		const keyword = clearSubName( ToCDB( lastSelectedCardName ) );
		const _link = `https://www.google.co.jp/search?q=${encodeURIComponent(keyword)}+site%3Aduelmasters.fandom.com%2Fwiki%2F`;
		window.open( _link, '_blank' );
	};
	
	const findTrade = () => {
		let keyword = null;
		const cardData = cardDatas.getDataByName( lastSelectedCardName, lastSelectedSetCode, lastSelectedAAIndex, null );
		if ( cardData.id != null ){
			keyword = cardData.id.replace( /秘/g,"㊙" );
		} else {
			keyword = clearSubName( ToCDB( lastSelectedCardName ) ).replace( /\//g,"／" );
		}
		window.open( `https://torekakaku.com/dm/search/?q=${encodeURIComponent(keyword)}`, '_blank' );
	};
	
	const findRuten = () => {
		if ( !twsdCards.includes( lastSelectedCardName ) )
			return;
		
		let idNum = null;
		let r_setCode = lastSelectedSetCode;
		if ( lastSelectedSetCode != null && lastSelectedSetCode !== '' ){
			const selectedCardDats = cardDatas.getDataByName( lastSelectedCardName , lastSelectedSetCode , lastSelectedAAIndex, lastSelectedUdIndex );
			if ( selectedCardDats.id != null ){
				idNum = selectedCardDats.id.split( " " )[1];
			}
		}
		if ( idNum == null || idNum === "" ){
			for (const set of setDatas.set.values()) {
				if ( set.isTWSurroundings ){
					const cardDataOfSet = setDatas.getCardDataInSet( set.setCode , lastSelectedCardName );
					if ( cardDataOfSet != null && cardDataOfSet.id != null ){
						r_setCode = set.setCode;
						const idArray = Array.isArray( cardDataOfSet.id ) ? cardDataOfSet.id : [ cardDataOfSet.id ];
						idNum = idArray[0].split( " " )[1];
						break;
					}
				}
			}
		}
		if ( idNum != null ){
			window.open( `https://www.ruten.com.tw/find/?q=%E6%B1%BA%E9%AC%A5%E7%8E%8B+${r_setCode}+${encodeURIComponent(idNum)}`, '_blank');
		}
	};

	const findCardRush = () => {
		const keyword = clearSubName( lastSelectedCardName ).replace( /\s/g,"+" );
		window.open( `https://www.cardrush-dm.jp/product-list?keyword=${keyword}&Submit=%E6%A4%9C%E7%B4%A2`, '_blank');
	};

	const findYuyutei = () => {
		const keyword = clearSubName( lastSelectedCardName ).replace( /\s/g,"+" );
		window.open( `https://yuyu-tei.jp/sell/dm/s/search?search_word=${keyword}`, '_blank');
	};

	/**
		檢查有沒有遺漏的能力標籤
	*/
	const checkLoseAbilityTags = () => {
		const sp = [];
		for (const cardData of cardDatas.map.values()) {
			const spStrings = [];
			if ( cardData.wData == null ){
				spStrings.push( cardData.sp );
			} else {
				spStrings.push( cardData.wData[0].sp, cardData.wData[1].sp );
			}
			for (const spList of spStrings) {
				for (const spString of spList) {
					const tags = searchKTag(spString);
					for (let theTag of tags) {
						if ( theTag.includes( "<=>" ) ){
							theTag = theTag.split("<=>")[1];
						}
						if ( !sp.includes( theTag ) ){
							sp.push( theTag );
						}
					}
				}
			}
		}
		const exist = Array.from(abilityMapping.map.keys());
		for (const tag of sp) {
			if ( !exist.includes( tag ) ){
				console.log(tag);
			}
		}
	};
	
	/**
		檢查有沒有遺漏的種族
	*/
	const checkLoseRaces = () => {
		const raceMap = Array.from(raceMapping.map.keys());
		for (const cardData of cardDatas.map.values()) {
			const races = cardData.wData == null ? cardData.race : cardData.wData[0].race;
			if ( races != null ){
				for (const race of races) {
					if ( !raceMap.includes( race ) ){
						console.log( `${race}( ${cardData.name} )` );
					}
				}
			}
		}
	};
	
	/**
		確認有沒有重複輸入的卡，會讀很久
	*/
	const checkDuplicateCard = () => {
		const checkCardNames = [];
		for (const cardData of cardDatas.map.values()) {
			const cardName = cardData.name.replace( /( |　)/g , "" );
			checkCardNames.push( clearSubName(cardName) );
		}
		checkCardNames.sort((a, b) => a.localeCompare(b));

		for ( let i = 0 ; i < checkCardNames.length -1 ; i++ ){
			if ( checkCardNames[i] === checkCardNames[i+1] ){
				console.log( checkCardNames[i] );
			}
		}
		console.log( "END" );
	};
	
	/**
	 * [修正版 v4] 建立 AutoComplete 種族輸入框 (通用版)
	 * @param {HTMLElement} container 容器
	 * @param {boolean} isRemovable 是否可刪除
	 * @param {object} config 設定檔 { id: hiddenInputId, name: hiddenInputName, showMatchAll: boolean, allowMultiple: boolean }
	 */
	function createRaceInput(container, isRemovable, config) {
		if (!container) return;

		// 預設設定
		const cfg = Object.assign({
			id: null,               // Hidden Input 的 ID
			name: "raceValue",      // Hidden Input 的 Name
			showMatchAll: true,     // 是否顯示「全符合」Checkbox
			allowMultiple: true     // 是否顯示 [+] 新增按鈕
		}, config);

		const row = document.createElement("div");
		row.className = "race-row";
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.marginBottom = "4px";

		const getIsTC = () => (typeof isTC2C !== 'undefined' ? isTC2C : false);
		const getRLanVal = () => {
			const checked = $('input[name=rLan]:checked');
			if (checked.length > 0) return checked.val();
			return "Jap"; 
		};
		
		// 翻譯 Helper (略...與前版相同)
		const getTransName = (rObj) => {
			const lan = getRLanVal();
			let name = rObj.Jap; 
			if (lan === "Chi") {
				name = rObj.Chi;
				name = translateText(name, getIsTC());
			} else if (lan === "Eng") {
				name = rObj.Eng;
			}
			return name;
		};
		const getCategorySuffix = () => {
			const lan = getRLanVal();
			let suffix = "(類別種族)";
			if (lan === "Eng") {
				suffix = "(Category)";
			} else {
				suffix = translateText(suffix, getIsTC());
			}
			return " " + suffix;
		};

		// 1. 顯示輸入框
		const inputDisplay = document.createElement("input");
		inputDisplay.type = "text";
		inputDisplay.className = "race-input-display";
		
		let initPlaceHolder = "全種族";
		if (getRLanVal() === "Eng") initPlaceHolder = "All Races";
		else initPlaceHolder = translateText(initPlaceHolder, getIsTC());
		inputDisplay.placeholder = initPlaceHolder;

		inputDisplay.autocomplete = "off";
		if (container.id.includes("Mobile")) {
			inputDisplay.style.flex = "1"; 
		} else {
			inputDisplay.style.width = "140px";
		}

		// 2. 實際值的 hidden input
		const inputValue = document.createElement("input");
		inputValue.type = "hidden";
		inputValue.name = cfg.name; // 使用設定的 name
		if (cfg.id) inputValue.id = cfg.id; // 使用設定的 id (這對 ab_race 很重要)
		inputValue.value = "";

		// 3. 清除按鈕
		const btnClear = document.createElement("span");
		btnClear.innerText = "×";
		btnClear.title = "清除";
		const btnStyle = btnClear.style;
		btnStyle.cursor = "pointer";
		btnStyle.fontSize = "14px";
		btnStyle.fontWeight = "bold";
		btnStyle.display = "inline-block";
		btnStyle.width = "18px";
		btnStyle.height = "18px";
		btnStyle.lineHeight = "18px";
		btnStyle.textAlign = "center";
		btnStyle.marginLeft = "-24px";
		btnStyle.marginRight = "6px";
		btnStyle.zIndex = "10";
		btnStyle.borderRadius = "50%";
		btnStyle.transition = "background-color 0.2s, color 0.2s";

		const setClearBtnState = (isError) => {
			if (isError) {
				btnStyle.color = "#FFF";
				btnStyle.backgroundColor = "#FF0000";
				btnStyle.boxShadow = "0 0 2px rgba(0,0,0,0.3)";
			} else {
				btnStyle.color = "#999";
				btnStyle.backgroundColor = "transparent";
				btnStyle.boxShadow = "none";
			}
		};
		setClearBtnState(false);
		
		// 4. 下拉選單 UL
		const ulList = document.createElement("ul");
		ulList.className = "race-dropdown-list";

		const checkValidity = () => {
			const isInvalid = (inputDisplay.value !== "" && inputValue.value === "");
			setClearBtnState(isInvalid);
		};

		btnClear.onclick = () => {
			inputDisplay.value = "";
			inputValue.value = "";
			checkValidity();
			ulList.style.display = "none";
			inputDisplay.focus();
		};

		const buildOptions = (filterText) => {
			ulList.innerHTML = "";
			const catSuffix = getCategorySuffix();
			
			const createLi = (text, value, isHot) => {
				const li = document.createElement("li");
				li.textContent = text;
				if (isHot) li.style.color = "red";
				li.onmousedown = (e) => {
					e.preventDefault();
					inputDisplay.value = text;
					inputValue.value = value;
					checkValidity();
					ulList.style.display = "none";
				};
				return li;
			};

			if (!filterText) {
				const liAll = document.createElement("li");
				let allText = "全種族";
				if (getRLanVal() === "Eng") allText = "All Races";
				else allText = translateText(allText, getIsTC());
				
				liAll.textContent = allText;
				liAll.onmousedown = (e) => {
					e.preventDefault();
					inputDisplay.value = "";
					inputValue.value = "";
					checkValidity();
					ulList.style.display = "none";
				};
				ulList.appendChild(liAll);
			}

			if (typeof raceMapping !== 'undefined') {
				const races = Array.from(raceMapping.map.keys());
				let exactMatchId = null;
				let processedRaces = [];

				for (const raceJap of races) {
					const raceObj = raceMapping.getDataByJap(raceJap);
					let raceDisplay = getTransName(raceObj);
					if (raceObj.isCategory) raceDisplay += catSuffix;

					if (filterText && (raceDisplay.toUpperCase() === filterText || raceJap.toUpperCase() === filterText)) {
						exactMatchId = raceJap;
					}

					if (filterText && 
						!raceDisplay.toUpperCase().includes(filterText) && 
						!raceJap.toUpperCase().includes(filterText)) {
						continue;
					}

					processedRaces.push({
						text: raceDisplay,
						value: raceJap,
						isHot: !!raceObj.pop,
						sortKey: raceDisplay.toUpperCase()
					});
				}

				processedRaces.sort((a, b) => a.text.localeCompare(b.text));
				const hotList = processedRaces.filter(r => r.isHot);
				const normalList = processedRaces.filter(r => !r.isHot);

				hotList.forEach(item => ulList.appendChild(createLi(item.text, item.value, true)));
				if (hotList.length > 0 && (!filterText || normalList.length > 0)) {
					const liSep = document.createElement("li");
					liSep.textContent = "--------";
					liSep.style.color = "#888";
					liSep.style.cursor = "default";
					liSep.onmousedown = (e) => e.stopPropagation();
					ulList.appendChild(liSep);
				}
				normalList.forEach(item => ulList.appendChild(createLi(item.text, item.value, false)));

				if (exactMatchId) inputValue.value = exactMatchId;
			}

			if (ulList.children.length === 0) {
				const liNone = document.createElement("li");
				let noneText = "查無符合種族";
				if (getRLanVal() === "Eng") noneText = "No Result";
				else noneText = translateText(noneText, getIsTC());
				liNone.textContent = noneText;
				liNone.style.color = "#999";
				liNone.style.cursor = "default";
				liNone.onmousedown = (e) => e.stopPropagation();
				ulList.appendChild(liNone);
			}
			checkValidity();
		};

		inputDisplay.onfocus = () => {
			buildOptions(inputDisplay.value.toUpperCase());
			ulList.style.display = "block";
		};
		inputDisplay.oninput = () => {
			inputValue.value = "";
			buildOptions(inputDisplay.value.toUpperCase());
			ulList.style.display = "block";
		};
		inputDisplay.onblur = () => {
			checkValidity();
			setTimeout(() => { ulList.style.display = "none"; }, 200);
		};

		row.appendChild(inputDisplay);
		row.appendChild(btnClear);
		row.appendChild(inputValue);
		row.appendChild(ulList);

		// 全符合 Checkbox
		if (cfg.showMatchAll) {
			const labelAbs = document.createElement("label");
			labelAbs.style.fontSize = "12px";
			labelAbs.style.cursor = "pointer";
			labelAbs.style.whiteSpace = "nowrap";
			labelAbs.style.display = "flex";
			labelAbs.style.alignItems = "center";
			const checkAbs = document.createElement("input");
			checkAbs.type = "checkbox";
			checkAbs.name = "raceAbsolute";
			checkAbs.value = "Y";
			checkAbs.style.margin = "0 2px 0 0";
			checkAbs.checked = false;
			labelAbs.appendChild(checkAbs);
			labelAbs.appendChild(document.createTextNode("全符合"));
			row.appendChild(labelAbs);
		}

		// 新增/刪除按鈕
		if (cfg.allowMultiple) {
			if (!isRemovable) {
				const btnAdd = document.createElement("button");
				btnAdd.type = "button";
				btnAdd.className = "race-btn race-add-btn";
				btnAdd.textContent = "+";
				btnAdd.onclick = () => { createRaceInput(container, true, config); };
				btnAdd.style.display = "none"; 
				row.appendChild(btnAdd);
			} else {
				const btnDel = document.createElement("button");
				btnDel.type = "button";
				btnDel.className = "race-btn";
				btnDel.textContent = "-";
				btnDel.onclick = () => { container.removeChild(row); };
				row.appendChild(btnDel);
			}
		}

		container.appendChild(row);
	}
	
	
	// -----------------------------------------------------------
	// [新增函數] 用於填充單一 Ability Select 的選項
	// -----------------------------------------------------------
	const buildAbilityOptions = (selectObj) => {
		// 1. 取得目前選擇的語言
		let rLanVal = "Jap";
		const checked = $('input[name=rLan]:checked');
		if (checked.length > 0) rLanVal = checked.val();

		// 2. 判斷是否繁簡轉換
		const isTC = (typeof isTC2C !== 'undefined' ? isTC2C : false);

		// 3. 記住目前選中的值，重建後要選回來
		const lastSelectedAb = selectObj.value;

		// 4. 準備選項陣列
		// 先加入預設選項 (不過濾)
		const optionOfSkip = document.createElement('option');
		optionOfSkip.value = "";
		optionOfSkip.text = (rLanVal === "Eng") ? "All Abilities" : translateText("不過濾", isTC);
		
		// 無能力選項
		const optionOfEmpty = document.createElement('option');
		optionOfEmpty.value = "empty";
		optionOfEmpty.text = (rLanVal === "Eng") ? "No Ability" : translateText("無能力", isTC);

		const sortNewOptions = [];

		// 5. 遍歷 abilityMapping 產生選項
		if (typeof abilityMapping !== 'undefined') {
			for (const [japKey, abData] of abilityMapping.map) {
				const option = document.createElement('option');
				option.value = japKey;

				// 根據語言決定顯示文字
				let abText = abData.Jap;
				if (rLanVal === "Chi") {
					abText = translateText(abData.Chi, isTC);
				} else if (rLanVal === "Eng") {
					abText = abData.Eng;
				}
				option.text = abText;
				
				// 標記熱門屬性
				if (abData.pop) {
					option.style.color = "red";
					option.setAttribute("pop", "1");
				}

				sortNewOptions.push(option);
			}
		}

		// 6. 排序 (依顯示文字排序，熱門置頂邏輯稍後處理)
		sortNewOptions.sort((a, b) => a.text.localeCompare(b.text));

		// 7. 重新組裝 (熱門 -> 分隔線 -> 一般)
		const hotOptions = sortNewOptions.filter(opt => opt.getAttribute("pop") === "1");
		const normalOptions = sortNewOptions.filter(opt => opt.getAttribute("pop") !== "1");

		// 清空並依序加入
		clearChildren(selectObj);

		// (1) 不過濾
		selectObj.appendChild(optionOfSkip);
		
		// (2) 無能力 (放在最上面方便點選)
		selectObj.appendChild(optionOfEmpty);

		// (3) 熱門選項
		if (hotOptions.length > 0) {
			const lineOption = document.createElement('option');
			lineOption.text = "--------";
			lineOption.disabled = true;
			
			hotOptions.forEach(opt => selectObj.appendChild(opt));
			selectObj.appendChild(lineOption);
		}

		// (4) 一般選項
		normalOptions.forEach(opt => selectObj.appendChild(opt));

		// 8. 還原選取值
		setSelectValue2(selectObj, lastSelectedAb);
	};

	// -----------------------------------------------------------
	// [修改函數] 變更能力選單語言 (遍歷所有動態產生的 select)
	// -----------------------------------------------------------
	const changeKeyWordLan = () => {
		const abSelectorObjs = document.getElementsByName("abilities");
		for (const selectObj of abSelectorObjs) {
			buildAbilityOptions(selectObj);
		}
	};

	// -----------------------------------------------------------
	// [新增函數] 建立動態 Ability Select UI
	// -----------------------------------------------------------
	function createAbilitySelect(container, isRemovable) {
		if (!container) return;

		const row = document.createElement("div");
		row.className = "ability-row";
		row.style.marginBottom = "4px";
		row.style.display = "flex";
		row.style.alignItems = "center";

		// 1. 建立 Select
		const select = document.createElement("select");
		select.name = "abilities";
		
		// 依容器決定寬度 (手機版寬一點，PC版固定)
		if (container.id === "abilityContainer_Mobile") {
			select.style.flex = "1";
		} else {
			select.style.width = "164px";
		}

		// 立即填充選項
		buildAbilityOptions(select);

		row.appendChild(select);

		// 2. 建立按鈕 (+ / -)
		if (!isRemovable) {
			// 第一列：新增按鈕
			const btnAdd = document.createElement("button");
			btnAdd.type = "button";
			btnAdd.className = "race-btn ability-add-btn"; // 借用 race-btn 樣式
			btnAdd.textContent = "+";
			btnAdd.onclick = () => { createAbilitySelect(container, true); };
			// 預設隱藏，由 filter_adv 控制
			btnAdd.style.display = "none";
			row.appendChild(btnAdd);
		} else {
			// 其他列：刪除按鈕
			const btnDel = document.createElement("button");
			btnDel.type = "button";
			btnDel.className = "race-btn"; // 借用 race-btn 樣式
			btnDel.textContent = "-";
			btnDel.onclick = () => { container.removeChild(row); };
			row.appendChild(btnDel);
		}

		container.appendChild(row);
	}

	// -----------------------------------------------------------
	// [修改函數] filter_adv (修正版)
	// 修正重點：關閉進階過濾時，保留第一列 (基本搜尋區) 的能力過濾值
	// -----------------------------------------------------------
	const filter_adv = (obj) => {
		const doOpen = "＋" === obj.innerText; // 判斷是要開啟還是關閉
		const filterTitles = getByClass("filterTitle");
		for (const title of filterTitles) {
			title.innerText = doOpen ? "進階搜尋" : "基本搜尋";
		}
		// 符號變更
		obj.innerText = doOpen ? "－" : "＋";

		// --- 種族 UI 控制 ---
		const raceContainers = [getById("raceContainer_PC"), getById("raceContainer_Mobile")];
		for (const container of raceContainers) {
			if (!container) continue;
			// 控制 [+] 按鈕
			const addBtns = container.getElementsByClassName("race-add-btn");
			if (addBtns.length > 0) {
				addBtns[0].style.display = doOpen ? "inline-block" : "none";
			}
			// 關閉時移除多餘的列
			if (!doOpen) {
				const rows = container.getElementsByClassName("race-row");
				while (rows.length > 1) {
					container.removeChild(rows[rows.length - 1]);
				}
			}
		}

		// --- [新增] 能力 UI 控制 ---
		const abilityContainers = [getById("abilityContainer_PC"), getById("abilityContainer_Mobile")];
		for (const container of abilityContainers) {
			if (!container) continue;
			
			// 1. 控制 [+] 按鈕顯示
			const addBtns = container.getElementsByClassName("ability-add-btn");
			if (addBtns.length > 0) addBtns[0].style.display = doOpen ? "inline-block" : "none";

			// 2. 關閉時重置：只移除第一列以外的所有下拉選單
			if (!doOpen) {
				const rows = container.getElementsByClassName("ability-row");
				// 從後面往前刪，保留第一個 (index 0)
				while (rows.length > 1) {
					container.removeChild(rows[rows.length - 1]);
				}
				
				// [修正] 這裡移除了原本重置第一列值的程式碼
				// 讓使用者切換回基本搜尋時，原本選的值還在
			}
		}

		// --- 其他原有過濾器邏輯 ---
		const seconds = [ getByClass("cost2"), getByClass("power2") ];
		for (const second of seconds) {
			for (const element of second) {
				element.style.display = doOpen ? "inline" : "none";
			}
		}
		if ( doOpen ){ $(".wUdDiv").show(); } else { $(".wUdDiv").hide(); }
		getById("filter_tr_soul").style.display = doOpen ? "" : "none";
		getById("filter_tr_rarility").style.display = doOpen ? "" : "none";
		
		// 進階能力過濾器中的額外欄位 (種族/卡名)
		getById("regularAbilitiesFilter").style.display = doOpen ? "" : "none";

		const subTypes = getByClass("subType");
		for (const subType of subTypes) {
			subType.style.display = doOpen ? "" : "none";
			subType.children[0].checked = false;
		}
		
		// 關閉時重置其他隱藏的進階欄位
		if ( !doOpen ){
			setSelectValue( "cost2" , "" );
			setSelectValue( "power2" , "" );
			$('input[name=wUdCase]').prop("checked",true);
			setCheckboxValue( "soul" , null );
			setCheckboxValue( "rarility" , null );
			
			// [修正] ab_race 現在是 createRaceInput 生成的，有 inputDisplay 和 hiddenInput
			// 要把 hiddenInput 的值清空，並把 display input 清空
			const abRaceContainer = getById("ab_race_container"); // 注意 id 變化
			if (abRaceContainer) {
				 const hidden = abRaceContainer.querySelector("input[type='hidden']");
				 const display = abRaceContainer.querySelector(".race-input-display");
				 if (hidden) hidden.value = "";
				 if (display) display.value = "";
				 // 也要隱藏清除按鈕的錯誤狀態 (如果有)
				 const clearBtn = abRaceContainer.querySelector("span[title*='清除']");
				 if (clearBtn) {
					 clearBtn.style.color = "#999";
					 clearBtn.style.backgroundColor = "transparent";
					 clearBtn.boxShadow = "none";
				 }
			}
			setSelectValue2( getById( "ab_name" ) , "" );
		}
	};