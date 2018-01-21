if (Array.prototype.find === undefined) {
  Array.prototype.find = function(fn) {
    for (var i=0; i < this.length; i++) {
      if (fn(this[i])) {
        return this[i];
      }
    }
    return null;
  }
}

if (!_svgOuterHTMLIsDefined()) {
  Object.defineProperty(SVGElement.prototype, 'outerHTML', {
      get: function () {
          var $node, $temp;
          $temp = document.createElement('div');
          $node = this.cloneNode(true);
          $temp.appendChild($node);
          return $temp.innerHTML;
      },
      enumerable: false,
      configurable: true
  });
}

function _svgOuterHTMLIsDefined() {
  for (var prop in SVGElement.prototype) {
    if (prop.toLowerCase() == 'outerhtml') {
      console.log('outerhtml already defined');
      return true;
    }
  }
  console.log('outerhtml NOT defined');
  return false;
}
