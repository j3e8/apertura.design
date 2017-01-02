app.controller("myAccountController", ["$scope", "$http", "$location", "Site", function($scope, $http, $location, $site) {
  $scope.orders = [];

  $scope.firstName = '';
  $scope.lastName = '';
  $scope.email = '';

  $scope.newFirstName = '';
  $scope.newLastName = '';
  $scope.newEmail = '';
  $scope.newPassword = '';

  $scope.isEditingPassword = false;
  $scope.isSavingPassword = false;

  $http.post(API_URL + "/User/get_user")
  .then(function(response) {
    var user = response.data.results;
    $scope.firstName = user.firstName;
    $scope.lastName = user.lastName;
    $scope.email = user.email;
  }, function(error) {
    console.error(error);
  });

  $http.post(API_URL + "/Order/get_orders_for_user")
  .then(function(response) {
    $scope.orders = response.data.results;
    $scope.orders.forEach(function(order) {
      order.dateOrderedAsDate = Date.parse(order.dateOrdered);
    });
  }, function(error) {
    console.error(error);
  });


  $scope.viewOrder = function(order) {
    $location.path('/app/order/' + order.id);
  }

  $scope.editPassword = function() {
    $scope.isEditingPassword = true;
  }

  $scope.savePassword = function() {
    $scope.isSavingPassword = true;
    $http.post(API_URL + "/User/update_password", {
      userId: $site.userid,
      password: $scope.newPassword
    }).then(function(response) {
      $scope.isSavingPassword = false;
      $scope.isEditingPassword = false;
    }, function(error) {
      console.error(error);
    });
  }
}]);
