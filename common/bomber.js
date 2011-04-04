function BomberRemoteClient(conn, socketServer, game) {
	this.conn = conn;
	this.socketServer = socketServer;
	this.game = game;
	this.handleMessage = function (jsonData) {
		var message = JSON.parse(jsonData);
		switch (message.type) {
			case 'join-game':
				console.log('Received join-game from ' + conn.id);
				try {
					var player = this.game.addPlayer();
					player.id = conn.id;
					console.log('Sending game-init to ' + conn.id);
					socketServer.send(conn.id, JSON.stringify({ type: 'game-init', data: { game: this.game, player: player} }));
					console.log('Broadcasting player-joined to everyone else');
					conn.broadcast(JSON.stringify({ type: 'player-joined', data: player }));
				} catch (ex) {
					socketServer.send(conn.id, JSON.stringify({ type: 'error', data: ex }));
				}
				break;
			case 'change-direction':
				console.log(message.data.id + " changed direction to (" + message.data.velocity.dx + "," + message.data.velocity.dy + ")");
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
	
	this.makeConnectionClosedHandler = function (conn) {
		return (function () {
			var playerToRemove = this.game.findPlayer(conn.id);
			if (playerToRemove) {
				conn.broadcast(JSON.stringify({ type: 'player-left', data: playerToRemove }));
				this.game.removePlayer(playerToRemove);
				console.log(playerToRemove.name + " left the game.");
			} else {
				console.log("Client " + conn.id + " disconnected.");
			}
		});
	}

	this.handleConnection = function (conn) {
		console.log("Client connected with ID " + conn.id);
		clients[conn.id] = new BomberRemoteClient(conn, socketServer, this.game);
		conn.addListener("close", this.makeConnectionClosedHandler(conn).bind(this));
	}

	socketServer.addListener("connection", this.handleConnection.bind(this));
}



function BomberGame(id, name) {
	this.id = id;
	this.name = (name ? name : "Game #" + id);
	/* This should really be device-independent to allow for different rendering contexts */
	this.arenaWidth = 256;
	this.arenaHeight = 256;
	this.spriteSize = 32;
	var minX = 0;
	var maxX = this.arenaWidth - this.spriteSize;
	var minY = 0;
	var maxY = this.arenaHeight - this.spriteSize;
	this.spawnSpots = [
		{ top: minY, left: minX }, 
		{ top: minY, left: maxX },
		{ top: maxY, left: minX },
		{ top: maxY, left: maxY }
	];
		var speed = 1;

	this.playerColors = ['cc0000', '00cc00', '3333cc', 'cccc00'];

	this.players = [null,null,null,null];
	this.started = false;

	this.addPlayer = function (player) {
		if (!player) {
			var player = new BomberPlayer();
			var playerNumber = this.players.indexOf(null);
			if (playerNumber >= 0) {
				player.position = this.spawnSpots[playerNumber];
				player.color = this.playerColors[playerNumber];
				player.name = 'Player ' + (playerNumber + 1);
			}
			player.index = this.players.indexOf(null);
			
		}
		if(player.index >= 0) this.players[player.index] = player;
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

	this.updatePositions = function () {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i] == null) continue;
			this.players[i].updatePosition(speed, this);
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
}

BomberGame.FromData = function (data) {
	var game = new BomberGame();
	game.id = data.id;
	game.name = (data.name ? data.name : 'Game #' + data.id);
	game.arenaHeight = data.arenaHeight;
	game.arenaWidth = data.arenaWidth;
	game.spriteSize = data.spriteSize;
	return (game);
}

function BomberPlayer(id, name, color, position, velocity, index) {
	this.id = id;
	this.name = name;
	this.color = color;
	this.index = index;
	this.position = (position && (position.top || position.left) ? position : { top: 0, left: 0 });
	this.velocity = (velocity && (velocity.dx || velocity.dy) ? velocity : { dx: 0, dy: 0 });

	this.goUp = function () { this.velocity.dy = -1; }
	this.goDown = function () { this.velocity.dy = +1; }
	this.verticalStop = function () { this.velocity.dy = 0; }

	this.goLeft = function () { this.velocity.dx = -1; }
	this.goRight = function () { this.velocity.dx = +1; }
	this.horizontalStop = function () { this.velocity.dx = 0; }

	this.updatePosition = function (speed, game) {
		speed = (speed ? speed : 1);
		if (!(this.velocity.dx || this.velocity.dy)) return;
		var adjustedSpeed = (this.velocity.dx && this.velocity.dy ? 2 * speed : 3 * speed);
		this.position.left += (adjustedSpeed * this.velocity.dx);
		this.position.top += (adjustedSpeed * this.velocity.dy);
		if (this.position.left < 0) this.position.left = 0;
		if (this.position.top < 0) this.position.top = 0;
		if (this.position.left + game.spriteSize > game.arenaWidth) {
			this.position.left = game.arenaWidth - game.spriteSize;
		}
		if (this.position.top + game.spriteSize > game.arenaHeight) {
			this.position.top = game.arenaHeight - game.spriteSize;
		}
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
