import os
import time
import json
import BaseHTTPServer
import cgi

import db
import sql
from geoip import geoip
class Server(BaseHTTPServer.HTTPServer):
	def __init__(self, (HOST_NAME, PORT_NUMBER), handler, config):
		BaseHTTPServer.HTTPServer.__init__(self, (HOST_NAME, PORT_NUMBER), handler)
		self.config = config
		self.geo_helper = geoip.geoip_helper()
		bgp = self.geo_helper.query_asn_from_bgp("114.114.114.114")
	
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
		valid_action = ["neighbour", "topo", "proximity_count", "proximity_filter"]
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
		elif ( action == "topo" ):
			if post.has_key("ip"):
				ip = post["ip"].value
				helper = db.db_helper()
				result_list = json.loads(helper.query_ip_topo(ip))

				geo_helper = self.server.geo_helper
				for i in range(len(result_list)):
					record = result_list[i]
					ingress = record["source"]
					bgp = geo_helper.query_asn_from_bgp(ingress)
					geo = geo_helper.query(ingress)
					temp_dict = {}
					temp_dict["ip"] = ingress
					temp_dict["asn"] = bgp["asn"]
					temp_dict["country"] = geo["mmdb"]["country"]
					result_list[i]["in"] = temp_dict

					outgress = record["target"]
					bgp = geo_helper.query_asn_from_bgp(outgress)
					geo = geo_helper.query(outgress)
					temp_dict = {}
					temp_dict["ip"] = outgress
					temp_dict["asn"] = bgp["asn"]
					temp_dict["country"] = geo["mmdb"]["country"]
					result_list[i]["out"] = temp_dict

				result = json.dumps(result_list)
				
				self.send_response(200)
				self.end_headers()
				self.wfile.write(result)
		elif ( action == "proximity_count" ):
			ip = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			helper = sql.db_helper()
			result = helper.get_closest_ip_count(ip)
			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
		elif ( action == "proximity_filter" ):
			ip = ""
			if post.has_key("ip"):
				ip = post["ip"].value
			helper = sql.db_helper()
			ip_list = helper.get_closest_ip(ip)

			geo_helper = self.server.geo_helper
			result_list = []
			for ip in ip_list:
				temp_dict = {}
				bgp = geo_helper.query_asn_from_bgp(ip)
				geo = geo_helper.query(ip)
				temp_dict["ip"] = ip
				temp_dict["asn"] = bgp["asn"]
				temp_dict["country"] = geo["mmdb"]["country"]
				result_list.append(temp_dict)
			result = json.dumps(result_list)

			self.send_response(200)
			self.end_headers()
			self.wfile.write(result)
