app.controller("templatesController", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;
  $scope.isLoading = true;

  $scope.templates = [];

  $scope.searchText = '';

  $scope.promo = null;
  var qs = $location.search();
  if (qs.p) {
    $http.post(API_URL + "/Cart/validate_discount_code", {
      discountCode: qs.p
    }).then(function(response) {
      if (response.data.results) {
        $scope.promo = {
          code: response.data.results.discountCode,
          pctDiscount: Number(response.data.results.pctDiscount),
          ends: Date.parse(response.data.results.dateEnds)
        };
      }
    }, function(error) {
      console.error(error);
    });
  }

  $scope.loadTemplatesByNewest = function() {
    $scope.isLoading = true;
    $http.post(API_URL + "/Template/get_templates", {
      templateType: 'design'
    }).then(function (response) {
      $scope.isLoading = false;
      $scope.templates = response.data.results;
    }, function(error) {
      $scope.isLoading = false;
      console.error(error);
    });
  }
  $scope.loadTemplatesByNewest();


  $scope.catchEnter = function($event) {
    if ($event.keyCode == 13) {
      $scope.search();
    }
  }

  $scope.searchChanged = function() {
    if (!$scope.searchText) {
      $scope.loadTemplatesByNewest();
    }
  }

  var hasSentSearchEvent = false;
  $scope.search = function() {
    if (!$scope.searchText) {
      $scope.loadTemplatesByNewest();
      return;
    }

    if (!hasSentSearchEvent) {
      ga('send', 'event', 'templates', 'search');
      hasSentSearchEvent = true;
    }
    $scope.isLoading = true;
    $http.post(API_URL + "/Template/search", {
      query: $scope.searchText
    }).then(function(response) {
      $scope.templates = response.data.results;
      $scope.isLoading = false;
    }, function(error) {
      $scope.isLoading = false;
      console.error(error);
    });
  }

  var hasSentScrollEvent = false;
  window.addEventListener("scroll", function(event) {
    if (!hasSentScrollEvent && document.body.offsetHeight + document.body.scrollTop >= document.body.scrollHeight - 25) {
      hasSentScrollEvent = true;
      ga('send', 'event', 'templates', 'scrollToBottom');
    }
  });
}]);
