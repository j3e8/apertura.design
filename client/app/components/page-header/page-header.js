app.directive("pageHeader", ["Site", function($site) {
  return {
    restrict: 'E',
    templateUrl: '/app/components/page-header/page-header.html',
    link: function($scope, $element, $attrs) {
      $scope.menuIsDisplayed = undefined;
      $scope.$site = $site;

      $scope.$on('$routeChangeStart', function(next, current) {
        $scope.menuIsDisplayed = false;
      });

      $scope.toggleMenu = function() {
        $scope.menuIsDisplayed = $scope.menuIsDisplayed ? false : true;
      }

    }
  }
}]);
