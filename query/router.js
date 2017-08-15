/*
configurable variables
global state variables
*/
var base_url = "http://10.10.11.210:9967/";
var num_page = -1;
var page_size = 25;
var page_disp = 15;
var start_page = 0;
var active_page = 0;

/*
initialize datetime picker
*/
$("#yearmonthpicker").datetimepicker({
	format: 'YYYYMM'
});

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
	var url = base_url + "router_count";
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

function set_source_date(){
	source = d3.select("#source_select").node().value;
	date = d3.select("#date_text").node().value;
	if ( date == "" || (! is_year_month(date)) ){
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

function is_year_month(date){
    var reg = new RegExp("^2\\d{3}(0\\d|1[0-2])$");
    if (!reg.test(date)){
        return false;
    }
    return true;
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
            if (start_page < 0) { start_page = 0; }
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
	var url = base_url + "router_filter";
	
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

var router_list;
function on_query_page_ready(){
	if(xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200) {
		var text = xmlHttpRequest.responseText;
		router_list = JSON.parse(text);
		num_page = Math.ceil(num_node/page_size);
		
		refresh_table();
		refresh_nav();
		d3.select("#loader-1").style("display","none");
	}
}

function ip_table(i, ip_table_div){
	var ip_list = router_list[i].ip.split(" ");
	var asn_list = router_list[i].asn.split(" ");
	var country_list = router_list[i].country.split(" ");
	
	//ip_table_div.append("<div class=\"clearfix\"><table class=\"table table-hover table-bordered col-md-10 ip_table\"></table></div>");
	ip_table_div.append("<table class=\"table table-hover table-bordered col-md-10 ip_table\"></table>");
	ip_table_div.find("table").append("<thead><tr class=\"active\"></tr></thead>");
	ip_table_div.find("thead tr").append("<th>ip</th>");
	ip_table_div.find("thead tr").append("<th>asn</th>");
	ip_table_div.find("thead tr").append("<th>country</th>");
	
	ip_table_div.find("table").append("<tbody></tbody>");
	
	for (var i=0; i < ip_list.length; i++){
		var row = ip_table_div.find("tbody").append("<tr class=\"inner_row\"></tr>");
		row.find(".inner_row:last-child")
		   .append("<td>" + ip_list[i] + "</td>");
		row.find(".inner_row:last-child")
		   .append("<td>" + asn_list[i] + "</td>");
		row.find(".inner_row:last-child")
		   .append("<td>" + country_list[i] + "</td>");
	}
}

function refresh_table(){
	//clear old table.
	var tbl = $("#filter_table");
	tbl.find("#outer_tbody tr").remove();

	//make new table.
	for (var i=0; i < router_list.length; i++){
		var row = tbl.find("#outer_tbody").append("<tr class=\"real_row\"></tr>");
		var ip_list = router_list[i].ip.split(" ");
		
		row.find(".real_row:last-child")
		   .append("<td>" + (active_page*page_size+i).toString() + "</td>");
		row.find(".real_row:last-child")
		   .append('<td>' + router_list[i].node_id + '</td>');
		row.find(".real_row:last-child")
		   .append('<td><a style=cursor:pointer data-toggle=\"collapse\" href=\"#inline_div' + i.toString() + '\" aria-expanded=\"false\" aria-controls=\"inline_div' + i.toString() + '\">' + ip_list.length + '</a></td>');
		row.find(".real_row:last-child")
		   .append('<td><a style=cursor:pointer onclick=neighbours_click(' + i.toString() + ')>' + "detail" + '</a></td>');
		row.find(".real_row:last-child")
		   .append('<td><a style=cursor:pointer onclick=topology_click(' + i.toString() + ')>' + "detail" + '</a></td>');

		var row = tbl.find("#outer_tbody").append("<tr class=\"fake_row\" style=\"display:none;\"></tr>");
		row.find(".fake_row:last-child")
		    //.append("<td colspan=\"100%\"><div class=\"well\"></div></td>");
		    .append("<td colspan=\"100%\"><div id=\"inline_div" + i.toString() + "\" class=\"collapse\"></div></td>");
		row.find(".fake_row:last-child").on('hide.bs.collapse', function () {$(this).css("display","none");});
		row.find(".fake_row:last-child").on('show.bs.collapse', function () {$(this).css("display","");});
		//ip_table_div = row.find(".fake_row:last-child div");
		ip_table_div = row.find(".fake_row:last-child div");
		ip_table(i,ip_table_div);
		
		/*
		var ip_table_div = row.find("tr:eq(" + (2*i+1).toString() + ")").find("td");
		ip_table(i,ip_table_div);
		*/
	}
}

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
listener for neighbour, monitor cell.
*/
function ip_click(i){
	//clear old table.
	var tbl = $("#filter_table");

	var row = tbl.find("#outer_tbody");
	var fake_row = row.find(".fake_row:eq("+ i.toString()+")");
	fake_row.css("display","none");
	//fake_row.collapse();
}
