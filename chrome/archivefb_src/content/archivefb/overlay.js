
var archivefbBrowserOverlay = {
	lastLocation: "",
	editMode: false,
	infoMode: false,
	resource: null,
	locateMe: null,

	get STRING() {
		if (!this._stringBundle)
			this._stringBundle = document.getElementById("archivefbOverlayString");
		return this._stringBundle;
	},
	_stringBundle: null,

	webProgressListener: {
		onLocationChange: function(aProgress, aRequest, aURI) {
			archivefbBrowserOverlay.onLocationChange(aURI ? aURI.spec : "about:blank");
		},
		onStateChange      : function(){},
		onProgressChange   : function(){},
		onStatusChange     : function(){},
		onSecurityChange   : function(){},
		onLinkIconAvailable: function(){},
		QueryInterface: function(aIID) {
			if (aIID.equals(Ci.nsIWebProgressListener) ||
			    aIID.equals(Ci.nsISupportsWeakReference) ||
			    aIID.equals(Ci.nsISupports))
				return this;
			throw Components.results.NS_NOINTERFACE;
		},
	},

	init: function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener(
			"popupshowing", this, false
		);
		this.refresh();
		gBrowser.addProgressListener(this.webProgressListener);
		if (archivefbUtils.getPref("ui.contextMenu") && 
		    archivefbUtils.getPref("ui.contextSubMenu")) {
			var callback = function() {
				document.getElementById("archivefbContextSubmenu").hidden = false;
				for (var i = 1; i <= 9; i++) {
					document.getElementById("archivefbContextSubmenu").firstChild.appendChild(
						document.getElementById("archivefbContextMenu" + i)
					);
				}
			};
			window.setTimeout(callback, 1000);
		}
		if (archivefbUtils.getPref("ui.menuBar.icon")) {
			var menu   = document.getElementById("archivefbMenu");
			var button = document.createElement("toolbarbutton");
			var attrs = menu.attributes;
			for (var i = 0; i < attrs.length; i++)
				button.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
			while (menu.hasChildNodes())
				button.appendChild(menu.firstChild);
			button.removeAttribute("label");
			button.setAttribute("type", "menu");
			button.setAttribute("image", "chrome://archivefb/skin/main_16.png");
			var menubar = document.getElementById("main-menubar");
			menubar.appendChild(button);
			menubar.removeChild(menu);
		}
	},

	destroy: function()
	{
		gBrowser.removeProgressListener(this.webProgressListener);
	},

	rebuild: function()
	{
		archivefbMenuHandler.shouldRebuild = true;
	},

	refresh: function()
	{
		this.lastLocation = "";
		this.editMode = archivefbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
		this.infoMode = archivefbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
		document.getElementById("archivefbMenu").hidden        = !archivefbUtils.getPref("ui.menuBar");
		document.getElementById("archivefbStatusPanel").hidden = !archivefbUtils.getPref("ui.statusBar");
		document.getElementById("archivefbToolsMenu").hidden   = !archivefbUtils.getPref("ui.toolsMenu");
		var file = archivefbUtils.getarchivefbDir().clone();
		file.append("folders.txt");
		if (file.exists()) {
			archivefbUtils.setPref("ui.folderList", archivefbUtils.readFile(file));
		}
		else {
			var ids = archivefbUtils.getPref("ui.folderList");
			archivefbUtils.writeFile(file, ids, "UTF-8");
		}
		this.onLocationChange(gBrowser.currentURI.spec);
	},

	getID: function(aURL)
	{
		if (!aURL)
			aURL = gBrowser.currentURI ? gBrowser.currentURI.spec : "";
		var editable = (aURL.indexOf("resource://archivefb/data/") == 0 && aURL.match(/\/data\/(\d{14})\//));
		return editable ? RegExp.$1 : null;
	},

	onLocationChange: function(aURL)
	{
		if (aURL && aURL != (gBrowser.currentURI ? gBrowser.currentURI.spec : ""))
			return;
		if (aURL.indexOf("resource://archivefb/data/") != 0 && aURL == this.lastLocation)
			return;
		var id = this.getID(aURL);
		document.getElementById("archivefbToolbox").hidden = id ? false : true;
		if (id) {
			this.resource = archivefbUtils.RDF.GetResource("urn:archivefb:item" + id);
			if (this.editMode)
				window.setTimeout(function() { archivefbPageEditor.init(id); }, 20);
			else
				window.setTimeout(function() { archivefbPageEditor.showHide(false); }, 0);
			if (this.infoMode)
				window.setTimeout(function() { archivefbInfoViewer.init(id); }, 50);
		}
		this.locateMe = null;
		this.lastLocation = aURL;
	},

	buildPopup: function(aPopup)
	{
		var menuItem;
		menuItem = aPopup.appendChild(document.createElement("menuitem"));
		menuItem.id = "urn:archivefb:root";
		menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
		menuItem.setAttribute("container", "true");
		menuItem.setAttribute("label", this.STRING.getString("ROOT_FOLDER"));
		aPopup.appendChild(document.createElement("menuseparator"));
		var ids = archivefbUtils.getPref("ui.folderList");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = archivefbUtils.getPref("ui.folderList.maxEntries");
		for (var i = 0; i < ids.length && shownItems < maxEntries; i++) {
			if (ids[i].length != 14)
				continue;
			var res = archivefbUtils.RDF.GetResource("urn:archivefb:item" + ids[i]);
			if (!archivefbData.exists(res))
				continue;
			menuItem = aPopup.appendChild(document.createElement("menuitem"));
			menuItem.id = res.Value;
			menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
			menuItem.setAttribute("container", "true");
			menuItem.setAttribute("label", archivefbData.getProperty(res, "title"));
			shownItems++;
		}
		if (shownItems > 0)
			aPopup.appendChild(document.createElement("menuseparator"));
		menuItem = aPopup.appendChild(document.createElement("menuitem"));
		menuItem.id = "archivefbContextPicking";
		menuItem.setAttribute("label", this.STRING.getString("SELECT_FOLDER") + "...");
	},

	destroyPopup: function(aPopup)
	{
		while (aPopup.hasChildNodes())
			aPopup.removeChild(aPopup.lastChild);
	},

	updateFolderPref : function(aResURI)
	{
		if ( aResURI == "urn:archivefb:root" ) return;
		var oldIDs = archivefbUtils.getPref("ui.folderList");
		oldIDs = oldIDs ? oldIDs.split("|") : [];
		var newIDs = [aResURI.substring(18,32)];
		oldIDs.forEach(function(id){ if ( id != newIDs[0] ) newIDs.push(id); });
		newIDs = newIDs.slice(0, archivefbUtils.getPref("ui.folderList.maxEntries")).join("|");
		archivefbUtils.setPref("ui.folderList", newIDs);
		var file = archivefbUtils.getarchivefbDir().clone();
		file.append("folders.txt");
		archivefbUtils.writeFile(file, newIDs, "UTF-8");
	},

	verifyTargetID : function(aTargetID)
	{
		if (aTargetID == "archivefbContextPicking") {
			var ret = {};
			window.openDialog(
				"chrome://archivefb/content/folderPicker.xul", "",
				"modal,chrome,centerscreen,resizable=yes", ret
			);
			return ret.resource ? ret.resource.Value : null;
		}
		if (aTargetID.indexOf("urn:archivefb:") != 0)
			aTargetID = "urn:archivefb:root";
		return aTargetID;
	},

	targetWindow: null,
	optionsSelectedInCaptureDialog : false,
	friendsCollected : false,	//set if one wants to archive other people's FB and click button on main dialog
	friendsAsSelectBox : null, //store the DOM select box here after collection
	unrollWall : function(){//javascript: var o=document.getElementsByTagName('body');o[0].scrollTop=o[0].scrollHeight;
		//animate the status bar icon until the process is complete. At the end of this look, revert the icon to original PNG
		
		this.running = true;
		pagesDone = 0;	
		archivefbBrowserOverlay.setStatus("Unrolling Wall...");
		
		var numberOfUnrolls = arguments[0];
		while(this.running) {				
			var moreLinks = this.targetWindow.document.getElementsByClassName('uiMorePagerPrimary');
			if(moreLinks.length == 0 || numberOfUnrolls < 0){break;}
			pagesDone++;
			
			var link = moreLinks[0];
			var evt = this.targetWindow.document.createEvent("MouseEvents");
			
			evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			link.dispatchEvent(evt);
			
			var randomBetween500And1000 = Math.floor(Math.random()*500)+500;
			this.pause(randomBetween500And1000);	//give time for DOM to react to click before polling to see if link exists
			setTimeout("",0);	//attempt to not get FF to lock up w/ 'script busy' warning
			numberOfUnrolls--;
		}	
	},
	unrollMoreItemsOnWall : function(){
	
	},
	unrollFriendsList: function(){	//also used for photos page
		var htmls = this.targetWindow.document.getElementsByTagName('html');
		var newScrollHeight = 0;
		var oldScrollHeight = htmls[0].scrollHeight;
		while(newScrollHeight != oldScrollHeight){
			oldScrollHeight = htmls[0].scrollHeight;
			htmls[0].scrollTop = htmls[0].scrollHeight;
			
			this.pause(2000);
			newScrollHeight = htmls[0].scrollHeight;
		}	
	},
	secondary : function() {alert("called secondary");},
	getFriendsListAsSelectBox: function(){ //for easy archiving of an individual friend, e.g. fbi use case
		var FRIENDS_PAGE = "http://www.facebook.com/profile.php?sk=friends";
		this.targetWindow = window.content;
		//var statusBarMenuText = this.targetWindow.document.getElementById('ArchiveFBStatusPanelText');
		//statusBarMenuText.setAttribute('label',"Unrolling Friends List...");
		//statusBarMenuText.style.display = "block";
		gBrowser.loadURI(FRIENDS_PAGE, null, null); //load the friends page in the browser
		archivefbBrowserOverlay.pause(4000);		//wait for the friends page to load
		if(document.title.indexOf("Welcome to Facebook") != -1){
				alert("Please log into Facebook prior to using Archiving Facebook");//alert the user only once of their mistake	
				
				archivefbBrowserOverlay.setStatus("");
				archivefbBrowserOverlay.setArchivingModeTo("me");	//revert to original display mode
				return;}	
		
		
		archivefbBrowserOverlay.unrollFriendsList();								//unroll friends list to display all friends a user has
		//fsl fwb fcb
		var friendDivs = this.targetWindow.document.getElementsByClassName('fsl');
		var friends = new Array(friendDivs.length);
		
		//Friend "class" allows a name to be attributed to a URL when archiving someone else's FB pages
		// Parameters:  
		//  nameIn: The name of the friends, a string literal
		//  urlIn: The URL of the root of the friend's profile when normally accessed through the Friends List
		function Friend(nameIn, urlIn){
			this.name = nameIn;		//attribute the name parameter to the object
			this.url = urlIn;		//attribute the url parameter to the object
		}
		
		var select = document.createElementNS("http://www.w3.org/1999/xhtml",'select');				//create an HTML select box to display the names of the friend to be chosen
		select.setAttribute('id','friendsDropDown');select.setAttribute('name','friendsDropDown');	//attribute an id and a name to the select box for accessibility
		
		//create friend object array with scraped data
		for(i=0; i<friendDivs.length; i++){															//poll through the friends as discovered on the unrolled Friends List
			friends[i] = new Friend(friendDivs[i].firstChild.innerHTML,friendDivs[i].firstChild.getAttribute('href'));	//create a new Friend object with the scraped data and add to array of objects
			var option = document.createElementNS("http://www.w3.org/1999/xhtml",'option');			//create an option in the above created HTML select box
			option.setAttribute('id',"friend"+i);													//attribute an id to the option for later referencing
			option.setAttribute('value',friends[i].url);											//attibute the URL that is assigned to the corresponding friend to the OPTION
			option.appendChild(document.createTextNode(friends[i].name));							//Provide a text value to be displayed for this option
			select.appendChild(option);																//attach this OPTION to the end of the list of options for the select box
		}
		
		archivefbBrowserOverlay.friendsCollected = true;											//do not run this laborous process unnecessarily
		return select;																				//return the select box containing options with the friends' names and profile URLs
	},
	createCaptureOptionsDialog: function()
	{
		var UI_div = document.createElementNS("http://www.w3.org/1999/xhtml",'div');
		var UI_div2 = document.createElementNS("http://www.w3.org/1999/xhtml",'div');
		var UI_title = document.createElementNS("http://www.w3.org/1999/xhtml",'h1');
		UI_title.style.backgroundColor = "#3b5999";
		UI_title.style.color = "white";
		UI_title.style.fontWeight = "bold";
		UI_title.style.lineHeight = "2.0em";
		UI_title.style.borderBottom = "1px solid #233f7e";
		UI_title.style.textAlign = "center";
		UI_title.style.display = "block";
		UI_title.style.width = "100%";
		UI_title.setAttribute('id','archiveFBDialogTitle');
		
		var titleText = "Archive Facebook";
		if(archivefbBrowserOverlay.friendsCollected){titleText = "Archive (someone else's) Facebook";}
		
		
		var UI_p = document.createElementNS("http://www.w3.org/1999/xhtml",'p');
		UI_p.style.padding = "1.0em";
		UI_p.style.margin = "0.5em 0 0.5em 0";
		UI_p.style.textAlign = "left";
		UI_p.appendChild(document.createTextNode('What do you want to archive?'));
			
	
		
		//createCheckbox(name,q)
		// Description: 
		//  Creates an LI element containing a checkbox HTML input element and a corresponding label element. Whether the checkbox is enabled and
		//  the label's contents is dependent on the logic within. When a feature isn't completely implemented, this gives a way to disable it.
		// Parameters:
		//  name: a string to be used for the id and name HTML attributes of the created elements. Inherently follows rules of id attribute per W3C
		//  q: the string to be used for the label's contents. Not limited by HTML id restrictions (i.e. can contain spaces and special chars)
		
		function createCheckbox(name,q){
			var UI_li = document.createElementNS("http://www.w3.org/1999/xhtml",'li');				//create the DOM element to attach each above created UI element
			
			var UI_checkbox = document.createElementNS("http://www.w3.org/1999/xhtml",'input'); 	//create the html for the checkbox input tag
				UI_checkbox.setAttribute('type',"checkbox");										//declare the input tag's type as a checkbox
				UI_checkbox.setAttribute('id',name);												//create an absolute identifier for this checkbox based on param
				//UI_checkbox.setAttribute('checked','checked');
				UI_checkbox.setAttribute('name',name);												//for the sake of redundancy and future use, also provide name attr
				UI_checkbox.style.height = "1.0em";													
			var UI_label = document.createElementNS("http://www.w3.org/1999/xhtml",'label'); 		//create label for above created checbox
				UI_label.setAttribute('for',name); 													//attribute the label to the input element
				UI_label.setAttribute('id',name+"_label");											//provide means to absolutely reference label
				UI_label.appendChild(document.createTextNode(q));									//provide the label tag contents to displayed based on param
				
				//disable Groups and Messages/Discussions until stable
				if(q=="Groups" || q=="Messages/Discussions" || (archivefbBrowserOverlay.friendsCollected && (q=="Messages/Discussions" || q=="Events"))){
					var notImplemented = document.createElementNS("http://www.w3.org/1999/xhtml","i");					//italicize message in label that speaks of not being implemented
					if(archivefbBrowserOverlay.friendsCollected && (q=="Messages/Discussions" || q=="Events")){			//can't archive someone else's messages
						//notImplemented.appendChild(document.createTextNode(" (not applicable)"));
					}else { 
						notImplemented.appendChild(document.createTextNode(" (temporarily disabled)"));						//italicized message
						UI_li.style.display = "none";
					}
					UI_label.appendChild(notImplemented);																//attach the italicized message to the label
					UI_checkbox.setAttribute('disabled','disabled');													//tell the UI to not allow the checkbox to be enabled
					//UI_checkbox.setAttribute('checked','');	//feature disabled, uncheck the box
				}else if(name=="archiveWall_infiniteUnrolls"){}//do not check infinite unrolls for wall
				else if(name=="checkbox_photos"){
					UI_checkbox.setAttribute('disabled','disabled');	
					UI_checkbox.removeAttribute('checked');
				}
				else {
					UI_checkbox.setAttribute('checked','checked');														//At current state of project, assume all other checkboxes/features are allowed
				}
				UI_label.style.height = "1.0em";  																		//set display style of label
				UI_label.style.marginLeft = "0.5em";																	//set display style of label
			
			UI_li.appendChild(UI_checkbox); UI_li.appendChild(UI_label);												//attach the checkbox and label to LI container
			return UI_li;   																							//return the LI to be attached by caller
		}

		var UI_ul = document.createElementNS("http://www.w3.org/1999/xhtml",'ul');
		UI_ul.style.listStyleType = "none";
		UI_ul.style.textAlign = "left";
		var archiveProfileWallLI = createCheckbox('checkbox_profile',"Profile Wall");
		//enable/disable unrolling options list
		archiveProfileWallLI.onclick = function(){
			var w = archivefbUtils.getFocusedWindow();
			var archiveProfileCheckbox = w.document.getElementById('checkbox_profile');
			if(archiveProfileCheckbox.value){
				//enable unrolling options list
				w.document.getElementById('archiveWall_iUnrolls').removeAttribute('disabled');
				w.document.getElementById('archiveWall_infiniteUnrolls').removeAttribute('disabled');
			}else {
				//disable unrolling options list
				w.document.getElementById('archiveWall_iUnrolls').disabled = "disabled";
				w.document.getElementById('archiveWall_infiniteUnrolls').disabled = "disabled";
				
			}
		}
		
		
		//extra options for unrolling wall
		var archiveWallOptions = document.createElementNS("http://www.w3.org/1999/xhtml",'ul');  //container for extra options, as list
		archiveWallOptions.style.paddingLeft = "1.0em";
		archiveWallOptions.style.listStyleType = "none";
		
		var iUnrolls = createCheckbox('archiveWall_iUnrolls',"Limit Number of Unrolls to: "); //extra option for wall unrolling as a sublist
		var infiniteUnrolls = createCheckbox('archiveWall_infiniteUnrolls',"Unroll Until End");//extra option to allow unroll-until-finished
		
		var numberOfUnrolls = document.createElementNS("http://www.w3.org/1999/xhtml",'input'); //allow specification for number of unrolls
		numberOfUnrolls.setAttribute('id','numberOfUnrolls');numberOfUnrolls.setAttribute('value',"2"); //set validation on this value 
		
		
		iUnrolls.appendChild(numberOfUnrolls);
		
		
		
		
		//group the radios
		infiniteUnrolls.firstChild.setAttribute('name',"unrollN");
		iUnrolls.firstChild.setAttribute('name','unrollN');
		
		//make inputs for wall options radios instead of checkboxes
		infiniteUnrolls.firstChild.setAttribute('type',"radio");iUnrolls.firstChild.setAttribute('type',"radio");
		
		
		archiveWallOptions.appendChild(iUnrolls); archiveWallOptions.appendChild(infiniteUnrolls);
		archiveProfileWallLI.appendChild(archiveWallOptions);
		
		UI_ul.appendChild(archiveProfileWallLI);
		UI_ul.appendChild(createCheckbox('checkbox_friends',"Friends"));
		UI_ul.appendChild(createCheckbox('checkbox_photos',"Photos (currently broken)"));
		UI_ul.appendChild(createCheckbox('checkbox_messages',"Messages/Discussions"));
		UI_ul.appendChild(createCheckbox('checkbox_notes',"Notes"));
		UI_ul.appendChild(createCheckbox('checkbox_events',"Events"));
		UI_ul.appendChild(createCheckbox('checkbox_groups',"Groups"));
		UI_ul.style.paddingLeft = "1.0em";

		var UI_button = document.createElementNS("http://www.w3.org/1999/xhtml",'button');
		UI_button.style.marginRight = "1.0em";
		UI_button.appendChild(document.createTextNode('Begin Archiving...'));
		UI_button.align = "right";
		//document.archivefbMainUI.createFolderWithName('foo');
		UI_button.onclick = function(){
			var w = archivefbUtils.getFocusedWindow();
			var dialog = w.document.getElementById('captureOptionsDialog');
			this.innerHTML = "";	//set the checkboxes values to the button's innerhtml for later fetching
			
			this.appendChild(document.createTextNode(
				w.document.getElementById('checkbox_profile').checked + " "+
				w.document.getElementById('checkbox_photos').checked + " "+
				w.document.getElementById('checkbox_messages').checked + " "+
				w.document.getElementById('checkbox_notes').checked + " "+
				w.document.getElementById('checkbox_events').checked + " "+
				w.document.getElementById('checkbox_groups').checked));
			this.parentNode.style.display = "none";
			
			//* create folder for session
			//archivefbMainUI.createFolderWithName('foo');
			//return;
			
			var archiveProfile = w.document.getElementById('checkbox_profile').checked;
			var archiveFriends = w.document.getElementById('checkbox_friends').checked;
			var archivePhotos = w.document.getElementById('checkbox_photos').checked;
			var archiveMessages = w.document.getElementById('checkbox_messages').checked;
			var archiveNotes = w.document.getElementById('checkbox_notes').checked;
			var archiveEvents = w.document.getElementById('checkbox_events').checked;
			var archiveGroups = w.document.getElementById('checkbox_groups').checked;
			var unrollITimesLimit = w.document.getElementById('archiveWall_iUnrolls').checked;
			
			var discussionsURL;
			if(w.document.getElementById('profile_tabs') != null){
				var discussionsTabLink = w.document.getElementById('profile_tabs').childNodes;
				var urlStr = new Array();
				
				for(u=0; u<discussionsTabLink.length; u++){
					urlStr[u] = discussionsTabLink[u].childNodes[0].href;
					if(urlStr[u] == null){continue;}
					if(urlStr[u].indexOf("v=app_")!=-1){//this is the discussions section link for a fan page
						discussionsURL=urlStr[u];
					}
				}
			}
			
			
			var numberOfTimesToUnroll = 9999999999;
			if(unrollITimesLimit){numberOfTimesToUnroll = w.document.getElementById('numberOfUnrolls').value;}
		
			
			archivefbBrowserOverlay.idArray = new Array();
			archivefbBrowserOverlay.archiveEntryCreated = false;
			
			document.getElementById('archivefbStatusPanel').setAttribute('src',"chrome://archivefb/skin/main_animated.gif");
			var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');
			statusBarMenuText.style.display = "block";
			
			
			var baseURL = "http://www.facebook.com/profile.php?"; //this is modified is a different user is archived
			var nameOfUser = "My";	//e.g. 'My' Wall. If set later, 'John Smith's' Wall
			var dd = window.content.document.getElementById('friendsDropDown');
			
			var archiveOthersURL = window.document.getElementById('aw_someone');
			
			/*
			
			//TODO check if a user is logged in
			//This code might be causing the issue with Dr. Weigle's account. Temporarily disabled for testing.
			
			if(dd != null){
				baseURL = dd.value; //archive someone else's FB
				if(baseURL.indexOf("id=") != -1){baseURL += "&";} //for user's whose profile still use id=#####, replace the 
				else if(baseURL.indexOf("?") == -1){baseURL += "?";}	//add query ? if does not contain one
				var optionId =  window.content.document.getElementById('friendsDropDown').id;
				nameOfUser = window.content.document.getElementById('friend'+dd.selectedIndex).innerHTML+"'s";
				}
			*/	
			if(dd != null){
				baseURL = dd.value+"&";
				nameOfUser = "";
			}
			
			
			
			
			archivefbBrowserOverlay.running = true;
			if(archiveProfile){								
				archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=wall",nameOfUser,numberOfTimesToUnroll);
				if(archivefbBrowserOverlay.loggedIn){
					archivefbBrowserOverlay.setStatus("Archiving Info Section");
					archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=info",nameOfUser);			
				}
			}
			
			if(!archivefbBrowserOverlay.loggedIn){
				Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService).showAlertNotification(archivefbUtils.getDefaultIcon(), "Archiving Failed", "Please Login To Facebook Prior to Archiving");
				archivefbBrowserOverlay.setStatus("");
				return;}	//failure set by compoundExecCapture
			
			if(archiveFriends){
				archivefbBrowserOverlay.setStatus("Archiving Friends Section");
				archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=friends",nameOfUser);
			}
			if(archivePhotos){
				archivefbBrowserOverlay.setStatus("Archiving Photos Section");
				var userIdNo;
				if(archiveOthersURL == null){	//we don't want albums on a fan page

					//userIdNo = 
					archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=photos",nameOfUser);

					//use the user id number acquired from fetching the photos page to get the subsequent albums page
					//archivefbBrowserOverlay.compoundExecCapture("http://www.facebook.com/photos.php?id="+userIdNo,nameOfUser);
					//alert(userIdNo);
					//archivefbBrowserOverlay.compoundExecCapture("http://www.facebook.com/media/albums/?id="+userIdNo,nameOfUser);
					//archivefbBrowserOverlay.compoundExecCapture("http://www.facebook.com/media/albums/?id="+userIdNo,nameOfUser);
					//http://www.facebook.com/photos.php?id=#######	
					//http://www.facebook.com/media/albums/?id=2004483
					//alert("There were "+archivefbBrowserOverlay.photoAlbums.length+" photo albums");

					//disabled this because it is redundant
					/*for(var album = 0; album<archivefbBrowserOverlay.photoAlbums.length; album++){
						archivefbBrowserOverlay.compoundExecCapture(archivefbBrowserOverlay.photoAlbums[album].url,nameOfUser);
					}*/
				}else{
					alert('2');
					var gid = baseURL.match(/gid=[0-9]+/gi);
					var gid2 = gid[0]; var gid3 = gid2.substr(4);
					
					var allFanPageImagesURL = "http://www.facebook.com/photo_search.php?oid="+gid3+"&view=all";

					//http://www.facebook.com/photo_search.php?oid=2305046635&view=all
					userIdNo = archivefbBrowserOverlay.compoundExecCapture(allFanPageImagesURL,nameOfUser,"others");
					//userIdNo = archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=photos",nameOfUser,"others");

				}
				
				
			}
			if(archiveMessages){
				if(discussionsURL == null){	//normal facebook e-mail system messages
					for(var page=1; page<=2; page++){
						archivefbBrowserOverlay.setStatus("Archiving Messages Page "+page+"/2");
						archivefbBrowserOverlay.compoundExecCapture("http://www.facebook.com/?sk=messages&page="+page,nameOfUser);
					}
				}else { //e.g. fan/group page
					archivefbBrowserOverlay.compoundExecCapture(discussionsURL,nameOfUser);
				}
			}
			if(archiveNotes){
				archivefbBrowserOverlay.setStatus("Archiving Notes Section");
				archivefbBrowserOverlay.compoundExecCapture(baseURL+"sk=notes",nameOfUser);
			}
			if(archiveEvents){
				archivefbBrowserOverlay.setStatus("Archiving Events");
				archivefbBrowserOverlay.compoundExecCapture("http://www.facebook.com/?sk=events",nameOfUser);
			}
			if(archiveGroups){archivefbBrowserOverlay.setStatus("Archiving Groups Section");}
			
			archivefbBrowserOverlay.setStatus("Changing Absolute Links to Relative");
			archivefbContentSaver.changeLinksToRelative();
			archivefbBrowserOverlay.setStatus(""); //reset status
			statusBarMenuText.style.display = "none";
			archivefbBrowserOverlay.friendsCollected = false;	//hide the friends drop down if in fbi mode for subsequent archiving
			
			document.getElementById('archivefbStatusPanel').setAttribute('src',"chrome://archivefb/skin/main.png");
			var alertsSvc = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
			
			archivefbBrowserOverlay.firstPass = true;
			archivefbBrowserOverlay.running = false;
			archivefbBrowserOverlay.archiveEntryCreated = false; //relieve the variable so another archiving session can take place
			alertsSvc.showAlertNotification(archivefbUtils.getDefaultIcon(), "Archiving Complete", "All of your selections have been archived");
			
		};
		
		
		if(!archivefbBrowserOverlay.friendsCollected){
			var button = document.createElementNS("http://www.w3.org/1999/xhtml",'button');
			button.setAttribute('id','collectFriendsListButton');
			button.style.display = "none";
			button.align = "left";
			button.appendChild(document.createTextNode('Collect Friends List'));
			button.onclick = archivefbBrowserOverlay.collectFriendsListForDialog;		
			UI_title.appendChild(document.createTextNode(titleText));
			UI_div2.appendChild(UI_title);
			UI_div2.appendChild(button);
		}else {
			archivefbBrowserOverlay.friendsAsSelectBox.align = "left";
			//var labelForFriendsList = document.createElementNS("http://www.w3.org/1999/xhtml",'label');
			//labelForFriendsList.setAttribute('for','friendsDropDown'); 
			//labelForFriendsList.appendChild(document.createTextNode('Friend To Archive: '));
			//labelForFriendsList.style.float = "left";
			archivefbBrowserOverlay.friendsAsSelectBox.style.backgroundColor = "transparent";
			archivefbBrowserOverlay.friendsAsSelectBox.style.color = "white";
			archivefbBrowserOverlay.friendsAsSelectBox.style.fontWeight = "bold";
			archivefbBrowserOverlay.friendsAsSelectBox.style.fontSize = "1.0em";
			archivefbBrowserOverlay.friendsAsSelectBox.style.textAlign = "right";
			archivefbBrowserOverlay.friendsAsSelectBox.style.border = "0";
			//archivefbBrowserOverlay.friendsAsSelectBox.style.width = "1px";
			
			//TODO: Add the regular ol' title here anyway and only hide it when archiving someone else's FB, don't NOT create the original title
			
			UI_title.appendChild(document.createTextNode("Archive "));
			UI_title.appendChild(archivefbBrowserOverlay.friendsAsSelectBox);
			UI_title.appendChild(document.createTextNode("'s Facebook"));
			UI_div2.appendChild(UI_title);
			//UI_div2.appendChild(labelForFriendsList);
			
			//UI_div2.appendChild(archivefbBrowserOverlay.friendsAsSelectBox);
		}
		//UI_div2.appendChild(this.getFriendsListAsSelectBox());
	
		var archiveWho = document.createElementNS("http://www.w3.org/1999/xhtml",'li');
		archiveWho.style.listStyleType = "none";
		archiveWho.style.textAlign = "left";
		archiveWho.style.backgroundColor = "#3b5999";
		archiveWho.style.color = "white";
		archiveWho.style.fontWeight = "bold";
		archiveWho.style.lineHeight = "2.0em";
		archiveWho.style.display = "block";
		archiveWho.style.width = "100%";
		archiveWho.style.borderTop = "1px solid #233f7e";
		archiveWho.style.borderBottom = "1px solid #233f7e";
		
		var aw_me = document.createElementNS("http://www.w3.org/1999/xhtml",'li');	
		aw_me.setAttribute('id','aw_me');
		aw_me.style.borderBottom = "1px solid white";
		aw_me.style.textAlign = "center";
		aw_me.style.display = "inline";
		aw_me.style.clear = "right";
		aw_me.style.margin = "0";
		aw_me.style.padding = "0.5em 1.5em 0.5em 1.5em";
		aw_me.style.width = "33%";
		aw_me.style.float = "left";		
		aw_me.appendChild(document.createTextNode("My Profile"));
		
		
		var aw_someone = document.createElementNS("http://www.w3.org/1999/xhtml",'li');
		aw_someone.setAttribute('id','aw_someone');
		aw_someone.style.borderBottom = "1px solid white";
		aw_someone.style.textAlign = "center";
		aw_someone.style.display = "inline";
		aw_someone.style.clear = "right";
		aw_someone.style.margin = "0";
		aw_someone.style.padding = "0.5em 1.5em 0.5em 1.5em";
		aw_someone.style.width = "33%";
		aw_someone.style.float = "left";	
		
		aw_someone.appendChild(document.createTextNode("Someone Else's Profile"));
		
		
		var aw_other = document.createElementNS("http://www.w3.org/1999/xhtml",'li');
		aw_other.setAttribute('id','aw_other');
		aw_other.style.borderBottom = "1px solid white";
		aw_other.style.textAlign = "center";
		aw_other.style.display = "none"; //was inline
		aw_other.style.clear = "right";
		aw_other.style.margin = "0";
		aw_other.style.padding = "0.5em 1.5em 0.5em 1.5em";
		aw_other.style.width = "33%";
		aw_other.style.float = "left";	
		aw_other.setAttribute('class','notClicked');
		aw_other.appendChild(document.createTextNode("Something else..."));	
		
		
		aw_me.onmouseover = function(){this.style.textDecoration = "underline";this.style.cursor = "pointer";};
		aw_me.onmouseout =  function(){this.style.textDecoration = "none";this.style.cursor = "default";};
		aw_someone.onmouseover = function(){this.style.textDecoration = "underline";this.style.cursor = "pointer";};
		aw_someone.onmouseout =  function(){this.style.textDecoration = "none";this.style.cursor = "default";};
		aw_other.onmouseover = function(){this.style.textDecoration = "underline";this.style.cursor = "pointer";};
		aw_other.onmouseout =  function(){this.style.textDecoration = "none";this.style.cursor = "default";};
		
		aw_me.onclick = function(){
			archivefbBrowserOverlay.setArchivingModeTo("me");
		};
		aw_someone.onclick = archivefbBrowserOverlay.collectFriendsListForDialog;
		aw_other.onclick = function(){
			archivefbBrowserOverlay.setArchivingModeTo("other");
			
			if(this.getAttribute('class') == "clicked"){return;}
			this.setAttribute('class','clicked');	//prevents below from exec'ing multiple times
			
			
			var x = window.content.document.getElementById('captureOptionsDialog2');
			var somethingElseLabel = document.createElementNS("http://www.w3.org/1999/xhtml",'label');
			var somethingElseTextBox = document.createElementNS("http://www.w3.org/1999/xhtml",'input');
			 somethingElseLabel.appendChild(document.createTextNode("URL: "));
			 somethingElseLabel.style.textAlign = "left";
			 somethingElseLabel.style.display = "block";
			 somethingElseLabel.style.float = "left";
			 somethingElseLabel.style.marginLeft = "1.0em";
			 somethingElseLabel.setAttribute('id','somethingElseTextBox_label');
			 
			 somethingElseTextBox.setAttribute('id','somethingElseTextBox');
			 somethingElseTextBox.setAttribute('value',window.content.document.URL);
			 somethingElseTextBox.style.textAlign = "left";
			 somethingElseTextBox.style.display = "block";
			 somethingElseTextBox.style.float = "left";
			 somethingElseTextBox.style.marginLeft = "1.0em";
			 somethingElseTextBox.style.width = "80%";
			x.appendChild(somethingElseLabel);
			x.appendChild(somethingElseTextBox);
		};
		
		archiveWho.appendChild(aw_me);
		archiveWho.appendChild(aw_someone);
		archiveWho.appendChild(aw_other);
		
		

		//this should prob go in a css file and instead attribute a class
		UI_div2.style.width = "50%";
		UI_div2.style.border = "1px solid #3b5999";
		UI_div2.style.margin = "0 auto";
		UI_div2.style.boxShadow = "0 0 5px black";
		UI_div2.style.MozBoxShadow = "0 0 5px black";
		UI_div2.style.backgroundColor = "white";
		UI_div2.style.textAlign = "right"
		UI_div2.style.borderRadius = "5px";
		UI_div2.style.MozBorderRadius = "5px";
		UI_div2.style.padding = "0 0 1.0em 0";
		UI_div2.setAttribute('id','captureOptionsDialog2');
		UI_div2.appendChild(UI_p);
		UI_div2.appendChild(UI_ul);
		UI_div2.appendChild(UI_button);
		UI_div2.appendChild(archiveWho);	//options on who to archive: yourself, friend, other
		UI_div.appendChild(UI_div2);


		this.targetWindow = window.content;
		var bodyTag = this.targetWindow.document.getElementsByTagName('body');
		UI_div.style.display = "block"; UI_div.style.position = "fixed";
		UI_div.style.top = "50px";
		UI_div.style.margin = "0 auto";
		UI_div.style.zIndex = "99999";
		UI_div.style.textAlign = "center";
		UI_div.style.height = "auto";
		UI_div.setAttribute('id','captureOptionsDialog');

		UI_div.style.width = "100%"; UI_div.style.left = "0"; UI_div.style.backgroundColor = "transparent";
						
		bodyTag[0].insertBefore(UI_div,bodyTag[0].firstChild);
		
		if(archivefbBrowserOverlay.friendsCollected){archivefbBrowserOverlay.setArchivingModeTo("someone");}
		else {archivefbBrowserOverlay.setArchivingModeTo("me");}
		
		
	},
	
	setArchivingModeTo: function(newMode){ //valid modes: {my, someone,other}
		var c_pr = window.content.document.getElementById('checkbox_profile'); 	var l_pr = window.content.document.getElementById('checkbox_profile_label');
		var c_f = window.content.document.getElementById('checkbox_friends');	var l_f = window.content.document.getElementById('checkbox_friends_label');
		var c_ph = window.content.document.getElementById('checkbox_photos');	var l_ph = window.content.document.getElementById('checkbox_photos_label');
		var c_m = window.content.document.getElementById('checkbox_messages');	var l_m = window.content.document.getElementById('checkbox_messages_label');
		var c_n = window.content.document.getElementById('checkbox_notes');		var l_n = window.content.document.getElementById('checkbox_notes_label');
		var c_e = window.content.document.getElementById('checkbox_events');	var l_e = window.content.document.getElementById('checkbox_events_label');
		
		var tab_me = 		window.content.document.getElementById('aw_me');
		var tab_someone = 	window.content.document.getElementById('aw_someone');
		var tab_other = 	window.content.document.getElementById('aw_other');
		
		var tab_me, tab_someone, tab_other, archiveWhoEnabled;
		archiveWhoEnabled = !(window.content.document.getElementById('aw_me') == null);
		if(archiveWhoEnabled){
			tab_me = 		window.content.document.getElementById('aw_me');
			tab_someone = 	window.content.document.getElementById('aw_someone');
			tab_other = 	window.content.document.getElementById('aw_other');
		}
		
		
		var l_t = window.content.document.getElementById('somethingElseTextBox');
		var l_se = window.content.document.getElementById('somethingElseTextBox_label');
		var se_parent;
		if(l_t != null){se_parent = window.content.document.getElementById('somethingElseTextBox_label').parentNode;}
		
		if(archiveWhoEnabled){
			//style the archive who tabs
			tab_me.style.backgroundRepeat = "no-repeat"; 
			tab_someone.style.backgroundRepeat = "no-repeat"; 
			tab_other.style.backgroundRepeat = "no-repeat"; 
			
			tab_me.style.backgroundPosition = "0px 3px";
			tab_someone.style.backgroundPosition = "0px 3px";
			tab_other.style.backgroundPosition = "0px 3px";		
		}
		
		var bgImage = "url(chrome://archivefb/skin/arrow.png)";
		if(newMode == "my" || newMode == "me"){
			c_pr.removeAttribute('disabled');		c_pr.setAttribute('checked','checked');	
			c_f.removeAttribute('disabled');		c_f.setAttribute('checked','checked');
			//c_ph.setAttribute('disabled','disabled');		c_ph.removeAttribute('checked');	//disable photos
			c_ph.removeAttribute('disabled');		c_ph.setAttribute('checked','checked');		//enable photos
			c_m.setAttribute('disabled','disabled');c_m.removeAttribute('checked'); //until message pagination and relative/absolute linking is fixed, disable it
			c_n.removeAttribute('disabled');		c_n.setAttribute('checked','checked');
			c_e.removeAttribute('disabled');		c_e.setAttribute('checked','checked');
			
			if(archiveWhoEnabled){
				tab_me.style.textTransform = "uppercase";	tab_someone.style.textTransform = "none";	tab_other.style.textTransform = "none";
				tab_me.style.backgroundImage = bgImage;		tab_someone.style.backgroundImage = "none";	tab_other.style.backgroundImage = "none";
				tab_other.setAttribute('class','notClicked');
			}
			if(l_t != null){se_parent.removeChild(l_se);se_parent.removeChild(l_t);}
		}
		else if(newMode == "someone"){
			c_pr.removeAttribute('disabled');		c_pr.setAttribute('checked','checked');	
			c_f.removeAttribute('disabled');		c_f.setAttribute('checked','checked');
			//c_ph.setAttribute('disabled','disabled');		c_ph.removeAttribute('checked');
			c_ph.removeAttribute('disabled');		c_ph.setAttribute('checked','checked');
			
			c_m.setAttribute('disabled','disabled');c_m.removeAttribute('checked');
			c_n.removeAttribute('disabled');		c_n.setAttribute('checked','checked');
			c_e.setAttribute('disabled','disabled');c_e.removeAttribute('checked');
			
			if(archiveWhoEnabled){
				tab_me.style.textTransform = "none";		tab_someone.style.textTransform = "uppercase";	tab_other.style.textTransform = "none";
				tab_me.style.backgroundImage = "none";		tab_someone.style.backgroundImage = bgImage;	tab_other.style.backgroundImage = "none";
				tab_other.setAttribute('class','notClicked');
			}
			if(l_t != null){se_parent.removeChild(l_se);se_parent.removeChild(l_t);}
		}
		else if(newMode == "other"){
			c_pr.removeAttribute('disabled');			c_pr.setAttribute('checked','checked');	
			c_f.setAttribute('disabled','disabled');	c_f.removeAttribute('checked');
			c_ph.setAttribute('disabled','disabled');		c_ph.removeAttribute('checked');
			c_m.removeAttribute('disabled');			c_m.setAttribute('checked','checked');
			c_n.setAttribute('disabled','disabled');	c_n.removeAttribute('checked');
			c_e.setAttribute('disabled','disabled');	c_e.removeAttribute('checked');
			
			if(archiveWhoEnabled){
				tab_me.style.textTransform = "none";		tab_someone.style.textTransform = "none";		tab_other.style.textTransform = "uppercase";
				tab_me.style.backgroundImage = "none";		tab_someone.style.backgroundImage = "none";		tab_other.style.backgroundImage = bgImage;
			}
		}
	},

	collectFriendsListForDialog : function(){
		archivefbBrowserOverlay.setArchivingModeTo("someone");	//set dialog tab
		
		if(archivefbBrowserOverlay.friendsCollected){return;}	//we've already done this procedure once
		document.getElementById('archivefbStatusPanel').setAttribute('src',"chrome://archivefb/skin/main_animated.gif");
		var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');
		statusBarMenuText.style.display = "block";
		statusBarMenuText.setAttribute('label',"Unrolling Friends List...");
		archivefbBrowserOverlay.friendsAsSelectBox = archivefbBrowserOverlay.getFriendsListAsSelectBox();
		archivefbBrowserOverlay.createCaptureOptionsDialog();
		statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText'); //must refetch, dom has changed
		statusBarMenuText.setAttribute('label',"");
		statusBarMenuText.style.display = "none";
		document.getElementById('archivefbStatusPanel').setAttribute('src',"chrome://archivefb/skin/main.png");
		archivefbBrowserOverlay.setArchivingModeTo("someone");
	},
	
	loggedIn : true,	//assures that the user is logged in before we start to archive
	compoundExecCapture : function(urlIn,nameOfUser,moreURLs){
		gBrowser.loadURI(urlIn, null, null);
		
		archivefbBrowserOverlay.pause(4000);
		//this.targetWindow.document.onkeypress = function(){alert('stop');};
		var userIdNumber = 0;
		
		
		var moreURLsToCapture = new Array(); //use this to capture URLs obtained from a captured page
		if(moreURLs != null){moreURLsToCapture = moreURLs;}
		
		var moreURLsToRecursivelyCapture = new Array();	//perform this same function again, used for multi-page photo album for fan/group page
		if(document.title.indexOf("Welcome to Facebook") != -1 || document.title.indexOf("Log In") != -1){
			if(archivefbBrowserOverlay.loggedIn){
				alert("Please log into Facebook prior to using Archiving Facebook");	//alert the user only once of their mistake								
			}
			archivefbBrowserOverlay.loggedIn = false;
			return;
		}else {
			archivefbBrowserOverlay.loggedIn = true;	//need to re-set this value in the case of a user tried to archive w/o logged in, logged in, then archived again
		}
		
		
		/* *********************************
			PRE-PROCESS PAGE
		********************************* */
		if(urlIn.indexOf("sk=friends") != -1){
			var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');
			statusBarMenuText.setAttribute('label',"Unrolling Friends List...");	
			archivefbBrowserOverlay.unrollFriendsList();}	//expand friends page until all content is shown
		else if(urlIn.indexOf("sk=wall") != -1){
			if(archivefbBrowserOverlay.firstPass){	//only show the warning on the first pass
				archivefbBrowserOverlay.firstPass = false;
				var r=confirm('Archive Facebook will now expand your activity stream.  This could take a while depending on the amount of entries in your stream.');
				if (r==true) {document.getElementById('ArchiveFBStatusPanelText').setAttribute('label',"Unrolling Wall...");archivefbBrowserOverlay.unrollWall(arguments[2]);}
			}else {r=true;}
		}else if(urlIn.indexOf("sk=photos") != -1 || urlIn.indexOf("photo_search.php") != -1 || urlIn.indexOf("v=photos") != -1){			
			var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');
			statusBarMenuText.setAttribute('label',"Forcing Images To Display...");
			archivefbBrowserOverlay.unrollFriendsList();	//scrolls down the page until all of the content is loaded
			statusBarMenuText.setAttribute('label',"Waiting For Photos To Load...");	//facebook uses page location aware image loading, wait a small amount of time for all content to be displayed
			this.pause(2000);		//this is bad, should check the DOM for readiness instead
			
			
			//try to capture the user's id from the 'show all photos' link, 9/21/11 update for redesign
			//if(this.targetWindow.document.getElementById('navAccountInfo') != null){
			if(this.targetWindow.document.getElementsByClassName('item') != null){

				var href = this.targetWindow.document.getElementsByClassName('item');
				//userIdNumber = this.targetWindow.document.getElementById('navAccountInfo').firstChild.getAttribute('href').substr(39);	
				if(href[0] == undefined){alert("The user's id could not be extracted. :(");return;}	//TODO: this is not the solution but works
				var uri = href[0].href;
				var id = uri.match(/id=([0-9]+)/);
				//userIdNumber = href[0].firstChild.href.substr(39);
				
				//var photosNavHTMLRaw = this.targetWindow.document.getElementById('pagelet_photo_albums');
				if(this.targetWindow.document.getElementsByClassName('photoText').length > 0){
					var albumTitleLinks = this.targetWindow.document.getElementsByClassName('photoText');
					for(var link in albumTitleLinks){
						moreURLsToCapture.push(albumTitleLinks[link].firstChild.href);
					}
				}
			}
			
			/*if(arguments[2]!= null){   //only groups/fan pages , collect the URLs of the photosXXXXXXXXXX
				//archivefbBrowserOverlay.unrollWall();
				//http://www.facebook.com/photo_search.php?oid=2305046635&view=all
				
				//capture the individual photos' pages
				var photoAnchorsInAlbum = this.targetWindow.document.getElementsByClassName('uiPhotoThumb');
				for(var photoAnchor=0; photoAnchor<photoAnchorsInAlbum.length; photoAnchor++){moreURLsToCapture[photoAnchor] = photoAnchorsInAlbum[photoAnchor].href;}
				
				var pages = this.targetWindow.document.getElementsByClassName('pagerpro_a');

				if(pages.length > 0 && (pages[pages.length-1] == "Next" || pages[pages.length-2] == "Next")){	//process next page
					if(pages[pages.length-1] == "Next"){moreURLsToRecursivelyCapture[0] = pages[length-1].href;}
					if(pages[pages.length-2] == "Next"){moreURLsToRecursivelyCapture[0] = pages[length-2].href;}
				}
			}*/
		}else if(urlIn.indexOf("photos.php") != -1 || urlIn.indexOf("media/albums/?id=") != -1){	//albums
			// broken as of 4/17/2011, fixed same day with new regex
			//var albumLinksWithRedunancy = this.targetWindow.document.documentElement.innerHTML.match(/\/album\.php\?aid=[0-9]+\&amp;id=[0-9]+/gi); //aid=123456 array. This includes redundant values at consecutive array places and aid prefixing
			console.log("test");
			alert("just logged");
			var albums  = this.targetWindow.document.getElementsByClassName('uiMediaThumbAlbLarge');
			
			var photoAlbumsFound = new Array(albums.length);	
			//alert("Found "+photoAlbumsFound.length+" albums");
			//var albumTitles = this.targetWindow.document.getElementsByTagName('strong');
			
			function Album(urlIn){//,nameIn){
				this.url = (urlIn+" ").replace("&amp;","&");
				//this.name = nameIn;
			}
			
			var aa=0; //Javascript doesn't support multiple inits in a for loop?
			for(var ii=0; ii<albums.length; ii++){
				var albumLink = albums[ii];	//Firefox treats the element as a URL when alert. This is odd but works, as I would expect to have to get the href attibute
				//var albumTitle = albums[ii].childNodes[0].firstChild.innerHTML;	

				//alert("Found album at "+albumLink);
				photoAlbumsFound[aa] = new Album(albumLink);//,albumTitle);//albumTitles[aa].innerHTML

				aa++;
			}
			archivefbBrowserOverlay.photoAlbums = photoAlbumsFound;
			
		}else if(urlIn.indexOf("media/set/") != -1){	//an individual album's page, i.e. the listing of all of the photos in an album
			var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');
			statusBarMenuText.setAttribute('label',"Forcing Images To Display...");
			archivefbBrowserOverlay.unrollFriendsList();
			statusBarMenuText.setAttribute('label',"Waiting For Photos To Load...");

			//collect the URLs of the photos
			var photoAnchorsInAlbum = this.targetWindow.document.getElementsByClassName('uiMediaThumbLarge');
			//Hmm, sometimes the className is large, sometimes huge.
			if(photoAnchorsInAlbum.length == 0){photoAnchorsInAlbum = this.targetWindow.document.getElementsByClassName('uiMediaThumbHuge');}

			
			var photosI = 0;
			for(var photoAnchor=0; photoAnchor<photoAnchorsInAlbum.length; photoAnchor++){	//traverse all anchors
				if(photoAnchorsInAlbum[photoAnchor].href!=null){ //preceding span tags won't fall into this
					moreURLsToCapture.push(photoAnchorsInAlbum[photoAnchor].href);
					photosI++;}
			}
								
			this.pause(2000);		//this is bad, should check the DOM for readiness instead
		}else if(urlIn.indexOf("sk=messages&page=") != -1 && urlIn.indexOf("tid=") == -1){ //get the paginated inbox, not the messages themselves, similar URL structure
			var msgs = this.targetWindow.document.documentElement.innerHTML.match(/tid=[0-9]+/gim);
			var pp = urlIn.substr(urlIn.indexOf("page=")+5);
			for(var msgI=0; msgI<msgs.length; msgI++){	//traverse all anchors
					moreURLsToCapture[msgI] = "http://www.facebook.com/?sk=messages&page="+pp+"&"+msgs[msgI];
			}
		}
		
		//reset FBI bools
		//archivefbBrowserOverlay.buttonF = false; archivefbBrowserOverlay.buttonB = false; archivefbBrowserOverlay.buttonI = false;
		archivefbBrowserOverlay.execCapture(archivefbBrowserOverlay.p1, archivefbBrowserOverlay.p2, archivefbBrowserOverlay.p3, archivefbBrowserOverlay.p4,nameOfUser);

		if(moreURLsToCapture.length > 0 && moreURLsToCapture[0].length > 4){ 
			// We overload the third parameter of this function for both the number of unrolls as well as moreURLsToCapture
			//  this is bad but filtering on this condition and resetting on the else if the former occurs is sufficient for 
			//  the time being
			var u = moreURLsToCapture.shift();
			archivefbBrowserOverlay.compoundExecCapture(u,nameOfUser,moreURLsToCapture);
			//archivefbBrowserOverlay.pause(8000);	//this is bad. if 8 seconds go by and the page is not loaded, add-on fails		
		}else {	
			moreURLsToCapture = new Array();
		}
		//else {
		//	alert('moreURLsToCapture.length <= 0');
		//}
		
		/*moreURLsToCapture = new Array(); //reset the array
		
		if(moreURLsToRecursivelyCapture.length > 0){
			moreURLsToRecursivelyCapture = new Array();
			archivefbBrowserOverlay.compoundExecCapture(moreURLsToRecursivelyCapture[0],nameOfUser);
		}*/
		return userIdNumber;
	},
	browserIdle : true,
	photoAlbums : null,
	running : false,
	url : "",
	firstPass : true,	//used for wall unrolling, could be better implemented
	archiveEntryCreated : false, 	//attempt at trying to get only one entry in the sidebar per archiving session
	idArray : null, //holds each archived item's id for absolute->relative link conversion
	setStatus : function(newStatus) {
		var statusBarMenuText = document.getElementById('ArchiveFBStatusPanelText');	
		if(newStatus!=""){statusBarMenuText.style.display = "block";}
		else {statusBarMenuText.style.display = "none";} //modular means to hide status bar
		statusBarMenuText.setAttribute('label',newStatus);
	},
	execCapture : function(aPartialEntire, aFrameOnly, aShowDetail, aTargetID, title)
	{
		if ( aPartialEntire == 0 ){
			aPartialEntire = this.isSelected() ? 1 : 2;
			aFrameOnly = aPartialEntire == 1;
		}
		
		aTargetID = this.verifyTargetID(aTargetID);
		if ( !aTargetID ) return;
		this.targetWindow = aFrameOnly ? archivefbUtils.getFocusedWindow() : window.content;

		
		// UNROLL THE "## SIMILAR STORIES LINKS"
		//TODO: put this in its own function
		var showAllLinks = this.targetWindow.document.getElementsByClassName('showAll');
		if(showAllLinks.length > 0){archivefbBrowserOverlay.setStatus("Expanding Similar Stories...");}
		
		for(var link=0; link<showAllLinks.length; link++){
			var evt = this.targetWindow.document.createEvent("MouseEvents");
			evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);	
			showAllLinks[link].dispatchEvent(evt);
			var randomBetween500And1000 = Math.floor(Math.random()*500)+500;
			this.pause(randomBetween500And1000);	//give time for DOM to react to click before polling to see if link exists
		}
		
		//revert icon to original png, which was set above while loop
		//document.getElementById('archivefbStatusPanel').setAttribute('src',"chrome://archivefb/skin/main.png");
		
		
		var ret = archivefbContentSaver.captureWindow(this.targetWindow, aPartialEntire == 1, aShowDetail, aTargetID, 0, null, null,title);
		
		//add id of element to array of file ids
		archivefbBrowserOverlay.idArray[window.content.document.URL] = archivefbContentSaver.item.id+"";
		//alert(window.content.document.URL+"\r\n"+archivefbBrowserOverlay.idArray[window.content.document.URL]+"\r\n"+archivefbContentSaver.item.id);
		
		this.idArray[window.content.document.URL] = archivefbContentSaver.item.id+"";
	
		return ret;
	},

	//archivefb change: a makeshift way to pause in javascript
	pause : function( iMilliseconds ) {
		var sDialogScript = 'window.setTimeout( function () { window.close(); }, ' + iMilliseconds + ');';
		window.showModalDialog('javascript:document.writeln ("<script>' + sDialogScript + '<' + '/script>")');
		
	},
	
	execCaptureTarget : function(aShowDetail, aTargetID)
	{
		aTargetID = this.verifyTargetID(aTargetID);
		if ( !aTargetID ) return;
		var linkURL;
		try {
			linkURL = gContextMenu.getLinkURL();
		} catch(ex) {
			linkURL = this.getLinkURI();
		}
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://archivefb/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, aShowDetail, aTargetID, 0, null, null, null
		);
	},

	execBookmark: function(aTargetID)
	{
		aTargetID = this.verifyTargetID(aTargetID);
		if (!aTargetID)
			return;
		this.bookmark(aTargetID, 0);
	},

	bookmark: function(aResName, aResIndex, aPreset)
	{
		var newItem = archivefbData.newItem();
		newItem.type   = "bookmark";
		newItem.source = window.content.location.href;
		newItem.title  = gBrowser.selectedTab.label;
		newItem.icon   = gBrowser.selectedTab.getAttribute("image");
		for (var prop in aPreset)
			newItem[prop] = aPreset[prop];
		archivefbData.addItem(newItem, aResName, aResIndex);
		this.updateFolderPref(aResName);
		archivefbUtils.refreshGlobal(false);
	},

	execLocate: function(aRes)
	{
		if (!aRes)
			return;
		if (!archivefbData.exists(aRes)) {
			archivefbPageEditor.disable(true);
			return;
		}
		if (document.getElementById("viewarchivefbSidebar").getAttribute("checked"))
			c.locate(aRes);
		else {
			this.locateMe = aRes;
			toggleSidebar("viewarchivefbSidebar");
		}
	},

	getLinkURI: function()
	{
		var i = 0;
		var linkURL;
		var curNode = document.popupNode;
		while (++i < 10 && curNode) {
			if ((curNode instanceof HTMLAnchorElement || curNode instanceof HTMLAreaElement ) && 
			    curNode.href) {
				linkURL = curNode.href;
				break;
			}
			curNode = curNode.parentNode;
		}
		if (linkURL)
			return linkURL;
	},

	isSelected : function()
	{
		var sel = archivefbUtils.getFocusedWindow().getSelection().QueryInterface(Ci.nsISelectionPrivate);
		var isSelected = false;
		try {
			//issamenode is problematic in Gecko 10
			//isSelected = !(sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset);
		}
		catch(ex) {}
		return isSelected;
	},

	handleEvent: function(event)
	{
		if (event.type == "popupshowing")
			this.onPopupShowing(event);
	},

	_dragStartTime: null,

	handleDragEvents: function(event)
	{
		event.preventDefault();
		switch (event.type) {
			case "dragenter": 
				this._dragStartTime = Date.now();
				break;
			case "dragover": 
				if (this._dragStartTime && Date.now() - this._dragStartTime > 1000) {
					this._dragStartTime = null;
					event.target.doCommand();
				}
				break;
			default: 
		}
	},

	onPopupShowing : function(event)
	{
		if (event.originalTarget.id != "contentAreaContextMenu")
			return;
		var selected, onLink, inFrame, onInput;
		try {
			selected = gContextMenu.isTextSelected;
			onLink   = gContextMenu.onLink && !gContextMenu.onMailtoLink;
			inFrame  = gContextMenu.inFrame;
			onInput  = gContextMenu.onTextInput;
		}
		catch(ex) {
			selected = this.isSelected();
			onLink   = this.getLinkURI() ? true : false;
			inFrame  = document.popupNode.ownerDocument != window.content.document;
			onInput  = document.popupNode instanceof HTMLTextAreaElement || 
			           (document.popupNode instanceof HTMLInputElement && 
			           (document.popupNode.type == "text" || document.popupNode.type == "password"));
		}
		var isActive = selected || onLink || onInput;
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		var prefContext  = archivefbUtils.getPref("ui.contextMenu");
		var prefBookmark = archivefbUtils.getPref("ui.bookmarkMenu");
		getElement("archivefbContextMenu0").hidden = prefContext || onInput;
		getElement("archivefbContextMenu1").hidden = !prefContext || !selected;
		getElement("archivefbContextMenu2").hidden = !prefContext || !selected;
		getElement("archivefbContextMenu3").hidden = !prefContext || isActive;
		getElement("archivefbContextMenu4").hidden = !prefContext || isActive;
		getElement("archivefbContextMenu5").hidden = !prefContext || isActive || !inFrame;
		getElement("archivefbContextMenu6").hidden = !prefContext || isActive || !inFrame;
		getElement("archivefbContextMenu7").hidden = !prefContext || selected || !onLink;
		getElement("archivefbContextMenu8").hidden = !prefContext || selected || !onLink;
		getElement("archivefbContextMenu9").hidden = !prefContext || isActive || !prefBookmark;
	},

	onMiddleClick: function(event, aFlag)
	{
		if (event.originalTarget.localName == "menu" || event.button != 1)
			return;
		switch (aFlag) {
			case 1 : this.execCapture(1, true, true , event.originalTarget.id); break;
			case 3 : this.execCapture(2, false,true , event.originalTarget.id); break;
			case 5 : this.execCapture(2, true, true , event.originalTarget.id); break;
			case 7 : this.execCaptureTarget(true,  event.originalTarget.id); break;
		}
	},

};




var archivefbMenuHandler = {

	_menu: null,
	baseURL: "",
	shouldRebuild: false,

	_init: function()
	{
		this._menu = document.getElementById("archivefbMenu");
		this.baseURL  = archivefbUtils.getBaseHref(archivefbData.dataSource.URI);
		var dsEnum = this._menu.database.GetDataSources();
		while (dsEnum.hasMoreElements()) {
			var ds = dsEnum.getNext().QueryInterface(Ci.nsIRDFDataSource);
			this._menu.database.RemoveDataSource(ds);
		}
		this._menu.database.AddDataSource(archivefbData.dataSource);
		this._menu.builder.rebuild();
		this.shouldRebuild = false;
	},

	onPopupShowing: function(event, aMenuPopup)
	{
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		var initFlag = false;
		var dsEnum = getElement("archivefbMenu").database.GetDataSources();
		while (dsEnum.hasMoreElements()) {
			var ds = dsEnum.getNext().QueryInterface(Ci.nsIRDFDataSource);
			if (ds.URI == archivefbData.dataSource.URI)
				initFlag = true;
		}
		if (!initFlag)
			this._init();
		var selected = archivefbBrowserOverlay.isSelected();
		if (event.target == aMenuPopup) {
			var label1 = document.getElementById("archivefbContextMenu" + (selected ? 1 : 3)).getAttribute("label");
			var label2 = document.getElementById("archivefbContextMenu" + (selected ? 2 : 4)).getAttribute("label");
			getElement("archivefbMenubarItem1").setAttribute("label", label1);
			//getElement("archivefbMenubarItem2").setAttribute("label", label2);
			getElement("archivefbMenubarItem1").className = "menuitem-iconic " + (selected ? "archivefb-capture-partial" : "archivefb-capture-entire");
			//getElement("archivefbMenubarItem2").className = "menuitem-iconic " + (selected ? "archivefb-capture-partial" : "archivefb-capture-entire");
			getElement("archivefbMenubarItem5").label = getElement("archivefbMenubarItem5").getAttribute("sblabel");
			if (!this.shouldRebuild)
				return;
			this.shouldRebuild = false;
			this._menu.builder.rebuild();
		}
		else {
			if (event.target.firstChild && event.target.firstChild.className.indexOf("archivefb-capture") >= 0) {
				event.target.firstChild.label     = getElement("archivefbMenubarItem1").label;
				event.target.firstChild.className = getElement("archivefbMenubarItem1").className;
				return;
			}
			var elt1 = document.createElement("menuseparator");
			var elt2 = document.createElement("menuitem");
			elt2.setAttribute("class", getElement("archivefbMenubarItem1").className);
			elt2.setAttribute("label", getElement("archivefbMenubarItem1").label);
			elt2.setAttribute("resuri", event.target.parentNode.resource.Value);
			event.target.insertBefore(elt1, event.target.firstChild);
			event.target.insertBefore(elt2, event.target.firstChild);
		}
	},
	p1: null, p2: null, p3: null, p4: null,		//idiotic implementation for below
	buttonF : false, buttonB : false, buttonI : false, //use to determine if 'fbi' pressed
	onClick: function(event)
	{
		if (event.target.id == "archivefbMenubarItem3" || event.target.id == "archivefbMenubarItem4")
			return;
		if (event.target.className.indexOf("archivefb-capture") >= 0) {
			var aShowDetail = event.target.id == "archivefbMenubarItem2" || event.button == 1;
			var resURI = event.target.hasAttribute("resuri") ? event.target.getAttribute("resuri") : "urn:archivefb:root";
			
			archivefbBrowserOverlay.p1 = 0; archivefbBrowserOverlay.p2 = null; archivefbBrowserOverlay.p3 = aShowDetail;
			archivefbBrowserOverlay.p4 = resURI;
			archivefbBrowserOverlay.createCaptureOptionsDialog();
			return;
		}
		if (event.button == 1)
			this._menu.firstChild.hidePopup();
		if (event.target.id.indexOf("urn:archivefb:") != 0)
			return;
		var res = archivefbUtils.RDF.GetResource(event.target.id);
		if (archivefbData.isContainer(res)) {
			if (event.button == 1)
				archivefbBrowserOverlay.execLocate(res);
			return;
		}
		var id = archivefbData.getProperty(res, "id");
		if (!id)
			return;
		var url;
		switch (archivefbData.getProperty(res, "type")) {
			case "note"     : url = "chrome://archivefb/content/note.xul?id=" + id; break;
			case "bookmark" : url = archivefbData.getProperty(res, "source");        break;
			default         : url = this.baseURL + "data/" + id + "/index.html";
		}
		var openInTab = archivefbUtils.getPref("tabs.open");
		archivefbUtils.loadURL(url, openInTab || event.button == 1 || event.ctrlKey || event.shiftKey);
		event.stopPropagation();
	},

	execCaptureAllTabs: function(aTargetID)
	{
		if (!aTargetID)
			aTargetID = archivefbBrowserOverlay.verifyTargetID("archivefbContextPicking");
		if (!aTargetID)
			return;
		var tabList = [];
		var nodes = gBrowser.mTabContainer.childNodes;
		for (var i = 0; i < nodes.length; i++)
			tabList.push(nodes[i]);
		this._goNextTab(tabList, aTargetID);
	},

	_goNextTab: function(tabList, aTargetID)
	{
		if (tabList.length == 0)
			return;
		var tab = tabList.shift();
		gBrowser.selectedTab = tab;
		var win = gBrowser.getBrowserForTab(tab).contentWindow;
		if (win.location.href != "about:blank")
		{
			try {
				archivefbContentSaver.captureWindow(win, false, false, aTargetID, 0, null);
			} catch(ex) {
			}
		}
		setTimeout(function(){ archivefbMenuHandler._goNextTab(tabList, aTargetID); }, 1000);
	},

};




window.addEventListener("load", function(){ archivefbBrowserOverlay.init(); }, false);
window.addEventListener("unload", function(){ archivefbBrowserOverlay.destroy(); }, false);