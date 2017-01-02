var DOMAIN = "apertura.design";
var SITE_ROOT = "";
var SITE_PATH = SITE_ROOT + "/app";
var API_URL = SITE_ROOT + "/api";

var CART_THUMBNAIL_PATH = "https://s3.amazonaws.com/orders.apertura.design/svg";

Stripe.setPublishableKey('pk_live_7PXiaL4diCcRWwqmizuNGSwM');

var app = angular.module("AperturaApp", ['ngAnimate', 'ngRoute', 'ngSanitize']);

app.config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode({ enabled: true, requireBase: false });
  $locationProvider.hashPrefix('!');

  $routeProvider
  .when('/app/', {
    templateUrl: '/app/pages/home/home.html',
    controller: 'homeController'
  })
  .when('/app/home', {
    templateUrl: '/app/pages/home/home.html',
    controller: 'homeController'
  })
  .when('/app/cart', {
    templateUrl: '/app/pages/cart/cart.html',
    controller: 'cartController'
  })
  .when('/app/canvas', {
    templateUrl: '/app/pages/canvas/canvas.html',
    controller: 'canvasController'
  })
  .when('/app/contact', {
    templateUrl: '/app/pages/contact/contact.html',
    controller: 'contactController'
  })
  .when('/app/create/:templateProductId', {
    templateUrl: '/app/pages/create/create.html',
    controller: 'createController'
  })
  .when('/app/create/:templateProductId/:savedTemplateId', {
    templateUrl: '/app/pages/create/create.html',
    controller: 'createController'
  })
  .when('/app/templates', {
    templateUrl: '/app/pages/templates/templates.html',
    controller: 'templatesController'
  })
  .when('/app/photos', {
    templateUrl: '/app/pages/photos/photos.html',
    controller: 'photosController'
  })
  .when('/app/signin', {
    templateUrl: '/app/pages/signin/signin.html',
    controller: 'signinController'
  })
  .when('/app/template/:templateId', {
    templateUrl: '/app/pages/template/template.html',
    controller: 'templateController'
  })
  .when('/app/shipping', {
    templateUrl: '/app/pages/shipping/shipping.html',
    controller: 'shippingController'
  })
  .when('/app/billing', {
    templateUrl: '/app/pages/billing/billing.html',
    controller: 'billingController'
  })
  .when('/app/confirm-order', {
    templateUrl: '/app/pages/confirm-order/confirm-order.html',
    controller: 'confirmOrderController'
  })
  .when('/app/order/:orderId', {
    templateUrl: '/app/pages/order/order.html',
    controller: 'orderController'
  })
  .when('/app/privacy', {
    templateUrl: '/app/pages/privacy/privacy.html',
    controller: 'mainController'
  })
  .when('/app/my-account', {
    templateUrl: '/app/pages/my-account/my-account.html',
    controller: 'myAccountController'
  })
  .when('/app/saved-templates', {
    templateUrl: '/app/pages/saved-templates/saved-templates.html',
    controller: 'savedTemplatesController'
  })
  .when('/app/thank-you/:orderId', {
    templateUrl: '/app/pages/thank-you/thank-you.html',
    controller: 'thankYouController'
  })
  ;
}]);

app.controller("mainController", ["$scope", "$http", "$routeParams", function($scope, $http, $routeParams) {
}]);

Date.prototype.parse = function(datestring) {
  if (!datestring) {
    return null;
  }
  var arr = datestring.split(/[- :]/);
  var yr = arr[0];
  var mo = arr[1];
  var da = arr[2];
  var hr = arr.length > 3 ? arr[3] : 0;
  var mi = arr.length > 4 ? arr[4] : 0;
  var se = arr.length > 5 ? arr[5] : 0;
  return new Date(yr, mo-1, da, hr, mi, se);
}
