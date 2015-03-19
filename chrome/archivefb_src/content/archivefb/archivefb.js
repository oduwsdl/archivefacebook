
var archivefbMainUI = {


	init: function()
	{
		archivefbMultiBookUI.showButton();
		archivefbTreeUI.init(false);
		archivefbTreeUI.enableDragDrop(true);
		archivefbSearchUI.init();
		setTimeout(function(self) { self.delayedInit(); }, 0, this);
	},

	delayedInit: function()
	{
		if ("archivefbBrowserOverlay" in window.top == false)
			return;
		archivefbMultiBookUI.showSidebarTitle();
		if (window.top.archivefbBrowserOverlay.locateMe)
			this.locate(null);
	},

	rebuild: function()
	{
		archivefbTreeUI.TREE.builder.rebuild();
	},

	refresh: function()
	{
		archivefbTreeUI.uninit();
		this.init();
	},

	done: function()
	{
		archivefbNoteService.save();
		archivefbSearchUI.uninit();
		archivefbTreeUI.uninit();
		if (this._traceTimer)
			window.clearTimeout(this._traceTimer)
	},

	trace: function(aText, aMillisec)
	{
		var status = top.window.document.getElementById("statuarchivefbar-display");
		if (!status)
			return;
		status.label = aText;
		var callback = function(self) {
			self._traceTimer = null;
			if (status.label == aText)
				status.label = "";
			status = null;
		};
		this._traceTimer = window.setTimeout(callback, aMillisec || 5000, this);
	},

	_traceTimer: null,


	locate: function(aRes)
	{
		if (!aRes)
			aRes = window.top.archivefbBrowserOverlay.locateMe;
		if ("archivefbBrowserOverlay" in window.top)
			window.top.archivefbBrowserOverlay.locateMe = null;
		if (aRes.Value == "urn:archivefb:root")
			return;
		archivefbSearchUI.reset();
		archivefbTreeUI.locateInternal(aRes);
	},

	/*createFolderWithName : function(titleIn){
		alert('hey!');
		return;
		var newItem = archivefbData.newItem();
		newItem.title = titleIn;
		newItem.type = "folder";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = archivefbTreeUI.TREE.currentIndex;
			var curRes = archivefbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = archivefbTreeUI.getParentResource(curIdx);
			var curRelIdx = archivefbData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = archivefbTreeUI.TREE.ref;
			tarRelIdx  = 1;
			isRootPos  = true;
		}
		var newRes = archivefbData.addItem(newItem, tarResName, tarRelIdx);
		archivefbData.createEmptySeq(newRes.Value);
		archivefbUtils.refreshGlobal(false);
		if (isRootPos)
			archivefbTreeUI.TREE.treeBoxObject.scrollToRow(0);
		var idx = archivefbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		archivefbTreeUI.TREE.view.selection.select(idx);
		archivefbTreeUI.TREE.focus();
		var result = {};
	},*/
	createFolder: function()
	{
		archivefbSearchUI.reset();
		var newItem = archivefbData.newItem();
		newItem.title = archivefbUtils.getLocaleString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = archivefbTreeUI.TREE.currentIndex;
			var curRes = archivefbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = archivefbTreeUI.getParentResource(curIdx);
			var curRelIdx = archivefbData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = archivefbTreeUI.TREE.ref;
			tarRelIdx  = 1;
			isRootPos  = true;
		}
		var newRes = archivefbData.addItem(newItem, tarResName, tarRelIdx);
		archivefbData.createEmptySeq(newRes.Value);
		archivefbUtils.refreshGlobal(false);
		if (isRootPos)
			archivefbTreeUI.TREE.treeBoxObject.scrollToRow(0);
		var idx = archivefbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		archivefbTreeUI.TREE.view.selection.select(idx);
		archivefbTreeUI.TREE.focus();
		var result = {};
		window.openDialog(
			"chrome://archivefb/content/property.xul", "", "modal,centerscreen,chrome",
			newItem.id, result
		);
		if (!result.accept) {
			archivefbData.deleteItemDescending(newRes, archivefbUtils.RDF.GetResource(tarResName));
			return false;
		}
		return true;
	},

	createSeparator: function()
	{
		archivefbSearchUI.reset();
		var newItem = archivefbData.newItem();
		newItem.type = "separator";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = archivefbTreeUI.TREE.currentIndex;
			var curRes = archivefbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = archivefbTreeUI.getParentResource(curIdx);
			var curRelIdx = archivefbData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = archivefbTreeUI.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		var newRes = archivefbData.addItem(newItem, tarResName, tarRelIdx);
		archivefbUtils.refreshGlobal(false);
		archivefbTreeUI.TREE.view.selection.clearSelection();
		var idx = archivefbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		archivefbTreeUI.TREE.treeBoxObject.ensureRowIsVisible(idx);
	},

	createNote: function(aInTab)
	{
		archivefbSearchUI.reset();
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = archivefbTreeUI.TREE.currentIndex;
			var curRes = archivefbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = archivefbTreeUI.getParentResource(curIdx);
			var curRelIdx = archivefbData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = archivefbTreeUI.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		archivefbNoteService.create(tarResName, tarRelIdx, aInTab);
		var idx = archivefbTreeUI.TREE.builderView.getIndexOfResource(archivefbNoteService.resource);
		archivefbTreeUI.TREE.view.selection.select(idx);
		if (isRootPos)
			archivefbTreeUI.TREE.treeBoxObject.scrollByLines(archivefbTreeUI.TREE.view.rowCount);
	},

	openPrefWindow : function()
	{
		var instantApply = window.top.gPrefService.getBoolPref("browser.preferences.instantApply");
		window.top.openDialog(
			"chrome://archivefb/content/prefs.xul", "archivefb:Options",
			"chrome,titlebar,toolbar,centerscreen," + (instantApply ? "dialog=no" : "modal")
		);
	},

};




var archivefbController = {

	onPopupShowing : function(aEvent)
	{
		if (aEvent.originalTarget.id != "archivefbPopup")
			return;
		var res = archivefbTreeUI.resource;
		if (!res) {
			aEvent.preventDefault();
			return;
		}
		var isNote = false;
		var isFolder = false;
		var isBookmark = false;
		var isSeparator = false;
		switch (archivefbData.getProperty(res, "type")) {
			case "note"     : isNote      = true; break;
			case "folder"   : isFolder    = true; break;
			case "bookmark" : isBookmark  = true; break;
			case "separator": isSeparator = true; break;
		}
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		getElement("archivefbPopupOpen").hidden         = isFolder  || isSeparator;
		getElement("archivefbPopupOpenTab").hidden      = !isNote   || isSeparator;
		getElement("archivefbPopupOpenNewTab").hidden   = isFolder  || isNote || isSeparator;
		getElement("archivefbPopupOpenSource").hidden   = isFolder  || isNote || isSeparator;
		getElement("archivefbPopupCombinedView").hidden = !isFolder || isSeparator;
		getElement("archivefbPopupOpenAllItems").hidden = !isFolder || isSeparator;
		getElement("archivefbPopupOpenAllItems").nextSibling.hidden = !isFolder || isSeparator;
		getElement("archivefbPopupSort").hidden   = !isFolder || isSeparator;
		getElement("archivefbPopupManage").hidden = !isFolder || isSeparator;
		getElement("archivefbPopupNewFolder").previousSibling.hidden = isSeparator;
		getElement("archivefbPopupTools").hidden   = isFolder || isSeparator;
		getElement("archivefbPopupRenew").setAttribute("disabled", isNote.toString());
		getElement("archivefbPopupShowFiles").setAttribute("disabled", isBookmark.toString());
	},

	open: function(aRes, aInTab)
	{
		if (!aRes)
			aRes = archivefbTreeUI.resource;
		if (!aRes)
			return;
		var id = archivefbData.getProperty(aRes, "id");
		if (!id)
			return;
		switch (archivefbData.getProperty(aRes, "type")) {
			case "note" :
				archivefbNoteService.open(aRes, aInTab || archivefbUtils.getPref("tabs.note"));
				break;
			case "bookmark" :
				archivefbUtils.loadURL(
					archivefbData.getProperty(aRes, "source"),
					aInTab || archivefbUtils.getPref("tabs.open")
				);
				break;
			case "separator": 
				return;
			default :
				archivefbUtils.loadURL(
					"resource://archivefb/data/" + id + "/index.html",
					aInTab || archivefbUtils.getPref("tabs.open")
				);
		}
	},

	openAllInTabs: function(aRes)
	{
		if (!aRes)
			aRes = archivefbTreeUI.resource;
		if (!aRes)
			return;
		var resList = archivefbData.flattenResources(aRes, 2, false);
		resList.forEach(function(res) {
			archivefbUtils.loadURL(archivefbData.getURL(res), true);
		});
	},

	renew: function(aRes, aShowDetail)
	{
		if (!aRes)
			aRes = archivefbTreeUI.resource;
		if (!aRes)
			return;
		var preset = [
			archivefbData.getProperty(aRes, "id"),
			"index",
			null,
			null,
			0,
			archivefbData.getProperty(aRes, "type") == "bookmark"
		];
		window.top.openDialog(
			"chrome://archivefb/content/capture.xul", "",
			"chrome,centerscreen,all,resizable,dialog=no",
			[archivefbData.getProperty(aRes, "source")], null,
			aShowDetail, null, 0, null, null, null, preset
		);
	},

	forward: function(aRes, aCommand, aParam)
	{
		if (!aRes)
			aRes = archivefbTreeUI.resource;
		if (!aRes)
			return;
		var id = archivefbData.getProperty(aRes, "id");
		if (!id)
			return;
		switch (aCommand) {
			case "P": 
				window.openDialog("chrome://archivefb/content/property.xul", "", "chrome,centerscreen,modal", id);
				break;
			case "M": 
				archivefbUtils.openManageWindow(aRes, null);
				break;
			case "Z": 
				window.openDialog('chrome://archivefb/content/sort.xul','','chrome,centerscreen,modal', aRes);
				break;
			case "C": 
				archivefbUtils.loadURL(
					"chrome://archivefb/content/view.xul?id=" + archivefbData.getProperty(aRes, "id"),
					archivefbUtils.getPref("tabs.combinedView")
				);
				break;
			case "S": 
				archivefbUtils.loadURL(
					archivefbData.getProperty(aRes, "source"),
					archivefbUtils.getPref("tabs.openSource") || aParam
				);
				break;
			case "L": 
				this.launch(archivefbUtils.getContentDir(id));
				break;
			case "E": 
				window.openDialog(
					"chrome://archivefb/content/trade.xul", "",
					"chrome,centerscreen,all,resizable,dialog=no",
					aRes
				);
				break;
		}
	},

	launch: function(aDir)
	{
		aDir = aDir.QueryInterface(Ci.nsILocalFile);
		aDir.launch();
	},

	sendInternal: function(aResList, aParResList)
	{
		var result = {};
		var preset = aParResList[0];
		window.openDialog(
			"chrome://archivefb/content/folderPicker.xul", "",
			"modal,chrome,centerscreen,resizable=yes", result, preset
		);
		if (!result.resource)
			return;
		var tarRes = result.resource;
		for (var i = 0; i < aResList.length; i++)  {
			archivefbData.moveItem(aResList[i], aParResList[i], tarRes, -1);
		}
		archivefbUtils.refreshGlobal(false);
	},

	removeInternal: function(aResList, aParResList, aBypassConfirm)
	{
		var rmIDs = [];
		for (var i = 0; i < aResList.length; i++) {
			if (aParResList[i].Value == "urn:archivefb:search") {
				aParResList[i] = archivefbData.findParentResource(aResList[i]);
				if (!aParResList[i])
					continue;
				archivefbData.removeFromContainer("urn:archivefb:search", aResList[i]);
			}
			if (!archivefbData.exists(aResList[i]) || 
			    archivefbData.getRelativeIndex(aParResList[i], aResList[i]) < 0) {
				archivefbUtils.alert("ERROR: Failed to remove resource.\n" + aResList[i].Value);
				continue;
			}
			rmIDs = rmIDs.concat(archivefbData.deleteItemDescending(aResList[i], aParResList[i]));
		}
		for (var i = 0; i < rmIDs.length; i++) {
			var myDir = archivefbUtils.getContentDir(rmIDs[i], true);
			if (myDir && rmIDs[i].length == 14)
				archivefbUtils.removeDirSafety(myDir, true);
		}
		archivefbUtils.refreshGlobal(false);
		return rmIDs;
	},

	confirmBeforeRemoving: function(aRes)
	{
		if (archivefbData.isContainer(aRes) || archivefbUtils.getPref("confirmDelete")) {
			var text = archivefbUtils.getLocaleString("CONFIRM_DELETE");
			var ok = archivefbUtils.PROMPT.confirm(window, "[archivefb]", text);
			if (!ok)
				return false;
		}
		return true;
	},

};




var archivefbSearchUI = {

	get validTypes() { return ["fulltext", "title", "comment", "source", "id", "all"]; },

	_searchImage: null,

	_searchType: null,

	_treeRef: null,


	init: function() {
		this._treeRef = archivefbTreeUI.TREE.ref;
		this._searchImage = document.getElementById("archivefbSearchImage");
		this.changeType(this._searchImage.getAttribute("searchtype"));
	},

	uninit: function() {
		this._searchImage = null;
		this._searchType = null;
		this._treeRef = null;
	},

	onPopupShowing: function(event) {
		if (event.target.id != "archivefbSearchPopup")
			return;
		Array.forEach(event.target.childNodes, function(elt) {
			var type = elt.getAttribute("searchtype");
			if (!type)
				return;
			elt.setAttribute("checked", (type == this._searchType).toString());
		}, this);
	},

	changeType: function(aType) {
		if (this.validTypes.indexOf(aType) < 0)
			aType = "fulltext";
		this._searchType = aType;
		this._searchImage.setAttribute("searchtype", aType);
		this._searchImage.src = "chrome://archivefb/skin/search_" + aType + ".png";
		var textbox = document.getElementById("archivefbSearchTextbox");
		textbox.setAttribute("searchbutton", (aType == "fulltext").toString());
		var elt = document.getElementById("archivefbSearchPopup").querySelector("[searchtype=" + aType + "]");
		textbox.emptyText   = elt.getAttribute("label");
		textbox.placeholder = elt.getAttribute("label");
		textbox.focus();
	},

	onKeyPress: function(event) {
		if (event.keyCode != event.DOM_VK_RETURN)
			return;
		var val = event.target.value;
		if (val.length != 1)
			return;
		val = val.toLowerCase().replace("u", "s");
			this.validTypes.forEach(function(type) {
			if (type.charAt(0) == val) {
					this.changeType(type);
				this.reset();
			}
			}, this);
	},

	onCommand: function(aValue) {
		if (!aValue) {
			this.reset();
			return;
		}
		else if (/^\w$/.test(aValue)) {
			return;
		}
		else if (this._searchType == "fulltext") {
			this._doFullTextSearch(aValue);
		}
		else if (/^days:(\d+)$/i.test(aValue)) {
			aValue = parseInt(RegExp.$1, 10);
			var ymdList = [];
			var date = new Date();
			do {
				var y = date.getFullYear().toString();
				var m = ("0" + (date.getMonth() + 1).toString()).slice(-2);
				var d = ("0" +  date.getDate()      .toString()).slice(-2);
				ymdList.push(y + m + d);
				date.setTime(date.getTime() - 1000 * 60 * 60 * 24);
			}
			while (--aValue > 0);
			var tmpType = this._searchType;
			this._searchType = "id";
			this._doFilteringSearch(new RegExp("^(?:" + ymdList.join("|") + ")"));
			this._searchType = tmpType;
		}
		else {
			var re = document.getElementById("archivefbSearchPopupOptionRE").getAttribute("checked");
			var cs = document.getElementById("archivefbSearchPopupOptionCS").getAttribute("checked");
			this._doFilteringSearch(new RegExp(
				re == "true" ? aValue : aValue.replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1"), 
				cs == "true" ? "m" : "mi"
			));
		}
	},

	reset: function() {
		document.getElementById("archivefbMainToolbar").hidden = false;
		document.getElementById("archivefbSearchTextbox").value = "";
		if (archivefbTreeUI.TREE.ref != "urn:archivefb:search")
			return;
		archivefbTreeUI.TREE.ref = this._treeRef;
		archivefbTreeUI.TREE.builder.rebuild();
		archivefbTreeUI.enableDragDrop(true);
		archivefbData.clearContainer("urn:archivefb:search");
	},

	promptForDaysFilter: function() {
		var ret = { value: null };
		var title = archivefbUtils.getLocaleString("FILTER_BY_DAYS");
		if (!archivefbUtils.PROMPT.prompt(window, "[archivefb]", title, ret, null, {}))
			return;
		var days = ret.value;
		if (isNaN(days) || days <= 0)
			return;
		var textbox = document.getElementById("archivefbSearchTextbox");
		textbox.focus();
		textbox.value = "days:" + days.toString();
		textbox.doCommand();
	},

	updateCache: function(aRefURL) {
		window.openDialog(
			"chrome://archivefb/content/cache.xul", "archivefb:Cache", "chrome,dialog=no", aRefURL
		);
	},


	_doFullTextSearch: function(aValue) {
		var cache = archivefbUtils.getarchivefbDir().clone();
		cache.append("cache.rdf");
		var shouldRebuild = false;
		if (!cache.exists() || cache.fileSize < 1024 * 32) {
			shouldRebuild = true;
		}
		else {
			var modTime = cache.lastModifiedTime;
			if (modTime && ((new Date()).getTime() - modTime) > 1000 * 60 * 60 * 24 * 5)
				shouldRebuild = true;
		}
		var url = "chrome://archivefb/content/result.xul";
		var query = "?q=" + aValue;
		if (document.getElementById("archivefbSearchPopupOptionRE").getAttribute("checked") == "true")
			query += "&re=true";
		if (document.getElementById("archivefbSearchPopupOptionRE").getAttribute("checked") == "true")
			query += "&cs=true";
		if (this._treeRef != "urn:archivefb:root")
			query += "&ref=" + this._treeRef;
		if (shouldRebuild) {
			this.updateCache(url + query);
		}
		else {
			var win = archivefbUtils.getBrowserWindow();
			for (var i = 0; i < win.gBrowser.browsers.length; i++) {
				var browser = win.gBrowser.browsers[i];
				if (browser.currentURI.spec.indexOf(url) == 0) {
					win.focus();
					win.gBrowser.tabContainer.selectedIndex = i;
					win.gBrowser.loadURI(url + query);
					return;
				}
			}
			archivefbUtils.loadURL(url + query, archivefbUtils.getPref("tabs.searchResult"));
			win.focus();
		}
	},

	_doFilteringSearch: function(aRegex) {
		archivefbData.clearContainer("urn:archivefb:search");
		var container = archivefbData.getContainer("urn:archivefb:search", true);
		var rootRes = archivefbUtils.RDF.GetResource(this._treeRef);
		var resList = archivefbData.flattenResources(rootRes, 2, true);
		resList.forEach(function(res) {
			if (archivefbData.getProperty(res, "type") == "separator")
				return;
			var val;
			if (this._searchType != "all")
				val = archivefbData.getProperty(res, this._searchType);
			else
				var val = ["title", "comment", "source", "id"].map(function(prop) {
					return archivefbData.getProperty(res, prop);
				}).join("\n");
			if (val && aRegex.test(val))
				container.AppendElement(res);
		}, this);
		archivefbTreeUI.TREE.ref = "urn:archivefb:search";
		archivefbTreeUI.TREE.builder.rebuild();
		archivefbTreeUI.enableDragDrop(false);
		document.getElementById("archivefbMainToolbar").hidden = true;
	},

};



