Function.prototype.bind = function () {
	if (arguments.length < 2 && arguments[0] === undefined) {
		return this;
	}
	var thisObj = this,
    args = Array.prototype.slice.call(arguments),
    obj = args.shift();
	return function () {
		return thisObj.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
	};
};

Function.bind = function () {
	var args = Array.prototype.slice.call(arguments);
	return Function.prototype.bind.apply(args.shift(), args);
}

function BomberClient() {
	var conn, recvd, connections = 0;
	this.connect = function (username) {
		if (window.WebSocket) {
			recvd = 0;
			host = (document.location.host != "" ? document.location.host : "localhost:8000");
			conn = new WebSocket("ws://" + host + "/test");
			conn.onmessage = onmessage.bind(this);
			conn.onerror = onerror.bind(this);
			conn.onclose = onclose.bind(this);
			conn.onopen = onopen.bind(this);
		}
	}

	log = function (message) {
		$("#log").append('<div>' + message + '</div>');
	}

	onmessage = function (evt) {
		log(evt.data);
	}
	onerror = function () {
		log("error", arguments);
	}
	onclose = function() {
		log("closed");
	}
	onopen = function () {
		log("opened");
		var data = { hi : 'there', jam: 'trousers' };
		this.sendMessage(JSON.stringify(data));
	}

	this.sendMessage = function (message) {
		log("transmitting " + message);
		if (message) {
			log(message);
			setTimeout(function () { conn.send(message); }, 0);
		}
		$("#chat-line").val('');
	}
}

var bomber = new BomberClient();

$(function () {
	$("#chat-form").submit(function () {
		var message = $("#chat-line").val();
		bomber.sendMessage(message);
		return (false);
	});
	var username = 'dylan'; //  prompt('Who are you?', 'dylan');
	bomber.connect(username);
});