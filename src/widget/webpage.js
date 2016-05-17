/* global gadgets */

var RiseVision = RiseVision || {};
RiseVision.WebPage = {};

RiseVision.WebPage = (function (document, gadgets) {

  "use strict";

  // private variables
  var _prefs = new gadgets.Prefs(),
    _utils = RiseVision.Common.Utilities,
    _additionalParams = null,
    _url = "",
    _vertical = 0,
    _intervalId = null,
    _initialLoad = true;

  var _message = null;

  /*
   *  Private Methods
   */
  function _ready() {
    gadgets.rpc.call("", "rsevent_ready", null, _prefs.getString("id"),
      true, true, true, true, false);
  }

  function _setInteractivity(frame) {
    var blocker = document.querySelector(".blocker");

    blocker.style.display = (_additionalParams.interactivity.interactive) ? "none" : "block";

    frame.setAttribute("scrolling",
      (_additionalParams.interactivity.interactive && _additionalParams.interactivity.scrollbars) ? "yes" : "no");
  }

  function _configurePage() {
    var container = document.getElementById("container"),
      frame = document.querySelector(".webpage-frame"),
      aspectRatio =  (_prefs.getInt("rsH") / _prefs.getInt("rsW")) * 100;

    if (container && frame) {
      _setInteractivity(frame);
      _setRegion(frame);
      _setZoom(frame);

      // implement responsive iframe
      if (_vertical !== 0) {
        aspectRatio += (_vertical / _prefs.getInt("rsW")) * 100;
      }

      container.setAttribute("style", "padding-bottom:" + aspectRatio + "%");
    }
  }

  function _setZoom(frame) {
   var zoom = parseFloat(_additionalParams.zoom),
    currentStyle = "",
     zoomStyle = "";

    // Configure the zoom (scale) styling
    zoomStyle = "-ms-zoom:" + zoom + ";" +
      "-moz-transform: scale(" + zoom + ");" +
      "-moz-transform-origin: 0 0;" +
      "-o-transform: scale(" + zoom + ");" +
      "-o-transform-origin: 0 0;" +
      "-webkit-transform: scale(" + zoom + ");" +
      "-webkit-transform-origin: 0 0;" +
      "transform: scale(" + zoom + ");" +
      "transform-origin: 0 0;";

    currentStyle = frame.getAttribute("style");
    zoomStyle += "width: " + ((1 / zoom) * 100) + "%;" +
      "height: " + ((1 / zoom) * 100) + "%;";

    if (currentStyle) {
      zoomStyle = currentStyle + zoomStyle;
    }

    frame.setAttribute("style", zoomStyle);
  }

  function _setRegion(frame) {
    var currentStyle = "",
      marginStyle = "",
      horizontal = 0;

    if (_additionalParams.region && _additionalParams.region.showRegion &&
      (_additionalParams.region.showRegion === "region")) {
      if (_additionalParams.region.horizontal > 0) {
        horizontal = _additionalParams.region.horizontal;
      }

      if (_additionalParams.region.vertical > 0) {
        _vertical = _additionalParams.region.vertical;
      }

      // Apply negative margins in order to show a region.
      if ((horizontal !== 0) || (_vertical !== 0)) {
        currentStyle = frame.getAttribute("style");
        marginStyle = "margin: " + "-" + _vertical + "px 0 0 -" + horizontal + "px;";

        if (currentStyle) {
          marginStyle = currentStyle + marginStyle;
        }

        frame.setAttribute("style", marginStyle);
      }
    }
  }

  function _startRefreshInterval() {
    _intervalId = setInterval(function () {
      _utils.hasInternetConnection("img/transparent.png", function (hasInternet) {
        if (hasInternet) {
          _refreshFrame();
        }
      });
    }, _additionalParams.refresh);
  }

  function _getFrameElement() {
    var container = document.getElementById("container"),
      frame = document.createElement("iframe");

    frame.className = "webpage-frame";
    frame.style.visibility = "hidden";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("allowTransparency", "true");

    _setInteractivity(frame);
    _setRegion(frame);
    _setZoom(frame);

    frame.onload = function () {
      this.onload = null;
      this.style.visibility = "visible";

      // Remove old iframe.
      container.removeChild(document.querySelector(".webpage-frame"));
    };

    frame.setAttribute("src", _url);

    return frame;
  }

  function _loadFrame() {
    var frame = document.querySelector(".webpage-frame");

    frame.onload = function () {
      this.onload = null;

      _initialLoad = false;

      // check if refresh interval should be started
      if (_additionalParams.refresh > 0 && _intervalId === null) {
        _startRefreshInterval();
      }
    };

    frame.setAttribute("src", _url);
  }

  function _refreshFrame() {
    var container = document.getElementById("container"),
      fragment = document.createDocumentFragment(),
      frame = _getFrameElement();

    fragment.appendChild(frame);
    container.appendChild(fragment);
  }

  function _unloadFrame() {
    var frame = document.querySelector(".webpage-frame");

    if (_additionalParams.refresh > 0) {
      clearInterval(_intervalId);
    }

    if (frame) {
      frame.src = "about:blank";
    }

  }

  function _init() {
    _message = new RiseVision.Common.Message(document.getElementById("container"),
      document.getElementById("messageContainer"));

    // apply height value to message container so a message gets vertically centered
    document.getElementById("messageContainer").style.height = _prefs.getInt("rsH") + "px";

    // Configure the value for _url
    _url = _additionalParams.url;

    // Add http:// if no protocol parameter exists
    if (_url.indexOf("://") === -1) {
      _url = "http://" + _url;
    }

    _configurePage();
    _ready();
  }

  /*
   *  Public Methods
   */
  function getTableName() {
    return "webpage_events";
  }

  function logEvent(params) {
    RiseVision.Common.LoggerUtils.logEvent(getTableName(), params);
  }

  function pause() {
    if (_additionalParams.unload) {
      _unloadFrame();
    }
  }

  function play() {

    logEvent({ "event": "play", "url": _url });

    if (_initialLoad || _additionalParams.unload) {
      _loadFrame();
    }
  }

  function stop() {
    pause();
  }

  function setAdditionalParams(additionalParams) {
    _additionalParams = JSON.parse(JSON.stringify(additionalParams));

    _init();
  }

  return {
    "getTableName": getTableName,
    "logEvent": logEvent,
    "setAdditionalParams": setAdditionalParams,
    "pause": pause,
    "play": play,
    "stop": stop
  };

})(document, gadgets);
