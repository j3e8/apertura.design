app.directive("designTips", function($timeout) {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: '/app/components/design-tips/design-tips.html',
    link: function($scope, $element, $attrs) {
      $scope.tips = [
        {
          id: 'photo',
          heading: "Add photos",
          message: "Drop your own photos into this design by tapping on a gray box with the photo icon."
        },
        {
          id: 'color',
          heading: "Customize colors",
          message: "You can change the color of some design elements. Tap on different text and graphics to see what can be customized."
        }
      ];
      $scope.tipIsDisplayed = undefined;
      $scope.currentTip = null;

      function showNextTip() {
        for (var i=0; i < $scope.tips.length; i++) {
          var hasBeenSeen = localStorage.getItem('tip-' + $scope.tips[i].id) == 'yes';
          if (!hasBeenSeen) {
            $timeout(function() {
              $scope.tipIsDisplayed = true;
              $scope.currentTip = $scope.tips[i];
            }, 300);
            break;
          }
        }
      }
      showNextTip();

      $scope.hideTip = function() {
        $scope.tipIsDisplayed = false;
        if ($scope.currentTip) {
          localStorage.setItem('tip-' + $scope.currentTip.id, 'yes');
          showNextTip();
        }
      }
    }
  }
});
