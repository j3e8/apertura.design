app.directive("colorPicker", ["$http", function($http) {
  return {
    restrict: 'E',
    scope: {
      isDisplayed: '=',
      handleSwatchClick: '=',
      onCancel: '='
    },
    templateUrl: '/app/components/color-picker/color-picker.html',
    link: function($scope, $element, $attrs) {
      $scope.palettes = [];

      $http.get(API_URL + "/ColorPalette/get_palettes")
      .then(function(response) {
        $scope.palettes = response.data.results;
      }, function(error) {
        console.error(error);
      });

    }
  };
}]);
