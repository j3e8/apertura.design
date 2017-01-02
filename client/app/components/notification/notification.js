app.directive("notification", ['$timeout', function($timeout) {
  return {
    restrict: 'E',
    templateUrl: '/app/components/notification/notification.html',
    link: function($scope, $element, $attrs) {
      $scope.notificationIsDisplayed = undefined;

      $scope.$on("notification", function($event, msg) {
        $scope.message = msg;
        $scope.notificationIsDisplayed = true;
        $timeout($scope.dismiss, 3000);
      });

      $scope.dismiss = function() {
        $scope.notificationIsDisplayed = false;
      }
    }
  }
}]);
