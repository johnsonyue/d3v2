from neo4j.v1 import GraphDatabase, basic_auth
import math
import json
import sys

def is_ip_ligit(ip):
	decs=ip.split('.')
	if (len(decs)!=4):
		return False #4 decimals.
	for d in decs:
		if(d==""):
			return False
		if(int(d)>255 or int(d)<0): #not in [0-255]
			return False
		if(int(d)!=0 and d[0]=='0'): #has extra 0 pad
			return False
	return True

#say octet = 138, r = 5
#138  =  10001010b
#output: 10001000b, 
#        10001111b
def remainder_range(octet, r):
	high = octet/int(math.pow(2,8-r))
	min_oct = high*int(math.pow(2,8-r))
	max_oct = (high+1)*int(math.pow(2,8-r))-1
	return min_oct, max_oct

class db_helper():
	def __init__(self):
		config = json.loads(open("config.json").read())
		address = config["db"]["address"]
		port = config["db"]["port"]
		username = config["db"]["username"]
		password = config["db"]["password"]
		self.driver = GraphDatabase.driver("bolt://%s:%s"%(address,port), auth=basic_auth(username, password))
	
	def query_filtered_ips(self, ip, asn, country, skip, limit):
		session = self.driver.session()
		if ip != "":
			ip = "n.ip =~ \'.*" + str(ip) + ".*\'"
		if asn != "":
			asn = "n.asn = \'" + str(asn) + "\'"
		if country != "":
			country = "n.country = \'" + str(country) + "\'"

		filter_str = ""
		for s in [ip,asn,country]:
			if s != "":
				filter_str += s + " AND "
		filter_str = filter_str.strip(" AND ")
		
		if filter_str != "":
			sys.stderr.write( "MATCH (n:node) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
		else:
			sys.stderr.write( "MATCH (n:node) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		try:
			if filter_str != "":
				result = session.run( "MATCH (n:node) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
			else:
				result = session.run( "MATCH (n:node) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			result_list.append(record["n"].properties)
	
		return json.dumps(result_list)
	
	def query_fuzzy_ips(self, ip, prefix, skip, limit):
		session = self.driver.session()
		octs = ip.split(".")
		p = int(prefix) #mask length
		if p > 0 and p <= 32:
			o = p/8 #number of octs
			r = p - o*8 #remainder
			filter_str = ""
			for i in range(o):
				filter_str += "octs[%d] = \'%s\' AND " % (i,octs[i])

			if r != 0:
				min_oct, max_oct = remainder_range(int(octs[i+1]),r)
				filter_str += "octs[%d] >= \'%d\' AND octs[%d] <= \'%d\'" % (i+1,min_oct,i+1,max_oct)
			else:
				filter_str = filter_str.strip(" AND ")

		elif p == 0:
			filter_str = ""

		if filter_str != "":
			sys.stderr.write( "MATCH (n:node) WITH n,SPLIT(n.ip,\".\") AS octs WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
		else:
			sys.stderr.write( "MATCH (n:node) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		try:
			if filter_str != "":
				result = session.run( "MATCH (n:node) WITH n,SPLIT(n.ip,\".\") AS octs WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
			else:
				result = session.run( "MATCH (n:node) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			result_list.append(record["n"].properties)
	
		return json.dumps(result_list)
		
	def query_ip_neighbours(self, ip):
		if not is_ip_ligit(ip):
			return None

		session = self.driver.session()
		#sys.stderr.write("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
		sys.stderr.write("MATCH (in)-[edge:edge]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip RETURN in,out,edge\n" % (ip))
		try:
			#result = session.run("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
			result = session.run("MATCH (in)-[edge:edge]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip RETURN in,out,edge\n" % (ip))
			session.close()
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
			return json.dumps([])
		
		result_list = []
		for record in result:
			record_dict = {}
			record_dict["in"] = record["in"].properties
			record_dict["out"] = record["out"].properties
			record_dict["edge"] = record["edge"].properties
			result_list.append(record_dict)

		return json.dumps(result_list)
	
	def get_ip_topo(self, ip, depth):
		if not is_ip_ligit(ip):
			return None

		session = self.driver.session()
		#sys.stderr.write("MATCH p=(in)-[edge:edge*1..3]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip UNWIND edge AS e RETURN COLLECT({source:startNode(e).ip,target:endNode(e).ip,delay:e.delay,type:e.type})\n" % (ip))
		sys.stderr.write("MATCH p=(in)-[edge:edge*1..%d]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip UNWIND edge AS e RETURN {source:startNode(e).ip,target:endNode(e).ip,delay:e.delay,type:e.type,in:startNode(e),out:endNode(e)} AS edge limit 5001\n" % (depth,ip))
		try:
			#result = session.run("MATCH p=(in)-[edge:edge*1..3]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip UNWIND edge AS e RETURN COLLECT({source:startNode(e),target:endNode(e),delay:e.delay,type:e.type}) AS edge\n" % (ip))
			result = session.run("MATCH p=(in)-[edge:edge*1..%d]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip UNWIND edge AS e RETURN {source:startNode(e),target:endNode(e),delay:e.delay,type:e.type,in:startNode(e), out:endNode(e)} AS edge limit 5001" % (depth,ip))
			session.close()
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
			return []
	
		result_list = []
		for record in result:
			result_list.append(record)
		
		return result_list
	
	def query_ip_topo(self, ip):
		depth = 3
		while depth > 1:
			result_list = self.get_ip_topo(ip,depth)
			depth -= 1
			if len(result_list) <= 5000:
				break

		uniq_edge_list = {}
		for record in result_list:
			e = record["edge"]
			source = e["source"].properties["ip"]
			target = e["target"].properties["ip"]
			delay = e["delay"]
			edge_type = e["type"]
			ingress = e["in"].properties
			outgress = e["out"].properties
			if not uniq_edge_list.has_key((source,target)):
				uniq_edge_list[(source,target)] = {"delay":delay, "type":edge_type, "in":ingress, "out":outgress}

		return_list = []
		for k in uniq_edge_list.keys():
			edge_dict = {}
			edge_dict["source"] = k[0]
			edge_dict["target"] = k[1]
			edge_dict["delay"] = uniq_edge_list[k]["delay"]
			edge_dict["type"] = uniq_edge_list[k]["type"]
			edge_dict["in"] = uniq_edge_list[k]["in"]
			edge_dict["out"] = uniq_edge_list[k]["out"]
			return_list.append(edge_dict)
	
		return json.dumps(return_list)
	
	def query_node_count(self, ip, asn, country):
		if ip != "":
			ip = "n.ip =~ \'.*" + str(ip) + ".*\'"
		if asn != "":
			asn = "n.asn = \'" + str(asn) + "\'"
		if country != "":
			country = "n.country = \'" + str(country) + "\'"

		filter_str = ""
		for s in [ip,asn,country]:
			if s != "":
				filter_str += s + " AND "
		filter_str = filter_str.strip(" AND ")
		
		if filter_str != "":
			sys.stderr.write( "MATCH (n:node) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
		else:
			sys.stderr.write( "MATCH (n:node) RETURN COUNT(n) as count\n" )
		session = self.driver.session()
		try:
			if filter_str != "":
				result = session.run( "MATCH (n:node) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
			else:
				result = session.run( "MATCH (n:node) RETURN COUNT(n) as count\n" )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		count = 0
		for record in result:
			count = record["count"]
		return count

	def query_fuzzy_count(self, ip, prefix):
		session = self.driver.session()
		octs = ip.split(".")
		p = int(prefix) #mask length
		if p > 0 and p <= 32:
			o = p/8 #number of octs
			r = p - o*8 #remainder
			filter_str = ""
			for i in range(o):
				filter_str += "octs[%d] = \'%s\' AND " % (i,octs[i])

			if r != 0:
				min_oct, max_oct = remainder_range(int(octs[i+1]),r)
				filter_str += "octs[%d] >= \'%d\' AND octs[%d] <= \'%d\'" % (i+1,min_oct,i+1,max_oct)
			else:
				filter_str = filter_str.strip(" AND ")

		elif p == 0:
			filter_str = ""

		if filter_str != "":
			sys.stderr.write( "MATCH (n:node) WITH n,SPLIT(n.ip,\".\") AS octs WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
		else:
			sys.stderr.write( "MATCH (n:node) RETURN COUNT(n) as count\n" % (skip, limit) )

		try:
			if filter_str != "":
				result = session.run( "MATCH (n:node) WITH n,SPLIT(n.ip,\".\") AS octs WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
			else:
				result = session.run( "MATCH (n:node) RETURN COUNT(n) as count\n" % (skip, limit) )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		count = 0
		for record in result:
			count = record["count"]

		return count

	def query_router_count(self, ip, asn, country):
		if ip != "":
			ip = "n.ip =~ \'.*" + str(ip) + ".*\'"
		if asn != "":
			asn = "n.asn =~ \'.*" + str(asn) + ".*\'"
		if country != "":
			country = "n.country =~ \'.*" + str(country) + ".*\'"

		filter_str = ""
		for s in [ip,asn,country]:
			if s != "":
				filter_str += s + " AND "
		filter_str = filter_str.strip(" AND ")
		
		if filter_str != "":
			sys.stderr.write( "MATCH (n:router) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
		else:
			sys.stderr.write( "MATCH (n:router) RETURN COUNT(n) as count\n" )
		session = self.driver.session()
		try:
			if filter_str != "":
				result = session.run( "MATCH (n:router) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
			else:
				result = session.run( "MATCH (n:router) RETURN COUNT(n) as count\n" )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		count = 0
		for record in result:
			count = record["count"]
		return count

	def query_filtered_routers(self, ip, asn, country, skip, limit):
		session = self.driver.session()
		if ip != "":
			ip = "n.ip =~ \'.*" + str(ip) + ".*\'"
		if asn != "":
			asn = "n.asn =~ \'" + str(asn) + ".*\'"
		if country != "":
			country = "n.country =~ \'" + str(country) + ".*\'"

		filter_str = ""
		for s in [ip,asn,country]:
			if s != "":
				filter_str += s + " AND "
		filter_str = filter_str.strip(" AND ")
		if filter_str != "":
			filter_str += "AND "
		filter_str += "n.node_id =~ \'.*N.*\'"
		
		if filter_str != "":
			sys.stderr.write( "MATCH (n:router) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
		else:
			sys.stderr.write( "MATCH (n:router) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		try:
			if filter_str != "":
				result = session.run( "MATCH (n:router) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
			else:
				result = session.run( "MATCH (n:router) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			result_list.append(record["n"].properties)
	
		return json.dumps(result_list)

	def query_router_neighbours(self, node_id):
		session = self.driver.session()
		sys.stderr.write("MATCH (in)-[link:link]-(out) WHERE in.node_id = \'%s\' RETURN in,out,link\n" % (node_id))
		try:
			result = session.run("MATCH (in)-[link:link]-(out) WHERE in.node_id = \'%s\' RETURN in,out,link\n" % (node_id))
			session.close()
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
			return json.dumps([])
		
		result_list = []
		for record in result:
			record_dict = {}
			record_dict["in"] = record["in"].properties
			record_dict["out"] = record["out"].properties
			record_dict["link"] = record["link"].properties
			result_list.append(record_dict)

		return json.dumps(result_list)

	def get_router_topo(self, node_id, depth):
		session = self.driver.session()
		sys.stderr.write("MATCH p=(in)-[link:link*1..%d]-(out) WHERE in.node_id = \'%s\' UNWIND link AS e RETURN {source:in.node_id, target:out.node_id, a_ip:e.a_ip, b_ip:e.b_ip} AS link" % (depth,node_id))
		try:
			result = session.run("MATCH p=(in)-[link:link*1..%d]-(out) WHERE in.node_id = \'%s\' UNWIND link AS e RETURN {source:in.node_id, target:out.node_id, a_ip:e.a_ip, b_ip:e.b_ip} AS link" % (depth,node_id))
			session.close()
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
			return []
	
		result_list = []
		for record in result:
			result_list.append(record)
		
		return result_list
	
	def query_router_topo(self, node_id):
		depth = 3
		while depth > 1:
			result_list = self.get_router_topo(node_id,depth)
			depth -= 1
			if len(result_list) <= 5000:
				break

		uniq_edge_list = {}
		for record in result_list:
			e = record["link"]
			source = e["source"]
			target = e["target"]
			a_ip = e["a_ip"]
			b_ip = e["b_ip"]
			if not uniq_edge_list.has_key((source,target)):
				uniq_edge_list[(source,target)] = {"a_ip":a_ip, "b_ip":b_ip}

		return_list = []
		for k in uniq_edge_list.keys():
			edge_dict = {}
			edge_dict["source"] = k[0]
			edge_dict["target"] = k[1]
			edge_dict["a_ip"] = uniq_edge_list[k]["a_ip"]
			edge_dict["b_ip"] = uniq_edge_list[k]["b_ip"]
			return_list.append(edge_dict)
	
		return json.dumps(return_list)
