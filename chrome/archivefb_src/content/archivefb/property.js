
var archivefbPropService = {

	get STRING() { return document.getElementById("archivefbPropString"); },
	get ICON()   { return document.getElementById("archivefbPropIcon"); },

	id       : null,
	item     : null,
	resource : null,
	isTypeSeparator: false,
	isTypeBookmark : false,
	isTypeFolder   : false,
	isTypeNote     : false,
	isTypeFile     : false,
	isTypeSite     : false,

	init : function()
	{
		this.id = window.arguments[0];
		if (!this.id)
			return;
		this.item = archivefbData.newItem(this.id);
		this.resource = archivefbUtils.RDF.GetResource("urn:archivefb:item" + this.id);
		for (var prop in this.item) {
			this.item[prop] = archivefbData.getProperty(this.resource, prop);
		}
		this.id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
		var dd = new Date(
			parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
			parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
		);
		var dateTime = dd.toLocaleString();
		document.getElementById("archivefbPropID").value      = this.item.id;
		document.getElementById("archivefbPropTitle").value   = this.item.title;
		document.getElementById("archivefbPropSource").value  = this.item.source;
		document.getElementById("archivefbPropDate").value    = dateTime;
		document.getElementById("archivefbPropChars").value   = this.item.chars;
		document.getElementById("archivefbPropComment").value = this.item.comment.replace(/ __BR__ /g, "\n");
		document.getElementById("archivefbPropMark").setAttribute("checked", this.item.type == "marked");
		this.ICON.src = this.item.icon ? this.item.icon : archivefbUtils.getDefaultIcon(this.item.type);
		document.title = this.item.title;
		if (archivefbData.isContainer(this.resource))
			this.item.type = "folder";
		var bundleName = "TYPE_PAGE";
		switch (this.item.type) {
			case "separator": this.isTypeSeparator = true; bundleName = "TYPE_SEPARATOR"; break;
			case "bookmark" : this.isTypeBookmark  = true; bundleName = "TYPE_BOOKMARK";  break;
			case "folder"   : this.isTypeFolder    = true; bundleName = "TYPE_FOLDER";    break;
			case "note"     : this.isTypeNote      = true; bundleName = "TYPE_NOTE";      break;
			case "file"     : 
			case "image"    : this.isTypeFile      = true; bundleName = "TYPE_FILE";      break;
			case "combine"  : this.isTypeSite      = true; bundleName = "TYPE_COMBINE";   break;
			case "site"     : this.isTypeSite      = true; bundleName = "TYPE_INDEPTH";   break;
		}
		document.getElementById("archivefbPropType").value = this.STRING.getString(bundleName);
		document.getElementById("archivefbPropSourceRow").hidden = this.isTypeFolder || this.isTypeNote || this.isTypeSeparator;
		document.getElementById("archivefbPropCharsRow").hidden  = this.isTypeFolder || this.isTypeFile || this.isTypeBookmark || this.isTypeSeparator;
		document.getElementById("archivefbPropIconRow").hidden   = this.isTypeSeparator;
		document.getElementById("archivefbPropIconMenu").hidden  = this.isTypeNote;
		document.getElementById("archivefbPropSizeRow").hidden   = this.isTypeFolder || this.isTypeBookmark || this.isTypeSeparator;
		document.getElementById("archivefbPropMark").hidden      = this.isTypeFolder || this.isTypeNote || this.isTypeFile || this.isTypeSite || this.isTypeBookmark;
		document.getElementById("archivefbPropIconMenu").firstChild.firstChild.nextSibling.setAttribute("disabled", this.isTypeFolder || this.isTypeBookmark);
		if (this.isTypeNote)
			document.getElementById("archivefbPropTitle").removeAttribute("editable");
		this.updateCommentTab(this.item.comment);
		if (!this.isTypeFolder && !this.isTypeBookmark)
			setTimeout(function(){ archivefbPropService.delayedInit(); }, 0);
	},

	delayedInit : function()
	{
		var sizeCount = this.getTotalFileSize(this.id);
		var txt = archivefbPropService.formatFileSize(sizeCount[0]);
		txt += "  " + this.STRING.getFormattedString("FILES_COUNT", [sizeCount[1]]);
		document.getElementById("archivefbPropSize").value = txt;
	},

	accept : function()
	{
		var newVals = {
			title   : document.getElementById("archivefbPropTitle").value,
			source  : document.getElementById("archivefbPropSource").value,
			comment : archivefbUtils.escapeComment(document.getElementById("archivefbPropComment").value),
			type    : this.item.type,
			icon    : this.getIconURL()
		};
		if (!this.isTypeSeparator && !document.getElementById("archivefbPropMark").hidden)
			newVals.type = document.getElementById("archivefbPropMark").checked ? "marked" : "";
		var changed = false;
		var props = ["title", "source", "comment", "type", "icon"];
		for (var i = 0; i < props.length; i++) {
			if (this.item[props[i]] != newVals[props[i]]) {
				this.item[props[i]] = newVals[props[i]];
				changed = true;
			}
		}
		if (changed) {
			for (var prop in this.item)  {
				archivefbData.setProperty(this.resource, prop, this.item[prop]);
			}
			if (!this.isTypeFolder && !this.isTypeBookmark && !this.isTypeSeparator)
				archivefbUtils.writeIndexDat(this.item);
		}
		if (window.arguments[1])
			window.arguments[1].accept = true;
	},

	cancel : function()
	{
		if ( window.arguments[1] ) window.arguments[1].accept = false;
	},

	fillTitle : function(aPopupElem)
	{
		if ( this.isTypeFolder || this.isTypeNote || this.isTypeFile || this.isTypeBookmark ) return;
		if ( !aPopupElem.hasChildNodes() )
		{
			aPopupElem.parentNode.appendItem(this.getHTMLTitle(this.id, this.item.chars));
		}
	},

	setDefaultIcon : function()
	{
		this.ICON.src = archivefbUtils.getDefaultIcon(this.item.type);
	},

	getIconURL : function()
	{
		var iconURL = this.ICON.src;
		return ( iconURL.indexOf("chrome://archivefb/skin/") == 0 ) ? "" : iconURL;
	},

	pickupIcon : function(aCommand, aPickerLabel)
	{
		var dir;
		if ( aCommand == "F" ) {
			dir = archivefbUtils.getContentDir(this.item.id, true);
			if ( !dir ) return;
		} else {
			dir = archivefbUtils.getarchivefbDir().clone();
			dir.append("icon");
			if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		FP.init(window, aPickerLabel, FP.modeOpen);
		FP.displayDirectory = dir;
		FP.appendFilters(FP.filterImages);
		if ( FP.show() == FP.returnOK )
		{
			var iconURL;
			if      ( aCommand == "F" && dir.contains(FP.file, false) ) iconURL = "resource://archivefb/data/" + this.id + "/" + FP.file.leafName;
			else if ( aCommand == "U" && dir.contains(FP.file, false) ) iconURL = "resource://archivefb/icon/" + FP.file.leafName;
			else iconURL = archivefbUtils.convertFilePathToURL(FP.file.path);
			this.ICON.src = iconURL;
		}
	},

	setIconURL : function()
	{
		var ret = { value : this.getIconURL() };
		if ( !archivefbUtils.PROMPT.prompt(window, "[archivefb]", "URL:", ret, null, {}) ) return;
		if ( ret.value ) this.ICON.src = ret.value;
	},

	updateCommentTab : function(aComment)
	{
		var elem = document.getElementById("archivefbPropCommentTab");
		if ( aComment )
			elem.setAttribute("image", "chrome://archivefb/skin/edit_comment.png");
		else
			elem.removeAttribute("image");
	},

	getHTMLTitle : function(aID, aChars)
	{
		var file  = archivefbUtils.getContentDir(aID, true);
		if ( !file ) return "";
		file.append("index.html");
		var content = archivefbUtils.convertToUnicode(archivefbUtils.readFile(file), aChars);
		return content.match(/<title>([^<]+?)<\/title>/im) ? RegExp.$1 : "";
	},

	getTotalFileSize : function(aID)
	{
		var totalSize = 0;
		var totalFile = 0;
		var dir = archivefbUtils.getContentDir(aID, true);
		if ( !dir || !dir.isDirectory() ) return [0, 0];
		var fileEnum = dir.directoryEntries;
		while ( fileEnum.hasMoreElements() )
		{
			var file = fileEnum.getNext().QueryInterface(Ci.nsIFile);
			totalSize += file.fileSize;
			totalFile++;
		}
		return [totalSize, totalFile];
	},

	formatFileSize : function(aBytes)
	{
		if ( aBytes > 1000 * 1000 ) {
			return this.divideBy100( Math.round( aBytes / 1024 / 1024 * 100 ) ) + " MB";
		} else if ( aBytes == 0 ) {
			return "0 KB";
		} else {
			var kbytes = Math.round( aBytes / 1024 );
			return (kbytes == 0 ? 1 : kbytes) + " KB";
		}
	},

	divideBy100 : function(aInt)
	{
		if ( aInt % 100 == 0 ) {
			return aInt / 100 + ".00";
		} else if ( aInt % 10 == 0 ) {
			return aInt / 100 + "0";
		} else {
			return aInt / 100;
		}
	},

};



