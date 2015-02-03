var reqAnimFrameID = 0;
var projection = 0;
var manualRotation = quat.create(),
    degtorad = Math.PI / 180, // Degree-to-Radian conversion
    framesSinceIssue = 0;

(function(global) {
  'use strict';

  var controls = {
    manualControls: {
      'a' : {index: 1, sign: 1, active: 0},
      'd' : {index: 1, sign: -1, active: 0},
      'w' : {index: 0, sign: 1, active: 0},
      's' : {index: 0, sign: -1, active: 0},
      'q' : {index: 2, sign: -1, active: 0},
      'e' : {index: 2, sign: 1, active: 0},
    },

    manualRotateRate: new Float32Array([0, 0, 0]),  // Vector, camera-relative

    create: function() {
      playButton.addEventListener("click", function() {
        controls.playPause();
      });

      playL.addEventListener("click", function() {
        controls.playPause();
      });

      playR.addEventListener("click", function() {
        controls.playPause();
      });

      loopButton.addEventListener("click", function() {
        controls.toggleLooping();
      });

      muteButton.addEventListener("click", function() {
        if (video.muted === false) {
          controls.mute();
        } else {
          controls.unmute();
        }
      });

      fullScreenButton.addEventListener("click", function() {
        controls.fullscreen();
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
        controls.loadVideo(videoSelect.value.substring(1));
      });


      projectionSelect.addEventListener("change", function() {
        projection = projectionSelect.value;
      });

      document.getElementById("select-local-file").addEventListener("click", function(event) {
        event.preventDefault();
        controls.selectLocalVideo();
      });
    },

    enableKeyControls: function() {
      function key(event, sign) {
        var control = controls.manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
        if (!control)
          return;
        if (sign === 1 && control.active || sign === -1 && !control.active)
          return;
        control.active = (sign === 1);
        controls.manualRotateRate[control.index] += sign * control.sign;
      }

      function onkey(event) {
        switch (String.fromCharCode(event.charCode)) {
        case 'f':
          controls.fullscreen();
          break;
        case 'z':
          vrSensor.zeroSensor();
          break;
        case 'p':
          controls.playPause();
          break;
        case ' ': //spacebar
          controls.playPause();
          break;
        case 'g':
          controls.fullscreenIgnoreHMD();
          break;
        case 'l':
          controls.toggleLooping();
          break;
        }
      }

      document.addEventListener('keydown', function(event) { key(event, 1); },
              false);
      document.addEventListener('keyup', function(event) { key(event, -1); },
              false);
      window.addEventListener("keypress", onkey, true);
    },

    /**
     * Video Commands
     */
    loaded: function() {
      leftLoad.style.display = "none";
      rightLoad.style.display = "none";
      if (video.paused) {
        leftPlay.style.display = "block";
        rightPlay.style.display = "block";
      }
    },

    play: function(event) {
      if (video.ended) {
        video.currentTime = 0.1;
      }

      video.play();
      if (!video.paused) { // In case somehow hitting play button doesnt work
        leftPlay.style.display = "none";
        rightPlay.style.display = "none";

        playButton.className = "fa fa-pause icon";
        playButton.title = "Pause";
        reqAnimFrameID = requestAnimationFrame(webGL.drawScene);
      }
    },

    pause: function() {
      video.pause();
      playButton.className = "fa fa-play icon";
      playButton.title = "Play";
      leftPlay.style.display = "block";
      rightPlay.style.display = "block";
    },

    playPause: function() {
      if (video.paused === true) {
        controls.play();
      } else {
        controls.pause();
      }
    },

    toggleLooping: function() {
      if (video.loop === true) {
        loopButton.className = "fa fa-refresh icon";
        loopButton.title="Start Looping";
        video.loop = false;
      } else {
        loopButton.className = "fa fa-chain-broken icon";
        loopButton.title="Stop Looping";
        video.loop = true;
      }
    },

    ended: function() {
      controls.pause();
      if (reqAnimFrameID) {
        cancelAnimationFrame(reqAnimFrameID);
        reqAnimFrameID = 0;
      }
    },

    mute: function() {
      video.muted = true;
      muteButton.className = "fa fa-volume-off icon";
      muteButton.title = "Unmute";
    },

    unmute: function() {
      video.muted = false;
      muteButton.className = "fa fa-volume-up icon";
      muteButton.title = "Mute";
    },

    selectLocalVideo: function() {
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
        console.log('Loading local file ', files[0].name, ' at URL ', videoObjectURL);
        videoSelect.value = "";
        controls.loadVideo(videoObjectURL);
      });

      input.click();
    },

    loadVideo: function(videoFile) {
      controls.pause();
      leftPlay.style.display = "none";
      rightPlay.style.display = "none";
      leftLoad.style.display = "block";
      rightLoad.style.display = "block";

      webGL.gl.clear(webGL.gl.COLOR_BUFFER_BIT);

      if (reqAnimFrameID) {
        cancelAnimationFrame(reqAnimFrameID);
        reqAnimFrameID = 0;
      }

      // Hack to fix rotation for vidcon video for vidcon
      if (videoFile === "videos/Vidcon.webm" || videoFile === "videos/Vidcon5.mp4") {
        manualRotation = [0.38175851106643677, -0.7102527618408203, -0.2401944249868393, 0.5404701232910156];
      } else {
        manualRotation = quat.create();
      }

      var oldObjURL = videoObjectURL;
      videoObjectURL = null;

      video.src = videoFile;

      if (videoObjectURL && videoObjectURL !== videoFile) {
        URL.removeObjectURL(oldObjURL);
      }
    },

    fullscreen: function() {
      if (canvas.mozRequestFullScreen) {
        canvas.mozRequestFullScreen({ vrDisplay: vrHMD }); // Firefox
      } else if (canvas.webkitRequestFullscreen) {
        canvas.webkitRequestFullscreen({ vrDisplay: vrHMD }); // Chrome and Safari
      } else if (canvas.requestFullScreen){
        canvas.requestFullscreen();
      }
    },

    fullscreenIgnoreHMD: function() {
      if (canvas.mozRequestFullScreen) {
        canvas.mozRequestFullScreen(); // Firefox
      } else if (canvas.webkitRequestFullscreen) {
        canvas.webkitRequestFullscreen(); // Chrome and Safari
      } else if (canvas.requestFullScreen){
        canvas.requestFullscreen();
      }
    }
  };

  global.controls = controls;

})(window);
