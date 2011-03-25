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

function BomberClient(username) {
	var conn, recvd, connections = 0;

	this.connect = function () {
		this.username = username;
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

	log = function (message, color) {
		$("#log").append('<div style="color: #' + color + ';"> ' + message + '</div>');
	}

	onmessage = function (evt) {
		try {
			var data = JSON.parse(evt.data);
			if (data && data.color) {
				log(data.message, data.color);
			} else {
				log(evt.data);
			}
		} catch (exception) {
			log(evt.data);
			log(exception.message);
		}
	}

	onerror = function () {
		log("error", arguments);
	}
	onclose = function() {
		log("closed");
	}
	onopen = function () {
		log("opened");
		var data = { type : 'join', username: username };
		this.sendMessage(JSON.stringify(data));
	}

	this.sendMessage = function (message) {
		if (message) {
			setTimeout(function () { conn.send(message); }, 0);
		}
		$("#chat-line").val('');
	}
}

$(function () {
	//	var usernames = ['dylan', 'steve', 'carol', 'wayne', 'kenny', 'wendy', 'kathy', 'holly', 'ham', 'bob', 'kit', 'wayne', 'joe', 'micki', 'kelly', 'hooper']
	//	var username = usernames[Math.floor(Math.random() * usernames.length)];
	var username = prompt("What's your name?");

	var bomber = new BomberClient(username);
	$("#chat-form").submit(function () {
		var message = $("#chat-line").val();
		var data = { username: username, message: message };
		var jsonData = JSON.stringify(data);
		bomber.sendMessage(jsonData);
		return (false);
	});
	bomber.connect();
});