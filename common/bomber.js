function BomberServer(options) {
	var socketServer = options.server;
	var console = options.console;
	var JSON = options.JSON;

	this.players = {};

	this.handleConnection = function (conn) {
		console.log("Client connected with ID " + conn.id);
		conn.addListener("message", this.makeMessageHandler(conn).bind(this));
	}

	this.makeMessageHandler = function (conn) {
		return (function (jsonData) {
			var message = JSON.parse(jsonData);
//			console.log('Received [' + message.type + '] from ' + conn.id);
//			console.log(message.data);
			switch (message.type) {
				case 'start-game':
					this.game.start();
					console.log("Received start-game from " + conn.id);
					socketServer.broadcast(JSON.stringify({ type: 'game-started' }));
				case 'join-game':
					console.log('Received join-game from ' + conn.id);
					try {
						var player = this.game.addPlayer(player);
						this.players[conn.id] = player;
						/* Need to send CURRENT game state to the connecting player */
						/* And details of the NEW PLAYER to all other clients */
						socketServer.send(conn.id, JSON.stringify({ type: 'game-init', data: { game: this.game, player: player} }));
						conn.broadcast(JSON.stringify({ type: 'player-joined', data: player }));
					} catch (ex) {
						socketServer.send(conn.id, JSON.stringify({ type: 'error', data: ex }));
					}
					break;
				case 'change-direction':
					bomberServer.changeDirection(message.data);
					break;
			}
		});
	}

	this.makeDisconnectHandler = function () {
		return (function (conn) {
			var playerToRemove = players[conn.id];
			if (playerToRemove) this.game.removePlayer(players);
			players[conn.id] = null;
		});
	}
			

	this.game = new BomberGame(1, 'Demo Game');

	socketServer.addListener("error", (function () { console.log(Array.prototype.join.call(arguments, ", ")); }).bind(this));
	socketServer.addListener("disconnected", this.makeDisconnectHandler().bind(this));
	socketServer.addListener("connection", this.handleConnection.bind(this));
}

function BomberGame(id, name) {
	this.id = id;
	this.name = (name ? name : "Game #" + id);

	this.spawnSpots = [{ top: 0, left: 0 }, { top: 192, left: 192 }, { top: 0, left: 192 }, { top: 192, left: 0}];
	this.playerColors = ['cc0000', '00cc00', '3333cc', 'cccc00'];

	this.players = new Array();

	this.started = false;

	this.addPlayer = function (player) {
		if (this.players && this.spawnSpots && this.players.length >= this.spawnSpots.length) throw ("Game full - sorry!");
		if (!player) {
			var player = new BomberPlayer();
			var playerNumber = this.players.length;
			player.position = this.spawnSpots[playerNumber];
			player.color = this.playerColors[playerNumber];
			player.name = 'Player ' + (playerNumber + 1);
		}
		this.players.push(player);
		return (player);
	}

	this.removePlayer = function (player) {
		this.players.splice(0, this.players.indexOf(player));
	}

	this.start = function () {
		this.started = true;
	}
}

BomberGame.FromData = function (data) {
	var game = new BomberGame();
	game.id = data.id;
	game.name = (data.name ? data.name : 'Game #' + data.id);
	return (game);
}

function BomberPlayer(id, name, color, position, velocity) {
	this.id = id;
	this.name = name;
	this.color = color;
	this.position = (position && (position.top || position.left) ? position : { top: 0, left: 0 });
	this.velocity = (velocity && (velocity.dx || velocity.dy) ? velocity : { dx: 0, dy: 0 });

	this.goUp = function () { this.velocity.dy = -1; }
	this.goDown = function () { this.velocity.dy = 1; }
	this.verticalStop = function () { this.velocity.dy = 0; }

	this.goLeft = function () { this.velocity.dx = 1; }
	this.goRight = function () { this.velocity.dx = -1; }
	this.horizontalStop = function () { this.velocity.dx = 0; }

	this.updatePosition = function () {
		this.position.left += this.velocity.dx;
		this.position.top += this.velocity.dy;
	}
}

BomberPlayer.FromData = function (data) {
	var player = new BomberPlayer(data.id, data.name, data.color, data.position, data.velocity);
	return (player);
}
	

if (typeof(exports) != 'undefined' && exports) {
	exports.BomberServer = BomberServer;
	exports.createServer = function (options) {
		return (new BomberServer(options));
	}
}
