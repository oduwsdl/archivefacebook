
var archivefbMultipleService = {

	get STATUS()  { return document.getElementById("archivefbStatus"); },
	get TEXTBOX() { return document.getElementById("archivefbTextbox"); },

	init : function()
	{
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("accept").label = archivefbUtils.getLocaleString("CAPTURE_OK_BUTTON");
		document.documentElement.getButton("accept").accesskey = "C";
		this.TEXTBOX.focus();
		archivefbFolderSelector2.init();
		setTimeout(function(){ archivefbMultipleService.pasteClipboardURL(); }, 0);
	},

	done : function()
	{
		var urlList = [];
		var urlHash = {};
		var lines = this.TEXTBOX.value.split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			if ( lines[i].length > 5 ) urlHash[lines[i]] = true;
		}
		for ( var url in urlHash ) { urlList.push(url); }
		if ( urlList.length < 1 ) return;
		window.openDialog(
			"chrome://archivefb/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			urlList, "", false, archivefbFolderSelector2.resURI, 0, null, null ,null
		);
	},

	addURL : function(aURL)
	{
		if ( !aURL.match(/^(http|https|ftp|file):\/\//) ) return;
		this.TEXTBOX.value += aURL + "\n";
	},

	clear : function()
	{
		this.TEXTBOX.value = "";
	},

	pasteClipboardURL : function()
	{
		try {
			var clip  = Cc['@mozilla.org/widget/clipboard;1'].createInstance(Ci.nsIClipboard);
			var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var str = new Object();
			var len = new Object();
			trans.getTransferData("text/unicode", str, len);
			if ( str ) {
				str = str.value.QueryInterface(Ci.nsISupportsString);
				this.addURL(str.toString());
			}
		} catch(ex) {
		}
	},

	detectURLsOfTabs : function()
	{
		this.clear();
		var nodes = window.opener.gBrowser.mTabContainer.childNodes;
		for ( var i = 0; i < nodes.length; i++ )
		{
			this.addURL(window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href);
		}
	},

	detectURLsInPage : function()
	{
		this.clear();
		var node = window.opener.top.content.document.body;
		traceTree : while ( true )
		{
			if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement )
			{
				this.addURL(node.href);
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
	},

	detectURLsInSelection : function()
	{
		this.clear();
		var sel = window.opener.top.archivefbPageEditor.getSelection();
		if ( !sel ) return;
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = window.opener.top.content.document.createRange();
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement )
				{
					this.addURL(node.href);
				}
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
	},

};




var archivefbURLDetector1 = {

	index : 0,

	run : function()
	{
		this.index = 0;
		var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		FP.init(window, "", FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			archivefbMultipleService.clear();
			this.inspectDirectory(FP.file, 0);
		}
	},

	inspectDirectory : function(aDir, curIdx)
	{
		archivefbMultipleService.STATUS.value = archivefbUtils.getLocaleString("SCANNING") + 
		                                 " (" + curIdx + "/" + this.index + ")... " + aDir.path;
		var entries = aDir.directoryEntries;
		while ( entries.hasMoreElements() )
		{
			var entry = entries.getNext().QueryInterface(Ci.nsILocalFile);
			if ( entry.isDirectory() ) {
				this.inspectDirectoryWithDelay(entry, ++this.index);
			} else {
				if ( entry.leafName.match(/\.(html|htm)$/i) ) archivefbMultipleService.addURL(archivefbUtils.convertFilePathToURL(entry.path));
			}
		}
		if ( curIdx == this.index ) archivefbMultipleService.STATUS.value = "";
	},

	inspectDirectoryWithDelay : function(aDir, aIndex)
	{
		setTimeout(function(){ archivefbURLDetector1.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
	},

};


var archivefbURLDetector2 = {

	type   : "",
	index  : 0,
	lines  : [],
	result : "",
	weboxBaseURL : "",

	run : function(aType)
	{
		this.type = aType;
		this.index = 0;
		this.lines = [];
		this.result = "";
		this.weboxBaseURL = "";
		var theFile ;
		if ( this.type == "W" ) {
			var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			FP.init(window, "Select default.html of WeBoX.", FP.modeOpen);
			FP.appendFilters(FP.filterHTML);
			var answer = FP.show();
			if ( answer == FP.returnOK ) theFile = FP.file;
			else return;
			this.weboxBaseURL = theFile.parent.path + '\\Data\\';
		} else {
			theFile = archivefbUtils.DIR.get("ProfD", Ci.nsIFile);
			theFile.append("bookmarks.html");
			if ( !theFile.exists() ) return;
		}
		archivefbMultipleService.clear();
		this.lines = archivefbUtils.readFile(theFile).split("\n");
		this.inspect();
	},

	inspect : function()
	{
		archivefbMultipleService.STATUS.value = archivefbUtils.getLocaleString("SCANNING")
		                               + "... (" + this.index + "/" + (this.lines.length-1) + ")";
		this.result += "\n";
		if ( this.type == "W" ) {
			if ( this.lines[this.index].match(/ LOCALFILE\=\"([^\"]+)\" /) )
				this.result += archivefbUtils.convertFilePathToURL(this.weboxBaseURL + RegExp.$1);
		} else {
			if ( this.lines[this.index].match(/ HREF\=\"([^\"]+)\" /) )
				this.result += RegExp.$1;
		}
		if ( ++this.index < this.lines.length ) {
			setTimeout(function(){ archivefbURLDetector2.inspect(); }, 0);
		} else {
			this.result = this.result.replace(/\n\n+/g, "\n\n");
			this.result = this.result.replace(/^\n+/, "");
			archivefbMultipleService.TEXTBOX.value = this.result;
			archivefbMultipleService.STATUS.value = "";
		}
	},

};


