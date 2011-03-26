var bomber;
if (!bomber) bomber = {};

(function () {
	bomber.Game = function() {
		this.players = new Array();
	}

	bomber.Player = function(index, name, color) {
		this.index = index;
		this.name = name;
		this.color = color;
		this.location = { top: 0, left: 0 };
		this.velocity = { dx: 0, dy: 0 };
	}
})();

exports.bomber = bomber;
