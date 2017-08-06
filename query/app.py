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
		valid_action = ["neighbour", "asn", "country"]
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
				result = helper.query_ip_neighbours(ip, skip, limit)
				self.wfile.write(result)
		elif ( action == "asn" ):
			if post.has_key("asn"):
				asn = post["asn"].value
				helper = db.db_helper()
				result = helper.query_asn_ips(asn, skip, limit)
				self.wfile.write(result)
		elif ( action == "country" ):
			if post.has_key("country"):
				country = post["country"].value
				helper = db.db_helper()
				result = helper.query_geo_ips(country, skip, limit)
				self.wfile.write(result)
