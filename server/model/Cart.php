<?php
class Cart {

  public static function add_to_cart($guid, $userId, $templateProductId, $sku, $externalId, $qty, $svgText) {
    $_guid = db_escape($guid);
    $_userId = $userId && is_numeric($userId) ? $userId : 'NULL';
    $_sku = db_escape($sku);
    $_externalId = db_escape($externalId);
    $_svgText = db_escape($svgText);
    if (!is_numeric($templateProductId)) {
      throw new Exception("Invalid templateProductId", 400);
    }
    if (!is_numeric($qty)) {
      throw new Exception("Invalid qty", 400);
    }
    $sql = "INSERT INTO cartItems
      (guid, userId, templateProductId, sku, externalId, qty, svgText)
      VALUES('$_guid', $_userId, $templateProductId, '$_sku', '$_externalId', $qty, '$_svgText')";
    db_query($sql);
  }

  public static function upload_design($designGuid, $svg) {
    require_once 'lib/amazon/aws-autoloader.php';

    $s3 = new Aws\S3\S3Client([
      'credentials' => array(
        'key'       => S3_KEY,
        'secret'    => S3_SECRET
      ),
      'region' => 'us-east-1',
      'version' => 'latest'
    ]);

    $filename = "svg/$designGuid.svg";

    Cart::upload_svg_to_amazon($s3, $filename, $svg);

    return true;
  }

  public static function get_shipping_quote($address, $items) {
    require_once('lib/Gooten.php');

    $gootenItems = [];
    foreach($items as $item) {
      $gootenItems[] = array(
        'SKU' => $item->sku,
        'Quantity' => ($item->quantity | 1)
      );
    }
    $gootenShipRequest = array(
      'ShipToPostalCode' => $address->postalCode,
      'ShipToCountry' => $address->country,
      'ShipToState' => $address->state,
      'Items' => $gootenItems
    );

    $response = Gooten::get_shipping_quote($gootenShipRequest);
    $shipOptions = $response['response']->Result[0]->ShipOptions;

    $price = 0;
    $delivery = 0;

    foreach($shipOptions as $opt) {
      if ($opt->MethodType == 'Standard') {
        $price = $opt->Price->Price;
        $delivery = $opt->EstBusinessDaysTilDelivery;
      }
    }
    return array(
      'shipping' => $price,
      'timeframe' => $delivery
    );
  }

  public static function validate_discount_code($discountCode) {
    $_discountCode = db_escape($discountCode);
    $sql = "SELECT *
      FROM discountCodes
      WHERE discountCode='$_discountCode'
      AND dateStarts <= NOW()
      AND (dateEnds IS NULL OR dateEnds > NOW())";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      return array(
        'pctDiscount' => $row['pctDiscount'],
        'flatDiscount' => $row['flatDiscount'],
        'freeShipping' => $row['freeShipping'] == 1 ? true : false,
        'discountCode' => $row['discountCode'],
        'discountDescription' => $row['description'],
        'dateEnds' => $row['dateEnds']
      );
    }
    return null;
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

}
