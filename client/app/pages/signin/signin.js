app.controller("signinController", ["Site", '$scope', '$http', '$location', '$route', function($site, $scope, $http, $location, $route) {
  $scope.$site = $site;

  $scope.display = 'signin';
  $scope.emailPattern = /[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i;
  $scope.usernameIsAvailable = undefined;

  $scope.username = '';
  $scope.password = '';
  $scope.errorMessage = '';

  $scope.forgotEmail = '';
  $scope.forgotPasswordDialogIsDisplayed = false;
  $scope.isSending = false;

  $scope.clearErrorMessage = function() {
    $scope.errorMessage = '';
  }

  $scope.toggleSignInSignUp = function() {
    if ($scope.display == 'signin') {
      $scope.display = 'signup';
    }
    else {
      $scope.display = 'signin';
    }
  }

  $scope.attemptSignup = function() {
    ga('send', 'event', 'signup');
    $http.post(API_URL + "/User/signup", {
      email: $scope.username,
      password: $scope.password
    }).then(function(response) {
      console.log(response);
      if (response.data.results) {
        $scope.attemptSignin();
      }
    }, function(err) {
      $scope.errorMessage = "That email address is already taken.";
      ga('send', 'event', 'error', 'signup', 'taken');
      console.error(err);
    });
  }

  $scope.attemptSignin = function() {
    ga('send', 'event', 'signin');
    console.log("authenticating", $site.userid);
    $site.authenticate($scope.username, $scope.password, function() {
      if ($location.search().redir) {
        $location.path($location.search().redir).search('redir', null);
      }
      else {
        $location.path('/app/home');
      }
    }, function() {
      $scope.errorMessage = "Invalid username or password";
      ga('send', 'event', 'error', 'signin', $scope.username);
    });
  }

  $scope.checkEmailAvailability = function() {
    var r = new RegExp($scope.emailPattern);
    if (r.test($scope.username)) {
      console.log("valid email");
      $http.post(API_URL + "/User/email_is_available", {
        email: $scope.username
      }).then(function(response) {
        $scope.usernameIsAvailable = response.data.results;
      }, function(error) {
        console.error(error);
      });
    }
    else {
      console.log("invalid email");
    }
  }

  $scope.toggleForgotPasswordDialog = function() {
    $scope.forgotPasswordDialogIsDisplayed = !$scope.forgotPasswordDialogIsDisplayed;
  }

  $scope.sendForgotPasswordEmail = function() {
    $scope.isSending = true;
    $http.post(SITE_ROOT + "/api/User/send_forgot_password_email", {
      email: $scope.forgotEmail
    }).then(function(response) {
      $scope.isSending = false;
      $scope.toggleForgotPasswordDialog();
      $site.displayNotification("If the email address provided matched our records, we sent a link to help reset your password.");
    }, function(error) {
      $scope.isSending = false;
      console.error(error);
    });
  }
}]);
