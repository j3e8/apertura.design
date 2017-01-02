<?php
class Template {

  public static function get_saved_user_template($savedTemplateId) {
    $userId = User::get_user_id_from_session();
    if (!$userId){
      throw new Exception("Unauthorized saving of template", 401);
    }
    if (!is_numeric($savedTemplateId)) {
      throw new Exception("Invalid saved template id", 400);
    }
    $sql = "SELECT templateProductId, saveData
      FROM userSavedTemplates
      WHERE id=$savedTemplateId
      AND userId=$userId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return array(
      'templateProductId' => $row['templateProductId'],
      'saveData' => json_decode($row['saveData'])
    );
  }

  public static function get_template($templateId) {
    if (!is_numeric($templateId)) {
      throw new Exception("Invalid template id", 400);
    }
    $template = null;
    $sql = "SELECT t.id, t.name, t.templateType,
      tp.id AS templateProductId,
      p.sku, p.name as productName, p.price,
      pp.width, pp.height, pm.medium,
      tf.filename,
      a.artistName
      FROM templates as t
      INNER JOIN artists AS a ON t.artistId=a.id
      LEFT JOIN templateProducts as tp ON t.id=tp.templateId
      LEFT JOIN templateFiles as tf ON tf.id=tp.templateFileId
      LEFT JOIN products as p ON tp.sku=p.sku
      LEFT JOIN printProducts as pp ON p.sku=pp.sku
      LEFT JOIN printMediums as pm ON pp.printMediumId=pm.id
      WHERE t.id=$templateId
      ORDER BY t.id, pm.sortOrder, pp.width, pp.height";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      if (!$template) {
        $template = array(
          'id' => $row['id'],
          'artistName' => $row['artistName'],
          'filename' => $row['filename'],
          'name' => $row['name'],
          'templateType' => $row['templateType'],
          'products' => array()
        );
      }
      $template['products'][] = array(
        'templateProductId' => $row['templateProductId'],
        'sku' => $row['sku'],
        'name' => $row['productName'],
        'price' => $row['price'],
        'width' => $row['width'],
        'height' => $row['height'],
        'medium' => $row['medium']
      );
    }
    return $template;
  }

  public static function get_templates($templateType) {
    $validTypes = array('photo', 'design', 'scrapbook', 'book', 'kit');
    $typeClause = '';
    if (in_array($templateType, $validTypes)) {
      $typeClause = "AND templateType='$templateType'";
    }
    $templates = [];
    $sql = "SELECT id, name
      FROM templates
      WHERE status='active'
      $typeClause
      ORDER by dateReleased DESC";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      $templates[] = $row;
    }
    return $templates;
  }

  public static function get_photo_templates_by_medium($medium) {
    $_medium = db_escape($medium);
    $templates = [];
    $sql = "SELECT t.id as templateId, tp.id as templateProductId, p.name as productName, p.sku, p.price
      FROM templates AS t
      INNER JOIN templateProducts AS tp ON t.id=tp.templateId
      INNER JOIN templateFiles AS tf ON tp.templateFileId=tf.id
      INNER JOIN products AS p ON tp.sku=p.sku
      INNER JOIN printProducts AS pp ON p.sku=pp.sku
      INNER JOIN printMediums AS pm ON pp.printMediumId=pm.id
      WHERE t.status='active'
      AND p.status='active'
      AND t.templateType='photo'
      AND tf.orientation='landscape'
      AND pm.medium='$_medium'
      ORDER BY pp.width, pp.height";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      $templates[] = $row;
    }
    return $templates;
  }

  public static function get_canvas_templates() {
    $_medium = db_escape($medium);
    $templates = [];
    $sql = "SELECT t.id as templateId, tp.id as templateProductId,
      p.name as productName, p.sku, p.price
      FROM templates AS t
      INNER JOIN templateProducts AS tp ON t.id=tp.templateId
      INNER JOIN templateFiles AS tf ON tp.templateFileId=tf.id
      INNER JOIN products AS p ON tp.sku=p.sku
      INNER JOIN printProducts aS pp ON p.sku=pp.sku
      WHERE t.status='active'
      AND p.status='active'
      AND t.templateType='canvas'
      AND tf.orientation='landscape'
      AND tf.edge='wrap'
      ORDER BY pp.width, pp.height";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      $templates[] = $row;
    }
    return $templates;
  }

  public static function get_template_product($templateProductId) {
    if (!is_numeric($templateProductId)) {
      throw new Exception("Invalid template product id", 400);
    }
    $sql = "SELECT t.id, t.name as templateName, t.templateType,
      tp.id AS templateProductId,
      p.sku, p.name as productName, p.price,
      pp.width, pp.height, pp.externalId,
      pm.medium,
      tf.filename, tf.orientation
      FROM templates as t
      LEFT JOIN templateProducts as tp ON t.id=tp.templateId
      LEFT JOIN templateFiles as tf ON tf.id=tp.templateFileId
      LEFT JOIN products as p ON tp.sku=p.sku
      LEFT JOIN printProducts as pp ON p.sku=pp.sku
      LEFT JOIN printMediums as pm ON pp.printMediumId=pm.id
      WHERE tp.id=$templateProductId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    return $row;
  }

  public static function load_next_for_review() {
    $userId = User::get_user_id_from_session();
    if ($userId != 1) {
      throw new Exception("You're not allowed here", 401);
    }

    $sql = "SELECT t.id, t.name,
      a.artistName
      FROM templates AS t
      INNER JOIN artists AS a ON t.artistId=a.id
      WHERE t.status='pending'
      ORDER BY t.dateUploaded
      LIMIT 1";
    $result = db_query($sql);
    $template = db_fetch_assoc($result);

    $templateProducts = [];
    $sql = "SELECT tp.sku,
      tf.filename, tf.aspect, tf.orientation
      FROM templateProducts AS tp
      INNER JOIN templateFiles AS tf ON tp.templateFileId=tf.id
      WHERE tp.templateId={$template['id']}
      AND tf.status='active'";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $templateProducts[] = $row;
    }

    $keywords = [];
    $sql = "SELECT keyword
      FROM templateKeywords
      WHERE templateId={$template['id']}";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $keywords[] = $row['keyword'];
    }

    return array(
      'template' => $template,
      'templateProducts' => $templateProducts,
      'keywords' => $keywords
    );
  }

  public static function save_user_template($id, $templateProductId, $data) {
    if (User::is_user_signed_in()) {
      $userId = User::get_user_id_from_session();
      $_userId = $userId;
    }
    else {
      $_userId = 'NULL';
    }

    if (!is_numeric($templateProductId)) {
      throw new Exception("Invalid templateProductId", 400);
    }
    if ($id && !is_numeric($id)) {
      throw new Exception("Invalid saved template id", 400);
    }
    $_data = db_escape(json_encode($data));

    if ($id) {
      $sql = "UPDATE userSavedTemplates
        SET templateProductId=$templateProductId,
        userId=$_userId,
        saveData = '$_data'
        WHERE id=$id";
      db_query($sql);
    }
    else {
      $sql = "INSERT INTO userSavedTemplates
        (userId, templateProductId, saveData)
        VALUES($_userId, $templateProductId, '$_data')";
      db_query($sql);
      $id = db_get_insert_id();
    }
    return $id;
  }

  public static function search($query) {
    $_query = db_escape($query);
    $templates = [];
    $sql = "SELECT id, name
      FROM templates
      WHERE status='active'
      AND templateType='design'
      AND (
        name LIKE '%{$_query}%'
        OR id IN (
          SELECT templateId
          FROM templateKeywords
          WHERE keyword LIKE '%{$_query}%'
        )
      )
      ORDER by dateReleased DESC";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      $templates[] = $row;
    }
    return $templates;
  }

  public static function upload_template($name, $artistId, $keywords, $thumbnail, $templateFiles) {
    if (!User::validate_artist_id_and_current_user($artistId)) {
      throw new Exception("Unauthorized upload", 401);
    }
    $_name = db_escape($name);
    $sql = "INSERT INTO templates
      (name, status, artistId)
      VALUES('$_name', 'pending', $artistId)";
    db_query($sql);
    $templateId = db_get_insert_id();

    Template::save_keywords($templateId, $keywords);
    Template::save_thumbnail($templateId, $thumbnail);

    for($i=0; $i < count($templateFiles); $i++) {
      $file = $templateFiles[$i];
      $_aspect = db_escape($file->aspectRatio);
      $_orientation = db_escape($file->orientation);
      $givenFilename = preg_replace('/[^\w\.\-_]/', '', $file->filename);

      $extension_pos = strrpos($givenFilename, '.');
      $filename_base = substr($givenFilename, 0, $extension_pos);
      $extension = substr($givenFilename, $extension_pos + 1);
      $filename = $filename_base . time() . ".$extension";

      Template::save_svg($filename, $file->svgFile);

      $sql = "INSERT INTO templateFiles
        (filename, aspect, orientation)
        VALUES('$filename', $_aspect, '$_orientation')";
      db_query($sql);
      $templateFileId = db_get_insert_id();

      foreach($file->products as $sku) {
        $_sku = db_escape($sku);
        $sql = "INSERT INTO templateProducts
          (templateId, templateFileId, sku)
          VALUES($templateId, $templateFileId, '$_sku')";
        db_query($sql);
      }
    }
  }

  public static function get_rotated_template_product($templateProductId) {
    $sql = "SELECT templateId, templateFileId, sku, tf.orientation
      FROM templateProducts AS tp
      INNER JOIN templateFiles AS tf ON tp.templateFileId=tf.id
      WHERE tp.id=$templateProductId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);

    if ($row) {
      $_sku = db_escape($row['sku']);
      $sql = "SELECT tp.id, tf.orientation FROM templateProducts AS tp
        INNER JOIN templateFiles AS tf ON tp.templateFileId=tf.id
        WHERE templateId={$row['templateId']}
        AND sku='$_sku'
        AND templateFileId!={$row['templateFileId']}
        AND tf.orientation!='{$row['orientation']}'";
      $results = db_query($sql);
      $row = db_fetch_assoc($results);
      return $row;
    }
    else {
      return null;
    }
  }



  /*** PRIVATE ***/
  private static function save_keywords($templateId, $keywords) {
    foreach($keywords as $keyword) {
      $_keyword = db_escape($keyword);
      $sql = "INSERT INTO templateKeywords
        (templateId, keyword)
        VALUES($templateId, '$_keyword')";
      db_query($sql);
    }
  }

  private static function save_thumbnail($templateId, $thumbnailBase64) {
    $thumbnailPath = THUMBNAIL_PATH . "/$templateId.jpg";
    if (substr($thumbnailBase64, 0, 5) == "data:") {
      $thumbnailBase64 = substr($thumbnailBase64, strpos($thumbnailBase64, 'base64,')+7);
    }
    $binary = base64_decode($thumbnailBase64);
    $fh = fopen($thumbnailPath, "wb");
    fwrite($fh, $binary);
    fclose($fh);
  }

  private static function save_svg($filename, $svgFileBase64) {
    $svgText = base64_decode($svgFileBase64);
    $templatePath = TEMPLATE_PATH . "/$filename";
    $fh = fopen($templatePath, "w");
    fwrite($fh, $svgText);
    fclose($fh);
  }
}
