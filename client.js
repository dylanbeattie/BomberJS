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

function BomberClient(player) {
	var conn;
	var gameSpeed = 2;

	this.origin = $("#canvas").offset();

	this.connect = function () {
		if (window.WebSocket) {
			host = (document.location.host != "" ? document.location.host : "localhost:8000");
			conn = new WebSocket("ws://" + host + "/test");
			conn.onmessage = onmessage.bind(this);
			// conn.onerror = onerror.bind(this);
			conn.onclose = onclose.bind(this);
			conn.onopen = onopen.bind(this);
		}
	}

	function drawGame(game) {
		$("#canvas").width(game.arenaWidth);
		$("#canvas").height(game.arenaHeight);
	}

	this.updateCss = function (player) {
		var frameIndex = 0;
		switch ((10 * player.velocity.dx) + player.velocity.dy) {
			case 0: return;
			case -11: frameIndex = 5; break;
			case -10: frameIndex = 6; break;
			case -9: frameIndex = 7; break;
			case -1: frameIndex = 4; break;
			case 1: frameIndex = 0; break;
			case 9: frameIndex = 3; break;
			case 10: frameIndex = 2; break;
			case 11: frameIndex = 1; break;
		}
		var backgroundLeftPosition = -1 * frameIndex * player.sprite.width();
		var backgroundTopPosition = -1 * player.index * player.sprite.height();
		player.sprite.css({ backgroundPosition: backgroundLeftPosition + 'px ' + backgroundTopPosition + 'px' });
	}

	this.init = function (data) {
		window.game = BomberGame.FromData(data.game);
		drawGame(window.game);
		for (var i = 0; i < data.game.players.length; i++) {
			if (data.game.players[i]) {
				tempPlayer = this.initPlayer(data.game.players[i]);
				log("Added player " + tempPlayer + " with position " + tempPlayer.position.top + ", " + tempPlayer.position.left);
				if (tempPlayer.id == data.player.id) {
					log('Welcome, ' + tempPlayer.name, tempPlayer.color);
					window.player = tempPlayer;
				}
				this.updateCss(tempPlayer);
			}
		}
		this.startGame();
	}

	this.initPlayer = function (data) {
		log(data.name + ' joined the game', data.color);
		var player = BomberPlayer.FromData(data);
		var sprite = $('<div class="sprite" id="sprite_' + player.id + '">');
		player.sprite = sprite;
		window.game.addPlayer(player);
		sprite.offset(player.position).css({ backgroundPosition: '-32px 0px' }).hide().appendTo("#canvas").fadeIn(500);

		var backgroundLeftPosition = 0;
		var backgroundTopPosition = -1 * player.index * player.sprite.height();
		player.sprite.css({ backgroundPosition: backgroundLeftPosition + 'px ' + backgroundTopPosition + 'px' });
		return (player);
	}

	this.removePlayer = function (data) {
		var player = window.game.findPlayer(data.id);
		log(player.name + " left the game", data.color);
		window.game.removePlayer(player);
		player.sprite.fadeOut(500, function () { $(this).remove(); });
		player = null;
	}

	this.startGame = function () {
		window.game.updatePositions();
		window.gameTimerId = window.setInterval(this.animate.bind(this), 20);
	}

	this.animate = function () {
		var html = '';
		window.game.updatePositions();
		for (var i = 0; i < window.game.players.length; i++) {
			var player = window.game.players[i];
			if (player && player.position && player.velocity) {
				var offset = { top: this.origin.top + player.position.top, left: this.origin.left + player.position.left };
				player.sprite.offset(offset);
				this.updateCss(player);
			}
		}
	}

	this.logState = function () {
		for (var i = 0; i < window.game.players.length; i++) {
			html += "player[" + i + "]";
			if (window.game.players[i] == null) {
				html += " null<br />";
			} else {
				html += " = " + window.game.players[i];
				if (window.player === window.game.players[i]) html += " (that's you!)";
				html += "<br />";
				html += " - Position (" + window.game.players[i].position.top + "," + window.game.players[i].position.left + ")<br />";
				html += " - Velocity (" + window.game.players[i].velocity.dx + "," + window.game.players[i].velocity.dy + ")<br />";
			}
			html += "<br />";
		}
		$("#log").html(html);
	}
		
	log = function (message, color) {
		$("#log").append('<div style="color: #' + color + ';"> ' + message + '</div>');
		$("#log").scrollTo('max');
	}

	onmessage = function (evt) {
		var message = JSON.parse(evt.data);
		switch (message.type) {
			case 'error':
				alert(message.data);
				break;
			//log(message.data, 'ff0000'); break; 
			case 'game-init':
				this.init(message.data); break;
			case 'player-changed-direction':
				window.game.updatePlayer(message.data); break;
			case 'player-joined':
				this.initPlayer(message.data); break;
			case 'player-left':
				this.removePlayer(message.data); break;
			default:
				if (data && data.color) {
					log(data.message, data.color);
				} else {
					log(data);
				}
		}
	}

	onerror = function () {
		log(arguments[0], 'ff0000');
	}
	onclose = function () { }
	onopen = function () {
		var jsonData = { type: 'join-game', data: null };
		this.sendJson(jsonData);
	}

	this.sendText = function (textData) {
		setTimeout(function () { conn.send(textData) }, 0);
	}

	this.sendJson = function (jsonData) {
		setTimeout(function () { conn.send(JSON.stringify(jsonData)) }, 0);
	}

	this.notifyChangeDirection = function () {
		var jsonData = {
			id: window.player.id,
			position: window.player.position,
			velocity: window.player.velocity
		};
		this.sendJson({ type: 'change-direction', data: jsonData });
	}

	this.keydown = function (e) {
		if (!window.player) return;
		var oldVelocity, newVelocity;
		var oldVelocity = { dx : window.player.velocity.dx, dy: window.player.velocity.dy }; 
		switch (e.which) {
			case KeyCodes.UpArrow: window.player.goUp.call(window.player); break;
			case KeyCodes.DownArrow: window.player.goDown.call(window.player); break;
			case KeyCodes.LeftArrow: window.player.goLeft.call(window.player); break;
			case KeyCodes.RightArrow: window.player.goRight.call(window.player); break;
		}
		newVelocity = { dx : window.player.velocity.dx, dy: window.player.velocity.dy };
		if (oldVelocity.dx == newVelocity.dx && oldVelocity.dy == newVelocity.dy) return;
		this.notifyChangeDirection();
	}

	this.keyup = function (e) {
		if (!window.player) return;
		var oldVelocity, newVelocity;
		var oldVelocity = { dx: window.player.velocity.dx, dy: window.player.velocity.dy };
		switch (e.which) {
			case KeyCodes.UpArrow:
			case KeyCodes.DownArrow:
				window.player.verticalStop.call(window.player);
				break;
			case KeyCodes.LeftArrow:
			case KeyCodes.RightArrow:
				window.player.horizontalStop.call(window.player);
				break;
		}
		newVelocity = { dx: window.player.velocity.dx, dy: window.player.velocity.dy };
		if (oldVelocity.dx == newVelocity.dx && oldVelocity.dy == newVelocity.dy) return;
		this.notifyChangeDirection();
	}
}

$(function () {
	var client = new BomberClient();
	$("html").bind('keydown', client.keydown.bind(client));
	$("html").bind('keyup', client.keyup.bind(client));
	client.connect();	
});