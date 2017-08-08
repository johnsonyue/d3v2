/*
configurable variables
global state variables
*/
var base_url = "http://10.10.11.210:9966/";
var num_page = -1;
var page_size = 50;
var page_disp = 15;
var start_page = 0;
var active_page = 0;

/*
Description:
    Initially set filter_btn and go_btn to 'disabled',
    Enabled after hitting 'set' with valid date given.
    Disabled again if hitting 'set' with invalid date given.
*/
var query_btn = d3.select("#query_btn")
    .on("click",set_source_date);
var source, date;
var num_node = -1;
init_num_node();

function init_num_node(){
	var url = base_url + "count";
	nodeNumRequest = new XMLHttpRequest();
	nodeNumRequest.open("POST", url, true);
	nodeNumRequest.onreadystatechange = function(){ 
		if(nodeNumRequest.readyState == 4 && nodeNumRequest.status == 200) {
			num_node = parseInt(nodeNumRequest.responseText);
		}
	};
	nodeNumRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	nodeNumRequest.send();
}

function is_date_time(date){
    var reg = new RegExp("^2\\d{3}(0\\d|1[0-2])([0-2]\\d|3[0-1])$");
    if (!reg.test(date)){
        return false;
    }
    return true;
}

function set_source_date(){
	source = d3.select("#source_select").node().value;
	date = d3.select("#date_text").node().value;
	if ( date == "" || (! is_date_time(date)) ){
		if (date == ""){
			d3.select("#source_label").html("using "+source+"'s data, date not yet set");
		}else{
			d3.select("#source_label").html("using "+source+"'s data, date given is invalid");
		}
		d3.select("#filter_btn").attr("disabled",true);
		d3.select("#go_btn").attr("disabled",true);
	}else{
		d3.select("#source_label").html("using "+source+"'s data, gathered on "+date);
		d3.select("#filter_btn").attr("disabled",null);
		d3.select("#go_btn").attr("disabled",null);
	}
}


/*
Description:
    press filter btn to load data.
*/
var filter_btn = d3.select("#filter_btn")
    .on("click", on_filter);

function on_filter(){
	start_page = 0;
	active_page = 0;
	query_page();
	d3.select("#prev").on("click",function(){
            start_page = 0;
            active_page = 0;
            query_page();
        });
        d3.select("#next").on("click",function(){
            start_page = num_page-page_disp;
            active_page = num_page-1;
            query_page();
        });
}

/*
action to query a page.
*/
function query_page(){
	init_num_node();
	var skip = start_page;
	var limit = page_size;
	//construct url
	var url = base_url + "filter";
	
	//construct post string.
	var ip_text = d3.select("#ip_text").node().value;
	var country_text = d3.select("#country_text").node().value;
	var asn_text = d3.select("#asn_text").node().value;
	
	params = {
		"skip":skip,
		"limit":limit
	}
	if(ip_text != ""){
		params["ip"] = ip_text;
	}
	if(country_text != ""){
		params["country"] = country_text;
	}
	if(asn_text != ""){
		params["asn"] = asn_text;
	}
	
	var post_str = $.param(params);

	//ajax
	xmlHttpRequest = new XMLHttpRequest();
	xmlHttpRequest.open("POST", url, true);
	xmlHttpRequest.onreadystatechange = on_query_page_ready;
	xmlHttpRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	xmlHttpRequest.send(post_str);
}

var ip_list;
function on_query_page_ready(){
	if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200) {
		var text = xmlHttpRequest.responseText;
		ip_list = JSON.parse(text);
		num_page = Math.ceil(num_node/page_size);
		
		refresh_table();
		refresh_nav();
	}
}

//put data into table
function refresh_table(){
	//clear old table.
	var tbl = $("#filter_table");
	tbl.find("tbody tr").remove();
	
	//make new table.
	for (var i=0; i < ip_list.length; i++){
		var row = tbl.find("tbody").append("<tr></tr>");
		//country.
		var cc;
		if (ip_list[i].country == "*"){
			cc = "un";
		}else{
			cc = ip_list[i].country.toLowerCase();
		}
		
		row.find("tr:eq(" + i.toString() + ")")
		   .append("<td>" + (active_page*page_size+i).toString() + "</td>");
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td><span class="flag-icon flag-icon-' + cc + '"></span></td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td>' + ip_list[i].ip + '</td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td>' + ip_list[i].asn + '</td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td>' + ip_list[i].country + '</td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td><a style=cursor:pointer onclick=neighbours_click(' + i.toString() + ')>' + "detail" + '</a></td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td><a style=cursor:pointer onclick=monitors_click(' + i.toString() + ')>' + "detail" + '</a></td>');
	}
}

/*
listener for neighbour, monitor cell.
*/
function neighbours_click(i){
	var url = base_url + "neighbour";
	var ip = ip_list[parseInt(i)].ip;
	console.log(ip);
	params = {
		"ip":ip,
	}
	var post_str = $.param(params);
	console.log(post_str);

	neighboursRequest = new XMLHttpRequest();
	neighboursRequest.open("POST", url, true);
	neighboursRequest.onreadystatechange = on_neighbours_ready;
	neighboursRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	neighboursRequest.send(post_str);
}

function on_neighbours_ready(){
	if(neighboursRequest.readyState == 4 && neighboursRequest.status == 200) {
		var text = neighboursRequest.responseText;
		nbr_list = JSON.parse(text);
		console.log(nbr_list);
		
		var tbl = $("#neighbour_table");
		tbl.find("tbody tr").remove();
		for (var i=0; i<nbr_list.length; i++) {
			var row = tbl.find("tbody").append("<tr></tr>");

			row.find("tr:eq("+ i.toString()+")").append('<td>'+ (i).toString()+'</td>');
			row.find("tr:eq("+ i.toString()+")").append('<td>' + nbr_list[i].in.ip + '</td>');
			row.find("tr:eq("+ i.toString()+")").append('<td>' + nbr_list[i].out.ip + '</td>');
			row.find("tr:eq("+ i.toString()+")").append('<td>' + nbr_list[i].edge.delay + '</td>');
			row.find("tr:eq("+ i.toString()+")").append('<td>' + nbr_list[i].edge.type + '</td>');
		}
		$('#neighbour_modal').modal();
	}
}

function monitors_click(i){
	return;
}

/*
refresh pager
*/
function refresh_nav(){
	//remove old page nav.
	var pages = $("#pages");
	pages.find("li").not("#prev").not("#next").remove();
		
	//make new page nav.
	var prev = 0;
	if(start_page >= page_disp){
		pages.find("li").eq(0).after('<li class="item"><a>..</a></li>');
		prev = 1;
	}
	for (var i=start_page; i<num_page && i<start_page+page_disp; i++){
		if (i+1 > 0){
			if (i!=active_page){
				pages.find("li").eq(i-start_page+prev).after("<li class='item'><a>"+(i+1).toString()+"</a></li>");
			}
			else {
				pages.find("li").eq(i-start_page+prev).after("<li class='item active'><a>"+(i+1).toString()+"</a></li>");
			}
		}
	}
	if(start_page+page_disp < num_page) {
		pages.find("li").eq(i-start_page+prev).after('<li class="item"><a>...</a></li>');
	}

	//add onclick listener.
	pages.find("li").not("#prev").not("#next").find("a").click(on_page_click);
}

function on_page_click(e){
	var html = $(this).html();
	var value = -1;
	if (html == "..."){
		value = start_page+page_disp;
		start_page = value;
	}
	else if(html == ".."){
		value = start_page-page_disp;
		start_page = value;
	}
	else{
		value= parseInt(html)-1;
	}

	active_page = value;
	query_page();
}

/*
listener for go_btn
*/
var go_btn = d3.select("#go_btn")
  .on("click", go_click);

function go_click(){
    var value = $("#go_text").val();
    var reg = new RegExp("\\d+");
    if (!reg.test(value)){
        alert("wrong page format");
        return false;
    }
    if (parseInt(value) > num_page || parseInt(value) < 1){
        alert("page number out of range");
        return false;
    }

    active_page = parseInt(value) - 1;
    start_page = active_page;

    query_page();
}

/*
topology svg
*/
function draw_topo(){
	var width = 960, height = 600;
	var topo_svg = d3.select("topo_svg")
		.attr("width",width)
		.attr("height",height);
	
	var color = d3.scaleOrdinal(d3.schemeCategory20);

	var simulation = d3.forceSimulation()
		.force("link", d3.forceLink().id(function(d) { return d.id; }))
		.force("charge", d3.forceManyBody())
		.force("center", d3.forceCenter(width / 2, height / 2));
	var link = svg.append("g")
		.attr("class", "links")
		.selectAll("line")
		.data(graph.links)
		.enter().append("line")
}
