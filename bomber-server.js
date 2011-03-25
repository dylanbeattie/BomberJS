var sys = require("sys");
var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var ws = require('./nodejs/node-websocket-server/lib/ws/server');
var json = require('./common/json2.js');

/* Create a static file server */
var server = http.createServer(function (request, response) {
	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);
	if (/\/$/.test(filename)) filename += 'index.html';

	path.exists(filename, function (exists) {

		sys.puts(filename);
		if (!exists) {
			response.statusCode = 404;
			response.setHeader("Content-Type", "text/html");
			filename = path.join(process.cwd(), "/errors/404.html");
			fs.readFile(filename, "binary", function (err, file) {
				if (err) {
					response.write('<h1>404 File Not Found</h1>');
					response.write('<p>To replace this error, create /errors/404.html in your nodeJS project</p>');
					response.write('<hr />');
					response.write('<p>This is a deliberately verbose error message because if it is below a certain threshold,');
					response.write('your browser will ignore it and make it look like the interwebs are broken instead.</p>');
					response.write('<p>This can be confusing when dealing with an experimental web server written in JavaScript.</p>');
					response.write('<hr />');
					response.write('<p>This is a deliberately verbose error message because if it is below a certain threshold,');
					response.write('your browser will ignore it and make it look like the interwebs are broken instead.</p>');
					response.write('<p>This can be confusing when dealing with an experimental web server written in JavaScript.</p>');
					response.write('<hr />');
					response.write('<p>This is a deliberately verbose error message because if it is below a certain threshold,');
					response.write('your browser will ignore it and make it look like the interwebs are broken instead.</p>');
					response.write('<p>This can be confusing when dealing with an experimental web server written in JavaScript.</p>');
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
			response.statusCode = 200;
			response.write(file, "binary");
			response.end();
		});
	});
})


var socketServer = ws.createServer({ server: server, debug: true });
var colors = ['ff9999', '99ff99', 'ffff99', '9999ff', '99ffff', 'ff99ff'];
var playerCount = 0;
var playerColors = {};
// Handle WebSocket Requests
socketServer.addListener("connection", function (conn) {
	// conn.send("Connection: " + conn.id);

	playerColors[conn.id] = colors[playerCount++ % colors.length];
	sys.puts('assigned ' + playerColors[conn.id] + ' to ' + conn.id);

	conn.addListener("message", function (message) {
		var responseData, responseJson;
		try {
			var data = json.JSON.parse(message);
			var username = data.username;
			switch (data.type) {
				case 'join':
					sys.puts('Player ' + username + ' joined with client ID ' + conn.id);
					responseData = { color: playerColors[conn.id], message: username + ' joined the room!' };
					break;
				default:
					responseData = { color: playerColors[conn.id], message: username + ': ' + data.message };
					break;
			}
			var responseJson = json.JSON.stringify(responseData);
			sys.puts(responseJson);
			socketServer.broadcast(responseJson);
		} catch (ex) {
			responseData = { color: playerColors[conn.id], message: '!error!' };
			conn.broadcast(responseJson);
		}


		if (message == "error") {
			conn.emit("error", "test");
		}
	});
});

socketServer.addListener("error", function () {
	console.log(Array.prototype.join.call(arguments, ", "));
});

socketServer.addListener("disconnected", function (conn) {
	server.broadcast("<" + conn.id + "> disconnected");
});

// server.listen(8081);

// sys.puts('Started BomberJS socket server on port 8081');
var port = 8000;
server.listen(port);
sys.puts("Bomber server running at http://192.168.1.8:" + port + "/");
