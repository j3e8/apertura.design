app.controller("createController", ["$scope", "$http", "$routeParams", "$location", "Site", "Util", "$rootScope", "uploadDesign", "project",
function($scope, $http, $routeParams, $location, $site, $util, $rootScope, uploadDesign, project) {
  $scope.project = project;

  $scope.templateProductId = $routeParams.templateProductId;
  $scope.savedTemplateId = $routeParams.savedTemplateId;
  $scope.templateProduct = {};
  $scope.isLoadingTemplate = false;

  $scope.colorizerIsDisplayed = undefined;
  $scope.photoSourcesIsDisplayed = undefined;
  $scope.aperturaPhotoPickerIsDisplayed = undefined;
  $scope.lastSource = null;

  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".jpg,.jpeg";
  input.style.display = "none";
  input.onchange = openPhoto;
  document.body.appendChild(input);

  function openPhoto() {
    $scope.$broadcast("openPhoto", input.files[0]);
  }

  $scope.loadTemplateProduct = function() {
    $scope.isLoadingTemplate = true;
    $http.post(API_URL + "/Template/get_template_product", {
      templateProductId: $scope.templateProductId
    }).then(function(response) {
      $scope.templateId = response.data.results.id;
      ga('send', 'event', 'create', $scope.templateId);
      $scope.isLoadingTemplate = false;
      $scope.templateProduct = response.data.results;
      $scope.lookupOtherOrientation();
      $scope.lookupEdgeOptions();
      updateCssPageSize();
    }, function(error) {
      $scope.isLoadingTemplate = false;
      $site.displayNotification("There was a problem loading this design template. Try again later or contact customer support.");
      console.error(error);
    });
  }

  $scope.$on("svgLoaded", function($event, data) {
    loadSavedTemplate();
  });

  $scope.$on("photoClicked", function($event, data) {
    $scope.togglePhotoSources();
  });

  $scope.lookupOtherOrientation = function() {
    $http.post(API_URL + "/Template/get_rotated_template_product", {
      templateProductId: $scope.templateProductId
    }).then(function(response) {
      if (response.data.results) {
        $scope.otherOrientation = response.data.results.orientation;
        $scope.otherOrientationId = response.data.results.id;
      }
      else {
        $scope.otherOrientation = null;
        $scope.otherOrientationId = null;
      }
    }, function(error) {
      console.error(error);
    });
  }

  $scope.lookupEdgeOptions = function() {
    $http.post(API_URL + "/Template/get_template_product_edge_options", {
      templateProductId: $scope.templateProductId
    }).then(function(response) {
      if (response.data.results) {
        $scope.otherEdgeTemplateProductId = response.data.results.id;
      }
      else {
        $scope.otherEdgeTemplateProductId = null;
      }
    }, function(error) {
      console.error(error);
    });
  }

  $scope.switchToImageWrap = function() {
    if ($scope.templateProduct.edge != 'wrap') {
      var tmp = $scope.templateProductId;
      $scope.templateProductId = $scope.otherEdgeTemplateProductId;
      $scope.otherEdgeTemplateProductId = tmp;
      project.svg = null;
      $scope.loadTemplateProduct();
    }
    project.data.edgeColor = undefined;
  }

  $scope.switchToBlackEdge = function() {
    if ($scope.templateProduct.edge != 'none') {
      switchToColoredEdge();
    }
    project.data.edgeColor = '#000000';
  }

  $scope.switchToWhiteEdge = function() {
    if ($scope.templateProduct.edge != 'none') {
      switchToColoredEdge();
    }
    project.data.edgeColor = '#ffffff';
  }

  function switchToColoredEdge() {
    var tmp = $scope.templateProductId;
    $scope.templateProductId = $scope.otherEdgeTemplateProductId;
    $scope.otherEdgeTemplateProductId = tmp;
    project.svg = null;
    $scope.loadTemplateProduct();
  }

  $scope.switchToPortrait = function() {
    if ($scope.templateProduct.orientation != 'portrait') {
      switchToOtherOrientation();
    }
  }

  $scope.switchToLandscape = function() {
    if ($scope.templateProduct.orientation != 'landscape') {
      switchToOtherOrientation();
    }
  }

  function switchToOtherOrientation() {
    var tmp = $scope.templateProductId;
    $scope.templateProductId = $scope.otherOrientationId;
    $scope.otherOrientationId = tmp;
    project.svg = null;
    $scope.loadTemplateProduct();
  }

  var printStyleElement = null;
  function updateCssPageSize() {
    console.log("create.js", "updateCssPageSize()");
    var longestSide = Math.max($scope.templateProduct.width, $scope.templateProduct.height);
    var shortestSide = Math.min($scope.templateProduct.width, $scope.templateProduct.height);
    var newPrintSize = {
      width: $scope.templateProduct.orientation == 'landscape' ? longestSide : shortestSide,
      height: $scope.templateProduct.orientation == 'portrait' ? longestSide : shortestSide
    };
    project.data.printSize = newPrintSize;
    if (!printStyleElement) {
      printStyleElement = document.createElement("style");
      printStyleElement.type = "text/css";
      document.head.appendChild(printStyleElement);
    }
    printStyleElement.innerHTML = "@page { size: " + newPrintSize.width + "in " + newPrintSize.height + "in; margin: 0in; }";
    printStyleElement.innerHTML += "@media print { #artboard svg { width: " + newPrintSize.width + "in; height: " + newPrintSize.height + "in; } }";
  }

  function loadSavedTemplate() {
    if (!$scope.savedTemplateId) {
      return;
    }
    project.data = JSON.parse(localStorage.getItem('template_' + $scope.savedTemplateId));
  }

  $scope.saveProject = function() {
    if (!project.canSave) {
      $site.displayNotification("You'll need to add photos to all placeholders in the design and wait for them to finish uploading before you can save this project.");
      return;
    }
    $scope.isSaving = true;
    var savableProjectData = getSavableProjectData();
    $http.post(API_URL + "/Template/save_user_template", {
      id: $scope.savedTemplateId,
      templateProductId: $scope.templateProductId,
      data: savableProjectData
    }).then(function(response) {
      $scope.isSaving = false;
      $scope.savedTemplateId = response.data.results;
      $location.path('/app/create/' + $scope.templateProductId + '/' + $scope.savedTemplateId);
      localStorage.setItem('template_' + $scope.savedTemplateId, JSON.stringify(savableProjectData));
    }, function(error) {
      $scope.isSaving = false;
      console.error(error);
    });
  }

  function getSavableProjectData() {
    var photoData = {};
    for (var id in project.data.photos) {
      photoData[id] = {
        imageBounds: project.data.photos[id].imageBounds,
        src: project.data.photos[id].src,
        rotation: project.data.photos[id].rotation
      }
    }
    var data = {
      fills: Object.assign({}, project.data.fills),
      strokes: Object.assign({}, project.data.strokes),
      photos: photoData
    }
    return data;
  }

  $scope.printProject = function() {
    window.print();
  }

  $scope.addToCart = function() {
    if (!project.canSave) {
      $site.displayNotification("You'll need to add photos to all placeholders in the design and wait for them to finish uploading before you can add this project to your cart.");
      return;
    }
    ga('send', 'event', 'addToCart', $scope.templateId);
    var cart = {};
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      cart = JSON.parse(cartStr);
    }
    if (!cart.items) {
      cart.items = [];
    }
    var item = {
      'guid': $util.createGuid(8),
      'templateProductId': $scope.templateProductId,
      'sku': $scope.templateProduct.sku,
      'externalId': $scope.templateProduct.externalId,
      'name': $scope.templateProduct.productName,
      'qty': 1,
      'price': $scope.templateProduct.price,
      'projectData': project.data,
      'size': {},
      'svg': project.svg.outerHTML
    };
    localStorage.setItem('item' + item.guid, JSON.stringify(item));
    cart.items.push(item.guid);
    localStorage.setItem('cart', JSON.stringify(cart));

    $http.post(API_URL + "/Cart/add_to_cart", {
      'guid': item.guid,
      'userId': $site.userid,
      'templateProductId': item.templateProductId,
      'sku': item.sku,
      'externalId': item.externalId,
      'qty': item.qty,
      'svgText': item.svg
    }).then(function(response) {
      $rootScope.$broadcast("uploadDesignFromCart", item.guid);
      $location.path('/app/cart');
    }, function(err) {
      console.log(err);
    });
  }

  $scope.colorize = function(colorString) {
    $scope.$broadcast("colorize", colorString);
  }

  $scope.choosePhoto = function(photo) {
    $scope.$broadcast("choosePhoto", photo);
    $scope.toggleAperturaPhotoPicker();
  }

  $scope.$on("colorizerIsDisplayed", function($event, data) {
    $scope.colorizerIsDisplayed = data;
  });

  $scope.toggleColorizer = function() {
    $scope.colorizerIsDisplayed = $scope.colorizerIsDisplayed ? false : true;
    if (!$scope.colorizerIsDisplayed) {
      $scope.$broadcast("colorizerIsDisplayed", false);
    }
  }

  $scope.switchPhotoSource = function() {
    $scope.photoSourcesIsDisplayed = true;
    $scope.aperturaPhotoPickerIsDisplayed = false;
  }

  $scope.togglePhotoSources = function() {
    var photoSourcesWasDisplayed = ($scope.photoSourcesIsDisplayed == true) || ($scope.aperturaPhotoPickerIsDisplayed == true);
    if ($scope.lastSource == 'apertura' && !$scope.aperturaPhotoPickerIsDisplayed) {
      $scope.aperturaPhotoPickerIsDisplayed = true;
    }
    else {
      $scope.photoSourcesIsDisplayed = $scope.photoSourcesIsDisplayed ? false : true;
    }
    var photoSourcesAreDisplayed = ($scope.photoSourcesIsDisplayed == true) || ($scope.aperturaPhotoPickerIsDisplayed == true);
    if (photoSourcesAreDisplayed && !photoSourcesWasDisplayed) {
      ga('send', 'event', 'openPhotoSources', $scope.templateId);
    }
  }

  $scope.browseForPhoto = function() {
    $scope.photoSourcesIsDisplayed = false;
    $scope.lastSource = 'device';
    input.click();
  }

  $scope.toggleAperturaPhotoPicker = function() {
    $scope.photoSourcesIsDisplayed = false;
    $scope.aperturaPhotoPickerIsDisplayed = $scope.aperturaPhotoPickerIsDisplayed ? false : true;
    $scope.lastSource = 'apertura';
  }



  $scope.loadTemplateProduct();
}]);
