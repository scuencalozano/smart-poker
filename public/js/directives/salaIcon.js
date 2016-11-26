
app.directive( 'salaIcon', [function() {
	return {
		restrict: 'E',
		templateUrl: '/partials/sala.html',
		replace: true,

		link: function(scope, element, attributes) {

			scope.selectSala = selectSala;
			scope.setSelected = setSelected;

			function selectSala(){
				scope.vm.setSala(scope.sala.name);
			}

			function setSelected(){
				return scope.vm.sala === scope.sala.name ? 'salaSelected' : '';
			}
		}
	};
}]);