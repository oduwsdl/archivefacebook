
var archivefbContentSaver = {


	name         : "",
	item         : null,
	contentDir   : null,
	httpTask     : {},
	file2URL     : {},
	option       : {},
	refURLObj    : null,
	favicon      : null,
	frameList    : [],
	frameNumber  : 0,
	selection    : null,
	linkURLs     : [],
	_fxVer35     : null,


	changeLinksToRelative : function(){
		var URL_NOTES = "http://www.facebook.com/profile.php?sk=notes"; 
		var URL_FRIENDS = "http://www.facebook.com/profile.php?sk=friends";
		var URL_PHOTOS = "http://www.facebook.com/profile.php?sk=photos";
		var URL_INFO = "http://www.facebook.com/profile.php?sk=info";
		var URL_WALL = "http://www.facebook.com/profile.php?sk=wall";
		var URL_EVENTS = "http://www.facebook.com/?sk=events";
		var URL_PHOTOS_ALBUMS = "http://www.facebook.com/photos.php";
		var URL_MESSAGES_PP1 = "http://www.facebook.com/?sk=messages&page=1";

		for (var i in archivefbBrowserOverlay.idArray)	//go through all of the pages just archived
		{
			var file = archivefbUtils.getContentDir(archivefbBrowserOverlay.idArray[i]).clone();	//get the file on the local filesystem that corresponds to the archived FB page
			file.append("index.html");																//the index file is the html file archived, one per archive entry, multiple per session
			if (file.exists()) {																	//des this archive actually exist?
				var html = archivefbUtils.readFile(file);
				
				html = html.replace(/Â/g,"XXXXX");
				html = html.replace(/·/g,"YYYYY");
				html = html.replace(/183/g,"#184");
				html = html.replace(/Share/g,"steal");
				html = html.replace(/\&amp;/g,"&");	//simplify the replacement algorithm by decoding ampersands
				html = html.replace(/\&permPage=1/gi,"");	//fixes relativity for "next" and "prev" links for navigation between photos
				
				for(var absoluteURL in archivefbBrowserOverlay.idArray){
					while(html.indexOf(absoluteURL) != -1){
						html = html.replace(absoluteURL,"../"+archivefbBrowserOverlay.idArray[absoluteURL]+"/index.html");		
					}	
				}

				archivefbUtils.writeFile(file, html, "UTF-8");
				continue;
		//*** OBSOLETE 
		//	*** LOGIC
		//		** BELOW		
				
				
				var html = archivefbUtils.readFile(file);											//  if so, put the file's contents in a JS string
									
				var userHasAShortName = true;	//experimental detection set in conditionals below to prevent regexing to replace URLs with short name					
									
				// MY PROFILE > NOTES replace FB.com links to relative local links
				if(archivefbBrowserOverlay.idArray[URL_NOTES] != undefined) 	{userHasAShortName = false; html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?sk=notes/gi, "../"+archivefbBrowserOverlay.idArray[URL_NOTES]+"/index.html");}
				// MY PROFILE > FRIENDS replace FB.com links to relative local links
				if(archivefbBrowserOverlay.idArray[URL_FRIENDS] != undefined) 	{userHasAShortName = false; html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?sk=friends/gi, "../"+archivefbBrowserOverlay.idArray[URL_FRIENDS]+"/index.html");}
				// MY PROFILE > PHOTOS replace FB.com links to relative local links
				if(archivefbBrowserOverlay.idArray[URL_PHOTOS] != undefined) 	{userHasAShortName = false; html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?sk=photos/gi, "../"+archivefbBrowserOverlay.idArray[URL_PHOTOS]+"/index.html");}
				// MY PROFILE > INFO replace FB.com links to relative local links
				if(archivefbBrowserOverlay.idArray[URL_INFO] != undefined) 		{userHasAShortName = false; html = html.replace(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=info/gi, "../"+archivefbBrowserOverlay.idArray[URL_INFO]+"/index.html");}
				// MY PROFILE > WALL replace FB.com links to relative local links
				if(archivefbBrowserOverlay.idArray[URL_WALL] != undefined) 		{
					userHasAShortName = false; 
					html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?sk=wall/gi, "../"+archivefbBrowserOverlay.idArray[URL_WALL]+"/index.html");}
/*
				if(archivefbBrowserOverlay.idArray[i] != undefined) {
					var iAsRegEx = i; 
					iAsRegEx = iAsRegEx.replace(/\//gi,"\\/"); iAsRegEx = iAsRegEx.replace(/\./gi,"\\."); iAsRegEx = iAsRegEx.replace(/\?/gi,"\\?");i=iAsRegEx.replace(/\&/gi,"\\&");
					html = html.replace(iAsRegEx,archivefbBrowserOverlay.idArray[i]);
				}
*/					
					
					
					//experimental application to both friend archiving and self-archiving
					// TODO: determine what qualifies as a valid shortname on Facebook. This is necessary for the below regexes.
					/* temp disabled below, as it only applies to archiving someone else's FB */
				if(userHasAShortName){	//this boolean is reset in above conditional so code within conditional won't process if user does not have a shortname
					var infoURL = html.match(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=info/gim);
					var wallURL = html.match(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=wall/gim);
					var photosURL = html.match(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=photos/gim);
					var notesURL = html.match(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=notes/gim);
					var friendsURL = html.match(/http\:\/\/www\.facebook\.com\/(profile\.php|[a-zA-Z0-9\._]+)\?sk=friends/gim);
					if(infoURL && infoURL.length >0 	&& archivefbBrowserOverlay.idArray[infoURL[0]]){	html = html.replace(infoURL[0], "../"+archivefbBrowserOverlay.idArray[infoURL[0]]+"/index.html");}
					if(wallURL && wallURL.length >0 	&& archivefbBrowserOverlay.idArray[wallURL[0]]){	html = html.replace(wallURL[0], "../"+archivefbBrowserOverlay.idArray[wallURL[0]]+"/index.html");}
					if(photosURL && photosURL.length >0 	&& archivefbBrowserOverlay.idArray[photosURL[0]]){	html = html.replace(photosURL[0], "../"+archivefbBrowserOverlay.idArray[photosURL[0]]+"/index.html");}
					if(notesURL && notesURL.length >0 	&& archivefbBrowserOverlay.idArray[notesURL[0]]){	html = html.replace(notesURL[0], "../"+archivefbBrowserOverlay.idArray[notesURL[0]]+"/index.html");}
					if(friendsURL && friendsURL.length >0 && archivefbBrowserOverlay.idArray[friendsURL[0]]){	html = html.replace(friendsURL[0], "../"+archivefbBrowserOverlay.idArray[friendsURL[0]]+"/index.html");}
				}
					
					//rewrite FB message URLs
					var messageURLs = html.match(/http\:\/\/www\.facebook\.com\/\?page=[0-9]+\&amp;sk=messages\&amp;tid=[0-9]+/gim);
					if(messageURLs != null && messageURLs.length > 0){
						for(var m=0; m<messageURLs.length; m++){
							html = html.replace(messageURLs[m],archivefbBrowserOverlay.idArray[messageURLs[m]]);
						}
					}
					
					
					var id = html.match(/http\:\/\/www\.facebook\.com\/group\.php\?gid=[0-9]+\&amp;v=info/gim);
					var discussionApp = html.match(/http\:\/\/www\.facebook\.com\/group\.php\?gid=[0-9]+\&amp;v=app_[0-9]+/gim);
					
					
					//messages -> page 1	
					
					//messages link in FB's icon navigation at top left
					if(html.indexOf("http://www.facebook.com/?sk=messages&amp;ref=mb")!=-1 && archivefbBrowserOverlay.idArray["http://www.facebook.com/?sk=messages&page=1"]!=null && archivefbBrowserOverlay.idArray["http://www.facebook.com/?sk=messages&page=1"]!=""){
						html = html.replace("http://www.facebook.com/?sk=messages&amp;ref=mb","../"+archivefbBrowserOverlay.idArray["http://www.facebook.com/?sk=messages&page=1"]+"/index.html");
					}
		
					
					if(id!= null && id.length > 0){
						var myId = id[0].replace("&amp;v=info","");  
						myId = myId.substr(38);//only save id#
						var url_info1 = "http://www.facebook.com/group.php?gid="+myId+"&amp;v=info";
						var url_info2 = "http://www.facebook.com/group.php?gid="+myId+"&v=info";
						var url_info =  "http://www.facebook.com/group.php?gid="+myId+"&sk=info";
						var url_wall1 = "http://www.facebook.com/group.php?gid="+myId+"&amp;v=wall";
						var url_wall2 = "http://www.facebook.com/group.php?gid="+myId+"&v=wall";
						var url_wall =  "http://www.facebook.com/group.php?gid="+myId+"&sk=wall";
						var url_photo1 = "http://www.facebook.com/group.php?gid="+myId+"&amp;v=photos";
						var url_photo2 = "http://www.facebook.com/group.php?gid="+myId+"&v=photos";
						var url_photo =  "http://www.facebook.com/group.php?gid="+myId+"&sk=photo";
						var url_photob = "http://www.facebook.com/photo_search.php?oid="+myId+"&view=all";
						var url_photos = "http://www.facebook.com/photos.php?id="+myId;
						var url_photos_relative = "/photos.php?id="+myId;
						//var url_album = "http:\/\/www.facebook.com\/media\/set\/fbx\/\?set=a\.[0-9]+\.[0-9]+"+myId;
						//var albumRegEx = new RegExp("set=a\.[0-9]+\.[0-9]+\.[0-9]+","gim");
						//archivefbBrowserOverlay.idArray[album]);
						
						

						while(	html.indexOf(url_info1) != -1 || html.indexOf(url_info2) != -1 || 
								html.indexOf(url_wall1) != -1 || html.indexOf(url_wall2) != -1 ||
								html.indexOf(url_photo1) != -1 || html.indexOf(url_photo2) != -1 ||
								html.indexOf(url_photos_relative) != -1 
								)
						{

							html = html.replace(url_info1,"../"+archivefbBrowserOverlay.idArray[url_info]+"/index.html");
							html = html.replace(url_info2,"../"+archivefbBrowserOverlay.idArray[url_info]+"/index.html");
							html = html.replace(url_wall1,"../"+archivefbBrowserOverlay.idArray[url_wall]+"/index.html");
							html = html.replace(url_wall2,"../"+archivefbBrowserOverlay.idArray[url_wall]+"/index.html");
							html = html.replace(url_photo1,"../"+archivefbBrowserOverlay.idArray[url_photob]+"/index.html");
							html = html.replace(url_photo2,"../"+archivefbBrowserOverlay.idArray[url_photob]+"/index.html");
							html = html.replace(url_photos,"../"+archivefbBrowserOverlay.idArray[url_photos]+"/index.html");
							html = html.replace(url_photos_relative,"../"+archivefbBrowserOverlay.idArray[url_photos]+"/index.html");
							html = html.replace(discussionApp,"../"+archivefbBrowserOverlay.idArray[discussionApp]+"/index.html");
						}
					}
					
					//temp fix for encoding getting messed up during the archiving process
					
					
					/*for (var j in archivefbBrowserOverlay.idArray)
					{
						var regexJ = j.replace("/","\/"); 
						regexJ = regexJ.replace(":","\:");regexJ = regexJ.replace("?","\?");regexJ = regexJ.replace("&","\&");regexJ = regexJ.replace("=","\=");
						
						var urlRegEx = new RegExp(regexJ,"gi");
						html = html.replace(urlRegEx,archivefbBrowserOverlay.idArray[j]);
						
					}*/
					//this locks up
					//var wallUrl = html.match(/http\:\/\/www\.facebook\.com\/(.*)\?sk=wall/);//[0]=http://www.facebook.com/myusername?sk=wall, [1] = myusername
	
					//convert the url to a regex
					//var regexdI = i+""; regexdI = regexdI.replace(/\:/gi,"\:"); regexdI = regexdI.replace(/\//gi,"\/");regexdI = regexdI.replace(/\?/gi,"\?");regexdI = regexdI.replace(/\./gi,"\.");
					//alert(regexdI):
					//html.replace(regexdI,archivefbBrowserOverlay.idArray[i]);
					
					/*var albums = html.match(/http\:\/\/www\.facebook\.com\/album\.php\?aid=[0-9]+\&amp;id=[0-9]+/gi);
					//get all URLs of albums: A1,A1,A2,A2,A3,A3, etec (duplicated because of image and name)
					if(albums != null){
						//alert(archivefbBrowserOverlay.idArray.length);
						//alert(archivefbBrowserOverlay.idArray[albums[0]]);
						//alert(archivefbBrowserOverlay.idArray[albums[2]]);
					}*/
					
					//var moreToReplace = true;
					//while(moreToReplace){
					//	if(i.indexOf("photos.php?id=") != -1 || i.indexOf("aid=") != -1){//albums page
					//		html = html.replace(/http\:\/\/www\.facebook\.com\/album\.php\?aid=[0-9]+\&amp;id=[0-9]+/gi, "../"+archivefbBrowserOverlay.idArray[i]+"/index.html");
					//}else {
							
					//		moreToReplace = false;
					//	}
					//}
				
					
					
					
					//replace "profile" link at top right of page
					//html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?id=[0-9]+/gi, "../"+archivefbBrowserOverlay.idArray[URL_WALL]+"/index.html");

					
					//TODO: replace Â's generated
				//}else {//this is the photo albums page
				//	if(archivefbBrowserOverlay.idArray[URL_WALL] != undefined){
				//		//replace "profile" link at top right of page
				//		html = html.replace(/http\:\/\/www\.facebook\.com\/profile\.php\?id=[0-9]+/gi, "../"+archivefbBrowserOverlay.idArray[URL_WALL]+"/index.html");
				//	}
				//}
				
				archivefbUtils.writeFile(file, html, "UTF-8");
			}else {alert("file error");}	
		}		
	},
	flattenFrames : function(aWindow)
	{
		var ret = [aWindow];
		for ( var i = 0; i < aWindow.frames.length; i++ )
		{
			ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
		}
		return ret;
	},
	
	init : function(aPresetData)
	{
		if (this._fxVer35 === null) {
			var verComp = Cc["@mozilla.org/xpcom/version-comparator;1"].
			              getService(Ci.nsIVersionComparator);
			this._fxVer35 = verComp.compare(Application.version, "3.5") >= 0;
		}
		this.item = archivefbData.newItem();
		this.name = "index";
		this.favicon = null;
		this.file2URL = { "index.html" : true, "index.css" : true, "index.dat" : true, "index.png" : true, "sitemap.xml" : true, "archivefb-file2url.txt" : true, "archivefb-url2name.txt" : true, };
		this.option   = { "dlimg" : false, "dlsnd" : false, "dlmov" : false, "dlarc" : false, "custom" : "", "inDepth" : 0, "isPartial" : false, "images" : true, "styles" : true, "script" : false };
		this.linkURLs = [];
		this.frameList = [];
		this.frameNumber = 0;
		if ( aPresetData )
		{
			if ( aPresetData[0] ) this.item.id  = aPresetData[0];
			if ( aPresetData[1] ) this.name     = aPresetData[1];
			if ( aPresetData[2] ) this.option   = aPresetData[2];
			if ( aPresetData[3] ) this.file2URL = aPresetData[3];
			if ( aPresetData[4] >= this.option["inDepth"] ) this.option["inDepth"] = 0;
		}
		this.httpTask[this.item.id] = 0;
	},

	
	captureWindow : function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, nameToPrecedeListing)
	{
		this.init(aPresetData);
		this.item.chars  = aRootWindow.document.characterSet;
		this.item.source = aRootWindow.location.href;
		if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow )
		{
			this.item.icon = gBrowser.mCurrentBrowser.mIconURL;
		}
		this.frameList = this.flattenFrames(aRootWindow);
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [this.item.source];
		if ( aIsPartial )
		{
			this.selection = aRootWindow.getSelection();
			var lines = this.selection.toString().split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				lines[i] = lines[i].replace(/\r|\n|\t/g, "");
				if ( lines[i].length > 0 ) titles.push(lines[i].substring(0,72));
				if ( titles.length > 4 ) break;
			}
			this.item.title = ( titles.length > 0 ) ? titles[1] : titles[0];
		}
		else
		{
			this.selection = null;
			this.item.title = titles[0];
		}
		
		if(this.item.source.indexOf("sk=friends") != -1){this.item.title =  nameToPrecedeListing+" Friends";}
		else if(this.item.source.indexOf("sk=info") != -1){this.item.title =  nameToPrecedeListing+" Info";}
		else if(this.item.source.indexOf("=photos") != -1){this.item.title =  nameToPrecedeListing+" Photos";}
		else if(this.item.source.indexOf("photo_search.php") != -1){this.item.title =  nameToPrecedeListing+" Photos";}
		else if(this.item.source.indexOf("sk=notes") != -1){this.item.title =  nameToPrecedeListing+" Notes";}
		else if(this.item.source.indexOf("sk=events") != -1){this.item.title =  nameToPrecedeListing+" Events";}
		else if(this.item.source.indexOf("sk=groups") != -1){this.item.title =  nameToPrecedeListing+" Groups";}
		else if(this.item.source.indexOf("sk=messages") != -1){
			var page = this.item.source.substr(this.item.source.indexOf("page=")+5);
			this.item.title =  nameToPrecedeListing+" Messages, Page "+page;
			
		}
		else if(this.item.source.indexOf("photos.php?id=") != -1){this.item.title =  nameToPrecedeListing+" Photo Albums";}
		else if(this.item.source.indexOf("media/set/fbx") != -1){this.item.title =  nameToPrecedeListing+" Album "+aRootWindow.document.title;}
		else if(this.item.source.indexOf("v=app_") != -1){this.item.title =  nameToPrecedeListing+" Discussions";} //for fan/group pages
		else if(this.item.source.indexOf("photo.php") != -1){this.item.title =  nameToPrecedeListing+" Photo";}
		else if(this.item.source.indexOf("group.php") != -1){this.item.title =  nameToPrecedeListing+" Group";}
		else if(this.item.source.indexOf("sk=wall") != -1){this.item.title =  nameToPrecedeListing+" Wall";}
		else {
			this.item.title = nameToPrecedeListing+" ? Page";
		}
		
		var ddd = new Date();
		//this.item.title = this.item.title + " ("+(ddd.getMonth()+1)+"/"+ddd.getDate()+"/"+ddd.getFullYear()+")";
		//for one sidebar entry per archiving session, only use title, not name of FB page
		this.item.title = "Archive ("+(ddd.getMonth()+1)+"/"+ddd.getDate()+"/"+ddd.getFullYear()+")";
		
		
		if ( document.getElementById("archivefbToolbox") && !document.getElementById("archivefbToolbox").hidden )
		{
			var modTitle = document.getElementById("archivefbEditTitle").value;
			if ( titles.indexOf(modTitle) < 0 )
			{
				titles.splice(1, 0, modTitle);
				this.item.title = modTitle;
			}
			this.item.comment = archivefbUtils.escapeComment(archivefbPageEditor.COMMENT.value);
			for ( var i = 0; i < this.frameList.length; i++ ) { archivefbPageEditor.removeAllStyles(this.frameList[i]); }
		}
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(titles, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
		this.contentDir = archivefbUtils.getContentDir(this.item.id);
		this.saveDocumentInternal(aRootWindow.document, this.name);
		if ( this.item.icon && this.item.type != "image" && this.item.type != "file" )
		{
			var iconFileName = this.download(this.item.icon);
			this.favicon = iconFileName;
		}
		if ( this.httpTask[this.item.id] == 0 )
		{
			setTimeout(function(){ archivefbCaptureObserverCallback.onCaptureComplete(archivefbContentSaver.item); }, 100);
		}
		if ( this.option["inDepth"] > 0 && this.linkURLs.length > 0 )
		{
			if ( !aPresetData || aContext == "capture-again" )
			{
				this.item.type = "marked";
				this.option["isPartial"] = aIsPartial;
				window.openDialog(
					"chrome://archivefb/content/capture.xul", "", "chrome,centerscreen,all,dialog=no",
					this.linkURLs, this.refURLObj.spec,
					false, null, 0,
					this.item, this.option, this.file2URL
				);
			}
			else
			{
				for ( var i = 0; i < this.linkURLs.length; i++ )
				{
					archivefbCaptureTask.add(this.linkURLs[i], aPresetData[4] + 1);
				}
			}
		}
		this.addResource(aResName, aResIndex);
			
		return [this.name, this.file2URL];
	},

	captureFile : function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext)
	{
		this.init(aPresetData);
		this.item.title  = archivefbUtils.getFileName(aSourceURL);
		this.item.icon   = "moz-icon://" + this.item.title + "?size=16";
		this.item.source = aSourceURL;
		this.item.type   = aType;
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(null, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
		this.contentDir = archivefbUtils.getContentDir(this.item.id);
		this.refURLObj  = archivefbUtils.convertURLToObject(aReferURL);
		this.saveFileInternal(aSourceURL, this.name, aType);
		this.addResource(aResName, aResIndex);
		return [this.name, this.file2URL];
	},

	showDetailDialog : function(aTitles, aResURI, aContext)
	{
		var ret = {
			item    : this.item,
			option  : this.option,
			titles  : aTitles || [this.item.title],
			resURI  : aResURI,
			result  : 1,
			context : aContext || "capture"
		};
		window.openDialog("chrome://archivefb/content/detail.xul" + (aContext ? "?capture" : ""), "", "chrome,modal,centerscreen,resizable", ret);
		return ret;
	},

	saveDocumentInternal : function(aDocument, aFileKey)
	{
		if ( !aDocument.body || !aDocument.contentType.match(/html|xml/i) )
		{
			var captureType = (aDocument.contentType.substring(0,5) == "image") ? "image" : "file";
			if ( this.frameNumber == 0 ) this.item.type = captureType;
			var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType);
			return newLeafName;
		}
		this.refURLObj = archivefbUtils.convertURLToObject(aDocument.location.href);
		if ( this.selection )
		{
			var myRange = this.selection.getRangeAt(0);
			var myDocFrag = myRange.cloneContents();
			var curNode = myRange.commonAncestorContainer;
			if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;
		}
		var tmpNodeList = [];
		if ( this.selection )
		{
			do {
				tmpNodeList.unshift(curNode.cloneNode(false));
				curNode = curNode.parentNode;
			}
			while ( curNode.nodeName.toUpperCase() != "HTML" );
		}
		else
		{
			tmpNodeList.unshift(aDocument.body.cloneNode(true));
		}
		var rootNode = aDocument.getElementsByTagName("html")[0].cloneNode(false);
		try {
			var headNode = aDocument.getElementsByTagName("head")[0].cloneNode(true);
			rootNode.appendChild(headNode);
			rootNode.appendChild(aDocument.createTextNode("\n"));
		} catch(ex) {
		}
		rootNode.appendChild(tmpNodeList[0]);
		rootNode.appendChild(aDocument.createTextNode("\n"));
		for ( var n = 0; n < tmpNodeList.length-1; n++ )
		{
			tmpNodeList[n].appendChild(aDocument.createTextNode("\n"));
			tmpNodeList[n].appendChild(tmpNodeList[n+1]);
			tmpNodeList[n].appendChild(aDocument.createTextNode("\n"));
		}
		if ( this.selection )
		{
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "DOCUMENT_FRAGMENT");
			tmpNodeList[tmpNodeList.length-1].appendChild(myDocFrag);
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "/DOCUMENT_FRAGMENT");
		}


		this.processDOMRecursively(rootNode);


		var myCSS = "";
		if ( this.option["styles"] )
		{
			var myStyleSheets = aDocument.styleSheets;
			for ( var i=0; i<myStyleSheets.length; i++ )
			{
				myCSS += this.processCSSRecursively(myStyleSheets[i], aDocument);
			}
			if ( myCSS )
			{
				var newLinkNode = aDocument.createElement("link");
				newLinkNode.setAttribute("media", "all");
				newLinkNode.setAttribute("href", aFileKey + ".css");
				newLinkNode.setAttribute("type", "text/css");
				newLinkNode.setAttribute("rel", "stylesheet");
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
				rootNode.firstChild.appendChild(newLinkNode);
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
				myCSS = myCSS.replace(/\*\|/g, "");
			}
		}


		this.item.chars = "UTF-8";
		var metaNode = aDocument.createElement("meta");
		metaNode.setAttribute("content", aDocument.contentType + "; charset=" + this.item.chars);
		metaNode.setAttribute("http-equiv", "Content-Type");
		rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);
		rootNode.firstChild.insertBefore(metaNode, rootNode.firstChild.firstChild);
		rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);


		var myHTML;
		myHTML = this.surroundByTags(rootNode, rootNode.innerHTML);
		myHTML = this.doctypeToString(aDocument.doctype) + myHTML;
		myHTML = myHTML.replace(/\x00/g, " ");
		
		//change all of the absolute section links to relative
		
		//myHTML = myHTML.replace(/http\:\/\/www\.facebook\.com\//gi, "");
		
		
		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
		archivefbUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(aFileKey + ".css");
			archivefbUtils.writeFile(myCSSFile, myCSS, this.item.chars);
		}
		return myHTMLFile.leafName;
	},

	saveFileInternal : function(aFileURL, aFileKey, aCaptureType)
	{
		if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
		if ( !this.refURLObj ) this.refURLObj = archivefbUtils.convertURLToObject(aFileURL);
		if ( this.frameNumber == 0 )
		{
			this.item.icon  = "moz-icon://" + archivefbUtils.getFileName(aFileURL) + "?size=16";
			this.item.type  = aCaptureType;
			this.item.chars = "";
		}
		var newFileName = this.download(aFileURL);
		if ( aCaptureType == "image" ) {
			var myHTML = '<html><body><img src="' + newFileName + '"></body></html>';
		} else {
			var myHTML = '<html><head><meta http-equiv="refresh" content="0;URL=./' + newFileName + '"></head><body></body></html>';
		}
		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
		archivefbUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
		return myHTMLFile.leafName;
	},

	addResource : function(aResName, aResIndex)
	{
		if(archivefbBrowserOverlay.archiveEntryCreated)	return;	//create only one entry per archiving session
		
		if ( !aResName ) return;
		
		var res = archivefbData.addItem(this.item, aResName, aResIndex);
		archivefbUtils.refreshGlobal(false);
		if ( this.favicon )
		{
			var iconURL = "resource://archivefb/data/" + this.item.id + "/" + this.favicon;
			setTimeout(function(){
				archivefbData.setProperty(res, "icon", iconURL);
			}, 500);
			this.item.icon = this.favicon;
		}
		
		archivefbUtils.writeIndexDat(this.item);
		if ( "archivefbBrowserOverlay" in window ) archivefbBrowserOverlay.updateFolderPref(aResName);
		archivefbBrowserOverlay.archiveEntryCreated = true;	//create only one entry per archiving session, sidebar
	},


	surroundByTags : function(aNode, aContent)
	{
		var tag = "<" + aNode.nodeName.toLowerCase();
		for ( var i=0; i<aNode.attributes.length; i++ )
		{
			tag += ' ' + aNode.attributes[i].name + '="' + aNode.attributes[i].value + '"';
		}
		tag += ">\n";
		return tag + aContent + "</" + aNode.nodeName.toLowerCase() + ">\n";
	},

	addCommentTag : function(targetNode, aComment)
	{
		targetNode.appendChild(targetNode.ownerDocument.createTextNode("\n"));
		targetNode.appendChild(targetNode.ownerDocument.createComment(aComment));
		targetNode.appendChild(targetNode.ownerDocument.createTextNode("\n"));
	},

	removeNodeFromParent : function(aNode)
	{
		var newNode = aNode.ownerDocument.createTextNode("");
		aNode.parentNode.replaceChild(newNode, aNode);
		aNode = newNode;
		return aNode;
	},

	doctypeToString : function(aDoctype)
	{
		if ( !aDoctype ) return "";
		var ret = "<!DOCTYPE " + aDoctype.name;
		if ( aDoctype.publicId ) ret += ' PUBLIC "' + aDoctype.publicId + '"';
		if ( aDoctype.systemId ) ret += ' "'        + aDoctype.systemId + '"';
		ret += ">\n";
		return ret;
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
		switch ( aNode.nodeName.toLowerCase() )
		{
			case "img" : 
			case "embed" : 
				if ( this.option["images"] ) {
					if ( aNode.hasAttribute("onclick") ) aNode = this.normalizeJSLink(aNode, "onclick");
					var aFileName = this.download(aNode.src);
					if (aFileName) aNode.setAttribute("src", aFileName);
					aNode.removeAttribute("livesrc");
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "object" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.data);
					if (aFileName) aNode.setAttribute("data", aFileName);
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "body" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.background);
					if (aFileName) aNode.setAttribute("background", aFileName);
				} else {
					aNode.removeAttribute("background");
					aNode.removeAttribute("bgcolor");
					aNode.removeAttribute("text");
				}
				break;
			case "table" : 
			case "tr" : 
			case "th" : 
			case "td" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.getAttribute("background"));
					if (aFileName) aNode.setAttribute("background", aFileName);
				} else {
					aNode.removeAttribute("background");
					aNode.removeAttribute("bgcolor");
				}
				break;
			case "input" : 
				switch (aNode.type.toLowerCase()) {
					case "image": 
						if (this.option["images"]) {
							var aFileName = this.download(aNode.src);
							if (aFileName) aNode.setAttribute("src", aFileName);
						}
						else {
							aNode.removeAttribute("src");
							aNode.setAttribute("type", "button");
							if (aNode.hasAttribute("alt"))
								aNode.setAttribute("value", aNode.getAttribute("alt"));
						}
						break;
					case "text": 
						aNode.setAttribute("value", aNode.value);
						break;
					case "checkbox": 
					case "radio": 
						if (aNode.checked)
							aNode.setAttribute("checked", "checked");
						else
							aNode.removeAttribute("checked");
						break;
					default:
				}
				break;
			case "link" : 
				if ( aNode.rel.toLowerCase() == "stylesheet" && (aNode.href.indexOf("chrome") != 0 || !this.option["styles"]) ) {
					return this.removeNodeFromParent(aNode);
				} else if ( aNode.rel.toLowerCase() == "shortcut icon" || aNode.rel.toLowerCase() == "icon" ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
					if ( this.frameNumber == 0 && !this.favicon ) this.favicon = aFileName;
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;
			case "base" : 
				aNode.removeAttribute("href");
				if ( !aNode.hasAttribute("target") ) return this.removeNodeFromParent(aNode);
				break;
			case "style" : 
				return this.removeNodeFromParent(aNode);
				break;
			case "script" : 
			case "noscript" : 
				if ( this.option["script"] ) {
					if ( aNode.hasAttribute("src") ) {
						var aFileName = this.download(aNode.src);
						if (aFileName) aNode.setAttribute("src", aFileName);
					}
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "a" : 
			case "area" : 
				if ( aNode.hasAttribute("onclick") ) aNode = this.normalizeJSLink(aNode, "onclick");
				if ( !aNode.hasAttribute("href") ) return aNode;
				if ( aNode.target == "_blank" ) aNode.setAttribute("target", "_top");
				if ( aNode.href.match(/^javascript:/i) ) aNode = this.normalizeJSLink(aNode, "href");
				if ( !this.selection && aNode.getAttribute("href").charAt(0) == "#" ) return aNode;
				var ext = archivefbUtils.splitFileName(archivefbUtils.getFileName(aNode.href))[1].toLowerCase();
				var flag = false;
				switch ( ext )
				{
					case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : flag = this.option["dlimg"]; break;
					case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : flag = this.option["dlsnd"]; break;
					case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : flag = this.option["dlmov"]; break;
					case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : flag = this.option["dlarc"]; break;
					default : if ( this.option["inDepth"] > 0 ) this.linkURLs.push(aNode.href);
				}
				if ( !flag && ext && this.option["custom"] )
				{
					if ( (", " + this.option["custom"] + ", ").indexOf(", " + ext + ", ") != -1 ) flag = true;
				}
				if ( aNode.href.indexOf("file://") == 0 && !aNode.href.match(/\.html(?:#.*)?$/) ) flag = true;
				if ( flag ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;
			case "form" : 
				aNode.setAttribute("action", archivefbUtils.resolveURL(this.refURLObj.spec, aNode.action));
				break;
			case "meta" : 
				if ( aNode.hasAttribute("http-equiv") && aNode.hasAttribute("content") &&
				     aNode.getAttribute("http-equiv").toLowerCase() == "content-type" && 
				     aNode.getAttribute("content").match(/charset\=/i) )
				{
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "frame"  : 
			case "iframe" : 
				if ( this.selection ) {
					this.selection = null;
					for ( var fn = this.frameNumber; fn < this.frameList.length; fn++ )
					{
						if ( aNode.src == this.frameList[fn].location.href ) { this.frameNumber = fn; break; }
					}
					this.frameNumber--;
				}
				var tmpRefURL = this.refURLObj;
				this.frameNumber++
				try {
					var newFileName = this.saveDocumentInternal(this.frameList[this.frameNumber].document, this.name + "_" + this.frameNumber);
					aNode.setAttribute("src", newFileName);
				} catch(ex) {
				}
				this.refURLObj = tmpRefURL;
				break;
			case "xmp" : 
				var pre = aNode.ownerDocument.createElement("pre");
				pre.appendChild(aNode.firstChild);
				aNode.parentNode.replaceChild(pre, aNode);
				break;
		}
		if ( !this.option["styles"] )
		{
			aNode.removeAttribute("style");
		}
		else if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, aNode.ownerDocument);
			if ( newCSStext ) aNode.setAttribute("style", newCSStext);
		}
		if ( !this.option["script"] )
		{
			aNode.removeAttribute("onmouseover");
			aNode.removeAttribute("onmouseout");
			aNode.removeAttribute("onload");
		}
		if (aNode.hasAttribute("_base_href")) {
			aNode.removeAttribute("_base_href");
		}
		return aNode;
	},

	processCSSRecursively : function(aCSS, aDocument)
	{
		var content = "";
		if (!aCSS || aCSS.disabled) {
			return "";
		}
		var cssMedia = aCSS.media.mediaText;
		if (cssMedia && cssMedia.indexOf("screen") < 0 && cssMedia.indexOf("all") < 0) {
			return "";
		}
		if (aCSS.href && aCSS.href.indexOf("chrome://") == 0) {
			return "";
		}
		if (aCSS.href)
			content += (content ? "\n" : "") + "/* ::::: " + aCSS.href + " ::::: */\n\n";
		Array.forEach(aCSS.cssRules, function(cssRule) {
			switch (cssRule.type) {
				case Ci.nsIDOMCSSRule.STYLE_RULE: 
					var cssText = this.inspectCSSText(cssRule.cssText, aCSS.href, aDocument);
					if (cssText)
						content += cssText + "\n";
					break;
				case Ci.nsIDOMCSSRule.IMPORT_RULE: 
					content += this.processCSSRecursively(cssRule.styleSheet, aDocument);
					break;
				case Ci.nsIDOMCSSRule.MEDIA_RULE: 
					if (/^@media ([^\{]+) \{/.test(cssRule.cssText)) {
						var media = RegExp.$1;
						if (media.indexOf("screen") < 0 && media.indexOf("all") < 0) {
							break;
						}
					}
					cssRule.cssText.split("\n").forEach(function(cssText) {
						if (cssText.indexOf("@media ") == 0 || cssText == "}") {
							content += cssText + "\n";
						}
						else {
							cssText = cssText.replace(/^\s+|\s+$/g, "");
							cssText = this.inspectCSSText(cssText, aCSS.href, aDocument);
							if (cssText)
								content += "\t" + cssText + "\n";
						}
					}, this);
					break;
				case Ci.nsIDOMCSSRule.FONT_FACE_RULE: 
					cssRule.cssText.split("\n").forEach(function(cssText) {
						if (cssText == "@font-face {" || cssText == "}") {
							content += cssText + "\n";
						}
						else {
							cssText = cssText.replace(/^\s+|\s+$/g, "");
							cssText = this.inspectCSSText(cssText, aCSS.href, aDocument);
							if (cssText)
								content += "\t" + cssText + "\n";
						}
					}, this);
					break;
				default: 
			}
		}, this);
		return content;
	},

	inspectCSSText : function(aCSStext, aCSShref, aDocument)
	{
		if (!aCSShref) {
			aCSShref = this.refURLObj.spec;
		}
		if ( !aCSStext ) return;
		if (this._fxVer35) {
			if (/^([^\{]+)\s+\{/.test(aCSStext)) {
				var selectors = RegExp.$1.trim();
				selectors = selectors.replace(/:[a-z-]+/g, "");
				try {
					if (!aDocument.querySelector(selectors))
						return;
				}
				catch (ex) {
				}
			}
		}
		var re = new RegExp(/ url\(([^\'\)\s]+)\)/);
		var i = 0;
		while ( aCSStext.match(re) )
		{
			if ( ++i > 10 ) break;
			var imgURL  = RegExp.$1;
			if (/^[\'\"]([^\'\"]+)[\'\"]$/.test(imgURL))
				imgURL = RegExp.$1;
			imgURL  = archivefbUtils.resolveURL(aCSShref, imgURL);
			var imgFile = this.option["images"] ? this.download(imgURL) : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7";
			aCSStext = aCSStext.replace(re, " url('" + imgFile + "')");
		}
		aCSStext = aCSStext.replace(/([^\{\}])(\r|\n)/g, "$1\\A");
		re = new RegExp(/ content: \"(.*?)\"; /);
		if ( aCSStext.match(re) )
		{
			var innerQuote = RegExp.$1;
			innerQuote = innerQuote.replace(/\"/g, '\\"');
			innerQuote = innerQuote.replace(/\\\" attr\(([^\)]+)\) \\\"/g, '" attr($1) "');
			aCSStext = aCSStext.replace(re, ' content: "' + innerQuote + '"; ');
		}
		if ( aCSStext.match(/ (quotes|voice-family): \"/) )
		{
			return;
		}
		if ( aCSStext.indexOf(" background: ") >= 0 )
		{
			aCSStext = aCSStext.replace(/ -moz-background-[^:]+: -moz-[^;]+;/g, "");
			aCSStext = aCSStext.replace(/ scroll 0(?:pt|px|%);/g, ";");
		}
		if ( aCSStext.indexOf(" background-position: 0") >= 0 )
		{
			aCSStext = aCSStext.replace(/ background-position: 0(?:pt|px|%);/, " background-position: 0 0;");
		}
		return aCSStext;
	},

	download : function(aURLSpec)
	{
		if ( !aURLSpec ) return;
		if ( aURLSpec.indexOf("://") < 0 )
		{
			aURLSpec = archivefbUtils.resolveURL(this.refURLObj.spec, aURLSpec);
		}
		try {
			var aURL = Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURL);
			aURL.spec = aURLSpec;
		} catch(ex) {
			archivefbUtils.alert("ERROR: Failed to download: " + aURLSpec);
			return;
		}
		var newFileName = aURL.fileName.toLowerCase();
		if ( !newFileName ) newFileName = "untitled";
		newFileName = archivefbUtils.validateFileName(newFileName);
		if ( this.file2URL[newFileName] == undefined )
		{
		}
		else if ( this.file2URL[newFileName] != aURLSpec )
		{
			var seq = 1;
			var fileLR = archivefbUtils.splitFileName(newFileName);
			if ( !fileLR[1] ) fileLR[1] = "dat";
			newFileName = fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1];
			while ( this.file2URL[newFileName] != undefined )
			{
				if ( this.file2URL[newFileName] == aURLSpec )
				{
					return newFileName;
				}
				newFileName = fileLR[0] + "_" + this.leftZeroPad3(++seq) + "." + fileLR[1];
			}
		}
		else
		{
			return newFileName;
		}
		if ( aURL.schemeIs("http") || aURL.schemeIs("https") || aURL.schemeIs("ftp") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
			var refURL = this.refURLObj.schemeIs("http") || this.refURLObj.schemeIs("https") ? this.refURLObj : null;
			try {
				var WBP = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Ci.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.persistFlags |= WBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
				WBP.saveURI(aURL, null, refURL, null, null, targetFile);
				this.httpTask[this.item.id]++;
				WBP.progressListener = new archivefbCaptureObserver(this.item, newFileName);
				this.file2URL[newFileName] = aURLSpec;
				return newFileName;
			}
			catch(ex) {
				dump("*** archivefb_PERSIST_FAILURE: " + aURLSpec + "\n" + ex + "\n");
				this.httpTask[this.item.id]--;
				return "";
			}
		}
		else if ( aURL.schemeIs("file") )
		{
			var targetDir = this.contentDir.clone();
			try {
				var orgFile = archivefbUtils.convertURLToFile(aURLSpec);
				if ( !orgFile.isFile() ) return;
				orgFile.copyTo(targetDir, newFileName);
				this.file2URL[newFileName] = aURLSpec;
				return newFileName;
			}
			catch(ex) {
				dump("*** archivefb_COPY_FAILURE: " + aURLSpec + "\n" + ex + "\n");
				return "";
			}
		}
	},

	leftZeroPad3 : function(num)
	{
		if ( num < 10 ) { return "00" + num; } else if ( num < 100 ) { return "0" + num; } else { return num; }
	},

	normalizeJSLink : function(aNode, aAttr)
	{
		var val = aNode.getAttribute(aAttr);
		if ( !val.match(/\(\'([^\']+)\'/) ) return aNode;
		val = RegExp.$1;
		if ( val.indexOf("/") == -1 && val.indexOf(".") == -1 ) return aNode;
		val = archivefbUtils.resolveURL(this.refURLObj.spec, val);
		if ( aNode.nodeName.toLowerCase() == "img" )
		{
			if ( aNode.parentNode.nodeName.toLowerCase() == "a" ) {
				aNode.parentNode.setAttribute("href", val);
				aNode.removeAttribute("onclick");
			} else {
				val = "window.open('" + val + "');";
				aNode.setAttribute(aAttr, val);
			}
		}
		else
		{
			if ( aNode.hasAttribute("href") && aNode.getAttribute("href").indexOf("http://") != 0 )
			{
				aNode.setAttribute("href", val);
				aNode.removeAttribute("onclick");
			}
		}
		return aNode;
	},

};



function archivefbCaptureObserver(aARCHIVEFBitem, aFileName)
{
	this.item     = aARCHIVEFBitem;
	this.fileName = aFileName;
	this.callback = archivefbCaptureObserverCallback;
}

archivefbCaptureObserver.prototype = {

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Ci.nsIWebProgressListener.STATE_STOP )
		{
			if ( --archivefbContentSaver.httpTask[this.item.id] == 0 ) {
				this.callback.onAllDownloadsComplete(this.item);
			} else {
				this.callback.onDownloadComplete(this.item);
			}
		}
	},
	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress == aMaxTotalProgress ) return;
		var progress = (aMaxSelfProgress > 0) ? Math.round(aCurSelfProgress / aMaxSelfProgress * 100) + "%" : aCurSelfProgress + "Bytes";
		this.callback.onDownloadProgress(this.item, this.fileName, progress);
	},
	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},
};


var archivefbCaptureObserverCallback = {

	getString : function(aBundleName){ return archivefbBrowserOverlay.STRING.getString(aBundleName); },

	trace : function(aText)
	{
		if (document.getElementById("statuarchivefbar-display"))
			document.getElementById("statuarchivefbar-display").label = aText;
	},

	onDownloadComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE") + "... (" + archivefbContentSaver.httpTask[aItem.id] + ") " + aItem.title);
	},

	onAllDownloadsComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE_COMPLETE") + ": " + aItem.title);
		this.onCaptureComplete(aItem);
	},

	onDownloadProgress : function(aItem, aFileName, aProgress)
	{
		this.trace(this.getString("TRANSFER_DATA") + "... (" + aProgress + ") " + aFileName);
	},

	onCaptureComplete : function(aItem)
	{
		if ( aItem && archivefbData.getProperty(archivefbUtils.RDF.GetResource("urn:archivefb:item" + aItem.id), "type") == "marked" ) return;
		if ( archivefbUtils.getPref("notifyOnComplete", true) )
		{
			var icon = aItem.icon ? "resource://archivefb/data/" + aItem.id + "/" + aItem.icon
			         : archivefbUtils.getDefaultIcon();
			var title = "archivefb: " + this.getString("CAPTURE_COMPLETE");
			var text = archivefbUtils.crop(aItem.title, 40);
			var listener = {
				observe: function(subject, topic, data) {
					if (topic == "alertclickcallback")
						archivefbUtils.loadURL("chrome://archivefb/content/view.xul?id=" + data, true);
				}
			};
			var alertsSvc = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
			//alertsSvc.showAlertNotification(icon, title, text, true, aItem.id, listener);
		}
		if ( aItem && aItem.id in archivefbContentSaver.httpTask ) delete archivefbContentSaver.httpTask[aItem.id];
	},

};


