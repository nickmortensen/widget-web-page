/* global config: true */
/* exported config */
if (typeof config === "undefined") {
  var config = {
    // variables go here
  };

  if (typeof angular !== "undefined") {
    angular.module("risevision.common.i18n.config", [])
      .constant("LOCALES_PREFIX", "components/rv-common-i18n/dist/locales/translation_")
      .constant("LOCALES_SUFIX", ".json");

    angular.module("risevision.widget.common.storage-selector.config")
      .value("STORAGE_MODAL", "http://storage.risevision.com/~rvi/storage-client-rva-test/storage-modal.html#/files/");
  }
}

/* global gadgets */

var RiseVision = RiseVision || {};
RiseVision.WebPage = {};

RiseVision.WebPage = (function (document, gadgets) {

  "use strict";

  // private variables
  var _prefs = null,
    _additionalParams = {},
    _url = "",
    _intervalId = null,
    _companyId = null,
    _background = null;

  /*
   *  Private Methods
   */

  function _configurePage() {
    var container = document.getElementById("webpage-container"),
      frame = document.getElementById("webpage-frame"),
      aspectRatio =  (_prefs.getInt("rsH") / _prefs.getInt("rsW")) * 100,
      scrollHorizVal = (_additionalParams.scrollHorizontal > 0) ?
          _additionalParams.scrollHorizontal : 0,
      scrollVertVal = (_additionalParams.scrollVertical > 0) ?
          _additionalParams.scrollVertical : 0,
      zoom = parseFloat(_additionalParams.zoom),
      blocker, zoomStyle, marginStyle;

    if (container && frame) {
      blocker = container.getElementsByClassName("blocker")[0];

      // Hiding iframe container, visible when the iframe successfully loads
      container.style.visibility = "hidden";

      // set the padding-bottom with the aspect ratio % (responsive)
      if (scrollVertVal !== 0) {
        // recalculate aspect ratio
        aspectRatio += (scrollVertVal / _prefs.getInt("rsW")) * 100;
      }
      container.setAttribute("style", "padding-bottom:" + aspectRatio + "%");

      // Configure interactivity of iframe
      blocker.style.display = (_additionalParams.interactive) ? "none" : "block";
      frame.setAttribute("scrolling",
        (_additionalParams.scrollbars) ? "yes" : "no");

      // Configure the zoom (scale) styling
      zoomStyle = "-ms-zoom:" + zoom + ";" +
        "-moz-transform: scale(" + zoom + ");" +
        "-moz-transform-origin: 0 0;" +
        "-o-transform: scale(" + zoom + ");" +
        "-o-transform-origin: 0 0;" +
        "-webkit-transform: scale(" + zoom + ");" +
        "-webkit-transform-origin: 0 0;";

      zoomStyle += "width: " + ((1 / zoom) * 100) + "%;" +
      "height: " + ((1 / zoom) * 100) + "%;";

      // Apply the zoom (scale) on the iframe
      frame.setAttribute("style", zoomStyle);

      if (scrollHorizVal !== 0 || scrollVertVal !== 0) {
        // Configure the margin styling
        marginStyle = "margin: " + "-" + scrollVertVal + "px 0 0 -" +
          scrollHorizVal + "px;";

        /* Apply the margin styling on the iframe while maintaining
         the zoom styling */
        frame.setAttribute("style", zoomStyle + marginStyle);
      }
    }
  }

  function _loadFrame() {
    var frame = document.getElementById("webpage-frame"),
      container = document.getElementById("webpage-container"),
      hasParams = /[?#&]/.test(_url),
      randomNum = Math.ceil(Math.random() * 100),
      refreshURL = hasParams ?
          _url + "&dummyVar=" + randomNum :
          _url + "?dummyVar=" + randomNum;

    if (container && frame) {
      frame.onload = function () {
        frame.onload = null;

        // Show the iframe container
        container.style.visibility = "visible";

        // Run setInterval to reload page based on the data refresh value
        if (_additionalParams.refresh > 0) {
          _intervalId = setInterval(function () {
            _loadFrame();
          }, _additionalParams.refresh);
        }
      };

      frame.setAttribute("src", refreshURL);
    }
  }

  function _unloadFrame() {
    var frame = document.getElementById("webpage-frame");

    if (_additionalParams.refresh > 0) {
      clearInterval(_intervalId);
    }

    if (frame) {
      frame.src = "about:blank";
    }

  }

  function _ready() {
    gadgets.rpc.call("", "rsevent_ready", null, _prefs.getString("id"),
      true, true, true, true, false);
  }

  function _backgroundReady() {
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

  function pause() {
    _unloadFrame();
  }

  function play() {
    _loadFrame();
  }

  function stop() {
    _unloadFrame();
  }

  function setCompanyId(value) {
    _companyId = value;
  }

  function setAdditionalParams(params) {
    _prefs = new gadgets.Prefs();
    _additionalParams = params;

    // create and initialize the Background instance
    _background = new RiseVision.Common.Background(_additionalParams, _companyId);
    _background.init(_backgroundReady);
  }

  return {
    setCompanyId: setCompanyId,
    setAdditionalParams: setAdditionalParams,
    pause: pause,
    play: play,
    stop: stop
  };

})(document, gadgets);

var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.Background = function (data, companyId) {
  "use strict";

  var _callback = null,
    _ready = false;

  /*
   * Private Methods
   */
  function _backgroundReady() {
    _ready = true;

    if (_callback && typeof _callback === "function") {
      _callback();
    }
  }

  function _configure() {
    var background = document.getElementById("background"),
      storage = document.getElementById("backgroundStorage");

    // set the document background
    document.body.style.background = data.background.color;

    if (background) {
      if (data.background.useImage) {
        background.className = data.background.image.position;
        background.className = data.background.image.scale ? background.className + " scale-to-fit"
          : background.className;

        if (Object.keys(data.backgroundStorage).length === 0) {
          background.style.backgroundImage = "url(" + data.background.image.url + ")";
          _backgroundReady();
        } else {
          if (storage) {
            // Rise Storage
            storage.addEventListener("rise-storage-response", function(e) {
              background.style.backgroundImage = "url(" + e.detail[0] + ")";
              _backgroundReady();
            });

            storage.setAttribute("folder", data.backgroundStorage.folder);
            storage.setAttribute("fileName", data.backgroundStorage.fileName);
            storage.setAttribute("companyId", companyId);
            storage.go();
          } else {
            console.log("Missing element with id value of 'backgroundStorage'");
          }
        }
      } else {
        _backgroundReady();
      }
    } else {
      console.log("Missing element with id value of 'background'");
    }
  }

  /*
   *  Public Methods
   */
  function init(cb) {
    if (!_ready) {
      if (cb) {
        _callback = cb;
      }

      _configure();

    } else if (cb && typeof cb === "function") {
      cb();
    }
  }

  return {
    "init": init
  };
};

/* global RiseVision, gadgets */

(function (window, gadgets) {
  "use strict";

  var prefs = new gadgets.Prefs(),
    id = prefs.getString("id");

  // Disable context menu (right click menu)
  window.oncontextmenu = function () {
    return false;
  };

  function play() {
    RiseVision.WebPage.play();
  }

  function pause() {
    RiseVision.WebPage.pause();
  }

  function stop() {
    RiseVision.WebPage.stop();
  }

  function additionalParams(names, values) {
    if (Array.isArray(names) && names.length > 0 && names[0] === "additionalParams") {
      if (Array.isArray(values) && values.length > 0) {
        RiseVision.WebPage.setAdditionalParams(JSON.parse(values[0]));
      }
    }
  }

  function companyId(name, value) {
    if (name && name === "companyId") {
      RiseVision.WebPage.setCompanyId(value);
    }

    gadgets.rpc.register("rsparam_set_" + id, additionalParams);
    gadgets.rpc.call("", "rsparam_get", null, id, ["additionalParams"]);
  }

  if (id && id !== "") {
    gadgets.rpc.register("rscmd_play_" + id, play);
    gadgets.rpc.register("rscmd_pause_" + id, pause);
    gadgets.rpc.register("rscmd_stop_" + id, stop);
    gadgets.rpc.register("rsparam_set_" + id, companyId);

    gadgets.rpc.call("", "rsparam_get", null, id, "companyId");
  }

})(window, gadgets);



/* jshint ignore:start */
var _gaq = _gaq || [];

_gaq.push(['_setAccount', 'UA-41395348-11']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
/* jshint ignore:end */