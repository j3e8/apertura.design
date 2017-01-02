app.controller("homeController", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;

}]);
