app.directive("designTips", function($timeout) {
  return {
    restrict: 'E',
    scope: {
      tips: '='
    },
    templateUrl: '/app/components/design-tips/design-tips.html',
    link: function($scope, $element, $attrs) {
      $scope.tips = [];
      $scope.tipIsDisplayed = undefined;
      $scope.currentTip = null;

      $scope.$watch("applicableTips", function(newValue, oldValue) {
        if (!$scope.currentTip) {
          $timeout(showNextTip, 750);
        }
      });

      function showNextTip() {
        for (var i=0; i < $scope.tips.length; i++) {
          var hasBeenSeen = localStorage.getItem('tip-' + $scope.tips[i]) == 'yes';
          if (!hasBeenSeen) {
            $timeout(function() {
              $scope.tipIsDisplayed = true;
              $scope.currentTip = $scope.tips[i];
            }, 300);
            break;
          }
        }
      }

      $scope.hideTip = function() {
        ga('send', 'tip', $scope.currentTip);
        $scope.tipIsDisplayed = false;
        if ($scope.currentTip) {
          localStorage.setItem('tip-' + $scope.currentTip, 'yes');
          showNextTip();
        }
      }
    }
  }
});
