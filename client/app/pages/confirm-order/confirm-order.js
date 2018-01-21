app.controller("confirmOrderController", ["$scope", "$http", "$routeParams", "$location", "Site", "ShoppingCart", "$timeout",
function($scope, $http, $routeParams, $location, $site, $shoppingCart, $timeout) {

  $scope.cartIsLoading = true;
  $scope.cart = {};
  $scope.shipAddress = {};
  $scope.billingInfo = {};

  $scope.shippingAddressIsLoaded = false;
  $scope.billingInfoIsLoaded = false;

  $scope.isPlacingOrder = false;

  $shoppingCart.loadCart(function(cart) {
    $scope.cartIsLoading = false;
    $scope.cart = cart;
    console.log($scope.cart);

    loadShippingAddress();
    loadBillingInfo();
  });

  function loadShippingAddress() {
    $http.post(API_URL + "/Address/get_address", {
      id: $scope.cart.shipAddressId
    }).then(function(response) {
      $scope.shipAddress = response.data.results;
      $scope.shippingAddressIsLoaded = true;
    }, function(error) {
      console.error(error);
    });
  }

  function loadBillingInfo() {
    if ($scope.cart.billingId) {
      $http.post(API_URL + "/Billing/get_billing_info", {
        id: $scope.cart.billingId
      }).then(function(response) {
        $scope.billingInfo = response.data.results;
        $scope.billingInfoIsLoaded = true;
      }, function(error) {
        console.error(error);
      });
    }
  }

  $scope.checkout = function() {
    $scope.isPlacingOrder = true;
    $http.post(API_URL + "/Order/place_order", {
      orderDetails: {
        discountCode: $scope.cart.discountCode,
        discountAmount: $scope.cart.discount,
        salesTax: $scope.cart.salesTax,
        shippingAmount: $scope.cart.shipping,
        shipAddressId: $scope.cart.shipAddressId,
        billingId: $scope.cart.billingId,
        items: $scope.cart.items.map(function(item) {
          return {
            sku: item.sku,
            qty: item.qty,
            price: item.price,
            templateProductId: item.templateProductId,
            guid: item.guid,
            projectData: item.projectData
          };
        })
      }
    }).then(function(response) {
      $shoppingCart.emptyCart();
      var orderId = response.data.results;

      ga('send', 'event', 'order', 'complete', '', Math.round($scope.cart.total), {
        'hitCallback': function() {
          $scope.isPlacingOrder = false;
          $location.path('/app/thank-you/' + orderId);
          $scope.$apply();
        }
      });

      // ga('send', 'event', {
      //   'eventCategory': 'order',
      //   'eventAction': 'complete',
      //   'eventLabel': '',
      //   'eventValue': $scope.cart.total,
      //   'hitCallback': function() {
      //     $scope.isPlacingOrder = false;
      //     $location.path('/app/thank-you/' + orderId);
      //     $scope.$apply();
      //   }
      // });
    }, function(error) {
      $scope.isPlacingOrder = false;
      console.error(error);
    });
  }

}]);
