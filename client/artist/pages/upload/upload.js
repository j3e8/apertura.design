app.controller("uploadController", ["$scope", "$http", "$timeout", "$route", "Site", function($scope, $http, $timeout, $route, $site) {

  $scope.isSaving = false;
  $scope.name = '';
  $scope.newKeyword = '';
  $scope.keywords = [];
  $scope.templates = [];

  var input = document.getElementById('svgInput');
  if (!input) {
    input = document.createElement("input");
    input.id = "svgInput";
    input.type = "file";
    input.accept = ".svg";
    input.style.display = "none";
    input.onchange = handleFileChosen;
    document.body.appendChild(input);
  }

  var jpgInput = document.getElementById("jpgInput");
  if (!jpgInput) {
    jpgInput = document.createElement("input");
    jpgInput.id = "jpgInput";
    jpgInput.type = "file";
    jpgInput.accept = ".jpg";
    jpgInput.style.display = "none";
    jpgInput.onchange = handleThumbnailChosen;
    document.body.appendChild(jpgInput);
  }

  $scope.openFileBrowser = function() {
    var input = document.getElementById('svgInput');
    input.click();
  }

  $scope.openThumbnailBrowser = function() {
    var input = document.getElementById('jpgInput');
    input.click();
  }

  $scope.loadCompatibleProducts = function(template) {
    $http.post(API_URL + "/Product/get_products_by_aspect", {
      aspectRatio: template.aspectRatio,
      canDesign: true
    }).then(function(response) {
      var products = response.data.results;
      var productMediums = [];
      products.forEach(function(p, index) {
        if (!index || productMediums[productMediums.length-1].medium != p.medium) {
          productMediums.push({
            medium: p.medium,
            products: []
          });
        }
        productMediums[productMediums.length-1].products.push(p);
      });
      template.productGroups = productMediums;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.submitTemplate = function() {
    $scope.isSaving = true;
    var templateFiles = $scope.templates.map(function(t) {
      var templateProducts = [];
      t.productGroups.forEach(function(pg) {
        var arr = pg.products.map(function(p) {
          return p.isSelected ? p.sku : null;
        }).filter(function(p) {
          return p != null;
        });
        templateProducts = templateProducts.concat(arr);
      });
      return {
        aspectRatio: t.aspectRatio,
        filename: t.filename,
        orientation: t.orientation,
        products: templateProducts,
        svgFile: t.svgFile
      }
    });
    $http.post(API_URL + "/Template/upload_template", {
      name: $scope.name,
      artistId: 1,
      keywords: $scope.keywords,
      templateFiles: templateFiles,
      thumbnail: $scope.thumbnail
    }).then(function(response) {
      $scope.isSaving = false;
      $route.reload();
      $site.displayNotification("Your design has been submitted for review.");
    }, function(error) {
      console.error(error);
    });
  }

  $scope.getMediumDisplayName = function(medium) {
    switch (medium) {
      case 'photo':
        return 'Photo prints';
      case 'canvas':
        return 'Gallery wrapped canvases';
      case 'poster':
        return 'Posters';
      case 'canvasposter':
        return 'Canvas posters';
      default:
        return medium;
    }
  }

  $scope.catchEnter = function($event) {
    if ($event.keyCode == 13) {
      $scope.addKeyword();
    }
  }

  $scope.addKeyword = function() {
    var keyword = $scope.newKeyword.replace(/^\s+/, '').replace(/\s+$/, '');
    if ($scope.keywords.indexOf(keyword) == -1) {
      $scope.keywords.push(keyword);
      $scope.newKeyword = '';
    }
  }

  $scope.removeKeyword = function(keyword) {
    if ($scope.keywords.indexOf(keyword) != -1) {
      $scope.keywords.splice($scope.keywords.indexOf(keyword), 1);
    }
  }

  function handleThumbnailChosen(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function() {
      $scope.thumbnail = reader.result;
      $scope.$apply();
    }
    reader.readAsDataURL(file);
  }

  function handleFileChosen(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function() {
      var svgString = reader.result;
      var template = {
        svgFile: btoa(svgString),
        filename: file.name,
        artboardId: 'artboard' + $scope.templates.length
      };
      $scope.templates.push(template);

      $timeout(function() {
        var artboard = document.getElementById(template.artboardId);
        artboard.innerHTML = svgString;
        template.svgElement = findSvgInDOM(artboard);

        resizeSvgToFitArtboard(template.svgElement, artboard);

        template.orientation = getOrientationOfSvg(template.svgElement);
        template.aspectRatio = getAspectRatioOfSvg(template.svgElement);

        if (templateHasUniqueAspectRatio(template)) {
          $scope.loadCompatibleProducts(template);
        }
        else {
          $scope.templates.splice($scope.templates.indexOf(template), 1);
        }
      }, 0);
      $scope.$apply();
    }
    reader.readAsText(file);
  }

  function templateHasUniqueAspectRatio(template) {
    var existingTemplate = $scope.templates.find(function(t) {
      return t.aspectRatio == template.aspectRatio && t.orientation == template.orientation && t != template;
    });
    return existingTemplate ? false : true;
  }

  function findSvgInDOM(element) {
    if (element.tagName == 'svg') {
      return element;
    }
    if (element.childNodes) {
      for (var i=0; i < element.childNodes.length; i++) {
        var el = findSvgInDOM(element.childNodes[i]);
        if (el) {
          return el;
        }
      }
    }
    return null;
  }

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

    svgElement.style.width = newSvgSize.width + "px";
    svgElement.style.height = newSvgSize.height + "px";
  }

  function getAspectRatioOfSvg(svgElement) {
    var svgSize = {
      width: parseFloat(svgElement.getAttribute('width')) || svgElement.getAttribute('viewBox').split(' ')[2],
      height: parseFloat(svgElement.getAttribute('height')) || svgElement.getAttribute('viewBox').split(' ')[3]
    };
    var longestSide = Math.max(svgSize.width, svgSize.height);
    var shortestSide = Math.min(svgSize.width, svgSize.height);
    var aspectRatio = (longestSide / shortestSide).toFixed(3);
    return aspectRatio;
  }

  function getOrientationOfSvg(svgElement) {
    var svgSize = {
      width: parseFloat(svgElement.getAttribute('width')) || svgElement.getAttribute('viewBox').split(' ')[2],
      height: parseFloat(svgElement.getAttribute('height')) || svgElement.getAttribute('viewBox').split(' ')[3]
    };
    if (svgSize.width >= svgSize.height) {
      return 'landscape';
    }
    return 'portrait';
  }

}]);
