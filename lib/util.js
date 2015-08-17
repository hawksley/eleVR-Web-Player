/* global canvas, vrHMD, webGL */

(function(global) {
  'use strict';

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
     return document.fullscreenElement ||
            document.webkitFullscreenElement||
            document.mozFullScreenElement ||
            document.webkitCurrentFullScreenElement;
    },

    setCanvasSize: function() {
      var screenWidth, screenHeight;
      screenWidth = window.innerWidth;
      screenHeight = window.innerHeight;

      if (typeof vrHMD !== 'undefined' && typeof util.isFullscreen() !== 'undefined' && util.isFullscreen()) {
        var rectHalf = vrHMD.getEyeParameters('right').renderRect;
        canvas.width = rectHalf.width * 2;
        canvas.height = rectHalf.height;

        canvas.style.width = screenWidth + 'px';
        canvas.style.height = screenHeight + 'px';
      } else {
        // query the various pixel ratios
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = webGL.gl.webkitBackingStorePixelRatio ||
                                webGL.gl.mozBackingStorePixelRatio ||
                                webGL.gl.msBackingStorePixelRatio ||
                                webGL.gl.oBackingStorePixelRatio ||
                                webGL.gl.backingStorePixelRatio || 1;
        var ratio = devicePixelRatio / backingStoreRatio;

        if (canvas.width != screenWidth * ratio || canvas.height != screenHeight * ratio) {
            canvas.width = screenWidth * ratio;
            canvas.height = screenHeight * ratio;

            canvas.style.width = screenWidth + 'px';
            canvas.style.height = screenHeight + 'px';
        }
      }
    },

    getExtension: function(path) {
      return path.substr(path.lastIndexOf('.') + 1);
    },

    getBaseFilename: function(path) {
      return path.substr(path.lastIndexOf('/') + 1);
    },

    hasVideoExtension: function(url) {
      var ext = util.getExtension(url);
      return ext === 'mp4' || ext === 'ogg' || ext === 'webm';
    },

    getVideoTitle: function(url) {
      return util.hasVideoExtension(url) ? util.getBaseFilename(url) : url;
    },

    getCustomProjection: function(projection) {
      switch (projection.toLowerCase()) {
        case 'mono':
        case '2d':
        case '0':
        case 'equirectangular':
          return 0;
        // Otherwise, it could be 'stereo', '3d', '1', 'equirectangular 3d', etc.
        default:
          return 1;
      }
    },

    getURLSearchParams: function(qs) {
      // Ideally, we'd use `URLSearchParams` but only Firefox supports it today.

      if (typeof qs !== 'string') {
        return {};
      }

      qs = qs.trim().replace(/^(\?|#)/, '');

      if (!qs) {
        return {};
      }

      return qs.trim().split('&').reduce(function(ret, param) {
        var parts = param.replace(/\+/g, ' ').split('=');
        var key = parts[0];
        var val = parts[1];

        key = decodeURIComponent(key);
        // missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        val = val === undefined ? null : decodeURIComponent(val);

        if (!ret.hasOwnProperty(key)) {
          ret[key] = val;
        } else if (Array.isArray(ret[key])) {
          ret[key].push(val);
        } else {
          ret[key] = [ret[key], val];
        }

        return ret;
      }, {});
    },

    getJSONSearchParams: function(qs) {
      if (typeof qs === 'object') {
        return qs;
      }

      qs = decodeURIComponent(qs).trim().replace(/^(\?|#)/, '');

      try {
        return JSON.parse(qs);
      } catch (e) {
        return null;
      }
    },

    getTruthyURLSearchParams: function(qs, defaults) {
      if (!defaults) {
        defaults = {};
      }

      var params = util.getJSONSearchParams(qs);

      if (!params) {
        params = util.getURLSearchParams(qs);
      }

      var ret = {};
      var val;

      Object.keys(defaults).forEach(function(key) {
        ret[key] = defaults[key];
      });

      Object.keys(params).forEach(function(key) {
        if (typeof defaults[key] === 'string') {
          // If the expected type of the default is a string,
          // then leave the user input as is.
          ret[key] = params[key];
          return;
        }

        if (typeof defaults[key] === 'number') {
          // If the expected type of the default is a number,
          // then turn the user input into a number.
          ret[key] = parseFloat(params[key]);
          return;
        }

        if (params[key] === null) {
          // 'null' means it exists in the params but there's no value.
          ret[key] = true;
          return;
        }

        val = String(params[key]).toLowerCase();
        switch (val) {
          case '0':
          case 'false':
          case 'no':
          case 'off':
          case 'undefined':
          case 'null':
            ret[key] = false;
            break;
          case '1':
          case 'true':
          case 'yes':
          case 'on':
            ret[key] = true;
            break;
          default:
            ret[key] = params[key];
            break;
        }
      });

      return ret;
    }
  };

  global.util = util;

})(window);
