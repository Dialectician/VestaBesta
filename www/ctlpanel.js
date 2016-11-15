
// Vesta user defined web interface - javascript component

// This file is included in an HTML file that also contains a brief portion of
// javascript that defines global values for the Vesta IP and tcp port as well as a 
// required background image and a body element that invokes the initwidgets() 
// function defined here.

// Depends on ctlSocketServer task on Vesta tcp port for data communication
// This javascript reads a ctlpagedata.txt containing widget parameters. It
// draws the widgets on the web page and updates them periodically.

// Widgets are bipolar objects. They are javascript objects containing code and data,
// and they are also web page DIV elements with the same id.

// All widgets have an update() method and a redraw() method. The update method causes
// the widget to initiate an AJAX request for fresh data. The redraw method is invoked
// by the AJAX event handler when the data package is returned by the Vesta.

/*****************************************************************************/
// Idea: allow numeric (maybe other as well?) widget parameters to be any of:
//	- A simple string that evaluates to a number (as now)
//	- A reference to a controller element
//	- A reference to a Javascript function (presumably defined in the parent HTML doc)
// Have to parse the config text to figure out which. Possible issue: if controller 
// element, which controller (there can be more than one). Might restrict it to the
// controller whose IP is associated with this widget.
/*****************************************************************************/

// Widget Index - used to serialize widgets


Date.prototype.ap = "AM";
Date.prototype.getUsHours = function() {
	var hrs = this.getHours();
	this.ap = "AM";
	if(hrs > 12){
		hrs = hrs - 12;
		this.ap = "PM";
	}
	if(hrs == 12){
		this.ap = "PM";
	}
	hrs = "0" + hrs;
	hrs = hrs.substring(hrs.length - 2);
	if(hrs == "00"){
		hrs = "12"
	}
	return(hrs);
}

Date.prototype.getUsMins = function() {
	var min = "0" + this.getMinutes();
	 return(min.substring(min.length - 2));
}

Date.prototype.getUsMonth = function() {
	var month = "0" + (this.getMonth()+1);
	return( month.substring(month.length - 2));
}

Date.prototype.getUsDay = function() {
	var day = "0" + this.getDate();
	return(day.substring(day.length - 2));
}

function setPageTime(){
	if(document.getElementById("myTime")){
		var d = new Date();
		var dtext = d.getHours() + ":" + d.getUsMins() + " (" + d.getUsHours() + ":" + d.getUsMins() + " " + d.ap + ")"; 
		document.getElementById("myTime").innerHTML = dtext;
	}
}

var windex = 1;
var widgets = new Array();
var pw;												// Popup Window
// Initialize ip address to that of host - would typically be the Vesta controller.
var nfcs_ip = location.host;

var editing = false;

// Arrays of update strings for (possibly) multiple controllers that we'll query
var updateString = new Array();
var ctlip = new Array();

// Canvas for SVG labels
var svgCanvas = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svgCanvas.id = "svgCanvas";
svgCanvas.onmouseup="mouseUp(evt)";
svgCanvas.onmousemove="mouseMove(evt)";
svgCanvas.oncontextmenu= function() {return false;};

var draggingElement = null;
var draggingBar = null;
var nMouseOffsetX = 0;
var nMouseOffsetY = 0;
var pw;

var nfe = new Array();
var nfpvc = new Array();
var nfio = new Array();
var nfname = new Array();

if (typeof(cfunc) == "undefined") {
	var cfunc = {};
}

// popup is for widget parameter editing. Future feature. Key problem is timing - can't populate popup
// immediately after creation because it needs time to load.
function showPopup(){
	//pw = window.open("popup.html", "mywindow", "location=1,status=1,scrollbars=1,height=300,width=400");
}

function populatePopup(target) {

		// Populate popup
		var index = target.id.substring(4, 5);
		// Widget type
		var mt = target.id + '.type';
		pw.document.getElementById("arg0").value = eval(mt);

		// IP Address
		mt = target.id + '.args[3]';
		pw.document.getElementById("arg3").value = eval(mt);
		// Element ID
		mt = target.id + '.args[4]';
		var eid = eval(mt);
		var sb = pw.document.getElementById("arg4");
		sb.options.length = 0;
		for ( var i in nfe) {
			sb.options[sb.options.length] = new Option(nfname[i], nfe[i]);
			if (eid == nfe[i]) {
				sb.selectedIndex = sb.options.length - 1;
			}
		}

		// Widget-specific portion
		// Delete any rows after 4
		var table = pw.document.getElementById("poptable");
		var rowCount = table.rows.length;
		for ( var i = rowCount - 1; i > 5; i--) {
			table.deleteRow(i);
		}

		mt = target.id + '.args';
		var args = eval(mt);
		mt = target.id + '.argtypes';
		var argtypes = eval(mt);
		mt = target.id + '.argnames';
		var argnames = eval(mt);

		for ( var i in argtypes) {
			var row = table.insertRow(-1);
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);
			cell1.innerHTML = argnames[i];
			if (argtypes[i] == "c") {
				cell2.innerHTML = "<tr><td><input class=Cpicker id=arg" + i * 1 + 5
						+ " type=text value=" + args[i * 1 + 5] + " /></td></tr>";
			} else {
				cell2.innerHTML = args[i * 1 + 5];
			}
		}
		pw.document.dispatchEvent("ready");
}

// We trap this only to manage edit mode at present
function canvasMouseDown(evt) { 

	// If we're editing GUI, a click at very top left will exit edit mode
	if(editing == true){
		if(evt.layerX < 10 && evt.layerY < 10){
			document.getElementById("editDiv").style.visibility = "hidden";
			document.getElementById("saveDiv").style.visibility = "hidden";
			editing = false;
		}
		// Clicking left margin (but not top left corner) will write updated config file
		if(evt.layerX < 10 && evt.layerY > 10){
			write_ctldata();
		}
	}else{
		// Not editing. Right-click in top left corner will put us inedit mode
		if(evt.layerX < 10 && evt.layerY < 10 && evt.which == 3){
			document.getElementById("editDiv").style.visibility = "visible";
			document.getElementById("saveDiv").style.visibility = "visible";
			editing = true;
			showPopup();
		}
	}	
	
	return false;
}

// Mouse down on one of our widgets. Could be editing, could be dragging
function mouseDown(evt) {

	if(editing){
		var target = evt.currentTarget;
		if(evt.which == 3){
			if(target){
				// Populate popup with widget data
			  //populatePopup(target);
			}
			return;
		}
		
		draggingElement = target;
		if(target) {
			
			var p = svgCanvas.createSVGPoint();
			p.x = evt.clientX;
			p.y = evt.clientY;
	
			//var m = getScreenCTM(document.documentElement);
			var m = getScreenCTM(svgCanvas);
	
			p = p.matrixTransform(m.inverse());
	
			nMouseOffsetX = p.x - target.dragx;
			nMouseOffsetY = p.y - target.dragy;
		}
	}
}

function mouseUp(evt) { 
    draggingElement = null;
    nMouseOffsetX = 0;
    nMouseOffsetY = 0;
}

function mouseMove(evt) { 
	var p = svgCanvas.createSVGPoint();
	p.x = evt.clientX;
	p.y = evt.clientY;

	var m = getScreenCTM(svgCanvas);

	p = p.matrixTransform(m.inverse());
	p.x -= nMouseOffsetX;
	p.y -= nMouseOffsetY;

	if(draggingElement) {
		if(draggingElement.tagName=="DIV"){
			draggingElement.dragx = p.x;
			draggingElement.dragy = p.y;
			draggingElement.style.left=p.x;
			draggingElement.style.top=p.y;
		}else{
			draggingElement.dragx = p.x;
			draggingElement.dragy = p.y;
			//draggingElement.transform = "translate(" + p.x + " " + p.y + ")";
			draggingElement.setAttributeNS(null,"x",p.x);
			draggingElement.setAttributeNS(null,"y",p.y);
		}
	}    
}

// Add a widget to the page - invoked for each widget at startup by
// initwidgets()
function addwidget() {
	// Add a widget to the DOM. We get a line from the widget configuration file.
	// We parse the first argument to get the widget type. We generate a name
	// for this instance and create the appropriate object.
	// For parsing reasons, widget names and IDs are 5 characters: nwXXX
	// Must be unique, so they're assigned sequentially: nw001, nw002, etc.
	// Of course, this will break when we need more than 999 widgets....
	// Parameter 0 is the widget type.
	// Parameter 3 is the IP address of the controller or blank to use default
	var myip;
	wname = "000" + windex;
	wname = wname.slice(-3);
	wname = "nw" + wname;
	wtype = addwidget.arguments[0];
	// Build base command to create new widget instance
	var wcmd = "this." + wname + " = new " + addwidget.arguments[0] + 'widget("'
			+ wname + '"';
	// Append parameters from config file
	for ( var i = 1; i < addwidget.arguments.length; i++) {
		// If IP is null, use default from HTML file
		if (i == 3) {
			if (addwidget.arguments[3] == "") {
				wcmd += ',"' + nfcs_ip + '"';
				myip = nfcs_ip;
			} else {
				wcmd += ',"' + addwidget.arguments[i] + '"';
				myip = addwidget.arguments[i];
			}
		} else {
			wcmd += ',"' + addwidget.arguments[i] + '"';
		}
	}
	wcmd += ')';
	// Create the widget
	widgets[windex - 1] = eval(wcmd);
	// Build a batch update string for each controller (usually there's only one).
	// Invoke update for each widget to get initial value.
	// Ignore labels.....
	if (wtype != "label") {
		// We might have more than one controller. Find ip in table, or add if new
	  var colon = myip.search(":");
	  if(colon != -1){
	  	myip = myip.substr(0,colon);
	  }
		var j = 0;
		while (j < ctlip.length && myip != ctlip[j]) {
			j++;
		}
		if (j == ctlip.length) {
			ctlip[j] = myip;
			updateString[j] = "http://" + myip + ":" + nfcs_port + "?";
			updateString[j] += "div=" + wname + "&get=" + addwidget.arguments[4];
		}else{
			updateString[j] += ";div=" + wname + "&get=" + addwidget.arguments[4];
		}
		wcmd = "this." + wname + ".update()";
		eval(wcmd);

	}
	windex++;
}

// Read text file with widget data, start update timer
function initwidgets(){

	var myheight=document.getElementById("MyImage").height+100;
  var mywidth=document.getElementById("MyImage").width;

  setPageTime();
  
  // Set SVG canvas to dimensions of image in HTML file
  //svgCanvas.setAttribute("width", mywidth);
  //svgCanvas.setAttribute("height", myheight);
  svgCanvas.setAttribute("width", 1280);
  svgCanvas.setAttribute("height", 1024);
  svgCanvas.style.position = "absolute";
  svgCanvas.style.top = 0;
  svgCanvas.style.left = 0;
  svgCanvas.setAttribute("version", "1.1");
  svgCanvas.setAttribute("pointer-events","visible");

  svgCanvas.setAttribute("onmousemove", "mouseMove(evt)");
  svgCanvas.setAttribute("onmouseup", "mouseUp(evt)");
  svgCanvas.setAttribute("onmousedown", "canvasMouseDown(evt)");
  svgCanvas.Init = function(evt) {
		newP = svgCanvas.createSVGPoint();
	   };
	  
	 // Create two 10x10 divs in top left corner. Top div toggles edit mode, bottom saves changes
	 // Initially invisible.
   var newdiv = document.createElement('div');
   newdiv.setAttribute('id','editDiv');
   newdiv.style.position = "absolute";
   newdiv.style.top = 0;
   newdiv.style.left = 0;
   newdiv.style.height = 10;
   newdiv.style.width = 10;
   newdiv.style.border = "solid";
   newdiv.style.borderWidth = 1;
   newdiv.style.backgroundColor = "lightgrey";
   newdiv.style.visibility = "hidden";
   document.getElementById("MyDiv").appendChild(newdiv);
		   
   var newdiv = document.createElement('div');
   newdiv.setAttribute('id','saveDiv');
   newdiv.style.position = "absolute";
   newdiv.style.top = 10;
   newdiv.style.left = 0;
   newdiv.style.height = 10;
   newdiv.style.width = 10;
   newdiv.style.border = "solid";
   newdiv.style.borderWidth = 1;
   newdiv.style.backgroundColor = "lightgreen";
   newdiv.style.visibility = "hidden";
   document.getElementById("MyDiv").appendChild(newdiv);
		   

  // Send AJAX request for widget config file
  if (window.XMLHttpRequest){ 
    // code for IE7+, Firefox, Chrome, Opera, Safari
    ctlfile=new XMLHttpRequest();
  }else{
    // code for IE6, IE5
    ctlfile=new ActiveXObject("Microsoft.XMLHTTP");
  }
  // NOT async - we want to wait for the data
  // However, Firefox fails with 'false'
  // widget_src is URL of widget config file defined in HTML parent
  ctlfile.open("GET",widget_src,true);
  ctlfile.onreadystatechange=function(){
    if (this.readyState===4 && this.status === 200){
      //var allText = ctlfile.responseText;
      var lines = ctlfile.responseText.split("\n");
      for (var i=0;i<lines.length;i++){
	// If line in file starts with a quote, pass it to addwidget()
        if (lines[i].substring(0,1) == '"'){
          eval('addwidget(' + lines[i] + ')');
        }
      }
      setInterval(update_widgets,refresh_delay);
    }
  };
  ctlfile.send();
  // Append SVG element that other graphics will be drawn on
  document.getElementById("MyDiv").appendChild(svgCanvas);
  // Make image in HTML file appear behind SVG canvas
  document.getElementById("MyImage").style.zIndex = -1;
  document.getElementById("MyDiv").zIndex = 9999;
  document.getElementById("MyImage").oncontextmenu= function() {return false;};
  document.getElementById("MyDiv").oncontextmenu= function() {return false;};
}

// Unused at present. Need to get a list of element IDs and names for edit pulldown.
// This version reads file - better choice is probably a special function in the socket server.
function getNfcsElements(){

  // Get element data from NFCS. 
	// Works only for the NFCS upon which the SVG page is hosted.
  if (window.XMLHttpRequest){ 
    // code for IE7+, Firefox, Chrome, Opera, Safari
    efile=new XMLHttpRequest();
  }else{
    // code for IE6, IE5
    efile=new ActiveXObject("Microsoft.XMLHTTP");
  }
  var efilename = "elements.csv"
  efile.open("GET",efilename ,false);
  efile.onreadystatechange=function(){
    if (this.readyState===4 && this.status === 200){
      //var allText = ctlfile.responseText;
      var lines = efile.responseText.split("\n");
      for (var i=3;i<lines.length;i++){
      	lfields = lines[i].split(",");
      	nfe[i-2]=lfields[0];
      	nfpvc[i-2] = lfields[3];
      	nfio[i-2] = lfields[4];
      	nfname[i-2] = lfields[6];
      }
    }
  };
  efile.send();
}

// Periodic batch update of all widgets.
// Uses string built during initialization.
// Requires all our 'div' elements to have corresponding objects with 'update' methods.

function update_widgets(){
	for (var i = 0; i<updateString.length; i++){
		loadXMLDoc(i,'batch','ip',0,0);
	}
}

function IsNumeric(input)
{
    return (input - 0) == input && input.length > 0;
}

// Write control data file to new window
//
function write_ctldata(){

	var newdoc = "file;";
	for(var i = 0; i < widgets.length; i++){
		var wtext = '"' + widgets[i].type + '"';
		var j = widgets[i].args.length;
		var wid = widgets[i].id;
		var myelement = document.getElementById(wid);
		if (myelement.tagName=="DIV"){
			var ts = myelement.style.left;
			ts = ts.substring(0,ts.length-2);
			wtext += ", " + ts;
			var ts = myelement.style.top;
			ts = ts.substring(0,ts.length-2);
			wtext += ", " + ts;
		}else{
			wtext += ", " + myelement.getAttributeNS(null,"x");
			wtext += ", " + myelement.getAttributeNS(null,"y");
		}
		// Special treatment for IP - empty if it's our host
		if (widgets[i].args[3] == nfcs_ip){
			wtext += ', ""';
		}else{
			wtext += ', "' + widgets[i].args[3] +'"';
		}
		for(var k=4;k<j;k++){
			if(IsNumeric(widgets[i].args[k])){
				wtext += ", " + widgets[i].args[k];					
			}else{
				wtext += ', "' + widgets[i].args[k] +'"';
			}
		}
		newdoc += wtext + "%0A";
	}
	
	loadXMLDoc(widget_src,'file',nfcs_ip,location.pathname,newdoc);
}

// AJAX handler. Send request to specified port on server, process responses
// Several request types:
// get is invoked by a widget object's update() method.
// set is invoked when the user changes an element using a widget
// batch is the periodic update
// file writes the control file for the GUI using current values (after edits)
function loadXMLDoc(div,cmd,ip,eid,val)
{
  if (window.XMLHttpRequest){ 
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp=new XMLHttpRequest();
  }else{
    // code for IE6, IE5
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  // Strip port off of ip if present
  var colon = ip.search(":");
  if(colon != -1){
  	ip = ip.substr(0,colon);
  }
  if(cmd == "set"){
    xmlhttp.open("GET","http://" + ip + ":" + nfcs_port + "?div=" + div + "&" + cmd + "=" + eid + "&value=" + val,true);
  }
  if(cmd == "get"){
    xmlhttp.open("GET","http://" + ip + ":" + nfcs_port + "?div=" + div + "&" + cmd + "=" + eid,true);
  }
  if(cmd == "batch"){
    xmlhttp.open("GET", updateString[div],true);
  }
  if(cmd == "file"){
    xmlhttp.open("GET","http://" + ip + ":" + nfcs_port + "?div=" + div + "&" + cmd + "=" + eid + "&value=" + val,true);
  }
  xmlhttp.onreadystatechange=function(){
    if (this.readyState==4){
      // Response is in the form 'nw002;73.9'
      //var text = this.responseText;
    	var text = this.responseText.split("\n");
      // Only handle responses for our widgets
    	for (var i=0; i<text.length;i++){
    		if (text[i].substr(0,2) == "nw"){
    			// Invoke widget redraw method
    			window[text[i].substr(0,5)].redraw(text[i].substr(6));
    		}
    	}
    }
  };
  xmlhttp.send();
}

function addlabel (lp, tp, ldir, fsize, fweight, fstyle, ltext) {
  var text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text2.setAttribute("x",lp);
  text2.setAttribute("y",tp);
  switch (ldir) {
    case "s":
      pos = "middle";
      break;
    case "n":
      pos = "middle";
      break;
    case "e":
      pos = "start";
      break;
    default:
      pos = "end";
  }
  text2.setAttribute("text-anchor",pos);
  text2.setAttribute("font-family",fstyle);
  text2.setAttribute("font-size",fsize);
  text2.setAttribute("font-weight",fweight);
  text2.textContent = ltext;
  svgCanvas.appendChild(text2);

}

function setDecimal(val){
	if(val >= 100){
		return(val.toFixed(0));
	}else{
		return(val.toFixed(1));
	}
}
//*************************************************************************************************
//
// Widget Object Code - all have the same basic structure. The name is always xxxxwidget() where
// xxxx is the widget type as used in the config file.
// All widgets require a minimum of five parameters. These will always be the first five:
// - unique id in the form nwxxx
// - left edge pixel coordinate
// - top edge pixel coordinate
// - IP address of NFCS
// - element ID for widget data
//**************************************************************************************************

// Text box widget - displays value as text. Optional parameters:
// c1 - background color
// bstyle - border style (empty string is no border, "solid" is solid border)
// bcolor - border color
// c1val - value above which background will be color c2
// c2 - second background color
// c2val - value above which background will be color c3
// c3 - third background color

function textwidget(wid,lp,tp,ip,eid,c1,bstyle,bcolor,c1val,c2,c2val,c3,ltext){
	this.type = "text";
	this.args = arguments;
  this.id = wid;
  // Redraw this widget based on update
  this.draw = function(response) {
    document.getElementById(this.id).innerHTML=setDecimal(response*1);
    bgcolor = c1;
    if (c2 != "" && response*1 > c1val*1){
      bgcolor = c2;
    }
    if (c3 != "" && response*1 > c2val*1){
      bgcolor = c3;
    }
    document.getElementById(this.id).style.backgroundColor = bgcolor;
  };
  // If there's a custom function for this widget, execute it
  if (typeof(cfunc[wid]) == "undefined") {
    this.redraw = function(response) {
    	this.draw(response)};
  }else{
    this.redraw = function(response) {
    	this.draw(cfunc[wid](response))};
  } 
  // Fire AJAX query to update this widget
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  newdiv.style.width = 40;
  newdiv.style.backgroundColor = c1;
  newdiv.style.border = bstyle;
  newdiv.style.borderWidth = 1;
  newdiv.style.borderColor = bcolor;
  newdiv.style.paddingLeft = 2;
  newdiv.style.paddingRight = 2;
  newdiv.style.fontSize = 12;
  newdiv.style.fontFamily = "Verdana";
  newdiv.setAttribute('align',"right");
  newdiv.innerHTML = "---";
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;
  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  document.getElementById("MyDiv").appendChild(newdiv);
  // If label text is specified, make label font 6 pixels shorter than text box height
  // Offset baseline up by 4 pixels to give space for descenders
  if (ltext){
    addlabel (lp-5, tp*1+newdiv.clientHeight-4, "w", 13+"px", "", "Arial", ltext);
  }
}

// Set Widget - set element to widget's text value
// Same parameters and options as text widget.
// Inhibits redraw if focus is on widget

function setwidget(wid,lp,tp,ip,eid,c1,bstyle,bcolor,c1val,c2,c2val,c3,ltext){
	this.type = "set";
	this.args = arguments;
  this.id = wid;
  this.redraw = function(response) {
    var tid = "txt" + this.id;
    mytxt = document.getElementById(tid);
    // Don't redraw if we have focus
    if (document.activeElement != mytxt) {
      bgcolor = c1;
      if (c2 != "" && response*1 > c1val*1){
	bgcolor = c2;
      }
      if (c3 != "" && response*1 > c2val*1){
	bgcolor = c3;
      }
      mytxt.style.backgroundColor = bgcolor;
      mytxt.value=response;
    }
  };
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  newdiv.style.width = 45;
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;

  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  var newtxt = document.createElement('input');
  tid = "txt"+wid;
  newtxt.setAttribute('id',tid);
  newtxt.type = "text";
  newtxt.style.backgroundColor = c1;
  newtxt.style.border = bstyle;
  newtxt.style.borderWidth = 1;
  newtxt.style.borderColor = bcolor;
  newtxt.style.width = 45;
  newtxt.style.paddingLeft = 2;
  newtxt.style.paddingRight = 2;
  newtxt.style.fontSize = 12;
  newtxt.style.fontFamily = "Verdana";
  newtxt.style.textAlign = "right";
  newtxt.value = "---";
  newtxt.onchange = function(){ loadXMLDoc(wid,'set',ip,eid,newtxt.value); this.update(); }; 
  newtxt.onfocus = function(){ this.style.border = "inset"; }; 
  newtxt.onblur = function(){ this.style.border = bstyle; this.style.borderWidth = 1; this.style.borderColor = bcolor;}; 

  newdiv.appendChild(newtxt);
  document.getElementById("MyDiv").appendChild(newdiv);

  // If label text is specified, make label font 4 pixels shorter than text box height
  // Offset baseline up by 4 pixels to give space for descenders
  if (ltext){
    addlabel (lp-5, tp*1+newtxt.clientHeight-4, "w", 13+"px", "", "Arial", ltext);
  }
}

// Toggle button widget - displays graphic, sets or toggles discrete output element
// Extra parameter: toggle type
// Toggle type: 0 = set to 0. 1 = set to 1. 2 = toggle current value
function togglewidget(wid,lp,tp,ip,eid,ttype,offimage,onimage,ltext){
	this.type = "toggle";
	this.args = arguments;
  this.id = wid;
  this.wht = "http://"+ip+"/images/whtdot.png";
  this.red = "http://"+ip+"/images/reddot.png";
  if (offimage){
    this.wht = offimage;
  }
  if (onimage){
    this.red = onimage;
  }
  this.imgid = "img"+wid;
  this.redraw = function(response) {
    if (response != 0){
      document[this.imgid].src=this.red;
    }
    if (response == 0){
      document[this.imgid].src=this.wht;
    }
  };
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  //newdiv.style.width = 125;
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;
  // disable to get normal functioning?
  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  document.getElementById("MyDiv").appendChild(newdiv);
  var newimg = document.createElement('img');
  newimg.src=this.wht;
  newimg.name = this.imgid;
  newimg.onclick = function () { loadXMLDoc(wid,'set',ip,eid,ttype); };
  //newdiv.addEventListener("mousedown",onDivMouseDown, true);
  //newdiv.addEventListener("mouseup",onMouseUp, true);
  newdiv.appendChild(newimg);
  // If label text is specified, make label font 14 pixels high
  // Offset baseline up by 10 pixels to give space for descenders
  if (ltext){
    addlabel (lp-5, tp*1+10, "w", 13+"px", "", "Arial", ltext);
  }
}

// Bar graph widget - displays simple bar graphic
// Extra parameters: height, width, min, max, and color.
// If width > height, it's drawn as a horizontal bar, otherwise vertical.
// The containing div has a border. The internal div drawn with a width (or height)
// proportional to the reading (compared to min and max).
function barwidget(wid,lp,tp,ip,eid,h,w,min,max,c1,c2,ltext,cpos){
	this.type = "bar";
	this.args = arguments;
  this.id = wid;
  this.imgid = "img"+wid;
  this.draw = function(response) {
  	var bval = Math.max(Math.min(response,max),min);
    if (w*1 > h*1){
      document.getElementById(this.imgid).style.width = w * (bval-min) / (max-min);
    }else{
      document.getElementById(this.imgid).style.height = h * (bval-min) / (max-min);
    }
  };
  // If there's a custom function for this widget, execute it
  if (typeof(cfunc[wid]) == "undefined") {
    this.redraw = function(response) {
    	this.draw(response)};
  }else{
    this.redraw = function(response) {
    	this.draw(cfunc[wid](response))};
  }
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  newdiv.style.height = h;
  newdiv.style.width = w;
  newdiv.style.border = "solid";
  newdiv.style.borderWidth = 1;
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;
  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  if (c2) {
    newdiv.style.backgroundColor = c2;
  }
  document.getElementById("MyDiv").appendChild(newdiv);
  var newimg = document.createElement('div');
  newimg.setAttribute('id',this.imgid);
  newimg.style.position = "absolute";
  newimg.style.height = h;
  newimg.style.width = w;
  newimg.style.bottom="0";
  newimg.style.backgroundColor = c1;
  //newdiv.addEventListener("mousedown",onDivMouseDown, true);
  //newdiv.addEventListener("mouseup",onMouseUp, true);
  newdiv.appendChild(newimg);
  //if (cpos) {
  //  var compass = cpos;
  //}else{
  //  var compass = "w";
  //}
  if (ltext){
    addlabel (lp-5, tp*1+newdiv.clientHeight-4, "w", 13+"px", "", "Arial", ltext);
    //addlabel (lp-5, tp*1+10, "w", 14+"px", "", "Arial", ltext);
  }

}

//Set Bar widget - displays simple bar graphic
//Extra parameters: height, width, min, max, and label.
//If width > height, it's drawn as a horizontal bar, otherwise vertical.
//The containing div has a border. The internal div drawn with a width (or height)
//proportional to the reading (compared to min and max).
//Clicking on the bar sets the value of the associated element.
function setbarwidget(wid,lp,tp,ip,eid,h,w,min,max,c1,c2,ltext,cpos){
	this.type = "setbar";
	this.args = arguments;
  this.id = wid;
  this.imgid = "img"+wid;
  this.redraw = function(response) {
  	var bval = Math.max(Math.min(response,max),min);
    if (w*1 > h*1){
      document.getElementById(this.imgid).style.width = w * (bval-min) / (max-min);
    }else{
      document.getElementById(this.imgid).style.height = h * (bval-min) / (max-min);
    }
  };
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  newdiv.style.height = h;
  newdiv.style.width = w;
  newdiv.style.border = "solid";
  newdiv.style.borderWidth = 1;
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;
  newdiv.onclick = function(evt){
  	var value;
  	if (h*1 > w*1){
  		//var cy = (h-(evt.clientY+document.body.scrollTop-tp));
  		//var scale = (max-min)/(h-1);
  		//var value = cy * scale;
  		//value += min*1;
  		value = (h-(evt.clientY+document.body.scrollTop-tp))*(max-min)/(h-1)+min*1;
  	}else{
  		value = ((evt.clientX+document.body.scrollLeft-lp))*(max-min)/(w-1)+min*1;		
  	}
  	value = Math.min(value,max);
  	value = Math.max(value,min);
		loadXMLDoc(wid,'set',ip,eid,value);
  }; 
  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  if (c2) {
    newdiv.style.backgroundColor = c2;
  }
  document.getElementById("MyDiv").appendChild(newdiv);
  var newimg = document.createElement('div');
  newimg.setAttribute('id',this.imgid);
  newimg.style.position = "absolute";
  newimg.style.height = h;
  newimg.style.width = w;
  newimg.style.bottom="0";
  newimg.style.backgroundColor = c1;
  newdiv.appendChild(newimg);
  //if (cpos) {
  //  var compass = cpos;
  //}else{
  //  var compass = "w";
  //}
  if (ltext){
    addlabel (lp-5, tp*1+newdiv.clientHeight-4, "w", 13+"px", "", "Arial", ltext);
    //addlabel (lp-5, tp*1+10, "w", 14+"px", "", "Arial", ltext);
  }

}

// Indicator light widget - displays colored rectangle
// Extra parameters: height, width, off color, on color
// The containing div has a border. We simply set the div background color
function lightwidget(wid,lp,tp,ip,eid,h,w,coff,con,ltext){
	this.type = "light";
	this.args = arguments;
  this.id = wid;
  this.off = coff;
  this.on = con;
  this.redraw = function(response) {
    if (response == 0){
      document.getElementById(this.id).style.backgroundColor = this.off;
    }else{
      document.getElementById(this.id).style.backgroundColor = this.on;
    }
  };
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };
  // Create widget
  var newdiv = document.createElement('div');
  newdiv.setAttribute('id',wid);
  newdiv.style.position = "absolute";
  newdiv.style.top = tp;
  newdiv.style.left = lp;
  newdiv.style.height = h;
  newdiv.style.width = w;
  newdiv.style.border = "solid";
  newdiv.style.borderWidth = 1;
  newdiv["id"]=wid;
  newdiv["dragx"]=lp;
  newdiv["dragy"]=tp;
  newdiv.addEventListener("mousedown",mouseDown, false);
  newdiv.addEventListener("mouseup",mouseUp, false);
  newdiv.addEventListener("mousemove",mouseMove, false);
  document.getElementById("MyDiv").appendChild(newdiv);
  // If label text is specified, make label font 6 pixels shorter than text box height
  // Offset baseline up by 4 pixels to give space for descenders
  if (ltext){
  	addlabel (lp-5, tp*1+10, "w", 13+"px", "", "Arial", ltext);
    //addlabel (lp-5, tp*1+newdiv.clientHeight-4, "w", Math.max((newdiv.clientHeight-6),10)+"px", "", "Arial", ltext);
  }
}

// Label Widget. Displays text.
// Extra parameters: 
// Does not create div, no dynamic methods.
// Ignores wid, ip, and eid parameters.
function labelwidget(wid,lp,tp,ip,eid,fsize,ldir,ltext){
	this.type = "label";
	this.args = arguments;
  this.id = wid;
  // Create widget
  var text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text2.setAttribute("x",lp);
  text2.setAttribute("y",tp);
  text2["id"]=wid;
  text2["dragx"]=lp;
  text2["dragy"]=tp;
  text2.setAttribute("version", "1.1");
  text2.addEventListener("mousedown",mouseDown, false);
  text2.addEventListener("mouseup",mouseUp, false);
  text2.addEventListener("mousemove",mouseMove, false);
  switch (ldir) {
    case "s":
      pos = "middle";
      break;
    case "n":
      pos = "middle";
      break;
    case "e":
      pos = "start";
      break;
    default:
      pos = "end";
  }
  text2.setAttribute("fill","black");  
  text2.setAttribute("text-anchor",pos);
  text2.setAttribute("font-family","Verdana");
  text2.setAttribute("font-size",fsize);
  text2.setAttribute("font-weight","bold");
  text2.textContent = ltext;
  svgCanvas.appendChild(text2);
}

// Dial widget - displays dial using SVG
// Dial span is 270 degrees. 0 degrees is bottom center, increases clockwise.
// h and w are height and width. Should be even numbers, should be equal.
// lval and hval define the endpoints of the scale in user units
// Dial face has three colors passed as c1,c2,c3.
// c1val is the boundary between c1 and c2, and c2val is the boundary between c2 and c3
// c1val and c2val are in user units
// ltext is displayed below dial
function dialwidget(wid,lp,tp,ip,eid,h,w,lval,hval,c1,c1val,c2,c2val,c3,ltext){
	this.type = "dial";
	this.args = arguments;
	this.argtypes = ['n','n','n','n','c','n','c','n','c','t20'];
	this.argnames = ['height','width','min','max','color 1','limit 1','color 2','limit 2','color 3','label'];
  this.id = wid;
  this.hval=hval;
  this.lval=lval;
  this.range = hval-lval;
  this.cx = w / 2;
  this.cy = h / 2;
  this.gfradius = w / 2 - 5;
  var needle = 40;
  var nx = -1 * (this.cx-6) * Math.sin(needle/180*Math.PI);
  var ny = (this.cy-6) * Math.cos(needle/180*Math.PI);
  var d="M35,35 l0,-25";
  this.draw = function(response) {
    // Redraw the needle and the text content. Peg needle at ends
    needle = ((response-this.lval) / this.range) * 270 + 45;
  	if(response*1 < this.lval){
  		needle = ((this.range * -.02) / this.range) * 270 + 45;
  	}
  	if(response*1 > this.hval){
  		needle = ((this.range*1.02) / this.range) * 270 + 45;
  	}
    nx = -1 * (this.cx-6) * Math.sin(needle/180*Math.PI);
    ny = (this.cy-6) * Math.cos(needle/180*Math.PI); 
    d = "M" + this.cx + "," + this.cy + " l" + nx + "," + ny;
    arc3.setAttribute("d", d);
    var val = response*1;
    if(val >= 100){
    	val = val.toFixed(0);
    }else{
    	val = val.toFixed(1);
    }
    text1.textContent = val;
  };
  // If there's a custom function for this widget, execute it
  if (typeof(cfunc[wid]) == "undefined") {
    this.redraw = function(response) {
    	this.draw(response)};
  }else{
    this.redraw = function(response) {
    	this.draw(cfunc[wid](response))};
  }
  this.update = function() { loadXMLDoc(wid,'get',ip,eid,0); };

  // Draw arc segment from start value to end value in color c
  this.drawarc = function(s_val,e_val,c) {
    // arc segment
    var cstart = ((s_val-lval) / this.range * 270 + 45)/180*Math.PI;
    var sx = this.cx - (this.cx-5) * Math.sin(cstart);
    var sy = this.cy + (this.cy-5) * Math.cos(cstart);
    // Brain dead SVG only allows arc as elliptical path. User can't specify focii.
    // SVG engine calcualtes center from endpoints and radii. At angles near 180, 
    // rounding errors contribute to huge errors in calculation of focii.
    // Solution is to draw arc in small segments (.5 radians).
    // cstep starts at .5 radians beyond old climit
    var cstep = cstart + .5;
    var climit = ((e_val-lval) / this.range * 270 + 45)/180*Math.PI;
    var ex = 0;
    var ey = 0;
    d = "M" + sx + "," + sy;
    while (cstep < climit){
      ex = this.cx - (this.cx-5) * Math.sin(cstep);
      ey = this.cy + (this.cy-5) * Math.cos(cstep);
      d += " A" + this.gfradius + "," + this.gfradius + " 0 0,1 " + ex + "," + ey;
      cstep += .5;
    }
    ex = this.cx - (this.cx-5) * Math.sin(climit);
    ey = this.cy + (this.cy-5) * Math.cos(climit);
    d += " A" + this.gfradius + "," + this.gfradius + " 0 0,1 " + ex + "," + ey;
    var arc2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arc2.setAttribute("d", d);
    arc2.setAttribute("fill", "none");
    arc2.setAttribute("stroke", c);
    arc2.setAttribute("stroke-width", "4");
    svg.appendChild(arc2);
  };

  // Draw a tick mark at value
  this.drawtick = function (tval) {
    var cstart = ((tval-lval) / this.range * 270 + 45)/180*Math.PI;
    //nx = -1 * (this.cx-6) * Math.sin(needle/180*Math.PI);
    //ny = (this.cy-6) * Math.cos(needle/180*Math.PI); 
    sx = this.cx - (this.cx-9) * Math.sin(cstart);
    sy = this.cy + (this.cy-9) * Math.cos(cstart);
    ex = -5 * Math.sin(cstart);
    ey = 5 * Math.cos(cstart);
    //ex = 5;
    //ey =5;
    d = "M" + sx + "," + sy + " l" + ex + "," + ey;
    var tick = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tick.setAttribute("d", d);
    tick.setAttribute("stroke", "black");
    tick.setAttribute("stroke-width", "1");
    svg.appendChild(tick);

  };
 
  // Container SVG element
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", w);
  // Extra height for legend
  svg.setAttribute("height", h*1+20);
  svg.setAttribute("x", lp);
  svg.setAttribute("y", tp);
  svg["id"]=wid;
  svg["dragx"]=lp;
  svg["dragy"]=tp;
  svg.setAttribute("version", "1.1");
  svg.addEventListener("mousedown",mouseDown, false);
  svg.addEventListener("mouseup",mouseUp, false);
  svg.addEventListener("mousemove",mouseMove, false);

  // Dial Gauge background
  var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", this.cx);
  circle.setAttribute("cy", this.cy);
  circle.setAttribute("r", this.cx - 2);
  circle.setAttribute("fill", "black");
  circle.setAttribute("stroke-width", 1);
  circle.setAttribute("stroke", "black");
  //circle.setAttribute("pointer-events","visible");
  svg.appendChild(circle);
  // Center of dial pointer
  circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", this.cx);
  circle.setAttribute("cy", this.cy);
  circle.setAttribute("r", 4);
  circle.setAttribute("fill", "red");
  svg.appendChild(circle);

  // Arc segments
  this.drawarc(lval,c1val,c1);
  this.drawarc(c1val,c2val,c2);
  this.drawarc(c2val,hval,c3);

  // Ticks
  for (var i=0; i<10; i++){
    this.drawtick(lval*1 + (i*this.range/10));
  }
  this.drawtick(hval);
  
  // Needle
  d = "M" + this.cx + "," + this.cy + " l" + nx + "," + ny;
  var arc3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arc3.setAttribute("d", d);
  arc3.setAttribute("stroke", "red");
  arc3.setAttribute("stroke-width", "2");
  svg.appendChild(arc3);

  //bezel
  var circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle2.setAttribute("cx", this.cx);
  circle2.setAttribute("cy", this.cy);
  circle2.setAttribute("r", this.cx - 1);
  circle2.setAttribute("fill", "none");
  circle2.setAttribute("stroke-width", 1);
  circle2.setAttribute("stroke", "black");
  //circle.setAttribute("pointer-events","visible");
  svg.appendChild(circle2);

  
  // Text
  var text1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text1.setAttribute("x",this.cx);
  text1.setAttribute("y",this.cy + 19);
  text1.setAttribute("text-anchor","middle");
  text1.setAttribute("font-family","Arial");
  text1.setAttribute("fill","white");
  text1.setAttribute("font-size",10);
  text1.setAttribute("font-weight","bold");
  text1.setAttribute("TextLength",30);
  text1.textContent = "---";
  svg.appendChild(text1);

  var text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text2.setAttribute("x",w/2);
  text2.setAttribute("y",h*1 +15);
  text2.setAttribute("text-anchor","middle");
  text2.setAttribute("font-family","Arial");
  text2.setAttribute("fill","black");
  text2.setAttribute("font-size",12);
  text2.setAttribute("font-weight","bold");
  text2.setAttribute("TextLength",w);
  text2.textContent = ltext;
  svg.appendChild(text2);


  //newdiv.appendChild(svg);
  svgCanvas.appendChild(svg);
}

function getScreenCTM(doc){
  if(doc.getScreenCTM) { return doc.getScreenCTM(); }
  
  //var root=doc
  var root = svgCanvas;
  var sCTM= root.createSVGMatrix();
  var tr= root.createSVGMatrix();
  var par=root.getAttribute("preserveAspectRatio");
  if (par==null || par=="") par="xMidYMid meet";//setting to default value
  parX=par.substring(0,4); //xMin;xMid;xMax
  parY=par.substring(4,8);//YMin;YMid;YMax;
  ma=par.split(" ");
  mos=ma[1]; //meet;slice

  //get dimensions of the viewport
  sCTM.a= 1;
  sCTM.d=1;
  sCTM.e= 0;
  sCTM.f=0;


  w=root.getAttribute("width");
  if (w==null || w=="") w=innerWidth;

  h=root.getAttribute("height");
  if (h==null || h=="") h=innerHeight;

  // Jeff Schiller:  Modified to account for percentages - I'm not 
  // absolutely certain this is correct but it works for 100%/100%
  if(w.substr(w.length-1, 1) == "%") {
      w = (parseFloat(w.substr(0,w.length-1)) / 100.0) * innerWidth;
  }
  if(h.substr(h.length-1, 1) == "%") {
      h = (parseFloat(h.substr(0,h.length-1)) / 100.0) * innerHeight;
  }

  // get the ViewBox
  vba=root.getAttribute("viewBox");
  if(vba==null) vba="0 0 "+w+" "+h;
  var vb=vba.split(" "); //get the viewBox into an array

  //--------------------------------------------------------------------------
  //create a matrix with current user transformation
  tr.a= root.currentScale;
  tr.d=root.currentScale;
  tr.e= root.currentTranslate.x;
  tr.f=root.currentTranslate.y;


  //scale factors
  sx=w/vb[2];
  sy=h/vb[3];


  //meetOrSlice
  if(mos=="slice"){
  s=(sx>sy ? sx:sy);
  }else{
  s=(sx<sy ? sx:sy);
  }

  //preserveAspectRatio="none"
  if (par=="none"){
      sCTM.a=sx;//scaleX
      sCTM.d=sy;//scaleY
      sCTM.e=- vb[0]*sx; //translateX
      sCTM.f=- vb[0]*sy; //translateY
      sCTM=tr.multiply(sCTM);//taking user transformations into acount

      return sCTM;
  }


  sCTM.a=s; //scaleX
  sCTM.d=s;//scaleY
  //-------------------------------------------------------
  switch(parX){
  case "xMid":
  sCTM.e=((w-vb[2]*s)/2) - vb[0]*s; //translateX

  break;
  case "xMin":
  sCTM.e=- vb[0]*s;//translateX
  break;
  case "xMax":
  sCTM.e=(w-vb[2]*s)- vb[0]*s; //translateX
  break;
  }
  //------------------------------------------------------------
  switch(parY){
  case "YMid":
  sCTM.f=(h-vb[3]*s)/2 - vb[1]*s; //translateY
  break;
  case "YMin":
  sCTM.f=- vb[1]*s;//translateY
  break;
  case "YMax":
  sCTM.f=(h-vb[3]*s) - vb[1]*s; //translateY
  break;
  }
  sCTM=tr.multiply(sCTM);//taking user transformations into acount

  return sCTM;
}


