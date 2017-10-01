require('dotenv').config();

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	lessMiddleware = require('less-middleware'),
	path = require('path'),
	Table = require('./poker_modules/table'),
	Player = require('./poker_modules/player');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(app.router);
app.use(lessMiddleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

// Development Only
if ( 'development' == app.get('env') ) {
	app.use( express.errorHandler() );
}

var players = [];
var tables = [];
var eventEmitter = {};

server.listen(app.get('port'), app.get('ip'));
console.log('Listening on port ' + app.get('port') + " ip: " + app.get('ip'));

// The lobby
app.get('/', function( req, res ) {
	res.render('index');
});

// The lobby data (the array of tables and their data)
app.get('/lobby-data', function( req, res ) {
	var lobbyTables = [];
	for ( var tableId in tables ) {
		// Sending the public data of the public tables to the lobby screen
		if( !tables[tableId].privateTable ) {
			lobbyTables[tableId] = {};
			lobbyTables[tableId].id = tables[tableId].public.id;
			lobbyTables[tableId].name = tables[tableId].public.name;
			lobbyTables[tableId].seatsCount = tables[tableId].public.seatsCount;
			lobbyTables[tableId].playersSeatedCount = tables[tableId].public.playersSeatedCount;
			lobbyTables[tableId].bigBlind = tables[tableId].public.bigBlind;
			lobbyTables[tableId].smallBlind = tables[tableId].public.smallBlind;
		}
	}
	res.send( lobbyTables );
});

// If the table is requested manually, redirect to lobby
app.get('/table-10/:tableId', function( req, res ) {
	res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-6/:tableId', function( req, res ) {
	res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-2/:tableId', function( req, res ) {
	res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/lobby', function( req, res ) {
	res.redirect('/');
});

// The table data
app.get('/table-data/:tableId', function( req, res ) {
	if( typeof req.params.tableId !== 'undefined' && typeof tables[req.params.tableId] !== 'undefined' ) {
		res.send( { 'table': tables[req.params.tableId].public } );
	}
});

io.sockets.on('connection', function( socket ) {

	/**
	 * When a player enters a room
	 * @param object table-data
	 * LOS BOTS NO PASAN POR AQUI OJOOO por eso se llena los observers aqui
	 */
	socket.on('enterRoom', function( tableId ) {

		var player = players[socket.id];

		if( typeof player !== 'undefined' && player.room === null ) {
			// Add the player to the socket room
			socket.join( 'table-' + tableId );
			// Add the room to the player's data
			player.room = tableId;


			console.log('enter table', player.public.name);
			tables[tableId].observers.push(player.public.name);
			// solo si hay bots para iniciar
			if (tables[tableId].observers.length === 1 && tables[tableId].seats.length > 1) {
				tables[tableId].initializeRound(true);
			}
		}
	});

	/**
	 * When a player leaves a room
	 */
	socket.on('leaveRoom', function() {
		var player = players[socket.id];
		leaveRoom(player);
	});

	function leaveRoom (player) {
		if( typeof player !== 'undefined' && player.room !== null && player.sittingOnTable === false ) {
			// Remove the player from the socket room
			socket.leave( 'table-' + player.room );

			var posRemove = tables[player.room].observers.indexOf(player.public.name);
			console.log('salio table', player.public.name, 'posRemove', posRemove);
			tables[player.room].observers.splice(posRemove, 1);

			// Remove the room to the player's data
			players[socket.id].room = null;
		}
	}
	/**
	 * When a player disconnects
	 */
	socket.on('disconnect', function() {
		// If the socket points to a player object
		if( typeof players[socket.id] !== 'undefined' ) {
			// If the player was sitting on a table
			if( players[socket.id].sittingOnTable !== false && typeof tables[players[socket.id].sittingOnTable] !== 'undefined' ) {
				// The seat on which the player was sitting
				var seat = players[socket.id].seat;
				// The table on which the player was sitting
				var tableId = players[socket.id].sittingOnTable;
				// Remove the player from the seat
				tables[tableId].playerLeft( seat );
			}

			leaveRoom(players[socket.id]);

			// Remove the player object from the players array
			delete players[socket.id];
		}
	});

	/**
	 * When a player leaves the table
	 * @param function callback
	 */
	socket.on('leaveTable', function( callback ) {
		// If the player was sitting on a table
		if( players[socket.id].sittingOnTable !== false && tables[players[socket.id].sittingOnTable] !== false ) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var tableId = players[socket.id].sittingOnTable;
			// Remove the player from the seat
			tables[tableId].playerLeft( seat );
			// Send the number of total chips back to the user
			callback( { 'success': true, 'totalChips': players[socket.id].chips } );
		}
	});

	/**
	 * When a new player enters the application
	 * @param string newScreenName
	 * @param function callback
	 */
	socket.on('register', function( newScreenName, callback ) {
		// If a new screen name is posted
		if( typeof newScreenName !== 'undefined' ) {
			var newScreenName = newScreenName.trim();
			// If the new screen name is not an empty string
			if( newScreenName && typeof players[socket.id] === 'undefined' ) {
				var nameExists = false;
				for( var i in players ) {
					if( players[i].public.name && players[i].public.name == newScreenName ) {
						nameExists = true;
						break;
					}
				}
				if( !nameExists ) {
					// Creating the player object
					players[socket.id] = new Player( socket, newScreenName, 1000 );
					callback( { 'success': true, screenName: newScreenName, totalChips: players[socket.id].chips } );
				} else {
					callback( { 'success': false, 'message': 'This name is taken' } );
				}
			} else {
				callback( { 'success': false, 'message': 'Please enter a screen name' } );
			}
		} else {
			callback( { 'success': false, 'message': '' } );
		}
	});

	/**
	 * When a player requests to sit on a table
	 * @param function callback
	 */
	socket.on('sitOnTheTable', function( data, callback ) {
		if(
			// A seat has been specified
			typeof data.seat !== 'undefined'
			// A table id is specified
			&& typeof data.tableId !== 'undefined'
			// The table exists
			&& typeof tables[data.tableId] !== 'undefined'
			// The seat number is an integer and less than the total number of seats
			&& typeof data.seat === 'number'
			&& data.seat >= 0
			&& data.seat < tables[data.tableId].public.seatsCount
			&& typeof players[socket.id] !== 'undefined'
			// The seat is empty
			&& tables[data.tableId].seats[data.seat] == null
			// The player isn't sitting on any other tables
			&& players[socket.id].sittingOnTable === false
			// The player had joined the room of the table
			&& players[socket.id].room === data.tableId
			// The chips number chosen is a number
			&& typeof data.chips !== 'undefined'
			&& !isNaN(parseInt(data.chips))
			&& isFinite(data.chips)
			// The chips number is an integer
			&& data.chips % 1 === 0
		){
			// The chips the player chose are less than the total chips the player has
			if( data.chips > players[socket.id].chips )
				callback( { 'success': false, 'error': 'You don\'t have that many chips' } );
			else if( data.chips > tables[data.tableId].public.maxBuyIn || data.chips < tables[data.tableId].public.minBuyIn )
				callback( { 'success': false, 'error': 'The amount of chips should be between the maximum and the minimum amount of allowed buy in' } );
			else {
				// Give the response to the user
				callback( { 'success': true } );
				// Add the player to the table
				tables[data.tableId].playerSatOnTheTable( players[socket.id], data.seat, data.chips );
			}
		} else {
			// If the user is not allowed to sit in, notify the user
			callback( { 'success': false } );
		}
	});

	/**
	 * When a player who sits on the table but is not sitting in, requests to sit in
	 * @param function callback
	 */
	socket.on('sitIn', function( callback ) {
		if( players[socket.id].sittingOnTable !== false && players[socket.id].seat !== null && !players[socket.id].public.sittingIn ) {
			// Getting the table id from the player object
			var tableId = players[socket.id].sittingOnTable;
			tables[tableId].playerSatIn( players[socket.id].seat );
			callback( { 'success': true } );
		}
	});

	/**
	 * When a player posts a blind
	 * @param bool postedBlind (Shows if the user posted the blind or not)
	 * @param function callback
	 */
	socket.on('postBlind', function( postedBlind, callback ) {
		if( players[socket.id].sittingOnTable !== false ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId]
				&& typeof tables[tableId].seats[activeSeat].public !== 'undefined'
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				&& ( tables[tableId].public.phase === 'smallBlind' || tables[tableId].public.phase === 'bigBlind' )
			) {
				if( postedBlind ) {
					callback( { 'success': true } );
					if( tables[tableId].public.phase === 'smallBlind' ) {
						// The player posted the small blind
						tables[tableId].playerPostedSmallBlind();
					} else {
						// The player posted the big blind
						tables[tableId].playerPostedBigBlind();
					}
				} else {
					tables[tableId].playerSatOut( players[socket.id].seat );
					callback( { 'success': true } );
				}
			}
		}
	});

	/**
	 * When a player checks
	 * @param function callback
	 */
	socket.on('check', function( callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId]
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				&& !tables[tableId].public.biggestBet || ( tables[tableId].public.phase === 'preflop' && tables[tableId].public.biggestBet === players[socket.id].public.bet )
				&& ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1
			) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerChecked();
			}
		}
	});

	/**
	 * When a player folds
	 * @param function callback
	 */
	socket.on('fold', function( callback ){
		if( players[socket.id].sittingOnTable !== false ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerFolded();
			}
		}
	});

	/**
	 * When a player calls
	 * @param function callback
	 */
	socket.on('call', function( callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && tables[tableId].public.biggestBet && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerCalled();
			}
		}
	});

	/**
	 * When a player bets
	 * @param number amount
	 * @param function callback
	 */
	socket.on('bet', function( amount, callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && !tables[tableId].public.biggestBet && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Validating the bet amount
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) && amount <= tables[tableId].seats[activeSeat].public.chipsInPlay ) {
					// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
					callback( { 'success': true } );
					tables[tableId].playerBetted( amount );
				}
			}
		}
	});

	/**
	 * When a player raises
	 * @param function callback
	 */
	socket.on('raise', function( amount, callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if(
				// The table exists
				typeof tables[tableId] !== 'undefined'
				// The player who should act is the player who raised
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				// The pot was betted
				&& tables[tableId].public.biggestBet
				// It's not a round of blinds
				&& ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1
				// Not every other player is all in (in which case the only move is 'call')
				&& !tables[tableId].otherPlayersAreAllIn()
			) {
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) ) {
					amount -= tables[tableId].seats[activeSeat].public.bet;
					if( amount <= tables[tableId].seats[activeSeat].public.chipsInPlay ) {
						// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
						callback( { 'success': true } );
						// The amount should not include amounts previously betted
						tables[tableId].playerRaised( amount );
					}
				}
			}
		}
	});

	/**
	 * When a message from a player is sent
	 * @param string message
	 */
	socket.on('sendMessage', function( message ) {
		message = message.trim();
		if( message && players[socket.id].room ) {
			socket.broadcast.to( 'table-' + players[socket.id].room ).emit( 'receiveMessage', { 'message': htmlEntities( message ), 'sender': players[socket.id].public.name } );
		}
	});
});

/**
 * Event emitter function that will be sent to the table objects
 * Tables use the eventEmitter in order to send events to the client
 * and update the table data in the ui
 * @param string tableId
 */
var eventEmitter = function( tableId ) {
	return function ( eventName, eventData ) {
		io.sockets.in( 'table-' + tableId ).emit( eventName, eventData );
	}
}

/**
 * Changes certain characters in a string to html entities
 * @param string str
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// public tables
//tables[0] = new Table( 0, 'Venezuela', 	eventEmitter(0), 10, 2, 1, 200, 40, false );
//tables[5] = new Table( 2, 'Perú', 	eventEmitter(2), 2, 8, 4, 800, 160, false );

// type table 6 handed
tables[0] = new Table( 0, 'Argentina', 	eventEmitter(0), 6, 2, 1, 200, 40, false );//full
tables[1] = new Table( 1, 'Brasil', 	eventEmitter(1), 6, 2, 1, 200, 40, false );//full

tables[2] = new Table( 2, 'Jamaica', 	eventEmitter(2), 6, 2, 1, 200, 40, false );//con 5
tables[3] = new Table( 3, 'Chile', 		eventEmitter(3), 6, 2, 1, 200, 40, false );//con 4
tables[4] = new Table( 4, 'Colombia', 	eventEmitter(4), 6, 2, 1, 200, 40, false );//con 3
tables[5] = new Table( 5, 'Costa Rica', eventEmitter(5), 6, 2, 1, 200, 40, false );//con 2
tables[6] = new Table( 6, 'Estados Unidos', eventEmitter(6), 6, 2, 1, 200, 40, false );//con 1

tables[7]= new Table( 7, 'Panamá', 	eventEmitter(7), 6, 4, 2, 400, 80, false );//con 5
tables[8]= new Table( 8, 'El Salvador', eventEmitter(8), 6, 4, 2, 400, 80, false );//con 4
tables[9]= new Table( 9, 'Cuba', 		eventEmitter(9), 6, 4, 2, 400, 80, false );//con 3
tables[10]= new Table( 10, 'Guatemala', eventEmitter(10), 6, 4, 2, 400, 80, false );//con 2
tables[11]= new Table( 11, 'Haití', 	eventEmitter(11), 6, 4, 2, 400, 80, false );//con 1

// type table 2 handed
// tables[0] = new Table( 0, 'Argentina', 	eventEmitter(0), 2, 2, 1, 200, 40, false );//con 1
// tables[1] = new Table( 1, 'Bolivia', 	eventEmitter(1), 2, 2, 1, 200, 40, false );//vacia
// tables[2] = new Table( 2, 'Brasil', 	eventEmitter(2), 2, 4, 2, 800, 160, false );//con 1
// tables[3] = new Table( 3, 'Canadá', 	eventEmitter(3), 2, 4, 2, 800, 160, false );//vacia


// private tables
tables[20] = new Table( 20, 'México', eventEmitter(20), 6, 20, 10, 2000, 400, true );


/**
 * CAMBIOS REALIZADOS POR SANTIAGO CUENCA PARA INCLUIR BOTS
 */

var velocidad = 2000;
var chipsIniBots = 200;

// fill all tables
//['Card', 'Rock', 'Mouse', 'Monkey', 'Telephone', 'ABC', 'Lion',
//        'Man', 'Whale', 'Eagle', 'Crow', 'ABC_FO', 'Dice', 'Fish'];

fillTable (tables[0], ['Card', 'Rock', 'Mouse', 'Monkey', 'Telephone', 'ABC']);
fillTable (tables[1], ['Lion', 'Man', 'Whale', 'Eagle', 'Crow', 'ABC_FO']);
fillTable (tables[2], ['Dice', 'Fish', 'Telephone', 'ABC_FO', 'Whale']);
fillTable (tables[3], ['Fish', 'Telephone', 'ABC_FO', 'Whale']);
fillTable (tables[4], ['Man', 'Fish', 'Whale']);
fillTable (tables[5], ['Man', 'Dice']);
fillTable (tables[6], ['Fish']);
fillTable (tables[7], ['Man', 'Fish', 'Telephone', 'ABC_FO', 'Whale']);
fillTable (tables[8], ['Whale', 'Telephone', 'ABC_FO', 'Whale']);
fillTable (tables[9], ['Man', 'Eagle', 'Whale']);
fillTable (tables[10], ['Man', 'Telephone']);
fillTable (tables[11], ['Whale']);

setInterval(function(){
	tables[0].playBotIf();
	tables[1].playBotIf();
	tables[2].playBotIf();
	tables[3].playBotIf();
	tables[4].playBotIf();
	tables[5].playBotIf();
	tables[6].playBotIf();
	tables[7].playBotIf();
	tables[8].playBotIf();
	tables[9].playBotIf();
	tables[10].playBotIf();
	tables[11].playBotIf();
}, velocidad);


/**
 * Cuando un usuario real es creado se registra en players en la posicion socket.id (valor casi aleatorio de varios digitos)
 **/
function addBot(table, position, chips, type){
	var player = new Player( undefined, type + position, chips, type );
	players[position] = player;
	table.playerSatOnTheTable( player, position, chips );
}

function fillTable (table, types) {
	for ( var i = 0; i < types.length; i++) {
		addBot(table, i, chipsIniBots, types[i]);
	}
}
