app.controller("orderController", ["$scope", "$http", "$routeParams",
function($scope, $http, $routeParams) {

  $scope.isLoading = true;
  $scope.orderId = $routeParams.orderId;
  $scope.order = {};

  $http.post(API_URL + "/Order/get_order", {
    orderId: $routeParams.orderId
  }).then(function(response) {
    $scope.isLoading = false;
    $scope.order = response.data.results;
    $scope.order.dateOrderedAsDate = Date.parse($scope.order.dateOrdered);

    $scope.order.subtotal = $scope.order.items.reduce(function(running, current) {
      return Number(running) + current.price * current.qty;
    }, 0);
    $scope.order.total = Number($scope.order.subtotal) + Number($scope.order.discountAmount) + Number($scope.order.shippingAmount) + Number($scope.order.salesTax);
  }, function(error) {
    $scope.isLoading = false;
    console.error(error);
  });

  $scope.getSvgSrc = function(item) {
    return CART_THUMBNAIL_PATH + '/' + item.filename;
  }
}]);
