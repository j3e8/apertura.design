app.controller("templateController", ["Site", '$scope', '$http', '$routeParams', '$timeout', function($site, $scope, $http, $routeParams, $timeout) {

  $scope.productGroups = [];
  $scope.productsByGroup = {};
  $scope.expandedGroup = 'canvas';
  $scope.previousExpandedGroup = undefined;

  $http.post(API_URL + "/Template/get_template", {
    templateId: $routeParams.templateId
  }).then(function(response) {
    $scope.template = response.data.results;
    $scope.template.products.forEach(function(product) {
      if ($scope.productGroups.indexOf(product.medium) == -1) {
        $scope.productGroups.push(product.medium);
        $scope.productsByGroup[product.medium] = [];
      }
      $scope.productsByGroup[product.medium].push(product);
    });
    $timeout(window.parsePinBtns, 0);
  }, function(error) {
    console.log(error);
  });

  $scope.toggleProductGroup = function(medium) {
    $scope.previousExpandedGroup = $scope.expandedGroup;
    $scope.expandedGroup = medium;
  }

  $scope.mediumName = function(medium) {
    switch (medium) {
      case 'canvas':
        return 'Gallery wrapped canvases';
      case 'poster':
        return 'Posters';
      case 'canvasposter':
      case 'canvas poster':
        return 'Canvas posters';
      case 'photo':
        return 'Photos';
      default:
        return medium;
    }
  }

}]);
