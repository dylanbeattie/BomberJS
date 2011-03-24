function pad(n) {
	return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

function timestamp() {
	var d = new Date();
	return [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()), (d.getTime() + "").substr(-4, 4)].join(':');
};

function log(data) {
	output_log.innerHTML += timestamp() + ": " + data + "<br />";
}

var conn, recvd, connections = 0;
var output_log = document.getElementById("log");
var connect = function () {
	if (window["WebSocket"]) {
		recvd = 0;
		host = (document.location.host != "" ? document.location.host : "localhost:8000");
		conn = new WebSocket("ws://" + host + "/test");
		conn.onmessage = function (evt) { log(evt.data); };
		conn.onerror = function () { log("error", arguments); };
		conn.onclose = function () { log("closed"); };
		conn.onopen = function () { log("opened"); };
	}
};

$(function () {
	$("#send").click(function () {
		if (conn) {
			setTimeout(function () {
				conn.send("test message");
				log("<" + conn.id + "> " + "test message");
			}, 0);
		}
		return false;
	});

	$("#close").click(function () {
		if (conn) conn.close();
		return (conn = false);
	});

	$("#open").click(function () {
		if (!conn) connect();
		return false;
	});
	$("#chat-form").submit(function () {
		var message = $("#chat-line").val();
		if (message) {
			setTimeout(function () {
				conn.send(message);
			}, 0);
			$("#chat-line").val('');
		}
		return (false);
	});

	connect();
});