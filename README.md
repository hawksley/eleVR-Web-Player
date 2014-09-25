eleVR Web Player
================

The eleVR player lets you watch 360 flat and stereo video on your Oculus Rift or Android device with VR headset (Cardboard, Durovis Dive, etc.) from a web browser. It is written with js, html5, and webGL. It depends on the open source libraries as noted in the [3rd Party Libraries](https://github.com/hawksley/eleVR-Web-Player/blob/master/README.md#3rd-party-libraries) section. 

Videos shown in the player can be rotated using keyboard controls  (a/d, w/s, and q/e), as well as by the Oculus Rift if the vr.js plugin is installed. This does not work on DK2.

The native-support branch contains the current progress towards getting eleVR Web Player working with the native browser support currently being implemented by [Firefox](http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/) and [Chromium](https://drive.google.com/folderview?id=0BzudLt22BqGRbW9WTHMtOWMzNjQ&usp=sharing#list). This branch is currently functional (although still under development) with the latest WebVR builds for both browsers and *does* support the DK2. Feel free to download the browsers, branch the project, and try them out. Please note that the browsers may not have mp4 support. There is no currently set up web demo. Press 'f' for full screen.

#### [Go check out the demo!](http://hawksley.github.io/eleVR-Web-Player/) ####

eleVR Player was developed by [eleVR](http://eleVR.com). eleVR is a project of the Communications Design Group and is supported by SAP. The contributors to the project are [@hawksley](https://github.com/hawksley) and [@amluto](https://github.com/amluto).

It currently supports spherical video with equirectangular projections and spherical 3D video with top/bottom equirectangular projections. eleVR Player Master does not come bundled with any video files, but you can get two small demo *.webm files from the gh-pages branch, one for each projection. Alternatively, you can use your own spherical video or can download larger mp4 files from the [eleVR Downloads Page](http://elevr.com/downloads/).

### Installing the vr.js plugin ###
You will need to get the vr.js plugin in order to use the eleVR Web Player with your Oculus Rift. If you just want to use the keyboard interface, no installation is necessary.

Get the vr.js plugin here: https://github.com/benvanik/vr.js/ and follow the installation instructions. Installation instructions for Mac appear to be for Safari. To install for Chrome or Firefox, follow the Windows Chrome/Firefox installation instructions.

Following that, you should be able to run the web player without further action. If you do have issues, please read the [issues section](https://github.com/hawksley/eleVR-Web-Player/blob/master/README.md#possible-issues-and-resolutions) below.

### Support ###
eleVR player should be supported on all browsers and systems that support the vr.js plugin.
https://github.com/benvanik/vr.js/tree/master#supported-platforms

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
I've sometimes found the vr.js plugin to be buggy. If it isn't working with your Oculus, check that the results that you are getting from their raw data demo look correct: http://benvanik.github.io/vr.js/examples/raw_data.html

You should see "oculus rift detected", and a rotation that changes as you move the headset around. If you do not, first try closing all other oculus using software (only one app can use the oculus at once), then refresh/restart your browser.
###The video is showing at the wrong resolution for my Oculus###
The vr.js plugin seems to occasionally get confused about the resolution of the Oculus, I added two (commented) lines that you can use to force it to the correct resolution. Uncomment lines 2092 and 2093 of the lib/vr.js file to force the resolution to 1280x800. 

## Future Work ##
The following is a short subset of planned future work on the player.
- Add additional projections
- Add compatibility to the Native Browser VR support currently being implemented by Firefox and Chrome: 
  - http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html 
  - http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/
  - This compatibility will probably be kept to a branch until the browser versions with VR support are mainstream
- Clean up code to make it easier to drop in places
- Pull webGL shaders out of the html file

## 3rd party libraries ##
The following assets are used by the eleVR Player:

- vr.js - Apache License - https://github.com/benvanik/vr.js/
- glMatrix - Similar to MIT License - http://glmatrix.net/
- Font Awesome - MIT License - http://fortawesome.github.io/Font-Awesome/
