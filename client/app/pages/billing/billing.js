app.controller("billingController", ["Site", "$scope", "$http", "ShoppingCart", "$location", function($site, $scope, $http, $shoppingCart, $location) {
  $scope.$site = $site;

  $scope.cards = [];
  $scope.billingId = $shoppingCart.getBillingId();

  $shoppingCart.loadCart(function(cart) {
    if (cart.total == 0) {
      $location.path('/app/confirm-order');
    }
  });

  $scope.isSavingBillingInfo = false;
  $scope.newCard = {
    cardNumber: '',
    securityCode: '',
    expMonth: String(new Date().getMonth() + 1),
    expYear: String(new Date().getFullYear())
  };
  $scope.cardIsValid = true;
  $scope.securityCodeIsValid = true;

  var cardRegex = /^[0-9]{15,16}$/;
  var cvcRegex = /^[0-9]{3,4}$/;

  $scope.expirationYears = [];
  var currentYear = new Date().getFullYear();
  for (var i=currentYear; i < currentYear+20; i++) {
    $scope.expirationYears.push(String(i));
  }

  $scope.isLoading = true;
  $http.post(API_URL + "/Billing/get_cards_for_user", {
    userId: $site.userid
  }).then(function(response) {
    $scope.isLoading = false;
    $scope.cards = response.data.results;
    if (!$scope.cards.length) {
      $scope.billingId = 0;
    }
  }, function(error) {
    $scope.isLoading = false;
    console.error(error);
  });

  $scope.validatePaymentInfo = function() {
    var isValid = true;

    console.log("validatePaymentInfo");
    if (!$scope.newCard.cardNumber || !cardRegex.test($scope.newCard.cardNumber)) {
      isValid = false;
      $scope.cardIsValid = false;
    }
    else {
      $scope.cardIsValid = true;
    }

    if (!$scope.newCard.securityCode || !cvcRegex.test($scope.newCard.securityCode)) {
      isValid = false;
      $scope.securityCodeIsValid = false;
    }
    else {
      $scope.securityCodeIsValid = true;
    }

    if (isValid) {
      ga('send', 'event', 'newbilling');
      $scope.isSavingBillingInfo = true;
      Stripe.card.createToken({
        number: $scope.newCard.cardNumber,
        cvc: $scope.newCard.securityCode,
        exp_month: $scope.newCard.expMonth,
        exp_year: $scope.newCard.expYear
      }, function(status, response) {
        if (status == 200) {
          $http.post(API_URL + "/Billing/save_billing_token", {
            userId: $site.userid,
            token: response.id,
            cardToken: response.card.id,
            brand: response.card.brand,
            expMonth: response.card.exp_month,
            expYear: response.card.exp_year,
            lastFour: response.card.last4
          }).then(function(response) {
            console.log(response);
            $scope.isSavingBillingInfo = false;
            $scope.cards.push(response.data.results);
            $scope.billingId = response.data.results.id;
            $shoppingCart.updateBillingInfo(response.data.results);
          }, function(error) {
            console.log(error);
            $scope.isSavingBillingInfo = false;
          });
        }
        else {
          console.log("error");
          $site.displayNotification("There was a problem saving your payment information: " + response.error.message);
          $scope.isSavingBillingInfo = false;
          $scope.$apply();
        }
      });
    }
  }

  $scope.updateBillingInfo = function() {
    var card = $scope.cards.find(function(c) {
      return c.id == $scope.billingId;
    });
    if (card) {
      $shoppingCart.updateBillingInfo(card);
    }
  }

  $scope.continueToReview = function() {
    $location.path('/app/confirm-order');
  }

}]);
