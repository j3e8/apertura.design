var Svg = {};

Svg.calculateSvgElementBounds = function(element) {
  var bounds = null;
  if (element.tagName == 'rect') {
    bounds = Svg.calculateSvgRectBounds(element);
  }
  else if (element.tagName == 'polygon') {
    bounds = Svg.calculateSvgPolygonBounds(element);
  }
  else if (element.tagName == 'circle') {
    bounds = Svg.calculateSvgCircleBounds(element);
  }
  else if (element.tagName == 'ellipse') {
    bounds = Svg.calculateSvgEllipseBounds(element);
  }
  else if (element.tagName == 'path') {
    bounds = Svg.calculateSvgPathBounds(element);
  }
  else if (element.tagName == 'g' && element.childNodes) {
    for (var c=0; c < element.childNodes.length; c++) {
      var childBounds = Svg.calculateSvgElementBounds(element.childNodes[c]);
      if (childBounds) {
        bounds = Geometry.addBounds(bounds, childBounds);
      }
    }
  }
  return bounds;
}

Svg.calculateSvgRectBounds = function(element) {
  var bounds = {
    left: Number(element.getAttribute('x')) || 0,
    top: Number(element.getAttribute('y')) || 0,
    width: Number(element.getAttribute('width')) || 0,
    height: Number(element.getAttribute('height')) || 0
  };
  bounds.right = Number(bounds.left) + Number(bounds.width);
  bounds.bottom = Number(bounds.top) + Number(bounds.height);
  return bounds;
}

Svg.calculateSvgPolygonBounds = function(element) {
  var pairs = element.getAttribute('points').split(' ')
  .filter(function(point) {
    return point != '';
  }).map(function(pair) {
    var parts = pair.split(',');
    return {
      x: parts[0],
      y: parts[1]
    };
  });
  var min = {};
  var max = {};

  for (var i=0; i < pairs.length; i++) {
    if (min.x === undefined || Number(pairs[i].x) < min.x) {
      min.x = Number(pairs[i].x);
    }
    if (min.y === undefined || Number(pairs[i].y) < min.y) {
      min.y = Number(pairs[i].y);
    }
    if (max.x === undefined || Number(pairs[i].x) > max.x) {
      max.x = Number(pairs[i].x);
    }
    if (max.y === undefined || Number(pairs[i].y) > max.y) {
      max.y = Number(pairs[i].y);
    }
  }

  var bounds = {
    left: min.x,
    top: min.y,
    width: max.x - min.x,
    height: max.y - min.y
  };
  bounds.right = bounds.left + bounds.width;
  bounds.bottom = bounds.top + bounds.height;

  return bounds;
}

Svg.calculateSvgCircleBounds = function(element) {
  var x = element.getAttribute('cx');
  var y = element.getAttribute('cy');
  var r = element.getAttribute('r');
  var bounds = {
    left: x - r,
    top: y - r,
    width: r * 2,
    height: r * 2
  };
  bounds.right = bounds.left + bounds.width;
  bounds.bottom = bounds.top + bounds.height;

  return bounds;
}

Svg.calculateSvgEllipseBounds = function(element) {
  var x = element.getAttribute('cx');
  var y = element.getAttribute('cy');
  var rx = element.getAttribute('rx');
  var ry = element.getAttribute('ry');
  var bounds = {
    left: x - rx,
    top: y - ry,
    width: rx * 2,
    height: ry * 2
  };
  bounds.right = bounds.left + bounds.width;
  bounds.bottom = bounds.top + bounds.height;

  return bounds;
}

Svg.calculateSvgPathBounds = function(element) {
  var bounds = {
    left: undefined,
    top: undefined,
    width: undefined,
    height: undefined,
    right: undefined,
    bottom: undefined
  };

  var commands = getSvgPathCommands(element);
  commands.forEach(function(cmd) {
    switch (cmd.command) {
      case 'a':
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[5]), Number(cmd.previous.endPoint.y) + Number(cmd.args[6]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[5]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[6]) };
        break;
      case 'A':
        Geometry.applyCoordToBounds(bounds, cmd.args[5], cmd.args[6]);
        cmd.endPoint = { x: cmd.args[5], y: cmd.args[6] };
        break;
      case 'C':
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.args[1]);
        Geometry.applyCoordToBounds(bounds, cmd.args[2], cmd.args[3]);
        Geometry.applyCoordToBounds(bounds, cmd.args[4], cmd.args[5]);
        cmd.endPoint = { x: cmd.args[4], y: cmd.args[5] };
        break;
      case 'c':
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), Number(cmd.previous.endPoint.y) + Number(cmd.args[1]));
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[2]), Number(cmd.previous.endPoint.y) + Number(cmd.args[3]));
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[4]), Number(cmd.previous.endPoint.y) + Number(cmd.args[5]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[4]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[5]) };
        break;
      case 'H':
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.previous.endPoint.y);
        cmd.endPoint = { x: cmd.args[0], y: cmd.previous.endPoint.y };
        break;
      case 'h':
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), cmd.previous.endPoint.y);
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), y: cmd.previous.endPoint.y };
        break;
      case 'L':
      case 'M':
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.args[1]);
        cmd.endPoint = { x: cmd.args[0], y: cmd.args[1] };
        break;
      case 'l':
      case 'm':
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), Number(cmd.previous.endPoint.y) + Number(cmd.args[1]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[1]) };
        break;
      case 'Q':
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.args[1]);
        Geometry.applyCoordToBounds(bounds, cmd.args[2], cmd.args[3]);
        cmd.endPoint = { x: cmd.args[2], y: cmd.args[3] };
        break;
      case 'q':
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), Number(cmd.previous.endPoint.y) + Number(cmd.args[1]));
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[2]), Number(cmd.previous.endPoint.y) + Number(cmd.args[3]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[2]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[3]) };
        break;
      case 'S':
        var reflectPt = getSvgPathReflectedControlPoint(cmd.previous);
        Geometry.applyCoordToBounds(bounds, reflectPt.x, reflectPt.y);
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.args[1]);
        Geometry.applyCoordToBounds(bounds, cmd.args[2], cmd.args[3]);
        cmd.endPoint = { x: cmd.args[2], y: cmd.args[3] };
        break;
      case 's':
        var reflectPt = getSvgPathReflectedControlPoint(cmd.previous);
        Geometry.applyCoordToBounds(bounds, reflectPt.x, reflectPt.y);
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), Number(cmd.previous.endPoint.y) + Number(cmd.args[1]));
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[2]), Number(cmd.previous.endPoint.y) + Number(cmd.args[3]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[2]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[3]) };
        break;
      case 'T':
        var reflectPt = getSvgPathReflectedControlPoint(cmd.previous);
        Geometry.applyCoordToBounds(bounds, reflectPt.x, reflectPt.y);
        Geometry.applyCoordToBounds(bounds, cmd.args[0], cmd.args[1]);
        cmd.endPoint = { x: cmd.args[0], y: cmd.args[1] };
        break;
      case 't':
        var reflectPt = getSvgPathReflectedControlPoint(cmd.previous);
        Geometry.applyCoordToBounds(bounds, reflectPt.x, reflectPt.y);
        Geometry.applyCoordToBounds(bounds, Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), Number(cmd.previous.endPoint.y) + Number(cmd.args[1]));
        cmd.endPoint = { x: Number(cmd.previous.endPoint.x) + Number(cmd.args[0]), y: Number(cmd.previous.endPoint.y) + Number(cmd.args[1]) };
        break;
      case 'V':
        Geometry.applyCoordToBounds(bounds, cmd.previous.endPoint.x, cmd.args[0]);
        cmd.endPoint = { x: cmd.previous.endPoint.x, y: cmd.args[0] };
        break;
      case 'v':
        Geometry.applyCoordToBounds(bounds, cmd.previous.endPoint.x, Number(cmd.previous.endPoint.y) + Number(cmd.args[0]));
        cmd.endPoint = { x: cmd.previous.endPoint.x, y: Number(cmd.previous.endPoint.y) + Number(cmd.args[0]) };
        break;
      default:
        break;
    }
  });

  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;
  return bounds;
}

Svg.getSvgPathReflectedControlPoint = function(cmd) {
  var controlPoint;
  switch (cmd.command) {
    case 'C':
      controlPoint = { x: cmd.args[2], y: cmd.args[3] };
      break;
    case 'c':
      var startPt = { x: cmd.previous.endPoint.x - cmd.args[4], y: cmd.previous.endPoint.y - cmd.args[5] };
      controlPoint = { x: startPt.x + cmd.args[2], y: startPt.y + cmd.args[3] };
      break;
    case 'Q':
      controlPoint = { x: cmd.args[0], y: cmd.args[1] };
      break;
    case 'q':
      var startPt = { x: cmd.previous.endPoint.x - cmd.args[2], y: cmd.previous.endPoint.y - cmd.args[3] };
      controlPoint = { x: startPt.x + cmd.args[0], y: startPt.y + cmd.args[1] };
      break;
    case 'S':
      controlPoint = { x: cmd.args[0], y: cmd.args[1] };
      break;
    case 's':
      var startPt = { x: cmd.previous.endPoint.x - cmd.args[2], y: cmd.previous.endPoint.y - cmd.args[3] };
      controlPoint = { x: startPt.x + cmd.args[0], y: startPt.y + cmd.args[1] };
      break;
    case 'T':
    case 't':
      controlPoint = getSvgPathReflectedControlPoint(cmd.previous);
      break;
    default:
      controlPoint = cmd.previous.endPoint;
      break;
  }
  return {
    x: cmd.previous.endPoint.x + (cmd.previous.endPoint.x - controlPoint.x),
    y: cmd.previous.endPoint.y + (cmd.previous.endPoint.y - controlPoint.y)
  };
}

Svg.getSvgPathCommands = function(element) {
  var d = element.getAttribute('d');
  var pathR = /([achlmqsvz])([\d\s,\.\-]*)/gi;
  var argR = /\s*(\-?[\d\.]+),?/gi;

  var commands = [];
  while (match = pathR.exec(d)) {
    var command = match[1];
    var argString = match[2];
    var args = [];
    while (arg = argR.exec(argString)) {
      args.push(Number(arg[1]));
    }
    commands.push({
      command: command,
      args: args,
      previous: commands.length ? commands[commands.length - 1] : null
    });
  }
  return commands;
}

Svg.getDefsNode = function(svgElement) {
  return svgElement.getElementsByTagName("defs")[0];
}
