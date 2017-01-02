app.controller("reviewTemplatesController", ["$scope", "$http", function($scope, $http) {
  $scope.template = null;
  $scope.isLoading = false;

  $scope.loadNextTemplate = function() {
    $scope.isLoading = true;
    $http.post(API_URL + "/Template/load_next_for_review")
    .then(function(response) {
      $scope.isLoading = false;
      $scope.template = response.data.results.template;
      $scope.templateProducts = response.data.results.templateProducts;
      $scope.keywords = response.data.results.keywords;
    }, function(err) {
      $scope.isLoading = false;
      console.log(err);
    });
  }

  $scope.loadNextTemplate();

}]);
