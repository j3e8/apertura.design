app.directive("svgThumbnail", ["$http", function($http) {
  return {
    restrict: 'E',
    scope: {
      guid: '='
    },
    templateUrl: 'components/svg-thumbnail/svg-thumbnail.html',
    link: function($scope, $element, $attrs) {
      $scope.svg = null;

      function loadSvg() {
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
              $element[0].childNodes[0].innerHTML = svgText;
              $scope.svg = $element[0].childNodes[0].getElementsByTagName('svg')[0];
              $scope.$apply();
            }
            else {
              setTimeout(loadSvg, 50);
            }
          }
        };
        xhr.send();
      }

      loadSvg();

      $scope.$on("guid", function() {
        loadSvg();
      });

    }
  }
}]);
