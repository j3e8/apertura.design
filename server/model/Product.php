<?php
class Product {

  public static function get_product($sku) {
    $_sku = db_escape($sku);
    $product = null;
    $sql = "SELECT p.sku, p.name, p.price, pp.width, pp.height, pm.medium
      FROM products as p
      LEFT JOIN printProducts as pp ON p.sku=pp.sku
      LEFT JOIN printMediums as pm ON pp.printMediumId=pm.id
      WHERE p.sku='$_sku'";
    $results = db_query($sql);
    if (($row = db_fetch_assoc($results))) {
      $product = $row;
    }
    return $product;
  }

  public static function get_products_by_aspect($aspectRatio, $canDesign = false) {
    if (!is_numeric($aspectRatio)) {
      throw new Exception("Invalid aspect ratio", 400);
    }
    if ($canDesign) {
      $canDesign = 1;
    }
    else {
      $canDesign = 0;
    }
    $products = [];
    $sql = "SELECT p.sku, p.name, p.price, pp.width, pp.height, pm.medium
      FROM products AS p
      INNER JOIN printProducts AS pp ON p.sku=pp.sku
      INNER JOIN printMediums AS pm ON pp.printMediumId=pm.id
      WHERE pp.aspect=$aspectRatio
      AND pp.canDesign=$canDesign
      ORDER BY pm.sortOrder, pp.width";
    $results = db_query($sql);
    while (($row = db_fetch_assoc($results))) {
      $products[] = $row;
    }
    return $products;
  }
}
