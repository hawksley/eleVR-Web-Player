/**
 * eleVR Web Player: A web player for 360 video on the Oculus
 * Copyright (C) 2014 Andrea Hawksley and Andrew Lutomirski
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

"use strict";

var container, canvas, video, playButton, muteButton, fullScreenButton,
    seekBar, videoSelect, projectionSelect;
    // volumeBar;

var gl, reqAnimFrameID = 0;

var positionsBuffer,
    verticesIndexBuffer,
    lastUpdateTime = 0;

var texture, textureTime;

var mvMatrix, shaderProgram, vertexPositionAttribute, directionAttribute;

var stereoRenderer, vrstate, vrloaded = false;

var manualRotateRate = new Float32Array([0, 0, 0]),  // Vector, camera-relative
    manualRotation = quat.create(),
    manualControls = {
      'a' : {index: 1, sign: 1, active: 0},
      'd' : {index: 1, sign: -1, active: 0},
      'w' : {index: 0, sign: 1, active: 0},
      's' : {index: 0, sign: -1, active: 0},
      'q' : {index: 2, sign: -1, active: 0},
      'e' : {index: 2, sign: 1, active: 0},
    },

    prevFrameTime = null,
    showTiming = false;  // Switch to true to show frame times in the console

var ProjectionEnum = Object.freeze({
                  EQUIRECT: 0,
                  EQUIRECT_3D: 1});
var projection = 0;

var videoObjectURL = null;

function runEleVRPlayer() {

  initElements();
  createControls();

  initWebGL(canvas);
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.disable(gl.DEPTH_TEST);

    stereoRenderer = new vr.StereoRenderer(gl, {
      alpha: false,
      depth: false,
      stencil: false
    });
    vrstate = new vr.State();

    vr.load(function(error) {
      if (error)
        console.log('vr.js failed to initialize: ', error);
      vrloaded = true;
    });

    enableKeyControls();

    initShaders();
    initBuffers();
    initTextures();

    video.addEventListener("canplaythrough", play, true);
    video.addEventListener("ended", ended, true);
    video.preload = "auto";
  }
}

/**
 * Lots of Init Methods
 */
function initElements() {
  container = document.getElementById("video-container");
  canvas = document.getElementById("glcanvas");
  video = document.getElementById("video");

  // Buttons
  playButton = document.getElementById("play-pause");
  muteButton = document.getElementById("mute");
  fullScreenButton = document.getElementById("full-screen");

  // Sliders
  seekBar = document.getElementById("seek-bar");
  // volumeBar = document.getElementById("volume-bar");

  // Selectors
  videoSelect = document.getElementById("video-select");
  projectionSelect = document.getElementById("projection-select");
}

function initWebGL(canvas) {
  gl = null;

  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  } catch(e) {}

  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}

function initBuffers() {
  positionsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
  var positions = [
    -1.0, -1.0,
     1.0, -1.0,
     1.0,  1.0,
    -1.0,  1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  verticesIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
  var vertexIndices = [
    0,  1,  2,      0,  2,  3,
  ]
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(vertexIndices), gl.STATIC_DRAW);
}

function initTextures() {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  textureTime = undefined;
}

function updateTexture() {
  if (textureTime !== video.currentTime) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
      gl.UNSIGNED_BYTE, video);
    gl.bindTexture(gl.TEXTURE_2D, null);
    textureTime = video.currentTime;
  }
}

/**
 * Drawing the scene
 */
function drawOneEye(eye) {
  gl.useProgram(shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

  gl.uniform1f(gl.getUniformLocation(shaderProgram, "eye"), eye.viewport[0]*2);
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "projection"), projection);

  var rotation = mat4.create();
  if (vrstate.hmd.present) {
    var totalRotation = quat.create();
    quat.multiply(totalRotation, manualRotation, vrstate.hmd.rotation);
    mat4.fromQuat(rotation, totalRotation);
  } else {
    mat4.fromQuat(rotation, manualRotation);
  }

  var projectionInvLocation = gl.getUniformLocation(shaderProgram, "proj_inv");

  var projectionInverse = mat4.create();
  mat4.invert(projectionInverse, eye.projectionMatrix)
  var inv = mat4.create();
  mat4.multiply(inv, rotation, projectionInverse);

  gl.uniformMatrix4fv(projectionInvLocation, false, inv);

  // Draw
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function drawScene(frameTime) {
  if (showTiming)
    var start = performance.now();

  updateTexture();
  if (!vrloaded)
    return;

  if (showTiming)
    var textureLoaded = performance.now();

  vr.pollState(vrstate);
  if (prevFrameTime) {
    // Apply manual controls.
    var interval = (frameTime - prevFrameTime) * 0.001;

    var update = quat.fromValues(manualRotateRate[0] * interval,
                                 manualRotateRate[1] * interval,
                                 manualRotateRate[2] * interval, 1.0);
    quat.normalize(update, update);
    quat.multiply(manualRotation, manualRotation, update);
  }

  stereoRenderer.render(vrstate, drawOneEye, this);

  if (showTiming) {
    gl.finish();
    var end = performance.now();
    console.log('Frame time: ' +
		(start - frameTime) + 'ms animation frame lag + ' +
                (textureLoaded - start) + 'ms to load texture + ' +
                (end - textureLoaded) + 'ms = ' + (end - frameTime) + 'ms');
  }

  reqAnimFrameID = requestAnimationFrame(drawScene);
  prevFrameTime = frameTime;
}

/**
 * Shader Related Functions
 */
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);

  if (!shaderScript) {
    return null;
  }

  var theSource = "";
  var currentChild = shaderScript.firstChild;

  while(currentChild) {
    if (currentChild.nodeType == 3) {
      theSource += currentChild.textContent;
    }

    currentChild = currentChild.nextSibling;
  }

  var shader;

  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }

  gl.shaderSource(shader, theSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

/**
 * Video Commands
 */
function play() {
  if (video.ended) {
    video.currentTime = 0.1;
  }
  video.play();
  playButton.className = "fa fa-pause icon"

  reqAnimFrameID = requestAnimationFrame(drawScene);
}

function pause() {
  video.pause();
  playButton.className = "fa fa-play icon";
}

function ended() {
  pause();
  if (reqAnimFrameID) {
    cancelAnimationFrame(reqAnimFrameID);
    reqAnimFrameID = 0;
  }
}

function mute() {
  video.muted = true;
  muteButton.className = "fa fa-volume-off icon";
}

function unmute() {
  video.muted = false;
  muteButton.className = "fa fa-volume-up icon";
}

function selectLocalVideo() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "video/*";

  input.addEventListener("change", function (event) {
    var files = input.files;
    if (!files.length) {
      // The user didn't select anything.  Sad.
      console.log('File selection canceled');
      return;
    }

    videoObjectURL = URL.createObjectURL(files[0]);
    console.log('Loading local file ', files[0].name,
		' at URL ', videoObjectURL);
    videoSelect.value = "";
    loadVideo(videoObjectURL);
  });

  input.click();
}

function loadVideo(videoFile) {
  pause();
  if (reqAnimFrameID) {
    cancelAnimationFrame(reqAnimFrameID);
    reqAnimFrameID = 0;
  }

  // Hack to fix rotation for vidcon video for vidcon
  if (videoFile == "Vidcon.webm") {
    manualRotation = [0.38175851106643677, -0.7102527618408203, -0.2401944249868393, 0.5404701232910156];
  } else {
    manualRotation = quat.create();
  }

  var oldObjURL = videoObjectURL;
  videoObjectURL = null;

  video.src = videoFile;

  if (videoObjectURL && videoObjectURL != videoFile)
    URL.removeObjectURL(oldObjURL);
}

function fullscreen() {
  if (video.requestFullscreen) {
    container.requestFullscreen();
  } else if (video.mozRequestFullScreen) {
    container.mozRequestFullScreen(); // Firefox
  } else if (video.webkitRequestFullscreen) {
    container.webkitRequestFullscreen(); // Chrome and Safari
  }
}

/**
 * Video Controls
 */
function createControls() {
  playButton.addEventListener("click", function() {
    if (video.paused == true) {
      play();
    } else {
      pause();
    }
  });

  muteButton.addEventListener("click", function() {
    if (video.muted == false) {
      mute();
    } else {
      unmute();
    }
  });

  fullScreenButton.addEventListener("click", function() {
    fullscreen();
  });

  seekBar.addEventListener("change", function() {
    // Calculate the new time
    var time = video.duration * (seekBar.value / 100);
    video.currentTime = time;
  });

  video.addEventListener("timeupdate", function() {
    // don't update if paused,
    // we get last time update after seekBar mousedown pauses
    if (!video.paused) {
      // Calculate the slider value
      var value = (100 / video.duration) * video.currentTime;
      seekBar.value = value;
    }
  });

  // Pause the video when the slider handle is being dragged
  var tempPause = false;
  seekBar.addEventListener("mousedown", function() {
    if (!video.paused) {
      video.pause();
      tempPause = true;
    }
  });

  seekBar.addEventListener("mouseup", function() {
    if (tempPause) {
      video.play();
    }
  });

  videoSelect.addEventListener("change", function() {
    projection = videoSelect.value[0];
    projectionSelect.value = projection;
    loadVideo(videoSelect.value.substring(1));
  });


  projectionSelect.addEventListener("change", function() {
    projection = projectionSelect.value;
  });

  document.getElementById("select-local-file").addEventListener("click", function(event) {
    event.preventDefault();
    selectLocalVideo();
  });
}

/**
 * Keyboard Controls
 */
function enableKeyControls() {
  function key(event, sign) {
    var control = manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
    if (!control)
      return;
    if (sign == 1 && control.active || sign == -1 && !control.active)
      return;
    control.active = (sign == 1);
    manualRotateRate[control.index] += sign * control.sign;
  }

  document.addEventListener('keydown', function(event) { key(event, 1); },
          false);
  document.addEventListener('keyup', function(event) { key(event, -1); },
          false);
}
