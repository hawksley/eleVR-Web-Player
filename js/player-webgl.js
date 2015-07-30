var positionsBuffer, verticesIndexBuffer, texture;
var vrHMD, vrSensor;

/*jshint -W069 */

(function(global) {
  'use strict';

  var webGL = {
    gl: null,

    initWebGL: function() {
      webGL.gl = null;

      try {
        webGL.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      } catch(e) {}

      if (!webGL.gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
      }
    },

    getPhoneVR: function() {
      if (!webGL.phoneVR) {
        // Create once and make it a property on the object for easy lookup later.
        webGL.phoneVR = new PhoneVR();
      }

      return webGL.phoneVR;
    },

    initBuffers: function() {
      positionsBuffer = webGL.gl.createBuffer();
      webGL.gl.bindBuffer(webGL.gl.ARRAY_BUFFER, positionsBuffer);
      var positions = [
        -1.0, -1.0,
         1.0, -1.0,
         1.0,  1.0,
        -1.0,  1.0,
      ];
      webGL.gl.bufferData(webGL.gl.ARRAY_BUFFER, new Float32Array(positions), webGL.gl.STATIC_DRAW);

      verticesIndexBuffer = webGL.gl.createBuffer();
      webGL.gl.bindBuffer(webGL.gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
      var vertexIndices = [
        0,  1,  2,      0,  2,  3,
      ];
      webGL.gl.bufferData(webGL.gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(vertexIndices), webGL.gl.STATIC_DRAW);
    },

    initTextures: function() {
      texture = webGL.gl.createTexture();
      webGL.gl.bindTexture(webGL.gl.TEXTURE_2D, texture);
      webGL.gl.texParameteri(webGL.gl.TEXTURE_2D, webGL.gl.TEXTURE_MAG_FILTER, webGL.gl.LINEAR);
      webGL.gl.texParameteri(webGL.gl.TEXTURE_2D, webGL.gl.TEXTURE_MIN_FILTER, webGL.gl.LINEAR);
      webGL.gl.texParameteri(webGL.gl.TEXTURE_2D, webGL.gl.TEXTURE_WRAP_S, webGL.gl.CLAMP_TO_EDGE);
      webGL.gl.texParameteri(webGL.gl.TEXTURE_2D, webGL.gl.TEXTURE_WRAP_T, webGL.gl.CLAMP_TO_EDGE);
      webGL.gl.bindTexture(webGL.gl.TEXTURE_2D, null);
      timing.textureTime = undefined;
    },

    updateTexture: function() {
        webGL.gl.bindTexture(webGL.gl.TEXTURE_2D, texture);
        webGL.gl.pixelStorei(webGL.gl.UNPACK_FLIP_Y_WEBGL, true);
        webGL.gl.texImage2D(webGL.gl.TEXTURE_2D, 0, webGL.gl.RGB, webGL.gl.RGB,
          webGL.gl.UNSIGNED_BYTE, video);
        webGL.gl.bindTexture(webGL.gl.TEXTURE_2D, null);
        timing.textureTime = video.currentTime;
    },

    /**
     * Shader Related Functions
     **/
    Shader: function(params) {
      this.params = params;
      this.fragmentShader = webGL.getShaderByName(this.params.fragmentShaderName);
      this.vertexShader = webGL.getShaderByName(this.params.vertexShaderName);

      this.program = webGL.gl.createProgram();
      webGL.gl.attachShader(this.program, this.vertexShader);
      webGL.gl.attachShader(this.program, this.fragmentShader);
      webGL.gl.linkProgram(this.program);

      if (!webGL.gl.getProgramParameter(this.program, webGL.gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program: " + webGL.gl.getProgramInfoLog(this.program));
      }

      webGL.gl.useProgram(this.program);

      this.attributes = {};
      for (var i = 0; i < this.params.attributes.length; i++) {
        var attributeName = this.params.attributes[i];
        this.attributes[attributeName] = webGL.gl.getAttribLocation(this.program, attributeName);
        webGL.gl.enableVertexAttribArray(this.attributes[attributeName]);
      }

      this.uniforms = {};
      for (i = 0; i < this.params.uniforms.length; i++) {
        var uniformName = this.params.uniforms[i];
        this.uniforms[uniformName] = webGL.gl.getUniformLocation(this.program, uniformName);
        webGL.gl.enableVertexAttribArray(this.attributes[uniformName]);
      }
    },

    getShaderByName: function(id) {
      var shaderScript = document.getElementById(id);

      if (!shaderScript) {
        return null;
      }

      var theSource = "";
      var currentChild = shaderScript.firstChild;

      while(currentChild) {
        if (currentChild.nodeType === 3) {
          theSource += currentChild.textContent;
        }

        currentChild = currentChild.nextSibling;
      }

      var result;

      if (shaderScript.type === "x-shader/x-fragment") {
        result = webGL.gl.createShader(webGL.gl.FRAGMENT_SHADER);
      } else if (shaderScript.type === "x-shader/x-vertex") {
        result = webGL.gl.createShader(webGL.gl.VERTEX_SHADER);
      } else {
        return null;  // Unknown shader type
      }

      webGL.gl.shaderSource(result, theSource);
      webGL.gl.compileShader(result);

      if (!webGL.gl.getShaderParameter(result, webGL.gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + webGL.gl.getShaderInfoLog(result));
        return null;
      }

      return result;
    },

    /**
     * Drawing the scene
     */
     drawOneEye: function(eye, projectionMatrix) {
      webGL.gl.useProgram(shader.program);

      webGL.gl.bindBuffer(webGL.gl.ARRAY_BUFFER, positionsBuffer);
      webGL.gl.vertexAttribPointer(shader.attributes['aVertexPosition'], 2, webGL.gl.FLOAT, false, 0, 0);

      // Specify the texture to map onto the faces.
      webGL.gl.activeTexture(webGL.gl.TEXTURE0);
      webGL.gl.bindTexture(webGL.gl.TEXTURE_2D, texture);
      webGL.gl.uniform1i(shader.uniforms['uSampler'], 0);

      webGL.gl.uniform1f(shader.uniforms['eye'], eye);
      webGL.gl.uniform1f(shader.uniforms['projection'], projection);

      var rotation = mat4.create();
      var totalRotation = quat.create();

      if(typeof vrSensor !== 'undefined') {
        var state = vrSensor.getState();
        if (state !== null && state.orientation !== null && typeof state.orientation !== 'undefined' &&
                  state.orientation.x !== 0 &&
                  state.orientation.y !== 0 &&
                  state.orientation.z !== 0 &&
                  state.orientation.w !== 0) {
          var sensorOrientation = new Float32Array([state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w]);
          quat.multiply(totalRotation, manualRotation, sensorOrientation);
        } else {
          totalRotation = manualRotation;
        }
        mat4.fromQuat(rotation, totalRotation);
      } else {
        quat.multiply(totalRotation, manualRotation, webGL.getPhoneVR().rotationQuat());
        mat4.fromQuat(rotation, totalRotation);
      }

      var projectionInverse = mat4.create();
      mat4.invert(projectionInverse, projectionMatrix);
      var inv = mat4.create();
      mat4.multiply(inv, rotation, projectionInverse);

      webGL.gl.uniformMatrix4fv(shader.uniforms['proj_inv'], false, inv);

      if (eye === 0) { // left eye
        webGL.gl.viewport(0, 0, canvas.width/2, canvas.height);
      } else { // right eye
        webGL.gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
      }

      // Draw
      webGL.gl.bindBuffer(webGL.gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
      webGL.gl.drawElements(webGL.gl.TRIANGLES, 6, webGL.gl.UNSIGNED_SHORT, 0);
    },

    drawScene: function(frameTime) {
      timing.frameTime = frameTime;
      if (timing.showTiming) {
        timing.start = performance.now();
      }

      util.setCanvasSize();

      if (timing.showTiming) {
        timing.canvasResized = performance.now();
      }

      webGL.updateTexture();

      if (timing.showTiming) {
        timing.textureLoaded = performance.now();
      }

      if (timing.prevFrameTime) {
        // Apply manual controls.
        var interval = (timing.frameTime - timing.prevFrameTime) * 0.001;

        var update = quat.fromValues(controls.manualRotateRate[0] * interval,
                                     controls.manualRotateRate[1] * interval,
                                     controls.manualRotateRate[2] * interval, 1.0);
        quat.normalize(update, update);
        quat.multiply(manualRotation, manualRotation, update);
      }

      var perspectiveMatrix = mat4.create();
      if (typeof vrHMD !== 'undefined') {
        var leftParams = vrHMD.getEyeParameters('left');
        var rightParams = vrHMD.getEyeParameters('right');
        perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(leftParams.recommendedFieldOfView, 0.1, 10);
        webGL.drawOneEye(0, perspectiveMatrix);
        perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(rightParams.recommendedFieldOfView, 0.1, 10);
        webGL.drawOneEye(1, perspectiveMatrix);
      } else {
        var ratio = (canvas.width/2)/canvas.height;
        mat4.perspective(perspectiveMatrix, Math.PI/2, ratio, 0.1, 10);
        webGL.drawOneEye(0, perspectiveMatrix);
        webGL.drawOneEye(1, perspectiveMatrix);
      }


      if (timing.showTiming) {
        webGL.gl.finish();
        timing.end = performance.now();
        if (timing.end - timing.frameTime > 20) {
          console.log(timing.framesSinceIssue + ' Frame time: ' +
                      (timing.start - timing.frameTime) + 'ms animation frame lag + ' +
                      (timing.canvasResized - timing.start) + 'ms canvas resized + ' +
                      (timing.textureLoaded - timing.canvasResized) + 'ms to load texture + ' +
                      (timing.end - timing.textureLoaded) + 'ms = ' + (timing.end - timing.frameTime) + 'ms');
          timing.framesSinceIssue = 0;
        } else {
          timing.framesSinceIssue++;
        }
      }

      reqAnimFrameID = requestAnimationFrame(webGL.drawScene);
      timing.prevFrameTime = timing.frameTime;
    }
  };

global.webGL = webGL;

})(window);
