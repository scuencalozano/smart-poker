app.controller('LobbyController', ['$scope', '$rootScope', '$http', function( $scope, $rootScope, $http ) {

	$scope.lobbyTables = [];

	$http({
		url: '/lobby-data',
		method: 'GET'
	}).success(function ( data, status, headers, config ) {
		for( tableId in data ) {
			$scope.lobbyTables[tableId] = data[tableId];
		}
	});


}]);