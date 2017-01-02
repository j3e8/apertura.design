app.controller("rootController", ["$rootScope", "$location", function($rootScope, $location) {

  $rootScope.$on("$routeChangeStart", function(args) {
    ga('send', 'event', 'page', $location.path());
  });

}]);
