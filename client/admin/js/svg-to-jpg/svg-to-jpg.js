app.service('svgToJpg', ['$rootScope', '$http', function($rootScope, $http) {
  var SvgToJpg = {};

  var PPI = 300;

  function htmlToElement(html) {
    var template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstChild;
  }

  function makeBase64Svg(projectData, svgText, callback) {
    // convert svgText to DOM and link projectData to the images
    var svgElement = htmlToElement(svgText);
    for (var id in projectData.photos) {
      var images = svgElement.getElementsByTagName('image');
      for (var i=0; i < images.length; i++) {
        if (images[i].getAttribute('data-photoid') == id) {
          projectData.photos[id].image = images[i];
        }
      }
    }

    var allProjectPhotos = [];
    for (var id in projectData.photos) {
      allProjectPhotos.push(projectData.photos[id]);
    }
    var promises = allProjectPhotos.map(function(p) { return loadPhoto(p); });
    Promise.all(promises)
    .then(function() {
      console.log('all loaded');
      generateBase64OfProject(svgElement, function(svgImage) {
        if (callback) {
          callback(svgImage);
        }
      });
    });
  }

  function loadPhoto(projectPhoto) {
    console.log('loadPhoto', projectPhoto.src);
    if (projectPhoto.base64 || !projectPhoto.src) {
      return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
      var url = projectPhoto.src;
      var thumbnailSrc = projectPhoto.thumbnailSrc;

      loadHiResPhoto(url, thumbnailSrc, function(base64img) {
        projectPhoto.image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base64img);

        var tmpImg = new Image();
        tmpImg.onerror = function(e) {
          console.error('error loading image', e);
          reject(e);
        }
        tmpImg.onload = function(e) {
          console.log('tmpImg.onload');

          /*EXIF.getData(tmpImg, function() {
            console.log('4');
            var orientation = EXIF.getTag(tmpImg, 'Orientation');
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
            applyPhotoRotation(projectPhoto);
            console.log('5');*/
          /*});*/

          // since these are loaded from URL the browser should handle the exif, right!???
          projectPhoto.rotation = 0;
          resolve();
        }
        tmpImg.src = base64img;
      });
    });
  }

  function applyPhotoRotation(projectPhoto) {
    if (projectPhoto.rotation == 180) {
      var cx = Number(projectPhoto.imageBounds.left) + projectPhoto.imageBounds.width / 2;
      var cy = Number(projectPhoto.imageBounds.top) + projectPhoto.imageBounds.height / 2;
      var rotate = "rotate(" + projectPhoto.rotation + ", " + cx + ", " + cy + ")";
      projectPhoto.image.setAttribute('transform', rotate);
    }
    else if (projectPhoto.rotation == 90 || projectPhoto.rotation == 270) {
      projectPhoto.image.setAttribute('x', 0);
      projectPhoto.image.setAttribute('y', 0);
      var w = parseFloat(projectPhoto.image.getAttribute('width'));
      var h = parseFloat(projectPhoto.image.getAttribute('height'));
      projectPhoto.image.setAttribute('width', h);
      projectPhoto.image.setAttribute('height', w);
      var x = Number(w) + (projectPhoto.shapeBounds.width - w) / 2;
      var y = (projectPhoto.shapeBounds.height - h) / 2;
      var translate = "translate(" + x + "," + y + ")";
      var rotate = "rotate(" + projectPhoto.rotation + ", 0, 0)";
      projectPhoto.image.setAttribute('transform', translate + ' ' + rotate);
    }
  }

  function loadHiResPhoto(url, thumbnailSrc, callback) {
    console.log('loadHiResPhoto', url);
    var http = new XMLHttpRequest();
    http.open("GET", url + "?t=" + (new Date().getTime()), true);
    http.crossOrigin = "anonymous";
    http.responseType = 'arraybuffer';
    http.onload = function(event) {
      var b64 = _arrayBufferToBase64(http.response);
      var base64img = 'data:image/jpg;base64,' + b64;
      if (callback) {
        callback(base64img);
      }
    }
    http.onerror = function(event) {
      console.error("Something went wrong retrieving " + url, event);
    }
    http.send();
  }

  function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i=0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function _blobToBase64(blob, callback) {
    var reader = new window.FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      base64data = reader.result;
      if (callback) {
        callback(base64data);
      }
    }
  }

  function generateBase64OfProject(svgElement, callback) {
    var svgText = svgElement.outerHTML;
    var base64Svg = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);

    var svgimage = new Image();
    svgimage.onload = function(e) {
      if (callback) {
        callback(svgimage);
      }
    }
    svgimage.onerror = function(e) {
      console.log('svgimage error', e, e.name, e.message);
    }
    svgimage.src = base64Svg;
  }

  function createThumbnail(projectData, img, callback) {
    var MAX_SIZE = {
      width: 400,
      height: 400
    };

    var imgSize = {
      width: MAX_SIZE.width,
      height: MAX_SIZE.height
    };

    var imgAspect = projectData.printSize.width / projectData.printSize.height;
    if (imgAspect > 1) {
      imgSize.height = imgSize.width / imgAspect;
    }
    else {
      imgSize.width = imgSize.height * imgAspect;
    }

    svgToJpg(img, imgSize, function(dataURL) {
      if (callback) {
        callback(dataURL);
      }
    });
  }

  function createHiResImage(projectData, img, callback) {
    var size = {
      width: Number(projectData.printSize.width) * PPI,
      height: Number(projectData.printSize.height) * PPI
    };
    svgToJpg(img, size, function(dataURL) {
      if (callback) {
        callback(dataURL);
      }
    });
  }

  function svgToJpg(img, size, callback) {
    var _start = new Date().getTime();
    console.log('saveToJpg start');
    var canvas = document.createElement("canvas");
    if (size.height > size.width) {
      canvas.width = size.height;
      canvas.height = size.width;
    }
    else {
      canvas.width = size.width;
      canvas.height = size.height;
    }

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (size.height > size.width) {
      ctx.save();
      ctx.rotate(Math.PI/2);
      ctx.drawImage(img, 0, -canvas.width, canvas.height, canvas.width);
      ctx.restore();
    }
    else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    var dataURL = canvas.toDataURL("image/jpeg", 1.0);

    var _end = new Date().getTime();
    var _elapsed = _end - _start;
    console.log('saveToJpg done ' + _elapsed + 'ms');

    if (callback) {
      callback(dataURL);
    }
  }

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

  function processOrderItem(guid, projectData, svg, callback) {
    var broadcast = {
      'message': 'downloading',
      'guid': guid
    };
    $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));

    makeBase64Svg(projectData, svg, function(img) {
      var broadcast = {
        'message': 'converting',
        'guid': guid
      };
      $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));

      createThumbnail(projectData, img, function(base64thumbnail) {
        createHiResImage(projectData, img, function(base64jpg) {
          if (callback) {
            callback(base64thumbnail, base64jpg);
          }
        });
      })
    });
  }

  $rootScope.$on("processDesign", function(event, item) {
    if (!item) {
      return;
    }

    var projectData = item.projectData;
    var svg = item.svg;
    var guid = item.guid;
    var orderItemId = item.orderItemId;

    processOrderItem(guid, projectData, svg, function(thumbnail, hires) {
      var broadcast = {
        'message': 'uploading',
        'guid': guid
      };
      $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));

      $http.post(API_URL + "/Processing/upload_design", {
        'orderItemId': orderItemId,
        'designGuid': guid,
        'thumbnailBase64': thumbnail,
        'hiresBase64': hires
      }).then(function(response) {
        var broadcast = {
          'message': 'done',
          'guid': guid,
          'images': response.data.results
        };
        $rootScope.$broadcast("processingImage", JSON.stringify(broadcast));
      }, function(error) {
        console.error(error);
      });
    });
  });

  return SvgToJpg;
}]);
