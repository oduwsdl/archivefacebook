
const Cc = Components.classes;
const Ci = Components.interfaces;

const archivefbUtils = {

	get namespace() { return "http://cs.odu.edu/~mkelly/archivefb/archivefb-rdf#"; },


	getarchivefbDir: function ARCHIVEFBU_getarchivefbDir() {
		var dir;
		try {
			var isDefault = this.getPref("data.default");
			dir = this.prefBranch.getComplexValue("data.path", Ci.nsILocalFile);
		}
		catch (ex) {
			isDefault = true;
		}
		if (isDefault) {
			dir = this.DIR.get("ProfD", Ci.nsIFile);
			dir.append("archivefb");
		}
		if (!dir.exists()) {
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	getContentDir: function ARCHIVEFBU_getContentDir(aID, aSuppressCreate) {
		if (!aID || aID.length != 14) {
			this.alert("ERROR: Failed to get directory '" + aID + "'.");
			return null;
		}
		var dir = this.getarchivefbDir().clone();
		dir.append("data");
		if (!dir.exists())
			dir.create(dir.DIRECTORY_TYPE, 0700);
		dir.append(aID);
		if (!dir.exists()) {
			if (aSuppressCreate) {
				return null;
			}
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	removeDirSafety: function ARCHIVEFBU_removeDirSafety(aDir, check) {
		var file;
		try {
			if (check && !aDir.leafName.match(/^\d{14}$/))
				return;
			var fileEnum = aDir.directoryEntries;
			while (fileEnum.hasMoreElements()) {
				file = fileEnum.getNext().QueryInterface(Ci.nsIFile);
				if (file.isFile())
					file.remove(false);
			}
			file = aDir;
			if (aDir.isDirectory())
				aDir.remove(false);
			return true;
		}
		catch (ex) {
			this.alert("ERROR: Failed to remove file '" + file.leafName + "'.\n" + ex);
			return false;
		}
	},

	loadURL: function ARCHIVEFBU_loadURL(aURL, aInNewTab) {
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		if (!win)
			return;
		if (aInNewTab)
			win.gBrowser.selectedTab = win.gBrowser.addTab(aURL);
		else
			win.gBrowser.loadURI(aURL);
	},

	refreshGlobal: function ARCHIVEFBU_refreshGlobal(aDSChanged) {
		var winEnum = this.WINDOW.getEnumerator("navigator:browser");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			aDSChanged ? win.archivefbBrowserOverlay.refresh(): win.archivefbBrowserOverlay.rebuild();
			var win = win.document.getElementById("sidebar").contentWindow;
			if ("archivefbMainUI" in win) {
				aDSChanged ? win.archivefbMainUI.refresh() : win.archivefbMainUI.rebuild();
			}
		}
		var winEnum = this.WINDOW.getEnumerator("archivefb");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			if ("archivefbMainUI" in win) {
				aDSChanged ? win.archivefbMainUI.refresh() : win.archivefbMainUI.rebuild();
			}
		}
	},

	getTimeStamp: function ARCHIVEFBU_getTimeStamp(advance) {
		var date = new Date;
		if (advance)
			date.setTime(date.getTime() + 1000 * advance);
		var y = date.getFullYear().toString();
		var m = ("0" + (date.getMonth() + 1).toString()).slice(-2);
		var d = ("0" +  date.getDate()      .toString()).slice(-2);
		var h = ("0" +  date.getHours()     .toString()).slice(-2);
		var i = ("0" +  date.getMinutes()   .toString()).slice(-2);
		var s = ("0" +  date.getSeconds()   .toString()).slice(-2);
		date = y + m + d + h + i + s;
		if (date.length != 14)
			throw Components.results.NS_ERROR_UNEXPECTED;
		return date;
	},

	getRootHref: function ARCHIVEFBU_getRootHref(aURLSpec) {
		var url = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURL);
		url.spec = aURLSpec;
		return url.scheme + "://" + url.host + "/";
	},

	getBaseHref: function ARCHIVEFBU_getBaseHref(aURI) {
		var pos, base;
		base = ((pos = aURI.indexOf("?"))     != -1) ? aURI.substring(0, pos)   : aURI;
		base = ((pos = base.indexOf("#"))     != -1) ? base.substring(0, pos)   : base;
		base = ((pos = base.lastIndexOf("/")) != -1) ? base.substring(0, ++pos) : base;
		return base;
	},

	getFileName: function ARCHIVEFBU_getFileName(aURI) {
		var pos, name;
		name = ((pos = aURI.indexOf("?"))     != -1) ? aURI.substring(0, pos) : aURI;
		name = ((pos = name.indexOf("#"))     != -1) ? name.substring(0, pos) : name;
		name = ((pos = name.lastIndexOf("/")) != -1) ? name.substring(++pos)  : name;
		return name;
	},

	splitFileName: function ARCHIVEFBU_splitFileName(aFileName) {
		var pos = aFileName.lastIndexOf(".");
		var ret = [];
		if (pos != -1) {
			ret[0] = aFileName.substring(0, pos);
			ret[1] = aFileName.substring(pos + 1, aFileName.length);
		}
		else {
			ret[0] = aFileName;
			ret[1] = "";
		}
		return ret;
	},

	validateFileName: function ARCHIVEFBU_validateFileName(aFileName) {
		aFileName = aFileName.replace(/[\"\?!~`]+/g, "");
		aFileName = aFileName.replace(/[\*\&]+/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]+/g, "-");
		aFileName = aFileName.replace(/[\<]+/g, "(");
		aFileName = aFileName.replace(/[\>]+/g, ")");
		aFileName = aFileName.replace(/[\s]+/g, "_");
		aFileName = aFileName.replace(/[%]+/g, "@");
		return aFileName;
	},

	resolveURL: function ARCHIVEFBU_resolveURL(aBaseURL, aRelURL) {
		try {
			var baseURLObj = this.convertURLToObject(aBaseURL);
			return baseURLObj.resolve(aRelURL);
		}
		catch (ex) {
		}
	},

	crop: function ARCHIVEFBU_crop(aString, aMaxLength) {
		return aString.length > aMaxLength ? aString.substring(0, aMaxLength) + "..." : aString;
	},



	readFile: function ARCHIVEFBU_readFile(aFile) {
		try {
			var istream = Cc["@mozilla.org/network/file-input-stream;1"].
			              createInstance(Ci.nsIFileInputStream);
			istream.init(aFile, 1, 0, false);
			var sstream = Cc["@mozilla.org/scriptableinputstream;1"].
			              createInstance(Ci.nsIScriptableInputStream);
			sstream.init(istream);
			var content = sstream.read(sstream.available());
			sstream.close();
			istream.close();
			return content;
		}
		catch (ex) {
			return false;
		}
	},

	writeFile: function ARCHIVEFBU_writeFile(aFile, aContent, aChars) {
		if (aFile.exists())
			aFile.remove(false);
		try {
			aFile.create(aFile.NORMAL_FILE_TYPE, 0666);
			this.UNICODE.charset = aChars;
			
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Cc["@mozilla.org/network/file-output-stream;1"].
			              createInstance(Ci.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch (ex) {
			this.alert("ERROR: Failed to write file: " + aFile.leafName);
		}
	},

	writeIndexDat: function ARCHIVEFBU_writeIndexDat(aItem, aFile) {
		if (!aFile) {
			aFile = this.getContentDir(aItem.id).clone();
			aFile.append("index.dat");
		}
		var content = "";
		for (var prop in aItem) {
			content += prop + "\t" + aItem[prop] + "\n";
		}
		this.writeFile(aFile, content, "UTF-8");
	},

	saveTemplateFile: function ARCHIVEFBU_saveTemplateFile(aURLSpec, aFile) {
		if (aFile.exists())
			return;
		var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURL);
		uri.spec = aURLSpec;
		var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
		              createInstance(Ci.nsIWebBrowserPersist);
		persist.saveURI(uri, null, null, null, null, aFile);
	},

	convertToUnicode: function ARCHIVEFBU_convertToUnicode(aString, aCharset) {
		if (!aString)
			return "";
		try {
			this.UNICODE.charset = aCharset;
			aString = this.UNICODE.ConvertToUnicode(aString);
		}
		catch (ex) {
		}
		return aString;
	},



	convertPathToFile: function ARCHIVEFBU_convertPathToFile(aPath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		file.initWithPath(aPath);
		return file;
	},

	convertFilePathToURL: function ARCHIVEFBU_convertFilePathToURL(aFilePath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		file.initWithPath(aFilePath);
		return this.IO.newFileURI(file).spec;
	},

	convertURLToObject: function ARCHIVEFBU_convertURLToObject(aURLSpec) {
		var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURI);
		uri.spec = aURLSpec;
		return uri;
	},

	convertURLToFile: function ARCHIVEFBU_convertURLToFile(aURLSpec) {
		if (aURLSpec.indexOf("file://") != 0)
			return;
		try {
			var fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
			return fileHandler.getFileFromURLSpec(aURLSpec);
		}
		catch (ex) {
		}
	},

	execProgram: function ARCHIVEFBU_execProgram(aExecFilePath, args) {
		var file    = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
		try {
			file.initWithPath(aExecFilePath);
			if (!file.exists()) {
				this.alert("ERROR: File does not exist.\n" + aExecFilePath);
				return;
			}
			process.init(file);
			process.run(false, args, args.length);
		}
		catch (ex) {
			this.alert("ERROR: File is not executable.\n" + aExecFilePath);
		}
	},

	getFocusedWindow: function ARCHIVEFBU_getFocusedWindow() {
		var topWin = this.WINDOW.getMostRecentWindow(null);
		var win = topWin.document.commandDispatcher.focusedWindow;
		if (!win || win == topWin || win instanceof Ci.nsIDOMChromeWindow)
			win = topWin.content;
		return win;
	},

	getDefaultIcon: function ARCHIVEFBU_getDefaultIcon(type) {
		switch (type) {
			case "folder" : return "chrome://archivefb/skin/treefolder.png";
			case "note"   : return "chrome://archivefb/skin/treenote.png";
			default       : return "chrome://archivefb/skin/treeitem.png";
		}
	},


	get prefBranch() {
		delete this.prefBranch;
		return this.prefBranch = Cc["@mozilla.org/preferences-service;1"].
		                         getService(Ci.nsIPrefService).
		                         getBranch("archivefb.");
	},

	getPref: function ARCHIVEFBU_getPref(aName, aDefaultValue, aInterface) {
		try {
			switch (this.prefBranch.getPrefType(aName)) {
				case this.prefBranch.PREF_BOOL: 
					return this.prefBranch.getBoolPref(aName);
				case this.prefBranch.PREF_INT: 
					return this.prefBranch.getIntPref(aName);
				case this.prefBranch.PREF_STRING: 
					return this.prefBranch.getComplexValue(aName, Ci.nsISupportsString).data;
				default: 
					throw null;
			}
		}
		catch (ex) {
			return aDefaultValue;
		}
	},

	setPref: function ARCHIVEFBU_getPref(aName, aValue) {
		try {
			switch (this.prefBranch.getPrefType(aName)) {
				case this.prefBranch.PREF_BOOL: 
					this.prefBranch.setBoolPref(aName, aValue);
					break;
				case this.prefBranch.PREF_INT: 
					this.prefBranch.setIntPref(aName, aValue);
					break;
				case this.prefBranch.PREF_STRING: 
					var str = Cc["@mozilla.org/supports-string;1"].
					          createInstance(Ci.nsISupportsString);
					str.data = aValue;
					this.prefBranch.setComplexValue(aName, Ci.nsISupportsString, str);
					break;
				default: 
					throw null;
			}
		}
		catch (ex) {
		}
	},

	escapeComment: function ARCHIVEFBU_escapeComment(aStr) {
		if (aStr.length > 10000)
			this.alert("NOTICE: Too long comment makes archivefb slow.");
		return aStr.replace(/\r|\n|\t/g, " __BR__ ");
	},

	getBrowserWindow: function ARCHIVEFBU_getBrowserWindow() {
		return this.WINDOW.getMostRecentWindow("navigator:browser");
	},

	openManageWindow: function ARCHIVEFBU_openManageWindow(aRes, aModEltID) {
		this.getBrowserWindow().openDialog(
			"chrome://archivefb/content/manage.xul", "archivefb:Manage", 
			"chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID
		);
	},

	getLocaleString: function F2U_getLocaleString(aName, aArgs) {
		if (!this._stringBundle) {
			const BUNDLE_URI = "chrome://archivefb/locale/archivefb.properties";
			var bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"].
			                getService(Ci.nsIStringBundleService);
			this._stringBundle = bundleSvc.createBundle(BUNDLE_URI);
		}
		try {
			if (!aArgs)
				return this._stringBundle.GetStringFromName(aName);
			else
			    return this._stringBundle.formatStringFromName(aName, aArgs, aArgs.length);
		}
		catch (ex) {
			return aName;
		}
	},
	_stringBundle: null,

	alert: function ARCHIVEFBU_alert(aText) {
		this.PROMPT.alert(null, "[archivefb]", aText);
	},

	log: function ARCHIVEFBU_log(aMsg, aOpenConsole) {
		var console = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
		console.logStringMessage("archivefb> " + aMsg);
	},


};




Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "RDF", "@mozilla.org/rdf/rdf-service;1", "nsIRDFService"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "RDFC", "@mozilla.org/rdf/container;1", "nsIRDFContainer"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "RDFCU", "@mozilla.org/rdf/container-utils;1", "nsIRDFContainerUtils"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "DIR", "@mozilla.org/file/directory_service;1", "nsIProperties"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "IO", "@mozilla.org/network/io-service;1", "nsIIOService"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "UNICODE", "@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "WINDOW", "@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator"
);
XPCOMUtils.defineLazyServiceGetter(
	archivefbUtils, "PROMPT", "@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService"
);




var EXPORTED_SYMBOLS = ["archivefbUtils"];


