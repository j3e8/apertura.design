var Geometry = {};

Geometry.applyCoordToBounds = function(bounds, x, y) {
  if (bounds.left === undefined || x < bounds.left) {
    bounds.left = Number(x);
  }
  if (bounds.right === undefined || x > bounds.right) {
    bounds.right = Number(x);
  }
  if (bounds.top === undefined || y < bounds.top) {
    bounds.top = Number(y);
  }
  if (bounds.bottom === undefined || y > bounds.bottom) {
    bounds.bottom = Number(y);
  }
}

Geometry.addBounds = function(bounds1, bounds2) {
  var newBounds = {};
  if (!bounds1) {
    return Object.assign({}, bounds2);
  }
  else if (!bounds2) {
    return Object.assign({}, bounds1);
  }

  if (bounds2.left === undefined || bounds1.left < bounds2.left){
    newBounds.left = bounds1.left;
  }
  else {
    newBounds.left = bounds2.left;
  }
  if (bounds2.right === undefined || bounds1.right > bounds2.right){
    newBounds.right = bounds1.right;
  }
  else {
    newBounds.right = bounds2.right;
  }
  if (bounds2.top === undefined || bounds1.top < bounds2.top){
    newBounds.top = bounds1.top;
  }
  else {
    newBounds.top = bounds2.top;
  }
  if (bounds2.bottom === undefined || bounds1.bottom > bounds2.bottom){
    newBounds.bottom = bounds1.bottom;
  }
  else {
    newBounds.bottom = bounds2.bottom;
  }
  newBounds.width = newBounds.right - newBounds.left;
  newBounds.height = newBounds.bottom - newBounds.top;
  return newBounds;
}
