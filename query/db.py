from neo4j.v1 import GraphDatabase, basic_auth
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
			ip = "n.ip = \'" + str(ip) + "\'"
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
			sys.stderr.write( "MATCH (n) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
		else:
			sys.stderr.write( "MATCH (n) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
		try:
			if filter_str != "":
				result = session.run( "MATCH (n) WHERE %s RETURN n SKIP %s LIMIT %s\n" % (filter_str, skip, limit) )
			else:
				result = session.run( "MATCH (n) RETURN n SKIP %s LIMIT %s\n" % (skip, limit) )
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
		sys.stderr.write("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
		try:
			result = session.run("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			record_dict = {}
			record_dict["in"] = record["in"].properties
			record_dict["out"] = record["out"].properties
			record_dict["edge"] = record["edge"].properties
			result_list.append(record_dict)

		return json.dumps(result_list)
	
	def query_ip_topo(self, ip):
		if not is_ip_ligit(ip):
			return None

		session = self.driver.session()
		sys.stderr.write("MATCH p=(in)-[edge:edge*1..3]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' UNWIND edge AS e RETURN collect({source:startNode(e),target:endNode(e),delay:e.delay,type:e.type})\n" % (ip,ip))
		try:
			result = session.run("MATCH p=(in)-[edge:edge*1..3]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' UNWIND edge AS e RETURN collect({source:startNode(e),target:endNode(e),delay:e.delay,type:e.type}) AS edge\n" % (ip,ip))
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
	
		result_list = []
		for record in result:
			for e in record["edge"]:
				edge_dict = {}
				edge_dict["source"] = e["source"]["ip"]
				edge_dict["target"] = e["target"]["ip"]
				edge_dict["delay"] = e["delay"]
				edge_dict["type"] = e["type"]
				result_list.append(edge_dict)
	
		return json.dumps(result_list)
	
	def query_node_count(self, ip, asn, country):
		if ip != "":
			ip = "n.ip = \'" + str(ip) + "\'"
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
			sys.stderr.write( "MATCH (n) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
		else:
			sys.stderr.write( "MATCH (n) RETURN COUNT(n) as count\n" )
		session = self.driver.session()
		try:
			if filter_str != "":
				result = session.run( "MATCH (n) WHERE %s RETURN COUNT(n) as count\n" % (filter_str) )
			else:
				result = session.run( "MATCH (n) RETURN COUNT(n) as count\n" )
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		count = 0
		for record in result:
			count = record["count"]
		return count
