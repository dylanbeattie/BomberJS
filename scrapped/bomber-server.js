var sys = require("sys");
var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var ws = require('./nodejs/node-websocket-server/lib/ws/server');
var JSON = require('./common/json2.js');
var bomber = require('./common/bomber.js');

function setMimeTypeFromFilename(filename, response) {
	if (/\.js$/.test(filename)) {
		response.setHeader("Content-Type", "text/javascript");
	} else if (/\.png$/.test(filename)) {
		response.setHeader("Content-Type", "image/png");
	} else if (/\.htm.*$/.test(filename)) {
		response.setHeader("Content-Type", "text/html");
	} else if (/\.css$/.test(filename)) {
		response.setHeader("Content-Type", "text/css");
	}
}

/* Create a static file server */
var server = http.createServer(function (request, response) {
	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);
	// Default document support - if the path ends with /, try sending index.html instead.
	if (/\/$/.test(filename)) filename += 'index.html';

	path.exists(filename, function (exists) {
		// sys.puts(filename);
		if (!exists) {
			response.statusCode = 404;
			response.end();
			return;
		} else {
			fs.readFile(filename, "binary", function (err, file) {
				if (err) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "text/plain");
					response.write(err + "\n");
					response.end();
					return;
				}
				setMimeTypeFromFilename(filename, response);
				response.statusCode = 200;
				response.write(file, "binary");
				response.end();
			});
		}
	});
});

var socketServer = ws.createServer({ server: server, debug: false });

var bomberServer = bomber.createServer({ server: socketServer, console: console, JSON: JSON });

var port = 8000;
server.listen(port);
sys.puts("Bomber server running at http://localhost:" + port + "/");
