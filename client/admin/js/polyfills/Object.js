if (Object.assign === undefined) {
	Object.assign = function(dest) {
		for (var i=1; i < arguments.length; i++) {
			var src = arguments[i];
			for (var prop in src) {
				dest[prop] = src[prop];
			}
		}
		return dest;
	}
}
