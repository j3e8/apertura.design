<?php
class Billing {

  public static function save_billing_token($userId, $token, $cardToken, $brand, $expMonth, $expYear, $lastFour) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user ID", 400);
    }
    if (!is_numeric($expMonth) || !is_numeric($expYear)) {
      throw new Exception("Invalid expiration date`", 400);
    }
    if (!is_numeric($lastFour)) {
      throw new Exception("Invalid card digits you fool", 400);
    }

    $_token = db_escape($token);
    $_cardToken = db_escape($cardToken);
    $_brand = db_escape($brand);
    $sql = "INSERT INTO creditCards
      (userId, token, cardToken, brand, expMonth, expYear, lastFour)
      VALUES($userId, '$_token', '$_cardToken', '$_brand', $expMonth, $expYear, '$lastFour')";
    db_query($sql);
    $creditCardId = db_get_insert_id();

    $customerId = Billing::get_customer_id_for_user($userId);
    if ($customerId) {
      Billing::add_card_to_stripe_user($customerId, $token);
    }
    else {
      $customerId = Billing::create_stripe_user($userId, $token);
    }

    return array(
      'id' => $creditCardId,
      'token' => $token,
      'cardToken' => $cardToken,
      'customerId' => $customerId,
      'brand' => $brand,
      'expMonth' => $expMonth,
      'expYear' => $expYear,
      'lastFour' => $lastFour
    );
  }

  public static function get_billing_info($id) {
    if (!is_numeric($id)) {
      throw new Exception("Invalid billing ID", 400);
    }
    $userId = User::get_user_id_from_session();

    $sql = "SELECT cardToken, brand, expMonth, expYear, lastFour
      FROM creditCards
      WHERE id=$id
      AND userId=$userId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return $row;
  }

  public static function get_cards_for_user($userId) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user ID", 400);
    }

    $cards = [];
    $sql = "SELECT id, cardToken, brand, expMonth, expYear, lastFour
      FROM creditCards
      WHERE userId=$userId
      AND status='active'";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $cards[] = $row;
    }

    return $cards;
  }


  /*** PRIVATE ***/

  private static function get_customer_id_for_user($userId) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user id, shmoa");
    }
    $sql = "SELECT customerId FROM users WHERE id=$userId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    return $row['customerId'];
  }

  private static function create_stripe_user($userId, $token) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user id, shmoa");
    }

    $user = User::get_user($userId);
    $email = $user['email'];

    require_once "lib/stripe-php-3.14.1/init.php";
    \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);
    $customer = \Stripe\Customer::create(array(
      "source" => $token,
      "email" => $email
    ));
    if (!$customer) {
      throw new Exception("Couldn't connect with Stripe to create a new user", 500);
    }
    $customerId = $customer->id;
    $cardToken = $customer->default_source;

    $sql = "UPDATE users
      SET customerId='$customerId'
      WHERE id=$userId";
    db_query($sql);
  }

  private static function add_card_to_stripe_user($customerId, $token) {
    require_once "lib/stripe-php-3.14.1/init.php";
    \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);
    $customer = \Stripe\Customer::retrieve($customerId);
    if (!$customer) {
      throw new Exception("Couldn't connect with Stripe to create a new user", 500);
    }
    $customer->sources->create(array("source" => $token));
  }

}
