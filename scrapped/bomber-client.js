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
KeyCodes.RightArrow = 39;
KeyCodes.SpaceBar = 32;


var startingCoordinates = Array({ top: 0, left: 0 }, { top: 196, left: 196 }, { top: 0, left: 196 }, { top: 196, left: 0 });

function BomberClient(player) {
	var conn;
	var gameSpeed = 2;

	var origin = $("#arena").offset();

	this.connect = function () {
		if (window.WebSocket) {
			host = (document.location.host != "" ? document.location.host : "localhost:8000");
			conn = new WebSocket("ws://" + host + "/test");
			conn.onmessage = onmessage.bind(this);
			conn.onerror = onerror.bind(this);
			conn.onclose = onclose.bind(this);
			conn.onopen = onopen.bind(this);
		}
	}

	this.drawArena = function (game) {
		$("#arena").height(game.arena.height);
		$("#arena").width(game.arena.width);
		for (var i = 0; i < game.arena.pillars.length; i++) {
			var pillar = game.arena.pillars[i];
			pillarDiv = $('<div class="pillar"></div>');
			pillarDiv.height(pillar.height);
			pillarDiv.width(pillar.width);
			$("#arena").append(pillarDiv);
			var dWidth = pillarDiv.outerWidth() - pillarDiv.width();
			if (dWidth) pillarDiv.width(pillarDiv.width() - dWidth);
			var dHeight = pillarDiv.outerHeight() - pillarDiv.height();
			if (dHeight) pillarDiv.height(pillarDiv.height() - dHeight);
			pillarDiv.offset({ top: origin.top + pillar.top, left: origin.left + pillar.left });
		}
	}


	this.init = function (data) {
		window.game = BomberGame.FromData(data.game);
		this.drawArena(window.game);
		var tempPlayer;
		for (var i = 0; i < data.game.players.length; i++) {
			if (data.game.players[i]) {
				tempPlayer = BomberPlayer.FromData(data.game.players[i]);
				this.initPlayer(tempPlayer);
				if (tempPlayer.id == data.player.id) {
					log('You are ' + tempPlayer.name, tempPlayer.color);
					window.player = tempPlayer;
				} 
			}
		}
		if (conn && conn.readyState == conn.OPEN) {
			$("#start-game-button").removeAttr('disabled');
		} else {
			log('No connection found - running offline.');
			this.startGame();
		}
	}
	this.notifyStartGame = function () {
		window.setTimeout(function () {
			log("Starting game...");
			conn.send(JSON.stringify({ type: 'start-game' }));
		}, 0);
	}


	this.initPlayer = function (data) {
		log(data.name + ' joined the game', data.color);
		var player = new BomberPlayer(data.id, data.name, data.color);
		player.position = data.position;
		var sprite = $('<div class="sprite" id="sprite_' + player.id + '">');
		sprite.offset(player.position);
		sprite.css('background-color', '#' + player.color);
		sprite.hide();
		$("#arena").append(sprite);
		player.sprite = sprite;
		window.game.addPlayer(player);
		sprite.fadeIn(500);
		return (player);
	}

	this.removePlayer = function (data) {
		var player = window.game.findPlayer(data.id);
		log(player.name + " left the game", data.color);
		window.game.removePlayer(player);
		player.sprite.fadeOut(500, function () {
			$(this).remove();
		});
		player = null;
	}

	this.startGame = function () {
		window.game.start();
		this.timerId = window.setInterval(this.animate, 10);
	}
	this.stopGame = function () {
		window.clearInterval(this.timerId)
	}

	this.startOfflineGame = function () {
		var game = new BomberGame();
		var player = new BomberPlayer(1, "Player", "cc3333");
		game.addPlayer(player);
		this.init({ game: game, player: player });
	}

	log = function (message, color) {
		$("#log").append('<div style="color: #' + color + ';"> ' + message + '</div>');
		$("#log").scrollTo('max');
	}

	onmessage = function (evt) {
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
			case 'player-changed-direction':
				window.game.updatePlayer(message.data);
				break;
			case 'player-joined':
				this.initPlayer(message.data);
				break;
			case 'player-left':
				this.removePlayer(message.data);
			default:
				alert(evt);
				if (data && data.color) {
					log(data.message, data.color);
				} else {
					log(data);
				}
		}
	}

	onerror = function () {
		log("error", arguments);
	}
	onclose = function () {
		log("closed");
	}
	onopen = function () {
		log("opened");
		var jsonData = { type: 'join-game', data: { player: player} };
		this.sendJson(jsonData);
	}

	this.sendText = function (textData) {
		setTimeout(function () { conn.send(textData) }, 0);
	}

	this.sendJson = function (jsonData) {
		setTimeout(function () { conn.send(JSON.stringify(jsonData)) }, 0);
	}

	this.sendChat = function (message) {
		var jsonData = new { type: 'chat', data: message };
		this.sendJson(jsonData);
	}

	this.animate = function () {
		window.game.updatePositions();
		for (var i = 0; i < window.game.players.length; i++) {
			var player = window.game.players[i];
			var offset = { top: origin.top + player.position.top, left: origin.left + player.position.left };
			player.sprite.offset(offset);
			player.sprite.html(offset.top + ',' + offset.left);
		}
	}
	this.notifyChangeDirection = function () {
		var jsonData = {
			id: window.player.id,
			position: window.player.position,
			velocity: window.player.velocity
		};
		log(window.player.id);
		this.sendJson({ type: 'change-direction', data: jsonData });
	}

	this.keydown = function (e) {
		switch (e.which) {
//			case KeyCodes.UpArrow: window.player.goUp(); break;
//			case KeyCodes.DownArrow: window.player.goDown(); break;
//			case KeyCodes.LeftArrow: window.player.goLeft(); break;
//			case KeyCodes.RightArrow: window.player.goRight(); break;
			case KeyCodes.UpArrow: window.player.moveUp(window.game.arena); break;
			case KeyCodes.DownArrow: window.player.moveDown(window.game.arena); break;
			case KeyCodes.LeftArrow: window.player.moveLeft(window.game.arena); break;
			case KeyCodes.RightArrow: window.player.moveRight(window.game.arena); break;
		}
		this.notifyChangeDirection();
	}
//	this.keyup = function (e) {
//		log("keyup " + e.which, window.player.color);
//		switch (e.which) {
//			case KeyCodes.UpArrow:
//			case KeyCodes.DownArrow:
//				window.player.verticalStop();
//				break;
//			case KeyCodes.LeftArrow:
//			case KeyCodes.RightArrow:
//				window.player.horizontalStop();
//				break;
//		}
//		this.notifyChangeDirection();
//	}
}

$(function () {

	var player = new BomberPlayer();
	var client = new BomberClient(player);

	$("#chat-form").submit(function () {
		var message = $("#chat-line").val();
		client.sendChat(message);
		$("#chat-line").val('');
		return (false);
	});

	$("html").bind('keydown', client.keydown.bind(client));
	//$("html").bind('keyup', client.keyup.bind(client));
	$("#start-game-button").click(function () {
		client.notifyStartGame();
	});

	$("#stop-game-button").click(function () {
		client.stopGame();
	});

	client.connect();
	//client.startOfflineGame();
});