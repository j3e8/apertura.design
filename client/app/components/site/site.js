app.factory("Site", ['$http', '$window', '$rootScope', '$location', '$route', function($http, $window, $rootScope, $location, $route) {
  var username = '';
  var userid = 0;
  var isSignedIn = false;
  var isAperturaPhotoSubscriber = false;
  var userstatus = '';
  var cookiestr = document.cookie;
  var cookieparts = cookiestr.split(';');
  for (var i=0; i<cookieparts.length; i++) {
    var fields = cookieparts[i].split('=');
    var fieldname = fields[0].replace(/^\s+/, '').replace(/\s+$/, '');
    if (fieldname.toLowerCase() == 'username')
      username = fields[1];
    if (fieldname.toLowerCase() == 'userid')
      userid = fields[1];
    if (fieldname.toLowerCase() == 'status')
      userstatus = fields[1];
    if (fieldname.toLowerCase() == 'issubscriber')
      isAperturaPhotoSubscriber = Number(fields[1]);
  }
  if (userid) {
    isSignedIn = true;
  }

  function userAgentContains(str) {
    var pos = navigator.userAgent.toLowerCase().indexOf(str.toLowerCase());
    return pos >= 0 ? true : false;
  }

  var isApp = false;
  if (userAgentContains("Mozilla") && userAgentContains("iPhone") && userAgentContains("AppleWebKit") && userAgentContains("Mobile") && !userAgentContains("Safari")) {
    isApp = true;
  }

  var SiteService = {
    userid: userid,
    username: username,
    isSignedIn: isSignedIn,
    isAperturaPhotoSubscriber: isAperturaPhotoSubscriber,
    isApp: isApp,
    userstatus: userstatus
  };

  SiteService.authenticate = function(u, p, successFunc, errorFunc) {
    $http.post(API_URL + "/User/signin", {
      username: u,
      password: p,
    }).then(function(response) {
      SiteService.username = response.data.results.username;
      SiteService.userid = response.data.results.userid;
      SiteService.isSignedIn = true;
      SiteService.userstatus = response.data.results.status;
      SiteService.isAperturaPhotoSubscriber = response.data.results.isSubscriber;

      if (successFunc) {
        successFunc();
      }
    }, function(data) {
      if (errorFunc) {
        errorFunc();
      }
    });
  }

  SiteService.signOut = function() {
    var self = this;
    $http.post(SITE_ROOT + "/api/User/signout", {})
    .then(function(response) {
      SiteService.username = '';
      SiteService.userid = 0;
      SiteService.isSignedIn = false;
      SiteService.userstatus = '';
      SiteService.isAperturaPhotoSubscriber = false;

      $location.path("/app/home");
      $route.reload();
    }, function(error) {
      SiteService.displayNotification("We couldn't sign you out for some reason. Try again.");
    });
  }

  SiteService.displayNotification = function(msg) {
    $rootScope.$broadcast("notification", msg);
  }

  SiteService.paramsFromQuerystring = function() {
    var query = null;
    var querystring = window.location.search;
    if (querystring.length) {
      query = {};
      var pairs = querystring.substring(1).split('&');
      pairs.forEach(function(pair) {
        var keyValues = pair.split('=');
        if (keyValues[0]) {
          query[keyValues[0]] = keyValues.length > 1 ? keyValues[1] : undefined;
        }
      });
    }
    return query;
  }

  return SiteService;
}]);
