eleVR Web Player
================

The eleVR player lets you watch 360 flat and stereo video on your Oculus Rift or Android device with VR headset (Cardboard, Durovis Dive, etc.) from a web browser. It is written with js, html5, and webGL. 

eleVR Web Player works with the native browser support currently being implemented by [Firefox](http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/) and [Chromium](https://drive.google.com/folderview?id=0BzudLt22BqGRbW9WTHMtOWMzNjQ&usp=sharing#list).Please note that these experimental browsers may not have mp4 support.

The player depends on the open source libraries as noted in the [3rd Party Libraries](https://github.com/hawksley/eleVR-Web-Player/blob/master/README.md#3rd-party-libraries) section. With the advent of (experimental) direct webVR support by Firefox and Chromium, the player no longer depends on the vr.js plugin.

Videos shown in the player can be rotated using keyboard controls  (a/d, w/s, and q/e), as well as by the Oculus Rift if you are running an experimental webVR browser.

#### [Go check out the demo!](http://hawksley.github.io/eleVR-Web-Player/) ####

The following table documents the keyboard controls currently available.

| Key | Control           |
|:-----:|-------------|
| p   | play/pause |
| l   | toggle looping |
| f   | full screen webVR mode (with barrel distortion) |
| g   | regular full screen mode (less lag) |
| w   | up |
| a   | left |
| s   | down |
| d   | right |
| q   | rotate left |
| e   | rotate right |

eleVR Player was developed by [eleVR](http://eleVR.com). eleVR is a project of the Communications Design Group and is supported by SAP. The contributors to the project are [@hawksley](https://github.com/hawksley) and [@amluto](https://github.com/amluto).

It currently supports spherical video with equirectangular projections and spherical 3D video with top/bottom equirectangular projections. eleVR Player Master does not come bundled with any video files, but you can get two small demo *.webm files from the gh-pages branch, one for each projection. Alternatively, you can use your own spherical video or can download larger mp4 files from the [eleVR Downloads Page](http://elevr.com/downloads/).

### Support ###
Using keyboard rotation controls, the player works on standard Firefox and Chrome on Windows, Mac, and Linux. It also runs on Safari (if webgl is enabled). I haven't tested it on other browsers.

Using Oculus headset controls, the player works on the experimental webVR builds of [Firefox](http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/) and [Chromium](https://drive.google.com/folderview?id=0BzudLt22BqGRbW9WTHMtOWMzNjQ&usp=sharing#list).

Using device orientation controls, it has historically worked on Chrome on Android, however Chrome recently hacked a fix to a security issue by marking all video as cross-origin. For more details on the current status on mobile devices, please check out the issues tab.

## Running your own video ##
The easiest way to run your own video is to click the folder icon and load your video from there. You may then need to choose the projection for your video from the projection selector.

You can load your own video from the javascript console, by typing loadVideo("0myVideo.mp4"). If your video is equirectangular 2D, preface your video by 0. If it is stereo top/bottom, preface it by 1. These numbers correspond to the projections in the projectionEnum declaration in elevr-player.js.

If you want to add your video to the drop-down, create a new option in the html video-select element that looks like:
<option value="0myVideo.mp4">My Video</option>

If you want your video to be the video loaded initially, change the source of the video in the html video tag. You can also update the starting projection, if necessary, by changing the value of the "projection" variable on instantiation (and also changing the default value of the projection-select html select tag.

## Possible Issues and Resolutions ##
###Unable to play video###
If you download and run the code yourself, you need to serve the content to localhost before you can view video (due to _cross origin issues_). 

Similarly, if you try to run your own video, you may run into __cross origin__ issues if your video is not at the same origin the player. Take a look at [this doc](https://developer.mozilla.org/en-US/docs/Web/WebGL/Cross-Domain_Textures) from mozilla if you run into these issues.

You may also run into issues playing video if your browser does not support HTML5 video of the type that you are using. For example, Firefox on Mac does not support mp4 video, but does support webm. You can check what video types are supported for your browser here: http://en.wikipedia.org/wiki/HTML5_video#Browser_support
###Broken Time Slider in Chrome###
For the time slider to work in Chrome, you must use a server that understands __partial content requests__. Many of the most basic ways of serving to localhost do not.
###Oculus movement isn't being recognized###
Make sure that you are using an experimental webVR version of the browser. If it still isn't being recognized, you can try restarting the browser and plugging/unplugging your device.

## Future Work ##
The following is a short subset of planned future work on the player.
- Add additional projections
- Clean up code to make it easier to drop in places
- Pull webGL shaders out of the html file

## 3rd party libraries ##
The following assets are used by the eleVR Player:

- glMatrix - Similar to MIT License - http://glmatrix.net/
- Font Awesome - MIT License - http://fortawesome.github.io/Font-Awesome/
