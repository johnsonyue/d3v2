/*
configurable variables
global state variables
*/
var base_url = "http://10.10.11.210:9967/";
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

function init_num_node(){
	var url = base_url + "count";
	//construct post string.
	var ip_text = d3.select("#ip_text").node().value;
	var country_text = d3.select("#country_text").node().value;
	var asn_text = d3.select("#asn_text").node().value;
	
	var params = {};
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

	nodeNumRequest = new XMLHttpRequest();
	nodeNumRequest.open("POST", url, true);
	nodeNumRequest.onreadystatechange = function(){ 
		if(nodeNumRequest.readyState == 4 && nodeNumRequest.status == 200) {
			num_node = parseInt(nodeNumRequest.responseText);
		}
	};
	nodeNumRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	nodeNumRequest.send(post_str);
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
	init_num_node();
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
	var skip = start_page;
	var limit = page_size;
	//construct url
	var url = base_url + "filter";
	
	//construct post string.
	var ip_text = d3.select("#ip_text").node().value;
	var country_text = d3.select("#country_text").node().value;
	var asn_text = d3.select("#asn_text").node().value;
	
	var params = {
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
	d3.select("#loader-1").style("display","block");
}

var ip_list;
function on_query_page_ready(){
	if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200) {
		var text = xmlHttpRequest.responseText;
		ip_list = JSON.parse(text);
		num_page = Math.ceil(num_node/page_size);
		
		refresh_table();
		refresh_nav();
		d3.select("#loader-1").style("display","none");
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
		   .append('<td><a style=cursor:pointer onclick=topology_click(' + i.toString() + ')>' + "detail" + '</a></td>');
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
	var params = {
		"ip":ip,
	}
	var post_str = $.param(params);

	neighboursRequest = new XMLHttpRequest();
	neighboursRequest.open("POST", url, true);
	neighboursRequest.onreadystatechange = on_neighbours_ready;
	neighboursRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	neighboursRequest.send(post_str);
	d3.select("#loader-1").style("display","block");
}

function on_neighbours_ready(){
	if(neighboursRequest.readyState == 4 && neighboursRequest.status == 200) {
		var text = neighboursRequest.responseText;
		nbr_list = JSON.parse(text);
		if (nbr_list.length == 0){
			return;
		}
		
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
		d3.select("#loader-1").style("display","none");
		$('#neighbour_modal').modal();
	}
}

function monitors_click(i){
	get_adj(i);
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
function topology_click(i){
	get_topo(ip_list[i].ip);
}

function draw_topo(){ if(topoRequest.readyState == 4 && topoRequest.status == 200) {
	var text = topoRequest.responseText;
	var edge_list = JSON.parse(text);
	console.log(edge_list);
	
	var uniq_nodes = {};
	var links = [];
	var num_uniq_nodes = 0;
	for( var i=0; i < edge_list.length; i++ ){
		var source = edge_list[i].source;
		var target = edge_list[i].target;
		if ( !(source in uniq_nodes) ){
			uniq_nodes[source] = num_uniq_nodes;
			num_uniq_nodes++;
		}
		if ( !(target in uniq_nodes) ){
			uniq_nodes[target] = num_uniq_nodes;
			num_uniq_nodes++;
		}
		links.push({"source":uniq_nodes[source], "target":uniq_nodes[target], "type":edge_list[i].type});
	}
	
	var nodes = [];
	for( var key in uniq_nodes ){
		nodes.push({"index":uniq_nodes[key], "id":key});
	}
		
	var width = 960, height = 600;
	var topo_svg = d3.select("#topo_svg")
		.attr("width",width)
		.attr("height",height);
	
	var force = d3.layout.force()
		.nodes(nodes)
		.links(links)
		.size([width, height])
		.linkDistance([50])
		.charge([-100])
		.start();

	topo_svg.selectAll("line")
            .remove();
	var link = topo_svg.selectAll("line")
		.data(links)
		.enter().append("line")
		.style("stroke", function(d){
			if (d.type == "D"){
				return "#db213a";
			}
				return "#3498db";
		})
		.style("opacity", 0.7)
		.style("stroke-width", 1);

	topo_svg.selectAll("circle")
            .remove();
	var node = topo_svg.selectAll("circle")
		.data(nodes)
		.enter().append("circle")
		.attr("r", 5)
		.attr("fill", function(d){
			if (d.id == ip_queried){
				return "#db213a";
			}
			return "#3498db";
		})
		.call(force.drag);
	
	force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; });

		node.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; });
	});

	d3.select("#loader-1").style("display","none");
}}

var ip_queried;
function get_topo(ip){
	ip_queried = ip;
	var url = base_url + "topo";
	var params = {
		"ip":ip
	}
	var post_str = $.param(params);

	topoRequest = new XMLHttpRequest();
	topoRequest.open("POST", url, true);
	topoRequest.onreadystatechange = draw_topo;
	topoRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	topoRequest.send(post_str);
	
	scroll();
	d3.select("#loader-1").style("display","block");
}

/*
scroll to svg
*/

function scroll(){
	var element = document.getElementById("topo_svg");
	element.scrollIntoView({block: "end"});
}
