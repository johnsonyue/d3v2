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
	
	def query_asn_ips(self, asn, skip, limit):
		session = self.driver.session()
		try:
			result = session.run("MATCH (n) WHERE n.asn = {asn} RETURN n SKIP {skip} LIMIT {limit}", {"asn":asn, "skip":skip, "limit":limit})
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			result_list.append(record["n"].properties)
	
		return json.dumps(result_list)

	def query_geo_ips(self, country, skip, limit):
		session = self.driver.session()
		try:
			result = session.run("MATCH (n) WHERE n.country = {country} RETURN n SKIP {skip} LIMIT {limit}", {"country":country, "skip":skip, "limit":limit})
		except Exception, ex:
                        sys.stderr.write("\n" + str(ex) + "\n")
                        session.close()
                        exit(-1)
		session.close()
		
		result_list = []
		for record in result:
			result_list.append(record["n"].properties)
	
		return json.dumps(result_list)
	
	def query_ip_neighbours(self, ip, skip, limit):
		if not is_ip_ligit(ip):
			return None

		session = self.driver.session()
		try:
			result = session.run("MATCH (in)-[edge:edge*1..3]->(out) WHERE in.ip = {ip} RETURN in,out,edge SKIP {skip} LIMIT {limit}", {"ip":ip, "skip":skip, "limit":limit})
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
			record_dict["edge"] = []
			map( lambda x:record_dict["edge"].append(x.properties) , record["edge"] )
			result_list.append(record_dict)

		return json.dumps(result_list)

#helper = db_helper(config)
#result = helper.query_ip_neighbours("1.208.19.42",0,100)
#result = helper.query_geo_ips("KR",0,100)
#result = helper.query_asn_ips("3786",0,100)
#print result
