<?php
class Order {

  public static function place_order($orderDetails) {
    $userId = User::get_user_id_from_session();

    $_discountCode = db_escape($orderDetails->discountCode);
    $discountAmount = $orderDetails->discountAmount ? $orderDetails->discountAmount : 0;
    $discountAmount = round($discountAmount * 100) / 100;
    if (!is_numeric($discountAmount)) {
      throw new Exception("Illegal order. Invalid discount amount.", 400);
    }
    $salesTax = $orderDetails->salesTax ? $orderDetails->salesTax : 0;
    $salesTax = round($salesTax * 100) / 100;
    if (!is_numeric($salesTax)) {
      throw new Exception("Illegal order. Invalid sales tax amount.", 400);
    }
    $shippingAmount = $orderDetails->shippingAmount ? $orderDetails->shippingAmount : 0;
    $shippingAmount = round($shippingAmount * 100) / 100;
    if (!is_numeric($shippingAmount)) {
      throw new Exception("Illegal order. Invalid shipping amount.", 400);
    }
    $shipAddressId = $orderDetails->shipAddressId;
    if (!is_numeric($shipAddressId)) {
      throw new Exception("Illegal order. Invalid address id.", 400);
    }
    $creditCardId = $orderDetails->billingId;
    if ($creditCardId && !is_numeric($creditCardId)) {
      throw new Exception("Illegal order. Invalid cc id.", 400);
    }

    $subtotal = 0;
    foreach($orderDetails->items as $item) {
      $subtotal += $item->qty * $item->price;
    }
    $totalAmount = $subtotal + $shippingAmount + $salesTax - $discountAmount;

    if ($totalAmount > 0) {
      $charge_result = Order::charge_card($totalAmount, $creditCardId);
      if (!$charge_result) {
        throw new Exception("There was a problem billing the credit card", 400);
      }
    }
    else {
      $creditCardId = 'NULL';
    }

    $sql = "INSERT INTO orders
      (userId, discountCode, discountAmount, salesTax, shippingAmount, addressId, creditCardId, status)
      VALUES ($userId, '$_discountCode', $discountAmount, $salesTax, $shippingAmount, $shipAddressId, $creditCardId, 'paid')";
    db_query($sql);
    $orderId = db_get_insert_id();

    Order::insert_order_items($orderId, $orderDetails->items);
    Order::send_order_email($orderId);

    return $orderId;
  }

  public static function get_order($orderId) {
    if (!is_numeric($orderId)) {
      throw new Exception("Invalid order id", 400);
    }
    $sql = "SELECT o.userId, o.dateOrdered, o.discountCode, o.discountAmount, o.salesTax, o.shippingAmount,
      a.firstName, a.lastName, a.address, a.address2, a.city, a.state, a.postalCode, a.country,
      c.brand, c.expMonth, c.expYear, c.lastFour,
      dc.description AS discountDescription
      FROM orders AS o
      LEFT JOIN addresses AS a ON o.addressId=a.id
      LEFT JOIN creditCards AS c ON o.creditCardId=c.id
      LEFT JOIN discountCodes AS dc ON o.discountCode=dc.discountCode
      WHERE o.id=$orderId";
    $results = db_query($sql);
    $orderInfo = db_fetch_assoc($results);

    $orderItems = Order::get_order_items($orderId);

    $order = array(
      'userId' => $orderInfo['userId'],
      'dateOrdered' => $orderInfo['dateOrdered'],
      'discountCode' => $orderInfo['discountCode'],
      'discountAmount' => $orderInfo['discountAmount'] ? $orderInfo['discountAmount'] : 0,
      'discountDescription'=> $orderInfo['discountDescription'],
      'salesTax' => $orderInfo['salesTax'] ? $orderInfo['salesTax'] : 0,
      'shippingAmount' => $orderInfo['shippingAmount'] ? $orderInfo['shippingAmount'] : 0,
      'shipAddress' => array(
        'firstName' => $orderInfo['firstName'],
        'lastName' => $orderInfo['lastName'],
        'address' => $orderInfo['address'],
        'address2' => $orderInfo['address2'],
        'city' => $orderInfo['city'],
        'state' => $orderInfo['state'],
        'postalCode' => $orderInfo['postalCode'],
        'country' => $orderInfo['country']
      ),
      'billing' => array(
        'brand' => $orderInfo['brand'],
        'expMonth' => $orderInfo['expMonth'],
        'expYear' => $orderInfo['expYear'],
        'lastFour' => $orderInfo['lastFour']
      ),
      'items' => $orderItems
    );

    return $order;
  }

  public static function get_order_by_external_id($externalOrderId) {
    $_externalOrderId = db_escape($externalOrderId);
    $sql = "SELECT o.id, o.userId, o.dateOrdered, o.discountCode, o.discountAmount, o.salesTax, o.shippingAmount
      FROM orders AS o
      WHERE o.externalOrderId=$_externalOrderId";
    $results = db_query($sql);
    $orderInfo = db_fetch_assoc($results);
    return $orderInfo;
  }

  public static function get_order_shipments($orderId) {
    if (!is_numeric($orderId)) {
      throw new Exception("Invalid orderId", 400);
    }
    $externalOrderItems = [];
    $sql = "SELECT externalItemId, qty, trackingNumber, dateShipped
      FROM orderShipments
      WHERE orderId=$orderId";
    $result = db_query($sql);
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $externalOrderItems[] = $row;
    }
    return $externalOrderItems;
  }

  public static function get_orders_for_user($userId = null) {
    if (!$userId) {
      $userId = User::get_user_id_from_session();
    }
    else if (!is_numeric($userId)) {
      throw new Exception("Invalid user id", 400);
    }
    $orders = [];
    $sql = "SELECT o.id, o.dateOrdered,
      	SUM(oi.qty*oi.price) + o.salesTax - o.discountAmount + o.shippingAmount as total,
      	COUNT(oi.id) AS numItems
      FROM orders AS o
      INNER JOIN orderItems AS oi ON o.id=oi.orderId
      WHERE o.userId=$userId
      GROUP BY o.id";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $orders[] = $row;
    }
    return $orders;
  }

  public static function get_order_item($orderItemId) {
    if (!is_numeric($orderItemId)) {
      throw new Exception("Invalid orderItemId", 400);
    }
    $sql = "SELECT oi.orderId, oi.sku, oi.qty, oi.price, oi.status,
      p.name,
      otp.filename, otp.guid,
      pp.externalId
      FROM orderItems AS oi
      INNER JOIN products AS p ON oi.sku=p.sku
      LEFT JOIN orderItemTemplateProducts AS otp ON oi.id=otp.orderItemId
      LEFT JOIN printProducts AS pp on oi.sku=pp.sku
      WHERE oi.id=$orderItemId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return $row;
  }

  public static function get_order_items($orderId) {
    if (!is_numeric($orderId)) {
      throw new Exception("Invalid order id", 400);
    }
    $orderItems = [];
    $sql = "SELECT oi.sku, oi.qty, oi.price, oi.status,
      p.name,
      otp.filename, otp.guid,
      oii.thumbnailUrl, oii.hiresUrl,
      pp.externalId
      FROM orderItems AS oi
      INNER JOIN products AS p ON oi.sku=p.sku
      LEFT JOIN orderItemTemplateProducts AS otp ON oi.id=otp.orderItemId
      LEFT JOIN orderItemImages AS oii ON oi.id=oii.orderItemId
      LEFT JOIN printProducts AS pp on oi.sku=pp.sku
      WHERE oi.orderId=$orderId";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $orderItems[] = $row;
    }
    return $orderItems;
  }

  /*** PRIVATE ***/

  private static function insert_order_items($orderId, $items) {
    foreach($items as $item) {
      $_sku = db_escape($item->sku);
      $qty = $item->qty;
      if (!is_numeric($qty)) {
        throw new Exception("Illegal order. Invalid quantity.", 400);
      }
      $price = $item->price;
      if (!is_numeric($price)) {
        throw new Exception("Illegal order. Invalid price.", 400);
      }

      $sql = "INSERT INTO orderItems
        (orderId, sku, qty, price)
        VALUES($orderId, '$_sku', $qty, $price)";
      db_query($sql);
      $orderItemId = db_get_insert_id();

      if ($item->templateProductId) {
        Order::insert_order_item_template_product($orderItemId, $item);
      }
    }
  }

  private static function insert_order_item_template_product($orderItemId, $item) {
    $templateProductId = $item->templateProductId;
    if (!is_numeric($templateProductId)) {
      throw new Exception("Illegal order. Invalid template product id.", 400);
    }
    $_filename = db_escape($item->guid . '.svg');
    $_guid = db_escape($item->guid);
    $_projectData = db_escape(json_encode($item->projectData));
    $sql = "INSERT INTO orderItemTemplateProducts
      (orderItemId, templateProductId, filename, guid, projectData)
      VALUES($orderItemId, $templateProductId, '$_filename', '$_guid', '$_projectData')";
    db_query($sql);
  }

  private static function send_order_email($orderId) {
    $sql = "SELECT u.email, u.firstName, u.lastName
      FROM users AS u
      INNER JOIN orders AS o ON u.id=o.userId
      WHERE o.id=$orderId";
    $result = db_query($sql);
    $user = db_fetch_assoc($result);

    if (!$user) {
      throw new Exception("wth", 500);
    }

    $link = 'https://' . SITE_ROOT . '/app/order/' . $orderId;

    $name = $user['firstName'] ? $user['firstName'] . ' ' . $user['lastName'] : '';
    $msg = $name ? $name . ",\r\n\r\n" : '';

    $msg .= "Thanks for your recent order on apertura.design. We're sure you're going to love your creations.";
    $msg .= "Here's a copy of your order for your records: $link.\r\n\r\n";
    $msg .= "We're excited to hear what you think so send us a shout out and tell your friends!\r\n\r\n";
    $msg .= "Apertura";

    mail($user['email'], "Thanks for your order", $msg, "From: 'Apertura Support' <support@apertura.photo>\r\n");
    mail('support@apertura.photo', "An order was placed", "Order #$orderId\r\n$link", "From: 'Apertura Support' <support@apertura.photo>\r\n");
  }

  private static function charge_card($totalAmount, $creditCardId) {
    require_once "lib/stripe-php-3.14.1/init.php";

    if (!is_numeric($creditCardId)) {
      throw new Exception("Invalid credit card id");
    }
    $sql = "SELECT cc.token, cc.cardToken,
      u.customerId
      FROM creditCards AS cc
      INNER JOIN users AS u ON cc.userId=u.id
      WHERE cc.id=$creditCardId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $token = $row['token'];
    $cardToken = $row['cardToken'];
    $customerId = $row['customerId'];

    \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);
    $charge = \Stripe\Charge::create(array(
      "amount" => $totalAmount * 100, // price in cents
      "currency" => "usd",
      "customer" => $customerId,
      "source" => $cardToken
    ));
    if ($charge && $charge['status'] == 'succeeded') {
      return true;
    }
    return false;
  }
}
