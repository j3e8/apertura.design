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

if (Array.prototype.filter === undefined) {
	Array.prototype.filter = function(fn) {
		var arr = [];
		for (var i=0; i < this.length; i++) {
			if (fn(this[i])) {
				arr.push(this[i]);
			}
		}
		return arr;
	}
}
