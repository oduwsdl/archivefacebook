
var archivefbNoteService2 = {

	get BROWSER(){ return document.getElementById("archivefbNoteBrowser"); },

	fontSize : 16,
	enabledHTMLView : false,

	init : function()
	{
		window.location.search.match(/\?id\=(\d{14})$/);
		var id = RegExp.$1;
		archivefbNoteService.sidebarContext = false;
		var res = archivefbUtils.RDF.GetResource("urn:archivefb:item" + id);
		if ( !archivefbData.exists(res) ) return window.location.href = "about:blank";
		archivefbNoteService.edit(res);
		archivefbNoteTemplate.init();
		this.initFontSize();
		if ( archivefbUtils.getPref("note.linefeed") )
		{
			document.getElementById("archivefbNoteToolbarL").setAttribute("checked", true);
		}
		if ( archivefbUtils.getPref("note.preview") ) this.initHTMLView();
	},

	refreshTab : function()
	{
		var icon = archivefbUtils.getDefaultIcon("note");
		document.getElementById("archivefbNoteImage").setAttribute("src", icon);
		var win = archivefbUtils.getBrowserWindow();
		if ( win.content.location.href.indexOf(archivefbNoteService.resource.Value.substring(18)) > 0 )
		{
			win.gBrowser.selectedTab.label = archivefbData.getProperty(archivefbNoteService.resource, "title");
			win.gBrowser.selectedTab.setAttribute("image", icon);
		}
	},

	finalize : function(exit)
	{
		window.onunload = null;
		archivefbNoteService.save(window);
		archivefbUtils.setPref("note.preview",  this.enabledHTMLView);
		archivefbUtils.setPref("note.linefeed", document.getElementById("archivefbNoteToolbarL").getAttribute("checked") ? true : false);
		archivefbUtils.setPref("note.fontsize",  this.fontSize);
		if ( exit )
			archivefbUtils.getBrowserWindow().gBrowser.removeCurrentTab();
	},

	initFontSize : function()
	{
		this.fontSize = archivefbUtils.getPref("note.fontsize");
		this.changeFontSize(this.fontSize);
		document.getElementById("archivefbNoteToolbarF" + this.fontSize).setAttribute("checked", true)
	},

	changeFontSize : function(aPixel)
	{
		this.fontSize = aPixel;
		var newStyle = "font-size: " + aPixel + "px; font-family: monospace;";
		archivefbNoteService.TEXTBOX.setAttribute("style", newStyle);
		archivefbNoteTemplate.TEXTBOX.setAttribute("style", newStyle);
	},


	initHTMLView : function()
	{
		archivefbNoteService.save();
		archivefbNoteTemplate.save();
		var source = archivefbNoteTemplate.getTemplate();
		var title, content;
		if ( archivefbNoteService.TEXTBOX.value.match(/\n/) ) {
			title   = RegExp.leftContext;
			content = RegExp.rightContext;
		} else {
			title   = archivefbNoteService.TEXTBOX.value;
			content = "";
		}
		title = title.replace(/</g, "&lt;");
		title = title.replace(/>/g, "&gt;");
		title = title.replace(/\"/g, "&quot;");
		if ( document.getElementById("archivefbNoteToolbarL").getAttribute("checked") ) content = content.replace(/([^>])$/mg, "$1<br>");
		source = source.replace(/<%NOTE_TITLE%>/g,   title);
		source = source.replace(/<%NOTE_CONTENT%>/g, content);
		var htmlFile = archivefbUtils.getarchivefbDir().clone();
		htmlFile.append("note.html");
		archivefbUtils.writeFile(htmlFile, source, "UTF-8");
		this.toggleHTMLView(true);
		this.BROWSER.loadURI(archivefbUtils.convertFilePathToURL(htmlFile.path));
		this.enabledHTMLView = true;
	},

	toggleHTMLView : function(willShow)
	{
		this.BROWSER.collapsed  = !willShow;
		document.getElementById("archivefbSplitter").collapsed = !willShow;
		document.getElementById("archivefbNoteHeader").lastChild.collapsed = !willShow;
		document.getElementById("archivefbNoteToolbarN").disabled = !willShow;
		this.enabledHTMLView = willShow;
	},

};


var archivefbNoteTemplate = {

	get TEXTBOX() { return document.getElementById("archivefbNoteTemplateTextbox"); },

	enabled    : false,
	shouldSave : false,
	file       : null,

	init : function()
	{
		this.file = archivefbUtils.getarchivefbDir().clone();
		this.file.append("note_template.html");
		if ( !this.file.exists() ) archivefbUtils.saveTemplateFile("chrome://archivefb/content/template.html", this.file);
	},

	show : function(willShow)
	{
		document.getElementById("archivefbNoteTemplate").collapsed = !willShow;
		document.getElementById("archivefbNoteEditor").collapsed   = willShow;
		this.enabled = willShow;
	},

	getTemplate : function()
	{
		var template = archivefbUtils.readFile(this.file);
		template = archivefbUtils.convertToUnicode(template, "UTF-8");
		return template;
	},

	load : function()
	{
		this.save();
		this.show(true);
		this.TEXTBOX.value = this.getTemplate();
		this.TEXTBOX.focus();
	},

	save : function()
	{
		if ( !this.shouldSave ) return;
		var myCSS = archivefbUtils.getarchivefbDir().clone();
		myCSS.append("note_template.html");
		archivefbUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
		this.change(false);
	},

	exit : function(checkOff)
	{
		this.save();
		this.show(false);
		if ( checkOff ) document.getElementById("archivefbNoteToolbarT").setAttribute("checked", false);
	},

	change : function(bool)
	{
		this.shouldSave = bool;
		document.getElementById("archivefbNoteToolbarS").disabled = !bool;
	},

};


