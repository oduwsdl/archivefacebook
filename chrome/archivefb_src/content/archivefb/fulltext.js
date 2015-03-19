
var gCacheStatus;
var gCacheString;

var gCacheFile;




function ARCHIVEFB_initFT(type)
{
	gCacheStatus = document.getElementById("archivefbCacheStatus");
	gCacheString = document.getElementById("archivefbCacheString");
	gCacheFile = archivefbUtils.getarchivefbDir().clone();
	gCacheFile.append("cache.rdf");
	archivefbCacheSource.init();
	switch ( type )
	{
		case 'SEARCH' : archivefbSearchResult.exec(); break;
		case 'CACHE'  : setTimeout(function() { archivefbCacheService.build(); }, 0); break;
	}
}


var archivefbSearchResult =
{
	get CURRENT_TREEITEM() { return this.treeItems[document.getElementById("archivefbTree").currentIndex]; },

	index : 0,
	count : 0,
	hit : 0,
	QueryStrings   : { q : "", re : "", cs : "", ref : "" },
	RegExpModifier : "",
	RegExpInclude : [],
	RegExpExclude : [],
	includeWords : [],
	excludeWords : [],
	resEnum : null,
	treeItems : [],
	targetFolders : [],

	exec : function()
	{
		var qa = document.location.search.substring(1).split("&");
		for ( var i = 0; i < qa.length; i++ )
		{
			this.QueryStrings[qa[i].split("=")[0]] = qa[i].split("=")[1];
		}
		this.QueryStrings['q'] = decodeURIComponent(this.QueryStrings['q']);

		if ( this.QueryStrings['ref'].indexOf("urn:archivefb:item") == 0 )
		{
			var refRes = archivefbUtils.RDF.GetResource(this.QueryStrings['ref']);
			var elt = document.getElementById("archivefbResultHeader").firstChild.nextSibling;
			elt.value += archivefbData.getProperty(refRes, "title");
			elt.hidden = false;
			this.targetFolders = archivefbData.flattenResources(refRes, 1, true);
			for ( var i = 0; i < this.targetFolders.length; i++ )
			{
				this.targetFolders[i] = this.targetFolders[i].Value;
			}
		}

		this.RegExpModifier = ( this.QueryStrings['cs'] != "true" ) ? "im" : "m";
		if ( this.QueryStrings['re'] != "true" )
		{
			var query = this.QueryStrings['q'].replace(/( |\u3000)+/g, " ");
			var quotePos1;
			var quotePos2;
			var quotedStr;
			while ( (quotePos1 = query.indexOf('"')) != -1 )
			{
				quotedStr = query.substring(quotePos1+1, query.length);
				quotePos2 = quotedStr.indexOf('"');
				if ( quotePos2 == -1 ) break;
				quotedStr = quotedStr.substring(0, quotePos2);
				var replaceStr = '"' + quotedStr + '"';
				if ( quotePos1 >= 1 && query.charAt(quotePos1-1) == '-' )
				{
					this.excludeWords.push(quotedStr);
					this.RegExpExclude.push( new RegExp(quotedStr, this.RegExpModifier) );
					replaceStr = "-" + replaceStr;
				}
				else if ( quotedStr.length > 0 )
				{
					this.includeWords.push(quotedStr);
					this.RegExpInclude.push( new RegExp(this.escapeRegExpSpecialChars(quotedStr), this.RegExpModifier) );
				}
				query = query.replace(replaceStr, "");
			}
			query = query.replace(/ +/g, " ").split(' ');
			for ( var i=0; i<query.length; i++ )
			{
				var word = query[i];
				if ( word.charAt(0) == '-' )
				{
					word = word.substring(1, word.length);
					this.excludeWords.push(word);
					this.RegExpExclude.push( new RegExp(this.escapeRegExpSpecialChars(word), this.RegExpModifier) );
				}
				else if ( word.length > 0 )
				{
					this.includeWords.push(word);
					this.RegExpInclude.push( new RegExp(this.escapeRegExpSpecialChars(word), this.RegExpModifier) );
				}
			}
			if ( this.RegExpInclude.length == 0 ) return;
		}
		this.resEnum = archivefbCacheSource.container.GetElements();
		this.count = archivefbCacheSource.container.GetCount();
		setTimeout(function(){ archivefbSearchResult.next(); }, 10);
	},

	next : function()
	{
		if ( this.resEnum.hasMoreElements() )
		{
			if ( ++this.index % 100 == 0 ) {
				setTimeout(function(){ archivefbSearchResult.process(); }, 0);
				var msg = archivefbUtils.getLocaleString("SCANNING") + "... ("  + Math.round(this.index / this.count * 100) + " %)";
				document.title = document.getElementById("archivefbResultHeader").firstChild.value = msg;
			} else {
				this.process();
			}
		}
		else this.finalize();
	},

	process : function()
	{
		var res = this.resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
		if ( res.Value == "urn:archivefb:cache" ) return this.next();
		var folder  = archivefbCacheSource.getProperty(res, "folder");
		if ( this.targetFolders.length > 0 )
		{
			if ( folder && folder.indexOf("urn:archivefb:item") != 0 )
			{
				try {
					var target = archivefbUtils.RDF.GetLiteral(folder);
					var prop   = archivefbData.dataSource.ArcLabelsIn(target).getNext().
					             QueryInterface(Ci.nsIRDFResource);
					var source = archivefbData.dataSource.GetSource(prop, target, true);
					folder = source.Value;
				} catch(ex) {
				}
			}
			if ( this.targetFolders.indexOf(folder) < 0 ) return this.next();
		}
		var content = archivefbCacheSource.getProperty(res, "content");
		var resURI  = res.Value.split("#")[0];
		var name    = res.Value.split("#")[1] || "index";
		res = archivefbUtils.RDF.GetResource(resURI);
		if ( !archivefbData.exists(res) ) return this.next();
		var type    = archivefbData.getProperty(res, "type");
		var title   = archivefbData.getProperty(res, "title");
		var comment = archivefbData.getProperty(res, "comment");
		if ( this.QueryStrings['re'] == "true" )
		{
			var re = new RegExp(this.QueryStrings['q'], this.RegExpModifier);
			var isMatchT = title.match(re);
			var isMatchM = comment.match(re);
			var isMatchC = content.match(re);
		}
		else
		{
			var willContinue = false;
			var tcc = [title, comment, content].join("\t");
			for ( var x = 0; x < this.RegExpInclude.length; x++ ) {
				if ( !tcc.match(this.RegExpInclude[x]) ) { willContinue = true; break; }
			}
			if ( willContinue ) return this.next();
			for ( x = 0; x < this.RegExpExclude.length; x++ ) {
				if ( tcc.match(this.RegExpExclude[x]) )  { willContinue = true; break; }
			}
			if ( willContinue ) return this.next();
			var isMatchT = isMatchM = isMatchC = true;
		}
		if ( isMatchT || isMatchM || isMatchC )
		{
			var icon = archivefbData.getProperty(res, "icon");
			if ( !icon ) icon = archivefbUtils.getDefaultIcon(type);
			if ( folder.indexOf("urn:archivefb:") == 0 ) folder = archivefbData.getProperty(archivefbUtils.RDF.GetResource(folder), "title");
			archivefbSearchResult.treeItems.push([
				title,
				this.extractRightContext(content),
				this.extractRightContext(comment).replace(/ __BR__ /g, " "),
				folder,
				name,
				resURI.substring(18),
				type,
				icon,
			]);
			this.hit++;
		}
		return this.next();
	},

	finalize : function()
	{
		var colIDs = [
			"archivefbTreeColTitle",
			"archivefbTreeColContent",
			"archivefbTreeColComment",
			"archivefbTreeColFolder",
			"archivefbTreeColName",
		];
		var treeView = new archivefbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col)
		{
			if ( col.index == 0 ) return this._items[row][7];
		};
		treeView.getCellProperties = function(row, col, properties)
		{
			if ( col.index != 0 ) return;
			properties.AppendElement(ATOM_SERVICE.getAtom(this._items[row][6]));
		};
		document.getElementById("archivefbTree").view = treeView;
		var headerLabel1 = gCacheString.getFormattedString("RESULTS_FOUND", [this.hit] );
		if ( this.QueryStrings['re'] == "true" )
		{
			var headerLabel2 = gCacheString.getFormattedString("MATCHING", [ this.localizedQuotation(this.QueryStrings['q']) ]);
		}
		else
		{
			var includeQuoted = [];
			for ( var x = 0; x < this.includeWords.length; x++ ) {
				includeQuoted.push(this.localizedQuotation(this.includeWords[x]));
			}
			if ( includeQuoted.length > 0 ) includeQuoted = gCacheString.getFormattedString("INCLUDING", [includeQuoted.join(" ")]);
			var excludeQuoted = [];
			for ( var x = 0; x < this.excludeWords.length; x++ ) {
				excludeQuoted.push(this.localizedQuotation(this.excludeWords[x]));
			}
			if ( excludeQuoted.length > 0 ) excludeQuoted = gCacheString.getFormattedString("EXCLUDING", [excludeQuoted.join(" ")]);
			var headerLabel2 = includeQuoted + " " + excludeQuoted;
		}
		document.title = document.getElementById("archivefbResultHeader").firstChild.value = headerLabel1 + " : " + headerLabel2;
	},


	extractRightContext : function(aString)
	{
		aString = aString.replace(/\r|\n|\t/g, " ");
		pattern = ( this.QueryStrings['re'] == "true" ) ? this.QueryStrings['q'] : this.includeWords[0];
		var re = new RegExp("(" + pattern + ".*)", this.RegExpModifier);
		var ret = aString.match(re) ? RegExp.$1 : aString;
		return ( ret.length > 100 ) ? ret.substring(0, 100) : ret;
	},

	escapeRegExpSpecialChars : function(aString)
	{
		return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
	},

	localizedQuotation : function(aString)
	{
		return gCacheString.getFormattedString("QUOTATION", [aString]);
	},

	forward : function(key)
	{
		if ( !this.CURRENT_TREEITEM ) return;
		var id   = this.CURRENT_TREEITEM[5];
		var url  = this.CURRENT_TREEITEM[6] == "note" ? "chrome://archivefb/content/note.xul?id=" + id
		         : archivefbUtils.getBaseHref(archivefbData.dataSource.URI) + "data/" + id + "/" + 
		           this.CURRENT_TREEITEM[4] + ".html";
		switch ( key ) {
			case "O" : archivefbUtils.loadURL(url, false); break;
			case "T" : archivefbUtils.loadURL(url, true); break;
			case "P" : window.openDialog("chrome://archivefb/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
			case "L" : 
				var res = archivefbUtils.RDF.GetResource("urn:archivefb:item" + archivefbSearchResult.CURRENT_TREEITEM[5]);
				archivefbUtils.getBrowserWindow().archivefbBrowserOverlay.execLocate(res);
				break;
			default  : document.getElementById("archivefbBrowser").loadURI(url); break;
		}
	},

	onDocumentLoad : function(aEvent)
	{
		aEvent.stopPropagation();
		aEvent.preventDefault();
		if ( this.QueryStrings["re"] == "true" ) this.includeWords = [this.QueryStrings['q']];
		for ( var i = 0; i < this.includeWords.length; i++ )
		{
			var colors = ["#FFFF33","#66FFFF","#90FF90","#FF9999","#FF99FF"];
			archivefbKeywordHighlighter.exec(colors[i % colors.length], this.includeWords[i]);
		}
	},

};


function ARCHIVEFB_exitResult()
{
	window.location.href = document.getElementById("archivefbBrowser").currentURI.spec;
}




var archivefbCacheService = {

	index : 0,
	dataDir : null,
	resList : [],
	folders : [],
	uriHash : {},
	_curResURI : "",

	build : function()
	{
		document.title = gCacheString.getString("BUILD_CACHE") + " - archivefb";
		gCacheStatus.firstChild.value = gCacheString.getString("BUILD_CACHE_INIT");
		archivefbCacheSource.refreshEntries();
		this.dataDir = archivefbUtils.getarchivefbDir().clone();
		this.dataDir.append("data");
		var contResList = archivefbData.flattenResources(archivefbUtils.RDF.GetResource("urn:archivefb:root"), 1, true);
		for ( var i = 0; i < contResList.length; i++ )
		{
			var resList = archivefbData.flattenResources(contResList[i], 2, false);
			for ( var j = 0; j < resList.length; j++ )
			{
				var type = archivefbData.getProperty(resList[j], "type");
				if ( type == "image" || type == "file" || type == "bookmark" ) continue;
				this.resList.push(resList[j]);
				this.folders.push(contResList[i].Value);
			}
		}
		this.processAsync();
	},

	processAsync : function()
	{
		var res = this.resList[this.index];
		var id  = archivefbData.getProperty(res, "id");
		var dir = this.dataDir.clone();
		dir.append(id);
		gCacheStatus.firstChild.value = gCacheString.getString("BUILD_CACHE_UPDATE") + " " + archivefbData.getProperty(res, "title");
		gCacheStatus.lastChild.value  = Math.round((this.index + 1) / this.resList.length * 100);
		this.inspectFile(dir, "index");
		if ( archivefbData.getProperty(res, "type") == "site" )
		{
			var url2name = dir.clone();
			url2name.append("archivefb-url2name.txt");
			if ( url2name.exists() )
			{
				url2name = archivefbUtils.readFile(url2name).split("\n");
				for ( var i = 0; i < url2name.length; i++ )
				{
					if ( i > 256 ) break;
					var line = url2name[i].split("\t");
					if ( !line[1] || line[1] == "index" ) continue;
					this.inspectFile(dir, line[1]);
				}
			}
		}
		if ( this._curResURI != this.folders[this.index] ) document.title = archivefbData.getProperty(archivefbUtils.RDF.GetResource(this.folders[this.index]), "title") || gCacheString.getString("BUILD_CACHE");
		if ( ++this.index < this.resList.length )
			setTimeout(function(){ archivefbCacheService.processAsync(); }, 0);
		else
			setTimeout(function(){ archivefbCacheService.finalize(); }, 0);
	},

	inspectFile : function(aDir, aName)
	{
		var resource = archivefbUtils.RDF.GetResource(this.resList[this.index].Value + "#" + aName);
		var contents = [];
		var num = 0;
		do {
			var file;
			var file1 = aDir.clone();
			var file2 = aDir.clone();
			file1.append(aName + ((num > 0) ? num : "") + ".html");
			file2.append(aName + "_" + ((num > 0) ? num : "") + ".html");
			if      ( file1.exists() ) file = file1;
			else if ( file2.exists() ) file = file2;
			else break;
			if ( num == 0 && archivefbCacheSource.exists(resource) )
			{
				if ( gCacheFile.lastModifiedTime > file.lastModifiedTime )
				{
					this.uriHash[resource.Value] = true;
					archivefbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
					return;
				}
			}
			var content = archivefbUtils.readFile(file);
			content = archivefbUtils.convertToUnicode(content, archivefbData.getProperty(this.resList[this.index], "chars"));
			contents.push(this.convertHTML2Text(content));
		}
		while ( ++num < 10 );
		contents = contents.join("\t").replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ");
		if ( archivefbCacheSource.exists(resource) )
		{
			archivefbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
			archivefbCacheSource.updateEntry(resource, "content", contents);
		}
		else
		{
			archivefbCacheSource.addEntry(resource, contents);
		}
		this.uriHash[resource.Value] = true;
	},

	finalize : function()
	{
		document.title = gCacheString.getString("BUILD_CACHE_UPDATE");
		for ( var uri in this.uriHash )
		{
			if ( !this.uriHash[uri] && uri != "urn:archivefb:cache" )
			{
				gCacheStatus.firstChild.value = gCacheString.getString("BUILD_CACHE_REMOVE") + " " + uri;
				archivefbCacheSource.removeEntry(archivefbUtils.RDF.GetResource(uri));
			}
		}
		gCacheStatus.firstChild.value = gCacheString.getString("BUILD_CACHE_UPDATE") + "cache.rdf";
		archivefbCacheSource.flush();
		try {
			if ( window.arguments[0] ) archivefbUtils.loadURL(window.arguments[0], true);
		} catch(ex) {
		}
		window.close();
	},

	convertHTML2Text : function(aHTML)
	{
		var html = Cc["@mozilla.org/supports-string;1"].
		           createInstance(Ci.nsISupportsString);
		html.data = aHTML;
		var text = { value: null };
		try {
			var converter = Cc["@mozilla.org/widget/htmlformatconverter;1"].
			                createInstance(Ci.nsIFormatConverter);
			converter.convert("text/html", html, html.toString().length, "text/unicode", text, {});
			text = text.value.QueryInterface(Ci.nsISupportsString);
			return text.toString();
		}
		catch (ex) {
			return aHTML;
		}
	},

};




var archivefbCacheSource = {

	dataSource : null,
	container  : null,

	init : function()
	{
		if ( !gCacheFile.exists() ) gCacheFile.create(gCacheFile.NORMAL_FILE_TYPE, 0666);
		var filePath = archivefbUtils.IO.newFileURI(gCacheFile).spec;
		this.dataSource = archivefbUtils.RDF.GetDataSourceBlocking(filePath);
		this.container = Cc['@mozilla.org/rdf/container;1'].createInstance(Ci.nsIRDFContainer);
		try {
			this.container.Init(this.dataSource, archivefbUtils.RDF.GetResource("urn:archivefb:cache"));
		} catch(ex) {
			this.container = archivefbUtils.RDFCU.MakeSeq(this.dataSource, archivefbUtils.RDF.GetResource("urn:archivefb:cache"));
		}
	},

	refreshEntries : function()
	{
		var resEnum = this.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
			if ( res.Value.indexOf("#") == -1 && res.Value != "urn:archivefb:cache" )
				this.removeEntry(res);
			else
				archivefbCacheService.uriHash[res.Value] = false;
		}
		this.container = archivefbUtils.RDFCU.MakeSeq(this.dataSource, archivefbUtils.RDF.GetResource("urn:archivefb:cache"));
	},

	addEntry : function(aRes, aContent)
	{
		aContent = archivefbData.sanitize(aContent);
		this.container.AppendElement(aRes);
		var folder  = archivefbUtils.RDF.GetLiteral(archivefbCacheService.folders[archivefbCacheService.index]);
		var content = archivefbUtils.RDF.GetLiteral(aContent);
		this.dataSource.Assert(aRes, archivefbUtils.RDF.GetResource(archivefbUtils.namespace + "folder"),  folder,  true);
		this.dataSource.Assert(aRes, archivefbUtils.RDF.GetResource(archivefbUtils.namespace + "content"), content, true);
	},

	updateEntry : function(aRes, aProp, newVal)
	{
		newVal = archivefbData.sanitize(newVal);
		aProp = archivefbUtils.RDF.GetResource(archivefbUtils.namespace + aProp);
		var oldVal = this.dataSource.GetTarget(aRes, aProp, true).QueryInterface(Ci.nsIRDFLiteral);
		newVal = archivefbUtils.RDF.GetLiteral(newVal);
		this.dataSource.Change(aRes, aProp, oldVal, newVal);
	},

	removeEntry : function(aRes)
	{
		this.container.RemoveElement(aRes, true);
		var names = this.dataSource.ArcLabelsOut(aRes);
		while ( names.hasMoreElements() )
		{
			var name  = names.getNext().QueryInterface(Ci.nsIRDFResource);
			var value = this.dataSource.GetTarget(aRes, name, true);
			this.dataSource.Unassert(aRes, name, value);
		}
	},

	getProperty : function(aRes, aProp)
	{
		try {
			var arc = archivefbUtils.RDF.GetResource(archivefbUtils.namespace + aProp);
			var retVal = this.dataSource.GetTarget(aRes, arc, true);
			return retVal.QueryInterface(Ci.nsIRDFLiteral).Value;
		} catch(ex) {
			return "";
		}
	},

	exists : function(aRes)
	{
		return (this.dataSource.ArcLabelsOut(aRes).hasMoreElements() && this.container.IndexOf(aRes) != -1);
	},

	flush : function()
	{
		this.dataSource.QueryInterface(Ci.nsIRDFRemoteDataSource).Flush();
	}

};




var archivefbKeywordHighlighter = {

	word : "",
	frameList : [],
	searchRange : null,
	startPoint : null,
	endPoint : null,

	flattenFrames : function(aWindow)
	{
		var ret = [aWindow];
		for ( var i = 0; i < aWindow.frames.length; i++ )
		{
			ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
		}
		return ret;
	},

	exec : function(color, word)
	{
		this.word = word;

		var rootWin = document.getElementById("archivefbBrowser").contentWindow;
		this.frameList = this.flattenFrames(rootWin);

		for ( var i = 0; i < this.frameList.length; i++ )
		{
			var doc = this.frameList[i].document;
			var body = doc.body;
			if ( !body ) return;

			var count = body.childNodes.length;
			this.searchRange = doc.createRange();
			this.startPoint  = doc.createRange();
			this.endPoint    = doc.createRange();

			var baseNode = doc.createElement("span");
			baseNode.setAttribute("style", "background-color: " + color + ";");
			baseNode.setAttribute("id", "__firefox-findbar-search-id");

			this.searchRange.setStart(body, 0);
			this.searchRange.setEnd(body, count);

			this.startPoint.setStart(body, 0);
			this.startPoint.setEnd(body, 0);
			this.endPoint.setStart(body, count);
			this.endPoint.setEnd(body, count);

			var retRange = null;
			var finder = Cc['@mozilla.org/embedcomp/rangefind;1'].createInstance().QueryInterface(Ci.nsIFind);

			while( (retRange = finder.Find(this.word, this.searchRange, this.startPoint, this.endPoint)) )
			{
				var nodeSurround = baseNode.cloneNode(true);
				var node = this.highlightNode(retRange, nodeSurround);
				this.startPoint = node.ownerDocument.createRange();
				this.startPoint.setStart(node, node.childNodes.length);
				this.startPoint.setEnd(node, node.childNodes.length);
			}
		}
	},

	highlightNode : function(range, node)
	{
		var startContainer = range.startContainer;
		var startOffset = range.startOffset;
		var endOffset = range.endOffset;
		var docfrag = range.extractContents();
		var before = startContainer.splitText(startOffset);
		var parent = before.parentNode;
		node.appendChild(docfrag);
		parent.insertBefore(node, before);
		return node;
	}

};


