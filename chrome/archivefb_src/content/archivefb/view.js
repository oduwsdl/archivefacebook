
var gID;
var gRes;



function ARCHIVEFB_initView()
{
	document.location.search.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;
	if ( !gID ) return;
	gRes = archivefbUtils.RDF.GetResource(gID ? "urn:archivefb:item" + gID : "urn:archivefb:root");
	if ( !archivefbData.isContainer(gRes) )
	{
		window.location.href = archivefbData.getURL(gRes);
		return;
	}


	var src = ARCHIVEFB_getHTMLHead(archivefbData.getProperty(gRes, "title"));

	var resList = archivefbData.flattenResources(gRes, 2, false);
	for ( var i = 0; i < resList.length; i++ )
	{
		var res = resList[i];
		if (archivefbData.getProperty(res, "type") == "separator")
			continue;
		var item = archivefbData.newItem(null);
		for ( var prop in item ) item[prop] = archivefbData.getProperty(res, prop);
		if ( !item.icon ) item.icon = archivefbUtils.getDefaultIcon(archivefbData.getProperty(res, "type"));
		src += ARCHIVEFB_getHTMLBody(item);
	}

	src += ARCHIVEFB_getHTMLFoot();

	var file = archivefbUtils.getarchivefbDir().clone();
	file.append("collection.html");
	if ( !file.exists() ) file.create(file.NORMAL_FILE_TYPE, 0666);
	archivefbUtils.writeFile(file, src, "UTF-8");
	var filePath = archivefbUtils.IO.newFileURI(file).spec;
	window.location.href = filePath;
}


function ARCHIVEFB_getHTMLHead(aTitle)
{
	var src = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
	src += '<html>\n\n'
	src += '<head>\n'
	src += '	<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">\n'
	src += '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
	src += '	<title>' + aTitle + '</title>\n'
	src += '	<link rel="stylesheet" type="text/css" href="chrome://archivefb/skin/combine.css" media="screen,print">\n'
	src += '</head>\n\n'
	src += '<body>\n\n';
	return src;
}


function ARCHIVEFB_getHTMLBody(aItem)
{
	var src = "";
	src += '<cite class="archivefb-header">\n';
	src += '\t<img src="' + (aItem.icon ? aItem.icon : archivefbUtils.getDefaultIcon(aItem.type)) + '" width="16" height="16">\n';
	src += '\t<a href="' + aItem.source + '" target="_top">' + archivefbUtils.crop(aItem.title, 100) + '</a>\n';
	src += '</cite>\n';
	if ( aItem.type != "bookmark" ) src += '<iframe class="archivefb-iframe" src="./data/' + aItem.id + '/index.html" onload="this.setAttribute(\'style\', \'height:\' + (this.contentDocument.height || 600 + 30));"></iframe>\n';
	return src;
}


function ARCHIVEFB_getHTMLFoot()
{
	var src = '</body>\n\n' + '</html>\n';
	return src;
}


