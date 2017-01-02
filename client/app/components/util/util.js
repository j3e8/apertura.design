app.factory("Util", function() {
  return {
    createGuid: function(length) {
      var validChars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
      var str = '';
      for (var i=0; i < length; i++) {
        var idx = Math.floor(Math.random() * validChars.length);
        str += validChars[idx];
      }
      return str;
    }
  }
})
