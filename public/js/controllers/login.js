  app.controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController($location, $rootScope, $scope) {

    var vm = this;
    vm.register = register;
    vm.setSala = setSala;
    vm.error = '';
    vm.newScreenName = 'user_' + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 2);
    vm.sala = 'stars';
    vm.salas = [{
                  name: 'stars',
                  img: 'images/salas/ps.jpg'
                },
                {
                  name: 'party',
                  img: 'images/salas/pp.jpg'
                },
                {
                  name: '888',
                  img: 'images/salas/888.jpg'
                },
                {
                  name: 'blackchip',
                  img: 'images/salas/bcp.jpg'
                }];

    function register() {
      // If there is some trimmed value for a new screen name
      if( vm.newScreenName ) {
        socket.emit( 'register', vm.newScreenName, function( response ){
          if( response.success ){
            $rootScope.screenName = response.screenName;
            $rootScope.totalChips = response.totalChips;
            vm.registerError = '';
            $location.path('/lobby');
            $scope.$digest();
            $rootScope.$digest();
          }
          else if( response.message ) {
            vm.registerError = response.message;
          }
        });
      }
    }

    function setSala(sala) {
      vm.sala = sala;
    }
  }
