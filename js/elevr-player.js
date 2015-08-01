/**
 * eleVR Web Player: A web player for 360 video on the Oculus
 * Copyright (C) 2014 Andrea Hawksley and Andrew Lutomirski
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Mozilla Public License; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

"use strict";

var currentScreenOrientation = window.orientation || 0; // active default

var lastUpdateTime = 0;

var mvMatrix, shader;

var timing = {showTiming: false, // Switch to true to show frame times in the console
              frameTime: 0,
              prevFrameTime: 0,
              canvasResized: 0,
              textureLoaded: 0,
              textureTime: 0,
              start: 0,
              end: 0,
              framesSinceIssue: 0
              };

var container, playButton, muteButton, loopButton, fullScreenButton,
    seekBar, videoSelect, projectionSelect, canvas, video,
    leftLoad, rightLoad, leftPlay, rightPlay, playL, playR;
var videoObjectURL = null;

function initElements() {
  container = document.getElementById("video-container");
  container.style.width = window.innerWidth + "px";
  container.style.height = window.innerHeight + "px";
  leftLoad = document.getElementById("left-load");
  rightLoad = document.getElementById("right-load");
  leftPlay = document.getElementById("left-play");
  rightPlay = document.getElementById("right-play");
  canvas = document.getElementById("glcanvas");
  video = document.getElementById("video");

  // Buttons
  playButton = document.getElementById("play-pause");
  playL = document.getElementById("play-l");
  playR = document.getElementById("play-r");
  muteButton = document.getElementById("mute");
  loopButton = document.getElementById("loop");
  fullScreenButton = document.getElementById("full-screen");

  // Sliders
  seekBar = document.getElementById("seek-bar");

  // Selectors
  videoSelect = document.getElementById("video-select");
  projectionSelect = document.getElementById("projection-select");

  document.getElementById('title-l').style.fontSize = window.outerHeight / 20 + 'px';
  document.getElementById('title-r').style.fontSize = window.outerHeight / 20 + 'px';
  document.getElementById('message-l').style.fontSize = window.outerHeight / 30 + 'px';
  document.getElementById('message-r').style.fontSize = window.outerHeight / 30 + 'px';
}

function runEleVRPlayer() {
  webVR.initWebVR();

  initElements();
  controls.create();

  webGL.initWebGL();

  if (webGL.gl) {
    webGL.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    webGL.gl.clearDepth(1.0);
    webGL.gl.disable(webGL.gl.DEPTH_TEST);

    util.setCanvasSize();

    // Keyboard Controls
    controls.enableKeyControls();

    shader = new webGL.Shader({
      fragmentShaderName: 'shader-fs',
      vertexShaderName: 'shader-vs',
      attributes: ['aVertexPosition'],
      uniforms: ['uSampler', 'eye', 'projection', 'proj_inv'],
    });

    webGL.initBuffers();
    webGL.initTextures();

    video.addEventListener("canplaythrough", controls.loaded);
    video.addEventListener("ended", controls.ended);
  }
}
