
var archivefbNoteService = {

	get TEXTBOX()   { return document.getElementById("archivefbNoteTextbox"); },
	get HTML_HEAD() { return '<html><head><meta http-equiv="Content-Type" content="text/html;Charset=UTF-8"></head><body><pre>\n'; },
	get HTML_FOOT() { return '\n</pre></body></html>'; },

	resource : null,
	notefile : null,
	changed  : false,
	locked   : false,
	initFlag : false,
	sidebarContext : true,

	create : function(aTarResURI, aTarRelIdx, aForceTabbed)
	{
		if ( this.locked ) return;
		this.locked = true;
		setTimeout(function(){ archivefbNoteService.locked = false; }, 1000);
		this.save();
		var newItem = archivefbData.newItem();
		newItem.type  = "note";
		newItem.chars = "UTF-8";
		this.resource = archivefbData.addItem(newItem, aTarResURI, aTarRelIdx);
		this.notefile = archivefbUtils.getContentDir(archivefbData.getProperty(this.resource, "id")).clone();
		this.notefile.append("index.html");
		archivefbUtils.writeFile(this.notefile, "", "UTF-8");
		if ( !("gBrowser" in window.top) ) aForceTabbed = true;
		(archivefbUtils.getPref("tabs.note") || aForceTabbed) ? this.open(this.resource, true) : this.edit(this.resource);
	},

	edit : function(aRes)
	{
		if ( !this.initFlag )
		{
			this.initFlag = true;
			this.TEXTBOX.addEventListener("dragdrop", function(){ archivefbNoteService.change(true); }, true);
		}
		this.save();
		if ( !archivefbData.exists(aRes) )
		{
			if ( !archivefbData.exists(aRes) ) return;
		}
		this.resource = aRes;
		this.changed = false;
		if ( this.sidebarContext )
		{
			document.getElementById("archivefbNoteSplitter").hidden = false;
			document.getElementById("archivefbNoteOuter").hidden = false;
		}
		this.notefile = archivefbUtils.getContentDir(archivefbData.getProperty(this.resource, "id")).clone();
		this.notefile.append("index.html");
		this.TEXTBOX.value = "";
		this.TEXTBOX.value = this.getContentFromFile(this.notefile);
		this.TEXTBOX.mInputField.focus();
		try { this.TEXTBOX.editor.transactionManager.clear(); } catch(ex) {}
		document.getElementById("archivefbNoteLabel").value = archivefbData.getProperty(this.resource, "title");
		if ( !this.sidebarContext ) setTimeout(function(){ archivefbNoteService2.refreshTab(); }, 0);
	},

	save : function()
	{
		if ( !this.changed ) return;
		if ( !archivefbData.exists(this.resource) ) return;
		archivefbUtils.writeFile(this.notefile, this.HTML_HEAD + this.TEXTBOX.value + this.HTML_FOOT, "UTF-8");
		this.saveResource();
		this.change(false);
	},

	saveResource : function()
	{
		var title = archivefbUtils.crop(this.TEXTBOX.value.split("\n")[0].replace(/\t/g, " "), 50);
		archivefbData.setProperty(this.resource, "title", title);
	},

	exit : function()
	{
		this.save();
		this.resource  = null;
		this.notefile = null;
		this.change(false);
		if ( this.sidebarContext ) {
			document.getElementById("archivefbNoteSplitter").hidden = true;
			document.getElementById("archivefbNoteOuter").hidden = true;
		}
	},

	open : function(aRes, aTabbed)
	{
		if ( !("gBrowser" in window.top) ) aTabbed = true;
		if ( !aTabbed && window.top.content.archivefbNoteService )
		{
			window.top.content.archivefbNoteService.edit(aRes);
		}
		else
		{
			if ( aTabbed ) {
				if ( top.gBrowser && top.gBrowser.currentURI.spec == "about:blank" ) aTabbed = false;
				archivefbUtils.loadURL("chrome://archivefb/content/note.xul?id=" + archivefbData.getProperty(aRes, "id"), aTabbed);
			} else {
				archivefbNoteService.edit(aRes);
			}
		}
	},

	getContentFromFile : function(aFile)
	{
		var content = archivefbUtils.readFile(aFile);
		content = archivefbUtils.convertToUnicode(content, "UTF-8");
		content = content.replace(this.HTML_HEAD, "");
		content = content.replace(this.HTML_FOOT, "");
		return content;
	},

	expand : function()
	{
		this.open(this.resource, true);
		this.exit();
	},

	change : function(aBool)
	{
		this.changed = aBool;
		if ( !this.sidebarContext ) document.getElementById("archivefbNoteToolbarS").disabled = !aBool;
	},

	insertString : function(aEvent)
	{
		if ( aEvent.keyCode == aEvent.DOM_VK_ESCAPE && this.sidebarContext ) { archivefbNoteService.exit(); return; }
		if ( aEvent.ctrlKey || aEvent.altKey || aEvent.shiftKey ) return;
		var str = "";
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_TAB : str = "\t"; break;
			case aEvent.DOM_VK_F5  : str = (new Date()).toLocaleString(); break;
			default : return;
		}
		aEvent.preventDefault();
		var command = "cmd_insertText";
		try {
			var controller = document.commandDispatcher.getControllerForCommand(command);
			if ( controller && controller.isCommandEnabled(command) )
			{
				controller = controller.QueryInterface(Ci.nsICommandController);
				var params = Cc['@mozilla.org/embedcomp/command-params;1'].createInstance(Ci.nsICommandParams);
				params.setStringValue("state_data", str);
				controller.doCommandWithParams(command, params);
			}
		} catch(ex) {
		}
	},

};


