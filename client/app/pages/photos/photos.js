app.controller("photosController", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.isLoading = false;

  $scope.medium = null;
  $scope.templates = [];

  $scope.loadData = function() {
    $scope.isLoading = true;
    $http.post(API_URL + "/Template/get_photo_templates_by_medium", {
      medium: $scope.medium
    }).then(function (response) {
      $scope.isLoading = false;
      $scope.templates = response.data.results;
    }, function(error) {
      $scope.isLoading = false;
      console.error(error);
    });
  }

  $scope.chooseCategory = function(med) {
    $scope.medium = med;
    $scope.loadData();
  }

  var initialMedium = 'photo';
  var url = window.location.href;
  if (url.indexOf('#') != -1) {
    initialMedium = url.substring(url.indexOf('#') + 1);
  }
  console.log(initialMedium);
  $scope.chooseCategory(initialMedium);
}]);
