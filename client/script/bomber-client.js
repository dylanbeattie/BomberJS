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

var KeyCodes = {};
KeyCodes.UpArrow = 38;
KeyCodes.LeftArrow = 37;
KeyCodes.DownArrow = 40;
KeyCodes.RightARrow = 39;
KeyCodes.SpaceBar = 32;

var startingCoordinates = Array({top: 0, left: 0}, {top: 196,left: 196}, {top: 0,left: 196}, {top: 196,left: 0});

function BomberClient(player) {
	var conn, recvd, connections = 0;
	var sprite;

	this.connect = function () {
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

	this.init = function (data) {
		var player = BomberPlayer.FromData(data.player);
		var game = BomberGame.FromData(data.game);
		var tempPlayer;

		log('You are ' + player.name, player.color);

		window.game = game;
		window.player = player;
		for (var i = 0; i < data.game.players.length; i++) {
			tempPlayer = BomberPlayer.FromData(data.game.players[i]);
			this.initPlayer(tempPlayer);
		}
		if (data.game.players.length == 1) {
			log('You are player 1. Waiting 5 seconds for other players...');
			window.setTimeout(function () {
				log("Sending start-game signal...");
				conn.send(JSON.stringify({ type: 'start-game' }));
			}, 5000);
		}
	}

	this.initPlayer = function (player) {
		var sprite = $('<div class="sprite" id="sprite_' + player.id + '">');
		sprite.offset(player.position);
		sprite.css('background-color', '#' + player.color);
		$("#arena").append(sprite);
		player.sprite = sprite;
		sprite.player = player;
		window.game.addPlayer(player);
		return (player);
	}

	this.startGame = function () {
		window.game.start();
		window.setInterval(this.animate, 50);
	}

	this.startOfflineGame = function () {
		alert('Starting an offline game...');
		window.game = new BomberGame();
		var player = window.game.addPlayer();
		initPlayer(player);
		window.game.start();
	}


	log = function (message, color) {
		$("#log").append('<div style="color: #' + color + ';"> ' + message + '</div>');
		$("#log").scrollTo('max');
	}

	onmessage = function (evt) {
		try {
			var message = JSON.parse(evt.data);
			switch (message.type) {
				case 'error':
					log(message.data, 'ff0000');
					break;
				case 'game-init':
					this.init(message.data);
					break;
				case 'game-started':
					log("GO GO GO!");
					this.startGame();
					break;
				case 'player-joined':
					log(message.data.name + ' joined the game', message.data.color);
					var player = new BomberPlayer(message.data.id, message.data.name, message.data.color);
					player.position = message.data.position;
					this.initPlayer(player);
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
		var jsonData = { type: 'join-game', data: { player: player} };
		this.sendMessage(JSON.stringify(jsonData));
	}

	this.sendMessage = function (message) {
		if (message) {
			setTimeout(function () { conn.send(message); }, 0);
		}
		$("#chat-line").val('');
	}

	this.animate = function () {
		for (var i = 0; i < window.game.players.length; i++) {
			var player = window.game.players[i];
			player.updatePosition();
			log(player.position.top + ',' + player.position.left);
			log(player.sprite.position().top + ',' + player.sprite.position().left);
			log(player.velocity.dx + '/' + player.velocity.dy);
			player.sprite.position(player.position);
			player.sprite.html(player.position.top + ',' + player.position.left + '<br />' + player.velocity.dx + '/' + player.velocity.dy);
		}
	}

	this.keydown = function (e) {
		log("keydown " + e.which, window.player.color);
		switch (e.which) {
			case KeyCodes.UpArrow: window.player.goUp(); break;
			case KeyCodes.DownArrow: window.player.goDown(); break;
			case KeyCodes.LeftArrow: window.player.goLeft(); break;
			case KeyCodes.RightArrow: window.player.goRight(); break;
		}
	}
	this.keyup = function (e) {
		log("keyup " + e.which, window.player.color);
		switch (e.which) {
			case KeyCodes.UpArrow:
			case KeyCodes.DownArrow:
				window.player.verticalStop();
				break;
			case KeyCodes.LeftArrow:
			case KeyCodes.RightArrow:
				window.player.horizontalStop();
				break;
		}
	}
}

$(function () {
	//	var usernames = ['dylan', 'steve', 'carol', 'wayne', 'kenny', 'wendy', 'kathy', 'holly', 'ham', 'bob', 'kit', 'wayne', 'joe', 'micki', 'kelly', 'hooper']
	//	var username = usernames[Math.floor(Math.random() * usernames.length)];
	//var username = prompt("What's your name?");
	var player = new BomberPlayer();
	var client = new BomberClient(player);

	$("#chat-form").submit(function () {
		var message = $("#chat-line").val();
		var data = { username: username, message: message };
		var jsonData = JSON.stringify(data);
		client.sendMessage(jsonData);
		return (false);
	});

	$("html").bind('keydown', client.keydown);
	$("html").bind('keyup', client.keyup);

	//client.connect();
	client.startOfflineGame();
});