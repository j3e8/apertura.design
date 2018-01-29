app.directive("canvasDesigner", ["$http", "project", function($http, project) {
  return {
    restrict: 'E',
    scope: {
      templateProduct: '='
    },
    templateUrl: '/app/components/canvas-designer/canvas-designer.html',
    link: function($scope, $element, $attrs) {
      var elementToFill = null;
      var elementToStroke = null;
      var PHOTO_PLACEHOLDER_COLOR = "#D0D2D3";
      var IMAGE_WRAP_EDGE_COLOR = "#231F20";
      var IMAGE_WRAP_EDGE_OPACITY = 0.5;

      var placeholderImg = new Image();
      placeholderImg.src = SITE_PATH + "/assets/images/photo-placeholder.svg";
      var elementToPhotoBomb;
      var elementToFill, elementToStroke;
      var elementToDrag, elementToDragClickPt;
      var isDraggingPhoto = false;
      var lastMousePt = {};

      $scope.project = project;

      $scope.imageWaitIndicatorIsDisplayed = false;
      $scope.imageWaitIndicatorPosition = {
        left: 0,
        top: 0
      };

      $scope.$watch("project.data", function() {
        if (project.data) {
          console.log("canvas-designer.js", 'project.data', project.data);
          if (!project.data.photos) {
            project.data.photos = {};
          }
          if (!project.data.fills) {
            project.data.fills = {};
          }
          if (!project.data.strokes) {
            project.data.strokes = {};
          }
          applyProjectData();
        }
      });

      $scope.$watch("project.data.edgeColor", function() {
        if (project.data.edgeColor) {
          applyColoredEdges(project.svg, project.data.edgeColor);
        }
      });

      $scope.$watch("templateProduct", function() {
        console.log("canvas-designer.js", 'templateProduct', $scope.templateProduct);
        if ($scope.templateProduct && $scope.templateProduct.filename) {
          loadSvg(function() {
            applyProjectData();
            $scope.$emit("svgLoaded");
          });
        }
      });

      $scope.$on("colorize", function($event, data) {
        colorize(data);
      });

      $scope.$on("openPhoto", function($event, data) {
        openPhoto(data);
      });

      $scope.$on("choosePhoto", function($event, data) {
        choosePhoto(data);
      });

      $scope.$on("colorizerIsDisplayed", function($event, data) {
        if (data === false) {
          deselectActiveElementIfAny();
        }
      });

      function applyProjectData() {
        if (project.data.fills) {
          for (var id in project.data.fills) {
            var fillElement = project.svg.getElementById(id);
            applyFillToElement(fillElement, project.data.fills[id].color);
          }
        }
        if (project.data.strokes) {
          for (var id in project.data.strokes) {
            var strokeElement = project.svg.getElementById(id);
            applyStrokeToElement(strokeElement, project.data.strokes[id].color);
          }
        }
        if (project.data.photos) {
          for (var id in project.data.photos) {
            var photoElement = project.svg.getElementById(id);
            project.data.photos[id].element = photoElement;
            project.data.photos[id].image = null;
            project.data.photos[id].shapeBounds = Svg.calculateSvgElementBounds(photoElement);
            placeImage(project.data.photos[id]);
          }
        }
        if ($scope.templateProduct.templateType == 'canvas') {
          addEdgeStyles(artboard);
        }
        if (project.data.edgeColor) {
          applyColoredEdges(project.svg, project.data.edgeColor);
        }
      }

      function loadSvg(callback) {
        if (!$scope.templateProduct || !$scope.templateProduct.filename) {
          return;
        }
        var xhr = new XMLHttpRequest;
        xhr.open('get', SITE_PATH + '/assets/templates/svg/' + $scope.templateProduct.filename, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            var tmpsvg = xhr.responseXML.documentElement;
            project.svg = document.importNode(tmpsvg, true);
            var artboard = document.getElementById('artboard');
            artboard.innerHTML = '';
            artboard.appendChild(project.svg);

            resizeSvgToFitArtboard(project.svg, artboard);

            addPhotoClickHandlers(artboard);
            addFillClickHandlers(artboard);
            if ($scope.templateProduct.templateType == 'canvas') {
              addEdgeStyles(artboard);
            }
            if (callback) {
              callback();
            }
            $scope.$apply();
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

      function openPhoto(imgFile) {
        ga('send', 'event', 'openPhoto', $scope.templateId);
        if (!project.data.photos[elementToPhotoBomb.id]) {
          project.data.photos[elementToPhotoBomb.id] = {};
        }
        var projectPhoto = project.data.photos[elementToPhotoBomb.id];
        projectPhoto.isUploading = true;
        projectPhoto.element = elementToPhotoBomb;
        project.canSave = false;
        project.status = 'Uploading photo...';

        EXIF.getData(imgFile, function() {
          var orientation = EXIF.getTag(imgFile, 'Orientation');
          console.log("orientation", orientation);
          switch (orientation) {
            case 3:
              projectPhoto.rotation = 180;
              break;
              case 6:
              projectPhoto.rotation = 90;
              break;
            case 8:
              projectPhoto.rotation = 270;
              break;
            case 1:
            default:
              projectPhoto.rotation = 0;
              break;
          }
          var reader = new FileReader();
          reader.onload = function() {
            var dataURL = reader.result;
            if (projectPhoto.element) {
              projectPhoto.base64 = dataURL;

              uploadPhoto(dataURL, function(uploadResult) {
                projectPhoto.src = uploadResult.src;
                projectPhoto.image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', uploadResult.src);
                projectPhoto.base64 = undefined;
                projectPhoto.isUploading = false;
                projectPhoto.isUploaded = true;
                project.determineSavability();
              });

              $scope.$apply(function() {
                placeImage(projectPhoto);
              });
            }
          }
          reader.readAsDataURL(imgFile);
        });
      }

      uploadPhoto = function(dataURL, callback) {
        $http.post(API_URL + "/Photo/upload_photo", {
          base64: dataURL
        }).then(function(response) {
          if (callback) {
            callback(response.data.results);
          }
        }, function(error) {
          console.error(error);
        });
      }

      function choosePhoto(photo) {
        if (photo) {
          if (!elementToPhotoBomb) {
            return;
          }

          ga('send', 'event', 'choosePhoto', $scope.templateId);

          if (!project.data.photos[elementToPhotoBomb.id]) {
            project.data.photos[elementToPhotoBomb.id] = {};
          }
          var projectPhoto = project.data.photos[elementToPhotoBomb.id];
          projectPhoto.element = elementToPhotoBomb;
          projectPhoto.src = 'https://' + DOMAIN + '/' + photo.filename;
          projectPhoto.thumbnailSrc = projectPhoto.src + '/1920';

          placeImage(projectPhoto);
          project.determineSavability();
        }
      }

      /***
       * function placeImage(projectPhoto)
       * Requires a projectPhoto object with at least the following properties:
       * element, (src|base64)
      ***/
      function placeImage(projectPhoto) {
        console.log('placeImage');
        var thumbnailSrc = getImageSrc(projectPhoto);
        if (thumbnailSrc) {
          console.log('thumbnailSrc', thumbnailSrc.substring(0, 20));
        }
        else {
          console.log('no thumbnailSrc');
        }
        if (!thumbnailSrc) {
          return;
        }

        var defs = Svg.getDefsNode(project.svg);
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
          project.svg.insertBefore(defs, project.svg.firstChild);
        }
        console.log('defs', defs);

        var clippath = getOrCreateClipPath(projectPhoto, defs);
        console.log('clippath', clippath);
        projectPhoto.clippathId = clippath.id;
        projectPhoto.shapeBounds = Svg.calculateSvgElementBounds(projectPhoto.element);
        console.log('projectPhoto.shapeBounds', projectPhoto.shapeBounds);

        var elementRect = projectPhoto.element.getBoundingClientRect();
        console.log('elementRect', elementRect);
        $scope.imageWaitIndicatorIsDisplayed = true;
        $scope.imageWaitIndicatorPosition = {
          left: (elementRect.left + elementRect.width / 2 + document.body.scrollLeft) + "px",
          top: (elementRect.top + elementRect.height / 2 + document.body.scrollTop) + "px"
        };

        console.log('create image object');
        var image = new Image();
        image.onload = handlePlacedImageLoad.bind(image, projectPhoto);
        image.src = thumbnailSrc;
        console.log('END of placeImage');
      }

      function colorize(colorString) {
        if (elementToFill) {
          if (!project.data.fills[elementToFill.id]) {
            project.data.fills[elementToFill.id] = {};
          }
          project.data.fills[elementToFill.id].color = colorString;
          applyFillToElement(elementToFill, colorString);
        }
        else if (elementToStroke) {
          if (!project.data.strokes[elementToStroke.id]) {
            project.data.strokes[elementToStroke.id] = {};
          }
          project.data.strokes[elementToStroke.id].color = colorString;
          applyStrokeToElement(elementToStroke, colorString);
        }
      }

      function getImageSrc(projectPhoto) {
        if (projectPhoto.base64) {
          return projectPhoto.base64;
        }
        else if (projectPhoto.thumbnailSrc) {
          return projectPhoto.thumbnailSrc;
        }
        else {
          return projectPhoto.src;
        }
      }

      function handlePlacedImageLoad(projectPhoto) {
        console.log('handlePlacedImageLoad', projectPhoto);
        projectPhoto.image = getOrCreateSvgImage(projectPhoto);

        calculateImageBoundsForPhoto(projectPhoto, this);
        projectPhoto.image.setAttribute('width', projectPhoto.imageBounds.width + "px");
        projectPhoto.image.setAttribute('height', projectPhoto.imageBounds.height + "px");
        projectPhoto.image.setAttribute('x', projectPhoto.imageBounds.left + "px");
        projectPhoto.image.setAttribute('y', projectPhoto.imageBounds.top + "px");

        // set the src of the new svg image element to match the javascript img element
        projectPhoto.image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.src);
        if (projectPhoto.element.getAttribute('transform')) {
          projectPhoto.image.setAttribute('transform', projectPhoto.element.getAttribute('transform'));
        }

        // handle possible EXIF rotation
        applyPhotoExifRotation(projectPhoto);

        // remove previous styling so the photo can be seen
        applyFillToElement(projectPhoto.element, 'transparent');
        applyStrokeToElement(projectPhoto.element, 'transparent');
        console.log('final element', projectPhoto.element);

        $scope.imageWaitIndicatorIsDisplayed = false;
        $scope.$apply();
      }

      function applyPhotoExifRotation(projectPhoto) {
        console.log('applyPhotoExifRotation', projectPhoto.rotation);

        if (projectPhoto.element.getAttribute('transform')) {
          var g1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g1.setAttribute('transform', projectPhoto.element.getAttribute('transform'));
          projectPhoto.image.parentNode.insertBefore(g1, projectPhoto.image);
          projectPhoto.image.parentNode.removeChild(projectPhoto.image);
          g1.appendChild(projectPhoto.image);
        }

        if (projectPhoto.rotation) {
          var cx = Number(projectPhoto.imageBounds.left) + projectPhoto.imageBounds.width / 2;
          var cy = Number(projectPhoto.imageBounds.top) + projectPhoto.imageBounds.height / 2;
          var rotate = "rotate(" + projectPhoto.rotation + ", " + cx + ", " + cy + ")";
          projectPhoto.image.setAttribute('transform', rotate);
        }
        else {
          projectPhoto.image.removeAttribute('transform');
        }
      }

      function calculateImageBoundsForPhoto(projectPhoto, img) {
        console.log('calculateImageBoundsForPhoto');
        var imgWidth = img.width;
        var imgHeight = img.height;

        var imgRatio = imgWidth / imgHeight;
        var elementRatio = projectPhoto.shapeBounds.width / projectPhoto.shapeBounds.height;

        var newImgSize = {
          width: projectPhoto.shapeBounds.width,
          height: projectPhoto.shapeBounds.height
        };
        if (imgRatio > elementRatio) {
          newImgSize.width = newImgSize.height * imgRatio;
        }
        else {
          newImgSize.height = newImgSize.width / imgRatio;
        }

        var imageX = Number(projectPhoto.shapeBounds.left) + (projectPhoto.shapeBounds.width - newImgSize.width) / 2;
        var imageY = Number(projectPhoto.shapeBounds.top) + (projectPhoto.shapeBounds.height - newImgSize.height) / 2;

        projectPhoto.imageBounds = {
          left: Number(imageX),
          top: Number(imageY),
          right: Number(imageX) + Number(newImgSize.width),
          bottom: Number(imageY) + Number(newImgSize.height),
          width:  Number(newImgSize.width),
          height:  Number(newImgSize.height)
        }
        console.log('projectPhoto.imageBounds', projectPhoto.imageBounds);
      }

      function getOrCreateClipPath(projectPhoto, defs) {
        var clippathId = 'clippath_' + projectPhoto.element.id;
        var clippath = document.getElementById(clippathId);
        if (!clippath) {
          clippath = document.createElementNS('http://www.w3.org/2000/svg','clipPath');
          clippath.id = clippathId;
          defs.appendChild(clippath);
        }
        clippath.innerHTML = '';

        var clonedElements = getClippableElementsFromElement(projectPhoto.element);
        clonedElements.forEach(function(el) {
          el.removeAttribute('id');
          el.removeAttribute('class');
          clippath.appendChild(el);
        });
        return clippath;
      }

      function getClippableElementsFromElement(element) {
        var clipElements = [];
        var validTagNames = ['path','polygon','circle','ellipse','rect'];
        if (validTagNames.indexOf(element.tagName) != -1) {
          clipElements.push(element.cloneNode(false));
        } else if (element.childNodes) {
          for (var i=0; i < element.childNodes.length; i++) {
            var childClipElements = getClippableElementsFromElement(element.childNodes[i]);
            clipElements = clipElements.concat(childClipElements);
          }
        }
        return clipElements;
      }

      function getOrCreateSvgImage(projectPhoto) {
        var svgimage = projectPhoto.image;
        var g;
        if (!svgimage) {
          g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          svgimage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          svgimage.setAttribute("data-photoid", projectPhoto.element.id);
          g.setAttribute("clip-path", "url(#" + projectPhoto.clippathId + ")");
          g.appendChild(svgimage);
          projectPhoto.element.parentNode.insertBefore(g, projectPhoto.element);
          projectPhoto.image = svgimage;
        }
        svgimage.setAttribute('x', '-100in');
        svgimage.setAttribute('y', '-100in');
        console.log('getOrCreateSvgImage', svgimage);
        return svgimage;
      }



      function addPhotoClickHandlers(element) {
        if (!element) {
          return;
        }
        if (element.id && element.id.indexOf("photo") == 0) {
          element.style.cursor = "pointer";
          if (element.removeAttribute) {
            element.removeAttribute('fill');
            element.removeAttribute('stroke');
          }
          element.addEventListener("mousedown", handlePhotoMouseDown);
          element.addEventListener("mousemove", handlePhotoMouseMove);
          element.addEventListener("mouseup", handlePhotoMouseUp);
          addPlaceholderIcon(element);
        }
        if (element.childNodes) {
          for (var i=0; i < element.childNodes.length; i++) {
            addPhotoClickHandlers(element.childNodes[i]);
          }
        }
      }

      function addPlaceholderIcon(element) {
        var defs = Svg.getDefsNode(project.svg);
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
          project.svg.insertBefore(defs, project.svg.firstChild);
        }
        var patternId = "pattern_" + element.id;
        pattern = document.createElementNS('http://www.w3.org/2000/svg','pattern');
        pattern.id = patternId;
        pattern.setAttribute('patternUnits', "userSpaceOnUse");
        var svgSize = {
          width: parseFloat(project.svg.getAttribute('width')) || project.svg.getAttribute('viewBox').split(' ')[2],
          height: parseFloat(project.svg.getAttribute('height')) || project.svg.getAttribute('viewBox').split(' ')[3]
        };
        pattern.setAttribute('width', svgSize.width);
        pattern.setAttribute('height', svgSize.height);
        defs.appendChild(pattern);

        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', svgSize.width);
        rect.setAttribute('height', svgSize.height);
        rect.setAttribute('fill', PHOTO_PLACEHOLDER_COLOR);
        pattern.appendChild(rect);

        var placeholderSvgImage = document.createElementNS('http://www.w3.org/2000/svg','image');
        if (!project.data.photos[element.id]) {
          project.data.photos[element.id] = {};
        }
        var projectPhoto = project.data.photos[element.id];
        projectPhoto.shapeBounds = Svg.calculateSvgElementBounds(element);

        var pxPerPt = project.svg.getBoundingClientRect().width / svgSize.width;

        var placeholderIconSize = {
          width: 40 / pxPerPt,
          height: 40 / pxPerPt
        };

        var x = Number(projectPhoto.shapeBounds.left) + projectPhoto.shapeBounds.width / 2 - (placeholderIconSize.width / 2);
        var y = Number(projectPhoto.shapeBounds.top) + projectPhoto.shapeBounds.height / 2 - (placeholderIconSize.height / 2);
        placeholderSvgImage.setAttribute('x', x + "px");
        placeholderSvgImage.setAttribute('y', y + "px");
        placeholderSvgImage.setAttribute('width', placeholderIconSize.width + 'px');
        placeholderSvgImage.setAttribute('height', placeholderIconSize.height + 'px');
        placeholderSvgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', placeholderImg.src);
        pattern.appendChild(placeholderSvgImage);

        applyFillToElement(element, "url(#" + patternId + ")");
      }

      function addFillClickHandlers(element) {
        if (!element) {
          return;
        }
        if (element.id && element.id.indexOf("fill") == 0) {
          element.style.cursor = "pointer";
          element.addEventListener("click", handleFillClick);
        }
        if (element.childNodes) {
          for (var i=0; i < element.childNodes.length; i++) {
            addFillClickHandlers(element.childNodes[i]);
          }
        }
      }

      function addEdgeStyles(element) {
        if (!element) {
          return;
        }
        if (element.id && element.id.indexOf("edge") == 0) {
          if (element.removeAttribute) {
            element.removeAttribute('fill');
            element.removeAttribute('stroke');
          }
          if ($scope.templateProduct.edge == 'wrap') {
            element.style.cursor = "default";
            element.removeEventListener("click", handleEdgeClick);
            element.style.backgroundColor = IMAGE_WRAP_EDGE_COLOR;
            element.style.opacity = IMAGE_WRAP_EDGE_OPACITY;
          }
          else {
            element.style.cursor = "pointer";
            element.addEventListener("click", handleEdgeClick);
            element.style.backgroundColor = null;
            element.style.opacity = null;
            applyColoredEdges(element, project.data.edgeColor);
          }
        }
        if (element.childNodes) {
          for (var i=0; i < element.childNodes.length; i++) {
            addEdgeStyles(element.childNodes[i]);
          }
        }
      }

      function applyColoredEdges(element, edgeColor) {
        if (!element) {
          return;
        }
        if (element.id && element.id.indexOf("edge") == 0) {
          applyFillToElement(element, edgeColor);
        }
        if (element.childNodes) {
          for (var i=0; i < element.childNodes.length; i++) {
            applyColoredEdges(element.childNodes[i], edgeColor);
          }
        }
      }

      function handlePhotoClick(event) {
        $scope.$apply(function() {
          elementToPhotoBomb = getPhotoElementFromClickedElement(event.target);
          $scope.$emit("photoClicked");
        });
      }

      function getPhotoElementFromClickedElement(element) {
        var artboard = document.getElementById('artboard');
        while (element.id.indexOf("photo") != 0 && element != artboard) {
          element = element.parentNode;
        }
        return element;
      }

      function handlePhotoMouseDown(event) {
        handlePhotoDown(event.target, event.clientX, event.clientY);
      }

      function handlePhotoTouchStart(event) {
        event.preventDefault();
        var touch = event.touches[0];
        if (touch) {
          handlePhotoDown(event.target, touch.clientX, touch.clientY);
        }
      }

      function handlePhotoDown(targetElement, x, y) {
        isDraggingPhoto = false;
        elementToDrag = getPhotoElementFromClickedElement(targetElement);
        if (elementToDrag && project.data.photos[elementToDrag.id] && project.data.photos[elementToDrag.id].image) {
          var imageBounds = project.data.photos[elementToDrag.id].imageBounds;
          var svgBounds = project.svg.getBoundingClientRect();
          elementToDragClickPt = {
            'x': (x - svgBounds.left),
            'y': (y - svgBounds.top)
          };
        }
        lastMousePt = {
          'x': x,
          'y': y
        };
      }

      function handlePhotoMouseMove(event) {
        handlePhotoMove(event.clientX, event.clientY);
      }

      function handlePhotoTouchMove(event) {
        event.preventDefault();
        var touch = event.touches[0];
        if (touch) {
          handlePhotoMove(touch.clientX, touch.clientY);
        }
      }

      function handlePhotoMove(x, y) {
        if ((x != lastMousePt.x || y != lastMousePt.y)
          && elementToDrag
          && project.data.photos[elementToDrag.id]
          && project.data.photos[elementToDrag.id].image) {
            isDraggingPhoto = true;
        }

        if (isDraggingPhoto) {
          var newLocation = calculateNewPhotoPosition(project.data.photos[elementToDrag.id], x, y);
          var svgimage = project.data.photos[elementToDrag.id].image;
          svgimage.setAttribute('x', newLocation.x);
          svgimage.setAttribute('y', newLocation.y);
        }
        lastMousePt = {
          'x': x,
          'y': y
        };
      }

      function handlePhotoMouseUp(event) {
        handlePhotoUp(event.clientX, event.clientY);
      }

      function handlePhotoTouchEnd(event) {
        event.preventDefault();
        var touch = event.touches[0];
        if (touch) {
          handlePhotoUp(touch.clientX, touch.clientY);
        }
      }

      function handlePhotoUp(x, y) {
        if (isDraggingPhoto) {
          if (elementToDrag && project.data.photos[elementToDrag.id] && project.data.photos[elementToDrag.id].image) {
            var newLocation = calculateNewPhotoPosition(project.data.photos[elementToDrag.id], x, y);
            var svgimage = project.data.photos[elementToDrag.id].image;
            svgimage.setAttribute('x', newLocation.x);
            svgimage.setAttribute('y', newLocation.y);
            project.data.photos[elementToDrag.id].imageBounds.left = newLocation.x;
            project.data.photos[elementToDrag.id].imageBounds.right = newLocation.x + project.data.photos[elementToDrag.id].imageBounds.width;
            project.data.photos[elementToDrag.id].imageBounds.top = newLocation.y;
            project.data.photos[elementToDrag.id].imageBounds.bottom = newLocation.y + project.data.photos[elementToDrag.id].imageBounds.height;
          }
        }
        else {
          handlePhotoClick(event);
        }
        elementToDrag = null;
        isDraggingPhoto = false;
        lastMousePt = {
          'x': x,
          'y': y
        };
      }

      function calculateNewPhotoPosition(projectPhoto, clickX, clickY) {
        var shapeBounds = projectPhoto.shapeBounds;
        var imageBounds = projectPhoto.imageBounds;
        var svgBounds = project.svg.getBoundingClientRect();
        var move = {
          x: (clickX - svgBounds.left) - elementToDragClickPt.x,
          y: (clickY - svgBounds.top) - elementToDragClickPt.y
        };

        if (projectPhoto.rotation == 180) {
          move.x = -move.x;
          move.y = -move.y;
        }
        else if (projectPhoto.rotation == 90) {
          var y = move.y;
          move.y = -move.x;
          move.x = y;
        }
        else if (projectPhoto.rotation == 270) {
          var tmp = move.x;
          move.x = -move.y;
          move.y = tmp;
        }

        var newLocation = {
          x: Number(imageBounds.left) + move.x,
          y: Number(imageBounds.top) + move.y
        };
        if (newLocation.x > shapeBounds.left) {
          newLocation.x = shapeBounds.left;
        }
        if (newLocation.x < shapeBounds.left - (imageBounds.width - shapeBounds.width)) {
          newLocation.x = shapeBounds.left - (imageBounds.width - shapeBounds.width);
        }
        if (newLocation.y > shapeBounds.top) {
          newLocation.y = shapeBounds.top;
        }
        if (newLocation.y < shapeBounds.top - (imageBounds.height - shapeBounds.height)) {
          newLocation.y = shapeBounds.top - (imageBounds.height - shapeBounds.height);
        }

        return newLocation;
      }

      function handleFillClick(event) {
        deselectActiveElementIfAny();
        var artboard = document.getElementById('artboard');
        $scope.$apply(function() {
          elementToFill = event.target;
          while (elementToFill.id.indexOf("fill") != 0 && elementToFill != artboard) {
            elementToFill = elementToFill.parentNode;
          }
          angular.element(elementToFill).addClass('selected');
          $scope.$emit("colorizerIsDisplayed", true);
        });
      }

      function handleEdgeClick(event) {
        deselectActiveElementIfAny();
        var artboard = document.getElementById('artboard');
        $scope.$apply(function() {
          elementToFill = event.target;
          while (elementToFill.id.indexOf("edge") != 0 && elementToFill != artboard) {
            elementToFill = elementToFill.parentNode;
          }
          angular.element(elementToFill).addClass('selected');
          $scope.$emit("colorizerIsDisplayed", true);
        });
      }

      function applyStrokeToElement(element, colorString) {
        if (element) {
          if (element.style) {
            element.style.stroke = colorString;
          }
          if (element.removeAttribute) {
            element.removeAttribute("stroke");
          }
          if (element.childNodes) {
            for (var i=0; i < element.childNodes.length; i++) {
              applyStrokeToElement(element.childNodes[i], colorString);
            }
          }
        }
      }

      function applyFillToElement(element, colorString) {
        if (element) {
          if (element.style) {
            element.style.fill = colorString;
          }
          if (element.removeAttribute) {
            element.removeAttribute("fill");
          }
          if (element.childNodes) {
            for (var i=0; i < element.childNodes.length; i++) {
              applyFillToElement(element.childNodes[i], colorString);
            }
          }
        }
      }

      function deselectActiveElementIfAny() {
        if (elementToFill) {
          angular.element(elementToFill).removeClass('selected');
        }
        if (elementToStroke) {
          angular.element(elementToStroke).removeClass('selected');
        }
      }

    }
  }
}]);
