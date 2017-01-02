app.service('uploadDesign', ['$rootScope', '$http', function($rootScope, $http) {
  var UploadDesign = {};

  function getCartItemByGuid(guid) {
    var itemStr = localStorage.getItem('item' + guid);
    if (!itemStr) {
      return null;
    }
    return JSON.parse(itemStr);
  }

  function getCart() {
    var cartStr = localStorage.getItem('cart');
    if (!cartStr) {
      return null;
    }
    return JSON.parse(cartStr);
  }

  $rootScope.$on("uploadDesignFromCart", function(event, guid) {
    var cart = getCart();
    var item = getCartItemByGuid(guid);

    if (!item) {
      return;
    }

    var broadcast = {
      'message': 'uploading',
      'guid': guid
    };
    $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));

    $http.post(API_URL + "/Cart/upload_design", {
      'designGuid': guid,
      'projectData': JSON.stringify(item.projectData),
      'svg': item.svg
    }).then(function(response) {
      var broadcast = {
        'message': 'done',
        'guid': guid
      };
      $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));
    }, function(error) {
      console.error(error);
    });
  });

  return UploadDesign;
}]);
