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

class db_helper():
	def __init__(self):
		config = json.loads(open("config.json").read())
		address = config["db"]["address"]
		port = config["db"]["port"]
		username = config["db"]["username"]
		password = config["db"]["password"]
		self.driver = GraphDatabase.driver("bolt://%s:%s"%(address,port), auth=basic_auth(username, password))
	
	def query_ip_neighbours(self, ip):
		if not is_ip_ligit(ip):
			return None

		session = self.driver.session()
		#sys.stderr.write("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
		sys.stderr.write("MATCH (in:node)-[edge:edge]-(out:node) WHERE in.ip = \'%s\' RETURN in,out,edge\n" % (ip))
		try:
			#result = session.run("MATCH (in)-[edge:edge]->(out) WHERE in.ip = \'%s\' OR out.ip = \'%s\' RETURN in,out,edge\n" % (ip,ip))
			result = session.run("MATCH (in:node)-[edge:edge]-(:node) WHERE in.ip = \'%s\' RETURN startNode(edge) as in,endNode(edge) as out,edge\n" % (ip))
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
		sys.stderr.write("MATCH p=(in:node)-[edge:edge*1..%d]-(out:node) WHERE in.ip = \'%s\' UNWIND edge AS e RETURN {source:startNode(e).ip,target:endNode(e).ip,edge:e} AS edge limit 5001\n" % (depth,ip))
		try:
			#result = session.run("MATCH p=(in)-[edge:edge*1..3]-(out) WHERE in.ip = \'%s\' AND NOT in.ip = out.ip UNWIND edge AS e RETURN COLLECT({source:startNode(e),target:endNode(e),delay:e.delay,type:e.type}) AS edge\n" % (ip))
			result = session.run("MATCH p=(in:node)-[edge:edge*1..%d]-(out:node) WHERE in.ip = \'%s\' UNWIND edge AS e RETURN {source:startNode(e).ip,target:endNode(e).ip,edge:e} AS edge limit 5001\n" % (depth,ip))
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
			source = e["source"]
			target = e["target"]
			edge = e["edge"].properties
			if not uniq_edge_list.has_key((source,target)):
				uniq_edge_list[(source,target)] = {"edge":edge}

		return_list = []
		for k in uniq_edge_list.keys():
			edge_dict = {}
			edge_dict["source"] = k[0]
			edge_dict["target"] = k[1]
			edge_dict["edge"] = uniq_edge_list[k]["edge"]
			return_list.append(edge_dict)
	
		return json.dumps(return_list)
