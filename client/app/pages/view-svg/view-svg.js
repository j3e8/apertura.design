app.controller("viewSvgController", ["$scope", "$sce", "$routeParams", function($scope, $sce, $routeParams) {

  $scope.getSvg = function() {
    return $sce.trustAsResourceUrl(CART_SVG_PATH + '/' + $routeParams.guid + '.svg');
  }

}]);
