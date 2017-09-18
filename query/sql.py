import mysql.connector
import json
import socket
import struct
import sys
#util routines.
#ip string, ip int transformation utils
def ip_str2int(ip):
        packedIP = socket.inet_aton(ip)
        return struct.unpack("!L", packedIP)[0]

def ip_int2str(i):
        return socket.inet_ntoa(struct.pack('!L',i))

class db_helper():
	def __init__(self):
		config = json.loads(open("config.json").read())
		host = config["mysql"]["host"]
		database = config["mysql"]["database"]
		user=  config["mysql"]["user"]
		password = config["mysql"]["password"]

		self.conn = mysql.connector.connect(host=host, database=database, user=user, password=password)
	
	def get_closest_ip(self, ip):
		ip_int = ip_str2int(ip)
		ret_list = []

		cursor = self.conn.cursor()
		sql = "SELECT * FROM node_tbl WHERE id >= \"%s\" ORDER BY id ASC limit 1" % (ip_int)
		sys.stderr.write(sql+"\n")
		cursor.execute( sql )
		for ret_int in cursor:
			ret_list.append(ip_int2str(int(ret_int[0])))

		sql = "SELECT * FROM node_tbl WHERE id < \"%s\" ORDER BY id DESC limit 1" % (ip_int)
		sys.stderr.write(sql+"\n")
		cursor.execute( sql )
		for ret_int in cursor:
			ret_list.append(ip_int2str(int(ret_int[0])))
		
		return ret_list

	def get_closest_ip_count(self, ip):
		ip_int = ip_str2int(ip)
		ret_list = []

		cursor = self.conn.cursor()
		sql = "SELECT * FROM node_tbl WHERE id >= \"%s\" ORDER BY id ASC limit 1" % (ip_int)
		sys.stderr.write(sql+"\n")
		cursor.execute( sql )
		for ret_int in cursor:
			ret_list.append(ip_int2str(int(ret_int[0])))

		sql = "SELECT * FROM node_tbl WHERE id < \"%s\" ORDER BY id DESC limit 1" % (ip_int)
		sys.stderr.write(sql+"\n")
		cursor.execute( sql )
		for ret_int in cursor:
			ret_list.append(ip_int2str(int(ret_int[0])))
		
		return len(ret_list)
#helper = db()
#helper.get_closest_ip("1111111111")
