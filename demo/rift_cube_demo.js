"use strict";

(function(global) {


var tmpVec3 = vec3.create();
var tmpMat4 = mat4.create();



/**
 * Simple camera.
 * @constructor
 */
var Camera = function() {
  /**
   * Movement speed, in m/s.
   * @type {number}
   */
  this.moveSpeed = 3;

  /**
   * Current eye position.
   * @type {!vec3}
   */
  this.eyePosition = vec3.fromValues(0, 0, 0);

  /**
   * Yaw.
   * @type {number}
   */
  this.eyeYaw = 0;

  /**
   * Pitch.
   * @type {number}
   */
  this.eyePitch = 0;

  /**
   * Roll.
   * @type {number}
   */
  this.eyeRoll = 0;

  /**
   * Previous yaw reading to support delta.
   * @type {number}
   * @private
   */
  this.lastSensorYaw_ = 0;

  /**
   * View matrix.
   * @type {!mat4}
   */
  this.viewMatrix = mat4.create();
};


/**
 * Updates the camera based on the current state.
 * @param {number} time Current time.
 * @param {number} timeDelta time since last frame.
 * @param {!vr.State} vrstate Current vr state.
 */
Camera.prototype.update = function(time, timeDelta, vrstate) {
  // Read sensor data, if present.
  var rollPitchYaw = mat4.create();
  if (vrstate.hmd.present) {
    // TODO(benvanik): real work
    mat4.fromQuat(rollPitchYaw, vrstate.hmd.rotation);
  } else {
    mat4.identity(rollPitchYaw);
  }

  // Simple head modeling from tiny world demo.
  var HEAD_BASE_TO_EYE_HEIGHT = 0.15;
  var HEAD_BASE_TO_EYE_PROTRUSION = 0.09;
  var EYE_CENTER_IN_HEAD_FRAME =
      vec3.fromValues(0, HEAD_BASE_TO_EYE_HEIGHT, -HEAD_BASE_TO_EYE_PROTRUSION);
  vec3.transformMat4(tmpVec3, EYE_CENTER_IN_HEAD_FRAME, rollPitchYaw);
  var shiftedEyePosition = vec3.create();
  vec3.add(shiftedEyePosition, this.eyePosition, tmpVec3);
  shiftedEyePosition[1] -= EYE_CENTER_IN_HEAD_FRAME[1];

  var UP = vec3.fromValues(0, 1, 0);
  var FORWARD = vec3.fromValues(0, 0, -1);

  var up = vec3.create();
  var forward = vec3.create();
  vec3.transformMat4(up, UP, rollPitchYaw);
  vec3.transformMat4(forward, FORWARD, rollPitchYaw);
  var targetPosition = vec3.create();
  vec3.add(targetPosition, shiftedEyePosition, forward);
  mat4.lookAt(this.viewMatrix, shiftedEyePosition, targetPosition, up);
};



/**
 * Demo app.
 * @param {!Element} statusEl Element that will get status text.
 * @param {!HTMLCanvasElement} canvas Target render canvas.
 * @constructor
 */
var Demo = function(statusEl, canvas) {
  /**
   * Element that will get status text.
   * @type {!Element}
   * @private
   */
  this.statusEl_ = statusEl;

  /**
   * Target canvas.
   * @type {!HTMLCanvasElement}
   * @private
   */
  this.canvas_ = canvas;

  /**
   * WebGL context.
   * @type {!WebGLRenderingContext}
   * @private
   */
  this.gl_ = this.createWebGL_(canvas);
  var gl = this.gl_;

  /**
   * Camera.
   * @type {!Camera}
   * @private
   */
  this.camera_ = new Camera();

  /**
   * Stereo renderer.
   * @type {!vr.StereoRenderer}
   * @private
   */
  this.stereoRenderer_ = new vr.StereoRenderer(this.gl_, {
    alpha: false,
    depth: true,
    stencil: false
  });

  /**
   * VR state.
   * @type {!vr.State}
   * @private
   */
  this.vrstate_ = new vr.State();

  /**
   * Time of the previous tick.
   * Used to calculate frame deltas for animation.
   * @type {number}
   * @private
   */
  this.lastTick_ = 0;

  /**
   * Simple shader program used to draw a cube.
   * @type {!vr.Program}
   * @private
   */
  this.cubeProgram_ = new vr.Program(gl, 'CubeProgram',
      [
        'attribute vec3 a_xyz;',
        'attribute vec2 a_uv;',
        'varying vec2 v_uv;',
        'uniform mat4 u_projectionMatrix;',
        'uniform mat4 u_modelViewMatrix;',
        'void main() {',
        '  gl_Position = u_projectionMatrix * u_modelViewMatrix * ',
        '      vec4(a_xyz, 1.0);',
        '  v_uv = a_uv;',
        '}'
      ].join('\n'),
      [
        'precision highp float;',
        'varying vec2 v_uv;',
        'void main() {',
        '  gl_FragColor = vec4(v_uv, 0.0, 1.0);',
        '}'
      ].join('\n'),
      ['a_xyz', 'a_uv'],
      ['u_projectionMatrix', 'u_modelViewMatrix']);
  this.cubeProgram_.beginLinking();
  this.cubeProgram_.endLinking();
  this.cubeBuffer_ = gl.createBuffer();
  this.cubeBuffer_.displayName = 'CubeVertexBuffer';
  gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer_);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,  1.0, 0.0, 0.0, // Front face
     1.0, -1.0,  1.0, 1.0, 0.0,
     1.0,  1.0,  1.0, 1.0, 1.0,
    -1.0,  1.0,  1.0, 0.0, 1.0,
    -1.0, -1.0, -1.0, 1.0, 0.0, // Back face
    -1.0,  1.0, -1.0, 1.0, 1.0,
     1.0,  1.0, -1.0, 0.0, 1.0,
     1.0, -1.0, -1.0, 0.0, 0.0,
    -1.0,  1.0, -1.0, 0.0, 1.0, // Top face
    -1.0,  1.0,  1.0, 0.0, 0.0,
     1.0,  1.0,  1.0, 1.0, 0.0,
     1.0,  1.0, -1.0, 1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0, 1.0, // Bottom face
     1.0, -1.0, -1.0, 0.0, 1.0,
     1.0, -1.0,  1.0, 0.0, 0.0,
    -1.0, -1.0,  1.0, 1.0, 0.0,
     1.0, -1.0, -1.0, 1.0, 0.0, // Right face
     1.0,  1.0, -1.0, 1.0, 1.0,
     1.0,  1.0,  1.0, 0.0, 1.0,
     1.0, -1.0,  1.0, 0.0, 0.0,
    -1.0, -1.0, -1.0, 0.0, 0.0, // Left face
    -1.0, -1.0,  1.0, 1.0, 0.0,
    -1.0,  1.0,  1.0, 1.0, 1.0,
    -1.0,  1.0, -1.0, 0.0, 1.0,
  ]), gl.STATIC_DRAW);
  this.cubeIndexBuffer_ = gl.createBuffer();
  this.cubeIndexBuffer_.displayName = 'CubeIndexBuffer';
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer_);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
    0, 1, 2,      0, 2, 3,    // Front face
    4, 5, 6,      4, 6, 7,    // Back face
    8, 9, 10,     8, 10, 11,  // Top face
    12, 13, 14,   12, 14, 15, // Bottom face
    16, 17, 18,   16, 18, 19, // Right face
    20, 21, 22,   20, 22, 23  // Left face
  ]), gl.STATIC_DRAW);

  // Common key handlers.
  var self = this;
  document.addEventListener('keydown', function(e) {
    if (self.keyPressed_(e)) {
      e.preventDefault();
    }
  }, false);

  // Kickoff the demo.
  this.tick_();
};


/**
 * Attempts to create a new WebGL context.
 * An error will be thrown if the context cannot be created.
 * @param {!HTMLCanvasElement} canvas Target canvas.
 * @return {!WebGLRenderingContext} New context.
 * @private
 */
Demo.prototype.createWebGL_ = function(canvas) {
  if (!global.WebGLRenderingContext) {
    throw 'WebGL not supported by this browser.';
  }

  var attributes = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false, // need to use custom antialiasing
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  };

  var names = ['webgl', 'experimental-webgl'];
  var gl = null;
  for (var n = 0; n < names.length; n++) {
    gl = canvas.getContext(names[n], attributes);
    if (gl) {
      break;
    }
  }
  if (!gl) {
    throw 'Unable to get a WebGL context.';
  }

  // TODO(benvanik): extra setup? context loss? etc?

  return gl;
};


/**
 * Updates the status message.
 * @param {string?} value New value, if any.
 */
Demo.prototype.setStatus = function(value) {
  this.statusEl_.innerHTML = value || '';
};


/**
 * Handles key press events.
 * @param {!Event} e Browser event.
 * @return {boolean} Whether the key press was handled.
 * @private
 */
Demo.prototype.keyPressed_ = function(e) {
  switch (e.keyCode) {
    case 32: // space
      // Reset sensors to their default state.
      vr.resetHmdOrientation();
      return true;

    case 70: // f
      // Toggle fullscreen mode.
      if (!vr.isFullScreen()) {
        vr.enterFullScreen();
      } else {
        vr.exitFullScreen();
      }
      return true;

    case 78: // n
      var ipd = this.stereoRenderer_.getInterpupillaryDistance();
      ipd -= 0.001;
      this.stereoRenderer_.setInterpupillaryDistance(ipd);
      this.setStatus('ipd: ' + ipd);
      break;
    case 77: // m
      var ipd = this.stereoRenderer_.getInterpupillaryDistance();
      ipd += 0.001;
      this.stereoRenderer_.setInterpupillaryDistance(ipd);
      this.setStatus('ipd: ' + ipd);
      break;

    case 80: // p
      var mode = this.stereoRenderer_.getPostProcessingMode();
      switch (mode) {
        case vr.PostProcessingMode.STRAIGHT:
          mode = vr.PostProcessingMode.WARP;
          break;
        case vr.PostProcessingMode.WARP:
          mode = vr.PostProcessingMode.WARP_CHROMEAB;
          break;
        case vr.PostProcessingMode.WARP_CHROMEAB:
          mode = vr.PostProcessingMode.STRAIGHT;
          break;
      }
      this.stereoRenderer_.setPostProcessingMode(mode);
      break;
  }
  return false;
};


/**
 * Processes a single frame.
 * @private
 */
Demo.prototype.tick_ = function() {
  // Schedule the next frame.
  vr.requestAnimationFrame(this.tick_, this);

  // Poll VR, if it's ready.
  vr.pollState(this.vrstate_);

  // TODO(benvanik): now(), if possible.
  var time = Date.now();
  var timeDelta = this.lastTick_ ? time - this.lastTick_ : 0;
  this.lastTick_ = time;

  // Update scene animation/etc.
  // This should all happen once, where {@see #renderScene_} may be called
  // multiple times.
  this.updateScene_(time, timeDelta);

  // Update the stereo renderer.
  this.stereoRenderer_.render(this.vrstate_, this.renderScene_, this);
};


/**
 * Updates the scene.
 * This will only be called once per frame.
 * @param {number} time Current time.
 * @param {number} timeDelta time since last frame.
 * @private
 */
Demo.prototype.updateScene_ = function(time, timeDelta) {
  // Update camera.
  // TODO(benvanik): plumb keyboard input down.
  this.camera_.update(time, timeDelta, this.vrstate_);

  // TODO(benvanik): animate scene.
};


/**
 * Renders the entire scene.
 * This may be called multiple times per frame.
 * @param {!StereoEye} eye Eye being rendered.
 * @param {number} width Render target width.
 * @param {number} height Render target height.
 * @private
 */
Demo.prototype.renderScene_ = function(eye, width, height) {
  var gl = this.gl_;

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  this.cubeProgram_.use();

  var modelViewMatrix = mat4.create();
  mat4.identity(modelViewMatrix);
  vec3.set(tmpVec3, 5, 5, 5);
  mat4.scale(modelViewMatrix, modelViewMatrix, tmpVec3);
  mat4.multiply(modelViewMatrix, modelViewMatrix, this.camera_.viewMatrix);
  mat4.multiply(modelViewMatrix, eye.viewAdjustMatrix, modelViewMatrix);

  gl.uniformMatrix4fv(this.cubeProgram_.uniforms['u_projectionMatrix'], false,
      eye.projectionMatrix);
  gl.uniformMatrix4fv(this.cubeProgram_.uniforms['u_modelViewMatrix'], false,
      modelViewMatrix);

  var a_xyz = this.cubeProgram_.attributes['a_xyz'];
  var a_uv = this.cubeProgram_.attributes['a_uv'];
  gl.enableVertexAttribArray(a_xyz);
  gl.enableVertexAttribArray(a_uv);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer_);
  gl.vertexAttribPointer(a_xyz, 3, gl.FLOAT, false, (3 + 2) * 4, 0);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, (3 + 2) * 4, 3 * 4);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer_);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
};


/**
 * Launches the demo.
 * @param {!Element} statusEl Element that will get status text.
 * @param {!HTMLCanvasElement} canvas Target render canvas.
 */
global.launchDemo = function(statusEl, canvas) {
  function startDemo() {
    new Demo(statusEl, canvas);
  };

  if (!vr.isInstalled()) {
    statusEl.innerText = 'NPVR plugin not installed!';
    startDemo();
    return;
  }

  vr.load(function(error) {
    if (error) {
      statusEl.innerText = 'Plugin load failed: ' + error.toString();
    }

    try {
      startDemo();
    } catch (e) {
      statusEl.innerText = e.toString();
      console.log(e);
    }
  });
};

})(window);

