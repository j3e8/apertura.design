app.directive("cartSidebar", ["ShoppingCart", "$rootScope", function($shoppingCart, $rootScope) {
  return {
    restrict: 'E',
    templateUrl: '/app/components/cart-sidebar/cart-sidebar.html',
    link: function($scope, $element, $attrs) {

      function loadCart() {
        $shoppingCart.loadCart(function(cart) {
          $scope.cart = cart;
        });
      }
      loadCart();

      $rootScope.$on("updateShippingAddress", function($event, data) {
        loadCart();
      });

      $rootScope.$on("updateBillingInfo", function($event, data) {
        loadCart();
      });
    }
  }
}]);
