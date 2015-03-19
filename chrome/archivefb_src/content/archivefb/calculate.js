
var archivefbCalcService = {

	get TREE()     { return document.getElementById("archivefbTree"); },
	get STRING()   { return document.getElementById("archivefbPropString"); },
	get STATUS()   { return document.getElementById("archivefbCalcMessage"); },
	get PROGRESS() { return document.getElementById("archivefbCalcProgress"); },

	dirEnum : null,
	treeItems : [],
	count : 0,
	total : 0,
	grandSum : 0,
	invalidCount : 0,

	exec : function()
	{
		var resEnum = archivefbData.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext();
			if ( !archivefbData.isContainer(res) ) this.total++;
		}
		var dataDir = archivefbUtils.getarchivefbDir().clone();
		dataDir.append("data");
		this.dirEnum = dataDir.directoryEntries;
		this.processAsync();
	},

	processAsync : function()
	{
		if ( !this.dirEnum.hasMoreElements() )
		{
			this.finish();
			return;
		}
		this.count++;
		var dir = this.dirEnum.getNext().QueryInterface(Ci.nsIFile);
		if ( dir.isDirectory() )
		{
			var id = dir.leafName;
			var bytes = archivefbPropService.getTotalFileSize(id)[0];
			this.grandSum += bytes;
			var res   = archivefbUtils.RDF.GetResource("urn:archivefb:item" + id);
			var valid = archivefbData.exists(res);
			var icon  = archivefbData.getProperty(res, "icon");
			if ( !icon ) icon = archivefbUtils.getDefaultIcon(archivefbData.getProperty(res, "type"));
			this.treeItems.push([
				id,
				archivefbData.getProperty(res, "type"),
				archivefbData.getProperty(res, "title"),
				icon,
				bytes,
				archivefbPropService.formatFileSize(bytes),
				valid,
			]);
			if ( !valid ) this.invalidCount++;
			this.STATUS.label   = this.STRING.getString("CALCULATING") + "... (" + this.count + "/" + this.total + ")";
			this.PROGRESS.value = Math.round(this.count / this.total * 100);
		}
		setTimeout(function() { archivefbCalcService.processAsync(); }, 0);
	},

	finish : function()
	{
		archivefbCustomTreeUtil.heapSort(this.treeItems, 4);
		this.treeItems.reverse();
		this.initTree();
		this.STATUS.label = "";
		this.PROGRESS.hidden = true;
		var msg = archivefbPropService.formatFileSize(this.grandSum);
		msg += "  " + this.STRING.getFormattedString("ITEMS_COUNT", [this.count]);
		document.getElementById("archivefbCalcTotalSize").value = msg;
		msg = ( this.invalidCount == 0 ) ? this.STRING.getString("DIAGNOSIS_OK") : this.STRING.getFormattedString("DIAGNOSIS_NG", [this.invalidCount]);
		document.getElementById("archivefbCalcDiagnosis").value = msg;
		this.checkDoubleEntries();
	},

	initTree : function()
	{
		var colIDs = [
			"archivefbTreeColTitle",
			"archivefbTreeColSize",
			"archivefbTreeColState",
		];
		var treeView = new archivefbCustomTreeView(colIDs, this.treeItems);
		treeView.getCellText = function(row, col)
		{
			switch ( col.index )
			{
				case 0 : return this._items[row][2]; break;
				case 1 : return this._items[row][5]; break;
				case 2 : return this._items[row][6] ? "" : archivefbCalcService.STRING.getString("INVALID"); break;
			}
		};
		treeView.getImageSrc = function(row, col)
		{
			if ( col.index == 0 ) return this._items[row][3];
		};
		treeView.getCellProperties = function(row, col, properties)
		{
			if ( this._items[row][6] && col.index != 0 ) return;
			properties.AppendElement(ATOM_SERVICE.getAtom(!this._items[row][6] ? "invalid" : this._items[row][1]));
		};
		treeView.cycleHeader = function(col)
		{
			archivefbCustomTreeUtil.sortItems(archivefbCalcService, col.element);
		};
		this.TREE.view = treeView;
	},

	checkDoubleEntries : function()
	{
		var hashTable = {};
		var resList = archivefbData.flattenResources(archivefbUtils.RDF.GetResource("urn:archivefb:root"), 0, true);
		for ( var i = 0; i < resList.length; i++ )
		{
			if ( resList[i].Value in hashTable )
			{
				archivefbUtils.alert("WARNING: Found double entries.\n" + archivefbData.getProperty(resList[i], "title"));
				var parRes = archivefbData.findParentResource(resList[i]);
				if ( parRes ) archivefbData.removeFromContainer(parRes.Value, resList[i]);
			}
			hashTable[resList[i].Value] = true;
		}
	},

};




var archivefbCalcController = {

	get CURRENT_TREEITEM()
	{
		return archivefbCalcService.treeItems[archivefbCalcService.TREE.currentIndex];
	},

	createPopupMenu : function(aEvent)
	{
		var valid = this.CURRENT_TREEITEM[6];
		document.getElementById("archivefbPopupRemove").setAttribute("disabled", valid);
		document.getElementById("archivefbPopupProperty").setAttribute("disabled", !valid);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.button == 0 && aEvent.originalTarget.localName == "treechildren" ) this.open(false);
	},

	open : function(tabbed)
	{
		var res = archivefbUtils.RDF.GetResource("urn:archivefb:item" + this.CURRENT_TREEITEM[0]);
		archivefbUtils.loadURL(archivefbData.getURL(res), tabbed);
	},

	remove : function()
	{
		if ( this.CURRENT_TREEITEM[6] ) return;
		var id = this.CURRENT_TREEITEM[0];
		if ( id.length != 14 ) return;
		if ( archivefbUtils.removeDirSafety(archivefbUtils.getContentDir(id), true) )
		{
			archivefbCalcService.treeItems.splice(archivefbCalcService.TREE.currentIndex, 1);
			archivefbCalcService.initTree();
		}
	},

	forward : function(aCommand)
	{
		var id = this.CURRENT_TREEITEM[0];
		switch ( aCommand )
		{
			case "P" : window.openDialog("chrome://archivefb/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
			case "L" : archivefbController.launch(archivefbUtils.getContentDir(id));
			default  : break;
		}
	},

};


