<?php
  require_once('lib/db.inc');

  define('SITE_PATH', '/home/madisonavenueinc/apertura.design');
  define('TEMPLATE_PATH', '/home/madisonavenueinc/apertura.design/client/app/assets/templates/svg');
  define('THUMBNAIL_PATH', '/home/madisonavenueinc/apertura.design/client/app/assets/templates/thumbnail');

  define('DOMAIN', 'apertura.design');
  define('SITE_ROOT', 'apertura.design');

  define('S3_BUCKET', 'media.apertura.design');
  define('S3_KEY', 'AKIAI2ECUTNCSUTJQFSA');
  define('S3_SECRET', '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');
  define('S3_DOMAIN', 'https://s3.amazonaws.com/media.apertura.design');

  define('S3_ORDER_BUCKET', 'orders.apertura.design');
  define('S3_ORDER_DOMAIN', 'https://s3.amazonaws.com/orders.apertura.design');

  define('S3_PHOTO_BUCKET', 'media.apertura.photo');
  define('S3_PHOTO_DOMAIN', 'https://s3.amazonaws.com/media.apertura.photo');

  define('STRIPE_LIVE_PK', 'sk_live_WVgpoy6m7SHwWq6slGi32PDl');

  define('GOOTEN_API_URL', 'https://api.print.io/api/v/3');
  define('GOOTEN_RECIPE_ID', '9f6c711c-0e4c-4985-bf4b-758dfb3a857d');

  function __autoload($class_name) {
    if (file_exists("model/$class_name.php")) {
     include "model/$class_name.php";
    }
    else if (file_exists("lib/$class_name.php")) {
      include "lib/$class_name.php";
    }
    else {
      $parts = explode("\\", $class_name);
      $path = implode("/", $parts);
      include "lib/$path.php";
    }
  }
