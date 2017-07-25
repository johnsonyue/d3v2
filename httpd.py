import json
import time
import http

if __name__ == '__main__':
	HOST_NAME = "172.17.0.2"
	PORT_NUMBER = 80
	httpd = http.Server( (HOST_NAME, PORT_NUMBER), http.Handler )
	print time.asctime(), "Server Starts - %s:%s" % (HOST_NAME, PORT_NUMBER)
	try:
		httpd.serve_forever()
	except KeyboardInterrupt:
		pass
	httpd.server_close()
	print time.asctime(), "Server Stops - %s:%s" % (HOST_NAME, PORT_NUMBER)
