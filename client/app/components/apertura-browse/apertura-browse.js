app.directive("aperturaBrowse", ["$http", "Site", function($http, $site) {
  return {
    restrict: 'E',
    scope: {
      handlePhotoClick: '='
    },
    templateUrl: '/app/components/apertura-browse/apertura-browse.html',
    link: function($scope, $element, $attrs) {
      $scope.tiles = [];
      $scope.datePath = '';
      $scope.specificity = 'all';

      $scope.year = null;
      $scope.month = null;
      $scope.date = null;

      $scope.$site = $site;
      $scope.$watch("$site.isSignedIn", function() {
        $scope.loadTiles();
      });

      $scope.determineSpecificity = function() {
        var parts = $scope.datePath.split('/');
        $scope.year = parts.length > 0 ? parts[1] : undefined;
        $scope.month = parts.length > 1 ? parts[2] : undefined;
        $scope.day = parts.length > 2 ? parts[3] : undefined;

        if ($scope.day) {
          $scope.specificity = 'day';
        }
        else if ($scope.month) {
          $scope.specificity = 'month';
        }
        else if ($scope.year) {
          $scope.specificity = 'year';
          $scope.prevYear = $scope.year - 1;
          $scope.nextYear = Number($scope.year) + 1;
        }
        else {
          $scope.specificity = 'all';
        }
      }

      $scope.getPrevYear = function() {
        var path = $scope.prevYear;
        $scope.navigate(path, true);
      }

      $scope.getNextYear = function() {
        var path = $scope.nextYear;
        $scope.navigate(path, true);
      }

      $scope.getPrevMonth = function() {
        var d = new Date($scope.year, $scope.month - 1, 1);
        d.setMonth( Number(d.getMonth()) - 1 );
        var path = d.getFullYear() + '/' + (Number(d.getMonth()) + 1);
        $scope.navigate(path, true);
      }

      $scope.getNextMonth = function() {
        var d = new Date($scope.year, $scope.month - 1, 1);
        d.setMonth( Number(d.getMonth()) + 1 );
        var path = d.getFullYear() + '/' + (Number(d.getMonth()) + 1);
        $scope.navigate(path, true);
      }

      $scope.loadTiles = function() {
        if ($site.isSignedIn) {
          switch($scope.specificity) {
            case 'day':
              $scope.loadPhotosForOneDay();
              break;
            case 'month':
              $scope.loadPhotosForOneMonth();
              break;
            case 'year':
              $scope.loadPhotosForOneYear();
              break;
            case 'all':
            default:
              $scope.loadPhotosForAllYears();
              break;
          }
        }
      }

      $scope.loadPhotosForAllYears = function() {
        $http.post(API_URL + "/Photo/get_photos_for_all_years")
        .then(function(response) {
          $scope.tiles = response.data.results;
        }, function(error) {
          console.log(error);
        });
      }

      $scope.loadPhotosForOneYear = function() {
        $http.post(API_URL + "/Photo/get_photos_for_year", {
          year: $scope.year
        }).then(function(response) {
          $scope.tiles = MONTHS.map(function(m) {
            var tile = response.data.results.find(function(t) {
              return t.dateTaken == m.ordinal;
            });
            return Object.assign({ month: m.name }, tile);
          });
          console.log($scope.tiles);
        }, function(error) {
          console.log(error);
        });
      }

      $scope.loadPhotosForOneMonth = function() {
        $http.post(API_URL + "/Photo/get_photos_for_month", {
          year: $scope.year,
          month: $scope.month
        }).then(function(response) {
          reset_calendar();
          response.data.results.forEach(function(dateFolder) {
            var d = new Date(Date.parse(dateFolder.dateTaken));
            $scope.weeks.forEach(function(week) {
              week.days.forEach(function(day) {
                if (day.date) {
                  if (day.date.getFullYear() == d.getUTCFullYear()
                    && day.date.getMonth() == d.getUTCMonth()
                    && day.date.getDate() == d.getUTCDate()) {
                    day.backgroundImage = "url(/" + dateFolder.filename + "/600?t=" + dateFolder.lastModified + ")";
                    day.photoCount = dateFolder.numPhotos;
                  }
                }
              });
            });
          });
          $scope.tiles = [];

          // $scope.tiles = getDaysInMonth($scope.year, $scope.month).map(function(d) {
          //   var tile = response.data.results.find(function(t) {
          //     var parts = t.dateTaken.split('-');
          //     var day = parts[2];
          //     return Number(day) == d;
          //   });
          //   return Object.assign({ day: d }, tile);
          // });


        }, function(error) {
          console.log(error);
        });
      }

      $scope.loadPhotosForOneDay = function() {
        $http.post(API_URL + "/Photo/get_photos_for_day", {
          year: $scope.year,
          month: $scope.month,
          day: $scope.day
        }).then(function(response) {
          $scope.tiles = response.data.results;
        }, function(error) {
          console.log(error);
        });
      }

      $scope.navigate = function(path, replace) {
        if (replace) {
          var pathParts = path.split('/');
          if (pathParts.length) {
            $scope.datePath = pathParts.splice(0, pathParts.length - 1).join('/') + '/' + path;
          }
          else {
            $scope.datePath = path;
          }
        }
        else {
          $scope.datePath += '/' + path;
        }
        $scope.determineSpecificity();
        $scope.loadTiles();
      }

      $scope.choosePhoto = function(tile) {
        if ($scope.handlePhotoClick) {
          $scope.handlePhotoClick({
            id: tile.id,
            filename: tile.filename
          });
        }
      }

      $scope.getMonthName = function(offset) {
        if ($scope.month) {
          if (!offset) {
            offset = 0;
          }
          var index = Number($scope.month - 1) + offset;
          if (index < 0) {
            index += MONTHS.length;
          }
          else if (index >= MONTHS.length) {
            index -= MONTHS.length;
          }
          return MONTHS[index].name;
        }
        return null;
      }

      var MONTHS = [
        { ordinal: 1, name: 'January' },
        { ordinal: 2, name: 'February' },
        { ordinal: 3, name: 'March' },
        { ordinal: 4, name: 'April' },
        { ordinal: 5, name: 'May' },
        { ordinal: 6, name: 'June' },
        { ordinal: 7, name: 'July' },
        { ordinal: 8, name: 'August' },
        { ordinal: 9, name: 'September' },
        { ordinal: 10, name: 'October' },
        { ordinal: 11, name: 'November' },
        { ordinal: 12, name: 'December' }
      ];

      function getDaysInMonth(year, monthOrdinal) {
        var count = new Date(year, monthOrdinal, 0).getDate();
        var days = new Array(count);
        for (var i=0; i < days.length; i++) {
          days[i] = i+1;
        }
        return days;
      }

      function reset_calendar() {
        var dt = new Date($scope.year, $scope.month - 1, 1);
        var firstDayOfMonth = new Date( dt.setDate(1) );
        var firstDayOfNextMonth = new Date( dt.setMonth(dt.getMonth()+1) );
        var lastDayOfMonth = new Date( new Date(firstDayOfNextMonth).setDate(0) );
        $scope.weeks = [];
        for (var w=0; w < 5; w++) {
          $scope.weeks[w] = {
            days: []
          };
          for (var d=0; d < 7; d++) {
            var dayOfMonth = w * 7 + d + 1 - firstDayOfMonth.getDay();
            var date = null;
            if (dayOfMonth > 0 && dayOfMonth <= lastDayOfMonth.getDate()) {
              date = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), dayOfMonth);
            }
            $scope.weeks[w].days[d] = {
              date: date,
              dayOfMonth: date ? String(date.getDate()) : "",
              backgroundImage: "none",
              photoCount: 0
            };
          }
        };
      }

      $scope.loadTiles();
    }
  }
}]);
