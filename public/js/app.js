var socket = io.connect();

var app = angular.module( 'app', ['ngRoute'] ).config( function( $routeProvider, $locationProvider ) {

	$routeProvider.when('/table-10/:tableId', {
		templateUrl: '/partials/table-10-handed.html',
		controller: 'TableController'
	});

	$routeProvider.when('/table-6/:tableId', {
		templateUrl: '/partials/table-6-handed.html',
		controller: 'TableController'
	});

	$routeProvider.when('/table-2/:tableId', {
		templateUrl: '/partials/table-2-handed.html',
		controller: 'TableController'
	});

	$routeProvider.when('/lobby', {
		templateUrl: '/partials/lobby.html',
		controller: 'LobbyController'
	});

	$routeProvider.when('/', {
		templateUrl: '/partials/login.html',
		controller: 'LoginController',
        controllerAs: 'vm'
	});

	$routeProvider.otherwise( { redirectTo: '/' } );

	$locationProvider.html5Mode(true).hashPrefix('!');
});

app.run( function( $rootScope ) {
	$rootScope.screenName = '';
	$rootScope.totalChips = 0;
	$rootScope.sittingOnTable = '';
});