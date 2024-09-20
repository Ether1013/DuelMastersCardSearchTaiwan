	
	/*
	function importTakaraTomyDeck(){
		var jsId = "jqueryJS";
		var jsTag = gobi( jsId );
		var alertMsg = translateText( "請輸入官網頁面URL", isTC2C );
		if ( jsTag == null ){
			var jqueryUrl = getHTTPHeader() + "://code.jquery.com/jquery-1.11.0.min.js";
			importJavascript( jsId , jqueryUrl , function(){ 
				doImportTakaraTomyDeck( prompt(alertMsg) ); 
			} );
		} else {
			doImportTakaraTomyDeck( prompt(alertMsg) ); 
		}
	}
	*/
	
	//轉換官方開發部的牌庫
	function doImportTakaraTomyDeck( url ){
		domainParse(
			url,
			(function(){
				return function( container , params ){
					parseDeckFromTakaraTomy( container );
				};
			})(),
			null,
			(function(){
				return function(){
					alert( "很抱歉，此功能暫時無法運作喔。" );
				};
			})(),
			null
		);
	}

	//解析TakaraTomy的牌庫資訊(一頁多個)
	function parseDeckFromTakaraTomy( container ){

		var importDecks = [];
		
		var officeDeckTables = container.document.getElementsByClassName("deck");
		
		for ( var i = 0 ; i < officeDeckTables.length ; i++ ){
			var fsObj = officeDeckTables[i];

			//計算卡名與張數
			var deckList_names = [];
			var deckList_counts = [];
			
			//取得TBODY
			var tbodyObj = null;
			for ( var fsi = 0 ; fsi < fsObj.children.length ; fsi++ ){
				if ( fsObj.children[fsi].tagName == "TBODY" ){
					tbodyObj = fsObj.children[fsi];
					break;
				}
			}
			if ( tbodyObj != null ){
				var cnameIndex = -1;
				var cnumberIndex = -1;
				//從第一行的標題去判斷哪一欄是數量、哪一欄是卡名
				for ( var c = 0 ; c < tbodyObj.children[0].children.length ; c++ ){
					var _text = tbodyObj.children[0].children[c].innerText;
					if ( _text == "カード名" || _text == "名前" ){
						cnameIndex = c;
					} else if ( _text == "枚数" ){
						cnumberIndex = c;
					}
				}
				if ( cnameIndex != -1 && cnumberIndex != -1 ){
					for ( var tri = 1 ; tri < tbodyObj.children.length ; tri++ ){
						var trObj = tbodyObj.children[tri];
						if ( trObj.getAttribute("class") == null || trObj.getAttribute("class") == "" ){
							//張數
							var _num = trObj.children[ cnumberIndex ].innerText;
							//卡名是第五個td
							var _names = trObj.children[ cnameIndex ].innerText.replace( /[\[\]《》【】]/g , " " ).split( /[\/|／→]/ );
							for ( var n = 0 ; n < _names.length ; n++ ){
								var _name = _names[n].trim();
								if ( _name != "" && !deckList_names.include( _name ) ){
									deckList_names.push( _name );
									deckList_counts.push( _num );
								}
							}
						}
					}
				}
			}

			//牌庫名
			var importDeckName = null;
			//判斷有沒有牌庫名
			var firstBro = getBroWithClass( fsObj , "deck-link-big" , false );
			if ( firstBro != null && firstBro.tagName == "SPAN" ){
				importDeckName = firstBro.innerText;
			}
			var fAndList = parseSimpleListToLocalList( deckList_names, deckList_counts );
			var deckListObj = fAndList.deckListObj;
				
			if ( deckListObj.length > 0 ){
			
				importDecks.push({
					deckName : importDeckName,
					deckDatas : deckListObj,
				});
			}
		}
		
		if ( importDecks.length > 0 ){
			var parseSetMax = 1;
			for ( var i = 0 ; i < setDatas.set.length ; i++ ){
				if ( setDatas.set[i].setCode.indexOf( stringDeckSetCodeHeader ) == 0 ){
					parseSetMax++;
				}
			}
			var firstImportCode = null;
			for ( var i = 0 ; i < importDecks.length ; i++ ){
			
				var parseSetCode = stringDeckSetCodeHeader + (i+parseSetMax);
				if ( i == 0 ){
					firstImportCode = parseSetCode;
				}
				var parseSetName = importDecks[i].deckName;
				if ( parseSetName == null ){
					parseSetName = "匯入牌庫#" + (i+parseSetMax);
				}
				
				setDatas.addMap( parseSetCode , parseSetName , true , importDecks[i].deckDatas );
				var setCodeSelector = gobi( "setCode" );
				var option = document.createElement('option');
				option.value = parseSetCode;
				option.text = parseSetCode.toUpperCase() + " " + parseSetName;
				option.selected = true;
				setCodeSelector.appendChild( option );
			}
			setSelectValue( "setCode" , firstImportCode );		
			setCodeSelector.onchange();
			alert( translateText( "匯入完成！一共匯入"+importDecks.length+"副牌庫", isTC2C ) );
		} else {
			alert( translateText( "匯入失敗！", isTC2C ) );
		}
	}
	
	//解析DMVault的牌庫資訊
	function parseDeck( container ){

		var cardATags = [];			//卡名(innerText)
		var cardATags2 = [];		//卡名(innerHTML)
		var cardATagsNum = [];		//卡片張數
		var cardATagsLink = [];		//DMVault卡片連結
		var recordEx = [];			//紀錄超次元卡牌
		var vaultDeckNames = container.document.getElementsByTagName("a");
		for ( var i = 0 ; i < vaultDeckNames.length ; i++ ){
			var aNode = vaultDeckNames[i];
			if ( aNode.href.match( /\/card\// ) && aNode.text != "" ){
				//dmvault的卡表資料是<td><a href="卡片資料>卡名</a></td><td>...</td><td class="num"><p>張數</p></td>
				var cNumObj = getBroWithClass( aNode.parentNode , "num" , false );
				var num = 0;
				if ( cNumObj != null && cNumObj.firstChild != null ){
					num = parseInt( cNumObj.firstChild.nodeValue );
				}
				if ( num > 0 ){
					var catIndex = cardATags.indexOf( aNode.innerText );
					if ( catIndex == -1 ){
						cardATags.push( aNode.innerText );
						cardATags2.push( aNode.innerHTML );
						cardATagsNum.push( num );
						//連結不紀錄路徑
						var hrefSplits = aNode.href.split("/");
						cardATagsLink.push( hrefSplits[ hrefSplits.length - 1 ] );
						//如果是超次元卡牌的話就做個紀錄
						if ( isUnderGrandsParent( aNode , "recipetable3" ) ){
							recordEx.push( aNode.innerText );
						}
					}
				}
			}
		}
		
		var deckListJSON = [];		//非超次元卡牌
		var deckListJSON_e = [];	//超次元卡牌
		var deckListJSON_NaN = [];	//無資料卡牌
		for ( var i = 0 ; i < cardATags.length ; i++ ){
			var importName = cardATags[i];
			var importName2 = cardATags2[i];
			var importCount = cardATagsNum[i];
			var dmVaultLink = cardATagsLink[i];
			var importData = cardDatas.getDataByName( importName , null , null );
			//如果找不到資料的話，可能是DMVault的卡名有錯，此時要以正確名字去找資料
			if ( importData == null ){
				var correctName = errorCardNameMap.getCorrectName( importName );
				if ( correctName != importName ){
					importName = correctName;
					importData = cardDatas.getDataByName( importName , null , null );
				}
			}
			//如果沒找到，就再用HTML卡名去找一次
			if ( importData == null ){
				var correctName = errorCardNameMap.getCorrectName( importName2 );
				if ( correctName != importName ){
					importName = correctName;
					importData = cardDatas.getDataByName( importName , null , null );
				}
			}
			//將要記錄的資料，包含卡名跟張數
			var importNameAndNum = {
				//因應注音問題修改，當importData有值時，以importData.name為準(因為DMVault的卡表上、不會標示卡名注音)
				name : ( importData == null ? importName : importData.name ),
				count : importCount,
			};
			//沒資料的話就追加記錄連結、無資料記號、以及是否為超次元卡牌
			if ( importData == null ){
				importNameAndNum.noData = true;
				importNameAndNum.link = dmVaultLink;
				importNameAndNum.isEx = recordEx.include( importName );
				deckListJSON_NaN.push( importNameAndNum );
			//判斷是否非超次元卡牌(目前先以有沒有背面來判斷)
			} else if ( importData.back == null ){
				deckListJSON.push( importNameAndNum );
			//如果是超次元卡牌的話要追加翻面資訊、後面要判斷「超次元超級生物」是否湊齊，湊齊才會寫在卡表上
			} else {
				importNameAndNum.back = importData.back;
				deckListJSON_e.push( importNameAndNum );
			}
		}
		
		//把超次元卡牌部份 的卡表卡名記起來，方便後面去進行超次元超級生物的零件判斷
		var dlj_e_list = [];
		for ( var i = 0 ; i < deckListJSON_e.length ; i++ ){
			dlj_e_list.push( deckListJSON_e[i].name );
		}
		for ( var i = 0 ; i < deckListJSON_e.length ; i++ ){
			var theDataOf_e = deckListJSON_e[i];
			//判斷這張卡是否列入卡表
			var _allow = false;
			//沒有背面OK(但理論上不可能)
			if ( theDataOf_e.back == null ){
				_allow = true;
			//如果背面卡牌資訊不是陣列=只有一張OK
			} else if ( !( theDataOf_e.back instanceof Array ) ){
				_allow = true;
			//如果是陣列的話，要做零件數判斷
			} else if ( theDataOf_e.back instanceof Array ){

				if ( theDataOf_e.back.length > 0 ){
					var _count = 4;
					for ( var b = 0 ; b < theDataOf_e.back.length ; b++ ){
						var backName = theDataOf_e.back[b];
						var backNum = -1;
						var _index = dlj_e_list.indexOf( backName );
						if ( _index != -1 ){
							backNum = deckListJSON_e[ _index ].count;
						}
						_count = Math.min( _count , backNum );
					}
					//如果有湊齊一組的話才可以列進卡表
					if ( _count > 0 ){
						theDataOf_e.count = _count;
						_allow = true;
					}
				}
			}
			if ( _allow ){
				deckListJSON.push( theDataOf_e );
			}
		}
		for ( var i = 0 ; i < deckListJSON_NaN.length ; i++ ){
			deckListJSON.push( deckListJSON_NaN[i] );
		}
		if ( deckListJSON.length == 0 )
			deckListJSON = null;
		return deckListJSON;
	}

	//判斷指定物件是否在指定id物件之下
	function isUnderGrandsParent( obj , parentId ){
		if ( obj == null )
			return false;
			
		var parent = obj.parentNode;
		if ( parent == null )
			return false;
		else if ( parent.id == parentId )
			return true;
		else
			return isUnderGrandsParent( parent , parentId );
	}

	//指定class、取得第一個符合的兄弟節點
	function getBroWithClass( standardObj , broClass , isNext ){
		if ( standardObj == null )
			return null;
		var broObj = ( isNext ? standardObj.nextSibling : standardObj.previousSibling );
		if ( broObj == null )
			return null;
		else if ( broObj.getAttribute != null && broObj.getAttribute("class") != null && broObj.getAttribute("class").split(" ").include( broClass ) )
			return broObj;
		else
			return getBroWithClass( broObj , broClass , isNext );
	}

	//引入JS
	var promptHint = "【您可輸入DMVault牌庫連結或編號】\nEX:985025\nEX:deck985025\nEX:http://dmvault.ath.cx/deck985025.html\n\n【官方開發部網址】\nEX:http://dm.takaratomy.co.jp/capture/saga08/";
	function importDMVaultDeck( dmVaultDeckId ){
		var jsId = "jqueryJS";
		var jsTag = gobi( jsId );
		var alertMsg = translateText( promptHint, isTC2C );
		if ( jsTag == null ){
			var jqueryUrl = getHTTPHeader() + "://code.jquery.com/jquery-1.11.0.min.js";
			importJavascript( jsId , jqueryUrl , function(){ 
				doAjax(
					( ( dmVaultDeckId != null ) ? dmVaultDeckId : prompt(alertMsg) )
				); 
			} );
		} else {
			doAjax(
				( ( dmVaultDeckId != null ) ? dmVaultDeckId : prompt(alertMsg) )
			);
		}
	}


	/*
	function parseDeckByString(){
		var alertMsg = translateText( "很抱歉，此功能暫不開放", isTC2C );
		alert( alertMsg );
	}
	*/
	
	//將字串轉成牌庫
	var stringDeckSetCodeHeader = "PS-";
	function parseDeckString( deckString, skipAlert ){

		var deckList_names = [];
		var deckList_counts = [];

		deckString = deckString.replace( /[\[\]《》【】]/g , " " ).split( /[\n]/g );
		for ( var ds = 0 ; ds < deckString.length ; ds++ ){
			var _line = deckString[ds].replace( /^[ 　\s]+/g , "" ).replace( /[ 　\s]+$/g , "" );
			var _cardNames = null;
			var _num = _line.match(/^[0-90123456789]+/);
			if ( _num != null && _num != "" ){
				_cardNames = _line.replace(/^[0-90123456789]+/,"");
			} else {
				_num = _line.match(/[0-90123456789]+$/);
				_cardNames = _line.replace(/[0-90123456789]+$/,"");
			}
			if ( _num == null || _num == "" ){
				continue;
			} else {
				_cardNames = _cardNames.replace( /^[ 　\s\*＊xXｘＸ×]+/g , "" ).replace( /[ 　\s\*＊xXｘＸ×]+$/g , "" ).replace( /(（|\()[^\(\)（）]+(）|\))/g , " " ).split( /[|→]/ );
			}
			_num = parseInt( fhConverter.fullToHalf( _num[0] ) );
			if ( _num <= 0 || _num > 40 ){
				continue;
			}
			for ( var tc = 0 ; tc < _cardNames.length ; tc++ ){
				var _cardName = _cardNames[tc].trim();
				if ( _cardName != "" && !deckList_names.include( _cardName ) ){
					deckList_names.push( _cardName );
					deckList_counts.push( _num );
				}
			}
		}
		
		//將原始的卡名/張數轉成查詢器有效的卡名
		var fAndList = parseSimpleListToLocalList( deckList_names, deckList_counts );
		var fuzzyDatas = fAndList.fuzzyDatas;
		var deckListObj = fAndList.deckListObj;
		
		if ( deckListObj.length > 0 ){
			limitsReset();
			var parseSetMax = 1;
			for ( var i = 0 ; i < setDatas.set.length ; i++ ){
				if ( setDatas.set[i].setCode.indexOf( stringDeckSetCodeHeader ) == 0 ){
					parseSetMax++;
				}
			}
			var parseSetCode = stringDeckSetCodeHeader + parseSetMax;
			var parseSetName = "匯入牌庫#" + parseSetMax;
			
			setDatas.addMap( parseSetCode , parseSetName , true , deckListObj );
			var setCodeSelector = gobi( "setCode" );
			var option = document.createElement('option');
			option.value = parseSetCode;
			option.text = parseSetCode.toUpperCase() + " " + parseSetName;
			option.selected = true;
			setCodeSelector.appendChild( option );
			
			setCodeSelector.onchange();
			query();
			//如果有模糊比對來的卡的話，則要跳出提示訊息
			if ( fuzzyDatas.length > 0 && !skipAlert ){
				var alertMsg = translateText( "以下" + fuzzyDatas.length + "張卡不一定為正確對象：\n", isTC2C );
				for ( var i = 0 ; i < fuzzyDatas.length ; i++ ){
					alertMsg += "\n【" + fuzzyDatas[i].tName + "】";
				}
				alert( alertMsg );
			}
		} else {
			alert("Parse Failure!");
		}
	}

	function parseDeckString___( deckString ){
		
		var deckList_names = [];
		var deckList_counts = [];

		deckString = deckString.replace( /[\[\]《》【】]/g , "" ).trim();
		var deckStringSplit = [];
		while ( deckString.length > 0 ){
			var charType = null;
			var matchStr = deckString.match( /^[\d0123456789]+/ );
			if ( matchStr != null ){
				charType = "N";
			} else {
				matchStr = deckString.match( /^[ 　]*[\*＊xXｘＸ×][ 　]*/ );
				if ( matchStr != null ){
					charType = "B";
				} else {
					matchStr = deckString.match( /^[^\*＊xXｘＸ×\d0123456789]+/ );
					charType = "W";
				}
			}
			deckString = deckString.substring( matchStr[0].length );
			deckStringSplit.push( {
				charType : charType,
				deckString : matchStr[0]
			} );
		}
		var isNumberInHead = deckStringSplit[0].charType == "N";
		var nIndex = null;
		var cIndex = null;
		var wIndex = null;
		var lastNIndex = 0;
		if ( isNumberInHead ){
			var crossMarkUsed = deckStringSplit[1].charType == "B";
			if ( crossMarkUsed ){
				for ( var i = 0 ; i < deckStringSplit.length ; i++ ){
					if ( i < deckStringSplit.length ){
						if ( deckStringSplit[i].charType == "N" ){
							nIndex = i;
							cIndex = null;
							wIndex = null;
						} else if ( deckStringSplit[i].charType == "B" ){
							cIndex = i;
						} else if ( deckStringSplit[i].charType == "W" ){
							wIndex = i;
						}
					}
					if ( nIndex != null && cIndex != null && wIndex != null ){
						var cCount = parseInt( fhConverter.fullToHalf( deckStringSplit[ lastNIndex ].deckString ) );
						var cName = "";
						for ( var ni = lastNIndex+2 ; ni < ( nIndex > lastNIndex ? nIndex : ( wIndex + 1 ) ) ; ni++ ){
							cName += deckStringSplit[ ni ].deckString;
						}
						deckList_names.push( cName.trim() );
						deckList_counts.push( cCount );
						lastNIndex = nIndex;
					}
				}
			}
		} else {
		}
		/*
		for ( var ds = 0 ; ds < deckString.length ; ds++ ){
			var _line = deckString[ds];
			var _cardNames = null;
			var _num = _line.match(/^[0-90123456789]+/);
			if ( _num != null && _num != "" ){
				_cardNames = _line.replace(/^[0-90123456789]+/,"");
			} else {
				_num = _line.match(/[0-90123456789]+$/);
				_cardNames = _line.replace(/[0-90123456789]+$/,"");
			}
			if ( _num == null || _num == "" ){
				continue;
			} else {
				_cardNames = _cardNames.replace( /^[ 　\s\*＊xXｘＸ×]+/g , "" ).replace( /[ 　\s\*＊xXｘＸ×]+$/g , "" ).replace( /(（|\()[^\(\)（）]+(）|\))/g , " " ).split( /[\/|／→]/ );
			}
			_num = parseInt( fhConverter.fullToHalf( _num[0] ) );
			if ( _num <= 0 || _num > 40 ){
				continue;
			}
			for ( var tc = 0 ; tc < _cardNames.length ; tc++ ){
				var _cardName = _cardNames[tc].trim();
				if ( _cardName != "" && !deckList_names.include( _cardName ) ){
					deckList_names.push( _cardName );
					deckList_counts.push( _num );
				}
			}
		}
		*/
		//將原始的卡名/張數轉成查詢器有效的卡名
		var fAndList = parseSimpleListToLocalList( deckList_names, deckList_counts );
		var fuzzyDatas = fAndList.fuzzyDatas;
		var deckListObj = fAndList.deckListObj;
		
		if ( deckListObj.length > 0 ){
			var parseSetMax = 1;
			for ( var i = 0 ; i < setDatas.set.length ; i++ ){
				if ( setDatas.set[i].setCode.indexOf( stringDeckSetCodeHeader ) == 0 ){
					parseSetMax++;
				}
			}
			var parseSetCode = stringDeckSetCodeHeader + parseSetMax;
			var parseSetName = "匯入牌庫#" + parseSetMax;
			
			setDatas.addMap( parseSetCode , parseSetName , true , deckListObj );
			var setCodeSelector = gobi( "setCode" );
			var option = document.createElement('option');
			option.value = parseSetCode;
			option.text = parseSetCode.toUpperCase() + " " + parseSetName;
			option.selected = true;
			setCodeSelector.appendChild( option );
			
			setCodeSelector.onchange();
			query();
			//如果有模糊比對來的卡的話，則要跳出提示訊息
			if ( fuzzyDatas.length > 0 ){
				var alertMsg = translateText( "以下" + fuzzyDatas.length + "張卡不一定為正確對象：\n", isTC2C );
				for ( var i = 0 ; i < fuzzyDatas.length ; i++ ){
					alertMsg += "\n【" + fuzzyDatas[i].tName + "】";
				}
				alert( alertMsg );
			}
		} else {
			alert("Parse Failure!");
		}
	}
	
	//將原始的卡名與張數計算置換成此查詢器有效的資料
	function parseSimpleListToLocalList( deckList_names, deckList_counts ){
		
		var fuzzyDatas = [];
		var deckListObj = [];
		for ( var i = 0 ; i < deckList_names.length ; i++ ){
			var _name = deckList_names[i];
			var _count = deckList_counts[i];
			//如果是超次元超級生物的話，要所有卡牌都有塞才會顯示
			var _data = cardDatas.getDataByName( _name , null , null );
			//如果找到卡、卡名卻不一樣的話，表示是以去除注音的方式找到的，此時要異動輸入卡名
			if ( _data != null && _data.name != _name ){
				_name = _data.name;
			}
			//如果沒找到資料的話，就先用綽號去找
			if ( _data == null ){
				var realName = nickNamesMap.getRealName(_name );
				_data = cardDatas.getDataByName( realName , null , null );
				if ( _data != null ){
					_name = realName;
				}
			}
			//綽號也沒找到的話，就用模糊比對去找
			if ( _data == null ){
				var fuzzyResult = searchForCardByName( _name );
				_data = cardDatas.getDataByName( fuzzyResult , null , null );
				if ( _data != null ){
					//去掉注音跟空白進行前後比對，如果兩者相等的話就當作正確結果
					if ( clearSubName( fuzzyResult ).replace( /[ 　]/g, "" ) != _name.replace( /[ 　]/g, "" ) ){
						fuzzyDatas.push({
							oName : _name,
							tName : fuzzyResult,
						});
					}
					_name = fuzzyResult;
				}
			}
			if ( _data != null && _data.back != null && _data.back instanceof Array && _data.back.length > 1 ){
				//計算超次元超級生物的顯示張數
				var superCretureNum = null;
				for ( var b = 0 ; b < _data.back.length ; b++ ){
					var backIndex = deckList_names.indexOf( _data.back[b] );
					//如果這張組成素材沒有放入的話就不用繼續看了，直接自卡表中移除
					if ( backIndex == -1 ){
						superCretureNum = null;
						break;
					} else if ( superCretureNum == null ){
						superCretureNum = deckList_counts[ backIndex ];
					} else {
						superCretureNum = Math.min( deckList_counts[ backIndex ] , superCretureNum );
					}
				}
				//如果超次元超級生物的元素沒湊齊的話就不列入卡表
				if ( superCretureNum == null ){
					continue;
				}
			}
			deckListObj.push(
				{	count : _count,	name : _name, }
			);
		}
		return {
			fuzzyDatas : fuzzyDatas,		//無法保證一定正確的卡名
			deckListObj : deckListObj,		//本地端有效的卡名與張數
		};
	}
	
	//以ajax方式要求html內容(移除指定tag)
	function doAjax(dmVaultDeckId){
		
		var url = dmVaultDeckId;
		if ( url == null || url == "" ){
			return;
		} else if ( dmVaultDeckId.match(/^deck\d*$/) ){
			url = "http://dmvault.ath.cx/" + dmVaultDeckId + ".html";
			parseDeckFromDMVault( url );
		} else if ( dmVaultDeckId.match(/^\d*$/) ){
			url = "http://dmvault.ath.cx/deck" + dmVaultDeckId + ".html";
			parseDeckFromDMVault( url );
		} else if ( dmVaultDeckId.match(/^http:\/\/dmvault.ath.cx\/deck(\d)*.html$/) ){
			parseDeckFromDMVault( url );
		} else if ( dmVaultDeckId.match( /^http:\/\/dm.takaratomy.co.jp\/capture\// ) ){
			alert( translateText( "此作業將會花比較多的時間，請稍待片刻", isTC2C ) );
			doImportTakaraTomyDeck( dmVaultDeckId );
		} else {
//			parseDeckString( dmVaultDeckId );
			alert("很抱歉！請輸入正確的VaultDeckID或是DM官網牌庫特輯網址！");
		}
	}
	
	//解析DMVault的牌庫
	function parseDeckFromDMVault( url/* , iFrame*/ ){
		var parseDeckList = null;
		var parseSetCode = url.match( /deck\d*/g )[0];
		var parseSetName = parseSetCode;
		//如果這個牌庫已經匯入過了的話就不再匯入了
		if ( setDatas.getSetDatas( parseSetCode ) != null ){
			alert("喔！這個牌庫你匯過囉！");
			setSelectValue( "setCode" , parseSetCode );		
			setCodeSelector.onchange();
			query();
			return;
		}

		//先將卡表列為"匯入中"
		clearListAndSetOneLine( "DMVault資料匯入中…" );
		
		//開始利用跳板向DMVault擷取牌庫資料
		domainParse(
			url,
			(function(){
				return function( container , params ){
					parseDeckList = parseDeck( container );
					var importTitleDIV = container.document.getElementById("titledescription");
					if ( importTitleDIV != null && importTitleDIV.firstChild != null ){
//						parseSetName = importTitleDIV.firstChild.innerText;
						parseSetName = importTitleDIV.firstElementChild.innerText;
					}
					if ( parseDeckList == null ){
					
						clearListAndSetOneLine( "您所查詢的卡牌資料將會顯示在此" );		
						alert("匯入失敗");
						
					} else {

						limitsReset();
					
						setDatas.addMap( parseSetCode , parseSetName , true , parseDeckList );
						var setCodeSelector = gobi( "setCode" );
						var option = document.createElement('option');
						option.value = parseSetCode;
						option.text = parseSetCode.toUpperCase() + " " + parseSetName;
						option.selected = true;
						setCodeSelector.appendChild( option );
						
						setCodeSelector.onchange();
						query();
					}
				};
			})(),
			null,
			(function(){
				return function(){
					alert( "很抱歉，此功能暫時無法運作喔。" );
				};
			})(),
			null
		);
	}

	//去除html碼裡所有的指定tag
	function filterData(data){
		// filter all the nasties out
		// no body tags
		data = data.replace(/<?\/body[^>]*>/g,'');
		// no linebreaks
		data = data.replace(/[\r|\n]+/g,'');
		// no comments
		data = data.replace(/<--[\S\s]*?-->/g,'');
		// no noscript blocks
		data = data.replace(/<noscript[^>]*>[\S\s]*?<\/noscript>/g,'');
		// no script blocks
		data = data.replace(/<script[^>]*>[\S\s]*?<\/script>/g,'');
		// no self closing scripts
		data = data.replace(/<script.*\/>/,'');
		// [... add as needed ...]
		data = data.replace(/<img[^>]*>/g,'');
		// no pic
		return data;
	}
	
	//DMVault的卡名錯誤對照	
	var errorCardNameMap = {
	
		map : [
			{	correct : "蛙跳び　フロッグ", 				error : "蛙飛び　フロッグ",					},
			{	correct : "熱龍爪　メリケン・ハルク", 		error : "熱血爪　メリケン・ハルク",			},
			{	correct : "熱決闘場　バルク・アリーナ", 	error : "熱決決闘場　バルク・アリーナ",		},
			{	correct : "覇闘将龍剣　ガイオウバーン", 	error : "覇闘の将龍剣　ガイオウバーン",		},
			{	correct : "奮戦の精霊龍　デコデッコ・デコリアーヌ・ピッカピカⅢ世", 
															error : "奮戦の精霊龍　デコデッコ・デコリアーヌ・ピッカピカ三世",	
																										},
			{	correct : "霊峰竜騎フジサンダー", 			error : "霊峰竜機フジサンダー",				},
			{	correct : "龍素記号 Sb リュウイーソウ", 	error : "龍素記号　Sb　リューイーソウ",		},
			{	correct : "アクア防御隊 バリアーマー", 		error : "アクア防衛隊　バリアーマー",		},
			{	correct : "無常の破壊者ボネー", 			error : "無情の破壊者ボネー",				},
			{	correct : "時空の司令　コンボイ・トレーラー", 
															error : "時空の指令　コンボイ・トレーラー",	},
			{	correct : "コダマの気合掘り", 				error : "コダマの気合掘",					},
			{	correct : "電波の影　レビーテー", 			error : "電波の影　レービテー",				},
			{	correct : "腐敗の悪魔龍　ラフデジア", 		error : "不敗の悪魔龍　ラフデジア",			},
			{	correct : "真実の聖霊王 レオ・ザ・スター", 	error : "真実の精霊王  レオ・ザ・スター",	},
			{	correct : "アクア・ジェット<突撃・ブラザー!>", 	error : "アクア・ジェット<突撃 ブラザー=\"ブラザー\"/>",	},
			
		],
		
		getCorrectName : function( errName ){
			for ( var i = 0 ; i < this.map.length ; i++ )
				if ( this.map[i].error == errName )
					return this.map[i].correct;
			return errName;
		},
		
		getErrorName : function( correctName ){
			for ( var i = 0 ; i < this.map.length ; i++ )
				if ( this.map[i].correct == correctName )
					return this.map[i].error;
			return correctName;
		},
	};
	//動態取得DMVault聯結
	function getDMVaultLink( cardName , linkType ){
		var jsId = "jqueryJS";
		var jsTag = gobi( jsId );
		if ( jsTag == null ){
			var jqueryUrl = getHTTPHeader() + "://code.jquery.com/jquery-1.11.0.min.js";
			importJavascript( jsId , jqueryUrl , function(){ 
				doGetDMVaultLink( cardName , linkType ); 
			} );
		} else {
			doGetDMVaultLink( cardName , linkType ); 
		}
		
	}
	
	//利用DMVault的查詢功能取得連結
	function doGetDMVaultLink( cardName , linkType ){
		//先把注音拿掉
		cardName = clearSubName( cardName );
		var vid = cardDatas.getDataByName( cardName ).vid;
		if ( vid == null ){
			//轉成DMVault的卡名(因為DMVault的卡名可能有錯)
			cardName = errorCardNameMap.getErrorName( cardName );
			var linkUrl = "http://dmvault.ath.cx/card/?cardtype=%E3%81%99%E3%81%B9%E3%81%A6&civilization=%E3%81%99%E3%81%B9%E3%81%A6&race=%E3%81%99%E3%81%B9%E3%81%A6&power=%E3%81%99%E3%81%B9%E3%81%A6&cost=%E3%81%99%E3%81%B9%E3%81%A6&pks__filter=&expansion=&cardname="+encodeURIComponent(cardName)+"&status=&sortby=%E3%81%AA%E3%81%97";
			domainParse(
				linkUrl,
				(function(){
					return function( container , params ){
						var links = container.document.getElementsByTagName("a");
						var linkResult = false;
						var linkType = params[0];
						for ( var i = 0 ; i < links.length ; i++ ){
							if ( links[i].href.match( /\/card\/\d+/ ) ){
								if ( links[i].innerText.replace(/\//,"").split("／").include(cardName) || 
										links[i].innerHTML.replace(/\//,"").split("／").include(cardName) ){
									var hrefSplit = links[i].href.split("/");
									var parseVID = hrefSplit[ hrefSplit.length - 1 ];
									openDMVaultLink( parseVID , linkType );
									cardDatas.addDMVaultID( cardName , parseVID );
									linkResult = true;
									break;
								}
							}
						}
						if ( !linkResult ){
							alert( "很抱歉，DMVault連結有誤，請通知作者。" );
						}
					};
				})(),
				[ linkType ],
				(function(){
					return function(){
						alert( "很抱歉，此功能暫時無法運作喔。" );
					};
				})(),
				null
			);
		} else {
			openDMVaultLink( vid , linkType );
		}
	}
	
	//指定DMVault的卡牌id與功能連結並前往頁面
	function openDMVaultLink( vid , linkType ){
		if ( vid != null ){
			var vaultLinkUrl = 
				isBlockedByDMVault ? 
				"https://translate.google.com.tw/translate?hl=zh-TW&sl=ja&anno=2&tl=zh-TW&u=http%3A%2F%2Fdmvault.ath.cx%2Fcard%2F" + vid:
				"http://dmvault.ath.cx/card/" + vid;
			var pageURL = null;
			//基本情報
			if ( linkType == 1 ){
			//牌庫
			} else if ( linkType == 2 ) {
				pageURL = "decks.html";
			//評價
			} else if ( linkType == 3 ) {
				pageURL = "evaluations.html";
			//FAQ
			} else if ( linkType == 4 ) {
				pageURL = "faqs.html";
			//Combo
			} else if ( linkType == 5 ) {
				pageURL = "combos.html";
			//Link
			} else if ( linkType == 6 ) {
				pageURL = "links.html";
			//Auction
			} else if ( linkType == 7 ) {
				pageURL = "yahooauction.html";
			//預設為基本情報
			} else {
			}
			window.open( vaultLinkUrl + ( pageURL == null ? "" : ( isBlockedByDMVault ? "%2F" : "/" ) + pageURL ) , "_blank" );
		}
	}
	
	//將DMVault的資料轉為LocalData格式
	function parseCDataFromDMVault( cContainer ){
		var rtnCDatas = {};
		//卡名
		rtnCDatas.cardName = cContainer.document.getElementsByTagName("h1")[0].innerText.split(/\s/g)[0];
		var tableObjs = cContainer.document.getElementsByTagName("table");
		for ( var tc = 0 ; tc < tableObjs.length ; tc++ ){
			if ( tableObjs[tc].className != null && tableObjs[tc].className.indexOf("zz_table_") != -1 ){
				//種族
				rtnCDatas.race = tableObjs[tc].firstChild.childNodes[2].lastChild.innerText.trim().split("/");
				//能力
				var abText = tableObjs[tc].firstChild.childNodes[5].lastChild.innerText.trim().replace(/^■/,"");
				var powerPlus = false;
				if ( 
						( abText.indexOf( "ハンティング" ) != -1 ) || 
						( abText.indexOf( "+" ) != -1 ) || 
						( abText.indexOf( "＋" ) != -1 ) ||
						( rtnCDatas.race.includeLike( "ゴッド" ) )
						){
					powerPlus = true;
				}
				rtnCDatas.sp = abText.split("■");
				//文明
				var civilStrs = tableObjs[tc].firstChild.childNodes[1].lastChild.innerText.trim();				
				rtnCDatas.civil = 0;
				if ( civilStrs.indexOf("自然") != -1 )
					rtnCDatas.civil += 1;
				if ( civilStrs.indexOf("火") != -1 )
					rtnCDatas.civil += 2;
				if ( civilStrs.indexOf("闇") != -1 )
					rtnCDatas.civil += 4;
				if ( civilStrs.indexOf("水") != -1 )
					rtnCDatas.civil += 8;
				if ( civilStrs.indexOf("光") != -1 )
					rtnCDatas.civil += 16;
				//種類
				var pageText = tableObjs[tc].firstChild.childNodes[0].lastChild.innerText.trim();
				var setTypeValue = cardTypeMapping.getObjByJap( pageText );
				if ( setTypeValue != null ){
					setTypeValue = setTypeValue.value;
				} else {
					setTypeValue = "";
				}
				rtnCDatas.type = setTypeValue;
				if ( setTypeValue.indexOf("C") == -1 ){
					powerPlus = false;
				}
				//攻擊力
				var powerStr = tableObjs[tc].firstChild.childNodes[3].lastChild.innerText.trim();
				if ( powerStr != "" ){
					rtnCDatas.power = parseInt( powerStr );
					if ( powerPlus ){
						rtnCDatas.pc = true;
					}
				}
				//消費
				rtnCDatas.cost = parseInt( tableObjs[tc].firstChild.childNodes[4].lastChild.innerText.trim() );
				return rtnCDatas;
			}
		}
		return null;
	}
	
	//取得指定GATHE的圖片MAP
	var gathePicMaps = [
	];
	function getPicsMapFromGathe( container ){
		var links = container.document.getElementsByTagName("a");
		for ( var i = 0 ; i < links.length ; i++ ){
			if ( links[i].href.match( /^.*\/[a-zA-Z0-9_\-]+\.jpg$/ ) ){
				var words = links[i].innerText;
				if ( words.match( /^[上中下]$/ ) )
					continue;
				if ( words == "右上" )
					continue;
				if ( words == "右中間" )
					continue;
				if ( words == "左上" )
					continue;
				if ( words == "左中間" )
					continue;
				var isDuplicate = false;
				for ( var p = 0 ; p < gathePicMaps.length ; p++ ){
					if ( gathePicMaps[p].cName == words ){
						isDuplicate = true;
						break;
					}
				}
				if ( !isDuplicate ){
					gathePicMaps.push({
						cLink : links[i].href.replace( /^.*\/([a-zA-Z0-9_\-]+)\.jpg$/ ,"$1"),
						cName : words,
					});
				}
			}
		}
	}

	function price(){

		var theSet = setDatas.getSetDatas( lastSelectedSetCode );
		if ( theSet == null || !theSet.isDeck ){
			priceBtnInit( "" );
			alert("Not A Deck!!");
			return;
		}
		
		var listCardNCs = "";
		for ( var i = 0 ; i < theSet.setCards.length ; i++ ){
			listCardNCs += ( i == 0 ? "" : "," ) + clearSubName( theSet.setCards[i].name ) + "," + theSet.setCards[i].count;
		}
		priceBtnInit( listCardNCs );

		gobi("priceBtn").disabled = true;

		var jsId = "jqueryJS";
		var jsTag = gobi( jsId );
		var alertMsg = translateText( promptHint, isTC2C );
		if ( jsTag == null ){
			var jqueryUrl = getHTTPHeader() + "://code.jquery.com/jquery-1.11.0.min.js";
			importJavascript( jsId , jqueryUrl , function(){ 
				doPrice();
			} );
		} else {
			doPrice();
		}
	}
	function doPrice(){
		var priceBtn = gobi("priceBtn");
		var targetCNames = priceBtn.getAttribute( "listCardNCs" ).split(",");
		var noDataCNames = priceBtn.getAttribute( "noData" );
		if ( targetCNames.length == 1 ){
			alert( "估價完成" + ( noDataCNames != "" ? "，不過以下卡牌查無拍賣資料：\n\n" + noDataCNames : "" ) );
			priceBtn.disabled = false;
		} else {
			var cardName = targetCNames[ targetCNames.length - 2 ];
			var cardCount = targetCNames[ targetCNames.length - 1 ];
			var cData = cardDatas.getDataByName( cardName );
			var vid = cData == null ? null : cData.vid;
			if ( vid == null ){
				var linkUrl = "http://dmvault.ath.cx/card/?cardtype=%E3%81%99%E3%81%B9%E3%81%A6&civilization=%E3%81%99%E3%81%B9%E3%81%A6&race=%E3%81%99%E3%81%B9%E3%81%A6&power=%E3%81%99%E3%81%B9%E3%81%A6&cost=%E3%81%99%E3%81%B9%E3%81%A6&pks__filter=&expansion=&cardname="+encodeURIComponent(cardName)+"&status=&sortby=%E3%81%AA%E3%81%97";
				domainParse(
					linkUrl,
					(function(){
						return function( container , params ){
							var links = container.document.getElementsByTagName("a");
							var linkResult = false;
							var cardName = params[0];
							var cardCount = params[1];
							for ( var i = 0 ; i < links.length ; i++ ){
								if ( links[i].href.match( /\/card\/\d+/ ) && ( links[i].innerText.split("／").include(cardName) ) ){
									var hrefSplit = links[i].href.split("/");
									var parseVID = hrefSplit[ hrefSplit.length - 1 ];
									cardDatas.addDMVaultID( cardName , parseVID );
									calcCardPrice( parseVID , cardCount );
									linkResult = true;
									break;
								}
							}
							if ( !linkResult ){
								//無資料
								popPrice( null );
//								calcError( "很抱歉，無法查得[" + cardName + "]的資料。" );
							}
						};
					})(),
					[ cardName, cardCount ],
					(function(){
						return function( params ){
							var cardName = params[0];
							calcError( "很抱歉，查詢[" + cardName + "]資料時無法成功運作。" );
						};
					})(),
					[ cardName ]
				);
			} else {
				calcCardPrice( vid , cardCount );
			}
		}
	}
	
	function setPriceHint( name, price ){
	}
	
	function calcError( errMsg ){
		if ( confirm( errMsg + "請問是否繼續嘗試？" ) ){
			doPrice();
		} else {
			gobi("priceBtn").disabled = false;
		}
	}
	
	function calcCardPrice( parseVID, count ){
		var priceLink = "http://dmvault.ath.cx/card/" + parseVID + "/yahooauction.html";
		var listCardNCs = gobi("priceBtn").getAttribute( "listCardNCs" ).split(",");
		domainParse(
			priceLink,
			(function(){
				return function( container , params ){
					/*
					var priceBtn = gobi("priceBtn");
					var listCardNCs = priceBtn.getAttribute( "listCardNCs" ).split(",");

					var _priceSpan = container.document.getElementById("unitprice");
					var _price = 0;
					if ( _priceSpan != null ){
						_price = parseInt( _priceSpan.innerText ) * count;
					} else {
						//無資料
						if ( _price == 0 ){
							var noData = priceBtn.getAttribute( "noData" );
							noData += ( noData == "" ? "" : "," ) + listCardNCs[ listCardNCs.length - 2 ];
							priceBtn.setAttribute( "noData", noData );
						}
					}
					var deckPrice = parseInt( priceBtn.getAttribute("deckPrice") );
					deckPrice += _price;
					priceBtn.setAttribute( "deckPrice", deckPrice );
					priceBtn.value = "估價("+( listCardNCs.length/2-1 )+"/$"+deckPrice+")";
					var returnList = "";
					for ( var i = 0 ; i < listCardNCs.length-2 ; i++ ){
						returnList += ( i == 0 ? "" : "," ) + listCardNCs[i];
					}
					priceBtn.setAttribute( "listCardNCs", returnList );
					*/
					var _priceSpan = container.document.getElementById("unitprice");
					if ( _priceSpan != null ){
						popPrice( parseInt( _priceSpan.innerText ) * count );
					} else {
						popPrice( null );
					}
					doPrice();
				};
			})(),
			null,
			(function(){
				return function( params ){
					var cardName = params[0];
					calcError( "無法成功取得[" + cardName + "]的價格資料。" );
				};
			})(),
			[ listCardNCs[ listCardNCs.length-2 ] ]
		);
	}

	//自動匯入GATHE的卡表
	function parseGathe( pageName ){
		if ( pageName == null ){
			return;
		} else {
			domainParse(
				"http://gathe.jp/" + pageName + ".html",
				(function(){
					return function( container , params ){
						var links = container.document.getElementsByTagName("a");
						var pDatas = [];
						for ( var i = 0 ; i < links.length ; i++ ){
							if ( links[i].href.match( /^.*\/[a-zA-Z0-9_\-]+\.jpg$/ ) ){
								var words = links[i].innerText;
								if ( words.match( /^[上中下]$/ ) )
									continue;
								if ( words == "右上" )
									continue;
								if ( words == "右中間" )
									continue;
								if ( words == "左上" )
									continue;
								if ( words == "左中間" )
									continue;
								var isDuplicate = false;
								for ( var p = 0 ; p < pDatas.length ; p++ ){
									if ( pDatas[p].cName == words ){
										isDuplicate = true;
										break;
									}
								}
								if ( !isDuplicate ){
									pDatas.push({
										cLink : links[i].href.replace( /^.*\/([a-zA-Z0-9_\-]+)\.jpg$/ ,"$1"),
										cName : words,
									});
								}
							}
						}
						addData( pDatas.length );
						var noTexts = gosbn("cno");
						var nameTexts = gosbn("cname");
						var abTexts = gosbn("cab");
						var addCount = pDatas.length;
						var replaceMap = [
							/\s/g , "",
							/！/g ,"!",
							/「/g ,"｢",
							/」/g ,"｣",
						];
						for ( var i = 0 ; i < pDatas.length ; i++ ){
							var gCName = pDatas[i].cName.replace( / / , "　" ).replace( /＝/ , "=" ).replace( /！/ , "!" );
							var gCNo = pDatas[i].cLink.replace( /DM(D|X|R|C)-?/ , "" ).replace( /dm(d|x|r|c)-?/ , "" ).replace( /Y\d+/ , "" ).replace( /y\d+/ , "" );
							noTexts[i].value = gCNo;
							nameTexts[i].value = gCName;
							abTexts[i].value = "###";
							var targetIndex = -1;
							for ( var m = 0 ; m < cardDatas.map.length && targetIndex == -1 ; m++ ){
								var mName = cardDatas.map[m].name;
								var compareMCName = clearSubName( mName );
								var compareGCName = clearSubName( gCName );
								for ( var rm = 0 ; rm < replaceMap.length ; rm+=2 ){
									compareMCName = compareMCName.replace( replaceMap[rm], replaceMap[rm+1] );
									compareGCName = compareGCName.replace( replaceMap[rm], replaceMap[rm+1] );
								}
								if ( compareMCName == compareGCName ){
									targetIndex = m;
								}
							}
							if ( targetIndex != -1 ){
								nameTexts[i].value = cardDatas.map[ targetIndex ].name;
								abTexts[i].value = "";
								addCount--;
							}
						}
						alert( "共計" + pDatas.length + "筆、需新增" + addCount + "筆資料" );
					};
				})(),
				null,
				(function(){
					return function(){
					};
				})(),
				null
			);
		}
	}

	var isBlockedByDMVault = getParameter("BbV") == "1";
	/*
	function checkBlockedStatus(){
		$.getJSON( 
			"http://dmvault.ath.cx",
			(function(){
				return function( data ){
					var dataResult = data.results[0];
					if( dataResult ){
						alert("S");
					} else if ( fMd != null ){
						isBlockedByDMVault = true;
						alert("E");
					}
				}
			})()
		);
	}
	*/
