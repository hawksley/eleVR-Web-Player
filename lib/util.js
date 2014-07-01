(function(global) {
  var util = {
    getScreenOrientation: function() {
      switch (window.screen.orientation || window.screen.mozOrientation) {
        case 'landscape-primary':
          return 90;
        case 'landscape-secondary':
          return -90;
        case 'portrait-secondary':
          return 180;
        case 'portrait-primary':
          return 0;
      }
      if (window.orientation !== undefined)
        return window.orientation;
    }
  };

  global.util = util;

})(window);
