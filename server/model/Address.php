<?php
class Address {

  public static function create_address($userId, $address) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user ID", 400);
    }

    $_firstName = db_escape($address->firstName);
    $_lastName = db_escape($address->lastName);
    $_address = db_escape($address->address);
    $_address2 = db_escape($address->address2);
    $_city = db_escape($address->city);
    $_state = db_escape($address->state);
    $_postalCode = db_escape($address->postalCode);
    $_country = db_escape($address->country);

    $sql = "INSERT INTO addresses
      (userId, firstName, lastName, address, address2, city, state, postalCode, country)
      VALUES($userId, '$_firstName', '$_lastName', '$_address', '$_address2', '$_city', '$_state', '$_postalCode', '$_country')";
    db_query($sql);
    $id = db_get_insert_id();

    return array(
      'id' => $id,
      'address' => $address->address,
      'address2' => $address->address2,
      'city' => $address->city,
      'state' => $address->state,
      'postalCode' => $address->postalCode,
      'country' => $address->country
    );
  }

  public static function get_address($id) {
    if (!is_numeric($id)) {
      throw new Exception("Invalid address ID", 400);
    }
    $userId = User::get_user_id_from_session();

    $sql = "SELECT firstName, lastName, address, address2, city, state, postalCode, country
      FROM addresses
      WHERE id=$id
      AND userId=$userId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return $row;
  }

  public static function get_addresses_for_user($userId) {
    if (!is_numeric($userId)) {
      throw new Exception("Invalid user ID", 400);
    }

    $addresses = [];
    $sql = "SELECT id, firstName, lastName, address, address2, city, state, country, postalCode
      FROM addresses
      WHERE userId=$userId
      AND status='active'";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $addresses[] = $row;
    }

    return $addresses;
  }

}
