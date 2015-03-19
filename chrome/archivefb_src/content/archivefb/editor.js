
var archivefbPageEditor = {

	get TOOLBAR() { return document.getElementById("archivefbEditor"); },
	get COMMENT() { return document.getElementById("archivefbEditComment"); },

	item : {},
	changed1 : false,
	changed2 : false,
	multiline : false,
	focusedWindow : null,
	savedBody : null,

	init : function(aID)
	{
		if ( aID )
		{
			if ( aID != archivefbBrowserOverlay.getID() ) return;
			if ( !archivefbData.exists(archivefbBrowserOverlay.resource) ) { this.disable(true); return; }
		}
		this.changed1 = false;
		this.changed2 = false;
		if ( aID ) {
			this.item = archivefbData.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = archivefbData.getProperty(archivefbBrowserOverlay.resource, prop);
		} else {
			this.item = null;
			archivefbBrowserOverlay.resource = null;
		}
		this.disable(false);
		this.showHide(true);
		if ( !aID )
		{
			document.getElementById("archivefbToolbox").hidden = false;
			archivefbInfoViewer.TOOLBAR.hidden = true;
		}
		document.getElementById("archivefbEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
		document.getElementById("archivefbEditIcon").src    = (aID ? this.item.icon  : gBrowser.selectedTab.getAttribute("image")) || archivefbUtils.getDefaultIcon();
		try { document.getElementById("archivefbEditTitle").editor.transactionManager.clear(); } catch(ex) {}
		this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
		try { this.COMMENT.editor.transactionManager.clear(); } catch(ex) {}
		if ( aID && gBrowser.currentURI.spec.indexOf("index.html") > 0 )
		{
			gBrowser.selectedTab.label = this.item.title;
			gBrowser.selectedTab.setAttribute("image", this.item.icon);
		}
		archivefbPageEditor.allowUndo();
		archivefbDOMEraser.init(0);
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < archivefbContentSaver.frameList.length; i++ )
		{
			archivefbContentSaver.frameList[i].document.removeEventListener("mousedown", archivefbAnnotationService.handleEvent, true);
			archivefbContentSaver.frameList[i].document.addEventListener("mousedown",    archivefbAnnotationService.handleEvent, true);
			archivefbContentSaver.frameList[i].document.removeEventListener("keypress", this.handleEvent, true);
			archivefbContentSaver.frameList[i].document.addEventListener("keypress",    this.handleEvent, true);
			if ( aID && document.getElementById("archivefbStatusPopupD").getAttribute("checked") ) archivefbInfoViewer.indicateLinks(archivefbContentSaver.frameList[i]);
		}
		if ( aID )
		{
			try {
				window.content.removeEventListener("beforeunload", this.handleEvent, true);
			}
			catch (ex) {}
			window.content.addEventListener("beforeunload", this.handleEvent, true);
		}
		var ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
		var restoredComment = ss.getTabValue(gBrowser.mCurrentTab, "archivefb-comment");
		if (restoredComment)
			document.getElementById("archivefbEditComment").value = restoredComment;
	},

	handleEvent : function(aEvent)
	{
		if ( aEvent.type == "keypress" )
		{
			if ( aEvent.altKey || aEvent.shiftKey || aEvent.ctrlKey || aEvent.metaKey ) return;
			var idx = 0;
			switch ( aEvent.charCode )
			{
				case aEvent.DOM_VK_1 : idx = 1; break;
				case aEvent.DOM_VK_2 : idx = 2; break;
				case aEvent.DOM_VK_3 : idx = 3; break;
				case aEvent.DOM_VK_4 : idx = 4; break;
				default : return;
			}
			if ( idx > 0 ) archivefbPageEditor.highlight(idx);
		}
		else if ( aEvent.type == "beforeunload" )
		{
			archivefbPageEditor.confirmSave();
		}
	},

	toggleComment : function()
	{
		this.multiline = !this.multiline;
		var val = this.COMMENT.value;
		this.COMMENT.setAttribute("multiline", this.multiline);
		this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
		if ( this.multiline ) {
			document.getElementById("archivefbToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("archivefbHighlighter"));
			val = val.replace(/\n/g, "\t");
		}
		document.getElementById("archivefbEditSpacer").setAttribute("flex", this.multiline ? 1 : 0);
		this.COMMENT.value = val;
		this.COMMENT.focus();
	},

	onInputComment: function(aValue)
	{
		var ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
		ss.setTabValue(gBrowser.mCurrentTab, "archivefb-comment", aValue);
		this.changed2 = true; 
	},

	getSelection : function()
	{
		this.focusedWindow = archivefbUtils.getFocusedWindow();
		var selText = this.focusedWindow.getSelection();
		var sel = selText.QueryInterface(Ci.nsISelectionPrivate);
		var isSelected = false;
		try {
			//issamenode is problematic in Gecko 10
			//isSelected = ( sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
			isSelected = false;
		}
		return isSelected ? sel : false;
	},

	cutter : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		sel.deleteFromDocument();
		this.changed1 = true;
	},

	highlight : function(idx)
	{
		if ( !idx ) idx = document.getElementById("archivefbHighlighter").getAttribute("color") || 4;
		document.getElementById("archivefbHighlighter").setAttribute("color", idx);
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		var attr = {};
		attr["class"] = "linemarker-marked-line";
		attr["style"] = archivefbUtils.getPref("highlighter.style." + idx, archivefbHighlighter.PRESET_STYLES[idx]);
		archivefbHighlighter.set(this.focusedWindow, sel, "span", attr);
		this.changed1 = true;
	},

	removeHighlights : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = window.content.document.createRange();
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node.nodeName.toUpperCase() == "SPAN" && node.getAttribute("class") == "linemarker-marked-line" )
				{
					this.stripAttributes(node);
				}
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
		this.changed1 = true;
	},

	removeAllSpan : function(aClassName)
	{
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < archivefbContentSaver.frameList.length; i++ )
		{
			var elems = archivefbContentSaver.frameList[i].document.getElementsByTagName("span");
			for ( var j = 0; j < elems.length; j++ )
			{
				if ( elems[j].getAttribute("class") == aClassName )
				{
					this.stripAttributes(elems[j]);
				}
			}
		}
		this.changed1 = true;
		this.allowUndo();
	},

	removeElementsByTagName : function(aTagName)
	{
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(window.content);
		var shouldSave = false;
		for ( var i = archivefbContentSaver.frameList.length - 1; i >= 0; i-- )
		{
			var elems = archivefbContentSaver.frameList[i].document.getElementsByTagName(aTagName);
			if ( elems.length < 1 ) continue;
			for ( var j = elems.length - 1; j >= 0; j-- )
			{
				archivefbContentSaver.removeNodeFromParent(elems[j]);
			}
			shouldSave = true;
		}
		if ( shouldSave )
		{
			this.changed1 = true;
			this.allowUndo();
		}
	},

	stripAttributes : function(aElement)
	{
		aElement.removeAttribute("style");
		aElement.removeAttribute("class");
		aElement.removeAttribute("title");
	},

	selection2Title : function(aElement)
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		aElement.value = archivefbUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
		sel.removeAllRanges();
		this.changed2 = true;
	},

	restore : function()
	{
		window.archivefbBrowserOverlay.lastLocation = "";
		window.content.location.reload();
	},

	exit : function(forceExit)
	{
		if ( !forceExit && this.confirmSave() == 1 ) this.restore();
		if ( archivefbDOMEraser.enabled ) archivefbDOMEraser.init(2);
		this.showHide(false);
	},

	allowUndo : function(aTargetDocument)
	{
		if ( aTargetDocument )
			this.savedBody = aTargetDocument.body.cloneNode(true);
		else
			delete this.savedBody;
	},

	undo : function()
	{
		if ( this.savedBody ) {
			this.savedBody.ownerDocument.body.parentNode.replaceChild(this.savedBody, this.savedBody.ownerDocument.body);
			this.allowUndo();
		} else {
			this.restore();
		}
	},

	confirmSave : function()
	{
		if ( this.changed2 ) this.saveResource();
		if ( !this.changed1 ) return 0;
		var button = archivefbUtils.PROMPT.BUTTON_TITLE_SAVE      * archivefbUtils.PROMPT.BUTTON_POS_0
		           + archivefbUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * archivefbUtils.PROMPT.BUTTON_POS_1;
		var text = archivefbBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [archivefbUtils.crop(this.item.title, 32)]);
		var ret = archivefbUtils.PROMPT.confirmEx(window, "[archivefb]", text, button, null, null, null, null, {});
		if ( ret == 0 ) this.savePage();
		this.changed1 = false;
		return ret;
	},

	saveOrCapture : function(aBypassDialog)
	{
		if ( archivefbBrowserOverlay.getID() ) {
			this.savePage();
			this.saveResource();
		} else {
			archivefbDOMEraser.init(2);
			var ret = archivefbBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:archivefb:root");
			if ( ret ) this.exit(true);
		}
	},

	savePage : function()
	{
		if ( !archivefbData.exists(archivefbBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window.content.location.href;
		if ( curURL.indexOf("resource://archivefb/data/") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			archivefbUtils.alert("ERROR: Cannot save file '" + RegExp.$2 + "'.");
			return;
		}
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(window.content);
		this.disable(true);
		archivefbDOMEraser.init(2);
		for ( var i = 0; i < archivefbContentSaver.frameList.length; i++ )
		{
			this.removeAllStyles(archivefbContentSaver.frameList[i]);
			var doc = archivefbContentSaver.frameList[i].document;
			if ( doc.contentType != "text/html" )
			{
				archivefbUtils.alert("ERROR: Cannot modify " + doc.contentType + " content.");
				continue;
			}
			var rootNode = doc.getElementsByTagName("html")[0];
			var src = "";
			src = archivefbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
			src = archivefbContentSaver.doctypeToString(doc.doctype) + src;
			src = src.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
			src = src.replace(/<span>([^<]*)<\/span>/g, "$1");
			src = src.replace(/<head>\n+/, "<head>\n");
			var charset = doc.characterSet;
			if ( src.indexOf("archivefb-sticky") > 0 && charset != "UTF-8" )
			{
				archivefbData.setProperty(archivefbBrowserOverlay.resource, "chars", "UTF-8");
				src = src.replace(/ charset=[^\"]+\">/i, ' charset=UTF-8">');
				charset = "UTF-8";
			}
			var file = archivefbUtils.getContentDir(this.item.id).clone();
			file.append(archivefbUtils.getFileName(doc.location.href));
			archivefbUtils.writeFile(file, src, charset);
			if ( document.getElementById("archivefbStatusPopupD").getAttribute("checked") )
			{
				archivefbInfoViewer.indicateLinks(archivefbContentSaver.frameList[i]);
			}
		}
		this.changed1 = false;
		window.setTimeout(function() { window.content.stop(); archivefbPageEditor.disable(false); }, 500);
	},

	saveResource : function()
	{
		if ( !this.item ) return;
		if ( !archivefbData.exists(archivefbBrowserOverlay.resource) ) { this.disable(true); return; }
		var newTitle   = document.getElementById("archivefbEditTitle").value;
		var newComment = archivefbUtils.escapeComment(this.COMMENT.value);
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			this.disableTemporary(500);
			archivefbData.setProperty(archivefbBrowserOverlay.resource, "title",   newTitle);
			archivefbData.setProperty(archivefbBrowserOverlay.resource, "comment", newComment);
			this.item.title   = newTitle;
			this.item.comment = newComment;
			archivefbUtils.writeIndexDat(this.item);
		}
		var ss = Cc['@mozilla.org/browser/sessionstore;1']
			.getService(Ci.nsISessionStore);
		ss.deleteTabValue(gBrowser.mCurrentTab, "archivefb-comment");
		this.changed2 = false;
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { archivefbPageEditor.disable(true);  }, 0);
		window.setTimeout(function() { archivefbPageEditor.disable(false); }, msec);
	},

	disable : function(aBool)
	{
		var elems = this.TOOLBAR.childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		this.COMMENT.disabled = aBool;
	},

	toggle : function()
	{
		var id = archivefbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		archivefbBrowserOverlay.editMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init(id) : this.exit();
	},

	showHide : function(willShow)
	{
		this.COMMENT.hidden = !willShow;
		this.TOOLBAR.hidden = !willShow;
		willShow ? this.TOOLBAR.setAttribute("moz-collapsed", "false") : this.TOOLBAR.removeAttribute("moz-collapsed");
		archivefbInfoViewer.optimize();
	},


	applyStyle : function(aWindow, aID, aString)
	{
		if ( aWindow.document.getElementById(aID) )
		{
			return;
		}
		var newNode = aWindow.document.createElement("style");
		newNode.setAttribute("media", "screen");
		newNode.setAttribute("type", "text/css");
		newNode.setAttribute("id", aID);
		newNode.appendChild(aWindow.document.createTextNode(aString));
		var headNode = aWindow.document.getElementsByTagName("head")[0];
		if ( headNode ) headNode.appendChild(newNode);
	},

	removeStyle : function(aWindow, aID)
	{
		try { archivefbContentSaver.removeNodeFromParent(aWindow.document.getElementById(aID)); } catch(ex) {}
	},

	removeAllStyles : function(aWindow)
	{
		var nodes = aWindow.document.getElementsByTagName("style");
		for ( var i = nodes.length - 1; i >= 0 ; i-- )
		{
			if ( nodes[i].id.indexOf("archivefb-") == 0 ) archivefbContentSaver.removeNodeFromParent(nodes[i]);
		}
	},

};




var archivefbDOMEraser = {

	enabled : false,
	verbose : 0,

	init : function(aStateFlag)
	{
		this.verbose = 0;
		this.enabled = (aStateFlag == 1);
		document.getElementById("archivefbEditEraser").checked = this.enabled;
		if ( aStateFlag == 0 ) return;
		document.getElementById("archivefbHighlighter").disabled = this.enabled;
		document.getElementById("archivefbEditAnnotation").disabled = this.enabled;
		document.getElementById("archivefbEditCutter").disabled  = this.enabled;
		archivefbContentSaver.frameList = archivefbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < archivefbContentSaver.frameList.length; i++ )
		{
			archivefbContentSaver.frameList[i].document.removeEventListener("mouseover", this.handleEvent, true);
			archivefbContentSaver.frameList[i].document.removeEventListener("mousemove", this.handleEvent, true);
			archivefbContentSaver.frameList[i].document.removeEventListener("mouseout",  this.handleEvent, true);
			archivefbContentSaver.frameList[i].document.removeEventListener("click",     this.handleEvent, true);
			if ( this.enabled ) {
				archivefbContentSaver.frameList[i].document.addEventListener("mouseover", this.handleEvent, true);
				archivefbContentSaver.frameList[i].document.addEventListener("mousemove", this.handleEvent, true);
				archivefbContentSaver.frameList[i].document.addEventListener("mouseout",  this.handleEvent, true);
				archivefbContentSaver.frameList[i].document.addEventListener("click",     this.handleEvent, true);
			}
			if ( this.enabled ) {
				var estyle = "* { cursor: crosshair; }\n"
				           + "#archivefb-eraser-tooltip { -moz-appearance: tooltip;"
				           + " position: absolute; z-index: 10000; margin-top: 32px; padding: 2px 3px; max-width: 40em;"
				           + " border: 1px solid InfoText; background-color: InfoBackground; color: InfoText; font: message-box; }";
				archivefbPageEditor.applyStyle(archivefbContentSaver.frameList[i], "archivefb-eraser-style", estyle);
			} else {
				archivefbPageEditor.removeStyle(archivefbContentSaver.frameList[i], "archivefb-eraser-style");
			}
		}
	},

	handleEvent : function(aEvent)
	{
		aEvent.preventDefault();
		var elem = aEvent.target;
		var tagName = elem.localName.toUpperCase();
		if ( aEvent.type != "keypress" && ["SCROLLBAR","HTML","BODY","FRAME","FRAMESET"].indexOf(tagName) >= 0 ) return;
		var onMarker = (tagName == "SPAN" && elem.getAttribute("class") == "linemarker-marked-line");
		if ( aEvent.type == "mouseover" || aEvent.type == "mousemove" )
		{
			if ( aEvent.type == "mousemove" && ++archivefbDOMEraser.verbose % 3 != 0 ) return;
			var tooltip = elem.ownerDocument.getElementById("archivefb-eraser-tooltip");
			if ( !tooltip )
			{
				tooltip = elem.ownerDocument.createElement("DIV");
				tooltip.id = "archivefb-eraser-tooltip";
				elem.ownerDocument.body.appendChild(tooltip);
			}
			tooltip.style.left = aEvent.pageX + "px";
			tooltip.style.top  = aEvent.pageY + "px";
			if ( aEvent.type == "mouseover" )
			{
				if ( onMarker ) {
					tooltip.textContent = archivefbBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
				} else {
					tooltip.textContent = elem.localName;
					if ( elem.id ) tooltip.textContent += ' id="' + elem.id + '"';
					if ( elem.className ) tooltip.textContent += ' class="' + elem.className + '"';
				}
				elem.style.MozOutline = onMarker ? "2px dashed #0000FF" : "2px solid #FF0000";
			}
		}
		else if ( aEvent.type == "mouseout" || aEvent.type == "click" )
		{
			var tooltip = elem.ownerDocument.getElementById("archivefb-eraser-tooltip");
			if ( tooltip ) elem.ownerDocument.body.removeChild(tooltip);
			elem.style.MozOutline = "";
			if ( !elem.getAttribute("style") ) elem.removeAttribute("style");
			if ( aEvent.type == "click" )
			{
				archivefbPageEditor.allowUndo(elem.ownerDocument);
				if ( aEvent.shiftKey || aEvent.button == 2 )
				{
					archivefbDOMEraser.isolateNode(elem);
				}
				else
				{
					if ( onMarker )
						archivefbPageEditor.stripAttributes(elem);
					else
						elem.parentNode.removeChild(elem);
				}
				archivefbPageEditor.changed1 = true;
			}
		}
	},

	isolateNode : function(aNode)
	{
		if ( !aNode || !aNode.ownerDocument.body ) return;
		var i = 0;
		while ( aNode != aNode.ownerDocument.body && ++i < 64 )
		{
			var parent = aNode.parentNode;
			var child = parent.lastChild;
			var j = 0;
			while ( child && ++j < 1024 )
			{
				var prevChild = child.previousSibling;
				if ( child != aNode ) parent.removeChild(child);
				child = prevChild;
			}
			aNode = parent;
		}
	},

};



var archivefbAnnotationService = {

	DEFAULT_WIDTH  : 250,
	DEFAULT_HEIGHT : 100,
	offsetX : 0,
	offsetY : 0,
	isMove  : true,
	target  : null,

	handleEvent : function(aEvent)
	{
		if ( archivefbDOMEraser.enabled ) return;
		if ( aEvent.type == "mousedown" )
		{
			switch ( aEvent.originalTarget.className )
			{
				case "archivefb-sticky" : case "archivefb-sticky archivefb-sticky-relative" :
					if ( aEvent.originalTarget.childNodes.length != 2 ) return;
					archivefbAnnotationService.editSticky(aEvent.originalTarget);
					break;
				case "archivefb-block-comment" :
					archivefbAnnotationService.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
					aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
					break;
				case "archivefb-inline" : case "archivefb-inline-comment" :
					archivefbAnnotationService.editInline(aEvent.originalTarget);
					break;
				case "archivefb-sticky-header" : case "archivefb-sticky-footer" :
					archivefbAnnotationService.startDrag(aEvent);
					break;
			}
		}
		else if ( aEvent.type == "mousemove" ) archivefbAnnotationService.onDrag(aEvent);
		else if ( aEvent.type == "mouseup"   ) archivefbAnnotationService.stopDrag(aEvent);
	},

	createSticky : function(aPreset)
	{
		var win = archivefbUtils.getFocusedWindow();
		if ( win.document.body instanceof HTMLFrameSetElement ) win = win.frames[0];
		archivefbPageEditor.allowUndo(win.document);
		var targetNode;
		if ( aPreset ) {
			targetNode = aPreset[0];
		} else {
			var sel = win.getSelection().QueryInterface(Ci.nsISelectionPrivate);
			targetNode = sel.toString() ? sel.anchorNode : win.document.body;
		}
		if ( targetNode instanceof Text ) targetNode = targetNode.parentNode;
		if ( targetNode instanceof HTMLAnchorElement ) targetNode = targetNode.parentNode;
		var div = this.duplicateElement(targetNode != win.document.body, false,
			win.scrollX + Math.round((win.innerWidth  - this.DEFAULT_WIDTH ) / 2),
			win.scrollY + Math.round((win.innerHeight - this.DEFAULT_HEIGHT) / 2),
			this.DEFAULT_WIDTH, this.DEFAULT_HEIGHT
		);
		if ( aPreset ) div.appendChild(win.document.createTextNode(aPreset[1]));
		targetNode.appendChild(div);
		targetNode.appendChild(win.document.createTextNode("\n"));
		if ( !win.document.getElementById("archivefb-sticky-css") )
		{
			var linkNode = win.document.createElement("link");
			linkNode.setAttribute("media", "all");
			linkNode.setAttribute("href", "chrome://archivefb/skin/annotation.css");
			linkNode.setAttribute("type", "text/css");
			linkNode.setAttribute("id", "archivefb-sticky-css");
			linkNode.setAttribute("rel", "stylesheet");
			var headNode = win.document.getElementsByTagName("head")[0];
			if ( !headNode ) return;
			headNode.appendChild(win.document.createTextNode("\n"));
			headNode.appendChild(linkNode);
			headNode.appendChild(win.document.createTextNode("\n"));
		}
		this.editSticky(div);
		archivefbPageEditor.changed1 = true;
		archivefbPageEditor.disableTemporary(500);
	},

	editSticky : function(oldElem)
	{
		var newElem = this.duplicateElement(
			!(oldElem.parentNode instanceof HTMLBodyElement), true, 
			parseInt(oldElem.style.left, 10), parseInt(oldElem.style.top, 10), 
			parseInt(oldElem.style.width, 10), parseInt(oldElem.style.height, 10)
		);
		newElem.firstChild.nextSibling.appendChild(
			newElem.ownerDocument.createTextNode(oldElem.lastChild.data || "")
		);
		oldElem.parentNode.replaceChild(newElem, oldElem);
		this.adjustTextArea(newElem);
		setTimeout(function(){ newElem.firstChild.nextSibling.focus(); }, 100);
		archivefbPageEditor.changed1 = true;
	},

	startDrag : function(aEvent)
	{
		this.target = aEvent.originalTarget.parentNode;
		this.isMove = aEvent.originalTarget.className == "archivefb-sticky-header";
		this.offsetX = aEvent.clientX - parseInt(this.target.style[this.isMove ? "left" : "width" ], 10);
		this.offsetY = aEvent.clientY - parseInt(this.target.style[this.isMove ? "top"  : "height"], 10);
		aEvent.view.document.addEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.addEventListener("mouseup",   this.handleEvent, true);
		archivefbPageEditor.changed1 = true;
	},

	onDrag : function(aEvent)
	{
		if ( !this.target || this.target.className.indexOf("archivefb-sticky") < 0 ) return;
		var x = aEvent.clientX - this.offsetX; if ( x < 0 ) x = 0; this.target.style[this.isMove ? "left" : "width" ] = x + "px";
		var y = aEvent.clientY - this.offsetY; if ( y < 0 ) y = 0; this.target.style[this.isMove ? "top"  : "height"] = y + "px";
		if ( !this.isMove && this.target.firstChild.nextSibling instanceof HTMLTextAreaElement ) this.adjustTextArea(this.target);
	},

	stopDrag : function(aEvent)
	{
		this.target = null;
		aEvent.view.document.removeEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.removeEventListener("mouseup",   this.handleEvent, true);
	},

	adjustTextArea : function(aTarget)
	{
		var h = parseInt(aTarget.style.height, 10) - 10 - 16; if ( h < 0 ) h = 0;
		aTarget.firstChild.nextSibling.style.height = h + "px";
	},

	duplicateElement : function(isRelative, isEditable, aLeft, aTop, aWidth, aHeight)
	{
		var mainDiv = window.content.document.createElement("DIV");
		var headDiv = window.content.document.createElement("DIV");
		headDiv.className = "archivefb-sticky-header";
		mainDiv.appendChild(headDiv);
		if ( isEditable )
		{
			var textArea = window.content.document.createElement("TEXTAREA");
			var footDiv  = window.content.document.createElement("DIV");
			var button1  = window.content.document.createElement("INPUT");
			var button2  = window.content.document.createElement("INPUT");
			button1.setAttribute("type", "image"); button1.setAttribute("src", "chrome://archivefb/skin/sticky_save.png");
			button2.setAttribute("type", "image"); button2.setAttribute("src", "chrome://archivefb/skin/sticky_delete.png");
			button1.setAttribute("onclick", "this.parentNode.parentNode.appendChild(document.createTextNode(this.parentNode.previousSibling.value));this.parentNode.parentNode.removeChild(this.parentNode.previousSibling);this.parentNode.parentNode.removeChild(this.parentNode);");
			button2.setAttribute("onclick", "this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);");
			footDiv.className = "archivefb-sticky-footer";
			footDiv.appendChild(button1); footDiv.appendChild(button2);
			mainDiv.appendChild(textArea); mainDiv.appendChild(footDiv);
		}
		if ( !isRelative )
		{
			mainDiv.style.left = aLeft + "px";
			mainDiv.style.top  = aTop  + "px";
			mainDiv.style.position = "absolute";
		}
		mainDiv.style.width  = (aWidth  || this.DEFAULT_WIDTH)  + "px";
		mainDiv.style.height = (aHeight || this.DEFAULT_HEIGHT) + "px";
		mainDiv.className = "archivefb-sticky" + (isRelative ? " archivefb-sticky-relative" : "");
		return mainDiv;
	},


	addInline : function()
	{
		var sel = archivefbPageEditor.getSelection();
		if ( !sel ) return;
		archivefbPageEditor.allowUndo(archivefbPageEditor.focusedWindow.document);
		var ret = {};
		if ( !archivefbUtils.PROMPT.prompt(window, "[archivefb]", archivefbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [archivefbUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = { style : "border-bottom: 2px dotted #FF3333; cursor: help;", class : "archivefb-inline", title : ret.value };
		archivefbHighlighter.set(archivefbPageEditor.focusedWindow, sel, "span", attr);
		archivefbPageEditor.changed1 = true;
	},

	editInline : function(aElement)
	{
		var ret = { value : aElement.getAttribute("title") };
		if ( !archivefbUtils.PROMPT.prompt(window, "[archivefb]", archivefbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [archivefbUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
		if ( ret.value )
			aElement.setAttribute("title", ret.value);
		else
			archivefbPageEditor.stripAttributes(aElement);
		archivefbPageEditor.changed1 = true;
	},


	attach : function(aFlag, aLabel)
	{
		var sel = archivefbPageEditor.getSelection();
		if ( !sel ) return;
		archivefbPageEditor.allowUndo(archivefbPageEditor.focusedWindow.document);
		var attr = {};
		if ( aFlag == "L" )
		{
			var ret = {};
			if ( !archivefbUtils.PROMPT.prompt(window, "[archivefb]", "URL:", ret, null, {}) ) return;
			if ( !ret.value ) return;
			attr["href"] = ret.value;
		}
		else
		{
			var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			FP.init(window, aLabel, FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			var destFile = archivefbUtils.getContentDir(archivefbPageEditor.item.id).clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				var text = "Would you like to overwrite the file '" + FP.file.leafName + "'?";
				if ( !archivefbUtils.PROMPT.confirm(window, "[archivefb]", text) ) return;
				destFile.remove(false);
			}
			try {
				FP.file.copyTo(destFile.parent, FP.file.leafName);
			} catch(ex) {
				return;
			}
			attr["href"] = archivefbUtils.getFileName(archivefbUtils.IO.newFileURI(FP.file).spec);
		}
		archivefbHighlighter.set(archivefbPageEditor.focusedWindow, sel, "a", attr);
		archivefbPageEditor.changed1 = true;
	},

};




var archivefbInfoViewer = {

	get TOOLBAR() { return document.getElementById("archivefbInfobar"); },

	onPopupShowing : function(aEvent)
	{
		var id = archivefbBrowserOverlay.getID();
		var elems = aEvent.originalTarget.childNodes;
		for ( var i = 0; i < elems.length - 2; i++ ) elems[i].setAttribute("disabled", id ? "false" : "true");
		for ( i; i < elems.length; i++ ) elems[i].hidden = id;
		if ( id ) {
			if ( !archivefbData.exists(archivefbBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
			document.getElementById("archivefbStatusPopupE").setAttribute("checked",  archivefbBrowserOverlay.editMode);
			document.getElementById("archivefbStatusPopupI").setAttribute("checked",  archivefbBrowserOverlay.infoMode);
		} else {
			aEvent.originalTarget.lastChild.setAttribute("checked", !(archivefbPageEditor.TOOLBAR.hidden || document.getElementById("archivefbToolbox").hidden));
		}
	},

	init : function(aID)
	{
		if ( aID != archivefbBrowserOverlay.getID() ) return;
		if ( !archivefbData.exists(archivefbBrowserOverlay.resource) ) { this.TOOLBAR.hidden = true; return; }
		this.TOOLBAR.hidden = false;
		var isTypeSite = (archivefbData.getProperty(archivefbBrowserOverlay.resource, "type") == "site");
		document.getElementById("archivefbInfoHome").disabled = !isTypeSite;
		document.getElementById("archivefbInfoSite").disabled = !isTypeSite;
		document.getElementById("archivefbInfoHome").setAttribute("image", "chrome://archivefb/skin/info_home" + (isTypeSite ? "1" : "0") +  ".png");
		document.getElementById("archivefbInfoSite").setAttribute("image", "chrome://archivefb/skin/info_link" + (isTypeSite ? "1" : "0") +  ".png");
		var srcLabel = document.getElementById("archivefbInfoSource");
		srcLabel.value = archivefbData.getProperty(archivefbBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ archivefbUtils.loadURL(srcLabel.value, aEvent.button == 1); };
	},

	toggle : function()
	{
		var id = archivefbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		archivefbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init(id) : this.TOOLBAR.hidden = true;
		this.optimize();
	},

	toggleIndicator : function(willEnable)
	{
		for ( var i = 0; i < archivefbContentSaver.frameList.length; i++ )
		{
			if ( willEnable )
				this.indicateLinks(archivefbContentSaver.frameList[i]);
			else
				archivefbPageEditor.removeStyle(archivefbContentSaver.frameList[i], "archivefb-indicator-style");
		}
	},

	indicateLinks : function(aWindow)
	{
		archivefbPageEditor.applyStyle(aWindow, "archivefb-indicator-style", "a[href]:not([href^=\"http\"]):not([href^=\"javascript\"]):not([href^=\"mailto\"]):before { content:url('chrome://archivefb/skin/info_link1.png'); }");
	},

	renew : function(showDetail)
	{
		var id = archivefbBrowserOverlay.getID();
		if ( !id ) return;
		var fileName = archivefbUtils.splitFileName(archivefbUtils.getFileName(window.content.location.href))[0];
		var source = fileName == "index" ? archivefbData.getProperty(archivefbBrowserOverlay.resource, "source") : "";
		top.window.openDialog(
			"chrome://archivefb/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0]
		);
	},

	openSourceURL : function(tabbed)
	{
		if ( !archivefbBrowserOverlay.getID() ) return;
		archivefbUtils.loadURL(archivefbData.getProperty(archivefbBrowserOverlay.resource, "source"), tabbed);
	},

	loadFile : function(aFileName)
	{
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = archivefbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



