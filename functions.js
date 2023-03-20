	
	//瀏覽器判斷區塊
		// Opera 8.0+
	var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
		// Firefox 1.0+
	var isFirefox = typeof InstallTrigger !== 'undefined';
		// At least Safari 3+: "[object HTMLElementConstructor]"
	var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
		// Internet Explorer 6-11
	var isIE = /*@cc_on!@*/false || !!document.documentMode;
		// Edge 20+
	var isEdge = !isIE && !!window.StyleMedia;
		// Chrome 1+
	var isChrome = !!window.chrome && !!window.chrome.webstore;
		// Blink engine detection
	var isBlink = (isChrome || isOpera) && !!window.CSS;	//取得有效的CSS backgroundImage Header

	//自定義Object工具
	Element.prototype.documentOffsetTop = function () {
		return this.offsetTop + ( this.offsetParent ? this.offsetParent.documentOffsetTop() : 0 );
	};
	//自定義陣列工具
	Array.prototype.insert = function (index, item) {
		this.splice(index, 0, item);
	};
	Array.prototype.insertSingleOption = function( str ){
		var insertIndex = 0;
		for ( var r = 0 ; r < this.length ; r++ ){
			if ( this[r] == str ){
				insertIndex = -1;
				break;
			} else if ( this[r] < str ){
				insertIndex++;
			}
		}
		if ( insertIndex > -1 ){
			this.insert( insertIndex , str );
		}
	};
	Array.prototype.indexOf = function( object ){
		for ( var i = 0 ; i < this.length ; i++ )
			if ( this[i] == object )
				return i;
		return -1;
	};
	Array.prototype.include = function( object ){
		return this.indexOf( object ) != -1;
	};
	Array.prototype.includeLike = function( object ){
		for ( var i = 0 ; i < this.length ; i++ ){
			if ( this[i].indexOf( object ) != -1 ){
				return true;
			}
		}
		return false;
	};
	//讓IMAGE可以增加多重onload
	Image.prototype.addLoadEvent = function( func ){
		var oldonload = this.onload;
		if (typeof this.onload != 'function') {
			this.onload = func;
		} else {
			this.onload = function() {
				if (oldonload) {
					oldonload();
				}
				func();
			}
		}
	};
	
	//取得parameter
	function getParameter(name) 
	{
		var AllVars = window.location.search.substring(1);
		var Vars = AllVars.split("&");
		for (i = 0; i < Vars.length; i++)
		{
			var Var = Vars[i].split("=");
			if (Var[0] == name) return Var[1];
		}
		return null;
	}
	
	//取得FRAME物件Container
	function getIFrameContainer( frameObj ){
		if ( frameObj == null )
			return null;
		else if ( frameObj.contentWindow != null )
			return frameObj.contentWindow;
		else if ( frameObj.contentDocument.document != null )
			return frameObj.contentDocument.document;
		else
			return container.contentDocument
	}
	
	//複製物件
	function clone(obj) {
		// Handle the 3 simple types, and null or undefined
		if (null == obj || "object" != typeof obj) return obj;

		// Handle Date
		if (obj instanceof Date) {
			var copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}

		// Handle Array
		if (obj instanceof Array) {
			var copy = [];
			var len = obj.length;
			for (var i = 0 ; i < len; ++i ) {
				copy[i] = clone(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			var copy = {};
			for (var attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
			}
			return copy;
		}

		throw new Error("Unable to copy obj! Its type isn't supported.");
	}

	//圖片ID字首
	var picIdHeader = "list_";
	//目前所選擇的卡片名
	var lastSelectedCardName = null;
	//目前所限制的SETCODE
	var lastSelectedSetCode = null;
	//目前所限制的aaIndex
	var lastSelectedAAIndex = null;
	//雙極卡選項
	var lastSelectedUdIndex = null;
	//是否默許開放圖片列表
	var allowPictureList = false;
	//是否不再詢問流量問題
	var askSkip = false;
	//是否進行港化
	var isHK = "isHK" == getParameter("tran");
	//是否進行簡體化
	var isTC2C = "isTC2C" == getParameter("tran");
	
	//依照過濾條件找出相符資料
	function query(){

		var listType = getRadioValue( "listType" );
		var sort = getRadioValue( "sortBy" );
		var desc = "true" == getRadioValue( "desc" );
		var twsd = gobi("TWSD").checked;
	
		var nameTable = gobi( "names" );
		
		//清除所有子項
		clearChildren( nameTable );
		//清除AAIndex
		lastSelectedAAIndex = null;
		
		//依照條件進行過濾、並依照指定進行排序
		var cardDataBySort = getSortList( sort , desc , twsd );
		var noQueryData = cardDataBySort == null || cardDataBySort.length == 0;
		if ( noQueryData ){
			var noQueryDataMsg = translateText( "查無資料" , isTC2C );
			clearListAndSetOneLine( noQueryDataMsg );	
			alert( noQueryDataMsg );
		} else {
		
			if ( listType == "picture" && !allowPictureList ){
				if ( confirm( "警告！您所選擇的列表顯示方式為「圖片」，此作業將可能造成下載流量大幅增加(預計將載入"+cardDataBySort.length+"張圖片)，請問是否確定要執行？" ) ){
					if ( !askSkip ){
						askSkip = true;
						if ( confirm("請問是否不要再詢問這個問題？") ){
							allowPictureList = true;
						}
					}
				} else {
					setRadioValue( "listType" , "name" );
					listType = getRadioValue( "listType" );
				}
			}

			//先把tr物件記在陣列裡以方便非超次元/超次元的排序
			var tableTrList = [];
			var tableTrExList = [];
			var tableTrGrList = [];
			var tableTrExistList = [];
			//如果有限定牌庫的話就找出牌庫資訊
			var theSet = null;
			if ( lastSelectedSetCode != null ){
				var theSet = setDatas.getSetDatas( lastSelectedSetCode );
			}
//			var bgSettingList = civilMapping.getListBGSetting_List();
			for ( var i = 0 ; i < cardDataBySort.length ; i++ ){
		
				var tr = document.createElement('tr');
				//卡名不得進行簡繁轉換
				setNoTrans( tr );
				var bgCivil = 0;
				//沒有指定SET的時候，會拿到完整資料
				if ( lastSelectedSetCode == null ){
					bgCivil = cardDataBySort[i].civil;
					if ( bgCivil == null ){
						bgCivil = 0;
						for ( var w = 0 ; w < cardDataBySort[i].wData.length ; w++ ){
							bgCivil = bgCivil | cardDataBySort[i].wData[w].civil;
						}
					}
				//指定SET的時候，雙極卡只會拿到上半部資料
				} else {
					bgCivil = cardDataBySort[i].civil;
					if ( cardDataBySort[i].ws != null ){
						bgCivil = 0;
						for ( var w = 0 ; w < cardDataBySort[i].ws.length ; w++ ){
							var theFullData = cardDatas.getDataByName( cardDataBySort[i].name , null , null, w )
							bgCivil = bgCivil | theFullData.civil;
						}
					}
				}
				var backgroundImage = civilMapping.getBackgroundCSS( bgCivil );
				tr.style.backgroundImage = backgroundImage;
				//如果有指定SET的話，就多一個TD顯示張數或編號
				if ( theSet != null ){
					var tdNum = document.createElement('td');
					var theCardData = theSet.getCardData( cardDataBySort[i].name , lastSelectedAAIndex );
					var numberic = "    ";
					var hasAAIndex = false;
					if ( theCardData != null ){
						if ( theSet.isDeck ){
							if ( theCardData.count != null ){
								numberic = theCardData.count + " × ";
							}
						} else if ( theCardData.id != null ){
							var theIdStr = theCardData.id;
							var bi = theIdStr.indexOf( " " );
							if ( bi == -1 ){
								bi = 0;
							}
							var ai = theIdStr.indexOf( "/" );
							if ( ai == -1 ){
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
					var idSpan = document.createElement('span');
					idSpan.appendChild( document.createTextNode( numberic ) );
					if ( hasAAIndex ){
						idSpan.style.textDecoration = "underline";
					}
					tdNum.appendChild( idSpan );
					tdNum.style.width = "30px";
					tdNum.style.textAlign = "center";
					if ( theSet.isDeck ){
						//如果下一張就是這張的背面的話，則共用張數欄
						if ( i+1 < cardDataBySort.length && cardDataBySort[i+1].back == cardDataBySort[i].name ){
							tdNum.setAttribute("rowspan",2);
							tr.appendChild( tdNum );
						//目前不處理多張翻面合體的併欄
						} else if ( cardDataBySort[i].back instanceof Array && cardDataBySort[i].back.length > 1 ){
							tr.appendChild( tdNum );
						//如果前一張就是這張的背面的話，則因共用張數欄位而不插入tr
						} else if ( i-1 > 0 && cardDataBySort[i-1].back == cardDataBySort[i].name ){
							//
						//沒有背面則直接顯示張數
						} else {
							tr.appendChild( tdNum );
						}
					} else {
						tr.appendChild( tdNum );
					}
				//沒有的話，則新增一個流水號TD
				} else {
					var tdNum = document.createElement('td');
					tdNum.appendChild( document.createTextNode( ( i + 1 ) ) );
					tdNum.style.width = "20px";
					tdNum.style.textAlign = "center";
					tr.appendChild( tdNum );
				}
				var td = document.createElement('td');
				tr.setAttribute("tr_cardName",cardDataBySort[i].name);
				tr.onclick = (function(){
					var thisCardName = cardDataBySort[i].name;
					return function(){
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
				if ( "name" == listType ){
					td.appendChild( document.createTextNode( clearSubName( cardDataBySort[i].name ) ) );
//					if ( cardDataBySort[i].wData == null ){
//						td.appendChild( document.createTextNode( clearSubName( cardDataBySort[i].name ) ) );
//					} else {
//						var ns = clearSubName( cardDataBySort[i].name ).split( / *\/ */g );
//						for ( var ni = 0 ; ni < ns.length ; ni++ ){
//							if ( ni > 0 ){
//								td.appendChild( document.createElement( "br" ) );
//							}
//							td.appendChild( document.createTextNode( ns[ni] ) );
//						}
//					}
				//如果以卡圖做為列表，則顯示卡圖
				} else if ( "picture" == listType ){
					var picObjs = getImgFromOutSite( cardDataBySort[i] , 120 , null , i );
					for ( var pos = 0 ; ops < picObjs.length ; pos++ ){
						td.appendChild( picObjs[ pos ] );
					}
				}
				td.style.padding = '5 10 5 10';
				td.style.textAlign = "center";
				tr.appendChild( td );
				tr.onmouseover = function(){
					this.style.backgroundColor = "#00A2E8";
					this.style.backgroundImage = 'none';
				};
				tr.onmouseout = (function(){
					var cssSetting = backgroundImage;
					return function(){
						this.style.backgroundColor = "#FFFFFF";
						this.style.backgroundImage = cssSetting;
 					};
				})();
				tr.style.cursor = "pointer";

				var theLocation = cardTypeMapping.getDataByValue( ( cardDataBySort[i].type instanceof Array ? cardDataBySort[i].type : [ cardDataBySort[i].type ] )[0] ).Location;
				//牌庫+沒排序+超次元牌庫的話就塞超次元TR暫存陣列
				if ( theSet != null && theSet.isDeck && sort == "" && theLocation == "I" ){
					tableTrExistList.push( tr );
				} else if ( theSet != null && theSet.isDeck && sort == "" && theLocation == "P" ){
					tableTrExList.push( tr );
				} else if ( theSet != null && theSet.isDeck && sort == "" && theLocation == "G" ){
					tableTrGrList.push( tr );
				//其他直接塞
				} else {
					tableTrList.push( tr );
				}
			}
			
			//如果有指定SETCODE的話，就把資料未存在的也列入List裡
			if ( theSet != null && theSet.isDeck ){
			
				for ( var i = 0 ; i < theSet.setCards.length ; i++ ){
					var nameInSet = theSet.setCards[i].name;
					var nameNoData = theSet.setCards[i].noData || ( cardDatas.getDataByName( nameInSet , null , null ) == null );
					
					if ( nameNoData ){

						var tr = document.createElement('tr');
						//卡名不得進行簡繁轉換
						setNoTrans( tr );
						tr.style.backgroundColor = "#7F7F7F";
				
						var tdNum = document.createElement('td');
						var numberic = theSet.setCards[i].count + " × ";
						var idSpan = document.createElement('span');
						idSpan.appendChild( document.createTextNode( numberic ) );
						tdNum.appendChild( idSpan );
						tdNum.style.width = "30px";
						tdNum.style.textAlign = "center";
						
						tr.appendChild( tdNum );
						
						var tdNoDataName = document.createElement('td');
						var cardName = document.createTextNode( clearSubName( nameInSet ) );
						tdNoDataName.appendChild( cardName );
						tdNoDataName.style.textAlign = "center";
						if ( theSet.setCards[i].link != null ){
							tdNoDataName.style.textDecoration = "underline";
							tdNoDataName.style.color = "blue";
							tr.style.cursor = "pointer";
							tr.onclick = (function(){
								var dmVaultLink = theSet.setCards[i].link;
								return function(){
									if ( isBlockedByDMVault )
										window.open( "https://translate.google.com.tw/translate?hl=zh-TW&sl=ja&anno=2&tl=zh-TW&u=http%3A%2F%2Fdmvault.ath.cx%2Fcard%2F" + dmVaultLink , "_blank" );
									else
										window.open( "http://dmvault.ath.cx/card/" + dmVaultLink , "_blank" );
								}
							})();
							tr.setAttribute("tr_cardName_vaultLink",nameInSet);
						}
						tr.appendChild( tdNoDataName );
						//牌庫+沒排序+超次元牌庫的話就塞超次元TR暫存陣列
						if ( theSet != null && theSet.isDeck && sort == "" && theSet.setCards[i].isEx ){
							tableTrExList.push( tr );
						//其他直接塞
						} else {
							tableTrList.push( tr );
						}
					}
				}
			}
			//塞進TABLE裡
			for ( var i = 0 ; i < tableTrList.length ; i++ ){
				nameTable.appendChild( tableTrList[i] );
			}
			//插進一個"以下超次元區"的分隔用TR
			if ( tableTrExList.length > 0 ){
				var tr = document.createElement('tr');
				tr.style.backgroundColor = "#000000";
				tr.style.height = "10px;";
		
				var td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				nameTable.appendChild( tr );
			}
			//塞進TABLE裡
			for ( var i = 0 ; i < tableTrExList.length ; i++ ){
				nameTable.appendChild( tableTrExList[i] );
			}
			//插進一個"以下GR區"的分隔用TR
			if ( tableTrGrList.length > 0 ){
				var tr = document.createElement('tr');
				tr.style.backgroundColor = "#000000";
				tr.style.height = "10px;";
		
				var td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				nameTable.appendChild( tr );
			}
			//塞進TABLE裡
			for ( var i = 0 ; i < tableTrGrList.length ; i++ ){
				nameTable.appendChild( tableTrGrList[i] );
			}
			//插進一個"以下初始區"的分隔用TR
			if ( tableTrExistList.length > 0 ){
				var tr = document.createElement('tr');
				tr.style.backgroundColor = "#000000";
				tr.style.height = "10px;";
		
				var td = document.createElement('td');
				td.setAttribute("colspan","2");
				tr.appendChild( td );
				nameTable.appendChild( tr );
			}
			//塞進TABLE裡
			for ( var i = 0 ; i < tableTrExistList.length ; i++ ){
				nameTable.appendChild( tableTrExistList[i] );
			}
			changeListCSS();
		}
		//繁轉簡
		if ( isTC2C ){
			translatePage();
		}
		gobi("popList1").style.display = "inline";
		gobi("popList2").style.display = "inline";
		gobi("popList3").style.display = "inline";
		gobi("popList4").style.display = "inline";
		var listCardNCs = "";
		if ( theSet != null && theSet.isDeck ){
			for ( var i = 0 ; i < theSet.setCards.length ; i++ ){
				listCardNCs += ( i == 0 ? "" : "," ) + clearSubName( theSet.setCards[i].name ) + "," + theSet.setCards[i].count;
			}
		}
		//估價功能初始化
		priceBtnInit( listCardNCs );
		return cardDataBySort.length;
	}
	
	function priceBtnInit( listCardNCs ){
		var priceBtn = document.getElementById("priceBtn");
		if ( priceBtn != null ){
			if ( listCardNCs != "" ){
				priceBtn.setAttribute( "deckPrice", 0 );
				priceBtn.setAttribute( "listCardNCs", listCardNCs );
				priceBtn.setAttribute( "noData", "" );
				priceBtn.value = "估價("+ ( priceBtn.getAttribute("listCardNCs").split(",").length/2 )+"/$0)";
				priceBtn.disabled = false;
			} else {
				priceBtn.value = "估價(0/$0)";
				priceBtn.disabled = true;
			}
		}
	}
	
	function popPrice( queryPrice ){
	
		var priceBtn = document.getElementById("priceBtn");
		var listCardNCs = priceBtn.getAttribute( "listCardNCs" ).split(",");
		var cardName = listCardNCs[ listCardNCs.length - 2 ];
		
		//沒有查到價格
		if ( queryPrice == null || queryPrice < 0 ){

			var noData = priceBtn.getAttribute( "noData" );
			noData += ( noData == "" ? "" : "\n" ) + cardName;
			priceBtn.setAttribute( "noData", noData );
			
		} else {

			var deckPrice = parseInt( priceBtn.getAttribute("deckPrice") );
			deckPrice += queryPrice;
			priceBtn.setAttribute( "deckPrice", deckPrice );
			priceBtn.value = "估價("+( listCardNCs.length/2-1 )+"/$"+deckPrice+")";
		}
		
		var returnList = "";
		for ( var i = 0 ; i < listCardNCs.length-2 ; i++ ){
			returnList += ( i == 0 ? "" : "," ) + listCardNCs[i];
		}
		priceBtn.setAttribute( "listCardNCs", returnList );

	}
	
	//document.getElementById();
	function gobi( objId ){
		return document.getElementById( objId );
	}
	
	//document.getElementsByName();
	function gosbn( objName ){
		return document.getElementsByName( objName );
	}
	
	//取得所有指定name的物件值
	function getValuesByName( name ){
		var rtnValues = [];
		var objs = gosbn( name );
		for ( var o = 0 ; o < objs.length ; o++ ){
			rtnValues.push( objs[o].value );			
		}
		return rtnValues;
	}

	//取得所有指定class的物件值
	function getValuesByCN( name ){
		var rtnValues = [];
		var objs = gosbcn( name );
		for ( var o = 0 ; o < objs.length ; o++ ){
			rtnValues.push( objs[o].value );			
		}
		return rtnValues;
	}
	
	//取得所有指定name的checkbox的值，沒有勾選則該值為null
	function getCheckedByName( rcName ){
		var rtnValues = [];
		var objs = gosbn( rcName );
		for ( var o = 0 ; o < objs.length ; o++ ){
			rtnValues.push( objs[o].checked );			
		}
		return rtnValues;
	}
	
	//取得RADIO的值
	function getSelectedByName( rcName ){
		var objs = gosbn( rcName );
		for ( var o = 0 ; o < objs.length ; o++ ){
			if ( objs[o].checked ){
				return objs[o].value;
			}
		}
		return null;
	}
	
	//將卡牌基本資料跟set卡牌專屬資料結合
	function cloneCardData( cardData , setCardData ){
		var rtnObj = clone( cardData );
		if ( setCardData != null ){

			//換成該set的卡圖
//			if ( setCardData.pic != null && setCardData.pic != "" ){
			if ( setCardData.pic != null ){
				rtnObj.pic = setCardData.pic;
			}
			if ( setCardData.flavor != null && setCardData.flavor != "" ){
				rtnObj.flavor = setCardData.flavor;
			}
			if ( setCardData.rarity != null && setCardData.rarity != "" ){
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
	}
	
	//設定物件內容不得進行簡繁轉換
	function setNoTrans( obj ){
		if ( obj != null ){
			obj.setAttribute("NT","1");
		}
	}
	//判斷物件是否不得進行簡繁轉換
	function isNoTrans( obj ){
		if ( obj == null )
			return true;
		else if ( obj.tagName == null )
			return false;
		else
			return "1" == obj.getAttribute("NT");
	}
	
	//新增歷史流程
	var queryHistory = [];
	var historyIndex = -1;
	var queryHistorySetCode = "DM-HISTORY";
	//新增卡牌至歷史紀錄
	function addHistory( cardName ){
	
		//記錄歷史流程(上下步驟)
		var historyObj = {
			qCardName : lastSelectedCardName,
			qSetCode : lastSelectedSetCode,
			qSetAA : lastSelectedAAIndex,
			equals : function( obj ){
				if ( obj == null )
					return false;
				if ( obj.qCardName != this.qCardName )
					return false;
				if ( obj.qSetCode != this.qSetCode )
					return false;
				if ( obj.qSetAA != this.qSetAA )
					return false;
				return true;
			},
		};
		//如果沒有上下頁記錄就直接存入
		if ( queryHistory.length == 0 ){
			queryHistory.push( historyObj );
			historyIndex = 0;
		//如果historyIndex=-1、或是如果historyIndex>陣列長度的話表示違法操作、不執行處理
		} else if ( historyIndex == -1 || ( historyIndex > queryHistory.length - 1 ) ){
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
//			alert( "queryHistory.length:"+queryHistory.length+"/historyIndex:"+historyIndex );
		}
		//處理上下頁功能顯示
		if ( gobi("arrow_his_last") != null ){
			gobi("arrow_his_last").style.color = ( historyIndex == 0 ) ? "#000000" : "#FFFFFF";
			gobi("arrow_his_last").style.cursor = ( historyIndex == 0 ) ? "auto" : "pointer";
		}
		if ( gobi("arrow_his_next") != null ){
			gobi("arrow_his_next").style.color = ( historyIndex == ( queryHistory.length - 1 ) ) ? "#000000" : "#FFFFFF";
			gobi("arrow_his_next").style.cursor = ( historyIndex == ( queryHistory.length - 1 ) ) ? "auto" : "pointer";
		}

		//記錄到歷史紀錄(不重覆記錄相同卡牌)
		for ( var i = 0 ; i < setDatas.set.length ; i++ ){
			if ( setDatas.set[i].setCode == queryHistorySetCode ){
				for ( var c = 0 ; c < setDatas.map[i].length ; c++ ){
					if ( (setDatas.map[i])[c].name == cardName ){
						if ( isRD() ){
							(setDatas.map[i])[c].count++;
						}
						return;
					}
				}
				setDatas.map[i].insert( 0 , { name : cardName, count : isRD() ? 1 : null, } );
				break;
			}
		}
	}
	
	//上下頁操作
	function goLastNext( isLast ){
		if ( historyIndex == 0 && isLast ){
			return;
		} else if ( historyIndex > queryHistory.length - 1 && !isLast ){
			return;
		} else {
			historyIndex += ( isLast ? -1 : 1 );
			var hisObj = queryHistory[ historyIndex ];
			lastSelectedCardName = hisObj.qCardName;
			lastSelectedSetCode = hisObj.qSetCode;
			lastSelectedAAIndex = hisObj.qSetAA;
			openDataBlock();
		}
	}
	
	//開啟歷史紀錄
	function showQueryHistory(){
		limitsReset();
		lastSelectedSetCode = queryHistorySetCode;
		query();
		/*
		setSelectValue( "setCode" , "" );		
		setCodeSelector.onchange();
		if ( isRD() ){
			lastSelectedSetCode = queryHistorySetCode;
		}
		*/
		limitsReset();
	}
	
	//取得卡牌SRC
	//http://duelmasters.wikia.com/wiki
	function getImgSrc( dmCard ){
		if ( dmCard == null || dmCard == "" ){
			return "./noPic.png";
		} else if ( dmCard.indexOf( "http" ) == 0 || dmCard.indexOf( "https" ) == 0 || dmCard.indexOf( "\./" ) == 0 ){			
			return dmCard;
		} else if ( dmCard.match( /\w\/\w{2}\/[\w\-\(\)%]+/ ) ){
			return "http://vignette.wikia.nocookie.net/duelmasters/images/" + dmCard + ".jpg/revision/latest/scale-to-width-down/450";
		} else {
			return "http://gathe.jp/" + dmCard + ".jpg";	
		}
	}
	
	//設定圖片大小
	function setPicObjSize( imgObj , picTargetObjId , picWidth , picHeight , openTitle ){

		var widthPercent = 0;
		if ( picWidth != null ){
			widthPercent = parseInt( picWidth ) / parseInt( imgObj.width );
		}
		var heightPercent = 0;
		if ( picHeight != null ){
			heightPercent = parseInt( picHeight ) / parseInt( imgObj.height );
		}
		var whPercent = Math.max( 0.01 , widthPercent , heightPercent );
		var picObj = gobi( picTargetObjId );
		
		if ( picWidth != null ){
			picObj.width = ( parseInt( imgObj.width ) * whPercent );
		}
		if ( picHeight != null ){
			picObj.height = ( parseInt( imgObj.height ) * whPercent );
		}
		picObj.style.display = 'block';
		picObj.style.cursor = 'pointer';
		picObj.onclick = function(){
//			window.open(this.src,"_blank");
			w = window.open();
			if ( openTitle != null ){
				w.document.write( "<head><title>" + openTitle + "</title></head>" );
			}
			w.document.write( "<body width='"+this.width+"' height='"+this.height+"'>" );
			w.document.write( "<img src='"+this.src+"' onclick='window.close();' style='cursor:pointer;'>" );
			w.document.write( "</body>" );
		};
	}
	
	//自gathe.jp/wikia取得卡圖
	function getImgFromOutSite( dmCardData , width , height , index ){
		
		var dmCard = dmCardData.pic;
		var isBackReadData = false;
		if ( dmCard == "" ){
			var backReadData = cardDatas.getDataByName( dmCardData.name );
			if ( backReadData != null ){
				dmCard = backReadData.pic;
				isBackReadData = true;
			}
		}
		var img = document.createElement('img');
		img.src = getImgSrc( dmCard );		
		img.id = picIdHeader + index;

		var pic = new Image();
		pic.src = img.src;
		if ( index != null ){
			img.style.display = 'none';
			if ( isBackReadData ){
				img.style.opacity = '0.5';
//				img.style.position = "absolute";
			}
			//圖片讀取完成之後，進行大小調整
			pic.onload = (function(){
				var picTargetObjId = img.id;				
				var picWidth = width;
				var picHeight = height;
				var openTitle = dmCardData.name + ( dmCardData.id != null ? "( " + dmCardData.id + " )" : "" );
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
		var noPic = null;
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
	}
	
	//取得過濾、排序後的資料列表
	function getSortList( sort , desc , twsd ){

		var sortCardDatas = [];
		var sortCardExDatas = [];
		
		if ( desc == null )
			desc = false;
			
		//過濾種族
//		var raceLimits = [ gobi( "race" ).value , gobi( "race2" ).value ];
		var raceLimits = getValuesByName( "filter_race" );
		//過濾種族是否完全指定
//		var raceAbsoluteCheckeds = [ gobi( "absoluteRace" ).checked, gobi( "absoluteRace2" ).checked ];
		var raceAbsoluteCheckeds = getCheckedByName( "filter_absoluteRace" );
		//卡種
		var ctValues = getCheckboxValues( "cardType" );
		//雙極與否
		var wValue = getSelectedByName('wType');
		//允許文明
//		var allowCivilValues = getCheckboxValues( "allowCivil" );
		var allowCivilValues = [];
		var allowCivilBtns = gosbn("allowCivil");
		for ( var a = 0 ; a < allowCivilBtns.length ; a++ ){
			if ( allowCivilBtns[a].getAttribute("class") == "btnClick" ){
				allowCivilValues.push( parseInt( allowCivilBtns[a].getAttribute("civil") ) );
			}
		}
		//允許文明總值
		var allowCivilTotal = 0;
		for ( var cvs = 0 ; cvs < allowCivilValues.length ; cvs++ ){
			allowCivilTotal += parseInt( allowCivilValues[cvs] );
		}
		//單多色卡
		var allowTypeValus = "";
		var atBtns = gosbn("allowType");
		for ( var a = 0 ; a < atBtns.length ; a++ ){
			if ( atBtns[a].getAttribute("class") == "btnClick" ){
				allowTypeValus += atBtns[a].getAttribute("allowType");
			}
		}
		//必須文明
//		var civilValues = getCheckboxValues( "civil" );
		var civilValues = [];
		var civilBtns = gosbn("civil");
		for ( var a = 0 ; a < civilBtns.length ; a++ ){
			if ( civilBtns[a].getAttribute("class") == "btnClick" ){
				civilValues.push( parseInt( civilBtns[a].getAttribute("civil") ) );
			}
		}
		//必須文明總值
		var civilTotal = 0;
		for ( var cvs = 0 ; cvs < civilValues.length ; cvs++ ){
			civilTotal += parseInt( civilValues[cvs] );
		}
		//必須文明類型
		var civilType = "";
		var civilTypeBtns = gosbn("civilType");
		for ( var a = 0 ; a < civilTypeBtns.length ; a++ ){
			if ( civilTypeBtns[a].getAttribute("class") == "btnClick" ){
				civilType = civilTypeBtns[a].getAttribute("allowType");
			}
		}
		
		var soulValues = getCheckboxValues( "soul" );
		var detailFilter = "－" == gobi("filter_plus").innerText;
		var costValue = gobi( "cost" ).value;
		var costValue2 = gobi( "cost2" ).value;
		var powerValue = gobi( "power" ).value;
		var powerValue2 = gobi( "power2" ).value;
		var cardNameValue = gobi( "cardName" ).value.toUpperCase();
		for ( var cvs = 0 ; cvs < civilValues.length ; cvs++ ){
			civilValues[cvs] = parseInt( civilValues[cvs] );
		}
		//指定能力關鍵字
		/*
		var abFilterObjs = gosbn( "abilities" );
		var abilitiesValues = [];		
		for ( var abs = 0 ; abs < abFilterObjs.length ; abs++ ){
			abilitiesValues.push( abFilterObjs[abs].value );
		}
		*/
		var abilitiesValues = getValuesByName( "abilities" );
		//指定種族關鍵字
		var abilitiesRaceValues = gobi("ab_race").value;
		//指定卡名關鍵字
		var abilitiesNameValues = gobi("ab_name").value;
		//為求便利，將種族關鍵字跟卡名關鍵字放進能力關鍵字值陣列末
		/*
		if ( abilitiesValues == null ){
			abilitiesValues = [ abilitiesRaceValues ];
		} else {
			abilitiesValues.push( abilitiesRaceValues );
		}
		*/
		abilitiesValues.push( abilitiesRaceValues );
		abilitiesValues.push( abilitiesNameValues );
		//稀有度
		var rarilityValues = getCheckboxValues( "rarility" );
		//沒選等同於全選
		if ( rarilityValues.length == gosbn("rarility").length ){
			rarilityValues = [];
		}
		
		//如果有指定SET的話，就只查那個SET的內容
		var baseList = cardDatas.getList( lastSelectedSetCode );
		//過濾台灣環境
		if ( twsd ){
			var tempList = [];
			for ( var bl = 0 ; bl < baseList.length ; bl++ ){
				if ( twsdCards.include( baseList[bl].name ) ){
					tempList.push( baseList[bl] );
				}
			}
			baseList = tempList;
		}
		//如果沒有指定SET的話，就依照卡名進行排序
		if ( lastSelectedSetCode == null || lastSelectedSetCode == "" ){
			/*
			var turnList = [];
			for ( var index = baseList.length - 1 ; index >= 0 ; index-- ){
				turnList.push( baseList[index] );
			}
			baseList = turnList;
			*/
			baseList.sort(function (a, b) {
			  if (a.name > b.name) {
				return 1;
			  }
			  if (a.name < b.name) {
				return -1;
			  }
			  // a must be equal to b
			  return 0;
			});
		}
		for ( var index = 0 ; index < baseList.length ; index++ ){
			var theCard = baseList[index];
			var insertDatas = [];
			if ( theCard.wData == null ){
				insertDatas.push( cardDatas.getSelectedCardByUdIndex( theCard ) );
			} else {
				for ( var udIndex = 0 ; udIndex < theCard.wData.length ; udIndex++ ){
					insertDatas.push( cardDatas.getSelectedCardByUdIndex( theCard, udIndex ) );
				}
			}
			for ( var udIndex = 0 ; udIndex < insertDatas.length ; udIndex++ ){
				var insertData = insertDatas[udIndex];
				var idCivil = insertData.civil;
				//過濾卡牌時，雙極卡的文明由上下兩者合計
				if ( insertData.ws != null ){
					idCivil = cardDatas.getDataByName( insertData.name, null, null, 0 ).civil | cardDatas.getDataByName( insertData.name, null, null, 1 ).civil;
				}
				var insertIndex = 0;
				//判斷過濾條件
				//A.文明
				//A-1.許可文明
				if ( ( allowCivilTotal & idCivil ) != idCivil ){
	//				alert(insertData.name);
					continue;
				}
				//A-1.1非多色
//				var allowType = getRadioValue("allowType");
				if ( allowTypeValus == "S" ){
					//無色不影響單／多色判斷
					if ( !singleColors.include( idCivil > 32 ? idCivil % 32 : idCivil ) ){
						continue;
					}
				//A-1.2多色
				} else if ( allowTypeValus == "M" ){
					//無色不影響單／多色判斷
					if ( singleColors.include( idCivil > 32 ? idCivil % 32 : idCivil ) ){
						continue;
					}
				//A-1.3不指定
				} else {
				}
				//A-2.必須文明
				if ( civilTotal > 0 ){
					//A-2.1全數符合
					if ( civilType == 'A' ){
						if ( ( civilTotal | idCivil ) != idCivil ){
							continue;
						}
					//A-2.2部分符合
					} else if ( civilType == 'O' ){
						if ( ( civilTotal & idCivil ) == 0 ){
							continue;
						}
					}
				}
				//B.種族
				var isErrorRace = false;
				for ( var r = 0 ; r < raceLimits.length ; r++ ){
					var rValue = raceLimits[r];
					if ( rValue != "" ){
						if ( insertData.race == null ){
							isErrorRace = true;
							break;
						}
						if ( raceAbsoluteCheckeds[r] ){
							if ( !insertData.race.include( rValue ) ){
								isErrorRace = true;
								break;
							}
						} else {
							if ( !insertData.race.includeLike( rValue ) ){
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
				if ( !gobi("skipType").checked ){
					var typeMatched = false;
					for ( var v = 0 ; v < insertData.type.length ; v++ ){
						if ( ctValues.include( insertData.type[v] ) ){
							typeMatched = true;
							break;
						}
					}
					if ( !typeMatched ){
						continue;
					}
				}
				/*
				if ( !ctValues.include( insertData.type ) ){
					continue;
				}
				*/
				//C-2.雙極
				if ( wValue == 'W' && insertData.ws == null ){
					continue;
				}
				if ( wValue == 'NW' && insertData.ws != null ){
					continue;
				}
				//D.Cost
				/*
				if ( costValue != "" ){
					if ( insertData.cost == null )
						continue;
					var costCValue = gobi( "cost_calc" ).value;
					if ( costCValue == "e" && insertData.cost != costValue )
						continue;
					else if ( costCValue == "m" && insertData.cost <= costValue )
						continue;
					else if ( costCValue == "em" && insertData.cost < costValue )
						continue;
					else if ( costCValue == "l" && insertData.cost >= costValue )
						continue;
					else if ( costCValue == "el" && insertData.cost > costValue )
						continue;
				}
				*/
				if ( costValue != "" || costValue2 != "" ){
					if ( insertData.cost == null )
						continue;
					if ( !detailFilter ){
						if ( costValue != "" && insertData.cost != costValue )
							continue;
					} else {
						if ( costValue != "" && insertData.cost < costValue )
							continue;
						if ( costValue2 != "" && insertData.cost > costValue2 )
							continue;
					}
				}
				//E.Power
				if ( powerValue != "" || powerValue2 != "" ){
					/*
					if ( insertData.power != null ){
						var powerCValue = gobi( "power_calc" ).value;
						if ( powerCValue == "e" && insertData.power != powerValue )
							continue;
						else if ( powerCValue == "m" && insertData.power <= powerValue )
							continue;
						else if ( powerCValue == "em" && insertData.power < powerValue )
							continue;
						else if ( powerCValue == "l" && insertData.power >= powerValue )
							continue;
						else if ( powerCValue == "el" && insertData.power > powerValue )
							continue;
					} else {
						continue;
					}
					*/
					if ( insertData.power == null )
						continue;
					if ( !detailFilter ){
						if ( powerValue != "" && insertData.power != powerValue )
							continue;
					} else {
						if ( powerValue != "" && insertData.power < powerValue )
							continue;
						if ( powerValue2 != "" && insertData.power > powerValue2 )
							continue;
					}
				}
				//F.Name
				if ( cardNameValue != "" && 
					( insertData.name.replace(/[ 　]/g,"").toUpperCase().indexOf( cardNameValue.replace(/[ 　]/g,"") ) == -1 && 
						clearSubName( insertData.name.replace(/[ 　]/g,"") ).toUpperCase().indexOf( cardNameValue.replace(/[ 　]/g,"") ) == -1 ) ){
					continue;
				}
				//G.Soul
				if ( soulValues != null && soulValues.length > 0 ){
					if ( insertData.soul == null || insertData.soul.length == 0 ){
						continue;
					} else {
						var hasAllSoul = true;
						for ( var s = 0 ; s < soulValues.length ; s++ ){
							if ( !insertData.soul.include( soulValues[s] ) ){
								hasAllSoul = false;
								break;
							}
						}
						if ( !hasAllSoul ){
							continue;
						}
					}
				}
				//H.能力
				var absAllow = true;
				for ( var abs = 0 ; abs < abilitiesValues.length ; abs++ ){
					//最後一個是過濾值是種族，而非能力
					var isKW = ( abs < ( abilitiesValues.length - 2 ) );
					var isRC = ( abs == abilitiesValues.length - 2 );
					var isCN = ( abs == abilitiesValues.length - 1 );
					var abilitiesValue = abilitiesValues[abs];
					if ( abilitiesValue != "" ){
					
						var hasKeyWordAbility = true;
						//如果是無能力卡牌
						if ( isKW && abilitiesValue == "empty" ){
							//如果無能力、或是能力數量為0的話就通過
							if ( insertData.sp == null || insertData.sp.length == 0 ){
							//否則就用"沒有書寫任何能力"去做搜尋
							} else {
								var hasKeyWordAbility = false;
								for ( var ai = 0 ; ai < insertData.sp.length ; ai++ ){
									if ( insertData.sp[ai].indexOf( "沒有書寫任何能力" ) != -1 ){
										hasKeyWordAbility = true;
										break;
									}
								}
								//條件不符，踢掉
								if ( !hasKeyWordAbility ){
									absAllow = false;
								}
							}
						//搜尋目標不是無能力卡牌的話
						} else {
						
							//能力設定有問題，打掉
							if ( insertData.sp == null ){
								absAllow = false;
							} else {
							
								var hasKeyWordAbility = false;
								for ( var ai = 0 ; ai < insertData.sp.length ; ai++ ){
									//先判斷能力裡面有沒有關鍵字，有再往下做以節省時間
									if ( insertData.sp[ai].indexOf( abilitiesValue ) == -1 ){
										continue;
									}
									//將能力轉成TAG
									var parseTags = keyWords.transTags( insertData.sp[ai] );
									if ( parseTags != null ){
										for ( var t = 0 ; t < parseTags.length ; t++ ){
											//要有getAttribute
											if ( parseTags[t].getAttribute == null )
												continue;
											var sTagType = parseTags[t].getAttribute( "sTagType" );
											if ( isKW && ( sTagType != "K" ) )
												continue;
											if ( isRC && ( sTagType != "R" ) )
												continue;
											if ( isCN && ( sTagType != "N" ) )
												continue;
											//只允許能力TAG
	//										if ( parseTags[t].getAttribute != null && ( parseTags[t].getAttribute( "sTagType" ) == "K" ) ){
												if ( parseTags[t].getAttribute("keyJap").indexOf( abilitiesValue ) != -1 ){
													hasKeyWordAbility = true;
													break;
												}
	//										}
										}
									}							
								}
							}
						}
						//關鍵字不符，查詢spTagExtends
						if ( !hasKeyWordAbility && insertData.spTagExtends != null ){
							if ( insertData.spTagExtends.include( abilitiesValue )  ){
								hasKeyWordAbility = true;
							}
						}
						//能力標籤跟關鍵字都不符就踢掉
						if ( !hasKeyWordAbility ){
							absAllow = false;
						}
					}
				}	
				if ( !absAllow ){
					continue;
				}
				//I.稀有度
				if ( rarilityValues.length > 0 ){
					var isInRarility = false;
					for ( var m = 0 ; m < setDatas.map.length && !isInRarility ; m++ ){
						for ( var dl = 0 ; dl < setDatas.map[m].length && !isInRarility ; dl++ ){
							var cdDataInSet = (setDatas.map[m])[dl];
							if ( cdDataInSet.name == insertData.name ){
								var ir = ( cdDataInSet.rarity instanceof Array ) ? cdDataInSet.rarity : [ cdDataInSet.rarity ];
								for ( var rs = 0 ; rs < ir.length && !isInRarility ; rs++ ){
									if ( rarilityValues.include( ir[rs] ) ){
										isInRarility = true;
										continue;
									}
								}
							}
						}
					}
					if ( !isInRarility ){
						continue;
					}
				}
				if ( sort == "" ){
					sort = null;
				}
				
				//判斷排序位置
				if ( sort != null ){
					for ( var i = 0 ; i < sortCardDatas.length ; i++ ){
						var insertSortValue = eval("insertData."+sort);
						if ( insertSortValue == null )
							insertSortValue = "";
						var saveSortValue = eval("sortCardDatas[i]."+sort);
						if ( saveSortValue == null )
							saveSortValue = "";
						if ( !desc &&  insertSortValue >= saveSortValue ){
							insertIndex++;
						} else if ( desc && insertSortValue <= saveSortValue ){
							insertIndex++;
						} else {
							break;
						}
					}
					if ( insertIndex != -1 ){
//						sortCardDatas.insert( insertIndex , insertData );
						sortCardDatas.insert( insertIndex , theCard );
						udIndex = insertDatas.length;
					}
				} else {
					//如果沒有指定排序順序、又有指定牌庫的話，就把超次元牌庫的卡牌排到最下面
					var sd = setDatas.getSetDatas( lastSelectedSetCode );
					if ( sd != null && sd.isDeck ){
						if ( insertData.back != null ){
//							sortCardExDatas.push( insertData );
							sortCardExDatas.push( theCard );
							udIndex = insertDatas.length;
						} else {
//							sortCardDatas.push( insertData );
							sortCardDatas.push( theCard );
							udIndex = insertDatas.length;
						}
					//其他狀況就不考慮排序直接塞入資料
					} else {
//						sortCardDatas.push( insertData );
						sortCardDatas.push( theCard );
						udIndex = insertDatas.length;
					}
				}				
			}
		}
		//把超次元牌庫資料接在非超次元牌庫之後
		for ( var i = 0 ; i < sortCardExDatas.length ; i++ ){
			sortCardDatas.push( sortCardExDatas[i] );
		}
		//判斷最後顯示點選的卡片是否存在於新的查詢列表裡，沒有的話就要清除最後的卡片詳述
		var hadOldTarget = false;
		for ( var i = 0 ; i < sortCardDatas.length ; i++ )
			if ( sortCardDatas[i].name == lastSelectedCardName )
				hadOldTarget = true;
		if ( !hadOldTarget )
			lastSelectedCardName = null;
		openDataBlock();
		
		return sortCardDatas;
	}
	
	//開啟/關閉資料頁圖片
	function showDataPicture( isShowPicture ){
		gobi( "card_picture" ).style.display = ( isShowPicture ? "inline" : "none" );
		gobi( "card_picture_empty" ).style.display = ( !isShowPicture ? "inline" : "none" );
	}
	
	//takaratomy的文明卡圖根目錄
//	var takaraTomyPicRoot = "http://dm.takaratomy.co.jp/card/list/images/newstyle/";
	var takaraTomyPicRoot = "http://dm.takaratomy.co.jp/wp-content/themes/dm2014/images/";
	//開啟卡牌詳細資料
	function openDataBlock(){
	
		//用卡名去查詢資料
		var selectedCardDats = cardDatas.getDataByName( lastSelectedCardName , lastSelectedSetCode , lastSelectedAAIndex, lastSelectedUdIndex );

		//將詳細資料表格初始化並隱藏
		gobi( "cardDataBlock" ).style.display = "none";
		gobi( "card_name_header" ).style.background = "";
		clearChildren( gobi( "card_rarity" ) );
		clearChildren( gobi( "card_name" ) );
		clearChildren( gobi( "card_picture" ) );
		showDataPicture( false );
		clearChildren( gobi( "card_type" ) );
		clearChildren( gobi( "card_cost" ) );
		gobi( "tr_cost" ).style.display = "";
		clearChildren( gobi( "card_civil" ) );
		clearChildren( gobi( "card_race" ) );
		gobi( "tr_race" ).style.display = "";
		clearChildren( gobi( "card_soul" ) );
		gobi( "tr_soul" ).style.display = "";
		clearChildren( gobi( "card_power" ) );
		gobi( "tr_power" ).style.display = "";
		clearChildren( gobi( "card_abilities" ) );
		clearChildren( gobi( "card_mana" ) );
		gobi( "tr_mana" ).style.display = "";
		clearChildren( gobi( "card_back" ) );
		gobi( "tr_back" ).style.display = "";
		clearChildren( gobi( "card_flavor" ) );
		gobi( "tr_flavor" ).style.display = "";
		clearChildren( gobi( "card_sets" ) );
		gobi( "tr_ruten" ).style.display = "";
		gobi( "lastAAIndex" ).value = "";
		gobi( "nextAAIndex" ).value = "";
		if ( isVM() ){
			gobi( "tr_card_sanctuary" ).style.display = "";
		}
		clearChildren( gobi( "card_sanctuary" ) );

		//依是否有資料來進行處理
		if ( selectedCardDats != null ){
		
			//紀錄查詢歷史
			addHistory( lastSelectedCardName );
			
			//嵌入內容並顯示區塊
			gobi( "cardDataBlock" ).style.display = "block";
			//卡圖
			var t_w = 200;
			var t_h = null;
			var isHorizontal = true;
			for ( var t = 0 ; t < selectedCardDats.type.length ; t++ ){
				if ( !cardTypeMapping.getDataByValue( selectedCardDats.type[t] ).horizontal ){
					isHorizontal = false;
				}
			}
			if ( isHorizontal ){
//			if ( selectedCardDats.type.include("DHF") || selectedCardDats.type.include("D2F") || selectedCardDats.type.include("DF") || selectedCardDats.type.include("DMF") || selectedCardDats.type.include("FFF") || selectedCardDats.type.include("FF") ||selectedCardDats.type.include("MF") || selectedCardDats.type.include("OA") || selectedCardDats.type.include("HF") ){
//			if ( selectedCardDats.type == "DHF" || selectedCardDats.type == "D2F" || selectedCardDats.type == "FFF" || selectedCardDats.type == "HF" ){
//				if ( !selectedCardDats.pic.match(  /\w\/\w{2}\/[\w\-]+/) ){
					t_w = null;
					t_h = 180;
//				}
			}
			var cardImages = getImgFromOutSite( selectedCardDats , t_w , t_h , "block" );
			for ( var cis = 0 ; cis < cardImages.length ; cis++ ){
				gobi( "card_picture" ).appendChild( cardImages[cis] );
			}
			//文明標頭圖
//			gobi( "card_name_header" ).style.backgroundImage = "url('"+takaraTomyPicRoot+civilMapping.getHeaderPicByValue( selectedCardDats.civil )+"')";
			gobi( "card_name_header" ).style.backgroundImage = civilMapping.getBackgroundCSS( selectedCardDats.civil );
			//卡名
			var showCardName = selectedCardDats.name;
			//如果有指定SET的話，則加上ID
			if ( lastSelectedSetCode != null && selectedCardDats.id != null ){
				showCardName += " ( " + selectedCardDats.id + " ) ";
			}
			var cardNameSpan = document.createElement('span');
			cardNameSpan.appendChild( document.createTextNode( showCardName ) );
			setNoTrans( cardNameSpan );
			gobi( "card_name" ).appendChild( cardNameSpan );
			gobi( "card_name" ).onclick = function(){
				/*
				//僅供電腦版使用
				if ( isMobile() ){
					alert( translateText( "很抱歉，DMVault聯結功能不開放給行動裝置使用", isTC2C ) );
				} else {
					getDMVaultLink( selectedCardDats.name , 1 );
				}
				*/
				window.open("https://dm.takaratomy.co.jp/card/?v=%7B%22suggest%22:%22on%22,%22keyword%22:%22"+selectedCardDats.name+"%22,%22keyword_type%22:%5B%22card_name%22%5D,%22culture_cond%22:%5B%22%E5%8D%98%E8%89%B2%22,%22%E5%A4%9A%E8%89%B2%22%5D,%22pagenum%22:%221%22,%22samename%22:%22show%22,%22sort%22:%22release_new%22%7D","_blank");
//				window.open( "https://www.google.com/search?q="+showCardName+"&sourceid=chrome&ie=UTF-8" , "_blank" );
			};
			//電腦版追加DMVault的牌庫、評價、FAQ、Combo、Link、拍賣
			if ( !isMobile() ){
				var dvSpanObjs = gosbcn("dvLinkCSS");
				for ( var i = 0 ; i < dvSpanObjs.length ; i++ ){
					dvSpanObjs[i].onclick = (function(){
						var linkType = i + 1;
						return function(){
							getDMVaultLink( selectedCardDats.name , linkType );
						};
					})();
				}
			}
			//如果有稀有度的話就加上去
			if ( selectedCardDats.rarity != null && selectedCardDats.rarity != "" ){
				var card_rarity_TD = gobi( "card_rarity" );
				var rarityPics = rarityPic.getRarityPicture( selectedCardDats.rarity );
				for ( var i = 0 ; i < rarityPics.length ; i++ ){
					card_rarity_TD.appendChild( rarityPics[i] );
				}
			}
			//殿堂
			var sanc = -1;
			var sancChi = "";
			var sancTitle = "";
			var queryName = null;
			var scIndex = -1;
			if ( sanctuary.sanctuary1.include( selectedCardDats.name ) ){
				sanc = 1;
				sancChi = "殿堂";
				sancTitle = "此卡只能放一張在牌庫裡";
			} else if ( sanctuary.sanctuary0.include( selectedCardDats.name ) ){
				sanc = 0;
				sancChi = "白金殿堂";
				sancTitle = "此卡不能放在牌庫裡";
			} else if ( ( scIndex = sanctuary.getSanctuaryCIndex( selectedCardDats.name ) ) != -1 ){
				sanc = 4;
				sancChi = "組合殿堂";
				var partnerIndex = scIndex + ( scIndex % 2 == 0 ? 1 : -1 );
				queryName = sanctuary.sanctuaryC[partnerIndex];
				if ( nameCategory.isCategory( queryName ) ){
					sancTitle = "此卡不能跟名中有《" + queryName + "》的卡一起放在牌庫裡";
				} else {
					sancTitle = "此卡不能跟《" + queryName + "》一起放在牌庫裡";
				}
			}
			if ( sanc != -1 ){
				var sanctuarySpan = document.createElement('span');
				sanctuarySpan.appendChild( document.createTextNode( "★" + sancChi ) );
				sanctuarySpan.title = sancTitle;
				sanctuarySpan.style.cursor = "pointer";
				if ( sanc == 4 ){
					sanctuarySpan.style.textDecoration = "underline";
					sanctuarySpan.onclick = (function(){
						var cardName = queryName;
						return function(){
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
				gobi( "card_sanctuary" ).appendChild( sanctuarySpan );
			} else {
				if ( isVM() ){
					gobi( "tr_card_sanctuary" ).style.display = "none";
				}
			}
			//種類
			var cws = selectedCardDats.ws == null ? [ selectedCardDats.type ] : selectedCardDats.ws;
			for ( var w = 0 ; w < cws.length ; w++ ){
				if ( w > 0 ){
					gobi( "card_type" ).appendChild( document.createTextNode( " / " ) );
				}
				var nameSpan = document.createElement('span');
				nameSpan.setAttribute("name", "nameSpan");
				var typeText = "";
				for ( var wt = 0 ; wt < cws[w].length ; wt++ ){
					if ( wt > 0 ){
						typeText += "/";
					}
					typeText += cardTypeMapping.getTextByValue( cws[w][wt] )
				}
				nameSpan.appendChild( document.createTextNode( typeText ) );
				var lsui = lastSelectedUdIndex == null ? 0 : lastSelectedUdIndex;
				if ( lsui != w ){
					nameSpan.style.cursor = 'pointer';
					nameSpan.style.color = "blue";
					nameSpan.style.textDecoration = "underline";
					nameSpan.onclick = (function(){
						var selectedUdIndex = w;
						return function(){
							lastSelectedUdIndex = selectedUdIndex;
							openDataBlock();
							changeListCSS();
						};
					})();
				}
				gobi( "card_type" ).appendChild( nameSpan );
			}
			//費用
			if ( selectedCardDats.cost != null ){
				gobi( "card_cost" ).appendChild( document.createTextNode( ( selectedCardDats.cost == Number.MAX_SAFE_INTEGER ? "∞" : selectedCardDats.cost ) ) );
			} else {
				gobi( "tr_cost" ).style.display = "none";
			}
			//文明
			gobi( "card_civil" ).appendChild( document.createTextNode( civilMapping.getTextByValue( selectedCardDats.civil ) ) );
			//種族
			if ( selectedCardDats.race == null ){
				gobi( "tr_race" ).style.display = "none";
			} else {
				for ( var i = 0 ; i < selectedCardDats.race.length ; i++ ){
					if ( i > 0 ){
						//四種族以內用<BR>、超過就用"/"
						gobi( "card_race" ).appendChild( 
							selectedCardDats.race.length <= 4 ? 
								document.createElement('br') :
								document.createTextNode( " / " )
						);
					}
					var raceSpan = document.createElement('span');
					raceSpan.appendChild( document.createTextNode( selectedCardDats.race[i] ) );
					raceSpan.style.cursor = "pointer";
					raceSpan.style.color = "blue";
					var raceObject = raceMapping.getDataByJap( selectedCardDats.race[i] );
					if ( raceObject != null ){
						raceSpan.setAttribute( "title" , raceObject.Chi + " / " + raceObject.Eng );
						setTitleAlert( raceSpan );
					}
					gobi( "card_race" ).appendChild( raceSpan );
				}
			}
			//魂
			if ( selectedCardDats.soul == null ){
				gobi( "tr_soul" ).style.display = "none";
			} else {
				for ( var i = 0 ; i < selectedCardDats.soul.length ; i++ ){
					var soul = soulMapping.getDataByCode( selectedCardDats.soul[i] );
					if ( i > 0 ){
						gobi( "card_soul" ).appendChild( document.createTextNode( " / " ) );
					}
					var soulSpan = document.createElement('span');
					soulSpan.appendChild( document.createTextNode( soul.Jap ) );
					soulSpan.style.cursor = "pointer";
					soulSpan.style.color = "blue";
					soulSpan.setAttribute( "title" , soul.Chi + " / " + soul.Eng );
					setTitleAlert( soulSpan );
					gobi( "card_soul" ).appendChild( soulSpan );
				}
			}
			//攻擊力
			if ( selectedCardDats.power == null ){
				gobi( "tr_power" ).style.display = "none";
			} else {
				var power = "";
				if ( selectedCardDats.pc != null && selectedCardDats.type == "OA" ){
					power += ( selectedCardDats.pc ? "+" : "-" );
				}
				power += "" + ( selectedCardDats.power == Number.MAX_SAFE_INTEGER ? "∞" : selectedCardDats.power );
				if ( selectedCardDats.pc != null && selectedCardDats.type != "OA" ){
					power += ( selectedCardDats.pc ? "+" : "-" );
				}
				gobi( "card_power" ).appendChild( document.createTextNode( power ) );
			}
			//特殊能力
			var isHK = gobi("HK").checked;
			var caObj = gobi( "card_abilities" );
			if ( selectedCardDats.sp == null || selectedCardDats.sp.length == 0 ){
				caObj.appendChild( document.createTextNode( "　" ) );
			} else {
				for ( var i = 0 ; i < selectedCardDats.sp.length ; i++ ){
					var isHint = selectedCardDats.sp[i].indexOf( abilitiesHintHeader ) == 0;
					var spLinesStr = selectedCardDats.sp[i];
					if ( isHint ){
						spLinesStr = "( " + spLinesStr.substring( abilitiesHintHeader.length ) + " )";
					}
					var spLines = spLinesStr.split("##");
					var ulBlock = document.createElement('ul');
					ulBlock.style.margin = "0px";
					for ( var spl = 0 ; spl < spLines.length ; spl++ ){
						var abis = ( spl == 0 && !isHint ? "■" : "" ) + spLines[spl];
						if ( isHK ){
							abis = transHK_MathWords( abis );
						}
						var singleAbilityParts = transAbilitiesTags( abis );
						if ( spl == 0 ){
							for ( var sbp = 0 ; sbp < singleAbilityParts.length ; sbp++ ){
								caObj.appendChild( singleAbilityParts[sbp] );
							}
						} else {
							var subLine = document.createElement('li');
							for ( var sbp = 0 ; sbp < singleAbilityParts.length ; sbp++ ){
								subLine.appendChild( singleAbilityParts[sbp] );
							}
							ulBlock.appendChild( subLine );
						}
						if ( i < selectedCardDats.sp.length - 1 && spLines.length == 1 ){
							gobi( "card_abilities" ).appendChild( document.createElement('br') );
						}
					}
					if ( spLines.length > 1 ){
						caObj.appendChild( ulBlock );
					}
				}
			}
			//魔力支付
			if ( selectedCardDats.mana == null ){
				gobi( "tr_mana" ).style.display = "none";
			} else {
				gobi( "card_mana" ).appendChild( document.createTextNode( selectedCardDats.mana) );
			}
			//翻面
//			if ( [ "PC","SPC","EPC","DHC","DHW","DHF","SI","SC" ].include( selectedCardDats.type ) && selectedCardDats.back != null ){
			if ( selectedCardDats.back != null ){
				
				var card_back = gobi( "card_back" );
				var backNames = ( selectedCardDats.back instanceof Array ) ? selectedCardDats.back : [ selectedCardDats.back ];
				for ( var i = 0 ; i < backNames.length ; i++ ){
					if ( i > 0 ){
						card_back.appendChild( document.createElement('br') );
					}
					var backSpan = document.createElement('span');
					//卡名不作簡繁轉換
					setNoTrans( backSpan );
					backSpan.appendChild( document.createTextNode( clearSubName( backNames[i] ) ) );
					//判斷該卡是否存在
					if ( cardDatas.getDataByName( backNames[i] ) != null ){
						backSpan.style.cursor = "pointer";
						backSpan.style.color = "blue";
						backSpan.onclick = (function(){
							var backName = backNames[i];
							return function(){
								lastSelectedCardName = backName;
								openDataBlock();
								changeListCSS();
							};
						})();
					}
					card_back.appendChild( backSpan );
				}
				
			} else {
				gobi( "tr_back" ).style.display = "none";
			}			
			//敘述
			if ( selectedCardDats.flavor == null ){
				gobi( "tr_flavor" ).style.display = "none";
			} else {
				var cFlavor = gobi( "card_flavor" );
				var flavors = ( selectedCardDats.flavor instanceof Array ) ? selectedCardDats.flavor : [ selectedCardDats.flavor ];
				for ( var fs = 0 ; fs < flavors.length ; fs++ ){
					if ( fs > 0 ){
						cFlavor.appendChild( document.createElement('br') );
					}
					var singleFlavorParts = transAbilitiesTags( flavors[fs] );
					for ( var sfp = 0 ; sfp < singleFlavorParts.length ; sfp++ ){
						cFlavor.appendChild( singleFlavorParts[sfp] );
					}
				}
			}
			//同彈他繪與ID
			gobi( 'card_picture_aa' ).style.display = 'none';
			gobi( 'lastAATd' ).style.display = 'none';
			gobi( 'nextAATd' ).style.display = 'none';
			var hasLeft = false;
			var hasRight = false;
			if ( selectedCardDats.lastAAIndex != null || selectedCardDats.nextAAIndex != null ){
				gobi( 'card_picture_aa' ).style.display = 'inline';
				//異動版本說明
				gobi( 'aaIndexHint' ).innerText = ( parseInt( lastSelectedAAIndex == null ? 0 : lastSelectedAAIndex ) + 1 ) + " / " + selectedCardDats.idSize;
				//網頁版才處理">>""<<"
				if ( selectedCardDats.lastAAIndex != null ){
					if ( !isVM() )
						gobi( 'lastAATd' ).style.display = 'inline';
					gobi( 'lastAAIndex' ).value = selectedCardDats.lastAAIndex;
					hasLeft = true;
				}
				if ( selectedCardDats.nextAAIndex != null ){
					if ( !isVM() )
						gobi( 'nextAATd' ).style.display = 'inline';
					gobi( 'nextAAIndex' ).value = selectedCardDats.nextAAIndex;
					hasRight = true;
				}
			}
			//處理功能箭頭(不含上下頁)
			processArrows( hasLeft , true , true , hasRight );
			//收錄
			var inSetTd = gobi( "card_sets" );
			for ( var s = 0 ; s < setDatas.set.length ; s++ ){
				var cardDataOfSet = setDatas.getCardDataInSet( setDatas.set[s].setCode , lastSelectedCardName );
				if ( cardDataOfSet != null && cardDataOfSet.id != null ){
					//換行
					if ( inSetTd.firstChild ){
						inSetTd.appendChild( document.createElement('br') );
					}
					//收錄
					var inSet = document.createElement('span');
					var inSetName = setDatas.set[s].setCode + " " + setDatas.set[s].setName;
					if ( setDatas.set[s].setCode == lastSelectedSetCode ){
						inSetName = "【" + inSetName + "】";
					} else {
						inSet.style.color = "blue";
						inSet.style.cursor = "pointer";
						inSet.style.textDecoration = "underline";
						inSet.onclick = (function(){
							var gotoId = ( cardDataOfSet.id instanceof Array ? cardDataOfSet.id[0] : cardDataOfSet.id );
							return function(){
								queryByCode( gotoId , false );
							}
						})();
					}
					inSet.appendChild( document.createTextNode( inSetName ) );
					inSetTd.appendChild( inSet );					
				}
			}
			//露天
			if ( lastSelectedSetCode != null && lastSelectedSetCode != '' && twsdSets.includes( lastSelectedSetCode ) ){
			} else {
				gobi( "tr_ruten" ).style.display = "none";
			}
			if ( isVM() && !inSetTd.firstChild ){
				inSetTd.appendChild( document.createTextNode("--") );
			}
		}
		//處理scrollBar
		if ( !isVM() ){
			autoHeight( gobi("card_data_rPart") );
		}
		//簡體化
		if ( isTC2C ){
			translatePage();
		}
	}
	
	//如果是行動裝置的話，就增加alert( this.title )的功能
	function setTitleAlert( obj ){
//		if ( isMobile() && ( obj.onclick == null ) && ( obj.title != null ) ){
		if ( ( obj.onclick == null ) && ( obj.title != null ) ){
			obj.onclick = function(){
				alert( translateText( this.title, isTC2C ) );
			}
		}
	}
	
	//自動調整物件高度(縮小)
	function autoHeight( obj ){
		if ( obj != null ){
			//先把高度設定移除
			obj.style.height = null;
			//如果會產生scrollbar的話再來計算高度設定
			if ( isHasScrollY() ){
				var initHeight = 1600;
				obj.style.height = initHeight + 'px';
				initHeight -= ( document.documentElement.offsetHeight - document.documentElement.clientHeight );
				if ( initHeight < 100 ){
					initHeight = 100;
				}
				obj.style.height = initHeight + 'px';
			}
		}
	}
	
	//搜尋條件初始化
	function limitsReset(){
		changeSetCode( null );
		var formObj = gobi( "queryForm" );
		formObj.reset();
		var tyObjs = gosbn( "cardType" );
		for ( var i = 0 ; i < tyObjs.length ; i++ ){
			/*
			if ( tyObjs[i].parentElement.style.display != "none" ){
				tyObjs[i].checked = true;				
			} else {
				tyObjs[i].checked = false;
			}
//			tyObjs[i].checked = true;
			*/
			tyObjs[i].checked = false;
		}
		changeSetSetting( gobi( "setCode" ).value );
		//簡體化時，強制轉以上以下用詞
		if ( isTC2C || isHK ){
			gobi("HK").checked = true;
		}
		gosbn("rLan")[0].click();
		//文明過濾初始化
		var btns = gosbn("allowCivil");
		for ( var i = 0 ; i < btns.length ; i++ ){
			btns[i].setAttribute("class","btnClick");
		}
		btns = gosbn("allowType");
		for ( var i = 0 ; i < btns.length ; i++ ){
			btns[i].setAttribute("class","btnClick");
		}
		btns = gosbn("civil");
		for ( var i = 0 ; i < btns.length ; i++ ){
			btns[i].setAttribute("class","btnUnClick");
		}
		gosbn("civilType")[0].click();
		lastSelectedAAIndex = null;
	}
	
	//更改SET指定
	function changeSetSetting( value ){
		lastSelectedSetCode = value;
		if ( lastSelectedSetCode == "" )
			lastSelectedSetCode = null;
	}
	
	//進行卡名搜尋
	function queryByNameOnly( cardName , isXC ){
	
		limitsReset();
		gobi( "cardName" ).value = cardName;
		//判斷是不是要查放逐生物
		if ( isXC != null && isXC ){
			setCheckboxValue( "cardType" , [ "XC" , "EXC" ] );
		}
		var result = query();
		//如果找出來的卡只有一筆的話，就直接顯示資料
		if ( result == 1 ){
			gobi( "names" ).children[0].onclick();
		}
	}
	
	//設置物件長寬
	function calcPicSize( picId , width , height ){
		gobi( picId ).style.width = width;
		gobi( picId ).style.height = height;
	}
	
	//取得選項物件值
	function getRadioValue( radioName ){
		
		var radioObjs = gosbn( radioName );
		if ( radioObjs == null )
			return null;
		else{
			var returnValue = null;
			for ( var i = 0 ; i < radioObjs.length ; i++ ){
				if ( returnValue == null || radioObjs[i].checked ){
					returnValue = radioObjs[i].value;
				}
			}
		}
		return returnValue;
	}
	
	//取得勾選物件值(陣列)
	function getCheckboxValues( checkboxName ){
		var results = [];
		var cbObjs = gosbn( checkboxName );
		if ( cbObjs != null ){
			for ( var i = 0 ; i < cbObjs.length ; i++ ){
				if ( cbObjs[i].checked ){
					results.push( cbObjs[i].value );
				}
			}
		}
		return results;
	}
	
	//清除物件底下的所有子項目
	function clearChildren( parentObject ){
		if ( parentObject != null ){
			while ( parentObject.firstChild ) {
				parentObject.removeChild(parentObject.firstChild);
			}
		}
	}

	//將單一能力字串轉成DOM物件群
	function transAbilitiesTags( ability ){
		return keyWords.transTags( ability );
	}
	
	//變更能力選單語言
	function changeKeyWordLan(){
		var value = getRadioValue( "rLan" );
		var abSelectorObjs = gosbn( "abilities" );
		for ( var r = 0 ; r < abSelectorObjs.length ; r++ ){
			var abSelectorObj = abSelectorObjs[r];
			var lastSelectedAb = abSelectorObj.value;
			var sortNewOptions = [];
			for ( var i = 0 ; i < abSelectorObj.options.length ; i++ ){
				var japAb = abSelectorObj.options[i].value;
				var japAbObj = abilityMapping.getDataByJap( japAb );
				if ( japAbObj != null ){
					var abText = eval("japAbObj."+value);
					//如果要求簡體中文的話就進行翻譯
					if ( value == "Chi" ){
						abText = translateText( abText, isTC2C );
					}
					abSelectorObj.options[i].text = abText;
					
					//"全種族"跟"無能力"置頂，不加入排序
					if ( i > 1 ){
						var insertIndex = sortNewOptions.length;
						for ( var ii = 0 ; ii < sortNewOptions.length ; ii++ ){
							if ( abSelectorObj.options[i].text < sortNewOptions[ii].text ){
								insertIndex = ii;
								break;
							}
						}
						sortNewOptions.insert( insertIndex , abSelectorObj.options[i] );
					}
				}
			}
			//將"全種族"跟"無能力"置頂
			sortNewOptions.insert( 0 , abSelectorObj.options[0] );
			sortNewOptions.insert( 1 , abSelectorObj.options[1] );
			//清除下拉式選單之後重新加入option
			clearChildren( abSelectorObj );
			for ( var i = 0 ; i < sortNewOptions.length ; i++ ){
				abSelectorObj.appendChild( sortNewOptions[i] );
			}
			setSelectValue2( abSelectorObj , lastSelectedAb );
		}
	}
	
	//變更種族選單語言
	function changeRaceLan(){
		var value = getRadioValue( "rLan" );
//		var raceSelectorObjs = [ gobi( "race" ), gobi( "race2" ) ];
		var raceSelectorObjs = gosbcn( "raceSelector" );
		for ( var r = 0 ; r < raceSelectorObjs.length ; r++ ){
			var raceSelectorObj = raceSelectorObjs[r];
			var lastSelectedRace = raceSelectorObj.value;
			var sortNewOptions = [];
			for ( var i = 0 ; i < raceSelectorObj.options.length ; i++ ){
				var japRace = raceSelectorObj.options[i].value;
				var japRaceObj = raceMapping.getDataByJap( japRace );
				if ( japRaceObj != null ){
					var raceText = eval("japRaceObj."+value);
					var cateRaceHint = ( japRaceObj.isCategory ? " (類別種族)" : "" );
					//如果要求簡體中文的話就進行翻譯
					if ( value == "Chi" ){
						raceText = translateText( raceText, isTC2C );
					}
					cateRaceHint = translateText( cateRaceHint, isTC2C );
					raceSelectorObj.options[i].text = raceText + cateRaceHint;
					
					//"全種族"置頂，不加入排序
					if ( i > 0 ){
						var insertIndex = sortNewOptions.length;
						for ( var ii = 0 ; ii < sortNewOptions.length ; ii++ ){
							if ( raceSelectorObj.options[i].text < sortNewOptions[ii].text ){
								insertIndex = ii;
								break;
							}
						}
						sortNewOptions.insert( insertIndex , raceSelectorObj.options[i] );
					}
				}
			}
			//將"全種族"置頂
			sortNewOptions.insert( 0 , raceSelectorObj.options[0] );
			//清除下拉式選單之後重新加入option
			clearChildren( raceSelectorObj );
			for ( var i = 0 ; i < sortNewOptions.length ; i++ ){
				raceSelectorObj.appendChild( sortNewOptions[i] );
			}
			setSelectValue( raceSelectorObj.id , lastSelectedRace );
		}
	}
	
	//帶入radio物件值
	function setRadioValue( radioName , value ){
		if ( radioName == null || radioName == "" )
			return;
		var radioObjs = gosbn( radioName );
		for ( var i = 0 ; i < radioObjs.length ; i++ ){
			if ( radioObjs[i].value == value ){
				radioObjs[i].checked = true;
				break;
			}
		}
	}
	
	//帶入checkbox物件值
	function setCheckboxValue( ckName , values ){
		if ( ckName != null ){
			var ckObjs = gosbn( ckName );
			if ( values == null )
				values = [];
			for ( var i = 0 ; i < ckObjs.length ; i++ ){
				ckObjs[i].checked = values.include( ckObjs[i].value );
			}
		}
	}
	
	//帶入select物件值
	function setSelectValue( sName , value ){
		if ( sName == null || sName == "" )
			return;
		var selectObj = gobi( sName );
		if ( selectObj == null )
			return;
		for ( var i = 0 ; i < selectObj.options.length ; i++ ){
			if ( selectObj.options[i].value == value ){
				selectObj.options[i].selected = true;
				break;
			}
		}
	}
	
	//帶入select物件值
	function setSelectValue2( selectObj , value ){
		if ( selectObj == null )
			return;		
		for ( var i = 0 ; i < selectObj.options.length ; i++ ){
			if ( selectObj.options[i].value == value ){
				selectObj.options[i].selected = true;
				break;
			}
		}
	}
	
	//改變前後物件checked
	function checkedBrother( obj , isBefore ){
		if ( obj != null ){
			if ( isBefore && obj.previousSibling ){
				obj.previousSibling.checked = !obj.previousSibling.checked;
			}
			if ( !isBefore && obj.nextSibling ){
				obj.nextSibling.checked = !obj.nextSibling.checked;
			}
		}
	}

	//改變搜尋列表的CSS	
	function changeListCSS(){

		//切換至列表頁籤
		if ( !isVM() ){
			gobi("listBar").onclick();
		} else {
			switch( whichPage() ){
				//如果正在過濾頁的話，就跳去列表頁
				case 0 : gobi("listBar").onclick();		break;
				//如果正在列表頁的話，就跳回詳細頁
				case 1 : gobi("detailBar").onclick();	break;
				default:								break;
			}
		}
	
		var trs = document.getElementsByTagName( "tr" );
		var focusTrObject = null;
		var queryResultNames = [];
		for ( var i = 0 ; i < trs.length ; i++ ){
			var theTr = trs[i];
			if ( theTr.getAttribute( "tr_cardName" ) != null ){
				queryResultNames.push( theTr.getAttribute( "tr_cardName" ) );
				if ( theTr.getAttribute( "tr_cardName" ) == lastSelectedCardName ){
					theTr.style.fontWeight = "bold";
					theTr.style.color = "red";
					focusTrObject = theTr;
				} else {
					theTr.style.fontWeight = "normal";
					theTr.style.color = "black";
				}
			}
		}
		//處理↑↓的顯示與否
		var indexOfFocus = queryResultNames.indexOf( lastSelectedCardName );
		var showLastArrow = indexOfFocus > 0;
		var showNextArrow = indexOfFocus > -1 && indexOfFocus < queryResultNames.length - 1;
		processArrows( null , showLastArrow , showNextArrow , null );
		queryResultNames = null;
		
		//自動捲scroll
		autoScrollIfNotOnView( focusTrObject , gobi("listBlock") );
//		if ( focusTrObject != null ){
//			focusTrObject.scrollIntoView();
//		}
	}
	
	//取得物件畫面屬性
	function getWindowProperties( elem ){
		return window.getComputedStyle(elem, null);
	}
	
	//取得物件畫面高
	function getWindow_height( elem ){
		var heightPropertiesNums = getWindowProperties( elem ).height.match( /\d*/g );
		return heightPropertiesNums.length == 0 ? 0 : parseInt( heightPropertiesNums[0] );
	}
	
	//如果指定物件不在scroll可見範圍內，則自動拉捲軸拉到可見為止
	function autoScrollIfNotOnView( targetObject , scrollOwner ){
		if ( targetObject == null || scrollOwner == null )
			return;
		var trTop = targetObject.documentOffsetTop() - scrollOwner.documentOffsetTop();				//TR頂
		var trBottom = trTop + getWindow_height( targetObject );									//TR底
		var tableScrollTop = scrollOwner.scrollTop;													//Scroll頂
		var tableOffsetHeight = getWindow_height( scrollOwner );
		var tableScrollBottom = tableScrollTop + tableOffsetHeight;									//Scroll底
		if ( 
				( trTop - tableScrollTop > 0 ) && ( trTop - tableScrollTop < tableOffsetHeight ) &&
				( trBottom - tableScrollTop > 0 ) && ( trBottom - tableScrollTop < tableOffsetHeight ) ){
		} else {
			targetObject.scrollIntoView();
		}
	}
	
	//去除卡名注音
	function clearSubName( name ){
		var beforeIndex = -1;
		var endIndex = -1;
		while( ( beforeIndex = name.indexOf( "（" ) ) != -1 && ( endIndex = name.indexOf( "）" ) ) != -1 ){
			name = name.substring( 0 , beforeIndex ) + name.substring( endIndex + 1 );
		}
		return name;
	}
	
	//指定編號
	function queryByCode( code , doConfirmAndAlert ){
		if ( code == null && doConfirmAndAlert ){
			code = prompt( translateText( '請輸入卡片右下角的號碼，EX:[DMR13 6/110]。\n目前僅有收錄於「系列」當中的卡片可以以此方式找到資料', isTC2C ) );
		}
		if ( code == null || code.trim() == "" )
			return;
		code = code.toUpperCase().trim();
		var setCode = null;
		var cardName = null;
		var aaIndex = null;
		
		//判斷指定ID資料找到幾筆(因為該死的DMX19發生同ID不同卡的狀況，所以追加此變數
		var findTheCard = 0;
		for ( var m = 0 ; m < setDatas.map.length && setCode == null && cardName == null ; m++ ){

			for ( var c = 0 ; c < setDatas.map[m].length && setCode == null && cardName == null ; c++ ){
			
				if ( (setDatas.map[m])[c].id != null ){
				
					var isMultiID = (setDatas.map[m])[c].id instanceof Array;
					var ids = ( isMultiID ? (setDatas.map[m])[c].id : [ (setDatas.map[m])[c].id ] );
					for ( var i = 0 ; i < ids.length ; i++ ){
						if ( ids[i] != null && code.toUpperCase().replace(/[^A-Z0-9-/]/g,"") == ids[i].toUpperCase().replace(/[^A-Z0-9-/]/g,"") ){
							//如果這是第一次找到這個ID的話就把資料記起來
							if ( findTheCard++ == 0 ){
								setCode = setDatas.set[m].setCode;
								cardName = (setDatas.map[m])[c].name;
								if ( isMultiID ){
									aaIndex = i;
								}
							}
						}
					}
				
				}			
			}
		}

		var alertMsg = "";
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
		if ( alertMsg != "" ){
			alert( translateText( alertMsg, isTC2C ) );
		}
	}
	
	//選擇其他版本(MC、DC、SECRET...)
	function shiftAA( aaIndex ){
		lastSelectedAAIndex = aaIndex;
		openDataBlock();
	}
	
	//處理畫面上的方向鍵
	function processArrows( l , u , d , r ){
		var arrow_tf = new Array( l , u , d , r );
		var arrow_objs = [
			[ gobi("arrow_left") , gobi("arrow_last") , gobi("arrow_next") , gobi("arrow_right") ]
		];
		if ( !isVM() ){
			arrow_objs.push(
				[ gobi("arrow_left2") , gobi("arrow_last2") , gobi("arrow_next2") , gobi("arrow_right2") ]
			);
		}
		for ( var a = 0 ; a < arrow_objs.length ; a++ ){
			var arrow_obj = arrow_objs[a];
			for ( var i = 0 ; i < arrow_tf.length ; i++ ){
				if ( arrow_tf[i] != null ){
					if ( !isVM() ){
						arrow_obj[i].style.color = arrow_tf[i] ? "black" : "gray";
					} else {
						arrow_obj[i].style.color = arrow_tf[i] ? "#FFFFFF" : "#000000";
					}
					arrow_obj[i].style.cursor = arrow_tf[i] ? "pointer" : "auto";
				}
			}
		}
	}
	
	//按方向鍵時進行版本更換或換卡(主程式)
	function doKeybordFunction( keyCode ){
	
		switch( keyCode ){

			//←
			case 37 :
			//→
			case 39 :
					var isLeft = keyCode == 37;
					var shiftAAIndex = gobi( isLeft ? "lastAAIndex" : "nextAAIndex" ).value;
					if ( shiftAAIndex != null && shiftAAIndex != "" ){
						shiftAA( shiftAAIndex );
					//雙極切換
					} else {
						//lastSelectedUdIndex
						var nss = gosbn("nameSpan");
						var shiftUdIndex = lastSelectedUdIndex + ( isLeft ? -1 : 1 );
						nss[(shiftUdIndex+nss.length)%nss.length].click();
					}
					break;
			//↓
			case 40 :
			//↑	
			case 38 :
					var isUp = ( keyCode == 38 );
					var lastTr = null;
					var selectedTr = null;
					var nextTr = null;
					var trs = document.getElementsByTagName( "tr" );
					for ( var i = 0 ; i < trs.length ; i++ ){
						var theTr = trs[i];
						var attribute_cardName = theTr.getAttribute( "tr_cardName" );
						if ( attribute_cardName != null ){
							lastTr = selectedTr;
							selectedTr = nextTr;
							nextTr = theTr;
							if ( selectedTr != null && ( selectedTr.getAttribute( "tr_cardName" ) == lastSelectedCardName ) ){
								break;
							}
						}
					}
					//處理最後一張按"上"無反應的邏輯補足
					if ( selectedTr != null && ( selectedTr.getAttribute( "tr_cardName" ) != lastSelectedCardName ) ){
						lastTr = selectedTr;
						selectedTr = nextTr;
						nextTr = null;
					}
					var newClickTr = isUp ? lastTr : nextTr;
					if ( newClickTr != null ){
						newClickTr.click();
						autoScrollIfNotOnView( newClickTr , gobi("listBlock") );
					}
					break;
		}
	}
	
	//按方向鍵時進行版本更換或換卡
	function keybordFunction(){
		switch( event.keyCode ){

			//←
			case 37 :
			//→
			case 39 :
			//↓
			case 40 :
			//↑	
			case 38 :
					event.preventDefault();
					doKeybordFunction( event.keyCode );
					break;
		}
	}
	
	//將以上以下用語改成港制
	function transHK_MathWords( words ){
		return words.replace( /(\d+.?)(以上|以下)/g , '$1或$2' );
	}
	
	//取消勾選所有卡種過濾
	function clearCTAll(){
		checkCTAll( false );
	}
	
	//勾選所有卡種過濾
	function checkedCTAll(){
		checkCTAll( true );
	}
	
	//操作所有卡種過濾
	function checkCTAll( checked ){
		var ctCks = gosbn( "cardType" );
		for ( var i = 0 ; i < ctCks.length ; i++ ){
			if ( ctCks[i].parentElement.style.display != "none" ){
				ctCks[i].checked = checked;				
			}
		}
		checkCTAllBtn();
	}
	
	//判斷類別過濾是否全部都沒有被勾選
	function checkCTAllNoChecked(){
		var ctCks = gosbn( "cardType" );
		for ( var i = 0 ; i < ctCks.length ; i++ )
			if ( ctCks[i].checked )
				return false;
		return true;
	}
	
	//如果卡種類別全被取消勾選、顯示"全勾"按鍵、否則顯示"全消"按鍵
	function checkCTAllBtn(){
		var noChecked = checkCTAllNoChecked();
		gobi('ctaF').style.display = (  noChecked ? "none" : "inline" );
		gobi('ctaT').style.display = ( !noChecked ? "none" : "inline" );
	}
	
	//判斷畫面上是否產生scrollBarY
	function isHasScrollY(){
		return document.documentElement.clientHeight < document.documentElement.offsetHeight;
	}
	
	//動態載入JS
	function importJavascript( jsId , jsUrl , onloadCode ){
		
		var oHead = document.getElementsByTagName('HEAD').item(0); 
		var oScript= document.createElement("script"); 
		oScript.type = "text/javascript"; 
		oScript.src = jsUrl; 
		oScript.id = jsId;
		if ( onloadCode != null ){
			oScript.onload = onloadCode;
		}
		oHead.appendChild( oScript); 
	}
	
	//取得http/https
	function getHTTPHeader(){
		var isHttps = ( location.href.indexOf( "https" ) == 0 );
		return "http" + ( isHttps ? "s" : "" );
	}
	
	//把列表清除掉並插入指定文字一行
	function clearListAndSetOneLine( msg ){
		var nameTable = gobi( "names" );
		clearChildren( nameTable );
		var tr = document.createElement('tr');
		var td = document.createElement('td');
		td.style.textAlign = "center";
//		td.style.backgroundColor = "#FFFFFF";
		td.appendChild( document.createTextNode( msg ) );
		tr.appendChild( td );
		nameTable.appendChild( tr );
	}
	
	//行動裝置關鍵字群
	var mobiles = new Array(
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
	)
	//判別是否為行動裝置
	function isMobile(){
		var ua = navigator.userAgent.toLowerCase();
		for (var i = 0; i < mobiles.length; i++) {
			if (ua.indexOf(mobiles[i]) > 0) {
				return true;
			}
		}
		return false;
	}
	//判別是否為行動裝置專用版
	function isVM(){
		if ( typeof mVersion == 'undefined' )
			return false;
		return mVersion;
	}
	//切換頁籤
	function changeLeftPage( obj ){

		var bars = [
			[ gobi( "filterBar" ), gobi( "listBar" ), gobi( "fbBar" ) ],
			[ gobi( "filterBar2" ), gobi( "listBar2" ), gobi( "fbBar2" ) ]
		];
		var blocks = [
			gobi( "filterBlock" ), gobi( "listBlock" ), gobi( "fbBlock" )
		];
		for ( var i = 0 ; i < blocks.length ; i++ ){
			var isClickTd = bars[0][i] == obj;
			bars[0][i].style.fontWeight = isClickTd ? "bold" : "normal";
			bars[1][i].style.fontWeight = isClickTd ? "bold" : "normal";
			blocks[i].style.display = isClickTd ? "block" : "none";
		}
		gobi( "leftMain" ).style.backgroundColor = obj.style.backgroundColor;
	}
		
	//document.getElementsByClassName();
	function gosbcn( className ){
		className = className.toUpperCase();
		var rtns = [];
		for ( var i = 0 ; i < document.all.length ; i++ ){
			var classes = document.all[i].getAttribute("class");
			if ( classes != null && classes.toUpperCase().split(" ").include( className ) ){
				rtns.push( document.all[i] );
			}
		}
		return rtns;
	}
	
	//調整手機版主版高度
	function resizeContent(){
		var mainHeight = $(window).height() - ( $('#header').height() + $('#footer').height() + 10 + $(document.body)[0].scrollHeight-$(document.body)[0].clientHeight );
		gobi("content").style.height = mainHeight;
		gobi("content").style.maxHeight = mainHeight;
	}

	//切換頁籤(手機版)
	function changePage( obj ){
		var bars = gosbcn("pageBar");
		var mains = gosbcn("mainBlock");
		var index = 0;
		if ( obj != null ){
			index = ( typeof obj == "object" ? bars.indexOf( obj ) : parseInt( obj ) );
		}
		for ( var i = 0 ; i < bars.length ; i++ ){
			if ( i == index ){
				bars[i].style.backgroundColor = "#bebefa";
				bars[i].style.fontWeight = "bold";
				mains[i].style.display = "block";
			} else {
				bars[i].style.backgroundColor = "#beffff";
				bars[i].style.fontWeight = "normal";
				mains[i].style.display = "none";
			}
		}
		//如果是第一頁的話，開啟感謝列表，不是的話，開啟箭頭工具
		if ( index == 0 ){
			gobi("thanks").style.display = "block";
			gobi("functionArrow").style.display = "none";
		} else {
			gobi("thanks").style.display = "none";
			gobi("functionArrow").style.display = "block";
		}
		//如果是手機版的第二頁的話，將BODY.SCROLL捲到最上方
		if ( isVM() && index == 1 ){
			document.body.scrollTop = 0;
		}
		//將BODY.SCROLL轉到最左邊
		document.body.scrollLeft = 0;

	}
	
	//判斷現在是哪個頁籤
	function whichPage(){
		var mains = gosbcn("mainBlock");
		for ( var i = 0 ; i < mains.length ; i++ ){
			if ( mains[i].style.display != 'none' ){
				return i;
			}
		}
		return -1;
	}
	
	/**
		印出物件內容
	*/
	function parseObjectToSring( obj ){
		return JSON.stringify(obj, null, 4);
	}
	
	//匯出卡表
	function popList( language , ask , writeSelf ){
	
		if ( ask == null ){
			ask = true;
		}
		if ( writeSelf == null ){
			writeSelf = false;
		}
	
		var resultHTML = [];
//		var sort = getRadioValue( "sortBy" );
//		var desc = "true" == getRadioValue( "desc" );
		var queryListResults = [];
		var trs = document.getElementsByTagName( "tr" );
		for ( var i = 0 ; i < trs.length ; i++ ){
			if ( trs[i].getAttribute( "tr_cardName" ) != null ){
				queryListResults.push( trs[i].getAttribute( "tr_cardName" ) );
			} else if ( trs[i].getAttribute( "tr_cardName_vaultLink" ) != null ){
				queryListResults.push( trs[i].getAttribute( "tr_cardName_vaultLink" ) );
			}
		}

		//計算官方收錄最大值做為POP上限
		var popMax = 0;
		for ( var s = 0 ; s < setDatas.map.length ; s++ ){
			popMax = Math.max( popMax , setDatas.map[s].length );
		}
		var returnHint = null;
		if ( queryListResults.length == 0 ){
			returnHint = "查無資料";
		} else if ( queryListResults.length > popMax ){
			returnHint = "很抱歉，此匯出功能目前最多僅允許"+popMax+"筆資料。";
		}
		if ( returnHint != null ){
			alert( translateText( returnHint, isTC2C ) );
			return;
		}
		for ( var q = 0 ; q < queryListResults.length ; q++ ){
			var localDatas = cardDatas.getDataByName( queryListResults[q] , lastSelectedSetCode );
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
		var doCanvas = isCanvasSupported() && language == "P";
		var isDeck = false;
		var loadingSize = parseInt(173*queryListResults.length);
		if ( loadingSize > 1024 ){
			loadingSize = parseInt( loadingSize / 1024 ) + "MB";
		} else {
			loadingSize = loadingSize + "KB";
		}
		var showPicture = true;
		if ( ask ){
			showPicture = confirm( translateText( "請問是否顯示圖片(預計流量大小最高可能會超過"+loadingSize+")？", isTC2C ) );
		}
		var theSet = null;
		if ( lastSelectedSetCode != null && lastSelectedSetCode != queryHistorySetCode ){
			theSet = setDatas.getSetDatas( lastSelectedSetCode );
			if ( theSet != null ){
				isDeck = theSet.isDeck;
			}
		}
		//記錄從DMVault過來的資料，等後面進行動態匯入
		var afterMethodParameters = [];
		for ( var i = 0 ; i < queryListResults.length ; i++ ){
			var popCData = queryListResults[i];	
			if ( theSet != null ){
				var cDataInSet = theSet.setCards[ theSet.getCardIndex( popCData.name ) ];
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
					if ( cDataInSet.link != null ){
						popCData.link = cDataInSet.link;
					}
				}
			}
			var versions = ( popCData.id == null ) ? 1 : ( popCData.id instanceof Array ? popCData.id.length : 1 );
			for ( var v = 0 ; v < versions ; v++ ){
			
				//判斷有沒有雙極
				var udCData = popCData.ws == null ? null : cardDatas.getDataByName( popCData.name , lastSelectedSetCode, v, 1 );
				
				var singleCardHTML = getPopListHTMLCode( true, showPicture, true, language, popCData, i, v );
				if ( udCData != null ){
					var udSingleCardHTML = getPopListHTMLCode( true, false, true, language, udCData, i, v );
					singleCardHTML += ( language == "P" ? "" : "↑↓<BR>" ) + udSingleCardHTML;
				}
				resultHTML.push( singleCardHTML );
			}
			//如果是DMVault過來的無資料卡牌的話，就記錄對應的spanIndex
			if ( popCData.noLocalDataButVaultLink ){
				afterMethodParameters.push({
					popSpanIndex : i,
					link : popCData.link,
				});
			}
		}
		var returnHTMLStr = "";
		for ( var rh = 0 ; rh < resultHTML.length ; rh++ ){
			returnHTMLStr += ( ( rh > 0 && language != "P" ) ? "<BR><BR>" : "" ) + resultHTML[rh];
		}
		var w = window;
		if ( !writeSelf ){
			w = window.open();
			w.document.write( "<head>" );
			w.document.write( "<title>" + ( ( theSet == null ) ? "" : ( "《" + theSet.setName + "》" ) ) + "卡表匯出</title>" );
			w.document.write( "<script>" );
			w.document.write( setPicObjSize+gobi );
			w.document.write( "</script>" );
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
		//如果不是圖片列表的話，就開始進行動態DMVault匯入，但僅限桌機版使用
		if ( !isMobile() && ( language != "P" ) ){
			for ( var i = 0 ; i < afterMethodParameters.length ; i++ ){
				domainParse(
					"http://dmvault.ath.cx/card/" + afterMethodParameters[i].link,
					(function(){
						return function( container , params ){
							var parseCData = parseCDataFromDMVault( container );
							var wCRSpan = params[0];
							var wBodySpan = params[1];
							var wLanguage = params[2];
							var wCrWords = "";
							//文明
							var civilWords = civilMapping.getDatasByValue( parseCData.civil );
							for ( var c = 0 ; c < civilWords.length ; c++ ){
								wCrWords += ( c > 0 ? "." : "" ) + ( ( wLanguage == 'E' ) ? civilWords[c].eText : civilWords[c].text.replace( "文明" , "" ) );
							}
							//種族
							if ( parseCData.race != null ){
								wCrWords += " / ";
								for ( var r = 0 ; r < parseCData.race.length ; r++ ){
									var theRace = raceMapping.getDataByJap( parseCData.race[r] );
									if ( r > 0 ){
										wCrWords += ".";
									}
									if ( theRace == null ){
										wCrWords += parseCData.race[r];
									} else if ( wLanguage == 'E' ){
										wCrWords += theRace.Eng;
									} else if ( wLanguage == 'C' ){
										wCrWords += theRace.Chi;
									} else if ( wLanguage == 'J' ){
										wCrWords += theRace.Jap;
									}
								}
							}
							wCRSpan.innerHTML = " ( " + wCrWords + " ) ";
							//其他
							wBodySpan.innerHTML = getPopListHTMLCode( false, false, true, wLanguage, parseCData, null, null );
						};
					})(),
					[ 
						w.gobi("popListVaultCRSpan_"+afterMethodParameters[i].popSpanIndex+"_0"), 
						w.gobi("popListVaultBodySpan_"+afterMethodParameters[i].popSpanIndex+"_0"), 
						language 
					],
					(function(){
						return function(){
							alert("Error");
						};
					})(),
					null
				);
			}
		}	
		w.document.close();
		returnHTMLStr = null;
	}
	
	//截圖
	function doWriteCanvas2(){
			
		html2canvas(gobi("cardDataBlockMain"), { useCORS: true })
		  .then(canvas => { 
			canvas.id = "canvas3";
			document.body.appendChild(canvas);
			var img = new Image();
			img.src = "https://dm.takaratomy.co.jp/wp-content/card/cardimage/dm22rp1-TR9.jpg";
			img.onload = function(){
				var context = gobi("canvas3").getContext('2d');
				context.globalAlpha = 1.0;
				context.drawImage( img , 0, -200 , 200 , 280 );
			}
		});

	}

	//將圖片進行合併
	function doWriteCanvas( w ){
		
		var domPics = w.document.getElementsByTagName("IMG");
		var chk = true;
		for ( var i = 0 ; i < domPics.length ; i++ ){
			var tempImg = new Image();
			tempImg.src = domPics[i].src;
			if ( !tempImg.complete ){
				chk = false;
			}
			tempImg = null;
			if ( !chk ){
				break;
			}
		}
		if ( !chk ){
			w.alert( translateText( "圖片尚未全數讀取完成，請稍候再試！", isTC2C ) );
			return;
		}
		var percent = 0.9;
		var domPicsArray = [];
		//計算canvas的寬與高
		var canvasWidth = 0;
		var canvasHeight = 0;
		if ( domPics.length <= 40 ){
			var cprs = [
				1 , 2 , 3 , 2 , 3 , 3 , 4 , 4 , 3 , 4 , 
				4 , 4 , 4 , 4 , 5 , 4 , 6 , 6 , 5 , 5 , 
				7 , 8 , 8 , 8 , 5 , 6 , 6 , 6 , 6 , 6 , 
				7 , 7 , 7 , 7 , 7 , 8 , 8 , 8 , 8 , 8
			];
			var cpr = cprs[ domPics.length - 1 ];
			for ( var i = 0 ; i < domPics.length ; i+=cpr ){
				var tempArr = [];
				var tempWidth = 0;
				var tempHeight = 0;
				for ( var ti = 0 ; ti < cpr && ( ti + i ) < domPics.length ; ti++ ){
					var tempImg = domPics[ i + ti ];
					tempArr.push( tempImg );
					tempWidth += tempImg.width * percent;
					tempHeight = Math.max( tempHeight , tempImg.height * percent );
				}
				canvasWidth = Math.max( canvasWidth , tempWidth );
				canvasHeight += tempHeight;
				domPicsArray.push( tempArr );
				tempArr = null;
			}
		} else {
			var originWidth = 200;
			//原則上八張一排
			var cpr = 8;
			var maxWidth = cpr * originWidth * percent;
			var tempArr = [];
			var tempWidth = 0;
			var tempHeight = 0;
			for ( var i = 0 ; i < domPics.length ; i++ ){
				var tempImg = domPics[ i ];
				tempArr.push( tempImg );
				tempWidth += tempImg.width * percent;
				tempHeight = Math.max( tempHeight , tempImg.height * percent );
				//如果再加進一張會超寬或這是最後一張的話就換行
				if ( i == domPics.length - 1 || ( tempWidth + domPics[ i+1 ].width * percent ) > maxWidth ){
					canvasWidth = Math.max( canvasWidth , tempWidth );
					canvasHeight += tempHeight;
					domPicsArray.push( tempArr );
					tempArr = [];
					tempWidth = 0;
					tempHeight = 0;
				}
			}
		}
		
		var theCanvas = w.document.getElementById("canvas");
		theCanvas.width = canvasWidth;
		theCanvas.height = canvasHeight;
		var context = theCanvas.getContext('2d');
		context.globalAlpha = 1.0;
		var insertHeight = 0;
		for ( var rows = 0 ; rows < domPicsArray.length ; rows++ ){
			var tempMaxHeight = 0;
			var tempWidth = 0;
			for ( var columns = 0 ; columns < domPicsArray[ rows ].length ; columns++ ){
				var tempPic = ( domPicsArray[rows] )[ columns ];
				context.drawImage( tempPic , tempWidth, insertHeight , tempPic.width * percent , tempPic.height * percent );
				tempWidth += tempPic.width * percent;
				tempMaxHeight = Math.max( tempMaxHeight , tempPic.height * percent );
			}
			insertHeight += tempMaxHeight;
		}
		w.gobi("popDIV").style.display = 'none';
		w.alert( translateText( "已成功轉為一張圖片！", isTC2C ) );
	}
	
	function getPopListHTMLCode( writePCNCPPart, showPicture, writeDataPart , language, popCData , listIndex, aaIndex ){
		var singleCardHTML = "";
		//是否寫出圖片、張數、卡名、文明、攻擊力
		if ( writePCNCPPart ){
			//圖片
			if ( showPicture && !popCData.noLocalDataButVaultLink ){
//				var isVertical = ( popCData.type == "DHF" || popCData.type == "D2F" || popCData.type == "FFF" || popCData.type == "HF" );// && !popCData.pic.match(  /\w\/\w{2}\/[\w\-]+/);
//				var isVertical = ( popCData.type.include("DHF") || popCData.type.include("D2F") || popCData.type.include("DMF") || popCData.type.include("DF") || popCData.type.include("FFF") || popCData.type.include("FF") || popCData.type.include("MF") || popCData.type.include("HF") || popCData.type.include("OA") );
				var isHorizontal = true;
				for ( var t = 0 ; t < popCData.type.length ; t++ ){
					if ( !cardTypeMapping.getDataByValue( popCData.type[t] ).horizontal ){
						isHorizontal = false;
					}
				}

				singleCardHTML += "<div style='display:inline-block;'>";
				for ( var pc = 0 ; pc < ( popCData.count == null ? 1 : popCData.count ) ; pc++ ){
					var isBackReadData = false;
					var loadPic = ( popCData.pic instanceof Array ? popCData.pic : [ popCData.pic ] )[aaIndex];
					if ( loadPic == "" ){
						var backReadData = cardDatas.getDataByName( popCData.name );
						if ( backReadData != null ){
							loadPic = backReadData.pic;
							isBackReadData = true;
						}
					}
					singleCardHTML += "<img id='pop_pic_"+listIndex+"_"+pc+"_"+aaIndex+"' src='" + getImgSrc( loadPic ) + "' onload='setPicObjSize( this, this.id , " + ( isHorizontal ? " null , 200 " : " 200 , null " ) + " , this.title );' title='" + ( popCData.name + ( popCData.id != null ? "( " + ( popCData.id instanceof Array ? popCData.id : [ popCData.id ] )[aaIndex] + " )" : "" ) ) + "' style='float:left;" + ( isBackReadData ? "Opacity: 0.6;" : "" ) + "' >";
				}
				singleCardHTML += "</div>";
			}
			if ( language == "P" ){
				if ( popCData.noLocalDataButVaultLink ){
					for ( var pc = 0 ; pc < ( popCData.count == null ? 1 : popCData.count ) ; pc++ ){
						singleCardHTML += "<div style='display:inline-block;'>";
						singleCardHTML += "<img id='pop_pic_"+listIndex+"_"+pc+"_"+aaIndex+"' src='" + getImgSrc( null ) + "' onload='setPicObjSize( this, this.id , " + ( isHorizontal ? " null , 200 " : " 200 , null " ) + " , this.title );' title = '" + ( popCData.name + ( popCData.id != null ? "( " + ( popCData.id instanceof Array ? popCData.id : [ popCData.id ] )[aaIndex] + " )" : "" ) ) + "' style='float:left;' >";
						singleCardHTML += clearSubName( popCData.name );
						singleCardHTML += "</div>";
					}
				}
				return singleCardHTML;
			}

			var hasCountOrId = false;
			//張數
			if ( popCData.count != null ){
				if ( !showPicture || popCData.noLocalDataButVaultLink ){
					singleCardHTML += "【" + popCData.count + "張】";
				}
				hasCountOrId = true;
			}
			//ID
			if ( popCData.id != null ){
				if ( showPicture ){
					singleCardHTML += "<BR>";
				}
				singleCardHTML += "( " + ( popCData.id instanceof Array ? popCData.id : [ popCData.id ] )[aaIndex] + " )";
				hasCountOrId = true;
			}
			if ( hasCountOrId ){
				singleCardHTML += "<BR>";
			} else {
				if ( showPicture ){
					singleCardHTML += "<BR>";
				}
			}
			//卡名、卡種、文明與種族
			var c_rs = "";
			if ( !popCData.noLocalDataButVaultLink ){
				singleCardHTML += popCData.name + "<BR>";
				for ( var ct = 0 ; ct < popCData.type.length ; ct++ ){
					c_rs += ( ct > 0 ? "/" : "" ) + cardTypeMapping.getTextByValue( popCData.type[ct] )
				}
				c_rs += " / "
				var civilWords = civilMapping.getDatasByValue( popCData.civil );
				for ( var c = 0 ; c < civilWords.length ; c++ ){
					c_rs += ( c > 0 ? "." : "" ) + ( ( language == 'E' ) ? civilWords[c].eText : civilWords[c].text.replace( "文明" , "" ) );
				}
				if ( popCData.race != null ){
					c_rs += " / ";
					for ( var r = 0 ; r < popCData.race.length ; r++ ){
						var theRace = raceMapping.getDataByJap( popCData.race[r] );
						if ( r > 0 ){
							c_rs += ".";
						}
						if ( theRace == null ){
							c_rs += popCData.race[r];
						} else if ( language == 'E' ){
							c_rs += theRace.Eng;
						} else if ( language == 'C' ){
							c_rs += theRace.Chi;
						} else if ( language == 'J' ){
							c_rs += theRace.Jap;
						}
					}
				}
				singleCardHTML += " ( " + c_rs + " )";
			} else {
				singleCardHTML += "<span id='popListVaultCRSpan_"+listIndex+"_"+aaIndex+"'></span>";
			}
			singleCardHTML += "<BR>";
		}
		if ( writeDataPart ){
			if ( !popCData.noLocalDataButVaultLink ){
				//魂
				if ( popCData.soul != null ){
					singleCardHTML += "《";
					for ( var s = 0 ; s < popCData.soul.length ; s++ ){
						var theSoul = soulMapping.getDataByCode( popCData.soul[s] );
						if ( s > 0 ){
							singleCardHTML += ".";
						}
						if ( theSoul == null ){
							singleCardHTML += popCData.soul[s];
						} else if ( language == 'E' ){
							singleCardHTML += theSoul.Eng;
						} else if ( language == 'C' ){
							singleCardHTML += theSoul.Chi;
						} else if ( language == 'J' ){
							singleCardHTML += theSoul.Jap;
						}
					}
					singleCardHTML += "》<BR>";
				}
				//Cost&Power
				if ( popCData.cost != null ){
					singleCardHTML += "Cost " + ( popCData.cost == Number.MAX_SAFE_INTEGER ? "∞" : popCData.cost );
				}
				if ( popCData.power != null ){
					singleCardHTML += " / Power " + popCData.power + ( popCData.pc == null ? "" : ( popCData.pc ? "+" : "-" ) );
				}
				singleCardHTML += "<BR>";
				//特殊能力
				if ( popCData.sp != null ){
					for ( var ab = 0 ; ab < popCData.sp.length ; ab++ ){
						var isHint = popCData.sp[ab].indexOf( abilitiesHintHeader ) == 0;
						var abLinesStr = popCData.sp[ab];
						if ( isHint ){
							abLinesStr = "( " + abLinesStr.substring( abilitiesHintHeader.length ) + " )";
						}
						var abLines = abLinesStr.split("##");
						for ( var abl = 0 ; abl < abLines.length ; abl++ ){
							if ( abl == 1 ){
								singleCardHTML += "<ul style='margin:0px;'>";
							}
							if ( abl > 0 ){
								singleCardHTML += "<li>";
							}
							singleCardHTML += ( abl == 0 && !isHint ? "■" : "" );
							var getAbilityWithTag = keyWords.transTags( abLines[abl] );
							for ( var abo = 0 ; abo < getAbilityWithTag.length ; abo++ ){
								var theText = getAbilityWithTag[abo].innerText;
								if ( theText == null ){
									theText = getAbilityWithTag[abo].data;
								} else {
									//將種族與能力切換成指定語言
									var kRace = raceMapping.getDataByJap( theText );
									if ( kRace != null ){
										if ( language == "E" ){
											theText = kRace.Eng;
										} else if ( language == "C" ){
											theText = kRace.Chi;
										} else if ( language == "J" ){
											theText = kRace.Jap;
										}
									} else {
										var kAbility = abilityMapping.getDataByJap( theText );
										if ( kAbility != null ){
											if ( language == "E" ){
												theText = kAbility.Eng;
											} else if ( language == "C" ){
												theText = kAbility.Chi;
											} else if ( language == "J" ){
												theText = kAbility.Jap;
											}
										}
									}
								}
								if ( gobi("HK").checked ){
									theText = transHK_MathWords( theText );
								}
								if ( language == "C" || !isNoTrans( getAbilityWithTag[abo] ) ){
									theText = translateText( theText, isTC2C );
								}
								singleCardHTML += theText;
							}
							if ( abl > 0 ){
								singleCardHTML += "</li>";
							}
							if ( abl == abLines.length - 1 ){
								singleCardHTML += "</ul>";
							}
							if ( ab < popCData.sp.length - 1 && abLines.length == 1 ){
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
					var flavorInVersion = ( popCData.id instanceof Array ? popCData.flavor : [ popCData.flavor ] )[aaIndex];
					if ( !( flavorInVersion instanceof Array ) ){
						flavorInVersion = [ flavorInVersion ];
					}
					singleCardHTML += "<i style='font-size:13px;'>";
					for ( var f = 0 ; f < flavorInVersion.length ; f++ ){
						if ( flavorInVersion[f] == null )
							continue;
						singleCardHTML += ( f == 0 ? "" : "<BR>" );
						var getFlavorWithTag = keyWords.transTags( translateText( flavorInVersion[f] , isTC2C ) );
						for ( var fo = 0 ; fo < getFlavorWithTag.length ; fo++ ){
							var theText = getFlavorWithTag[fo].innerText;
							if ( theText == null ){
								theText = getFlavorWithTag[fo].data;
							} else {
								//將種族與能力切換成指定語言
								var kRace = raceMapping.getDataByJap( theText );
								if ( kRace != null ){
									if ( language == "E" ){
										theText = kRace.Eng;
									} else if ( language == "C" ){
										theText = kRace.Chi;
									} else if ( language == "J" ){
										theText = kRace.Jap;
									}
								} else {
									var kAbility = abilityMapping.getDataByJap( theText );
									if ( kAbility != null ){
										if ( language == "E" ){
											theText = kAbility.Eng;
										} else if ( language == "C" ){
											theText = kAbility.Chi;
										} else if ( language == "J" ){
											theText = kAbility.Jap;
										}
									}
								}
							}
							if ( language == 'C' || !isNoTrans( getFlavorWithTag[abo] ) ){
								theText = translateText( theText, isTC2C );
							}
							singleCardHTML += theText;
						}
					}
					singleCardHTML += "</i>";
					if ( flavorInVersion.length > 0 && flavorInVersion[0] != "" ){
						singleCardHTML += "<BR>";
					}
				}
			} else {
				singleCardHTML += "<span id='popListVaultBodySpan_"+listIndex+"_"+aaIndex+"'></span>";
			}
		}
		return singleCardHTML;
	}
	
	//尋找最接近的卡牌
	function searchForCardByName( fuzzyName ){
		var options = {
			keys: [ 'name' ],
			id : 'name',
			caseSensitive : true,
		};
		var f = new Fuse( addCardDatas , options );
		var fuzzuResult = f.search( fuzzyName );
		if ( fuzzuResult == null )
			return null;

		//因為Fuse.js所作的模糊比對是不分順序的，所以接著要再依照自寫的、要求順序嚴謹的邏輯計算分數，並取得分高者(錯誤字數不能超過2個)
		var errChars = 2.1;
		//如果字串長度小於5的話則一個都不能錯
		if ( fuzzyName.length < 5 ){
			errChars = 0.1;
		}
		var rtnName = null;
		for ( var fi = 0 ; fi < fuzzuResult.length ; fi++ ){
			var localErrScore = calcErrChars( fuzzyName, fuzzuResult[fi] );
			if ( localErrScore < errChars ){
				errChars = localErrScore;
				rtnName = fuzzuResult[fi];
			}
		}
		return rtnName;
	}
	
	//英文全型轉半型
	var fhConverter = {
		full : "ＱＡＺＷＳＸＥＤＣＲＦＶＴＧＢＹＨＮＵＪＭＩＫＯＬＰｑａｚｗｓｘｅｄｃｒｆｖｔｇｂｙｈｎｕｊｍｉｋｏｌｐ０１２３４５６７８９　！？＜＞",
		helf : "QAZWSXEDCRFVTGBYHNUJMIKOLPqazwsxedcrfvtgbyhnujmikolp01234567890!?<>",
		fullToHalf : function( str ){
			if ( str == null )
				return null;
			var returnStr = "";
			for ( var i = 0 ; i < str.length ; i++ ){
				var theChar = str.substr( i , 1 );
				var indexOfFull = this.full.indexOf( theChar );
				returnStr += ( ( indexOfFull == -1 ) ? theChar : this.helf.substr( indexOfFull, 1 ) );
			}
			return returnStr;
		},
	};	
	
	//SETCODE類型選擇器
	function changeSetCode( categoryValue ){
		var options = [];
		var eValue = ( categoryValue == null || categoryValue == "" );
		var categoryValues = eValue ? [] : categoryValue.split(",");
		if ( eValue ){
			options.push( {
				value : "",
				text : "",
			} );
		}
		var addRutenDeck = "RUT" == getParameter("addDeck");
		for ( var i = 0 ; i < setDatas.set.length ; i++ ){
			var doAdd = false;
			if ( !addRutenDeck && 
				( !setDatas.set[i].setCode.indexOf( "DM" ) == 0 && 
				!setDatas.set[i].setCode.indexOf( "NET" ) == 0 && 
				!setDatas.set[i].setCode.indexOf( "OF" ) == 0 && 
				!setDatas.set[i].setCode.indexOf( "deck" ) == 0 && 
				!setDatas.set[i].setCode.indexOf( "TW" ) == 0 && 
				!setDatas.set[i].setCode.indexOf( "PS" ) == 0 ) )
				continue;
			if ( setDatas.set[i].isListSkip )
				continue;
			if ( eValue ){
				doAdd = true;
			} else {
				for ( var cv = 0 ; cv < categoryValues.length ; cv++ ){
					if ( setDatas.set[i].setCode.indexOf( categoryValues[cv] ) == 0 ){
						doAdd = true;
					}
				}
			}
			if ( doAdd ){
				options.push( {
					value : setDatas.set[i].setCode,
					text : setDatas.set[i].setCode + " " + setDatas.set[i].setName,
					optionColor : setDatas.set[i].optionColor,
					isListSkip : setDatas.set[i].isListSkip,
				} );
			}
		}
		//把option裡的順序改成由新到舊
		/*
		var sortOptions = [];
		var insertIndex = -1;
		var header3 = null;
		for ( var i = 0 ; i < options.length ; i++ ){
		
			var setCodeHeader3 = options[i].value.substring(0,3);
			if ( setCodeHeader3 != header3 ){
				insertIndex++;
				sortOptions.push( [] );
				header3 = setCodeHeader3;
			}
			sortOptions[insertIndex].insert( 0 , options[i] );
		}
		options = [];
		for ( var o1 = 0 ; o1 < sortOptions.length ; o1++ ){
			for ( var o2 = 0 ; o2 < sortOptions[o1].length ; o2++ ){
				options.push( sortOptions[o1][o2] );
			}
		}
		*/
		options.sort(function (a, b) {
		  if (a.value > b.value) {
			return 1;
		  }
		  if (a.value < b.value) {
			return -1;
		  }
		  // a must be equal to b
		  return 0;
		});
		
		var setCodeSelector = gobi( "setCode" );
		clearChildren( setCodeSelector );
		for ( var i = 0 ; i < options.length ; i++ ){
			var option = document.createElement('option');
			option.value = options[i].value;
			option.text = options[i].text;
			if ( options[i].optionColor != null ){
				option.style.color = options[i].optionColor;
			}
			setCodeSelector.appendChild( option );
		}
		if ( !eValue ){
			setSelectValue( "setCode" , lastSelectedSetCode );
			setCodeSelector.onchange();
		}
	}
	
	//開啟/關閉進階過濾器
	function filter_adv( obj ){
		var doOpen = "＋" == obj.innerText;
		var filterTitles = gosbcn("filterTitle");
		for ( var t = 0 ; t < filterTitles.length ; t++ ){
			filterTitles[t].innerText = doOpen ? "進階搜尋" : "基本搜尋";
		}
		//符號變更
		obj.innerText = doOpen ? "－" : "＋";
		//攻擊力與費用的比較
//		gobi("cost_calc").style.display = doOpen ? "inline" : "none";
//		gobi("power_calc").style.display = doOpen ? "inline" : "none";
		var seconds = [ gosbcn("cost2"), gosbcn("power2") ];
		for ( var s1 = 0 ; s1 < seconds.length ; s1++ ){
			for ( var s2 = 0 ; s2 < seconds[s1].length ; s2++ ){
				(seconds[s1])[s2].style.display = doOpen ? "inline" : "none";
			}
		}
		//魂
		gobi("filter_tr_soul").style.display = doOpen ? "" : "none";
		//稀有度
		gobi("filter_tr_rarility").style.display = doOpen ? "" : "none";
		//第二組種族過濾器
		gobi("race2Span").style.display = doOpen ? "inline" : "none";
		//能力過濾器
		gobi("filter_tr_abilities").style.display = doOpen ? "" : "none";
		//卡牌種類
		var subTypes = gosbcn("subType");
		for ( var s = 0 ; s < subTypes.length ; s++ ){
			subTypes[s].style.display = doOpen ? "" : "none";
//			subTypes[s].children[0].checked = !gobi("skipType").checked && doOpen;
			subTypes[s].children[0].checked = false;
		}
		//異動功能按鍵的高，僅桌機版進行
		/*
		if ( !isMobile() ){
			var btns = gosbcn( "functionBtn" );
			for ( var i = 0 ; i < btns.length ; i++ ){
				btns[i].style.height = ( doOpen ? 26.5 : 30 ) + "px";
			}
		}
		*/
		//如果是關閉的話，要將鎖起來的過濾項目初始化
		if ( !doOpen ){
			//攻擊力與費用的比較
//			setSelectValue( "cost_calc" , "e" );
//			setSelectValue( "power_calc" , "e" );
			setSelectValue( "cost2" , "" );
			setSelectValue( "power2" , "" );
			
			//魂
			setCheckboxValue( "soul" , null );
			//稀有度
			setCheckboxValue( "rarility" , null );
			//第二組種族過濾器
			setSelectValue( "race2" , "" );
			gobi( "absoluteRace2" ).checked = false;
			//能力過濾器
			var absFilterObjs = gosbn( "abilities" );
			for ( var abs = 0 ; abs < absFilterObjs.length ; abs++ ){
				setSelectValue2( absFilterObjs[abs] , "" );
			}
			//能力過濾器(種族)
			setSelectValue2( gobi( "ab_race" ) , "" );
			//能力過濾器(卡名)
			setSelectValue2( gobi( "ab_name" ) , "" );
		}
	}
		
	//比對兩字串，回傳不符合字數。[ッ][っ]只算半個，[．][．]只算0.1，全形英數符號沒找到的話可以用半形再找一次
	var helfChars = [ "ッ" , "っ" ];
	var skipChars = [ "．" , "．" ];
	function calcErrChars( mustStr, compareStr ){
		var missMatchLength = 0.0;
		while ( mustStr.length > 0 ){
			var theChar = mustStr.substring( 0 , 1 );
			var matchIndex = compareStr.indexOf( theChar );
			if ( matchIndex == -1 ){
				if ( helfChars.include( theChar ) )
					missMatchLength += 0.5;
				else if ( skipChars.include( theChar ) )
					missMatchLength += 0.1;
				else{
					var charF2H = fhConverter.fullToHalf( theChar );
					if ( charF2H != null ){
						matchIndex = compareStr.indexOf( charF2H );
					}
					if ( matchIndex == -1 )
						missMatchLength += 1.0;
				}	
					
			}
			if ( matchIndex != -1 ) {
				compareStr = compareStr.substring( matchIndex+1 );
			}
			mustStr = mustStr.substring( 1 );
		}
		return missMatchLength;
	}
	
	function clearSkipType(){
		gobi("skipType").checked = false;
	}
	
	//版本訊息
	function checkUpdate( jspValue ){
		if ( updateLog.logAndDate[0].date.replace( /\//g, "" ) != jspValue ){
			alert( translateText( "請重新整理(Ctrl+F5)以取得最新版本(最新版本：v."+jspValue.replace(/\//g,"")+"/當前版本："+updateLog.logAndDate[0].date.replace(/\//g,"")+")", isTC2C ) );
		}
	}
	
	//判斷是否為作者
	function isRD(){
		return (""+window.location).indexOf( "file" ) == 0 || getParameter("user") == "Ether";
	}

	//判斷是否支援Canvas
	function isCanvasSupported(){
		var elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	}
	
	//RD專用，將當前牌庫做JS Code匯出
	function codingDeck(){
	
		var tab = "\t";
		var br = "\r\n";
	
		var htmlCode = "";
		var setData = setDatas.getSetDatas( lastSelectedSetCode );
		if ( setData == null || !setData.isDeck ){
			alert("Not A Deck!!");
			return;
		}
		htmlCode += tab + "var setCode = \"" + setData.setCode + "\"" + br;
		htmlCode += tab + "var setName = \"" + setData.setName + "\"" + br;
		htmlCode += tab + "var isDeck = true;" + br;
		htmlCode += tab + "var setCardList = [" + br;
		for ( var c = 0 ; c < setData.setCards.length ; c++ ){
			htmlCode += tab + tab + "{" + tab + tab + "name : \"" + setData.setCards[c].name + "\"," + tab + "count : " + setData.setCards[c].count + "," + tab + "}," + br;
		}
		htmlCode += tab + "];" + br;
		htmlCode += tab + "setDatas.addMap( setCode , setName , isDeck , setCardList );" + br;
	
		var w = window.open();
		w.document.write( "<XMP>"+htmlCode+"</XMP>" );
		w.document.close();
		returnHTMLStr = null;	
	}

	var backgroundImageHeader = getCssValuePrefix();
	function getCssValuePrefix(){
	
		var rtrnVal = '';//default to standard syntax
		var prefixes = ['-o-', '-ms-', '-moz-', '-webkit-'];
		
		if ( isFirefox )
			return prefixes[2];

		// Create a temporary DOM object for testing
		var dom = document.createElement('div');

		for (var i = 0; i < prefixes.length; i++)
		{
			// Attempt to set the style 
			dom.style.background = prefixes[i] + 'linear-gradient(0deg, #000000 0%, #ffffff 100%)';

			// Detect if the style was successfully set
			if (dom.style.backgroundImage )
			{
				rtrnVal = prefixes[i];
			}
		}

		dom = null;
		delete dom;

		return rtrnVal;
	}

	
	//開啟/關閉Textarea輸入區塊
	function openPDBSBlock( doCloseIfThisIsTheSubmitBtn, afterFunction ){
		if ( doCloseIfThisIsTheSubmitBtn == null ){
			var blockPercentW = 0.98;
			var blockPercentH = 0.98;
			var pdbsDIV = document.createElement('div');
			pdbsDIV.style.width = parseInt( document.body.clientWidth * blockPercentW ) +'px';
			pdbsDIV.style.height = parseInt( document.body.clientHeight * blockPercentH ) +'px';
			pdbsDIV.style.left = '0px';
			pdbsDIV.style.top = '0px';
			pdbsDIV.style.paddingLeft = parseInt( document.body.clientWidth * ( 1 - blockPercentW ) * 2 ) + 'px';
			pdbsDIV.style.paddingTop = parseInt( document.body.clientHeight * ( 1 - blockPercentH ) * 2 ) + 'px';
			pdbsDIV.style.backgroundColor = "#666666";
			pdbsDIV.style.position = "absolute";
			var pdbsTextarea = document.createElement('textarea');
			pdbsTextarea.style.width = ( blockPercentW * 100 - 10 ) + "%";
			pdbsTextarea.style.height = ( blockPercentH * 100 - 10 ) + "%";
			var initString = "請在此輸入牌庫內文，例：\r\n３x 神帝ムーラ\r\n 4 * 神帝アージュ\r\n2 時空の庭園";
			pdbsTextarea.placeholder = translateText( initString, isTC2C );
			pdbsDIV.appendChild( pdbsTextarea );
			pdbsDIV.appendChild( document.createElement('br') );
			var submitBtn = document.createElement('input');
			submitBtn.type = "button";
			submitBtn.value = "-匯入-";
			submitBtn.onclick = (function(){
				var af = afterFunction;
				return function(){
					var textAreaValue = this.parentNode.firstChild.value;
					/*
					if ( af == 1 ){
						parseDeckString( textAreaValue );
					} else {
						autoLoading( textAreaValue );
					}
					*/
					if ( af != null ){
						af( textAreaValue );
					}
					openPDBSBlock( this, null );
				}
			})()
			pdbsDIV.appendChild( submitBtn );
			var closeBtn = document.createElement('input');
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
	}
	
	function LoadExtPage(iUrl) { 

		//偵測所需參數是否足夠 
		if(iUrl=="")
			return null;
		//定義XmlHttp物件 
		var objXmlHttp = new ActiveXObject("Msxml2.ServerXMLHTTP") 

		//定義欲傳遞的參數 
		var ArgStr="" 

		//定義完整的查詢頁面Path 
		objXmlHttp.open("GET",iUrl+ArgStr,false) 

		//送出查詢 
		try { 
			objXmlHttp.send() 

			//取回XmlHttp物件的結果 
			iST=objXmlHttp.status 
			iT=objXmlHttp.statusText 
			iC=objXmlHttp.responseText 

			if((iST==200)&&(iT.toUpperCase()=="OK")){ 
				//------------------------------------------------------- 
				//連線成功 
				//------------------------------------------------------- 
				//alert(iC) 
				//alert(iST+"."+iT) 
				o.value=iC 
				
				objXmlHttp=Nothing 
				return iC; 
			} else { 
				//------------------------------------------------------- 
				//連線失敗 
				//------------------------------------------------------- 
				//alert(iC) 
				//alert(iST+"."+iT) 
				objXmlHttp=Nothing 
				return null; 
			} 
		} catch(e) { 
			return null; 
		} 
	} 
	
	/**外部連結用工具
	 * Param:
	 * qUrl : 外部URL
	 * successMethod : 		成功取回內容後的執行內容
	 * successParameters : 	成功取回內容後的帶入參數
	 * failureMethod : 		取回內容失敗後的執行內容
	 * failureParameters : 	取回內容失敗後的帶入參數
	 */
	function domainParse( qUrl , successMethod , successParameters , failureMethod , failureParameters ){

		qUrl = getHTTPHeader()+"://query.yahooapis.com/v1/public/yql?"+
			"q=select%20*%20from%20html%20where%20url%3D%22"+
			encodeURIComponent(qUrl)+
			"%22&format=xml'&callback=?";
		$.getJSON( qUrl,
			(function(){
				var sMd = successMethod;
				var sPs = successParameters;
				var fMd = failureMethod;
				var fPs = failureParameters;
				return function( data ){
					var dataResult = data.results[0];
					if( dataResult ){
						var iFrame = document.createElement('iframe');
						iFrame.style.display = 'none';
						document.body.appendChild( iFrame );
						var container = getIFrameContainer( iFrame );
						container.document.open();
						var data = filterData(data.results[0]);
						container.document.write( data );
						(sMd)( container , sPs );
						container.document.close();
						container.document.write();
						document.body.removeChild( iFrame );
					} else if ( fMd != null ){
						(fMd)( fPs );
					}
				}
			})()
		);
	}	
	/**
	 * 使用範例
	 */
	/* 
	var testLink = "http://dmvault.ath.cx/deck1052824.html";
	domainParse(
		testLink,
		(function(){
			return function( container , params ){
				var p2 = params[1];
				alert( p2 );
			};
		})(),
		[ 1,2,3 ],
		(function(){
			return function(){
			};
		})(),
		null
	);
	*/
	
	function changeClass( obj, likeRadio ){
		if ( obj.getAttribute("class") == "btnUnClick" ){
			if ( likeRadio ){
				var objs = gosbn( obj.getAttribute("name") );
				for ( var o = 0 ; o < objs.length ; o++ ){
					objs[o].setAttribute("class","btnUnClick");
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
	}
	
	function searchKTag( str ){
		var tags = [];
		var is = -1;
		var ie = -1;
		while ( ( is = str.indexOf("(K)") ) > -1 && ( ie = str.indexOf("(/K)") ) > -1 ){
			var tag = str.substring( is+3, ie );
			tags.push( tag );
			str = str.substring(ie+4);
		}
		return tags;
	}
	
	function findRuten(){
		if ( !twsdCards.includes( lastSelectedCardName ) )
			return;
		var selectedCardDats = cardDatas.getDataByName( lastSelectedCardName , lastSelectedSetCode , lastSelectedAAIndex, lastSelectedUdIndex );
		var idNum = selectedCardDats.id.split( " " )[1];
		window.open( "https://www.ruten.com.tw/find/?q=%E6%B1%BA%E9%AC%A5%E7%8E%8B+"+lastSelectedSetCode+"+"+idNum, '_blank');
	}

	/**
		檢查有沒有遺漏的能力標籤
	*/
	function checkLoseAbilityTags(){
		var sp = [];
		for ( var i = 0 ; i < cardDatas.map.length ; i++ ){
			var cd = cardDatas.map[i];
			var spStrings = [];
			if ( cd.wData == null ){
				spStrings = [ cd.sp ];
			} else {
				spStrings = [ cd.wData[0].sp, cd.wData[1].sp ];
			}
			for ( var w = 0 ; w < spStrings.length ; w++ ){
				for ( var s = 0 ; s < spStrings[w].length ; s++ ){
					var tags = searchKTag(spStrings[w][s]);
					for ( var t = 0 ; t < tags.length ; t++ ){
						var theTag = tags[t];
						if ( theTag.indexOf( "<=>" ) != -1 ){
							theTag = theTag.split("<=>")[1];
						}
						if ( !sp.include( theTag ) ){
							sp.push( theTag );
						}
					}
				}
			}
		}
		var exist = [];
		for ( var i = 0 ; i < abilityMapping.map.length ; i++ ){
			exist.push( abilityMapping.map[i].Jap );
		}
		for ( var i = 0 ; i < sp.length ; i++ ){
			if ( !exist.include( sp[i] ) ){
				console.log(sp[i]);
			}
		}
	}
	
	/**
		檢查有沒有遺漏的種族
	*/
	function checkLoseRaces(){
		var raceMap = [];
		for ( var i = 0 ; i < raceMapping.map.length ; i++ ){
			raceMap.push( raceMapping.map[i].Jap );
		}
		for ( var i = 0 ; i < cardDatas.map.length ; i++ ){
			var cd = cardDatas.map[i];
			var races = cd.wData == null ? cd.race : cd.wData[0].race;
			if ( races != null ){
				for ( var r = 0 ; r < races.length ; r++ ){
					if ( !raceMap.include( races[r] ) ){
						console.log( races[r] +"( "+cd.name+" )" );
					}
				}
			}
		}
	}
	
	/**
		確認有沒有重複輸入的卡，會讀很久
	*/
	function checkDuplicateCard(){
		var checkCardNames = [];
		for ( var i = 0 ; i < cardDatas.map.length ; i++ ){
			var cardName = cardDatas.map[i].name.replace( /( |　)/g , "" );
			/*
			if ( checkCardNames.indexOf( cardName ) != -1 ){
				alert( cardName );
			} else {
				checkCardNames.push( checkCardNames );
			}
			*/
			checkCardNames.push( clearSubName(cardName) );
		}
		checkCardNames.sort(function (a, b) {
		  if (a > b) {
			return 1;
		  }
		  if (a < b) {
			return -1;
		  }
		  // a must be equal to b
		  return 0;
		});
		for ( var i = 0 ; i < checkCardNames.length -1 ; i++ ){
			if ( checkCardNames[i] == checkCardNames[i+1] ){
				console.log( checkCardNames[i] );
			}
		}
		console.log( "END" );
	}