app.directive("aperturaPhotoPicker", ["$http", "Site", function($http, $site) {
  return {
    restrict: 'E',
    scope: {
      isDisplayed: '=',
      handlePhotoClick: '=',
      onCancel: '=',
      onChangePhotoSource: '='
    },
    templateUrl: "/app/components/apertura-photo-picker/apertura-photo-picker.html",
    link: function($scope, $element, $attrs) {
      $scope.$site = $site;
      $scope.subview = 'browse';
      $scope.username = '';
      $scope.password = '';
      $scope.loginErrorMessage = '';
      $scope.isSigningIn = false;

      $scope.signin = function() {
        $scope.isSigningIn = true;
        $scope.$site.authenticate($scope.username, $scope.password, function() {
          $scope.isSigningIn = false;
        }, function() {
          $scope.loginErrorMessage = "Invalid username or password";
          $scope.isSigningIn = false;
        });
      }

      $scope.showBrowseView = function() {
        $scope.subview = 'browse';
      }

      $scope.showCollectionsView = function() {
        $scope.subview = 'collections';
      }

      $scope.showSearchView = function() {
        $scope.subview = 'search';
      }

      $scope.choosePhoto = function(photo) {
        if ($scope.handlePhotoClick) {
          $scope.handlePhotoClick(photo);
        }
      }
    }
  }
}]);
