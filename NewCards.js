	var setNewCardList = [
	];
	for ( var i = 0 ; i < setNewCardList.length ; i++ ){
		cardDatas.map.push( setNewCardList[i] );
	}
	for ( var i = 0 ; i < setDatas.set.length ; i++ ){
		if ( setDatas.set[i].setCode == "OF-NEW" ){
			setDatas.map[i] = setNewCardList;
			continue;
		}
	}

