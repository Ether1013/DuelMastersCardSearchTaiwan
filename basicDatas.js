	//卡牌資料
	var cardDatas = {
	
		//資料集合
		map : [
		],
		
		//取得list
		getList : function( setCode ){
		
			if ( setCode == null ){
				return this.map;
			} else {
			
				var setCards = [];
				var setData = setDatas.getSetDatas( setCode );
				if ( setData != null ){
					setCards = setData.setCards;
				}
				var rtnList = [];
				for ( var i = 0 ; i < setCards.length ; i++ ){
					var cardData = cardDatas.getDataByName( setCards[i].name , setCode );
					if ( cardData != null ){
						rtnList.push( cardData );
					}
				}
			}
			return rtnList;
		},
		
		//增加資料
		addMap : function( jsDatas ){
			if ( jsDatas != null ){
				for ( var i = 0 ; i < jsDatas.length ; i++ ){
					
					//增加debugMode
					if ( debugMode.length > 0 && !debugMode.include( jsDatas[i].name ) ){
						continue;
					}
					
					if ( jsDatas[i].race != null && jsDatas[i].race.length == 1 ){
						jsDatas[i].race = jsDatas[i].race[0].split("/");
					}
					if ( jsDatas[i].type != null ){
						jsDatas[i].type = jsDatas[i].type.split("/");
					} else if ( jsDatas[i].wData != null ){
						for ( var w = 0 ; w < jsDatas[i].wData.length ; w++ ){
							jsDatas[i].wData[w].type = jsDatas[i].wData[w].type.split("/");
						}
					}
					this.map.push( jsDatas[i] );
				}
			}
		},
		
		//動態增加DMVault連結資料
		addDMVaultID : function( name , vid ){
			for ( var i = 0 ; i < this.map.length ; i++ ){	
				//去掉注音之後符合也允許
				if ( ( this.map[i].name == name ) || ( clearSubName( this.map[i].name ) == name ) ){
					this.map[i].vid = vid;
					break;
				}
			}
		},
		
		//用卡名找出資料
		getDataByName : function( name , setCode , aaIndex, udIndex ){
			//判斷有沒有指定set以及set資料
			var setData = null;
			if ( setCode != null ){
				setData = setDatas.getSetDatas( setCode );
			}
			for ( var i = 0 ; i < this.map.length ; i++ ){	
				//去掉注音之後符合也允許
				if ( ( this.map[i].name == name ) || ( clearSubName( this.map[i].name ) == name ) ){
					var rtn = null;
					if ( setData != null ){
						var cardDataInSet = setData.getCardData( name , aaIndex );
						if ( cardDataInSet != null ){
//							return cloneCardData( this.map[i] , cardDataInSet );
							rtn = cloneCardData( this.getSelectedCardByUdIndex( this.map[i], udIndex ) , cardDataInSet );
						}
					}
//					return this.map[i];
					if ( rtn == null ){
						rtn = this.getSelectedCardByUdIndex( this.map[i], udIndex );
					}
					//如果原始資料沒有卡圖的話，就去SET資料裡面找專屬卡圖
					if ( rtn != null && lastSelectedSetCode == null && rtn.pic == "" ){
						for ( var s = 0 ; s < setDatas.map.length ; s++ ){
							for ( var c = 0 ; c < setDatas.map[s].length ; c++ ){
								var tdis = (setDatas.map[s])[c];
								var sps = tdis.pic instanceof Array ? tdis.pic : [ tdis.pic ];
								for ( var p = 0 ; p < sps.length ; p++ ){
									if ( tdis.name == rtn.name && sps[p] != null && sps[p] != "" ){
										rtn.pic = sps[p];
										c = setDatas.map[s].length-1;
										s = setDatas.map.length-1;
										break;
									}
								}
							}
						}
					}
					return rtn;
				}
			}
			return null;
		},
		
		getSelectedCardByUdIndex : function( mapData, udIndex ){
			if ( mapData.wData != null && udIndex == null ){
				udIndex = 0;
			}
			if ( udIndex != null && udIndex >= 0 && mapData.wData != null && mapData.wData.length > 0 && udIndex < mapData.wData.length ){
				var rtnData = clone( mapData.wData[ udIndex ] );
				rtnData.name = mapData.name;
				rtnData.pic = mapData.pic;
				rtnData.mana = mapData.mana;
				rtnData.mType = mapData.mType;
				rtnData.ws = [];
				for ( var w = 0 ; w < mapData.wData.length ; w++ ){
					rtnData.ws.push( mapData.wData[w].type );
				}
				return rtnData;
			} else {
				return mapData;
			}
		},
		
		pictureHeightOdWidth : 1.4,
		
	};
	
	//牌庫/SET資料
	var setDatas = {
	
		set : [
/*		
		{
			setCode : "",
			setName : "",
		},
*/
		],

		map : [
/*
		{
			name : "",
			pic : "",
			flavor : "",
			id : "",
		},
*/
		],
		
		//增加資料
		addMap : function( setCode , setName , isDeck , setDatas , isListSkip , optionColor, isTWSurroundings ){
			if ( setCode != null && setDatas != null ){
				var setObj = {
					setCode : setCode,
					setName : setName,
					isDeck : isDeck,
					optionColor : optionColor,
					isListSkip : ( isListSkip == null ? false : isListSkip ),
					isTWSurroundings : isTWSurroundings,
				};
				this.set.push( setObj );
				this.map.push( setDatas );
				//如果是台灣環境的話，就把卡名記起來
				if ( isTWSurroundings ){
					twsdSets.push( setCode );
					for ( var m = 0 ; m < setDatas.length ; m++ ){
						var cardName = setDatas[m].name;
						if ( !twsdCards.include( cardName ) ){
							twsdCards.push( cardName );
						}
					}
				}
			}
		},
		
		//用SetCode找出系列資料
		getSetDatas : function( setCode ){
			
			for ( var i = 0 ; i < this.set.length ; i++ ){
				if ( this.set[i].setCode == setCode ){
					return {
						setCode : this.set[i].setCode,
						setName : this.set[i].setName,
						isDeck : this.set[i].isDeck,
						isListSkip : this.set[i].isListSkip,
						setCards : this.map[i],
						//判斷指定卡名是否存在於此set中
						includeCardName : function( cardName ){
							return this.getCardIndex( cardName ) != -1;
						},
						//取得指定卡名Index
						getCardIndex : function( cardName ){
							for ( var c = 0 ; c < this.setCards.length ; c++ ){
								if ( this.setCards[c].name == cardName ){
									return c;
								}
							}
							return -1;
						},
						//取得指定卡名資料
						getCardData : function( cardName , aaIndex ){
							var index = this.getCardIndex( cardName );
							if ( index == -1 ){
								return null;
							} else {
								var rtnData = clone( this.setCards[ index ] );
								//追加總版本數
								rtnData.idSize = ( rtnData.id instanceof Array ) ? rtnData.id.length : 1;
								if ( rtnData.id instanceof Array ){
									if ( aaIndex == null || aaIndex < 0 || aaIndex > rtnData.id.length ){
										aaIndex = 0;
									}
									aaIndex = parseInt( aaIndex );
									if ( aaIndex > 0 ){
										rtnData.lastAAIndex = aaIndex - 1;
									}
									if ( aaIndex < rtnData.id.length - 1 ){
										rtnData.nextAAIndex = aaIndex + 1;
									}
									rtnData.id = rtnData.id[aaIndex];
									rtnData.flavor = rtnData.flavor[aaIndex];
									rtnData.pic = rtnData.pic[aaIndex];
								}
								return rtnData;
							}
//							return index == -1 ? null : this.setCards[ index ];
						},
					};
				}
			}
			return null;
			
		},
		
		//取得指定SET的指定卡牌資料
		getCardDataInSet : function( setCode , cardName ){
		
			if ( setCode != null && cardName != null ){
				var setData = this.getSetDatas( setCode );
				if ( setData != null ){
					setCards = setData.setCards;
				}
				for ( var i = 0 ; i < setCards.length ; i++ ){
					if ( setCards[i].name == cardName ){
						return setCards[i];
					}
				}
			}
			return null;
		},
	};
	
	//文明資料
	var civilMapping = {
	
		//資料集合
		map : 
			[
				{	value : 16,	text : "光文明",			eText : "Light",	headerPic : "card_list_header_light.gif",	dvBGColor : "#FEF0A0",	},
				{	value : 8,	text : "水文明",			eText : "Water",	headerPic : "card_list_header_water.gif",	dvBGColor : "#8BD1F8",	},
				{	value : 4,	text : "闇文明",			eText : "Darkness",	headerPic : "card_list_header_dark.gif",	dvBGColor : "#BBB7B7",	},
				{	value : 2,	text : "火文明",			eText : "Fire",		headerPic : "card_list_header_fire.gif",	dvBGColor : "#E8747D",	},
				{	value : 1,	text : "自然文明",			eText : "Nature",	headerPic : "card_list_header_nature.gif",	dvBGColor : "#8BCF8D",	},
				{	value : 32,	text : "無色文明",			eText : "Zero",		headerPic : "card_list_header_zero.gif",	dvBGColor : "#ffffff",	},
//				{	value : 16,	text : "光文明",			eText : "Light",	headerPic : "card_list_header_light.gif",	dvBGColor : "#ffffcc",	},
//				{	value : 8,	text : "水文明",			eText : "Water",	headerPic : "card_list_header_water.gif",	dvBGColor : "#ccffff",	},
//				{	value : 4,	text : "闇文明",			eText : "Darkness",	headerPic : "card_list_header_dark.gif",	dvBGColor : "#cccccc",	},
//				{	value : 2,	text : "火文明",			eText : "Fire",		headerPic : "card_list_header_fire.gif",	dvBGColor : "#ffcecc",	},
//				{	value : 1,	text : "自然文明",			eText : "Nature",	headerPic : "card_list_header_nature.gif",	dvBGColor : "#ccffd0",	},
//				{	value : 32,	text : "無色文明",			eText : "Zero",		headerPic : "card_list_header_zero.gif",	dvBGColor : "#ffffff",	},
			],

		//用單一文明代碼取得文明資料
		getDataByValue : function( value ){
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].value == value ){
					return this.map[i];
				}
			}
			return null;
		},
		
		//用文明代碼取得所有文明資料
		getDatasByValue : function( value ){
			var rtnCivils = [];
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( 
						( value == 0 && this.map[i].value == value ) || 
						( value > 0 && ( ( this.map[i].value & value ) > 0 ) ) 
					){
					rtnCivils.push( this.map[i] );
				}
			}
			return rtnCivils;
		},
			
		//用文明代碼取得對應中文文明
		getTextByValue : function( value ){
			var theDatas = this.getDatasByValue( value );
			if ( theDatas == null ){
				return "";
			} else {
				var rtnChis = "";
				for ( var i = 0 ; i < theDatas.length ; i++ ){
					rtnChis += ( i > 0 ? " / " : "" ) + theDatas[i].text;
				}
				return rtnChis;
			}
		},
		
		//用日文取得文明
		getValueByText : function( value ){
			var rtn = 0;
			value = value.split( /[\/,]/g );
			for ( var t = 0 ; t < value.length ; t++ ){
				if ( value[t] == "光" )
					rtn += 16;
				if ( value[t] == "水" )
					rtn += 8;
				if ( value[t] == "闇" )
					rtn += 4;
				if ( value[t] == "火" )
					rtn += 2;
				if ( value[t] == "自然" )
					rtn += 1;
			}
			if ( rtn == 0 )
				rtn = 32;
			return rtn;
		},
			
		//取得該文明的資料標頭圖片
		getHeaderPicByValue : function( value ){
			var theData = this.getDataByValue( value );
			return theData == null ? "card_list_header_rainbow.jpg" : theData.headerPic;
		},
		
		//取得DMVault的卡圖背景連結(需給檔名)
		getDMVaultListURL : function( picName ){
			return "http://dmvault.ath.cx/images/" + picName + ".gif";
		},
		
		//取得動態背景漸層CSS
		getBackgroundCSS : function( value ){
			var civils = this.getDatasByValue( value );
			if ( civils == null || civils.length == 0 )
				civils = [ { dvBGColor : "#FFFFFF" } ];
			if ( civils.length == 1 ){
				civils.push( civils[0] );
			}
			var rtn = "";
			rtn += backgroundImageHeader + "linear-gradient( -45deg, ";
			for ( var i = 0 ; i < civils.length ; i++ ){
				rtn += ( i > 0 ? "," : "" ) + civils[i].dvBGColor + " " + ( Math.floor( 100 * i / ( civils.length - 1 ) ) ) + "%";
			}
 			rtn += ")";
			/*
			background: #ff0000; // Old browsers
			background: -moz-linear-gradient(-45deg,  #ff0000 0%, #ff0505 25%, #ff0000 50%, #ff0000 75%, #ff0000 100%); / FF3.6-15
			background: -webkit-linear-gradient(-45deg,  #ff0000 0%,#ff0505 25%,#ff0000 50%,#ff0000 75%,#ff0000 100%); // Chrome10-25,Safari5.1-6
			background: linear-gradient(135deg,  #ff0000 0%,#ff0505 25%,#ff0000 50%,#ff0000 75%,#ff0000 100%); // W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+
			filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#ff0000', endColorstr='#ff0000',GradientType=1 ); // IE6-9 fallback on horizontal gradient
			*/
			return rtn;
		}
	};
	
	//單色列表
	var singleColors = [];
	for ( var c = 0 ; c < civilMapping.map.length ; c++ ){
		singleColors.push( civilMapping.map[c].value );
	}
	
//	var takaratomyRarityPicRoot = "http://dm.takaratomy.co.jp/card/list/images/newstyle/";
	var takaratomyRarityPicRoot = "http://dm.takaratomy.co.jp/wp-content/uploads/";
	//稀有度卡圖
	var rarityPic = {
		map : 
		/*
			[
				{	rarity : "VVC", 	pic : [ "victory_w" , "victory_w" ],},
				{	rarity : "VC", 		pic : "victory_w",					},
				{	rarity : "SR", 		pic : "superrare_w",				},
				{	rarity : "VR", 		pic : "veryrare_w",					},
				{	rarity : "R", 		pic : "rare_w",						},
				{	rarity : "UC", 		pic : "uncommon_w",					},
				{	rarity : "C", 		pic : "common_w",					},
			],
		*/
			[
				{	rarity : "OR", 																},
				{	rarity : "KGM", 															},
				{	rarity : "MHZ", 															},
				{	rarity : "MAS", 															},
				{	rarity : "FL", 		pic : "card_list_kindan_w",								},
				{	rarity : "L", 		pic : "card_list_legend_w",								},
				{	rarity : "VVC", 	pic : [ "card_list_victory_w" , "card_list_victory_w" ],},
				{	rarity : "VC", 		pic : "card_list_victory_w",							},
				{	rarity : "SR", 		pic : "card_list_superrare_w",							},
				{	rarity : "VR", 		pic : "card_list_veryrare_w",							},
				{	rarity : "R", 		pic : "card_list_rare_w",								},
				{	rarity : "UC", 		pic : "card_list_uncommon_w",							},
				{	rarity : "C", 		pic : "card_list_common_w",								},
				{	rarity : "", 																},
			],
		
			
		//取得稀有度卡圖陣列(IMG TAG)
		getRarityPicture : function( rarity ){
			var results = [];
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].rarity == rarity ){
					if ( this.map[i].pic == null )
						break;
					var pics = ( this.map[i].pic instanceof Array ) ? this.map[i].pic : [ this.map[i].pic ];
					for ( var p = 0 ; p < pics.length ; p++ ){
						var img = document.createElement('img');
						img.src = takaratomyRarityPicRoot + pics[p] + ".gif";
						results.push( img );
					}
					break;
				}
			}
			return results;
		},
	};
	
	//卡片種類
	var cardTypeMapping = {
	
		map : 
			[
				{	value : "C",	text : "生物",				Jap : "クリーチャー",						Location : "M", horizontal : false,								main:true,	},
				{	value : "EC",	text : "進化生物",			Jap : "進化クリーチャー",						Location : "M", horizontal : false,	parents: [ "C" ], 			main:true,	},
				{	value : "SEC",	text : "星進化生物",			Jap : "スター進化クリーチャー",					Location : "M", horizontal : false,	parents: [ "EC" ],			main:true,	},
				{	value : "SMEC",	text : "S-MAX進化生物",		Jap : "S-MAX進化クリーチャー",				Location : "M", horizontal : false,	parents: [ "EC" ],			main:false,	},
				{	value : "NC",	text : "NEO生物",			Jap : "NEOクリーチャー",						Location : "M", horizontal : false,	parents: [ "C" ],			main:true,	descript : "當此生物下方有生物卡牌時，則將此生物視為進化生物"															},
				{	value : "NDC",	text : "NEO夢幻生物",			Jap : "NEOドリーム・クリーチャー",				Location : "M", horizontal : false,	parents: [ "NC", "DC" ],	main:false,	descript : "當此生物下方有生物卡牌時，則將此生物視為NEO進化生物，且我方場上同名生物只能存在一隻的特別生物"						},
				{	value : "GNC",	text : "G-NEO生物",			Jap : "G-NEOクリーチャー",					Location : "M", horizontal : false,	parents: [ "NC" ],			main:true,	descript : "當此生物下方有生物卡牌時，則將此生物視為NEO進化生物"														},
				{	value : "GNDC",	text : "G-NEO夢幻生物",		Jap : "G-NEOドリーム・クリーチャー",				Location : "M", horizontal : false,	parents: [ "GNC", "DC" ],	main:false,	descript : "當此生物下方有生物卡牌時，則將此生物視為NEO進化生物，且我方場上同名生物只能存在一隻的特別生物"						},
				{	value : "DC",	text : "夢幻生物",			Jap : "ドリーム・クリーチャー",					Location : "M", horizontal : false,	parents: [ "C" ],			main:true,	descript : "我方場上同名生物只能存在一隻的特別生物"																	},
				{	value : "EDC",	text : "進化夢幻生物",		Jap : "進化ドリーム・クリーチャー",				Location : "M", horizontal : false,	parents: [ "EC", "DC" ],	main:false,	descript : "我方場上同名生物只能存在一隻的特別生物"																	},
				{	value : "GRC",	text : "GR生物",				Jap : "GRクリーチャー",						Location : "G", horizontal : false,	parents: [ "C" ],			main:false,	},
				{	value : "NGRC",	text : "NEO GR生物",			Jap : "NEO GRクリーチャー",					Location : "G", horizontal : false,	parents: [ "GRC", "NC" ],	main:false,	descript : "當此生物下方有生物卡牌時，則將此生物視為NEO進化生物"														},
				{	value : "S",	text : "咒文",				Jap : "呪文",							Location : "M", horizontal : false,								main:true,	},
				{	value : "CA",	text : "城",					Jap : "城",								Location : "M", horizontal : false,								main:false,	},
				{	value : "HF",	text : "幸福領域",			Jap : "幸せのフィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "CG",	text : "交叉武裝",			Jap : "クロスギア",							Location : "M", horizontal : false,								main:false,	descript : "裝備，第一次支付費用時僅出現在戰鬥場上，再次支付費用即可裝備在生物身上。即便裝備此卡的生物離場時、此卡依然會留在場上"	},
				{	value : "PCG",	text : "精神交叉武裝",		Jap : "サイキック・クロスギア",					Location : "P", horizontal : false,	parents: [ "CG" ],			main:false,	descript : "精神裝備，支付費用即可裝備在生物身上。即便裝備此卡的生物離場時、此卡依然會留在場上"								},
				{	value : "DHW",	text : "龍心武裝",			Jap : "ドラグハート・ウエポン",					Location : "P", horizontal : false,	parents: [ "DH" ],			main:false,	},
				{	value : "DHC",	text : "龍心生物",			Jap : "ドラグハート・クリーチャー",					Location : "P", horizontal : false,	parents: [ "C", "DH" ],		main:false,	},
				{	value : "EDHC",	text : "進化龍心生物",		Jap : "進化ドラグハート・クリーチャー",				Location : "P", horizontal : false,	parents: [ "EC", "DHC" ],	main:false,	},
				{	value : "DHF",	text : "龍心要塞",			Jap : "ドラグハート・フォートレス",					Location : "P", horizontal : true,	parents: [ "DH" ],			main:false,	},
				{	value : "XC",	text : "放浪生物",			Jap : "エグザイル・クリーチャー",					Location : "M", horizontal : false,	parents: [ "C" ],			main:false,	},
				{	value : "EXC",	text : "進化放浪生物",		Jap : "進化エグザイル・クリーチャー",				Location : "M", horizontal : false,	parents: [ "EC", "XC" ],	main:false,	},
				{	value : "PC",	text : "精神生物",			Jap : "サイキック・クリーチャー",					Location : "P", horizontal : false,	parents: [ "C" ],			main:true,	},
				{	value : "EPC",	text : "精神進化生物",		Jap : "進化サイキック・クリーチャー",				Location : "P", horizontal : false,	parents: [ "EC", "PC" ],	main:false,	},
				{	value : "SPC",	text : "精神超級生物",		Jap : "サイキック・スーパー・クリーチャー",			Location : "P", horizontal : false,	parents: [ "PC" ],			main:false,	},
				{	value : "D2F",	text : "D2領域",				Jap : "D2フィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "HTF",	text : "歷史領域",			Jap : "ヒストリック・フィールド",					Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "WDF",	text : "奇觀領域",			Jap : "WDフィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "LF",	text : "月神領域",			Jap : "ルナティック・フィールド",					Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "T2F",	text : "T2領域",				Jap : "T2フィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "DF",	text : "龍領域",				Jap : "ドラゴニック・フィールド",					Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "DMF",	text : "DM領域",				Jap : "DM・フィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "DGF",	text : "DG領域",				Jap : "DGフィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "FF",	text : "禁斷領域",			Jap : "禁断フィールド",						Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "FeF",	text : "妖精領域",			Jap : "フェアリー・フィールド",					Location : "M", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "SI",	text : "禁斷的鼓動",			Jap : "禁断の鼓動",						Location : "M", horizontal : false,								main:false,	},
				{	value : "SC",	text : "禁斷生物",			Jap : "禁断クリーチャー",						Location : "M", horizontal : false,	parents: [ "C" ],			main:false,	},
				{	value : "FSC",	text : "最終禁斷生物",		Jap : "最終禁断クリーチャー",					Location : "I", horizontal : false,	parents: [ "SC" ],			main:false,	},
				{	value : "FFF",	text : "最終禁斷領域",		Jap : "最終禁断フィールド",					Location : "I", horizontal : true,	parents: [ "FF" ],			main:false,	},
				{	value : "MF",	text : "無月領域",			Jap : "無月フィールド",						Location : "M", horizontal : true,								main:false,	},
				{	value : "TS",	text : "魂種",				Jap : "タマシード",							Location : "M", horizontal : false,								main:true,	},
				{	value : "KCL",	text : "王的靈核",			Jap : "キング・セル",						Location : "M", horizontal : false,								main:false,	},
				{	value : "KC",	text : "王生物",				Jap : "キング・クリーチャー",					Location : "M", horizontal : false,								main:false,	},
				{	value : "OA",	text : "自靈氣",				Jap : "オレガ・オーラ",						Location : "M", horizontal : true,								main:false,	},
				{	value : "MA",	text : "神器",				Jap : "Mono Artifact",					Location : "M", horizontal : false,								main:false,	},
				{	value : "LD",	text : "土地",				Jap : "土地",							Location : "M", horizontal : false,								main:false,	},
				{	value : "PF",	text : "精神領域",			Jap : "サイキック・フィールド",					Location : "P", horizontal : true,	parents: [ "F" ],			main:false,	},
				{	value : "RP",	text : "規則追加",			Jap : "ルール・プラス",						Location : "P", horizontal : false,								main:false,	},
				{	value : "ZC",	text : "零龍生物",			Jap : "零龍クリーチャー",						Location : "I", horizontal : true,								main:false,	},
				{	value : "ZCL",	text : "零龍星雲",			Jap : "零龍星雲",							Location : "I", horizontal : false,	parents: [ "SEC","DHC" ],	main:false,	},
				{	value : "DHSC",	text : "龍心超級生物",		Jap : "ドラグハート・スーパー・クリーチャー",			Location : "P", horizontal : false,	parents: [ "DHC" ],			main:false,	},
				{	value : "SEDHSC",	
									text : "星進化龍心超級生物",	Jap : "スター進化ドラグハート・スーパー・クリーチャー",	Location : "P", horizontal : false,								main:false,	},
				{					text : "決鬥者",				Jap : "デュエリスト",															descript : "這是甚麼沒人知道，官方至今都沒有做出說明"								},
				{	value : "DH",	text : "龍心",				Jap : "ドラグハート",						Location : "P", catagory : true,	descript : "泛指龍心生物、龍心武裝、與龍心要塞"									},
				{					text : "武裝",				Jap : "ウエポン",																descript : "泛指龍心武裝"														},
				{					text : "≡V≡",				Jap : "≡V≡",																descript : "指稀有度為Victory以上、卡牌上有≡V≡記號的卡"							},
				{					text : "禁斷領域",			Jap : "禁断フィールド",															descript : "等同最終禁断フィールド"												},
				{	value : "F",	text : "領域",				Jap : "フィールド",							Location : "M", catagory : true,	descript : "泛指D2フィールド、最終禁断フィールド、幸せのフィールド等領域卡"						},
				{					text : "雙極卡",				Jap : "ツインパクトカード",														descript : "一張同時有下兩側不同效果的卡"										},
				{					text : "NEO進化生物",			Jap : "NEO進化クリーチャー",														descript : "指下方有卡牌的NEO生物，亦視為進化生物"								},
				{					text : "靈氣",				Jap : "オーラ",																descript : "泛指自靈氣",														},
			],			
			
		getDataByValue : function( value ){
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].value == value ){
					return this.map[i];
				}
			}
			return null;
		},
		getTextByValue : function( value ){
			var theData = this.getDataByValue( value );
			return theData == null ? null : theData.text;
		},
		getObjByJap : function( value ){
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].Jap == value ){
					return this.map[i];
				}
			}
			return null;
		},
		hasParent : function( childCode, parentCode ){
			var child = this.getDataByValue( childCode );
			if ( child.parents == null )
				return false;
			for ( var p = 0 ; p < child.parents.length ; p++ )
				if ( child.parents[p] == parentCode )
					return true;
				else if ( this.hasParent( child.parents[p], parentCode ) )
					return true;
			return false;
		},
	}

	//特殊標籤
	var keyWords = {
	
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

			var indexes = [];
			for ( var i = 0 ; i < this.tagPackages.length ; i++ ){
				indexes.push( str.indexOf( this.tagPackages[i] ) );
			}
			var minIndexOfStr = -1;
			var minIndexOfIndexes = -1;
			for ( var i = 0 ; i < indexes.length ; i+=2 ){
				if ( indexes[i] != -1 && ( ( minIndexOfStr == -1 ) || ( indexes[i] < minIndexOfStr ) ) ){
					minIndexOfStr = indexes[i];
					minIndexOfIndexes = i;
				}
			}
			if ( minIndexOfIndexes == -1 ){
				return null;
			} else {
				var rtn = {
					headerTag : this.tagPackages[ minIndexOfIndexes ],			//首標籤
					tailTag : this.tagPackages[ minIndexOfIndexes + 1 ],		//尾標籤
					headerIndex : indexes[ minIndexOfIndexes ],					//首標籤index
					tailIndex : indexes[ minIndexOfIndexes + 1 ],				//尾標籤index
				}
				return rtn;
			}
		},
		
		//將能力字串轉換成DOM Object陣列
		transTags : function( str ){
		
			var rtnElements = [];
			var findTag = null;
			while( ( findTag = this.findFirstTagInfo( str ) ) != null ){
			
				var hTag = findTag.headerTag;
				var tTag = findTag.tailTag;
				
				var hIndex = findTag.headerIndex;
				var tIndex = findTag.tailIndex;

				
				var beforeTextNode = document.createTextNode( str.substr( 0 , hIndex ) );
				var kWord = str.substr( hIndex + hTag.length , tIndex - ( hIndex + hTag.length ) );
				var showName = kWord;
				//如果kWord裡有<=>記號的話、則視為一種特殊格式，表示<=>前者為原文、<=>後者為實際目標
				var showAndReal = kWord.split("<=>");
				if ( showAndReal.length == 2 ){
					showName = showAndReal[0];
					kWord = showAndReal[1];
				}
				var keywordSpan = document.createElement('span');
				keywordSpan.setAttribute( "keyJap" , kWord );
				keywordSpan.style.cursor = "pointer";
				keywordSpan.style.color = "blue";
//				keywordSpan.style.fontWeight = "bold";
				//依TAG不同處理不同的EVENT
				if ( hTag == this.raceHeaderTag ){
					var raceObject = raceMapping.getDataByJap( kWord );
					if ( raceObject != null ){
						keywordSpan.setAttribute( "title" , ( ( raceObject.isCategory ? "(類別種族) " : "" ) + raceObject.Jap + " / " + raceObject.Chi + " / " + raceObject.Eng ) );
						keywordSpan.setAttribute( "sTagType" , "R" );
					}
				} else if ( hTag == this.keywordHeaderTag ){
					var abilityObject = abilityMapping.getDataByJap( kWord );
					if ( abilityObject != null ){
						keywordSpan.setAttribute( "title" , abilityObject.Jap + " / " + abilityObject.Chi + " / " + abilityObject.Eng + "\n" + abilityObject.descript );
						keywordSpan.setAttribute( "sTagType" , "K" );
					}
				} else if ( hTag == this.nameHeaderTag || hTag == this.absoluteNameHeaderTag ){
				
					//如果是指定卡名、但資料裡沒有的話就不處理標籤
					var doWork = true;
					if ( hTag == this.nameHeaderTag ){
						if ( !nameCategory.isCategory( kWord ) && cardDatas.getDataByName( kWord ) == null ){
							doWork = false;
						}
					} else if ( hTag == this.absoluteNameHeaderTag ){
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
						if ( kWord != showName ){
							keywordSpan.setAttribute( "title" , clearSubName( kWord ) );
						}
						//如果是類別卡名的話，就進行搜尋
						if ( hTag == this.nameHeaderTag && nameCategory.isCategory( kWord ) ){
							keywordSpan.onclick = function(){
								var cardName = this.getAttribute( "queryByName" );
								queryByNameOnly( cardName , false );
								//如果是手機版型的話，就跳去列表頁
								if ( isVM() ){
									gobi("listBar").onclick();
								}
							}
						//不是的話就直接跳內容
						} else {
							keywordSpan.onclick = function(){
								var cardName = this.getAttribute( "queryByName" );
								lastSelectedCardName = cardName;
								openDataBlock();
								changeListCSS();
							}
						}
					}
				} else if ( hTag == this.typeHeaderTag ){
					var typeObject = cardTypeMapping.getObjByJap( kWord );
					if ( typeObject != null ){
						keywordSpan.setAttribute( "title" , "卡牌類型：" + typeObject.text + ( ( typeObject.descript == null ) ? "" : ( "\n" + typeObject.descript ) ) );
					}
				} else if ( hTag == this.soulHeaderTag ){
					var typeObject = soulMapping.getObjByJap( kWord );
					if ( typeObject != null ){
						keywordSpan.setAttribute( "title" , typeObject.Chi + " / " + typeObject.Eng );
					}
				} else if ( hTag == this.exNameHeaderTag ){
					//如果是放逐生物類別卡名的話，就進行搜尋
					if ( exNameCategory.isKeyName( kWord ) ){
						keywordSpan.style.textDecoration = "underline";
						keywordSpan.setAttribute( "queryByName" , kWord );
						keywordSpan.onclick = function(){
							var cardName = this.getAttribute( "queryByName" );
							queryByNameOnly( cardName , true );
							//如果是手機版型的話，就跳去列表頁
							if ( isVM() ){
								gobi("listBar").onclick();
							}
						}
					}
				}
				//如果關鍵字沒有點擊效果、又有說明的話、又是行動裝置的話，就增加點擊ALERT詳細說明
				setTitleAlert( keywordSpan );
				//TAG本文不進行繁簡轉換
				var tagMainWords = document.createElement('span');
				tagMainWords.appendChild( document.createTextNode( showName ) );
				keywordSpan.appendChild( tagMainWords );
				setNoTrans( keywordSpan );
				
				str = str.substr( tIndex + tTag.length );
								
				rtnElements.push( beforeTextNode );
				rtnElements.push( keywordSpan );
			}
			if ( str.length > 0 ){
				rtnElements.push( document.createTextNode( str ) );
			}
			return rtnElements;
		},
	}

	//魂
	var soulMapping = {
	
		map : [
			{ code : "H",	Jap : "ホーリー・ソウル",	Eng : "Holy Soul",		Chi : "聖魂", 	},
			{ code : "M",	Jap : "マジック・ソウル",	Eng : "Magic Soul",		Chi : "術魂", 	},
			{ code : "E",	Jap : "エヴィル・ソウル",	Eng : "Evil Soul",		Chi : "邪魂", 	},
			{ code : "B",	Jap : "ブラッディ・ソウル",	Eng : "Bloody Soul",	Chi : "血魂", 	},
			{ code : "K",	Jap : "カンフー・ソウル",	Eng : "KongFu Soul",	Chi : "功夫魂", },
			{ code : "W",	Jap : "ワイルド・ソウル",	Eng : "Wild Soul",		Chi : "野魂", 	},
			{ code : "U",	Jap : "ウルトラ・ソウル",	Eng : "Ultra Soul",		Chi : "超魂", 	},
			{ code : "C",	Jap : "キャット・ソウル",	Eng : "Cat Soul",		Chi : "貓魂", 	},
			{ code : "D",	Jap : "ドッグ・ソウル",		Eng : "Dog Soul",		Chi : "犬魂", 	},
		],
		
		//依魂代號取得混物件
		getDataByCode : function( value ){
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].code == value ){
					return this.map[i];
				}
			}
			return null;
		},
		
		//將魂代號轉成日文魂名
		transCodeToJap : function( value ){
			var theData = this.getDataByCode( value );
			return theData == null ? null : theData.Jap;
		},
		
		//將魂代號轉成英文魂名
		transCodeToEng : function( value ){
			var theData = this.getDataByCode( value );
			return theData == null ? null : theData.Eng;
		},
		
		//將魂代號轉成中文魂名
		transCodeToChi : function( value ){
			var theData = this.getDataByCode( value );
			return theData == null ? null : theData.Chi;
		},
		
		//由日文值取得物件
		getObjByJap : function( value ){
			for ( var i = 0 ; i < this.map.length ; i++ ){
				if ( this.map[i].Jap == value ){
					return this.map[i];
				}
			}
			return null;
		},
		
	}
	
	//卡名關鍵字
	var nameCategory = {
		
		map : [
			"ロマノフ",
			"ルピア",
			"ケンゲキオージャ",
			"ゴウケンオー",
			"ケンゴウグレンオー",
			"ワンケングレンオー",
			"ケングレンオー",
			"神帝",
			"プリン",
			"テスタ・ロッサ",
			"神（シェン）",
			"ガイアール",
			"リュウセイ",
			"パラス",
			"ボルシャック",
			"一撃奪取",
			"インガ",
			"シンリ",
			"サトリ",
			"イザナイ",
			"メシア",
			"カノン",
			"カルマ",
			"マントラ",
			"ファミリア",
			"ボルバルザーク",
			"パーロック",
			"ゼン",
			"アク",
			"真実の名",
			"偽りの名",
			"ヘブンズ",
			"スパーク",
			"遊撃師団",
			"バルガ",
			"XX（ダブルクロス）",
			"XXX（トリプルクロス）",
			"NEX（ネックス）",
			"Z（ゼータ）",
			"GENJI（ゲンジ）",
			"G（ゲンジ）",
			"ゲンジ",
			"アイニー",
			"母なる",
			"白騎士",
			"超次元",
			"覚醒者",
			"死神",
			"ファイブスター",
			"GENJI（ゲンジ）・XX（ダブルクロス）",
			"G（ジー）・ホーガン",
			"ガンヴィート",
			"カンクロウ",
			"三界",
			"奇天烈",
			"復讐",
			"獣軍隊",
			"音速",
			"邪眼",
			"ボルメテウス",
			"氷牙",
			"天雷",
			"魔光",
			"騎士",
			"海帝",
			"幻影",
			"武者（むしゃ）",
			"大和",
			"紫電",
			"聖霊王",
			"バロム",
			"ボルベルグ",
			"破壊神デス",
			"龍神ヘヴィ",
			"龍神メタル",
			"アルファ",
			"ボルメテウス・武者（むしゃ）・ドラゴン",
			"九極",
			"原始",
			"不死（ゾンビ）",
			"ドキンダム",
			"アメッチ",
			"ガイアール・カイザー",
			"ボルバルザーク・紫電・ドラゴン",
			"アリス",
			"禁断",
			"U・S・A",
			"モモダチ",
			"罪無",
			"戯具",
			"クイーン・オブ・プロテクション",
			"ロード・オブ・レジェンドソード",
			"蒼狼",
			"創世神",
			"起源神",
			"ジョニー",
			"ブレイン",
			"蓄積された魔力",
			"究極神アク",
			"超絶神ゼン",
			"魔光大帝ネロ・グリフィス",
			"ミステリー",
			"ナゾ",
			"謎",
			"クエスチョン",
			"モモキング",
			"グレンオー",
			"トラップ",
			"漢（メン）",
			"アクア・アタック",
			"アクア・カスケード",
			"・",
			"名人",
			"タイピング＝タップ",
			"ドギラゴン",
			"ジャシン",
			"ホーリー・スパーク",
			"ボルメテウス・ホワイト・ドラゴン",
		],
		
		isCategory : function( name ){
			return this.map.include( name );
		},
	}
	
	//放逐生物卡名關鍵字
	var exNameCategory = {
		
		map : [
			"神",
			"無",
			"法",
			"無法",
			"錬金魔砲",
			"翔帆轟音",
			"テスタ・ロッサ",
			"灼熱連鎖",
			"天空美麗",
			"超法",
			"神（シェン）",
			"神（シェン）豚（トン）",
			"神撃の カツドン DASH",
			"無敵",
			"魔槍",
			"絶頂神話 カツムゲン",
			"乱舞",
			"友情",
			"R（ロビン）",
			"学友情 ロビー・R（ロビン）",
			"M（ニケミケラン）",
			"愛友情 ニケ・M（ニケミケラン）",
			"G（グローバル）",
			"猛友情 五郎丸・G（グローバル）",
			"友情集結 R（ロビン）・M（ニケミケラン）・G（グローバル）",
			"百仙",
			"閻魔",
			"マジックマ瀧",
			"極太",
			"太陽",
			"シャイニング・キンジ",
			"サンサン",
			"しずく",
			"クーマン",
			"菌次郎",
			"拳銃",
			"鼓笛",
			"武闘",
			"剣砲",
			"最終章 カツエンド",
			"漢のキズナ カツブードン",
			"宇宙",
			"合金",
			"暴剣",
		],
		
		isKeyName : function( name ){
			return this.map.include( name );
		},
	}
	
	//殿堂
	var sanctuary = {
	
		//殿堂卡
		sanctuary1 : [
			"アラゴト・ムスビ",
			"不敵怪人アンダケイン",
			"インフィニティ・ドラゴン",
			"インフェルノ・サイン",
			"エメラル",
			"エンペラー・キリコ",
			"斬隠オロチ",
			"海底鬼面城",
			"カラフル・ダンス",
			"無双恐皇ガラムタ",
			"魔導管理室 カリヤドネ/ハーミット・サークル",
			"怨念怪人ギャスカ",
			"疾封怒闘 キューブリック",
			"クローン・バイス",
			"蛇手の親分ゴエモンキー!",
			"“轟轟轟”ブランド",
			"再誕の社",
			"瞬封の使徒サグラダ・ファミリア",
			"Ｓ級原始 サンマッド",
			"次元の霊峰",
			"ジョット・ガン・ジョラゴン",
			"ストリーミング・シェイパー",
			"セイレーン・コンチェルト",
			"凄惨なる牙 パラノーマル",
			"暗黒鎧 ダースシスK",
			"“龍装”チュリス",
			"大勇者「鎖風車」",
			"常勝ディス・オプティマス",
			"デビル・ドレーン",
			"蒼き団長 ドギラゴン剣",
			"MEGATOON・ドッカンデイヤー",
			"龍素知新",
			"ドリル・スコール",
			"腐敗勇騎ドルマークス",
			"侵革目 パラスラプト",
			"バロン・ゴーヤマ",
			"ハイドロ・ハリケーン",
			"超竜バジュラ",
			"バジュラズ・ソウル",
			"魔龍バベルギヌス",
			"光牙忍ハヤブサマル",
			"ビックリ・イリュージョン",
			"フェアリー・ギフト",
			"黒神龍ブライゼナーガ",
			"禁断機関 VV-8",
			"復讐 ブラックサイコ",
			"邪帝斧 ボアロアックス",
			"暴龍警報",
			"ホーガン・ブラスター",
			"ポジトロン・サイン",
			"単騎連射 マグナム",
			"魔天降臨",
			"予言者マリエル",
			"陰陽の舞",
			"BAKUOOON・ミッツァイル",
			"時の法皇 ミラダンテXII",
			"メガ・マナロック・ドラゴン",
			"Dの牢閣 メメント守神宮",
			"盗掘人形モールス",
			"目的不明の作戦",
			"ラッキー・ダーツ",
			"熱き侵略 レッドゾーンZ",
			"ミラクルとミステリーの扉",
			"邪神M・ロマノフ",
			"竜魔神王バルカディア・NEX（ネックス）",
			"樹食の超人",
			"超七極 Gio/巨大設計図",
			"暗黒鎧 ザロスト",
			"ガル・ラガンザーク",
			"一なる部隊 イワシン",
			"絶望神サガ",
			"蝕王の晩餐",
			"超神星アポロヌス・ドラゲリオン",
			"幻緑の双月/母なる星域",
			"「無月」の頂 ＄スザーク＄",
			"天命龍装 ホーリーエンド/ナウ・オア・ネバー",
			"緊急再誕",
			"邪幽 ジャガイスト",
			"瞬閃と疾駆と双撃の決断",
			"マーシャル・クイーン",
			"DARK MATERIAL COMPLEX",
			"困惑の影トラブル・アルケミスト",
			"逆転の影ガレック",
			"アリスの突撃インタビュー",
			"頂上混成 BAKUONSOOO8th",
			"死神覇王 ブラックXENARCH",
			"爆熱剣 バトライ刃",
			"爆熱天守 バトライ閣",
			"爆熱DX バトライ武神",
		],
		
		//白金殿堂
		sanctuary0 : [
			"der'Zen Mondo/♪必殺で つわものどもが 夢の跡",
			"ツタンメカーネン",
			"フォース・アゲイン",
			"雷炎翔鎧バルピアレスク",
			"アクア・パトロール",
			"アクア・メルゲ",
			"蒼狼の始祖アマテラス",
			"インフェルノ・ゲート",
			"裏切りの魔狼月下城",
			"ヴォルグ・サンダー",
			"呪紋の化身",
			"緊急プレミアム殿堂",
			"聖鎧亜キング・アルカディアス",
			"天雷王機ジョバンニX世",
			"スケルトン・バイス",
			"ソウル・アドバンテージ",
			"鎧亜戦隊ディス・マジシャン",
			"母なる大地",
			"母なる紋章",
			"ヒラメキ・プログラム",
			"フューチャー・スラッシュ",
			"転生プログラム",
			"ベイB ジャック",
			"ヘブンズ・フォース",
			"ヘル・スラッシュ",
			"無双竜機ボルバルザーク",
			"マリゴルドⅢ",
			"奇跡の精霊ミルザム",
			"ヨミジ 丁-二式",
			"音精 ラフルル",
			"レアリティ・レジスタンス",
			"ロスト・チャージャー",
			"ダンディ・ナスオ",
			"希望のジョー星",
			"生命と大地と轟破の決断",
			"機術士ディール/「本日のラッキーナンバー！」",
			"神の試練",
		],
		
		//組合殿堂
		sanctuaryC : [
			"未来王龍 モモキングJO",
			"禁断英雄 モモキングダムX",
		],
		
		//取得組合殿堂卡的index
		getSanctuaryCIndex : function( name ){
			for ( var i = 0 ; i < this.sanctuaryC.length ; i++ ){
				if ( this.sanctuaryC[i] == name ){
					return i;
				}
			}
			for ( var i = 0 ; i < this.sanctuaryC.length ; i++ ){
				if ( name.indexOf( this.sanctuaryC[i] ) != -1 ){
					return i;
				}
			}
			return -1;
		},
	}
	
	//綽號對照表
	var nickNamesMap = {
	
		map : [
			{
				realName : "斬斬人形コダマンマ", 				
				nickNames : [ "コダマンマ", "赤コダマンマ" ],
			},{
				realName : "福腹人形コダマンマ", 				
				nickNames : [ "黒コダマンマ" ],
			},{
				realName : "百発人形マグナム", 				
				nickNames : [ "黒マグナム","マグナム" ],
			},{
				realName : "早撃人形マグナム", 				
				nickNames : [ "赤マグナム" ],
			},{
				realName : "凶殺皇 デス・ハンズ", 				
				nickNames : [ "デスハンズ" ],
			},{
				realName : "終末の時計 ザ・クロック", 				
				nickNames : [ "クロック" ],
			},{
				realName : "次元流の豪力", 				
				nickNames : [ "ミランダ" ],
			},{
				realName : "ガイアール・カイザー", 				
				nickNames : [ "ガイアール" ],
			},{
				realName : "デーモン・ハンド", 				
				nickNames : [ "ハンド", "デモハン" ],
			},{
				realName : "青銅の鎧", 				
				nickNames : [ "ブロンズ", "青銅" ],
			},{
				realName : "大勇者「ふたつ牙」", 				
				nickNames : [ "ファング", "牙" ],
			},{
				realName : "ロスト・ソウル", 				
				nickNames : [ "ロスソ" ],
			},{
				realName : "ストリーミング・シェイパー", 				
				nickNames : [ "シェイパー" ],
			},{
				realName : "デビル・ドレーン", 				
				nickNames : [ "ドレーン" ],
			},{
				realName : "アストラル・リーフ", 				
				nickNames : [ "リーフ" ],
			},{
				realName : "雷鳴の守護者ミスト・リエス", 				
				nickNames : [ "ミスト" ],
			},{
				realName : "神々の逆流", 				
				nickNames : [ "逆流" ],
			},{
				realName : "フェアリー・ライフ", 				
				nickNames : [ "ライフ" ],
			},{
				realName : "光器ペトローバ", 				
				nickNames : [ "老婆", "ペト" ],
			},{
				realName : "冥府の覇者ガジラビュート", 				
				nickNames : [ "ガジラ" ],
			},{
				realName : "魂と記憶の盾", 				
				nickNames : [ "エタガ" ],
			},{
				realName : "剛撃戦攻ドルゲーザ", 				
				nickNames : [ "ドルゲ" ],
			},{
				realName : "幻緑の双月", 				
				nickNames : [ "ドリーミング", "ナイフ" ],
			},{
				realName : "バジュラズ・ソウル", 				
				nickNames : [ "バジュソ" ],
			},{
				realName : "ヘブンズ・ゲート", 				
				nickNames : [ "天門" ],
			},{
				realName : "イモータル・ブレード", 				
				nickNames : [ "芋ブレ", "芋", "イモブレ" ],
			},{
				realName : "ダンディ・ナスオ", 				
				nickNames : [ "茄子", "ナスオ" ],
			},{
				realName : "黒神龍グールジェネレイド", 				
				nickNames : [ "グール" ],
			},{
				realName : "ボルメテウス・武者（むしゃ）・ドラゴン", 				
				nickNames : [ "ボル武者" ],
			},{
				realName : "スーパー・スパーク", 				
				nickNames : [ "スパスパ" ],
			},{
				realName : "アクア・スーパーエメラル", 				
				nickNames : [ "スパエメ" ],
			},{
				realName : "ミラクルとミステリーの扉", 				
				nickNames : [ "ミラミス" ],
			},{
				realName : "カラフル・ダンス", 				
				nickNames : [ "ダンス", "カラダン" ],
			},{
				realName : "不滅の精霊パーフェクト・ギャラクシー", 				
				nickNames : [ "パギャラ", "PG", "不滅" ],
			},{
				realName : "光牙忍ハヤブサマル", 				
				nickNames : [ "隼" ],
			},{
				realName : "威牙忍ヤミノザンジ", 				
				nickNames : [ "ザンジ" ],
			},{
				realName : "西南の超人", 				
				nickNames : [ "キリノ" ],
			},{
				realName : "悪魔神王バルカディアス", 				
				nickNames : [ "バルカ", "バルス" ],
			},{
				realName : "時空の支配者ディアボロスZ（ゼータ）", 				
				nickNames : [ "DDZ" ],
			},{
				realName : "時空の凶兵ブラック・ガンヴィート", 				
				nickNames : [ "ガンヴィート" ],
			},{
				realName : "超次元ガード・ホール", 				
				nickNames : [ "ガドホ", "盾穴" ],
			},{
				realName : "偽りの名 ゾルゲ", 				
				nickNames : [ "社会のダニ" ],
			},{
				realName : "ドンドン吸い込むナウ", 				
				nickNames : [ "ドスコ", "ナウ" ],
			},{
				realName : "勝利のガイアール・カイザー", 				
				nickNames : [ "勝ガ", "生姜" ],
			},{
				realName : "勝利のリュウセイ・カイザー", 				
				nickNames : [ "昇竜", "醤油" ],
			},{
				realName : "希望の親衛隊ファンク", 				
				nickNames : [ "ファンク" ],
			},{
				realName : "勝利宣言 鬼丸「覇」", 				
				nickNames : [ "覇" ],
			},{
				realName : "ウェディング・ゲート", 				
				nickNames : [ "祝門" ],
			},{
				realName : "ガチンコ・ルーレット", 				
				nickNames : [ "ガレット" ],
			},{
				realName : "その子供、凶暴につき", 				
				nickNames : [ "ともお" ],
			},{
				realName : "トンギヌスの槍", 				
				nickNames : [ "槍" ],
			},{
				realName : "ボルメテウス・サファイア・ドラゴン", 				
				nickNames : [ "サファイア" ],
			},{
				realName : "光器パーフェクト・マドンナ", 				
				nickNames : [ "パドンナ" ],
			},{
				realName : "クリスティ・ゲート", 				
				nickNames : [ "推理門" ],
			},{
				realName : "デュエマの鬼!キクチ師範代", 				
				nickNames : [ "鬼畜" ],
			},{
				realName : "超閃機 ヴィルヴィスヴィード", 				
				nickNames : [ "ヴヴヴ" ],
			},{
				realName : "超法無敵宇宙合金武闘鼓笛魔槍絶頂百仙閻魔神（シェン）拳銃極太陽友情暴剣R（ロビン）・M（ニケミケラン）・G（グローバル） チーム・エグザイル～カツドンと仲間たち～", 				
				nickNames : [ "名前の長い奴" ],
			},{
				realName : "轟く侵略 レッドゾーン", 				
				nickNames : [ "新車" ],
			},{
				realName : "S級不死（ゾンビ） デッドゾーン", 				
				nickNames : [ "廃車" ],
			},{
				realName : "禁断の轟速 レッドゾーンX", 				
				nickNames : [ "中古車" ],
			},{
				realName : "メンデルスゾーン", 				
				nickNames : [ "MZ" ],
			},{
				realName : "ボルシャック・栄光・ルピア", 				
				nickNames : [ "榮光" ],
			},{
				realName : "ボルシャック・ドギラゴン", 				
				nickNames : [ "米津","米津龍" ],
			},
		],
		
		getRealName : function( nickName ){
			for ( var i = 0 ; i < this.map.length ; i++ )
				for ( var n = 0 ; n < this.map[i].nickNames.length ; n++ )
					if ( this.map[i].nickNames[n] == nickName )
						return this.map[i].realName;
			return null;
		},
	};
	
	var abilitiesHintHeader = "HINT:";
	
	//記錄台灣環境卡表
	var twsdCards = [];
	
	//記錄台灣卡包
	var twsdSets = [];

	//更新日誌按鍵最後更新時間
	function setButtonValueOfUpdateLog(){
		if ( updateLog.logAndDate.length > 0 ){	
			var lastUpdateDate = updateLog.logAndDate[0].date;
			var btnObj = gobi("logBtn");
			if ( moment(new Date()).format("YYYY/MM/DD") == lastUpdateDate ){
				btnObj.value = btnObj.value + " NEW!";
				btnObj.style.color = "red";
			}
		}
	}
	
	//最新推薦
	var newestSets = [
		"DM25-EX2",
		"NET-055",
		"NET-056",
		"NET-057",
		"NET-058",
	]
	
	//系統更新日誌
	var updateLog = {
		
		showLastLogContent : function(){

			var content = "";
			for ( var i = 0 ; i < Math.min( 3 , this.logAndDate.length ) ; i++ ){
				
				var isLast = ( i == 0 );
				var date = this.logAndDate[i].date;
				var logs = this.logAndDate[i].log;
				
				content += ( isLast ? "最後更新日期：" : "\n" ) + "\n" + date;
				
				for ( var li = 0 ; li < logs.length ; li++ ){
					content += "\n["+(li+1)+"] " + logs[li];
				}
			}
			if ( content != "" ){
				alert( translateText( content, isTC2C ) );
			}
		},
		
		logAndDate : [
			{	
				date : "2025/10/20",
				log : [ 
						"新增DM25-EX2「王道vs邪道 デュエキングWDreaM 2025」的資料",
				],	
			},
			{	
				date : "2025/10/13",
				log : [ 
						"卡種過濾新增「向下相容」過濾",
				],	
			},
			{	
				date : "2025/09/30",
				log : [ 
						"新增睿哥神藝術盃2025前四名的卡表",
				],	
			},
		],
	};