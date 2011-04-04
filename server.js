var sys = require("sys");
var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var ws = require('./nodejs/node-websocket-server/lib/ws/server');
var JSON = require('./common/json2.js');
var bomber = require('./common/bomber.js');



function getMimeTypeFromFilename(filename) {

	var mimeTypes = {};
	mimeTypes["js"] = "text/javascript";
	mimeTypes["png"] = "image/png";
	mimeTypes["htm.*"] = "text/html";
	mimeTypes["css"] = "text/css";
	mimeTypes["manifest"] = "text/cache-manifest";
	mimeTypes["mp3"] = "audio/mpeg";
	mimeTypes["wav"] = "audio/wav";

	for (var pattern in mimeTypes) {
		var rx = new RegExp("\." + pattern + "$", "i");
		if (rx.test && rx.test(filename)) return (mimeTypes[pattern]);
	}
	return ("text/plain");
}

/* Create a static file server */
var server = http.createServer(function (request, response) {
	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);
	// Default document support - if the path ends with /, try sending index.html instead.
	if (/\/$/.test(filename)) filename += 'index.html';
	console.log('REQUEST ' + request.connection.remoteAddress + ' ' + uri);
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
				response.setHeader("Content-Type", getMimeTypeFromFilename(filename));
				console.log('RESPONSE ' + filename + ' as ' + getMimeTypeFromFilename(filename));
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
