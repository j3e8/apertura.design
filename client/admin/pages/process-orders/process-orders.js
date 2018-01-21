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
  $scope.isProcessed = false;
  $scope.processingStatus = '';

  var projectData = {
    fills: {},
    photos: {},
    strokes: {}
  };
  var PHOTO_PLACEHOLDER_COLOR = "#D0D2D3";

  $scope.loadNextFile = function() {
    $scope.isLoading = true;
    $http.post(API_URL + "/Processing/get_next_template_order_item")
    .then(function(response) {
      $scope.isLoading = false;
      console.log("loadNextFile:", response.data.results);
      if (response.data.results) {
        $scope.orderId = response.data.results.orderId;
        $scope.templateProductId = response.data.results.templateProductId;
        $scope.filename = response.data.results.filename;
        $scope.guid = response.data.results.guid;
        $scope.projectData = JSON.parse(response.data.results.projectData);
        $scope.orderItemId = response.data.results.orderItemId;
        $scope.loadTemplateProduct();
        loadOrder($scope.orderId);
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
        adjustCanvasCorners($scope.svg);
        if ($scope.templateProduct.edge == 'wrap') {
          adjustWrappedEdges($scope.svg);
        }
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
      svg: /*$scope.svgText,*/ document.getElementById('artboard').innerHTML,
      orderItemId: $scope.orderItemId
    };
    $rootScope.$broadcast("processDesign", broadcast);
  }

  $scope.$on("processingImage", function($event, str) {
    var data = JSON.parse(str);
    console.log(data.message);
    $scope.processingStatus = data.message;
    if (data.message == 'done') {
      $scope.hiresUrl = data.images.hires;
      saveOrderItemImages(data.images.thumbnail, data.images.hires)
      .then(function() {
        $scope.isProcessing = false;
        $scope.isProcessed = true;
        // TODO load next one
      });
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

    var url = CART_SVG_PATH + '/' + $scope.guid + '.svg';

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

  function adjustCanvasCorners(svgElement) {
    var corners = findCornerElements(svgElement);
    if (corners) {
      corners.forEach(function(c) {
        c.parentNode.removeChild(c);
      });
    }
  }

  function findCornerElements(element) {
    var corners = [];
    if (element.id && element.id.indexOf('corners') == 0) {
      corners.push(element);
    }
    if (element.childNodes && element.childNodes.length) {
      for (var i=0; i < element.childNodes.length; i++) {
        var childCorners = findCornerElements(element.childNodes[i]);
        corners = corners.concat(childCorners);
      }
    }
    return corners;
  }

  function adjustWrappedEdges(svgElement) {
    var edges = findEdgeElements(svgElement);
    if (edges) {
      edges.forEach(function(edge) {
        edge.parentNode.removeChild(edge);
      });
    }
  }

  function findEdgeElements(element) {
    var edges = [];
    if (element.id && element.id.indexOf('edge') == 0) {
      edges.push(element);
    }
    if (element.childNodes && element.childNodes.length) {
      for (var i=0; i < element.childNodes.length; i++) {
        var childEdges = findEdgeElements(element.childNodes[i]);
        edges = edges.concat(childEdges);
      }
    }
    return edges;
  }

  function loadOrder(orderId) {
    $scope.isLoadingOrder = true;
    $http.post(API_URL + "/Order/get_order", {
      orderId: orderId
    }).then(function(response) {
      $scope.isLoadingOrder = false;
      $scope.order = response.data.results;
    }, function(error) {
      $scope.isLoadingOrder = false;
      console.error(error);
    });
  }

  function saveOrderItemImages(thumbnailUrl, hiresUrl) {
    return new Promise(function(resolve, reject) {
      $http.post(API_URL + "/Processing/save_order_item_images", {
        orderItemId: $scope.orderItemId,
        thumbnailUrl: thumbnailUrl,
        hiresUrl: hiresUrl
      }).then(function(response) {
        resolve(response.data);
      }, function(error) {
        console.error(error);
        reject();
      });
    });
  }

  $scope.loadNextFile();
}]);
