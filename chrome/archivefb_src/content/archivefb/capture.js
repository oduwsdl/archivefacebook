
var gURLs       = [];
var gDepths     = [];
var gRefURL     = "";
var gShowDetail = false;
var gResName    = "";
var gResIdx     = 0;
var gReferItem  = null;
var gOption     = {};
var gFile2URL   = {};
var gURL2Name   = {};
var gPreset     = [];
var gContext    = "";




function ARCHIVEFB_trace(aMessage)
{
	document.getElementById("archivefbCaptureTextbox").value = aMessage;
}


function ARCHIVEFB_initCapture()
{
	var myURLs  = window.arguments[0];
	gRefURL     = window.arguments[1];
	gShowDetail = window.arguments[2];
	gResName    = window.arguments[3];
	gResIdx     = window.arguments[4];
	gReferItem  = window.arguments[5];
	gOption     = window.arguments[6];
	gFile2URL   = window.arguments[7];
	gPreset     = window.arguments[8];
	if ( gReferItem )
	{
		gContext = "indepth";
		gURL2Name[unescape(gReferItem.source)] = "index";
	}
	else if ( gPreset )
	{
		gContext = gPreset[1] == "index" ? "capture-again" : "capture-again-deep";
		if ( gContext == "capture-again-deep" )
		{
			var contDir = archivefbUtils.getContentDir(gPreset[0]);
			var file = contDir.clone();
			file.append("archivefb-file2url.txt");
			if ( !file.exists() ) { archivefbUtils.alert("ERROR: Could not find 'archivefb-file2url.txt'."); window.close(); }
			var lines = archivefbUtils.readFile(file).split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 ) gFile2URL[arr[0]] = arr[1];
			}
			file = archivefbUtils.getContentDir(gPreset[0]).clone();
			file.append("archivefb-url2name.txt");
			if ( !file.exists() ) { archivefbUtils.alert("ERROR: Could not find 'archivefb-url2name.txt'."); window.close(); }
			lines = archivefbUtils.readFile(file).split("\n");
			for ( i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 )
				{
					gURL2Name[arr[0]] = arr[1];
					if ( arr[1] == gPreset[1] ) myURLs = [arr[0]];
				}
			}
			gPreset[3] = gFile2URL;
			if ( !myURLs[0] ) { archivefbUtils.alert("ERROR: Could not find the source URL for " + gPreset[1] + ".html."); window.close(); }
		}
	}
	else gContext = "link";
	if ( !gOption ) gOption = {};
	if ( !("script" in gOption ) ) gOption["script"] = false;
	if ( !("images" in gOption ) ) gOption["images"] = true;
	archivefbInvisibleBrowser.init();
	archivefbCaptureTask.init(myURLs);
	gURLs.length == 1 ? archivefbCaptureTask.start() : archivefbCaptureTask.countDown();
}


function ARCHIVEFB_splitByAnchor(aURL)
{
	var pos = 0;
	return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
}


function ARCHIVEFB_suggestName(aURL)
{
	var baseName = archivefbUtils.validateFileName(archivefbUtils.splitFileName(archivefbUtils.getFileName(aURL))[0]);
	baseName = baseName.toLowerCase();
	if ( baseName == "index" ) baseName = "default";
	if ( !baseName ) baseName = "default";
	var name = baseName + ".html";
	var seq = 0;
	while ( gFile2URL[name] ) name = baseName + "_" + archivefbContentSaver.leftZeroPad3(++seq) + ".html";
	name = archivefbUtils.splitFileName(name)[0];
	gFile2URL[name + ".html"] = aURL;
	gFile2URL[name + ".css"]  = true;
	return name;
}


function ARCHIVEFB_fireNotification(aItem)
{
	archivefbUtils.getBrowserWindow().archivefbCaptureObserverCallback.onCaptureComplete(aItem);
}




var archivefbCaptureTask = {

	get INTERVAL() { return 1; },
	get LISTBOX()  { return document.getElementById("archivefbCaptureListbox"); },
	get STRING()   { return document.getElementById("archivefbCaptureString"); },
	get URL()      { return gURLs[this.index]; },

	index       : 0,
	contentType : "",
	isDocument  : false,
	canRefresh  : true,
	sniffer     : null,
	seconds     : 5,
	timerID     : 0,
	forceExit   : 0,

	init : function(myURLs)
	{
		if ( gContext != "indepth" && myURLs.length == 1 )
		{
			this.LISTBOX.collapsed = true;
			this.LISTBOX.setAttribute("class", "plain");
			document.getElementById("archivefbCaptureSkipButton").hidden = true;
		}
		else
		{
			this.LISTBOX.setAttribute("rows", 10);
		}
		if ( gContext == "indepth" )
		{
			var button = document.getElementById("archivefbCaptureFilterButton");
			button.hidden = false;
			button.nextSibling.hidden = false;
			button.firstChild.firstChild.label += " (" + archivefbUtils.getRootHref(gReferItem.source) + ")" ;
			button.firstChild.firstChild.nextSibling.label += " (" + archivefbUtils.getBaseHref(gReferItem.source) + ")";
		}
		for ( var i = 0; i < myURLs.length; i++ ) this.add(myURLs[i], 1);
	},

	add : function(aURL, aDepth)
	{
		if ( gURLs.length > 10000 ) return;
		if ( !aURL.match(/^(http|https|ftp|file):\/\//i) ) return;
		if ( gContext == "indepth" )
		{
			if ( aDepth > gOption["inDepth"] ) {
				return;
			}
			aURL = ARCHIVEFB_splitByAnchor(aURL)[0];
			if ( !gOption["isPartial"] && aURL == gReferItem.source ) return;
			if ( gURLs.indexOf(aURL) != -1 ) return;
		}
		gURLs.push(aURL);
		gDepths.push(aDepth);
		var listitem = document.createElement("listitem");
		listitem.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
		listitem.setAttribute("type", "checkbox");
		listitem.setAttribute("checked", this.filter(gURLs.length - 1));
		this.LISTBOX.appendChild(listitem);
	},

	start : function(aOverriddenURL)
	{
		this.seconds = -1;
		this.toggleStartPause(true);
		this.toggleSkipButton(true);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("indicated", true);
		if ( this.index > 0 ) this.LISTBOX.getItemAtIndex(this.index - 1).removeAttribute("indicated");
		this.LISTBOX.ensureIndexIsVisible(this.index);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("disabled", true);
		if ( !listitem.checked )
		{
			this.next(true);
			return;
		}
		this.contentType = "";
		this.isDocument = true;
		this.canRefresh = true;
		var url = aOverriddenURL || gURLs[this.index];
		ARCHIVEFB_trace(this.STRING.getString("CONNECT") + "... " + url);
		if ( url.indexOf("file://") == 0 ) {
			archivefbInvisibleBrowser.load(url);
		} else {
			this.sniffer = new archivefbHeaderSniffer(url, gRefURL);
			this.sniffer.httpHead();
		}
	},

	succeed : function()
	{
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("status", "succeed");
		this.next(false);
	},

	fail : function(aErrorMsg)
	{
		if ( aErrorMsg ) ARCHIVEFB_trace(aErrorMsg);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("label", gDepths[this.index] + " [" + this.index + "] " + aErrorMsg);
		listitem.setAttribute("status", "failure");
		if ( gURLs.length > 1 ) {
			this.next(true);
		} else {
			this.toggleStartPause(false);
		}
	},

	next : function(quickly)
	{
		this.toggleStartPause(true);
		this.toggleSkipButton(false);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("disabled", true);
		this.LISTBOX.getItemAtIndex(this.index).removeAttribute("indicated");
		if ( this.sniffer ) this.sniffer.onHttpSuccess = function(){};
		archivefbInvisibleBrowser.ELEMENT.stop();
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			if ( quickly || gURLs[this.index].indexOf("file://") == 0 ) {
				window.setTimeout(function(){ archivefbCaptureTask.start(); }, 0);
			} else {
				this.seconds = this.INTERVAL;
				archivefbCaptureTask.countDown();
			}
		}
	},

	countDown : function()
	{
		ARCHIVEFB_trace(this.STRING.getFormattedString("WAITING", [archivefbCaptureTask.seconds]) + "...");
		if ( --this.seconds > 0 )
			this.timerID = window.setTimeout(function(){ archivefbCaptureTask.countDown(); }, 1000);
		else
			this.timerID = window.setTimeout(function(){ archivefbCaptureTask.start(); }, 1000);
	},

	finalize : function()
	{
		if ( gContext == "indepth" )
		{
			archivefbCrossLinker.invoke();
		}
		else
		{
			if ( gURLs.length > 1 ) ARCHIVEFB_fireNotification(null);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

	activate : function()
	{
		this.toggleStartPause(true);
		if ( this.seconds < 0 )
			archivefbCaptureTask.start();
		else
			this.countDown();
	},

	pause : function()
	{
		this.toggleStartPause(false);
		if ( this.seconds < 0 ) {
			archivefbInvisibleBrowser.ELEMENT.stop();
		} else {
			this.seconds++;
			window.clearTimeout(this.timerID);
		}
	},

	abort : function()
	{
		if ( gContext != "indepth" ) window.close();
		if ( ++this.forceExit > 2 ) window.close();
		if ( this.index < gURLs.length - 1 ) { this.index = gURLs.length - 1; this.next(); }
	},

	toggleStartPause : function(allowPause)
	{
		document.getElementById("archivefbCapturePauseButton").disabled = false;
		document.getElementById("archivefbCapturePauseButton").hidden = !allowPause;
		document.getElementById("archivefbCaptureStartButton").hidden =  allowPause;
		document.getElementById("archivefbCaptureTextbox").disabled   = !allowPause;
	},

	toggleSkipButton : function(willEnable)
	{
		document.getElementById("archivefbCaptureSkipButton").disabled = !willEnable;
	},

	filter : function(i)
	{
		return true;
	},

	applyFilter : function(type)
	{
		switch ( type )
		{
			case "D" : var ref = archivefbUtils.getRootHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "L" : var ref = archivefbUtils.getBaseHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "S" : 
				var ret = { value : "" };
				if ( !archivefbUtils.PROMPT.prompt(window, "[Archive Facebook]", this.STRING.getString("FILTER_BY_STRING"), ret, null, {}) ) return;
				if ( ret.value ) this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ret.value.toLowerCase()) != -1; };
				break;
			case "N" : this.filter = function(i){ return true;  }; break;
			case "F" : this.filter = function(i){ return false; }; break;
			case "I" : this.filter = function(i){ return !archivefbCaptureTask.LISTBOX.getItemAtIndex(i).checked; }; break;
			default  : return;
		}
		for ( var i = this.index; i < gURLs.length; i++ )
		{
			this.LISTBOX.getItemAtIndex(i).checked = this.filter(i);
		}
	},

};




var archivefbInvisibleBrowser = {

	get ELEMENT() { return document.getElementById("archivefbCaptureBrowser"); },

	fileCount : 0,
	onload    : null,

	init : function()
	{
		this.ELEMENT.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
		this.onload = function(){ archivefbInvisibleBrowser.execCapture(); };
		this.ELEMENT.addEventListener("load", archivefbInvisibleBrowser.onload, true);
	},

	refreshEvent : function(aEvent)
	{
		this.ELEMENT.removeEventListener("load", this.onload, true);
		this.onload = aEvent;
		this.ELEMENT.addEventListener("load", this.onload, true);
	},

	load : function(aURL)
	{
		this.fileCount = 0;
		this.ELEMENT.docShell.allowJavascript = gOption["script"];
		this.ELEMENT.docShell.allowImages     = gOption["images"];
		this.ELEMENT.docShell.allowMetaRedirects = false;
		this.ELEMENT.docShell.QueryInterface(Ci.nsIDocShellHistory).useGlobalHistory = false;
		this.ELEMENT.loadURI(aURL, null, null);
	},

	execCapture : function()
	{
		ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("CAPTURE_START"));
		document.getElementById("archivefbCapturePauseButton").disabled = true;
		archivefbCaptureTask.toggleSkipButton(false);
		var ret = null;
		var preset = gReferItem ? [gReferItem.id, ARCHIVEFB_suggestName(archivefbCaptureTask.URL), gOption, gFile2URL, gDepths[archivefbCaptureTask.index]] : null;
		if ( gPreset ) preset = gPreset;
		if ( this.ELEMENT.contentDocument.body && archivefbCaptureTask.isDocument )
		{
			var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
			for ( var i = 0; i < metaElems.length; i++ )
			{
				if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
				     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
				     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) )
				{
					var newURL = archivefbUtils.resolveURL(archivefbCaptureTask.URL, RegExp.$1);
					if ( newURL != archivefbCaptureTask.URL && archivefbCaptureTask.canRefresh )
					{
						gURLs[archivefbCaptureTask.index] = newURL;
						archivefbCaptureTask.canRefresh = false;
						this.ELEMENT.loadURI(newURL, null, null);
						return;
					}
				}
			}
			ret = archivefbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset, gContext);
		}
		else
		{
			var type = archivefbCaptureTask.contentType.match(/image/i) ? "image" : "file";
			ret = archivefbContentSaver.captureFile(archivefbCaptureTask.URL, gRefURL ? gRefURL : archivefbCaptureTask.URL, type, gShowDetail, gResName, gResIdx, preset, gContext);
		}
		if ( ret )
		{
			if ( gContext == "indepth" )
			{
				gURL2Name[unescape(archivefbCaptureTask.URL)] = ret[0];
				gFile2URL = ret[1];
			}
			else if ( gContext == "capture-again-deep" )
			{
				gFile2URL = ret[1];
				var contDir = archivefbUtils.getContentDir(gPreset[0]);
				var txtFile = contDir.clone();
				txtFile.append("archivefb-file2url.txt");
				var txt = "";
				for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
				archivefbUtils.writeFile(txtFile, txt, "UTF-8");
			}
		}
		else
		{
			if ( gShowDetail ) window.close();
			ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("CAPTURE_ABORT"));
			archivefbCaptureTask.fail("");
		}
	},

	QueryInterface : function(aIID)
	{
		if (aIID.equals(Ci.nsIWebProgressListener) ||
			aIID.equals(Ci.nsISupportsWeakReference) ||
			aIID.equals(Ci.nsIXULBrowserWindow) ||
			aIID.equals(Ci.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
		{
			ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("LOADING") + "... " + (++this.fileCount) + " " + (archivefbCaptureTask.URL ? archivefbCaptureTask.URL : this.ELEMENT.contentDocument.title));
		}
	},

	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress != aMaxTotalProgress )
		{
			ARCHIVEFB_trace(archivefbCaptureObserverCallback.getString("TRANSFER_DATA") + "... (" + aCurTotalProgress + " Bytes)");
		}
	},

	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},

};




var archivefbCrossLinker = {

	get ELEMENT(){ return document.getElementById("archivefbCaptureBrowser"); },

	index    : -1,
	baseURL  : "",
	nameList : [],

	XML      : null,
	rootNode : null,
	nodeHash : {},

	invoke : function()
	{
		archivefbData.setProperty(archivefbUtils.RDF.GetResource("urn:archivefb:item" + gReferItem.id), "type", "site");
		archivefbInvisibleBrowser.refreshEvent(function(){ archivefbCrossLinker.exec(); });
		this.ELEMENT.docShell.allowImages = false;
		archivefbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
		{
			if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
			{
				ARCHIVEFB_trace(archivefbCaptureTask.STRING.getFormattedString("REBUILD_LINKS", [archivefbCrossLinker.index + 1, archivefbCrossLinker.nameList.length]) + "... "
					+ ++archivefbInvisibleBrowser.fileCount + " : " + archivefbCrossLinker.nameList[archivefbCrossLinker.index] + ".html");
			}
		};
		this.baseURL = archivefbUtils.IO.newFileURI(archivefbUtils.getContentDir(gReferItem.id)).spec;
		this.nameList.push("index");
		for ( var url in gURL2Name )
		{
			this.nameList.push(gURL2Name[url]);
		}
		this.XML = document.implementation.createDocument("", "", null);
		this.rootNode = this.XML.createElement("site");
		this.start();
	},

	start : function()
	{
		if ( ++this.index < this.nameList.length )
		{
			archivefbInvisibleBrowser.fileCount = 0;
			this.ELEMENT.loadURI(this.baseURL + this.nameList[this.index] + ".html", null, null);
		}
		else
		{
			ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("REBUILD_LINKS_COMPLETE"));
			this.flushXML();
			ARCHIVEFB_fireNotification(gReferItem);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

	exec : function()
	{
		if ( this.ELEMENT.currentURI.scheme != "file" )
		{
			return;
		}
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(this.ELEMENT.contentWindow);
		if ( !this.nodeHash[this.nameList[this.index]] )
		{
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], gReferItem.title);
			this.nodeHash[this.nameList[this.index]].setAttribute("title", archivefbData.sanitize(this.ELEMENT.contentTitle));
		}
		else
		{
			this.nodeHash[this.nameList[this.index]].setAttribute("title", archivefbData.sanitize(this.ELEMENT.contentTitle));
		}
		for ( var f = 0; f < archivefbContentSaver.frameList.length; f++ )
		{
			var doc = archivefbContentSaver.frameList[f].document;
			if ( !doc.links ) continue;
			var shouldSave = false;
			var linkList = doc.links;
			for ( var i = 0; i < linkList.length; i++ )
			{
				var urlLR = ARCHIVEFB_splitByAnchor(unescape(linkList[i].href));
				if ( gURL2Name[urlLR[0]] )
				{
					var name = gURL2Name[urlLR[0]];
					linkList[i].href = name + ".html" + urlLR[1];
					linkList[i].setAttribute("indepth", "true");
					if ( !this.nodeHash[name] )
					{
						var text = linkList[i].text ? linkList[i].text.replace(/\r|\n|\t/g, " ") : "";
						if ( text.replace(/\s/g, "") == "" ) text = "";
						this.nodeHash[name] = this.createNode(name, text);
						if ( !this.nodeHash[name] ) this.nodeHash[name] = name;
						this.nodeHash[this.nameList[this.index]].appendChild(this.nodeHash[name]);
					}
					shouldSave = true;
				}
			}
			if ( shouldSave )
			{
				var rootNode = doc.getElementsByTagName("html")[0];
				var src = "";
				src = archivefbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
				src = archivefbContentSaver.doctypeToString(doc.doctype) + src;
				var file = archivefbUtils.getContentDir(gReferItem.id);
				file.append(archivefbUtils.getFileName(doc.location.href));
				archivefbUtils.writeFile(file, src, doc.characterSet);
			}
		}
		this.forceReloading(gReferItem.id, this.nameList[this.index]);
		this.start();
	},

	createNode : function(aName, aText)
	{
		aText = archivefbUtils.crop(aText, 100);
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", archivefbData.sanitize(aText));
		return node;
	},

	flushXML : function()
	{
		this.rootNode.appendChild(this.nodeHash["index"]);
		this.XML.appendChild(this.rootNode);
		var src = "";
		src += '<?xml version="1.0" encoding="UTF-8"?>\n';
		src += '<?xml-stylesheet href="../../sitemap.xsl" type="text/xsl" media="all"?>\n';
		src += (new XMLSerializer()).serializeToString(this.XML).replace(/></g, ">\n<");
		src += '\n';
		var xslFile = archivefbUtils.getArchiveFBDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) archivefbUtils.saveTemplateFile("chrome://archviefb/skin/sitemap.xsl", xslFile);
		var contDir = archivefbUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		archivefbUtils.writeFile(xmlFile, src, "UTF-8");
		var txt = "";
		var txtFile1 = contDir.clone();
		txtFile1.append("archivefb-file2url.txt");
		for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
		archivefbUtils.writeFile(txtFile1, txt, "UTF-8");
		txt = "";
		var txtFile2 = contDir.clone();
		txtFile2.append("archivefb-url2name.txt");
		for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
		archivefbUtils.writeFile(txtFile2, txt, "UTF-8");
	},

	forceReloading : function(aID, aName)
	{
		try {
			var win = archivefbUtils.getBrowserWindow();
			var nodes = win.gBrowser.mTabContainer.childNodes;
			for ( var i = 0; i < nodes.length; i++ )
			{
				var uri = win.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
				if ( uri.indexOf("/data/" + aID + "/" + aName + ".html") > 0 )
				{
					win.gBrowser.getBrowserForTab(nodes[i]).reload();
				}
			}
		} catch(ex) {
		}
	},

};




function archivefbHeaderSniffer(aURLSpec, aRefURLSpec)
{
	this.URLSpec    = aURLSpec;
	this.refURLSpec = aRefURLSpec;
}


archivefbHeaderSniffer.prototype = {

	_URL     : Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURL),
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
			this._channel = archivefbUtils.IO.newChannelFromURI(this._URL).QueryInterface(Ci.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if (this.refURLSpec && this.refURLSpec.indexOf("http") == 0)
				this._channel.setRequestHeader("Referer", this.refURLSpec, false);
		} catch(ex) {
			this.onHttpError("Invalid URL");
		}
		try {
			this._channel.requestMethod = "HEAD";
			this._channel.asyncOpen(this, this);
		} catch(ex) {
			this.onHttpError(ex);
		}
	},

	getHeader : function(aHeader)
	{
	 	try { return this._channel.getResponseHeader(aHeader); } catch(ex) { return ""; }
	},

	getStatus : function()
	{
		try { return this._channel.responseStatus; } catch(ex) { return ""; }
	},

	visitHeader : function(aHeader, aValue)
	{
		this._headers[aHeader] = aValue;
	},

	onDataAvailable : function(aRequest, aContext, aInputStream, aOffset, aCount) {},
	onStartRequest  : function(aRequest, aContext) {},
	onStopRequest   : function(aRequest, aContext, aStatus) { this.onHttpSuccess(); },

	onHttpSuccess : function()
	{
		archivefbCaptureTask.contentType = this.getHeader("Content-Type");
		var httpStatus = this.getStatus();
		ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("CONNECT_SUCCESS") + " (Content-Type: " + archivefbCaptureTask.contentType + ")");
		switch ( httpStatus )
		{
			case 404 : archivefbCaptureTask.fail(archivefbCaptureTask.STRING.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : archivefbCaptureTask.fail(archivefbCaptureTask.STRING.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : archivefbCaptureTask.fail("500 Internal Server Error"); return;
		}
		var redirectURL = this.getHeader("Location");
		if ( redirectURL )
		{
			if ( redirectURL.indexOf("http") != 0 ) redirectURL = this._URL.resolve(redirectURL);
			archivefbCaptureTask.start(redirectURL);
			return;
		}
		if ( !archivefbCaptureTask.contentType )
		{
			archivefbCaptureTask.contentType = "text/html";
		}
		var func = function(val) { return archivefbCaptureTask.contentType.indexOf(val) >= 0; };
		archivefbCaptureTask.isDocument = ["text/plain", "html", "xml"].some(func);
		if (archivefbCaptureTask.isDocument) {
			archivefbInvisibleBrowser.load(this.URLSpec);
		}
		else {
			if ( gContext == "indepth" ) {
				archivefbCaptureTask.next(true);
			} else {
				archivefbInvisibleBrowser.execCapture();
			}
		}
	},

	onHttpError : function(aErrorMsg)
	{
		archivefbCaptureTask.fail(archivefbCaptureTask.STRING.getString("CONNECT_FAILURE") + " (" + aErrorMsg + ")");
	},

};




archivefbCaptureObserverCallback.getString = function(aBundleName)
{
	return document.getElementById("archivefbOverlayString").getString(aBundleName);
},

archivefbCaptureObserverCallback.trace = function(aText)
{
	ARCHIVEFB_trace(aText);
};

archivefbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	if ( gContext != "indepth" && gURLs.length == 1 ) ARCHIVEFB_fireNotification(aItem);
	if ( gContext == "capture-again" || gContext == "capture-again-deep" )
	{
		archivefbCrossLinker.forceReloading(gPreset[0], gPreset[1]);
		var res = archivefbUtils.RDF.GetResource("urn:archivefb:item" + gPreset[0]);
		archivefbData.setProperty(res, "chars", aItem.chars);
		if ( gPreset[5] ) archivefbData.setProperty(res, "type", "");
	}
	archivefbCaptureTask.succeed();
};


