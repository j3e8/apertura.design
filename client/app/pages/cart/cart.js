app.controller("cartController", ["$scope", "$http", "$routeParams", "$location", "$rootScope", "$sce", "Site", "ShoppingCart", "$timeout",
function($scope, $http, $routeParams, $location, $rootScope, $sce, $site, $shoppingCart, $timeout) {

  $scope.cartIsLoading = true;
  $scope.cart = {};
  $scope.shippingIsLoading = false;

  $scope.newDiscountCode = null;

  $rootScope.$on("processingImage", function(event, dataString) {
    var data = JSON.parse(dataString);
    updateImageProgress(data);
  });

  function updateImageProgress(data) {
    if (!$scope.cart.items) {
      $timeout(updateImageProgress.bind(this, data), 10);
      return;
    }
    var item = $scope.cart.items.find(function(item) {
      return item.guid == data.guid;
    });

    if (item) {
      if (data.message == 'uploading') {
        item.status = 'Uploading artwork to print server';
      }
      else if (data.message == 'done') {
        item.isUploaded = true;
        item.status = undefined;
        localStorage.setItem('item' + data.guid, JSON.stringify(item));
        $shoppingCart.loadCart(function(cart) {
          $scope.cart = cart;
        });
      }
    }
  }

  $scope.catchEnter = function($event) {
    if ($event.keyCode == 13) {
      $scope.applyDiscountCode();
    }
  }

  $scope.applyDiscountCode = function() {
    ga('send', 'event', 'discount', $scope.newDiscountCode);
    $shoppingCart.applyDiscountCode($scope.newDiscountCode, function(cart) {
      $scope.cart = cart;
    });
  }

  $scope.updateQuantity = function(item) {
    $shoppingCart.updateQuantity(item.guid, item.qty, function(cart) {
      $scope.cart = cart;
    });
  }

  $scope.loadShippingQuote = function() {
    $scope.shippingIsLoading = true;
    ga('send', 'event', 'shippingQuote', $scope.cart.shipZip);
    $shoppingCart.loadShippingQuote($scope.cart.shipZip, function(cart) {
      $scope.shippingIsLoading = false;
      $scope.cart = cart;
    });
  }

  $scope.toggleRemoveItemConfirmation = function(item) {
    item.isRemoveItemConfirmationDisplayed = item.isRemoveItemConfirmationDisplayed ? false : true;
  }

  $scope.removeItem = function(item) {
    $shoppingCart.removeItem(item.guid, function(cart) {
      $scope.cart = cart;
    });
  }

  $scope.removeDiscountCode = function() {
    $shoppingCart.removeDiscountCode(function(cart) {
      $scope.cart = cart;
    });
  }

  $scope.continueCheckout = function() {
    if ($site.isSignedIn) {
      $location.path('/app/shipping');
    }
    else {
      $location.path('/app/signin').search('redir', '/app/shipping');
    }
  }

  $shoppingCart.loadCart(function(cart) {
    $scope.cartIsLoading = false;
    $scope.cart = cart;
  });
}]);
