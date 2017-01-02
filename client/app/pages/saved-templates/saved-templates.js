app.controller("savedTemplatesController", ["$scope", "Site", function($scope, $site) {

  $scope.projects = [];

  function loadSavedTemplates() {
    for (var key in localStorage) {
      if (key.substring(0, 9) == 'template_') {
        var project = JSON.parse(localStorage.getItem(key));
        $scope.projects.push(project);
      }
    }
    console.log($scope.projects);
  }
  loadSavedTemplates();
}]);
