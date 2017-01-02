app.controller("canvasController", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.templates = [];

  $scope.isLoading = true;
  $http.post(API_URL + "/Template/get_canvas_templates")
  .then(function (response) {
    $scope.isLoading = false;
    $scope.templates = response.data.results;
  }, function(error) {
    $scope.isLoading = false;
    console.error(error);
  });
}]);
