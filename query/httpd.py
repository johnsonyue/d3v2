import json
import time

import app

if __name__ == '__main__':
	config = json.loads(open("config.json").read())
	HOST_NAME = config["app"]["host_name"]
	PORT_NUMBER = config["app"]["port_number"]
	httpd = app.ThreadedHTTPServer( (HOST_NAME, PORT_NUMBER), app.Handler, config )
	print time.asctime(), "Server Starts - %s:%s" % (HOST_NAME, PORT_NUMBER)
	try:
		httpd.serve_forever()
	except KeyboardInterrupt:
		pass
	httpd.server_close()
	print time.asctime(), "Server Stops - %s:%s" % (HOST_NAME, PORT_NUMBER)
