app.controller("shippingController", ["Site", '$scope', '$http', "Shipping", "$location", "ShoppingCart", "Site",
function($site, $scope, $http, $shipping, $location, $shoppingCart, $site) {
  $scope.$site = $site;
  $scope.shipping = $shipping;
  $scope.isLoading = false;
  $scope.addresses = [];

  $scope.shipAddressId = $shoppingCart.getShipAddressId();

  $scope.newAddress = {
    country: 'USA'
  };

  $scope.isLoading = true;
  $http.post(API_URL + "/Address/get_addresses_for_user", {
    userId: $site.userid
  }).then(function(response) {
    $scope.isLoading = false;
    $scope.addresses = response.data.results;
    if (!$scope.addresses.length) {
      $scope.shipAddressId = '0';
    }
  }, function(error) {
    $scope.isLoading = false;
    console.error(error);
  });

  $scope.saveNewAddress = function() {
    ga('send', 'event', 'newaddress');
    $http.post(API_URL + "/Address/create_address", {
      userId: $site.userid,
      address: $scope.newAddress
    }).then(function(response) {
      var address = response.data.results;
      $scope.addresses.push(address);
      $scope.shipAddressId = address.id;
      $shoppingCart.updateShippingAddress(address);
    }, function(error) {
      console.error(error);
    });
  }

  $scope.updateShippingAddress = function() {
    var addy = $scope.addresses.find(function(addr) {
      return addr.id == $scope.shipAddressId;
    });
    if (addy) {
      $shoppingCart.updateShippingAddress(addy);
    }
  }

  $scope.continueToBilling = function() {
    if ($scope.shipAddressId) {
      $shoppingCart.loadCart(function(cart) {
        if (cart.total == 0) {
          $location.path('/app/confirm-order');
        }
        else {
          $location.path('/app/billing');
        }
      });
    }
    else {
      $site.displayNotification("Choose a shipping address before you continue");
    }
  }
}]);
