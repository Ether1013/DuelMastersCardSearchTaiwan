
	// 優先級定義: 數字越大，越排在前面 (根據五色循環和視覺效果排序)
	const colorPriority = {
		16: 60, // 光 (Light)
		 4: 50, // 闇 (Darkness)
		 2: 40, // 火 (Fire)
		 1: 30, // 自 (Nature)
		 8: 20, // 水 (Water)
		32: 10, // 無 (Zero)
	};

	//卡牌資料 (使用 Map 結構優化查詢)
	const cardDatas = {
	
		//資料集合: Map<CardName, CardData>
		map : new Map(),
		
		//取得list
		getList : function( setCode ){
		
			if ( setCode == null ){
				return Array.from(this.map.values());
			} else {
			
				let setCards = [];
				const setData = setDatas.getSetDatas( setCode );
				if ( setData != null ){
					setCards = setData.setCards;
				}
				const rtnList = [];
				for (const setCard of setCards) {
					const cardData = cardDatas.getDataByName( setCard.name , setCode );
					if ( cardData != null ){
						rtnList.push( cardData );
					}
				}
				return rtnList;
			}
		},
		
		//增加資料
		addMap : function( jsDatas ){
			if ( jsDatas != null ){
				for (const jsData of jsDatas) {
					
					//增加debugMode
					if ( debugMode.length > 0 && !debugMode.includes( jsData.name ) ){
						continue;
					}
					
					if ( jsData.race != null && jsData.race.length === 1 && typeof jsData.race[0] === 'string' && jsData.race[0].includes("/") ){
						jsData.race = jsData.race[0].split("/");
					}
					if ( jsData.type != null && typeof jsData.type === 'string' ){
						jsData.type = jsData.type.split("/");
					} else if ( jsData.wData != null ){
						for (const wData of jsData.wData) {
							if (typeof wData.type === 'string') {
								wData.type = wData.type.split("/");
							}
						}
					}
					this.map.set(jsData.name, jsData);
				}
			}
		},
		
		//動態增加DMVault連結資料 (已移除，DMVault相關代碼已清理)
		// addDMVaultID : function( name , vid ){ ... },
		
		//用卡名找出資料 (O(1) 查找)
		getDataByName : function( name , setCode , aaIndex, udIndex ){
		
			if ( name == null )
				return null;
		
			// 1. 嘗試直接查找
			let baseCard = this.map.get(name);
			
			// 2. 如果直接查找失敗，嘗試使用清理後的卡名查找 (處理注音/括號)
			if (!baseCard) {
				const cleanedName = clearSubName(name);
				for (const card of this.map.values()) {
					if (card.name === name || clearSubName(card.name) === cleanedName) {
						baseCard = card;
						break;
					}
				}
			}

			if (!baseCard) {
				return null;
			}

			// 3. 獲取單側 (UD) 數據
			let selectedCard = this.getSelectedCardByUdIndex(baseCard, udIndex);

			// 4. 合併 Set 數據 (包括 AA Index 處理)
			const setData = setCode ? setDatas.getSetDatas( setCode ) : null;
			if ( setData != null ){
				const cardDataInSet = setData.getCardData( name , aaIndex );
				if ( cardDataInSet != null ){
					selectedCard = cloneCardData( selectedCard , cardDataInSet );
				}
			}

			// 5. 如果是主資料且無圖，嘗試從 Set 中找卡圖
			if (selectedCard && lastSelectedSetCode === null && selectedCard.pic === "") {
				for (const setData of setDatas.set.values()) {
					for (const setCard of setData.setCards) {
						if (setCard.name === selectedCard.name) {
							const sps = Array.isArray(setCard.pic) ? setCard.pic : [setCard.pic];
							if (sps[0] != null && sps[0] !== "") {
								selectedCard.pic = sps[0];
								break;
							}
						}
					}
				}
			}

			return selectedCard;
		},
		
		getSelectedCardByUdIndex : function( mapData, udIndex ){
			if ( mapData.wData != null && udIndex == null ){
				udIndex = 0;
			}
			if ( udIndex != null && udIndex >= 0 && mapData.wData != null && mapData.wData.length > 0 && udIndex < mapData.wData.length ){
				const rtnData = clone( mapData.wData[ udIndex ] );
				rtnData.name = mapData.name;
				rtnData.pic = mapData.pic;
				rtnData.mana = mapData.mana;
				rtnData.mType = mapData.mType;
				rtnData.ws = mapData.wData.map(w => w.type); // 使用 map 生成 types 陣列
				return rtnData;
			} else {
				return mapData;
			}
		},
		
		pictureHeightOdWidth : 1.4,
		
	};
	
	//牌庫/SET資料 (使用 Map 結構優化查詢)
	const setDatas = {
	
		// 資料集合: Map<setCode, {set: SetData, map: CardList}>
		set : new Map(),

		// 存儲 Set 內卡片列表的 Map: Map<SetCode, CardList>
		map : new Map(),
		
		//增加資料
		addSet : function( setCode , setName , isDeck , setCards , isListSkip , optionColor, isTWSurroundings ){
			if ( setCode != null && setCards != null ){
				const setObj = {
					setCode : setCode,
					setName : setName,
					isDeck : isDeck,
					optionColor : optionColor,
					isListSkip : ( isListSkip == null ? false : isListSkip ),
					isTWSurroundings : isTWSurroundings,
					setCards: setCards // 直接引用卡片列表
				};
				this.set.set(setCode, setObj);
				this.map.set(setCode, setCards);

				//如果是台灣環境的話，就把卡名記起來
				if ( isTWSurroundings ){
					twsdSets.push( setCode );
					for (const setCard of setCards) {
						if ( !twsdCards.includes( setCard.name ) ){
							twsdCards.push( setCard.name );
						}
					}
				}
			}
		},
		
		//用SetCode找出系列資料 (O(1) 查找)
		getSetDatas : function( setCode ){
		
			if ( setCode == null )
				return null;
			
			const baseSet = this.set.get(setCode);
			if (!baseSet) return null;

			// 返回一個帶有必要方法的物件
			return {
				...baseSet,
				setCards : this.map.get(setCode) || [],
				//判斷指定卡名是否存在於此set中
				includeCardName : function( cardName ){
					return this.setCards.findIndex(c => c.name === cardName) !== -1;
				},
				//取得指定卡名Index
				getCardIndex : function( cardName ){
					return this.setCards.findIndex(c => c.name === cardName);
				},
				//取得指定卡名資料
				getCardData : function( cardName , aaIndex ){
					const index = this.getCardIndex( cardName );
					if ( index === -1 ){
						return null;
					} else {
						const rtnData = clone( this.setCards[ index ] );
						//追加總版本數
						rtnData.idSize = Array.isArray( rtnData.id ) ? rtnData.id.length : 1;
						if ( Array.isArray( rtnData.id ) ){
							if ( aaIndex == null || aaIndex < 0 || aaIndex >= rtnData.id.length ){
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
							// 確保這些屬性也是陣列才能使用 aaIndex
							rtnData.flavor = Array.isArray(rtnData.flavor) ? rtnData.flavor[aaIndex] : rtnData.flavor;
							rtnData.pic = Array.isArray(rtnData.pic) ? rtnData.pic[aaIndex] : rtnData.pic;
						}
						return rtnData;
					}
				},
			};
		},
		
		//取得指定SET的指定卡牌資料
		getCardDataInSet : function( setCode , cardName ){
		
			if ( setCode != null && cardName != null ){
				const setCards = this.map.get(setCode);
				if ( setCards ) {
					return setCards.find(c => c.name === cardName) || null;
				}
			}
			return null;
		},
	};
	
	//文明資料 (使用 Map 結構優化查詢)
	const civilMapping = {
	
		//資料集合: Map<value, CivilData>
		map : new Map(),
		
		init: function() {
			const initialData = [
				{	value : 16,	text : "光文明",			eText : "Light",	headerPic : "card_list_header_light.gif",	dvBGColor : "#FEF0A0",	},
				{	value : 8,	text : "水文明",			eText : "Water",	headerPic : "card_list_header_water.gif",	dvBGColor : "#8BD1F8",	},
				{	value : 4,	text : "闇文明",			eText : "Darkness",	headerPic : "card_list_header_dark.gif",	dvBGColor : "#BBB7B7",	},
				{	value : 2,	text : "火文明",			eText : "Fire",		headerPic : "card_list_header_fire.gif",	dvBGColor : "#E8747D",	},
				{	value : 1,	text : "自然文明",			eText : "Nature",	headerPic : "card_list_header_nature.gif",	dvBGColor : "#8BCF8D",	},
				{	value : 32,	text : "無色文明",			eText : "Zero",		headerPic : "card_list_header_zero.gif",	dvBGColor : "#ffffff",	},
			];
			initialData.forEach(item => this.map.set(item.value, item));
		},

		//用單一文明代碼取得文明資料 (O(1) 查找)
		getDataByValue : function( value ){
			return this.map.get(value) || null;
		},
		
		//用文明代碼取得所有文明資料
		getDatasByValue : function( value ){
			const rtnCivils = [];
			for (const data of this.map.values()) {
				if ( ( value === 0 && data.value === value ) || 
					 ( value > 0 && ( ( data.value & value ) > 0 ) ) ){
					rtnCivils.push( data );
				}
			}
			return rtnCivils;
		},
			
		//用文明代碼取得對應中文文明
		getTextByValue : function( value ){
			const theDatas = this.getDatasByValue( value );
			if ( theDatas.length === 0 ){
				return "";
			} else {
				return theDatas.map(data => data.text).join(" / ");
			}
		},
		
		//用日文取得文明
		getValueByText : function( value ){
			let rtn = 0;
			const values = value.split( /[\/,]/g );
			for (const val of values) {
				if ( val === "光" )
					rtn += 16;
				if ( val === "水" )
					rtn += 8;
				if ( val === "闇" )
					rtn += 4;
				if ( val === "火" )
					rtn += 2;
				if ( val === "自然" )
					rtn += 1;
			}
			if ( rtn === 0 )
				rtn = 32;
			return rtn;
		},
			
		//取得該文明的資料標頭圖片
		getHeaderPicByValue : function( value ){
			const theData = this.getDataByValue( value );
			return theData == null ? "card_list_header_rainbow.jpg" : theData.headerPic;
		},
		
		getBackgroundCSS: function(value) {
			let civils = this.getDatasByValue(value);
			
			// 步驟 1: 根據預設優先級進行排序 (確保多色漸層順序更協調)
			civils.sort((a, b) => {
				const priorityA = colorPriority[a.value] || 0;
				const priorityB = colorPriority[b.value] || 0;
				return priorityB - priorityA; // 降序排列 (Priority 高的排在前面)
			});
			
			// 步驟 2: 處理邊界情況
			if ( civils.length === 0 )
				civils = [ { dvBGColor : "#FFFFFF" } ];
			if ( civils.length === 1 ){
				civils.push( civils[0] );
			}

			let rtn = "";
			rtn += backgroundImageHeader + "linear-gradient( -45deg, ";
			
			const numCivils = civils.length;

			// 步驟 3: 通用分段渲染邏輯（適用於所有情況，避免過度混合）
			const step = 100 / numCivils;
			let colorStops = [];

			for (let i = 0; i < numCivils; i++) {
				const color = civils[i].dvBGColor;
				// 確保起始點在區間內
				const startPct = Math.floor(step * i);
				// 確保結束點剛好是下一個顏色的起點
				const endPct = Math.floor(step * (i + 1));
				
				// 1. 設置顏色塊的開始點
				if (i === 0) {
					// 第一個顏色必須從 0% 開始
					colorStops.push(`${color} 0%`);
				} else {
					// 隨後的顏色從前一個顏色的結束點開始 (這步驟是實現漸層的關鍵)
					colorStops.push(`${color} ${startPct}%`);
				}
				
				// 2. 設置顏色塊的結束點 (確保顏色在大部分區間保持純色)
				if (i < numCivils - 1) {
					 // 如果不是最後一個顏色，讓它佔滿整個分段
					colorStops.push(`${color} ${endPct}%`);
				} else {
					// 最後一個顏色延伸到 100%
					colorStops.push(`${color} 100%`);
				}
			}
			
			// 最終組合
			rtn += colorStops.join(", ");
			rtn += ")";
			
			return rtn;
		}
	};
	civilMapping.init();
	
	//單色列表
	const singleColors = Array.from(civilMapping.map.keys()).filter(key => key !== 0);
	
	//稀有度卡圖 (使用 Object 結構優化查找)
	const rarityPic = {
		//資料集合: Map<rarity, RarityData>
		map : new Map(),
		
		init: function() {
			const initialData = [
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
			];
			initialData.forEach(item => this.map.set(item.rarity, item));
		},
			
		//取得稀有度卡圖陣列(IMG TAG) (O(1) 查找)
		getRarityPicture : function( rarity ){
			const results = [];
			const data = this.map.get(rarity);
			
			if (data && data.pic != null) {
				const pics = Array.isArray(data.pic) ? data.pic : [data.pic];
				const takaratomyRarityPicRoot = "http://dm.takaratomy.co.jp/wp-content/uploads/";
				for (const picName of pics) {
					const img = document.createElement('img');
					img.src = takaratomyRarityPicRoot + picName + ".gif";
					results.push( img );
				}
			}
			return results;
		},
	};
	rarityPic.init();
	
//... (接續上一段被截斷的程式碼)

	//卡片種類 (使用 Map 結構優化查找)
	const cardTypeMapping = {
	
		//資料集合: Map<value, TypeData>
		map : new Map(),
		initMap : new Map(),

		init: function() {
			const initialData = [
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
				{	value : "DHTS",	text : "龍心魂種",			Jap : "ドラグハート・タマシード",					Location : "P", horizontal : false,	parents: [ "DH","TS" ],		main:false,	},
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
			];			

			initialData.forEach(item => {
				if (item.value) {
					this.map.set(item.value, item);
				}
				if (item.Jap) {
					this.map.set(item.Jap, item);
					this.initMap.set(item.Jap, item);
				}
			});
		},
			
		// O(1) 查找
		getDataByValue : function( value ){
			return this.map.get(value) || null;
		},
		getTextByValue : function( value ){
			const theData = this.map.get(value);
			return theData == null ? null : theData.text;
		},
		getObjByJap : function( value ){
			return this.map.get(value) || null;
		},
		hasParent : function( childCode, parentCode ){
			const child = this.map.get(childCode);
			if ( child == null || child.parents == null )
				return false;
			if ( child.parents.includes( parentCode ) )
				return true;
			return child.parents.some(parent => this.hasParent(parent, parentCode));
		},
	};
	cardTypeMapping.init();
	
	//魂 (使用 Map 結構優化查找)
	const soulMapping = {
	
		//資料集合: Map<key, SoulData>
		map : new Map(),
		
		init: function() {
			const initialData = [
				{ code : "H",	Jap : "ホーリー・ソウル",	Eng : "Holy Soul",		Chi : "聖魂", 	},
				{ code : "M",	Jap : "マジック・ソウル",	Eng : "Magic Soul",		Chi : "術魂", 	},
				{ code : "E",	Jap : "エヴィル・ソウル",	Eng : "Evil Soul",		Chi : "邪魂", 	},
				{ code : "B",	Jap : "ブラッディ・ソウル",	Eng : "Bloody Soul",	Chi : "血魂", 	},
				{ code : "K",	Jap : "カンフー・ソウル",	Eng : "KongFu Soul",	Chi : "功夫魂", },
				{ code : "W",	Jap : "ワイルド・ソウル",	Eng : "Wild Soul",		Chi : "野魂", 	},
				{ code : "U",	Jap : "ウルトラ・ソウル",	Eng : "Ultra Soul",		Chi : "超魂", 	},
				{ code : "C",	Jap : "キャット・ソウル",	Eng : "Cat Soul",		Chi : "貓魂", 	},
				{ code : "D",	Jap : "ドッグ・ソウル",	Eng : "Dog Soul",		Chi : "犬魂", 	},
				{ code : "SP",	Jap : "魂・ソウル",		Eng : "Spirit Soul",	Chi : "魂魂", 	},
				{ code : "SW",	Jap : "剣・ソウル",		Eng : "Sword Soul",		Chi : "劍魂", 	},
				{ code : "MI",	Jap : "鏡・ソウル",		Eng : "Mirror Soul",	Chi : "鏡魂", 	},
			];
			initialData.forEach(item => {
				this.map.set(item.code, item);
				this.map.set(item.Jap, item);
			});
		},
		
		//依魂代號取得混物件 (O(1) 查找)
		getDataByCode : function( value ){
			return this.map.get(value) || null;
		},
		
		transCodeToJap : function( value ){
			return this.getDataByCode( value )?.Jap;
		},
		
		transCodeToEng : function( value ){
			return this.getDataByCode( value )?.Eng;
		},
		
		transCodeToChi : function( value ){
			return this.getDataByCode( value )?.Chi;
		},
		
		//由日文值取得物件 (O(1) 查找)
		getObjByJap : function( value ){
			return this.map.get(value) || null;
		},
		
	};
	soulMapping.init();
	
	//卡名關鍵字 (使用 Set 結構優化查找)
	const nameCategory = {
		
		map : new Set(),
		
		init: function() {
			const initialData = [
				"ロマノフ", "ルピア", "ケンゲキオージャ", "ゴウケンオー", "ケンゴウグレンオー", "ワンケングレンオー", "ケングレンオー", "神帝", "プリン", "テスタ・ロッサ", 
				"神（シェン）", "ガイアール", "リュウセイ", "パラス", "ボルシャック", "一撃奪取", "インガ", "シンリ", "サトリ", "イザナイ", 
				"メシア", "カノン", "カルマ", "マントラ", "ファミリア", "ボルバルザーク", "パーロック", "ゼン", "アク", "真実の名", 
				"偽りの名", "ヘブンズ", "スパーク", "遊撃師団", "バルガ", "XX（ダブルクロス）", "XXX（トリプルクロス）", "NEX（ネックス）", "Z（ゼータ）", "GENJI（ゲンジ）", 
				"G（ゲンジ）", "ゲンジ", "アイニー", "母なる", "白騎士", "超次元", "覚醒者", "死神", "ファイブスター", "GENJI（ゲンジ）・XX（ダブルクロス）", 
				"G（ジー）・ホーガン", "ガンヴィート", "カンクロウ", "三界", "奇天烈", "復讐", "獣軍隊", "音速", "邪眼", "ボルメテウス", 
				"氷牙", "天雷", "魔光", "騎士", "海帝", "幻影", "武者（むしゃ）", "大和", "紫電", "聖霊王", 
				"バロム", "ボルベルグ", "破壊神デス", "龍神ヘヴィ", "龍神メタル", "アルファ", "ボルメテウス・武者（むしゃ）・ドラゴン", "九極", "原始", "不死（ゾンビ）", 
				"ドキンダム", "アメッチ", "ガイアール・カイザー", "ボルバルザーク・紫電・ドラゴン", "アリス", "禁断", "U・S・A", "モモダチ", "罪無", "戯具", 
				"クイーン・オブ・プロテクション", "ロード・オブ・レジェンドソード", "蒼狼", "創世神", "起源神", "ジョニー", "ブレイン", "蓄積された魔力", "究極神アク", "超絶神ゼン", 
				"魔光大帝ネロ・グリフィス", "ミステリー", "ナゾ", "謎", "クエスチョン", "モモキング", "グレンオー", "トラップ", "漢（メン）", "アクア・アタック", 
				"アクア・カスケード", "・", "名人", "タイピング＝タップ", "ドギラゴン", "ジャシン", "ホーリー・スパーク", "ボルメテウス・ホワイト・ドラゴン", "モルト",
			];
			initialData.forEach(item => this.map.add(item));
		},
		
		// O(1) 查找
		isCategory : function( name ){
			return this.map.has( name );
		},
	};
	nameCategory.init();
	
	//放逐生物卡名關鍵字 (使用 Set 結構優化查找)
	const exNameCategory = {
		
		map : new Set(),
		
		init: function() {
			const initialData = [
				"神", "無", "法", "無法", "錬金魔砲", "翔帆轟音", "テスタ・ロッサ", "灼熱連鎖", "天空美麗", "超法", 
				"神（シェン）", "神（シェン）豚（トン）", "神撃の カツドン DASH", "無敵", "魔槍", "絶頂神話 カツムゲン", "乱舞", "友情", "R（ロビン）", "学友情 ロビー・R（ロビン）", 
				"M（ニケミケラン）", "愛友情 ニケ・M（ニケミケラン）", "G（グローバル）", "猛友情 五郎丸・G（グローバル）", "友情集結 R（ロビン）・M（ニケミケラン）・G（グローバル）", "百仙", "閻魔", "マジックマ瀧", "極太", "太陽", 
				"シャイニング・キンジ", "サンサン", "しずく", "クーマン", "菌次郎", "拳銃", "鼓笛", "武闘", "剣砲", "最終章 カツエンド", 
				"漢のキズナ カツブードン", "宇宙", "合金", "暴剣",
			];
			initialData.forEach(item => this.map.add(item));
		},
		
		// O(1) 查找
		isKeyName : function( name ){
			return this.map.has( name );
		},
	};
	exNameCategory.init();
	
	//殿堂 (使用 Set 結構優化查找)
	const sanctuary = {
	
		//殿堂卡
		sanctuary1 : new Set(),
		
		//白金殿堂
		sanctuary0 : new Set(),
		
		//組合殿堂
		sanctuaryC : [],

		init: function() {
			const s1Data = [
				"アラゴト・ムスビ", "不敵怪人アンダケイン", "インフィニティ・ドラゴン", "インフェルノ・サイン", "エメラル", "エンペラー・キリコ", "斬隠オロチ", "海底鬼面城", "カラフル・ダンス", "無双恐皇ガラムタ", 
				"魔導管理室 カリヤドネ/ハーミット・サークル", "怨念怪人ギャスカ", "疾封怒闘 キューブリック", "クローン・バイス", "蛇手の親分ゴエモンキー!", "“轟轟轟”ブランド", "再誕の社", "瞬封の使徒サグラダ・ファミリア", "Ｓ級原始 サンマッド", "次元の霊峰", 
				"ジョット・ガン・ジョラゴン", "ストリーミング・シェイパー", "セイレーン・コンチェルト", "凄惨なる牙 パラノーマル", "暗黒鎧 ダースシスK", "“龍装”チュリス", "大勇者「鎖風車」", "常勝ディス・オプティマス", "デビル・ドレーン", "蒼き団長 ドギラゴン剣", 
				"MEGATOON・ドッカンデイヤー", "龍素知新", "ドリル・スコール", "腐敗勇騎ドルマークス", "侵革目 パラスラプト", "バロン・ゴーヤマ", "ハイドロ・ハリケーン", "超竜バジュラ", "バジュラズ・ソウル", "魔龍バベルギヌス", 
				"光牙忍ハヤブサマル", "ビックリ・イリュージョン", "フェアリー・ギフト", "黒神龍ブライゼナーガ", "禁断機関 VV-8", "復讐 ブラックサイコ", "邪帝斧 ボアロアックス", "暴龍警報", "ホーガン・ブラスター", "ポジトロン・サイン", 
				"単騎連射 マグナム", "魔天降臨", "予言者マリエル", "陰陽の舞", "BAKUOOON・ミッツァイル", "時の法皇 ミラダンテXII", "メガ・マナロック・ドラゴン", "Dの牢閣 メメント守神宮", "盗掘人形モールス", "目的不明の作戦", 
				"ラッキー・ダーツ", "熱き侵略 レッドゾーンZ", "ミラクルとミステリーの扉", "邪神M・ロマノフ", "竜魔神王バルカディア・NEX（ネックス）", "樹食の超人", "超七極 Gio/巨大設計図", "暗黒鎧 ザロスト", "ガル・ラガンザーク", "一なる部隊 イワシン", 
				"絶望神サガ", "蝕王の晩餐", "超神星アポロヌス・ドラゲリオン", "幻緑の双月/母なる星域", "「無月」の頂 ＄スザーク＄", "天命龍装 ホーリーエンド/ナウ・オア・ネバー", "緊急再誕", "邪幽 ジャガイスト", "瞬閃と疾駆と双撃の決断", "マーシャル・クイーン", 
				"DARK MATERIAL COMPLEX", "困惑の影トラブル・アルケミスト", "逆転の影ガレック", "アリスの突撃インタビュー", "頂上混成 BAKUONSOOO8th", "死神覇王 ブラックXENARCH", "爆熱剣 バトライ刃", "爆熱天守 バトライ閣", "爆熱DX バトライ武神",
			];
			s1Data.forEach(item => this.sanctuary1.add(item));

			const s0Data = [
				"der'Zen Mondo/♪必殺で つわものどもが 夢の跡", "ツタンメカーネン", "フォース・アゲイン", "雷炎翔鎧バルピアレスク", "アクア・パトロール", "アクア・メルゲ", "蒼狼の始祖アマテラス", "インフェルノ・ゲート", "裏切りの魔狼月下城", "ヴォルグ・サンダー", 
				"呪紋の化身", "緊急プレミアム殿堂", "聖鎧亜キング・アルカディアス", "天雷王機ジョバンニX世", "スケルトン・バイス", "ソウル・アドバンテージ", "鎧亜戦隊ディス・マジシャン", "母なる大地", "母なる紋章", "ヒラメキ・プログラム", 
				"フューチャー・スラッシュ", "転生プログラム", "ベイB ジャック", "ヘブンズ・フォース", "ヘル・スラッシュ", "無双竜機ボルバルザーク", "マリゴルドⅢ", "奇跡の精霊ミルザム", "ヨミジ 丁-二式", "音精 ラフルル", 
				"レアリティ・レジスタンス", "ロスト・チャージャー", "ダンディ・ナスオ", "希望のジョー星", "生命と大地と轟破の決断", "機術士ディール/「本日のラッキーナンバー！」", "神の試練",
			];
			s0Data.forEach(item => this.sanctuary0.add(item));

			this.sanctuaryC = [
				"未来王龍 モモキングJO",
				"禁断英雄 モモキングダムX",
			];
		},
		
		//取得組合殿堂卡的index
		getSanctuaryCIndex : function( name ){
			for ( let i = 0 ; i < this.sanctuaryC.length ; i++ ){
				if ( this.sanctuaryC[i] === name || name.includes(this.sanctuaryC[i])) {
					return i;
				}
			}
			return -1;
		},
	};
	sanctuary.init();
	
	//綽號對照表 (使用 Map 結構優化查找)
	const nickNamesMap = {
		// Map<nickName, realName>
		map : new Map(),

		init: function() {
			const initialData = [
				{ realName : "斬斬人形コダマンマ", 				nickNames : [ "コダマンマ", "赤コダマンマ" ]},
				{ realName : "福腹人形コダマンマ", 				nickNames : [ "黒コダマンマ" ]},
				{ realName : "百発人形マグナム", 				nickNames : [ "黒マグナム","マグナム" ]},
				{ realName : "早撃人形マグナム", 				nickNames : [ "赤マグナム" ]},
				{ realName : "凶殺皇 デス・ハンズ", 				nickNames : [ "デスハンズ" ]},
				{ realName : "終末の時計 ザ・クロック", 				nickNames : [ "クロック" ]},
				{ realName : "次元流の豪力", 				nickNames : [ "ミランダ" ]},
				{ realName : "ガイアール・カイザー", 				nickNames : [ "ガイアール" ]},
				{ realName : "デーモン・ハンド", 				nickNames : [ "ハンド", "デモハン" ]},
				{ realName : "青銅の鎧", 				nickNames : [ "ブロンズ", "青銅" ]},
				{ realName : "大勇者「ふたつ牙」", 				nickNames : [ "ファング", "牙" ]},
				{ realName : "ロスト・ソウル", 				nickNames : [ "ロスソ" ]},
				{ realName : "ストリーミング・シェイパー", 				nickNames : [ "シェイパー" ]},
				{ realName : "デビル・ドレーン", 				nickNames : [ "ドレーン" ]},
				{ realName : "アストラル・リーフ", 				nickNames : [ "リーフ" ]},
				{ realName : "雷鳴の守護者ミスト・リエス", 				nickNames : [ "ミスト" ]},
				{ realName : "神々の逆流", 				nickNames : [ "逆流" ]},
				{ realName : "フェアリー・ライフ", 				nickNames : [ "ライフ" ]},
				{ realName : "光器ペトローバ", 				nickNames : [ "老婆", "ペト" ]},
				{ realName : "冥府の覇者ガジラビュート", 				nickNames : [ "ガジラ" ]},
				{ realName : "魂と記憶の盾", 				nickNames : [ "エタガ" ]},
				{ realName : "剛撃戦攻ドルゲーザ", 				nickNames : [ "ドルゲ" ]},
				{ realName : "幻緑の双月", 				nickNames : [ "ドリーミング", "ナイフ" ]},
				{ realName : "バジュラズ・ソウル", 				nickNames : [ "バジュソ" ]},
				{ realName : "ヘブンズ・ゲート", 				nickNames : [ "天門" ]},
				{ realName : "イモータル・ブレード", 				nickNames : [ "芋ブレ", "芋", "イモブレ" ]},
				{ realName : "ダンディ・ナスオ", 				nickNames : [ "茄子", "ナスオ" ]},
				{ realName : "黒神龍グールジェネレイド", 				nickNames : [ "グール" ]},
				{ realName : "ボルメテウス・武者（むしゃ）・ドラゴン", 				nickNames : [ "ボル武者" ]},
				{ realName : "スーパー・スパーク", 				nickNames : [ "スパスパ" ]},
				{ realName : "アクア・スーパーエメラル", 				nickNames : [ "スパエメ" ]},
				{ realName : "ミラクルとミステリーの扉", 				nickNames : [ "ミラミス" ]},
				{ realName : "カラフル・ダンス", 				nickNames : [ "ダンス", "カラダン" ]},
				{ realName : "不滅の精霊パーフェクト・ギャラクシー", 				nickNames : [ "パギャラ", "PG", "不滅" ]},
				{ realName : "光牙忍ハヤブサマル", 				nickNames : [ "隼" ]},
				{ realName : "威牙忍ヤミノザンジ", 				nickNames : [ "ザンジ" ]},
				{ realName : "西南の超人", 				nickNames : [ "キリノ" ]},
				{ realName : "悪魔神王バルカディアス", 				nickNames : [ "バルカ", "バルス" ]},
				{ realName : "時空の支配者ディアボロスZ（ゼータ）", 				nickNames : [ "DDZ" ]},
				{ realName : "時空の凶兵ブラック・ガンヴィート", 				nickNames : [ "ガンヴィート" ]},
				{ realName : "超次元ガード・ホール", 				nickNames : [ "ガドホ", "盾穴" ]},
				{ realName : "偽りの名 ゾルゲ", 				nickNames : [ "社会のダニ" ]},
				{ realName : "ドンドン吸い込むナウ", 				nickNames : [ "ドスコ", "ナウ" ]},
				{ realName : "勝利のガイアール・カイザー", 				nickNames : [ "勝ガ", "生姜" ]},
				{ realName : "勝利のリュウセイ・カイザー", 				nickNames : [ "昇竜", "醤油" ]},
				{ realName : "希望の親衛隊ファンク", 				nickNames : [ "ファンク" ]},
				{ realName : "勝利宣言 鬼丸「覇」", 				nickNames : [ "覇" ]},
				{ realName : "ウェディング・ゲート", 				nickNames : [ "祝門" ]},
				{ realName : "ガチンコ・ルーレット", 				nickNames : [ "ガレット" ]},
				{ realName : "その子供、凶暴につき", 				nickNames : [ "ともお" ]},
				{ realName : "トンギヌスの槍", 				nickNames : [ "槍" ]},
				{ realName : "ボルメテウス・サファイア・ドラゴン", 				nickNames : [ "サファイア" ]},
				{ realName : "光器パーフェクト・マドンナ", 				nickNames : [ "パドンナ" ]},
				{ realName : "クリスティ・ゲート", 				nickNames : [ "推理門" ]},
				{ realName : "デュエマの鬼!キクチ師範代", 				nickNames : [ "鬼畜" ]},
				{ realName : "超閃機 ヴィルヴィスヴィード", 				nickNames : [ "ヴヴヴ" ]},
				{ realName : "超法無敵宇宙合金武闘鼓笛魔槍絶頂百仙閻魔神（シェン）拳銃極太陽友情暴剣R（ロビン）・M（ニケミケラン）・G（グローバル） チーム・エグザイル～カツドンと仲間たち～", 				nickNames : [ "名前の長い奴" ]},
				{ realName : "轟く侵略 レッドゾーン", 				nickNames : [ "新車" ]},
				{ realName : "S級不死（ゾンビ） デッドゾーン", 				nickNames : [ "廃車" ]},
				{ realName : "禁断の轟速 レッドゾーンX", 				nickNames : [ "中古車" ]},
				{ realName : "メンデルスゾーン", 				nickNames : [ "MZ" ]},
				{ realName : "ボルシャック・栄光・ルピア", 				nickNames : [ "榮光" ]},
				{ realName : "ボルシャック・ドギラゴン", 				nickNames : [ "米津","米津龍" ]},
			];

			initialData.forEach(item => {
				item.nickNames.forEach(nick => this.map.set(nick, item.realName));
			});
		},
		
		getRealName : function( nickName ){
			return this.map.get(nickName) || null;
		},
	};
	nickNamesMap.init();
	
	const abilitiesHintHeader = "HINT:";
	
	//記錄台灣環境卡表
	const twsdCards = [];
	
	//記錄台灣卡包
	const twsdSets = [];

	//更新日誌按鍵最後更新時間
	const setButtonValueOfUpdateLog = () => {
		if ( updateLog.logAndDate.length > 0 ){	
			const lastUpdateDate = updateLog.logAndDate[0].date;
			const btnObj = getById("logBtn");
			if ( moment(new Date()).format("YYYY/MM/DD") === lastUpdateDate ){
				btnObj.value = btnObj.value + " NEW!";
				btnObj.style.color = "red";
			}
		}
	};
	
	//最新推薦
	const newestSets = [
		"NET-070",
		"DM25-EX3",
		"DM25-RP4",
	];
	
	//系統更新日誌
	const updateLog = {
		
		showLastLogContent : function(){

			let content = "";
			for ( let i = 0 ; i < Math.min( 3 , this.logAndDate.length ) ; i++ ){
				
				const isLast = ( i === 0 );
				const date = this.logAndDate[i].date;
				const logs = this.logAndDate[i].log;
				
				content += ( isLast ? "最後更新日期：" : "\r\n" ) + "\r\n" + date;
				
				for ( let li = 0 ; li < logs.length ; li++ ){
					content += "\r\n["+(li+1)+"] " + logs[li];
				}
			}
			if ( content !== "" ){
				customAlert( translateText( content, isTC2C ) );
			}
		},
		
		logAndDate : [
			{	
				date : "2026/02/02",
				log : [ 
						"新增NET-070【台灣CS大賽20260201 1st【妖精水晶之王＠ANAGOMAN】】的資料",
				],	
			},
			{	
				date : "2026/01/16",
				log : [ 
						"新增DM24-EX3【邪神爆発デュエナマイトパック「王道W」】的資料",
				],	
			},
			{	
				date : "2026/01/07",
				log : [ 
						"訂正【フェアリー・ファンタジア】、【ブリザド＝ザルド】的卡牌內容",
				],	
			},
		],
	};
