
var archivefbCombineService = {


	get WIZARD()  { return document.getElementById("archivefbCombineWizard"); },
	get STRING()  { return document.getElementById("archivefbCombineString"); },
	get LISTBOX() { return document.getElementById("archivefbCombineListbox"); },
	get curID()   { return this.idList[this.index]; },
	get curRes()  { return this.resList[this.index]; },


	index   : 0,
	idList  : [],
	resList : [],
	parList : [],
	option  : {},
	prefix  : "",
	postfix : "",


	init : function()
	{
		gOption = { "script" : true, "images" : true };
		if ( window.top.location.href != "chrome://archivefb/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		window.top.document.getElementById("mbToolbarButton").disabled = true;
		this.index = 0;
		archivefbFolderSelector2.init();
		this.WIZARD.getButton("back").onclick = function(){ archivefbCombineService.undo(); };
		this.WIZARD.getButton("cancel").hidden = true;
		this.updateButtons();
	},

	done : function()
	{
		window.top.document.getElementById("mbToolbarButton").disabled = false;
	},

	add : function(aRes, aParRes)
	{
		if ( this.resList.indexOf(aRes) != -1 ) return;
		var type = ScrapBookData.getProperty(aRes, "type");
		if (type == "folder" || type == "separator")
			return;
		if (type == "site")
			ScrapBookUtils.alert(this.STRING.getString("WARN_ABOUT_INDEPTH"));
		var icon = ScrapBookData.getProperty(aRes, "icon");
		if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(type);
		var listItem = this.LISTBOX.appendItem(ScrapBookData.getProperty(aRes, "title"));
		listItem.setAttribute("class", "listitem-iconic");
		listItem.setAttribute("image", icon);
		this.idList.push(ScrapBookData.getProperty(aRes, "id"));
		this.resList.push(aRes);
		this.parList.push(aParRes);
		this.updateButtons();
	},

	undo : function()
	{
		if ( this.idList.length == 0 ) return;
		this.LISTBOX.removeItemAt(this.idList.length - 1);
		this.idList.pop();
		this.resList.pop();
		this.parList.pop();
		this.updateButtons();
	},

	updateButtons : function()
	{
		this.WIZARD.canRewind  = this.idList.length > 0;
		this.WIZARD.canAdvance = this.idList.length > 1;
	},

	initPreview : function()
	{
		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
		this.WIZARD.getButton("back").onclick = null;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.option["R"] = document.getElementById("archivefbCombineOptionRemove").checked;
		archivefbInvisibleBrowser.init();
		archivefbInvisibleBrowser.ELEMENT.removeEventListener("load", archivefbInvisibleBrowser.onload, true);
		archivefbInvisibleBrowser.onload = function(){ archivefbPageCombiner.exec(); };
		archivefbInvisibleBrowser.ELEMENT.addEventListener("load", archivefbInvisibleBrowser.onload, true);
		this.next();
	},

	next : function()
	{
		if ( this.index < this.idList.length )
		{
			this.prefix  = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
			this.postfix = ScrapBookData.getProperty(this.resList[this.index], "title");
			var type = ScrapBookData.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
				archivefbPageCombiner.exec(type);
			else
				archivefbInvisibleBrowser.load(ScrapBookUtils.getBaseHref(ScrapBookData.dataSource.URI) + "data/" + this.curID + "/index.html");
		}
		else
		{
			this.prefix  = "";
			this.postfix = "combine.html";
			this.donePreview();
		}
	},

	donePreview : function()
	{
		var htmlFile = ScrapBookUtils.getScrapBookDir();
		htmlFile.append("combine.html");
		ScrapBookUtils.writeFile(htmlFile, archivefbPageCombiner.htmlSrc, "UTF-8");
		var cssFile = ScrapBookUtils.getScrapBookDir();
		cssFile.append("combine.css");
		ScrapBookUtils.writeFile(cssFile, archivefbPageCombiner.cssText, "UTF-8");
		archivefbInvisibleBrowser.refreshEvent(function(){ archivefbCombineService.showBrowser(); });
		archivefbInvisibleBrowser.load(ScrapBookUtils.convertFilePathToURL(htmlFile.path));
	},

	showBrowser : function()
	{
		this.toggleElements(false);
		archivefbInvisibleBrowser.ELEMENT.onclick = function(aEvent){ aEvent.preventDefault(); };
		this.WIZARD.getButton("finish").disabled = false;
		this.WIZARD.getButton("finish").onclick = function(){ archivefbCombineService.finish(); };
	},

	finish : function()
	{
		this.WIZARD.getButton("finish").disabled = true;
		this.toggleElements(true);
		ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("CAPTURE_START"));
		setTimeout(function(){ archivefbContentSaver.captureWindow(archivefbInvisibleBrowser.ELEMENT.contentWindow, false, false, archivefbFolderSelector2.resURI, 0, null); }, 0);
	},

	toggleElements : function(isProgressMode)
	{
		archivefbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
		document.getElementById("archivefbCaptureTextbox").collapsed = !isProgressMode;
	},

	onCombineComplete : function(aItem)
	{
		var newRes = ScrapBookUtils.RDF.GetResource("urn:archivefb:item" + aItem.id);
		ScrapBookData.setProperty(newRes, "type", "combine");
		ScrapBookData.setProperty(newRes, "source", ScrapBookData.getProperty(this.resList[0], "source"));
		var newIcon = ScrapBookData.getProperty(this.resList[0], "icon");
		if ( newIcon.match(/\d{14}/) ) newIcon = "resource://archivefb/data/" + aItem.id + "/" + ScrapBookUtils.getFileName(newIcon);
		ScrapBookData.setProperty(newRes, "icon", newIcon);
		var newComment = "";
		for ( var i = 0; i < this.resList.length; i++ )
		{
			var comment = ScrapBookData.getProperty(this.resList[i], "comment");
			if ( comment ) newComment += comment + " __BR__ ";
		}
		if ( newComment ) ScrapBookData.setProperty(newRes, "comment", newComment);
		return newRes;
	},

	onDragOver: function(event) {
		if (event.dataTransfer.types.contains("moz/rdfitem"))
			event.preventDefault();
	},

	onDrop: function(event) {
		event.preventDefault();
		if (!event.dataTransfer.types.contains("moz/rdfitem"))
			return;
		var idxs = window.top.archivefbTreeUI.getSelection(false, 2);
		idxs.forEach(function(idx) {
			var res    = window.top.archivefbTreeUI.TREE.builderView.getResourceAtIndex(idx);
			var parRes = window.top.archivefbTreeUI.getParentResource(idx);
			archivefbCombineService.add(res, parRes);
		});
	},

};




var archivefbPageCombiner = {

	get BROWSER(){ return document.getElementById("archivefbCaptureBrowser"); },
	get BODY()   { return this.BROWSER.contentDocument.body; },

	htmlSrc : "",
	cssText : "",
	offsetTop : 0,
	isTargetCombined : false,

	exec : function(aType)
	{
		this.isTargetCombined = false;
		if ( archivefbCombineService.index == 0 )
		{
			this.htmlSrc += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">';
			this.htmlSrc += '<html><head>';
			this.htmlSrc += '<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">';
			this.htmlSrc += '<meta http-equiv="Content-Style-Type" content="text/css">';
			this.htmlSrc += '<title>' + ScrapBookData.getProperty(archivefbCombineService.curRes, "title") + '</title>';
			this.htmlSrc += '<link rel="stylesheet" href="combine.css" media="all">';
			this.htmlSrc += '<link rel="stylesheet" href="chrome://archivefb/skin/combine.css" media="all">';
			this.htmlSrc += '<link rel="stylesheet" href="chrome://archivefb/skin/annotation.css" media="all">';
			this.htmlSrc += '</head><body>\n';
		}
		if ( aType == "file" || aType == "bookmark" )
		{
			this.htmlSrc += this.getCiteHTML(aType);
		}
		else
		{
			this.processDOMRecursively(this.BROWSER.contentDocument.body);
			if ( !this.isTargetCombined ) this.htmlSrc += this.getCiteHTML(aType);
			this.htmlSrc += this.surroundDOM();
			this.cssText += this.surroundCSS();
			this.offsetTop += this.BROWSER.contentDocument.body.offsetHeight;
		}
		if ( archivefbCombineService.index == archivefbCombineService.idList.length - 1 )
		{
			this.htmlSrc += '\n</body>\n</html>\n';
		}
		archivefbCombineService.index++;
		archivefbCombineService.next();
	},

	getCiteHTML : function(aType)
	{
		var src   = '\n<!--' + archivefbCombineService.postfix + '-->\n';
		var title = ScrapBookUtils.crop(ScrapBookData.getProperty(archivefbCombineService.curRes, "title") , 100);
		var linkURL = "";
		switch ( aType )
		{
			case "file" :
				var htmlFile = ScrapBookUtils.getContentDir(archivefbCombineService.curID);
				htmlFile.append("index.html");
				var isMatch = ScrapBookUtils.readFile(htmlFile).match(/URL=\.\/([^\"]+)\"/);
				if ( isMatch ) linkURL = "./data/" + archivefbCombineService.curID + "/" + RegExp.$1;
				break;
			case "note" :
				linkURL = ""; break;
			default :
				linkURL = ScrapBookData.getProperty(archivefbCombineService.curRes, "source"); break;
		}
		var icon = ScrapBookData.getProperty(archivefbCombineService.curRes, "icon");
		if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(aType);
		if ( icon.indexOf("resource://") == 0 && icon.indexOf(archivefbCombineService.curID) > 0 )
		{
			icon = "./data/" + archivefbCombineService.curID + "/" + ScrapBookUtils.getFileName(icon);
		}
		src += '<cite class="archivefb-header' + '">\n';
		src += '\t<img src="' + icon + '" width="16" height="16">\n';
		src += '\t' + (linkURL ? '<a href="' + linkURL + '">' + title + '</a>' : title) + '\n';
		src += '</cite>\n';
		return src;
	},

	surroundDOM : function()
	{
		if ( this.BODY.localName.toUpperCase() != "BODY" )
		{
			ScrapBookUtils.alert(
				archivefbCombineService.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + 
				ScrapBookData.getProperty(archivefbCombineService.curRes, "title")
			);
			this.BROWSER.stop();
			window.location.reload();
		}
		var divElem = this.BROWSER.contentDocument.createElement("DIV");
		var bodyStyle = "";
		if ( this.BODY.hasAttribute("class") ) divElem.setAttribute("class", this.BODY.getAttribute("class"));
		if ( this.BODY.hasAttribute("bgcolor") ) bodyStyle += "background-color: " + this.BODY.getAttribute("bgcolor") + ";";
		if ( this.BODY.background ) bodyStyle += "background-image: url('" + this.BODY.background + "');";
		if ( bodyStyle ) divElem.setAttribute("style", bodyStyle);
		this.BROWSER.contentDocument.body.appendChild(divElem);
		var childNodes = this.BODY.childNodes;
		for ( var i = childNodes.length - 2; i >= 0; i-- )
		{
			var nodeName  = childNodes[i].nodeName.toUpperCase();
			if ( nodeName == "DIV" && childNodes[i].hasAttribute("class") && childNodes[i].getAttribute("class") == "archivefb-sticky" )
				childNodes[i].style.top = (parseInt(childNodes[i].style.top, 10) + this.offsetTop) + "px";
			else if ( nodeName == "CITE" && childNodes[i].hasAttribute("class") && childNodes[i].getAttribute("class") == "archivefb-header" ) continue;
			else if ( nodeName == "DIV"  && childNodes[i].id.match(/^item\d{14}$/) ) continue;
			divElem.insertBefore(childNodes[i], divElem.firstChild);
		}
		divElem.id  = "item" + archivefbCombineService.curID;
		divElem.appendChild(this.BROWSER.contentDocument.createTextNode("\n"));
		return this.BODY.innerHTML;
	},

	surroundCSS : function()
	{
		var ret = "";
		for ( var i = 0; i < this.BROWSER.contentDocument.styleSheets.length; i++ )
		{
			if ( this.BROWSER.contentDocument.styleSheets[i].href.indexOf("chrome") == 0 ) continue;
			var cssRules = this.BROWSER.contentDocument.styleSheets[i].cssRules;
			for ( var j = 0; j < cssRules.length; j++ )
			{
				var cssText = cssRules[j].cssText;
				if ( !this.isTargetCombined )
				{
					cssText = cssText.replace(/^html /,  "");
					cssText = cssText.replace(/^body /,  "");
					cssText = cssText.replace(/^body, /, ", ");
					cssText = cssText.replace(/position: absolute; /, "position: relative; ");
					cssText = "div#item" + archivefbCombineService.curID + " " + cssText;
				}
				var blanketLR = cssText.split("{");
				if ( blanketLR[0].indexOf(",") > 0 )
				{
					blanketLR[0] = blanketLR[0].replace(/,/g, ", div#item" + archivefbCombineService.curID);
					cssText = blanketLR.join("{");
				}
				ret += this.inspectCSSText(cssText) + "\n";
			}
		}
		return ret + "\n\n";
	},

	inspectCSSText : function(aCSSText)
	{
		var i = 0;
		var RE = new RegExp(/ url\(([^\'\)]+)\)/);
		while ( aCSSText.match(RE) && ++i < 10 )
		{
			aCSSText = aCSSText.replace(RE, " url('./data/" + archivefbCombineService.curID + "/" + RegExp.$1 + "')");
		}
		return aCSSText;
	},

	processDOMRecursively : function(rootNode)
	{
		for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
		{
			if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
			curNode = this.inspectNode(curNode);
			this.processDOMRecursively(curNode);
		}
	},

	inspectNode : function(aNode)
	{
		switch ( aNode.nodeName.toUpperCase() )
		{
			case "IMG" : case "EMBED" : case "IFRAME" : 
				if ( aNode.src ) aNode.setAttribute("src", aNode.src);
				break;
			case "OBJECT" : 
				if ( aNode.data ) aNode.setAttribute("data", aNode.data);
				break;
			case "BODY" : case "TABLE" : case "TD" : 
				aNode = this.setAbsoluteURL(aNode, "background");
				break;
			case "INPUT" : 
				if ( aNode.type.toLowerCase() == "image" ) aNode = this.setAbsoluteURL(aNode, "src");
				break;
			case "A" : 
			case "AREA" : 
				if ( aNode.href.indexOf("file://") == 0 ) aNode.setAttribute("href", aNode.href);
				break;
			case "CITE" : 
				if ( aNode.hasAttribute("class") && aNode.getAttribute("class") == "archivefb-header" ) this.isTargetCombined = true;
				break;
		}
		if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText);
			if ( newCSStext ) aNode.setAttribute("style", newCSStext);
		}
		return aNode;
	},

	setAbsoluteURL : function(aNode, aAttr)
	{
		if ( aNode.getAttribute(aAttr) )
		{
			aNode.setAttribute(aAttr, ScrapBookUtils.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
		}
		return aNode;
	},

};




archivefbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	var newRes = archivefbCombineService.onCombineComplete(aItem);
	if ( archivefbCombineService.option["R"] )
	{
		if ( archivefbCombineService.resList.length != archivefbCombineService.parList.length ) return;
		var rmIDs = window.top.archivefbController.removeInternal(archivefbCombineService.resList, archivefbCombineService.parList);
		if ( rmIDs ) ARCHIVEFB_trace(ScrapBookUtils.getLocaleString("ITEMS_REMOVED", [rmIDs.length]));
	}
	ARCHIVEFB_fireNotification(aItem);
	setTimeout(function()
	{
		window.top.archivefbManageUI.toggleRightPane("archivefbToolbarCombine");
		window.top.archivefbMainUI.locate(newRes);
	}, 500);
}


archivefbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
	if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
	{
		ARCHIVEFB_trace(archivefbCaptureTask.STRING.getString("LOADING") + "... " + archivefbCombineService.prefix + (++this.fileCount) + " " + archivefbCombineService.postfix);
	}
};



