<?php
class Processing {

  public static function get_next_template_order_item() {
    $sql = "SELECT tp.templateProductId, tp.filename, tp.guid, tp.projectData, tp.orderItemId
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
    Processing::upload_design_to_amazon($s3, "thumbnail/$designGuid.jpg", $thumbnailBinary);

    if (substr($hiresBase64, 0, 5) == "data:") {
      $hiresBase64 = substr($hiresBase64, strpos($hiresBase64, 'base64,')+7);
    }
    $hiresBinary = base64_decode($hiresBase64);
    Processing::upload_design_to_amazon($s3, "hires/$designGuid.jpg", $hiresBinary);

    $sql = "UPDATE orderItemTemplateProducts
      SET status='processed'
      WHERE orderItemId=$orderItemId";
    db_query($sql);

    return true;
  }

  public static function submit_order_to_print($templateProductId, $designGuid) {

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

}
