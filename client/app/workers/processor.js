self.addEventListener('message', function(e) {
  var args = JSON.parse(e.data);
  if (args.message == 'process') {
    processCartItem(args.projectData, args.svg, function(thumbnail, hires) {
      var response = {
        'message': 'finished',
        'thumbnail': thumbnail,
        'hires': hires
      };
      self.postMessage(JSON.stringify(response));
    });
  }
}, false);



/*
var worker = new Worker("workers/processor.js");
worker.addEventListener("message", function(e) {
  var result = JSON.parse(e.data);
  console.log("worker response received", result);

  if (result.message == 'finished') {
    $http.post(API_URL + "/Cart/upload_design", {
      'designGuid': guid,
      'thumbnailBase64': result.thumbnail,
      'hiresBase64': result.hires
    }).then(function(response) {
      $rootScope.$broadcast("imageConverted", guid);
    }, function(error) {
      console.error(error);
    });
  }
}, false);
var args = {
  'message': 'process',
  'projectData': projectData,
  'svg': svg
}
worker.postMessage(JSON.stringify(args));
*/
