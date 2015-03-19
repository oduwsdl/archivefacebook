
var archivefbTradeService = {


	get STRING(){ return document.getElementById("archivefbTradeString"); },
	get TREE()  { return document.getElementById("archivefbTradeTree"); },


	leftDir  : null,
	rightDir : null,
	locked : false,
	treeItems : [],


	init : function()
	{
		if ( window.arguments )
		{
			document.getElementById("archivefbTradeHeader").collapsed = true;
			document.getElementById("archivefbTradeTree").collapsed = true;
			document.getElementById("archivefbTradeToolbar").collapsed = true;
			document.getElementById("archivefbTradeLog").collapsed = true;
			document.getElementById("archivefbTradeQuickStatus").hidden = false;
			window.sizeToContent();
			document.title = document.getElementById("archivefbTradeExportButton").label;
			setTimeout(function(){ archivefbTradeService.prepareRightDir(true); }, 100);
			return;
		}
		if ( window.top.location.href != "chrome://archivefb/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		setTimeout(function(){ archivefbTradeService.prepareRightDir(false); }, 100);
	},

	prepareRightDir : function(aQuickMode)
	{
		try {
			this.rightDir = archivefbUtils.prefBranch.getComplexValue("trade.path", Ci.nsILocalFile);
		}
		catch (ex) {
			this.lock(1);
			if (this.selectDir(aQuickMode)) {
				this.prepareRightDir(aQuickMode);
				return;
			}
			if (aQuickMode)
				window.setTimeout(function() { window.close(); }, 0);
			return;
		}
		if (!this.rightDir.exists() || !this.rightDir.isDirectory()) {
			this.lock(1);
			archivefbUtils.alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + this.rightDir.path);
			if (aQuickMode)
				window.setTimeout(function() { window.close(); }, 0);
			return;
		}
		if (aQuickMode) {
			archivefbExportService.execQuick(window.arguments[0]);
		}
		else {
			if ( this.locked ) this.lock(0);
			var fileField = document.getElementById("archivefbTradePath");
			fileField.file = this.rightDir;
			fileField.label = this.rightDir.path;
			this.refreshTree();
		}
	},

	selectDir : function()
	{
		var picker = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		picker.init(window, this.STRING.getString("SELECT_PATH"), picker.modeGetFolder);
		if ( this.rightDir ) picker.displayDirectory = this.rightDir;
		var answer = picker.show();
		if ( answer == picker.returnOK ) {
			archivefbUtils.setPref("trade.path", picker.file.path);
			return true;
		}
		return false;
	},

	refreshTree : function()
	{
		this.treeItems = [];
		var baseURL = archivefbUtils.convertFilePathToURL(this.rightDir.path);
		var dirEnum = this.rightDir.directoryEntries;
		while ( dirEnum.hasMoreElements() )
		{
			var file = dirEnum.getNext().QueryInterface(Ci.nsIFile);
			var dirName = file.leafName;
			file.append("index.dat");
			if ( !file.exists() ) continue;
			var item = this.parseIndexDat(file);
			if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) )
			{
				item.icon = baseURL + dirName + "/" + item.icon;
			}
			if ( !item.icon ) item.icon = archivefbUtils.getDefaultIcon(item.type);
			this.treeItems.push([
				item.title,
				(new Date(file.lastModifiedTime)).toLocaleString(),
				item.folder,
				item.id,
				item.icon,
				file.lastModifiedTime,
				dirName,
				item.type
			]);
		}
		archivefbCustomTreeUtil.heapSort(this.treeItems, 5);
		this.initTree();
		this.log(this.STRING.getFormattedString("DETECT", [this.treeItems.length, this.rightDir.path]), "G");
	},

	initTree : function()
	{
		var colIDs = [
			"archivefbTradeTreeColTitle",
			"archivefbTradeTreeColDate",
			"archivefbTradeTreeColFolder",
		];
		var treeView = new archivefbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col) {
			if (this._items[row][7] == "separator")
				return;
			if (col.index == 0)
				return this._items[row][4];
		};
		treeView.getCellProperties = function(row, col, properties) {
			if (col.index == 0)
				properties.AppendElement(ATOM_SERVICE.getAtom(this._items[row][7]));
		};
		treeView.cycleHeader = function(col) {
			archivefbCustomTreeUtil.sortItems(archivefbTradeService, col.element);
		};
		treeView.isSeparator = function(row) {
			return (this._items[row][7] == "separator");
		};
		this.TREE.view = treeView;
	},

	prepareLeftDir : function()
	{
		this.leftDir = archivefbUtils.getarchivefbDir();
		this.leftDir.append("data");
	},


	lock : function(aLevel)
	{
		this.locked = aLevel > 0;
		var elts = document.getElementsByAttribute("group", "lockTarget");
		for ( var i = 0; i < elts.length; i++ ) elts[i].setAttribute("disabled", aLevel > 0);
		if ( window.top != window )
		{
			document.getElementById("archivefbTradeBrowseButton").disabled = aLevel == 2;
			window.top.document.getElementById("mbToolbarButton").disabled = aLevel == 2;
			if (window.top.document.getElementById("statuarchivefbar-progresspanel"))
				window.top.document.getElementById("statuarchivefbar-progresspanel").collapsed = aLevel != 2;
		}
	},

	log : function(aMessage, aColor, aBold)
	{
		window.top.archivefbMainUI.trace(aMessage, 2000);
		var listbox = document.getElementById("archivefbTradeLog");
		var listitem = listbox.appendItem(aMessage);
		listbox.ensureIndexIsVisible(listbox.getRowCount() - 1);
		switch ( aColor )
		{
			case "R" : aColor = "#FF0000;"; break;
			case "G" : aColor = "#00AA33;"; break;
			case "B" : aColor = "#0000FF;"; break;
		}
		if ( aColor ) listitem.style.color = aColor;
		if ( aBold  ) listitem.style.fontWeight = "bold";
	},


	parseIndexDat : function(aFile)
	{
		if ( !(aFile instanceof Ci.nsILocalFile) ) return archivefbUtils.alert("Invalid agurments in archivefbTradeService::parseIndexDat.");
		var data = archivefbUtils.convertToUnicode(archivefbUtils.readFile(aFile), "UTF-8");
		data = data.split("\n");
		if ( data.length < 2 ) return;
		var item = archivefbData.newItem(null);
		for ( var i = 0; i < data.length; i++ )
		{
			if ( !data[i].match(/\t/) ) continue;
			var keyVal = data[i].split("\t");
			if ( keyVal.length == 2 )
				item[keyVal[0]] = keyVal[1];
			else
				item[keyVal.shift()] = keyVal.join("\t");
		}
		return item;
	},

	getComplexTreeSelection : function()
	{
		var ret = [];
		var uriList = [];
		var selRes = window.top.archivefbTreeUI.getSelection(true, 0);
		for ( var i = 0; i < selRes.length; i++ )
		{
			if ( archivefbData.isContainer(selRes[i]) )
			{
				var childRes = archivefbData.flattenResources(selRes[i], 2, true);
				for ( var j = 0; j < childRes.length; j++ )
				{
					if ( uriList.indexOf(childRes[j].Value) < 0 ) { ret.push(childRes[j]); uriList.push(childRes[j].Value); }
				}
			}
			else
			{
				if ( uriList.indexOf(selRes[i].Value) < 0 ) { ret.push(selRes[i]); uriList.push(selRes[i].Value); }
			}
		}
		return ret;
	},


	getCurrentDirName : function()
	{
		var curIdx = archivefbCustomTreeUtil.getSelection(this.TREE)[0];
		return this.treeItems[curIdx][6];
	},

	open : function(aTabbed)
	{
		var idx = archivefbCustomTreeUtil.getSelection(this.TREE)[0];
		var type = this.treeItems[idx][7];
		if (type == "bookmark" || type == "separator")
			return;
		archivefbUtils.loadURL(
			archivefbUtils.convertFilePathToURL(this.rightDir.path) + this.getCurrentDirName() + "/index.html",
			aTabbed
		);
	},

	browse : function()
	{
		var dir = this.rightDir.clone();
		dir.append(this.getCurrentDirName());
		if ( dir.exists() ) window.top.archivefbController.launch(dir);
	},

	remove : function()
	{
		var idxList = archivefbCustomTreeUtil.getSelection(this.TREE);
		if ( idxList.length < 1 ) return;
		if ( !window.confirm( archivefbUtils.getLocaleString("CONFIRM_DELETE") ) ) return;
		for ( var i = 0; i < idxList.length; i++ )
		{
			var dirName = this.treeItems[idxList[i]][6];
			if ( !dirName ) return;
			var dir = this.rightDir.clone();
			dir.append(dirName);
			if ( !dir.exists() ) continue;
			archivefbUtils.removeDirSafety(dir, false);
		}
		this.refreshTree();
	},

	showProperties : function()
	{
		var datFile = this.rightDir.clone();
		datFile.append(this.getCurrentDirName());
		datFile.append("index.dat");
		if ( !datFile.exists() ) return;
		var item = this.parseIndexDat(datFile);
		var content = "";
		for ( var prop in item )
		{
			content += prop + " : " + item[prop] + "\n";
		}
		archivefbUtils.alert(content);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.originalTarget.localName == "treechildren" && aEvent.button == 0 ) this.open(false);
	},

	onKeyPress : function(aEvent)
	{
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_RETURN : this.open(false); break;
			case aEvent.DOM_VK_DELETE : this.remove(); break;
			default : break;
		}
	},

	onDragStart: function(event) {
		if (event.target.localName != "treechildren")
			return;
		event.dataTransfer.setData("archivefb/tradeitem", archivefbTradeService.TREE.view.selection);
		event.dataTransfer.dropEffect = "move";
	},

	onDragOver: function(event) {
		if (event.dataTransfer.types.contains("moz/rdfitem"))
			event.preventDefault();
	},

	onDrop: function(event) {
		if (archivefbTradeService.locked)
			return;
		archivefbExportService.exec();
	},

};




var archivefbExportService = {

	get QUICK_STATUS() { return document.getElementById("archivefbTradeQuickStatusText"); },

	count : -1,
	resList : [],

	exec : function()
	{
		if ( archivefbTradeService.locked ) return;
		if ( window.top.archivefbTreeUI.TREE.view.selection.count == 0 ) return;
		archivefbTradeService.lock(2);
		archivefbTradeService.prepareLeftDir();
		this.count = -1;
		this.resList = archivefbTradeService.getComplexTreeSelection();
		this.next();
	},

	execQuick : function(aRes)
	{
		this.QUICK_STATUS.value = document.getElementById("archivefbTradeExportButton").label;
		archivefbTradeService.prepareLeftDir();
		var title = archivefbData.getProperty(aRes, "title");
		try {
			this.copyLeftToRight(aRes);
		} catch(ex) {
			this.QUICK_STATUS.value = archivefbTradeService.STRING.getString("FAILED") + ": " + title;
			this.QUICK_STATUS.style.color = "#FF0000";
			return;
		}
		this.QUICK_STATUS.value = document.getElementById("archivefbTradeExportButton").label + ": " + title;
		var winEnum = archivefbUtils.WINDOW.getEnumerator("archivefb");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
			if ( win.location.href != "chrome://archivefb/content/manage.xul" ) continue;
			try {
				win.document.getElementById("archivefbRightPaneBrowser").contentWindow.archivefbTradeService.refreshTree();
			} catch(ex) {
			}
		}
		setTimeout(function(){ window.close(); }, 1500);
	},

	next : function()
	{
		if ( ++this.count < this.resList.length )
		{
			var rate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
			var title = archivefbData.getProperty(this.resList[this.count], "title");
			try {
				this.copyLeftToRight(this.resList[this.count]);
				archivefbTradeService.log(document.getElementById("archivefbTradeExportButton").label + rate + title, "B");
			} catch(ex) {
				archivefbTradeService.log(archivefbTradeService.STRING.getString("FAILED") + ' "' + ex + '"' + rate + title, "R", true);
			}
			window.top.document.getElementById("archivefbManageProgress").value = Math.round( (this.count + 1) / this.resList.length * 100);
			setTimeout(function(){ archivefbExportService.next(); }, 500);
		}
		else
		{
			archivefbTradeService.refreshTree();
			archivefbTradeService.lock(0);
		}
	},

	getFolderPath : function(aRes)
	{
		var ret = [];
		for ( var i = 0; i < 32; i++ )
		{
			aRes = archivefbData.findParentResource(aRes);
			if ( aRes.Value == "urn:archivefb:root" ) break;
			ret.unshift(archivefbData.getProperty(aRes, "title"));
		}
		return ret;
	},

	copyLeftToRight : function(aRes)
	{
		if ( !archivefbData.exists(aRes) ) throw "Datasource changed.";
		var item = archivefbData.newItem();
		for ( var prop in item )
		{
			item[prop] = archivefbData.getProperty(aRes, prop);
		}
		item.folder = this.getFolderPath(aRes).join("\t");
		if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) )
		{
			item.icon = item.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		}
		var num = 0, destDir, dirName;
		do {
			dirName = archivefbUtils.validateFileName(item.title).substring(0,60) || "untitled";
			if ( num > 0 ) dirName += "-" + num;
			dirName = dirName.replace(/\./g, "");
			destDir = archivefbTradeService.rightDir.clone();
			destDir.append(dirName);
		}
		while ( destDir.exists() && ++num < 256 );
		var srcDir = archivefbUtils.getContentDir(item.id, false);
		archivefbUtils.writeIndexDat(item);
		if ( !srcDir.exists() || !srcDir.leafName.match(/^\d{14}$/) ) throw "Directory not found.";
		try {
			srcDir.copyTo(archivefbTradeService.rightDir, destDir.leafName);
		} catch(ex) {
			try {
				srcDir.copyTo(archivefbTradeService.rightDir, item.id);
			} catch(ex) {
				throw "Failed to copy files.";
			}
		}
		if (item.type == "bookmark" || item.type == "separator")
			archivefbUtils.removeDirSafety(srcDir);
	},

};




var archivefbImportService = {

	count   : -1,
	idxList : [],
	restoring : false,
	ascending : false,
	tarResArray : [],
	folderTable : {},
	_dataURI : "",

	exec : function(aRow, aOrient)
	{
		if ( archivefbTradeService.locked ) return;
		if ( archivefbTradeService.TREE.view.selection.count == 0 ) return;
		archivefbTradeService.lock(2);
		archivefbTradeService.prepareLeftDir();
		this._dataURI = archivefbData.dataSource.URI;
		this.restoring = ( aRow == -128 ) ? document.getElementById("archivefbTradeOptionRestore").checked : false;
		this.tarResArray = window.top.archivefbTreeUI._getInsertionPoint(aRow, aOrient);
		this.ascending = ( aRow < 0 ) ? true : (aOrient == 0);
		this.idxList   = archivefbCustomTreeUtil.getSelection(archivefbTradeService.TREE);
		this.count     = this.ascending ? -1 : this.idxList.length;
		this.folderTable = {};
		if ( this.restoring )
		{
			var resList = archivefbData.flattenResources(archivefbUtils.RDF.GetResource("urn:archivefb:root"), 1, true);
			for ( var i = 1; i < resList.length; i++ )
			{
				this.folderTable[archivefbData.getProperty(resList[i], "title")] = resList[i].Value;
			}
		}
		this.next();
	},

	next : function()
	{
		var atEnd;
		if ( this.ascending )
			atEnd = ++this.count >= this.idxList.length;
		else
			atEnd = --this.count < 0;
		if ( !atEnd )
		{
			var num  = this.ascending ? this.count + 1 : this.idxList.length - this.count;
			var rate = " (" + num + "/" + this.idxList.length + ") ";
			var title  = archivefbTradeService.treeItems[this.idxList[this.count]][0];
			var folder = archivefbTradeService.treeItems[this.idxList[this.count]][2];
			if ( folder ) folder = " [" + folder + "] ";
			try {
				this.copyRightToLeft();
				archivefbTradeService.log(document.getElementById("archivefbTradeImportButton").label + rate + folder + title, "B");
			} catch(ex) {
				archivefbTradeService.log(archivefbTradeService.STRING.getString("FAILED") + ' "' + ex + '"' + rate + title, "R", true);
			}
			window.top.document.getElementById("archivefbManageProgress").value = Math.round(num / this.idxList.length * 100);
			setTimeout(function(){ archivefbImportService.next(); }, 500);
		}
		else
		{
			archivefbTradeService.refreshTree();
			archivefbTradeService.lock(0);
			archivefbUtils.refreshGlobal(false);
		}
	},

	copyRightToLeft : function()
	{
		if ( archivefbData.dataSource.URI != this._dataURI ) throw "Datasource changed.";
		var dirName = archivefbTradeService.treeItems[this.idxList[this.count]][6];
		var srcDir = archivefbTradeService.rightDir.clone();
		srcDir.append(dirName);
		if ( !srcDir.exists() ) throw "Directory not found.";
		var datFile = srcDir.clone();
		datFile.append("index.dat");
		if ( !datFile.exists() ) throw "index.dat not found.";
		var item = archivefbTradeService.parseIndexDat(datFile);
		if ( !item.id || item.id.length != 14 ) throw "Invalid ID.";
		if ( archivefbData.exists(item.id) ) throw archivefbTradeService.STRING.getString("ERROR_SAME_ID_EXISTS");
		var destDir = archivefbTradeService.leftDir.clone();
		if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) item.icon = "resource://archivefb/data/" + item.id + "/" + item.icon;
		if ( !item.icon ) item.icon = archivefbUtils.getDefaultIcon(item.type);
		if ( item.type == "bookmark" || item.type == "separator" )
		{
			if ( document.getElementById("archivefbTradeOptionRemove").checked ) archivefbUtils.removeDirSafety(srcDir, false);
		}
		else
		{
			try {
				if ( document.getElementById("archivefbTradeOptionRemove").checked )
					srcDir.moveTo(destDir, item.id);
				else
					srcDir.copyTo(destDir, item.id);
			} catch(ex) {
				throw "Failed to copy files.";
			}
		}
		var folder = "";
		if ( this.restoring )
		{
			this.tarResArray = ["urn:archivefb:root", 0];
			var folderList = "folder" in item ? item.folder.split("\t") : [];
			for ( var i = 0; i < folderList.length; i++ )
			{
				if ( folderList[i] == "" ) continue;
				if ( folderList[i] in this.folderTable &&
					archivefbData.getRelativeIndex(
						archivefbUtils.RDF.GetResource(this.tarResArray[0]),
						archivefbUtils.RDF.GetResource(this.folderTable[folderList[i]])
					) > 0 )
				{
					this.tarResArray[0] = this.folderTable[folderList[i]];
					var idx = window.top.archivefbTreeUI.TREE.builderView.getIndexOfResource(archivefbUtils.RDF.GetResource(this.tarResArray[0]));
					if ( idx >= 0 && !window.top.archivefbTreeUI.TREE.view.isContainerOpen(idx) ) window.top.archivefbTreeUI.TREE.view.toggleOpenState(idx);
				}
				else
				{
					var newItem = archivefbData.newItem();
					newItem.title = folderList[i];
					newItem.type = "folder";
					var newRes = archivefbData.addItem(newItem, this.tarResArray[0], 0);
					archivefbData.createEmptySeq(newRes.Value);
					var idx = window.top.archivefbTreeUI.TREE.builderView.getIndexOfResource(newRes);
					if ( idx >= 0 ) window.top.archivefbTreeUI.TREE.view.toggleOpenState(idx);
					this.folderTable[newItem.title] = newRes.Value;
					this.tarResArray[0] = newRes.Value;
					archivefbTradeService.log(archivefbTradeService.STRING.getFormattedString("CREATE_FOLDER", [newItem.title]), "B", true);
				}
			}
			if ( this.tarResArray[0] != window.top.archivefbTreeUI.TREE.ref ) folder = " [" + item.folder + "] ";
		}
		archivefbData.addItem(item, this.tarResArray[0], this.tarResArray[1]);
		archivefbUtils.refreshGlobal(false);
	},

};


