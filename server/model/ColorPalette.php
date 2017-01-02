<?php
class ColorPalette {

  public static function get_palettes() {
    $palettes = [];
    $sql = "SELECT p.id, p.name, s.color
      FROM colorPalettes AS p
      INNER JOIN colorPaletteSwatches AS s ON p.id=s.colorPaletteId
      WHERE p.status='active'
      AND s.status='active'
      ORDER BY p.name, s.id";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      if (count($palettes) == 0 || $palettes[count($palettes) - 1]['id'] != $row['id']) {
        $palettes[] = array(
          'id' => $row['id'],
          'name' => $row['name'],
          'swatches' => []
        );
      }

      $palettes[count($palettes) - 1]['swatches'][] = array('color' => $row['color']);
    }
    return $palettes;
  }

}
