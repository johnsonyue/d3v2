d3.selection.prototype.moveToFront = function() {  
	return this.each(function(){
		this.parentNode.appendChild(this);
	});
};
d3.selection.prototype.moveToBack = function() {  
	return this.each(function() { 
		var firstChild = this.parentNode.firstChild; 
		if (firstChild) { 
			this.parentNode.insertBefore(this, firstChild); 
		} 
	});
};
/*
configurable variables
global state variables
*/
var base_url = "http://10.10.222.135:9966/";
var num_page = -1;
var page_size = 50;
var page_disp = 15;
var start_page = 0;
var active_page = 0;

var height = 800;
var width = document.getElementById('svg_div').getBoundingClientRect().width;
var max_radius = 35, min_radius = 5;
/*
Description:
    Initially set filter_btn and go_btn to 'disabled',
    Enabled after hitting 'set' with valid date given.
    Disabled again if hitting 'set' with invalid date given.
*/
var num_node = -1;

function init_num_node(){
	var url = base_url + "count";
	//construct post string.
	var ip_text = d3.select("#ip_text").node().value;
	
	var params = {};
	if(ip_text != ""){
		params["ip"] = ip_text;
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
	
	var params = {
		"skip":skip,
		"limit":limit
	}
	if(ip_text != ""){
		params["ip"] = ip_text;
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
		   .append('<td><span class="flag-icon flag-icon-' + cc + '"></span>&nbsp; ' + cc.toUpperCase() + '</td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td>' + ip_list[i].ip + '</td>');
		row.find("tr:eq(" + i.toString() + ")")
		   .append('<td>' + ip_list[i].asn + '</td>');
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

var degree_dict = {};
function calc_degree(){
	//calculate degree.
	degree_dict = {};
	for (var i=0; i<nodes.length; i++){
		node = nodes[i];
		degree_dict[node.id] = 0;
	}
	for (var i=0; i<links.length; i++){
		link = links[i];
		s = link["source"].id;
		if (s in degree_dict){
			degree_dict[s]++;
		}else{
			degree_dict[s] = 1;
		}
		t = link["target"].id;
		if (t in degree_dict){
			degree_dict[t]++;
		}else{
			degree_dict[t] = 1;
		}
	}
}

var nodes = [], links = [];
var nodes_info = {};
var node, link;
var force;
var radius_scale;
function draw_topo(){ if(topoRequest.readyState == 4 && topoRequest.status == 200) {
	var text = topoRequest.responseText;
	var edge_list = JSON.parse(text);
	console.log(edge_list);
	
	var uniq_nodes = {};
	nodes_info = {};
	links = [];
	var num_uniq_nodes = 0;
	var num_links = 0;
	for( var i=0; i < edge_list.length; i++ ){
		var source = edge_list[i].source;
		var target = edge_list[i].target;
		var ingress = edge_list[i].in;
		var outgress = edge_list[i].out;
		if ( !(source in uniq_nodes) ){
			uniq_nodes[source] = num_uniq_nodes;
			nodes_info[num_uniq_nodes] = ingress;
			num_uniq_nodes++;
		}
		if ( !(target in uniq_nodes) ){
			uniq_nodes[target] = num_uniq_nodes;
			nodes_info[num_uniq_nodes] = outgress;
			num_uniq_nodes++;
		}
		links.push({"source":uniq_nodes[source], "target":uniq_nodes[target], "type":edge_list[i].type, "id":num_links});
		num_links++;
	}
	
	nodes = [];
	for( var key in uniq_nodes ){
		nodes.push({"id":uniq_nodes[key], "ip":key, "child":[], "link":[]});
	}
	
	//calculate radius_scale
	radius_scale = d3.scale.linear().domain([0,nodes.length]).range([min_radius,max_radius]);
		
	var topo_svg = d3.select("#topo_svg")
		.attr("width",width)
		.attr("height",height);
	
	force = d3.layout.force()
		.nodes(nodes)
		.links(links)
		.size([width, height])
		.linkDistance([50])
		.charge([-200])
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

	//debug
	//topo_svg.selectAll(".node")
        //   .remove();
	topo_svg.selectAll("circle")
            .remove();

	/*
	var g = topo_svg.selectAll(".node")
		.data(nodes)
		.enter().append("g");
	g.append("circle")
		.attr("r", function(d){
			//return radius_scale(d.child.length);
			return radius_scale(get_child_cnt(d.child));
		})
		.attr("fill", function(d){
			if (d.ip == ip_queried){
				return "#db213a";
			}
			return "#3498db";
		})
		.attr("id", function(d){
			return d.id;
		})
		.on("mouseover",on_node_over)
		.on("mouseout",on_node_out)
		.on("click",on_node_click);
	g.append("text")
		.text(function(d){return d.id;});
	*/
	var node = topo_svg.selectAll("circle")
		.data(nodes)
		.enter().append("circle")
		.attr("r", function(d){
			//return radius_scale(d.child.length);
			return radius_scale(get_child_cnt(d.child));
		})
		.attr("fill", function(d){
			if (d.ip == ip_queried){
				return "#db213a";
			}
			return "#3498db";
		})
		.attr("id", function(d){
			return d.id;
		})
		.on("mouseover",on_node_over)
		.on("mouseout",on_node_out)
		.on("click",on_node_click)
		.call(force.drag);

	force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; });

		node.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; });
		//g.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	});
	calc_degree();

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

/*
callback for mouseover/mouseout listener of svg nodes.
*/
function on_node_over(){
	var ind = d3.select(this).attr("id");
	var i = get_index(ind);
	d3.select("#map_label").html("ip: "+nodes[i].ip+", degree: "+degree_dict[nodes[i].id]+", asn: "+nodes_info[ind].asn+", country: "+nodes_info[ind].country);
}

function on_node_out(){
	return;
}

var expand_keydown = false; //'e'
var static_keydown = false; //'s'
d3.select("#svg_div")
	.on("keydown",function(){
		if (!expand_keydown && d3.event.keyCode == 69){expand_keydown = true;} //'e'
		if (!static_keydown && d3.event.keyCode == 83){static_keydown = true;} //'s'
	})
	.on("keyup",function(){
		if (d3.event.keyCode == 69) {expand_keydown = false;} //'e'
		if (d3.event.keyCode == 83) {static_keydown = false;} //'s'
		if (d3.event.keyCode == 72) {$('#help_modal').modal();} //'h'
	});

/*
on node click.
*/
function on_node_click(d){ if (expand_keydown){
	var ind = d3.select(this).attr("id"); //here index means the identifier used by force layout.
	var i = get_index(ind); //note here index of the DOM means order in nodes array
	if (degree_dict[ind] != 1 && nodes[i]["child"].length == 0){ //shrink
		//modify data.
		var leaf_peers = {};
		var peer_links = {};
		for ( var j=0; j<links.length; j++ ){
			var link = links[j];
			if (link["source"].id == ind || link["target"].id == ind){ //peer
				var peer_ind = link["source"].id == ind ? link["target"].id : link["source"].id;
				if (degree_dict[peer_ind] != 1){ //leaf
					continue
				}

				//record node to be removed.
				var peer_i = get_index(peer_ind);
				var peer = nodes[peer_i];
				if (!(peer_ind in leaf_peers)){
					leaf_peers[peer_ind] = peer;
				}
				
				if (!(peer_ind in peer_links)){
					 peer_links[peer_ind] = {"id":links[j].id,"type":links[j].type};
				}
				//delete link
				delete links[j];
			}
		}
		
		for ( var peer_ind in leaf_peers ){
			var peer_i = get_index(peer_ind);
			var peer = leaf_peers[peer_ind];
			var peer_link = peer_links[peer_ind];
			//record peer
			nodes[i]["child"].push(peer);
			nodes[i]["link"].push(peer_link);
			//delete peer
			delete nodes[peer_i];
		}
		
		var temp = [];
		for ( var j=0; j<links.length; j++) if (links[j] != undefined) {
			temp.push(links[j]);
		}
		links = temp;

		var temp = [];
		for ( var j=0; j<nodes.length; j++) if (nodes[j] != undefined) {
			temp.push(nodes[j]);
		}
		nodes = temp;

		//update svg.
		force.nodes(nodes, function(d){return d.id;})
			.links(links, function(d){return d.id;});

		var topo_svg = d3.select("#topo_svg");

		var link = topo_svg.selectAll("line")
			.data(links, function(d){return d.id;})
			//.exit().style("stroke-opacity", 0.3);
			//.exit().style("stroke","black");
			.exit().remove();

		var node = topo_svg.selectAll("circle");
		node.data(nodes, function(d){return d.id;})
			.exit().remove();
		node.attr("fill",function(d){
				if (d.ip == ip_queried){
					return "#db213a";
				}
				if (d.child.length != 0){
					return "#90d4b4";
				}
				return "#3498db";
			})
			.attr("r", function(d){
				//return radius_scale(d.child.length);
				return radius_scale(get_child_cnt(d.child));
			});
		calc_degree();
	}
	else if (nodes[i]["child"].length != 0){ //expand
		//modify data.
		for (var j=0; j<nodes[i].child.length; j++){
			//add node.
			c = nodes[i].child[j];
			nodes.push(c);
			
			//add link.
			l = nodes[i].link[j];
			links.push({"source":nodes[i],"target":c,"type":l["type"],"id":l["id"]});
		}
		nodes[i].child = [];
		nodes[i].link = [];

		//update svg.
		force.nodes(nodes, function(d){return d.id;})
			.links(links, function(d){return d.id;});

		var topo_svg = d3.select("#topo_svg");

		var link = topo_svg.selectAll("line")
			.data(links, function(d){return d.id;})
			.enter().append("line")
			.style("stroke", function(d){
				if (d.type == "D"){
					return "#db213a";
				}
					return "#3498db";
			})
			.style("opacity", 0.7)
			.style("stroke-width", 1);

		var node = topo_svg.selectAll("circle")
			.data(nodes, function(d){return d.id;})
			.enter().append("circle")
			.on("mouseover",on_node_over)
			.on("mouseout",on_node_out)
			.on("click",on_node_click)
			.call(force.drag);
		topo_svg.selectAll("circle").attr("fill",function(d){
				if (d.ip == ip_queried){
					return "#db213a";
				}
				if (d.child.length != 0){
					return "#90d4b4";
				}
				return "#3498db";
			})
			.attr("r", function(d){
				return radius_scale(get_child_cnt(d.child));
			})
			.attr("id", function(d){
				d3.select(this).moveToFront();
				return d.id;
			})
			.attr("class", function(d){
				if (d.fixed){
					return "fixed";
				}
				return "";
			});

		force.on("tick", function() {
			topo_svg.selectAll("line").attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

			topo_svg.selectAll("circle").attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
			//g.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
		});
		
		force.resume();
		calc_degree();
	}
}
else if(static_keydown){
	if (d.fixed){
		d3.select(this).classed("fixed", d.fixed = false);
	}else{
		d3.select(this).classed("fixed", d.fixed = true);
	}
}}

function get_index(ind){
	for (var i=0; i<nodes.length; i++){
		if (nodes[i] != undefined && nodes[i].index == ind){
			return i;
		}
	}
	return -1;
}

function get_child_cnt(child_list){
	var cnt = 0;
	for (var i=0; i<child_list.length; i++){
		child = child_list[i];
		cnt += get_child_cnt(child.child) + 1;
	}
	return cnt;
}
