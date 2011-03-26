var sys = require("sys");
var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var ws = require('./nodejs/node-websocket-server/lib/ws/server');
var JSON = require('./common/json2.js');
var bomber = require('./common/bomber.js');

/* Create a static file server */
var server = http.createServer(function (request, response) {
	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);
	if (/\/$/.test(filename)) filename += 'index.html';

	path.exists(filename, function (exists) {
		// sys.puts(filename);
		if (!exists) {
			response.statusCode = 404;
			filename = path.join(process.cwd(), "/errors/404.html");
			fs.readFile(filename, "binary", function (err, file) {
				if (err) {
					response.write('<h1>404 File Not Found</h1>');
					response.write('<p>To replace this error, create /errors/404.html in your nodeJS project</p>');
					for (var i = 0; i < 100; i++) { response.write('<p>&nbsp;</p>'); }
					response.end();
					return;
				}
				response.write(file, "binary");
				response.end();
			});
			return;
		}

		fs.readFile(filename, "binary", function (err, file) {
			if (err) {
				response.statusCode = 500;
				response.setHeader("Content-Type", "text/plain");
				response.write(err + "\n");
				response.end();
				return;
			}
			if (/\.js$/.test(filename)) {
				response.setHeader("Content-Type", "text/javascript");
			} else if (/\.png$/.test(filename)) {
				response.setHeader("Content-Type", "image/png");
			} else if (/\.htm.*$/.test(filename)) {
				response.setHeader("Content-Type", "text/html");
			} else if (/\.css$/.test(filename)) {
				response.setHeader("Content-Type", "text/css");
			}

			response.statusCode = 200;
			response.write(file, "binary");
			response.end();
		});
	});
});

var socketServer = ws.createServer({ server: server, debug: true });

var bomberServer = bomber.createServer({ server: socketServer, console: console, JSON: JSON });

var port = 8000;
server.listen(port);
sys.puts("Bomber server running at http://localhost:" + port + "/");
