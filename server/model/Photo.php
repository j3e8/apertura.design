<?php
class Photo {
  public static function get_photos_for_all_years() {
    $userId = User::get_user_id_from_session();

    $folders = [];
    $sql = "select
      YEAR(p.dateTaken) as yearTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and p.dateTaken IS NOT NULL
      and YEAR(p.dateTaken) != 0
      group by YEAR(p.dateTaken)
      order by YEAR(p.dateTaken) DESC";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function get_photos_for_day($year, $month, $day) {
    $userId = User::get_user_id_from_session();
    $dateStart = "$year-$month-$day 00:00:00";
    $photos = [];
    $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, p.dateTaken
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 DAY)
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by pf.id
      ";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }

  static function get_photos_for_month($year, $month) {
    $userId = User::get_user_id_from_session();
    $monthStart = "$year-$month-01 00:00:00";

    $folders = [];
    $sql = "select
      DATE(p.dateTaken) as dateTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.dateTaken between '$monthStart' and DATE_ADD('$monthStart', INTERVAL 1 MONTH)
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.dateTaken between '$monthStart' and DATE_ADD('$monthStart', INTERVAL 1 MONTH)
      and p.status='active'
      and pf.status='active'
      group by DATE(dateTaken)";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function get_photos_for_year($year) {
    $userId = User::get_user_id_from_session();
    $dateStart = "$year-01-01";

    $folders = [];
    $sql = "select
      MONTH(p.dateTaken) as dateTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 YEAR)
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 YEAR)
      and p.status='active'
      and pf.status='active'
      group by MONTH(dateTaken)";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function output_photo($userId, $randomFolder, $photoFileId, $size, $noredirect = false, $base64 = false) {
    $subfolder = '';
    if ($size && $size <= 600) {
      $subfolder = '600px/';
    }
    else if ($size && $size <= 1920) {
      $subfolder = '1920px/';
    }

    $photoFileId = db_escape($photoFileId);
    $sql = "select filename, UNIX_TIMESTAMP(lastModified) as lastModified from photoFiles where id=$photoFileId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $lastModified = $row['lastModified'];

    $extension = 'jpg';
    if (!$size) {
      $extension = substr($row['filename'], strrpos($row['filename'], '.') + 1);
    }

    if (!$noredirect) {
      header("location: https://s3.amazonaws.com/media.apertura.photo/$userId/$randomFolder/$subfolder$photoFileId.$extension?$lastModified");
      // TODO: when we have SSL for this CNAME we can switch
      // header("location: https://media.apertura.photo/$userId/$randomFolder/$subfolder$photoFileId.jpg");
      exit();
    }
    else {
      require 'lib/amazon/aws-autoloader.php';

      $path = "$userId/$randomFolder/$subfolder$photoFileId.$extension";

      $s3 = new Aws\S3\S3Client([
        'credentials' => array(
          'key'       => S3_KEY,
          'secret'    => S3_SECRET
        ),
        'region' => 'us-east-1',
        'version' => 'latest'
      ]);

      $result = $s3->getObject(array(
        'Bucket' => S3_PHOTO_BUCKET,
        'Key' => $path
      ));

      if ($base64) {
        header("Content-Type: text/plain");
        echo base64_encode($result['Body']);
      }
      else {
        header("Content-Type: {$result['ContentType']}");
        echo $result['Body'];
      }
      exit();
    }
  }

  public static function upload_photo($base64) {
    require_once 'lib/amazon/aws-autoloader.php';
    require_once 'lib/Util.php';

    $s3 = new Aws\S3\S3Client([
      'credentials' => array(
        'key'       => S3_KEY,
        'secret'    => S3_SECRET
      ),
      'region' => 'us-east-1',
      'version' => 'latest'
    ]);

    $randomFolder = rand(0, 999);
    Photo::create_amazon_bucket($s3, "$randomFolder/");

    $guid = Util::create_guid(10);
    if (substr($base64, 0, 5) == "data:") {
      $base64 = substr($base64, strpos($base64, 'base64,')+7);
    }
    $binary = base64_decode($base64);
    Photo::upload_photo_to_amazon($s3, "$randomFolder/$guid.jpg", $binary);

    return array(
      'src' => S3_DOMAIN . "/$randomFolder/$guid.jpg"
    );
  }

  private static function create_amazon_bucket($s3, $bucket) {
    if (!$s3->doesObjectExist(S3_BUCKET, "$bucket")) {
      $s3->putObject(array(
        'Bucket' => S3_BUCKET,
        'Key'    => "$bucket",
        'Body'   => ""
      ));
    }
  }

  private static function upload_photo_to_amazon($s3, $filename, $binary) {
    $s3->putObject(array(
      'Bucket' => S3_BUCKET,
      'Key'    => $filename,
      'StorageClass' => 'STANDARD',
      'ACL' => 'public-read',
      'Body'   => $binary
    ));
  }

}
