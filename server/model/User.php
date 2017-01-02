<?php
class User {
  public static function email_is_available($email) {
    $email = db_escape($email);
    $sql = "SELECT id FROM users where email='$email'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row)
      return false;
    return true;
  }

  public static function get_user_id_from_session() {
    $userId = $_SESSION['userid'];
    if (!$userId)
      $userId = $_COOKIE['userid'];
    if (!$userId) {
      throw new Exception("Unauthorized access", 401);
    }
    return $userId;
  }

  public static function get_user($userId = null) {
    if (!$userId) {
      $userId = User::get_user_id_from_session();
    }
    if (!is_numeric($userId)) {
      throw new Exception("invalid user id");
    }

    $sql = "SELECT firstName, lastName, email
      FROM users WHERE id=$userId";
    $results = db_query($sql);
    $user = db_fetch_assoc($results);
    return $user;
  }

  public static function is_user_signed_in() {
    if ($_SESSION['userid']) {
      return true;
    }
    return false;
  }

  public static function signin($username, $email, $password) {
    if (!$username) {
      $username = '';
    }
    $username = db_escape($username);
    $_email = db_escape($email);
    $password_hash = md5($password);

    $sql = "SELECT u.id, u.email, u.username, u.status,
      us.id as subscriptionId
      from users as u
      left join userSubscriptions as us on u.id=us.userId
        and us.status='active'
        and us.subscriptionStart <= NOW()
        and us.subscriptionEnd > NOW()
      where (
        (username='$username' and username != '')
        or (email='$_email' and email != '')
        or (email='$username' and email != '')
      )
      and password='$password_hash'
      and (u.status='active' or u.status='suspended')";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      $isSubscriber = 0;
      if ($row['subscriptionId']) {
        $isSubscriber = 1;
      }
      $accountName = ($row['username'] != '' ? $row['username'] : $row['email']);
      $userId = $row['id'];
      $_SESSION['userid'] = $userId;
      $_SESSION['username'] = $accountName;
      $_SESSION['email'] = $row['email'];
      $_SESSION['status'] = $row['status'];
      $_SESSION['isSubscriber'] = $isSubscriber;

      setcookie('userid', $userId, time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('username', $accountName, time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('email', $row['email'], time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('status', $row['status'], time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('isSubscriber', $isSubscriber, time()+60*60*24*10000, '/', DOMAIN, false, false);

      return [
        'userid' => $userId,
        'username' => $accountName,
        'email' => $row['email'],
        'status' => $row['status'],
        'isSubscriber' => $isSubscriber
      ];
    }
    throw new Exception("Invalid username/password", 401);
  }

  public static function signout() {
    $_SESSION['userid'] = '';
    $_SESSION['username'] = '';
    $_SESSION['email'] = '';
    $_SESSION['status'] = '';

    session_destroy();

    setcookie('userid', $userId, time()-3600, '/', DOMAIN, false, false);
    setcookie('username', $row['username'], time()-3600, '/', DOMAIN, false, false);
    setcookie('email', $row['email'], time()-3600, '/', DOMAIN, false, false);
    setcookie('status', 'active', time()-3600, '/', DOMAIN, false, false);
  }

  public static function signup($email, $password) {
    $newUserId = User::create_user($email, $password);
    if ($newUserId) {
      return User::signin(null, $email, $password);
    }

    throw new Exception("Couldn't create a new user", 500);
  }

  public static function update_password($userId, $password) {
    $signedInUserId = User::get_user_id_from_session();
    if ($userId != $signedInUserId) {
      throw new Exception("Unauthorized", 401);
    }

    $_password = md5($password);
    $sql = "UPDATE users
      SET password='$_password'
      WHERE id=$userId";
    db_query($sql);
    return true;
  }

  public static function validate_artist_id_and_current_user($artistId) {
    $userId = User::get_user_id_from_session();
    $_artistId = db_escape($artistId);
    $sql = "SELECT *
      FROM artistUsers
      WHERE userId=$userId
      AND artistId=$_artistId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      return true;
    }
    return false;
  }


  /*** PRIVATE ***/

  private static function create_user($email, $password) {
    if (!User::email_is_available($email)) {
      throw new Exception("A user already exists with this email address: $email", 406);
    }

    $_email = db_escape($email);
    $_password = md5($password);

    $sql = "INSERT INTO users (email, username, password)
      values('$_email', '', '$_password')";
    db_query($sql);
    $userId = db_get_insert_id();

    $message = "Thanks for signing up for Apertura.design, we're glad to have you. We're sure you'll love the ";
    $message .= "photo projects you'll be able to create.\r\n\r\n";
    $message .= "If you didn't sign up for this free Apertura.design account, or if you have any questions, please reply to this email.\r\n\r\nApertura Support\r\nsupport@apertura.photo";
    mail($email, "Welcome to Apertura.design", $message, "From: \"Apertura Support\" <support@apertura.design>\r\n");

    return $userId;
  }

}
