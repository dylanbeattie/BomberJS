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

var startingCoordinates = Array({top: 0, left: 0}, {top: 196,left: 196}, {top: 0,left: 196}, {top: 196,left: 0});

function makeSprite(coords, player, color) {
	var sprite = $('<div class="sprite" id="sprite_' + player + '">');
	sprite.offset(coords);
	sprite.css('background-color', '#' + color);
	$("#arena").append(sprite);
	return (sprite);
}
function BomberClient(username) {
	var conn, recvd, connections = 0;
	var sprite;

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
			switch (data.type) {
				case 'welcome':
					log('You are player ' + data.player, data.color);
					var coords = startingCoordinates[data.player-1];
					this.sprite = makeSprite(coords, data.player, data.color);
					break;
				case 'join':
					log('Player ' + data.player + ' joined the game', data.color);
					var coords = startingCoordinates[data.player - 1];
					makeSprite(coords, data.player, data.color);
					break;
				default:
					if (data && data.color) {
						log(data.message, data.color);
					} else {
						log(evt.data);
					}
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
	//var username = prompt("What's your name?");
	var username = '';
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