app.controller("processOrdersController", ["$scope", "$http", "$location", "Site", "$rootScope", "svgToJpg",
function($scope, $http, $location, $site, $rootScope, svgToJpg) {
  $scope.templateProductId = null;
  $scope.templateProduct = {};
  $scope.svg = null;
  $scope.svgText = null;

  $scope.isLoading = false;
  $scope.orderItemId = null;

  $scope.isLoadingTemplate = false;
  $scope.isProcessing = false;
  $scope.processingStatus = '';

  var projectData = {
    fills: {
      /*
      'id': {
        color: String
      }
      */
    },
    photos: {
      /*
      'id': {
        element: (svgelement),
        imageBounds: (rect describing current location and size of photo relative to svgelement's bounds),
        src: (URL of the image -- temporarily not populated when a file is opened from local device until the file is uploaded and returns a URL)
        svgBounds: (rect describing the location and size of the photo element in svg units),

        base64: (base64 encoded image -- only used when opening a file from local device),
        rotation: (only used to correct a base64 image based on EXIF)
      }
      */
    },
    strokes: {
      /*
      'id': {
        color: String
      }
      */
    }
  };
  var PHOTO_PLACEHOLDER_COLOR = "#D0D2D3";

  $scope.loadNextFile = function() {
    $scope.isLoading = true;
    $http.post(API_URL + "/Processing/get_next_template_order_item")
    .then(function(response) {
      $scope.isLoading = false;
      console.log("loadNextFile:", response.data.results);
      if (response.data.results) {
        $scope.templateProductId = response.data.results.templateProductId;
        $scope.filename = response.data.results.filename;
        $scope.guid = response.data.results.guid;
        $scope.projectData = JSON.parse(response.data.results.projectData);
        $scope.orderItemId = response.data.results.orderItemId;
        $scope.loadTemplateProduct();
      }
      console.log($scope.isLoading, $scope.orderItemId);
    }, function(err) {
      $scope.isLoading = false;
      console.error(err);
    });
  }

  $scope.loadTemplateProduct = function() {
    $scope.isLoadingTemplate = true;
    $http.post(API_URL + "/Template/get_template_product", {
      templateProductId: $scope.templateProductId
    }).then(function(response) {
      $scope.isLoadingTemplate = false;
      $scope.templateProduct = response.data.results;
      updatePrintSize();
      loadSvg(function() {
        resizeSvgToFitArtboard($scope.svg, document.getElementById('artboard'));
      });
    }, function(error) {
      $scope.isLoadingTemplate = false;
      $site.displayNotification("There was a problem loading this design template. Try again later or contact customer support.");
      console.error(error);
    });
  }

  $scope.processOrder = function() {
    $scope.isProcessing = true;
    var broadcast = {
      projectData: $scope.projectData,
      guid: $scope.guid,
      svg: $scope.svgText,
      orderItemId: $scope.orderItemId
    };
    $rootScope.$broadcast("processDesign", broadcast);
  }

  $scope.$on("processingImage", function($event, data) {
    console.log(data.message);
    $scope.processingStatus = data.message;
    if (data.message == 'done') {
      $scope.isProcessing = false;
      // TODO: the next step after the processing of the image is complete
    }
  });

  function updatePrintSize() {
    var longestSide = Math.max($scope.templateProduct.width, $scope.templateProduct.height);
    var shortestSide = Math.min($scope.templateProduct.width, $scope.templateProduct.height);
    var newPrintSize = {
      width: $scope.templateProduct.orientation == 'landscape' ? longestSide : shortestSide,
      height: $scope.templateProduct.orientation == 'portrait' ? longestSide : shortestSide
    };
    projectData.printSize = newPrintSize;
  }

  function loadSvg(callback) {
    if (!$scope.guid) {
      return;
    }

    var url = CART_THUMBNAIL_PATH + '/' + $scope.guid + '.svg';

    var xhr = new XMLHttpRequest;
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status < 400) {
          var svgText = xhr.response;
          svgText = svgText.replace(/ns[0-9]+:href/gi, "xlink:href");
          $scope.svgText = svgText;
          var artboard = document.getElementById('artboard');
          artboard.innerHTML = $scope.svgText;
          $scope.svg = artboard.getElementsByTagName('svg')[0];
          if (callback) {
            callback();
          }
          $scope.$apply();
        }
        else {
          console.error("Couldn't load svg");
        }
      }
    };
    xhr.send();
  }

  var screenStyleElement = null;
  function resizeSvgToFitArtboard(svgElement, artboard) {
    var svgSize = {
      width: parseFloat(svgElement.getAttribute('width')) || svgElement.getAttribute('viewBox').split(' ')[2],
      height: parseFloat(svgElement.getAttribute('height')) || svgElement.getAttribute('viewBox').split(' ')[3]
    };
    var svgaspect = svgSize.width / svgSize.height;
    var artboardaspect = artboard.offsetWidth / artboard.offsetHeight;

    var newSvgSize = {
      width: artboard.offsetWidth,
      height: artboard.offsetHeight
    };

    if (svgaspect > artboardaspect) {
      newSvgSize.height = newSvgSize.width / svgaspect;
    }
    else {
      newSvgSize.width = newSvgSize.height * svgaspect;
    }

    if (!screenStyleElement) {
      screenStyleElement = document.createElement("style");
      screenStyleElement.type = "text/css";
      document.head.appendChild(screenStyleElement);
    }
    screenStyleElement.innerHTML += "@media screen { #artboard svg { width: " + newSvgSize.width + "px; height: " + newSvgSize.height + "px; } }";
  }

  $scope.loadNextFile();
}]);
