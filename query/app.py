import os
import time
import json
import BaseHTTPServer
import cgi

import db
class Server(BaseHTTPServer.HTTPServer):
	def __init__(self, (HOST_NAME, PORT_NUMBER), handler, config):
		BaseHTTPServer.HTTPServer.__init__(self, (HOST_NAME, PORT_NUMBER), handler)
		self.config = config
	
class Handler(BaseHTTPServer.BaseHTTPRequestHandler):
	def do_HEAD(self):
		self.send_response(200)
		self.send_header("Content-type", "text/html")
		self.end_headers()
	def do_GET(self):
		config = json.loads(open("config.json").read())
		file_path = self.path.lstrip('/')
		file_path = config["app"]["root_dir"] + "/" + file_path
		if os.path.exists(file_path):
			self.send_response(200)
			suffix = file_path.split('.')[-1]
			if suffix == "css":
				self.send_header("Content-type", "text/css")
			elif suffix == "js":
				self.send_header("Content-type", "text/script")
			elif suffix == "svg":
				self.send_header("Content-type", "image/svg+xml")
			else:
				self.send_header("Content-type", "text/html")
			self.end_headers()
			self.wfile.write(open(file_path,'rb').read())
		else:
			self.send_response(404)
			self.end_headers()
			
	def do_POST(self):
		action = self.path.replace('/','')
		valid_action = ["neighbour", "filter", "count", "topo", "router_count", "router_filter", "router_neighbour", "router_topo", "fuzzy_count", "fuzzy_filter"]
		if ( action not in valid_action ):
			self.wfile.write("Invalid Action: %s" % action)
			return
		
		#get the config file from server.
		#note that the http request handler is not stateful.
		#however it can access the server data members.
		config = self.server.config
		post = cgi.FieldStorage(
			fp=self.rfile, 
			headers=self.headers,
			environ={'REQUEST_METHOD':'POST',
			'CONTENT_TYPE':self.headers['Content-Type'],
		})

		skip = 0
		if post.has_key("skip"):
			skip = int(post["skip"].value)
		limit = 100
		if post.has_key("limit"):
			limit = int(post["limit"].value)

		if ( action == "neighbour" ):
			if post.has_key("ip"):
				ip = post["ip"].value
				helper = db.db_helper()
				result = helper.query_ip_neighbours(ip)
				self.send_response(200)
				self.end_headers()
				self.wfile.write(result)
		elif ( action == "filter" ):
			ip = ""
			asn = ""
			country = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("asn"):
				asn = post["asn"].value
			if post.has_key("country"):
				country = post["country"].value
		
			helper = db.db_helper()
			result = helper.query_filtered_ips(ip, asn, country, skip, limit)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "count" ):
			ip = ""
			asn = ""
			country = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("asn"):
				asn = post["asn"].value
			if post.has_key("country"):
				country = post["country"].value

			helper = db.db_helper()
			result = helper.query_node_count(ip, asn, country)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "topo" ):
			if post.has_key("ip"):
				ip = post["ip"].value
				helper = db.db_helper()
				result = helper.query_ip_topo(ip)
				self.send_response(200)
				self.end_headers()
				self.wfile.write(result)
		elif ( action == "router_count" ):
			ip = ""
			asn = ""
			country = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("asn"):
				asn = post["asn"].value
			if post.has_key("country"):
				country = post["country"].value

			helper = db.db_helper()
			result = helper.query_router_count(ip, asn, country)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "router_filter" ):
			ip = ""
			asn = ""
			country = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("asn"):
				asn = post["asn"].value
			if post.has_key("country"):
				country = post["country"].value
		
			helper = db.db_helper()
			result = helper.query_filtered_routers(ip, asn, country, skip, limit)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "router_neighbour" ):
			if post.has_key("node_id"):
				node_id = post["node_id"].value
				helper = db.db_helper()
				result = helper.query_router_neighbours(node_id)
				self.send_response(200)
				self.end_headers()
				self.wfile.write(result)
		elif ( action == "router_topo" ):
			if post.has_key("node_id"):
				node_id = post["node_id"].value
				helper = db.db_helper()
				result = helper.query_router_topo(node_id)
				self.send_response(200)
				self.end_headers()
				self.wfile.write(result)
		elif ( action == "fuzzy_count" ):
			ip = ""
			prefix = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("prefix"):
				prefix = post["prefix"].value

			helper = db.db_helper()
			result = helper.query_fuzzy_count(ip, prefix)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "fuzzy_filter" ):
			ip = ""
			prefix = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			if post.has_key("prefix"):
				prefix = post["prefix"].value
		
			helper = db.db_helper()
			result = helper.query_fuzzy_ips(ip, prefix, skip, limit)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
