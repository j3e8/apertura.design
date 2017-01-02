self.addEventListener('message', function(e) {
  var args = JSON.parse(e.data);
  if (args.message == 'process') {
    var img = generateBase64OfProject(args.svgText);
    createThumbnail(projectData, img, function(base64thumbnail) {
      createHiResImage(projectData, img, function(base64jpg) {
        self.postMessage(JSON.stringify({
          'message': 'uploading',
          'bytesSent': 0,
          'totalBytes': 0
        }));
        uploadImages(projectData, base64thumbnail, base64jpg, function() {
          var response = {
            'message': 'finished',
            'thumbnail': thumbnail,
            'hires': hires
          };
          self.postMessage(JSON.stringify(response));
        });
      });
    });
  }
}, false);


function generateBase64OfProject(svgText) {
  var base64Svg = 'data:image/svg+xml;base64,' + btoa(svgText);
  var svgimage = new Image();
  svgimage.src = base64Svg;
  return svgimage;
}

function uploadImages(projectData, base64thumbnail, base64jpg, callback) {
  // TODO: use vanilla XMLHttpRequest so we can get onprogress events
  
  $http.post(API_URL + "/Cart/upload_design", {
    'designGuid': guid,
    'thumbnailBase64': result.thumbnail,
    'hiresBase64': result.hires
  }).then(function(response) {
    if (callback) {
      callback();
    }
  }, function(error) {
    console.error(error);
  });

  // self.postMessage(JSON.stringify({
  //   'message': 'uploading',
  //   'bytesSent': 0,
  //   'totalBytes': 0
  // }));

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
  canvas.width = size.width;
  canvas.height = size.height;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  var dataURL = canvas.toDataURL("image/jpg");

  var _end = new Date().getTime();
  var _elapsed = _end - _start;
  console.log('saveToJpg done ' + _elapsed + 'ms');

  if (callback) {
    callback(dataURL);
  }
}
