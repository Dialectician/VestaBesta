// Create interactive SVG chart based on log data
// On entry, create default chart and get last two hours of data
// If any traces specified in cookie, display those. Else, display first two analog and discrete.

chart = new Object();
chart.status = "";

chart.smallX = 600;
chart.smallY = 300;

chart.mediumX = 800;
chart.mediumY = 350;

chart.largeX = 1000;
chart.largeY = 400;

chart.acWidth = chart.mediumX;
chart.acHeight = chart.mediumY;

chart.resolution = 'm';						// data resolution - l/m/h translates to 20/5/1 pixels per data point
chart.endTime = 0;								// start time in seconds (Unix timestamp)
chart.startTime = 0;							// start time in seconds (Unix timestamp)
chart.duration = 0;								// difference between start and end in seconds (calculated)
chart.interval = 0;								// Interval between datapoints in seconds (caculated)

// set duration and interval based on start, end, chart size, and desired data resolution
chart.setDuration = (function(){
	this.duration = this.endTime-this.startTime;
	this.interval = this.duration / this.acWidth;
	switch(this.resolution){
	case 'l':
		this.interval *= 20;  
		break;
	case 'm':
		this.interval *= 5;  
		break;
	}
});

var vData;
var mydata;
var elementKeys;
var paper;
var xLegend = [];
var maxdLines = 10;

var colors = ['#0080ff', '#ff5ff4', '#00ff00', '#ff0000', 
              '#ffff00', '#0000ff', '#9400c6', '#cccccc', 
              '#ff00ff', '#835530', '#ffc9e9', '#00ffff',
              '#ffb200', '#ff643f', '#636363', '#319400'];

var taHeight = 40;				// Text Area Height (above chart)
var yalWidth = 40;				// Y Axis Legend width
var keyWidth = 130;				// key width (to right of chart)
var dcaHeight = 0;				// Discrete Chart Area height (below analog area)
var xalHeight = 50;				// X axis legend height
var vmin = -10;
var vmax = 200;

//Start the whole thing - this is HTML body onload() function 
function initChart() {
	drawBackground();
	lastN(2);
}

//Draw chart background - everything that doesn't depend on data. Chart frame, buttons, icons, grid
function drawBackground(){
	// chart.acWidth and chart.acHeight are plot area within paper
	var attr = {
			font : '12px Verdana',
			'text-anchor' : 'start'
		};

	dcaHeight = maxdLines * 12;
	// Paper
	paper = Raphael("chart", 2000, taHeight + chart.acHeight
			+ xalHeight + dcaHeight + 200);

	// Chart Area Background
	//paper.rect(0, 0, chart.acWidth+yalWidth+keyWidth, chart.acHeight+taHeight+dcaHeight+100,7).attr({
	//	fill : "#b0b0b0", stroke: 'black', 'stroke-width': 2});
	paper.rect(0, 0, chart.acWidth+yalWidth+keyWidth, chart.acHeight+taHeight+dcaHeight+100,7).attr({
		fill : "#b0b0b0", stroke: 'none'});
	
	// Buttons
	makeButton(10,10,60,20,"Last 2hr ",lastN,2);
	makeButton(90,10,60,20,"Last 6",lastN,6);
	makeButton(170,10,60,20,"Last 12",lastN,12);
	makeButton(250,10,60,20,"Last 24",lastN,24);
	makeButton(330,10,60,20,"Last 48",lastN,48);

	makeIcon("larrow",5,(taHeight + chart.acHeight+ dcaHeight + 20),prevN,6);
	makeIcon("rarrow",(chart.acWidth+yalWidth+35),(taHeight + chart.acHeight+ dcaHeight + 20),nextN,6);

	var weight = chart.resolution == 'l' ? 2 : 1;
	chart.lResIcon = makeIcon("lres",(chart.acWidth+yalWidth+5),(taHeight + chart.acHeight - 35),setRes,"l",weight);
	var weight = chart.resolution == 'm' ? 2 : 1;
	chart.mResIcon = makeIcon("mres",(chart.acWidth+yalWidth+45),(taHeight + chart.acHeight - 35),setRes,"m",weight);
	var weight = chart.resolution == 'h' ? 2 : 1;
	chart.hResIcon = makeIcon("hres",(chart.acWidth+yalWidth+85),(taHeight + chart.acHeight - 35),setRes,"h",weight);

	var weight = chart.acWidth == chart.smallX ? 2 : 1;
	chart.sSizeIcon = makeIcon("rectSmall",(chart.acWidth+yalWidth+10),(taHeight + chart.acHeight - 12),setSize,"s",weight);
	var weight = chart.acWidth == chart.mediumX ? 2 : 1;
	chart.mSizeIcon = makeIcon("rectMedium",(chart.acWidth+yalWidth+42),(taHeight + chart.acHeight - 10),setSize,"m",weight);
	var weight = chart.acWidth == chart.largeX ? 2 : 1;
	chart.lSizeIcon = makeIcon("rectLarge",(chart.acWidth+yalWidth+85),(taHeight + chart.acHeight - 5),setSize,"l",weight);
	
	// Frame analog chart area
	paper.rect(yalWidth, taHeight, chart.acWidth, chart.acHeight).attr({
		fill : "black"});

	// Frame discrete chart area
	paper.rect(yalWidth, taHeight + chart.acHeight, chart.acWidth, dcaHeight).attr({
		fill : "black"});

	// Horizontal lines and Y axis labels
	for ( var i = 0; i < (vmax-vmin)/10; i++) {
		var pointy = Math.round((vmax - i*10) / (vmax - vmin) * chart.acHeight) + taHeight
				+ 0.5;
		paper.path("M" + yalWidth + " " + pointy + " H" + (chart.acWidth + yalWidth))
				.attr({
					stroke : "#222222",
					"stroke-width" : 1
				});
		paper.text(yalWidth - 5, pointy, vmin + (i+1) * 10).attr({
			'text-anchor' : 'end',
			'align' : 'right'
		});
	}
	
	for ( var i = 1; i < (chart.acWidth / 20); i++) {
		var path = "M" + (yalWidth + 0.5 + Math.round(chart.acWidth * i / (chart.acWidth / 20))) + " "
				+ taHeight + " V" + (taHeight + chart.acHeight + dcaHeight);
		paper.path(path).attr({
			stroke : "#222222",
			"stroke-width" : 1
		});
		
		// Dividing line
		paper.path("M"+(yalWidth-2)+","+(taHeight + chart.acHeight)+"h"+(chart.acWidth+4)).attr({
			'stroke' : '#b0b0b0', 'stroke-width' : 5 });			
	}
	
	paper.text(chart.acWidth+yalWidth+(keyWidth/2), taHeight + chart.acHeight + dcaHeight + 60, "Vesta System\nwww.vecs.org").attr({
		'text-anchor' : 'middle',
		'align' : 'middle',
		'font-size' : '14px',
		'font-weight' : 'bold',
		'font-style' : 'italic'
	});
}


// Draw traces (from cookie or default if necessary)
function drawTraces(){
	var j = 0;
	for(i=0; i<vData.length; i++){
		if(vData[i].plot){
			createTrace(i);
			j++;
		}
	}
	// If none, get cookie....
	if (j == 0){
	var traces = getCookie("traces");
		if(traces != ""){
			var t = JSON.parse(traces);
			for(var i = 0; i< t.length; i++){
				createTrace(t[i]);
			} 
		}else{
			createTrace(0);
			createTrace(1);		
		}
	}
}

// Utility function to extract cookie
function getCookie(cname){
var name = cname + "=";
var ca = document.cookie.split(';');
for(var i=0; i<ca.length; i++) 
  {
  var c = ca[i].trim();
  if (c.indexOf(name)==0) return c.substring(name.length,c.length);
  }
return "";
}

// Create cookie with user's traces
function setCookie(){
  var t = [];
  var j = 0;
	for (var i = 0; i <vData.length; i++){
		if(vData[i].plot){
			t[j++] = i;
		}
	}
	var c = JSON.stringify(t);
	document.cookie = "traces=" + c ;
}

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

// Return date and time formatted in US style: 12/25 11:57 AM
function makeTime(d){	
	return(d.getUsMonth() + "/" + d.getUsDay() + " " + d.getUsHours() + ":" + d.getUsMins() + d.ap);
}

// Return chart start time formatted for status display: Mar 03 2014 06:21
function startTimeString(){
	var d = new Date(chart.startTime * 1000);
	return d.toString().substring(4, 21);	
}

// Read header data from Vesta: names of all active elements. When done, load last 2 hours of data
function getElementNames() {
	displayStatus("Initializing element data...")
	if (window.XMLHttpRequest) {
		xmlhttp = new XMLHttpRequest();
	} else {
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
  var url = "http://" + window.location.host + "/cgi-bin/ctlJsonDump?header=1&start=" + chart.startTime;  
	xmlhttp.open("GET", url, true);

	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4) {
			vData = JSON.parse(this.responseText)
			elementKeys = Object.keys(vData);
			//lastN(2);
		}
	};
	xmlhttp.send();
}

// Remove menu area contents
function deleteMenu(){
	for(var i=0;i<vData.length;i++){
		if(vData[i].menuItem){
			vData[i].menuItem.remove();
			delete vData[i].menuItem;
		}
	}
}

// Prompt user for chart start time. Default to current start time
function getStartTime(){
	var d = new Date(chart.startTime * 1000);
	//var s = prompt("Please enter start time:",d.getYear() + "," + (d.getMonth+1) + "," + d.getDay() + "," +  "," + d.getHours() + "," + d.getMinutes());
	var p =   (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear();
	var s = prompt("Please enter start date:",p);
	var ds = s.split("/");
	var st = new Date(ds[2],(ds[0]-1),ds[1]);
	var ms = st.getTime() / 1000;
	chart.startTime = ms;
	chart.endTime = ms + 86400;
	chart.setDuration();
	getData();
}

// Display one or two lines of status messages, each with clickable function
function displayStatus(msg1, f1, msg2, f2) {
	if (chart.status1) {
		chart.status1.remove();
	}
	if (chart.status2) {
		chart.status2.remove();
	}
	if (msg1) {
		chart.status1 = paper.text(chart.acWidth + yalWidth + keyWidth - 50, 12,
				msg1).attr({
			'text-anchor' : 'end',
			'align' : 'right',
			'font-size' : '14px',
			'font-style' : 'italic'
		}).click(function() {
			getStartTime()
		});
	}
	if (msg2) {
		chart.status2 = paper.text(chart.acWidth + yalWidth + keyWidth - 50, 27,
				msg2).attr({
			'text-anchor' : 'end',
			'align' : 'right',
			'font-size' : '14px',
			'font-style' : 'italic'
		});
	}


}

// Process JSON chart data returned by Vesta
function processData(mydata){
	var keys = Object.keys(mydata);
	for (var j =0; j < elementKeys.length; j++){
		vData[j].max = mydata[0][vData[j].id];
		vData[j].min = mydata[0][vData[j].id];
	}
	for (var i =0; i < keys.length; i++){	
		for (var j =0; j < elementKeys.length; j++){
			vData[j].data[i] = mydata[i][vData[j].id];
			if(vData[j].data[i] > vData[j].max){
				vData[j].max = vData[j].data[i];
			}
			if(vData[j].data[i] < vData[j].min){
				vData[j].min = vData[j].data[i];
			}
		}
	}
	
	// Determine scale vales (order of magnitude) and determine analog/digital
	for(i=0;i<vData.length;i++){
		vData[i].scale = 1;
		while(vData[i].max * vData[i].scale > vmax){
			vData[i].scale = vData[i].scale * .1;
		}
		if(vData[i].io == 'i' || vData[i].io == 'o' || vData[i].name.substring(0,1) == '~'){
			vData[i].type = "discrete";
		}else{
			vData[i].type = "analog";
		}
	}
}

// Get data for selected interval from Vesta
function getData() {
	displayStatus("Loading Data....")
	// clear old traces if any.....
	if(typeof vData !== 'undefined'){
		for(i=0;i<vData.length;i++){
			vData[i].data.length=0;
			if(vData[i].trace){
				vData[i].trace.remove();
				delete vData[i].trace;
			}
			if(vData[i].trace2){
				vData[i].trace2.remove();
				delete vData[i].trace2;
			}
			if(vData[i].menuItem){
				vData[i].menuItem.remove();
				delete vData[i].menuItem;
			}
			vData[i].min = 99e99;
			vData[i].max = -99e99;
		}
	}
	getElementNames();
	if (window.XMLHttpRequest) {
		xmldata = new XMLHttpRequest();
	} else {
		xmldata = new ActiveXObject("Microsoft.XMLHTTP");
	}
  var url = "http://" + window.location.host + "/cgi-bin/ctlJsonDump?head=0&start=" + chart.startTime + "&end=" + chart.endTime + "&interval=" + chart.interval;  
	xmldata.open("GET", url, true);

	xmldata.onreadystatechange = function(nu) {
		if (this.readyState == 4) {
			mydata = JSON.parse(this.responseText);
			processData(mydata);

			drawChart();
		}
	};
	xmldata.send();
}

// update  data for selected interval from Vesta
function updateData() {
	displayStatus("Loading Data....")
	for(i=0;i<vData.length;i++){
		vData[i].data.length=0;
		if(vData[i].trace){
			vData[i].trace.remove();
			delete vData[i].trace;
		}
		if(vData[i].trace2){
			vData[i].trace2.remove();
			delete vData[i].trace2;
		}
	}	

	if (window.XMLHttpRequest) {
		xmldata = new XMLHttpRequest();
	} else {
		xmldata = new ActiveXObject("Microsoft.XMLHTTP");
	}
  var url = "http://" + window.location.host + "/cgi-bin/ctlJsonDump?head=0&start=" + chart.startTime + "&end=" + chart.endTime + "&interval=" + chart.interval;  
	xmldata.open("GET", url, true);

	xmldata.onreadystatechange = function(nu) {
		if (this.readyState == 4) {
			mydata = JSON.parse(this.responseText)
			processData(mydata);
			updateChart();
		}
	};
	xmldata.send();
}

// get data for last n hours (from present time)
function lastN(n){
	chart.endTime = Math.floor(new Date().getTime() / 1000);
	chart.startTime = chart.endTime - (n*3600);
	chart.setDuration();
	getData();
}

// Get data for next n hours from chart end time (next page of data)
function nextN(n){
	var delta = chart.endTime - chart.startTime;
	chart.startTime += delta;
	chart.endTime += delta;
	chart.endTime = Math.min(chart.endTime,Math.floor(new Date().getTime() / 1000));
	chart.startTime = Math.min(chart.startTime,Math.floor(new Date().getTime() / 1000)-delta);
	chart.setDuration();
	getData();
}

//Get data for previous n hours from chart start time (previous page of data)
function prevN(n){
	var delta = chart.endTime - chart.startTime;
	chart.startTime -= delta;
	chart.endTime -= delta;
	chart.setDuration();
	getData();
}

// Make any of several clickable icons
function makeIcon(itype, x, y, func, arg, weight){
	var preMove = "M" + x + "," + y;
	var path;
	var stroke = "black";
	var c1 = "#9cf";
	var c2 = "darkblue";
	switch (itype){
	case "larrow":
		path = preMove+"l20,-10v20z";
    break;
	case "rarrow":
		path = preMove+"l-20,-10v20z";
    break;
	case "rectSmall":
		path = preMove+"v-10h15v10z";
    break;
	case "rectMedium":
		path = preMove+"v-15h22v15z";
    break;
	case "rectLarge":
		path = preMove+"v-20h30v20z";
    break;
	case "lres":
		path = preMove+"v-7h7v-7h7v7h7v7z";
    break;
	case "mres":
		path = preMove+"v-5h4 v-5h4 v-5h4 v5h4 v5h4 v5 z";
    break;
	case "hres":
		path = preMove+"v-4h3 v-4h3 v-4h3  v-4h3  v4h3  v4h3 v4h3 v4 z";
    break;
	case "recirc":
		path = preMove+"m19.275,3.849l1.695,8.56l1.875-1.642c2.311,3.59,1.72,8.415-1.584,11.317c-2.24,1.96-5.186,2.57-7.875,1.908" +
			"l-0.84,3.396c3.75,0.931,7.891,0.066,11.02-2.672c4.768-4.173,5.521-11.219,1.94-16.279l2.028-1.775" +
			preMove+"l19.275,3.849z" +
			preMove+"m8.154,20.232c-2.312-3.589-1.721-8.416,1.582-11.317c2.239-1.959,5.186-2.572,7.875-1.909l0.842-3.398" +
			"c-3.752-0.93-7.893-0.067-11.022,2.672c-4.765,4.174-5.519,11.223-1.939,16.283l-2.026,1.772l8.26,2.812l-1.693-8.559" +
			preMove+"l8.154,20.232z";
		stroke = "none";
		c1 = "darkblue";
		c2 = "black";
		break;
	}
	//.attr({fill: "#000", stroke: "none"})
	var icon = paper.path(path).attr({
 		'fill' : c1,
	  'stroke' : stroke,
	  'stroke-width' : weight,
	  'cursor' : 'pointer'})
	  .mouseover(function(e) {icon.attr('fill', c2); })
		.mouseout(function(e) {icon.attr('fill', c1); })
		.mouseup(function(){func(arg)});
	return(icon);
}

// Make a clickable button
function makeButton(x,y,width,height,label,func,arg){
	var group = paper.set();
	var rect = paper.rect(x,y,width,height,4)
	.attr({fill: '#9cf', stroke: 'black', 'stroke-width': 1});
	var lbl = paper.text(x+width/2,y+height/2,label).attr({
		font : '12px Verdana',
		'text-anchor' : 'middle'
	});
	group.push(rect);
	group.push(lbl);
	group
		.attr({cursor: 'pointer',})
		.mouseover(function(e) {rect.attr('fill', 'lightgrey'); })
		.mouseout(function(e) {rect.attr('fill', '#9cf'); })
		.mouseup(function(){func(arg)});
}

// respond to click on size icon. Set size proerty and draw refresh icon.
function setSize(s){
	if(!chart.recirc){
		chart.recirc = makeIcon("recirc",(chart.acWidth+yalWidth+85),6,refresh,"",1);
	}
	chart.update = "all";
	chart.sSizeIcon.attr({'stroke-width':1});
	chart.mSizeIcon.attr({'stroke-width':1});
	chart.lSizeIcon.attr({'stroke-width':1});
	if(s == 's'){
		chart.acWidth = chart.smallX;
		chart.acHeight = chart.smallY;
		chart.sSizeIcon.attr({'stroke-width':2});
	}
	if(s == 'm'){
		chart.acWidth = chart.mediumX;
		chart.acHeight = chart.mediumY;
		chart.mSizeIcon.attr({'stroke-width':2});
	}
	if(s == 'l'){
		chart.acWidth = chart.largeX;
		chart.acHeight = chart.largeY;
		chart.lSizeIcon.attr({'stroke-width':2});
	}
}

// Refresh chart - either data only or entire chart
function refresh(){
	if(chart.update == "data"){
		updateData();
	}
	if(chart.update == "all"){
		deleteMenu();
		paper.remove();
		delete paper;
		drawBackground();
		drawChart();
	}
	if(chart.recirc){
		chart.recirc.remove();
		delete chart.recirc;
	}
	chart.update = "";
}

// Set chart resolution based on click on resolution icon. Display refresh icon.
function setRes(r){
	chart.lResIcon.attr({'stroke-width':1});
	chart.mResIcon.attr({'stroke-width':1});
	chart.hResIcon.attr({'stroke-width':1});
	switch(r){
	case 'l':
		chart.lResIcon.attr({'stroke-width':2});
		break;
	case 'm':
		chart.mResIcon.attr({'stroke-width':2});
	break;
	case 'h':
		chart.hResIcon.attr({'stroke-width':2});
	break;
	}
	chart.resolution = r;
	chart.setDuration();
	if(!chart.recirc){
		chart.recirc = makeIcon("recirc",(chart.acWidth+yalWidth+85),6,refresh,"",1);
	}
	if(chart.update != "all"){
		chart.update = "data";
	}
}

// Show start time and duration in status area
function showTime(){
	var dur = chart.duration;
	if(dur >= 172800){
		// Days
		dur = Math.floor(dur/86400) + " days";
	}else{ 
		if(dur >= 7200){
			dur = Math.floor(dur/3600) + " hours";
		}else{
			dur = Math.floor(dur/60) + " minutes";
		}
	}
	displayStatus("Start: " + startTimeString(), "", "Duration: " + dur, "");
}

// handle click on x axis legends. Set new start time on first click, get data for new start and end on second.
function setPeriod(legend){
	legend.attr({'font-weight' : 'bold'});
	if(chart.newStart){
		if(chart.newStart > legend.data("time")){
			chart.endTime = chart.newStart;
			chart.newStart = legend.data("time");
		}else{
			chart.endTime = legend.data("time");
		}
		chart.startTime = chart.newStart;
		delete chart.newStart;
		chart.setDuration();
		getData();
	}else{
		chart.newStart = legend.data("time");
	}
}

// Called by getData when we only need to update traces due to resolution change
function updateChart(){
	for(i=0;i<vData.length;i++){
		if(vData[i].plot){
			if(vData[i].type == "analog"){
				makeAnalogPath(i);
			}else{
				makeDigitalPath(i);
			}
		}
	}
	setPageTime();
	showTime();
}

// Called by getData when we have data with new time scale
function drawChart(type){
	var attr = {
			'text-anchor' : 'middle',
			'font-size' : '12px',
		};
	
	var i, voffset;
	//var hincrement = chart.acWidth / 40.0;
	hincrement = 10;
	// Vertical lines and x axis legend
	var hpoints = vData[0].data.length * 1;
	var dataincrement = hpoints / chart.acWidth / 20;
	var xdate;
	var ap;
	
	var d = new Date(mydata[0]["Time"] * 1000);
	var dtext = makeTime(d);

	for (i=0; i<=(chart.acWidth / 20); i++){
		d = new Date(mydata[Math.floor(i*mydata.length/((chart.acWidth / 20) + 1))]["Time"] * 1000);
		dtext = makeTime(d);
		
		// If date hasn't changed, display only time
		if (dtext.substring(0,5) == xdate){
			dtext = dtext.substring(6);
			if(dtext.substring(6) == ap){
				// am/pm hasn't changed
				dtext = dtext.substring(0,5);
				voffset = 20;
			}else{
				voffset = 29;
				ap = dtext.substring(6);
			}
		}else{
			// new date - display full string
			xdate = dtext.substring(0,5);
			ap = dtext.substring(12);
			voffset = 45;
		}
		
		// Delete old legend if any
		if(xLegend[i]){
			xLegend[i].remove();
		}
		xLegend[i] = paper.text(yalWidth + 0.5 + Math.round(chart.acWidth * i / (chart.acWidth / 20)),
				(taHeight + chart.acHeight + dcaHeight + voffset), dtext).attr(attr)
				.rotate(-90)
				.data("time",mydata[Math.floor(i*mydata.length/((chart.acWidth / 20)+1)     )]["Time"])
				.click(function(e){
					setPeriod(this)
				});
		var xl = xLegend[i].getBBox().height;
		xLegend[i].y = taHeight + chart.acHeight + dcaHeight + 5 + xl;
	}
	// Draw time as xLegend item
	setPageTime();
	showTime();

	// Create right side menu
	createMenu();
	
	// Create traces
	drawTraces();
}

// Remove old legends (key area text and color sample), draw new ones
function drawAnalogLegends(){
	var i;
  var index = 0;
  
	for(i=0;i<vData.length;i++){
		if(vData[i].type == "analog" &&  vData[i].ltext){
			vData[i].ltext.remove();
			vData[i].lpath.remove();
		}
	}
	for(i=0;i<vData.length;i++){
		if(vData[i].type == "analog" &&  vData[i].trace){
			makeAlegend(index, i, vData[i].trace.attr("stroke"));
			index++;
		}
	}
}

// Delete trace if it exists, draw it if not
function toggleTrace(element){
	if(vData[element].trace){
		deleteTrace(element);
	}else{
		createTrace(element);
	}
	setCookie();
}

// Delete trace and associated key legend. Unbold menu item.
function deleteTrace(element){
	vData[element].menuItem.attr({'font-weight' : 'normal'});
	vData[element].trace.remove();
	delete vData[element].trace;
	vData[element].ltext.remove();
	delete vData[element].ltext;
	delete vData[element].plotindex;
	delete vData[element].plot;
	
	if(vData[element].type == "analog"){
		vData[element].lpath.remove();
		delete vData[element].lpath;
		drawAnalogLegends();
	}else{
		vData[element].trace2.remove();
		delete vData[element].trace2;
	}
}

// create trace and legend, bold menu item.
function createTrace(element){
	vData[element].menuItem.attr({'font-weight' : 'bold'});
	if(vData[element].type == "analog"){
		makeAnalogPath(element);
		drawAnalogLegends();
	}else{
		makeDigitalPath(element);
		makeDlegend(element);
	}
}

// Create an entry at specified location in the menu area for this element
function createMenuItem(x,y,element,legend){
	var color = 'lightgrey';
	var color2 = 'grey';
	if(vData[element].io == 'c'){
		color = 'yellow';
	}
	if(vData[element].io == 's'){
		color = 'white';
	}
	if(vData[element].io == 'i'){
		color = 'lightgreen';
	}
	if(vData[element].io == 'o'){
		color = 'lightblue';
	}
	vData[element].menuItem  = paper.set();
	if(vData[element].plot){
		weight = "bold";
	}else{
		weight = "normal";
	}
	var rect = paper.rect(x-2,y-6,130,16)
	.attr({fill: color,'stroke-width': 0});
	var lbl = paper.text(x, (y+1), legend)
		.attr({
			'text-anchor' : 'start',
			'font-size' : '13px',
			'font-weight' : weight,
			'align' : 'left'})
		.data("element",element);
	vData[element].menuItem.push(rect);
	vData[element].menuItem.push(lbl);
	vData[element].menuItem
		.attr({cursor: 'pointer',})
		.data("element",element)
		.mouseover(function(e) {rect.attr('fill', 'darkgrey'); lbl.attr('fill', 'white') })
		.mouseout(function(e) {rect.attr('fill', color); lbl.attr('fill', 'black')})
		.mouseup(function(){toggleTrace(this.data("element"))});
}

// Create category header in menu area
function createCategoryHeader(x,y,width,height,label){
	var rect = paper.rect(x,y,width,height)
	.attr({fill: 'tan', stroke: 'black', 'stroke-width': 2});
	var lbl = paper.text(x+width/2,y+height/2,label).attr({
		font : '12px Verdana',
		'text-anchor' : 'middle'
	});
}

// Fill in menu area for all elements
function createMenu(){
	var y;
	var x;
	var j;
	var legend;
  
	x = yalWidth + chart.acWidth + keyWidth + 20;
	j = 0;
	createCategoryHeader(x,0,130,20,"Analog");
	for (var i=0; i< vData.length; i++){
		// If it's an active analog value...
		if(((vData[i].max - vData[i].min) > 0) && (vData[i].max != 1 || vData[i].min !=0)){
			y = j++ * 20 + taHeight;
			if(y+20 > chart.acHeight+taHeight+dcaHeight+100){
				x += 150;
				j = 0;
				y = j * 20 + taHeight;
				createCategoryHeader(x,0,130,20,"Analog");
			}
			createMenuItem(x,y,i,vData[i].name);
		}
	}

	x += 150;
	j = 0;
	createCategoryHeader(x,0,130,20,"Discrete");
	for (var i=0; i< vData.length; i++){		
		// If it's an active discrete value...
		if(vData[i].max == 1 && vData[i].min == 0){
			y = j++ * 20 + taHeight;
			if(y+20 > chart.acHeight+taHeight+dcaHeight+100){
				x += 150;
				j = 0;
				y = j * 20 + taHeight;
				createCategoryHeader(x,0,130,20,"Discrete");
			}
			createMenuItem(x,y,i,vData[i].name);
		}
	}

	x += 150;
	j = 0;
	createCategoryHeader(x,0,130,20,"Inactive");
	for (var i=0; i< vData.length; i++){		
		// If it's inactive
		if((vData[i].max == vData[i].min)){
			y = j++ * 20 + taHeight;
			if(y+20 > chart.acHeight+taHeight+dcaHeight+100){
				x += 150;
				j = 0;
				y = j * 20 + taHeight;
				createCategoryHeader(x,0,130,20,"Inactive");
			}
			legend = "[" + vData[i].min + "] " + vData[i].name;
			createMenuItem(x,y,i,legend);
		}
	}
}

// Make an analog legend (key area text and color sample)
function makeAlegend(index, element, color) {
	var y = index * 30 + taHeight + 10;
	var x = yalWidth + chart.acWidth + 5;
	var legend;
	
	legend = vData[element].name;
	if (vData[element].scale != 1){
		legend += "/" + Math.round(1/vData[element].scale);
	}
	vData[element].ltext = paper.text(x, y, legend).attr({
		'text-anchor' : 'start',
		'font-size' : '12px',
		'align' : 'left'
	});
	vData[element].lpath = paper.path("M" + x + " " + (y + 12) + "L" + (x + 80) + " " + (y + 12))
		.attr({
			stroke : color,
			"stroke-width" : 8
		})
		.data("element",element)
		.hover(function(){vData[this.data("element")].trace.attr({"stroke-width" : 4})},  
				function(){vData[this.data("element")].trace.attr({"stroke-width" : 2})})
		.click(function(){toggleTrace(this.data("element"))})				
		;
}

//Make a discrete legend (key area text)
function makeDlegend(element) {
	if(vData[element].ltext){
		vData[element].ltext.remove();
	}
	var y = taHeight + chart.acHeight + 6 + (vData[element].plotindex * 12);
	var x = yalWidth + chart.acWidth + 5;
	vData[element].ltext = paper.text(x, y, vData[element].name).attr({
		'text-anchor' : 'start',
		'font-size' : '11px',
		'align' : 'left'
	})
		.data("element",element)
		.click(function(){toggleTrace(this.data("element"))});
}

// Ensure we have an index value for this element
function getPlotIndex(element){
	if(vData[element].plotindex){
		return;
	}
	var i;
	var j = 0;
	// Try every possible index, starting at 0
	for (i=1;i<vData.length;i++){
		// Check each element to see if it's in use
		for (j=0;j<vData.length;j++){
			// If it's in use by our type of signal, give up and try next
			if (vData[j].plotindex == i && vData[j].type == vData[element].type) break;
		}
		// If we tried every element and it wasn't in use, take it.
		if(j == vData.length){
			vData[element].plotindex = i;
			break;
		}
	}
}

// Make a path from analog data for a given element
function makeAnalogPath(element){
	
	// Make sure we have index
	getPlotIndex(element);
	var hpoints = vData[element].data.length;
	var range = vmax - vmin;
	var hincrement = parseFloat(chart.acWidth) / (hpoints - 1);
	// First point has 'M'
	var plotval = vData[element].scale * (vData[element].data[0]);

	var pointx = yalWidth;
	var pointy = Math.round((vmax - plotval) / range * chart.acHeight) + taHeight;
	var path = "M" + pointx + " " + pointy;
	// Rest of points have 'L'
	for ( var i = 1; i < hpoints; i++) {
		plotval = vData[element].scale * (vData[element].data[i]);
		pointx = Math.round(hincrement * i) + yalWidth;
		pointy = Math.round((vmax - plotval) / range * chart.acHeight) + taHeight;
		path += "L" + pointx + " " + pointy;
	}
	vData[element].trace = paper.path(path)
	.attr({stroke : colors[vData[element].plotindex % colors.length],"stroke-width" : 2 });
	vData[element].plot = true;
}

// Make a digital indicator strip from data in given channel and bit at given y value
function makeDigitalPath(element) {
	getPlotIndex(element);
	var hpoints = vData[element].data.length;
	var hincrement = chart.acWidth / (hpoints - 1);
	var pointx;
	var path = '';
	var i = 0;

	var y = (taHeight + chart.acHeight + 6 + (vData[element].plotindex * 12));
	
	// Find first non-zero bit
	while (i < hpoints) {
		// When we find a 1, start line
		if (vData[element].data[i]) {
			pointx = Math.round(hincrement * i) + yalWidth;
			path += "M" + pointx + " " + y;
			i++;
			// Now let's find the end
			while (i < hpoints && vData[element].data[i]) {
				i++;
			}
			// End path segment
			pointx = Math.min(Math.round(hincrement * i) + yalWidth, yalWidth
					+ chart.acWidth);
			path += "L" + pointx + " " + y;
		}
		i++;
	}
	vData[element].trace = paper.path("M" + yalWidth + " " + y + " H" + (chart.acWidth + yalWidth)).attr({
		stroke : colors[vData[element].plotindex % 8],
		"stroke-width" : 1
	});
	vData[element].trace2 = paper.path(path).attr({
		stroke : colors[vData[element].plotindex % 8],
		"stroke-width" : 4
	});
	vData[element].plot = true;
}
