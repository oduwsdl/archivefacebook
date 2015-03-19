
var archivefbRepair = {

	get WIZARD() { return document.getElementById("archivefbRepairWizard"); },
	get TREE()   { return document.getElementById("archivefbRepairTree"); },

	treeItems : [],

	initStartPage : function()
	{
		var nextPage;
		switch ( document.getElementById("archivefbRepairRadioGroup").selectedIndex )
		{
			case 0 : nextPage = "archivefbRepairRDF1"; break;
			case 1 : nextPage = "archivefbRepairFavicons"; break;
		}
		if ( nextPage ) this.WIZARD.currentPage.next = nextPage;
		this.WIZARD.canAdvance = nextPage ? true : false;
	},

	initRestoreRDF : function()
	{
		this.treeItems = [];
		var backupDir = archivefbUtils.getarchivefbDir();
		backupDir.append("backup");
		if ( !backupDir.exists() )
		{
			archivefbUtils.alert("No backup files found.");
			return;
		}
		var fileEnum = backupDir.directoryEntries;
		while ( fileEnum.hasMoreElements() )
		{
			var fileObj  = fileEnum.getNext().QueryInterface(Ci.nsIFile);
			var fileName = fileObj.leafName;
			var isMatch  = fileName.match(/^archivefb_\d{8}\.rdf$/);
			if ( isMatch ) this.treeItems.push([fileName, (new Date(fileObj.lastModifiedTime)).toLocaleString(), fileObj.fileSize]);
		}
		var colIDs = [
			"archivefbRepairTreecolFile",
			"archivefbRepairTreecolTime",
			"archivefbRepairTreecolSize",
		];
		this.TREE.view = new archivefbCustomTreeView(colIDs, this.treeItems);
	},

	execRestoreRDF : function()
	{
		if ( this.TREE.currentIndex < 0 ) { this.WIZARD.rewind(); return; }
		var fileName = this.treeItems[this.TREE.currentIndex][0];
		if ( !fileName ) { this.WIZARD.rewind(); return; }
		var bFile = archivefbUtils.getarchivefbDir();
		bFile.append("backup");
		bFile.append(fileName);
		if ( !bFile.exists() || !bFile.isFile() ) { this.WIZARD.rewind(); return; }
		this.WIZARD.canRewind = false;
		try {
			archivefbData.restoreFromBackup(bFile);
		}
		catch (ex) {
			document.getElementById("archivefbRepairRDF2Label").value = "ERROR: " + ex;
		}
	},

	restoreFavicons : function()
	{
		this.WIZARD.canRewind = false;
		var shouldFlush = false;
		var i = 0;
		var resEnum = archivefbData.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res  = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
			var id   = archivefbData.getProperty(res, "id");
			var icon = archivefbData.getProperty(res, "icon");
			if ( res.Value == "urn:archivefb:root" || res.Value == "urn:archivefb:search" ) continue;
			if ( ++i % 10 == 0 ) document.getElementById("archivefbRepairFaviconsTextbox").value = res.Value;
			if ( icon.match(/(\d{14}\/.*$)/) )
			{
				var newIcon = "resource://archivefb/data/" + RegExp.$1;
				if ( icon != newIcon )
				{
					archivefbData.setProperty(res, "icon", newIcon);
				}
			}
		}
		document.getElementById("archivefbRepairFaviconsTextbox").value = document.getElementById("archivefbRepairRDF2Label").value;
		window.opener.reload();
	},

};



