function BomberRemoteClient(conn, socketServer, game) {
	this.conn = conn;
	this.socketServer = socketServer;
	this.game = game;

	this.handleMessage = function (jsonData) {
		var message = JSON.parse(jsonData);
		switch (message.type) {
			case 'start-game':
				this.game.start();
				console.log("Received start-game from " + conn.id);
				socketServer.broadcast(JSON.stringify({ type: 'game-started' }));
				break;
			case 'join-game':
				console.log('Received join-game from ' + conn.id);
				var player = this.game.addPlayer();
				player.id = conn.id;
				console.log('Sending game-init to ' + conn.id);
				socketServer.send(conn.id, JSON.stringify({ type: 'game-init', data: { game: this.game, player: player} }));
				console.log('Broadcasting player-joined to everyone else');
				conn.broadcast(JSON.stringify({ type: 'player-joined', data: player }));
				break;
			case 'change-direction':
				this.game.updatePlayer(message.data);
				conn.broadcast(JSON.stringify({ type: 'player-changed-direction', data: message.data }));
				break;
		}
	}
	conn.addListener("message", this.handleMessage.bind(this));
}
		
	




function BomberServer(options) {
	var socketServer = options.server;
	var console = options.console;
	var JSON = options.JSON;

	this.game = new BomberGame(1, 'Demo Game');

	var clients = {};

	this.handleConnection = function (conn) {
		console.log("Client connected with ID " + conn.id);
		clients[conn.id] = new BomberRemoteClient(conn, socketServer, this.game);
		conn.addListener("close", this.makeConnectionClosedHandler(conn).bind(this));
	}

	this.makeConnectionClosedHandler = function (conn) {
		return (function () {
			var playerToRemove = this.game.findPlayer(conn.id);
			if (playerToRemove) {
				conn.broadcast(JSON.stringify({ type: 'player-left', data: playerToRemove }));
				console.log("Players: " +
					"[" + (this.game.players[0] ? 'X' : '-') + "] " +
					"[" + (this.game.players[1] ? 'X' : '-') + "] " +
					"[" + (this.game.players[2] ? 'X' : '-') + "] " +
					"[" + (this.game.players[3] ? 'X' : '-') + "] "
				);

				this.game.removePlayer(playerToRemove);
				console.log("Players: " +
					"[" + (this.game.players[0] ? 'X' : '-') + "] " +
					"[" + (this.game.players[1] ? 'X' : '-') + "] " +
					"[" + (this.game.players[2] ? 'X' : '-') + "] " +
					"[" + (this.game.players[3] ? 'X' : '-') + "] "
				); clients[conn.id] = null;
				console.log(playerToRemove.name + " disconnected");
			} else {
				console.log("Client " + conn.id + " disconnected.");
			}
		});
	}

	socketServer.addListener("connection", this.handleConnection.bind(this));
}

function BomberGame(id, name) {
	this.id = id;
	this.name = (name ? name : "Game #" + id);

	this.spawnSpots = [{ top: 0, left: 0 }, { top: 192, left: 192 }, { top: 0, left: 192 }, { top: 192, left: 0}];
	this.playerColors = ['cc0000', '00cc00', '3333cc', 'cccc00'];

	this.players = [null,null,null,null];

	this.started = false;

	this.addPlayer = function (player) {
		//if (this.players && this.spawnSpots && this.players.length >= this.spawnSpots.length) throw ("Game full - sorry!");
		if (!player) {
			var player = new BomberPlayer();
			var playerNumber = this.players.indexOf(null);
			if (playerNumber < 0) throw ("Game full - sorry");
			player.position = this.spawnSpots[playerNumber];
			player.color = this.playerColors[playerNumber];
			player.name = 'Player ' + (playerNumber + 1);
			player.index = this.players.indexOf(null);
		}
		this.players[player.index] = player;
		return (player);
	}

	/* Update the player with fresh position/velocity data transmitted by the server */
	this.updatePlayer = function (data) {
		var player;
		for (var i = 0; i < this.players.length; i++) {
			player = this.players[i];
			if (!player) continue;
			if (player.id == data.id) {
				player.position = data.position;
				player.velocity = data.velocity;
			}
		}
	}


	this.speedFactor = 2;
	this.updatePositions = function () {
		for (var i = 0; i < this.players.length; i++) {
			this.players[i].updatePosition(this.speedFactor, this.arena);
		}
	}

	this.findPlayer = function (id) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i] && this.players[i].id == id) return (this.players[i]);
		}
		return (null);
	}

	this.removePlayer = function (player) {
		this.players[this.players.indexOf(player)] = null;
	}

	this.start = function () {
		this.started = true;
	}
	this.arena = new BomberArena(this);
}

BomberGame.FromData = function (data) {
	var game = new BomberGame();
	game.id = data.id;
	game.name = (data.name ? data.name : 'Game #' + data.id);
	return (game);
}

function Pillar(top,left,width,height) {
	this.top = top;
	this.left = left;
	this.width = width;
	this.height = height;
	
	this.containsPoint = function(point, tolerance) {
		if (
			point.x > (this.left + tolerance)
			&& (point.x + tolerance) < (this.left + this.width)
			&& point.y > (this.top + tolerance)
			&& (point.y + tolerance) < (this.top + this.height)
		) return(true);
		return(false);
	}

	this.intersects = function (points, tolerance) {
		if (!tolerance) tolerance = 0;
		var point;
		for (var i = 0; i < points.length; i++) {
			point = points[i];
			if (this.containsPoint(point, tolerance)) return (true);
		}
		return (false);
	}
}

function BomberArena() {
	this.tileSize = 32;
	this.width = (9 * this.tileSize);
	this.height = (9 * this.tileSize);
	this.pillars = [];
	for(var x = 0; x < 4; x++) {
		for (var y = 0; y < 4; y++) {
			this.pillars.push(new Pillar(this.tileSize + (x * 2 * this.tileSize), this.tileSize + (y * 2 * this.tileSize), this.tileSize, this.tileSize));
		}
	}
}

function BomberPlayer(id, name, color, position, velocity, index) {
	this.id = id;
	this.name = name;
	this.color = color;
	this.index = index;
	this.position = (position && (position.top || position.left) ? position : { top: 0, left: 0 });
	this.velocity = (velocity && (velocity.dx || velocity.dy) ? velocity : { dx: 0, dy: 0 });
	this.moveUp = function (arena) { this.position.top -= arena.tileSize; }
	this.moveDown = function (arena) { this.position.top += arena.tileSize; }
	this.moveLeft = function (arena) { this.position.left -= arena.tileSize; }
	this.moveRight = function (arena) { this.position.left += arena.tileSize; }

	this.goUp = function () { this.velocity.dy = -1; }
	this.goDown = function () { this.velocity.dy = +1; }
	this.verticalStop = function () { this.velocity.dy = 0; }

	this.goLeft = function () { this.velocity.dx = -1; }
	this.goRight = function () { this.velocity.dx = +1; }
	this.horizontalStop = function () { this.velocity.dx = 0; }

	this.updatePosition = function (factor, arena) {
		if (!factor) factor = 1;

		var actualVelocity = this.getActualVelocity(factor, arena);
		if (actualVelocity.dx || actualVelocity.dy) {
			this.position.left += (factor * actualVelocity.dx);
			this.position.top += (factor * actualVelocity.dy);
		}
	}

	this.getActualVelocity = function (factor, arena) {
		var actualVelocity = { dx: this.velocity.dx, dy: this.velocity.dy };
		var oldLeft = this.position.left;
		var oldRight = this.position.left + arena.tileSize;
		var oldTop = this.position.top;
		var oldBottom = this.position.top + arena.tileSize;

		var newLeft = this.position.left + (factor * actualVelocity.dx);
		var newRight = newLeft + arena.tileSize;
		var newTop = this.position.top + (factor * actualVelocity.dy);
		var newBottom = newTop + arena.tileSize;

		// Can't move sideways if it'd take us off the map.
		if (newLeft < 0) actualVelocity.dx = 0;
		if (newRight > arena.width) actualVelocity.dx = 0;

		// Can't move vertically if it'd take us off the map
		if (newTop < 0) actualVelocity.dy = 0;
		if (newBottom > arena.height) actualVelocity = 0;

		var newXrect = [
			{ x: newLeft, y: oldTop },
			{ x: newRight, y: oldTop },
			{ x: newLeft, y: oldBottom },
			{ x: newRight, y: oldBottom }
		];
		var newYrect = [
			{ x: oldLeft, y: newTop },
			{ x: oldRight, y: newTop },
			{ x: oldLeft, y: newBottom },
			{ x: oldRight, y: newBottom }
		];

		for (var i = 0; i < arena.pillars.length; i++) {
			if (arena.pillars[i].intersects(newXrect, 8)) {
				actualVelocity.dx = 0;
				break;
			}
		}

		for (var i = 0; i < arena.pillars.length; i++) {
			if (arena.pillars[i].intersects(newYrect)) {
				actualVelocity.dy = 0;
				break;
			}
		}
		return (actualVelocity);
	}
	this.toString = function () {
		return ("[player " + (this.index + 1) + "]");
	}
}

BomberPlayer.FromData = function (data) {
	var player = new BomberPlayer(data.id, data.name, data.color, data.position, data.velocity, data.index);
	return (player);
}
	

if (typeof(exports) != 'undefined' && exports) {
	exports.BomberServer = BomberServer;
	exports.createServer = function (options) {
		return (new BomberServer(options));
	}
}
