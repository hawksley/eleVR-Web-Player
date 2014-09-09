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
    },

    mat4PerspectiveFromVRFieldOfView: function(fov, zNear, zFar) {
      var upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
      var downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
      var leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
      var rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);

      var xScale = 2.0 / (leftTan + rightTan);
      var yScale = 2.0 / (upTan + downTan);

      var out = new Float32Array(16); // Appropriate format to pass to WebGL
      out[0] = xScale;
      out[4] = 0.0;
      out[8] = -((leftTan - rightTan) * xScale * 0.5);
      out[12] = 0.0;

      out[1] = 0.0;
      out[5] = yScale;
      out[9] = ((upTan - downTan) * yScale * 0.5);
      out[13] = 0.0;

      out[2] = 0.0;
      out[6] = 0.0;
      out[10] = zFar / (zNear - zFar);
      out[14] = (zFar * zNear) / (zNear - zFar);

      out[3] = 0.0;
      out[7] = 0.0;
      out[11] = -1.0;
      out[15] = 0.0;

      return out;
    },

    isFullscreen: function() {
     return document.fullscreenElement
          || document.webkitFullscreenElement
          || document.mozFullScreenElement
          || document.webkitCurrentFullScreenElement;
    }
  };

  global.util = util;

})(window);
