
var archivefbFolderPicker = {

	init : function()
	{
		archivefbTreeUI.init(true);
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("extra2").className += " archivefb-create";
		document.getElementById("archivefbFolderPickerRoot").label = archivefbUtils.getLocaleString("ROOT_FOLDER");
		if ( window.arguments.length == 2 )
		{
			if ( typeof(window.arguments[1]) == "string" ) window.arguments[1] = archivefbUtils.RDF.GetResource(window.arguments[1]);
			if ( window.arguments[1].Value != "urn:archivefb:root" )
			{
				archivefbTreeUI.locateInternal(window.arguments[1]);
			}
		}
	},

	update : function()
	{
		document.getElementById("archivefbFolderPickerRoot").checked = archivefbTreeUI.TREE.view.selection.count == 0;
	},

	accept : function()
	{
		if ( document.getElementById("archivefbFolderPickerRoot").checked ) {
			window.arguments[0].resource = archivefbUtils.RDF.GetResource(archivefbTreeUI.TREE.ref);
			window.arguments[0].title    = archivefbUtils.getLocaleString("ROOT_FOLDER");
		} else {
			window.arguments[0].resource = archivefbTreeUI.getSelection(true, 1)[0];
			window.arguments[0].title    = archivefbData.getProperty(window.arguments[0].resource, "title");
		}
		archivefbTreeUI.collapseFoldersBut(archivefbTreeUI.TREE.currentIndex);
	},

};




var archivefbFolderSelector2 = {

	get TEXTBOX(){ return document.getElementById("archivefbFolderTextbox"); },
	get resURI() { return this.TEXTBOX.getAttribute("resuri"); },

	init : function()
	{
		this.TEXTBOX.value = archivefbUtils.getLocaleString("ROOT_FOLDER");
		this.TEXTBOX.setAttribute("resuri", "urn:archivefb:root");
	},

	pick : function()
	{
		var ret = {};
		window.openDialog('chrome://archivefb/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, this.RES_URI);
		if ( ret.resource )
		{
			this.TEXTBOX.value = ret.title;
			this.TEXTBOX.setAttribute("resuri", ret.resource.Value);
		}
	},

};



