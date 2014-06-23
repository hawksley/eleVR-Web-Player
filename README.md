eleVR-Web-Player
================

The eleVR player lets you watch 360 flat and stereo video on your Oculus Rift from a web browser. It is written with js, html5, and webGL. It depends on the open source libraries noted in the 3rd Party Libraries section.

It currently supports spherical video with equirectangular projections and spherical 3D video with top/bottom equirectangular projections.

The video can be rotated using keyboard controls  (a/d, w/s, and q/e), as well as by the Oculus Rift.

### Installing ###
You will need to get the vr.js plugin in order to use the eleVR Web Player.
Download it here: https://github.com/benvanik/vr.js/ and follow the installation instructions. Installation instructions for Mac appear to be for Safari. To install for Chrome or Firefox, follow the Windows Chrome/Firefox installation instructions.

Following that, you should be able to run the web player without further action. If you do have issues, please read the issues section below.

### Support ###
eleVR player should be supported on all browsers and systems that support the vr.js plugin.
https://github.com/benvanik/vr.js/tree/master#supported-platforms

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

## 3rd party libraries ##
The following assets are used in this tool's creation.

- vr.js - Apache License - https://github.com/benvanik/vr.js/
- glMatrix - Similar to MIT License - http://glmatrix.net/
- Font Awesome - MIT License - http://fortawesome.github.io/Font-Awesome/
