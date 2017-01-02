<?php
class Gooten {

  public static function get_shipping_quote($requestBody) {

    $data_string = json_encode($requestBody);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, GOOTEN_API_URL . "/source/api/shippingprices/?recipeid=" . GOOTEN_RECIPE_ID);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'Content-Length: ' . strlen($data_string))
    );

    $result = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return array(
      'status' => $status,
      'response' => json_decode($result)
    );
  }

}
