// ==UserScript==
// @name               E HENTAI VIEW ENHANCE
// @name:zh-CN         E绅士阅读强化
// @namespace          https://github.com/MapoMagpie/eh-view-enhance
// @version            4.1.12
// @author             MapoMagpie
// @description        e-hentai.org better viewer, All of thumbnail images exhibited in grid, and show the best quality image.
// @description:zh-CN  E绅士阅读强化，一目了然的缩略图网格陈列，漫画形式的大图阅读。
// @license            MIT
// @icon               https://exhentai.org/favicon.ico
// @match              https://exhentai.org/g/*
// @match              https://e-hentai.org/g/*
// @match              https://nhentai.net/g/*
// @match              https://steamcommunity.com/id/*/screenshots*
// @match              https://hitomi.la/*/*
// @exclude            https://nhentai.net/g/*/*/
// @require            https://cdn.jsdelivr.net/npm/jszip@3.1.5/dist/jszip.min.js
// @require            https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// @require            https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js
// @connect            exhentai.org
// @connect            e-hentai.org
// @connect            hath.network
// @connect            nhentai.net
// @connect            hitomi.la
// @connect            akamaihd.net
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// ==/UserScript==

(function (Hammer, JSZip, saveAs) {
  'use strict';

  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };
  var _GM_getValue = /* @__PURE__ */ (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_setValue = /* @__PURE__ */ (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  function defaultConf() {
    const screenWidth = window.screen.width;
    const colCount = screenWidth > 2500 ? 7 : screenWidth > 1900 ? 6 : 5;
    return {
      backgroundImage: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAfElEQVR42mP8z/CfCgIwDEgwAIAL0Fq3MDD5iQcn0/BgDpDAn0/AvywA4kUEZ7gUkXBoAM5gUQUaJ6eClOyBjALcAAAAASUVORK5CYII=`,
      colCount,
      readMode: "singlePage",
      autoLoad: true,
      fetchOriginal: false,
      restartIdleLoader: 8e3,
      threads: 3,
      downloadThreads: 3,
      timeout: 40,
      version: "4.1.10",
      debug: true,
      first: true,
      reversePages: false,
      pageHelperAbTop: "unset",
      pageHelperAbLeft: "20px",
      pageHelperAbBottom: "20px",
      pageHelperAbRight: "unset",
      imgScale: 0,
      stickyMouse: "enable",
      autoPageInterval: 1e4,
      autoPlay: false,
      filenameTemplate: "{number}-{title}",
      preventScrollPageTime: 200
    };
  }
  const VERSION = "4.1.10";
  const CONFIG_KEY = "ehvh_cfg_";
  function getConf() {
    let cfgStr = _GM_getValue(CONFIG_KEY);
    if (cfgStr) {
      let cfg2 = JSON.parse(cfgStr);
      if (cfg2.version === VERSION) {
        return confHealthCheck(cfg2);
      }
    }
    let cfg = defaultConf();
    saveConf(cfg);
    return cfg;
  }
  function confHealthCheck($conf) {
    let changed = false;
    if ($conf.pageHelperAbTop !== "unset") {
      $conf.pageHelperAbTop = Math.max(parseInt($conf.pageHelperAbTop), 500) + "px";
      changed = true;
    }
    if ($conf.pageHelperAbBottom !== "unset") {
      $conf.pageHelperAbBottom = Math.max(parseInt($conf.pageHelperAbBottom), 5) + "px";
      changed = true;
    }
    if ($conf.pageHelperAbLeft !== "unset") {
      $conf.pageHelperAbLeft = Math.max(parseInt($conf.pageHelperAbLeft), 5) + "px";
      changed = true;
    }
    if ($conf.pageHelperAbRight !== "unset") {
      $conf.pageHelperAbRight = Math.max(parseInt($conf.pageHelperAbRight), 5) + "px";
      changed = true;
    }
    if (changed) {
      saveConf($conf);
    }
    return $conf;
  }
  function saveConf(c) {
    _GM_setValue(CONFIG_KEY, JSON.stringify(c));
  }
  const ConfigNumberKeys = ["colCount", "threads", "downloadThreads", "timeout", "autoPageInterval", "preventScrollPageTime"];
  const ConfigBooleanKeys = ["fetchOriginal", "autoLoad", "reversePages", "autoPlay"];
  const ConfigSelectKeys = ["readMode", "stickyMouse"];
  const conf = getConf();
  const updatePageHelper = function(state, data) {
    switch (state) {
      case "fetching":
        HTML.pageHelper.classList.add("pageHelperFetching");
        break;
      case "fetched":
        HTML.pageHelper.classList.remove("pageHelperFetching");
        break;
      case "updateTotal":
        if (!data) {
          throw new Error("updateTotal data is undefined");
        }
        HTML.totalPageElement.textContent = data;
        DLC.drawDebouce();
        break;
      case "updateCurrPage":
        if (!data) {
          throw new Error("updateCurrPage data is undefined");
        }
        HTML.currPageElement.textContent = data;
        DLC.drawDebouce();
        break;
      case "updateFinished":
        if (!data) {
          throw new Error("updateFinished data is undefined");
        }
        HTML.finishedElement.textContent = data;
        DLC.drawDebouce();
        break;
    }
  };
  function evLog(msg, ...info) {
    if (conf.debug) {
      console.log((/* @__PURE__ */ new Date()).toLocaleString(), "EHVP:" + msg, ...info);
    }
  }
  const HOST_REGEX = /\/\/([^\/]*)\//;
  function xhrWapper(url, respType, cb) {
    _GM_xmlhttpRequest({
      method: "GET",
      url,
      timeout: conf.timeout * 1e3,
      responseType: respType,
      headers: {
        "Host": HOST_REGEX.exec(url)[1],
        // "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
        "Accept": "image/avif,image/webp,*/*",
        // "Accept-Language": "en-US,en;q=0.5",
        // "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": window.location.href,
        // "Sec-Fetch-Dest": "image",
        // "Sec-Fetch-Mode": "no-cors",
        // "Sec-Fetch-Site": "cross-site",
        "Cache-Control": "public,max-age=3600,immutable"
      },
      ...cb
    });
  }
  var FetchState = /* @__PURE__ */ ((FetchState2) => {
    FetchState2[FetchState2["FAILED"] = 0] = "FAILED";
    FetchState2[FetchState2["URL"] = 1] = "URL";
    FetchState2[FetchState2["DATA"] = 2] = "DATA";
    FetchState2[FetchState2["DONE"] = 3] = "DONE";
    return FetchState2;
  })(FetchState || {});
  class IMGFetcher {
    constructor(node, matcher2) {
      __publicField(this, "root");
      __publicField(this, "imgElement");
      __publicField(this, "pageUrl");
      __publicField(this, "bigImageUrl");
      __publicField(this, "stage");
      __publicField(this, "tryTimes");
      __publicField(this, "lock");
      __publicField(this, "rendered");
      __publicField(this, "blobData");
      __publicField(this, "blobUrl");
      __publicField(this, "title");
      __publicField(this, "downloadState");
      __publicField(this, "onFinishedEventContext");
      __publicField(this, "onFailedEventContext");
      // TODO: onFailedEventContext
      __publicField(this, "downloadBar");
      __publicField(this, "timeoutId");
      __publicField(this, "matcher");
      this.root = node;
      this.imgElement = node.firstChild;
      this.pageUrl = this.imgElement.getAttribute("ahref");
      this.stage = 1;
      this.tryTimes = 0;
      this.lock = false;
      this.rendered = false;
      this.title = this.imgElement.getAttribute("title") || "untitle.jpg";
      this.downloadState = { total: 100, loaded: 0, readyState: 0 };
      this.onFinishedEventContext = /* @__PURE__ */ new Map();
      this.onFailedEventContext = /* @__PURE__ */ new Map();
      this.matcher = matcher2;
    }
    // 刷新下载状态
    setDownloadState(newState) {
      this.downloadState = { ...this.downloadState, ...newState };
      if (this.downloadState.readyState === 4) {
        if (this.downloadBar && this.downloadBar.parentNode) {
          this.downloadBar.parentNode.removeChild(this.downloadBar);
        }
        return;
      }
      if (!this.downloadBar) {
        const downloadBar = document.createElement("div");
        downloadBar.classList.add("downloadBar");
        downloadBar.innerHTML = `
      <progress style="position: absolute; width: 100%; height: 7px; left: 0; bottom: 0; border: none;" value="0" max="100" />
      `;
        this.downloadBar = downloadBar;
        this.root.appendChild(this.downloadBar);
      }
      if (this.downloadBar) {
        this.downloadBar.querySelector("progress").setAttribute("value", this.downloadState.loaded / this.downloadState.total * 100 + "");
      }
      DLC.drawDebouce();
    }
    async start(index) {
      if (this.lock)
        return;
      this.lock = true;
      try {
        this.changeStyle(
          0
          /* ADD */
        );
        await this.fetchImage();
        this.changeStyle(
          1,
          0
          /* SUCCESS */
        );
        this.onFinishedEventContext.forEach((callback) => callback(index, this));
      } catch (error) {
        this.changeStyle(
          1,
          1
          /* FAILED */
        );
        evLog(`IMG-FETCHER ERROR:`, error);
        this.stage = 0;
        this.onFailedEventContext.forEach((callback) => callback(index, this));
      } finally {
        this.lock = false;
      }
    }
    onFinished(eventId, callback) {
      this.onFinishedEventContext.set(eventId, callback);
    }
    onFailed(eventId, callback) {
      this.onFailedEventContext.set(eventId, callback);
    }
    retry() {
      if (this.stage !== 3) {
        this.changeStyle(
          1
          /* REMOVE */
        );
        this.stage = 1;
      }
    }
    async fetchImage() {
      this.tryTimes = 0;
      while (this.tryTimes < 3) {
        switch (this.stage) {
          case 0:
          case 1:
            let url = await this.fetchImageURL();
            if (url !== null) {
              this.bigImageUrl = url;
              this.stage = 2;
            } else {
              this.tryTimes++;
            }
            break;
          case 2:
            let data = await this.fetchImageData();
            if (data !== null) {
              this.blobData = data;
              this.blobUrl = URL.createObjectURL(data);
              this.imgElement.src = this.blobUrl;
              this.rendered = true;
              this.stage = 3;
            } else {
              this.stage = 1;
              this.tryTimes++;
            }
            break;
          case 3:
            return;
        }
      }
      throw new Error(`Fetch image failed, reach max try times, current stage: ${this.stage}`);
    }
    async fetchImageURL() {
      try {
        const imageURL = await this.matcher.matchImgURL(this.pageUrl, this.tryTimes > 0);
        if (!imageURL) {
          evLog("Fetch URL failed, the URL is empty");
          return null;
        }
        return imageURL;
      } catch (error) {
        evLog(`Fetch URL error:`, error);
        return null;
      }
    }
    async fetchImageData() {
      try {
        const data = await this.fetchBigImage();
        if (data == null) {
          throw new Error(`Data is null, image url:${this.bigImageUrl}`);
        }
        return data;
      } catch (error) {
        evLog(`Fetch image data error:`, error);
        return null;
      }
    }
    render() {
      if (this.rendered)
        return;
      const src = this.imgElement.getAttribute("asrc");
      if (src) {
        this.imgElement.src = src;
        this.rendered = true;
      } else {
        evLog("渲染缩略图失败，未获取到asrc属性");
      }
    }
    //立刻将当前元素的src赋值给大图元素
    setNow(index) {
      BIFM.setNow(index);
      if (this.stage === 3) {
        this.onFinishedEventContext.forEach((callback) => callback(index, this));
      } else {
        updatePageHelper("fetching");
      }
      updatePageHelper("updateCurrPage", (index + 1).toString());
    }
    async fetchBigImage() {
      const imgFetcher = this;
      return new Promise(async (resolve, reject) => {
        xhrWapper(imgFetcher.bigImageUrl, "blob", {
          onload: function(response) {
            let data = response.response;
            if (data.type === "text/html")
              ;
            try {
              imgFetcher.setDownloadState({ readyState: response.readyState });
            } catch (error) {
              evLog("warn: fetch big image data onload setDownloadState error:", error);
            }
            resolve(data);
          },
          onerror: function(response) {
            reject(`error:${response.error}, response:${response.response}`);
          },
          ontimeout: function() {
            reject("timeout");
          },
          onprogress: function(response) {
            imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
          },
          onloadstart: function() {
            imgFetcher.setDownloadState(imgFetcher.downloadState);
          }
        });
      });
    }
    changeStyle(action, fetchStatus) {
      switch (action) {
        case 0:
          this.imgElement.classList.add("fetching");
          break;
        case 1:
          this.imgElement.classList.remove("fetching");
          break;
      }
      switch (fetchStatus) {
        case 0:
          this.imgElement.classList.add("fetched");
          this.imgElement.classList.remove("fetch-failed");
          break;
        case 1:
          this.imgElement.classList.add("fetch-failed");
          this.imgElement.classList.remove("fetched");
          break;
        default:
          this.imgElement.classList.remove("fetched");
          this.imgElement.classList.remove("fetch-failed");
      }
    }
  }
  const lang = navigator.language;
  const i18nIndex = lang === "zh-CN" ? 1 : 0;
  class I18nValue extends Array {
    constructor(...value) {
      super(...value);
    }
    get() {
      return this[i18nIndex];
    }
  }
  const i18n = {
    imageScale: new I18nValue("SCALE", "缩放"),
    download: new I18nValue("DL", "下载"),
    config: new I18nValue("CONF", "配置"),
    autoPagePlay: new I18nValue("PLAY", "播放"),
    autoPagePause: new I18nValue("PAUSE", "暂停"),
    autoPlay: new I18nValue("Auto Page", "自动翻页"),
    autoPlayTooltip: new I18nValue("Auto Page when entering the big image readmode.", "当阅读大图时，开启自动播放模式。"),
    preventScrollPageTime: new I18nValue("Flip Page Time", "滚动翻页时间"),
    preventScrollPageTimeTooltip: new I18nValue("In Read Mode:Single Page, when scrolling through the content, prevent immediate page flipping when reaching the bottom, improve the reading experience. Set to 0 to disable this feature, measured in milliseconds.", "在单页阅读模式下，滚动浏览时，阻止滚动到底部时立即翻页，提升阅读体验。设置为0时则为禁用此功能，单位为毫秒。"),
    collapse: new I18nValue("FOLD", "收起"),
    columns: new I18nValue("Columns", "每行数量"),
    readMode: new I18nValue("Read Mode", "阅读模式"),
    autoPageInterval: new I18nValue("Auto Page Interval", "自动翻页间隔"),
    autoPageIntervalTooltip: new I18nValue("Use the mouse wheel on Input box to adjust the interval time.", "在输入框上使用鼠标滚轮快速修改间隔时间"),
    readModeTooltip: new I18nValue("Switch to the next picture when scrolling, otherwise read continuously", "滚动时切换到下一张图片，否则连续阅读"),
    maxPreloadThreads: new I18nValue("PreloadThreads", "最大同时加载"),
    maxPreloadThreadsTooltip: new I18nValue("Max Preload Threads", "大图浏览时，每次滚动到下一张时，预加载的图片数量，大于1时体现为越看加载的图片越多，将提升浏览体验。"),
    maxDownloadThreads: new I18nValue("DonloadThreads", "最大同时下载"),
    maxDownloadThreadsTooltip: new I18nValue("Max Download Threads, suggest: <5", "下载模式下，同时加载的图片数量，建议小于等于5"),
    timeout: new I18nValue("Timeout(second)", "超时时间(秒)"),
    bestQuality: new I18nValue("RawImage", "最佳质量"),
    autoLoad: new I18nValue("AutoLoad", "自动加载"),
    autoLoadTooltip: new I18nValue("", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"),
    bestQualityTooltip: new I18nValue("enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"),
    forceDownload: new I18nValue("Take Loaded", "强制下载已加载的"),
    downloadStart: new I18nValue("Start Download", "开始下载"),
    downloading: new I18nValue("Downloading...", "下载中..."),
    downloadFailed: new I18nValue("Failed(Retry)", "下载失败(重试)"),
    downloaded: new I18nValue("Downloaded", "下载完成"),
    reversePages: new I18nValue("Reverse Pages", "反向翻页"),
    reversePagesTooltip: new I18nValue("Clicking on the side navigation, if enable then reverse paging, which is a reading style similar to Japanese manga where pages are read from right to left.", "点击侧边导航时，是否反向翻页，反向翻页类似日本漫画那样的从右到左的阅读方式。"),
    stickyMouse: new I18nValue("Sticky Mouse", "黏糊糊鼠标"),
    stickyMouseTooltip: new I18nValue("In non-continuous reading mode, scroll a single image automatically by moving the mouse.", "非连续阅读模式下，通过鼠标移动来自动滚动单张图片。"),
    dragToMove: new I18nValue("Drag to Move", "拖动移动"),
    originalCheck: new I18nValue("<a class='clickable' style='color:gray;'>Enable RawImage Transient</a>", "未启用最佳质量图片，点击此处<a class='clickable' style='color:gray;'>临时开启最佳质量</a>"),
    help: new I18nValue(`
    <h1>GUIDE:</h1>
    <ol>
      <li>Before use this script，make sure gallery switch to <a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Large</a> mode</li>
      <li>Click bottom right corner<span style="background-color: gray;">&lessdot;📖&gtdot;</span>，enter into viewer mode</li>
      <li>Just a moment，All of thumbnail images exhibited in grid，<strong style="color: red;">click</strong> one of thumbnail images, into big image mode</li>
      <li><strong style="color: orange">Image quality:</strong>level 1、thumbnail； level 2、compressed image； level 3、original image；<br>
        In default config，auto load compressed image，with low traffic consumption with good clarity。also you can enable best quality in config plane, This increases the consumption of traffic and browsing quotas。
      </li>
      <li><strong style="color: orange">Big image:</strong>click thumbnail image, into big image mode, use mouse wheel switch to next or prev</li>
      <li><strong style="color: orange">Keyboard:</strong>
      <table>
      <tr><td>Scale Image</td><td>mouse right + wheel or -/=</td></tr>
      <tr><td>Open  Image(In thumbnails)</td><td>Enter</td></tr>
      <tr><td>Exit  Image(In big mode)</td><td>Enter/Esc</td></tr>
      <tr><td>Open Specific Page(In thumbnails)</td><td>Input number(no echo) + Enter</td></tr>
      <tr><td>Switch Page</td><td>→/←</td></tr>
      <tr><td>Scroll Image</td><td>↑/↓/Space</td></tr>
      </table>
      </li>
      <li><strong style="color: orange">Download:</strong>click download button，popup download plane，the loading status of all images is indicated by small squares.</li>
      <li><strong style="color: orange">Feedback:</strong>
        Click 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance/issues" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-issue-opened" aria-label="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        to provide feedback on issues, Give me a star if you like this script.
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `, `
    <h1>操作说明:</h1>
    <ol>
      <li>在使用本脚本浏览前，请务必切换为<a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Large|大图</a>模式</li>
      <li>点击右下角<span style="background-color: gray;">&lessdot;📖&gtdot;</span>展开，进入阅读模式</li>
      <li>稍等片刻后，缩略图会全屏陈列在页面上，<strong style="color: red;">点击</strong>某一缩略图进入大图浏览模式</li>
      <li><strong style="color: orange">图片质量:</strong>图片质量有三档，1、原始的缩略图(最模糊)；2、E绅士的压缩图；3、原图；<br>
        默认配置下，脚本会自动加载压缩图，这也是E绅士默认的浏览行为，具有较小的流量消耗与良好的清晰度。也可以在配置中启用最佳质量，脚本会加载原图，这会增加流量与浏览配额的消耗。
      </li>
      <li><strong style="color: orange">大图展示:</strong>点击缩略图，可以展开大图，在大图上滚动切换上一张下一张图片</li>
      <li><strong style="color: orange">键盘操作:</strong>
      <table>
      <tr><td>图片缩放</td><td>鼠标右键+滚轮 或 -/=</td></tr>
      <tr><td>打开大图(缩略图模式下)</td><td>回车</td></tr>
      <tr><td>退出大图(大图模式下)</td><td>回车/Esc</td></tr>
      <tr><td>打开指定图片(缩略图模式下)</td><td>直接输入数字(不回显) + 回车</td></tr>
      <tr><td>切换图片</td><td>→/←</td></tr>
      <tr><td>滚动图片</td><td>↑/↓</td></tr>
      </table>
      </li>
      <li><strong style="color: orange">下载功能:</strong>右下角点击下载按钮，弹出下载面板，内部通过小方块展示了所有图片的加载状态，点击开始下载按钮后，会加快图片加载效率并在所有图片加载完成后进行下载。 </li>
      <li><strong style="color: orange">问题反馈:</strong>
        点击 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance/issues" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-issue-opened" aria-label="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        反馈你的问题或建议，如果你喜欢这个脚本，给我一个star吧。 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `)
  };
  class GalleryMeta {
    constructor(url, title) {
      __publicField(this, "url");
      __publicField(this, "title");
      __publicField(this, "originTitle");
      __publicField(this, "tags");
      this.url = url;
      this.title = title;
      this.tags = {};
    }
  }
  const FILENAME_INVALIDCHAR = /[\\/:*?"<>|]/g;
  class Downloader {
    constructor(queue, idleLoader, matcher2) {
      __publicField(this, "meta");
      __publicField(this, "zip");
      __publicField(this, "downloading");
      __publicField(this, "downloadForceElement");
      __publicField(this, "downloadStartElement");
      __publicField(this, "downloadNoticeElement");
      __publicField(this, "queue");
      __publicField(this, "idleLoader");
      __publicField(this, "numberTitle");
      __publicField(this, "delayedQueue", []);
      __publicField(this, "done", false);
      var _a, _b;
      this.queue = queue;
      this.idleLoader = idleLoader;
      this.meta = () => matcher2.parseGalleryMeta(document);
      this.zip = new JSZip();
      this.downloading = false;
      this.downloadForceElement = document.querySelector("#download-force") || void 0;
      this.downloadStartElement = document.querySelector("#download-start") || void 0;
      this.downloadNoticeElement = document.querySelector("#download-notice") || void 0;
      (_a = this.downloadForceElement) == null ? void 0 : _a.addEventListener("click", () => this.download());
      (_b = this.downloadStartElement) == null ? void 0 : _b.addEventListener("click", () => this.start());
    }
    needNumberTitle() {
      if (this.numberTitle !== void 0) {
        return this.numberTitle;
      } else {
        this.numberTitle = false;
        let lastTitle = "";
        for (const fetcher of this.queue) {
          if (fetcher.title < lastTitle) {
            this.numberTitle = true;
            break;
          }
          lastTitle = fetcher.title;
        }
        return this.numberTitle;
      }
    }
    addToDelayedQueue(index, imgFetcher) {
      if (PF.done) {
        if (this.delayedQueue.length > 0) {
          for (const item of this.delayedQueue) {
            this.addToDownloadZip(item.index, item.fetcher);
          }
          this.delayedQueue = [];
        }
        this.addToDownloadZip(index, imgFetcher);
      } else {
        this.delayedQueue.push({ index, fetcher: imgFetcher });
      }
    }
    addToDownloadZip(index, imgFetcher) {
      if (!imgFetcher.blobData) {
        evLog("无法获取图片数据，因此该图片无法下载");
        return;
      }
      let title = imgFetcher.title;
      if (this.needNumberTitle()) {
        const digit = this.queue.length.toString().length;
        title = conf.filenameTemplate.replace("{number}", (index + 1).toString().padStart(digit, "0")).replace("{title}", title);
      }
      this.zip.file(this.checkDuplicateTitle(index, title), imgFetcher.blobData, { binary: true });
    }
    checkDuplicateTitle(index, $title) {
      var _a;
      let newTitle = $title.replace(FILENAME_INVALIDCHAR, "_");
      if (this.zip.files[newTitle]) {
        let splits = newTitle.split(".");
        const ext = splits.pop();
        const prefix = splits.join(".");
        const num = parseInt(((_a = prefix.match(/_(\d+)$/)) == null ? void 0 : _a[1]) || "");
        if (isNaN(num)) {
          newTitle = `${prefix}_1.${ext}`;
        } else {
          newTitle = `${prefix.replace(/\d+$/, (num + 1).toString())}.${ext}`;
        }
        return this.checkDuplicateTitle(index, newTitle);
      } else {
        return newTitle;
      }
    }
    // check > start > download
    check() {
      var _a;
      if (conf.fetchOriginal)
        return;
      if (this.downloadNoticeElement && !this.downloading) {
        this.downloadNoticeElement.innerHTML = `<span>${i18n.originalCheck.get()}</span>`;
        (_a = this.downloadNoticeElement.querySelector("a")) == null ? void 0 : _a.addEventListener("click", () => this.fetchOriginalTemporarily());
      }
    }
    fetchOriginalTemporarily() {
      conf.fetchOriginal = true;
      this.queue.forEach((imgFetcher) => {
        imgFetcher.stage = FetchState.URL;
      });
      this.start();
    }
    start() {
      if (this.queue.isFinised()) {
        this.download();
        return;
      }
      this.flushUI("downloading");
      this.downloading = true;
      conf.autoLoad = true;
      this.queue.forEach((imf) => {
        if (imf.stage === FetchState.FAILED) {
          imf.retry();
        }
      });
      this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => !imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1).filter((index) => index >= 0).splice(0, conf.downloadThreads);
      this.idleLoader.onFailed(() => {
        this.downloading = false;
        this.flushUI("downloadFailed");
      });
      this.idleLoader.start(++this.idleLoader.lockVer);
    }
    flushUI(stage) {
      if (this.downloadNoticeElement) {
        this.downloadNoticeElement.innerHTML = `<span>${i18n[stage].get()}</span>`;
      }
      if (this.downloadStartElement) {
        this.downloadStartElement.style.color = stage === "downloadFailed" ? "red" : "";
        this.downloadStartElement.textContent = i18n[stage].get();
      }
      HTML.downloaderPlaneBTN.style.color = stage === "downloadFailed" ? "red" : "";
    }
    download() {
      this.downloading = false;
      this.idleLoader.abort(this.queue.currIndex);
      if (this.delayedQueue.length > 0) {
        for (const item of this.delayedQueue) {
          this.addToDownloadZip(item.index, item.fetcher);
        }
        this.delayedQueue = [];
      }
      const meta = this.meta();
      this.zip.file("meta.json", JSON.stringify(meta));
      this.zip.generateAsync({ type: "blob" }, (_metadata) => {
      }).then((data) => {
        saveAs(data, `${meta.originTitle || meta.title}.zip`);
        this.flushUI("downloaded");
        this.done = true;
        HTML.downloaderPlaneBTN.textContent = i18n.download.get();
        HTML.downloaderPlaneBTN.style.color = "";
      });
    }
  }
  class Debouncer {
    constructor(mode) {
      __publicField(this, "tids");
      __publicField(this, "mode");
      __publicField(this, "lastExecTime");
      this.tids = {};
      this.lastExecTime = Date.now();
      this.mode = mode || "debounce";
    }
    addEvent(id, event, timeout) {
      if (this.mode === "throttle") {
        const now = Date.now();
        if (now - this.lastExecTime >= timeout) {
          this.lastExecTime = now;
          event();
        }
      } else if (this.mode === "debounce") {
        window.clearTimeout(this.tids[id]);
        this.tids[id] = window.setTimeout(event, timeout);
      }
    }
  }
  class IMGFetcherQueue extends Array {
    constructor() {
      super();
      __publicField(this, "executableQueue");
      __publicField(this, "currIndex");
      __publicField(this, "finishedIndex");
      __publicField(this, "debouncer");
      this.executableQueue = [];
      this.currIndex = 0;
      this.finishedIndex = [];
      this.debouncer = new Debouncer();
    }
    isFinised() {
      return this.finishedIndex.length === this.length;
    }
    push(...items) {
      items.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
      return super.push(...items);
    }
    unshift(...items) {
      items.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
      return super.unshift(...items);
    }
    do(start, oriented) {
      oriented = oriented || "next";
      this.currIndex = this.fixIndex(start);
      if (DL.downloading) {
        this[this.currIndex].setNow(this.currIndex);
        return;
      }
      IL.abort(this.currIndex);
      this[this.currIndex].setNow(this.currIndex);
      if (!this.pushInExecutableQueue(oriented))
        return;
      this.debouncer.addEvent("IFQ-EXECUTABLE", () => {
        this.executableQueue.forEach((imgFetcherIndex) => this[imgFetcherIndex].start(imgFetcherIndex));
      }, 300);
    }
    //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
    finishedReport(index) {
      const imgFetcher = this[index];
      if (imgFetcher.stage !== FetchState.DONE)
        return;
      if (this.finishedIndex.indexOf(index) < 0) {
        DL.addToDelayedQueue(index, imgFetcher);
      }
      this.pushFinishedIndex(index);
      if (this.isFinised()) {
        if (DL.downloading) {
          DL.download();
        } else if (!DL.done && HTML.downloaderPlaneBTN.style.color !== "lightgreen") {
          HTML.downloaderPlaneBTN.style.color = "lightgreen";
          if (!/✓/.test(HTML.downloaderPlaneBTN.textContent)) {
            HTML.downloaderPlaneBTN.textContent += "✓";
          }
        }
      }
      updatePageHelper("updateFinished", this.finishedIndex.length.toString());
      evLog(`第${index + 1}张完成，大图所在第${this.currIndex + 1}张`);
      if (index !== this.currIndex)
        return;
      updatePageHelper("fetched");
      this.scrollTo(index);
    }
    scrollTo(index) {
      const imgFetcher = this[index];
      let scrollTo = imgFetcher.root.offsetTop - window.screen.availHeight / 3;
      scrollTo = scrollTo <= 0 ? 0 : scrollTo >= HTML.fullViewPlane.scrollHeight ? HTML.fullViewPlane.scrollHeight : scrollTo;
      HTML.fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" });
    }
    //如果开始的索引小于0,则修正索引为0,如果开始的索引超过队列的长度,则修正索引为队列的最后一位
    fixIndex(start) {
      return start < 0 ? 0 : start > this.length - 1 ? this.length - 1 : start;
    }
    /**
     * 将方向前|后 的未加载大图数据的图片获取器放入待加载队列中
     * 从当前索引开始，向后或向前进行遍历，
     * 会跳过已经加载完毕的图片获取器，
     * 会添加正在获取大图数据或未获取大图数据的图片获取器到待加载队列中
     * @param oriented 方向 前后 
     * @returns 是否添加成功
     */
    pushInExecutableQueue(oriented) {
      this.executableQueue = [];
      for (let count = 0, index = this.currIndex; this.pushExecQueueSlave(index, oriented, count); oriented === "next" ? ++index : --index) {
        if (this[index].stage === FetchState.DONE)
          continue;
        this.executableQueue.push(index);
        count++;
      }
      return this.executableQueue.length > 0;
    }
    // 如果索引已到达边界且添加数量在配置最大同时获取数量的范围内
    pushExecQueueSlave(index, oriented, count) {
      return (oriented === "next" && index < this.length || oriented === "prev" && index > -1) && count < conf.threads;
    }
    findImgIndex(ele) {
      for (let index = 0; index < this.length; index++) {
        if (this[index] instanceof IMGFetcher && (this[index].imgElement === ele || this[index].root === ele)) {
          return index;
        }
      }
      return 0;
    }
    pushFinishedIndex(index) {
      if (this.finishedIndex.length === 0) {
        this.finishedIndex.push(index);
        return;
      }
      for (let i = 0; i < this.finishedIndex.length; i++) {
        if (index === this.finishedIndex[i])
          return;
        if (index < this.finishedIndex[i]) {
          this.finishedIndex.splice(i, 0, index);
          return;
        }
      }
      this.finishedIndex.push(index);
    }
  }
  class IdleLoader {
    constructor(queue) {
      __publicField(this, "queue");
      __publicField(this, "processingIndexList");
      __publicField(this, "lockVer");
      __publicField(this, "restartId");
      __publicField(this, "maxWaitMS");
      __publicField(this, "minWaitMS");
      __publicField(this, "onFailedCallback");
      this.queue = queue;
      this.processingIndexList = [0];
      this.lockVer = 0;
      this.restartId;
      this.maxWaitMS = 1e3;
      this.minWaitMS = 300;
    }
    onFailed(cb) {
      this.onFailedCallback = cb;
    }
    start(lockVer) {
      if (this.lockVer != lockVer || !conf.autoLoad)
        return;
      if (this.processingIndexList.length === 0) {
        return;
      }
      if (this.queue.length === 0) {
        return;
      }
      evLog("空闲自加载启动:" + this.processingIndexList.toString());
      for (const processingIndex of this.processingIndexList) {
        const imgFetcher = this.queue[processingIndex];
        imgFetcher.onFinished("IDLE-REPORT", () => {
          this.wait().then(() => {
            this.checkProcessingIndex();
            this.start(lockVer);
          });
        });
        imgFetcher.onFailed("IDLE-REPORT", () => {
          this.wait().then(() => {
            this.checkProcessingIndex();
            this.start(lockVer);
          });
        });
        imgFetcher.start(processingIndex);
      }
    }
    checkProcessingIndex() {
      for (let i = 0; i < this.processingIndexList.length; i++) {
        let processingIndex = this.processingIndexList[i];
        const imf = this.queue[processingIndex];
        if (imf.lock || imf.stage === FetchState.URL) {
          continue;
        }
        let found = false;
        let hasFailed = imf.stage === FetchState.FAILED;
        for (let j = Math.min(processingIndex + 1, this.queue.length - 1), limit = this.queue.length; j < limit; j++) {
          const imf2 = this.queue[j];
          if (!imf2.lock && imf2.stage === FetchState.URL) {
            this.processingIndexList[i] = j;
            found = true;
            break;
          }
          if (imf2.stage === FetchState.FAILED) {
            hasFailed = true;
          }
          if (j >= this.queue.length - 1) {
            limit = processingIndex;
            j = 0;
          }
        }
        if (!found) {
          this.processingIndexList = [];
          if (hasFailed && this.onFailedCallback) {
            this.onFailedCallback();
            this.onFailedCallback = void 0;
          }
          return;
        }
      }
    }
    async wait() {
      const { maxWaitMS, minWaitMS } = this;
      return new Promise(function(resolve) {
        const time = Math.floor(Math.random() * maxWaitMS + minWaitMS);
        window.setTimeout(() => resolve(true), time);
      });
    }
    abort(newIndex) {
      this.lockVer++;
      evLog(`终止空闲自加载, 下次将从第${this.processingIndexList[0] + 1}张开始加载`);
      if (!conf.autoLoad)
        return;
      window.clearTimeout(this.restartId);
      this.restartId = window.setTimeout(() => {
        this.processingIndexList = [newIndex];
        this.checkProcessingIndex();
        this.start(this.lockVer);
      }, conf.restartIdleLoader);
    }
  }
  function modPageHelperPostion() {
    const style = HTML.pageHelper.style;
    conf.pageHelperAbTop = style.top;
    conf.pageHelperAbLeft = style.left;
    conf.pageHelperAbBottom = style.bottom;
    conf.pageHelperAbRight = style.right;
    saveConf(conf);
  }
  function modNumberConfigEvent(key, data) {
    var _a;
    const range = {
      colCount: [1, 12],
      threads: [1, 10],
      downloadThreads: [1, 10],
      timeout: [8, 40],
      autoPageInterval: [500, 9e4],
      preventScrollPageTime: [0, 9e4]
    };
    let mod = key === "autoPageInterval" ? 100 : 1;
    mod = key === "preventScrollPageTime" ? 10 : mod;
    if (data === "add") {
      if (conf[key] < range[key][1]) {
        conf[key] += mod;
      }
    } else if (data === "minus") {
      if (conf[key] > range[key][0]) {
        conf[key] -= mod;
      }
    }
    const inputElement = document.querySelector(`#${key}Input`);
    if (inputElement) {
      inputElement.value = conf[key].toString();
    }
    if (key === "colCount") {
      const cssRules = Array.from(((_a = HTML.styleSheel.sheet) == null ? void 0 : _a.cssRules) || []);
      for (const cssRule of cssRules) {
        if (cssRule instanceof CSSStyleRule) {
          if (cssRule.selectorText === ".fullViewPlane") {
            cssRule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
            break;
          }
        }
      }
    }
    saveConf(conf);
  }
  function modBooleanConfigEvent(key) {
    const inputElement = document.querySelector(`#${key}Checkbox`);
    conf[key] = (inputElement == null ? void 0 : inputElement.checked) || false;
    saveConf(conf);
  }
  function modSelectConfigEvent(key) {
    const inputElement = document.querySelector(`#${key}Select`);
    const value = inputElement == null ? void 0 : inputElement.value;
    if (value) {
      conf[key] = value;
      saveConf(conf);
    }
    if (key === "readMode") {
      BIFM.resetScaleBigImages();
      if (conf.readMode === "singlePage") {
        BIFM.init(IFQ.currIndex);
      }
    }
  }
  function mouseleavePlaneEvent(target) {
    target.classList.add("p-collapse");
  }
  function togglePlaneEvent(id, collapse) {
    setTimeout(() => {
      let element = document.querySelector(`#${id}Plane`);
      if (element) {
        if (collapse === false) {
          element.classList.remove("p-collapse");
        } else if (collapse === true) {
          mouseleavePlaneEvent(element);
        } else {
          element.classList.toggle("p-collapse");
          ["config", "downloader"].filter((k) => k !== id).forEach((k) => togglePlaneEvent(k, true));
        }
      }
    }, 10);
  }
  let bodyOverflow = document.body.style.overflow;
  function showFullViewPlane() {
    HTML.fullViewPlane.scroll(0, 0);
    HTML.fullViewPlane.classList.remove("collapse_full_view");
    HTML.fullViewPlane.focus();
    document.body.style.overflow = "hidden";
  }
  function hiddenFullViewPlaneEvent(event) {
    if (event.target === HTML.fullViewPlane) {
      main(true);
    }
  }
  function hiddenFullViewPlane() {
    var _a;
    hiddenBigImageEvent();
    HTML.fullViewPlane.classList.add("collapse_full_view");
    HTML.fullViewPlane.blur();
    (_a = document.querySelector("html")) == null ? void 0 : _a.focus();
    document.body.style.overflow = bodyOverflow;
  }
  function scrollEvent() {
    if (HTML.fullViewPlane.classList.contains("collapse_full_view"))
      return;
    PF.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
  }
  function hiddenBigImageEvent(event) {
    if (event && event.target && event.target.tagName === "SPAN")
      return;
    BIFM.hidden();
    HTML.pageHelper.classList.remove("p-minify");
    HTML.fullViewPlane.focus();
  }
  function bigImageWheelEvent(event) {
    stepImageEvent(event.deltaY > 0 ? "next" : "prev");
  }
  let numberRecord = null;
  function keyboardEvent(event) {
    if (!HTML.bigImageFrame.classList.contains("b-f-collapse")) {
      const b = HTML.bigImageFrame;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          stepImageEvent(conf.reversePages ? "next" : "prev");
          break;
        case "ArrowRight":
          event.preventDefault();
          stepImageEvent(conf.reversePages ? "prev" : "next");
          break;
        case "Escape":
        case "Enter":
          event.preventDefault();
          hiddenBigImageEvent();
          break;
        case "Home":
          event.preventDefault();
          IFQ.do(0, "next");
          break;
        case "End":
          event.preventDefault();
          IFQ.do(IFQ.length - 1, "prev");
          break;
        case " ":
        case "ArrowUp":
        case "ArrowDown":
        case "PageUp":
        case "PageDown":
          let oriented = "next";
          if (event.key === "ArrowUp" || event.key === "PageUp") {
            oriented = "prev";
          } else if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
            oriented = "next";
          }
          if (event.shiftKey) {
            oriented = oriented === "next" ? "prev" : "next";
          }
          BIFM.frame.addEventListener("scrollend", () => {
            if (conf.readMode === "singlePage" && BIFM.isReachBoundary(oriented)) {
              BIFM.tryPreventStep();
            }
          }, { once: true });
          if (BIFM.isReachBoundary(oriented)) {
            event.preventDefault();
            b.dispatchEvent(new WheelEvent("wheel", { deltaY: oriented === "prev" ? -1 : 1 }));
          }
          break;
        case "-":
          BIFM.scaleBigImages(-1, 5);
          break;
        case "=":
          BIFM.scaleBigImages(1, 5);
          break;
      }
    } else if (!HTML.fullViewPlane.classList.contains("collapse_full_view")) {
      switch (event.key) {
        case "Enter": {
          let start = IFQ.currIndex;
          if (numberRecord && numberRecord.length > 0) {
            start = Number(numberRecord.join("")) - 1;
            numberRecord = null;
            if (start < 0 || start >= IFQ.length) {
              break;
            }
          }
          IFQ[start].root.dispatchEvent(new MouseEvent("click"));
          break;
        }
        case "Escape":
          main(true);
          break;
        default: {
          if (event.key.length === 1 && event.key >= "0" && event.key <= "9") {
            numberRecord = numberRecord ? [...numberRecord, Number(event.key)] : [Number(event.key)];
          }
        }
      }
    } else {
      switch (event.key) {
        case "Enter":
          main(false);
          break;
      }
    }
  }
  function showBigImageEvent(event) {
    showBigImage(IFQ.findImgIndex(event.target));
  }
  function showBigImage(start) {
    BIFM.show();
    HTML.pageHelper.classList.add("p-minify");
    IFQ.do(start);
  }
  function stepImageEvent(oriented) {
    const start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
    IFQ.do(start, oriented);
  }
  function showGuideEvent() {
    const guideElement = document.createElement("div");
    document.body.after(guideElement);
    guideElement.innerHTML = `
  <div style="width: 50vw; min-height: 300px; border: 1px solid black; background-color: rgba(255, 255, 255, 0.8); font-weight: bold; line-height: 30px">${i18n.help.get()}</div>
  `;
    guideElement.setAttribute(
      "style",
      `
position: absolute;
width: 100%;
height: 100%;
background-color: #363c3c78;
z-index: 2004;
top: 0;
display: flex;
justify-content: center;
align-items: center;
color: black;
text-align: left;
`
    );
    guideElement.addEventListener("click", () => guideElement.remove());
  }
  const events = {
    modNumberConfigEvent,
    modBooleanConfigEvent,
    modSelectConfigEvent,
    modPageHelperPostion,
    togglePlaneEvent,
    showFullViewPlane,
    hiddenFullViewPlaneEvent,
    hiddenFullViewPlane,
    scrollEvent,
    hiddenBigImageEvent,
    bigImageWheelEvent,
    keyboardEvent,
    showBigImageEvent,
    showBigImage,
    stepImageEvent,
    showGuideEvent,
    mouseleavePlaneEvent
  };
  class PageFetcher {
    constructor(queue, idleLoader, matcher2) {
      __publicField(this, "queue");
      __publicField(this, "pageURLs");
      __publicField(this, "currPage");
      __publicField(this, "idleLoader");
      __publicField(this, "fetched");
      __publicField(this, "imgAppends");
      __publicField(this, "matcher");
      __publicField(this, "done", false);
      this.queue = queue;
      this.idleLoader = idleLoader;
      this.pageURLs = [];
      this.currPage = 0;
      this.imgAppends = { prev: [], next: [] };
      this.fetched = false;
      this.matcher = matcher2;
    }
    async init() {
      await this.initPageAppend();
    }
    async initPageAppend() {
      let fetchIter = this.matcher.fetchPagesSource();
      let first = await fetchIter.next();
      if (!first.done) {
        await this.appendPageImg(first.value, "next");
        setTimeout(() => this.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight), 200);
      }
      this.loadAllPageImg(fetchIter);
    }
    async loadAllPageImg(iter) {
      for await (const page of iter) {
        await this.appendPageImg(page, "next");
        this.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
      }
      this.done = true;
    }
    async appendPageImg(page, oriented) {
      try {
        const imgNodeList = await this.obtainImageNodeList(page);
        const IFs = imgNodeList.map(
          (imgNode) => new IMGFetcher(imgNode, this.matcher)
        );
        switch (oriented) {
          case "prev":
            HTML.fullViewPlane.firstElementChild.nextElementSibling.after(
              ...imgNodeList
            );
            const len = this.queue.length;
            this.queue.unshift(...IFs);
            if (len > 0) {
              this.idleLoader.processingIndexList[0] += IFs.length;
              const { root } = this.queue[this.idleLoader.processingIndexList[0]];
              HTML.fullViewPlane.scrollTo(0, root.offsetTop);
            }
            break;
          case "next":
            HTML.fullViewPlane.lastElementChild.after(...imgNodeList);
            this.queue.push(...IFs);
            break;
        }
        updatePageHelper("updateTotal", this.queue.length.toString());
        return true;
      } catch (error) {
        evLog(`从下一页或上一页中提取图片元素时出现了错误！`, error);
        return false;
      }
    }
    //从文档的字符串中创建缩略图元素列表
    async obtainImageNodeList(page) {
      const imgNodeTemplate = document.createElement("div");
      imgNodeTemplate.classList.add("img-node");
      const imgTemplate = document.createElement("img");
      imgTemplate.setAttribute("decoding", "async");
      imgTemplate.setAttribute("title", "untitle.jpg");
      imgTemplate.style.height = "auto";
      imgTemplate.setAttribute(
        "src",
        "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      imgNodeTemplate.appendChild(imgTemplate);
      let tryTimes = 0;
      while (tryTimes < 3) {
        try {
          const list = await this.matcher.parseImgNodes(page, imgNodeTemplate);
          list.forEach((imgNode) => {
            imgNode.addEventListener("click", events.showBigImageEvent);
          });
          return list;
        } catch (error) {
          evLog("warn: parse image nodes failed, retrying: ", error);
          tryTimes++;
        }
      }
      evLog("warn: parse image nodes failed: reached max try times!");
      return [];
    }
    //通过地址请求该页的文档
    async fetchDocument(pageURL) {
      return await window.fetch(pageURL).then((response) => response.text());
    }
    /**
     *当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
     * @param {当前滚动位置} currTop
     * @param {窗口高度} clientHeight
     */
    renderCurrView(currTop, clientHeight) {
      const [startRander, endRander] = this.findOutsideRoundView(currTop, clientHeight);
      evLog(`要渲染的范围是:${startRander + 1}-${endRander + 1}`);
      this.queue.slice(startRander, endRander + 1).forEach((imgFetcher) => imgFetcher.render());
    }
    findOutsideRoundViewNode(currTop, clientHeight) {
      const [outsideTop, outsideBottom] = this.findOutsideRoundView(currTop, clientHeight);
      return [this.queue[outsideTop].root, this.queue[outsideBottom].root];
    }
    findOutsideRoundView(currTop, clientHeight) {
      const viewButtom = currTop + clientHeight;
      let outsideTop = 0;
      let outsideBottom = 0;
      for (let i = 0; i < this.queue.length; i += conf.colCount) {
        const { root } = this.queue[i];
        if (outsideBottom === 0) {
          if (root.offsetTop + 2 >= currTop) {
            outsideBottom = i + 1;
          } else {
            outsideTop = i;
          }
        } else {
          outsideBottom = i;
          if (root.offsetTop + root.offsetHeight > viewButtom) {
            break;
          }
        }
      }
      return [outsideTop, Math.min(outsideBottom + conf.colCount, this.queue.length - 1)];
    }
  }
  const regulars = {
    /** 有压缩的大图地址 */
    normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
    /** 原图地址 */
    original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai\.org\/fullimg?[^"\\]*)\"\>/,
    /** 大图重载地址 */
    nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
    /** 是否开启自动多页查看器 */
    isMPV: /https?:\/\/e[-x]hentai.org\/mpv\/\w+\/\w+\/#page\w/,
    /** 多页查看器图片列表提取 */
    mpvImageList: /\{"n":"(.*?)","k":"(\w+)","t":"(.*?)".*?\}/g
  };
  class EHMatcher {
    parseGalleryMeta(doc) {
      const titleList = doc.querySelectorAll("#gd2 h1");
      let title;
      let originTitle;
      if (titleList && titleList.length > 0) {
        title = titleList[0].textContent || void 0;
        if (titleList.length > 1) {
          originTitle = titleList[1].textContent || void 0;
        }
      }
      const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
      meta.originTitle = originTitle;
      const tagTrList = doc.querySelectorAll("#taglist tr");
      const tags = {};
      tagTrList.forEach((tr) => {
        const tds = tr.childNodes;
        const cat = tds[0].textContent;
        if (cat) {
          const list = [];
          tds[1].childNodes.forEach((ele) => {
            if (ele.textContent)
              list.push(ele.textContent);
          });
          tags[cat.replace(":", "")] = list;
        }
      });
      meta.tags = tags;
      return meta;
    }
    async matchImgURL(url, retry) {
      return await this.fetchImgURL(url, retry);
    }
    async parseImgNodes(page, template) {
      var _a;
      const list = [];
      let doc = await (async () => {
        if (page.raw instanceof Document) {
          return page.raw;
        } else {
          const raw = await window.fetch(page.raw).then((response) => response.text());
          if (!raw)
            return null;
          const domParser = new DOMParser();
          return domParser.parseFromString(raw, "text/html");
        }
      })();
      if (!doc) {
        throw new Error("warn: eh matcher failed to get document from source page!");
      }
      const nodes = doc.querySelectorAll("#gdt a");
      if (!nodes || nodes.length == 0) {
        throw new Error("warn: failed query image nodes!");
      }
      const node0 = nodes[0];
      const href = node0.getAttribute("href");
      if (regulars.isMPV.test(href)) {
        const mpvDoc = await window.fetch(href).then((response) => response.text());
        const matchs = mpvDoc.matchAll(regulars.mpvImageList);
        const gid = location.pathname.split("/")[2];
        let i = 0;
        for (const match of matchs) {
          i++;
          const newImgNode = template.cloneNode(true);
          const newImg = newImgNode.firstElementChild;
          newImg.setAttribute("title", match[1].replace(/Page\s\d+[:_]\s*/, ""));
          newImg.setAttribute(
            "ahref",
            `${location.origin}/s/${match[2]}/${gid}-${i}`
          );
          newImg.setAttribute("asrc", match[3].replaceAll("\\", ""));
          list.push(newImgNode);
        }
      } else {
        for (const node of Array.from(nodes)) {
          const imgNode = node.querySelector("img");
          if (!imgNode) {
            throw new Error("Cannot find Image");
          }
          const newImgNode = template.cloneNode(true);
          const newImg = newImgNode.firstElementChild;
          newImg.setAttribute("ahref", node.getAttribute("href"));
          newImg.setAttribute("asrc", imgNode.src);
          newImg.setAttribute("title", ((_a = imgNode.getAttribute("title")) == null ? void 0 : _a.replace(/Page\s\d+[:_]\s*/, "")) || "untitle.jpg");
          list.push(newImgNode);
        }
      }
      return list;
    }
    async *fetchPagesSource() {
      var _a;
      let fristHref = (_a = document.querySelector(".gdtl a")) == null ? void 0 : _a.getAttribute("href");
      if (fristHref && regulars.isMPV.test(fristHref)) {
        yield { raw: window.location.href, typ: "url" };
        return;
      }
      const ps = Array.from(document.querySelectorAll(".gtb td a"));
      if (ps.length === 0) {
        throw new Error("未获取到分页元素！");
      }
      const lastP = ps[ps.length - 2];
      if (!lastP) {
        throw new Error("未获取到分页元素！x2");
      }
      const u = new URL(lastP.getAttribute("href"));
      const total = Number(u.searchParams.get("p")) + 1;
      u.searchParams.delete("p");
      yield { raw: u.href, typ: "url" };
      for (let p = 1; p < total; p++) {
        u.searchParams.set("p", p.toString());
        yield { raw: u.href, typ: "url" };
      }
    }
    async fetchImgURL(url, originChanged) {
      let text = "";
      try {
        text = await window.fetch(url).then((resp) => resp.text());
        if (!text)
          throw new Error("[text] is empty");
      } catch (error) {
        throw new Error(`Fetch source page error, expected [text]！ ${error}`);
      }
      if (conf.fetchOriginal) {
        const matchs = regulars.original.exec(text);
        if (matchs && matchs.length > 0) {
          return matchs[1].replace(/&amp;/g, "&");
        } else {
          const normalMatchs = regulars["normal"].exec(text);
          if (normalMatchs == null || normalMatchs.length == 0) {
            throw new Error(`Cannot matching the image url, content: ${text}`);
          } else {
            return normalMatchs[1];
          }
        }
      }
      if (originChanged) {
        const nlValue = regulars.nlValue.exec(text)[1];
        const newUrl = url + ((url + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
        evLog(`IMG-FETCHER retry url:${newUrl}`);
        return await this.fetchImgURL(url, false);
      } else {
        return regulars.normal.exec(text)[1];
      }
    }
  }
  class HitomiGG {
    constructor(b, m) {
      __publicField(this, "base", "a");
      __publicField(this, "ext", "webp");
      __publicField(this, "b");
      __publicField(this, "m");
      this.b = b;
      this.m = new Function("g", m);
    }
    s(h) {
      const m = /(..)(.)$/.exec(h);
      return parseInt(m[2] + m[1], 16).toString(10);
    }
    subdomain_from_url(url, base) {
      var retval = "b";
      if (base) {
        retval = base;
      }
      var b = 16;
      var r = /\/[0-9a-f]{61}([0-9a-f]{2})([0-9a-f])/;
      var m = r.exec(url);
      if (!m) {
        return "a";
      }
      let g = parseInt(m[2] + m[1], b);
      if (!isNaN(g)) {
        retval = String.fromCharCode(97 + this.m(g)) + retval;
      }
      return retval;
    }
    url(hash) {
      let url = "https://a.hitomi.la/" + this.ext + "/" + this.b + this.s(hash) + "/" + hash + "." + this.ext;
      url = url.replace(/\/\/..?\.hitomi\.la\//, "//" + this.subdomain_from_url(url, this.base) + ".hitomi.la/");
      return url;
    }
  }
  const HASH_REGEX = /#(\d*)$/;
  const GG_M_REGEX = /m:\sfunction\(g\)\s{(.*?return.*?;)/gms;
  const GG_B_REGEX = /b:\s'(\d*\/)'/;
  class HitomiMather {
    constructor() {
      __publicField(this, "gg");
      __publicField(this, "meta");
      __publicField(this, "info");
    }
    async matchImgURL(hash, _) {
      const url = this.gg.url(hash);
      return url;
    }
    async parseImgNodes(page, template) {
      if (!this.info) {
        throw new Error("warn: hitomi gallery info is null!");
      }
      const list = [];
      const doc = page.raw;
      const nodes = doc.querySelectorAll(".simplePagerContainer .thumbnail-container a");
      if (!nodes || nodes.length == 0) {
        throw new Error("warn: failed query image nodes!");
      }
      for (const node of Array.from(nodes)) {
        const sceneIndex = Number(HASH_REGEX.exec(node.href)[1]) - 1;
        const img = node.querySelector("img");
        if (!img) {
          throw new Error("warn: failed query image node!");
        }
        const src = img.src;
        if (!src) {
          throw new Error(`warn: failed get Image Src`);
        }
        const badge = (() => {
          const badge2 = node.querySelector(".badge");
          return badge2 ? Number(badge2.textContent) : 1;
        })();
        for (let i = 0; i < badge; i++) {
          const newImgNode = template.cloneNode(true);
          const newImg = newImgNode.firstElementChild;
          newImg.setAttribute("ahref", this.info.files[i + sceneIndex].hash);
          newImg.setAttribute("asrc", src);
          newImg.setAttribute("title", this.info.files[i + sceneIndex].name);
          list.push(newImgNode);
        }
      }
      return list;
    }
    async *fetchPagesSource() {
      var _a, _b, _c;
      const ggRaw = await window.fetch("https://ltn.hitomi.la/gg.js").then((resp) => resp.text());
      this.gg = new HitomiGG(GG_B_REGEX.exec(ggRaw)[1], GG_M_REGEX.exec(ggRaw)[1]);
      const galleryID = (_c = (_b = (_a = document.querySelector("#gallery-brand a")) == null ? void 0 : _a.href) == null ? void 0 : _b.split("/").pop()) == null ? void 0 : _c.replace(".html", "");
      if (!galleryID) {
        throw new Error("cannot query hitomi gallery id");
      }
      const infoRaw = await window.fetch(`https://ltn.hitomi.la/galleries/${galleryID}.js`).then((resp) => resp.text()).then((text) => text.replace("var galleryinfo = ", ""));
      if (!infoRaw) {
        throw new Error("cannot query hitomi gallery info");
      }
      const info = JSON.parse(infoRaw);
      this.setGalleryMeta(info, galleryID);
      this.info = {
        files: info.files,
        scene_indexes: info.scene_indexes
      };
      yield { raw: document, typ: "doc" };
    }
    setGalleryMeta(info, galleryID) {
      this.meta = new GalleryMeta(window.location.href, info["title"] || "hitomi-" + galleryID);
      this.meta.originTitle = info["japanese_title"];
      const excludes = ["scene_indexes", "files"];
      for (const key in info) {
        if (excludes.indexOf(key) > -1) {
          continue;
        }
        this.meta.tags[key] = info[key];
      }
    }
    parseGalleryMeta(_) {
      return this.meta || new GalleryMeta(window.location.href, "hitomi");
    }
  }
  const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
  class NHMatcher {
    parseGalleryMeta(doc) {
      let title;
      let originTitle;
      doc.querySelectorAll("#info .title").forEach((ele) => {
        if (!title) {
          title = ele.textContent || void 0;
        } else {
          originTitle = ele.textContent || void 0;
        }
      });
      const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
      meta.originTitle = originTitle;
      const tagTrList = doc.querySelectorAll(".tag-container");
      const tags = {};
      tagTrList.forEach((tr) => {
        var _a, _b;
        const cat = (_b = (_a = tr.firstChild) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim().replace(":", "");
        if (cat) {
          const list = [];
          tr.querySelectorAll(".tag .name").forEach((tag) => {
            var _a2;
            const t = (_a2 = tag.textContent) == null ? void 0 : _a2.trim();
            if (t) {
              list.push(t);
            }
          });
          if (list.length > 0) {
            tags[cat] = list;
          }
        }
      });
      meta.tags = tags;
      return meta;
    }
    async matchImgURL(url, _) {
      let text = "";
      try {
        text = await window.fetch(url).then((resp) => resp.text());
        if (!text)
          throw new Error("[text] is empty");
      } catch (error) {
        throw new Error(`Fetch source page error, expected [text]！ ${error}`);
      }
      return NH_IMG_URL_REGEX.exec(text)[1];
    }
    async parseImgNodes(page, template) {
      const list = [];
      const nodes = page.raw.querySelectorAll(".thumb-container > .gallerythumb");
      if (!nodes || nodes.length == 0) {
        throw new Error("warn: failed query image nodes!");
      }
      let i = 0;
      for (const node of Array.from(nodes)) {
        i++;
        const imgNode = node.querySelector("img");
        if (!imgNode) {
          throw new Error("Cannot find Image");
        }
        const newImgNode = template.cloneNode(true);
        const newImg = newImgNode.firstElementChild;
        newImg.setAttribute("ahref", location.origin + node.getAttribute("href"));
        newImg.setAttribute("asrc", imgNode.getAttribute("data-src"));
        newImg.setAttribute("title", imgNode.getAttribute("title") || `${i}.jpg`);
        list.push(newImgNode);
      }
      return list;
    }
    async *fetchPagesSource() {
      yield { raw: document, typ: "doc" };
    }
  }
  const STEAM_THUMB_IMG_URL_REGEX = /background-image:\surl\(.*?(h.*\/).*?\)/;
  class SteamMatcher {
    async matchImgURL(url, _) {
      var _a;
      let raw = "";
      try {
        raw = await window.fetch(url).then((resp) => resp.text());
        if (!raw)
          throw new Error("[text] is empty");
      } catch (error) {
        throw new Error(`Fetch source page error, expected [text]！ ${error}`);
      }
      const domParser = new DOMParser();
      const doc = domParser.parseFromString(raw, "text/html");
      let imgURL = (_a = doc.querySelector(".actualmediactn > a")) == null ? void 0 : _a.getAttribute("href");
      if (!imgURL) {
        throw new Error("Cannot Query Steam original Image URL");
      }
      return imgURL;
    }
    async parseImgNodes(page, template) {
      var _a;
      const list = [];
      const doc = await (async () => {
        if (page.raw instanceof Document) {
          return page.raw;
        } else {
          const raw = await window.fetch(page.raw).then((response) => response.text());
          if (!raw)
            return null;
          const domParser = new DOMParser();
          return domParser.parseFromString(raw, "text/html");
        }
      })();
      if (!doc) {
        throw new Error("warn: steam matcher failed to get document from source page!");
      }
      const nodes = doc.querySelectorAll(".profile_media_item");
      if (!nodes || nodes.length == 0) {
        throw new Error("warn: failed query image nodes!");
      }
      for (const node of Array.from(nodes)) {
        const src = (_a = STEAM_THUMB_IMG_URL_REGEX.exec(node.innerHTML)) == null ? void 0 : _a[1];
        if (!src) {
          throw new Error(`Cannot Match Steam Image URL, Content: ${node.innerHTML}`);
        }
        const newImgNode = template.cloneNode(true);
        const newImg = newImgNode.firstElementChild;
        newImg.setAttribute("ahref", node.getAttribute("href"));
        newImg.setAttribute("asrc", src);
        newImg.setAttribute("title", node.getAttribute("data-publishedfileid") + ".jpg");
        list.push(newImgNode);
      }
      return list;
    }
    async *fetchPagesSource() {
      let totalPages = -1;
      document.querySelectorAll(".pagingPageLink").forEach((ele) => {
        totalPages = Number(ele.textContent);
      });
      let url = new URL(window.location.href);
      url.searchParams.set("view", "grid");
      if (totalPages === -1) {
        const doc = await window.fetch(url.href).then((response) => response.text()).then((text) => new DOMParser().parseFromString(text, "text/html")).catch(() => null);
        if (!doc) {
          throw new Error("warn: steam matcher failed to get document from source page!");
        }
        doc.querySelectorAll(".pagingPageLink").forEach((ele) => {
          totalPages = Number(ele.textContent);
        });
      }
      if (totalPages > 0) {
        for (let p = 1; p <= totalPages; p++) {
          url.searchParams.set("p", p.toString());
          yield { raw: url.href, typ: "url" };
        }
      } else {
        yield { raw: url.href, typ: "url" };
      }
    }
    parseGalleryMeta(_) {
      const url = new URL(window.location.href);
      let appid = url.searchParams.get("appid");
      return new GalleryMeta(window.location.href, "steam-" + appid || "all");
    }
  }
  function adaptMatcher() {
    const host = window.location.host;
    if (host === "nhentai.net") {
      return new NHMatcher();
    }
    if (host === "steamcommunity.com") {
      return new SteamMatcher();
    }
    if (host === "hitomi.la") {
      return new HitomiMather();
    }
    return new EHMatcher();
  }
  class DownloaderCanvas {
    constructor(id, queue) {
      __publicField(this, "canvas");
      __publicField(this, "mousemoveState");
      __publicField(this, "ctx");
      __publicField(this, "queue");
      __publicField(this, "rectSize");
      __publicField(this, "rectGap");
      __publicField(this, "columns");
      __publicField(this, "padding");
      __publicField(this, "scrollTop");
      __publicField(this, "scrollSize");
      __publicField(this, "debouncer");
      this.queue = queue;
      const canvas = document.getElementById(id);
      if (!canvas) {
        throw new Error("canvas not found");
      }
      this.canvas = canvas;
      this.canvas.addEventListener(
        "wheel",
        (event) => this.onwheel(event.deltaY)
      );
      this.mousemoveState = { x: 0, y: 0 };
      this.canvas.addEventListener("mousemove", (event) => {
        this.mousemoveState = { x: event.offsetX, y: event.offsetY };
        this.drawDebouce();
      });
      this.canvas.addEventListener("click", (event) => {
        var _a, _b;
        this.mousemoveState = { x: event.offsetX, y: event.offsetY };
        const index = (_b = (_a = this.computeDrawList()) == null ? void 0 : _a.find(
          (state) => state.selected
        )) == null ? void 0 : _b.index;
        if (index !== void 0) {
          events.showBigImage(index);
        }
      });
      this.ctx = this.canvas.getContext("2d");
      this.rectSize = 12;
      this.rectGap = 6;
      this.columns = 15;
      this.padding = 7;
      this.scrollTop = 0;
      this.scrollSize = 10;
      this.debouncer = new Debouncer();
      const parent = this.canvas.parentElement;
      if (parent) {
        parent.addEventListener("transitionend", (ev) => {
          const ele = ev.target;
          if (ele.clientHeight > 0) {
            this.canvas.width = Math.floor(ele.offsetWidth - 20);
            this.canvas.height = Math.floor(ele.offsetHeight * 0.8);
            this.columns = Math.ceil((this.canvas.width - this.padding * 2 - this.rectGap) / (this.rectSize + this.rectGap));
            this.draw();
          }
        });
      }
    }
    onwheel(deltaY) {
      const [_, h] = this.getWH();
      const clientHeight = this.computeClientHeight();
      if (clientHeight > h) {
        deltaY = deltaY >> 1;
        this.scrollTop += deltaY;
        if (this.scrollTop < 0)
          this.scrollTop = 0;
        if (this.scrollTop + h > clientHeight + 20)
          this.scrollTop = clientHeight - h + 20;
        this.draw();
      }
    }
    drawDebouce() {
      this.debouncer.addEvent("DOWNLOADER-DRAW", () => this.draw(), 20);
    }
    computeDrawList() {
      const list = [];
      const [_, h] = this.getWH();
      const startX = this.computeStartX();
      const startY = -this.scrollTop + this.padding;
      for (let i = 0, row = -1; i < this.queue.length; i++) {
        const currCol = i % this.columns;
        if (currCol == 0) {
          row++;
        }
        const atX = startX + (this.rectSize + this.rectGap) * currCol;
        const atY = startY + (this.rectSize + this.rectGap) * row;
        if (atY + this.rectSize < 0) {
          continue;
        }
        if (atY > h) {
          break;
        }
        list.push({
          index: i,
          x: atX,
          y: atY,
          selected: this.isSelected(atX, atY)
        });
      }
      return list;
    }
    // this function should be called by drawDebouce
    draw() {
      const [w, h] = this.getWH();
      this.ctx.clearRect(0, 0, w, h);
      const drawList = this.computeDrawList();
      for (const node of drawList) {
        this.drawSmallRect(
          node.x,
          node.y,
          this.queue[node.index],
          node.index === this.queue.currIndex,
          node.selected
        );
      }
    }
    computeClientHeight() {
      return Math.ceil(this.queue.length / this.columns) * (this.rectSize + this.rectGap) - this.rectGap;
    }
    scrollTo(index) {
      const clientHeight = this.computeClientHeight();
      const [_, h] = this.getWH();
      if (clientHeight <= h) {
        return;
      }
      const rowNo = Math.ceil((index + 1) / this.columns);
      const offsetY = (rowNo - 1) * (this.rectSize + this.rectGap);
      if (offsetY > h) {
        this.scrollTop = offsetY + this.rectSize - h;
        const maxScrollTop = clientHeight - h + 20;
        if (this.scrollTop + 20 <= maxScrollTop) {
          this.scrollTop += 20;
        }
      }
    }
    isSelected(atX, atY) {
      return this.mousemoveState.x - atX >= 0 && this.mousemoveState.x - atX <= this.rectSize && this.mousemoveState.y - atY >= 0 && this.mousemoveState.y - atY <= this.rectSize;
    }
    computeStartX() {
      const [w, _] = this.getWH();
      const drawW = (this.rectSize + this.rectGap) * this.columns - this.rectGap;
      let startX = w - drawW >> 1;
      return startX;
    }
    drawSmallRect(x, y, imgFetcher, isCurr, isSelected) {
      switch (imgFetcher.stage) {
        case FetchState.FAILED:
          this.ctx.fillStyle = "rgba(250, 50, 20, 0.9)";
          break;
        case FetchState.URL:
          this.ctx.fillStyle = "rgba(200, 200, 200, 0.1)";
          break;
        case FetchState.DATA:
          const percent = imgFetcher.downloadState.loaded / imgFetcher.downloadState.total;
          this.ctx.fillStyle = `rgba(110, ${Math.ceil(
          percent * 200
        )}, 120, ${Math.max(percent, 0.1)})`;
          break;
        case FetchState.DONE:
          this.ctx.fillStyle = "rgb(110, 200, 120)";
          break;
      }
      this.ctx.fillRect(x, y, this.rectSize, this.rectSize);
      this.ctx.shadowColor = "#d53";
      if (isSelected) {
        this.ctx.strokeStyle = "rgb(60, 20, 200)";
        this.ctx.lineWidth = 2;
      } else if (isCurr) {
        this.ctx.strokeStyle = "rgb(255, 60, 20)";
        this.ctx.lineWidth = 2;
      } else {
        this.ctx.strokeStyle = "rgb(90, 90, 90)";
        this.ctx.lineWidth = 1;
      }
      this.ctx.strokeRect(x, y, this.rectSize, this.rectSize);
    }
    getWH() {
      return [this.canvas.width, this.canvas.height];
    }
  }
  function loadStyleSheel() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    const style = document.createElement("style");
    const css = `
.fullViewPlane {
  width: 100vw;
  height: 100vh;
  background-color: rgb(0, 0, 0);
  position: fixed;
  top: 0px;
  right: 0px;
  z-index: 1000;
  overflow: hidden scroll;
  transition: height 0.4s ease 0s;
  display: grid;
  align-content: start;
  grid-gap: 0.7rem;
  grid-template-columns: repeat(${conf.colCount}, 1fr);
}
.fullViewPlane input, .fullViewPlane select {
  color: #f1f1f1;
  background-color: #34353b !important;
  color-scheme: dark;
  outline: none;
  border: 1px solid #000000;
  border-radius: 4px;
  margin: 0px;
  padding: 0px;
  text-align: center;
  position: unset !important;
  top: unset !important;
  vertical-align: middle;
}
.p-label {
  cursor: pointer;
}
.fullViewPlane .img-node {
  position: relative;
}
.fullViewPlane .img-node img {
  width: 100%;
  border: 2px solid white;
  box-sizing: border-box;
}
.collapse_full_view {
  height: 0;
  transition: height 0.4s;
}
.bigImageFrame::-webkit-scrollbar {
  display: none;
}
.bigImageFrame {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  right: 0;
  /*overflow: hidden scroll;*/
  overflow: auto;
  z-index: 1001;
  background-color: #000000d6;
  transition: width 0.4s;
  scrollbar-width: none;
}
.bigImageFrame > img {
  object-fit: contain;
  /* border-bottom: 1px solid #ffffff; */
  display: block;
  margin: 0 auto;
}
.pageHelper {
  position: fixed;
  display: flex !important;
  justify-content: space-between;
  background-color: #4a4a4ae6;
  z-index: 2011 !important;
  box-sizing: border-box;
  font-weight: bold;
  color: #fff;
  transition: min-width 0.4s ease;
  min-width: 0px;
}
.pageHelper .plane {
  z-index: 1010 !important;
  background-color: rgba(38, 20, 25, 0.8);
  box-sizing: border-box;
  position: absolute;
  color: rgb(200, 222, 200);
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: width 0.4s ease 0s, height 0.4s ease 0s;
  padding: 3px;
}
@media (min-width: ${isMobile ? "1440px" : "720px"}) {
  .pageHelper.pageHelperExtend {
    min-width: 24rem;
    transition: min-width 0.4s ease;
    font-size: 1rem;
    line-height: 1.2rem;
  }
  .pageHelper {
    top: ${conf.pageHelperAbTop};
    left: ${conf.pageHelperAbLeft};
    bottom: ${conf.pageHelperAbBottom};
    right: ${conf.pageHelperAbRight};
    font-size: 1rem;
    line-height: 1.2rem;
  }
  .pageHelper .plane {
    width: 24rem;
    height: 25rem;
    bottom: 1.3rem;
  }
  .pageHelper .p-btn {
    height: 1.5rem;
    width: 1.5rem;
    border: 1px solid #000000;
    border-radius: 4px;
  }
  .pageHelperExtend .b-main {
    max-width: 24rem !important;
  }
  .fullViewPlane input[type="checkbox"] {
    width: 1rem;
    height: unset !important;
  }
  .fullViewPlane select {
    width: 7rem !important;
  }
  .fullViewPlane input, .fullViewPlane select {
    width: 2rem;
    height: 1.5rem;
  }
  .pageHelper .p-config {
    line-height: 2rem;
  }
  #imgScaleResetBTN {
    width: 4rem;
  }
}
@media (max-width: ${isMobile ? "1440px" : "720px"}) {
  .pageHelper.pageHelperExtend {
    min-width: 100vw;
    transition: min-width 0.4s ease;
    font-size: 4.2cqw;
    line-height: 5cqw;
  }
  .pageHelper {
    bottom: 0px;
    left: 0px;
    font-size: 8cqw;
    line-height: 8.1cqw;
  }
  .pageHelper .plane {
    width: 100vw;
    height: 60vh;
    bottom: 5.7cqw;
  }
  .pageHelper .p-btn {
    height: 6cqw;
    width: 6cqw;
    border: 0.4cqw solid #000000;
    border-radius: 1cqw;
  }
  .pageHelperExtend .b-main {
    max-width: 100vw !important;
  }
  .fullViewPlane input[type="checkbox"] {
    width: 4cqw;
    height: unset !important;
  }
  .fullViewPlane select {
    width: 25cqw !important;
  }
  .fullViewPlane input, .fullViewPlane select {
    width: 9cqw;
    height: 6cqw;
    font-size: 3cqw;
  }
  .pageHelper .p-config {
    line-height: 9cqw;
  }
  #imgScaleResetBTN {
    width: 14cqw;
  }
}
.p-minify:not(:hover) {
  min-width: 0px !important;
}
.p-minify:not(:hover) .b-main {
  width: auto;
}
.p-minify:not(:hover) .b-main > :not(.b-m-page) {
  display: none;
}
.pageHelper:hover {
  background-color: #3a3a3ae6;
}
.pageHelper .clickable {
  text-decoration-line: underline;
  z-index: 1111;
  user-select: none;
  text-align: center;
}
.clickable:hover {
  color: #90ea90 !important;
}
.pageHelper .p-img-scale {
  display: flex;
}
.p-img-scale .scale-btn {
  width: 2rem;
  text-align: center;
  user-select: none;
}
.p-img-scale .scale-btn:hover {
  color: white;
  background-color: rgb(255, 200, 200);
}
.p-img-scale .scale-status {
  width: 40px;
  white-space: nowrap;
  overflow: hidden;
  text-align: center;
}
.p-img-scale .scale-progress {
  flex-grow: 1;
  display: flex;
  align-items: center;
}
.scale-progress .scale-progress-inner {
  height: 50%;
  background-color: #ffffffa0;
}
.p-collapse {
  height: 0px !important;
  transition: height 0.4s;
  padding: 0px !important;
}
.pageHelper .b-main {
  max-width: 0px;
  overflow: hidden !important;
  display: flex;
  justify-content: space-between;
  white-space: nowrap !important;
  transition: flex-grow 0.6s ease, max-width 0.5s ease;
}
.pageHelperExtend .b-main {
  flex-grow: 1;
  transition: flex-grow 0.6s ease, max-width 0.5s ease;
}
.pageHelper .p-config {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  align-content: start;
}
.pageHelper .p-config label {
  display: flex;
  justify-content: space-between;
  padding-right: 10px;
}
.pageHelper .p-config input {
  cursor: ns-resize;
}
.pageHelper .p-downloader {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
.p-downloader canvas {
  /* border: 1px solid greenyellow; */
}
.p-downloader .download-notice {
  font-size: small;
  text-align: center;
  width: 100%;
}
.p-downloader .downloader-btn-group {
  align-items: center;
  text-align: right;
  width: 100%;
}
.pageHelper .p-btn {
  color: rgb(255, 255, 255);
  cursor: pointer;
  font-weight: 900;
  background: rgb(81, 81, 81);
  vertical-align: middle;
}
.fetched {
  border: 2px solid #602a5c !important;
}
.fetch-failed {
  border: 2px solid red !important;
}
.fetching {
  padding: 2px;
  border: none !important;
  animation: 1s linear infinite cco;
  -webkit-animation: 1s linear infinite cco;
}
.pageHelperFetching {
  border: none !important;
  animation: 1s linear infinite cco;
  -webkit-animation: 1s linear infinite cco;
}
@keyframes cco {
  0% {
    background-color: #f00;
  }
  50% {
    background-color: #48ff00;
  }
  100% {
    background-color: #ae00ff;
  }
}
@keyframes main-progress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}
.b-f-collapse {
  width: 0px !important;
  transition: width 0.4s;
}
.downloadBar {
  background-color: rgba(100, 100, 100, 0.8);
  height: 0.5rem;
  width: 100%;
  position: absolute;
  bottom: 0;
}
.imgLandLeft, .imgLandRight {
  height: 100%;
  position: fixed;
  z-index: 1004;
}
.imgLandLeft {
  left: 0;
  top: 0;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.imgLandRight {
  right: 0;
  top: 0;
  cursor: url("https://exhentai.org/img/n.png"), auto;
}
.imgLandTop, .imgLandBottom {
  left: 0px;
  width: 100%;
  position: fixed;
  z-index: 1005;
}
.imgLandTop {
  top: 0;
  z-index: 1005;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.imgLandBottom {
  bottom: 0;
  z-index: 1005;
  cursor: url("https://exhentai.org/img/b.png"), auto;
}
.imgLandTop, .imgLandBottom {
  height: 30%;
}
.imgLandLeft, .imgLandRight {
  width: 30%;
}
.p-tooltip {
  border-bottom: 1px dotted black;
}
.p-tooltip .p-tooltiptext {
  visibility: hidden;
  width: 100%;
  top: 0px;
  right: 0px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  font-size: small;
  white-space: normal;
}
.p-tooltip:hover .p-tooltiptext {
  visibility: visible;
}
`;
    style.textContent = css;
    document.head.appendChild(style);
    const githubButtonScript = document.createElement("script");
    githubButtonScript.src = "https://buttons.github.io/buttons.js";
    githubButtonScript.async = true;
    githubButtonScript.defer = true;
    document.head.appendChild(githubButtonScript);
    return style;
  }
  function createHTML() {
    const fullViewPlane = document.createElement("div");
    fullViewPlane.setAttribute("tabindex", "0");
    fullViewPlane.classList.add("fullViewPlane");
    fullViewPlane.classList.add("collapse_full_view");
    document.body.after(fullViewPlane);
    const HTML_STRINGS = `
 <div id="bigImageFrame" class="bigImageFrame b-f-collapse" tabindex="0">
    <a id="imgLandLeft" hidden="true" class="imgLandLeft"></a>
    <a id="imgLandRight" hidden="true" class="imgLandRight"></a>
    <a id="imgLandTop" hidden="true" class="imgLandTop"></a>
    <a id="imgLandBottom" hidden="true" class="imgLandBottom"></a>
 </div>
 <div id="pageHelper" class="pageHelper">
     <div style="position: relative">
         <div id="configPlane" class="plane p-config p-collapse">
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.columns.get()}:</span>
                     <span>
                         <button id="colCountMinusBTN" class="p-btn" type="button">-</button>
                         <input id="colCountInput" value="${conf.colCount}" disabled type="text" />
                         <button id="colCountAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.maxPreloadThreads.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.maxPreloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="threadsMinusBTN" class="p-btn" type="button">-</button>
                         <input id="threadsInput" value="${conf.threads}" disabled type="text" />
                         <button id="threadsAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.maxDownloadThreads.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.maxDownloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="downloadThreadsMinusBTN" class="p-btn" type="button">-</button>
                         <input id="downloadThreadsInput" value="${conf.downloadThreads}" disabled type="text" />
                         <button id="downloadThreadsAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.timeout.get()}:</span>
                     <span>
                         <button id="timeoutMinusBTN" class="p-btn" type="button">-</button>
                         <input id="timeoutInput" value="${conf.timeout}" disabled type="text" />
                         <button id="timeoutAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.bestQuality.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.bestQualityTooltip.get()}</span></span>:
                     </span>
                     <input id="fetchOriginalCheckbox" ${conf.fetchOriginal ? "checked" : ""} type="checkbox" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.autoLoad.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoLoadTooltip.get()}</span></span>:
                     </span>
                     <input id="autoLoadCheckbox" ${conf.autoLoad ? "checked" : ""} type="checkbox" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.reversePages.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.reversePagesTooltip.get()}</span></span>:
                     </span>
                     <input id="reversePagesCheckbox" ${conf.reversePages ? "checked" : ""} type="checkbox" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.autoPlay.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoPlayTooltip.get()}</span></span>:
                     </span>
                     <input id="autoPlayCheckbox" ${conf.autoPlay ? "checked" : ""} type="checkbox" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.readMode.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.readModeTooltip.get()}</span></span>:
                     </span>
                     <select id="readModeSelect">
                        <option value="singlePage" ${conf.readMode == "singlePage" ? "selected" : ""}>Single Page</option>
                        <option value="consecutively" ${conf.readMode == "consecutively" ? "selected" : ""}>Consecutively</option>
                     </select>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.stickyMouse.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.stickyMouseTooltip.get()}</span></span>:
                     </span>
                     <select id="stickyMouseSelect">
                        <option value="enable" ${conf.stickyMouse == "enable" ? "selected" : ""}>Enable</option>
                        <option value="reverse" ${conf.stickyMouse == "reverse" ? "selected" : ""}>Reverse</option>
                        <option value="disable" ${conf.stickyMouse == "disable" ? "selected" : ""}>Disable</option>
                     </select>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.autoPageInterval.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoPageIntervalTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="autoPageIntervalMinusBTN" class="p-btn" type="button">-</button>
                         <input id="autoPageIntervalInput" value="${conf.autoPageInterval}" disabled type="text" style="width: 4rem; line-height: 1rem;" />
                         <button id="autoPageIntervalAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.preventScrollPageTime.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.preventScrollPageTimeTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="preventScrollPageTimeMinusBTN" class="p-btn" type="button">-</button>
                         <input id="preventScrollPageTimeInput" value="${conf.preventScrollPageTime}" disabled type="text" style="width: 4rem; line-height: 1rem;" />
                         <button id="preventScrollPageTimeAddBTN" class="p-btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.dragToMove.get()}:</span>
                     <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 8; padding-left: 5px;">
                  <a id="showGuideElement" class="clickable">HELP</a>
                  <a style="" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
             </div>
             <div id="imgScaleBar" class="p-img-scale" style="grid-column-start: 1; grid-column-end: 8; padding-left: 5px;">
                 <div><span>${i18n.imageScale.get()}:</span></div>
                 <div class="scale-status"><span id="imgScaleStatus">${conf.imgScale}%</span></div>
                 <div id="imgDecreaseBTN" class="scale-btn"><span>-</span></div>
                 <div id="imgScaleProgress" class="scale-progress"><div id="imgScaleProgressInner" class="scale-progress-inner" style="width: ${conf.imgScale}%"></div></div>
                 <div id="imgIncreaseBTN" class="scale-btn"><span>+</span></div>
                 <div id="imgScaleResetBTN" class="scale-btn"><span>RESET</span></div>
             </div>
         </div>
         <div id="downloaderPlane" class="plane p-downloader p-collapse">
             <div id="download-notice" class="download-notice"></div>
             <canvas id="downloaderCanvas" width="100" height="100"></canvas>
             <div class="download-btn-group">
                <a id="download-force" style="color: gray;" class="clickable">${i18n.forceDownload.get()}</a>
                <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
             </div>
         </div>
     </div>
     <div>
         <span id="gate">&lessdot;📖</span>
     </div>
     <div id="b-main" class="b-main b-collapse">
         <div id="configPlaneBTN" class="clickable">${i18n.config.get()}</div>
         <div id="downloaderPlaneBTN" class="clickable">${i18n.download.get()}</div>
         <div class="b-m-page">
             <span class="clickable" id="p-currPage"
                 style="color:orange;">1</span>/<span id="p-total">0</span>/<span>FIN:</span><span id="p-finished">0</span>
         </div>
         <div id="autoPageBTN" class="clickable" style="padding: 0rem 1rem; position: relative; border: 1px solid #777;">
            <span>${i18n.autoPagePlay.get()}</span>
            <div id="autoPageProgress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
         </div>
         <div id="collapseBTN" class="clickable">${i18n.collapse.get()}</div>
     </div>
     <div>
         <span>&gtdot;</span>
     </div>
 </div>
`;
    fullViewPlane.innerHTML = HTML_STRINGS;
    const styleSheel = loadStyleSheel();
    return {
      fullViewPlane,
      // root element
      bigImageFrame: fullViewPlane.querySelector("#bigImageFrame"),
      // page helper
      pageHelper: fullViewPlane.querySelector("#pageHelper"),
      // config button in pageHelper
      configPlaneBTN: fullViewPlane.querySelector("#configPlaneBTN"),
      // config plane mouse leave event
      configPlane: fullViewPlane.querySelector("#configPlane"),
      // download button in pageHelper
      downloaderPlaneBTN: fullViewPlane.querySelector("#downloaderPlaneBTN"),
      // download plane mouse leave event
      downloaderPlane: fullViewPlane.querySelector("#downloaderPlane"),
      collapseBTN: fullViewPlane.querySelector("#collapseBTN"),
      gate: fullViewPlane.querySelector("#gate"),
      currPageElement: fullViewPlane.querySelector("#p-currPage"),
      totalPageElement: fullViewPlane.querySelector("#p-total"),
      finishedElement: fullViewPlane.querySelector("#p-finished"),
      showGuideElement: fullViewPlane.querySelector("#showGuideElement"),
      imgLandLeft: fullViewPlane.querySelector("#imgLandLeft"),
      imgLandRight: fullViewPlane.querySelector("#imgLandRight"),
      imgLandTop: fullViewPlane.querySelector("#imgLandTop"),
      imgLandBottom: fullViewPlane.querySelector("#imgLandBottom"),
      imgScaleBar: fullViewPlane.querySelector("#imgScaleBar"),
      autoPageBTN: fullViewPlane.querySelector("#autoPageBTN"),
      styleSheel
    };
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  class BigImageFrameManager {
    /* prevent mouse wheel step next image */
    constructor(frame, queue, imgScaleBar) {
      __publicField(this, "frame");
      __publicField(this, "queue");
      __publicField(this, "lockInit");
      __publicField(this, "currImageNode");
      __publicField(this, "lastMouseY");
      __publicField(this, "recordedDistance");
      __publicField(this, "reachBottom");
      // for sticky mouse, if reach bottom, when mouse move up util reach top, will step next image page
      __publicField(this, "imgScaleBar");
      __publicField(this, "debouncer");
      __publicField(this, "throttler");
      __publicField(this, "callbackOnWheel");
      __publicField(this, "callbackOnHidden");
      __publicField(this, "callbackOnShow");
      __publicField(this, "hammer");
      __publicField(this, "preventStepLock", true);
      __publicField(this, "preventStepLockEle");
      this.frame = frame;
      this.queue = queue;
      this.imgScaleBar = imgScaleBar;
      this.debouncer = new Debouncer();
      this.throttler = new Debouncer("throttle");
      this.lockInit = false;
      this.resetStickyMouse();
      this.initFrame();
      this.initImgScaleBar();
      this.initImgScaleStyle();
      this.initHammer();
    }
    initHammer() {
      this.hammer = new Hammer(this.frame, {
        // touchAction: "auto",
        recognizers: [
          [Hammer.Swipe, { direction: Hammer.DIRECTION_ALL, enable: false }]
        ]
      });
      this.hammer.on("swipe", (ev) => {
        ev.preventDefault();
        if (conf.readMode === "singlePage") {
          switch (ev.direction) {
            case Hammer.DIRECTION_LEFT:
              events.stepImageEvent(conf.reversePages ? "prev" : "next");
              break;
            case Hammer.DIRECTION_UP:
              events.stepImageEvent("next");
              break;
            case Hammer.DIRECTION_RIGHT:
              events.stepImageEvent(conf.reversePages ? "next" : "prev");
              break;
            case Hammer.DIRECTION_DOWN:
              events.stepImageEvent("prev");
              break;
          }
        }
      });
    }
    resetStickyMouse() {
      this.reachBottom = false;
      this.recordedDistance = 0;
      this.lastMouseY = void 0;
    }
    flushImgScaleBar() {
      this.imgScaleBar.querySelector("#imgScaleStatus").innerHTML = `${conf.imgScale}%`;
      this.imgScaleBar.querySelector("#imgScaleProgressInner").style.width = `${conf.imgScale}%`;
    }
    setNow(index) {
      this.resetStickyMouse();
      this.frame.focus();
      if (this.lockInit) {
        this.lockInit = false;
        return;
      }
      this.init(index);
    }
    init(start) {
      var _a, _b;
      this.removeImgNodes();
      this.currImageNode = this.createImgElement();
      this.frame.appendChild(this.currImageNode);
      this.setImgNode(this.currImageNode, start);
      if (conf.readMode === "consecutively") {
        (_a = this.hammer) == null ? void 0 : _a.get("swipe").set({ enable: false });
        this.tryExtend();
      } else {
        (_b = this.hammer) == null ? void 0 : _b.get("swipe").set({ enable: true });
      }
      this.restoreScrollTop(this.currImageNode, 0, 0);
    }
    initFrame() {
      this.frame.addEventListener("wheel", (event) => {
        var _a;
        (_a = this.callbackOnWheel) == null ? void 0 : _a.call(this, event);
        this.onWheel(event);
      });
      this.frame.addEventListener("scroll", (event) => this.onScroll(event));
      this.frame.addEventListener("click", events.hiddenBigImageEvent);
      this.frame.addEventListener("contextmenu", (event) => event.preventDefault());
      const debouncer2 = new Debouncer("throttle");
      this.frame.addEventListener("mousemove", (event) => {
        debouncer2.addEvent("BIG-IMG-MOUSE-MOVE", () => {
          let stepImage = false;
          if (this.lastMouseY && conf.imgScale > 0) {
            [stepImage] = this.stickyMouse(event, this.lastMouseY);
          }
          if (stepImage) {
            this.createNextLand(event.clientX, event.clientY);
          } else {
            this.lastMouseY = event.clientY;
          }
        }, 5);
      });
    }
    initImgScaleBar() {
      var _a, _b, _c;
      (_a = this.imgScaleBar.querySelector("#imgIncreaseBTN")) == null ? void 0 : _a.addEventListener("click", () => {
        this.scaleBigImages(1, 5);
      });
      (_b = this.imgScaleBar.querySelector("#imgDecreaseBTN")) == null ? void 0 : _b.addEventListener("click", () => {
        this.scaleBigImages(-1, 5);
      });
      (_c = this.imgScaleBar.querySelector("#imgScaleResetBTN")) == null ? void 0 : _c.addEventListener("click", () => {
        this.resetScaleBigImages();
      });
      const progress = this.imgScaleBar.querySelector("#imgScaleProgress");
      progress.addEventListener("mousedown", (event) => {
        const { left } = progress.getBoundingClientRect();
        const mouseMove = (event2) => {
          const xInProgress = event2.clientX - left;
          const percent = Math.round(xInProgress / progress.clientWidth * 100);
          this.scaleBigImages(0, 0, percent);
        };
        mouseMove(event);
        progress.addEventListener("mousemove", mouseMove);
        progress.addEventListener("mouseup", () => {
          progress.removeEventListener("mousemove", mouseMove);
        }, { once: true });
        progress.addEventListener("mouseleave", () => {
          progress.removeEventListener("mousemove", mouseMove);
        }, { once: true });
      });
    }
    createNextLand(x, y) {
      var _a;
      (_a = this.frame.querySelector("#nextLand")) == null ? void 0 : _a.remove();
      const nextLand = document.createElement("div");
      nextLand.setAttribute("id", "nextLand");
      const svg_bg = `<svg version="1.1" width="150" height="40" viewBox="0 0 256 256" xml:space="preserve" id="svg1" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1" /><path style="color:#000000;display:inline;mix-blend-mode:normal;fill:#86e690;fill-opacity:0.942853;fill-rule:evenodd;stroke:#000000;stroke-width:2.56;stroke-linejoin:bevel;stroke-miterlimit:10;stroke-dasharray:61.44, 2.56;stroke-dashoffset:0.768;stroke-opacity:0.319655" d="M -0.07467348,3.2775653 -160.12951,3.3501385 127.96339,156.87088 415.93447,3.2743495 255.93798,3.2807133 128.00058,48.081351 Z" id="path15" /></svg>`;
      let yFix = this.frame.clientHeight / 9;
      if (conf.stickyMouse === "reverse") {
        yFix = -yFix;
      }
      nextLand.setAttribute(
        "style",
        `position: fixed; width: 150px; height: 40px; top: ${y + yFix}px; left: ${x - 75}px; z-index: 1006;`
      );
      nextLand.innerHTML = svg_bg;
      nextLand.addEventListener("mouseover", () => {
        nextLand.remove();
        events.stepImageEvent("next");
      });
      this.frame.appendChild(nextLand);
      window.setTimeout(() => nextLand.remove(), 1500);
    }
    createImgElement() {
      const img = document.createElement("img");
      img.addEventListener("click", events.hiddenBigImageEvent);
      return img;
    }
    removeImgNodes() {
      for (const child of Array.from(this.frame.children)) {
        if (child.nodeName.toLowerCase() === "img") {
          child.remove();
        }
      }
    }
    hidden() {
      var _a;
      (_a = this.callbackOnHidden) == null ? void 0 : _a.call(this);
      this.frame.blur();
      this.frame.classList.add("b-f-collapse");
      this.debouncer.addEvent("TOGGLE-CHILDREN", () => {
        this.frame.childNodes.forEach((child) => child.hidden = true);
        this.removeImgNodes();
      }, 600);
    }
    show() {
      var _a;
      this.frame.classList.remove("b-f-collapse");
      this.debouncer.addEvent("TOGGLE-CHILDREN", () => {
        this.frame.focus();
        this.frame.childNodes.forEach((child) => {
          if (conf.readMode === "consecutively") {
            if (child.nodeName.toLowerCase() === "a") {
              return;
            }
          }
          child.hidden = false;
        });
      }, 600);
      (_a = this.callbackOnShow) == null ? void 0 : _a.call(this);
    }
    getImgNodes() {
      return Array.from(this.frame.querySelectorAll("img"));
    }
    onWheel(event) {
      if (event.buttons === 2) {
        event.preventDefault();
        this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
      } else if (conf.readMode === "singlePage") {
        const oriented = event.deltaY > 0 ? "next" : "prev";
        if (this.isReachBoundary(oriented)) {
          event.preventDefault();
          if (!this.tryPreventStep()) {
            events.stepImageEvent(oriented);
          }
        }
      }
    }
    onScroll(_) {
      if (conf.readMode === "consecutively") {
        this.consecutive();
      }
    }
    tryPreventStep() {
      if (!conf.imgScale || conf.imgScale === 0 || conf.preventScrollPageTime === 0) {
        return false;
      }
      if (this.preventStepLock) {
        if (!this.preventStepLockEle) {
          const lockEle = document.createElement("div");
          lockEle.style.width = "100vw";
          lockEle.style.position = "fixed";
          lockEle.style.display = "flex";
          lockEle.style.justifyContent = "center";
          lockEle.style.bottom = "0px";
          lockEle.innerHTML = `<div style="width: 30vw;height: 0.4rem;background-color: #ff8181d6;text-align: center;font-size: 0.8rem;position: relative;font-weight: 800;color: gray;border-radius: 7px;border: 1px solid #510000;"><span style="position: absolute;bottom: -3px;"></span></div>`;
          this.frame.appendChild(lockEle);
          this.preventStepLockEle = lockEle;
          const ani = lockEle.children[0].animate([{ width: "30vw" }, { width: "0vw" }], { duration: conf.preventScrollPageTime });
          ani.onfinish = () => {
            this.preventStepLockEle = void 0;
            this.preventStepLock = false;
            this.frame.removeChild(lockEle);
          };
        }
        return true;
      } else {
        this.preventStepLock = true;
        return false;
      }
    }
    isReachBoundary(oriented) {
      if (oriented === "prev") {
        return this.frame.scrollTop <= 0;
      }
      if (oriented === "next") {
        return this.frame.scrollTop >= this.frame.scrollHeight - this.frame.offsetHeight;
      }
      return false;
    }
    consecutive() {
      this.throttler.addEvent("SCROLL", () => {
        this.debouncer.addEvent("REDUCE", () => {
          let imgNodes2 = this.getImgNodes();
          let index2 = this.findImgNodeIndexOnCenter(imgNodes2, 0);
          const centerNode2 = imgNodes2[index2];
          const distance2 = this.getRealOffsetTop(centerNode2) - this.frame.scrollTop;
          if (this.tryReduce()) {
            this.restoreScrollTop(centerNode2, distance2, 0);
          }
        }, 200);
        let imgNodes = this.getImgNodes();
        let index = this.findImgNodeIndexOnCenter(imgNodes, 0);
        const centerNode = imgNodes[index];
        this.currImageNode = centerNode;
        const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;
        const indexOffset = this.tryExtend();
        if (indexOffset !== 0) {
          this.restoreScrollTop(centerNode, distance, 0);
        }
        const indexOfQueue = parseInt(this.currImageNode.getAttribute("d-index"));
        if (indexOfQueue != this.queue.currIndex) {
          this.lockInit = true;
          this.queue.do(indexOfQueue, indexOfQueue < this.queue.currIndex ? "prev" : "next");
        }
      }, 100);
    }
    restoreScrollTop(imgNode, distance, deltaY) {
      imgNode.scrollIntoView();
      if (distance !== 0 || deltaY !== 0) {
        imgNode.scrollIntoView({});
        this.frame.scrollTo({ top: imgNode.offsetTop - distance + deltaY, behavior: "instant" });
      }
    }
    /**
     * Usually, when the central image occupies the full height of the screen, 
     * it is simple to obtain the offsetTop of that image element. 
     * However, when encountering images with aspect ratios that exceed the screen's aspect ratio, 
     * it is necessary to rely on natureWidth and natureHeight to obtain the actual offsetTop.
     */
    getRealOffsetTop(imgNode) {
      const naturalRatio = imgNode.naturalWidth / imgNode.naturalHeight;
      const clientRatio = imgNode.clientWidth / imgNode.clientHeight;
      if (naturalRatio > clientRatio) {
        const clientHeight = Math.round(imgNode.naturalHeight * (imgNode.clientWidth / imgNode.naturalWidth));
        return (imgNode.clientHeight - clientHeight) / 2 + imgNode.offsetTop;
      }
      return imgNode.offsetTop;
    }
    tryExtend() {
      let indexOffset = 0;
      let imgNodes = [];
      let scrollTopFix = 0;
      while (true) {
        imgNodes = this.getImgNodes();
        const frist = imgNodes[0];
        if (frist.offsetTop + frist.offsetHeight > this.frame.scrollTop + scrollTopFix) {
          const extended = this.extendImgNode(frist, "prev");
          if (extended === null) {
            break;
          } else {
            scrollTopFix += extended.offsetHeight;
          }
          indexOffset++;
        } else {
          break;
        }
      }
      while (true) {
        imgNodes = this.getImgNodes();
        const last = imgNodes[imgNodes.length - 1];
        if (last.offsetTop < this.frame.scrollTop + this.frame.offsetHeight) {
          if (this.extendImgNode(last, "next") === null)
            break;
        } else {
          break;
        }
      }
      return indexOffset;
    }
    tryReduce() {
      const imgNodes = this.getImgNodes();
      const shouldRemoveNodes = [];
      let oriented = "prev";
      for (const imgNode of imgNodes) {
        if (oriented === "prev") {
          if (imgNode.offsetTop + imgNode.offsetHeight < this.frame.scrollTop) {
            shouldRemoveNodes.push(imgNode);
          } else {
            oriented = "next";
            shouldRemoveNodes.pop();
          }
        } else if (oriented === "next") {
          if (imgNode.offsetTop > this.frame.scrollTop + this.frame.offsetHeight) {
            oriented = "remove";
          }
        } else {
          shouldRemoveNodes.push(imgNode);
        }
      }
      if (shouldRemoveNodes.length === 0)
        return false;
      for (const imgNode of shouldRemoveNodes) {
        imgNode.remove();
      }
      return true;
    }
    extendImgNode(imgNode, oriented) {
      let extendedImgNode;
      const index = parseInt(imgNode.getAttribute("d-index"));
      if (oriented === "prev") {
        if (index === 0)
          return null;
        extendedImgNode = this.createImgElement();
        imgNode.before(extendedImgNode);
        this.setImgNode(extendedImgNode, index - 1);
      } else {
        if (index === this.queue.length - 1)
          return null;
        extendedImgNode = this.createImgElement();
        imgNode.after(extendedImgNode);
        this.setImgNode(extendedImgNode, index + 1);
      }
      return extendedImgNode;
    }
    setImgNode(imgNode, index) {
      imgNode.setAttribute("d-index", index.toString());
      const imgFetcher = this.queue[index];
      if (imgFetcher.stage === FetchState.DONE) {
        imgNode.src = imgFetcher.blobUrl;
      } else {
        imgNode.src = imgFetcher.imgElement.getAttribute("asrc");
        imgFetcher.onFinished("BIG-IMG-SRC-UPDATE", ($index, $imgFetcher) => {
          if ($index === parseInt(imgNode.getAttribute("d-index"))) {
            imgNode.src = $imgFetcher.blobUrl;
          }
        });
      }
    }
    /**
     * @param fix: 1 or -1, means scale up or down
     * @param rate: step of scale, eg: current scale is 80, rate is 10, then new scale is 90
     * @param _percent: directly set width percent
     */
    scaleBigImages(fix, rate, _percent) {
      var _a;
      let percent = 0;
      const cssRules = Array.from(((_a = HTML.styleSheel.sheet) == null ? void 0 : _a.cssRules) ?? []);
      for (const cssRule of cssRules) {
        if (cssRule instanceof CSSStyleRule) {
          if (cssRule.selectorText === ".bigImageFrame > img") {
            if (!conf.imgScale)
              conf.imgScale = 0;
            if (conf.imgScale == 0 && (_percent || this.currImageNode)) {
              percent = _percent ?? Math.round(this.currImageNode.offsetWidth / this.frame.offsetWidth * 100);
              if (conf.readMode === "consecutively") {
                cssRule.style.minHeight = "";
              } else {
                cssRule.style.minHeight = "100vh";
              }
              cssRule.style.maxWidth = "";
              cssRule.style.height = "";
            } else {
              percent = _percent ?? conf.imgScale;
            }
            percent = Math.max(percent + rate * fix, 10);
            percent = Math.min(percent, 100);
            cssRule.style.width = `${percent}vw`;
            break;
          }
        }
      }
      if (conf.readMode === "singlePage" && this.currImageNode && this.currImageNode.offsetHeight <= this.frame.offsetHeight) {
        this.resetScaleBigImages();
      } else {
        conf.imgScale = percent;
      }
      saveConf(conf);
      this.flushImgScaleBar();
      return percent;
    }
    resetScaleBigImages() {
      var _a;
      const cssRules = Array.from(((_a = HTML.styleSheel.sheet) == null ? void 0 : _a.cssRules) ?? []);
      for (const cssRule of cssRules) {
        if (cssRule instanceof CSSStyleRule) {
          if (cssRule.selectorText === ".bigImageFrame > img") {
            cssRule.style.maxWidth = "100vw";
            if (conf.readMode === "singlePage") {
              cssRule.style.minHeight = "100vh";
              cssRule.style.height = "100vh";
              cssRule.style.width = "";
            } else {
              cssRule.style.minHeight = "";
              cssRule.style.height = "";
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
              cssRule.style.width = isMobile ? "100vw" : "80vw";
            }
            break;
          }
        }
      }
      conf.imgScale = 0;
      saveConf(conf);
      this.flushImgScaleBar();
    }
    initImgScaleStyle() {
      if (conf.imgScale && conf.imgScale > 0) {
        const imgScale = conf.imgScale;
        conf.imgScale = 0;
        this.scaleBigImages(1, 0, imgScale);
      } else {
        this.resetScaleBigImages();
      }
    }
    stickyMouse(event, lastMouseY) {
      let [stepImage, distance] = [false, 0];
      if (conf.readMode === "singlePage" && conf.stickyMouse !== "disable") {
        distance = event.clientY - lastMouseY;
        distance = conf.stickyMouse === "enable" ? -distance : distance;
        const rate = (this.frame.scrollHeight - this.frame.offsetHeight) / (this.frame.offsetHeight / 4) * 3;
        let scrollTop = this.frame.scrollTop + distance * rate;
        if (distance > 0) {
          this.recordedDistance += distance;
          if (scrollTop >= this.frame.scrollHeight - this.frame.offsetHeight) {
            scrollTop = this.frame.scrollHeight - this.frame.offsetHeight;
            this.reachBottom = this.recordedDistance >= this.frame.clientHeight / 9;
          }
        } else if (distance < 0) {
          if (scrollTop <= 0) {
            scrollTop = 0;
            stepImage = this.reachBottom;
            this.reachBottom = false;
          }
        }
        this.frame.scrollTo({ top: scrollTop, behavior: "auto" });
      }
      return [stepImage, distance];
    }
    findImgNodeIndexOnCenter(imgNodes, fixOffset) {
      const centerLine = this.frame.offsetHeight / 2;
      for (let i = 0; i < imgNodes.length; i++) {
        const imgNode = imgNodes[i];
        const realOffsetTop = imgNode.offsetTop + fixOffset - this.frame.scrollTop;
        if (realOffsetTop < centerLine && realOffsetTop + imgNode.offsetHeight >= centerLine) {
          return i;
        }
      }
      return 0;
    }
  }
  class AutoPage {
    constructor(frameManager, root) {
      __publicField(this, "frameManager");
      __publicField(this, "status");
      __publicField(this, "button");
      __publicField(this, "lockVer");
      __publicField(this, "restart");
      this.frameManager = frameManager;
      this.status = "stop";
      this.button = root;
      this.lockVer = 0;
      this.restart = false;
      this.frameManager.callbackOnWheel = () => {
        if (this.status === "running") {
          this.stop();
          this.start(this.lockVer);
        }
      };
      this.frameManager.callbackOnHidden = () => {
        this.stop();
      };
      this.frameManager.callbackOnShow = () => {
        if (conf.autoPlay) {
          this.start(this.lockVer);
        }
      };
      this.initPlayButton();
    }
    initPlayButton() {
      this.button.addEventListener("click", () => {
        if (this.status === "stop") {
          this.start(this.lockVer);
        } else {
          this.stop();
        }
      });
    }
    async start(lockVer) {
      this.status = "running";
      this.button.firstElementChild.innerText = i18n.autoPagePause.get();
      const b = this.frameManager.frame;
      if (this.frameManager.frame.classList.contains("b-f-collapse")) {
        events.showBigImage(this.frameManager.queue.currIndex);
      }
      const progress = this.button.querySelector("#autoPageProgress");
      while (true) {
        await sleep(10);
        progress.style.animation = `${conf.autoPageInterval ?? 1e4}ms linear main-progress`;
        await sleep(conf.autoPageInterval ?? 1e4);
        if (this.lockVer !== lockVer) {
          return;
        }
        if (this.restart) {
          this.restart = false;
          continue;
        }
        progress.style.animation = ``;
        if (this.status !== "running") {
          break;
        }
        if (this.frameManager.queue.currIndex >= this.frameManager.queue.length - 1) {
          break;
        }
        const deltaY = this.frameManager.frame.offsetHeight / 2;
        if (conf.readMode === "singlePage" && b.scrollTop >= b.scrollHeight - b.offsetHeight) {
          this.frameManager.onWheel(new WheelEvent("wheel", { deltaY }));
        } else {
          b.scrollBy({ top: deltaY, behavior: "smooth" });
          if (conf.readMode === "consecutively") {
            this.frameManager.onWheel(new WheelEvent("wheel", { deltaY }));
          }
        }
      }
      this.stop();
    }
    stop() {
      this.status = "stop";
      const progress = this.button.querySelector("#autoPageProgress");
      progress.style.animation = ``;
      this.lockVer += 1;
      this.button.firstElementChild.innerText = i18n.autoPagePlay.get();
    }
  }
  function dragElement(element, dragHub, callback) {
    (dragHub ?? element).addEventListener("mousedown", (event) => {
      event.preventDefault();
      const wh = window.innerHeight;
      const ww = window.innerWidth;
      const mouseMove = (event2) => {
        event2.preventDefault();
        const mouseX = event2.clientX;
        const mouseY = event2.clientY;
        if (mouseY <= wh / 2) {
          element.style.top = Math.max(mouseY, 500) + "px";
          element.style.bottom = "unset";
        } else {
          element.style.bottom = Math.max(wh - mouseY - element.clientHeight, 5) + "px";
          element.style.top = "unset";
        }
        if (mouseX <= ww / 2) {
          element.style.left = Math.max(mouseX, 5) + "px";
          element.style.right = "unset";
        } else {
          element.style.right = Math.max(ww - mouseX - element.clientWidth, 5) + "px";
          element.style.left = "unset";
        }
        console.log("drag element: offset top: ", element.style.top, "offset left: ", element.style.left, "offset bottom: ", element.style.bottom, "offset right: ", element.style.right);
      };
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", mouseMove);
        callback == null ? void 0 : callback(element.offsetTop, element.offsetLeft);
      }, { once: true });
    });
  }
  const HTML = createHTML();
  const IFQ = new IMGFetcherQueue();
  const IL = new IdleLoader(IFQ);
  const BIFM = new BigImageFrameManager(HTML.bigImageFrame, IFQ, HTML.imgScaleBar);
  const matcher = adaptMatcher();
  const PF = new PageFetcher(IFQ, IL, matcher);
  const DL = new Downloader(IFQ, IL, matcher);
  const DLC = new DownloaderCanvas("downloaderCanvas", IFQ);
  new AutoPage(BIFM, HTML.autoPageBTN);
  if (conf["first"]) {
    events.showGuideEvent();
    conf["first"] = false;
    saveConf(conf);
  }
  const signal = { first: true };
  function main(collapse) {
    if (HTML.pageHelper) {
      if (collapse) {
        HTML.pageHelper.classList.remove("pageHelperExtend");
        events.hiddenFullViewPlane();
        ["config", "downloader"].forEach((id) => events.togglePlaneEvent(id, true));
      } else {
        HTML.pageHelper.classList.add("pageHelperExtend");
        events.showFullViewPlane();
        if (signal.first) {
          signal.first = false;
          PF.init().then(() => IL.start(IL.lockVer));
        }
      }
    }
  }
  HTML.configPlaneBTN.addEventListener("click", () => events.togglePlaneEvent("config"));
  HTML.configPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target));
  HTML.configPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target));
  HTML.downloaderPlaneBTN.addEventListener("click", () => {
    DL.check();
    events.togglePlaneEvent("downloader");
  });
  HTML.downloaderPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target));
  HTML.downloaderPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target));
  for (const key of ConfigNumberKeys) {
    HTML.fullViewPlane.querySelector(`#${key}MinusBTN`).addEventListener("click", () => events.modNumberConfigEvent(key, "minus"));
    HTML.fullViewPlane.querySelector(`#${key}AddBTN`).addEventListener("click", () => events.modNumberConfigEvent(key, "add"));
    HTML.fullViewPlane.querySelector(`#${key}Input`).addEventListener("wheel", (event) => {
      if (event.deltaY < 0) {
        events.modNumberConfigEvent(key, "add");
      } else if (event.deltaY > 0) {
        events.modNumberConfigEvent(key, "minus");
      }
    });
  }
  for (const key of ConfigBooleanKeys) {
    HTML.fullViewPlane.querySelector(`#${key}Checkbox`).addEventListener("input", () => events.modBooleanConfigEvent(key));
  }
  for (const key of ConfigSelectKeys) {
    HTML.fullViewPlane.querySelector(`#${key}Select`).addEventListener("change", () => events.modSelectConfigEvent(key));
  }
  HTML.collapseBTN.addEventListener("click", () => main(true));
  HTML.gate.addEventListener("click", () => main(false));
  const debouncer = new Debouncer();
  HTML.fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 500));
  HTML.fullViewPlane.addEventListener("click", events.hiddenFullViewPlaneEvent);
  HTML.currPageElement.addEventListener("click", () => events.showBigImage(IFQ.currIndex));
  HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event));
  document.addEventListener("keydown", (event) => events.keyboardEvent(event));
  HTML.imgLandLeft.addEventListener("click", (event) => {
    events.stepImageEvent(conf.reversePages ? "next" : "prev");
    event.stopPropagation();
  });
  HTML.imgLandRight.addEventListener("click", (event) => {
    events.stepImageEvent(conf.reversePages ? "prev" : "next");
    event.stopPropagation();
  });
  HTML.imgLandTop.addEventListener("click", (event) => {
    events.stepImageEvent("prev");
    event.stopPropagation();
  });
  HTML.imgLandBottom.addEventListener("click", (event) => {
    events.stepImageEvent("next");
    event.stopPropagation();
  });
  HTML.showGuideElement.addEventListener("click", events.showGuideEvent);
  dragElement(HTML.pageHelper, HTML.pageHelper.querySelector("#dragHub") ?? void 0, events.modPageHelperPostion);

})(Hammer, JSZip, saveAs);