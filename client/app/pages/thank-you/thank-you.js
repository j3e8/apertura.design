app.controller("thankYouController", ["$scope", "$http", "$routeParams",
function($scope, $http, $routeParams) {
  $scope.orderIsLoading = true;
  $scope.order = {};
  $scope.orderId = $routeParams.orderId;
  $scope.shipAddress = null;
  $scope.billingInfo = null;

  $http.post(API_URL + "/Order/get_order", {
    orderId: $routeParams.orderId
  }).then(function(response) {
    $scope.orderIsLoading = false;
    $scope.order = response.data.results;
    $scope.order.dateOrderedAsDate = Date.parse($scope.order.dateOrdered);

    $scope.shipAddress = response.data.results.shipAddress;

    if (response.data.results.billing.lastFour) {
      $scope.billingInfo = response.data.results.billing;
    }

    $scope.shipping = Number($scope.order.shippingAmount);
    $scope.discount = Number($scope.order.discountAmount);
    $scope.salesTax = Number($scope.order.salesTax);
    $scope.subtotal = $scope.order.items.reduce(function(runningTotal, current) {
      return Number(runningTotal) + Number(current.price) * Number(current.qty);
    }, 0);
    $scope.total = Number($scope.subtotal) + Number($scope.shipping) + Number($scope.salesTax) - $scope.discount;
  }, function(err) {
    console.error(err);
  });
}]);
