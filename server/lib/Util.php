<?php
  class Util {
    public static function create_guid($length) {
      $valid_chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
      $str = '';
      for ($i=0; $i<$length; $i++) {
        $r = rand(0, count($valid_chars)-1);
        $str .= $valid_chars[$r];
      }
      return $str;
    }
  }
