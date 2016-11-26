var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');


describe("should not be a botTurno", function() {

	var table,
		players = [],
		initialChips = 0;

	function createTable (numPlayers){
		var eventEmitter = function( tableId ) {
			return function ( eventName, eventData ) {};
		}

 		var socket = {
			emit: function() {
				return;
			}
		};

		table = new Table( 0, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false );
		// siempre true para ahorrar codigo en tests
		// table.autoBlinds = false;

		for( var i=0 ; i < numPlayers ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
		}
		// facilita el manejo de los tests
		table.autoBeginWhen2 = false;
		table.autoSigPhase = false;
		return table;
	}

	it("when bb does not have chips preflop", function() {

		var table = createTable(6);

		table.playerSatOnTheTable( players[0], 0, 86 );
		table.playerSatOnTheTable( players[1], 1, 2 );
		table.playerSatOnTheTable( players[2], 2, 80 );
		table.playerSatOnTheTable( players[3], 3, 62 );
		table.playerSatOnTheTable( players[4], 4, 142 );
		table.playerSatOnTheTable( players[5], 5, 228 );

		table.initializeRoundCustomDealer(5);

		table.playerFolded();
		table.playerFolded();
		table.playerFolded();
		table.playerBetted(12);
		table.playerFolded();

		expect( table.isTurnoBot() ).toBe(false);
		expect( table.isAcabaronTodos() ).toBe(true);
	});

});