<?php
class Processing {

  public static function get_next_template_order_item() {
    $sql = "SELECT oi.orderId, tp.templateProductId, tp.filename, tp.guid, tp.projectData, tp.orderItemId
      FROM orders AS o
      INNER JOIN orderItems AS oi ON o.id=oi.orderId
      INNER JOIN orderItemTemplateProducts AS tp ON oi.id=tp.orderItemId
      WHERE o.status='paid'
      AND oi.status='active'
      AND tp.status='pending'
      ORDER BY dateOrdered DESC
      LIMIT 1";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return $row;
  }

  public static function upload_design($orderItemId, $designGuid, $thumbnailBase64, $hiresBase64) {
    if (!is_numeric($orderItemId)) {
      throw new Exception("ain't no hackin' to be done here");
    }

    require_once 'lib/amazon/aws-autoloader.php';

    $s3 = new Aws\S3\S3Client([
      'credentials' => array(
        'key'       => S3_KEY,
        'secret'    => S3_SECRET
      ),
      'region' => 'us-east-1',
      'version' => 'latest'
    ]);

    if (substr($thumbnailBase64, 0, 5) == "data:") {
      $thumbnailBase64 = substr($thumbnailBase64, strpos($thumbnailBase64, 'base64,')+7);
    }
    $thumbnailBinary = base64_decode($thumbnailBase64);
    $thumbnailPath = "thumbnail/$designGuid.jpg";
    Processing::upload_design_to_amazon($s3, $thumbnailPath, $thumbnailBinary);

    if (substr($hiresBase64, 0, 5) == "data:") {
      $hiresBase64 = substr($hiresBase64, strpos($hiresBase64, 'base64,')+7);
    }
    $hiresBinary = base64_decode($hiresBase64);
    $hiresPath = "hires/$designGuid.jpg";
    Processing::upload_design_to_amazon($s3, $hiresPath, $hiresBinary);

    $sql = "UPDATE orderItemTemplateProducts
      SET status='processed'
      WHERE orderItemId=$orderItemId";
    db_query($sql);

    return array(
      'thumbnail' => 'https://s3.amazonaws.com/' . S3_ORDER_BUCKET . '/' . $thumbnailPath,
      'hires' => 'https://s3.amazonaws.com/' . S3_ORDER_BUCKET . '/' . $hiresPath
    );
  }

  public static function save_order_item_images($orderItemId, $thumbnailUrl, $hiresUrl) {
    if (!is_numeric($orderItemId)) {
      throw new Exception("ain't no hackin' to be done here");
    }

    $thumbnailUrl = db_escape($thumbnailUrl);
    $hiresUrl = db_escape($hiresUrl);

    $sql = "INSERT INTO orderItemImages
      SET orderItemId=$orderItemId,
      thumbnailUrl='$thumbnailUrl',
      hiresUrl='$hiresUrl'";
    db_query($sql);

    $orderItem = Order::get_order_item($orderItemId);
    $orderId = $orderItem['orderId'];

    if (Processing::is_order_fully_processed($orderId)) {
      return Processing::submit_order_to_print($orderId);
    }
  }

  private static function is_order_fully_processed($orderId) {
    $sql = "SELECT COUNT(*) AS pending
    	FROM orderItems AS oi
    	INNER JOIN orderItemTemplateProducts AS otp ON oi.id=otp.orderItemId
    	WHERE oi.orderId=$orderId
    	AND otp.status!='processed'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row['pending'] == 0) {
      return true;
    }
    return false;
  }

  public static function submit_order_to_print($orderId) {
    $order = Order::get_order($orderId);

    $items = [];
    foreach ($order['items'] as $item) {
      $items[] = array(
        "Quantity" => $item['qty'],
        "SKU" => $item['externalId'],
        "ShipCarrierMethodId" => 1,
        "Images" => [
          array(
            "Url" => $item['hiresUrl'],
            "Index" => 0,
            "ThumbnailUrl" => $item['thumbnailUrl'],
            "ManipCommand" => "",
            "SpaceId" => "0"
          )
        ]
      );
    }

    $data = array(
      "IsInTestMode" => false,
      "ShipToAddress" => array(
        "FirstName" => $order['shipAddress']['firstName'],
        "LastName" => $order['shipAddress']['lastName'],
        "Line1" => $order['shipAddress']['address'] . ' ' . $order['shipAddress']['address2'],
        "City" => $order['shipAddress']['city'],
        "State" => $order['shipAddress']['state'],
        "CountryCode" => Util::country_code_to_two_digit_code($order['shipAddress']['country']),
        "PostalCode" => $order['shipAddress']['postalCode'],
        "IsBusinessAddress" => false,
        "Phone" => APERTURA_SUPPORT_PHONE,
        "Email" => APERTURA_SUPPORT_EMAIL
      ),
      "BillingAddress" => array(
        "FirstName" => $order['shipAddress']['firstName'],
        "LastName" => $order['shipAddress']['lastName'],
        "Line1" => $order['shipAddress']['address'] . ' ' . $order['shipAddress']['address2'],
        "City" => $order['shipAddress']['city'],
        "State" => $order['shipAddress']['state'],
        "CountryCode" => Util::country_code_to_two_digit_code($order['shipAddress']['country']),
        "PostalCode" => $order['shipAddress']['postalCode'],
        "IsBusinessAddress" => false,
        "Phone" => APERTURA_SUPPORT_PHONE,
        "Email" => APERTURA_SUPPORT_EMAIL
      ),
      "Items" => $items,
      "Payment" => array(
        "PartnerBillingKey" => GOOTEN_PARTNER_BILLING_KEY
      )
    );

    $curl = curl_init();
    curl_setopt_array($curl, array(
      CURLOPT_URL => "https://api.print.io/api/v/5/source/api/orders/?recipeid=" . GOOTEN_RECIPE_ID,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_ENCODING => "",
      CURLOPT_MAXREDIRS => 10,
      CURLOPT_TIMEOUT => 30,
      CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
      CURLOPT_CUSTOMREQUEST => "POST",
      CURLOPT_POSTFIELDS => json_encode($data),
      CURLOPT_HTTPHEADER => array("content-type: application/json"),
    ));
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    $responseData = json_decode($response);
    $externalOrderId = $responseData->Id;

    if ($err) {
      mail('support@apertura.photo', 'Gooten API error', $err, "From: 'Apertura Support' <support@apertura.photo>\r\n");
    }
    else if ($responseData->ErrorReferenceCode) {
      mail('support@apertura.photo', 'Gooten API error', $response, "From: 'Apertura Support' <support@apertura.photo>\r\n");
    }
    else {
      mail('support@apertura.photo', 'Gooten order placed', $response, "From: 'Apertura Support' <support@apertura.photo>\r\n");
      return Processing::update_order_with_external_order_id($orderId, $externalOrderId);
    }
  }

  public static function order_status_webhook($externalOrderId, $Id, $NiceId, $Items) {
    $itemstr = json_encode($Items);
    mail('support@apertura.photo', 'Gooten webhook', "Gooten order #$externalOrderId\n\n$Id\n\n$NiceId\n\n$itemstr", "From: 'Apertura Support' <support@apertura.photo>\r\n");

    $order = Order::get_order_by_external_id($externalOrderId);
    $somethingChanged = Processing::update_external_order_items($order->id, $Items);
    if (!$somethingChanged) {
      return;
    }
    $orderShipments = Order::get_order_shipments($order->id);

    $totalItems = 0;
    $itemsShipped = 0;
    $trackingNumbers = [];
    foreach($orderShipments as $item) {
      if ($item->trackingNumber) {
        $trackingNumbers[] = $item->trackingNumber;
        $itemsShipped += $item->qty;
      }
      $totalItems += $item->qty;
    }
    Processing::send_shipment_email($order->id, $totalItems, $itemsShipped, $trackingNumbers);
  }


  /*** PRIVATE ***/
  private static function upload_svg_to_amazon($s3, $filename, $svg) {
    $s3->putObject(array(
      'Bucket' => S3_ORDER_BUCKET,
      'Key'    => $filename,
      'StorageClass' => 'STANDARD',
      'ACL' => 'public-read',
      'ContentType' => 'image/svg+xml',
      'Body'   => $svg
    ));
  }

  private static function upload_design_to_amazon($s3, $filename, $binary) {
    $s3->putObject(array(
      'Bucket' => S3_ORDER_BUCKET,
      'Key'    => $filename,
      'StorageClass' => 'STANDARD',
      'ACL' => 'public-read',
      'ContentType' => 'image/jpeg',
      'Body'   => $binary
    ));
  }

  private static function update_order_with_external_order_id($orderId, $externalOrderId) {
    if (!is_numeric($orderId) || !$externalOrderId) {
      throw new Exception("Bad orderId", 400);
    }
    $externalOrderId = db_escape($externalOrderId);
    $sql = "UPDATE orders
      SET externalOrderId='$externalOrderId'
      WHERE id=$orderId";
    db_query($sql);
  }

  private static function update_external_order_items($orderId, $externalItems) {
    if (!is_numeric($orderId)) {
      throw new Exception("Invalid orderId", 400);
    }

    $orderShipments = Order::get_order_shipments($order->id);

    $somethingChanged = false;
    foreach($externalItems as $item) {
      // TODO find item in $orderShipments
      // TODO if it doesn't exist, insert and set $somethingChanged = true
      // TODO if $orderShipment item doesn't have tracking number, update and set $somethingChanged = true
    }
    return $somethingChanged;
  }

  private static function send_shipment_email($orderId, $totalItems, $itemsShipped, $trackingNumbers) {
    $sql = "SELECT u.email, u.firstName, u.lastName
      FROM users AS u
      INNER JOIN orders AS o ON u.id=o.userId
      WHERE o.id=$orderId";
    $result = db_query($sql);
    $user = db_fetch_assoc($result);

    if (!$user) {
      throw new Exception("wth", 500);
    }

    $links = '';
    foreach ($trackingNumbers as $tn) {
      $links .= "$tn\r\n";
    }

    $name = $user['firstName'] ? $user['firstName'] . ' ' . $user['lastName'] : '';
    $msg = $name ? $name . ",\r\n\r\n" : '';

    if ($totalItems == $itemsShipped) {
      $msg .= "We just wanted to let you know that your recent order (#$orderId) has shipped.";
    }
    else {
      $msg .= "We just wanted to let you know that part of your recent order (#$orderId) has shipped. Look forward to the rest of the order shipping real soon!";
    }
    if ($itemsShipped == 1) {
      $msg .= "You can track your shipment at $links.\r\n";
    }
    else {
      $msg .= "You can track your shipment(s) with the following link(s):\r\n$links.\r\n";
    }
    $msg .= "Apertura";

    mail('support@apertura.photo', "Order #$orderId shipped", $msg, "From: 'Apertura Support' <support@apertura.photo>\r\n");
  }
}
