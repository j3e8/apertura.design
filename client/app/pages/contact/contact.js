app.controller("contactController", ["$scope", function($scope) {
  var dm = "apertura.photo";
  var supportAddress = "support";
  supportAddress += "@";

  $scope.supportAddress = supportAddress + dm;

  var businessAddress = "business";
  businessAddress += "@";

  $scope.businessAddress = businessAddress + dm;
}]);
