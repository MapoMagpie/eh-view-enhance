// ==UserScript==
// @name               E HENTAI VIEW ENHANCE
// @name:zh-CN         E绅士阅读强化
// @namespace          https://github.com/MapoMagpie/eh-view-enhance
// @version            4.4.15
// @author             MapoMagpie
// @description        Manga Viewer + Downloader, Focus on experience and low load on the site. Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com
// @description:zh-CN  漫画阅读 + 下载器，注重体验和对站点的负载控制。支持：e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com
// @license            MIT
// @icon               https://exhentai.org/favicon.ico
// @supportURL         https://github.com/MapoMagpie/eh-view-enhance/issues
// @downloadURL        https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js
// @updateURL          https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.meta.js
// @match              https://exhentai.org/*
// @match              https://e-hentai.org/*
// @match              http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @match              https://nhentai.net/*
// @match              https://steamcommunity.com/id/*/screenshots*
// @match              https://hitomi.la/*
// @match              https://www.pixiv.net/*
// @match              https://yande.re/*
// @match              https://rokuhentai.com/*
// @match              https://18comic.org/*
// @match              https://18comic.vip/*
// @match              https://18-comicfreedom.xyz/*
// @match              https://rule34.xxx/*
// @match              https://imhentai.xxx/*
// @match              https://danbooru.donmai.us/*
// @match              https://gelbooru.com/*
// @connect            exhentai.org
// @connect            e-hentai.org
// @connect            hath.network
// @connect            exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion
// @connect            nhentai.net
// @connect            hitomi.la
// @connect            akamaihd.net
// @connect            i.pximg.net
// @connect            ehgt.org
// @connect            yande.re
// @connect            18comic.org
// @connect            18comic.vip
// @connect            18-comicfreedom.xyz
// @connect            rule34.xxx
// @connect            imhentai.xxx
// @connect            donmai.us
// @connect            gelbooru.com
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// ==/UserScript==

(function () {
	'use strict';

	var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
	// src/native/alias.ts
	var _GM_getValue = /* @__PURE__ */ (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_setValue = /* @__PURE__ */ (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();

	function defaultConf() {
	  const screenWidth = window.screen.width;
	  const colCount = screenWidth > 2500 ? 7 : screenWidth > 1900 ? 6 : 5;
	  return {
	    backgroundImage: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAfElEQVR42mP8z/CfCgIwDEgwAIAL0Fq3MDD5iQcn0/BgDpDAn0/AvywA4kUEZ7gUkXBoAM5gUQUaJ6eClOyBjALcAAAAASUVORK5CYII=`,
	    colCount,
	    readMode: "pagination",
	    autoLoad: true,
	    fetchOriginal: false,
	    restartIdleLoader: 2e3,
	    threads: 3,
	    downloadThreads: 4,
	    timeout: 10,
	    version: VERSION,
	    debug: true,
	    first: true,
	    reversePages: false,
	    pageHelperAbTop: "unset",
	    pageHelperAbLeft: "20px",
	    pageHelperAbBottom: "20px",
	    pageHelperAbRight: "unset",
	    imgScale: 0,
	    stickyMouse: "disable",
	    autoPageInterval: 5e3,
	    autoPlay: false,
	    filenameTemplate: "{number}-{title}",
	    preventScrollPageTime: 100,
	    archiveVolumeSize: 1200,
	    convertTo: "GIF",
	    autoCollapsePanel: true,
	    minifyPageHelper: "inBigMode",
	    keyboards: { inBigImageMode: {}, inFullViewGrid: {}, inMain: {} },
	    excludeURLs: [],
	    muted: false,
	    volume: 50,
	    disableCssAnimation: true,
	    mcInSites: ["18comic"],
	    paginationIMGCount: 1,
	    hitomiFormat: "auto",
	    autoOpen: false,
	    autoLoadInBackground: true
	  };
	}
	const VERSION = "4.4.0";
	const CONFIG_KEY = "ehvh_cfg_";
	function getStorageMethod() {
	  if (typeof _GM_getValue === "function" && typeof _GM_setValue === "function") {
	    return {
	      setItem: (key, value) => _GM_setValue(key, value),
	      getItem: (key) => _GM_getValue(key)
	    };
	  } else if (typeof localStorage !== "undefined") {
	    return {
	      setItem: (key, value) => localStorage.setItem(key, value),
	      getItem: (key) => localStorage.getItem(key)
	    };
	  } else {
	    throw new Error("No supported storage method found");
	  }
	}
	const storage = getStorageMethod();
	function getConf() {
	  let cfgStr = storage.getItem(CONFIG_KEY);
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
	function confHealthCheck(cf) {
	  let changed = false;
	  const defa = defaultConf();
	  const keys = Object.keys(defa);
	  keys.forEach((key) => {
	    if (cf[key] === void 0) {
	      cf[key] = defa[key];
	      changed = true;
	    }
	  });
	  ["pageHelperAbTop", "pageHelperAbLeft", "pageHelperAbBottom", "pageHelperAbRight"].forEach((key) => {
	    if (cf[key] !== "unset") {
	      let pos = parseInt(cf[key]);
	      const screenLimit = key.endsWith("Right") || key.endsWith("Left") ? window.screen.width : window.screen.height;
	      if (isNaN(pos) || pos < 5 || pos > screenLimit) {
	        cf[key] = "5px";
	        changed = true;
	      }
	    }
	  });
	  if (!["pagination", "continuous"].includes(cf.readMode)) {
	    cf.readMode = "pagination";
	    changed = true;
	  }
	  if (changed) {
	    saveConf(cf);
	  }
	  return cf;
	}
	function saveConf(c) {
	  storage.setItem(CONFIG_KEY, JSON.stringify(c));
	}
	const conf = getConf();
	const ConfigItems = [
	  { key: "colCount", typ: "number" },
	  { key: "threads", typ: "number" },
	  { key: "downloadThreads", typ: "number" },
	  { key: "paginationIMGCount", typ: "number" },
	  { key: "timeout", typ: "number" },
	  { key: "preventScrollPageTime", typ: "number" },
	  { key: "autoPageInterval", typ: "number" },
	  { key: "fetchOriginal", typ: "boolean", gridColumnRange: [1, 6] },
	  { key: "autoLoad", typ: "boolean", gridColumnRange: [6, 11] },
	  { key: "reversePages", typ: "boolean", gridColumnRange: [1, 6] },
	  { key: "autoPlay", typ: "boolean", gridColumnRange: [6, 11] },
	  { key: "autoLoadInBackground", typ: "boolean", gridColumnRange: [1, 6] },
	  { key: "autoOpen", typ: "boolean", gridColumnRange: [6, 11] },
	  { key: "disableCssAnimation", typ: "boolean", gridColumnRange: [1, 11] },
	  { key: "autoCollapsePanel", typ: "boolean", gridColumnRange: [1, 11] },
	  {
	    key: "readMode",
	    typ: "select",
	    options: [
	      { value: "pagination", display: "Pagination" },
	      { value: "continuous", display: "Continuous" }
	    ]
	  },
	  {
	    key: "stickyMouse",
	    typ: "select",
	    options: [
	      { value: "enable", display: "Enable" },
	      { value: "reverse", display: "Reverse" },
	      { value: "disable", display: "Disable" }
	    ]
	  },
	  {
	    key: "minifyPageHelper",
	    typ: "select",
	    options: [
	      { value: "always", display: "Always" },
	      { value: "inBigMode", display: "InBigMode" },
	      { value: "never", display: "Never" }
	    ]
	  },
	  {
	    key: "hitomiFormat",
	    typ: "select",
	    options: [
	      { value: "auto", display: "Auto" },
	      { value: "avif", display: "Avif" },
	      { value: "webp", display: "Webp" },
	      { value: "jxl", display: "Jxl" }
	    ],
	    displayInSite: /hitomi.la\//
	  }
	];

	function evLog(level, msg, ...info) {
	  if (level === "debug" && !conf.debug)
	    return;
	  if (level === "error") {
	    console.warn((/* @__PURE__ */ new Date()).toLocaleString(), "EHVP:" + msg, ...info);
	  } else {
	    console.info((/* @__PURE__ */ new Date()).toLocaleString(), "EHVP:" + msg, ...info);
	  }
	}

	class EventManager {
	  events;
	  constructor() {
	    this.events = /* @__PURE__ */ new Map();
	  }
	  emit(id, ...args) {
	    if (!["imf-download-state-change"].includes(id)) {
	      evLog("debug", "event bus emitted: ", id);
	    }
	    const cbs = this.events.get(id);
	    if (cbs) {
	      cbs.forEach((cb) => cb(...args));
	    }
	  }
	  subscribe(id, cb) {
	    evLog("info", "event bus subscribed: ", id);
	    const cbs = this.events.get(id);
	    if (cbs) {
	      cbs.push(cb);
	    } else {
	      this.events.set(id, [cb]);
	    }
	  }
	  reset() {
	    this.events = /* @__PURE__ */ new Map();
	  }
	}
	const EBUS = new EventManager();

	class Debouncer {
	  tids;
	  mode;
	  lastExecTime;
	  constructor(mode) {
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

	const HOST_REGEX = /\/\/([^\/]*)\//;
	function xhrWapper(url, respType, cb, timeout) {
	  return _GM_xmlhttpRequest({
	    method: "GET",
	    url,
	    timeout: timeout || 0,
	    responseType: respType,
	    nocache: false,
	    revalidate: false,
	    // fetch: false,
	    headers: {
	      "Host": HOST_REGEX.exec(url)?.[1] || window.location.host,
	      // "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
	      "Accept": "image/avif,image/webp,*/*",
	      // "Accept-Language": "en-US,en;q=0.5",
	      // "Accept-Encoding": "gzip, deflate, br",
	      // "Connection": "keep-alive",
	      "Referer": window.location.href,
	      // "Sec-Fetch-Dest": "image",
	      // "Sec-Fetch-Mode": "no-cors",
	      // "Sec-Fetch-Site": "cross-site",
	      "Cache-Control": "public, max-age=2592000, immutable"
	    },
	    ...cb
	  }).abort;
	}
	function fetchImage(url) {
	  return new Promise((resolve, reject) => {
	    xhrWapper(url, "blob", {
	      onload: (response) => resolve(response.response),
	      onerror: (error) => reject(error)
	    }, 10 * 1e3);
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
	  node;
	  originURL;
	  stage = 1 /* URL */;
	  tryTimes = 0;
	  lock = false;
	  /// 0: not rendered, 1: rendered tumbinal, 2: rendered big image
	  rendered = 0;
	  data;
	  contentType;
	  blobUrl;
	  downloadState;
	  downloadBar;
	  timeoutId;
	  matcher;
	  chapterIndex;
	  constructor(root, matcher, chapterIndex) {
	    this.node = root;
	    this.node.onclick = () => EBUS.emit("imf-on-click", this);
	    this.downloadState = { total: 100, loaded: 0, readyState: 0 };
	    this.matcher = matcher;
	    this.chapterIndex = chapterIndex;
	  }
	  create() {
	    return this.node.create();
	  }
	  // 刷新下载状态
	  setDownloadState(newState) {
	    this.downloadState = { ...this.downloadState, ...newState };
	    this.node.progress(this.downloadState);
	    EBUS.emit("imf-download-state-change");
	  }
	  async start(index) {
	    if (this.lock)
	      return;
	    this.lock = true;
	    try {
	      this.node.changeStyle("fetching");
	      await this.fetchImage();
	      this.node.changeStyle("fetched");
	      EBUS.emit("imf-on-finished", index, true, this);
	    } catch (error) {
	      this.node.changeStyle("failed");
	      evLog("error", `IMG-FETCHER ERROR:`, error);
	      this.stage = 0 /* FAILED */;
	      EBUS.emit("imf-on-finished", index, false, this);
	    } finally {
	      this.lock = false;
	    }
	  }
	  retry() {
	    if (this.stage !== 3 /* DONE */) {
	      this.node.changeStyle();
	      this.stage = 1 /* URL */;
	    }
	  }
	  async fetchImage() {
	    this.tryTimes = 0;
	    while (this.tryTimes < 3) {
	      switch (this.stage) {
	        case 0 /* FAILED */:
	        case 1 /* URL */:
	          let meta = await this.fetchOriginMeta();
	          if (meta !== null) {
	            this.originURL = meta.url;
	            if (meta.title) {
	              this.node.title = meta.title;
	              if (this.node.imgElement) {
	                this.node.imgElement.title = meta.title;
	              }
	            }
	            this.stage = 2 /* DATA */;
	          } else {
	            this.tryTimes++;
	          }
	          break;
	        case 2 /* DATA */:
	          const ret = await this.fetchImageData();
	          if (ret !== null) {
	            [this.data, this.contentType] = ret;
	            [this.data, this.contentType] = await this.matcher.processData(this.data, this.contentType, this.originURL);
	            this.blobUrl = URL.createObjectURL(new Blob([this.data], { type: this.contentType }));
	            this.node.onloaded(this.blobUrl, this.contentType);
	            if (this.rendered === 2) {
	              this.node.render();
	            }
	            this.stage = 3 /* DONE */;
	          } else {
	            this.stage = 1 /* URL */;
	            this.tryTimes++;
	          }
	          break;
	        case 3 /* DONE */:
	          return;
	      }
	    }
	    throw new Error(`Fetch image failed, reach max try times, current stage: ${this.stage}`);
	  }
	  async fetchOriginMeta() {
	    try {
	      const meta = await this.matcher.fetchOriginMeta(this.node.href, this.tryTimes > 0, this.chapterIndex);
	      if (!meta) {
	        evLog("error", "Fetch URL failed, the URL is empty");
	        return null;
	      }
	      return meta;
	    } catch (error) {
	      evLog("error", `Fetch URL error:`, error);
	      return null;
	    }
	  }
	  async fetchImageData() {
	    try {
	      const data = await this.fetchBigImage();
	      if (data == null) {
	        throw new Error(`Data is null, image url:${this.originURL}`);
	      }
	      return data.arrayBuffer().then((buffer) => [new Uint8Array(buffer), data.type]);
	    } catch (error) {
	      evLog("error", `Fetch image data error:`, error);
	      return null;
	    }
	  }
	  render() {
	    switch (this.rendered) {
	      case 0:
	      case 1:
	        this.node.render();
	        this.rendered = 2;
	        if (this.stage === 3 /* DONE */)
	          this.node.changeStyle("fetched");
	        break;
	    }
	  }
	  unrender() {
	    if (this.rendered === 1 || this.rendered === 0)
	      return;
	    this.rendered = 1;
	    this.node.unrender();
	  }
	  async fetchBigImage() {
	    if (this.originURL?.startsWith("blob:")) {
	      return await fetch(this.originURL).then((resp) => resp.blob());
	    }
	    const imgFetcher = this;
	    return new Promise(async (resolve, reject) => {
	      const debouncer = new Debouncer();
	      let abort;
	      const timeout = () => {
	        debouncer.addEvent("XHR_TIMEOUT", () => {
	          reject("timeout");
	          abort();
	        }, conf.timeout * 1e3);
	      };
	      abort = xhrWapper(imgFetcher.originURL, "blob", {
	        onload: function(response) {
	          let data = response.response;
	          if (data.type === "text/html") {
	            console.error("warn: fetch big image data type is not blob: ", data);
	          }
	          try {
	            imgFetcher.setDownloadState({ readyState: response.readyState });
	          } catch (error) {
	            evLog("error", "warn: fetch big image data onload setDownloadState error:", error);
	          }
	          resolve(data);
	        },
	        onerror: function(response) {
	          reject(`error:${response.error}, response:${response.response}`);
	        },
	        onprogress: function(response) {
	          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
	          timeout();
	        },
	        onloadstart: function() {
	          imgFetcher.setDownloadState(imgFetcher.downloadState);
	        }
	      });
	      timeout();
	    });
	  }
	}

	const lang = navigator.language;
	const i18nIndex = lang.startsWith("zh") ? 1 : 0;
	class I18nValue extends Array {
	  constructor(...value) {
	    super(...value);
	  }
	  get() {
	    return this[i18nIndex];
	  }
	}
	const keyboardCustom = {
	  inMain: {
	    "open-full-view-grid": new I18nValue("Enter Read Mode", "进入阅读模式")
	  },
	  inBigImageMode: {
	    "step-image-prev": new I18nValue("Go Prev Image", "切换到上一张图片"),
	    "step-image-next": new I18nValue("Go Next Image", "切换到下一张图片"),
	    "exit-big-image-mode": new I18nValue("Exit Big Image Mode", "退出大图模式"),
	    "step-to-first-image": new I18nValue("Go First Image", "跳转到第一张图片"),
	    "step-to-last-image": new I18nValue("Go Last Image", "跳转到最后一张图片"),
	    "scale-image-increase": new I18nValue("Increase Image Scale", "放大图片"),
	    "scale-image-decrease": new I18nValue("Decrease Image Scale", "缩小图片"),
	    "scroll-image-up": new I18nValue("Scroll Image Up (Please Keep Default Keys)", "向上滚动图片 (请保留默认按键)"),
	    "scroll-image-down": new I18nValue("Scroll Image Down (Please Keep Default Keys)", "向下滚动图片 (请保留默认按键)")
	  },
	  inFullViewGrid: {
	    "open-big-image-mode": new I18nValue("Enter Big Image Mode", "进入大图阅读模式"),
	    "pause-auto-load-temporarily": new I18nValue("Pause Auto Load Temporarily", "临时停止自动加载"),
	    "exit-full-view-grid": new I18nValue("Exit Read Mode", "退出阅读模式"),
	    "columns-increase": new I18nValue("Increase Columns ", "增加每行数量"),
	    "columns-decrease": new I18nValue("Decrease Columns ", "减少每行数量"),
	    "back-chapters-selection": new I18nValue("Back to Chapters Selection", "返回章节选择")
	  }
	};
	const i18n = {
	  imageScale: new I18nValue("SCALE", "缩放"),
	  download: new I18nValue("DL", "下载"),
	  config: new I18nValue("CONF", "配置"),
	  backChapters: new I18nValue("Chapters", "章节"),
	  autoPagePlay: new I18nValue("PLAY", "播放"),
	  autoPagePause: new I18nValue("PAUSE", "暂停"),
	  autoPlay: new I18nValue("Auto Page", "自动翻页"),
	  autoPlayTooltip: new I18nValue("Auto Page when entering the big image readmode.", "当阅读大图时，开启自动播放模式。"),
	  preventScrollPageTime: new I18nValue("Flip Page Time", "滚动翻页时间"),
	  preventScrollPageTimeTooltip: new I18nValue("In Read Mode:Single Page, when scrolling through the content, prevent immediate page flipping when reaching the bottom, improve the reading experience. Set to 0 to disable this feature, measured in milliseconds.", "在单页阅读模式下，滚动浏览时，阻止滚动到底部时立即翻页，提升阅读体验。设置为0时则为禁用此功能，单位为毫秒。"),
	  collapse: new I18nValue("FOLD", "收起"),
	  colCount: new I18nValue("Columns", "每行数量"),
	  readMode: new I18nValue("Read Mode", "阅读模式"),
	  autoPageInterval: new I18nValue("Auto Page Interval", "自动翻页间隔"),
	  autoPageIntervalTooltip: new I18nValue("Use the mouse wheel on Input box to adjust the interval time.", "在输入框上使用鼠标滚轮快速修改间隔时间"),
	  readModeTooltip: new I18nValue("Switch to the next picture when scrolling, otherwise read continuously", "滚动时切换到下一张图片，否则连续阅读"),
	  threads: new I18nValue("PreloadThreads", "最大同时加载"),
	  threadsTooltip: new I18nValue("Max Preload Threads", "大图浏览时，每次滚动到下一张时，预加载的图片数量，大于1时体现为越看加载的图片越多，将提升浏览体验。"),
	  downloadThreads: new I18nValue("DownloadThreads", "最大同时下载"),
	  downloadThreadsTooltip: new I18nValue("Max Download Threads, suggest: <5", "下载模式下，同时加载的图片数量，建议小于等于5"),
	  timeout: new I18nValue("Timeout(second)", "超时时间(秒)"),
	  fetchOriginal: new I18nValue("Raw Image", "最佳质量"),
	  autoLoad: new I18nValue("Auto Load", "自动加载"),
	  autoLoadTooltip: new I18nValue("", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"),
	  fetchOriginalTooltip: new I18nValue("enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"),
	  forceDownload: new I18nValue("Take Loaded", "强制下载已加载的"),
	  downloadStart: new I18nValue("Start Download", "开始下载"),
	  downloading: new I18nValue("Downloading...", "下载中..."),
	  downloadFailed: new I18nValue("Failed(Retry)", "下载失败(重试)"),
	  downloaded: new I18nValue("Downloaded", "下载完成"),
	  packaging: new I18nValue("Packaging...", "打包中..."),
	  reversePages: new I18nValue("Reverse Pages", "反向翻页"),
	  reversePagesTooltip: new I18nValue("Clicking on the side navigation, if enable then reverse paging, which is a reading style similar to Japanese manga where pages are read from right to left.", "点击侧边导航时，是否反向翻页，反向翻页类似日本漫画那样的从右到左的阅读方式。"),
	  autoCollapsePanel: new I18nValue("Auto Fold Control Panel", "自动收起控制面板"),
	  autoCollapsePanelTooltip: new I18nValue("When the mouse is moved out of the control panel, the control panel will automatically fold. If disabled, the display of the control panel can only be toggled through the button on the control bar.", "当鼠标移出控制面板时，自动收起控制面板。禁用此选项后，只能通过控制栏上的按钮切换控制面板的显示。"),
	  disableCssAnimation: new I18nValue("Disable Animation", "禁用动画"),
	  disableCssAnimationTooltip: new I18nValue("Valid after refreshing the page", "刷新页面后生效"),
	  stickyMouse: new I18nValue("Sticky Mouse", "黏糊糊鼠标"),
	  stickyMouseTooltip: new I18nValue("In non-continuous reading mode, scroll a single image automatically by moving the mouse.", "非连续阅读模式下，通过鼠标移动来自动滚动单张图片。"),
	  minifyPageHelper: new I18nValue("Minify Control Bar", "最小化控制栏"),
	  minifyPageHelperTooltip: new I18nValue("Minify Control Bar", "最小化控制栏"),
	  paginationIMGCount: new I18nValue("Images Per Page", "每页图片数量"),
	  paginationIMGCountTooltip: new I18nValue("In Pagination Read mode, the number of images displayed on each page", "在翻页阅读模式下，每页展示的图片数量"),
	  hitomiFormat: new I18nValue("Hitomi Image Format", "Hitomi 图片格式"),
	  hitomiFormatTooltip: new I18nValue("In Hitomi, Fetch images by the format.<br>if Auto then try Avif > Jxl > Webp, Requires Refresh", "在Hitomi中的源图格式。<br>如果是Auto，则优先获取Avif > Jxl > Webp，修改后需要刷新生效。"),
	  autoOpen: new I18nValue("Auto Open", "自动展开"),
	  autoOpenTooltip: new I18nValue("Automatically open after the gallery page is loaded", "进入画廊页面后，自动展开阅读视图。"),
	  autoLoadInBackground: new I18nValue("Keep Loading", "后台加载"),
	  autoLoadInBackgroundTooltip: new I18nValue("Keep Auto-Loading after the tab loses focus", "当标签页失去焦点后保持自动加载。"),
	  dragToMove: new I18nValue("Drag to Move", "拖动移动"),
	  originalCheck: new I18nValue("<a class='clickable' style='color:gray;'>Enable RawImage Transient</a>", "未启用最佳质量图片，点击此处<a class='clickable' style='color:gray;'>临时开启最佳质量</a>"),
	  showHelp: new I18nValue("Help", "帮助"),
	  showKeyboard: new I18nValue("Keyboard", "快捷键"),
	  showExcludes: new I18nValue("Excludes", "站点排除"),
	  letUsStar: new I18nValue("Let's Star", "点星"),
	  help: new I18nValue(`
    <h1>GUIDE:</h1>
    <ol>
      <li>If you are browsing E-Hentai, please click <a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Here</a> to switch to Lager thumbnail mode for clearer thumbnails. (need login e-hentai)</li>
      <li>Click <span style="background-color: gray;">&lessdot;📖&gtdot;</span> from left-bottom corner, entry reading.</li>
      <li>Just a monment, all thumbnail will exhibited in grid, <strong style="color: red;">click</strong> one of thumbnails into big image mode.</li>
      <li>You can use the <strong style="color: red;">mouse middle-click</strong> on a thumbnail to open the href of the image in new tab.</li>
      <li><strong style="color: orange">Image quality:</strong>For e-hentai，you can enable control-bar > CONF > Image Raw, which will directly download the uploaded original uncompressed images, but it will consume more quotas. Generally, the compressed files provided by E-Hentai are already clear enough.</li>
      <li><strong style="color: orange">Big image:</strong>click thumbnail image, into big image mode, use mouse wheel switch to next or prev</li>
      <li><strong style="color: orange">Keyboard:</strong>
        <table>
          <tr><td>Scale Image</td><td>mouse right + wheel or -/=</td></tr>
          <tr><td>Open  Image(In thumbnails)</td><td>Enter</td></tr>
          <tr><td>Exit  Image(In big mode)</td><td>Enter/Esc</td></tr>
          <tr><td>Open Specific Page(In thumbnails)</td><td>Input number(no echo) + Enter</td></tr>
          <tr><td>Switch Page</td><td>→/←</td></tr>
          <tr><td>Scroll Image</td><td>↑/↓/Space</td></tr>
          <tr><td>Toggle Auto Load</td><td>p</td></tr>
        </table>
      </li>
      <li><strong style="color: orange">Download:</strong>You can click on the download button in the download panel to quickly load all the images. You can still continue browsing the images. Downloading and viewing large images are integrated, and you can click on Download Loaded in the download panel to save the images at any time.</li>
      <li><strong style="color: orange">Feedback:</strong>
        Click 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance/issues" target="_blank" alt="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        to provide feedback on issues, Give me a star if you like this script.
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank" alt="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `, `
    <h1>操作说明:</h1>
    <ol>
      <li>如果你正在浏览E绅士，请点击<a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">此处</a>切换到Lager缩略图模式，以获取更清晰的缩略图。</li>
      <li>点击左下角 <span style="background-color: gray;">&lessdot;📖&gtdot;</span> 展开，进入阅读模式。</li>
      <li>稍等片刻后，缩略图会全屏陈列在页面上，<strong style="color: red;">点击</strong>某一缩略图进入大图浏览模式。</li>
      <li>你可以在某个缩略图上使用<strong style="color: red;">鼠标中键</strong>来打开该图片所在的页面。</li>
      <li><strong style="color: orange">图片质量:</strong>图片质量: 对于E绅士，你可以在控制栏>配置，启用原图模式，这将直接下载上传原档未压缩的图片，但会消耗更多的配额。一般来说E绅士默认提供的压缩档已经足够清晰。</li>
      <li><strong style="color: orange">大图展示:</strong>点击缩略图，可以展开大图，在大图上滚动切换上一张下一张图片</li>
      <li><strong style="color: orange">键盘操作:</strong>
        <table>
          <tr><td>图片缩放</td><td>鼠标右键+滚轮 或 -/=</td></tr>
          <tr><td>打开大图(缩略图模式下)</td><td>回车</td></tr>
          <tr><td>退出大图(大图模式下)</td><td>回车/Esc</td></tr>
          <tr><td>打开指定图片(缩略图模式下)</td><td>直接输入数字(不回显) + 回车</td></tr>
          <tr><td>切换图片</td><td>→/←</td></tr>
          <tr><td>滚动图片</td><td>↑/↓</td></tr>
          <tr><td>开关自动加载</td><td>p</td></tr>
        </table>
      </li>
      <li><strong style="color: orange">下载功能:</strong>你可以在下载面板中点击下载，这将快速加载所有的图片，你依旧可以继续浏览图片。下载与大图浏览是一体的，你随时可以在下载面板点击<strong style="color: orange">下载已加载的</strong>保存图片。</li>
      <li><strong style="color: orange">问题反馈:</strong>
        点击 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance/issues" target="_blank" alt="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        反馈你的问题或建议，如果你喜欢这个脚本，给我一个star吧。 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank" alt="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `),
	  keyboardCustom
	};

	let Crc32$1 = class Crc32 {
	  crc = -1;
	  table = this.makeTable();
	  makeTable() {
	    let i;
	    let j;
	    let t;
	    let table = [];
	    for (i = 0; i < 256; i++) {
	      t = i;
	      for (j = 0; j < 8; j++) {
	        t = t & 1 ? t >>> 1 ^ 3988292384 : t >>> 1;
	      }
	      table[i] = t;
	    }
	    return table;
	  }
	  append(data) {
	    let crc = this.crc | 0;
	    let table = this.table;
	    for (let offset = 0, len = data.length | 0; offset < len; offset++) {
	      crc = crc >>> 8 ^ table[(crc ^ data[offset]) & 255];
	    }
	    this.crc = crc;
	  }
	  get() {
	    return ~this.crc;
	  }
	};
	class ZipObject {
	  level;
	  nameBuf;
	  comment;
	  header;
	  offset;
	  directory;
	  file;
	  crc;
	  compressedLength;
	  uncompressedLength;
	  volumeNo;
	  constructor(file, volumeNo) {
	    this.level = 0;
	    const encoder = new TextEncoder();
	    this.nameBuf = encoder.encode(file.name.trim());
	    this.comment = encoder.encode("");
	    this.header = new DataHelper(26);
	    this.offset = 0;
	    this.directory = false;
	    this.file = file;
	    this.crc = new Crc32$1();
	    this.compressedLength = 0;
	    this.uncompressedLength = 0;
	    this.volumeNo = volumeNo;
	  }
	}
	class DataHelper {
	  array;
	  view;
	  constructor(byteLength) {
	    let uint8 = new Uint8Array(byteLength);
	    this.array = uint8;
	    this.view = new DataView(uint8.buffer);
	  }
	}
	class Zip {
	  // default 1.5GB
	  volumeSize = 1610612736;
	  accumulatedSize = 0;
	  volumes = 1;
	  currVolumeNo = -1;
	  files = [];
	  currIndex = -1;
	  offset = 0;
	  offsetInVolume = 0;
	  curr;
	  date;
	  writer;
	  close = false;
	  constructor(settings) {
	    if (settings?.volumeSize) {
	      this.volumeSize = settings.volumeSize;
	    }
	    this.date = new Date(Date.now());
	    this.writer = async () => {
	    };
	  }
	  setWriter(writer) {
	    this.writer = writer;
	  }
	  add(file) {
	    const fileSize = file.size();
	    this.accumulatedSize += fileSize;
	    if (this.accumulatedSize > this.volumeSize) {
	      this.volumes++;
	      this.accumulatedSize = fileSize;
	    }
	    this.files.push(new ZipObject(file, this.volumes - 1));
	  }
	  async next() {
	    this.currIndex++;
	    this.curr = this.files[this.currIndex];
	    if (this.curr) {
	      if (this.curr.volumeNo > this.currVolumeNo) {
	        this.currIndex--;
	        this.offsetInVolume = 0;
	        return true;
	      }
	      this.curr.offset = this.offsetInVolume;
	      await this.writeHeader();
	      await this.writeContent();
	      await this.writeFooter();
	      this.offset += this.offsetInVolume - this.curr.offset;
	    } else if (!this.close) {
	      this.close = true;
	      await this.closeZip();
	    } else {
	      return true;
	    }
	    return false;
	  }
	  async writeHeader() {
	    if (!this.curr)
	      return;
	    const curr = this.curr;
	    let data = new DataHelper(30 + curr.nameBuf.length);
	    let header = curr.header;
	    if (curr.level !== 0 && !curr.directory) {
	      header.view.setUint16(4, 2048);
	    }
	    header.view.setUint32(0, 335546376);
	    header.view.setUint16(6, (this.date.getHours() << 6 | this.date.getMinutes()) << 5 | this.date.getSeconds() / 2, true);
	    header.view.setUint16(8, (this.date.getFullYear() - 1980 << 4 | this.date.getMonth() + 1) << 5 | this.date.getDate(), true);
	    header.view.setUint16(22, curr.nameBuf.length, true);
	    data.view.setUint32(0, 1347093252);
	    data.array.set(header.array, 4);
	    data.array.set(curr.nameBuf, 30);
	    this.offsetInVolume += data.array.length;
	    await this.writer(data.array);
	  }
	  async writeContent() {
	    const curr = this.curr;
	    const reader = (await curr.file.stream()).getReader();
	    const writer = this.writer;
	    async function pump() {
	      const chunk = await reader.read();
	      if (chunk.done) {
	        return;
	      }
	      const data = chunk.value;
	      curr.crc.append(data);
	      curr.uncompressedLength += data.length;
	      curr.compressedLength += data.length;
	      writer(data);
	      return await pump();
	    }
	    await pump();
	  }
	  async writeFooter() {
	    if (!this.curr)
	      return;
	    const curr = this.curr;
	    var footer = new DataHelper(16);
	    footer.view.setUint32(0, 1347094280);
	    if (curr.crc) {
	      curr.header.view.setUint32(10, curr.crc.get(), true);
	      curr.header.view.setUint32(14, curr.compressedLength, true);
	      curr.header.view.setUint32(18, curr.uncompressedLength, true);
	      footer.view.setUint32(4, curr.crc.get(), true);
	      footer.view.setUint32(8, curr.compressedLength, true);
	      footer.view.setUint32(12, curr.uncompressedLength, true);
	    }
	    await this.writer(footer.array);
	    this.offsetInVolume += curr.compressedLength + 16;
	    if (curr.compressedLength !== curr.file.size()) {
	      evLog("error", "WRAN: read length:", curr.compressedLength, " origin size:", curr.file.size(), ", title: ", curr.file.name);
	    }
	  }
	  async closeZip() {
	    const fileCount = this.files.length;
	    let centralDirLength = 0;
	    let idx = 0;
	    for (idx = 0; idx < fileCount; idx++) {
	      const file = this.files[idx];
	      centralDirLength += 46 + file.nameBuf.length + file.comment.length;
	    }
	    const data = new DataHelper(centralDirLength + 22);
	    let dataOffset = 0;
	    for (idx = 0; idx < fileCount; idx++) {
	      const file = this.files[idx];
	      data.view.setUint32(dataOffset, 1347092738);
	      data.view.setUint16(dataOffset + 4, 5120);
	      data.array.set(file.header.array, dataOffset + 6);
	      data.view.setUint16(dataOffset + 32, file.comment.length, true);
	      data.view.setUint16(dataOffset + 34, file.volumeNo, true);
	      data.view.setUint32(dataOffset + 42, file.offset, true);
	      data.array.set(file.nameBuf, dataOffset + 46);
	      data.array.set(file.comment, dataOffset + 46 + file.nameBuf.length);
	      dataOffset += 46 + file.nameBuf.length + file.comment.length;
	    }
	    data.view.setUint32(dataOffset, 1347093766);
	    data.view.setUint16(dataOffset + 4, this.currVolumeNo, true);
	    data.view.setUint16(dataOffset + 6, this.currVolumeNo, true);
	    data.view.setUint16(dataOffset + 8, fileCount, true);
	    data.view.setUint16(dataOffset + 10, fileCount, true);
	    data.view.setUint32(dataOffset + 12, centralDirLength, true);
	    data.view.setUint32(dataOffset + 16, this.offsetInVolume, true);
	    await this.writer(data.array);
	  }
	  nextReadableStream() {
	    this.currVolumeNo++;
	    if (this.currVolumeNo >= this.volumes) {
	      return;
	    }
	    const zip = this;
	    return new ReadableStream({
	      start(controller) {
	        zip.setWriter(async (chunk) => controller.enqueue(chunk));
	      },
	      async pull(controller) {
	        await zip.next().then((done) => done && controller.close());
	      }
	    });
	  }
	}

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var FileSaver_min = {exports: {}};

	(function (module, exports) {
		(function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});

		
	} (FileSaver_min));

	var FileSaver_minExports = FileSaver_min.exports;

	class DownloaderCanvas {
	  canvas;
	  mousemoveState;
	  ctx;
	  queue;
	  rectSize;
	  rectGap;
	  columns;
	  padding;
	  scrollTop;
	  scrollSize;
	  debouncer;
	  onClick;
	  constructor(canvas, HTML, queue) {
	    this.queue = queue;
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
	      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
	      const index = this.computeDrawList()?.find(
	        (state) => state.selected
	      )?.index;
	      if (index !== void 0) {
	        EBUS.emit("downloader-canvas-on-click", index);
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
	    HTML.downloaderPanel.addEventListener("transitionend", () => this.resize(HTML.downloadDashboard));
	    EBUS.subscribe("imf-download-state-change", () => this.drawDebouce());
	  }
	  resize(parent) {
	    this.canvas.width = Math.floor(parent.offsetWidth);
	    this.canvas.height = Math.floor(parent.offsetHeight);
	    this.columns = Math.ceil((this.canvas.width - this.padding * 2 - this.rectGap) / (this.rectSize + this.rectGap));
	    this.draw();
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

	const FILENAME_INVALIDCHAR = /[\\/:*?"<>|\n]/g;
	class Downloader {
	  meta;
	  title;
	  downloading;
	  buttonForce;
	  buttonStart;
	  elementNotice;
	  downloaderPanelBTN;
	  queue;
	  idleLoader;
	  pageFetcher;
	  done = false;
	  selectedChapters = [];
	  filenames = /* @__PURE__ */ new Set();
	  canvas;
	  dashboardTab;
	  chapterTab;
	  elementDashboard;
	  elementChapters;
	  constructor(HTML, queue, idleLoader, pageFetcher, matcher) {
	    this.queue = queue;
	    this.idleLoader = idleLoader;
	    this.pageFetcher = pageFetcher;
	    this.meta = (ch) => matcher.galleryMeta(document, ch);
	    this.title = () => matcher.title(document);
	    this.downloading = false;
	    this.buttonForce = HTML.downloadBTNForce;
	    this.buttonStart = HTML.downloadBTNStart;
	    this.elementNotice = HTML.downloadNotice;
	    this.downloaderPanelBTN = HTML.downloaderPanelBTN;
	    this.buttonForce.addEventListener("click", () => this.download(this.pageFetcher.chapters));
	    this.buttonStart.addEventListener("click", () => {
	      if (this.downloading) {
	        this.abort("downloadStart");
	      } else {
	        this.start();
	      }
	    });
	    this.queue.downloading = () => this.downloading;
	    this.dashboardTab = HTML.downloadTabDashboard;
	    this.chapterTab = HTML.downloadTabChapters;
	    this.elementDashboard = HTML.downloadDashboard;
	    this.elementChapters = HTML.downloadChapters;
	    this.canvas = new DownloaderCanvas(HTML.downloaderCanvas, HTML, queue);
	    EBUS.subscribe("ifq-on-finished-report", (_, queue2) => {
	      if (queue2.isFinised()) {
	        const sel = this.selectedChapters.find((sel2) => sel2.index === queue2.chapterIndex);
	        if (sel) {
	          sel.done = true;
	          sel.resolve(true);
	        }
	        if (!this.downloading && !this.done && !this.downloaderPanelBTN.classList.contains("lightgreen")) {
	          this.downloaderPanelBTN.classList.add("lightgreen");
	          if (!/✓/.test(this.downloaderPanelBTN.textContent)) {
	            this.downloaderPanelBTN.textContent += "✓";
	          }
	        }
	      }
	    });
	    this.initTabs();
	  }
	  initTabs() {
	    const tabs = [{
	      ele: this.dashboardTab,
	      cb: () => {
	        this.elementDashboard.hidden = false;
	        this.elementChapters.hidden = true;
	        this.canvas.resize(this.elementDashboard);
	      }
	    }, {
	      ele: this.chapterTab,
	      cb: () => {
	        this.elementDashboard.hidden = true;
	        this.elementChapters.hidden = false;
	      }
	    }];
	    tabs.forEach(({ ele, cb }, i) => {
	      ele.addEventListener("click", () => {
	        ele.classList.add("ehvp-p-tab-selected");
	        tabs.filter((_, j) => j != i).forEach((t) => t.ele.classList.remove("ehvp-p-tab-selected"));
	        cb();
	      });
	    });
	  }
	  needNumberTitle(queue) {
	    let lastTitle = "";
	    for (const fetcher of queue) {
	      if (fetcher.node.title < lastTitle) {
	        return true;
	      }
	      lastTitle = fetcher.node.title;
	    }
	    return false;
	  }
	  checkDuplicateTitle(index, title) {
	    let newTitle = title;
	    if (this.filenames.has(newTitle)) {
	      let splits = newTitle.split(".");
	      const ext = splits.pop();
	      const prefix = splits.join(".");
	      const num = parseInt(prefix.match(/_(\d+)$/)?.[1] || "");
	      if (isNaN(num)) {
	        newTitle = `${prefix}_1.${ext}`;
	      } else {
	        newTitle = `${prefix.replace(/\d+$/, (num + 1).toString())}.${ext}`;
	      }
	      return this.checkDuplicateTitle(index, newTitle);
	    } else {
	      this.filenames.add(newTitle);
	      return newTitle;
	    }
	  }
	  createChapterSelectList() {
	    const chapters = this.pageFetcher.chapters;
	    const selectAll = chapters.length === 1;
	    this.elementChapters.innerHTML = `
<div>
  <span id="download-chapters-select-all" class="clickable p-btn">Select All</span>
  <span id="download-chapters-unselect-all" class="clickable p-btn">Unselect All</span>
</div>
${chapters.map((c, i) => `<div><label>
  <input type="checkbox" id="ch-${c.id}" value="${c.id}" ${selectAll || this.selectedChapters.find((sel) => sel.index === i) ? "checked" : ""} />
  <span>${c.title}</span></label></div>`).join("")}
`;
	    [["#download-chapters-select-all", true], ["#download-chapters-unselect-all", false]].forEach(
	      ([id, checked]) => this.elementChapters.querySelector(id)?.addEventListener(
	        "click",
	        () => chapters.forEach((c) => {
	          const checkbox = this.elementChapters.querySelector("#ch-" + c.id);
	          if (checkbox)
	            checkbox.checked = checked;
	        })
	      )
	    );
	  }
	  // check > start > download
	  check() {
	    if (this.downloading)
	      return;
	    if (!conf.fetchOriginal) {
	      if (this.elementNotice && !this.downloading) {
	        this.elementNotice.innerHTML = `<span>${i18n.originalCheck.get()}</span>`;
	        this.elementNotice.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
	      }
	    }
	    setTimeout(() => this.canvas.resize(this.elementDashboard), 110);
	    this.createChapterSelectList();
	    if (this.queue.length > 0) {
	      this.dashboardTab.click();
	    } else if (this.pageFetcher.chapters.length > 1) {
	      this.chapterTab.click();
	    }
	  }
	  fetchOriginalTemporarily() {
	    conf.fetchOriginal = true;
	    this.pageFetcher.chapters.forEach((ch) => {
	      ch.done = false;
	      ch.queue.forEach((imf) => imf.stage = FetchState.URL);
	    });
	    this.start();
	  }
	  checkSelectedChapters() {
	    this.selectedChapters.length = 0;
	    const idSet = /* @__PURE__ */ new Set();
	    this.elementChapters.querySelectorAll("input[type=checkbox][id^=ch-]:checked").forEach((checkbox) => idSet.add(Number(checkbox.value)));
	    if (idSet.size === 0) {
	      this.selectedChapters.push({ index: 0, done: false, ...promiseWithResolveAndReject() });
	    } else {
	      this.pageFetcher.chapters.forEach((c, i) => idSet.has(c.id) && this.selectedChapters.push({ index: i, done: false, ...promiseWithResolveAndReject() }));
	    }
	    evLog("debug", "get selected chapters: ", this.selectedChapters);
	    return this.selectedChapters;
	  }
	  async start() {
	    if (this.downloading)
	      return;
	    this.flushUI("downloading");
	    this.downloading = true;
	    this.idleLoader.autoLoad = true;
	    this.checkSelectedChapters();
	    try {
	      for (const sel of this.selectedChapters) {
	        if (!this.downloading)
	          return;
	        await this.pageFetcher.changeChapter(sel.index, false);
	        this.queue.forEach((imf) => {
	          if (imf.stage === FetchState.FAILED) {
	            imf.retry();
	          }
	        });
	        if (this.queue.isFinised()) {
	          sel.done = true;
	          sel.resolve(true);
	        } else {
	          this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => !imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1).filter((index) => index >= 0).splice(0, conf.downloadThreads);
	          this.idleLoader.onFailed(() => sel.reject("download failed or canceled"));
	          this.idleLoader.start();
	        }
	        await sel.promise;
	      }
	      if (this.downloading)
	        await this.download(this.selectedChapters.filter((sel) => sel.done).map((sel) => this.pageFetcher.chapters[sel.index]));
	    } catch (error) {
	      if ("abort" === error)
	        return;
	      this.abort("downloadFailed");
	      evLog("error", "download failed: ", error);
	    } finally {
	      this.downloading = false;
	    }
	  }
	  flushUI(stage) {
	    if (this.elementNotice) {
	      this.elementNotice.innerHTML = `<span>${i18n[stage].get()}</span>`;
	    }
	    if (this.buttonStart) {
	      this.buttonStart.style.color = stage === "downloadFailed" ? "red" : "";
	      this.buttonStart.textContent = i18n[stage].get();
	    }
	    this.downloaderPanelBTN.style.color = stage === "downloadFailed" ? "red" : "";
	  }
	  mapToFileLikes(chapter, singleChapter, separator) {
	    if (!chapter || chapter.queue.length === 0)
	      return [];
	    let checkTitle;
	    const needNumberTitle = this.needNumberTitle(chapter.queue);
	    if (needNumberTitle) {
	      const digits = chapter.queue.length.toString().length;
	      checkTitle = (title, index) => `${index + 1}`.padStart(digits, "0") + "_" + title.replaceAll(FILENAME_INVALIDCHAR, "_");
	    } else {
	      this.filenames.clear();
	      checkTitle = (title, index) => this.checkDuplicateTitle(index, title.replaceAll(FILENAME_INVALIDCHAR, "_"));
	    }
	    let directory = (() => {
	      if (singleChapter)
	        return "";
	      if (chapter.title instanceof Array) {
	        return chapter.title.join("_").replaceAll(FILENAME_INVALIDCHAR, "_") + separator;
	      } else {
	        return chapter.title.replaceAll(FILENAME_INVALIDCHAR, "_") + separator;
	      }
	    })();
	    const ret = chapter.queue.filter((imf) => imf.stage === FetchState.DONE && imf.data).map((imf, index) => {
	      return {
	        stream: () => Promise.resolve(uint8ArrayToReadableStream(imf.data)),
	        size: () => imf.data.byteLength,
	        name: directory + checkTitle(imf.node.title, index)
	      };
	    });
	    let meta = new TextEncoder().encode(JSON.stringify(this.meta(chapter), null, 2));
	    ret.push({
	      stream: () => Promise.resolve(new ReadableStream({
	        start(c) {
	          c.enqueue(meta);
	          c.close();
	        }
	      })),
	      size: () => meta.byteLength,
	      name: directory + "meta.json"
	    });
	    return ret;
	  }
	  async download(chapters) {
	    try {
	      let archiveName = this.title().replaceAll(FILENAME_INVALIDCHAR, "_");
	      let separator = navigator.userAgent.indexOf("Win") !== -1 ? "\\" : "/";
	      let singleChapter = chapters.length === 1;
	      this.flushUI("packaging");
	      const files = [];
	      for (const chapter of chapters) {
	        const ret = this.mapToFileLikes(chapter, singleChapter, separator);
	        files.push(...ret);
	      }
	      const zip = new Zip({ volumeSize: 1024 * 1024 * (conf.archiveVolumeSize || 1500) });
	      files.forEach((file) => zip.add(file));
	      let save = async () => {
	        let readable;
	        while (readable = zip.nextReadableStream()) {
	          const blob = await new Response(readable).blob();
	          let ext = zip.currVolumeNo === zip.volumes - 1 ? "zip" : "z" + (zip.currVolumeNo + 1).toString().padStart(2, "0");
	          FileSaver_minExports.saveAs(blob, `${archiveName}.${ext}`);
	        }
	      };
	      await save();
	      this.done = true;
	    } finally {
	      this.abort(this.done ? "downloaded" : "downloadFailed");
	    }
	  }
	  abort(stage) {
	    this.downloaderPanelBTN.textContent = i18n.download.get();
	    this.downloaderPanelBTN.classList.remove("lightgreen");
	    this.downloading = false;
	    this.flushUI(stage);
	    this.idleLoader.abort();
	    this.selectedChapters.forEach((sel) => sel.reject("abort"));
	  }
	}
	function uint8ArrayToReadableStream(arr) {
	  return new ReadableStream({
	    pull(controller) {
	      controller.enqueue(arr);
	      controller.close();
	    }
	  });
	}
	function promiseWithResolveAndReject() {
	  let resolve;
	  let reject;
	  const promise = new Promise((res, rej) => {
	    resolve = res;
	    reject = rej;
	  });
	  return { resolve, reject, promise };
	}

	class IMGFetcherQueue extends Array {
	  executableQueue;
	  currIndex;
	  finishedIndex = /* @__PURE__ */ new Set();
	  debouncer;
	  downloading;
	  dataSize = 0;
	  chapterIndex = 0;
	  clear() {
	    this.length = 0;
	    this.executableQueue = [];
	    this.currIndex = 0;
	    this.finishedIndex.clear();
	  }
	  restore(chapterIndex, imfs) {
	    this.clear();
	    this.chapterIndex = chapterIndex;
	    imfs.forEach((imf, i) => imf.stage === FetchState.DONE && this.finishedIndex.add(i));
	    this.push(...imfs);
	  }
	  static newQueue() {
	    const queue = new IMGFetcherQueue();
	    EBUS.subscribe("imf-on-finished", (index, success, imf) => queue.chapterIndex === imf.chapterIndex && queue.finishedReport(index, success, imf));
	    EBUS.subscribe("ifq-do", (index, imf, oriented) => {
	      if (imf.chapterIndex !== queue.chapterIndex)
	        return;
	      queue.do(index, oriented);
	    });
	    EBUS.subscribe("pf-change-chapter", () => queue.forEach((imf) => imf.unrender()));
	    return queue;
	  }
	  constructor() {
	    super();
	    this.executableQueue = [];
	    this.currIndex = 0;
	    this.debouncer = new Debouncer();
	  }
	  isFinised() {
	    return this.finishedIndex.size === this.length;
	  }
	  do(start, oriented) {
	    oriented = oriented || "next";
	    this.currIndex = this.fixIndex(start);
	    EBUS.emit("ifq-on-do", this.currIndex, this, this.downloading?.() || false);
	    if (this.downloading?.())
	      return;
	    if (!this.pushInExecutableQueue(oriented))
	      return;
	    this.debouncer.addEvent(
	      "IFQ-EXECUTABLE",
	      () => (
	        // console.log("IFQ-EXECUTABLE", this.executableQueue);
	        Promise.all(this.executableQueue.splice(0, conf.paginationIMGCount).map((imfIndex) => this[imfIndex].start(imfIndex))).then(() => this.executableQueue.forEach((imfIndex) => this[imfIndex].start(imfIndex)))
	      ),
	      300
	    );
	  }
	  //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
	  finishedReport(index, success, imf) {
	    if (this.length === 0)
	      return;
	    if (!success || imf.stage !== FetchState.DONE)
	      return;
	    this.finishedIndex.add(index);
	    if (this.dataSize < 1e9) {
	      this.dataSize += imf.data?.byteLength || 0;
	    }
	    EBUS.emit("ifq-on-finished-report", index, this);
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
	    for (let count = 0, index = this.currIndex; this.checkOutbounds(index, oriented, count); oriented === "next" ? ++index : --index) {
	      if (this[index].stage === FetchState.DONE)
	        continue;
	      this.executableQueue.push(index);
	      count++;
	    }
	    return this.executableQueue.length > 0;
	  }
	  // 如果索引已到达边界且添加数量在配置最大同时获取数量的范围内
	  checkOutbounds(index, oriented, count) {
	    let ret = false;
	    if (oriented === "next")
	      ret = index < this.length;
	    if (oriented === "prev")
	      ret = index > -1;
	    if (!ret)
	      return false;
	    if (count < conf.threads + conf.paginationIMGCount - 1)
	      return true;
	    return false;
	  }
	  findImgIndex(ele) {
	    for (let index = 0; index < this.length; index++) {
	      if (this[index].node.equal(ele)) {
	        return index;
	      }
	    }
	    return 0;
	  }
	}

	class IdleLoader {
	  queue;
	  processingIndexList;
	  restartId;
	  maxWaitMS;
	  minWaitMS;
	  onFailedCallback;
	  autoLoad = false;
	  debouncer;
	  constructor(queue) {
	    this.queue = queue;
	    this.processingIndexList = [0];
	    this.maxWaitMS = 1e3;
	    this.minWaitMS = 300;
	    this.autoLoad = conf.autoLoad;
	    this.debouncer = new Debouncer();
	    EBUS.subscribe("ifq-on-do", (currIndex, _, downloading) => !downloading && this.abort(currIndex));
	    EBUS.subscribe("imf-on-finished", (index) => {
	      if (!this.processingIndexList.includes(index))
	        return;
	      this.wait().then(() => {
	        this.checkProcessingIndex();
	        this.start();
	      });
	    });
	    EBUS.subscribe("pf-change-chapter", (index) => !this.queue.downloading?.() && this.abort(index > 0 ? 0 : void 0));
	    window.addEventListener("focus", () => {
	      if (conf.autoLoadInBackground)
	        return;
	      this.debouncer.addEvent("Idle-Load-on-focus", () => {
	        console.log("[ IdleLoader ] window focus, document.hidden:", document.hidden);
	        if (document.hidden)
	          return;
	        this.abort(0, 10);
	      }, 100);
	    });
	  }
	  onFailed(cb) {
	    this.onFailedCallback = cb;
	  }
	  start() {
	    if (!this.autoLoad)
	      return;
	    if (document.hidden && !conf.autoLoadInBackground)
	      return;
	    if (this.processingIndexList.length === 0)
	      return;
	    if (this.queue.length === 0)
	      return;
	    evLog("info", "Idle Loader start at:" + this.processingIndexList.toString());
	    for (const processingIndex of this.processingIndexList) {
	      this.queue[processingIndex].start(processingIndex);
	    }
	  }
	  checkProcessingIndex() {
	    if (this.queue.length === 0) {
	      return;
	    }
	    let foundFetcherIndex = /* @__PURE__ */ new Set();
	    let hasFailed = false;
	    for (let i = 0; i < this.processingIndexList.length; i++) {
	      let processingIndex = this.processingIndexList[i];
	      const imf = this.queue[processingIndex];
	      if (imf.stage === FetchState.FAILED) {
	        hasFailed = true;
	      }
	      if (imf.lock || imf.stage === FetchState.URL) {
	        continue;
	      }
	      for (let j = Math.min(processingIndex + 1, this.queue.length - 1), limit = this.queue.length; j < limit; j++) {
	        const imf2 = this.queue[j];
	        if (!imf2.lock && imf2.stage === FetchState.URL && !foundFetcherIndex.has(j)) {
	          foundFetcherIndex.add(j);
	          this.processingIndexList[i] = j;
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
	      if (foundFetcherIndex.size === 0) {
	        this.processingIndexList.length = 0;
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
	  abort(newIndex, delayRestart) {
	    this.processingIndexList = [];
	    this.debouncer.addEvent("IDLE-LOAD-ABORT", () => {
	      if (!this.autoLoad)
	        return;
	      if (newIndex === void 0)
	        return;
	      if (this.queue.downloading?.())
	        return;
	      this.processingIndexList = [newIndex];
	      this.checkProcessingIndex();
	      this.start();
	    }, delayRestart || conf.restartIdleLoader);
	  }
	}

	function commonjsRequire(path) {
		throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
	}

	var pica$1 = {exports: {}};

	/*!

	pica
	https://github.com/nodeca/pica

	*/

	(function (module, exports) {
		(function(f){{module.exports=f();}})(function(){return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof commonjsRequire&&commonjsRequire;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t);}return n[i].exports}for(var u="function"==typeof commonjsRequire&&commonjsRequire,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){

		var Multimath = _dereq_('multimath');

		var mm_unsharp_mask = _dereq_('./mm_unsharp_mask');

		var mm_resize = _dereq_('./mm_resize');

		function MathLib(requested_features) {
		  var __requested_features = requested_features || [];

		  var features = {
		    js: __requested_features.indexOf('js') >= 0,
		    wasm: __requested_features.indexOf('wasm') >= 0
		  };
		  Multimath.call(this, features);
		  this.features = {
		    js: features.js,
		    wasm: features.wasm && this.has_wasm()
		  };
		  this.use(mm_unsharp_mask);
		  this.use(mm_resize);
		}

		MathLib.prototype = Object.create(Multimath.prototype);
		MathLib.prototype.constructor = MathLib;

		MathLib.prototype.resizeAndUnsharp = function resizeAndUnsharp(options, cache) {
		  var result = this.resize(options, cache);

		  if (options.unsharpAmount) {
		    this.unsharp_mask(result, options.toWidth, options.toHeight, options.unsharpAmount, options.unsharpRadius, options.unsharpThreshold);
		  }

		  return result;
		};

		module.exports = MathLib;

		},{"./mm_resize":4,"./mm_unsharp_mask":9,"multimath":19}],2:[function(_dereq_,module,exports){
		//var FIXED_FRAC_BITS = 14;

		function clampTo8(i) {
		  return i < 0 ? 0 : i > 255 ? 255 : i;
		}

		function clampNegative(i) {
		  return i >= 0 ? i : 0;
		} // Convolve image data in horizontal direction. Can be used for:
		//
		// 1. bitmap with premultiplied alpha
		// 2. bitmap without alpha (all values 255)
		//
		// Notes:
		//
		// - output is transposed
		// - output resolution is ~15 bits per channel(for better precision).
		//


		function convolveHor(src, dest, srcW, srcH, destW, filters) {
		  var r, g, b, a;
		  var filterPtr, filterShift, filterSize;
		  var srcPtr, srcY, destX, filterVal;
		  var srcOffset = 0,
		      destOffset = 0; // For each row

		  for (srcY = 0; srcY < srcH; srcY++) {
		    filterPtr = 0; // Apply precomputed filters to each destination row point

		    for (destX = 0; destX < destW; destX++) {
		      // Get the filter that determines the current output pixel.
		      filterShift = filters[filterPtr++];
		      filterSize = filters[filterPtr++];
		      srcPtr = srcOffset + filterShift * 4 | 0;
		      r = g = b = a = 0; // Apply the filter to the row to get the destination pixel r, g, b, a

		      for (; filterSize > 0; filterSize--) {
		        filterVal = filters[filterPtr++]; // Use reverse order to workaround deopts in old v8 (node v.10)
		        // Big thanks to @mraleph (Vyacheslav Egorov) for the tip.

		        a = a + filterVal * src[srcPtr + 3] | 0;
		        b = b + filterVal * src[srcPtr + 2] | 0;
		        g = g + filterVal * src[srcPtr + 1] | 0;
		        r = r + filterVal * src[srcPtr] | 0;
		        srcPtr = srcPtr + 4 | 0;
		      } // Store 15 bits between passes for better precision
		      // Instead of shift to 14 (FIXED_FRAC_BITS), shift to 7 only
		      //


		      dest[destOffset + 3] = clampNegative(a >> 7);
		      dest[destOffset + 2] = clampNegative(b >> 7);
		      dest[destOffset + 1] = clampNegative(g >> 7);
		      dest[destOffset] = clampNegative(r >> 7);
		      destOffset = destOffset + srcH * 4 | 0;
		    }

		    destOffset = (srcY + 1) * 4 | 0;
		    srcOffset = (srcY + 1) * srcW * 4 | 0;
		  }
		} // Supplementary method for `convolveHor()`
		//


		function convolveVert(src, dest, srcW, srcH, destW, filters) {
		  var r, g, b, a;
		  var filterPtr, filterShift, filterSize;
		  var srcPtr, srcY, destX, filterVal;
		  var srcOffset = 0,
		      destOffset = 0; // For each row

		  for (srcY = 0; srcY < srcH; srcY++) {
		    filterPtr = 0; // Apply precomputed filters to each destination row point

		    for (destX = 0; destX < destW; destX++) {
		      // Get the filter that determines the current output pixel.
		      filterShift = filters[filterPtr++];
		      filterSize = filters[filterPtr++];
		      srcPtr = srcOffset + filterShift * 4 | 0;
		      r = g = b = a = 0; // Apply the filter to the row to get the destination pixel r, g, b, a

		      for (; filterSize > 0; filterSize--) {
		        filterVal = filters[filterPtr++]; // Use reverse order to workaround deopts in old v8 (node v.10)
		        // Big thanks to @mraleph (Vyacheslav Egorov) for the tip.

		        a = a + filterVal * src[srcPtr + 3] | 0;
		        b = b + filterVal * src[srcPtr + 2] | 0;
		        g = g + filterVal * src[srcPtr + 1] | 0;
		        r = r + filterVal * src[srcPtr] | 0;
		        srcPtr = srcPtr + 4 | 0;
		      } // Sync with premultiplied version for exact result match


		      r >>= 7;
		      g >>= 7;
		      b >>= 7;
		      a >>= 7; // Bring this value back in range + round result.
		      //

		      dest[destOffset + 3] = clampTo8(a + (1 << 13) >> 14);
		      dest[destOffset + 2] = clampTo8(b + (1 << 13) >> 14);
		      dest[destOffset + 1] = clampTo8(g + (1 << 13) >> 14);
		      dest[destOffset] = clampTo8(r + (1 << 13) >> 14);
		      destOffset = destOffset + srcH * 4 | 0;
		    }

		    destOffset = (srcY + 1) * 4 | 0;
		    srcOffset = (srcY + 1) * srcW * 4 | 0;
		  }
		} // Premultiply & convolve image data in horizontal direction. Can be used for:
		//
		// - Any bitmap data, extracted with `.getImageData()` method (with
		//   non-premultiplied alpha)
		//
		// For images without alpha channel this method is slower than `convolveHor()`
		//


		function convolveHorWithPre(src, dest, srcW, srcH, destW, filters) {
		  var r, g, b, a, alpha;
		  var filterPtr, filterShift, filterSize;
		  var srcPtr, srcY, destX, filterVal;
		  var srcOffset = 0,
		      destOffset = 0; // For each row

		  for (srcY = 0; srcY < srcH; srcY++) {
		    filterPtr = 0; // Apply precomputed filters to each destination row point

		    for (destX = 0; destX < destW; destX++) {
		      // Get the filter that determines the current output pixel.
		      filterShift = filters[filterPtr++];
		      filterSize = filters[filterPtr++];
		      srcPtr = srcOffset + filterShift * 4 | 0;
		      r = g = b = a = 0; // Apply the filter to the row to get the destination pixel r, g, b, a

		      for (; filterSize > 0; filterSize--) {
		        filterVal = filters[filterPtr++]; // Use reverse order to workaround deopts in old v8 (node v.10)
		        // Big thanks to @mraleph (Vyacheslav Egorov) for the tip.

		        alpha = src[srcPtr + 3];
		        a = a + filterVal * alpha | 0;
		        b = b + filterVal * src[srcPtr + 2] * alpha | 0;
		        g = g + filterVal * src[srcPtr + 1] * alpha | 0;
		        r = r + filterVal * src[srcPtr] * alpha | 0;
		        srcPtr = srcPtr + 4 | 0;
		      } // Premultiply is (* alpha / 255).
		      // Postpone division for better performance


		      b = b / 255 | 0;
		      g = g / 255 | 0;
		      r = r / 255 | 0; // Store 15 bits between passes for better precision
		      // Instead of shift to 14 (FIXED_FRAC_BITS), shift to 7 only
		      //

		      dest[destOffset + 3] = clampNegative(a >> 7);
		      dest[destOffset + 2] = clampNegative(b >> 7);
		      dest[destOffset + 1] = clampNegative(g >> 7);
		      dest[destOffset] = clampNegative(r >> 7);
		      destOffset = destOffset + srcH * 4 | 0;
		    }

		    destOffset = (srcY + 1) * 4 | 0;
		    srcOffset = (srcY + 1) * srcW * 4 | 0;
		  }
		} // Supplementary method for `convolveHorWithPre()`
		//


		function convolveVertWithPre(src, dest, srcW, srcH, destW, filters) {
		  var r, g, b, a;
		  var filterPtr, filterShift, filterSize;
		  var srcPtr, srcY, destX, filterVal;
		  var srcOffset = 0,
		      destOffset = 0; // For each row

		  for (srcY = 0; srcY < srcH; srcY++) {
		    filterPtr = 0; // Apply precomputed filters to each destination row point

		    for (destX = 0; destX < destW; destX++) {
		      // Get the filter that determines the current output pixel.
		      filterShift = filters[filterPtr++];
		      filterSize = filters[filterPtr++];
		      srcPtr = srcOffset + filterShift * 4 | 0;
		      r = g = b = a = 0; // Apply the filter to the row to get the destination pixel r, g, b, a

		      for (; filterSize > 0; filterSize--) {
		        filterVal = filters[filterPtr++]; // Use reverse order to workaround deopts in old v8 (node v.10)
		        // Big thanks to @mraleph (Vyacheslav Egorov) for the tip.

		        a = a + filterVal * src[srcPtr + 3] | 0;
		        b = b + filterVal * src[srcPtr + 2] | 0;
		        g = g + filterVal * src[srcPtr + 1] | 0;
		        r = r + filterVal * src[srcPtr] | 0;
		        srcPtr = srcPtr + 4 | 0;
		      } // Downscale to leave room for un-premultiply


		      r >>= 7;
		      g >>= 7;
		      b >>= 7;
		      a >>= 7; // Un-premultiply

		      a = clampTo8(a + (1 << 13) >> 14);

		      if (a > 0) {
		        r = r * 255 / a | 0;
		        g = g * 255 / a | 0;
		        b = b * 255 / a | 0;
		      } // Bring this value back in range + round result.
		      // Shift value = FIXED_FRAC_BITS + 7
		      //


		      dest[destOffset + 3] = a;
		      dest[destOffset + 2] = clampTo8(b + (1 << 13) >> 14);
		      dest[destOffset + 1] = clampTo8(g + (1 << 13) >> 14);
		      dest[destOffset] = clampTo8(r + (1 << 13) >> 14);
		      destOffset = destOffset + srcH * 4 | 0;
		    }

		    destOffset = (srcY + 1) * 4 | 0;
		    srcOffset = (srcY + 1) * srcW * 4 | 0;
		  }
		}

		module.exports = {
		  convolveHor: convolveHor,
		  convolveVert: convolveVert,
		  convolveHorWithPre: convolveHorWithPre,
		  convolveVertWithPre: convolveVertWithPre
		};

		},{}],3:[function(_dereq_,module,exports){
		/* eslint-disable max-len */

		module.exports = 'AGFzbQEAAAAADAZkeWxpbmsAAAAAAAEYA2AGf39/f39/AGAAAGAIf39/f39/f38AAg8BA2VudgZtZW1vcnkCAAADBwYBAAAAAAIGBgF/AEEACweUAQgRX193YXNtX2NhbGxfY3RvcnMAAAtjb252b2x2ZUhvcgABDGNvbnZvbHZlVmVydAACEmNvbnZvbHZlSG9yV2l0aFByZQADE2NvbnZvbHZlVmVydFdpdGhQcmUABApjb252b2x2ZUhWAAUMX19kc29faGFuZGxlAwAYX193YXNtX2FwcGx5X2RhdGFfcmVsb2NzAAAKyA4GAwABC4wDARB/AkAgA0UNACAERQ0AIANBAnQhFQNAQQAhE0EAIQsDQCALQQJqIQcCfyALQQF0IAVqIgYuAQIiC0UEQEEAIQhBACEGQQAhCUEAIQogBwwBCyASIAYuAQBqIQhBACEJQQAhCiALIRRBACEOIAchBkEAIQ8DQCAFIAZBAXRqLgEAIhAgACAIQQJ0aigCACIRQRh2bCAPaiEPIBFB/wFxIBBsIAlqIQkgEUEQdkH/AXEgEGwgDmohDiARQQh2Qf8BcSAQbCAKaiEKIAhBAWohCCAGQQFqIQYgFEEBayIUDQALIAlBB3UhCCAKQQd1IQYgDkEHdSEJIA9BB3UhCiAHIAtqCyELIAEgDEEBdCIHaiAIQQAgCEEAShs7AQAgASAHQQJyaiAGQQAgBkEAShs7AQAgASAHQQRyaiAJQQAgCUEAShs7AQAgASAHQQZyaiAKQQAgCkEAShs7AQAgDCAVaiEMIBNBAWoiEyAERw0ACyANQQFqIg0gAmwhEiANQQJ0IQwgAyANRw0ACwsL2gMBD38CQCADRQ0AIARFDQAgAkECdCEUA0AgCyEMQQAhE0EAIQIDQCACQQJqIQYCfyACQQF0IAVqIgcuAQIiAkUEQEEAIQhBACEHQQAhCkEAIQkgBgwBCyAHLgEAQQJ0IBJqIQhBACEJIAIhCkEAIQ0gBiEHQQAhDkEAIQ8DQCAFIAdBAXRqLgEAIhAgACAIQQF0IhFqLwEAbCAJaiEJIAAgEUEGcmovAQAgEGwgDmohDiAAIBFBBHJqLwEAIBBsIA9qIQ8gACARQQJyai8BACAQbCANaiENIAhBBGohCCAHQQFqIQcgCkEBayIKDQALIAlBB3UhCCANQQd1IQcgDkEHdSEKIA9BB3UhCSACIAZqCyECIAEgDEECdGogB0GAQGtBDnUiBkH/ASAGQf8BSBsiBkEAIAZBAEobQQh0QYD+A3EgCUGAQGtBDnUiBkH/ASAGQf8BSBsiBkEAIAZBAEobQRB0QYCA/AdxIApBgEBrQQ51IgZB/wEgBkH/AUgbIgZBACAGQQBKG0EYdHJyIAhBgEBrQQ51IgZB/wEgBkH/AUgbIgZBACAGQQBKG3I2AgAgAyAMaiEMIBNBAWoiEyAERw0ACyAUIAtBAWoiC2whEiADIAtHDQALCwuSAwEQfwJAIANFDQAgBEUNACADQQJ0IRUDQEEAIRNBACEGA0AgBkECaiEIAn8gBkEBdCAFaiIGLgECIgdFBEBBACEJQQAhDEEAIQ1BACEOIAgMAQsgEiAGLgEAaiEJQQAhDkEAIQ1BACEMIAchFEEAIQ8gCCEGA0AgBSAGQQF0ai4BACAAIAlBAnRqKAIAIhBBGHZsIhEgD2ohDyARIBBBEHZB/wFxbCAMaiEMIBEgEEEIdkH/AXFsIA1qIQ0gESAQQf8BcWwgDmohDiAJQQFqIQkgBkEBaiEGIBRBAWsiFA0ACyAPQQd1IQkgByAIagshBiABIApBAXQiCGogDkH/AW1BB3UiB0EAIAdBAEobOwEAIAEgCEECcmogDUH/AW1BB3UiB0EAIAdBAEobOwEAIAEgCEEEcmogDEH/AW1BB3UiB0EAIAdBAEobOwEAIAEgCEEGcmogCUEAIAlBAEobOwEAIAogFWohCiATQQFqIhMgBEcNAAsgC0EBaiILIAJsIRIgC0ECdCEKIAMgC0cNAAsLC4IEAQ9/AkAgA0UNACAERQ0AIAJBAnQhFANAIAshDEEAIRJBACEHA0AgB0ECaiEKAn8gB0EBdCAFaiICLgECIhNFBEBBACEIQQAhCUEAIQYgCiEHQQAMAQsgAi4BAEECdCARaiEJQQAhByATIQJBACENIAohBkEAIQ5BACEPA0AgBSAGQQF0ai4BACIIIAAgCUEBdCIQai8BAGwgB2ohByAAIBBBBnJqLwEAIAhsIA5qIQ4gACAQQQRyai8BACAIbCAPaiEPIAAgEEECcmovAQAgCGwgDWohDSAJQQRqIQkgBkEBaiEGIAJBAWsiAg0ACyAHQQd1IQggDUEHdSEJIA9BB3UhBiAKIBNqIQcgDkEHdQtBgEBrQQ51IgJB/wEgAkH/AUgbIgJBACACQQBKGyIKQf8BcQRAIAlB/wFsIAJtIQkgCEH/AWwgAm0hCCAGQf8BbCACbSEGCyABIAxBAnRqIAlBgEBrQQ51IgJB/wEgAkH/AUgbIgJBACACQQBKG0EIdEGA/gNxIAZBgEBrQQ51IgJB/wEgAkH/AUgbIgJBACACQQBKG0EQdEGAgPwHcSAKQRh0ciAIQYBAa0EOdSICQf8BIAJB/wFIGyICQQAgAkEAShtycjYCACADIAxqIQwgEkEBaiISIARHDQALIBQgC0EBaiILbCERIAMgC0cNAAsLC0AAIAcEQEEAIAIgAyAEIAUgABADIAJBACAEIAUgBiABEAQPC0EAIAIgAyAEIAUgABABIAJBACAEIAUgBiABEAIL';

		},{}],4:[function(_dereq_,module,exports){

		module.exports = {
		  name: 'resize',
		  fn: _dereq_('./resize'),
		  wasm_fn: _dereq_('./resize_wasm'),
		  wasm_src: _dereq_('./convolve_wasm_base64')
		};

		},{"./convolve_wasm_base64":3,"./resize":5,"./resize_wasm":8}],5:[function(_dereq_,module,exports){

		var createFilters = _dereq_('./resize_filter_gen');

		var _require = _dereq_('./convolve'),
		    convolveHor = _require.convolveHor,
		    convolveVert = _require.convolveVert,
		    convolveHorWithPre = _require.convolveHorWithPre,
		    convolveVertWithPre = _require.convolveVertWithPre;

		function hasAlpha(src, width, height) {
		  var ptr = 3,
		      len = width * height * 4 | 0;

		  while (ptr < len) {
		    if (src[ptr] !== 255) return true;
		    ptr = ptr + 4 | 0;
		  }

		  return false;
		}

		function resetAlpha(dst, width, height) {
		  var ptr = 3,
		      len = width * height * 4 | 0;

		  while (ptr < len) {
		    dst[ptr] = 0xFF;
		    ptr = ptr + 4 | 0;
		  }
		}

		module.exports = function resize(options) {
		  var src = options.src;
		  var srcW = options.width;
		  var srcH = options.height;
		  var destW = options.toWidth;
		  var destH = options.toHeight;
		  var scaleX = options.scaleX || options.toWidth / options.width;
		  var scaleY = options.scaleY || options.toHeight / options.height;
		  var offsetX = options.offsetX || 0;
		  var offsetY = options.offsetY || 0;
		  var dest = options.dest || new Uint8Array(destW * destH * 4);
		  var filter = typeof options.filter === 'undefined' ? 'mks2013' : options.filter;
		  var filtersX = createFilters(filter, srcW, destW, scaleX, offsetX),
		      filtersY = createFilters(filter, srcH, destH, scaleY, offsetY);
		  var tmp = new Uint16Array(destW * srcH * 4); // Autodetect if alpha channel exists, and use appropriate method

		  if (hasAlpha(src, srcW, srcH)) {
		    convolveHorWithPre(src, tmp, srcW, srcH, destW, filtersX);
		    convolveVertWithPre(tmp, dest, srcH, destW, destH, filtersY);
		  } else {
		    convolveHor(src, tmp, srcW, srcH, destW, filtersX);
		    convolveVert(tmp, dest, srcH, destW, destH, filtersY);
		    resetAlpha(dest, destW, destH);
		  }

		  return dest;
		};

		},{"./convolve":2,"./resize_filter_gen":6}],6:[function(_dereq_,module,exports){

		var FILTER_INFO = _dereq_('./resize_filter_info'); // Precision of fixed FP values


		var FIXED_FRAC_BITS = 14;

		function toFixedPoint(num) {
		  return Math.round(num * ((1 << FIXED_FRAC_BITS) - 1));
		}

		module.exports = function resizeFilterGen(filter, srcSize, destSize, scale, offset) {
		  var filterFunction = FILTER_INFO.filter[filter].fn;
		  var scaleInverted = 1.0 / scale;
		  var scaleClamped = Math.min(1.0, scale); // For upscale
		  // Filter window (averaging interval), scaled to src image

		  var srcWindow = FILTER_INFO.filter[filter].win / scaleClamped;
		  var destPixel, srcPixel, srcFirst, srcLast, filterElementSize, floatFilter, fxpFilter, total, pxl, idx, floatVal, filterTotal, filterVal;
		  var leftNotEmpty, rightNotEmpty, filterShift, filterSize;
		  var maxFilterElementSize = Math.floor((srcWindow + 1) * 2);
		  var packedFilter = new Int16Array((maxFilterElementSize + 2) * destSize);
		  var packedFilterPtr = 0;
		  var slowCopy = !packedFilter.subarray || !packedFilter.set; // For each destination pixel calculate source range and built filter values

		  for (destPixel = 0; destPixel < destSize; destPixel++) {
		    // Scaling should be done relative to central pixel point
		    srcPixel = (destPixel + 0.5) * scaleInverted + offset;
		    srcFirst = Math.max(0, Math.floor(srcPixel - srcWindow));
		    srcLast = Math.min(srcSize - 1, Math.ceil(srcPixel + srcWindow));
		    filterElementSize = srcLast - srcFirst + 1;
		    floatFilter = new Float32Array(filterElementSize);
		    fxpFilter = new Int16Array(filterElementSize);
		    total = 0.0; // Fill filter values for calculated range

		    for (pxl = srcFirst, idx = 0; pxl <= srcLast; pxl++, idx++) {
		      floatVal = filterFunction((pxl + 0.5 - srcPixel) * scaleClamped);
		      total += floatVal;
		      floatFilter[idx] = floatVal;
		    } // Normalize filter, convert to fixed point and accumulate conversion error


		    filterTotal = 0;

		    for (idx = 0; idx < floatFilter.length; idx++) {
		      filterVal = floatFilter[idx] / total;
		      filterTotal += filterVal;
		      fxpFilter[idx] = toFixedPoint(filterVal);
		    } // Compensate normalization error, to minimize brightness drift


		    fxpFilter[destSize >> 1] += toFixedPoint(1.0 - filterTotal); //
		    // Now pack filter to useable form
		    //
		    // 1. Trim heading and tailing zero values, and compensate shitf/length
		    // 2. Put all to single array in this format:
		    //
		    //    [ pos shift, data length, value1, value2, value3, ... ]
		    //

		    leftNotEmpty = 0;

		    while (leftNotEmpty < fxpFilter.length && fxpFilter[leftNotEmpty] === 0) {
		      leftNotEmpty++;
		    }

		    if (leftNotEmpty < fxpFilter.length) {
		      rightNotEmpty = fxpFilter.length - 1;

		      while (rightNotEmpty > 0 && fxpFilter[rightNotEmpty] === 0) {
		        rightNotEmpty--;
		      }

		      filterShift = srcFirst + leftNotEmpty;
		      filterSize = rightNotEmpty - leftNotEmpty + 1;
		      packedFilter[packedFilterPtr++] = filterShift; // shift

		      packedFilter[packedFilterPtr++] = filterSize; // size

		      if (!slowCopy) {
		        packedFilter.set(fxpFilter.subarray(leftNotEmpty, rightNotEmpty + 1), packedFilterPtr);
		        packedFilterPtr += filterSize;
		      } else {
		        // fallback for old IE < 11, without subarray/set methods
		        for (idx = leftNotEmpty; idx <= rightNotEmpty; idx++) {
		          packedFilter[packedFilterPtr++] = fxpFilter[idx];
		        }
		      }
		    } else {
		      // zero data, write header only
		      packedFilter[packedFilterPtr++] = 0; // shift

		      packedFilter[packedFilterPtr++] = 0; // size
		    }
		  }

		  return packedFilter;
		};

		},{"./resize_filter_info":7}],7:[function(_dereq_,module,exports){

		var filter = {
		  // Nearest neibor
		  box: {
		    win: 0.5,
		    fn: function fn(x) {
		      if (x < 0) x = -x;
		      return x < 0.5 ? 1.0 : 0.0;
		    }
		  },
		  // // Hamming
		  hamming: {
		    win: 1.0,
		    fn: function fn(x) {
		      if (x < 0) x = -x;

		      if (x >= 1.0) {
		        return 0.0;
		      }

		      if (x < 1.19209290E-07) {
		        return 1.0;
		      }

		      var xpi = x * Math.PI;
		      return Math.sin(xpi) / xpi * (0.54 + 0.46 * Math.cos(xpi / 1.0));
		    }
		  },
		  // Lanczos, win = 2
		  lanczos2: {
		    win: 2.0,
		    fn: function fn(x) {
		      if (x < 0) x = -x;

		      if (x >= 2.0) {
		        return 0.0;
		      }

		      if (x < 1.19209290E-07) {
		        return 1.0;
		      }

		      var xpi = x * Math.PI;
		      return Math.sin(xpi) / xpi * Math.sin(xpi / 2.0) / (xpi / 2.0);
		    }
		  },
		  // Lanczos, win = 3
		  lanczos3: {
		    win: 3.0,
		    fn: function fn(x) {
		      if (x < 0) x = -x;

		      if (x >= 3.0) {
		        return 0.0;
		      }

		      if (x < 1.19209290E-07) {
		        return 1.0;
		      }

		      var xpi = x * Math.PI;
		      return Math.sin(xpi) / xpi * Math.sin(xpi / 3.0) / (xpi / 3.0);
		    }
		  },
		  // Magic Kernel Sharp 2013, win = 2.5
		  // http://johncostella.com/magic/
		  mks2013: {
		    win: 2.5,
		    fn: function fn(x) {
		      if (x < 0) x = -x;

		      if (x >= 2.5) {
		        return 0.0;
		      }

		      if (x >= 1.5) {
		        return -0.125 * (x - 2.5) * (x - 2.5);
		      }

		      if (x >= 0.5) {
		        return 0.25 * (4 * x * x - 11 * x + 7);
		      }

		      return 1.0625 - 1.75 * x * x;
		    }
		  }
		};
		module.exports = {
		  filter: filter,
		  // Legacy mapping
		  f2q: {
		    box: 0,
		    hamming: 1,
		    lanczos2: 2,
		    lanczos3: 3
		  },
		  q2f: ['box', 'hamming', 'lanczos2', 'lanczos3']
		};

		},{}],8:[function(_dereq_,module,exports){

		var createFilters = _dereq_('./resize_filter_gen');

		function hasAlpha(src, width, height) {
		  var ptr = 3,
		      len = width * height * 4 | 0;

		  while (ptr < len) {
		    if (src[ptr] !== 255) return true;
		    ptr = ptr + 4 | 0;
		  }

		  return false;
		}

		function resetAlpha(dst, width, height) {
		  var ptr = 3,
		      len = width * height * 4 | 0;

		  while (ptr < len) {
		    dst[ptr] = 0xFF;
		    ptr = ptr + 4 | 0;
		  }
		}

		function asUint8Array(src) {
		  return new Uint8Array(src.buffer, 0, src.byteLength);
		}

		var IS_LE = true; // should not crash everything on module load in old browsers

		try {
		  IS_LE = new Uint32Array(new Uint8Array([1, 0, 0, 0]).buffer)[0] === 1;
		} catch (__) {}

		function copyInt16asLE(src, target, target_offset) {
		  if (IS_LE) {
		    target.set(asUint8Array(src), target_offset);
		    return;
		  }

		  for (var ptr = target_offset, i = 0; i < src.length; i++) {
		    var data = src[i];
		    target[ptr++] = data & 0xFF;
		    target[ptr++] = data >> 8 & 0xFF;
		  }
		}

		module.exports = function resize_wasm(options) {
		  var src = options.src;
		  var srcW = options.width;
		  var srcH = options.height;
		  var destW = options.toWidth;
		  var destH = options.toHeight;
		  var scaleX = options.scaleX || options.toWidth / options.width;
		  var scaleY = options.scaleY || options.toHeight / options.height;
		  var offsetX = options.offsetX || 0.0;
		  var offsetY = options.offsetY || 0.0;
		  var dest = options.dest || new Uint8Array(destW * destH * 4);
		  var filter = typeof options.filter === 'undefined' ? 'mks2013' : options.filter;
		  var filtersX = createFilters(filter, srcW, destW, scaleX, offsetX),
		      filtersY = createFilters(filter, srcH, destH, scaleY, offsetY); // destination is 0 too.

		  var src_offset = 0;
		  var src_size = Math.max(src.byteLength, dest.byteLength); // buffer between convolve passes

		  var tmp_offset = this.__align(src_offset + src_size);

		  var tmp_size = srcH * destW * 4 * 2; // 2 bytes per channel

		  var filtersX_offset = this.__align(tmp_offset + tmp_size);

		  var filtersY_offset = this.__align(filtersX_offset + filtersX.byteLength);

		  var alloc_bytes = filtersY_offset + filtersY.byteLength;

		  var instance = this.__instance('resize', alloc_bytes); //
		  // Fill memory block with data to process
		  //


		  var mem = new Uint8Array(this.__memory.buffer);
		  var mem32 = new Uint32Array(this.__memory.buffer); // 32-bit copy is much faster in chrome

		  var src32 = new Uint32Array(src.buffer);
		  mem32.set(src32); // We should guarantee LE bytes order. Filters are not big, so
		  // speed difference is not significant vs direct .set()

		  copyInt16asLE(filtersX, mem, filtersX_offset);
		  copyInt16asLE(filtersY, mem, filtersY_offset); // Now call webassembly method
		  // emsdk does method names with '_'

		  var fn = instance.exports.convolveHV || instance.exports._convolveHV;

		  if (hasAlpha(src, srcW, srcH)) {
		    fn(filtersX_offset, filtersY_offset, tmp_offset, srcW, srcH, destW, destH, 1);
		  } else {
		    fn(filtersX_offset, filtersY_offset, tmp_offset, srcW, srcH, destW, destH, 0);
		    resetAlpha(dest, destW, destH);
		  } //
		  // Copy data back to typed array
		  //
		  // 32-bit copy is much faster in chrome


		  var dest32 = new Uint32Array(dest.buffer);
		  dest32.set(new Uint32Array(this.__memory.buffer, 0, destH * destW));
		  return dest;
		};

		},{"./resize_filter_gen":6}],9:[function(_dereq_,module,exports){

		module.exports = {
		  name: 'unsharp_mask',
		  fn: _dereq_('./unsharp_mask'),
		  wasm_fn: _dereq_('./unsharp_mask_wasm'),
		  wasm_src: _dereq_('./unsharp_mask_wasm_base64')
		};

		},{"./unsharp_mask":10,"./unsharp_mask_wasm":11,"./unsharp_mask_wasm_base64":12}],10:[function(_dereq_,module,exports){

		var glur_mono16 = _dereq_('glur/mono16');

		function hsv_v16(img, width, height) {
		  var size = width * height;
		  var out = new Uint16Array(size);
		  var r, g, b, max;

		  for (var i = 0; i < size; i++) {
		    r = img[4 * i];
		    g = img[4 * i + 1];
		    b = img[4 * i + 2];
		    max = r >= g && r >= b ? r : g >= b && g >= r ? g : b;
		    out[i] = max << 8;
		  }

		  return out;
		}

		module.exports = function unsharp(img, width, height, amount, radius, threshold) {
		  var v1, v2, vmul;
		  var diff, iTimes4;

		  if (amount === 0 || radius < 0.5) {
		    return;
		  }

		  if (radius > 2.0) {
		    radius = 2.0;
		  }

		  var brightness = hsv_v16(img, width, height);
		  var blured = new Uint16Array(brightness); // copy, because blur modify src

		  glur_mono16(blured, width, height, radius);
		  var amountFp = amount / 100 * 0x1000 + 0.5 | 0;
		  var thresholdFp = threshold << 8;
		  var size = width * height;
		  /* eslint-disable indent */

		  for (var i = 0; i < size; i++) {
		    v1 = brightness[i];
		    diff = v1 - blured[i];

		    if (Math.abs(diff) >= thresholdFp) {
		      // add unsharp mask to the brightness channel
		      v2 = v1 + (amountFp * diff + 0x800 >> 12); // Both v1 and v2 are within [0.0 .. 255.0] (0000-FF00) range, never going into
		      // [255.003 .. 255.996] (FF01-FFFF). This allows to round this value as (x+.5)|0
		      // later without overflowing.

		      v2 = v2 > 0xff00 ? 0xff00 : v2;
		      v2 = v2 < 0x0000 ? 0x0000 : v2; // Avoid division by 0. V=0 means rgb(0,0,0), unsharp with unsharpAmount>0 cannot
		      // change this value (because diff between colors gets inflated), so no need to verify correctness.

		      v1 = v1 !== 0 ? v1 : 1; // Multiplying V in HSV model by a constant is equivalent to multiplying each component
		      // in RGB by the same constant (same for HSL), see also:
		      // https://beesbuzz.biz/code/16-hsv-color-transforms

		      vmul = (v2 << 12) / v1 | 0; // Result will be in [0..255] range because:
		      //  - all numbers are positive
		      //  - r,g,b <= (v1/256)
		      //  - r,g,b,(v1/256),(v2/256) <= 255
		      // So highest this number can get is X*255/X+0.5=255.5 which is < 256 and rounds down.

		      iTimes4 = i * 4;
		      img[iTimes4] = img[iTimes4] * vmul + 0x800 >> 12; // R

		      img[iTimes4 + 1] = img[iTimes4 + 1] * vmul + 0x800 >> 12; // G

		      img[iTimes4 + 2] = img[iTimes4 + 2] * vmul + 0x800 >> 12; // B
		    }
		  }
		};

		},{"glur/mono16":18}],11:[function(_dereq_,module,exports){

		module.exports = function unsharp(img, width, height, amount, radius, threshold) {
		  if (amount === 0 || radius < 0.5) {
		    return;
		  }

		  if (radius > 2.0) {
		    radius = 2.0;
		  }

		  var pixels = width * height;
		  var img_bytes_cnt = pixels * 4;
		  var hsv_bytes_cnt = pixels * 2;
		  var blur_bytes_cnt = pixels * 2;
		  var blur_line_byte_cnt = Math.max(width, height) * 4; // float32 array

		  var blur_coeffs_byte_cnt = 8 * 4; // float32 array

		  var img_offset = 0;
		  var hsv_offset = img_bytes_cnt;
		  var blur_offset = hsv_offset + hsv_bytes_cnt;
		  var blur_tmp_offset = blur_offset + blur_bytes_cnt;
		  var blur_line_offset = blur_tmp_offset + blur_bytes_cnt;
		  var blur_coeffs_offset = blur_line_offset + blur_line_byte_cnt;

		  var instance = this.__instance('unsharp_mask', img_bytes_cnt + hsv_bytes_cnt + blur_bytes_cnt * 2 + blur_line_byte_cnt + blur_coeffs_byte_cnt, {
		    exp: Math.exp
		  }); // 32-bit copy is much faster in chrome


		  var img32 = new Uint32Array(img.buffer);
		  var mem32 = new Uint32Array(this.__memory.buffer);
		  mem32.set(img32); // HSL

		  var fn = instance.exports.hsv_v16 || instance.exports._hsv_v16;
		  fn(img_offset, hsv_offset, width, height); // BLUR

		  fn = instance.exports.blurMono16 || instance.exports._blurMono16;
		  fn(hsv_offset, blur_offset, blur_tmp_offset, blur_line_offset, blur_coeffs_offset, width, height, radius); // UNSHARP

		  fn = instance.exports.unsharp || instance.exports._unsharp;
		  fn(img_offset, img_offset, hsv_offset, blur_offset, width, height, amount, threshold); // 32-bit copy is much faster in chrome

		  img32.set(new Uint32Array(this.__memory.buffer, 0, pixels));
		};

		},{}],12:[function(_dereq_,module,exports){
		/* eslint-disable max-len */

		module.exports = 'AGFzbQEAAAAADAZkeWxpbmsAAAAAAAE0B2AAAGAEf39/fwBgBn9/f39/fwBgCH9/f39/f39/AGAIf39/f39/f30AYAJ9fwBgAXwBfAIZAgNlbnYDZXhwAAYDZW52Bm1lbW9yeQIAAAMHBgAFAgQBAwYGAX8AQQALB4oBCBFfX3dhc21fY2FsbF9jdG9ycwABFl9fYnVpbGRfZ2F1c3NpYW5fY29lZnMAAg5fX2dhdXNzMTZfbGluZQADCmJsdXJNb25vMTYABAdoc3ZfdjE2AAUHdW5zaGFycAAGDF9fZHNvX2hhbmRsZQMAGF9fd2FzbV9hcHBseV9kYXRhX3JlbG9jcwABCsUMBgMAAQvWAQEHfCABRNuGukOCGvs/IAC7oyICRAAAAAAAAADAohAAIgW2jDgCFCABIAKaEAAiAyADoCIGtjgCECABRAAAAAAAAPA/IAOhIgQgBKIgAyACIAKgokQAAAAAAADwP6AgBaGjIgS2OAIAIAEgBSAEmqIiB7Y4AgwgASADIAJEAAAAAAAA8D+gIASioiIItjgCCCABIAMgAkQAAAAAAADwv6AgBKKiIgK2OAIEIAEgByAIoCAFRAAAAAAAAPA/IAahoCIDo7Y4AhwgASAEIAKgIAOjtjgCGAuGBQMGfwl8An0gAyoCDCEVIAMqAgghFiADKgIUuyERIAMqAhC7IRACQCAEQQFrIghBAEgiCQRAIAIhByAAIQYMAQsgAiAALwEAuCIPIAMqAhi7oiIMIBGiIg0gDCAQoiAPIAMqAgS7IhOiIhQgAyoCALsiEiAPoqCgoCIOtjgCACACQQRqIQcgAEECaiEGIAhFDQAgCEEBIAhBAUgbIgpBf3MhCwJ/IAQgCmtBAXFFBEAgDiENIAgMAQsgAiANIA4gEKIgFCASIAAvAQK4Ig+ioKCgIg22OAIEIAJBCGohByAAQQRqIQYgDiEMIARBAmsLIQIgC0EAIARrRg0AA0AgByAMIBGiIA0gEKIgDyAToiASIAYvAQC4Ig6ioKCgIgy2OAIAIAcgDSARoiAMIBCiIA4gE6IgEiAGLwECuCIPoqCgoCINtjgCBCAHQQhqIQcgBkEEaiEGIAJBAkohACACQQJrIQIgAA0ACwsCQCAJDQAgASAFIAhsQQF0aiIAAn8gBkECay8BACICuCINIBW7IhKiIA0gFrsiE6KgIA0gAyoCHLuiIgwgEKKgIAwgEaKgIg8gB0EEayIHKgIAu6AiDkQAAAAAAADwQWMgDkQAAAAAAAAAAGZxBEAgDqsMAQtBAAs7AQAgCEUNACAGQQRrIQZBACAFa0EBdCEBA0ACfyANIBKiIAJB//8DcbgiDSAToqAgDyIOIBCioCAMIBGioCIPIAdBBGsiByoCALugIgxEAAAAAAAA8EFjIAxEAAAAAAAAAABmcQRAIAyrDAELQQALIQMgBi8BACECIAAgAWoiACADOwEAIAZBAmshBiAIQQFKIQMgDiEMIAhBAWshCCADDQALCwvRAgIBfwd8AkAgB0MAAAAAWw0AIARE24a6Q4Ia+z8gB0MAAAA/l7ujIglEAAAAAAAAAMCiEAAiDLaMOAIUIAQgCZoQACIKIAqgIg22OAIQIAREAAAAAAAA8D8gCqEiCyALoiAKIAkgCaCiRAAAAAAAAPA/oCAMoaMiC7Y4AgAgBCAMIAuaoiIOtjgCDCAEIAogCUQAAAAAAADwP6AgC6KiIg+2OAIIIAQgCiAJRAAAAAAAAPC/oCALoqIiCbY4AgQgBCAOIA+gIAxEAAAAAAAA8D8gDaGgIgqjtjgCHCAEIAsgCaAgCqO2OAIYIAYEQANAIAAgBSAIbEEBdGogAiAIQQF0aiADIAQgBSAGEAMgCEEBaiIIIAZHDQALCyAFRQ0AQQAhCANAIAIgBiAIbEEBdGogASAIQQF0aiADIAQgBiAFEAMgCEEBaiIIIAVHDQALCwtxAQN/IAIgA2wiBQRAA0AgASAAKAIAIgRBEHZB/wFxIgIgAiAEQQh2Qf8BcSIDIAMgBEH/AXEiBEkbIAIgA0sbIgYgBiAEIAIgBEsbIAMgBEsbQQh0OwEAIAFBAmohASAAQQRqIQAgBUEBayIFDQALCwuZAgIDfwF8IAQgBWwhBAJ/IAazQwAAgEWUQwAAyEKVu0QAAAAAAADgP6AiC5lEAAAAAAAA4EFjBEAgC6oMAQtBgICAgHgLIQUgBARAIAdBCHQhCUEAIQYDQCAJIAIgBkEBdCIHai8BACIBIAMgB2ovAQBrIgcgB0EfdSIIaiAIc00EQCAAIAZBAnQiCGoiCiAFIAdsQYAQakEMdSABaiIHQYD+AyAHQYD+A0gbIgdBACAHQQBKG0EMdCABQQEgARtuIgEgCi0AAGxBgBBqQQx2OgAAIAAgCEEBcmoiByABIActAABsQYAQakEMdjoAACAAIAhBAnJqIgcgASAHLQAAbEGAEGpBDHY6AAALIAZBAWoiBiAERw0ACwsL';

		},{}],13:[function(_dereq_,module,exports){

		var GC_INTERVAL = 100;

		function Pool(create, idle) {
		  this.create = create;
		  this.available = [];
		  this.acquired = {};
		  this.lastId = 1;
		  this.timeoutId = 0;
		  this.idle = idle || 2000;
		}

		Pool.prototype.acquire = function () {
		  var _this = this;

		  var resource;

		  if (this.available.length !== 0) {
		    resource = this.available.pop();
		  } else {
		    resource = this.create();
		    resource.id = this.lastId++;

		    resource.release = function () {
		      return _this.release(resource);
		    };
		  }

		  this.acquired[resource.id] = resource;
		  return resource;
		};

		Pool.prototype.release = function (resource) {
		  var _this2 = this;

		  delete this.acquired[resource.id];
		  resource.lastUsed = Date.now();
		  this.available.push(resource);

		  if (this.timeoutId === 0) {
		    this.timeoutId = setTimeout(function () {
		      return _this2.gc();
		    }, GC_INTERVAL);
		  }
		};

		Pool.prototype.gc = function () {
		  var _this3 = this;

		  var now = Date.now();
		  this.available = this.available.filter(function (resource) {
		    if (now - resource.lastUsed > _this3.idle) {
		      resource.destroy();
		      return false;
		    }

		    return true;
		  });

		  if (this.available.length !== 0) {
		    this.timeoutId = setTimeout(function () {
		      return _this3.gc();
		    }, GC_INTERVAL);
		  } else {
		    this.timeoutId = 0;
		  }
		};

		module.exports = Pool;

		},{}],14:[function(_dereq_,module,exports){
		// min size = 1 can consume large amount of memory

		var MIN_INNER_TILE_SIZE = 2;

		module.exports = function createStages(fromWidth, fromHeight, toWidth, toHeight, srcTileSize, destTileBorder) {
		  var scaleX = toWidth / fromWidth;
		  var scaleY = toHeight / fromHeight; // derived from createRegions equation:
		  // innerTileWidth = pixelFloor(srcTileSize * scaleX) - 2 * destTileBorder;

		  var minScale = (2 * destTileBorder + MIN_INNER_TILE_SIZE + 1) / srcTileSize; // refuse to scale image multiple times by less than twice each time,
		  // it could only happen because of invalid options

		  if (minScale > 0.5) return [[toWidth, toHeight]];
		  var stageCount = Math.ceil(Math.log(Math.min(scaleX, scaleY)) / Math.log(minScale)); // no additional resizes are necessary,
		  // stageCount can be zero or be negative when enlarging the image

		  if (stageCount <= 1) return [[toWidth, toHeight]];
		  var result = [];

		  for (var i = 0; i < stageCount; i++) {
		    var width = Math.round(Math.pow(Math.pow(fromWidth, stageCount - i - 1) * Math.pow(toWidth, i + 1), 1 / stageCount));
		    var height = Math.round(Math.pow(Math.pow(fromHeight, stageCount - i - 1) * Math.pow(toHeight, i + 1), 1 / stageCount));
		    result.push([width, height]);
		  }

		  return result;
		};

		},{}],15:[function(_dereq_,module,exports){
		/*
		 * pixelFloor and pixelCeil are modified versions of Math.floor and Math.ceil
		 * functions which take into account floating point arithmetic errors.
		 * Those errors can cause undesired increments/decrements of sizes and offsets:
		 * Math.ceil(36 / (36 / 500)) = 501
		 * pixelCeil(36 / (36 / 500)) = 500
		 */

		var PIXEL_EPSILON = 1e-5;

		function pixelFloor(x) {
		  var nearest = Math.round(x);

		  if (Math.abs(x - nearest) < PIXEL_EPSILON) {
		    return nearest;
		  }

		  return Math.floor(x);
		}

		function pixelCeil(x) {
		  var nearest = Math.round(x);

		  if (Math.abs(x - nearest) < PIXEL_EPSILON) {
		    return nearest;
		  }

		  return Math.ceil(x);
		}

		module.exports = function createRegions(options) {
		  var scaleX = options.toWidth / options.width;
		  var scaleY = options.toHeight / options.height;
		  var innerTileWidth = pixelFloor(options.srcTileSize * scaleX) - 2 * options.destTileBorder;
		  var innerTileHeight = pixelFloor(options.srcTileSize * scaleY) - 2 * options.destTileBorder; // prevent infinite loop, this should never happen

		  if (innerTileWidth < 1 || innerTileHeight < 1) {
		    throw new Error('Internal error in pica: target tile width/height is too small.');
		  }

		  var x, y;
		  var innerX, innerY, toTileWidth, toTileHeight;
		  var tiles = [];
		  var tile; // we go top-to-down instead of left-to-right to make image displayed from top to
		  // doesn in the browser

		  for (innerY = 0; innerY < options.toHeight; innerY += innerTileHeight) {
		    for (innerX = 0; innerX < options.toWidth; innerX += innerTileWidth) {
		      x = innerX - options.destTileBorder;

		      if (x < 0) {
		        x = 0;
		      }

		      toTileWidth = innerX + innerTileWidth + options.destTileBorder - x;

		      if (x + toTileWidth >= options.toWidth) {
		        toTileWidth = options.toWidth - x;
		      }

		      y = innerY - options.destTileBorder;

		      if (y < 0) {
		        y = 0;
		      }

		      toTileHeight = innerY + innerTileHeight + options.destTileBorder - y;

		      if (y + toTileHeight >= options.toHeight) {
		        toTileHeight = options.toHeight - y;
		      }

		      tile = {
		        toX: x,
		        toY: y,
		        toWidth: toTileWidth,
		        toHeight: toTileHeight,
		        toInnerX: innerX,
		        toInnerY: innerY,
		        toInnerWidth: innerTileWidth,
		        toInnerHeight: innerTileHeight,
		        offsetX: x / scaleX - pixelFloor(x / scaleX),
		        offsetY: y / scaleY - pixelFloor(y / scaleY),
		        scaleX: scaleX,
		        scaleY: scaleY,
		        x: pixelFloor(x / scaleX),
		        y: pixelFloor(y / scaleY),
		        width: pixelCeil(toTileWidth / scaleX),
		        height: pixelCeil(toTileHeight / scaleY)
		      };
		      tiles.push(tile);
		    }
		  }

		  return tiles;
		};

		},{}],16:[function(_dereq_,module,exports){

		function objClass(obj) {
		  return Object.prototype.toString.call(obj);
		}

		module.exports.isCanvas = function isCanvas(element) {
		  var cname = objClass(element);
		  return cname === '[object HTMLCanvasElement]'
		  /* browser */
		  || cname === '[object OffscreenCanvas]' || cname === '[object Canvas]'
		  /* node-canvas */
		  ;
		};

		module.exports.isImage = function isImage(element) {
		  return objClass(element) === '[object HTMLImageElement]';
		};

		module.exports.isImageBitmap = function isImageBitmap(element) {
		  return objClass(element) === '[object ImageBitmap]';
		};

		module.exports.limiter = function limiter(concurrency) {
		  var active = 0,
		      queue = [];

		  function roll() {
		    if (active < concurrency && queue.length) {
		      active++;
		      queue.shift()();
		    }
		  }

		  return function limit(fn) {
		    return new Promise(function (resolve, reject) {
		      queue.push(function () {
		        fn().then(function (result) {
		          resolve(result);
		          active--;
		          roll();
		        }, function (err) {
		          reject(err);
		          active--;
		          roll();
		        });
		      });
		      roll();
		    });
		  };
		};

		module.exports.cib_quality_name = function cib_quality_name(num) {
		  switch (num) {
		    case 0:
		      return 'pixelated';

		    case 1:
		      return 'low';

		    case 2:
		      return 'medium';
		  }

		  return 'high';
		};

		module.exports.cib_support = function cib_support(createCanvas) {
		  return Promise.resolve().then(function () {
		    if (typeof createImageBitmap === 'undefined') {
		      return false;
		    }

		    var c = createCanvas(100, 100);
		    return createImageBitmap(c, 0, 0, 100, 100, {
		      resizeWidth: 10,
		      resizeHeight: 10,
		      resizeQuality: 'high'
		    }).then(function (bitmap) {
		      var status = bitmap.width === 10; // Branch below is filtered on upper level. We do not call resize
		      // detection for basic ImageBitmap.
		      //
		      // https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap
		      // old Crome 51 has ImageBitmap without .close(). Then this code
		      // will throw and return 'false' as expected.
		      //

		      bitmap.close();
		      c = null;
		      return status;
		    });
		  })["catch"](function () {
		    return false;
		  });
		};

		module.exports.worker_offscreen_canvas_support = function worker_offscreen_canvas_support() {
		  return new Promise(function (resolve, reject) {
		    if (typeof OffscreenCanvas === 'undefined') {
		      // if OffscreenCanvas is present, we assume browser supports Worker and built-in Promise as well
		      resolve(false);
		      return;
		    }

		    function workerPayload(self) {
		      if (typeof createImageBitmap === 'undefined') {
		        self.postMessage(false);
		        return;
		      }

		      Promise.resolve().then(function () {
		        var canvas = new OffscreenCanvas(10, 10); // test that 2d context can be used in worker

		        var ctx = canvas.getContext('2d');
		        ctx.rect(0, 0, 1, 1); // test that cib can be used to return image bitmap from worker

		        return createImageBitmap(canvas, 0, 0, 1, 1);
		      }).then(function () {
		        return self.postMessage(true);
		      }, function () {
		        return self.postMessage(false);
		      });
		    }

		    var code = btoa("(".concat(workerPayload.toString(), ")(self);"));
		    var w = new Worker("data:text/javascript;base64,".concat(code));

		    w.onmessage = function (ev) {
		      return resolve(ev.data);
		    };

		    w.onerror = reject;
		  }).then(function (result) {
		    return result;
		  }, function () {
		    return false;
		  });
		}; // Check if canvas.getContext('2d').getImageData can be used,
		// FireFox randomizes the output of that function in `privacy.resistFingerprinting` mode


		module.exports.can_use_canvas = function can_use_canvas(createCanvas) {
		  var usable = false;

		  try {
		    var canvas = createCanvas(2, 1);
		    var ctx = canvas.getContext('2d');
		    var d = ctx.createImageData(2, 1);
		    d.data[0] = 12;
		    d.data[1] = 23;
		    d.data[2] = 34;
		    d.data[3] = 255;
		    d.data[4] = 45;
		    d.data[5] = 56;
		    d.data[6] = 67;
		    d.data[7] = 255;
		    ctx.putImageData(d, 0, 0);
		    d = null;
		    d = ctx.getImageData(0, 0, 2, 1);

		    if (d.data[0] === 12 && d.data[1] === 23 && d.data[2] === 34 && d.data[3] === 255 && d.data[4] === 45 && d.data[5] === 56 && d.data[6] === 67 && d.data[7] === 255) {
		      usable = true;
		    }
		  } catch (err) {}

		  return usable;
		}; // Check if createImageBitmap(img, sx, sy, sw, sh) signature works correctly
		// with JPEG images oriented with Exif;
		// https://bugs.chromium.org/p/chromium/issues/detail?id=1220671
		// TODO: remove after it's fixed in chrome for at least 2 releases


		module.exports.cib_can_use_region = function cib_can_use_region() {
		  return new Promise(function (resolve) {
		    // `Image` check required for use in `ServiceWorker`
		    if (typeof Image === 'undefined' || typeof createImageBitmap === 'undefined') {
		      resolve(false);
		      return;
		    }

		    var image = new Image();
		    image.src = 'data:image/jpeg;base64,' + '/9j/4QBiRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAYAAAEaAAUAAAABAAAASgEbAAUAA' + 'AABAAAAUgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAABIAAAAAQAAAEgAAAAB/9' + 'sAQwAEAwMEAwMEBAMEBQQEBQYKBwYGBgYNCQoICg8NEBAPDQ8OERMYFBESFxIODxUcFRc' + 'ZGRsbGxAUHR8dGh8YGhsa/9sAQwEEBQUGBQYMBwcMGhEPERoaGhoaGhoaGhoaGhoaGhoa' + 'GhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoa/8IAEQgAAQACAwERAAIRAQMRA' + 'f/EABQAAQAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAA' + 'IQAxAAAAF/P//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAA' + 'AAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIB' + 'AT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAA' + 'AAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQH//EABQRAQAAAAAAAAAAAAAAAA' + 'AAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQ' + 'QAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z';

		    image.onload = function () {
		      createImageBitmap(image, 0, 0, image.width, image.height).then(function (bitmap) {
		        if (bitmap.width === image.width && bitmap.height === image.height) {
		          resolve(true);
		        } else {
		          resolve(false);
		        }
		      }, function () {
		        return resolve(false);
		      });
		    };

		    image.onerror = function () {
		      return resolve(false);
		    };
		  });
		};

		},{}],17:[function(_dereq_,module,exports){

		module.exports = function () {
		  var MathLib = _dereq_('./mathlib');

		  var mathLib;
		  /* eslint-disable no-undef */

		  onmessage = function onmessage(ev) {
		    var tileOpts = ev.data.opts;

		    if (!tileOpts.src && tileOpts.srcBitmap) {
		      var canvas = new OffscreenCanvas(tileOpts.width, tileOpts.height);
		      var ctx = canvas.getContext('2d');
		      ctx.drawImage(tileOpts.srcBitmap, 0, 0);
		      tileOpts.src = ctx.getImageData(0, 0, tileOpts.width, tileOpts.height).data;
		      canvas.width = canvas.height = 0;
		      canvas = null;
		      tileOpts.srcBitmap.close();
		      tileOpts.srcBitmap = null; // Temporary force out data to typed array, because Chrome have artefacts
		      // https://github.com/nodeca/pica/issues/223
		      // returnBitmap = true;
		    }

		    if (!mathLib) mathLib = new MathLib(ev.data.features); // Use multimath's sync auto-init. Avoid Promise use in old browsers,
		    // because polyfills are not propagated to webworker.

		    var data = mathLib.resizeAndUnsharp(tileOpts);

		    {
		      postMessage({
		        data: data
		      }, [data.buffer]);
		    }
		  };
		};

		},{"./mathlib":1}],18:[function(_dereq_,module,exports){
		// Calculate Gaussian blur of an image using IIR filter
		// The method is taken from Intel's white paper and code example attached to it:
		// https://software.intel.com/en-us/articles/iir-gaussian-blur-filter
		// -implementation-using-intel-advanced-vector-extensions

		var a0, a1, a2, a3, b1, b2, left_corner, right_corner;

		function gaussCoef(sigma) {
		  if (sigma < 0.5) {
		    sigma = 0.5;
		  }

		  var a = Math.exp(0.726 * 0.726) / sigma,
		      g1 = Math.exp(-a),
		      g2 = Math.exp(-2 * a),
		      k = (1 - g1) * (1 - g1) / (1 + 2 * a * g1 - g2);

		  a0 = k;
		  a1 = k * (a - 1) * g1;
		  a2 = k * (a + 1) * g1;
		  a3 = -k * g2;
		  b1 = 2 * g1;
		  b2 = -g2;
		  left_corner = (a0 + a1) / (1 - b1 - b2);
		  right_corner = (a2 + a3) / (1 - b1 - b2);

		  // Attempt to force type to FP32.
		  return new Float32Array([ a0, a1, a2, a3, b1, b2, left_corner, right_corner ]);
		}

		function convolveMono16(src, out, line, coeff, width, height) {
		  // takes src image and writes the blurred and transposed result into out

		  var prev_src, curr_src, curr_out, prev_out, prev_prev_out;
		  var src_index, out_index, line_index;
		  var i, j;
		  var coeff_a0, coeff_a1, coeff_b1, coeff_b2;

		  for (i = 0; i < height; i++) {
		    src_index = i * width;
		    out_index = i;
		    line_index = 0;

		    // left to right
		    prev_src = src[src_index];
		    prev_prev_out = prev_src * coeff[6];
		    prev_out = prev_prev_out;

		    coeff_a0 = coeff[0];
		    coeff_a1 = coeff[1];
		    coeff_b1 = coeff[4];
		    coeff_b2 = coeff[5];

		    for (j = 0; j < width; j++) {
		      curr_src = src[src_index];

		      curr_out = curr_src * coeff_a0 +
		                 prev_src * coeff_a1 +
		                 prev_out * coeff_b1 +
		                 prev_prev_out * coeff_b2;

		      prev_prev_out = prev_out;
		      prev_out = curr_out;
		      prev_src = curr_src;

		      line[line_index] = prev_out;
		      line_index++;
		      src_index++;
		    }

		    src_index--;
		    line_index--;
		    out_index += height * (width - 1);

		    // right to left
		    prev_src = src[src_index];
		    prev_prev_out = prev_src * coeff[7];
		    prev_out = prev_prev_out;
		    curr_src = prev_src;

		    coeff_a0 = coeff[2];
		    coeff_a1 = coeff[3];

		    for (j = width - 1; j >= 0; j--) {
		      curr_out = curr_src * coeff_a0 +
		                 prev_src * coeff_a1 +
		                 prev_out * coeff_b1 +
		                 prev_prev_out * coeff_b2;

		      prev_prev_out = prev_out;
		      prev_out = curr_out;

		      prev_src = curr_src;
		      curr_src = src[src_index];

		      out[out_index] = line[line_index] + prev_out;

		      src_index--;
		      line_index--;
		      out_index -= height;
		    }
		  }
		}


		function blurMono16(src, width, height, radius) {
		  // Quick exit on zero radius
		  if (!radius) { return; }

		  var out      = new Uint16Array(src.length),
		      tmp_line = new Float32Array(Math.max(width, height));

		  var coeff = gaussCoef(radius);

		  convolveMono16(src, out, tmp_line, coeff, width, height);
		  convolveMono16(out, src, tmp_line, coeff, height, width);
		}

		module.exports = blurMono16;

		},{}],19:[function(_dereq_,module,exports){


		var assign         = _dereq_('object-assign');
		var base64decode   = _dereq_('./lib/base64decode');
		var hasWebAssembly = _dereq_('./lib/wa_detect');


		var DEFAULT_OPTIONS = {
		  js: true,
		  wasm: true
		};


		function MultiMath(options) {
		  if (!(this instanceof MultiMath)) return new MultiMath(options);

		  var opts = assign({}, DEFAULT_OPTIONS, options || {});

		  this.options         = opts;

		  this.__cache         = {};

		  this.__init_promise  = null;
		  this.__modules       = opts.modules || {};
		  this.__memory        = null;
		  this.__wasm          = {};

		  this.__isLE = ((new Uint32Array((new Uint8Array([ 1, 0, 0, 0 ])).buffer))[0] === 1);

		  if (!this.options.js && !this.options.wasm) {
		    throw new Error('mathlib: at least "js" or "wasm" should be enabled');
		  }
		}


		MultiMath.prototype.has_wasm = hasWebAssembly;


		MultiMath.prototype.use = function (module) {
		  this.__modules[module.name] = module;

		  // Pin the best possible implementation
		  if (this.options.wasm && this.has_wasm() && module.wasm_fn) {
		    this[module.name] = module.wasm_fn;
		  } else {
		    this[module.name] = module.fn;
		  }

		  return this;
		};


		MultiMath.prototype.init = function () {
		  if (this.__init_promise) return this.__init_promise;

		  if (!this.options.js && this.options.wasm && !this.has_wasm()) {
		    return Promise.reject(new Error('mathlib: only "wasm" was enabled, but it\'s not supported'));
		  }

		  var self = this;

		  this.__init_promise = Promise.all(Object.keys(self.__modules).map(function (name) {
		    var module = self.__modules[name];

		    if (!self.options.wasm || !self.has_wasm() || !module.wasm_fn) return null;

		    // If already compiled - exit
		    if (self.__wasm[name]) return null;

		    // Compile wasm source
		    return WebAssembly.compile(self.__base64decode(module.wasm_src))
		      .then(function (m) { self.__wasm[name] = m; });
		  }))
		    .then(function () { return self; });

		  return this.__init_promise;
		};


		////////////////////////////////////////////////////////////////////////////////
		// Methods below are for internal use from plugins


		// Simple decode base64 to typed array. Useful to load embedded webassembly
		// code. You probably don't need to call this method directly.
		//
		MultiMath.prototype.__base64decode = base64decode;


		// Increase current memory to include specified number of bytes. Do nothing if
		// size is already ok. You probably don't need to call this method directly,
		// because it will be invoked from `.__instance()`.
		//
		MultiMath.prototype.__reallocate = function mem_grow_to(bytes) {
		  if (!this.__memory) {
		    this.__memory = new WebAssembly.Memory({
		      initial: Math.ceil(bytes / (64 * 1024))
		    });
		    return this.__memory;
		  }

		  var mem_size = this.__memory.buffer.byteLength;

		  if (mem_size < bytes) {
		    this.__memory.grow(Math.ceil((bytes - mem_size) / (64 * 1024)));
		  }

		  return this.__memory;
		};


		// Returns instantinated webassembly item by name, with specified memory size
		// and environment.
		// - use cache if available
		// - do sync module init, if async init was not called earlier
		// - allocate memory if not enougth
		// - can export functions to webassembly via "env_extra",
		//   for example, { exp: Math.exp }
		//
		MultiMath.prototype.__instance = function instance(name, memsize, env_extra) {
		  if (memsize) this.__reallocate(memsize);

		  // If .init() was not called, do sync compile
		  if (!this.__wasm[name]) {
		    var module = this.__modules[name];
		    this.__wasm[name] = new WebAssembly.Module(this.__base64decode(module.wasm_src));
		  }

		  if (!this.__cache[name]) {
		    var env_base = {
		      memoryBase: 0,
		      memory: this.__memory,
		      tableBase: 0,
		      table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
		    };

		    this.__cache[name] = new WebAssembly.Instance(this.__wasm[name], {
		      env: assign(env_base, env_extra || {})
		    });
		  }

		  return this.__cache[name];
		};


		// Helper to calculate memory aligh for pointers. Webassembly does not require
		// this, but you may wish to experiment. Default base = 8;
		//
		MultiMath.prototype.__align = function align(number, base) {
		  base = base || 8;
		  var reminder = number % base;
		  return number + (reminder ? base - reminder : 0);
		};


		module.exports = MultiMath;

		},{"./lib/base64decode":20,"./lib/wa_detect":21,"object-assign":22}],20:[function(_dereq_,module,exports){


		var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';


		module.exports = function base64decode(str) {
		  var input = str.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
		      max   = input.length;

		  var out = new Uint8Array((max * 3) >> 2);

		  // Collect by 6*4 bits (3 bytes)

		  var bits = 0;
		  var ptr  = 0;

		  for (var idx = 0; idx < max; idx++) {
		    if ((idx % 4 === 0) && idx) {
		      out[ptr++] = (bits >> 16) & 0xFF;
		      out[ptr++] = (bits >> 8) & 0xFF;
		      out[ptr++] = bits & 0xFF;
		    }

		    bits = (bits << 6) | BASE64_MAP.indexOf(input.charAt(idx));
		  }

		  // Dump tail

		  var tailbits = (max % 4) * 6;

		  if (tailbits === 0) {
		    out[ptr++] = (bits >> 16) & 0xFF;
		    out[ptr++] = (bits >> 8) & 0xFF;
		    out[ptr++] = bits & 0xFF;
		  } else if (tailbits === 18) {
		    out[ptr++] = (bits >> 10) & 0xFF;
		    out[ptr++] = (bits >> 2) & 0xFF;
		  } else if (tailbits === 12) {
		    out[ptr++] = (bits >> 4) & 0xFF;
		  }

		  return out;
		};

		},{}],21:[function(_dereq_,module,exports){


		var wa;


		module.exports = function hasWebAssembly() {
		  // use cache if called before;
		  if (typeof wa !== 'undefined') return wa;

		  wa = false;

		  if (typeof WebAssembly === 'undefined') return wa;

		  // If WebAssenbly is disabled, code can throw on compile
		  try {
		    // https://github.com/brion/min-wasm-fail/blob/master/min-wasm-fail.in.js
		    // Additional check that WA internals are correct

		    /* eslint-disable comma-spacing, max-len */
		    var bin      = new Uint8Array([ 0,97,115,109,1,0,0,0,1,6,1,96,1,127,1,127,3,2,1,0,5,3,1,0,1,7,8,1,4,116,101,115,116,0,0,10,16,1,14,0,32,0,65,1,54,2,0,32,0,40,2,0,11 ]);
		    var module   = new WebAssembly.Module(bin);
		    var instance = new WebAssembly.Instance(module, {});

		    // test storing to and loading from a non-zero location via a parameter.
		    // Safari on iOS 11.2.5 returns 0 unexpectedly at non-zero locations
		    if (instance.exports.test(4) !== 0) wa = true;

		    return wa;
		  } catch (__) {}

		  return wa;
		};

		},{}],22:[function(_dereq_,module,exports){
		/* eslint-disable no-unused-vars */
		var getOwnPropertySymbols = Object.getOwnPropertySymbols;
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		var propIsEnumerable = Object.prototype.propertyIsEnumerable;

		function toObject(val) {
			if (val === null || val === undefined) {
				throw new TypeError('Object.assign cannot be called with null or undefined');
			}

			return Object(val);
		}

		function shouldUseNative() {
			try {
				if (!Object.assign) {
					return false;
				}

				// Detect buggy property enumeration order in older V8 versions.

				// https://bugs.chromium.org/p/v8/issues/detail?id=4118
				var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
				test1[5] = 'de';
				if (Object.getOwnPropertyNames(test1)[0] === '5') {
					return false;
				}

				// https://bugs.chromium.org/p/v8/issues/detail?id=3056
				var test2 = {};
				for (var i = 0; i < 10; i++) {
					test2['_' + String.fromCharCode(i)] = i;
				}
				var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
					return test2[n];
				});
				if (order2.join('') !== '0123456789') {
					return false;
				}

				// https://bugs.chromium.org/p/v8/issues/detail?id=3056
				var test3 = {};
				'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
					test3[letter] = letter;
				});
				if (Object.keys(Object.assign({}, test3)).join('') !==
						'abcdefghijklmnopqrst') {
					return false;
				}

				return true;
			} catch (err) {
				// We don't expect any of the above to throw, but better to be safe.
				return false;
			}
		}

		module.exports = shouldUseNative() ? Object.assign : function (target, source) {
			var from;
			var to = toObject(target);
			var symbols;

			for (var s = 1; s < arguments.length; s++) {
				from = Object(arguments[s]);

				for (var key in from) {
					if (hasOwnProperty.call(from, key)) {
						to[key] = from[key];
					}
				}

				if (getOwnPropertySymbols) {
					symbols = getOwnPropertySymbols(from);
					for (var i = 0; i < symbols.length; i++) {
						if (propIsEnumerable.call(from, symbols[i])) {
							to[symbols[i]] = from[symbols[i]];
						}
					}
				}
			}

			return to;
		};

		},{}],23:[function(_dereq_,module,exports){
		var bundleFn = arguments[3];
		var sources = arguments[4];
		var cache = arguments[5];

		var stringify = JSON.stringify;

		module.exports = function (fn, options) {
		    var wkey;
		    var cacheKeys = Object.keys(cache);

		    for (var i = 0, l = cacheKeys.length; i < l; i++) {
		        var key = cacheKeys[i];
		        var exp = cache[key].exports;
		        // Using babel as a transpiler to use esmodule, the export will always
		        // be an object with the default export as a property of it. To ensure
		        // the existing api and babel esmodule exports are both supported we
		        // check for both
		        if (exp === fn || exp && exp.default === fn) {
		            wkey = key;
		            break;
		        }
		    }

		    if (!wkey) {
		        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
		        var wcache = {};
		        for (var i = 0, l = cacheKeys.length; i < l; i++) {
		            var key = cacheKeys[i];
		            wcache[key] = key;
		        }
		        sources[wkey] = [
		            'function(require,module,exports){' + fn + '(self); }',
		            wcache
		        ];
		    }
		    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

		    var scache = {}; scache[wkey] = wkey;
		    sources[skey] = [
		        'function(require,module,exports){' +
		            // try to call default if defined to also support babel esmodule exports
		            'var f = require(' + stringify(wkey) + ');' +
		            '(f.default ? f.default : f)(self);' +
		        '}',
		        scache
		    ];

		    var workerSources = {};
		    resolveSources(skey);

		    function resolveSources(key) {
		        workerSources[key] = true;

		        for (var depPath in sources[key][1]) {
		            var depKey = sources[key][1][depPath];
		            if (!workerSources[depKey]) {
		                resolveSources(depKey);
		            }
		        }
		    }

		    var src = '(' + bundleFn + ')({'
		        + Object.keys(workerSources).map(function (key) {
		            return stringify(key) + ':['
		                + sources[key][0]
		                + ',' + stringify(sources[key][1]) + ']'
		            ;
		        }).join(',')
		        + '},{},[' + stringify(skey) + '])'
		    ;

		    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

		    var blob = new Blob([src], { type: 'text/javascript' });
		    if (options && options.bare) { return blob; }
		    var workerUrl = URL.createObjectURL(blob);
		    var worker = new Worker(workerUrl);
		    worker.objectURL = workerUrl;
		    return worker;
		};

		},{}],"/index.js":[function(_dereq_,module,exports){

		function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

		function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

		function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

		function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

		function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

		function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

		var assign = _dereq_('object-assign');

		var webworkify = _dereq_('webworkify');

		var MathLib = _dereq_('./lib/mathlib');

		var Pool = _dereq_('./lib/pool');

		var utils = _dereq_('./lib/utils');

		var worker = _dereq_('./lib/worker');

		var createStages = _dereq_('./lib/stepper');

		var createRegions = _dereq_('./lib/tiler');

		var filter_info = _dereq_('./lib/mm_resize/resize_filter_info'); // Deduplicate pools & limiters with the same configs
		// when user creates multiple pica instances.


		var singletones = {};
		var NEED_SAFARI_FIX = false;

		try {
		  if (typeof navigator !== 'undefined' && navigator.userAgent) {
		    NEED_SAFARI_FIX = navigator.userAgent.indexOf('Safari') >= 0;
		  }
		} catch (e) {}

		var concurrency = 1;

		if (typeof navigator !== 'undefined') {
		  concurrency = Math.min(navigator.hardwareConcurrency || 1, 4);
		}

		var DEFAULT_PICA_OPTS = {
		  tile: 1024,
		  concurrency: concurrency,
		  features: ['js', 'wasm', 'ww'],
		  idle: 2000,
		  createCanvas: function createCanvas(width, height) {
		    var tmpCanvas = document.createElement('canvas');
		    tmpCanvas.width = width;
		    tmpCanvas.height = height;
		    return tmpCanvas;
		  }
		};
		var DEFAULT_RESIZE_OPTS = {
		  filter: 'mks2013',
		  unsharpAmount: 0,
		  unsharpRadius: 0.0,
		  unsharpThreshold: 0
		};
		var CAN_NEW_IMAGE_DATA = false;
		var CAN_CREATE_IMAGE_BITMAP = false;
		var CAN_USE_CANVAS_GET_IMAGE_DATA = false;
		var CAN_USE_OFFSCREEN_CANVAS = false;
		var CAN_USE_CIB_REGION_FOR_IMAGE = false;

		function workerFabric() {
		  return {
		    value: webworkify(worker),
		    destroy: function destroy() {
		      this.value.terminate();

		      if (typeof window !== 'undefined') {
		        var url = window.URL || window.webkitURL || window.mozURL || window.msURL;

		        if (url && url.revokeObjectURL && this.value.objectURL) {
		          url.revokeObjectURL(this.value.objectURL);
		        }
		      }
		    }
		  };
		} ////////////////////////////////////////////////////////////////////////////////
		// API methods


		function Pica(options) {
		  if (!(this instanceof Pica)) return new Pica(options);
		  this.options = assign({}, DEFAULT_PICA_OPTS, options || {});
		  var limiter_key = "lk_".concat(this.options.concurrency); // Share limiters to avoid multiple parallel workers when user creates
		  // multiple pica instances.

		  this.__limit = singletones[limiter_key] || utils.limiter(this.options.concurrency);
		  if (!singletones[limiter_key]) singletones[limiter_key] = this.__limit; // List of supported features, according to options & browser/node.js

		  this.features = {
		    js: false,
		    // pure JS implementation, can be disabled for testing
		    wasm: false,
		    // webassembly implementation for heavy functions
		    cib: false,
		    // resize via createImageBitmap (only FF at this moment)
		    ww: false // webworkers

		  };
		  this.__workersPool = null; // Store requested features for webworkers

		  this.__requested_features = [];
		  this.__mathlib = null;
		}

		Pica.prototype.init = function () {
		  var _this = this;

		  if (this.__initPromise) return this.__initPromise; // Test if we can create ImageData without canvas and memory copy

		  if (typeof ImageData !== 'undefined' && typeof Uint8ClampedArray !== 'undefined') {
		    try {
		      /* eslint-disable no-new */
		      new ImageData(new Uint8ClampedArray(400), 10, 10);
		      CAN_NEW_IMAGE_DATA = true;
		    } catch (__) {}
		  } // ImageBitmap can be effective in 2 places:
		  //
		  // 1. Threaded jpeg unpack (basic)
		  // 2. Built-in resize (blocked due problem in chrome, see issue #89)
		  //
		  // For basic use we also need ImageBitmap wo support .close() method,
		  // see https://developer.mozilla.org/ru/docs/Web/API/ImageBitmap


		  if (typeof ImageBitmap !== 'undefined') {
		    if (ImageBitmap.prototype && ImageBitmap.prototype.close) {
		      CAN_CREATE_IMAGE_BITMAP = true;
		    } else {
		      this.debug('ImageBitmap does not support .close(), disabled');
		    }
		  }

		  var features = this.options.features.slice();

		  if (features.indexOf('all') >= 0) {
		    features = ['cib', 'wasm', 'js', 'ww'];
		  }

		  this.__requested_features = features;
		  this.__mathlib = new MathLib(features); // Check WebWorker support if requested

		  if (features.indexOf('ww') >= 0) {
		    if (typeof window !== 'undefined' && 'Worker' in window) {
		      // IE <= 11 don't allow to create webworkers from string. We should check it.
		      // https://connect.microsoft.com/IE/feedback/details/801810/web-workers-from-blob-urls-in-ie-10-and-11
		      try {
		        var wkr = _dereq_('webworkify')(function () {});

		        wkr.terminate();
		        this.features.ww = true; // pool uniqueness depends on pool config + webworker config

		        var wpool_key = "wp_".concat(JSON.stringify(this.options));

		        if (singletones[wpool_key]) {
		          this.__workersPool = singletones[wpool_key];
		        } else {
		          this.__workersPool = new Pool(workerFabric, this.options.idle);
		          singletones[wpool_key] = this.__workersPool;
		        }
		      } catch (__) {}
		    }
		  }

		  var initMath = this.__mathlib.init().then(function (mathlib) {
		    // Copy detected features
		    assign(_this.features, mathlib.features);
		  });

		  var checkCibResize;

		  if (!CAN_CREATE_IMAGE_BITMAP) {
		    checkCibResize = Promise.resolve(false);
		  } else {
		    checkCibResize = utils.cib_support(this.options.createCanvas).then(function (status) {
		      if (_this.features.cib && features.indexOf('cib') < 0) {
		        _this.debug('createImageBitmap() resize supported, but disabled by config');

		        return;
		      }

		      if (features.indexOf('cib') >= 0) _this.features.cib = status;
		    });
		  }

		  CAN_USE_CANVAS_GET_IMAGE_DATA = utils.can_use_canvas(this.options.createCanvas);
		  var checkOffscreenCanvas;

		  if (CAN_CREATE_IMAGE_BITMAP && CAN_NEW_IMAGE_DATA && features.indexOf('ww') !== -1) {
		    checkOffscreenCanvas = utils.worker_offscreen_canvas_support();
		  } else {
		    checkOffscreenCanvas = Promise.resolve(false);
		  }

		  checkOffscreenCanvas = checkOffscreenCanvas.then(function (result) {
		    CAN_USE_OFFSCREEN_CANVAS = result;
		  }); // we use createImageBitmap to crop image data and pass it to workers,
		  // so need to check whether function works correctly;
		  // https://bugs.chromium.org/p/chromium/issues/detail?id=1220671

		  var checkCibRegion = utils.cib_can_use_region().then(function (result) {
		    CAN_USE_CIB_REGION_FOR_IMAGE = result;
		  }); // Init math lib. That's async because can load some

		  this.__initPromise = Promise.all([initMath, checkCibResize, checkOffscreenCanvas, checkCibRegion]).then(function () {
		    return _this;
		  });
		  return this.__initPromise;
		}; // Call resizer in webworker or locally, depending on config


		Pica.prototype.__invokeResize = function (tileOpts, opts) {
		  var _this2 = this;

		  // Share cache between calls:
		  //
		  // - wasm instance
		  // - wasm memory object
		  //
		  opts.__mathCache = opts.__mathCache || {};
		  return Promise.resolve().then(function () {
		    if (!_this2.features.ww) {
		      // not possible to have ImageBitmap here if user disabled WW
		      return {
		        data: _this2.__mathlib.resizeAndUnsharp(tileOpts, opts.__mathCache)
		      };
		    }

		    return new Promise(function (resolve, reject) {
		      var w = _this2.__workersPool.acquire();

		      if (opts.cancelToken) opts.cancelToken["catch"](function (err) {
		        return reject(err);
		      });

		      w.value.onmessage = function (ev) {
		        w.release();
		        if (ev.data.err) reject(ev.data.err);else resolve(ev.data);
		      };

		      var transfer = [];
		      if (tileOpts.src) transfer.push(tileOpts.src.buffer);
		      if (tileOpts.srcBitmap) transfer.push(tileOpts.srcBitmap);
		      w.value.postMessage({
		        opts: tileOpts,
		        features: _this2.__requested_features,
		        preload: {
		          wasm_nodule: _this2.__mathlib.__
		        }
		      }, transfer);
		    });
		  });
		}; // this function can return promise if createImageBitmap is used


		Pica.prototype.__extractTileData = function (tile, from, opts, stageEnv, extractTo) {
		  if (this.features.ww && CAN_USE_OFFSCREEN_CANVAS && ( // createImageBitmap doesn't work for images (Image, ImageBitmap) with Exif orientation in Chrome,
		  // can use canvas because canvas doesn't have orientation;
		  // see https://bugs.chromium.org/p/chromium/issues/detail?id=1220671
		  utils.isCanvas(from) || CAN_USE_CIB_REGION_FOR_IMAGE)) {
		    this.debug('Create tile for OffscreenCanvas');
		    return createImageBitmap(stageEnv.srcImageBitmap || from, tile.x, tile.y, tile.width, tile.height).then(function (bitmap) {
		      extractTo.srcBitmap = bitmap;
		      return extractTo;
		    });
		  } // Extract tile RGBA buffer, depending on input type


		  if (utils.isCanvas(from)) {
		    if (!stageEnv.srcCtx) stageEnv.srcCtx = from.getContext('2d'); // If input is Canvas - extract region data directly

		    this.debug('Get tile pixel data');
		    extractTo.src = stageEnv.srcCtx.getImageData(tile.x, tile.y, tile.width, tile.height).data;
		    return extractTo;
		  } // If input is Image or decoded to ImageBitmap,
		  // draw region to temporary canvas and extract data from it
		  //
		  // Note! Attempt to reuse this canvas causes significant slowdown in chrome
		  //


		  this.debug('Draw tile imageBitmap/image to temporary canvas');
		  var tmpCanvas = this.options.createCanvas(tile.width, tile.height);
		  var tmpCtx = tmpCanvas.getContext('2d');
		  tmpCtx.globalCompositeOperation = 'copy';
		  tmpCtx.drawImage(stageEnv.srcImageBitmap || from, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
		  this.debug('Get tile pixel data');
		  extractTo.src = tmpCtx.getImageData(0, 0, tile.width, tile.height).data; // Safari 12 workaround
		  // https://github.com/nodeca/pica/issues/199

		  tmpCanvas.width = tmpCanvas.height = 0;
		  return extractTo;
		};

		Pica.prototype.__landTileData = function (tile, result, stageEnv) {
		  var toImageData;
		  this.debug('Convert raw rgba tile result to ImageData');

		  if (result.bitmap) {
		    stageEnv.toCtx.drawImage(result.bitmap, tile.toX, tile.toY);
		    return null;
		  }

		  if (CAN_NEW_IMAGE_DATA) {
		    // this branch is for modern browsers
		    // If `new ImageData()` & Uint8ClampedArray suported
		    toImageData = new ImageData(new Uint8ClampedArray(result.data), tile.toWidth, tile.toHeight);
		  } else {
		    // fallback for `node-canvas` and old browsers
		    // (IE11 has ImageData but does not support `new ImageData()`)
		    toImageData = stageEnv.toCtx.createImageData(tile.toWidth, tile.toHeight);

		    if (toImageData.data.set) {
		      toImageData.data.set(result.data);
		    } else {
		      // IE9 don't have `.set()`
		      for (var i = toImageData.data.length - 1; i >= 0; i--) {
		        toImageData.data[i] = result.data[i];
		      }
		    }
		  }

		  this.debug('Draw tile');

		  if (NEED_SAFARI_FIX) {
		    // Safari draws thin white stripes between tiles without this fix
		    stageEnv.toCtx.putImageData(toImageData, tile.toX, tile.toY, tile.toInnerX - tile.toX, tile.toInnerY - tile.toY, tile.toInnerWidth + 1e-5, tile.toInnerHeight + 1e-5);
		  } else {
		    stageEnv.toCtx.putImageData(toImageData, tile.toX, tile.toY, tile.toInnerX - tile.toX, tile.toInnerY - tile.toY, tile.toInnerWidth, tile.toInnerHeight);
		  }

		  return null;
		};

		Pica.prototype.__tileAndResize = function (from, to, opts) {
		  var _this3 = this;

		  var stageEnv = {
		    srcCtx: null,
		    srcImageBitmap: null,
		    isImageBitmapReused: false,
		    toCtx: null
		  };

		  var processTile = function processTile(tile) {
		    return _this3.__limit(function () {
		      if (opts.canceled) return opts.cancelToken;
		      var tileOpts = {
		        width: tile.width,
		        height: tile.height,
		        toWidth: tile.toWidth,
		        toHeight: tile.toHeight,
		        scaleX: tile.scaleX,
		        scaleY: tile.scaleY,
		        offsetX: tile.offsetX,
		        offsetY: tile.offsetY,
		        filter: opts.filter,
		        unsharpAmount: opts.unsharpAmount,
		        unsharpRadius: opts.unsharpRadius,
		        unsharpThreshold: opts.unsharpThreshold
		      };

		      _this3.debug('Invoke resize math');

		      return Promise.resolve(tileOpts).then(function (tileOpts) {
		        return _this3.__extractTileData(tile, from, opts, stageEnv, tileOpts);
		      }).then(function (tileOpts) {
		        _this3.debug('Invoke resize math');

		        return _this3.__invokeResize(tileOpts, opts);
		      }).then(function (result) {
		        if (opts.canceled) return opts.cancelToken;
		        stageEnv.srcImageData = null;
		        return _this3.__landTileData(tile, result, stageEnv);
		      });
		    });
		  }; // Need to normalize data source first. It can be canvas or image.
		  // If image - try to decode in background if possible


		  return Promise.resolve().then(function () {
		    stageEnv.toCtx = to.getContext('2d');
		    if (utils.isCanvas(from)) return null;

		    if (utils.isImageBitmap(from)) {
		      stageEnv.srcImageBitmap = from;
		      stageEnv.isImageBitmapReused = true;
		      return null;
		    }

		    if (utils.isImage(from)) {
		      // try do decode image in background for faster next operations;
		      // if we're using offscreen canvas, cib is called per tile, so not needed here
		      if (!CAN_CREATE_IMAGE_BITMAP) return null;

		      _this3.debug('Decode image via createImageBitmap');

		      return createImageBitmap(from).then(function (imageBitmap) {
		        stageEnv.srcImageBitmap = imageBitmap;
		      }) // Suppress error to use fallback, if method fails
		      // https://github.com/nodeca/pica/issues/190

		      /* eslint-disable no-unused-vars */
		      ["catch"](function (e) {
		        return null;
		      });
		    }

		    throw new Error('Pica: ".from" should be Image, Canvas or ImageBitmap');
		  }).then(function () {
		    if (opts.canceled) return opts.cancelToken;

		    _this3.debug('Calculate tiles'); //
		    // Here we are with "normalized" source,
		    // follow to tiling
		    //


		    var regions = createRegions({
		      width: opts.width,
		      height: opts.height,
		      srcTileSize: _this3.options.tile,
		      toWidth: opts.toWidth,
		      toHeight: opts.toHeight,
		      destTileBorder: opts.__destTileBorder
		    });
		    var jobs = regions.map(function (tile) {
		      return processTile(tile);
		    });

		    function cleanup(stageEnv) {
		      if (stageEnv.srcImageBitmap) {
		        if (!stageEnv.isImageBitmapReused) stageEnv.srcImageBitmap.close();
		        stageEnv.srcImageBitmap = null;
		      }
		    }

		    _this3.debug('Process tiles');

		    return Promise.all(jobs).then(function () {
		      _this3.debug('Finished!');

		      cleanup(stageEnv);
		      return to;
		    }, function (err) {
		      cleanup(stageEnv);
		      throw err;
		    });
		  });
		};

		Pica.prototype.__processStages = function (stages, from, to, opts) {
		  var _this4 = this;

		  if (opts.canceled) return opts.cancelToken;

		  var _stages$shift = stages.shift(),
		      _stages$shift2 = _slicedToArray(_stages$shift, 2),
		      toWidth = _stages$shift2[0],
		      toHeight = _stages$shift2[1];

		  var isLastStage = stages.length === 0; // Optimization for legacy filters -
		  // only use user-defined quality for the last stage,
		  // use simpler (Hamming) filter for the first stages where
		  // scale factor is large enough (more than 2-3)
		  //
		  // For advanced filters (mks2013 and custom) - skip optimization,
		  // because need to apply sharpening every time

		  var filter;
		  if (isLastStage || filter_info.q2f.indexOf(opts.filter) < 0) filter = opts.filter;else if (opts.filter === 'box') filter = 'box';else filter = 'hamming';
		  opts = assign({}, opts, {
		    toWidth: toWidth,
		    toHeight: toHeight,
		    filter: filter
		  });
		  var tmpCanvas;

		  if (!isLastStage) {
		    // create temporary canvas
		    tmpCanvas = this.options.createCanvas(toWidth, toHeight);
		  }

		  return this.__tileAndResize(from, isLastStage ? to : tmpCanvas, opts).then(function () {
		    if (isLastStage) return to;
		    opts.width = toWidth;
		    opts.height = toHeight;
		    return _this4.__processStages(stages, tmpCanvas, to, opts);
		  }).then(function (res) {
		    if (tmpCanvas) {
		      // Safari 12 workaround
		      // https://github.com/nodeca/pica/issues/199
		      tmpCanvas.width = tmpCanvas.height = 0;
		    }

		    return res;
		  });
		};

		Pica.prototype.__resizeViaCreateImageBitmap = function (from, to, opts) {
		  var _this5 = this;

		  var toCtx = to.getContext('2d');
		  this.debug('Resize via createImageBitmap()');
		  return createImageBitmap(from, {
		    resizeWidth: opts.toWidth,
		    resizeHeight: opts.toHeight,
		    resizeQuality: utils.cib_quality_name(filter_info.f2q[opts.filter])
		  }).then(function (imageBitmap) {
		    if (opts.canceled) return opts.cancelToken; // if no unsharp - draw directly to output canvas

		    if (!opts.unsharpAmount) {
		      toCtx.drawImage(imageBitmap, 0, 0);
		      imageBitmap.close();
		      toCtx = null;

		      _this5.debug('Finished!');

		      return to;
		    }

		    _this5.debug('Unsharp result');

		    var tmpCanvas = _this5.options.createCanvas(opts.toWidth, opts.toHeight);

		    var tmpCtx = tmpCanvas.getContext('2d');
		    tmpCtx.drawImage(imageBitmap, 0, 0);
		    imageBitmap.close();
		    var iData = tmpCtx.getImageData(0, 0, opts.toWidth, opts.toHeight);

		    _this5.__mathlib.unsharp_mask(iData.data, opts.toWidth, opts.toHeight, opts.unsharpAmount, opts.unsharpRadius, opts.unsharpThreshold);

		    toCtx.putImageData(iData, 0, 0); // Safari 12 workaround
		    // https://github.com/nodeca/pica/issues/199

		    tmpCanvas.width = tmpCanvas.height = 0;
		    iData = tmpCtx = tmpCanvas = toCtx = null;

		    _this5.debug('Finished!');

		    return to;
		  });
		};

		Pica.prototype.resize = function (from, to, options) {
		  var _this6 = this;

		  this.debug('Start resize...');
		  var opts = assign({}, DEFAULT_RESIZE_OPTS);

		  if (!isNaN(options)) {
		    opts = assign(opts, {
		      quality: options
		    });
		  } else if (options) {
		    opts = assign(opts, options);
		  }

		  opts.toWidth = to.width;
		  opts.toHeight = to.height;
		  opts.width = from.naturalWidth || from.width;
		  opts.height = from.naturalHeight || from.height; // Legacy `.quality` option

		  if (Object.prototype.hasOwnProperty.call(opts, 'quality')) {
		    if (opts.quality < 0 || opts.quality > 3) {
		      throw new Error("Pica: .quality should be [0..3], got ".concat(opts.quality));
		    }

		    opts.filter = filter_info.q2f[opts.quality];
		  } // Prevent stepper from infinite loop


		  if (to.width === 0 || to.height === 0) {
		    return Promise.reject(new Error("Invalid output size: ".concat(to.width, "x").concat(to.height)));
		  }

		  if (opts.unsharpRadius > 2) opts.unsharpRadius = 2;
		  opts.canceled = false;

		  if (opts.cancelToken) {
		    // Wrap cancelToken to avoid successive resolve & set flag
		    opts.cancelToken = opts.cancelToken.then(function (data) {
		      opts.canceled = true;
		      throw data;
		    }, function (err) {
		      opts.canceled = true;
		      throw err;
		    });
		  }

		  var DEST_TILE_BORDER = 3; // Max possible filter window size

		  opts.__destTileBorder = Math.ceil(Math.max(DEST_TILE_BORDER, 2.5 * opts.unsharpRadius | 0));
		  return this.init().then(function () {
		    if (opts.canceled) return opts.cancelToken; // if createImageBitmap supports resize, just do it and return

		    if (_this6.features.cib) {
		      if (filter_info.q2f.indexOf(opts.filter) >= 0) {
		        return _this6.__resizeViaCreateImageBitmap(from, to, opts);
		      }

		      _this6.debug('cib is enabled, but not supports provided filter, fallback to manual math');
		    }

		    if (!CAN_USE_CANVAS_GET_IMAGE_DATA) {
		      var err = new Error('Pica: cannot use getImageData on canvas, ' + "make sure fingerprinting protection isn't enabled");
		      err.code = 'ERR_GET_IMAGE_DATA';
		      throw err;
		    } //
		    // No easy way, let's resize manually via arrays
		    //


		    var stages = createStages(opts.width, opts.height, opts.toWidth, opts.toHeight, _this6.options.tile, opts.__destTileBorder);
		    return _this6.__processStages(stages, from, to, opts);
		  });
		}; // RGBA buffer resize
		//


		Pica.prototype.resizeBuffer = function (options) {
		  var _this7 = this;

		  var opts = assign({}, DEFAULT_RESIZE_OPTS, options); // Legacy `.quality` option

		  if (Object.prototype.hasOwnProperty.call(opts, 'quality')) {
		    if (opts.quality < 0 || opts.quality > 3) {
		      throw new Error("Pica: .quality should be [0..3], got ".concat(opts.quality));
		    }

		    opts.filter = filter_info.q2f[opts.quality];
		  }

		  return this.init().then(function () {
		    return _this7.__mathlib.resizeAndUnsharp(opts);
		  });
		};

		Pica.prototype.toBlob = function (canvas, mimeType, quality) {
		  mimeType = mimeType || 'image/png';
		  return new Promise(function (resolve) {
		    if (canvas.toBlob) {
		      canvas.toBlob(function (blob) {
		        return resolve(blob);
		      }, mimeType, quality);
		      return;
		    }

		    if (canvas.convertToBlob) {
		      resolve(canvas.convertToBlob({
		        type: mimeType,
		        quality: quality
		      }));
		      return;
		    } // Fallback for old browsers


		    var asString = atob(canvas.toDataURL(mimeType, quality).split(',')[1]);
		    var len = asString.length;
		    var asBuffer = new Uint8Array(len);

		    for (var i = 0; i < len; i++) {
		      asBuffer[i] = asString.charCodeAt(i);
		    }

		    resolve(new Blob([asBuffer], {
		      type: mimeType
		    }));
		  });
		};

		Pica.prototype.debug = function () {};

		module.exports = Pica;

		},{"./lib/mathlib":1,"./lib/mm_resize/resize_filter_info":7,"./lib/pool":13,"./lib/stepper":14,"./lib/tiler":15,"./lib/utils":16,"./lib/worker":17,"object-assign":22,"webworkify":23}]},{},[])("/index.js")
		}); 
	} (pica$1));

	var picaExports = pica$1.exports;
	const pica = /*@__PURE__*/getDefaultExportFromCjs(picaExports);

	const PICA = new pica({ features: ["js", "wasm"] });
	const PICA_OPTION = { filter: "box" };
	async function resizing(from, to) {
	  return PICA.resize(from, to, PICA_OPTION).then();
	}

	const DEFAULT_THUMBNAIL = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
	const DEFAULT_NODE_TEMPLATE = document.createElement("div");
	DEFAULT_NODE_TEMPLATE.classList.add("img-node");
	DEFAULT_NODE_TEMPLATE.innerHTML = `
<a>
  <img decoding="async" loading="eager" title="untitle.jpg" src="" style="display: none;" />
  <canvas id="sample-canvas" width="1" height="1"></canvas>
</a>`;
	const OVERLAY_TIP = document.createElement("div");
	OVERLAY_TIP.classList.add("overlay-tip");
	OVERLAY_TIP.innerHTML = `<span>GIF</span>`;
	class ImageNode {
	  root;
	  src;
	  href;
	  title;
	  onclick;
	  imgElement;
	  canvasElement;
	  canvasCtx;
	  canvasSized = false;
	  delaySRC;
	  blobUrl;
	  mimeType;
	  downloadBar;
	  rendered = false;
	  constructor(src, href, title, delaySRC) {
	    this.src = src;
	    this.href = href;
	    this.title = title;
	    this.delaySRC = delaySRC;
	  }
	  create() {
	    this.root = DEFAULT_NODE_TEMPLATE.cloneNode(true);
	    const anchor = this.root.firstElementChild;
	    anchor.href = this.href;
	    anchor.target = "_blank";
	    this.imgElement = anchor.firstElementChild;
	    this.canvasElement = anchor.lastElementChild;
	    this.imgElement.setAttribute("title", this.title);
	    this.canvasElement.id = "canvas-" + this.title.replaceAll(/[^\w]/g, "_");
	    this.canvasCtx = this.canvasElement.getContext("2d");
	    this.canvasCtx.fillStyle = "#aaa";
	    this.canvasCtx.fillRect(0, 0, 1, 1);
	    if (this.onclick) {
	      anchor.addEventListener("click", (event) => {
	        event.preventDefault();
	        this.onclick(event);
	      });
	    }
	    this.imgElement.onload = () => this.resize();
	    return this.root;
	  }
	  resize() {
	    if (!this.root || !this.imgElement || !this.canvasElement)
	      return;
	    if (!this.imgElement.src || this.imgElement.src === DEFAULT_THUMBNAIL)
	      return;
	    const newRatio = this.imgElement.naturalHeight / this.imgElement.naturalWidth;
	    const oldRatio = this.canvasElement.height / this.canvasElement.width;
	    if (this.canvasSized) {
	      this.canvasSized = Math.abs(newRatio - oldRatio) < 1.2;
	    }
	    if (!this.canvasSized) {
	      this.canvasElement.width = this.root.offsetWidth;
	      this.canvasElement.height = Math.floor(this.root.offsetWidth * newRatio);
	      this.canvasSized = true;
	    }
	    if (this.imgElement.src === this.src) {
	      this.canvasCtx?.drawImage(this.imgElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
	      this.imgElement.src = "";
	    } else {
	      resizing(this.imgElement, this.canvasElement).then(() => this.imgElement.src = "").catch(() => this.imgElement.src = this.canvasCtx?.drawImage(this.imgElement, 0, 0, this.canvasElement.width, this.canvasElement.height) || "");
	    }
	  }
	  render() {
	    if (!this.imgElement)
	      return;
	    this.rendered = true;
	    let justThumbnail = !this.blobUrl;
	    if (this.mimeType === "image/gif" || this.mimeType?.startsWith("video")) {
	      const tip = OVERLAY_TIP.cloneNode(true);
	      tip.firstChild.textContent = this.mimeType.split("/")[1].toUpperCase();
	      this.root?.appendChild(tip);
	      justThumbnail = true;
	    }
	    if (justThumbnail) {
	      const delaySRC = this.delaySRC;
	      this.delaySRC = void 0;
	      if (delaySRC) {
	        delaySRC.then((src) => (this.src = src) && this.render());
	      } else {
	        this.imgElement.src = this.src || this.blobUrl || DEFAULT_THUMBNAIL;
	      }
	      return;
	    }
	    this.imgElement.src = this.blobUrl || this.src || DEFAULT_THUMBNAIL;
	  }
	  unrender() {
	    if (!this.rendered || !this.imgElement)
	      return;
	    this.imgElement.src = "";
	    this.canvasSized = false;
	  }
	  onloaded(blobUrl, mimeType) {
	    this.blobUrl = blobUrl;
	    this.mimeType = mimeType;
	  }
	  progress(state) {
	    if (!this.root)
	      return;
	    if (state.readyState === 4) {
	      if (this.downloadBar && this.downloadBar.parentNode) {
	        this.downloadBar.parentNode.removeChild(this.downloadBar);
	      }
	      return;
	    }
	    if (!this.downloadBar) {
	      const downloadBar = document.createElement("div");
	      downloadBar.classList.add("download-bar");
	      downloadBar.innerHTML = `<div style="width: 0%"></div>`;
	      this.downloadBar = downloadBar;
	      this.root.firstElementChild.appendChild(this.downloadBar);
	    }
	    if (this.downloadBar) {
	      this.downloadBar.firstElementChild.style.width = state.loaded / state.total * 100 + "%";
	    }
	  }
	  changeStyle(fetchStatus) {
	    if (!this.root)
	      return;
	    switch (fetchStatus) {
	      case "fetching":
	        this.root.classList.add("img-fetching");
	        this.root.classList.remove("img-fetched");
	        this.root.classList.remove("img-fetch-failed");
	        break;
	      case "fetched":
	        this.root.classList.add("img-fetched");
	        this.root.classList.remove("img-fetching");
	        this.root.classList.remove("img-fetch-failed");
	        break;
	      case "failed":
	        this.root.classList.add("img-fetch-failed");
	        this.root.classList.remove("img-fetching");
	        break;
	      default:
	        this.root.classList.remove("img-fetched");
	        this.root.classList.remove("img-fetch-failed");
	        this.root.classList.remove("img-fetching");
	    }
	  }
	  equal(ele) {
	    if (ele === this.root) {
	      return true;
	    }
	    if (ele === this.root?.firstElementChild) {
	      return true;
	    }
	    if (ele === this.canvasElement || ele === this.imgElement) {
	      return true;
	    }
	    return false;
	  }
	}
	class ChapterNode {
	  chapter;
	  index;
	  constructor(chapter, index) {
	    this.chapter = chapter;
	    this.index = index;
	  }
	  create() {
	    const element = DEFAULT_NODE_TEMPLATE.cloneNode(true);
	    const anchor = element.firstElementChild;
	    if (this.chapter.thumbimg) {
	      const img = anchor.firstElementChild;
	      img.src = this.chapter.thumbimg;
	      img.title = this.chapter.title.toString();
	      img.style.display = "block";
	      img.nextElementSibling?.remove();
	    }
	    const description = document.createElement("div");
	    description.classList.add("ehvp-chapter-description");
	    if (Array.isArray(this.chapter.title)) {
	      description.innerHTML = this.chapter.title.map((t) => `<span>${t}</span>`).join("<br>");
	    } else {
	      description.innerHTML = `<span>${this.chapter.title}</span>`;
	    }
	    anchor.appendChild(description);
	    anchor.onclick = (event) => {
	      event.preventDefault();
	      this.chapter.onclick?.(this.index);
	    };
	    return element;
	  }
	  render() {
	  }
	}

	function q(selector, parent) {
	  const element = (parent || document).querySelector(selector);
	  if (!element) {
	    throw new Error(`Can't find element: ${selector}`);
	  }
	  return element;
	}

	class PageFetcher {
	  chapters = [];
	  chapterIndex = 0;
	  queue;
	  matcher;
	  done = false;
	  beforeInit;
	  afterInit;
	  appendPageLock = false;
	  abortb = false;
	  chaptersSelectionElement;
	  constructor(queue, matcher) {
	    this.queue = queue;
	    this.matcher = matcher;
	    this.chaptersSelectionElement = q("#backChaptersSelection");
	    this.chaptersSelectionElement.addEventListener("click", () => this.backChaptersSelection());
	    const debouncer = new Debouncer();
	    EBUS.subscribe("ifq-on-finished-report", (index) => debouncer.addEvent("APPEND-NEXT-PAGES", () => this.appendPages(index, !this.queue.downloading?.()), 5));
	    EBUS.subscribe("pf-try-extend", () => debouncer.addEvent("APPEND-NEXT-PAGES", () => !this.queue.downloading?.() && this.appendNextPage(true), 5));
	  }
	  appendToView(total, nodes, done) {
	    EBUS.emit("pf-on-appended", total, nodes, done);
	  }
	  abort() {
	    this.abortb = true;
	  }
	  async init() {
	    this.chapters = await this.matcher.fetchChapters();
	    this.chapters.forEach((c) => {
	      c.sourceIter = this.matcher.fetchPagesSource(c);
	      c.onclick = (index) => {
	        EBUS.emit("pf-change-chapter", index);
	        if (this.chapters[index].queue) {
	          this.appendToView(this.chapters[index].queue.length, this.chapters[index].queue, false);
	          if (this.chapters.length > 1) {
	            this.chaptersSelectionElement.hidden = false;
	          }
	        }
	        if (!this.queue.downloading?.()) {
	          this.beforeInit?.();
	          this.changeChapter(index, true).finally(() => this.afterInit?.());
	        }
	      };
	    });
	    if (this.chapters.length === 1) {
	      this.beforeInit?.();
	      this.changeChapter(0, true).finally(() => this.afterInit?.());
	    }
	    if (this.chapters.length > 1) {
	      this.appendToView(this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)), true);
	    }
	  }
	  backChaptersSelection() {
	    EBUS.emit("pf-change-chapter", -1);
	    this.appendToView(this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)), true);
	    this.chaptersSelectionElement.hidden = true;
	  }
	  /// start the chapter by index
	  async changeChapter(index, appendToView) {
	    this.chapterIndex = index;
	    const chapter = this.chapters[this.chapterIndex];
	    this.queue.restore(index, chapter.queue);
	    if (!chapter.sourceIter) {
	      evLog("error", "chapter sourceIter is not set!");
	      return;
	    }
	    let first = await chapter.sourceIter.next();
	    if (!first.done) {
	      await this.appendImages(first.value, appendToView);
	    }
	    this.appendPages(this.queue.length - 1, appendToView);
	  }
	  // append next page until the queue length is 60 more than finished
	  async appendPages(appendedCount, appendToView) {
	    while (true) {
	      if (appendedCount + 60 < this.queue.length)
	        break;
	      if (!await this.appendNextPage(appendToView))
	        break;
	    }
	  }
	  async appendNextPage(appendToView) {
	    if (this.appendPageLock)
	      return false;
	    try {
	      this.appendPageLock = true;
	      if (this.done || this.abortb)
	        return false;
	      const chapter = this.chapters[this.chapterIndex];
	      const next = await chapter.sourceIter.next();
	      if (next.done) {
	        chapter.done = true;
	        this.appendToView(this.queue.length, [], true);
	        return false;
	      } else {
	        await this.appendImages(next.value, appendToView);
	        return true;
	      }
	    } finally {
	      this.appendPageLock = false;
	    }
	  }
	  async appendImages(page, appendToView) {
	    try {
	      const nodes = await this.obtainImageNodeList(page);
	      if (this.abortb)
	        return false;
	      const IFs = nodes.map(
	        (imgNode) => new IMGFetcher(imgNode, this.matcher, this.chapterIndex)
	      );
	      this.queue.push(...IFs);
	      this.chapters[this.chapterIndex].queue.push(...IFs);
	      if (appendToView) {
	        this.appendToView(this.queue.length, IFs);
	      }
	      return true;
	    } catch (error) {
	      evLog("error", `page fetcher append images error: `, error);
	      return false;
	    }
	  }
	  //从文档的字符串中创建缩略图元素列表
	  async obtainImageNodeList(page) {
	    let tryTimes = 0;
	    while (tryTimes < 3) {
	      try {
	        return await this.matcher.parseImgNodes(page, this.chapters[this.chapterIndex].id);
	      } catch (error) {
	        evLog("error", "warn: parse image nodes failed, retrying: ", error);
	        tryTimes++;
	      }
	    }
	    evLog("error", "warn: parse image nodes failed: reached max try times!");
	    return [];
	  }
	  //通过地址请求该页的文档
	  async fetchDocument(pageURL) {
	    return await window.fetch(pageURL).then((response) => response.text());
	  }
	}

	class GalleryMeta {
	  url;
	  title;
	  originTitle;
	  downloader;
	  tags;
	  constructor(url, title) {
	    this.url = url;
	    this.title = title;
	    this.tags = {};
	    this.downloader = "https://github.com/MapoMagpie/eh-view-enhance";
	  }
	}

	class BaseMatcher {
	  async fetchChapters() {
	    return [{
	      id: 1,
	      title: "Default",
	      source: window.location.href,
	      queue: []
	    }];
	  }
	  title(doc) {
	    const meta = this.galleryMeta(doc);
	    return meta.originTitle || meta.title || "unknown";
	  }
	  galleryMeta(doc, _chapter) {
	    return new GalleryMeta(window.location.href, doc.title || "unknown");
	  }
	  workURLs() {
	    return [this.workURL()];
	  }
	  async processData(data, contentType, _url) {
	    return [data, contentType];
	  }
	}

	function toMD5(s) {
	  return md5(s);
	}
	function get_num(gid, page) {
	  gid = window.atob(gid);
	  page = window.atob(page);
	  let n = toMD5(gid + page).slice(-1).charCodeAt(0);
	  if (gid >= window.atob("MjY4ODUw") && gid <= window.atob("NDIxOTI1")) {
	    n %= 10;
	  } else if (gid >= window.atob("NDIxOTI2")) {
	    n %= 8;
	  }
	  if (n < 10) {
	    return 2 + 2 * n;
	  } else {
	    return 10;
	  }
	}
	function drawImage(ctx, e, gid, page) {
	  const width = e.width;
	  const height = e.height;
	  const s = get_num(window.btoa(gid), window.btoa(page));
	  const l = parseInt((height % s).toString());
	  const r = width;
	  for (let m = 0; m < s; m++) {
	    let c = Math.floor(height / s);
	    let g = c * m;
	    let w = height - c * (m + 1) - l;
	    0 == m ? c += l : g += l, ctx.drawImage(e, 0, w, r, c, 0, g, r, c);
	  }
	}
	class Comic18Matcher extends BaseMatcher {
	  meta;
	  async fetchChapters() {
	    const ret = [];
	    const thumb = document.querySelector(".thumb-overlay > img");
	    const chapters = Array.from(document.querySelectorAll(".visible-lg .episode > ul > a"));
	    if (chapters.length > 0) {
	      chapters.forEach((ch, i) => {
	        const title = Array.from(ch.querySelector("li")?.childNodes || []).map((n) => n.textContent?.trim()).filter(Boolean).map((n) => n);
	        ret.push({
	          id: i,
	          title,
	          source: ch.href,
	          queue: [],
	          thumbimg: thumb?.src
	        });
	      });
	    } else {
	      const href = document.querySelector(".read-block > a")?.href;
	      if (href === void 0)
	        throw new Error("No page found");
	      ret.push({
	        id: 0,
	        title: "Default",
	        source: href,
	        queue: []
	      });
	    }
	    return ret;
	  }
	  async *fetchPagesSource(chapter) {
	    yield chapter.source;
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    const raw = await window.fetch(source).then((resp) => resp.text());
	    const document2 = new DOMParser().parseFromString(raw, "text/html");
	    const elements = Array.from(document2.querySelectorAll(".scramble-page:not(.thewayhome)"));
	    for (const element of elements) {
	      const title = element.id;
	      const img = element.querySelector("img");
	      if (!img) {
	        evLog("error", "warn: cannot find img element", element);
	        continue;
	      }
	      const src = img.getAttribute("data-original");
	      if (!src) {
	        evLog("error", "warn: cannot find data-original", element);
	        continue;
	      }
	      list.push(new ImageNode("", src, title));
	    }
	    return list;
	  }
	  async processData(data, contentType, url) {
	    const reg = /(\d+)\/(\d+)\.(\w+)/;
	    const matches = url.match(reg);
	    const gid = matches[1];
	    let scrambleID = 220980;
	    if (Number(gid) < scrambleID)
	      return [data, contentType];
	    const page = matches[2];
	    const ext = matches[3];
	    if (ext === "gif")
	      return [data, contentType];
	    const img = await createImageBitmap(new Blob([data], { type: contentType }));
	    const canvas = document.createElement("canvas");
	    canvas.width = img.width;
	    canvas.height = img.height;
	    const ctx = canvas.getContext("2d");
	    drawImage(ctx, img, gid, page);
	    return new Promise(
	      (resolve) => canvas.toBlob(
	        (blob) => blob?.arrayBuffer().then((buf) => resolve([new Uint8Array(buf), blob.type])).finally(() => canvas.remove()),
	        contentType
	      )
	    );
	  }
	  workURL() {
	    return /18-?comic(freedom)?.(vip|org|xyz)\/album\/\d+/;
	  }
	  galleryMeta(doc) {
	    if (this.meta)
	      return this.meta;
	    const title = doc.querySelector(".panel-heading h1")?.textContent || "UNTITLE";
	    this.meta = new GalleryMeta(window.location.href, title);
	    this.meta.originTitle = title;
	    const tagTrList = doc.querySelectorAll("div.tag-block > span");
	    const tags = {};
	    tagTrList.forEach((tr) => {
	      const cat = tr.getAttribute("data-type")?.trim();
	      if (cat) {
	        const values = Array.from(tr.querySelectorAll("a")).map((a) => a.textContent).filter(Boolean);
	        if (values.length > 0) {
	          tags[cat] = values;
	        }
	      }
	    });
	    this.meta.tags = tags;
	    return this.meta;
	  }
	  // https://cdn-msp.18comic.org/media/photos/529221/00004.gif
	  async fetchOriginMeta(url) {
	    return { url };
	  }
	}

	class DanbooruMatcher extends BaseMatcher {
	  tags = {};
	  count = 0;
	  async *fetchPagesSource() {
	    let doc = document;
	    yield doc;
	    let tryTimes = 0;
	    while (true) {
	      const url = this.nextPage(doc);
	      if (!url)
	        break;
	      try {
	        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
	      } catch (e) {
	        tryTimes++;
	        if (tryTimes > 3)
	          throw new Error(`fetch next page failed, ${e}`);
	        continue;
	      }
	      tryTimes = 0;
	      yield doc;
	    }
	  }
	  async fetchOriginMeta(href) {
	    let url = null;
	    const doc = await window.fetch(href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
	    if (conf.fetchOriginal) {
	      url = this.getOriginalURL(doc);
	    }
	    if (!url) {
	      url = this.getNormalURL(doc);
	    }
	    if (!url)
	      throw new Error("Cannot find origin image or video url");
	    let title;
	    const ext = url.split(".").pop()?.match(/^\w+/)?.[0];
	    const id = this.extractIDFromHref(href);
	    if (ext && id) {
	      title = `${id}.${ext}`;
	    }
	    return { url, title };
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    const doc = source;
	    this.queryList(doc).forEach((ele) => {
	      const [imgNode, tags] = this.toImgNode(ele);
	      if (!imgNode)
	        return;
	      this.count++;
	      if (tags !== "") {
	        this.tags[imgNode.title.split(".")[0]] = tags.trim().replaceAll(": ", ":").split(" ").map((v) => v.trim()).filter((v) => v !== "");
	      }
	      list.push(imgNode);
	    });
	    return list;
	  }
	  galleryMeta() {
	    const url = new URL(window.location.href);
	    const tags = url.searchParams.get("tags")?.trim();
	    const meta = new GalleryMeta(window.location.href, `${this.site()}_${tags}_${this.count}`);
	    meta.tags = this.tags;
	    return meta;
	  }
	}
	class DanbooruDonmaiMatcher extends DanbooruMatcher {
	  site() {
	    return "danbooru";
	  }
	  workURL() {
	    return /danbooru.donmai.us\/(posts(?!\/)|$)/;
	  }
	  nextPage(doc) {
	    return doc.querySelector(".paginator a.paginator-next")?.href || null;
	  }
	  queryList(doc) {
	    return Array.from(doc.querySelectorAll(".posts-container > article:not(.blacklisted-active)"));
	  }
	  toImgNode(ele) {
	    const anchor = ele.querySelector("a");
	    if (!anchor) {
	      evLog("error", "warn: cannot find anchor element", anchor);
	      return [null, ""];
	    }
	    const img = anchor.querySelector("img");
	    if (!img) {
	      evLog("error", "warn: cannot find img element", img);
	      return [null, ""];
	    }
	    const href = anchor.getAttribute("href");
	    if (!href) {
	      evLog("error", "warn: cannot find href", anchor);
	      return [null, ""];
	    }
	    return [new ImageNode(img.src, href, `${ele.getAttribute("data-id") || ele.id}.jpg`), ele.getAttribute("data-tags") || ""];
	  }
	  getOriginalURL(doc) {
	    return doc.querySelector("#image-resize-notice > a")?.href || null;
	  }
	  getNormalURL(doc) {
	    return doc.querySelector("#image")?.getAttribute("src") || null;
	  }
	  extractIDFromHref(href) {
	    return href.match(/posts\/(\d+)/)?.[1];
	  }
	}
	class Rule34Matcher extends DanbooruMatcher {
	  site() {
	    return "rule34";
	  }
	  workURL() {
	    return /rule34.xxx\/index.php\?page=post&s=list/;
	  }
	  nextPage(doc) {
	    return doc.querySelector(".pagination a[alt=next]")?.href || null;
	  }
	  queryList(doc) {
	    return Array.from(doc.querySelectorAll(".image-list > .thumb:not(.blacklisted-image) > a"));
	  }
	  toImgNode(ele) {
	    const img = ele.querySelector("img");
	    if (!img) {
	      evLog("error", "warn: cannot find img element", img);
	      return [null, ""];
	    }
	    const href = ele.getAttribute("href");
	    if (!href) {
	      evLog("error", "warn: cannot find href", ele);
	      return [null, ""];
	    }
	    return [new ImageNode(img.src, href, `${ele.id}.jpg`), img.getAttribute("alt") || ""];
	  }
	  getOriginalURL(doc) {
	    const raw = doc.querySelector("#note-container + script")?.textContent?.trim().replace("image = ", "").replace(";", "").replaceAll("'", '"');
	    try {
	      if (raw) {
	        const info = JSON.parse(raw);
	        return `${info.domain}/${info.base_dir}/${info.dir}/${info.img}`;
	      }
	    } catch (error) {
	      evLog("error", "get original url failed", error);
	    }
	    return null;
	  }
	  getNormalURL(doc) {
	    return doc.querySelector("#image,#gelcomVideoPlayer > source")?.getAttribute("src") || null;
	  }
	  extractIDFromHref(href) {
	    return href.match(/id=(\d+)/)?.[1];
	  }
	}
	const POST_INFO_REGEX = /Post\.register\((.*)\)/g;
	class YandereMatcher extends BaseMatcher {
	  infos = {};
	  count = 0;
	  workURL() {
	    return /yande.re\/post(?!\/show\/.*)/;
	  }
	  async *fetchPagesSource() {
	    let doc = document;
	    yield doc;
	    let tryTimes = 0;
	    while (true) {
	      const url = doc.querySelector("#paginator a.next_page")?.href;
	      if (!url)
	        break;
	      try {
	        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
	      } catch (e) {
	        tryTimes++;
	        if (tryTimes > 3)
	          throw new Error(`fetch next page failed, ${e}`);
	        continue;
	      }
	      tryTimes = 0;
	      yield doc;
	    }
	  }
	  async parseImgNodes(source) {
	    const doc = source;
	    const raw = doc.querySelector("body > form + script")?.textContent;
	    if (!raw)
	      throw new Error("cannot find post list from script");
	    const matches = raw.matchAll(POST_INFO_REGEX);
	    const ret = [];
	    for (const match of matches) {
	      if (!match || match.length < 2)
	        continue;
	      try {
	        const info = JSON.parse(match[1]);
	        this.infos[info.id.toString()] = info;
	        this.count++;
	        ret.push(new ImageNode(info.preview_url, `${window.location.origin}/post/show/${info.id}`, `${info.id}.${info.file_ext}`));
	      } catch (error) {
	        evLog("error", "parse post info failed", error);
	        continue;
	      }
	    }
	    return ret;
	  }
	  async fetchOriginMeta(href) {
	    let id = href.split("/").pop();
	    if (!id) {
	      throw new Error(`cannot find id from ${href}`);
	    }
	    let url;
	    if (conf.fetchOriginal) {
	      url = this.infos[id]?.file_url;
	    } else {
	      url = this.infos[id]?.sample_url;
	    }
	    if (!url) {
	      throw new Error(`cannot find url for id ${id}`);
	    }
	    return { url };
	  }
	  galleryMeta() {
	    const url = new URL(window.location.href);
	    const tags = url.searchParams.get("tags")?.trim();
	    const meta = new GalleryMeta(window.location.href, `yande_${tags}_${this.count}`);
	    meta["infos"] = this.infos;
	    return meta;
	  }
	}
	class GelBooruMatcher extends DanbooruMatcher {
	  site() {
	    return "gelbooru";
	  }
	  workURL() {
	    return /gelbooru.com\/index.php\?page=post&s=list/;
	  }
	  nextPage(doc) {
	    return doc.querySelector("#paginator a[alt=next]")?.href || null;
	  }
	  queryList(doc) {
	    return Array.from(doc.querySelectorAll(".thumbnail-container > article.thumbnail-preview:not(.blacklisted-image) > a"));
	  }
	  toImgNode(ele) {
	    const img = ele.querySelector("img");
	    if (!img) {
	      evLog("error", "warn: cannot find img element", img);
	      return [null, ""];
	    }
	    const href = ele.getAttribute("href");
	    if (!href) {
	      evLog("error", "warn: cannot find href", ele);
	      return [null, ""];
	    }
	    return [new ImageNode(img.src, href, `${ele.id}.jpg`), img.getAttribute("alt") || ""];
	  }
	  getOriginalURL(doc) {
	    return doc.querySelector("head > meta[property='og:image']")?.getAttribute("content") || null;
	  }
	  getNormalURL(doc) {
	    const img = doc.querySelector("#image");
	    if (img?.src)
	      return img.src;
	    const vidSources = Array.from(doc.querySelectorAll("#gelcomVideoPlayer > source"));
	    if (vidSources.length === 0)
	      return null;
	    return vidSources.find((s) => s.type.endsWith("mp4"))?.src || vidSources[0].src;
	  }
	  extractIDFromHref(href) {
	    return href.match(/id=(\d+)/)?.[1];
	  }
	}

	function parseImagePositions(styles) {
	  return styles.map((st) => {
	    const [x, y] = st.backgroundPosition.split(" ").map((v) => Math.abs(parseInt(v)));
	    return { x, y, width: parseInt(st.width), height: parseInt(st.height) };
	  });
	}
	function splitSpriteImage(image, positions) {
	  const canvas = document.createElement("canvas");
	  const ctx = canvas.getContext("2d");
	  const result = [];
	  for (const pos of positions) {
	    canvas.width = pos.width;
	    canvas.height = pos.height;
	    ctx.drawImage(image, pos.x, pos.y, pos.width, pos.height, 0, 0, pos.width, pos.height);
	    result.push(canvas.toDataURL());
	  }
	  canvas.remove();
	  return result;
	}
	async function splitImagesFromUrl(url, positions) {
	  let data;
	  for (let i = 0; i < 3; i++) {
	    try {
	      data = await fetchImage(url);
	      break;
	    } catch (err) {
	    }
	  }
	  if (!data)
	    throw new Error("load sprite image error");
	  url = URL.createObjectURL(data);
	  const img = await new Promise((resolve, reject) => {
	    let img2 = new Image();
	    img2.onload = () => resolve(img2);
	    img2.onerror = () => reject(new Error("load sprite image error"));
	    img2.src = url;
	  });
	  URL.revokeObjectURL(url);
	  return splitSpriteImage(img, positions);
	}

	const regulars = {
	  /** 有压缩的大图地址 */
	  normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
	  /** 原图地址 */
	  original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai(55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad)?\.(org|onion)\/fullimg?[^"\\]*)\"\>/,
	  /** 大图重载地址 */
	  nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
	  /** 是否开启自动多页查看器 */
	  isMPV: /https?:\/\/e[-x]hentai(55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad)?\.(org|onion)\/mpv\/\w+\/\w+\/#page\w/,
	  /** 多页查看器图片列表提取 */
	  mpvImageList: /\{"n":"(.*?)","k":"(\w+)","t":"(.*?)".*?\}/g,
	  /** 精灵图地址提取 */
	  sprite: /url\((.*?)\)/
	};
	class EHMatcher extends BaseMatcher {
	  // "http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*",
	  workURL() {
	    return /e[-x]hentai(.*)?.(org|onion)\/g\/\w+/;
	  }
	  galleryMeta(doc) {
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
	  async fetchOriginMeta(href, retry) {
	    return { url: await this.fetchImgURL(href, retry) };
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    let doc = await (async () => {
	      if (source instanceof Document) {
	        return source;
	      } else {
	        const raw = await window.fetch(source).then((response) => response.text());
	        if (!raw)
	          return null;
	        const domParser = new DOMParser();
	        return domParser.parseFromString(raw, "text/html");
	      }
	    })();
	    if (!doc) {
	      throw new Error("warn: eh matcher failed to get document from source page!");
	    }
	    let isSprite = true;
	    let query = doc.querySelectorAll("#gdt .gdtm > div");
	    if (!query || query.length == 0) {
	      isSprite = false;
	      query = doc.querySelectorAll("#gdt .gdtl");
	    }
	    if (!query || query.length == 0) {
	      throw new Error("warn: failed query image nodes!");
	    }
	    const nodes = Array.from(query);
	    const n0 = nodes[0].firstElementChild;
	    if (regulars.isMPV.test(n0.href)) {
	      const mpvDoc = await window.fetch(n0.href).then((response) => response.text());
	      const matchs = mpvDoc.matchAll(regulars.mpvImageList);
	      const gid = location.pathname.split("/")[2];
	      let i = 0;
	      for (const match of matchs) {
	        i++;
	        const node = new ImageNode(
	          match[3].replaceAll("\\", ""),
	          `${location.origin}/s/${match[2]}/${gid}-${i}`,
	          match[1].replace(/Page\s\d+[:_]\s*/, "")
	        );
	        list.push(node);
	      }
	      return list;
	    }
	    let urls = [];
	    let delayURLs = [];
	    if (isSprite) {
	      let spriteURLs = [];
	      for (let i = 0; i < nodes.length; i++) {
	        const nodeStyles = nodes[i].style;
	        const url = nodeStyles.background.match(regulars.sprite)?.[1]?.replaceAll('"', "");
	        if (!url)
	          break;
	        if (spriteURLs.length === 0 || spriteURLs[spriteURLs.length - 1].url !== url) {
	          spriteURLs.push({ url, range: [{ index: i, style: nodeStyles }] });
	        } else {
	          spriteURLs[spriteURLs.length - 1].range.push({ index: i, style: nodeStyles });
	        }
	      }
	      spriteURLs.forEach(({ url, range }) => {
	        const resolvers = [];
	        const rejects = [];
	        for (let i = 0; i < range.length; i++) {
	          urls.push("");
	          delayURLs.push(new Promise((resolve, reject) => {
	            resolvers.push(resolve);
	            rejects.push(reject);
	          }));
	        }
	        if (!url.startsWith("http")) {
	          url = window.location.origin + url;
	        }
	        splitImagesFromUrl(url, parseImagePositions(range.map((n) => n.style))).then((ret) => {
	          for (let k = 0; k < ret.length; k++) {
	            resolvers[k](ret[k]);
	          }
	        }).catch((err) => {
	          rejects.forEach((r) => r(err));
	        });
	      });
	    } else {
	      if (urls.length == 0) {
	        urls = nodes.map((n) => n.firstElementChild.firstElementChild.src);
	      }
	    }
	    for (let i = 0; i < nodes.length; i++) {
	      const node = new ImageNode(
	        urls[i],
	        nodes[i].querySelector("a").href,
	        nodes[i].querySelector("img").getAttribute("title")?.replace(/Page\s\d+[:_]\s*/, "") || "untitle.jpg",
	        delayURLs[i]
	      );
	      list.push(node);
	    }
	    return list;
	  }
	  async *fetchPagesSource() {
	    const doc = document;
	    let fristImageHref = doc.querySelector("#gdt a")?.getAttribute("href");
	    if (fristImageHref && regulars.isMPV.test(fristImageHref)) {
	      yield window.location.href;
	      return;
	    }
	    let pages = Array.from(doc.querySelectorAll(".gtb td a")).filter((a) => a.getAttribute("href")).map((a) => a.getAttribute("href"));
	    if (pages.length === 0) {
	      throw new Error("未获取到分页元素！");
	    }
	    let lastPage = 0;
	    let url;
	    for (const page of pages) {
	      const u = new URL(page);
	      const num = parseInt(u.searchParams.get("p") || "0");
	      if (num >= lastPage) {
	        lastPage = num;
	        url = u;
	      }
	    }
	    if (!url) {
	      throw new Error("未获取到分页元素！x2");
	    }
	    url.searchParams.delete("p");
	    yield url.href;
	    for (let p = 1; p < lastPage + 1; p++) {
	      url.searchParams.set("p", p.toString());
	      yield url.href;
	    }
	  }
	  async fetchImgURL(url, originChanged) {
	    let text = "";
	    try {
	      text = await window.fetch(url).then((resp) => resp.text());
	    } catch (error) {
	      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
	    }
	    if (!text)
	      throw new Error("[text] is empty");
	    if (conf.fetchOriginal) {
	      const matchs = regulars.original.exec(text);
	      if (matchs && matchs.length > 0) {
	        return matchs[1].replace(/&amp;/g, "&");
	      }
	    }
	    let src;
	    if (originChanged) {
	      const nlValue = regulars.nlValue.exec(text)?.[1];
	      if (nlValue) {
	        const newUrl = url + ((url + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
	        evLog("info", `IMG-FETCHER retry url:${newUrl}`);
	        src = await this.fetchImgURL(newUrl, false);
	      } else {
	        evLog("error", `Cannot matching the nlValue, content: ${text}`);
	      }
	    }
	    if (!src) {
	      src = regulars.normal.exec(text)?.[1];
	    }
	    if (!src)
	      throw new Error(`Cannot matching the image url, content: ${text}`);
	    if (!src.startsWith("http")) {
	      src = window.location.origin + src;
	    }
	    return src;
	  }
	}

	class HitomiGG {
	  base = "a";
	  b;
	  m;
	  constructor(b, m) {
	    this.b = b;
	    this.m = new Function("g", m);
	  }
	  real_full_path_from_hash(hash) {
	    return hash.replace(/^.*(..)(.)$/, "$2/$1/" + hash);
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
	  thumbURL(hash) {
	    hash = hash.replace(/^.*(..)(.)$/, "$2/$1/" + hash);
	    let url = "https://a.hitomi.la/webpsmalltn/" + hash + ".webp";
	    return url.replace(/\/\/..?\.hitomi\.la\//, "//" + this.subdomain_from_url(url, "tn") + ".hitomi.la/");
	  }
	  originURL(hash, ext) {
	    let url = "https://a.hitomi.la/" + ext + "/" + this.b + this.s(hash) + "/" + hash + "." + ext;
	    url = url.replace(/\/\/..?\.hitomi\.la\//, "//" + this.subdomain_from_url(url, this.base) + ".hitomi.la/");
	    return url;
	  }
	}
	const GG_M_REGEX = /m:\sfunction\(g\)\s{(.*?return.*?;)/s;
	const GG_B_REGEX = /b:\s'(\d*\/)'/;
	class HitomiMather extends BaseMatcher {
	  gg;
	  meta = {};
	  infoRecord = {};
	  formats = ["avif", "jxl", "webp"];
	  formatIndex = 0;
	  workURL() {
	    return /hitomi.la\/(?!reader)\w+\/.*\d+\.html/;
	  }
	  async fetchChapters() {
	    this.formatIndex = conf.hitomiFormat === "auto" ? 0 : this.formats.indexOf(conf.hitomiFormat);
	    if (this.formatIndex === -1) {
	      throw new Error("invalid hitomi format: " + conf.hitomiFormat);
	    }
	    const ggRaw = await window.fetch("https://ltn.hitomi.la/gg.js").then((resp) => resp.text());
	    this.gg = new HitomiGG(GG_B_REGEX.exec(ggRaw)[1], GG_M_REGEX.exec(ggRaw)[1]);
	    const ret = [];
	    ret.push({
	      id: 0,
	      title: document.querySelector("#gallery-brand")?.textContent || "default",
	      source: window.location.href,
	      queue: [],
	      thumbimg: document.querySelector(".content > .cover-column > .cover img")?.src
	    });
	    if (conf.mcInSites?.indexOf("hitomi") === -1) {
	      return ret;
	    }
	    document.querySelectorAll("#related-content > div").forEach((element, i) => {
	      const a = element.querySelector("h1.lillie > a");
	      if (a) {
	        ret.push({
	          id: i + 1,
	          title: a.textContent || "default-" + (i + 1),
	          source: a.href,
	          queue: [],
	          thumbimg: element.querySelector("img")?.src
	        });
	      }
	    });
	    return ret;
	  }
	  async *fetchPagesSource(chapter) {
	    const url = chapter.source;
	    const galleryID = url.match(/([0-9]+)(?:\.html)/)?.[1];
	    if (!galleryID) {
	      throw new Error("cannot query hitomi gallery id");
	    }
	    const infoRaw = await window.fetch(`https://ltn.hitomi.la/galleries/${galleryID}.js`).then((resp) => resp.text()).then((text) => text.replace("var galleryinfo = ", ""));
	    if (!infoRaw) {
	      throw new Error("cannot query hitomi gallery info");
	    }
	    const info = JSON.parse(infoRaw);
	    this.setGalleryMeta(info, galleryID, chapter);
	    const doc = await window.fetch(url).then((resp) => resp.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
	    yield doc;
	  }
	  async parseImgNodes(_page, chapterID) {
	    if (!this.infoRecord[chapterID])
	      throw new Error("warn: hitomi gallery info is null!");
	    const files = this.infoRecord[chapterID].files;
	    const list = [];
	    for (let i = 0; i < files.length; i++) {
	      const ext = this.formats.slice(this.formatIndex).find((format) => files[i]["has" + format] === 1);
	      if (!ext) {
	        evLog("error", "no format found: ", files[i]);
	        continue;
	      }
	      let title = files[i].name.replace(/\.\w+$/, "");
	      const node = new ImageNode(
	        this.gg.thumbURL(files[i].hash),
	        this.gg.originURL(files[i].hash, ext),
	        title + "." + ext
	      );
	      list.push(node);
	    }
	    return list;
	  }
	  async fetchOriginMeta(url) {
	    return { url };
	  }
	  setGalleryMeta(info, galleryID, chapter) {
	    this.infoRecord[chapter.id] = info;
	    this.meta[chapter.id] = new GalleryMeta(chapter.source, info.title || "hitomi-" + galleryID);
	    this.meta[chapter.id].originTitle = info.japanese_title || void 0;
	    const excludes = ["scene_indexes", "files"];
	    for (const key in info) {
	      if (excludes.indexOf(key) > -1) {
	        continue;
	      }
	      this.meta[chapter.id].tags[key] = info[key];
	    }
	  }
	  galleryMeta(_, chapter) {
	    return this.meta[chapter.id];
	  }
	  title() {
	    const entries = Object.entries(this.infoRecord);
	    if (entries.length === 0)
	      return "hitomi-unknown";
	    if (entries.length === 1) {
	      return entries[0][1].japanese_title || entries[0][1].title || "hitomi-unknown";
	    } else {
	      return "hitomi-multiple" + entries.map((entry) => entry[1].id).join("_");
	    }
	  }
	}

	class IMHentaiMatcher extends BaseMatcher {
	  data;
	  async fetchOriginMeta(href, _) {
	    const doc = await window.fetch(href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
	    const imgNode = doc.querySelector("#gimg");
	    if (!imgNode) {
	      throw new Error("cannot find image node from: " + href);
	    }
	    const src = imgNode.getAttribute("data-src");
	    if (!src) {
	      throw new Error("cannot find image src from: #gimg");
	    }
	    const ext = src.split(".").pop()?.match(/^\w+/)?.[0];
	    const num = href.match(/\/(\d+)\/?$/)?.[1];
	    let title;
	    if (ext && num) {
	      const digits = this.data.total.toString().length;
	      title = num.toString().padStart(digits, "0") + "." + ext;
	    }
	    return { url: src, title };
	  }
	  async parseImgNodes() {
	    if (!this.data) {
	      throw new Error("impossibility");
	    }
	    const ret = [];
	    const digits = this.data.total.toString().length;
	    for (let i = 1; i <= this.data.total; i++) {
	      const url = `https://m${this.data.server}.imhentai.xxx/${this.data.imgDir}/${this.data.gid}/${i}t.jpg`;
	      const href = `https://imhentai.xxx/view/${this.data.uid}/${i}/`;
	      const node = new ImageNode(url, href, `${i.toString().padStart(digits, "0")}.jpg`);
	      ret.push(node);
	    }
	    return ret;
	  }
	  async *fetchPagesSource() {
	    const server = q("#load_server").value;
	    const uid = q("#gallery_id").value;
	    const gid = q("#load_id").value;
	    const imgDir = q("#load_dir").value;
	    const total = q("#load_pages").value;
	    this.data = { server, uid, gid, imgDir, total: Number(total) };
	    yield document;
	  }
	  galleryMeta(doc) {
	    const title = doc.querySelector(".right_details > h1")?.textContent || void 0;
	    const originTitle = doc.querySelector(".right_details > p.subtitle")?.textContent || void 0;
	    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
	    meta.originTitle = originTitle;
	    meta.tags = {};
	    const list = Array.from(doc.querySelectorAll(".galleries_info > li"));
	    for (const li of list) {
	      let cat = li.querySelector(".tags_text")?.textContent;
	      if (!cat)
	        continue;
	      cat = cat.replace(":", "").trim();
	      if (!cat)
	        continue;
	      const tags = Array.from(li.querySelectorAll("a.tag")).map((a) => a.firstChild?.textContent?.trim()).filter((v) => Boolean(v));
	      meta.tags[cat] = tags;
	    }
	    return meta;
	  }
	  workURL() {
	    return /imhentai.xxx\/gallery\/\d+\//;
	  }
	}

	const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
	class NHMatcher extends BaseMatcher {
	  workURL() {
	    return /nhentai.net\/g\/\d+\/?$/;
	  }
	  galleryMeta(doc) {
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
	      const cat = tr.firstChild?.textContent?.trim().replace(":", "");
	      if (cat) {
	        const list = [];
	        tr.querySelectorAll(".tag .name").forEach((tag) => {
	          const t = tag.textContent?.trim();
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
	  async fetchOriginMeta(href) {
	    let text = "";
	    try {
	      text = await window.fetch(href).then((resp) => resp.text());
	      if (!text)
	        throw new Error("[text] is empty");
	    } catch (error) {
	      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
	    }
	    return { url: NH_IMG_URL_REGEX.exec(text)[1] };
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    const nodes = source.querySelectorAll(".thumb-container > .gallerythumb");
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
	      const newNode = new ImageNode(
	        imgNode.getAttribute("data-src"),
	        location.origin + node.getAttribute("href"),
	        imgNode.getAttribute("title") || `${i}.jpg`
	      );
	      list.push(newNode);
	    }
	    return list;
	  }
	  async *fetchPagesSource() {
	    yield document;
	  }
	}

	const class_worker_raw = "/// <reference no-default-lib=\"true\" />\n/// <reference lib=\"esnext\" />\n/// <reference lib=\"webworker\" />\nconst MIME_TYPE_JAVASCRIPT = \"text/javascript\";\nconst MIME_TYPE_WASM = \"application/wasm\";\nconst CORE_VERSION = \"0.12.6\";\nconst CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;\nvar FFMessageType;\n(function(FFMessageType) {\n  FFMessageType[\"LOAD\"] = \"LOAD\";\n  FFMessageType[\"EXEC\"] = \"EXEC\";\n  FFMessageType[\"WRITE_FILE\"] = \"WRITE_FILE\";\n  FFMessageType[\"READ_FILE\"] = \"READ_FILE\";\n  FFMessageType[\"DELETE_FILE\"] = \"DELETE_FILE\";\n  FFMessageType[\"RENAME\"] = \"RENAME\";\n  FFMessageType[\"CREATE_DIR\"] = \"CREATE_DIR\";\n  FFMessageType[\"LIST_DIR\"] = \"LIST_DIR\";\n  FFMessageType[\"DELETE_DIR\"] = \"DELETE_DIR\";\n  FFMessageType[\"ERROR\"] = \"ERROR\";\n  FFMessageType[\"DOWNLOAD\"] = \"DOWNLOAD\";\n  FFMessageType[\"PROGRESS\"] = \"PROGRESS\";\n  FFMessageType[\"LOG\"] = \"LOG\";\n  FFMessageType[\"MOUNT\"] = \"MOUNT\";\n  FFMessageType[\"UNMOUNT\"] = \"UNMOUNT\";\n})(FFMessageType || (FFMessageType = {}));\n\n\nconst ERROR_UNKNOWN_MESSAGE_TYPE = new Error(\"unknown message type\");\nconst ERROR_NOT_LOADED = new Error(\"ffmpeg is not loaded, call `await ffmpeg.load()` first\");\nconst ERROR_TERMINATED = new Error(\"called FFmpeg.terminate()\");\nconst ERROR_IMPORT_FAILURE = new Error(\"failed to import ffmpeg-core.js\");\n\nlet ffmpeg;\nconst load = async ({ coreURL: _coreURL, wasmURL: _wasmURL, workerURL: _workerURL, }) => {\n  const first = !ffmpeg;\n  try {\n    if (!_coreURL)\n      _coreURL = CORE_URL;\n    // when web worker type is `classic`.\n    importScripts(_coreURL);\n  }\n  catch {\n    if (!_coreURL)\n      _coreURL = CORE_URL.replace('/umd/', '/esm/');\n    // when web worker type is `module`.\n    self.createFFmpegCore = (await import(\n        /* webpackIgnore: true */ /* @vite-ignore */ _coreURL)).default;\n    if (!self.createFFmpegCore) {\n      throw ERROR_IMPORT_FAILURE;\n    }\n  }\n  const coreURL = _coreURL;\n  const wasmURL = _wasmURL ? _wasmURL : _coreURL.replace(/.js$/g, \".wasm\");\n  const workerURL = _workerURL\n    ? _workerURL\n    : _coreURL.replace(/.js$/g, \".worker.js\");\n  ffmpeg = await self.createFFmpegCore({\n    // Fix `Overload resolution failed.` when using multi-threaded ffmpeg-core.\n    // Encoded wasmURL and workerURL in the URL as a hack to fix locateFile issue.\n    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,\n  });\n  ffmpeg.setLogger((data) => self.postMessage({ type: FFMessageType.LOG, data }));\n  ffmpeg.setProgress((data) => self.postMessage({\n    type: FFMessageType.PROGRESS,\n    data,\n  }));\n  return first;\n};\nconst exec = ({ args, timeout = -1 }) => {\n  ffmpeg.setTimeout(timeout);\n  ffmpeg.exec(...args);\n  const ret = ffmpeg.ret;\n  ffmpeg.reset();\n  return ret;\n};\nconst writeFile = ({ path, data }) => {\n  ffmpeg.FS.writeFile(path, data);\n  return true;\n};\nconst readFile = ({ path, encoding }) => ffmpeg.FS.readFile(path, { encoding });\n// TODO: check if deletion works.\nconst deleteFile = ({ path }) => {\n  ffmpeg.FS.unlink(path);\n  return true;\n};\nconst rename = ({ oldPath, newPath }) => {\n  ffmpeg.FS.rename(oldPath, newPath);\n  return true;\n};\n// TODO: check if creation works.\nconst createDir = ({ path }) => {\n  ffmpeg.FS.mkdir(path);\n  return true;\n};\nconst listDir = ({ path }) => {\n  const names = ffmpeg.FS.readdir(path);\n  const nodes = [];\n  for (const name of names) {\n    const stat = ffmpeg.FS.stat(`${path}/${name}`);\n    const isDir = ffmpeg.FS.isDir(stat.mode);\n    nodes.push({ name, isDir });\n  }\n  return nodes;\n};\n// TODO: check if deletion works.\nconst deleteDir = ({ path }) => {\n  ffmpeg.FS.rmdir(path);\n  return true;\n};\nconst mount = ({ fsType, options, mountPoint }) => {\n  const str = fsType;\n  const fs = ffmpeg.FS.filesystems[str];\n  if (!fs)\n    return false;\n  ffmpeg.FS.mount(fs, options, mountPoint);\n  return true;\n};\nconst unmount = ({ mountPoint }) => {\n  ffmpeg.FS.unmount(mountPoint);\n  return true;\n};\nself.onmessage = async ({ data: { id, type, data: _data }, }) => {\n  const trans = [];\n  let data;\n  try {\n    if (type !== FFMessageType.LOAD && !ffmpeg)\n      throw ERROR_NOT_LOADED; // eslint-disable-line\n    switch (type) {\n      case FFMessageType.LOAD:\n        data = await load(_data);\n        break;\n      case FFMessageType.EXEC:\n        data = exec(_data);\n        break;\n      case FFMessageType.WRITE_FILE:\n        data = writeFile(_data);\n        break;\n      case FFMessageType.READ_FILE:\n        data = readFile(_data);\n        break;\n      case FFMessageType.DELETE_FILE:\n        data = deleteFile(_data);\n        break;\n      case FFMessageType.RENAME:\n        data = rename(_data);\n        break;\n      case FFMessageType.CREATE_DIR:\n        data = createDir(_data);\n        break;\n      case FFMessageType.LIST_DIR:\n        data = listDir(_data);\n        break;\n      case FFMessageType.DELETE_DIR:\n        data = deleteDir(_data);\n        break;\n      case FFMessageType.MOUNT:\n        data = mount(_data);\n        break;\n      case FFMessageType.UNMOUNT:\n        data = unmount(_data);\n        break;\n      default:\n        throw ERROR_UNKNOWN_MESSAGE_TYPE;\n    }\n  }\n  catch (e) {\n    self.postMessage({\n      id,\n      type: FFMessageType.ERROR,\n      data: e.toString(),\n    });\n    return;\n  }\n  if (data instanceof Uint8Array) {\n    trans.push(data.buffer);\n  }\n  self.postMessage({ id, type, data }, trans);\n};\n\n";

	const core_raw = "\nvar createFFmpegCore = (() => {\n  var _scriptDir = import.meta.url;\n  \n  return (\nasync function(createFFmpegCore = {})  {\n\nvar Module=typeof createFFmpegCore!=\"undefined\"?createFFmpegCore:{};var readyPromiseResolve,readyPromiseReject;Module[\"ready\"]=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject});const NULL=0;const SIZE_I32=Uint32Array.BYTES_PER_ELEMENT;const DEFAULT_ARGS=[\"./ffmpeg\",\"-nostdin\",\"-y\"];Module[\"NULL\"]=NULL;Module[\"SIZE_I32\"]=SIZE_I32;Module[\"DEFAULT_ARGS\"]=DEFAULT_ARGS;Module[\"ret\"]=-1;Module[\"timeout\"]=-1;Module[\"logger\"]=()=>{};Module[\"progress\"]=()=>{};function stringToPtr(str){const len=Module[\"lengthBytesUTF8\"](str)+1;const ptr=Module[\"_malloc\"](len);Module[\"stringToUTF8\"](str,ptr,len);return ptr}function stringsToPtr(strs){const len=strs.length;const ptr=Module[\"_malloc\"](len*SIZE_I32);for(let i=0;i<len;i++){Module[\"setValue\"](ptr+SIZE_I32*i,stringToPtr(strs[i]),\"i32\")}return ptr}function print(message){Module[\"logger\"]({type:\"stdout\",message:message})}function printErr(message){if(!message.startsWith(\"Aborted(native code called abort())\"))Module[\"logger\"]({type:\"stderr\",message:message})}function exec(..._args){const args=[...Module[\"DEFAULT_ARGS\"],..._args];try{Module[\"_ffmpeg\"](args.length,stringsToPtr(args))}catch(e){if(!e.message.startsWith(\"Aborted\")){throw e}}return Module[\"ret\"]}function setLogger(logger){Module[\"logger\"]=logger}function setTimeout(timeout){Module[\"timeout\"]=timeout}function setProgress(handler){Module[\"progress\"]=handler}function receiveProgress(progress,time){Module[\"progress\"]({progress:progress,time:time})}function reset(){Module[\"ret\"]=-1;Module[\"timeout\"]=-1}function _locateFile(path,prefix){const mainScriptUrlOrBlob=Module[\"mainScriptUrlOrBlob\"];if(mainScriptUrlOrBlob){const{wasmURL:wasmURL,workerURL:workerURL}=JSON.parse(atob(mainScriptUrlOrBlob.slice(mainScriptUrlOrBlob.lastIndexOf(\"#\")+1)));if(path.endsWith(\".wasm\"))return wasmURL;if(path.endsWith(\".worker.js\"))return workerURL}return prefix+path}Module[\"stringToPtr\"]=stringToPtr;Module[\"stringsToPtr\"]=stringsToPtr;Module[\"print\"]=print;Module[\"printErr\"]=printErr;Module[\"locateFile\"]=_locateFile;Module[\"exec\"]=exec;Module[\"setLogger\"]=setLogger;Module[\"setTimeout\"]=setTimeout;Module[\"setProgress\"]=setProgress;Module[\"reset\"]=reset;Module[\"receiveProgress\"]=receiveProgress;var moduleOverrides=Object.assign({},Module);var arguments_=[];var thisProgram=\"./this.program\";var quit_=(status,toThrow)=>{throw toThrow};var ENVIRONMENT_IS_WEB=typeof window==\"object\";var ENVIRONMENT_IS_WORKER=typeof importScripts==\"function\";var ENVIRONMENT_IS_NODE=typeof process==\"object\"&&typeof process.versions==\"object\"&&typeof process.versions.node==\"string\";var scriptDirectory=\"\";function locateFile(path){if(Module[\"locateFile\"]){return Module[\"locateFile\"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary,setWindowTitle;if(ENVIRONMENT_IS_NODE){const{createRequire:createRequire}=await import(\"module\");var require=createRequire(import.meta.url);var fs=require(\"fs\");var nodePath=require(\"path\");if(ENVIRONMENT_IS_WORKER){scriptDirectory=nodePath.dirname(scriptDirectory)+\"/\"}else{scriptDirectory=require(\"url\").fileURLToPath(new URL(\"./\",import.meta.url))}read_=(filename,binary)=>{filename=isFileURI(filename)?new URL(filename):nodePath.normalize(filename);return fs.readFileSync(filename,binary?undefined:\"utf8\")};readBinary=filename=>{var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}return ret};readAsync=(filename,onload,onerror,binary=true)=>{filename=isFileURI(filename)?new URL(filename):nodePath.normalize(filename);fs.readFile(filename,binary?undefined:\"utf8\",(err,data)=>{if(err)onerror(err);else onload(binary?data.buffer:data)})};if(!Module[\"thisProgram\"]&&process.argv.length>1){thisProgram=process.argv[1].replace(/\\\\/g,\"/\")}arguments_=process.argv.slice(2);quit_=(status,toThrow)=>{process.exitCode=status;throw toThrow};Module[\"inspect\"]=()=>\"[Emscripten Module object]\"}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(typeof document!=\"undefined\"&&document.currentScript){scriptDirectory=document.currentScript.src}if(_scriptDir){scriptDirectory=_scriptDir}if(scriptDirectory.indexOf(\"blob:\")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,\"\").lastIndexOf(\"/\")+1)}else{scriptDirectory=\"\"}{read_=url=>{var xhr=new XMLHttpRequest;xhr.open(\"GET\",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open(\"GET\",url,false);xhr.responseType=\"arraybuffer\";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=(url,onload,onerror)=>{var xhr=new XMLHttpRequest;xhr.open(\"GET\",url,true);xhr.responseType=\"arraybuffer\";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}onerror()};xhr.onerror=onerror;xhr.send(null)}}setWindowTitle=title=>document.title=title}else{}var out=Module[\"print\"]||console.log.bind(console);var err=Module[\"printErr\"]||console.error.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module[\"arguments\"])arguments_=Module[\"arguments\"];if(Module[\"thisProgram\"])thisProgram=Module[\"thisProgram\"];if(Module[\"quit\"])quit_=Module[\"quit\"];var wasmBinary;if(Module[\"wasmBinary\"])wasmBinary=Module[\"wasmBinary\"];var noExitRuntime=Module[\"noExitRuntime\"]||true;if(typeof WebAssembly!=\"object\"){abort(\"no native wasm support detected\")}var wasmMemory;var ABORT=false;var EXITSTATUS;function assert(condition,text){if(!condition){abort(text)}}var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAP64,HEAPU64,HEAPF64;function updateMemoryViews(){var b=wasmMemory.buffer;Module[\"HEAP8\"]=HEAP8=new Int8Array(b);Module[\"HEAP16\"]=HEAP16=new Int16Array(b);Module[\"HEAP32\"]=HEAP32=new Int32Array(b);Module[\"HEAPU8\"]=HEAPU8=new Uint8Array(b);Module[\"HEAPU16\"]=HEAPU16=new Uint16Array(b);Module[\"HEAPU32\"]=HEAPU32=new Uint32Array(b);Module[\"HEAPF32\"]=HEAPF32=new Float32Array(b);Module[\"HEAPF64\"]=HEAPF64=new Float64Array(b);Module[\"HEAP64\"]=HEAP64=new BigInt64Array(b);Module[\"HEAPU64\"]=HEAPU64=new BigUint64Array(b)}var wasmTable;var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeKeepaliveCounter=0;function keepRuntimeAlive(){return noExitRuntime||runtimeKeepaliveCounter>0}function preRun(){if(Module[\"preRun\"]){if(typeof Module[\"preRun\"]==\"function\")Module[\"preRun\"]=[Module[\"preRun\"]];while(Module[\"preRun\"].length){addOnPreRun(Module[\"preRun\"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){runtimeInitialized=true;if(!Module[\"noFSInit\"]&&!FS.init.initialized)FS.init();FS.ignorePermissions=false;TTY.init();SOCKFS.root=FS.mount(SOCKFS,{},null);callRuntimeCallbacks(__ATINIT__)}function postRun(){if(Module[\"postRun\"]){if(typeof Module[\"postRun\"]==\"function\")Module[\"postRun\"]=[Module[\"postRun\"]];while(Module[\"postRun\"].length){addOnPostRun(Module[\"postRun\"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnInit(cb){__ATINIT__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function getUniqueRunDependency(id){return id}function addRunDependency(id){runDependencies++;if(Module[\"monitorRunDependencies\"]){Module[\"monitorRunDependencies\"](runDependencies)}}function removeRunDependency(id){runDependencies--;if(Module[\"monitorRunDependencies\"]){Module[\"monitorRunDependencies\"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}function abort(what){if(Module[\"onAbort\"]){Module[\"onAbort\"](what)}what=\"Aborted(\"+what+\")\";err(what);ABORT=true;EXITSTATUS=1;what+=\". Build with -sASSERTIONS for more info.\";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix=\"data:application/octet-stream;base64,\";function isDataURI(filename){return filename.startsWith(dataURIPrefix)}function isFileURI(filename){return filename.startsWith(\"file://\")}var wasmBinaryFile;if(Module[\"locateFile\"]){wasmBinaryFile=\"ffmpeg-core.wasm\";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile)}}else{wasmBinaryFile=new URL(\"ffmpeg-core.wasm\",import.meta.url).href}function getBinary(file){try{if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw\"both async and sync fetching of the wasm failed\"}catch(err){abort(err)}}function getBinaryPromise(binaryFile){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)){if(typeof fetch==\"function\"&&!isFileURI(binaryFile)){return fetch(binaryFile,{credentials:\"same-origin\"}).then(response=>{if(!response[\"ok\"]){throw\"failed to load wasm binary file at '\"+binaryFile+\"'\"}return response[\"arrayBuffer\"]()}).catch(()=>getBinary(binaryFile))}else{if(readAsync){return new Promise((resolve,reject)=>{readAsync(binaryFile,response=>resolve(new Uint8Array(response)),reject)})}}}return Promise.resolve().then(()=>getBinary(binaryFile))}function instantiateArrayBuffer(binaryFile,imports,receiver){return getBinaryPromise(binaryFile).then(binary=>{return WebAssembly.instantiate(binary,imports)}).then(instance=>{return instance}).then(receiver,reason=>{err(\"failed to asynchronously prepare wasm: \"+reason);abort(reason)})}function instantiateAsync(binary,binaryFile,imports,callback){if(!binary&&typeof WebAssembly.instantiateStreaming==\"function\"&&!isDataURI(binaryFile)&&!isFileURI(binaryFile)&&!ENVIRONMENT_IS_NODE&&typeof fetch==\"function\"){return fetch(binaryFile,{credentials:\"same-origin\"}).then(response=>{var result=WebAssembly.instantiateStreaming(response,imports);return result.then(callback,function(reason){err(\"wasm streaming compile failed: \"+reason);err(\"falling back to ArrayBuffer instantiation\");return instantiateArrayBuffer(binaryFile,imports,callback)})})}else{return instantiateArrayBuffer(binaryFile,imports,callback)}}function createWasm(){var info={\"a\":wasmImports};function receiveInstance(instance,module){var exports=instance.exports;Module[\"asm\"]=exports;wasmMemory=Module[\"asm\"][\"ra\"];updateMemoryViews();wasmTable=Module[\"asm\"][\"ua\"];addOnInit(Module[\"asm\"][\"sa\"]);removeRunDependency(\"wasm-instantiate\");return exports}addRunDependency(\"wasm-instantiate\");function receiveInstantiationResult(result){receiveInstance(result[\"instance\"])}if(Module[\"instantiateWasm\"]){try{return Module[\"instantiateWasm\"](info,receiveInstance)}catch(e){err(\"Module.instantiateWasm callback failed with error: \"+e);readyPromiseReject(e)}}instantiateAsync(wasmBinary,wasmBinaryFile,info,receiveInstantiationResult).catch(readyPromiseReject);return{}}var ASM_CONSTS={6059608:$0=>{Module.ret=$0}};function send_progress(progress,time){Module.receiveProgress(progress,time)}function is_timeout(diff){if(Module.timeout===-1)return 0;else{return Module.timeout<=diff}}function ExitStatus(status){this.name=\"ExitStatus\";this.message=`Program terminated with exit(${status})`;this.status=status}function callRuntimeCallbacks(callbacks){while(callbacks.length>0){callbacks.shift()(Module)}}var wasmTableMirror=[];function getWasmTableEntry(funcPtr){var func=wasmTableMirror[funcPtr];if(!func){if(funcPtr>=wasmTableMirror.length)wasmTableMirror.length=funcPtr+1;wasmTableMirror[funcPtr]=func=wasmTable.get(funcPtr)}return func}function getValue(ptr,type=\"i8\"){if(type.endsWith(\"*\"))type=\"*\";switch(type){case\"i1\":return HEAP8[ptr>>0];case\"i8\":return HEAP8[ptr>>0];case\"i16\":return HEAP16[ptr>>1];case\"i32\":return HEAP32[ptr>>2];case\"i64\":return HEAP64[ptr>>3];case\"float\":return HEAPF32[ptr>>2];case\"double\":return HEAPF64[ptr>>3];case\"*\":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}function setValue(ptr,value,type=\"i8\"){if(type.endsWith(\"*\"))type=\"*\";switch(type){case\"i1\":HEAP8[ptr>>0]=value;break;case\"i8\":HEAP8[ptr>>0]=value;break;case\"i16\":HEAP16[ptr>>1]=value;break;case\"i32\":HEAP32[ptr>>2]=value;break;case\"i64\":HEAP64[ptr>>3]=BigInt(value);break;case\"float\":HEAPF32[ptr>>2]=value;break;case\"double\":HEAPF64[ptr>>3]=value;break;case\"*\":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var UTF8Decoder=typeof TextDecoder!=\"undefined\"?new TextDecoder(\"utf8\"):undefined;function UTF8ArrayToString(heapOrArray,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heapOrArray[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str=\"\";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):\"\"}function ___assert_fail(condition,filename,line,func){abort(`Assertion failed: ${UTF8ToString(condition)}, at: `+[filename?UTF8ToString(filename):\"unknown filename\",line,func?UTF8ToString(func):\"unknown function\"])}function ExceptionInfo(excPtr){this.excPtr=excPtr;this.ptr=excPtr-24;this.set_type=function(type){HEAPU32[this.ptr+4>>2]=type};this.get_type=function(){return HEAPU32[this.ptr+4>>2]};this.set_destructor=function(destructor){HEAPU32[this.ptr+8>>2]=destructor};this.get_destructor=function(){return HEAPU32[this.ptr+8>>2]};this.set_caught=function(caught){caught=caught?1:0;HEAP8[this.ptr+12>>0]=caught};this.get_caught=function(){return HEAP8[this.ptr+12>>0]!=0};this.set_rethrown=function(rethrown){rethrown=rethrown?1:0;HEAP8[this.ptr+13>>0]=rethrown};this.get_rethrown=function(){return HEAP8[this.ptr+13>>0]!=0};this.init=function(type,destructor){this.set_adjusted_ptr(0);this.set_type(type);this.set_destructor(destructor)};this.set_adjusted_ptr=function(adjustedPtr){HEAPU32[this.ptr+16>>2]=adjustedPtr};this.get_adjusted_ptr=function(){return HEAPU32[this.ptr+16>>2]};this.get_exception_ptr=function(){var isPointer=___cxa_is_pointer_type(this.get_type());if(isPointer){return HEAPU32[this.excPtr>>2]}var adjusted=this.get_adjusted_ptr();if(adjusted!==0)return adjusted;return this.excPtr}}var exceptionLast=0;var uncaughtExceptionCount=0;function ___cxa_throw(ptr,type,destructor){var info=new ExceptionInfo(ptr);info.init(type,destructor);exceptionLast=ptr;uncaughtExceptionCount++;throw exceptionLast}var dlopenMissingError=\"To use dlopen, you need enable dynamic linking, see https://emscripten.org/docs/compiling/Dynamic-Linking.html\";function ___dlsym(handle,symbol){abort(dlopenMissingError)}var PATH={isAbs:path=>path.charAt(0)===\"/\",splitPath:filename=>{var splitPathRe=/^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last===\".\"){parts.splice(i,1)}else if(last===\"..\"){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift(\"..\")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.substr(-1)===\"/\";path=PATH.normalizeArray(path.split(\"/\").filter(p=>!!p),!isAbsolute).join(\"/\");if(!path&&!isAbsolute){path=\".\"}if(path&&trailingSlash){path+=\"/\"}return(isAbsolute?\"/\":\"\")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return\".\"}if(dir){dir=dir.substr(0,dir.length-1)}return root+dir},basename:path=>{if(path===\"/\")return\"/\";path=PATH.normalize(path);path=path.replace(/\\/$/,\"\");var lastSlash=path.lastIndexOf(\"/\");if(lastSlash===-1)return path;return path.substr(lastSlash+1)},join:function(){var paths=Array.prototype.slice.call(arguments);return PATH.normalize(paths.join(\"/\"))},join2:(l,r)=>{return PATH.normalize(l+\"/\"+r)}};function initRandomFill(){if(typeof crypto==\"object\"&&typeof crypto[\"getRandomValues\"]==\"function\"){return view=>crypto.getRandomValues(view)}else if(ENVIRONMENT_IS_NODE){try{var crypto_module=require(\"crypto\");var randomFillSync=crypto_module[\"randomFillSync\"];if(randomFillSync){return view=>crypto_module[\"randomFillSync\"](view)}var randomBytes=crypto_module[\"randomBytes\"];return view=>(view.set(randomBytes(view.byteLength)),view)}catch(e){}}abort(\"initRandomDevice\")}function randomFill(view){return(randomFill=initRandomFill())(view)}var PATH_FS={resolve:function(){var resolvedPath=\"\",resolvedAbsolute=false;for(var i=arguments.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?arguments[i]:FS.cwd();if(typeof path!=\"string\"){throw new TypeError(\"Arguments to path.resolve must be strings\")}else if(!path){return\"\"}resolvedPath=path+\"/\"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split(\"/\").filter(p=>!!p),!resolvedAbsolute).join(\"/\");return(resolvedAbsolute?\"/\":\"\")+resolvedPath||\".\"},relative:(from,to)=>{from=PATH_FS.resolve(from).substr(1);to=PATH_FS.resolve(to).substr(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!==\"\")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!==\"\")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split(\"/\"));var toParts=trim(to.split(\"/\"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push(\"..\")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join(\"/\")}};function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len}function stringToUTF8Array(str,heap,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}}heap[outIdx]=0;return outIdx-startIdx}function intArrayFromString(stringy,dontAddNull,length){var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array}var TTY={ttys:[],init:function(){},shutdown:function(){},register:function(dev,ops){TTY.ttys[dev]={input:[],output:[],ops:ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open:function(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close:function(stream){stream.tty.ops.fsync(stream.tty)},fsync:function(stream){stream.tty.ops.fsync(stream.tty)},read:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.timestamp=Date.now()}return bytesRead},write:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.timestamp=Date.now()}return i}},default_tty_ops:{get_char:function(tty){if(!tty.input.length){var result=null;if(ENVIRONMENT_IS_NODE){var BUFSIZE=256;var buf=Buffer.alloc(BUFSIZE);var bytesRead=0;try{bytesRead=fs.readSync(process.stdin.fd,buf,0,BUFSIZE,-1)}catch(e){if(e.toString().includes(\"EOF\"))bytesRead=0;else throw e}if(bytesRead>0){result=buf.slice(0,bytesRead).toString(\"utf-8\")}else{result=null}}else if(typeof window!=\"undefined\"&&typeof window.prompt==\"function\"){result=window.prompt(\"Input: \");if(result!==null){result+=\"\\n\"}}else if(typeof readline==\"function\"){result=readline();if(result!==null){result+=\"\\n\"}}if(!result){return null}tty.input=intArrayFromString(result,true)}return tty.input.shift()},put_char:function(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output,0));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync:function(tty){if(tty.output&&tty.output.length>0){out(UTF8ArrayToString(tty.output,0));tty.output=[]}}},default_tty1_ops:{put_char:function(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output,0));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync:function(tty){if(tty.output&&tty.output.length>0){err(UTF8ArrayToString(tty.output,0));tty.output=[]}}}};function zeroMemory(address,size){HEAPU8.fill(0,address,address+size);return address}function alignMemory(size,alignment){return Math.ceil(size/alignment)*alignment}function mmapAlloc(size){size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(!ptr)return 0;return zeroMemory(ptr,size)}var MEMFS={ops_table:null,mount:function(mount){return MEMFS.createNode(null,\"/\",16384|511,0)},createNode:function(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}if(!MEMFS.ops_table){MEMFS.ops_table={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,allocate:MEMFS.stream_ops.allocate,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}}}var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=null}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.timestamp=Date.now();if(parent){parent.contents[name]=node;parent.timestamp=node.timestamp}return node},getFileDataAsTypedArray:function(node){if(!node.contents)return new Uint8Array(0);if(node.contents.subarray)return node.contents.subarray(0,node.usedBytes);return new Uint8Array(node.contents)},expandFileStorage:function(node,newCapacity){var prevCapacity=node.contents?node.contents.length:0;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity!=0)newCapacity=Math.max(newCapacity,256);var oldContents=node.contents;node.contents=new Uint8Array(newCapacity);if(node.usedBytes>0)node.contents.set(oldContents.subarray(0,node.usedBytes),0)},resizeFileStorage:function(node,newSize){if(node.usedBytes==newSize)return;if(newSize==0){node.contents=null;node.usedBytes=0}else{var oldContents=node.contents;node.contents=new Uint8Array(newSize);if(oldContents){node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)))}node.usedBytes=newSize}},node_ops:{getattr:function(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.timestamp);attr.mtime=new Date(node.timestamp);attr.ctime=new Date(node.timestamp);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr:function(node,attr){if(attr.mode!==undefined){node.mode=attr.mode}if(attr.timestamp!==undefined){node.timestamp=attr.timestamp}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup:function(parent,name){throw FS.genericErrors[44]},mknod:function(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename:function(old_node,new_dir,new_name){if(FS.isDir(old_node.mode)){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}}delete old_node.parent.contents[old_node.name];old_node.parent.timestamp=Date.now();old_node.name=new_name;new_dir.contents[new_name]=old_node;new_dir.timestamp=old_node.parent.timestamp;old_node.parent=new_dir},unlink:function(parent,name){delete parent.contents[name];parent.timestamp=Date.now()},rmdir:function(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.timestamp=Date.now()},readdir:function(node){var entries=[\".\",\"..\"];for(var key in node.contents){if(!node.contents.hasOwnProperty(key)){continue}entries.push(key)}return entries},symlink:function(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink:function(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read:function(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);if(size>8&&contents.subarray){buffer.set(contents.subarray(position,position+size),offset)}else{for(var i=0;i<size;i++)buffer[offset+i]=contents[position+i]}return size},write:function(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.timestamp=Date.now();if(buffer.subarray&&(!node.contents||node.contents.subarray)){if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length;return length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length;return length}else if(position+length<=node.usedBytes){node.contents.set(buffer.subarray(offset,offset+length),position);return length}}MEMFS.expandFileStorage(node,position+length);if(node.contents.subarray&&buffer.subarray){node.contents.set(buffer.subarray(offset,offset+length),position)}else{for(var i=0;i<length;i++){node.contents[position+i]=buffer[offset+i]}}node.usedBytes=Math.max(node.usedBytes,position+length);return length},llseek:function(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},allocate:function(stream,offset,length){MEMFS.expandFileStorage(stream.node,offset+length);stream.node.usedBytes=Math.max(stream.node.usedBytes,offset+length)},mmap:function(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}HEAP8.set(contents,ptr)}return{ptr:ptr,allocated:allocated}},msync:function(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};function asyncLoad(url,onload,onerror,noRunDep){var dep=!noRunDep?getUniqueRunDependency(`al ${url}`):\"\";readAsync(url,arrayBuffer=>{assert(arrayBuffer,`Loading data file \"${url}\" failed (no arrayBuffer).`);onload(new Uint8Array(arrayBuffer));if(dep)removeRunDependency(dep)},event=>{if(onerror){onerror()}else{throw`Loading data file \"${url}\" failed.`}});if(dep)addRunDependency(dep)}var preloadPlugins=Module[\"preloadPlugins\"]||[];function FS_handledByPreloadPlugin(byteArray,fullname,finish,onerror){if(typeof Browser!=\"undefined\")Browser.init();var handled=false;preloadPlugins.forEach(function(plugin){if(handled)return;if(plugin[\"canHandle\"](fullname)){plugin[\"handle\"](byteArray,fullname,finish,onerror);handled=true}});return handled}function FS_createPreloadedFile(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish){var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);function processData(byteArray){function finish(byteArray){if(preFinish)preFinish();if(!dontCreateFile){FS.createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}if(onload)onload();removeRunDependency(dep)}if(FS_handledByPreloadPlugin(byteArray,fullname,finish,()=>{if(onerror)onerror();removeRunDependency(dep)})){return}finish(byteArray)}addRunDependency(dep);if(typeof url==\"string\"){asyncLoad(url,byteArray=>processData(byteArray),onerror)}else{processData(url)}}function FS_modeStringToFlags(str){var flagModes={\"r\":0,\"r+\":2,\"w\":512|64|1,\"w+\":512|64|2,\"a\":1024|64|1,\"a+\":1024|64|2};var flags=flagModes[str];if(typeof flags==\"undefined\"){throw new Error(`Unknown file open mode: ${str}`)}return flags}function FS_getMode(canRead,canWrite){var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode}var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function(mount){assert(ENVIRONMENT_IS_WORKER);if(!WORKERFS.reader)WORKERFS.reader=new FileReaderSync;var root=WORKERFS.createNode(null,\"/\",WORKERFS.DIR_MODE,0);var createdParents={};function ensureParent(path){var parts=path.split(\"/\");var parent=root;for(var i=0;i<parts.length-1;i++){var curr=parts.slice(0,i+1).join(\"/\");if(!createdParents[curr]){createdParents[curr]=WORKERFS.createNode(parent,parts[i],WORKERFS.DIR_MODE,0)}parent=createdParents[curr]}return parent}function base(path){var parts=path.split(\"/\");return parts[parts.length-1]}Array.prototype.forEach.call(mount.opts[\"files\"]||[],function(file){WORKERFS.createNode(ensureParent(file.name),base(file.name),WORKERFS.FILE_MODE,0,file,file.lastModifiedDate)});(mount.opts[\"blobs\"]||[]).forEach(function(obj){WORKERFS.createNode(ensureParent(obj[\"name\"]),base(obj[\"name\"]),WORKERFS.FILE_MODE,0,obj[\"data\"])});(mount.opts[\"packages\"]||[]).forEach(function(pack){pack[\"metadata\"].files.forEach(function(file){var name=file.filename.substr(1);WORKERFS.createNode(ensureParent(name),base(name),WORKERFS.FILE_MODE,0,pack[\"blob\"].slice(file.start,file.end))})});return root},createNode:function(parent,name,mode,dev,contents,mtime){var node=FS.createNode(parent,name,mode);node.mode=mode;node.node_ops=WORKERFS.node_ops;node.stream_ops=WORKERFS.stream_ops;node.timestamp=(mtime||new Date).getTime();assert(WORKERFS.FILE_MODE!==WORKERFS.DIR_MODE);if(mode===WORKERFS.FILE_MODE){node.size=contents.size;node.contents=contents}else{node.size=4096;node.contents={}}if(parent){parent.contents[name]=node}return node},node_ops:{getattr:function(node){return{dev:1,ino:node.id,mode:node.mode,nlink:1,uid:0,gid:0,rdev:undefined,size:node.size,atime:new Date(node.timestamp),mtime:new Date(node.timestamp),ctime:new Date(node.timestamp),blksize:4096,blocks:Math.ceil(node.size/4096)}},setattr:function(node,attr){if(attr.mode!==undefined){node.mode=attr.mode}if(attr.timestamp!==undefined){node.timestamp=attr.timestamp}},lookup:function(parent,name){throw new FS.ErrnoError(44)},mknod:function(parent,name,mode,dev){throw new FS.ErrnoError(63)},rename:function(oldNode,newDir,newName){throw new FS.ErrnoError(63)},unlink:function(parent,name){throw new FS.ErrnoError(63)},rmdir:function(parent,name){throw new FS.ErrnoError(63)},readdir:function(node){var entries=[\".\",\"..\"];for(var key in node.contents){if(!node.contents.hasOwnProperty(key)){continue}entries.push(key)}return entries},symlink:function(parent,newName,oldPath){throw new FS.ErrnoError(63)}},stream_ops:{read:function(stream,buffer,offset,length,position){if(position>=stream.node.size)return 0;var chunk=stream.node.contents.slice(position,position+length);var ab=WORKERFS.reader.readAsArrayBuffer(chunk);buffer.set(new Uint8Array(ab),offset);return chunk.size},write:function(stream,buffer,offset,length,position){throw new FS.ErrnoError(29)},llseek:function(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.size}}if(position<0){throw new FS.ErrnoError(28)}return position}}};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:\"/\",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,lookupPath:(path,opts={})=>{path=PATH_FS.resolve(path);if(!path)return{path:\"\",node:null};var defaults={follow_mount:true,recurse_count:0};opts=Object.assign(defaults,opts);if(opts.recurse_count>8){throw new FS.ErrnoError(32)}var parts=path.split(\"/\").filter(p=>!!p);var current=FS.root;var current_path=\"/\";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}current=FS.lookupNode(current,parts[i]);current_path=PATH.join2(current_path,parts[i]);if(FS.isMountpoint(current)){if(!islast||islast&&opts.follow_mount){current=current.mounted.root}}if(!islast||opts.follow){var count=0;while(FS.isLink(current.mode)){var link=FS.readlink(current_path);current_path=PATH_FS.resolve(PATH.dirname(current_path),link);var lookup=FS.lookupPath(current_path,{recurse_count:opts.recurse_count+1});current=lookup.node;if(count++>40){throw new FS.ErrnoError(32)}}}}return{path:current_path,node:current}},getPath:node=>{var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!==\"/\"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName:(parentid,name)=>{var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode:node=>{var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode:node=>{var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode:(parent,name)=>{var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode,parent)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode:(parent,name,mode,rdev)=>{var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode:node=>{FS.hashRemoveNode(node)},isRoot:node=>{return node===node.parent},isMountpoint:node=>{return!!node.mounted},isFile:mode=>{return(mode&61440)===32768},isDir:mode=>{return(mode&61440)===16384},isLink:mode=>{return(mode&61440)===40960},isChrdev:mode=>{return(mode&61440)===8192},isBlkdev:mode=>{return(mode&61440)===24576},isFIFO:mode=>{return(mode&61440)===4096},isSocket:mode=>{return(mode&49152)===49152},flagsToPermissionString:flag=>{var perms=[\"r\",\"w\",\"rw\"][flag&3];if(flag&512){perms+=\"w\"}return perms},nodePermissions:(node,perms)=>{if(FS.ignorePermissions){return 0}if(perms.includes(\"r\")&&!(node.mode&292)){return 2}else if(perms.includes(\"w\")&&!(node.mode&146)){return 2}else if(perms.includes(\"x\")&&!(node.mode&73)){return 2}return 0},mayLookup:dir=>{var errCode=FS.nodePermissions(dir,\"x\");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate:(dir,name)=>{try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,\"wx\")},mayDelete:(dir,name,isdir)=>{var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,\"wx\");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else{if(FS.isDir(node.mode)){return 31}}return 0},mayOpen:(node,flags)=>{if(!node){return 44}if(FS.isLink(node.mode)){return 32}else if(FS.isDir(node.mode)){if(FS.flagsToPermissionString(flags)!==\"r\"||flags&512){return 31}}return FS.nodePermissions(node,FS.flagsToPermissionString(flags))},MAX_OPEN_FDS:4096,nextfd:()=>{for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStream:fd=>FS.streams[fd],createStream:(stream,fd=-1)=>{if(!FS.FSStream){FS.FSStream=function(){this.shared={}};FS.FSStream.prototype={};Object.defineProperties(FS.FSStream.prototype,{object:{get:function(){return this.node},set:function(val){this.node=val}},isRead:{get:function(){return(this.flags&2097155)!==1}},isWrite:{get:function(){return(this.flags&2097155)!==0}},isAppend:{get:function(){return this.flags&1024}},flags:{get:function(){return this.shared.flags},set:function(val){this.shared.flags=val}},position:{get:function(){return this.shared.position},set:function(val){this.shared.position=val}}})}stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream:fd=>{FS.streams[fd]=null},chrdev_stream_ops:{open:stream=>{var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;if(stream.stream_ops.open){stream.stream_ops.open(stream)}},llseek:()=>{throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice:(dev,ops)=>{FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts:mount=>{var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push.apply(check,m.mounts)}return mounts},syncfs:(populate,callback)=>{if(typeof populate==\"function\"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}mounts.forEach(mount=>{if(!mount.type.syncfs){return done(null)}mount.type.syncfs(mount,populate,done)})},mount:(type,opts,mountpoint)=>{var root=mountpoint===\"/\";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type:type,opts:opts,mountpoint:mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount:mountpoint=>{var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);Object.keys(FS.nameTable).forEach(hash=>{var current=FS.nameTable[hash];while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}});node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup:(parent,name)=>{return parent.node_ops.lookup(parent,name)},mknod:(path,mode,dev)=>{var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name||name===\".\"||name===\"..\"){throw new FS.ErrnoError(28)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},create:(path,mode)=>{mode=mode!==undefined?mode:438;mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir:(path,mode)=>{mode=mode!==undefined?mode:511;mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree:(path,mode)=>{var dirs=path.split(\"/\");var d=\"\";for(var i=0;i<dirs.length;++i){if(!dirs[i])continue;d+=\"/\"+dirs[i];try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev:(path,mode,dev)=>{if(typeof dev==\"undefined\"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink:(oldpath,newpath)=>{if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename:(old_path,new_path)=>{var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!==\".\"){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!==\".\"){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,\"w\");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name)}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir:path=>{var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir:path=>{var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node.node_ops.readdir){throw new FS.ErrnoError(54)}return node.node_ops.readdir(node)},unlink:path=>{var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink:path=>{var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return PATH_FS.resolve(FS.getPath(link.parent),link.node_ops.readlink(link))},stat:(path,dontFollow)=>{var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;if(!node){throw new FS.ErrnoError(44)}if(!node.node_ops.getattr){throw new FS.ErrnoError(63)}return node.node_ops.getattr(node)},lstat:path=>{return FS.stat(path,true)},chmod:(path,mode,dontFollow)=>{var node;if(typeof path==\"string\"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}node.node_ops.setattr(node,{mode:mode&4095|node.mode&~4095,timestamp:Date.now()})},lchmod:(path,mode)=>{FS.chmod(path,mode,true)},fchmod:(fd,mode)=>{var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}FS.chmod(stream.node,mode)},chown:(path,uid,gid,dontFollow)=>{var node;if(typeof path==\"string\"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}node.node_ops.setattr(node,{timestamp:Date.now()})},lchown:(path,uid,gid)=>{FS.chown(path,uid,gid,true)},fchown:(fd,uid,gid)=>{var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}FS.chown(stream.node,uid,gid)},truncate:(path,len)=>{if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path==\"string\"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,\"w\");if(errCode){throw new FS.ErrnoError(errCode)}node.node_ops.setattr(node,{size:len,timestamp:Date.now()})},ftruncate:(fd,len)=>{var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.truncate(stream.node,len)},utime:(path,atime,mtime)=>{var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;node.node_ops.setattr(node,{timestamp:Math.max(atime,mtime)})},open:(path,flags,mode)=>{if(path===\"\"){throw new FS.ErrnoError(44)}flags=typeof flags==\"string\"?FS_modeStringToFlags(flags):flags;mode=typeof mode==\"undefined\"?438:mode;if(flags&64){mode=mode&4095|32768}else{mode=0}var node;if(typeof path==\"object\"){node=path}else{path=PATH.normalize(path);try{var lookup=FS.lookupPath(path,{follow:!(flags&131072)});node=lookup.node}catch(e){}}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else{node=FS.mknod(path,mode,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node:node,path:FS.getPath(node),flags:flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(Module[\"logReadFiles\"]&&!(flags&1)){if(!FS.readFiles)FS.readFiles={};if(!(path in FS.readFiles)){FS.readFiles[path]=1}}return stream},close:stream=>{if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed:stream=>{return stream.fd===null},llseek:(stream,offset,whence)=>{if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read:(stream,buffer,offset,length,position)=>{if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!=\"undefined\";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write:(stream,buffer,offset,length,position,canOwn)=>{if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!=\"undefined\";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},allocate:(stream,offset,length)=>{if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(offset<0||length<=0){throw new FS.ErrnoError(28)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(!FS.isFile(stream.node.mode)&&!FS.isDir(stream.node.mode)){throw new FS.ErrnoError(43)}if(!stream.stream_ops.allocate){throw new FS.ErrnoError(138)}stream.stream_ops.allocate(stream,offset,length)},mmap:(stream,length,position,prot,flags)=>{if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync:(stream,buffer,offset,length,mmapFlags)=>{if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},munmap:stream=>0,ioctl:(stream,cmd,arg)=>{if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile:(path,opts={})=>{opts.flags=opts.flags||0;opts.encoding=opts.encoding||\"binary\";if(opts.encoding!==\"utf8\"&&opts.encoding!==\"binary\"){throw new Error(`Invalid encoding type \"${opts.encoding}\"`)}var ret;var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding===\"utf8\"){ret=UTF8ArrayToString(buf,0)}else if(opts.encoding===\"binary\"){ret=buf}FS.close(stream);return ret},writeFile:(path,data,opts={})=>{opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);if(typeof data==\"string\"){var buf=new Uint8Array(lengthBytesUTF8(data)+1);var actualNumBytes=stringToUTF8Array(data,buf,0,buf.length);FS.write(stream,buf,0,actualNumBytes,undefined,opts.canOwn)}else if(ArrayBuffer.isView(data)){FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn)}else{throw new Error(\"Unsupported data type\")}FS.close(stream)},cwd:()=>FS.currentPath,chdir:path=>{var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,\"x\");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories:()=>{FS.mkdir(\"/tmp\");FS.mkdir(\"/home\");FS.mkdir(\"/home/web_user\")},createDefaultDevices:()=>{FS.mkdir(\"/dev\");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length});FS.mkdev(\"/dev/null\",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev(\"/dev/tty\",FS.makedev(5,0));FS.mkdev(\"/dev/tty1\",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomLeft=randomFill(randomBuffer).byteLength}return randomBuffer[--randomLeft]};FS.createDevice(\"/dev\",\"random\",randomByte);FS.createDevice(\"/dev\",\"urandom\",randomByte);FS.mkdir(\"/dev/shm\");FS.mkdir(\"/dev/shm/tmp\")},createSpecialDirectories:()=>{FS.mkdir(\"/proc\");var proc_self=FS.mkdir(\"/proc/self\");FS.mkdir(\"/proc/self/fd\");FS.mount({mount:()=>{var node=FS.createNode(proc_self,\"fd\",16384|511,73);node.node_ops={lookup:(parent,name)=>{var fd=+name;var stream=FS.getStream(fd);if(!stream)throw new FS.ErrnoError(8);var ret={parent:null,mount:{mountpoint:\"fake\"},node_ops:{readlink:()=>stream.path}};ret.parent=ret;return ret}};return node}},{},\"/proc/self/fd\")},createStandardStreams:()=>{if(Module[\"stdin\"]){FS.createDevice(\"/dev\",\"stdin\",Module[\"stdin\"])}else{FS.symlink(\"/dev/tty\",\"/dev/stdin\")}if(Module[\"stdout\"]){FS.createDevice(\"/dev\",\"stdout\",null,Module[\"stdout\"])}else{FS.symlink(\"/dev/tty\",\"/dev/stdout\")}if(Module[\"stderr\"]){FS.createDevice(\"/dev\",\"stderr\",null,Module[\"stderr\"])}else{FS.symlink(\"/dev/tty1\",\"/dev/stderr\")}var stdin=FS.open(\"/dev/stdin\",0);var stdout=FS.open(\"/dev/stdout\",1);var stderr=FS.open(\"/dev/stderr\",1)},ensureErrnoError:()=>{if(FS.ErrnoError)return;FS.ErrnoError=function ErrnoError(errno,node){this.name=\"ErrnoError\";this.node=node;this.setErrno=function(errno){this.errno=errno};this.setErrno(errno);this.message=\"FS error\"};FS.ErrnoError.prototype=new Error;FS.ErrnoError.prototype.constructor=FS.ErrnoError;[44].forEach(code=>{FS.genericErrors[code]=new FS.ErrnoError(code);FS.genericErrors[code].stack=\"<generic error, no stack>\"})},staticInit:()=>{FS.ensureErrnoError();FS.nameTable=new Array(4096);FS.mount(MEMFS,{},\"/\");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={\"MEMFS\":MEMFS,\"WORKERFS\":WORKERFS}},init:(input,output,error)=>{FS.init.initialized=true;FS.ensureErrnoError();Module[\"stdin\"]=input||Module[\"stdin\"];Module[\"stdout\"]=output||Module[\"stdout\"];Module[\"stderr\"]=error||Module[\"stderr\"];FS.createStandardStreams()},quit:()=>{FS.init.initialized=false;for(var i=0;i<FS.streams.length;i++){var stream=FS.streams[i];if(!stream){continue}FS.close(stream)}},findObject:(path,dontResolveLastLink)=>{var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath:(path,dontResolveLastLink)=>{try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path===\"/\"}catch(e){ret.error=e.errno}return ret},createPath:(parent,path,canRead,canWrite)=>{parent=typeof parent==\"string\"?parent:FS.getPath(parent);var parts=path.split(\"/\").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){}parent=current}return current},createFile:(parent,name,properties,canRead,canWrite)=>{var path=PATH.join2(typeof parent==\"string\"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile:(parent,name,data,canRead,canWrite,canOwn)=>{var path=name;if(parent){parent=typeof parent==\"string\"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){if(typeof data==\"string\"){var arr=new Array(data.length);for(var i=0,len=data.length;i<len;++i)arr[i]=data.charCodeAt(i);data=arr}FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}return node},createDevice:(parent,name,input,output)=>{var path=PATH.join2(typeof parent==\"string\"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);if(!FS.createDevice.major)FS.createDevice.major=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open:stream=>{stream.seekable=false},close:stream=>{if(output&&output.buffer&&output.buffer.length){output(10)}},read:(stream,buffer,offset,length,pos)=>{var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.timestamp=Date.now()}return bytesRead},write:(stream,buffer,offset,length,pos)=>{for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.timestamp=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile:obj=>{if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(typeof XMLHttpRequest!=\"undefined\"){throw new Error(\"Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.\")}else if(read_){try{obj.contents=intArrayFromString(read_(obj.url),true);obj.usedBytes=obj.contents.length}catch(e){throw new FS.ErrnoError(29)}}else{throw new Error(\"Cannot load without read() or XMLHttpRequest.\")}},createLazyFile:(parent,name,url,canRead,canWrite)=>{function LazyUint8Array(){this.lengthKnown=false;this.chunks=[]}LazyUint8Array.prototype.get=function LazyUint8Array_get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]};LazyUint8Array.prototype.setDataGetter=function LazyUint8Array_setDataGetter(getter){this.getter=getter};LazyUint8Array.prototype.cacheLength=function LazyUint8Array_cacheLength(){var xhr=new XMLHttpRequest;xhr.open(\"HEAD\",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error(\"Couldn't load \"+url+\". Status: \"+xhr.status);var datalength=Number(xhr.getResponseHeader(\"Content-length\"));var header;var hasByteServing=(header=xhr.getResponseHeader(\"Accept-Ranges\"))&&header===\"bytes\";var usesGzip=(header=xhr.getResponseHeader(\"Content-Encoding\"))&&header===\"gzip\";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)throw new Error(\"invalid range (\"+from+\", \"+to+\") or no bytes requested!\");if(to>datalength-1)throw new Error(\"only \"+datalength+\" bytes available! programmer error!\");var xhr=new XMLHttpRequest;xhr.open(\"GET\",url,false);if(datalength!==chunkSize)xhr.setRequestHeader(\"Range\",\"bytes=\"+from+\"-\"+to);xhr.responseType=\"arraybuffer\";if(xhr.overrideMimeType){xhr.overrideMimeType(\"text/plain; charset=x-user-defined\")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error(\"Couldn't load \"+url+\". Status: \"+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||\"\",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]==\"undefined\"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]==\"undefined\")throw new Error(\"doXHR failed!\");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out(\"LazyFiles on gzip forces download of the whole file when length is accessed\")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true};if(typeof XMLHttpRequest!=\"undefined\"){if(!ENVIRONMENT_IS_WORKER)throw\"Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc\";var lazyArray=new LazyUint8Array;Object.defineProperties(lazyArray,{length:{get:function(){if(!this.lengthKnown){this.cacheLength()}return this._length}},chunkSize:{get:function(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}});var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url:url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};var keys=Object.keys(node.stream_ops);keys.forEach(key=>{var fn=node.stream_ops[key];stream_ops[key]=function forceLoadLazyFile(){FS.forceLoadFile(node);return fn.apply(null,arguments)}});function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr:ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var SYSCALLS={DEFAULT_POLLMASK:5,calculateAt:function(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return PATH.join2(dir,path)},doStat:function(func,path,buf){try{var stat=func(path)}catch(e){if(e&&e.node&&PATH.normalize(path)!==PATH.normalize(FS.getPath(e.node))){return-54}throw e}HEAP32[buf>>2]=stat.dev;HEAP32[buf+8>>2]=stat.ino;HEAP32[buf+12>>2]=stat.mode;HEAPU32[buf+16>>2]=stat.nlink;HEAP32[buf+20>>2]=stat.uid;HEAP32[buf+24>>2]=stat.gid;HEAP32[buf+28>>2]=stat.rdev;HEAP64[buf+40>>3]=BigInt(stat.size);HEAP32[buf+48>>2]=4096;HEAP32[buf+52>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();HEAP64[buf+56>>3]=BigInt(Math.floor(atime/1e3));HEAPU32[buf+64>>2]=atime%1e3*1e3;HEAP64[buf+72>>3]=BigInt(Math.floor(mtime/1e3));HEAPU32[buf+80>>2]=mtime%1e3*1e3;HEAP64[buf+88>>3]=BigInt(Math.floor(ctime/1e3));HEAPU32[buf+96>>2]=ctime%1e3*1e3;HEAP64[buf+104>>3]=BigInt(stat.ino);return 0},doMsync:function(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},varargs:undefined,get:function(){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret},getStr:function(ptr){var ret=UTF8ToString(ptr);return ret},getStreamFromFD:function(fd){var stream=FS.getStream(fd);if(!stream)throw new FS.ErrnoError(8);return stream}};function ___syscall__newselect(nfds,readfds,writefds,exceptfds,timeout){try{var total=0;var srcReadLow=readfds?HEAP32[readfds>>2]:0,srcReadHigh=readfds?HEAP32[readfds+4>>2]:0;var srcWriteLow=writefds?HEAP32[writefds>>2]:0,srcWriteHigh=writefds?HEAP32[writefds+4>>2]:0;var srcExceptLow=exceptfds?HEAP32[exceptfds>>2]:0,srcExceptHigh=exceptfds?HEAP32[exceptfds+4>>2]:0;var dstReadLow=0,dstReadHigh=0;var dstWriteLow=0,dstWriteHigh=0;var dstExceptLow=0,dstExceptHigh=0;var allLow=(readfds?HEAP32[readfds>>2]:0)|(writefds?HEAP32[writefds>>2]:0)|(exceptfds?HEAP32[exceptfds>>2]:0);var allHigh=(readfds?HEAP32[readfds+4>>2]:0)|(writefds?HEAP32[writefds+4>>2]:0)|(exceptfds?HEAP32[exceptfds+4>>2]:0);var check=function(fd,low,high,val){return fd<32?low&val:high&val};for(var fd=0;fd<nfds;fd++){var mask=1<<fd%32;if(!check(fd,allLow,allHigh,mask)){continue}var stream=SYSCALLS.getStreamFromFD(fd);var flags=SYSCALLS.DEFAULT_POLLMASK;if(stream.stream_ops.poll){flags=stream.stream_ops.poll(stream)}if(flags&1&&check(fd,srcReadLow,srcReadHigh,mask)){fd<32?dstReadLow=dstReadLow|mask:dstReadHigh=dstReadHigh|mask;total++}if(flags&4&&check(fd,srcWriteLow,srcWriteHigh,mask)){fd<32?dstWriteLow=dstWriteLow|mask:dstWriteHigh=dstWriteHigh|mask;total++}if(flags&2&&check(fd,srcExceptLow,srcExceptHigh,mask)){fd<32?dstExceptLow=dstExceptLow|mask:dstExceptHigh=dstExceptHigh|mask;total++}}if(readfds){HEAP32[readfds>>2]=dstReadLow;HEAP32[readfds+4>>2]=dstReadHigh}if(writefds){HEAP32[writefds>>2]=dstWriteLow;HEAP32[writefds+4>>2]=dstWriteHigh}if(exceptfds){HEAP32[exceptfds>>2]=dstExceptLow;HEAP32[exceptfds+4>>2]=dstExceptHigh}return total}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}var SOCKFS={mount:function(mount){Module[\"websocket\"]=Module[\"websocket\"]&&\"object\"===typeof Module[\"websocket\"]?Module[\"websocket\"]:{};Module[\"websocket\"]._callbacks={};Module[\"websocket\"][\"on\"]=function(event,callback){if(\"function\"===typeof callback){this._callbacks[event]=callback}return this};Module[\"websocket\"].emit=function(event,param){if(\"function\"===typeof this._callbacks[event]){this._callbacks[event].call(this,param)}};return FS.createNode(null,\"/\",16384|511,0)},createSocket:function(family,type,protocol){type&=~526336;var streaming=type==1;if(streaming&&protocol&&protocol!=6){throw new FS.ErrnoError(66)}var sock={family:family,type:type,protocol:protocol,server:null,error:null,peers:{},pending:[],recv_queue:[],sock_ops:SOCKFS.websocket_sock_ops};var name=SOCKFS.nextname();var node=FS.createNode(SOCKFS.root,name,49152,0);node.sock=sock;var stream=FS.createStream({path:name,node:node,flags:2,seekable:false,stream_ops:SOCKFS.stream_ops});sock.stream=stream;return sock},getSocket:function(fd){var stream=FS.getStream(fd);if(!stream||!FS.isSocket(stream.node.mode)){return null}return stream.node.sock},stream_ops:{poll:function(stream){var sock=stream.node.sock;return sock.sock_ops.poll(sock)},ioctl:function(stream,request,varargs){var sock=stream.node.sock;return sock.sock_ops.ioctl(sock,request,varargs)},read:function(stream,buffer,offset,length,position){var sock=stream.node.sock;var msg=sock.sock_ops.recvmsg(sock,length);if(!msg){return 0}buffer.set(msg.buffer,offset);return msg.buffer.length},write:function(stream,buffer,offset,length,position){var sock=stream.node.sock;return sock.sock_ops.sendmsg(sock,buffer,offset,length)},close:function(stream){var sock=stream.node.sock;sock.sock_ops.close(sock)}},nextname:function(){if(!SOCKFS.nextname.current){SOCKFS.nextname.current=0}return\"socket[\"+SOCKFS.nextname.current+++\"]\"},websocket_sock_ops:{createPeer:function(sock,addr,port){var ws;if(typeof addr==\"object\"){ws=addr;addr=null;port=null}if(ws){if(ws._socket){addr=ws._socket.remoteAddress;port=ws._socket.remotePort}else{var result=/ws[s]?:\\/\\/([^:]+):(\\d+)/.exec(ws.url);if(!result){throw new Error(\"WebSocket URL must be in the format ws(s)://address:port\")}addr=result[1];port=parseInt(result[2],10)}}else{try{var runtimeConfig=Module[\"websocket\"]&&\"object\"===typeof Module[\"websocket\"];var url=\"ws:#\".replace(\"#\",\"//\");if(runtimeConfig){if(\"string\"===typeof Module[\"websocket\"][\"url\"]){url=Module[\"websocket\"][\"url\"]}}if(url===\"ws://\"||url===\"wss://\"){var parts=addr.split(\"/\");url=url+parts[0]+\":\"+port+\"/\"+parts.slice(1).join(\"/\")}var subProtocols=\"binary\";if(runtimeConfig){if(\"string\"===typeof Module[\"websocket\"][\"subprotocol\"]){subProtocols=Module[\"websocket\"][\"subprotocol\"]}}var opts=undefined;if(subProtocols!==\"null\"){subProtocols=subProtocols.replace(/^ +| +$/g,\"\").split(/ *, */);opts=subProtocols}if(runtimeConfig&&null===Module[\"websocket\"][\"subprotocol\"]){subProtocols=\"null\";opts=undefined}var WebSocketConstructor;if(ENVIRONMENT_IS_NODE){WebSocketConstructor=require(\"ws\")}else{WebSocketConstructor=WebSocket}ws=new WebSocketConstructor(url,opts);ws.binaryType=\"arraybuffer\"}catch(e){throw new FS.ErrnoError(23)}}var peer={addr:addr,port:port,socket:ws,dgram_send_queue:[]};SOCKFS.websocket_sock_ops.addPeer(sock,peer);SOCKFS.websocket_sock_ops.handlePeerEvents(sock,peer);if(sock.type===2&&typeof sock.sport!=\"undefined\"){peer.dgram_send_queue.push(new Uint8Array([255,255,255,255,\"p\".charCodeAt(0),\"o\".charCodeAt(0),\"r\".charCodeAt(0),\"t\".charCodeAt(0),(sock.sport&65280)>>8,sock.sport&255]))}return peer},getPeer:function(sock,addr,port){return sock.peers[addr+\":\"+port]},addPeer:function(sock,peer){sock.peers[peer.addr+\":\"+peer.port]=peer},removePeer:function(sock,peer){delete sock.peers[peer.addr+\":\"+peer.port]},handlePeerEvents:function(sock,peer){var first=true;var handleOpen=function(){Module[\"websocket\"].emit(\"open\",sock.stream.fd);try{var queued=peer.dgram_send_queue.shift();while(queued){peer.socket.send(queued);queued=peer.dgram_send_queue.shift()}}catch(e){peer.socket.close()}};function handleMessage(data){if(typeof data==\"string\"){var encoder=new TextEncoder;data=encoder.encode(data)}else{assert(data.byteLength!==undefined);if(data.byteLength==0){return}data=new Uint8Array(data)}var wasfirst=first;first=false;if(wasfirst&&data.length===10&&data[0]===255&&data[1]===255&&data[2]===255&&data[3]===255&&data[4]===\"p\".charCodeAt(0)&&data[5]===\"o\".charCodeAt(0)&&data[6]===\"r\".charCodeAt(0)&&data[7]===\"t\".charCodeAt(0)){var newport=data[8]<<8|data[9];SOCKFS.websocket_sock_ops.removePeer(sock,peer);peer.port=newport;SOCKFS.websocket_sock_ops.addPeer(sock,peer);return}sock.recv_queue.push({addr:peer.addr,port:peer.port,data:data});Module[\"websocket\"].emit(\"message\",sock.stream.fd)}if(ENVIRONMENT_IS_NODE){peer.socket.on(\"open\",handleOpen);peer.socket.on(\"message\",function(data,isBinary){if(!isBinary){return}handleMessage(new Uint8Array(data).buffer)});peer.socket.on(\"close\",function(){Module[\"websocket\"].emit(\"close\",sock.stream.fd)});peer.socket.on(\"error\",function(error){sock.error=14;Module[\"websocket\"].emit(\"error\",[sock.stream.fd,sock.error,\"ECONNREFUSED: Connection refused\"])})}else{peer.socket.onopen=handleOpen;peer.socket.onclose=function(){Module[\"websocket\"].emit(\"close\",sock.stream.fd)};peer.socket.onmessage=function peer_socket_onmessage(event){handleMessage(event.data)};peer.socket.onerror=function(error){sock.error=14;Module[\"websocket\"].emit(\"error\",[sock.stream.fd,sock.error,\"ECONNREFUSED: Connection refused\"])}}},poll:function(sock){if(sock.type===1&&sock.server){return sock.pending.length?64|1:0}var mask=0;var dest=sock.type===1?SOCKFS.websocket_sock_ops.getPeer(sock,sock.daddr,sock.dport):null;if(sock.recv_queue.length||!dest||dest&&dest.socket.readyState===dest.socket.CLOSING||dest&&dest.socket.readyState===dest.socket.CLOSED){mask|=64|1}if(!dest||dest&&dest.socket.readyState===dest.socket.OPEN){mask|=4}if(dest&&dest.socket.readyState===dest.socket.CLOSING||dest&&dest.socket.readyState===dest.socket.CLOSED){mask|=16}return mask},ioctl:function(sock,request,arg){switch(request){case 21531:var bytes=0;if(sock.recv_queue.length){bytes=sock.recv_queue[0].data.length}HEAP32[arg>>2]=bytes;return 0;default:return 28}},close:function(sock){if(sock.server){try{sock.server.close()}catch(e){}sock.server=null}var peers=Object.keys(sock.peers);for(var i=0;i<peers.length;i++){var peer=sock.peers[peers[i]];try{peer.socket.close()}catch(e){}SOCKFS.websocket_sock_ops.removePeer(sock,peer)}return 0},bind:function(sock,addr,port){if(typeof sock.saddr!=\"undefined\"||typeof sock.sport!=\"undefined\"){throw new FS.ErrnoError(28)}sock.saddr=addr;sock.sport=port;if(sock.type===2){if(sock.server){sock.server.close();sock.server=null}try{sock.sock_ops.listen(sock,0)}catch(e){if(!(e.name===\"ErrnoError\"))throw e;if(e.errno!==138)throw e}}},connect:function(sock,addr,port){if(sock.server){throw new FS.ErrnoError(138)}if(typeof sock.daddr!=\"undefined\"&&typeof sock.dport!=\"undefined\"){var dest=SOCKFS.websocket_sock_ops.getPeer(sock,sock.daddr,sock.dport);if(dest){if(dest.socket.readyState===dest.socket.CONNECTING){throw new FS.ErrnoError(7)}else{throw new FS.ErrnoError(30)}}}var peer=SOCKFS.websocket_sock_ops.createPeer(sock,addr,port);sock.daddr=peer.addr;sock.dport=peer.port;throw new FS.ErrnoError(26)},listen:function(sock,backlog){if(!ENVIRONMENT_IS_NODE){throw new FS.ErrnoError(138)}if(sock.server){throw new FS.ErrnoError(28)}var WebSocketServer=require(\"ws\").Server;var host=sock.saddr;sock.server=new WebSocketServer({host:host,port:sock.sport});Module[\"websocket\"].emit(\"listen\",sock.stream.fd);sock.server.on(\"connection\",function(ws){if(sock.type===1){var newsock=SOCKFS.createSocket(sock.family,sock.type,sock.protocol);var peer=SOCKFS.websocket_sock_ops.createPeer(newsock,ws);newsock.daddr=peer.addr;newsock.dport=peer.port;sock.pending.push(newsock);Module[\"websocket\"].emit(\"connection\",newsock.stream.fd)}else{SOCKFS.websocket_sock_ops.createPeer(sock,ws);Module[\"websocket\"].emit(\"connection\",sock.stream.fd)}});sock.server.on(\"close\",function(){Module[\"websocket\"].emit(\"close\",sock.stream.fd);sock.server=null});sock.server.on(\"error\",function(error){sock.error=23;Module[\"websocket\"].emit(\"error\",[sock.stream.fd,sock.error,\"EHOSTUNREACH: Host is unreachable\"])})},accept:function(listensock){if(!listensock.server||!listensock.pending.length){throw new FS.ErrnoError(28)}var newsock=listensock.pending.shift();newsock.stream.flags=listensock.stream.flags;return newsock},getname:function(sock,peer){var addr,port;if(peer){if(sock.daddr===undefined||sock.dport===undefined){throw new FS.ErrnoError(53)}addr=sock.daddr;port=sock.dport}else{addr=sock.saddr||0;port=sock.sport||0}return{addr:addr,port:port}},sendmsg:function(sock,buffer,offset,length,addr,port){if(sock.type===2){if(addr===undefined||port===undefined){addr=sock.daddr;port=sock.dport}if(addr===undefined||port===undefined){throw new FS.ErrnoError(17)}}else{addr=sock.daddr;port=sock.dport}var dest=SOCKFS.websocket_sock_ops.getPeer(sock,addr,port);if(sock.type===1){if(!dest||dest.socket.readyState===dest.socket.CLOSING||dest.socket.readyState===dest.socket.CLOSED){throw new FS.ErrnoError(53)}else if(dest.socket.readyState===dest.socket.CONNECTING){throw new FS.ErrnoError(6)}}if(ArrayBuffer.isView(buffer)){offset+=buffer.byteOffset;buffer=buffer.buffer}var data;data=buffer.slice(offset,offset+length);if(sock.type===2){if(!dest||dest.socket.readyState!==dest.socket.OPEN){if(!dest||dest.socket.readyState===dest.socket.CLOSING||dest.socket.readyState===dest.socket.CLOSED){dest=SOCKFS.websocket_sock_ops.createPeer(sock,addr,port)}dest.dgram_send_queue.push(data);return length}}try{dest.socket.send(data);return length}catch(e){throw new FS.ErrnoError(28)}},recvmsg:function(sock,length){if(sock.type===1&&sock.server){throw new FS.ErrnoError(53)}var queued=sock.recv_queue.shift();if(!queued){if(sock.type===1){var dest=SOCKFS.websocket_sock_ops.getPeer(sock,sock.daddr,sock.dport);if(!dest){throw new FS.ErrnoError(53)}if(dest.socket.readyState===dest.socket.CLOSING||dest.socket.readyState===dest.socket.CLOSED){return null}throw new FS.ErrnoError(6)}throw new FS.ErrnoError(6)}var queuedLength=queued.data.byteLength||queued.data.length;var queuedOffset=queued.data.byteOffset||0;var queuedBuffer=queued.data.buffer||queued.data;var bytesRead=Math.min(length,queuedLength);var res={buffer:new Uint8Array(queuedBuffer,queuedOffset,bytesRead),addr:queued.addr,port:queued.port};if(sock.type===1&&bytesRead<queuedLength){var bytesRemaining=queuedLength-bytesRead;queued.data=new Uint8Array(queuedBuffer,queuedOffset+bytesRead,bytesRemaining);sock.recv_queue.unshift(queued)}return res}}};function getSocketFromFD(fd){var socket=SOCKFS.getSocket(fd);if(!socket)throw new FS.ErrnoError(8);return socket}function setErrNo(value){HEAP32[___errno_location()>>2]=value;return value}function inetPton4(str){var b=str.split(\".\");for(var i=0;i<4;i++){var tmp=Number(b[i]);if(isNaN(tmp))return null;b[i]=tmp}return(b[0]|b[1]<<8|b[2]<<16|b[3]<<24)>>>0}function jstoi_q(str){return parseInt(str)}function inetPton6(str){var words;var w,offset,z;var valid6regx=/^((?=.*::)(?!.*::.+::)(::)?([\\dA-F]{1,4}:(:|\\b)|){5}|([\\dA-F]{1,4}:){6})((([\\dA-F]{1,4}((?!\\3)::|:\\b|$))|(?!\\2\\3)){2}|(((2[0-4]|1\\d|[1-9])?\\d|25[0-5])\\.?\\b){4})$/i;var parts=[];if(!valid6regx.test(str)){return null}if(str===\"::\"){return[0,0,0,0,0,0,0,0]}if(str.startsWith(\"::\")){str=str.replace(\"::\",\"Z:\")}else{str=str.replace(\"::\",\":Z:\")}if(str.indexOf(\".\")>0){str=str.replace(new RegExp(\"[.]\",\"g\"),\":\");words=str.split(\":\");words[words.length-4]=jstoi_q(words[words.length-4])+jstoi_q(words[words.length-3])*256;words[words.length-3]=jstoi_q(words[words.length-2])+jstoi_q(words[words.length-1])*256;words=words.slice(0,words.length-2)}else{words=str.split(\":\")}offset=0;z=0;for(w=0;w<words.length;w++){if(typeof words[w]==\"string\"){if(words[w]===\"Z\"){for(z=0;z<8-words.length+1;z++){parts[w+z]=0}offset=z-1}else{parts[w+offset]=_htons(parseInt(words[w],16))}}else{parts[w+offset]=words[w]}}return[parts[1]<<16|parts[0],parts[3]<<16|parts[2],parts[5]<<16|parts[4],parts[7]<<16|parts[6]]}function writeSockaddr(sa,family,addr,port,addrlen){switch(family){case 2:addr=inetPton4(addr);zeroMemory(sa,16);if(addrlen){HEAP32[addrlen>>2]=16}HEAP16[sa>>1]=family;HEAP32[sa+4>>2]=addr;HEAP16[sa+2>>1]=_htons(port);break;case 10:addr=inetPton6(addr);zeroMemory(sa,28);if(addrlen){HEAP32[addrlen>>2]=28}HEAP32[sa>>2]=family;HEAP32[sa+8>>2]=addr[0];HEAP32[sa+12>>2]=addr[1];HEAP32[sa+16>>2]=addr[2];HEAP32[sa+20>>2]=addr[3];HEAP16[sa+2>>1]=_htons(port);break;default:return 5}return 0}var DNS={address_map:{id:1,addrs:{},names:{}},lookup_name:function(name){var res=inetPton4(name);if(res!==null){return name}res=inetPton6(name);if(res!==null){return name}var addr;if(DNS.address_map.addrs[name]){addr=DNS.address_map.addrs[name]}else{var id=DNS.address_map.id++;assert(id<65535,\"exceeded max address mappings of 65535\");addr=\"172.29.\"+(id&255)+\".\"+(id&65280);DNS.address_map.names[addr]=name;DNS.address_map.addrs[name]=addr}return addr},lookup_addr:function(addr){if(DNS.address_map.names[addr]){return DNS.address_map.names[addr]}return null}};function ___syscall_accept4(fd,addr,addrlen,flags,d1,d2){try{var sock=getSocketFromFD(fd);var newsock=sock.sock_ops.accept(sock);if(addr){var errno=writeSockaddr(addr,newsock.family,DNS.lookup_name(newsock.daddr),newsock.dport,addrlen)}return newsock.stream.fd}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function inetNtop4(addr){return(addr&255)+\".\"+(addr>>8&255)+\".\"+(addr>>16&255)+\".\"+(addr>>24&255)}function inetNtop6(ints){var str=\"\";var word=0;var longest=0;var lastzero=0;var zstart=0;var len=0;var i=0;var parts=[ints[0]&65535,ints[0]>>16,ints[1]&65535,ints[1]>>16,ints[2]&65535,ints[2]>>16,ints[3]&65535,ints[3]>>16];var hasipv4=true;var v4part=\"\";for(i=0;i<5;i++){if(parts[i]!==0){hasipv4=false;break}}if(hasipv4){v4part=inetNtop4(parts[6]|parts[7]<<16);if(parts[5]===-1){str=\"::ffff:\";str+=v4part;return str}if(parts[5]===0){str=\"::\";if(v4part===\"0.0.0.0\")v4part=\"\";if(v4part===\"0.0.0.1\")v4part=\"1\";str+=v4part;return str}}for(word=0;word<8;word++){if(parts[word]===0){if(word-lastzero>1){len=0}lastzero=word;len++}if(len>longest){longest=len;zstart=word-longest+1}}for(word=0;word<8;word++){if(longest>1){if(parts[word]===0&&word>=zstart&&word<zstart+longest){if(word===zstart){str+=\":\";if(zstart===0)str+=\":\"}continue}}str+=Number(_ntohs(parts[word]&65535)).toString(16);str+=word<7?\":\":\"\"}return str}function readSockaddr(sa,salen){var family=HEAP16[sa>>1];var port=_ntohs(HEAPU16[sa+2>>1]);var addr;switch(family){case 2:if(salen!==16){return{errno:28}}addr=HEAP32[sa+4>>2];addr=inetNtop4(addr);break;case 10:if(salen!==28){return{errno:28}}addr=[HEAP32[sa+8>>2],HEAP32[sa+12>>2],HEAP32[sa+16>>2],HEAP32[sa+20>>2]];addr=inetNtop6(addr);break;default:return{errno:5}}return{family:family,addr:addr,port:port}}function getSocketAddress(addrp,addrlen,allowNull){if(allowNull&&addrp===0)return null;var info=readSockaddr(addrp,addrlen);if(info.errno)throw new FS.ErrnoError(info.errno);info.addr=DNS.lookup_addr(info.addr)||info.addr;return info}function ___syscall_bind(fd,addr,addrlen,d1,d2,d3){try{var sock=getSocketFromFD(fd);var info=getSocketAddress(addr,addrlen);sock.sock_ops.bind(sock,info.addr,info.port);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_connect(fd,addr,addrlen,d1,d2,d3){try{var sock=getSocketFromFD(fd);var info=getSocketAddress(addr,addrlen);sock.sock_ops.connect(sock,info.addr,info.port);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_faccessat(dirfd,path,amode,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(amode&~7){return-28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return-44}var perms=\"\";if(amode&4)perms+=\"r\";if(amode&2)perms+=\"w\";if(amode&1)perms+=\"x\";if(perms&&FS.nodePermissions(node,perms)){return-2}return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=SYSCALLS.get();if(arg<0){return-28}var newStream;newStream=FS.createStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=SYSCALLS.get();stream.flags|=arg;return 0}case 5:{var arg=SYSCALLS.get();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 6:case 7:return 0;case 16:case 8:return-28;case 9:setErrNo(28);return-1;default:{return-28}}}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){try{var stream=SYSCALLS.getStreamFromFD(fd);return SYSCALLS.doStat(FS.stat,stream.path,buf)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function ___syscall_getdents64(fd,dirp,count){try{var stream=SYSCALLS.getStreamFromFD(fd);if(!stream.getdents){stream.getdents=FS.readdir(stream.path)}var struct_size=280;var pos=0;var off=FS.llseek(stream,0,1);var idx=Math.floor(off/struct_size);while(idx<stream.getdents.length&&pos+struct_size<=count){var id;var type;var name=stream.getdents[idx];if(name===\".\"){id=stream.node.id;type=4}else if(name===\"..\"){var lookup=FS.lookupPath(stream.path,{parent:true});id=lookup.node.id;type=4}else{var child=FS.lookupNode(stream.node,name);id=child.id;type=FS.isChrdev(child.mode)?2:FS.isDir(child.mode)?4:FS.isLink(child.mode)?10:8}HEAP64[dirp+pos>>3]=BigInt(id);HEAP64[dirp+pos+8>>3]=BigInt((idx+1)*struct_size);HEAP16[dirp+pos+16>>1]=280;HEAP8[dirp+pos+18>>0]=type;stringToUTF8(name,dirp+pos+19,256);pos+=struct_size;idx+=1}FS.llseek(stream,idx*struct_size,0);return pos}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_getpeername(fd,addr,addrlen,d1,d2,d3){try{var sock=getSocketFromFD(fd);if(!sock.daddr){return-53}var errno=writeSockaddr(addr,sock.family,DNS.lookup_name(sock.daddr),sock.dport,addrlen);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_getsockname(fd,addr,addrlen,d1,d2,d3){try{var sock=getSocketFromFD(fd);var errno=writeSockaddr(addr,sock.family,DNS.lookup_name(sock.saddr||\"0.0.0.0\"),sock.sport,addrlen);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_getsockopt(fd,level,optname,optval,optlen,d1){try{var sock=getSocketFromFD(fd);if(level===1){if(optname===4){HEAP32[optval>>2]=sock.error;HEAP32[optlen>>2]=4;sock.error=null;return 0}}return-50}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_ioctl(fd,op,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(op){case 21509:case 21505:{if(!stream.tty)return-59;return 0}case 21510:case 21511:case 21512:case 21506:case 21507:case 21508:{if(!stream.tty)return-59;return 0}case 21519:{if(!stream.tty)return-59;var argp=SYSCALLS.get();HEAP32[argp>>2]=0;return 0}case 21520:{if(!stream.tty)return-59;return-28}case 21531:{var argp=SYSCALLS.get();return FS.ioctl(stream,op,argp)}case 21523:{if(!stream.tty)return-59;return 0}case 21524:{if(!stream.tty)return-59;return 0}default:return-28}}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_listen(fd,backlog){try{var sock=getSocketFromFD(fd);sock.sock_ops.listen(sock,backlog);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.doStat(FS.lstat,path,buf)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_mkdirat(dirfd,path,mode){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);path=PATH.normalize(path);if(path[path.length-1]===\"/\")path=path.substr(0,path.length-1);FS.mkdir(path,mode,0);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.doStat(nofollow?FS.lstat:FS.stat,path,buf)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?SYSCALLS.get():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_poll(fds,nfds,timeout){try{var nonzero=0;for(var i=0;i<nfds;i++){var pollfd=fds+8*i;var fd=HEAP32[pollfd>>2];var events=HEAP16[pollfd+4>>1];var mask=32;var stream=FS.getStream(fd);if(stream){mask=SYSCALLS.DEFAULT_POLLMASK;if(stream.stream_ops.poll){mask=stream.stream_ops.poll(stream)}}mask&=events|8|16;if(mask)nonzero++;HEAP16[pollfd+6>>1]=mask}return nonzero}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_recvfrom(fd,buf,len,flags,addr,addrlen){try{var sock=getSocketFromFD(fd);var msg=sock.sock_ops.recvmsg(sock,len);if(!msg)return 0;if(addr){var errno=writeSockaddr(addr,sock.family,DNS.lookup_name(msg.addr),msg.port,addrlen)}HEAPU8.set(msg.buffer,buf);return msg.buffer.byteLength}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_renameat(olddirfd,oldpath,newdirfd,newpath){try{oldpath=SYSCALLS.getStr(oldpath);newpath=SYSCALLS.getStr(newpath);oldpath=SYSCALLS.calculateAt(olddirfd,oldpath);newpath=SYSCALLS.calculateAt(newdirfd,newpath);FS.rename(oldpath,newpath);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_rmdir(path){try{path=SYSCALLS.getStr(path);FS.rmdir(path);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_sendto(fd,message,length,flags,addr,addr_len){try{var sock=getSocketFromFD(fd);var dest=getSocketAddress(addr,addr_len,true);if(!dest){return FS.write(sock.stream,HEAP8,message,length)}return sock.sock_ops.sendmsg(sock,HEAP8,message,length,dest.addr,dest.port)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_socket(domain,type,protocol){try{var sock=SOCKFS.createSocket(domain,type,protocol);return sock.stream.fd}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.doStat(FS.stat,path,buf)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function ___syscall_unlinkat(dirfd,path,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(flags===0){FS.unlink(path)}else if(flags===512){FS.rmdir(path)}else{abort(\"Invalid flags passed to unlinkat\")}return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}var nowIsMonotonic=true;function __emscripten_get_now_is_monotonic(){return nowIsMonotonic}function __emscripten_throw_longjmp(){throw Infinity}function readI53FromI64(ptr){return HEAPU32[ptr>>2]+HEAP32[ptr+4>>2]*4294967296}function __gmtime_js(time,tmPtr){var date=new Date(readI53FromI64(time)*1e3);HEAP32[tmPtr>>2]=date.getUTCSeconds();HEAP32[tmPtr+4>>2]=date.getUTCMinutes();HEAP32[tmPtr+8>>2]=date.getUTCHours();HEAP32[tmPtr+12>>2]=date.getUTCDate();HEAP32[tmPtr+16>>2]=date.getUTCMonth();HEAP32[tmPtr+20>>2]=date.getUTCFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getUTCDay();var start=Date.UTC(date.getUTCFullYear(),0,1,0,0,0,0);var yday=(date.getTime()-start)/(1e3*60*60*24)|0;HEAP32[tmPtr+28>>2]=yday}function isLeapYear(year){return year%4===0&&(year%100!==0||year%400===0)}var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];function ydayFromDate(date){var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday}function __localtime_js(time,tmPtr){var date=new Date(readI53FromI64(time)*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst}function __mktime_js(tmPtr){var date=new Date(HEAP32[tmPtr+20>>2]+1900,HEAP32[tmPtr+16>>2],HEAP32[tmPtr+12>>2],HEAP32[tmPtr+8>>2],HEAP32[tmPtr+4>>2],HEAP32[tmPtr>>2],0);var dst=HEAP32[tmPtr+32>>2];var guessedOffset=date.getTimezoneOffset();var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dstOffset=Math.min(winterOffset,summerOffset);if(dst<0){HEAP32[tmPtr+32>>2]=Number(summerOffset!=winterOffset&&dstOffset==guessedOffset)}else if(dst>0!=(dstOffset==guessedOffset)){var nonDstOffset=Math.max(winterOffset,summerOffset);var trueOffset=dst>0?dstOffset:nonDstOffset;date.setTime(date.getTime()+(trueOffset-guessedOffset)*6e4)}HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getYear();return date.getTime()/1e3|0}function __mmap_js(len,prot,flags,fd,off,allocated,addr){try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,off,prot,flags);var ptr=res.ptr;HEAP32[allocated>>2]=res.allocated;HEAPU32[addr>>2]=ptr;return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset){try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}FS.munmap(stream)}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return-e.errno}}function stringToNewUTF8(str){var size=lengthBytesUTF8(str)+1;var ret=_malloc(size);if(ret)stringToUTF8(str,ret,size);return ret}function __tzset_js(timezone,daylight,tzname){var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);function extractZone(date){var match=date.toTimeString().match(/\\(([A-Za-z ]+)\\)$/);return match?match[1]:\"GMT\"}var winterName=extractZone(winter);var summerName=extractZone(summer);var winterNamePtr=stringToNewUTF8(winterName);var summerNamePtr=stringToNewUTF8(summerName);if(summerOffset<winterOffset){HEAPU32[tzname>>2]=winterNamePtr;HEAPU32[tzname+4>>2]=summerNamePtr}else{HEAPU32[tzname>>2]=summerNamePtr;HEAPU32[tzname+4>>2]=winterNamePtr}}function _abort(){abort(\"\")}Module[\"_abort\"]=_abort;function _dlopen(handle){abort(dlopenMissingError)}var readEmAsmArgsArray=[];function readEmAsmArgs(sigPtr,buf){readEmAsmArgsArray.length=0;var ch;buf>>=2;while(ch=HEAPU8[sigPtr++]){buf+=ch!=105&buf;readEmAsmArgsArray.push(ch==105?HEAP32[buf]:(ch==106?HEAP64:HEAPF64)[buf++>>1]);++buf}return readEmAsmArgsArray}function runEmAsmFunction(code,sigPtr,argbuf){var args=readEmAsmArgs(sigPtr,argbuf);return ASM_CONSTS[code].apply(null,args)}function _emscripten_asm_const_int(code,sigPtr,argbuf){return runEmAsmFunction(code,sigPtr,argbuf)}function _emscripten_date_now(){return Date.now()}function getHeapMax(){return 2147483648}function _emscripten_get_heap_max(){return getHeapMax()}var _emscripten_get_now;if(ENVIRONMENT_IS_NODE){global.performance=require(\"perf_hooks\").performance}_emscripten_get_now=()=>performance.now();function _emscripten_memcpy_big(dest,src,num){HEAPU8.copyWithin(dest,src,src+num)}function emscripten_realloc_buffer(size){var b=wasmMemory.buffer;try{wasmMemory.grow(size-b.byteLength+65535>>>16);updateMemoryViews();return 1}catch(e){}}function _emscripten_resize_heap(requestedSize){var oldSize=HEAPU8.length;requestedSize=requestedSize>>>0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}var alignUp=(x,multiple)=>x+(multiple-x%multiple)%multiple;for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignUp(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=emscripten_realloc_buffer(newSize);if(replacement){return true}}return false}var ENV={};function getExecutableName(){return thisProgram||\"./this.program\"}function getEnvStrings(){if(!getEnvStrings.strings){var lang=(typeof navigator==\"object\"&&navigator.languages&&navigator.languages[0]||\"C\").replace(\"-\",\"_\")+\".UTF-8\";var env={\"USER\":\"web_user\",\"LOGNAME\":\"web_user\",\"PATH\":\"/\",\"PWD\":\"/\",\"HOME\":\"/home/web_user\",\"LANG\":lang,\"_\":getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings}function stringToAscii(str,buffer){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}HEAP8[buffer>>0]=0}function _environ_get(__environ,environ_buf){var bufSize=0;getEnvStrings().forEach(function(string,i){var ptr=environ_buf+bufSize;HEAPU32[__environ+i*4>>2]=ptr;stringToAscii(string,ptr);bufSize+=string.length+1});return 0}function _environ_sizes_get(penviron_count,penviron_buf_size){var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;strings.forEach(function(string){bufSize+=string.length+1});HEAPU32[penviron_buf_size>>2]=bufSize;return 0}function _proc_exit(code){EXITSTATUS=code;if(!keepRuntimeAlive()){if(Module[\"onExit\"])Module[\"onExit\"](code);ABORT=true}quit_(code,new ExitStatus(code))}function exitJS(status,implicit){EXITSTATUS=status;_proc_exit(status)}var _exit=exitJS;function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return e.errno}}function _fd_fdstat_get(fd,pbuf){try{var rightsBase=0;var rightsInheriting=0;var flags=0;{var stream=SYSCALLS.getStreamFromFD(fd);var type=stream.tty?2:FS.isDir(stream.mode)?3:FS.isLink(stream.mode)?7:4}HEAP8[pbuf>>0]=type;HEAP16[pbuf+2>>1]=flags;HEAP64[pbuf+8>>3]=BigInt(rightsBase);HEAP64[pbuf+16>>3]=BigInt(rightsInheriting);return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return e.errno}}function doReadv(stream,iov,iovcnt,offset){var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!==\"undefined\"){offset+=curr}}return ret}function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return e.errno}}var MAX_INT53=9007199254740992;var MIN_INT53=-9007199254740992;function bigintToI53Checked(num){return num<MIN_INT53||num>MAX_INT53?NaN:Number(num)}function _fd_seek(fd,offset,whence,newOffset){try{offset=bigintToI53Checked(offset);if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);HEAP64[newOffset>>3]=BigInt(stream.position);if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return e.errno}}function doWritev(stream,iov,iovcnt,offset){var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(typeof offset!==\"undefined\"){offset+=curr}}return ret}function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS==\"undefined\"||!(e.name===\"ErrnoError\"))throw e;return e.errno}}function _getaddrinfo(node,service,hint,out){var addr=0;var port=0;var flags=0;var family=0;var type=0;var proto=0;var ai;function allocaddrinfo(family,type,proto,canon,addr,port){var sa,salen,ai;var errno;salen=family===10?28:16;addr=family===10?inetNtop6(addr):inetNtop4(addr);sa=_malloc(salen);errno=writeSockaddr(sa,family,addr,port);assert(!errno);ai=_malloc(32);HEAP32[ai+4>>2]=family;HEAP32[ai+8>>2]=type;HEAP32[ai+12>>2]=proto;HEAPU32[ai+24>>2]=canon;HEAPU32[ai+20>>2]=sa;if(family===10){HEAP32[ai+16>>2]=28}else{HEAP32[ai+16>>2]=16}HEAP32[ai+28>>2]=0;return ai}if(hint){flags=HEAP32[hint>>2];family=HEAP32[hint+4>>2];type=HEAP32[hint+8>>2];proto=HEAP32[hint+12>>2]}if(type&&!proto){proto=type===2?17:6}if(!type&&proto){type=proto===17?2:1}if(proto===0){proto=6}if(type===0){type=1}if(!node&&!service){return-2}if(flags&~(1|2|4|1024|8|16|32)){return-1}if(hint!==0&&HEAP32[hint>>2]&2&&!node){return-1}if(flags&32){return-2}if(type!==0&&type!==1&&type!==2){return-7}if(family!==0&&family!==2&&family!==10){return-6}if(service){service=UTF8ToString(service);port=parseInt(service,10);if(isNaN(port)){if(flags&1024){return-2}return-8}}if(!node){if(family===0){family=2}if((flags&1)===0){if(family===2){addr=_htonl(2130706433)}else{addr=[0,0,0,1]}}ai=allocaddrinfo(family,type,proto,null,addr,port);HEAPU32[out>>2]=ai;return 0}node=UTF8ToString(node);addr=inetPton4(node);if(addr!==null){if(family===0||family===2){family=2}else if(family===10&&flags&8){addr=[0,0,_htonl(65535),addr];family=10}else{return-2}}else{addr=inetPton6(node);if(addr!==null){if(family===0||family===10){family=10}else{return-2}}}if(addr!=null){ai=allocaddrinfo(family,type,proto,node,addr,port);HEAPU32[out>>2]=ai;return 0}if(flags&4){return-2}node=DNS.lookup_name(node);addr=inetPton4(node);if(family===0){family=2}else if(family===10){addr=[0,0,_htonl(65535),addr]}ai=allocaddrinfo(family,type,proto,null,addr,port);HEAPU32[out>>2]=ai;return 0}function _getnameinfo(sa,salen,node,nodelen,serv,servlen,flags){var info=readSockaddr(sa,salen);if(info.errno){return-6}var port=info.port;var addr=info.addr;var overflowed=false;if(node&&nodelen){var lookup;if(flags&1||!(lookup=DNS.lookup_addr(addr))){if(flags&8){return-2}}else{addr=lookup}var numBytesWrittenExclNull=stringToUTF8(addr,node,nodelen);if(numBytesWrittenExclNull+1>=nodelen){overflowed=true}}if(serv&&servlen){port=\"\"+port;var numBytesWrittenExclNull=stringToUTF8(port,serv,servlen);if(numBytesWrittenExclNull+1>=servlen){overflowed=true}}if(overflowed){return-12}return 0}function arraySum(array,index){var sum=0;for(var i=0;i<=index;sum+=array[i++]){}return sum}var MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];var MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function addDays(date,days){var newDate=new Date(date.getTime());while(days>0){var leap=isLeapYear(newDate.getFullYear());var currentMonth=newDate.getMonth();var daysInCurrentMonth=(leap?MONTH_DAYS_LEAP:MONTH_DAYS_REGULAR)[currentMonth];if(days>daysInCurrentMonth-newDate.getDate()){days-=daysInCurrentMonth-newDate.getDate()+1;newDate.setDate(1);if(currentMonth<11){newDate.setMonth(currentMonth+1)}else{newDate.setMonth(0);newDate.setFullYear(newDate.getFullYear()+1)}}else{newDate.setDate(newDate.getDate()+days);return newDate}}return newDate}function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer)}function _strftime(s,maxsize,format,tm){var tm_zone=HEAP32[tm+40>>2];var date={tm_sec:HEAP32[tm>>2],tm_min:HEAP32[tm+4>>2],tm_hour:HEAP32[tm+8>>2],tm_mday:HEAP32[tm+12>>2],tm_mon:HEAP32[tm+16>>2],tm_year:HEAP32[tm+20>>2],tm_wday:HEAP32[tm+24>>2],tm_yday:HEAP32[tm+28>>2],tm_isdst:HEAP32[tm+32>>2],tm_gmtoff:HEAP32[tm+36>>2],tm_zone:tm_zone?UTF8ToString(tm_zone):\"\"};var pattern=UTF8ToString(format);var EXPANSION_RULES_1={\"%c\":\"%a %b %d %H:%M:%S %Y\",\"%D\":\"%m/%d/%y\",\"%F\":\"%Y-%m-%d\",\"%h\":\"%b\",\"%r\":\"%I:%M:%S %p\",\"%R\":\"%H:%M\",\"%T\":\"%H:%M:%S\",\"%x\":\"%m/%d/%y\",\"%X\":\"%H:%M:%S\",\"%Ec\":\"%c\",\"%EC\":\"%C\",\"%Ex\":\"%m/%d/%y\",\"%EX\":\"%H:%M:%S\",\"%Ey\":\"%y\",\"%EY\":\"%Y\",\"%Od\":\"%d\",\"%Oe\":\"%e\",\"%OH\":\"%H\",\"%OI\":\"%I\",\"%Om\":\"%m\",\"%OM\":\"%M\",\"%OS\":\"%S\",\"%Ou\":\"%u\",\"%OU\":\"%U\",\"%OV\":\"%V\",\"%Ow\":\"%w\",\"%OW\":\"%W\",\"%Oy\":\"%y\"};for(var rule in EXPANSION_RULES_1){pattern=pattern.replace(new RegExp(rule,\"g\"),EXPANSION_RULES_1[rule])}var WEEKDAYS=[\"Sunday\",\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"];var MONTHS=[\"January\",\"February\",\"March\",\"April\",\"May\",\"June\",\"July\",\"August\",\"September\",\"October\",\"November\",\"December\"];function leadingSomething(value,digits,character){var str=typeof value==\"number\"?value.toString():value||\"\";while(str.length<digits){str=character[0]+str}return str}function leadingNulls(value,digits){return leadingSomething(value,digits,\"0\")}function compareByDay(date1,date2){function sgn(value){return value<0?-1:value>0?1:0}var compare;if((compare=sgn(date1.getFullYear()-date2.getFullYear()))===0){if((compare=sgn(date1.getMonth()-date2.getMonth()))===0){compare=sgn(date1.getDate()-date2.getDate())}}return compare}function getFirstWeekStartDate(janFourth){switch(janFourth.getDay()){case 0:return new Date(janFourth.getFullYear()-1,11,29);case 1:return janFourth;case 2:return new Date(janFourth.getFullYear(),0,3);case 3:return new Date(janFourth.getFullYear(),0,2);case 4:return new Date(janFourth.getFullYear(),0,1);case 5:return new Date(janFourth.getFullYear()-1,11,31);case 6:return new Date(janFourth.getFullYear()-1,11,30)}}function getWeekBasedYear(date){var thisDate=addDays(new Date(date.tm_year+1900,0,1),date.tm_yday);var janFourthThisYear=new Date(thisDate.getFullYear(),0,4);var janFourthNextYear=new Date(thisDate.getFullYear()+1,0,4);var firstWeekStartThisYear=getFirstWeekStartDate(janFourthThisYear);var firstWeekStartNextYear=getFirstWeekStartDate(janFourthNextYear);if(compareByDay(firstWeekStartThisYear,thisDate)<=0){if(compareByDay(firstWeekStartNextYear,thisDate)<=0){return thisDate.getFullYear()+1}return thisDate.getFullYear()}return thisDate.getFullYear()-1}var EXPANSION_RULES_2={\"%a\":function(date){return WEEKDAYS[date.tm_wday].substring(0,3)},\"%A\":function(date){return WEEKDAYS[date.tm_wday]},\"%b\":function(date){return MONTHS[date.tm_mon].substring(0,3)},\"%B\":function(date){return MONTHS[date.tm_mon]},\"%C\":function(date){var year=date.tm_year+1900;return leadingNulls(year/100|0,2)},\"%d\":function(date){return leadingNulls(date.tm_mday,2)},\"%e\":function(date){return leadingSomething(date.tm_mday,2,\" \")},\"%g\":function(date){return getWeekBasedYear(date).toString().substring(2)},\"%G\":function(date){return getWeekBasedYear(date)},\"%H\":function(date){return leadingNulls(date.tm_hour,2)},\"%I\":function(date){var twelveHour=date.tm_hour;if(twelveHour==0)twelveHour=12;else if(twelveHour>12)twelveHour-=12;return leadingNulls(twelveHour,2)},\"%j\":function(date){return leadingNulls(date.tm_mday+arraySum(isLeapYear(date.tm_year+1900)?MONTH_DAYS_LEAP:MONTH_DAYS_REGULAR,date.tm_mon-1),3)},\"%m\":function(date){return leadingNulls(date.tm_mon+1,2)},\"%M\":function(date){return leadingNulls(date.tm_min,2)},\"%n\":function(){return\"\\n\"},\"%p\":function(date){if(date.tm_hour>=0&&date.tm_hour<12){return\"AM\"}return\"PM\"},\"%S\":function(date){return leadingNulls(date.tm_sec,2)},\"%t\":function(){return\"\\t\"},\"%u\":function(date){return date.tm_wday||7},\"%U\":function(date){var days=date.tm_yday+7-date.tm_wday;return leadingNulls(Math.floor(days/7),2)},\"%V\":function(date){var val=Math.floor((date.tm_yday+7-(date.tm_wday+6)%7)/7);if((date.tm_wday+371-date.tm_yday-2)%7<=2){val++}if(!val){val=52;var dec31=(date.tm_wday+7-date.tm_yday-1)%7;if(dec31==4||dec31==5&&isLeapYear(date.tm_year%400-1)){val++}}else if(val==53){var jan1=(date.tm_wday+371-date.tm_yday)%7;if(jan1!=4&&(jan1!=3||!isLeapYear(date.tm_year)))val=1}return leadingNulls(val,2)},\"%w\":function(date){return date.tm_wday},\"%W\":function(date){var days=date.tm_yday+7-(date.tm_wday+6)%7;return leadingNulls(Math.floor(days/7),2)},\"%y\":function(date){return(date.tm_year+1900).toString().substring(2)},\"%Y\":function(date){return date.tm_year+1900},\"%z\":function(date){var off=date.tm_gmtoff;var ahead=off>=0;off=Math.abs(off)/60;off=off/60*100+off%60;return(ahead?\"+\":\"-\")+String(\"0000\"+off).slice(-4)},\"%Z\":function(date){return date.tm_zone},\"%%\":function(){return\"%\"}};pattern=pattern.replace(/%%/g,\"\\0\\0\");for(var rule in EXPANSION_RULES_2){if(pattern.includes(rule)){pattern=pattern.replace(new RegExp(rule,\"g\"),EXPANSION_RULES_2[rule](date))}}pattern=pattern.replace(/\\0\\0/g,\"%\");var bytes=intArrayFromString(pattern,false);if(bytes.length>maxsize){return 0}writeArrayToMemory(bytes,s);return bytes.length-1}var FSNode=function(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.mounted=null;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.node_ops={};this.stream_ops={};this.rdev=rdev};var readMode=292|73;var writeMode=146;Object.defineProperties(FSNode.prototype,{read:{get:function(){return(this.mode&readMode)===readMode},set:function(val){val?this.mode|=readMode:this.mode&=~readMode}},write:{get:function(){return(this.mode&writeMode)===writeMode},set:function(val){val?this.mode|=writeMode:this.mode&=~writeMode}},isFolder:{get:function(){return FS.isDir(this.mode)}},isDevice:{get:function(){return FS.isChrdev(this.mode)}}});FS.FSNode=FSNode;FS.createPreloadedFile=FS_createPreloadedFile;FS.staticInit();var wasmImports={\"b\":___assert_fail,\"f\":___cxa_throw,\"ka\":___dlsym,\"R\":___syscall__newselect,\"L\":___syscall_accept4,\"K\":___syscall_bind,\"J\":___syscall_connect,\"la\":___syscall_faccessat,\"g\":___syscall_fcntl64,\"ha\":___syscall_fstat64,\"U\":___syscall_getdents64,\"I\":___syscall_getpeername,\"H\":___syscall_getsockname,\"G\":___syscall_getsockopt,\"y\":___syscall_ioctl,\"F\":___syscall_listen,\"ea\":___syscall_lstat64,\"$\":___syscall_mkdirat,\"fa\":___syscall_newfstatat,\"w\":___syscall_openat,\"V\":___syscall_poll,\"E\":___syscall_recvfrom,\"T\":___syscall_renameat,\"S\":___syscall_rmdir,\"D\":___syscall_sendto,\"v\":___syscall_socket,\"ga\":___syscall_stat64,\"O\":___syscall_unlinkat,\"ia\":__emscripten_get_now_is_monotonic,\"M\":__emscripten_throw_longjmp,\"Y\":__gmtime_js,\"Z\":__localtime_js,\"_\":__mktime_js,\"W\":__mmap_js,\"X\":__munmap_js,\"P\":__tzset_js,\"a\":_abort,\"t\":_dlopen,\"oa\":_emscripten_asm_const_int,\"l\":_emscripten_date_now,\"Q\":_emscripten_get_heap_max,\"p\":_emscripten_get_now,\"ja\":_emscripten_memcpy_big,\"N\":_emscripten_resize_heap,\"ca\":_environ_get,\"da\":_environ_sizes_get,\"o\":_exit,\"m\":_fd_close,\"ba\":_fd_fdstat_get,\"x\":_fd_read,\"aa\":_fd_seek,\"q\":_fd_write,\"k\":_getaddrinfo,\"i\":_getnameinfo,\"pa\":invoke_i,\"na\":invoke_ii,\"c\":invoke_iii,\"n\":invoke_iiii,\"s\":invoke_iiiii,\"z\":invoke_iiiiii,\"r\":invoke_iiiiiiiii,\"B\":invoke_iiiijj,\"qa\":invoke_iij,\"h\":invoke_vi,\"j\":invoke_vii,\"d\":invoke_viiii,\"ma\":invoke_viiiiii,\"A\":invoke_viiiiiiii,\"C\":is_timeout,\"u\":send_progress,\"e\":_strftime};var asm=createWasm();var ___wasm_call_ctors=function(){return(___wasm_call_ctors=Module[\"asm\"][\"sa\"]).apply(null,arguments)};var _malloc=Module[\"_malloc\"]=function(){return(_malloc=Module[\"_malloc\"]=Module[\"asm\"][\"ta\"]).apply(null,arguments)};var ___errno_location=function(){return(___errno_location=Module[\"asm\"][\"va\"]).apply(null,arguments)};var _ntohs=function(){return(_ntohs=Module[\"asm\"][\"wa\"]).apply(null,arguments)};var _htons=function(){return(_htons=Module[\"asm\"][\"xa\"]).apply(null,arguments)};var _ffmpeg=Module[\"_ffmpeg\"]=function(){return(_ffmpeg=Module[\"_ffmpeg\"]=Module[\"asm\"][\"ya\"]).apply(null,arguments)};var _htonl=function(){return(_htonl=Module[\"asm\"][\"za\"]).apply(null,arguments)};var _emscripten_builtin_memalign=function(){return(_emscripten_builtin_memalign=Module[\"asm\"][\"Aa\"]).apply(null,arguments)};var _setThrew=function(){return(_setThrew=Module[\"asm\"][\"Ba\"]).apply(null,arguments)};var stackSave=function(){return(stackSave=Module[\"asm\"][\"Ca\"]).apply(null,arguments)};var stackRestore=function(){return(stackRestore=Module[\"asm\"][\"Da\"]).apply(null,arguments)};var ___cxa_is_pointer_type=function(){return(___cxa_is_pointer_type=Module[\"asm\"][\"Ea\"]).apply(null,arguments)};var _ff_h264_cabac_tables=Module[\"_ff_h264_cabac_tables\"]=1537004;var ___start_em_js=Module[\"___start_em_js\"]=6059629;var ___stop_em_js=Module[\"___stop_em_js\"]=6059806;function invoke_iiiii(index,a1,a2,a3,a4){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2,a3,a4)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_vii(index,a1,a2){var sp=stackSave();try{getWasmTableEntry(index)(a1,a2)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iii(index,a1,a2){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iiiijj(index,a1,a2,a3,a4,a5){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2,a3,a4,a5)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_vi(index,a1){var sp=stackSave();try{getWasmTableEntry(index)(a1)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_viiii(index,a1,a2,a3,a4){var sp=stackSave();try{getWasmTableEntry(index)(a1,a2,a3,a4)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iiii(index,a1,a2,a3){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2,a3)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iij(index,a1,a2){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_i(index){var sp=stackSave();try{return getWasmTableEntry(index)()}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_ii(index,a1){var sp=stackSave();try{return getWasmTableEntry(index)(a1)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8){var sp=stackSave();try{getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_iiiiii(index,a1,a2,a3,a4,a5){var sp=stackSave();try{return getWasmTableEntry(index)(a1,a2,a3,a4,a5)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6){var sp=stackSave();try{getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6)}catch(e){stackRestore(sp);if(e!==e+0)throw e;_setThrew(1,0)}}Module[\"setValue\"]=setValue;Module[\"getValue\"]=getValue;Module[\"UTF8ToString\"]=UTF8ToString;Module[\"stringToUTF8\"]=stringToUTF8;Module[\"lengthBytesUTF8\"]=lengthBytesUTF8;Module[\"FS\"]=FS;var calledRun;dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller};function run(){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module[\"calledRun\"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);if(Module[\"onRuntimeInitialized\"])Module[\"onRuntimeInitialized\"]();postRun()}if(Module[\"setStatus\"]){Module[\"setStatus\"](\"Running...\");setTimeout(function(){setTimeout(function(){Module[\"setStatus\"](\"\")},1);doRun()},1)}else{doRun()}}if(Module[\"preInit\"]){if(typeof Module[\"preInit\"]==\"function\")Module[\"preInit\"]=[Module[\"preInit\"]];while(Module[\"preInit\"].length>0){Module[\"preInit\"].pop()()}}run();\n\n\n  return createFFmpegCore.ready\n}\n\n);\n})();\nexport default createFFmpegCore;";

	var FFMessageType;
	(function (FFMessageType) {
	    FFMessageType["LOAD"] = "LOAD";
	    FFMessageType["EXEC"] = "EXEC";
	    FFMessageType["WRITE_FILE"] = "WRITE_FILE";
	    FFMessageType["READ_FILE"] = "READ_FILE";
	    FFMessageType["DELETE_FILE"] = "DELETE_FILE";
	    FFMessageType["RENAME"] = "RENAME";
	    FFMessageType["CREATE_DIR"] = "CREATE_DIR";
	    FFMessageType["LIST_DIR"] = "LIST_DIR";
	    FFMessageType["DELETE_DIR"] = "DELETE_DIR";
	    FFMessageType["ERROR"] = "ERROR";
	    FFMessageType["DOWNLOAD"] = "DOWNLOAD";
	    FFMessageType["PROGRESS"] = "PROGRESS";
	    FFMessageType["LOG"] = "LOG";
	    FFMessageType["MOUNT"] = "MOUNT";
	    FFMessageType["UNMOUNT"] = "UNMOUNT";
	})(FFMessageType || (FFMessageType = {}));

	/**
	 * Generate an unique message ID.
	 */
	const getMessageID = (() => {
	    let messageID = 0;
	    return () => messageID++;
	})();

	const ERROR_NOT_LOADED = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
	const ERROR_TERMINATED = new Error("called FFmpeg.terminate()");

	/**
	 * Provides APIs to interact with ffmpeg web worker.
	 *
	 * @example
	 * ```ts
	 * const ffmpeg = new FFmpeg();
	 * ```
	 */
	class FFmpeg {
	    #worker = null;
	    /**
	     * #resolves and #rejects tracks Promise resolves and rejects to
	     * be called when we receive message from web worker.
	     */
	    #resolves = {};
	    #rejects = {};
	    #logEventCallbacks = [];
	    #progressEventCallbacks = [];
	    loaded = false;
	    /**
	     * register worker message event handlers.
	     */
	    #registerHandlers = () => {
	        if (this.#worker) {
	            this.#worker.onmessage = ({ data: { id, type, data }, }) => {
	                switch (type) {
	                    case FFMessageType.LOAD:
	                        this.loaded = true;
	                        this.#resolves[id](data);
	                        break;
	                    case FFMessageType.MOUNT:
	                    case FFMessageType.UNMOUNT:
	                    case FFMessageType.EXEC:
	                    case FFMessageType.WRITE_FILE:
	                    case FFMessageType.READ_FILE:
	                    case FFMessageType.DELETE_FILE:
	                    case FFMessageType.RENAME:
	                    case FFMessageType.CREATE_DIR:
	                    case FFMessageType.LIST_DIR:
	                    case FFMessageType.DELETE_DIR:
	                        this.#resolves[id](data);
	                        break;
	                    case FFMessageType.LOG:
	                        this.#logEventCallbacks.forEach((f) => f(data));
	                        break;
	                    case FFMessageType.PROGRESS:
	                        this.#progressEventCallbacks.forEach((f) => f(data));
	                        break;
	                    case FFMessageType.ERROR:
	                        this.#rejects[id](data);
	                        break;
	                }
	                delete this.#resolves[id];
	                delete this.#rejects[id];
	            };
	        }
	    };
	    /**
	     * Generic function to send messages to web worker.
	     */
	    #send = ({ type, data }, trans = [], signal) => {
	        if (!this.#worker) {
	            return Promise.reject(ERROR_NOT_LOADED);
	        }
	        return new Promise((resolve, reject) => {
	            const id = getMessageID();
	            this.#worker && this.#worker.postMessage({ id, type, data }, trans);
	            this.#resolves[id] = resolve;
	            this.#rejects[id] = reject;
	            signal?.addEventListener("abort", () => {
	                reject(new DOMException(`Message # ${id} was aborted`, "AbortError"));
	            }, { once: true });
	        });
	    };
	    on(event, callback) {
	        if (event === "log") {
	            this.#logEventCallbacks.push(callback);
	        }
	        else if (event === "progress") {
	            this.#progressEventCallbacks.push(callback);
	        }
	    }
	    off(event, callback) {
	        if (event === "log") {
	            this.#logEventCallbacks = this.#logEventCallbacks.filter((f) => f !== callback);
	        }
	        else if (event === "progress") {
	            this.#progressEventCallbacks = this.#progressEventCallbacks.filter((f) => f !== callback);
	        }
	    }
	    /**
	     * Loads ffmpeg-core inside web worker. It is required to call this method first
	     * as it initializes WebAssembly and other essential variables.
	     *
	     * @category FFmpeg
	     * @returns `true` if ffmpeg core is loaded for the first time.
	     */
	    load = ({ classWorkerURL, ...config } = {}, { signal } = {}) => {
	        if (!this.#worker) {
	            this.#worker = classWorkerURL ?
	                new Worker(new URL(classWorkerURL, (_documentCurrentScript && _documentCurrentScript.src || new URL('__entry.js', document.baseURI).href)), {
	                    type: "module",
	                }) :
	                // We need to duplicated the code here to enable webpack
	                // to bundle worekr.js here.
	                new Worker(new URL('' + "/worker-CRu_gK8D.js", (_documentCurrentScript && _documentCurrentScript.src || new URL('__entry.js', document.baseURI).href)), {
	                    type: "module",
	                });
	            this.#registerHandlers();
	        }
	        return this.#send({
	            type: FFMessageType.LOAD,
	            data: config,
	        }, undefined, signal);
	    };
	    /**
	     * Execute ffmpeg command.
	     *
	     * @remarks
	     * To avoid common I/O issues, ["-nostdin", "-y"] are prepended to the args
	     * by default.
	     *
	     * @example
	     * ```ts
	     * const ffmpeg = new FFmpeg();
	     * await ffmpeg.load();
	     * await ffmpeg.writeFile("video.avi", ...);
	     * // ffmpeg -i video.avi video.mp4
	     * await ffmpeg.exec(["-i", "video.avi", "video.mp4"]);
	     * const data = ffmpeg.readFile("video.mp4");
	     * ```
	     *
	     * @returns `0` if no error, `!= 0` if timeout (1) or error.
	     * @category FFmpeg
	     */
	    exec = (
	    /** ffmpeg command line args */
	    args, 
	    /**
	     * milliseconds to wait before stopping the command execution.
	     *
	     * @defaultValue -1
	     */
	    timeout = -1, { signal } = {}) => this.#send({
	        type: FFMessageType.EXEC,
	        data: { args, timeout },
	    }, undefined, signal);
	    /**
	     * Terminate all ongoing API calls and terminate web worker.
	     * `FFmpeg.load()` must be called again before calling any other APIs.
	     *
	     * @category FFmpeg
	     */
	    terminate = () => {
	        const ids = Object.keys(this.#rejects);
	        // rejects all incomplete Promises.
	        for (const id of ids) {
	            this.#rejects[id](ERROR_TERMINATED);
	            delete this.#rejects[id];
	            delete this.#resolves[id];
	        }
	        if (this.#worker) {
	            this.#worker.terminate();
	            this.#worker = null;
	            this.loaded = false;
	        }
	    };
	    /**
	     * Write data to ffmpeg.wasm.
	     *
	     * @example
	     * ```ts
	     * const ffmpeg = new FFmpeg();
	     * await ffmpeg.load();
	     * await ffmpeg.writeFile("video.avi", await fetchFile("../video.avi"));
	     * await ffmpeg.writeFile("text.txt", "hello world");
	     * ```
	     *
	     * @category File System
	     */
	    writeFile = (path, data, { signal } = {}) => {
	        const trans = [];
	        if (data instanceof Uint8Array) {
	            trans.push(data.buffer);
	        }
	        return this.#send({
	            type: FFMessageType.WRITE_FILE,
	            data: { path, data },
	        }, trans, signal);
	    };
	    mount = (fsType, options, mountPoint) => {
	        const trans = [];
	        return this.#send({
	            type: FFMessageType.MOUNT,
	            data: { fsType, options, mountPoint },
	        }, trans);
	    };
	    unmount = (mountPoint) => {
	        const trans = [];
	        return this.#send({
	            type: FFMessageType.UNMOUNT,
	            data: { mountPoint },
	        }, trans);
	    };
	    /**
	     * Read data from ffmpeg.wasm.
	     *
	     * @example
	     * ```ts
	     * const ffmpeg = new FFmpeg();
	     * await ffmpeg.load();
	     * const data = await ffmpeg.readFile("video.mp4");
	     * ```
	     *
	     * @category File System
	     */
	    readFile = (path, 
	    /**
	     * File content encoding, supports two encodings:
	     * - utf8: read file as text file, return data in string type.
	     * - binary: read file as binary file, return data in Uint8Array type.
	     *
	     * @defaultValue binary
	     */
	    encoding = "binary", { signal } = {}) => this.#send({
	        type: FFMessageType.READ_FILE,
	        data: { path, encoding },
	    }, undefined, signal);
	    /**
	     * Delete a file.
	     *
	     * @category File System
	     */
	    deleteFile = (path, { signal } = {}) => this.#send({
	        type: FFMessageType.DELETE_FILE,
	        data: { path },
	    }, undefined, signal);
	    /**
	     * Rename a file or directory.
	     *
	     * @category File System
	     */
	    rename = (oldPath, newPath, { signal } = {}) => this.#send({
	        type: FFMessageType.RENAME,
	        data: { oldPath, newPath },
	    }, undefined, signal);
	    /**
	     * Create a directory.
	     *
	     * @category File System
	     */
	    createDir = (path, { signal } = {}) => this.#send({
	        type: FFMessageType.CREATE_DIR,
	        data: { path },
	    }, undefined, signal);
	    /**
	     * List directory contents.
	     *
	     * @category File System
	     */
	    listDir = (path, { signal } = {}) => this.#send({
	        type: FFMessageType.LIST_DIR,
	        data: { path },
	    }, undefined, signal);
	    /**
	     * Delete an empty directory.
	     *
	     * @category File System
	     */
	    deleteDir = (path, { signal } = {}) => this.#send({
	        type: FFMessageType.DELETE_DIR,
	        data: { path },
	    }, undefined, signal);
	}

	const ERROR_RESPONSE_BODY_READER = new Error("failed to get response body reader");
	const ERROR_INCOMPLETED_DOWNLOAD = new Error("failed to complete download");

	const HeaderContentLength = "Content-Length";

	/**
	 * Download content of a URL with progress.
	 *
	 * Progress only works when Content-Length is provided by the server.
	 *
	 */
	const downloadWithProgress = async (url, cb) => {
	    const resp = await fetch(url);
	    let buf;
	    try {
	        // Set total to -1 to indicate that there is not Content-Type Header.
	        const total = parseInt(resp.headers.get(HeaderContentLength) || "-1");
	        const reader = resp.body?.getReader();
	        if (!reader)
	            throw ERROR_RESPONSE_BODY_READER;
	        const chunks = [];
	        let received = 0;
	        for (;;) {
	            const { done, value } = await reader.read();
	            const delta = value ? value.length : 0;
	            if (done) {
	                if (total != -1 && total !== received)
	                    throw ERROR_INCOMPLETED_DOWNLOAD;
	                cb && cb({ url, total, received, delta, done });
	                break;
	            }
	            chunks.push(value);
	            received += delta;
	            cb && cb({ url, total, received, delta, done });
	        }
	        const data = new Uint8Array(received);
	        let position = 0;
	        for (const chunk of chunks) {
	            data.set(chunk, position);
	            position += chunk.length;
	        }
	        buf = data.buffer;
	    }
	    catch (e) {
	        console.log(`failed to send download progress event: `, e);
	        // Fetch arrayBuffer directly when it is not possible to get progress.
	        buf = await resp.arrayBuffer();
	        cb &&
	            cb({
	                url,
	                total: buf.byteLength,
	                received: buf.byteLength,
	                delta: 0,
	                done: true,
	            });
	    }
	    return buf;
	};
	/**
	 * toBlobURL fetches data from an URL and return a blob URL.
	 *
	 * Example:
	 *
	 * ```ts
	 * await toBlobURL("http://localhost:3000/ffmpeg.js", "text/javascript");
	 * ```
	 */
	const toBlobURL = async (url, mimeType, progress = false, cb) => {
	    const buf = progress
	        ? await downloadWithProgress(url, cb)
	        : await (await fetch(url)).arrayBuffer();
	    const blob = new Blob([buf], { type: mimeType });
	    return URL.createObjectURL(blob);
	};

	class FFmpegConvertor {
	  coreURL;
	  wasmURL;
	  classWorkerURL;
	  ffmpeg;
	  size = 0;
	  /// 140MB, don't know why, but it's the limit, if execced, ffmpeg throw index out of bounds error
	  maxSize = 14e7;
	  taskCount = 0;
	  reloadLock = false;
	  async init() {
	    const en = new TextEncoder();
	    this.coreURL = URL.createObjectURL(new Blob([en.encode(core_raw)], { type: "text/javascript" }));
	    this.classWorkerURL = URL.createObjectURL(new Blob([en.encode(class_worker_raw)], { type: "text/javascript" }));
	    this.wasmURL = await toBlobURL("https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm", "application/wasm");
	    this.ffmpeg = new FFmpeg();
	    await this.load();
	    return this;
	  }
	  async load() {
	    await this.ffmpeg.load(
	      {
	        coreURL: this.coreURL,
	        wasmURL: this.wasmURL,
	        classWorkerURL: this.classWorkerURL
	      }
	    );
	  }
	  async check() {
	    if (!this.coreURL || !this.wasmURL || !this.classWorkerURL || !this.ffmpeg) {
	      throw new Error("FFmpegConvertor not init");
	    }
	    if (this.size > this.maxSize) {
	      const verLock = this.reloadLock;
	      await this.waitForTaskZero();
	      if (!this.reloadLock) {
	        this.reloadLock = true;
	        try {
	          evLog("info", "FFmpegConvertor: size limit exceeded, terminate ffmpeg, verLock: ", verLock);
	          this.ffmpeg.terminate();
	          await this.load();
	          this.size = 0;
	          this.taskCount = 0;
	        } finally {
	          this.reloadLock = false;
	        }
	      } else {
	        await this.waitForReloadLock();
	      }
	    }
	  }
	  async writeFiles(files, randomPrefix) {
	    const ffmpeg = this.ffmpeg;
	    await Promise.all(
	      files.map(async (f) => {
	        this.size += f.data.byteLength;
	        await ffmpeg.writeFile(randomPrefix + f.name, f.data);
	      })
	    );
	  }
	  async readOutputFile(file) {
	    const result = await this.ffmpeg.readFile(file);
	    this.size += result.length;
	    return result;
	  }
	  // TODO: find a way to reduce time cost; to mp4 30MB takes 50s; to gif 30MB takes 26s
	  async convertTo(files, format, meta) {
	    await this.check();
	    this.taskCount++;
	    try {
	      const ffmpeg = this.ffmpeg;
	      const randomPrefix = Math.random().toString(36).substring(7);
	      await this.writeFiles(files, randomPrefix);
	      let metaStr;
	      if (meta) {
	        metaStr = meta.map((m) => `file '${randomPrefix}${m.file}'
duration ${m.delay / 1e3}`).join("\n");
	      } else {
	        metaStr = files.map((f) => `file '${randomPrefix}${f.name}'
duration 0.04`).join("\n");
	      }
	      await ffmpeg.writeFile(randomPrefix + "meta.txt", metaStr);
	      let resultFile;
	      let mimeType;
	      switch (format) {
	        case "GIF":
	          resultFile = randomPrefix + "output.gif";
	          mimeType = "image/gif";
	          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", randomPrefix + "meta.txt", "-vf", "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=2", resultFile]);
	          break;
	        case "MP4":
	          resultFile = randomPrefix + "output.mp4";
	          mimeType = "video/mp4";
	          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", randomPrefix + "meta.txt", "-c:v", "h264", "-pix_fmt", "yuv420p", resultFile]);
	          break;
	      }
	      const result = await this.readOutputFile(resultFile);
	      const deletePromise = files.map((f) => ffmpeg.deleteFile(randomPrefix + f.name));
	      if (meta) {
	        deletePromise.push(ffmpeg.deleteFile(randomPrefix + "meta.txt"));
	      }
	      deletePromise.push(ffmpeg.deleteFile(resultFile));
	      await Promise.all(deletePromise);
	      return new Blob([result], { type: mimeType });
	    } finally {
	      this.taskCount--;
	    }
	  }
	  async waitForTaskZero() {
	    while (this.taskCount > 0) {
	      await new Promise((r) => setTimeout(r, 100));
	    }
	    await new Promise((r) => setTimeout(r, Math.random() * 100 + 10));
	  }
	  async waitForReloadLock() {
	    while (this.reloadLock) {
	      await new Promise((r) => setTimeout(r, 100));
	    }
	    await new Promise((r) => setTimeout(r, Math.random() * 100 + 10));
	  }
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	/*
	 * This program is based on JZlib 1.0.2 ymnk, JCraft,Inc.
	 * JZlib is based on zlib-1.1.3, so all credit should go authors
	 * Jean-loup Gailly(jloup@gzip.org) and Mark Adler(madler@alumni.caltech.edu)
	 * and contributors of zlib.
	 */

	// deno-lint-ignore-file no-this-alias prefer-const

	// Global

	const MAX_BITS$1 = 15;
	const D_CODES = 30;
	const BL_CODES = 19;

	const LENGTH_CODES = 29;
	const LITERALS = 256;
	const L_CODES = (LITERALS + 1 + LENGTH_CODES);
	const HEAP_SIZE = (2 * L_CODES + 1);

	const END_BLOCK = 256;

	// Bit length codes must not exceed MAX_BL_BITS bits
	const MAX_BL_BITS = 7;

	// repeat previous bit length 3-6 times (2 bits of repeat count)
	const REP_3_6 = 16;

	// repeat a zero length 3-10 times (3 bits of repeat count)
	const REPZ_3_10 = 17;

	// repeat a zero length 11-138 times (7 bits of repeat count)
	const REPZ_11_138 = 18;

	// The lengths of the bit length codes are sent in order of decreasing
	// probability, to avoid transmitting the lengths for unused bit
	// length codes.

	const Buf_size = 8 * 2;

	// JZlib version : "1.0.2"
	const Z_DEFAULT_COMPRESSION = -1;

	// compression strategy
	const Z_FILTERED = 1;
	const Z_HUFFMAN_ONLY = 2;
	const Z_DEFAULT_STRATEGY = 0;

	const Z_NO_FLUSH$1 = 0;
	const Z_PARTIAL_FLUSH = 1;
	const Z_FULL_FLUSH = 3;
	const Z_FINISH$1 = 4;

	const Z_OK$1 = 0;
	const Z_STREAM_END$1 = 1;
	const Z_NEED_DICT$1 = 2;
	const Z_STREAM_ERROR$1 = -2;
	const Z_DATA_ERROR$1 = -3;
	const Z_BUF_ERROR$1 = -5;

	// Tree

	function extractArray(array) {
		return flatArray(array.map(([length, value]) => (new Array(length)).fill(value, 0, length)));
	}

	function flatArray(array) {
		return array.reduce((a, b) => a.concat(Array.isArray(b) ? flatArray(b) : b), []);
	}

	// see definition of array dist_code below
	const _dist_code = [0, 1, 2, 3].concat(...extractArray([
		[2, 4], [2, 5], [4, 6], [4, 7], [8, 8], [8, 9], [16, 10], [16, 11], [32, 12], [32, 13], [64, 14], [64, 15], [2, 0], [1, 16],
		[1, 17], [2, 18], [2, 19], [4, 20], [4, 21], [8, 22], [8, 23], [16, 24], [16, 25], [32, 26], [32, 27], [64, 28], [64, 29]
	]));

	function Tree() {
		const that = this;

		// dyn_tree; // the dynamic tree
		// max_code; // largest code with non zero frequency
		// stat_desc; // the corresponding static tree

		// Compute the optimal bit lengths for a tree and update the total bit
		// length
		// for the current block.
		// IN assertion: the fields freq and dad are set, heap[heap_max] and
		// above are the tree nodes sorted by increasing frequency.
		// OUT assertions: the field len is set to the optimal bit length, the
		// array bl_count contains the frequencies for each bit length.
		// The length opt_len is updated; static_len is also updated if stree is
		// not null.
		function gen_bitlen(s) {
			const tree = that.dyn_tree;
			const stree = that.stat_desc.static_tree;
			const extra = that.stat_desc.extra_bits;
			const base = that.stat_desc.extra_base;
			const max_length = that.stat_desc.max_length;
			let h; // heap index
			let n, m; // iterate over the tree elements
			let bits; // bit length
			let xbits; // extra bits
			let f; // frequency
			let overflow = 0; // number of elements with bit length too large

			for (bits = 0; bits <= MAX_BITS$1; bits++)
				s.bl_count[bits] = 0;

			// In a first pass, compute the optimal bit lengths (which may
			// overflow in the case of the bit length tree).
			tree[s.heap[s.heap_max] * 2 + 1] = 0; // root of the heap

			for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
				n = s.heap[h];
				bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
				if (bits > max_length) {
					bits = max_length;
					overflow++;
				}
				tree[n * 2 + 1] = bits;
				// We overwrite tree[n*2+1] which is no longer needed

				if (n > that.max_code)
					continue; // not a leaf node

				s.bl_count[bits]++;
				xbits = 0;
				if (n >= base)
					xbits = extra[n - base];
				f = tree[n * 2];
				s.opt_len += f * (bits + xbits);
				if (stree)
					s.static_len += f * (stree[n * 2 + 1] + xbits);
			}
			if (overflow === 0)
				return;

			// This happens for example on obj2 and pic of the Calgary corpus
			// Find the first bit length which could increase:
			do {
				bits = max_length - 1;
				while (s.bl_count[bits] === 0)
					bits--;
				s.bl_count[bits]--; // move one leaf down the tree
				s.bl_count[bits + 1] += 2; // move one overflow item as its brother
				s.bl_count[max_length]--;
				// The brother of the overflow item also moves one step up,
				// but this does not affect bl_count[max_length]
				overflow -= 2;
			} while (overflow > 0);

			for (bits = max_length; bits !== 0; bits--) {
				n = s.bl_count[bits];
				while (n !== 0) {
					m = s.heap[--h];
					if (m > that.max_code)
						continue;
					if (tree[m * 2 + 1] != bits) {
						s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
						tree[m * 2 + 1] = bits;
					}
					n--;
				}
			}
		}

		// Reverse the first len bits of a code, using straightforward code (a
		// faster
		// method would use a table)
		// IN assertion: 1 <= len <= 15
		function bi_reverse(code, // the value to invert
			len // its bit length
		) {
			let res = 0;
			do {
				res |= code & 1;
				code >>>= 1;
				res <<= 1;
			} while (--len > 0);
			return res >>> 1;
		}

		// Generate the codes for a given tree and bit counts (which need not be
		// optimal).
		// IN assertion: the array bl_count contains the bit length statistics for
		// the given tree and the field len is set for all tree elements.
		// OUT assertion: the field code is set for all tree elements of non
		// zero code length.
		function gen_codes(tree, // the tree to decorate
			max_code, // largest code with non zero frequency
			bl_count // number of codes at each bit length
		) {
			const next_code = []; // next code value for each
			// bit length
			let code = 0; // running code value
			let bits; // bit index
			let n; // code index
			let len;

			// The distribution counts are first used to generate the code values
			// without bit reversal.
			for (bits = 1; bits <= MAX_BITS$1; bits++) {
				next_code[bits] = code = ((code + bl_count[bits - 1]) << 1);
			}

			// Check that the bit counts in bl_count are consistent. The last code
			// must be all ones.
			// Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
			// "inconsistent bit counts");
			// Tracev((stderr,"gen_codes: max_code %d ", max_code));

			for (n = 0; n <= max_code; n++) {
				len = tree[n * 2 + 1];
				if (len === 0)
					continue;
				// Now reverse the bits
				tree[n * 2] = bi_reverse(next_code[len]++, len);
			}
		}

		// Construct one Huffman tree and assigns the code bit strings and lengths.
		// Update the total bit length for the current block.
		// IN assertion: the field freq is set for all tree elements.
		// OUT assertions: the fields len and code are set to the optimal bit length
		// and corresponding code. The length opt_len is updated; static_len is
		// also updated if stree is not null. The field max_code is set.
		that.build_tree = function (s) {
			const tree = that.dyn_tree;
			const stree = that.stat_desc.static_tree;
			const elems = that.stat_desc.elems;
			let n, m; // iterate over heap elements
			let max_code = -1; // largest code with non zero frequency
			let node; // new node being created

			// Construct the initial heap, with least frequent element in
			// heap[1]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
			// heap[0] is not used.
			s.heap_len = 0;
			s.heap_max = HEAP_SIZE;

			for (n = 0; n < elems; n++) {
				if (tree[n * 2] !== 0) {
					s.heap[++s.heap_len] = max_code = n;
					s.depth[n] = 0;
				} else {
					tree[n * 2 + 1] = 0;
				}
			}

			// The pkzip format requires that at least one distance code exists,
			// and that at least one bit should be sent even if there is only one
			// possible code. So to avoid special checks later on we force at least
			// two codes of non zero frequency.
			while (s.heap_len < 2) {
				node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
				tree[node * 2] = 1;
				s.depth[node] = 0;
				s.opt_len--;
				if (stree)
					s.static_len -= stree[node * 2 + 1];
				// node is 0 or 1 so it does not have extra bits
			}
			that.max_code = max_code;

			// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
			// establish sub-heaps of increasing lengths:

			for (n = Math.floor(s.heap_len / 2); n >= 1; n--)
				s.pqdownheap(tree, n);

			// Construct the Huffman tree by repeatedly combining the least two
			// frequent nodes.

			node = elems; // next internal node of the tree
			do {
				// n = node of least frequency
				n = s.heap[1];
				s.heap[1] = s.heap[s.heap_len--];
				s.pqdownheap(tree, 1);
				m = s.heap[1]; // m = node of next least frequency

				s.heap[--s.heap_max] = n; // keep the nodes sorted by frequency
				s.heap[--s.heap_max] = m;

				// Create a new node father of n and m
				tree[node * 2] = (tree[n * 2] + tree[m * 2]);
				s.depth[node] = Math.max(s.depth[n], s.depth[m]) + 1;
				tree[n * 2 + 1] = tree[m * 2 + 1] = node;

				// and insert the new node in the heap
				s.heap[1] = node++;
				s.pqdownheap(tree, 1);
			} while (s.heap_len >= 2);

			s.heap[--s.heap_max] = s.heap[1];

			// At this point, the fields freq and dad are set. We can now
			// generate the bit lengths.

			gen_bitlen(s);

			// The field len is now set, we can generate the bit codes
			gen_codes(tree, that.max_code, s.bl_count);
		};

	}

	Tree._length_code = [0, 1, 2, 3, 4, 5, 6, 7].concat(...extractArray([
		[2, 8], [2, 9], [2, 10], [2, 11], [4, 12], [4, 13], [4, 14], [4, 15], [8, 16], [8, 17], [8, 18], [8, 19],
		[16, 20], [16, 21], [16, 22], [16, 23], [32, 24], [32, 25], [32, 26], [31, 27], [1, 28]]));

	Tree.base_length = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 0];

	Tree.base_dist = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096, 6144, 8192, 12288, 16384,
		24576];

	// Mapping from a distance to a distance code. dist is the distance - 1 and
	// must not have side effects. _dist_code[256] and _dist_code[257] are never
	// used.
	Tree.d_code = function (dist) {
		return ((dist) < 256 ? _dist_code[dist] : _dist_code[256 + ((dist) >>> 7)]);
	};

	// extra bits for each length code
	Tree.extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];

	// extra bits for each distance code
	Tree.extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

	// extra bits for each bit length code
	Tree.extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];

	Tree.bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

	// StaticTree

	function StaticTree(static_tree, extra_bits, extra_base, elems, max_length) {
		const that = this;
		that.static_tree = static_tree;
		that.extra_bits = extra_bits;
		that.extra_base = extra_base;
		that.elems = elems;
		that.max_length = max_length;
	}

	const static_ltree2_first_part = [12, 140, 76, 204, 44, 172, 108, 236, 28, 156, 92, 220, 60, 188, 124, 252, 2, 130, 66, 194, 34, 162, 98, 226, 18, 146, 82,
		210, 50, 178, 114, 242, 10, 138, 74, 202, 42, 170, 106, 234, 26, 154, 90, 218, 58, 186, 122, 250, 6, 134, 70, 198, 38, 166, 102, 230, 22, 150, 86,
		214, 54, 182, 118, 246, 14, 142, 78, 206, 46, 174, 110, 238, 30, 158, 94, 222, 62, 190, 126, 254, 1, 129, 65, 193, 33, 161, 97, 225, 17, 145, 81,
		209, 49, 177, 113, 241, 9, 137, 73, 201, 41, 169, 105, 233, 25, 153, 89, 217, 57, 185, 121, 249, 5, 133, 69, 197, 37, 165, 101, 229, 21, 149, 85,
		213, 53, 181, 117, 245, 13, 141, 77, 205, 45, 173, 109, 237, 29, 157, 93, 221, 61, 189, 125, 253, 19, 275, 147, 403, 83, 339, 211, 467, 51, 307,
		179, 435, 115, 371, 243, 499, 11, 267, 139, 395, 75, 331, 203, 459, 43, 299, 171, 427, 107, 363, 235, 491, 27, 283, 155, 411, 91, 347, 219, 475,
		59, 315, 187, 443, 123, 379, 251, 507, 7, 263, 135, 391, 71, 327, 199, 455, 39, 295, 167, 423, 103, 359, 231, 487, 23, 279, 151, 407, 87, 343, 215,
		471, 55, 311, 183, 439, 119, 375, 247, 503, 15, 271, 143, 399, 79, 335, 207, 463, 47, 303, 175, 431, 111, 367, 239, 495, 31, 287, 159, 415, 95,
		351, 223, 479, 63, 319, 191, 447, 127, 383, 255, 511, 0, 64, 32, 96, 16, 80, 48, 112, 8, 72, 40, 104, 24, 88, 56, 120, 4, 68, 36, 100, 20, 84, 52,
		116, 3, 131, 67, 195, 35, 163, 99, 227];
	const static_ltree2_second_part = extractArray([[144, 8], [112, 9], [24, 7], [8, 8]]);
	StaticTree.static_ltree = flatArray(static_ltree2_first_part.map((value, index) => [value, static_ltree2_second_part[index]]));

	const static_dtree_first_part = [0, 16, 8, 24, 4, 20, 12, 28, 2, 18, 10, 26, 6, 22, 14, 30, 1, 17, 9, 25, 5, 21, 13, 29, 3, 19, 11, 27, 7, 23];
	const static_dtree_second_part = extractArray([[30, 5]]);
	StaticTree.static_dtree = flatArray(static_dtree_first_part.map((value, index) => [value, static_dtree_second_part[index]]));

	StaticTree.static_l_desc = new StaticTree(StaticTree.static_ltree, Tree.extra_lbits, LITERALS + 1, L_CODES, MAX_BITS$1);

	StaticTree.static_d_desc = new StaticTree(StaticTree.static_dtree, Tree.extra_dbits, 0, D_CODES, MAX_BITS$1);

	StaticTree.static_bl_desc = new StaticTree(null, Tree.extra_blbits, 0, BL_CODES, MAX_BL_BITS);

	// Deflate

	const MAX_MEM_LEVEL = 9;
	const DEF_MEM_LEVEL = 8;

	function Config(good_length, max_lazy, nice_length, max_chain, func) {
		const that = this;
		that.good_length = good_length;
		that.max_lazy = max_lazy;
		that.nice_length = nice_length;
		that.max_chain = max_chain;
		that.func = func;
	}

	const STORED$1 = 0;
	const FAST = 1;
	const SLOW = 2;
	const config_table = [
		new Config(0, 0, 0, 0, STORED$1),
		new Config(4, 4, 8, 4, FAST),
		new Config(4, 5, 16, 8, FAST),
		new Config(4, 6, 32, 32, FAST),
		new Config(4, 4, 16, 16, SLOW),
		new Config(8, 16, 32, 32, SLOW),
		new Config(8, 16, 128, 128, SLOW),
		new Config(8, 32, 128, 256, SLOW),
		new Config(32, 128, 258, 1024, SLOW),
		new Config(32, 258, 258, 4096, SLOW)
	];

	const z_errmsg = ["need dictionary", // Z_NEED_DICT
		// 2
		"stream end", // Z_STREAM_END 1
		"", // Z_OK 0
		"", // Z_ERRNO (-1)
		"stream error", // Z_STREAM_ERROR (-2)
		"data error", // Z_DATA_ERROR (-3)
		"", // Z_MEM_ERROR (-4)
		"buffer error", // Z_BUF_ERROR (-5)
		"",// Z_VERSION_ERROR (-6)
		""];

	// block not completed, need more input or more output
	const NeedMore = 0;

	// block flush performed
	const BlockDone = 1;

	// finish started, need only more output at next deflate
	const FinishStarted = 2;

	// finish done, accept no more input or output
	const FinishDone = 3;

	// preset dictionary flag in zlib header
	const PRESET_DICT$1 = 0x20;

	const INIT_STATE = 42;
	const BUSY_STATE = 113;
	const FINISH_STATE = 666;

	// The deflate compression method
	const Z_DEFLATED$1 = 8;

	const STORED_BLOCK = 0;
	const STATIC_TREES = 1;
	const DYN_TREES = 2;

	const MIN_MATCH = 3;
	const MAX_MATCH = 258;
	const MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

	function smaller(tree, n, m, depth) {
		const tn2 = tree[n * 2];
		const tm2 = tree[m * 2];
		return (tn2 < tm2 || (tn2 == tm2 && depth[n] <= depth[m]));
	}

	function Deflate() {

		const that = this;
		let strm; // pointer back to this zlib stream
		let status; // as the name implies
		// pending_buf; // output still pending
		let pending_buf_size; // size of pending_buf
		// pending_out; // next pending byte to output to the stream
		// pending; // nb of bytes in the pending buffer

		// dist_buf; // buffer for distances
		// lc_buf; // buffer for literals or lengths
		// To simplify the code, dist_buf and lc_buf have the same number of elements.
		// To use different lengths, an extra flag array would be necessary.

		let last_flush; // value of flush param for previous deflate call

		let w_size; // LZ77 win size (32K by default)
		let w_bits; // log2(w_size) (8..16)
		let w_mask; // w_size - 1

		let win;
		// Sliding win. Input bytes are read into the second half of the win,
		// and move to the first half later to keep a dictionary of at least wSize
		// bytes. With this organization, matches are limited to a distance of
		// wSize-MAX_MATCH bytes, but this ensures that IO is always
		// performed with a length multiple of the block size. Also, it limits
		// the win size to 64K, which is quite useful on MSDOS.
		// To do: use the user input buffer as sliding win.

		let window_size;
		// Actual size of win: 2*wSize, except when the user input buffer
		// is directly used as sliding win.

		let prev;
		// Link to older string with same hash index. To limit the size of this
		// array to 64K, this link is maintained only for the last 32K strings.
		// An index in this array is thus a win index modulo 32K.

		let head; // Heads of the hash chains or NIL.

		let ins_h; // hash index of string to be inserted
		let hash_size; // number of elements in hash table
		let hash_bits; // log2(hash_size)
		let hash_mask; // hash_size-1

		// Number of bits by which ins_h must be shifted at each input
		// step. It must be such that after MIN_MATCH steps, the oldest
		// byte no longer takes part in the hash key, that is:
		// hash_shift * MIN_MATCH >= hash_bits
		let hash_shift;

		// Window position at the beginning of the current output block. Gets
		// negative when the win is moved backwards.

		let block_start;

		let match_length; // length of best match
		let prev_match; // previous match
		let match_available; // set if previous match exists
		let strstart; // start of string to insert
		let match_start; // start of matching string
		let lookahead; // number of valid bytes ahead in win

		// Length of the best match at previous step. Matches not greater than this
		// are discarded. This is used in the lazy match evaluation.
		let prev_length;

		// To speed up deflation, hash chains are never searched beyond this
		// length. A higher limit improves compression ratio but degrades the speed.
		let max_chain_length;

		// Attempt to find a better match only when the current match is strictly
		// smaller than this value. This mechanism is used only for compression
		// levels >= 4.
		let max_lazy_match;

		// Insert new strings in the hash table only if the match length is not
		// greater than this length. This saves time but degrades compression.
		// max_insert_length is used only for compression levels <= 3.

		let level; // compression level (1..9)
		let strategy; // favor or force Huffman coding

		// Use a faster search when the previous match is longer than this
		let good_match;

		// Stop searching when current match exceeds this
		let nice_match;

		let dyn_ltree; // literal and length tree
		let dyn_dtree; // distance tree
		let bl_tree; // Huffman tree for bit lengths

		const l_desc = new Tree(); // desc for literal tree
		const d_desc = new Tree(); // desc for distance tree
		const bl_desc = new Tree(); // desc for bit length tree

		// that.heap_len; // number of elements in the heap
		// that.heap_max; // element of largest frequency
		// The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
		// The same heap array is used to build all trees.

		// Depth of each subtree used as tie breaker for trees of equal frequency
		that.depth = [];

		// Size of match buffer for literals/lengths. There are 4 reasons for
		// limiting lit_bufsize to 64K:
		// - frequencies can be kept in 16 bit counters
		// - if compression is not successful for the first block, all input
		// data is still in the win so we can still emit a stored block even
		// when input comes from standard input. (This can also be done for
		// all blocks if lit_bufsize is not greater than 32K.)
		// - if compression is not successful for a file smaller than 64K, we can
		// even emit a stored file instead of a stored block (saving 5 bytes).
		// This is applicable only for zip (not gzip or zlib).
		// - creating new Huffman trees less frequently may not provide fast
		// adaptation to changes in the input data statistics. (Take for
		// example a binary file with poorly compressible code followed by
		// a highly compressible string table.) Smaller buffer sizes give
		// fast adaptation but have of course the overhead of transmitting
		// trees more frequently.
		// - I can't count above 4
		let lit_bufsize;

		let last_lit; // running index in dist_buf and lc_buf

		// that.opt_len; // bit length of current block with optimal trees
		// that.static_len; // bit length of current block with static trees
		let matches; // number of string matches in current block
		let last_eob_len; // bit length of EOB code for last block

		// Output buffer. bits are inserted starting at the bottom (least
		// significant bits).
		let bi_buf;

		// Number of valid bits in bi_buf. All bits above the last valid bit
		// are always zero.
		let bi_valid;

		// number of codes at each bit length for an optimal tree
		that.bl_count = [];

		// heap used to build the Huffman trees
		that.heap = [];

		dyn_ltree = [];
		dyn_dtree = [];
		bl_tree = [];

		function lm_init() {
			window_size = 2 * w_size;

			head[hash_size - 1] = 0;
			for (let i = 0; i < hash_size - 1; i++) {
				head[i] = 0;
			}

			// Set the default configuration parameters:
			max_lazy_match = config_table[level].max_lazy;
			good_match = config_table[level].good_length;
			nice_match = config_table[level].nice_length;
			max_chain_length = config_table[level].max_chain;

			strstart = 0;
			block_start = 0;
			lookahead = 0;
			match_length = prev_length = MIN_MATCH - 1;
			match_available = 0;
			ins_h = 0;
		}

		function init_block() {
			let i;
			// Initialize the trees.
			for (i = 0; i < L_CODES; i++)
				dyn_ltree[i * 2] = 0;
			for (i = 0; i < D_CODES; i++)
				dyn_dtree[i * 2] = 0;
			for (i = 0; i < BL_CODES; i++)
				bl_tree[i * 2] = 0;

			dyn_ltree[END_BLOCK * 2] = 1;
			that.opt_len = that.static_len = 0;
			last_lit = matches = 0;
		}

		// Initialize the tree data structures for a new zlib stream.
		function tr_init() {

			l_desc.dyn_tree = dyn_ltree;
			l_desc.stat_desc = StaticTree.static_l_desc;

			d_desc.dyn_tree = dyn_dtree;
			d_desc.stat_desc = StaticTree.static_d_desc;

			bl_desc.dyn_tree = bl_tree;
			bl_desc.stat_desc = StaticTree.static_bl_desc;

			bi_buf = 0;
			bi_valid = 0;
			last_eob_len = 8; // enough lookahead for inflate

			// Initialize the first block of the first file:
			init_block();
		}

		// Restore the heap property by moving down the tree starting at node k,
		// exchanging a node with the smallest of its two sons if necessary,
		// stopping
		// when the heap property is re-established (each father smaller than its
		// two sons).
		that.pqdownheap = function (tree, // the tree to restore
			k // node to move down
		) {
			const heap = that.heap;
			const v = heap[k];
			let j = k << 1; // left son of k
			while (j <= that.heap_len) {
				// Set j to the smallest of the two sons:
				if (j < that.heap_len && smaller(tree, heap[j + 1], heap[j], that.depth)) {
					j++;
				}
				// Exit if v is smaller than both sons
				if (smaller(tree, v, heap[j], that.depth))
					break;

				// Exchange v with the smallest son
				heap[k] = heap[j];
				k = j;
				// And continue down the tree, setting j to the left son of k
				j <<= 1;
			}
			heap[k] = v;
		};

		// Scan a literal or distance tree to determine the frequencies of the codes
		// in the bit length tree.
		function scan_tree(tree,// the tree to be scanned
			max_code // and its largest code of non zero frequency
		) {
			let prevlen = -1; // last emitted length
			let curlen; // length of current code
			let nextlen = tree[0 * 2 + 1]; // length of next code
			let count = 0; // repeat count of the current code
			let max_count = 7; // max repeat count
			let min_count = 4; // min repeat count

			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			}
			tree[(max_code + 1) * 2 + 1] = 0xffff; // guard

			for (let n = 0; n <= max_code; n++) {
				curlen = nextlen;
				nextlen = tree[(n + 1) * 2 + 1];
				if (++count < max_count && curlen == nextlen) {
					continue;
				} else if (count < min_count) {
					bl_tree[curlen * 2] += count;
				} else if (curlen !== 0) {
					if (curlen != prevlen)
						bl_tree[curlen * 2]++;
					bl_tree[REP_3_6 * 2]++;
				} else if (count <= 10) {
					bl_tree[REPZ_3_10 * 2]++;
				} else {
					bl_tree[REPZ_11_138 * 2]++;
				}
				count = 0;
				prevlen = curlen;
				if (nextlen === 0) {
					max_count = 138;
					min_count = 3;
				} else if (curlen == nextlen) {
					max_count = 6;
					min_count = 3;
				} else {
					max_count = 7;
					min_count = 4;
				}
			}
		}

		// Construct the Huffman tree for the bit lengths and return the index in
		// bl_order of the last bit length code to send.
		function build_bl_tree() {
			let max_blindex; // index of last bit length code of non zero freq

			// Determine the bit length frequencies for literal and distance trees
			scan_tree(dyn_ltree, l_desc.max_code);
			scan_tree(dyn_dtree, d_desc.max_code);

			// Build the bit length tree:
			bl_desc.build_tree(that);
			// opt_len now includes the length of the tree representations, except
			// the lengths of the bit lengths codes and the 5+5+4 bits for the
			// counts.

			// Determine the number of bit length codes to send. The pkzip format
			// requires that at least 4 bit length codes be sent. (appnote.txt says
			// 3 but the actual value used is 4.)
			for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
				if (bl_tree[Tree.bl_order[max_blindex] * 2 + 1] !== 0)
					break;
			}
			// Update opt_len to include the bit length tree and counts
			that.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;

			return max_blindex;
		}

		// Output a byte on the stream.
		// IN assertion: there is enough room in pending_buf.
		function put_byte(p) {
			that.pending_buf[that.pending++] = p;
		}

		function put_short(w) {
			put_byte(w & 0xff);
			put_byte((w >>> 8) & 0xff);
		}

		function putShortMSB(b) {
			put_byte((b >> 8) & 0xff);
			put_byte((b & 0xff) & 0xff);
		}

		function send_bits(value, length) {
			let val;
			const len = length;
			if (bi_valid > Buf_size - len) {
				val = value;
				// bi_buf |= (val << bi_valid);
				bi_buf |= ((val << bi_valid) & 0xffff);
				put_short(bi_buf);
				bi_buf = val >>> (Buf_size - bi_valid);
				bi_valid += len - Buf_size;
			} else {
				// bi_buf |= (value) << bi_valid;
				bi_buf |= (((value) << bi_valid) & 0xffff);
				bi_valid += len;
			}
		}

		function send_code(c, tree) {
			const c2 = c * 2;
			send_bits(tree[c2] & 0xffff, tree[c2 + 1] & 0xffff);
		}

		// Send a literal or distance tree in compressed form, using the codes in
		// bl_tree.
		function send_tree(tree,// the tree to be sent
			max_code // and its largest code of non zero frequency
		) {
			let n; // iterates over all tree elements
			let prevlen = -1; // last emitted length
			let curlen; // length of current code
			let nextlen = tree[0 * 2 + 1]; // length of next code
			let count = 0; // repeat count of the current code
			let max_count = 7; // max repeat count
			let min_count = 4; // min repeat count

			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			}

			for (n = 0; n <= max_code; n++) {
				curlen = nextlen;
				nextlen = tree[(n + 1) * 2 + 1];
				if (++count < max_count && curlen == nextlen) {
					continue;
				} else if (count < min_count) {
					do {
						send_code(curlen, bl_tree);
					} while (--count !== 0);
				} else if (curlen !== 0) {
					if (curlen != prevlen) {
						send_code(curlen, bl_tree);
						count--;
					}
					send_code(REP_3_6, bl_tree);
					send_bits(count - 3, 2);
				} else if (count <= 10) {
					send_code(REPZ_3_10, bl_tree);
					send_bits(count - 3, 3);
				} else {
					send_code(REPZ_11_138, bl_tree);
					send_bits(count - 11, 7);
				}
				count = 0;
				prevlen = curlen;
				if (nextlen === 0) {
					max_count = 138;
					min_count = 3;
				} else if (curlen == nextlen) {
					max_count = 6;
					min_count = 3;
				} else {
					max_count = 7;
					min_count = 4;
				}
			}
		}

		// Send the header for a block using dynamic Huffman trees: the counts, the
		// lengths of the bit length codes, the literal tree and the distance tree.
		// IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
		function send_all_trees(lcodes, dcodes, blcodes) {
			let rank; // index in bl_order

			send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
			send_bits(dcodes - 1, 5);
			send_bits(blcodes - 4, 4); // not -3 as stated in appnote.txt
			for (rank = 0; rank < blcodes; rank++) {
				send_bits(bl_tree[Tree.bl_order[rank] * 2 + 1], 3);
			}
			send_tree(dyn_ltree, lcodes - 1); // literal tree
			send_tree(dyn_dtree, dcodes - 1); // distance tree
		}

		// Flush the bit buffer, keeping at most 7 bits in it.
		function bi_flush() {
			if (bi_valid == 16) {
				put_short(bi_buf);
				bi_buf = 0;
				bi_valid = 0;
			} else if (bi_valid >= 8) {
				put_byte(bi_buf & 0xff);
				bi_buf >>>= 8;
				bi_valid -= 8;
			}
		}

		// Send one empty static block to give enough lookahead for inflate.
		// This takes 10 bits, of which 7 may remain in the bit buffer.
		// The current inflate code requires 9 bits of lookahead. If the
		// last two codes for the previous block (real code plus EOB) were coded
		// on 5 bits or less, inflate may have only 5+3 bits of lookahead to decode
		// the last real code. In this case we send two empty static blocks instead
		// of one. (There are no problems if the previous block is stored or fixed.)
		// To simplify the code, we assume the worst case of last real code encoded
		// on one bit only.
		function _tr_align() {
			send_bits(STATIC_TREES << 1, 3);
			send_code(END_BLOCK, StaticTree.static_ltree);

			bi_flush();

			// Of the 10 bits for the empty block, we have already sent
			// (10 - bi_valid) bits. The lookahead for the last real code (before
			// the EOB of the previous block) was thus at least one plus the length
			// of the EOB plus what we have just sent of the empty static block.
			if (1 + last_eob_len + 10 - bi_valid < 9) {
				send_bits(STATIC_TREES << 1, 3);
				send_code(END_BLOCK, StaticTree.static_ltree);
				bi_flush();
			}
			last_eob_len = 7;
		}

		// Save the match info and tally the frequency counts. Return true if
		// the current block must be flushed.
		function _tr_tally(dist, // distance of matched string
			lc // match length-MIN_MATCH or unmatched char (if dist==0)
		) {
			let out_length, in_length, dcode;
			that.dist_buf[last_lit] = dist;
			that.lc_buf[last_lit] = lc & 0xff;
			last_lit++;

			if (dist === 0) {
				// lc is the unmatched char
				dyn_ltree[lc * 2]++;
			} else {
				matches++;
				// Here, lc is the match length - MIN_MATCH
				dist--; // dist = match distance - 1
				dyn_ltree[(Tree._length_code[lc] + LITERALS + 1) * 2]++;
				dyn_dtree[Tree.d_code(dist) * 2]++;
			}

			if ((last_lit & 0x1fff) === 0 && level > 2) {
				// Compute an upper bound for the compressed length
				out_length = last_lit * 8;
				in_length = strstart - block_start;
				for (dcode = 0; dcode < D_CODES; dcode++) {
					out_length += dyn_dtree[dcode * 2] * (5 + Tree.extra_dbits[dcode]);
				}
				out_length >>>= 3;
				if ((matches < Math.floor(last_lit / 2)) && out_length < Math.floor(in_length / 2))
					return true;
			}

			return (last_lit == lit_bufsize - 1);
			// We avoid equality with lit_bufsize because of wraparound at 64K
			// on 16 bit machines and because stored blocks are restricted to
			// 64K-1 bytes.
		}

		// Send the block data compressed using the given Huffman trees
		function compress_block(ltree, dtree) {
			let dist; // distance of matched string
			let lc; // match length or unmatched char (if dist === 0)
			let lx = 0; // running index in dist_buf and lc_buf
			let code; // the code to send
			let extra; // number of extra bits to send

			if (last_lit !== 0) {
				do {
					dist = that.dist_buf[lx];
					lc = that.lc_buf[lx];
					lx++;

					if (dist === 0) {
						send_code(lc, ltree); // send a literal byte
					} else {
						// Here, lc is the match length - MIN_MATCH
						code = Tree._length_code[lc];

						send_code(code + LITERALS + 1, ltree); // send the length
						// code
						extra = Tree.extra_lbits[code];
						if (extra !== 0) {
							lc -= Tree.base_length[code];
							send_bits(lc, extra); // send the extra length bits
						}
						dist--; // dist is now the match distance - 1
						code = Tree.d_code(dist);

						send_code(code, dtree); // send the distance code
						extra = Tree.extra_dbits[code];
						if (extra !== 0) {
							dist -= Tree.base_dist[code];
							send_bits(dist, extra); // send the extra distance bits
						}
					} // literal or match pair ?
				} while (lx < last_lit);
			}

			send_code(END_BLOCK, ltree);
			last_eob_len = ltree[END_BLOCK * 2 + 1];
		}

		// Flush the bit buffer and align the output on a byte boundary
		function bi_windup() {
			if (bi_valid > 8) {
				put_short(bi_buf);
			} else if (bi_valid > 0) {
				put_byte(bi_buf & 0xff);
			}
			bi_buf = 0;
			bi_valid = 0;
		}

		// Copy a stored block, storing first the length and its
		// one's complement if requested.
		function copy_block(buf, // the input data
			len, // its length
			header // true if block header must be written
		) {
			bi_windup(); // align on byte boundary
			last_eob_len = 8; // enough lookahead for inflate

			if (header) {
				put_short(len);
				put_short(~len);
			}

			that.pending_buf.set(win.subarray(buf, buf + len), that.pending);
			that.pending += len;
		}

		// Send a stored block
		function _tr_stored_block(buf, // input block
			stored_len, // length of input block
			eof // true if this is the last block for a file
		) {
			send_bits((STORED_BLOCK << 1) + (eof ? 1 : 0), 3); // send block type
			copy_block(buf, stored_len, true); // with header
		}

		// Determine the best encoding for the current block: dynamic trees, static
		// trees or store, and output the encoded block to the zip file.
		function _tr_flush_block(buf, // input block, or NULL if too old
			stored_len, // length of input block
			eof // true if this is the last block for a file
		) {
			let opt_lenb, static_lenb;// opt_len and static_len in bytes
			let max_blindex = 0; // index of last bit length code of non zero freq

			// Build the Huffman trees unless a stored block is forced
			if (level > 0) {
				// Construct the literal and distance trees
				l_desc.build_tree(that);

				d_desc.build_tree(that);

				// At this point, opt_len and static_len are the total bit lengths
				// of
				// the compressed block data, excluding the tree representations.

				// Build the bit length tree for the above two trees, and get the
				// index
				// in bl_order of the last bit length code to send.
				max_blindex = build_bl_tree();

				// Determine the best encoding. Compute first the block length in
				// bytes
				opt_lenb = (that.opt_len + 3 + 7) >>> 3;
				static_lenb = (that.static_len + 3 + 7) >>> 3;

				if (static_lenb <= opt_lenb)
					opt_lenb = static_lenb;
			} else {
				opt_lenb = static_lenb = stored_len + 5; // force a stored block
			}

			if ((stored_len + 4 <= opt_lenb) && buf != -1) {
				// 4: two words for the lengths
				// The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
				// Otherwise we can't have processed more than WSIZE input bytes
				// since
				// the last block flush, because compression would have been
				// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
				// transform a block into a stored block.
				_tr_stored_block(buf, stored_len, eof);
			} else if (static_lenb == opt_lenb) {
				send_bits((STATIC_TREES << 1) + (eof ? 1 : 0), 3);
				compress_block(StaticTree.static_ltree, StaticTree.static_dtree);
			} else {
				send_bits((DYN_TREES << 1) + (eof ? 1 : 0), 3);
				send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
				compress_block(dyn_ltree, dyn_dtree);
			}

			// The above check is made mod 2^32, for files larger than 512 MB
			// and uLong implemented on 32 bits.

			init_block();

			if (eof) {
				bi_windup();
			}
		}

		function flush_block_only(eof) {
			_tr_flush_block(block_start >= 0 ? block_start : -1, strstart - block_start, eof);
			block_start = strstart;
			strm.flush_pending();
		}

		// Fill the win when the lookahead becomes insufficient.
		// Updates strstart and lookahead.
		//
		// IN assertion: lookahead < MIN_LOOKAHEAD
		// OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
		// At least one byte has been read, or avail_in === 0; reads are
		// performed for at least two bytes (required for the zip translate_eol
		// option -- not supported here).
		function fill_window() {
			let n, m;
			let p;
			let more; // Amount of free space at the end of the win.

			do {
				more = (window_size - lookahead - strstart);

				// Deal with !@#$% 64K limit:
				if (more === 0 && strstart === 0 && lookahead === 0) {
					more = w_size;
				} else if (more == -1) {
					// Very unlikely, but possible on 16 bit machine if strstart ==
					// 0
					// and lookahead == 1 (input done one byte at time)
					more--;

					// If the win is almost full and there is insufficient
					// lookahead,
					// move the upper half to the lower one to make room in the
					// upper half.
				} else if (strstart >= w_size + w_size - MIN_LOOKAHEAD) {
					win.set(win.subarray(w_size, w_size + w_size), 0);

					match_start -= w_size;
					strstart -= w_size; // we now have strstart >= MAX_DIST
					block_start -= w_size;

					// Slide the hash table (could be avoided with 32 bit values
					// at the expense of memory usage). We slide even when level ==
					// 0
					// to keep the hash table consistent if we switch back to level
					// > 0
					// later. (Using level 0 permanently is not an optimal usage of
					// zlib, so we don't care about this pathological case.)

					n = hash_size;
					p = n;
					do {
						m = (head[--p] & 0xffff);
						head[p] = (m >= w_size ? m - w_size : 0);
					} while (--n !== 0);

					n = w_size;
					p = n;
					do {
						m = (prev[--p] & 0xffff);
						prev[p] = (m >= w_size ? m - w_size : 0);
						// If n is not on any hash chain, prev[n] is garbage but
						// its value will never be used.
					} while (--n !== 0);
					more += w_size;
				}

				if (strm.avail_in === 0)
					return;

				// If there was no sliding:
				// strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
				// more == window_size - lookahead - strstart
				// => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
				// => more >= window_size - 2*WSIZE + 2
				// In the BIG_MEM or MMAP case (not yet supported),
				// window_size == input_size + MIN_LOOKAHEAD &&
				// strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
				// Otherwise, window_size == 2*WSIZE so more >= 2.
				// If there was sliding, more >= WSIZE. So in all cases, more >= 2.

				n = strm.read_buf(win, strstart + lookahead, more);
				lookahead += n;

				// Initialize the hash value now that we have some input:
				if (lookahead >= MIN_MATCH) {
					ins_h = win[strstart] & 0xff;
					ins_h = (((ins_h) << hash_shift) ^ (win[strstart + 1] & 0xff)) & hash_mask;
				}
				// If the whole input has less than MIN_MATCH bytes, ins_h is
				// garbage,
				// but this is not important since only literal bytes will be
				// emitted.
			} while (lookahead < MIN_LOOKAHEAD && strm.avail_in !== 0);
		}

		// Copy without compression as much as possible from the input stream,
		// return
		// the current block state.
		// This function does not insert new strings in the dictionary since
		// uncompressible data is probably not useful. This function is used
		// only for the level=0 compression option.
		// NOTE: this function should be optimized to avoid extra copying from
		// win to pending_buf.
		function deflate_stored(flush) {
			// Stored blocks are limited to 0xffff bytes, pending_buf is limited
			// to pending_buf_size, and each stored block has a 5 byte header:

			let max_block_size = 0xffff;
			let max_start;

			if (max_block_size > pending_buf_size - 5) {
				max_block_size = pending_buf_size - 5;
			}

			// Copy as much as possible from input to output:
			// eslint-disable-next-line no-constant-condition
			while (true) {
				// Fill the win as much as possible:
				if (lookahead <= 1) {
					fill_window();
					if (lookahead === 0 && flush == Z_NO_FLUSH$1)
						return NeedMore;
					if (lookahead === 0)
						break; // flush the current block
				}

				strstart += lookahead;
				lookahead = 0;

				// Emit a stored block if pending_buf will be full:
				max_start = block_start + max_block_size;
				if (strstart === 0 || strstart >= max_start) {
					// strstart === 0 is possible when wraparound on 16-bit machine
					lookahead = (strstart - max_start);
					strstart = max_start;

					flush_block_only(false);
					if (strm.avail_out === 0)
						return NeedMore;

				}

				// Flush if we may have to slide, otherwise block_start may become
				// negative and the data will be gone:
				if (strstart - block_start >= w_size - MIN_LOOKAHEAD) {
					flush_block_only(false);
					if (strm.avail_out === 0)
						return NeedMore;
				}
			}

			flush_block_only(flush == Z_FINISH$1);
			if (strm.avail_out === 0)
				return (flush == Z_FINISH$1) ? FinishStarted : NeedMore;

			return flush == Z_FINISH$1 ? FinishDone : BlockDone;
		}

		function longest_match(cur_match) {
			let chain_length = max_chain_length; // max hash chain length
			let scan = strstart; // current string
			let match; // matched string
			let len; // length of current match
			let best_len = prev_length; // best match length so far
			const limit = strstart > (w_size - MIN_LOOKAHEAD) ? strstart - (w_size - MIN_LOOKAHEAD) : 0;
			let _nice_match = nice_match;

			// Stop when cur_match becomes <= limit. To simplify the code,
			// we prevent matches with the string of win index 0.

			const wmask = w_mask;

			const strend = strstart + MAX_MATCH;
			let scan_end1 = win[scan + best_len - 1];
			let scan_end = win[scan + best_len];

			// The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of
			// 16.
			// It is easy to get rid of this optimization if necessary.

			// Do not waste too much time if we already have a good match:
			if (prev_length >= good_match) {
				chain_length >>= 2;
			}

			// Do not look for matches beyond the end of the input. This is
			// necessary
			// to make deflate deterministic.
			if (_nice_match > lookahead)
				_nice_match = lookahead;

			do {
				match = cur_match;

				// Skip to next match if the match length cannot increase
				// or if the match length is less than 2:
				if (win[match + best_len] != scan_end || win[match + best_len - 1] != scan_end1 || win[match] != win[scan]
					|| win[++match] != win[scan + 1])
					continue;

				// The check at best_len-1 can be removed because it will be made
				// again later. (This heuristic is not always a win.)
				// It is not necessary to compare scan[2] and match[2] since they
				// are always equal when the other bytes match, given that
				// the hash keys are equal and that HASH_BITS >= 8.
				scan += 2;
				match++;

				// We check for insufficient lookahead only every 8th comparison;
				// the 256th check will be made at strstart+258.
				// eslint-disable-next-line no-empty
				do {
					// empty block
				} while (win[++scan] == win[++match] && win[++scan] == win[++match] && win[++scan] == win[++match]
				&& win[++scan] == win[++match] && win[++scan] == win[++match] && win[++scan] == win[++match]
				&& win[++scan] == win[++match] && win[++scan] == win[++match] && scan < strend);

				len = MAX_MATCH - (strend - scan);
				scan = strend - MAX_MATCH;

				if (len > best_len) {
					match_start = cur_match;
					best_len = len;
					if (len >= _nice_match)
						break;
					scan_end1 = win[scan + best_len - 1];
					scan_end = win[scan + best_len];
				}

			} while ((cur_match = (prev[cur_match & wmask] & 0xffff)) > limit && --chain_length !== 0);

			if (best_len <= lookahead)
				return best_len;
			return lookahead;
		}

		// Compress as much as possible from the input stream, return the current
		// block state.
		// This function does not perform lazy evaluation of matches and inserts
		// new strings in the dictionary only for unmatched strings or for short
		// matches. It is used only for the fast compression options.
		function deflate_fast(flush) {
			// short hash_head = 0; // head of the hash chain
			let hash_head = 0; // head of the hash chain
			let bflush; // set if current block must be flushed

			// eslint-disable-next-line no-constant-condition
			while (true) {
				// Make sure that we always have enough lookahead, except
				// at the end of the input file. We need MAX_MATCH bytes
				// for the next match, plus MIN_MATCH bytes to insert the
				// string following the next match.
				if (lookahead < MIN_LOOKAHEAD) {
					fill_window();
					if (lookahead < MIN_LOOKAHEAD && flush == Z_NO_FLUSH$1) {
						return NeedMore;
					}
					if (lookahead === 0)
						break; // flush the current block
				}

				// Insert the string win[strstart .. strstart+2] in the
				// dictionary, and set hash_head to the head of the hash chain:
				if (lookahead >= MIN_MATCH) {
					ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;

					// prev[strstart&w_mask]=hash_head=head[ins_h];
					hash_head = (head[ins_h] & 0xffff);
					prev[strstart & w_mask] = head[ins_h];
					head[ins_h] = strstart;
				}

				// Find the longest match, discarding those <= prev_length.
				// At this point we have always match_length < MIN_MATCH

				if (hash_head !== 0 && ((strstart - hash_head) & 0xffff) <= w_size - MIN_LOOKAHEAD) {
					// To simplify the code, we prevent matches with the string
					// of win index 0 (in particular we have to avoid a match
					// of the string with itself at the start of the input file).
					if (strategy != Z_HUFFMAN_ONLY) {
						match_length = longest_match(hash_head);
					}
					// longest_match() sets match_start
				}
				if (match_length >= MIN_MATCH) {
					// check_match(strstart, match_start, match_length);

					bflush = _tr_tally(strstart - match_start, match_length - MIN_MATCH);

					lookahead -= match_length;

					// Insert new strings in the hash table only if the match length
					// is not too large. This saves time but degrades compression.
					if (match_length <= max_lazy_match && lookahead >= MIN_MATCH) {
						match_length--; // string at strstart already in hash table
						do {
							strstart++;

							ins_h = ((ins_h << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
							// prev[strstart&w_mask]=hash_head=head[ins_h];
							hash_head = (head[ins_h] & 0xffff);
							prev[strstart & w_mask] = head[ins_h];
							head[ins_h] = strstart;

							// strstart never exceeds WSIZE-MAX_MATCH, so there are
							// always MIN_MATCH bytes ahead.
						} while (--match_length !== 0);
						strstart++;
					} else {
						strstart += match_length;
						match_length = 0;
						ins_h = win[strstart] & 0xff;

						ins_h = (((ins_h) << hash_shift) ^ (win[strstart + 1] & 0xff)) & hash_mask;
						// If lookahead < MIN_MATCH, ins_h is garbage, but it does
						// not
						// matter since it will be recomputed at next deflate call.
					}
				} else {
					// No match, output a literal byte

					bflush = _tr_tally(0, win[strstart] & 0xff);
					lookahead--;
					strstart++;
				}
				if (bflush) {

					flush_block_only(false);
					if (strm.avail_out === 0)
						return NeedMore;
				}
			}

			flush_block_only(flush == Z_FINISH$1);
			if (strm.avail_out === 0) {
				if (flush == Z_FINISH$1)
					return FinishStarted;
				else
					return NeedMore;
			}
			return flush == Z_FINISH$1 ? FinishDone : BlockDone;
		}

		// Same as above, but achieves better compression. We use a lazy
		// evaluation for matches: a match is finally adopted only if there is
		// no better match at the next win position.
		function deflate_slow(flush) {
			// short hash_head = 0; // head of hash chain
			let hash_head = 0; // head of hash chain
			let bflush; // set if current block must be flushed
			let max_insert;

			// Process the input block.
			// eslint-disable-next-line no-constant-condition
			while (true) {
				// Make sure that we always have enough lookahead, except
				// at the end of the input file. We need MAX_MATCH bytes
				// for the next match, plus MIN_MATCH bytes to insert the
				// string following the next match.

				if (lookahead < MIN_LOOKAHEAD) {
					fill_window();
					if (lookahead < MIN_LOOKAHEAD && flush == Z_NO_FLUSH$1) {
						return NeedMore;
					}
					if (lookahead === 0)
						break; // flush the current block
				}

				// Insert the string win[strstart .. strstart+2] in the
				// dictionary, and set hash_head to the head of the hash chain:

				if (lookahead >= MIN_MATCH) {
					ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
					// prev[strstart&w_mask]=hash_head=head[ins_h];
					hash_head = (head[ins_h] & 0xffff);
					prev[strstart & w_mask] = head[ins_h];
					head[ins_h] = strstart;
				}

				// Find the longest match, discarding those <= prev_length.
				prev_length = match_length;
				prev_match = match_start;
				match_length = MIN_MATCH - 1;

				if (hash_head !== 0 && prev_length < max_lazy_match && ((strstart - hash_head) & 0xffff) <= w_size - MIN_LOOKAHEAD) {
					// To simplify the code, we prevent matches with the string
					// of win index 0 (in particular we have to avoid a match
					// of the string with itself at the start of the input file).

					if (strategy != Z_HUFFMAN_ONLY) {
						match_length = longest_match(hash_head);
					}
					// longest_match() sets match_start

					if (match_length <= 5 && (strategy == Z_FILTERED || (match_length == MIN_MATCH && strstart - match_start > 4096))) {

						// If prev_match is also MIN_MATCH, match_start is garbage
						// but we will ignore the current match anyway.
						match_length = MIN_MATCH - 1;
					}
				}

				// If there was a match at the previous step and the current
				// match is not better, output the previous match:
				if (prev_length >= MIN_MATCH && match_length <= prev_length) {
					max_insert = strstart + lookahead - MIN_MATCH;
					// Do not insert strings in hash table beyond this.

					// check_match(strstart-1, prev_match, prev_length);

					bflush = _tr_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);

					// Insert in hash table all strings up to the end of the match.
					// strstart-1 and strstart are already inserted. If there is not
					// enough lookahead, the last two strings are not inserted in
					// the hash table.
					lookahead -= prev_length - 1;
					prev_length -= 2;
					do {
						if (++strstart <= max_insert) {
							ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
							// prev[strstart&w_mask]=hash_head=head[ins_h];
							hash_head = (head[ins_h] & 0xffff);
							prev[strstart & w_mask] = head[ins_h];
							head[ins_h] = strstart;
						}
					} while (--prev_length !== 0);
					match_available = 0;
					match_length = MIN_MATCH - 1;
					strstart++;

					if (bflush) {
						flush_block_only(false);
						if (strm.avail_out === 0)
							return NeedMore;
					}
				} else if (match_available !== 0) {

					// If there was no match at the previous position, output a
					// single literal. If there was a match but the current match
					// is longer, truncate the previous match to a single literal.

					bflush = _tr_tally(0, win[strstart - 1] & 0xff);

					if (bflush) {
						flush_block_only(false);
					}
					strstart++;
					lookahead--;
					if (strm.avail_out === 0)
						return NeedMore;
				} else {
					// There is no previous match to compare with, wait for
					// the next step to decide.

					match_available = 1;
					strstart++;
					lookahead--;
				}
			}

			if (match_available !== 0) {
				bflush = _tr_tally(0, win[strstart - 1] & 0xff);
				match_available = 0;
			}
			flush_block_only(flush == Z_FINISH$1);

			if (strm.avail_out === 0) {
				if (flush == Z_FINISH$1)
					return FinishStarted;
				else
					return NeedMore;
			}

			return flush == Z_FINISH$1 ? FinishDone : BlockDone;
		}

		function deflateReset(strm) {
			strm.total_in = strm.total_out = 0;
			strm.msg = null; //

			that.pending = 0;
			that.pending_out = 0;

			status = BUSY_STATE;

			last_flush = Z_NO_FLUSH$1;

			tr_init();
			lm_init();
			return Z_OK$1;
		}

		that.deflateInit = function (strm, _level, bits, _method, memLevel, _strategy) {
			if (!_method)
				_method = Z_DEFLATED$1;
			if (!memLevel)
				memLevel = DEF_MEM_LEVEL;
			if (!_strategy)
				_strategy = Z_DEFAULT_STRATEGY;

			// byte[] my_version=ZLIB_VERSION;

			//
			// if (!version || version[0] != my_version[0]
			// || stream_size != sizeof(z_stream)) {
			// return Z_VERSION_ERROR;
			// }

			strm.msg = null;

			if (_level == Z_DEFAULT_COMPRESSION)
				_level = 6;

			if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || _method != Z_DEFLATED$1 || bits < 9 || bits > 15 || _level < 0 || _level > 9 || _strategy < 0
				|| _strategy > Z_HUFFMAN_ONLY) {
				return Z_STREAM_ERROR$1;
			}

			strm.dstate = that;

			w_bits = bits;
			w_size = 1 << w_bits;
			w_mask = w_size - 1;

			hash_bits = memLevel + 7;
			hash_size = 1 << hash_bits;
			hash_mask = hash_size - 1;
			hash_shift = Math.floor((hash_bits + MIN_MATCH - 1) / MIN_MATCH);

			win = new Uint8Array(w_size * 2);
			prev = [];
			head = [];

			lit_bufsize = 1 << (memLevel + 6); // 16K elements by default

			that.pending_buf = new Uint8Array(lit_bufsize * 4);
			pending_buf_size = lit_bufsize * 4;

			that.dist_buf = new Uint16Array(lit_bufsize);
			that.lc_buf = new Uint8Array(lit_bufsize);

			level = _level;

			strategy = _strategy;

			return deflateReset(strm);
		};

		that.deflateEnd = function () {
			if (status != INIT_STATE && status != BUSY_STATE && status != FINISH_STATE) {
				return Z_STREAM_ERROR$1;
			}
			// Deallocate in reverse order of allocations:
			that.lc_buf = null;
			that.dist_buf = null;
			that.pending_buf = null;
			head = null;
			prev = null;
			win = null;
			// free
			that.dstate = null;
			return status == BUSY_STATE ? Z_DATA_ERROR$1 : Z_OK$1;
		};

		that.deflateParams = function (strm, _level, _strategy) {
			let err = Z_OK$1;

			if (_level == Z_DEFAULT_COMPRESSION) {
				_level = 6;
			}
			if (_level < 0 || _level > 9 || _strategy < 0 || _strategy > Z_HUFFMAN_ONLY) {
				return Z_STREAM_ERROR$1;
			}

			if (config_table[level].func != config_table[_level].func && strm.total_in !== 0) {
				// Flush the last buffer:
				err = strm.deflate(Z_PARTIAL_FLUSH);
			}

			if (level != _level) {
				level = _level;
				max_lazy_match = config_table[level].max_lazy;
				good_match = config_table[level].good_length;
				nice_match = config_table[level].nice_length;
				max_chain_length = config_table[level].max_chain;
			}
			strategy = _strategy;
			return err;
		};

		that.deflateSetDictionary = function (_strm, dictionary, dictLength) {
			let length = dictLength;
			let n, index = 0;

			if (!dictionary || status != INIT_STATE)
				return Z_STREAM_ERROR$1;

			if (length < MIN_MATCH)
				return Z_OK$1;
			if (length > w_size - MIN_LOOKAHEAD) {
				length = w_size - MIN_LOOKAHEAD;
				index = dictLength - length; // use the tail of the dictionary
			}
			win.set(dictionary.subarray(index, index + length), 0);

			strstart = length;
			block_start = length;

			// Insert all strings in the hash table (except for the last two bytes).
			// s->lookahead stays null, so s->ins_h will be recomputed at the next
			// call of fill_window.

			ins_h = win[0] & 0xff;
			ins_h = (((ins_h) << hash_shift) ^ (win[1] & 0xff)) & hash_mask;

			for (n = 0; n <= length - MIN_MATCH; n++) {
				ins_h = (((ins_h) << hash_shift) ^ (win[(n) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
				prev[n & w_mask] = head[ins_h];
				head[ins_h] = n;
			}
			return Z_OK$1;
		};

		that.deflate = function (_strm, flush) {
			let i, header, level_flags, old_flush, bstate;

			if (flush > Z_FINISH$1 || flush < 0) {
				return Z_STREAM_ERROR$1;
			}

			if (!_strm.next_out || (!_strm.next_in && _strm.avail_in !== 0) || (status == FINISH_STATE && flush != Z_FINISH$1)) {
				_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_STREAM_ERROR$1)];
				return Z_STREAM_ERROR$1;
			}
			if (_strm.avail_out === 0) {
				_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
				return Z_BUF_ERROR$1;
			}

			strm = _strm; // just in case
			old_flush = last_flush;
			last_flush = flush;

			// Write the zlib header
			if (status == INIT_STATE) {
				header = (Z_DEFLATED$1 + ((w_bits - 8) << 4)) << 8;
				level_flags = ((level - 1) & 0xff) >> 1;

				if (level_flags > 3)
					level_flags = 3;
				header |= (level_flags << 6);
				if (strstart !== 0)
					header |= PRESET_DICT$1;
				header += 31 - (header % 31);

				status = BUSY_STATE;
				putShortMSB(header);
			}

			// Flush as much pending output as possible
			if (that.pending !== 0) {
				strm.flush_pending();
				if (strm.avail_out === 0) {
					// console.log(" avail_out==0");
					// Since avail_out is 0, deflate will be called again with
					// more output space, but possibly with both pending and
					// avail_in equal to zero. There won't be anything to do,
					// but this is not an error situation so make sure we
					// return OK instead of BUF_ERROR at next call of deflate:
					last_flush = -1;
					return Z_OK$1;
				}

				// Make sure there is something to do and avoid duplicate
				// consecutive
				// flushes. For repeated and useless calls with Z_FINISH, we keep
				// returning Z_STREAM_END instead of Z_BUFF_ERROR.
			} else if (strm.avail_in === 0 && flush <= old_flush && flush != Z_FINISH$1) {
				strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
				return Z_BUF_ERROR$1;
			}

			// User must not provide more input after the first FINISH:
			if (status == FINISH_STATE && strm.avail_in !== 0) {
				_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
				return Z_BUF_ERROR$1;
			}

			// Start a new block or continue the current one.
			if (strm.avail_in !== 0 || lookahead !== 0 || (flush != Z_NO_FLUSH$1 && status != FINISH_STATE)) {
				bstate = -1;
				switch (config_table[level].func) {
					case STORED$1:
						bstate = deflate_stored(flush);
						break;
					case FAST:
						bstate = deflate_fast(flush);
						break;
					case SLOW:
						bstate = deflate_slow(flush);
						break;
				}

				if (bstate == FinishStarted || bstate == FinishDone) {
					status = FINISH_STATE;
				}
				if (bstate == NeedMore || bstate == FinishStarted) {
					if (strm.avail_out === 0) {
						last_flush = -1; // avoid BUF_ERROR next call, see above
					}
					return Z_OK$1;
					// If flush != Z_NO_FLUSH && avail_out === 0, the next call
					// of deflate should use the same flush parameter to make sure
					// that the flush is complete. So we don't have to output an
					// empty block here, this will be done at next call. This also
					// ensures that for a very small output buffer, we emit at most
					// one empty block.
				}

				if (bstate == BlockDone) {
					if (flush == Z_PARTIAL_FLUSH) {
						_tr_align();
					} else { // FULL_FLUSH or SYNC_FLUSH
						_tr_stored_block(0, 0, false);
						// For a full flush, this empty block will be recognized
						// as a special marker by inflate_sync().
						if (flush == Z_FULL_FLUSH) {
							// state.head[s.hash_size-1]=0;
							for (i = 0; i < hash_size/*-1*/; i++)
								// forget history
								head[i] = 0;
						}
					}
					strm.flush_pending();
					if (strm.avail_out === 0) {
						last_flush = -1; // avoid BUF_ERROR at next call, see above
						return Z_OK$1;
					}
				}
			}

			if (flush != Z_FINISH$1)
				return Z_OK$1;
			return Z_STREAM_END$1;
		};
	}

	// ZStream

	function ZStream$1() {
		const that = this;
		that.next_in_index = 0;
		that.next_out_index = 0;
		// that.next_in; // next input byte
		that.avail_in = 0; // number of bytes available at next_in
		that.total_in = 0; // total nb of input bytes read so far
		// that.next_out; // next output byte should be put there
		that.avail_out = 0; // remaining free space at next_out
		that.total_out = 0; // total nb of bytes output so far
		// that.msg;
		// that.dstate;
	}

	ZStream$1.prototype = {
		deflateInit(level, bits) {
			const that = this;
			that.dstate = new Deflate();
			if (!bits)
				bits = MAX_BITS$1;
			return that.dstate.deflateInit(that, level, bits);
		},

		deflate(flush) {
			const that = this;
			if (!that.dstate) {
				return Z_STREAM_ERROR$1;
			}
			return that.dstate.deflate(that, flush);
		},

		deflateEnd() {
			const that = this;
			if (!that.dstate)
				return Z_STREAM_ERROR$1;
			const ret = that.dstate.deflateEnd();
			that.dstate = null;
			return ret;
		},

		deflateParams(level, strategy) {
			const that = this;
			if (!that.dstate)
				return Z_STREAM_ERROR$1;
			return that.dstate.deflateParams(that, level, strategy);
		},

		deflateSetDictionary(dictionary, dictLength) {
			const that = this;
			if (!that.dstate)
				return Z_STREAM_ERROR$1;
			return that.dstate.deflateSetDictionary(that, dictionary, dictLength);
		},

		// Read a new buffer from the current input stream, update the
		// total number of bytes read. All deflate() input goes through
		// this function so some applications may wish to modify it to avoid
		// allocating a large strm->next_in buffer and copying from it.
		// (See also flush_pending()).
		read_buf(buf, start, size) {
			const that = this;
			let len = that.avail_in;
			if (len > size)
				len = size;
			if (len === 0)
				return 0;
			that.avail_in -= len;
			buf.set(that.next_in.subarray(that.next_in_index, that.next_in_index + len), start);
			that.next_in_index += len;
			that.total_in += len;
			return len;
		},

		// Flush as much pending output as possible. All deflate() output goes
		// through this function so some applications may wish to modify it
		// to avoid allocating a large strm->next_out buffer and copying into it.
		// (See also read_buf()).
		flush_pending() {
			const that = this;
			let len = that.dstate.pending;

			if (len > that.avail_out)
				len = that.avail_out;
			if (len === 0)
				return;

			// if (that.dstate.pending_buf.length <= that.dstate.pending_out || that.next_out.length <= that.next_out_index
			// || that.dstate.pending_buf.length < (that.dstate.pending_out + len) || that.next_out.length < (that.next_out_index +
			// len)) {
			// console.log(that.dstate.pending_buf.length + ", " + that.dstate.pending_out + ", " + that.next_out.length + ", " +
			// that.next_out_index + ", " + len);
			// console.log("avail_out=" + that.avail_out);
			// }

			that.next_out.set(that.dstate.pending_buf.subarray(that.dstate.pending_out, that.dstate.pending_out + len), that.next_out_index);

			that.next_out_index += len;
			that.dstate.pending_out += len;
			that.total_out += len;
			that.avail_out -= len;
			that.dstate.pending -= len;
			if (that.dstate.pending === 0) {
				that.dstate.pending_out = 0;
			}
		}
	};

	// Deflate

	function ZipDeflate(options) {
		const that = this;
		const z = new ZStream$1();
		const bufsize = getMaximumCompressedSize(options && options.chunkSize ? options.chunkSize : 64 * 1024);
		const flush = Z_NO_FLUSH$1;
		const buf = new Uint8Array(bufsize);
		let level = options ? options.level : Z_DEFAULT_COMPRESSION;
		if (typeof level == "undefined")
			level = Z_DEFAULT_COMPRESSION;
		z.deflateInit(level);
		z.next_out = buf;

		that.append = function (data, onprogress) {
			let err, array, lastIndex = 0, bufferIndex = 0, bufferSize = 0;
			const buffers = [];
			if (!data.length)
				return;
			z.next_in_index = 0;
			z.next_in = data;
			z.avail_in = data.length;
			do {
				z.next_out_index = 0;
				z.avail_out = bufsize;
				err = z.deflate(flush);
				if (err != Z_OK$1)
					throw new Error("deflating: " + z.msg);
				if (z.next_out_index)
					if (z.next_out_index == bufsize)
						buffers.push(new Uint8Array(buf));
					else
						buffers.push(buf.subarray(0, z.next_out_index));
				bufferSize += z.next_out_index;
				if (onprogress && z.next_in_index > 0 && z.next_in_index != lastIndex) {
					onprogress(z.next_in_index);
					lastIndex = z.next_in_index;
				}
			} while (z.avail_in > 0 || z.avail_out === 0);
			if (buffers.length > 1) {
				array = new Uint8Array(bufferSize);
				buffers.forEach(function (chunk) {
					array.set(chunk, bufferIndex);
					bufferIndex += chunk.length;
				});
			} else {
				array = buffers[0] ? new Uint8Array(buffers[0]) : new Uint8Array();
			}
			return array;
		};
		that.flush = function () {
			let err, array, bufferIndex = 0, bufferSize = 0;
			const buffers = [];
			do {
				z.next_out_index = 0;
				z.avail_out = bufsize;
				err = z.deflate(Z_FINISH$1);
				if (err != Z_STREAM_END$1 && err != Z_OK$1)
					throw new Error("deflating: " + z.msg);
				if (bufsize - z.avail_out > 0)
					buffers.push(buf.slice(0, z.next_out_index));
				bufferSize += z.next_out_index;
			} while (z.avail_in > 0 || z.avail_out === 0);
			z.deflateEnd();
			array = new Uint8Array(bufferSize);
			buffers.forEach(function (chunk) {
				array.set(chunk, bufferIndex);
				bufferIndex += chunk.length;
			});
			return array;
		};
	}

	function getMaximumCompressedSize(uncompressedSize) {
		return uncompressedSize + (5 * (Math.floor(uncompressedSize / 16383) + 1));
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	/*
	 * This program is based on JZlib 1.0.2 ymnk, JCraft,Inc.
	 * JZlib is based on zlib-1.1.3, so all credit should go authors
	 * Jean-loup Gailly(jloup@gzip.org) and Mark Adler(madler@alumni.caltech.edu)
	 * and contributors of zlib.
	 */

	// deno-lint-ignore-file no-this-alias prefer-const

	// Global

	const MAX_BITS = 15;

	const Z_OK = 0;
	const Z_STREAM_END = 1;
	const Z_NEED_DICT = 2;
	const Z_STREAM_ERROR = -2;
	const Z_DATA_ERROR = -3;
	const Z_MEM_ERROR = -4;
	const Z_BUF_ERROR = -5;

	const inflate_mask = [0x00000000, 0x00000001, 0x00000003, 0x00000007, 0x0000000f, 0x0000001f, 0x0000003f, 0x0000007f, 0x000000ff, 0x000001ff, 0x000003ff,
		0x000007ff, 0x00000fff, 0x00001fff, 0x00003fff, 0x00007fff, 0x0000ffff];

	const MANY = 1440;

	// JZlib version : "1.0.2"
	const Z_NO_FLUSH = 0;
	const Z_FINISH = 4;

	// InfTree
	const fixed_bl = 9;
	const fixed_bd = 5;

	const fixed_tl = [96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 192, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 160, 0, 8, 0,
		0, 8, 128, 0, 8, 64, 0, 9, 224, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 144, 83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 208, 81, 7, 17, 0, 8, 104, 0, 8, 40,
		0, 9, 176, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 240, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 200, 81, 7, 13,
		0, 8, 100, 0, 8, 36, 0, 9, 168, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 232, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 152, 84, 7, 83, 0, 8, 124, 0, 8, 60,
		0, 9, 216, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 184, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 248, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7,
		35, 0, 8, 114, 0, 8, 50, 0, 9, 196, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 164, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 228, 80, 7, 7, 0, 8, 90, 0, 8,
		26, 0, 9, 148, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 212, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 180, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 244, 80,
		7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 204, 81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 172, 0, 8, 6, 0, 8, 134, 0,
		8, 70, 0, 9, 236, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 156, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 220, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 188, 0,
		8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 252, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 194, 80, 7, 10, 0, 8, 97,
		0, 8, 33, 0, 9, 162, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 226, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 146, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 210,
		81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 178, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 242, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117,
		0, 8, 53, 0, 9, 202, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 170, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 234, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 154,
		84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 218, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 186, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 250, 80, 7, 3, 0, 8, 83,
		0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 198, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 166, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 230,
		80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 150, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 214, 82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 182, 0, 8, 11, 0, 8, 139,
		0, 8, 75, 0, 9, 246, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 206, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 174,
		0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 238, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 158, 84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 222, 82, 7, 27, 0, 8, 111,
		0, 8, 47, 0, 9, 190, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 254, 96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9,
		193, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 161, 0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 225, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 145, 83, 7, 59, 0, 8,
		120, 0, 8, 56, 0, 9, 209, 81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 177, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 241, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8,
		227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 201, 81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 169, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 233, 80, 7, 8, 0, 8,
		92, 0, 8, 28, 0, 9, 153, 84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 217, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 185, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9,
		249, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 197, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 165, 0, 8, 2, 0, 8,
		130, 0, 8, 66, 0, 9, 229, 80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 149, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 213, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9,
		181, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 245, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 205, 81, 7, 15, 0, 8,
		102, 0, 8, 38, 0, 9, 173, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 237, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 157, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9,
		221, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 189, 0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 253, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0,
		8, 113, 0, 8, 49, 0, 9, 195, 80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 163, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 227, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9,
		147, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 211, 81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 179, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 243, 80, 7, 4, 0, 8,
		85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 203, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 171, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9,
		235, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 155, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 219, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 187, 0, 8, 13, 0, 8,
		141, 0, 8, 77, 0, 9, 251, 80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 199, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9,
		167, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 231, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 151, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 215, 82, 7, 19, 0, 8,
		107, 0, 8, 43, 0, 9, 183, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 247, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9,
		207, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 175, 0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 239, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 159, 84, 7, 99, 0, 8,
		127, 0, 8, 63, 0, 9, 223, 82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 191, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 255];
	const fixed_td = [80, 5, 1, 87, 5, 257, 83, 5, 17, 91, 5, 4097, 81, 5, 5, 89, 5, 1025, 85, 5, 65, 93, 5, 16385, 80, 5, 3, 88, 5, 513, 84, 5, 33, 92, 5,
		8193, 82, 5, 9, 90, 5, 2049, 86, 5, 129, 192, 5, 24577, 80, 5, 2, 87, 5, 385, 83, 5, 25, 91, 5, 6145, 81, 5, 7, 89, 5, 1537, 85, 5, 97, 93, 5,
		24577, 80, 5, 4, 88, 5, 769, 84, 5, 49, 92, 5, 12289, 82, 5, 13, 90, 5, 3073, 86, 5, 193, 192, 5, 24577];

	// Tables for deflate from PKZIP's appnote.txt.
	const cplens = [ // Copy lengths for literal codes 257..285
		3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0];

	// see note #13 above about 258
	const cplext = [ // Extra bits for literal codes 257..285
		0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 112, 112 // 112==invalid
	];

	const cpdist = [ // Copy offsets for distance codes 0..29
		1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];

	const cpdext = [ // Extra bits for distance codes
		0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

	// If BMAX needs to be larger than 16, then h and x[] should be uLong.
	const BMAX = 15; // maximum bit length of any code

	function InfTree() {
		const that = this;

		let hn; // hufts used in space
		let v; // work area for huft_build
		let c; // bit length count table
		let r; // table entry for structure assignment
		let u; // table stack
		let x; // bit offsets, then code stack

		function huft_build(b, // code lengths in bits (all assumed <=
			// BMAX)
			bindex, n, // number of codes (assumed <= 288)
			s, // number of simple-valued codes (0..s-1)
			d, // list of base values for non-simple codes
			e, // list of extra bits for non-simple codes
			t, // result: starting table
			m, // maximum lookup bits, returns actual
			hp,// space for trees
			hn,// hufts used in space
			v // working area: values in order of bit length
		) {
			// Given a list of code lengths and a maximum table size, make a set of
			// tables to decode that set of codes. Return Z_OK on success,
			// Z_BUF_ERROR
			// if the given code set is incomplete (the tables are still built in
			// this
			// case), Z_DATA_ERROR if the input is invalid (an over-subscribed set
			// of
			// lengths), or Z_MEM_ERROR if not enough memory.

			let a; // counter for codes of length k
			let f; // i repeats in table every f entries
			let g; // maximum code length
			let h; // table level
			let i; // counter, current code
			let j; // counter
			let k; // number of bits in current code
			let l; // bits per table (returned in m)
			let mask; // (1 << w) - 1, to avoid cc -O bug on HP
			let p; // pointer into c[], b[], or v[]
			let q; // points to current table
			let w; // bits before this table == (l * h)
			let xp; // pointer into x
			let y; // number of dummy codes added
			let z; // number of entries in current table

			// Generate counts for each bit length

			p = 0;
			i = n;
			do {
				c[b[bindex + p]]++;
				p++;
				i--; // assume all entries <= BMAX
			} while (i !== 0);

			if (c[0] == n) { // null input--all zero length codes
				t[0] = -1;
				m[0] = 0;
				return Z_OK;
			}

			// Find minimum and maximum length, bound *m by those
			l = m[0];
			for (j = 1; j <= BMAX; j++)
				if (c[j] !== 0)
					break;
			k = j; // minimum code length
			if (l < j) {
				l = j;
			}
			for (i = BMAX; i !== 0; i--) {
				if (c[i] !== 0)
					break;
			}
			g = i; // maximum code length
			if (l > i) {
				l = i;
			}
			m[0] = l;

			// Adjust last length count to fill out codes, if needed
			for (y = 1 << j; j < i; j++, y <<= 1) {
				if ((y -= c[j]) < 0) {
					return Z_DATA_ERROR;
				}
			}
			if ((y -= c[i]) < 0) {
				return Z_DATA_ERROR;
			}
			c[i] += y;

			// Generate starting offsets into the value table for each length
			x[1] = j = 0;
			p = 1;
			xp = 2;
			while (--i !== 0) { // note that i == g from above
				x[xp] = (j += c[p]);
				xp++;
				p++;
			}

			// Make a table of values in order of bit lengths
			i = 0;
			p = 0;
			do {
				if ((j = b[bindex + p]) !== 0) {
					v[x[j]++] = i;
				}
				p++;
			} while (++i < n);
			n = x[g]; // set n to length of v

			// Generate the Huffman codes and for each, make the table entries
			x[0] = i = 0; // first Huffman code is zero
			p = 0; // grab values in bit order
			h = -1; // no tables yet--level -1
			w = -l; // bits decoded == (l * h)
			u[0] = 0; // just to keep compilers happy
			q = 0; // ditto
			z = 0; // ditto

			// go through the bit lengths (k already is bits in shortest code)
			for (; k <= g; k++) {
				a = c[k];
				while (a-- !== 0) {
					// here i is the Huffman code of length k bits for value *p
					// make tables up to required level
					while (k > w + l) {
						h++;
						w += l; // previous table always l bits
						// compute minimum size table less than or equal to l bits
						z = g - w;
						z = (z > l) ? l : z; // table size upper limit
						if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
							// too few codes for
							// k-w bit table
							f -= a + 1; // deduct codes from patterns left
							xp = k;
							if (j < z) {
								while (++j < z) { // try smaller tables up to z bits
									if ((f <<= 1) <= c[++xp])
										break; // enough codes to use up j bits
									f -= c[xp]; // else deduct codes from patterns
								}
							}
						}
						z = 1 << j; // table entries for j-bit table

						// allocate new table
						if (hn[0] + z > MANY) { // (note: doesn't matter for fixed)
							return Z_DATA_ERROR; // overflow of MANY
						}
						u[h] = q = /* hp+ */hn[0]; // DEBUG
						hn[0] += z;

						// connect to last table, if there is one
						if (h !== 0) {
							x[h] = i; // save pattern for backing up
							r[0] = /* (byte) */j; // bits in this table
							r[1] = /* (byte) */l; // bits to dump before this table
							j = i >>> (w - l);
							r[2] = /* (int) */(q - u[h - 1] - j); // offset to this table
							hp.set(r, (u[h - 1] + j) * 3);
							// to
							// last
							// table
						} else {
							t[0] = q; // first table is returned result
						}
					}

					// set up table entry in r
					r[1] = /* (byte) */(k - w);
					if (p >= n) {
						r[0] = 128 + 64; // out of values--invalid code
					} else if (v[p] < s) {
						r[0] = /* (byte) */(v[p] < 256 ? 0 : 32 + 64); // 256 is
						// end-of-block
						r[2] = v[p++]; // simple code is just the value
					} else {
						r[0] = /* (byte) */(e[v[p] - s] + 16 + 64); // non-simple--look
						// up in lists
						r[2] = d[v[p++] - s];
					}

					// fill code-like entries with r
					f = 1 << (k - w);
					for (j = i >>> w; j < z; j += f) {
						hp.set(r, (q + j) * 3);
					}

					// backwards increment the k-bit code i
					for (j = 1 << (k - 1); (i & j) !== 0; j >>>= 1) {
						i ^= j;
					}
					i ^= j;

					// backup over finished tables
					mask = (1 << w) - 1; // needed on HP, cc -O bug
					while ((i & mask) != x[h]) {
						h--; // don't need to update q
						w -= l;
						mask = (1 << w) - 1;
					}
				}
			}
			// Return Z_BUF_ERROR if we were given an incomplete table
			return y !== 0 && g != 1 ? Z_BUF_ERROR : Z_OK;
		}

		function initWorkArea(vsize) {
			let i;
			if (!hn) {
				hn = []; // []; //new Array(1);
				v = []; // new Array(vsize);
				c = new Int32Array(BMAX + 1); // new Array(BMAX + 1);
				r = []; // new Array(3);
				u = new Int32Array(BMAX); // new Array(BMAX);
				x = new Int32Array(BMAX + 1); // new Array(BMAX + 1);
			}
			if (v.length < vsize) {
				v = []; // new Array(vsize);
			}
			for (i = 0; i < vsize; i++) {
				v[i] = 0;
			}
			for (i = 0; i < BMAX + 1; i++) {
				c[i] = 0;
			}
			for (i = 0; i < 3; i++) {
				r[i] = 0;
			}
			// for(int i=0; i<BMAX; i++){u[i]=0;}
			u.set(c.subarray(0, BMAX), 0);
			// for(int i=0; i<BMAX+1; i++){x[i]=0;}
			x.set(c.subarray(0, BMAX + 1), 0);
		}

		that.inflate_trees_bits = function (c, // 19 code lengths
			bb, // bits tree desired/actual depth
			tb, // bits tree result
			hp, // space for trees
			z // for messages
		) {
			let result;
			initWorkArea(19);
			hn[0] = 0;
			result = huft_build(c, 0, 19, 19, null, null, tb, bb, hp, hn, v);

			if (result == Z_DATA_ERROR) {
				z.msg = "oversubscribed dynamic bit lengths tree";
			} else if (result == Z_BUF_ERROR || bb[0] === 0) {
				z.msg = "incomplete dynamic bit lengths tree";
				result = Z_DATA_ERROR;
			}
			return result;
		};

		that.inflate_trees_dynamic = function (nl, // number of literal/length codes
			nd, // number of distance codes
			c, // that many (total) code lengths
			bl, // literal desired/actual bit depth
			bd, // distance desired/actual bit depth
			tl, // literal/length tree result
			td, // distance tree result
			hp, // space for trees
			z // for messages
		) {
			let result;

			// build literal/length tree
			initWorkArea(288);
			hn[0] = 0;
			result = huft_build(c, 0, nl, 257, cplens, cplext, tl, bl, hp, hn, v);
			if (result != Z_OK || bl[0] === 0) {
				if (result == Z_DATA_ERROR) {
					z.msg = "oversubscribed literal/length tree";
				} else if (result != Z_MEM_ERROR) {
					z.msg = "incomplete literal/length tree";
					result = Z_DATA_ERROR;
				}
				return result;
			}

			// build distance tree
			initWorkArea(288);
			result = huft_build(c, nl, nd, 0, cpdist, cpdext, td, bd, hp, hn, v);

			if (result != Z_OK || (bd[0] === 0 && nl > 257)) {
				if (result == Z_DATA_ERROR) {
					z.msg = "oversubscribed distance tree";
				} else if (result == Z_BUF_ERROR) {
					z.msg = "incomplete distance tree";
					result = Z_DATA_ERROR;
				} else if (result != Z_MEM_ERROR) {
					z.msg = "empty distance tree with lengths";
					result = Z_DATA_ERROR;
				}
				return result;
			}

			return Z_OK;
		};

	}

	InfTree.inflate_trees_fixed = function (bl, // literal desired/actual bit depth
		bd, // distance desired/actual bit depth
		tl,// literal/length tree result
		td// distance tree result
	) {
		bl[0] = fixed_bl;
		bd[0] = fixed_bd;
		tl[0] = fixed_tl;
		td[0] = fixed_td;
		return Z_OK;
	};

	// InfCodes

	// waiting for "i:"=input,
	// "o:"=output,
	// "x:"=nothing
	const START = 0; // x: set up for LEN
	const LEN = 1; // i: get length/literal/eob next
	const LENEXT = 2; // i: getting length extra (have base)
	const DIST = 3; // i: get distance next
	const DISTEXT = 4;// i: getting distance extra
	const COPY = 5; // o: copying bytes in win, waiting
	// for space
	const LIT = 6; // o: got literal, waiting for output
	// space
	const WASH = 7; // o: got eob, possibly still output
	// waiting
	const END = 8; // x: got eob and all data flushed
	const BADCODE = 9;// x: got error

	function InfCodes() {
		const that = this;

		let mode; // current inflate_codes mode

		// mode dependent information
		let len = 0;

		let tree; // pointer into tree
		let tree_index = 0;
		let need = 0; // bits needed

		let lit = 0;

		// if EXT or COPY, where and how much
		let get = 0; // bits to get for extra
		let dist = 0; // distance back to copy from

		let lbits = 0; // ltree bits decoded per branch
		let dbits = 0; // dtree bits decoder per branch
		let ltree; // literal/length/eob tree
		let ltree_index = 0; // literal/length/eob tree
		let dtree; // distance tree
		let dtree_index = 0; // distance tree

		// Called with number of bytes left to write in win at least 258
		// (the maximum string length) and number of input bytes available
		// at least ten. The ten bytes are six bytes for the longest length/
		// distance pair plus four bytes for overloading the bit buffer.

		function inflate_fast(bl, bd, tl, tl_index, td, td_index, s, z) {
			let t; // temporary pointer
			let tp; // temporary pointer
			let tp_index; // temporary pointer
			let e; // extra bits or operation
			let b; // bit buffer
			let k; // bits in bit buffer
			let p; // input data pointer
			let n; // bytes available there
			let q; // output win write pointer
			let m; // bytes to end of win or read pointer
			let ml; // mask for literal/length tree
			let md; // mask for distance tree
			let c; // bytes to copy
			let d; // distance back to copy from
			let r; // copy source pointer

			let tp_index_t_3; // (tp_index+t)*3

			// load input, output, bit values
			p = z.next_in_index;
			n = z.avail_in;
			b = s.bitb;
			k = s.bitk;
			q = s.write;
			m = q < s.read ? s.read - q - 1 : s.end - q;

			// initialize masks
			ml = inflate_mask[bl];
			md = inflate_mask[bd];

			// do until not enough input or output space for fast loop
			do { // assume called with m >= 258 && n >= 10
				// get literal/length code
				while (k < (20)) { // max bits for literal/length code
					n--;
					b |= (z.read_byte(p++) & 0xff) << k;
					k += 8;
				}

				t = b & ml;
				tp = tl;
				tp_index = tl_index;
				tp_index_t_3 = (tp_index + t) * 3;
				if ((e = tp[tp_index_t_3]) === 0) {
					b >>= (tp[tp_index_t_3 + 1]);
					k -= (tp[tp_index_t_3 + 1]);

					s.win[q++] = /* (byte) */tp[tp_index_t_3 + 2];
					m--;
					continue;
				}
				do {

					b >>= (tp[tp_index_t_3 + 1]);
					k -= (tp[tp_index_t_3 + 1]);

					if ((e & 16) !== 0) {
						e &= 15;
						c = tp[tp_index_t_3 + 2] + (/* (int) */b & inflate_mask[e]);

						b >>= e;
						k -= e;

						// decode distance base of block to copy
						while (k < (15)) { // max bits for distance code
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						t = b & md;
						tp = td;
						tp_index = td_index;
						tp_index_t_3 = (tp_index + t) * 3;
						e = tp[tp_index_t_3];

						do {

							b >>= (tp[tp_index_t_3 + 1]);
							k -= (tp[tp_index_t_3 + 1]);

							if ((e & 16) !== 0) {
								// get extra bits to add to distance base
								e &= 15;
								while (k < (e)) { // get extra bits (up to 13)
									n--;
									b |= (z.read_byte(p++) & 0xff) << k;
									k += 8;
								}

								d = tp[tp_index_t_3 + 2] + (b & inflate_mask[e]);

								b >>= (e);
								k -= (e);

								// do the copy
								m -= c;
								if (q >= d) { // offset before dest
									// just copy
									r = q - d;
									if (q - r > 0 && 2 > (q - r)) {
										s.win[q++] = s.win[r++]; // minimum
										// count is
										// three,
										s.win[q++] = s.win[r++]; // so unroll
										// loop a
										// little
										c -= 2;
									} else {
										s.win.set(s.win.subarray(r, r + 2), q);
										q += 2;
										r += 2;
										c -= 2;
									}
								} else { // else offset after destination
									r = q - d;
									do {
										r += s.end; // force pointer in win
									} while (r < 0); // covers invalid distances
									e = s.end - r;
									if (c > e) { // if source crosses,
										c -= e; // wrapped copy
										if (q - r > 0 && e > (q - r)) {
											do {
												s.win[q++] = s.win[r++];
											} while (--e !== 0);
										} else {
											s.win.set(s.win.subarray(r, r + e), q);
											q += e;
											r += e;
											e = 0;
										}
										r = 0; // copy rest from start of win
									}

								}

								// copy all or what's left
								if (q - r > 0 && c > (q - r)) {
									do {
										s.win[q++] = s.win[r++];
									} while (--c !== 0);
								} else {
									s.win.set(s.win.subarray(r, r + c), q);
									q += c;
									r += c;
									c = 0;
								}
								break;
							} else if ((e & 64) === 0) {
								t += tp[tp_index_t_3 + 2];
								t += (b & inflate_mask[e]);
								tp_index_t_3 = (tp_index + t) * 3;
								e = tp[tp_index_t_3];
							} else {
								z.msg = "invalid distance code";

								c = z.avail_in - n;
								c = (k >> 3) < c ? k >> 3 : c;
								n += c;
								p -= c;
								k -= c << 3;

								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;

								return Z_DATA_ERROR;
							}
							// eslint-disable-next-line no-constant-condition
						} while (true);
						break;
					}

					if ((e & 64) === 0) {
						t += tp[tp_index_t_3 + 2];
						t += (b & inflate_mask[e]);
						tp_index_t_3 = (tp_index + t) * 3;
						if ((e = tp[tp_index_t_3]) === 0) {

							b >>= (tp[tp_index_t_3 + 1]);
							k -= (tp[tp_index_t_3 + 1]);

							s.win[q++] = /* (byte) */tp[tp_index_t_3 + 2];
							m--;
							break;
						}
					} else if ((e & 32) !== 0) {

						c = z.avail_in - n;
						c = (k >> 3) < c ? k >> 3 : c;
						n += c;
						p -= c;
						k -= c << 3;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;

						return Z_STREAM_END;
					} else {
						z.msg = "invalid literal/length code";

						c = z.avail_in - n;
						c = (k >> 3) < c ? k >> 3 : c;
						n += c;
						p -= c;
						k -= c << 3;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;

						return Z_DATA_ERROR;
					}
					// eslint-disable-next-line no-constant-condition
				} while (true);
			} while (m >= 258 && n >= 10);

			// not enough input or output--restore pointers and return
			c = z.avail_in - n;
			c = (k >> 3) < c ? k >> 3 : c;
			n += c;
			p -= c;
			k -= c << 3;

			s.bitb = b;
			s.bitk = k;
			z.avail_in = n;
			z.total_in += p - z.next_in_index;
			z.next_in_index = p;
			s.write = q;

			return Z_OK;
		}

		that.init = function (bl, bd, tl, tl_index, td, td_index) {
			mode = START;
			lbits = /* (byte) */bl;
			dbits = /* (byte) */bd;
			ltree = tl;
			ltree_index = tl_index;
			dtree = td;
			dtree_index = td_index;
			tree = null;
		};

		that.proc = function (s, z, r) {
			let j; // temporary storage
			let tindex; // temporary pointer
			let e; // extra bits or operation
			let b = 0; // bit buffer
			let k = 0; // bits in bit buffer
			let p = 0; // input data pointer
			let n; // bytes available there
			let q; // output win write pointer
			let m; // bytes to end of win or read pointer
			let f; // pointer to copy strings from

			// copy input/output information to locals (UPDATE macro restores)
			p = z.next_in_index;
			n = z.avail_in;
			b = s.bitb;
			k = s.bitk;
			q = s.write;
			m = q < s.read ? s.read - q - 1 : s.end - q;

			// process input and output based on current state
			// eslint-disable-next-line no-constant-condition
			while (true) {
				switch (mode) {
					// waiting for "i:"=input, "o:"=output, "x:"=nothing
					case START: // x: set up for LEN
						if (m >= 258 && n >= 10) {

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							r = inflate_fast(lbits, dbits, ltree, ltree_index, dtree, dtree_index, s, z);

							p = z.next_in_index;
							n = z.avail_in;
							b = s.bitb;
							k = s.bitk;
							q = s.write;
							m = q < s.read ? s.read - q - 1 : s.end - q;

							if (r != Z_OK) {
								mode = r == Z_STREAM_END ? WASH : BADCODE;
								break;
							}
						}
						need = lbits;
						tree = ltree;
						tree_index = ltree_index;

						mode = LEN;
					/* falls through */
					case LEN: // i: get length/literal/eob next
						j = need;

						while (k < (j)) {
							if (n !== 0)
								r = Z_OK;
							else {

								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;
								return s.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						tindex = (tree_index + (b & inflate_mask[j])) * 3;

						b >>>= (tree[tindex + 1]);
						k -= (tree[tindex + 1]);

						e = tree[tindex];

						if (e === 0) { // literal
							lit = tree[tindex + 2];
							mode = LIT;
							break;
						}
						if ((e & 16) !== 0) { // length
							get = e & 15;
							len = tree[tindex + 2];
							mode = LENEXT;
							break;
						}
						if ((e & 64) === 0) { // next table
							need = e;
							tree_index = tindex / 3 + tree[tindex + 2];
							break;
						}
						if ((e & 32) !== 0) { // end of block
							mode = WASH;
							break;
						}
						mode = BADCODE; // invalid code
						z.msg = "invalid literal/length code";
						r = Z_DATA_ERROR;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);

					case LENEXT: // i: getting length extra (have base)
						j = get;

						while (k < (j)) {
							if (n !== 0)
								r = Z_OK;
							else {

								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;
								return s.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						len += (b & inflate_mask[j]);

						b >>= j;
						k -= j;

						need = dbits;
						tree = dtree;
						tree_index = dtree_index;
						mode = DIST;
					/* falls through */
					case DIST: // i: get distance next
						j = need;

						while (k < (j)) {
							if (n !== 0)
								r = Z_OK;
							else {

								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;
								return s.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						tindex = (tree_index + (b & inflate_mask[j])) * 3;

						b >>= tree[tindex + 1];
						k -= tree[tindex + 1];

						e = (tree[tindex]);
						if ((e & 16) !== 0) { // distance
							get = e & 15;
							dist = tree[tindex + 2];
							mode = DISTEXT;
							break;
						}
						if ((e & 64) === 0) { // next table
							need = e;
							tree_index = tindex / 3 + tree[tindex + 2];
							break;
						}
						mode = BADCODE; // invalid code
						z.msg = "invalid distance code";
						r = Z_DATA_ERROR;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);

					case DISTEXT: // i: getting distance extra
						j = get;

						while (k < (j)) {
							if (n !== 0)
								r = Z_OK;
							else {

								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;
								return s.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						dist += (b & inflate_mask[j]);

						b >>= j;
						k -= j;

						mode = COPY;
					/* falls through */
					case COPY: // o: copying bytes in win, waiting for space
						f = q - dist;
						while (f < 0) { // modulo win size-"while" instead
							f += s.end; // of "if" handles invalid distances
						}
						while (len !== 0) {

							if (m === 0) {
								if (q == s.end && s.read !== 0) {
									q = 0;
									m = q < s.read ? s.read - q - 1 : s.end - q;
								}
								if (m === 0) {
									s.write = q;
									r = s.inflate_flush(z, r);
									q = s.write;
									m = q < s.read ? s.read - q - 1 : s.end - q;

									if (q == s.end && s.read !== 0) {
										q = 0;
										m = q < s.read ? s.read - q - 1 : s.end - q;
									}

									if (m === 0) {
										s.bitb = b;
										s.bitk = k;
										z.avail_in = n;
										z.total_in += p - z.next_in_index;
										z.next_in_index = p;
										s.write = q;
										return s.inflate_flush(z, r);
									}
								}
							}

							s.win[q++] = s.win[f++];
							m--;

							if (f == s.end)
								f = 0;
							len--;
						}
						mode = START;
						break;
					case LIT: // o: got literal, waiting for output space
						if (m === 0) {
							if (q == s.end && s.read !== 0) {
								q = 0;
								m = q < s.read ? s.read - q - 1 : s.end - q;
							}
							if (m === 0) {
								s.write = q;
								r = s.inflate_flush(z, r);
								q = s.write;
								m = q < s.read ? s.read - q - 1 : s.end - q;

								if (q == s.end && s.read !== 0) {
									q = 0;
									m = q < s.read ? s.read - q - 1 : s.end - q;
								}
								if (m === 0) {
									s.bitb = b;
									s.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									s.write = q;
									return s.inflate_flush(z, r);
								}
							}
						}
						r = Z_OK;

						s.win[q++] = /* (byte) */lit;
						m--;

						mode = START;
						break;
					case WASH: // o: got eob, possibly more output
						if (k > 7) { // return unused byte, if any
							k -= 8;
							n++;
							p--; // can always return one
						}

						s.write = q;
						r = s.inflate_flush(z, r);
						q = s.write;
						m = q < s.read ? s.read - q - 1 : s.end - q;

						if (s.read != s.write) {
							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							return s.inflate_flush(z, r);
						}
						mode = END;
					/* falls through */
					case END:
						r = Z_STREAM_END;
						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);

					case BADCODE: // x: got error

						r = Z_DATA_ERROR;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);

					default:
						r = Z_STREAM_ERROR;

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);
				}
			}
		};

		that.free = function () {
			// ZFREE(z, c);
		};

	}

	// InfBlocks

	// Table for deflate from PKZIP's appnote.txt.
	const border = [ // Order of the bit length code lengths
		16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

	const TYPE = 0; // get type bits (3, including end bit)
	const LENS = 1; // get lengths for stored
	const STORED = 2;// processing stored block
	const TABLE = 3; // get table lengths
	const BTREE = 4; // get bit lengths tree for a dynamic
	// block
	const DTREE = 5; // get length, distance trees for a
	// dynamic block
	const CODES = 6; // processing fixed or dynamic block
	const DRY = 7; // output remaining win bytes
	const DONELOCKS = 8; // finished last block, done
	const BADBLOCKS = 9; // ot a data error--stuck here

	function InfBlocks(z, w) {
		const that = this;

		let mode = TYPE; // current inflate_block mode

		let left = 0; // if STORED, bytes left to copy

		let table = 0; // table lengths (14 bits)
		let index = 0; // index into blens (or border)
		let blens; // bit lengths of codes
		const bb = [0]; // bit length tree depth
		const tb = [0]; // bit length decoding tree

		const codes = new InfCodes(); // if CODES, current state

		let last = 0; // true if this block is the last block

		let hufts = new Int32Array(MANY * 3); // single malloc for tree space
		const check = 0; // check on output
		const inftree = new InfTree();

		that.bitk = 0; // bits in bit buffer
		that.bitb = 0; // bit buffer
		that.win = new Uint8Array(w); // sliding win
		that.end = w; // one byte after sliding win
		that.read = 0; // win read pointer
		that.write = 0; // win write pointer

		that.reset = function (z, c) {
			if (c)
				c[0] = check;
			// if (mode == BTREE || mode == DTREE) {
			// }
			if (mode == CODES) {
				codes.free(z);
			}
			mode = TYPE;
			that.bitk = 0;
			that.bitb = 0;
			that.read = that.write = 0;
		};

		that.reset(z, null);

		// copy as much as possible from the sliding win to the output area
		that.inflate_flush = function (z, r) {
			let n;
			let p;
			let q;

			// local copies of source and destination pointers
			p = z.next_out_index;
			q = that.read;

			// compute number of bytes to copy as far as end of win
			n = /* (int) */((q <= that.write ? that.write : that.end) - q);
			if (n > z.avail_out)
				n = z.avail_out;
			if (n !== 0 && r == Z_BUF_ERROR)
				r = Z_OK;

			// update counters
			z.avail_out -= n;
			z.total_out += n;

			// copy as far as end of win
			z.next_out.set(that.win.subarray(q, q + n), p);
			p += n;
			q += n;

			// see if more to copy at beginning of win
			if (q == that.end) {
				// wrap pointers
				q = 0;
				if (that.write == that.end)
					that.write = 0;

				// compute bytes to copy
				n = that.write - q;
				if (n > z.avail_out)
					n = z.avail_out;
				if (n !== 0 && r == Z_BUF_ERROR)
					r = Z_OK;

				// update counters
				z.avail_out -= n;
				z.total_out += n;

				// copy
				z.next_out.set(that.win.subarray(q, q + n), p);
				p += n;
				q += n;
			}

			// update pointers
			z.next_out_index = p;
			that.read = q;

			// done
			return r;
		};

		that.proc = function (z, r) {
			let t; // temporary storage
			let b; // bit buffer
			let k; // bits in bit buffer
			let p; // input data pointer
			let n; // bytes available there
			let q; // output win write pointer
			let m; // bytes to end of win or read pointer

			let i;

			// copy input/output information to locals (UPDATE macro restores)
			// {
			p = z.next_in_index;
			n = z.avail_in;
			b = that.bitb;
			k = that.bitk;
			// }
			// {
			q = that.write;
			m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
			// }

			// process input based on current state
			// DEBUG dtree
			// eslint-disable-next-line no-constant-condition
			while (true) {
				let bl, bd, tl, td, bl_, bd_, tl_, td_;
				switch (mode) {
					case TYPE:

						while (k < (3)) {
							if (n !== 0) {
								r = Z_OK;
							} else {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}
						t = /* (int) */(b & 7);
						last = t & 1;

						switch (t >>> 1) {
							case 0: // stored
								// {
								b >>>= (3);
								k -= (3);
								// }
								t = k & 7; // go to byte boundary

								// {
								b >>>= (t);
								k -= (t);
								// }
								mode = LENS; // get length of stored block
								break;
							case 1: // fixed
								// {
								bl = []; // new Array(1);
								bd = []; // new Array(1);
								tl = [[]]; // new Array(1);
								td = [[]]; // new Array(1);

								InfTree.inflate_trees_fixed(bl, bd, tl, td);
								codes.init(bl[0], bd[0], tl[0], 0, td[0], 0);
								// }

								// {
								b >>>= (3);
								k -= (3);
								// }

								mode = CODES;
								break;
							case 2: // dynamic

								// {
								b >>>= (3);
								k -= (3);
								// }

								mode = TABLE;
								break;
							case 3: // illegal

								// {
								b >>>= (3);
								k -= (3);
								// }
								mode = BADBLOCKS;
								z.msg = "invalid block type";
								r = Z_DATA_ERROR;

								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
						}
						break;
					case LENS:

						while (k < (32)) {
							if (n !== 0) {
								r = Z_OK;
							} else {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						if ((((~b) >>> 16) & 0xffff) != (b & 0xffff)) {
							mode = BADBLOCKS;
							z.msg = "invalid stored block lengths";
							r = Z_DATA_ERROR;

							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						left = (b & 0xffff);
						b = k = 0; // dump bits
						mode = left !== 0 ? STORED : (last !== 0 ? DRY : TYPE);
						break;
					case STORED:
						if (n === 0) {
							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}

						if (m === 0) {
							if (q == that.end && that.read !== 0) {
								q = 0;
								m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
							}
							if (m === 0) {
								that.write = q;
								r = that.inflate_flush(z, r);
								q = that.write;
								m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
								if (q == that.end && that.read !== 0) {
									q = 0;
									m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
								}
								if (m === 0) {
									that.bitb = b;
									that.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									that.write = q;
									return that.inflate_flush(z, r);
								}
							}
						}
						r = Z_OK;

						t = left;
						if (t > n)
							t = n;
						if (t > m)
							t = m;
						that.win.set(z.read_buf(p, t), q);
						p += t;
						n -= t;
						q += t;
						m -= t;
						if ((left -= t) !== 0)
							break;
						mode = last !== 0 ? DRY : TYPE;
						break;
					case TABLE:

						while (k < (14)) {
							if (n !== 0) {
								r = Z_OK;
							} else {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}

							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						table = t = (b & 0x3fff);
						if ((t & 0x1f) > 29 || ((t >> 5) & 0x1f) > 29) {
							mode = BADBLOCKS;
							z.msg = "too many length or distance symbols";
							r = Z_DATA_ERROR;

							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						t = 258 + (t & 0x1f) + ((t >> 5) & 0x1f);
						if (!blens || blens.length < t) {
							blens = []; // new Array(t);
						} else {
							for (i = 0; i < t; i++) {
								blens[i] = 0;
							}
						}

						// {
						b >>>= (14);
						k -= (14);
						// }

						index = 0;
						mode = BTREE;
					/* falls through */
					case BTREE:
						while (index < 4 + (table >>> 10)) {
							while (k < (3)) {
								if (n !== 0) {
									r = Z_OK;
								} else {
									that.bitb = b;
									that.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									that.write = q;
									return that.inflate_flush(z, r);
								}
								n--;
								b |= (z.read_byte(p++) & 0xff) << k;
								k += 8;
							}

							blens[border[index++]] = b & 7;

							// {
							b >>>= (3);
							k -= (3);
							// }
						}

						while (index < 19) {
							blens[border[index++]] = 0;
						}

						bb[0] = 7;
						t = inftree.inflate_trees_bits(blens, bb, tb, hufts, z);
						if (t != Z_OK) {
							r = t;
							if (r == Z_DATA_ERROR) {
								blens = null;
								mode = BADBLOCKS;
							}

							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}

						index = 0;
						mode = DTREE;
					/* falls through */
					case DTREE:
						// eslint-disable-next-line no-constant-condition
						while (true) {
							t = table;
							if (index >= 258 + (t & 0x1f) + ((t >> 5) & 0x1f)) {
								break;
							}

							let j, c;

							t = bb[0];

							while (k < (t)) {
								if (n !== 0) {
									r = Z_OK;
								} else {
									that.bitb = b;
									that.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									that.write = q;
									return that.inflate_flush(z, r);
								}
								n--;
								b |= (z.read_byte(p++) & 0xff) << k;
								k += 8;
							}

							// if (tb[0] == -1) {
							// System.err.println("null...");
							// }

							t = hufts[(tb[0] + (b & inflate_mask[t])) * 3 + 1];
							c = hufts[(tb[0] + (b & inflate_mask[t])) * 3 + 2];

							if (c < 16) {
								b >>>= (t);
								k -= (t);
								blens[index++] = c;
							} else { // c == 16..18
								i = c == 18 ? 7 : c - 14;
								j = c == 18 ? 11 : 3;

								while (k < (t + i)) {
									if (n !== 0) {
										r = Z_OK;
									} else {
										that.bitb = b;
										that.bitk = k;
										z.avail_in = n;
										z.total_in += p - z.next_in_index;
										z.next_in_index = p;
										that.write = q;
										return that.inflate_flush(z, r);
									}
									n--;
									b |= (z.read_byte(p++) & 0xff) << k;
									k += 8;
								}

								b >>>= (t);
								k -= (t);

								j += (b & inflate_mask[i]);

								b >>>= (i);
								k -= (i);

								i = index;
								t = table;
								if (i + j > 258 + (t & 0x1f) + ((t >> 5) & 0x1f) || (c == 16 && i < 1)) {
									blens = null;
									mode = BADBLOCKS;
									z.msg = "invalid bit length repeat";
									r = Z_DATA_ERROR;

									that.bitb = b;
									that.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									that.write = q;
									return that.inflate_flush(z, r);
								}

								c = c == 16 ? blens[i - 1] : 0;
								do {
									blens[i++] = c;
								} while (--j !== 0);
								index = i;
							}
						}

						tb[0] = -1;
						// {
						bl_ = []; // new Array(1);
						bd_ = []; // new Array(1);
						tl_ = []; // new Array(1);
						td_ = []; // new Array(1);
						bl_[0] = 9; // must be <= 9 for lookahead assumptions
						bd_[0] = 6; // must be <= 9 for lookahead assumptions

						t = table;
						t = inftree.inflate_trees_dynamic(257 + (t & 0x1f), 1 + ((t >> 5) & 0x1f), blens, bl_, bd_, tl_, td_, hufts, z);

						if (t != Z_OK) {
							if (t == Z_DATA_ERROR) {
								blens = null;
								mode = BADBLOCKS;
							}
							r = t;

							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						codes.init(bl_[0], bd_[0], hufts, tl_[0], hufts, td_[0]);
						// }
						mode = CODES;
					/* falls through */
					case CODES:
						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;

						if ((r = codes.proc(that, z, r)) != Z_STREAM_END) {
							return that.inflate_flush(z, r);
						}
						r = Z_OK;
						codes.free(z);

						p = z.next_in_index;
						n = z.avail_in;
						b = that.bitb;
						k = that.bitk;
						q = that.write;
						m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);

						if (last === 0) {
							mode = TYPE;
							break;
						}
						mode = DRY;
					/* falls through */
					case DRY:
						that.write = q;
						r = that.inflate_flush(z, r);
						q = that.write;
						m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
						if (that.read != that.write) {
							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						mode = DONELOCKS;
					/* falls through */
					case DONELOCKS:
						r = Z_STREAM_END;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					case BADBLOCKS:
						r = Z_DATA_ERROR;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);

					default:
						r = Z_STREAM_ERROR;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
				}
			}
		};

		that.free = function (z) {
			that.reset(z, null);
			that.win = null;
			hufts = null;
			// ZFREE(z, s);
		};

		that.set_dictionary = function (d, start, n) {
			that.win.set(d.subarray(start, start + n), 0);
			that.read = that.write = n;
		};

		// Returns true if inflate is currently at the end of a block generated
		// by Z_SYNC_FLUSH or Z_FULL_FLUSH.
		that.sync_point = function () {
			return mode == LENS ? 1 : 0;
		};

	}

	// Inflate

	// preset dictionary flag in zlib header
	const PRESET_DICT = 0x20;

	const Z_DEFLATED = 8;

	const METHOD = 0; // waiting for method byte
	const FLAG = 1; // waiting for flag byte
	const DICT4 = 2; // four dictionary check bytes to go
	const DICT3 = 3; // three dictionary check bytes to go
	const DICT2 = 4; // two dictionary check bytes to go
	const DICT1 = 5; // one dictionary check byte to go
	const DICT0 = 6; // waiting for inflateSetDictionary
	const BLOCKS = 7; // decompressing blocks
	const DONE = 12; // finished check, done
	const BAD = 13; // got an error--stay here

	const mark = [0, 0, 0xff, 0xff];

	function Inflate() {
		const that = this;

		that.mode = 0; // current inflate mode

		// mode dependent information
		that.method = 0; // if FLAGS, method byte

		// if CHECK, check values to compare
		that.was = [0]; // new Array(1); // computed check value
		that.need = 0; // stream check value

		// if BAD, inflateSync's marker bytes count
		that.marker = 0;

		// mode independent information
		that.wbits = 0; // log2(win size) (8..15, defaults to 15)

		// this.blocks; // current inflate_blocks state

		function inflateReset(z) {
			if (!z || !z.istate)
				return Z_STREAM_ERROR;

			z.total_in = z.total_out = 0;
			z.msg = null;
			z.istate.mode = BLOCKS;
			z.istate.blocks.reset(z, null);
			return Z_OK;
		}

		that.inflateEnd = function (z) {
			if (that.blocks)
				that.blocks.free(z);
			that.blocks = null;
			// ZFREE(z, z->state);
			return Z_OK;
		};

		that.inflateInit = function (z, w) {
			z.msg = null;
			that.blocks = null;

			// set win size
			if (w < 8 || w > 15) {
				that.inflateEnd(z);
				return Z_STREAM_ERROR;
			}
			that.wbits = w;

			z.istate.blocks = new InfBlocks(z, 1 << w);

			// reset state
			inflateReset(z);
			return Z_OK;
		};

		that.inflate = function (z, f) {
			let r;
			let b;

			if (!z || !z.istate || !z.next_in)
				return Z_STREAM_ERROR;
			const istate = z.istate;
			f = f == Z_FINISH ? Z_BUF_ERROR : Z_OK;
			r = Z_BUF_ERROR;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				switch (istate.mode) {
					case METHOD:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						if (((istate.method = z.read_byte(z.next_in_index++)) & 0xf) != Z_DEFLATED) {
							istate.mode = BAD;
							z.msg = "unknown compression method";
							istate.marker = 5; // can't try inflateSync
							break;
						}
						if ((istate.method >> 4) + 8 > istate.wbits) {
							istate.mode = BAD;
							z.msg = "invalid win size";
							istate.marker = 5; // can't try inflateSync
							break;
						}
						istate.mode = FLAG;
					/* falls through */
					case FLAG:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						b = (z.read_byte(z.next_in_index++)) & 0xff;

						if ((((istate.method << 8) + b) % 31) !== 0) {
							istate.mode = BAD;
							z.msg = "incorrect header check";
							istate.marker = 5; // can't try inflateSync
							break;
						}

						if ((b & PRESET_DICT) === 0) {
							istate.mode = BLOCKS;
							break;
						}
						istate.mode = DICT4;
					/* falls through */
					case DICT4:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						istate.need = ((z.read_byte(z.next_in_index++) & 0xff) << 24) & 0xff000000;
						istate.mode = DICT3;
					/* falls through */
					case DICT3:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						istate.need += ((z.read_byte(z.next_in_index++) & 0xff) << 16) & 0xff0000;
						istate.mode = DICT2;
					/* falls through */
					case DICT2:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						istate.need += ((z.read_byte(z.next_in_index++) & 0xff) << 8) & 0xff00;
						istate.mode = DICT1;
					/* falls through */
					case DICT1:

						if (z.avail_in === 0)
							return r;
						r = f;

						z.avail_in--;
						z.total_in++;
						istate.need += (z.read_byte(z.next_in_index++) & 0xff);
						istate.mode = DICT0;
						return Z_NEED_DICT;
					case DICT0:
						istate.mode = BAD;
						z.msg = "need dictionary";
						istate.marker = 0; // can try inflateSync
						return Z_STREAM_ERROR;
					case BLOCKS:

						r = istate.blocks.proc(z, r);
						if (r == Z_DATA_ERROR) {
							istate.mode = BAD;
							istate.marker = 0; // can try inflateSync
							break;
						}
						if (r == Z_OK) {
							r = f;
						}
						if (r != Z_STREAM_END) {
							return r;
						}
						r = f;
						istate.blocks.reset(z, istate.was);
						istate.mode = DONE;
					/* falls through */
					case DONE:
						z.avail_in = 0;
						return Z_STREAM_END;
					case BAD:
						return Z_DATA_ERROR;
					default:
						return Z_STREAM_ERROR;
				}
			}
		};

		that.inflateSetDictionary = function (z, dictionary, dictLength) {
			let index = 0, length = dictLength;
			if (!z || !z.istate || z.istate.mode != DICT0)
				return Z_STREAM_ERROR;
			const istate = z.istate;
			if (length >= (1 << istate.wbits)) {
				length = (1 << istate.wbits) - 1;
				index = dictLength - length;
			}
			istate.blocks.set_dictionary(dictionary, index, length);
			istate.mode = BLOCKS;
			return Z_OK;
		};

		that.inflateSync = function (z) {
			let n; // number of bytes to look at
			let p; // pointer to bytes
			let m; // number of marker bytes found in a row
			let r, w; // temporaries to save total_in and total_out

			// set up
			if (!z || !z.istate)
				return Z_STREAM_ERROR;
			const istate = z.istate;
			if (istate.mode != BAD) {
				istate.mode = BAD;
				istate.marker = 0;
			}
			if ((n = z.avail_in) === 0)
				return Z_BUF_ERROR;
			p = z.next_in_index;
			m = istate.marker;

			// search
			while (n !== 0 && m < 4) {
				if (z.read_byte(p) == mark[m]) {
					m++;
				} else if (z.read_byte(p) !== 0) {
					m = 0;
				} else {
					m = 4 - m;
				}
				p++;
				n--;
			}

			// restore
			z.total_in += p - z.next_in_index;
			z.next_in_index = p;
			z.avail_in = n;
			istate.marker = m;

			// return no joy or set up to restart on a new block
			if (m != 4) {
				return Z_DATA_ERROR;
			}
			r = z.total_in;
			w = z.total_out;
			inflateReset(z);
			z.total_in = r;
			z.total_out = w;
			istate.mode = BLOCKS;
			return Z_OK;
		};

		// Returns true if inflate is currently at the end of a block generated
		// by Z_SYNC_FLUSH or Z_FULL_FLUSH. This function is used by one PPP
		// implementation to provide an additional safety check. PPP uses
		// Z_SYNC_FLUSH
		// but removes the length bytes of the resulting empty stored block. When
		// decompressing, PPP checks that at the end of input packet, inflate is
		// waiting for these length bytes.
		that.inflateSyncPoint = function (z) {
			if (!z || !z.istate || !z.istate.blocks)
				return Z_STREAM_ERROR;
			return z.istate.blocks.sync_point();
		};
	}

	// ZStream

	function ZStream() {
	}

	ZStream.prototype = {
		inflateInit(bits) {
			const that = this;
			that.istate = new Inflate();
			if (!bits)
				bits = MAX_BITS;
			return that.istate.inflateInit(that, bits);
		},

		inflate(f) {
			const that = this;
			if (!that.istate)
				return Z_STREAM_ERROR;
			return that.istate.inflate(that, f);
		},

		inflateEnd() {
			const that = this;
			if (!that.istate)
				return Z_STREAM_ERROR;
			const ret = that.istate.inflateEnd(that);
			that.istate = null;
			return ret;
		},

		inflateSync() {
			const that = this;
			if (!that.istate)
				return Z_STREAM_ERROR;
			return that.istate.inflateSync(that);
		},
		inflateSetDictionary(dictionary, dictLength) {
			const that = this;
			if (!that.istate)
				return Z_STREAM_ERROR;
			return that.istate.inflateSetDictionary(that, dictionary, dictLength);
		},
		read_byte(start) {
			const that = this;
			return that.next_in[start];
		},
		read_buf(start, size) {
			const that = this;
			return that.next_in.subarray(start, start + size);
		}
	};

	// Inflater

	function ZipInflate(options) {
		const that = this;
		const z = new ZStream();
		const bufsize = options && options.chunkSize ? Math.floor(options.chunkSize * 2) : 128 * 1024;
		const flush = Z_NO_FLUSH;
		const buf = new Uint8Array(bufsize);
		let nomoreinput = false;

		z.inflateInit();
		z.next_out = buf;

		that.append = function (data, onprogress) {
			const buffers = [];
			let err, array, lastIndex = 0, bufferIndex = 0, bufferSize = 0;
			if (data.length === 0)
				return;
			z.next_in_index = 0;
			z.next_in = data;
			z.avail_in = data.length;
			do {
				z.next_out_index = 0;
				z.avail_out = bufsize;
				if ((z.avail_in === 0) && (!nomoreinput)) { // if buffer is empty and more input is available, refill it
					z.next_in_index = 0;
					nomoreinput = true;
				}
				err = z.inflate(flush);
				if (nomoreinput && (err === Z_BUF_ERROR)) {
					if (z.avail_in !== 0)
						throw new Error("inflating: bad input");
				} else if (err !== Z_OK && err !== Z_STREAM_END)
					throw new Error("inflating: " + z.msg);
				if ((nomoreinput || err === Z_STREAM_END) && (z.avail_in === data.length))
					throw new Error("inflating: bad input");
				if (z.next_out_index)
					if (z.next_out_index === bufsize)
						buffers.push(new Uint8Array(buf));
					else
						buffers.push(buf.subarray(0, z.next_out_index));
				bufferSize += z.next_out_index;
				if (onprogress && z.next_in_index > 0 && z.next_in_index != lastIndex) {
					onprogress(z.next_in_index);
					lastIndex = z.next_in_index;
				}
			} while (z.avail_in > 0 || z.avail_out === 0);
			if (buffers.length > 1) {
				array = new Uint8Array(bufferSize);
				buffers.forEach(function (chunk) {
					array.set(chunk, bufferIndex);
					bufferIndex += chunk.length;
				});
			} else {
				array = buffers[0] ? new Uint8Array(buffers[0]) : new Uint8Array();
			}
			return array;
		};
		that.flush = function () {
			z.inflateEnd();
		};
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	const MAX_32_BITS = 0xffffffff;
	const MAX_16_BITS = 0xffff;
	const COMPRESSION_METHOD_DEFLATE = 0x08;
	const COMPRESSION_METHOD_STORE = 0x00;
	const COMPRESSION_METHOD_AES = 0x63;

	const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
	const SPLIT_ZIP_FILE_SIGNATURE = 0x08074b50;
	const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
	const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
	const ZIP64_END_OF_CENTRAL_DIR_SIGNATURE = 0x06064b50;
	const ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE = 0x07064b50;
	const END_OF_CENTRAL_DIR_LENGTH = 22;
	const ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH = 20;
	const ZIP64_END_OF_CENTRAL_DIR_LENGTH = 56;

	const EXTRAFIELD_TYPE_ZIP64 = 0x0001;
	const EXTRAFIELD_TYPE_AES = 0x9901;
	const EXTRAFIELD_TYPE_NTFS = 0x000a;
	const EXTRAFIELD_TYPE_NTFS_TAG1 = 0x0001;
	const EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP = 0x5455;
	const EXTRAFIELD_TYPE_UNICODE_PATH = 0x7075;
	const EXTRAFIELD_TYPE_UNICODE_COMMENT = 0x6375;
	const EXTRAFIELD_TYPE_USDZ = 0x1986;

	const BITFLAG_ENCRYPTED = 0x01;
	const BITFLAG_LEVEL = 0x06;
	const BITFLAG_DATA_DESCRIPTOR = 0x0008;
	const BITFLAG_LANG_ENCODING_FLAG = 0x0800;
	const FILE_ATTR_MSDOS_DIR_MASK = 0x10;

	const DIRECTORY_SIGNATURE = "/";

	const UNDEFINED_VALUE = undefined;
	const UNDEFINED_TYPE = "undefined";
	const FUNCTION_TYPE = "function";

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	class StreamAdapter {

		constructor(Codec) {
			return class extends TransformStream {
				constructor(_format, options) {
					const codec = new Codec(options);
					super({
						transform(chunk, controller) {
							controller.enqueue(codec.append(chunk));
						},
						flush(controller) {
							const chunk = codec.flush();
							if (chunk) {
								controller.enqueue(chunk);
							}
						}
					});
				}
			};
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const MINIMUM_CHUNK_SIZE = 64;
	let maxWorkers = 2;
	try {
		if (typeof navigator != UNDEFINED_TYPE && navigator.hardwareConcurrency) {
			maxWorkers = navigator.hardwareConcurrency;
		}
	} catch (_error) {
		// ignored
	}
	const DEFAULT_CONFIGURATION = {
		chunkSize: 512 * 1024,
		maxWorkers,
		terminateWorkerTimeout: 5000,
		useWebWorkers: true,
		useCompressionStream: true,
		workerScripts: UNDEFINED_VALUE,
		CompressionStreamNative: typeof CompressionStream != UNDEFINED_TYPE && CompressionStream,
		DecompressionStreamNative: typeof DecompressionStream != UNDEFINED_TYPE && DecompressionStream
	};

	const config = Object.assign({}, DEFAULT_CONFIGURATION);

	function getConfiguration() {
		return config;
	}

	function getChunkSize(config) {
		return Math.max(config.chunkSize, MINIMUM_CHUNK_SIZE);
	}

	function configure(configuration) {
		const {
			baseURL,
			chunkSize,
			maxWorkers,
			terminateWorkerTimeout,
			useCompressionStream,
			useWebWorkers,
			Deflate,
			Inflate,
			CompressionStream,
			DecompressionStream,
			workerScripts
		} = configuration;
		setIfDefined("baseURL", baseURL);
		setIfDefined("chunkSize", chunkSize);
		setIfDefined("maxWorkers", maxWorkers);
		setIfDefined("terminateWorkerTimeout", terminateWorkerTimeout);
		setIfDefined("useCompressionStream", useCompressionStream);
		setIfDefined("useWebWorkers", useWebWorkers);
		if (Deflate) {
			config.CompressionStream = new StreamAdapter(Deflate);
		}
		if (Inflate) {
			config.DecompressionStream = new StreamAdapter(Inflate);
		}
		setIfDefined("CompressionStream", CompressionStream);
		setIfDefined("DecompressionStream", DecompressionStream);
		if (workerScripts !== UNDEFINED_VALUE) {
			const { deflate, inflate } = workerScripts;
			if (deflate || inflate) {
				if (!config.workerScripts) {
					config.workerScripts = {};
				}
			}
			if (deflate) {
				if (!Array.isArray(deflate)) {
					throw new Error("workerScripts.deflate must be an array");
				}
				config.workerScripts.deflate = deflate;
			}
			if (inflate) {
				if (!Array.isArray(inflate)) {
					throw new Error("workerScripts.inflate must be an array");
				}
				config.workerScripts.inflate = inflate;
			}
		}
	}

	function setIfDefined(propertyName, propertyValue) {
		if (propertyValue !== UNDEFINED_VALUE) {
			config[propertyName] = propertyValue;
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const table$1 = {
		"application": {
			"andrew-inset": "ez",
			"annodex": "anx",
			"atom+xml": "atom",
			"atomcat+xml": "atomcat",
			"atomserv+xml": "atomsrv",
			"bbolin": "lin",
			"cu-seeme": "cu",
			"davmount+xml": "davmount",
			"dsptype": "tsp",
			"ecmascript": [
				"es",
				"ecma"
			],
			"futuresplash": "spl",
			"hta": "hta",
			"java-archive": "jar",
			"java-serialized-object": "ser",
			"java-vm": "class",
			"m3g": "m3g",
			"mac-binhex40": "hqx",
			"mathematica": [
				"nb",
				"ma",
				"mb"
			],
			"msaccess": "mdb",
			"msword": [
				"doc",
				"dot",
				"wiz"
			],
			"mxf": "mxf",
			"oda": "oda",
			"ogg": "ogx",
			"pdf": "pdf",
			"pgp-keys": "key",
			"pgp-signature": [
				"asc",
				"sig"
			],
			"pics-rules": "prf",
			"postscript": [
				"ps",
				"ai",
				"eps",
				"epsi",
				"epsf",
				"eps2",
				"eps3"
			],
			"rar": "rar",
			"rdf+xml": "rdf",
			"rss+xml": "rss",
			"rtf": "rtf",
			"xhtml+xml": [
				"xhtml",
				"xht"
			],
			"xml": [
				"xml",
				"xsl",
				"xsd",
				"xpdl"
			],
			"xspf+xml": "xspf",
			"zip": "zip",
			"vnd.android.package-archive": "apk",
			"vnd.cinderella": "cdy",
			"vnd.google-earth.kml+xml": "kml",
			"vnd.google-earth.kmz": "kmz",
			"vnd.mozilla.xul+xml": "xul",
			"vnd.ms-excel": [
				"xls",
				"xlb",
				"xlt",
				"xlm",
				"xla",
				"xlc",
				"xlw"
			],
			"vnd.ms-pki.seccat": "cat",
			"vnd.ms-pki.stl": "stl",
			"vnd.ms-powerpoint": [
				"ppt",
				"pps",
				"pot",
				"ppa",
				"pwz"
			],
			"vnd.oasis.opendocument.chart": "odc",
			"vnd.oasis.opendocument.database": "odb",
			"vnd.oasis.opendocument.formula": "odf",
			"vnd.oasis.opendocument.graphics": "odg",
			"vnd.oasis.opendocument.graphics-template": "otg",
			"vnd.oasis.opendocument.image": "odi",
			"vnd.oasis.opendocument.presentation": "odp",
			"vnd.oasis.opendocument.presentation-template": "otp",
			"vnd.oasis.opendocument.spreadsheet": "ods",
			"vnd.oasis.opendocument.spreadsheet-template": "ots",
			"vnd.oasis.opendocument.text": "odt",
			"vnd.oasis.opendocument.text-master": [
				"odm",
				"otm"
			],
			"vnd.oasis.opendocument.text-template": "ott",
			"vnd.oasis.opendocument.text-web": "oth",
			"vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
			"vnd.openxmlformats-officedocument.spreadsheetml.template": "xltx",
			"vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
			"vnd.openxmlformats-officedocument.presentationml.slideshow": "ppsx",
			"vnd.openxmlformats-officedocument.presentationml.template": "potx",
			"vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
			"vnd.openxmlformats-officedocument.wordprocessingml.template": "dotx",
			"vnd.smaf": "mmf",
			"vnd.stardivision.calc": "sdc",
			"vnd.stardivision.chart": "sds",
			"vnd.stardivision.draw": "sda",
			"vnd.stardivision.impress": "sdd",
			"vnd.stardivision.math": [
				"sdf",
				"smf"
			],
			"vnd.stardivision.writer": [
				"sdw",
				"vor"
			],
			"vnd.stardivision.writer-global": "sgl",
			"vnd.sun.xml.calc": "sxc",
			"vnd.sun.xml.calc.template": "stc",
			"vnd.sun.xml.draw": "sxd",
			"vnd.sun.xml.draw.template": "std",
			"vnd.sun.xml.impress": "sxi",
			"vnd.sun.xml.impress.template": "sti",
			"vnd.sun.xml.math": "sxm",
			"vnd.sun.xml.writer": "sxw",
			"vnd.sun.xml.writer.global": "sxg",
			"vnd.sun.xml.writer.template": "stw",
			"vnd.symbian.install": [
				"sis",
				"sisx"
			],
			"vnd.visio": [
				"vsd",
				"vst",
				"vss",
				"vsw",
				"vsdx",
				"vssx",
				"vstx",
				"vssm",
				"vstm"
			],
			"vnd.wap.wbxml": "wbxml",
			"vnd.wap.wmlc": "wmlc",
			"vnd.wap.wmlscriptc": "wmlsc",
			"vnd.wordperfect": "wpd",
			"vnd.wordperfect5.1": "wp5",
			"x-123": "wk",
			"x-7z-compressed": "7z",
			"x-abiword": "abw",
			"x-apple-diskimage": "dmg",
			"x-bcpio": "bcpio",
			"x-bittorrent": "torrent",
			"x-cbr": [
				"cbr",
				"cba",
				"cbt",
				"cb7"
			],
			"x-cbz": "cbz",
			"x-cdf": [
				"cdf",
				"cda"
			],
			"x-cdlink": "vcd",
			"x-chess-pgn": "pgn",
			"x-cpio": "cpio",
			"x-csh": "csh",
			"x-director": [
				"dir",
				"dxr",
				"cst",
				"cct",
				"cxt",
				"w3d",
				"fgd",
				"swa"
			],
			"x-dms": "dms",
			"x-doom": "wad",
			"x-dvi": "dvi",
			"x-httpd-eruby": "rhtml",
			"x-font": "pcf.Z",
			"x-freemind": "mm",
			"x-gnumeric": "gnumeric",
			"x-go-sgf": "sgf",
			"x-graphing-calculator": "gcf",
			"x-gtar": [
				"gtar",
				"taz"
			],
			"x-hdf": "hdf",
			"x-httpd-php": [
				"phtml",
				"pht",
				"php"
			],
			"x-httpd-php-source": "phps",
			"x-httpd-php3": "php3",
			"x-httpd-php3-preprocessed": "php3p",
			"x-httpd-php4": "php4",
			"x-httpd-php5": "php5",
			"x-ica": "ica",
			"x-info": "info",
			"x-internet-signup": [
				"ins",
				"isp"
			],
			"x-iphone": "iii",
			"x-iso9660-image": "iso",
			"x-java-jnlp-file": "jnlp",
			"x-jmol": "jmz",
			"x-killustrator": "kil",
			"x-latex": "latex",
			"x-lyx": "lyx",
			"x-lzx": "lzx",
			"x-maker": [
				"frm",
				"fb",
				"fbdoc"
			],
			"x-ms-wmd": "wmd",
			"x-msdos-program": [
				"com",
				"exe",
				"bat",
				"dll"
			],
			"x-netcdf": [
				"nc"
			],
			"x-ns-proxy-autoconfig": [
				"pac",
				"dat"
			],
			"x-nwc": "nwc",
			"x-object": "o",
			"x-oz-application": "oza",
			"x-pkcs7-certreqresp": "p7r",
			"x-python-code": [
				"pyc",
				"pyo"
			],
			"x-qgis": [
				"qgs",
				"shp",
				"shx"
			],
			"x-quicktimeplayer": "qtl",
			"x-redhat-package-manager": [
				"rpm",
				"rpa"
			],
			"x-ruby": "rb",
			"x-sh": "sh",
			"x-shar": "shar",
			"x-shockwave-flash": [
				"swf",
				"swfl"
			],
			"x-silverlight": "scr",
			"x-stuffit": "sit",
			"x-sv4cpio": "sv4cpio",
			"x-sv4crc": "sv4crc",
			"x-tar": "tar",
			"x-tex-gf": "gf",
			"x-tex-pk": "pk",
			"x-texinfo": [
				"texinfo",
				"texi"
			],
			"x-trash": [
				"~",
				"%",
				"bak",
				"old",
				"sik"
			],
			"x-ustar": "ustar",
			"x-wais-source": "src",
			"x-wingz": "wz",
			"x-x509-ca-cert": [
				"crt",
				"der",
				"cer"
			],
			"x-xcf": "xcf",
			"x-xfig": "fig",
			"x-xpinstall": "xpi",
			"applixware": "aw",
			"atomsvc+xml": "atomsvc",
			"ccxml+xml": "ccxml",
			"cdmi-capability": "cdmia",
			"cdmi-container": "cdmic",
			"cdmi-domain": "cdmid",
			"cdmi-object": "cdmio",
			"cdmi-queue": "cdmiq",
			"docbook+xml": "dbk",
			"dssc+der": "dssc",
			"dssc+xml": "xdssc",
			"emma+xml": "emma",
			"epub+zip": "epub",
			"exi": "exi",
			"font-tdpfr": "pfr",
			"gml+xml": "gml",
			"gpx+xml": "gpx",
			"gxf": "gxf",
			"hyperstudio": "stk",
			"inkml+xml": [
				"ink",
				"inkml"
			],
			"ipfix": "ipfix",
			"jsonml+json": "jsonml",
			"lost+xml": "lostxml",
			"mads+xml": "mads",
			"marc": "mrc",
			"marcxml+xml": "mrcx",
			"mathml+xml": [
				"mathml",
				"mml"
			],
			"mbox": "mbox",
			"mediaservercontrol+xml": "mscml",
			"metalink+xml": "metalink",
			"metalink4+xml": "meta4",
			"mets+xml": "mets",
			"mods+xml": "mods",
			"mp21": [
				"m21",
				"mp21"
			],
			"mp4": "mp4s",
			"oebps-package+xml": "opf",
			"omdoc+xml": "omdoc",
			"onenote": [
				"onetoc",
				"onetoc2",
				"onetmp",
				"onepkg"
			],
			"oxps": "oxps",
			"patch-ops-error+xml": "xer",
			"pgp-encrypted": "pgp",
			"pkcs10": "p10",
			"pkcs7-mime": [
				"p7m",
				"p7c"
			],
			"pkcs7-signature": "p7s",
			"pkcs8": "p8",
			"pkix-attr-cert": "ac",
			"pkix-crl": "crl",
			"pkix-pkipath": "pkipath",
			"pkixcmp": "pki",
			"pls+xml": "pls",
			"prs.cww": "cww",
			"pskc+xml": "pskcxml",
			"reginfo+xml": "rif",
			"relax-ng-compact-syntax": "rnc",
			"resource-lists+xml": "rl",
			"resource-lists-diff+xml": "rld",
			"rls-services+xml": "rs",
			"rpki-ghostbusters": "gbr",
			"rpki-manifest": "mft",
			"rpki-roa": "roa",
			"rsd+xml": "rsd",
			"sbml+xml": "sbml",
			"scvp-cv-request": "scq",
			"scvp-cv-response": "scs",
			"scvp-vp-request": "spq",
			"scvp-vp-response": "spp",
			"sdp": "sdp",
			"set-payment-initiation": "setpay",
			"set-registration-initiation": "setreg",
			"shf+xml": "shf",
			"sparql-query": "rq",
			"sparql-results+xml": "srx",
			"srgs": "gram",
			"srgs+xml": "grxml",
			"sru+xml": "sru",
			"ssdl+xml": "ssdl",
			"ssml+xml": "ssml",
			"tei+xml": [
				"tei",
				"teicorpus"
			],
			"thraud+xml": "tfi",
			"timestamped-data": "tsd",
			"vnd.3gpp.pic-bw-large": "plb",
			"vnd.3gpp.pic-bw-small": "psb",
			"vnd.3gpp.pic-bw-var": "pvb",
			"vnd.3gpp2.tcap": "tcap",
			"vnd.3m.post-it-notes": "pwn",
			"vnd.accpac.simply.aso": "aso",
			"vnd.accpac.simply.imp": "imp",
			"vnd.acucobol": "acu",
			"vnd.acucorp": [
				"atc",
				"acutc"
			],
			"vnd.adobe.air-application-installer-package+zip": "air",
			"vnd.adobe.formscentral.fcdt": "fcdt",
			"vnd.adobe.fxp": [
				"fxp",
				"fxpl"
			],
			"vnd.adobe.xdp+xml": "xdp",
			"vnd.adobe.xfdf": "xfdf",
			"vnd.ahead.space": "ahead",
			"vnd.airzip.filesecure.azf": "azf",
			"vnd.airzip.filesecure.azs": "azs",
			"vnd.amazon.ebook": "azw",
			"vnd.americandynamics.acc": "acc",
			"vnd.amiga.ami": "ami",
			"vnd.anser-web-certificate-issue-initiation": "cii",
			"vnd.anser-web-funds-transfer-initiation": "fti",
			"vnd.antix.game-component": "atx",
			"vnd.apple.installer+xml": "mpkg",
			"vnd.apple.mpegurl": "m3u8",
			"vnd.aristanetworks.swi": "swi",
			"vnd.astraea-software.iota": "iota",
			"vnd.audiograph": "aep",
			"vnd.blueice.multipass": "mpm",
			"vnd.bmi": "bmi",
			"vnd.businessobjects": "rep",
			"vnd.chemdraw+xml": "cdxml",
			"vnd.chipnuts.karaoke-mmd": "mmd",
			"vnd.claymore": "cla",
			"vnd.cloanto.rp9": "rp9",
			"vnd.clonk.c4group": [
				"c4g",
				"c4d",
				"c4f",
				"c4p",
				"c4u"
			],
			"vnd.cluetrust.cartomobile-config": "c11amc",
			"vnd.cluetrust.cartomobile-config-pkg": "c11amz",
			"vnd.commonspace": "csp",
			"vnd.contact.cmsg": "cdbcmsg",
			"vnd.cosmocaller": "cmc",
			"vnd.crick.clicker": "clkx",
			"vnd.crick.clicker.keyboard": "clkk",
			"vnd.crick.clicker.palette": "clkp",
			"vnd.crick.clicker.template": "clkt",
			"vnd.crick.clicker.wordbank": "clkw",
			"vnd.criticaltools.wbs+xml": "wbs",
			"vnd.ctc-posml": "pml",
			"vnd.cups-ppd": "ppd",
			"vnd.curl.car": "car",
			"vnd.curl.pcurl": "pcurl",
			"vnd.dart": "dart",
			"vnd.data-vision.rdz": "rdz",
			"vnd.dece.data": [
				"uvf",
				"uvvf",
				"uvd",
				"uvvd"
			],
			"vnd.dece.ttml+xml": [
				"uvt",
				"uvvt"
			],
			"vnd.dece.unspecified": [
				"uvx",
				"uvvx"
			],
			"vnd.dece.zip": [
				"uvz",
				"uvvz"
			],
			"vnd.denovo.fcselayout-link": "fe_launch",
			"vnd.dna": "dna",
			"vnd.dolby.mlp": "mlp",
			"vnd.dpgraph": "dpg",
			"vnd.dreamfactory": "dfac",
			"vnd.ds-keypoint": "kpxx",
			"vnd.dvb.ait": "ait",
			"vnd.dvb.service": "svc",
			"vnd.dynageo": "geo",
			"vnd.ecowin.chart": "mag",
			"vnd.enliven": "nml",
			"vnd.epson.esf": "esf",
			"vnd.epson.msf": "msf",
			"vnd.epson.quickanime": "qam",
			"vnd.epson.salt": "slt",
			"vnd.epson.ssf": "ssf",
			"vnd.eszigno3+xml": [
				"es3",
				"et3"
			],
			"vnd.ezpix-album": "ez2",
			"vnd.ezpix-package": "ez3",
			"vnd.fdf": "fdf",
			"vnd.fdsn.mseed": "mseed",
			"vnd.fdsn.seed": [
				"seed",
				"dataless"
			],
			"vnd.flographit": "gph",
			"vnd.fluxtime.clip": "ftc",
			"vnd.framemaker": [
				"fm",
				"frame",
				"maker",
				"book"
			],
			"vnd.frogans.fnc": "fnc",
			"vnd.frogans.ltf": "ltf",
			"vnd.fsc.weblaunch": "fsc",
			"vnd.fujitsu.oasys": "oas",
			"vnd.fujitsu.oasys2": "oa2",
			"vnd.fujitsu.oasys3": "oa3",
			"vnd.fujitsu.oasysgp": "fg5",
			"vnd.fujitsu.oasysprs": "bh2",
			"vnd.fujixerox.ddd": "ddd",
			"vnd.fujixerox.docuworks": "xdw",
			"vnd.fujixerox.docuworks.binder": "xbd",
			"vnd.fuzzysheet": "fzs",
			"vnd.genomatix.tuxedo": "txd",
			"vnd.geogebra.file": "ggb",
			"vnd.geogebra.tool": "ggt",
			"vnd.geometry-explorer": [
				"gex",
				"gre"
			],
			"vnd.geonext": "gxt",
			"vnd.geoplan": "g2w",
			"vnd.geospace": "g3w",
			"vnd.gmx": "gmx",
			"vnd.grafeq": [
				"gqf",
				"gqs"
			],
			"vnd.groove-account": "gac",
			"vnd.groove-help": "ghf",
			"vnd.groove-identity-message": "gim",
			"vnd.groove-injector": "grv",
			"vnd.groove-tool-message": "gtm",
			"vnd.groove-tool-template": "tpl",
			"vnd.groove-vcard": "vcg",
			"vnd.hal+xml": "hal",
			"vnd.handheld-entertainment+xml": "zmm",
			"vnd.hbci": "hbci",
			"vnd.hhe.lesson-player": "les",
			"vnd.hp-hpgl": "hpgl",
			"vnd.hp-hpid": "hpid",
			"vnd.hp-hps": "hps",
			"vnd.hp-jlyt": "jlt",
			"vnd.hp-pcl": "pcl",
			"vnd.hp-pclxl": "pclxl",
			"vnd.hydrostatix.sof-data": "sfd-hdstx",
			"vnd.ibm.minipay": "mpy",
			"vnd.ibm.modcap": [
				"afp",
				"listafp",
				"list3820"
			],
			"vnd.ibm.rights-management": "irm",
			"vnd.ibm.secure-container": "sc",
			"vnd.iccprofile": [
				"icc",
				"icm"
			],
			"vnd.igloader": "igl",
			"vnd.immervision-ivp": "ivp",
			"vnd.immervision-ivu": "ivu",
			"vnd.insors.igm": "igm",
			"vnd.intercon.formnet": [
				"xpw",
				"xpx"
			],
			"vnd.intergeo": "i2g",
			"vnd.intu.qbo": "qbo",
			"vnd.intu.qfx": "qfx",
			"vnd.ipunplugged.rcprofile": "rcprofile",
			"vnd.irepository.package+xml": "irp",
			"vnd.is-xpr": "xpr",
			"vnd.isac.fcs": "fcs",
			"vnd.jam": "jam",
			"vnd.jcp.javame.midlet-rms": "rms",
			"vnd.jisp": "jisp",
			"vnd.joost.joda-archive": "joda",
			"vnd.kahootz": [
				"ktz",
				"ktr"
			],
			"vnd.kde.karbon": "karbon",
			"vnd.kde.kchart": "chrt",
			"vnd.kde.kformula": "kfo",
			"vnd.kde.kivio": "flw",
			"vnd.kde.kontour": "kon",
			"vnd.kde.kpresenter": [
				"kpr",
				"kpt"
			],
			"vnd.kde.kspread": "ksp",
			"vnd.kde.kword": [
				"kwd",
				"kwt"
			],
			"vnd.kenameaapp": "htke",
			"vnd.kidspiration": "kia",
			"vnd.kinar": [
				"kne",
				"knp"
			],
			"vnd.koan": [
				"skp",
				"skd",
				"skt",
				"skm"
			],
			"vnd.kodak-descriptor": "sse",
			"vnd.las.las+xml": "lasxml",
			"vnd.llamagraphics.life-balance.desktop": "lbd",
			"vnd.llamagraphics.life-balance.exchange+xml": "lbe",
			"vnd.lotus-1-2-3": "123",
			"vnd.lotus-approach": "apr",
			"vnd.lotus-freelance": "pre",
			"vnd.lotus-notes": "nsf",
			"vnd.lotus-organizer": "org",
			"vnd.lotus-screencam": "scm",
			"vnd.lotus-wordpro": "lwp",
			"vnd.macports.portpkg": "portpkg",
			"vnd.mcd": "mcd",
			"vnd.medcalcdata": "mc1",
			"vnd.mediastation.cdkey": "cdkey",
			"vnd.mfer": "mwf",
			"vnd.mfmp": "mfm",
			"vnd.micrografx.flo": "flo",
			"vnd.micrografx.igx": "igx",
			"vnd.mif": "mif",
			"vnd.mobius.daf": "daf",
			"vnd.mobius.dis": "dis",
			"vnd.mobius.mbk": "mbk",
			"vnd.mobius.mqy": "mqy",
			"vnd.mobius.msl": "msl",
			"vnd.mobius.plc": "plc",
			"vnd.mobius.txf": "txf",
			"vnd.mophun.application": "mpn",
			"vnd.mophun.certificate": "mpc",
			"vnd.ms-artgalry": "cil",
			"vnd.ms-cab-compressed": "cab",
			"vnd.ms-excel.addin.macroenabled.12": "xlam",
			"vnd.ms-excel.sheet.binary.macroenabled.12": "xlsb",
			"vnd.ms-excel.sheet.macroenabled.12": "xlsm",
			"vnd.ms-excel.template.macroenabled.12": "xltm",
			"vnd.ms-fontobject": "eot",
			"vnd.ms-htmlhelp": "chm",
			"vnd.ms-ims": "ims",
			"vnd.ms-lrm": "lrm",
			"vnd.ms-officetheme": "thmx",
			"vnd.ms-powerpoint.addin.macroenabled.12": "ppam",
			"vnd.ms-powerpoint.presentation.macroenabled.12": "pptm",
			"vnd.ms-powerpoint.slide.macroenabled.12": "sldm",
			"vnd.ms-powerpoint.slideshow.macroenabled.12": "ppsm",
			"vnd.ms-powerpoint.template.macroenabled.12": "potm",
			"vnd.ms-project": [
				"mpp",
				"mpt"
			],
			"vnd.ms-word.document.macroenabled.12": "docm",
			"vnd.ms-word.template.macroenabled.12": "dotm",
			"vnd.ms-works": [
				"wps",
				"wks",
				"wcm",
				"wdb"
			],
			"vnd.ms-wpl": "wpl",
			"vnd.ms-xpsdocument": "xps",
			"vnd.mseq": "mseq",
			"vnd.musician": "mus",
			"vnd.muvee.style": "msty",
			"vnd.mynfc": "taglet",
			"vnd.neurolanguage.nlu": "nlu",
			"vnd.nitf": [
				"ntf",
				"nitf"
			],
			"vnd.noblenet-directory": "nnd",
			"vnd.noblenet-sealer": "nns",
			"vnd.noblenet-web": "nnw",
			"vnd.nokia.n-gage.data": "ngdat",
			"vnd.nokia.n-gage.symbian.install": "n-gage",
			"vnd.nokia.radio-preset": "rpst",
			"vnd.nokia.radio-presets": "rpss",
			"vnd.novadigm.edm": "edm",
			"vnd.novadigm.edx": "edx",
			"vnd.novadigm.ext": "ext",
			"vnd.oasis.opendocument.chart-template": "otc",
			"vnd.oasis.opendocument.formula-template": "odft",
			"vnd.oasis.opendocument.image-template": "oti",
			"vnd.olpc-sugar": "xo",
			"vnd.oma.dd2+xml": "dd2",
			"vnd.openofficeorg.extension": "oxt",
			"vnd.openxmlformats-officedocument.presentationml.slide": "sldx",
			"vnd.osgeo.mapguide.package": "mgp",
			"vnd.osgi.dp": "dp",
			"vnd.osgi.subsystem": "esa",
			"vnd.palm": [
				"pdb",
				"pqa",
				"oprc"
			],
			"vnd.pawaafile": "paw",
			"vnd.pg.format": "str",
			"vnd.pg.osasli": "ei6",
			"vnd.picsel": "efif",
			"vnd.pmi.widget": "wg",
			"vnd.pocketlearn": "plf",
			"vnd.powerbuilder6": "pbd",
			"vnd.previewsystems.box": "box",
			"vnd.proteus.magazine": "mgz",
			"vnd.publishare-delta-tree": "qps",
			"vnd.pvi.ptid1": "ptid",
			"vnd.quark.quarkxpress": [
				"qxd",
				"qxt",
				"qwd",
				"qwt",
				"qxl",
				"qxb"
			],
			"vnd.realvnc.bed": "bed",
			"vnd.recordare.musicxml": "mxl",
			"vnd.recordare.musicxml+xml": "musicxml",
			"vnd.rig.cryptonote": "cryptonote",
			"vnd.rn-realmedia": "rm",
			"vnd.rn-realmedia-vbr": "rmvb",
			"vnd.route66.link66+xml": "link66",
			"vnd.sailingtracker.track": "st",
			"vnd.seemail": "see",
			"vnd.sema": "sema",
			"vnd.semd": "semd",
			"vnd.semf": "semf",
			"vnd.shana.informed.formdata": "ifm",
			"vnd.shana.informed.formtemplate": "itp",
			"vnd.shana.informed.interchange": "iif",
			"vnd.shana.informed.package": "ipk",
			"vnd.simtech-mindmapper": [
				"twd",
				"twds"
			],
			"vnd.smart.teacher": "teacher",
			"vnd.solent.sdkm+xml": [
				"sdkm",
				"sdkd"
			],
			"vnd.spotfire.dxp": "dxp",
			"vnd.spotfire.sfs": "sfs",
			"vnd.stepmania.package": "smzip",
			"vnd.stepmania.stepchart": "sm",
			"vnd.sus-calendar": [
				"sus",
				"susp"
			],
			"vnd.svd": "svd",
			"vnd.syncml+xml": "xsm",
			"vnd.syncml.dm+wbxml": "bdm",
			"vnd.syncml.dm+xml": "xdm",
			"vnd.tao.intent-module-archive": "tao",
			"vnd.tcpdump.pcap": [
				"pcap",
				"cap",
				"dmp"
			],
			"vnd.tmobile-livetv": "tmo",
			"vnd.trid.tpt": "tpt",
			"vnd.triscape.mxs": "mxs",
			"vnd.trueapp": "tra",
			"vnd.ufdl": [
				"ufd",
				"ufdl"
			],
			"vnd.uiq.theme": "utz",
			"vnd.umajin": "umj",
			"vnd.unity": "unityweb",
			"vnd.uoml+xml": "uoml",
			"vnd.vcx": "vcx",
			"vnd.visionary": "vis",
			"vnd.vsf": "vsf",
			"vnd.webturbo": "wtb",
			"vnd.wolfram.player": "nbp",
			"vnd.wqd": "wqd",
			"vnd.wt.stf": "stf",
			"vnd.xara": "xar",
			"vnd.xfdl": "xfdl",
			"vnd.yamaha.hv-dic": "hvd",
			"vnd.yamaha.hv-script": "hvs",
			"vnd.yamaha.hv-voice": "hvp",
			"vnd.yamaha.openscoreformat": "osf",
			"vnd.yamaha.openscoreformat.osfpvg+xml": "osfpvg",
			"vnd.yamaha.smaf-audio": "saf",
			"vnd.yamaha.smaf-phrase": "spf",
			"vnd.yellowriver-custom-menu": "cmp",
			"vnd.zul": [
				"zir",
				"zirz"
			],
			"vnd.zzazz.deck+xml": "zaz",
			"voicexml+xml": "vxml",
			"widget": "wgt",
			"winhlp": "hlp",
			"wsdl+xml": "wsdl",
			"wspolicy+xml": "wspolicy",
			"x-ace-compressed": "ace",
			"x-authorware-bin": [
				"aab",
				"x32",
				"u32",
				"vox"
			],
			"x-authorware-map": "aam",
			"x-authorware-seg": "aas",
			"x-blorb": [
				"blb",
				"blorb"
			],
			"x-bzip": "bz",
			"x-bzip2": [
				"bz2",
				"boz"
			],
			"x-cfs-compressed": "cfs",
			"x-chat": "chat",
			"x-conference": "nsc",
			"x-dgc-compressed": "dgc",
			"x-dtbncx+xml": "ncx",
			"x-dtbook+xml": "dtb",
			"x-dtbresource+xml": "res",
			"x-eva": "eva",
			"x-font-bdf": "bdf",
			"x-font-ghostscript": "gsf",
			"x-font-linux-psf": "psf",
			"x-font-pcf": "pcf",
			"x-font-snf": "snf",
			"x-font-ttf": [
				"ttf",
				"ttc"
			],
			"x-font-type1": [
				"pfa",
				"pfb",
				"pfm",
				"afm"
			],
			"x-freearc": "arc",
			"x-gca-compressed": "gca",
			"x-glulx": "ulx",
			"x-gramps-xml": "gramps",
			"x-install-instructions": "install",
			"x-lzh-compressed": [
				"lzh",
				"lha"
			],
			"x-mie": "mie",
			"x-mobipocket-ebook": [
				"prc",
				"mobi"
			],
			"x-ms-application": "application",
			"x-ms-shortcut": "lnk",
			"x-ms-xbap": "xbap",
			"x-msbinder": "obd",
			"x-mscardfile": "crd",
			"x-msclip": "clp",
			"application/x-ms-installer": "msi",
			"x-msmediaview": [
				"mvb",
				"m13",
				"m14"
			],
			"x-msmetafile": [
				"wmf",
				"wmz",
				"emf",
				"emz"
			],
			"x-msmoney": "mny",
			"x-mspublisher": "pub",
			"x-msschedule": "scd",
			"x-msterminal": "trm",
			"x-mswrite": "wri",
			"x-nzb": "nzb",
			"x-pkcs12": [
				"p12",
				"pfx"
			],
			"x-pkcs7-certificates": [
				"p7b",
				"spc"
			],
			"x-research-info-systems": "ris",
			"x-silverlight-app": "xap",
			"x-sql": "sql",
			"x-stuffitx": "sitx",
			"x-subrip": "srt",
			"x-t3vm-image": "t3",
			"x-tex-tfm": "tfm",
			"x-tgif": "obj",
			"x-xliff+xml": "xlf",
			"x-xz": "xz",
			"x-zmachine": [
				"z1",
				"z2",
				"z3",
				"z4",
				"z5",
				"z6",
				"z7",
				"z8"
			],
			"xaml+xml": "xaml",
			"xcap-diff+xml": "xdf",
			"xenc+xml": "xenc",
			"xml-dtd": "dtd",
			"xop+xml": "xop",
			"xproc+xml": "xpl",
			"xslt+xml": "xslt",
			"xv+xml": [
				"mxml",
				"xhvml",
				"xvml",
				"xvm"
			],
			"yang": "yang",
			"yin+xml": "yin",
			"envoy": "evy",
			"fractals": "fif",
			"internet-property-stream": "acx",
			"olescript": "axs",
			"vnd.ms-outlook": "msg",
			"vnd.ms-pkicertstore": "sst",
			"x-compress": "z",
			"x-perfmon": [
				"pma",
				"pmc",
				"pmr",
				"pmw"
			],
			"ynd.ms-pkipko": "pko",
			"gzip": [
				"gz",
				"tgz"
			],
			"smil+xml": [
				"smi",
				"smil"
			],
			"vnd.debian.binary-package": [
				"deb",
				"udeb"
			],
			"vnd.hzn-3d-crossword": "x3d",
			"vnd.sqlite3": [
				"db",
				"sqlite",
				"sqlite3",
				"db-wal",
				"sqlite-wal",
				"db-shm",
				"sqlite-shm"
			],
			"vnd.wap.sic": "sic",
			"vnd.wap.slc": "slc",
			"x-krita": [
				"kra",
				"krz"
			],
			"x-perl": [
				"pm",
				"pl"
			],
			"yaml": [
				"yaml",
				"yml"
			]
		},
		"audio": {
			"amr": "amr",
			"amr-wb": "awb",
			"annodex": "axa",
			"basic": [
				"au",
				"snd"
			],
			"flac": "flac",
			"midi": [
				"mid",
				"midi",
				"kar",
				"rmi"
			],
			"mpeg": [
				"mpga",
				"mpega",
				"mp3",
				"m4a",
				"mp2a",
				"m2a",
				"m3a"
			],
			"mpegurl": "m3u",
			"ogg": [
				"oga",
				"ogg",
				"spx"
			],
			"prs.sid": "sid",
			"x-aiff": "aifc",
			"x-gsm": "gsm",
			"x-ms-wma": "wma",
			"x-ms-wax": "wax",
			"x-pn-realaudio": "ram",
			"x-realaudio": "ra",
			"x-sd2": "sd2",
			"adpcm": "adp",
			"mp4": "mp4a",
			"s3m": "s3m",
			"silk": "sil",
			"vnd.dece.audio": [
				"uva",
				"uvva"
			],
			"vnd.digital-winds": "eol",
			"vnd.dra": "dra",
			"vnd.dts": "dts",
			"vnd.dts.hd": "dtshd",
			"vnd.lucent.voice": "lvp",
			"vnd.ms-playready.media.pya": "pya",
			"vnd.nuera.ecelp4800": "ecelp4800",
			"vnd.nuera.ecelp7470": "ecelp7470",
			"vnd.nuera.ecelp9600": "ecelp9600",
			"vnd.rip": "rip",
			"webm": "weba",
			"x-caf": "caf",
			"x-matroska": "mka",
			"x-pn-realaudio-plugin": "rmp",
			"xm": "xm",
			"aac": "aac",
			"aiff": [
				"aiff",
				"aif",
				"aff"
			],
			"opus": "opus",
			"wav": "wav"
		},
		"chemical": {
			"x-alchemy": "alc",
			"x-cache": [
				"cac",
				"cache"
			],
			"x-cache-csf": "csf",
			"x-cactvs-binary": [
				"cbin",
				"cascii",
				"ctab"
			],
			"x-cdx": "cdx",
			"x-chem3d": "c3d",
			"x-cif": "cif",
			"x-cmdf": "cmdf",
			"x-cml": "cml",
			"x-compass": "cpa",
			"x-crossfire": "bsd",
			"x-csml": [
				"csml",
				"csm"
			],
			"x-ctx": "ctx",
			"x-cxf": [
				"cxf",
				"cef"
			],
			"x-embl-dl-nucleotide": [
				"emb",
				"embl"
			],
			"x-gamess-input": [
				"inp",
				"gam",
				"gamin"
			],
			"x-gaussian-checkpoint": [
				"fch",
				"fchk"
			],
			"x-gaussian-cube": "cub",
			"x-gaussian-input": [
				"gau",
				"gjc",
				"gjf"
			],
			"x-gaussian-log": "gal",
			"x-gcg8-sequence": "gcg",
			"x-genbank": "gen",
			"x-hin": "hin",
			"x-isostar": [
				"istr",
				"ist"
			],
			"x-jcamp-dx": [
				"jdx",
				"dx"
			],
			"x-kinemage": "kin",
			"x-macmolecule": "mcm",
			"x-macromodel-input": "mmod",
			"x-mdl-molfile": "mol",
			"x-mdl-rdfile": "rd",
			"x-mdl-rxnfile": "rxn",
			"x-mdl-sdfile": "sd",
			"x-mdl-tgf": "tgf",
			"x-mmcif": "mcif",
			"x-mol2": "mol2",
			"x-molconn-Z": "b",
			"x-mopac-graph": "gpt",
			"x-mopac-input": [
				"mop",
				"mopcrt",
				"zmt"
			],
			"x-mopac-out": "moo",
			"x-ncbi-asn1": "asn",
			"x-ncbi-asn1-ascii": [
				"prt",
				"ent"
			],
			"x-ncbi-asn1-binary": "val",
			"x-rosdal": "ros",
			"x-swissprot": "sw",
			"x-vamas-iso14976": "vms",
			"x-vmd": "vmd",
			"x-xtel": "xtel",
			"x-xyz": "xyz"
		},
		"font": {
			"otf": "otf",
			"woff": "woff",
			"woff2": "woff2"
		},
		"image": {
			"gif": "gif",
			"ief": "ief",
			"jpeg": [
				"jpeg",
				"jpg",
				"jpe",
				"jfif",
				"jfif-tbnl",
				"jif"
			],
			"pcx": "pcx",
			"png": "png",
			"svg+xml": [
				"svg",
				"svgz"
			],
			"tiff": [
				"tiff",
				"tif"
			],
			"vnd.djvu": [
				"djvu",
				"djv"
			],
			"vnd.wap.wbmp": "wbmp",
			"x-canon-cr2": "cr2",
			"x-canon-crw": "crw",
			"x-cmu-raster": "ras",
			"x-coreldraw": "cdr",
			"x-coreldrawpattern": "pat",
			"x-coreldrawtemplate": "cdt",
			"x-corelphotopaint": "cpt",
			"x-epson-erf": "erf",
			"x-icon": "ico",
			"x-jg": "art",
			"x-jng": "jng",
			"x-nikon-nef": "nef",
			"x-olympus-orf": "orf",
			"x-portable-anymap": "pnm",
			"x-portable-bitmap": "pbm",
			"x-portable-graymap": "pgm",
			"x-portable-pixmap": "ppm",
			"x-rgb": "rgb",
			"x-xbitmap": "xbm",
			"x-xpixmap": "xpm",
			"x-xwindowdump": "xwd",
			"bmp": "bmp",
			"cgm": "cgm",
			"g3fax": "g3",
			"ktx": "ktx",
			"prs.btif": "btif",
			"sgi": "sgi",
			"vnd.dece.graphic": [
				"uvi",
				"uvvi",
				"uvg",
				"uvvg"
			],
			"vnd.dwg": "dwg",
			"vnd.dxf": "dxf",
			"vnd.fastbidsheet": "fbs",
			"vnd.fpx": "fpx",
			"vnd.fst": "fst",
			"vnd.fujixerox.edmics-mmr": "mmr",
			"vnd.fujixerox.edmics-rlc": "rlc",
			"vnd.ms-modi": "mdi",
			"vnd.ms-photo": "wdp",
			"vnd.net-fpx": "npx",
			"vnd.xiff": "xif",
			"webp": "webp",
			"x-3ds": "3ds",
			"x-cmx": "cmx",
			"x-freehand": [
				"fh",
				"fhc",
				"fh4",
				"fh5",
				"fh7"
			],
			"x-pict": [
				"pic",
				"pct"
			],
			"x-tga": "tga",
			"cis-cod": "cod",
			"avif": "avifs",
			"heic": [
				"heif",
				"heic"
			],
			"pjpeg": [
				"pjpg"
			],
			"vnd.adobe.photoshop": "psd",
			"x-adobe-dng": "dng",
			"x-fuji-raf": "raf",
			"x-icns": "icns",
			"x-kodak-dcr": "dcr",
			"x-kodak-k25": "k25",
			"x-kodak-kdc": "kdc",
			"x-minolta-mrw": "mrw",
			"x-panasonic-raw": [
				"raw",
				"rw2",
				"rwl"
			],
			"x-pentax-pef": [
				"pef",
				"ptx"
			],
			"x-sigma-x3f": "x3f",
			"x-sony-arw": "arw",
			"x-sony-sr2": "sr2",
			"x-sony-srf": "srf"
		},
		"message": {
			"rfc822": [
				"eml",
				"mime",
				"mht",
				"mhtml",
				"nws"
			]
		},
		"model": {
			"iges": [
				"igs",
				"iges"
			],
			"mesh": [
				"msh",
				"mesh",
				"silo"
			],
			"vrml": [
				"wrl",
				"vrml"
			],
			"x3d+vrml": [
				"x3dv",
				"x3dvz"
			],
			"x3d+xml": "x3dz",
			"x3d+binary": [
				"x3db",
				"x3dbz"
			],
			"vnd.collada+xml": "dae",
			"vnd.dwf": "dwf",
			"vnd.gdl": "gdl",
			"vnd.gtw": "gtw",
			"vnd.mts": "mts",
			"vnd.usdz+zip": "usdz",
			"vnd.vtu": "vtu"
		},
		"text": {
			"cache-manifest": [
				"manifest",
				"appcache"
			],
			"calendar": [
				"ics",
				"icz",
				"ifb"
			],
			"css": "css",
			"csv": "csv",
			"h323": "323",
			"html": [
				"html",
				"htm",
				"shtml",
				"stm"
			],
			"iuls": "uls",
			"plain": [
				"txt",
				"text",
				"brf",
				"conf",
				"def",
				"list",
				"log",
				"in",
				"bas",
				"diff",
				"ksh"
			],
			"richtext": "rtx",
			"scriptlet": [
				"sct",
				"wsc"
			],
			"texmacs": "tm",
			"tab-separated-values": "tsv",
			"vnd.sun.j2me.app-descriptor": "jad",
			"vnd.wap.wml": "wml",
			"vnd.wap.wmlscript": "wmls",
			"x-bibtex": "bib",
			"x-boo": "boo",
			"x-c++hdr": [
				"h++",
				"hpp",
				"hxx",
				"hh"
			],
			"x-c++src": [
				"c++",
				"cpp",
				"cxx",
				"cc"
			],
			"x-component": "htc",
			"x-dsrc": "d",
			"x-diff": "patch",
			"x-haskell": "hs",
			"x-java": "java",
			"x-literate-haskell": "lhs",
			"x-moc": "moc",
			"x-pascal": [
				"p",
				"pas",
				"pp",
				"inc"
			],
			"x-pcs-gcd": "gcd",
			"x-python": "py",
			"x-scala": "scala",
			"x-setext": "etx",
			"x-tcl": [
				"tcl",
				"tk"
			],
			"x-tex": [
				"tex",
				"ltx",
				"sty",
				"cls"
			],
			"x-vcalendar": "vcs",
			"x-vcard": "vcf",
			"n3": "n3",
			"prs.lines.tag": "dsc",
			"sgml": [
				"sgml",
				"sgm"
			],
			"troff": [
				"t",
				"tr",
				"roff",
				"man",
				"me",
				"ms"
			],
			"turtle": "ttl",
			"uri-list": [
				"uri",
				"uris",
				"urls"
			],
			"vcard": "vcard",
			"vnd.curl": "curl",
			"vnd.curl.dcurl": "dcurl",
			"vnd.curl.scurl": "scurl",
			"vnd.curl.mcurl": "mcurl",
			"vnd.dvb.subtitle": "sub",
			"vnd.fly": "fly",
			"vnd.fmi.flexstor": "flx",
			"vnd.graphviz": "gv",
			"vnd.in3d.3dml": "3dml",
			"vnd.in3d.spot": "spot",
			"x-asm": [
				"s",
				"asm"
			],
			"x-c": [
				"c",
				"h",
				"dic"
			],
			"x-fortran": [
				"f",
				"for",
				"f77",
				"f90"
			],
			"x-opml": "opml",
			"x-nfo": "nfo",
			"x-sfv": "sfv",
			"x-uuencode": "uu",
			"webviewhtml": "htt",
			"javascript": "js",
			"json": "json",
			"markdown": [
				"md",
				"markdown",
				"mdown",
				"markdn"
			],
			"vnd.wap.si": "si",
			"vnd.wap.sl": "sl"
		},
		"video": {
			"avif": "avif",
			"3gpp": "3gp",
			"annodex": "axv",
			"dl": "dl",
			"dv": [
				"dif",
				"dv"
			],
			"fli": "fli",
			"gl": "gl",
			"mpeg": [
				"mpeg",
				"mpg",
				"mpe",
				"m1v",
				"m2v",
				"mp2",
				"mpa",
				"mpv2"
			],
			"mp4": [
				"mp4",
				"mp4v",
				"mpg4"
			],
			"quicktime": [
				"qt",
				"mov"
			],
			"ogg": "ogv",
			"vnd.mpegurl": [
				"mxu",
				"m4u"
			],
			"x-flv": "flv",
			"x-la-asf": [
				"lsf",
				"lsx"
			],
			"x-mng": "mng",
			"x-ms-asf": [
				"asf",
				"asx",
				"asr"
			],
			"x-ms-wm": "wm",
			"x-ms-wmv": "wmv",
			"x-ms-wmx": "wmx",
			"x-ms-wvx": "wvx",
			"x-msvideo": "avi",
			"x-sgi-movie": "movie",
			"x-matroska": [
				"mpv",
				"mkv",
				"mk3d",
				"mks"
			],
			"3gpp2": "3g2",
			"h261": "h261",
			"h263": "h263",
			"h264": "h264",
			"jpeg": "jpgv",
			"jpm": [
				"jpm",
				"jpgm"
			],
			"mj2": [
				"mj2",
				"mjp2"
			],
			"vnd.dece.hd": [
				"uvh",
				"uvvh"
			],
			"vnd.dece.mobile": [
				"uvm",
				"uvvm"
			],
			"vnd.dece.pd": [
				"uvp",
				"uvvp"
			],
			"vnd.dece.sd": [
				"uvs",
				"uvvs"
			],
			"vnd.dece.video": [
				"uvv",
				"uvvv"
			],
			"vnd.dvb.file": "dvb",
			"vnd.fvt": "fvt",
			"vnd.ms-playready.media.pyv": "pyv",
			"vnd.uvvu.mp4": [
				"uvu",
				"uvvu"
			],
			"vnd.vivo": "viv",
			"webm": "webm",
			"x-f4v": "f4v",
			"x-m4v": "m4v",
			"x-ms-vob": "vob",
			"x-smv": "smv",
			"mp2t": "ts"
		},
		"x-conference": {
			"x-cooltalk": "ice"
		},
		"x-world": {
			"x-vrml": [
				"vrm",
				"flr",
				"wrz",
				"xaf",
				"xof"
			]
		}
	};

	(() => {
		const mimeTypes = {};
		for (const type of Object.keys(table$1)) {
			for (const subtype of Object.keys(table$1[type])) {
				const value = table$1[type][subtype];
				if (typeof value == "string") {
					mimeTypes[value] = type + "/" + subtype;
				} else {
					for (let indexMimeType = 0; indexMimeType < value.length; indexMimeType++) {
						mimeTypes[value[indexMimeType]] = type + "/" + subtype;
					}
				}
			}
		}
		return mimeTypes;
	})();

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	const table = [];
	for (let i = 0; i < 256; i++) {
		let t = i;
		for (let j = 0; j < 8; j++) {
			if (t & 1) {
				t = (t >>> 1) ^ 0xEDB88320;
			} else {
				t = t >>> 1;
			}
		}
		table[i] = t;
	}

	class Crc32 {

		constructor(crc) {
			this.crc = crc || -1;
		}

		append(data) {
			let crc = this.crc | 0;
			for (let offset = 0, length = data.length | 0; offset < length; offset++) {
				crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF];
			}
			this.crc = crc;
		}

		get() {
			return ~this.crc;
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	class Crc32Stream extends TransformStream {

		constructor() {
			let stream;
			const crc32 = new Crc32();
			super({
				transform(chunk, controller) {
					crc32.append(chunk);
					controller.enqueue(chunk);
				},
				flush() {
					const value = new Uint8Array(4);
					const dataView = new DataView(value.buffer);
					dataView.setUint32(0, crc32.get());
					stream.value = value;
				}
			});
			stream = this;
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	function encodeText(value) {
		if (typeof TextEncoder == UNDEFINED_TYPE) {
			value = unescape(encodeURIComponent(value));
			const result = new Uint8Array(value.length);
			for (let i = 0; i < result.length; i++) {
				result[i] = value.charCodeAt(i);
			}
			return result;
		} else {
			return new TextEncoder().encode(value);
		}
	}

	// Derived from https://github.com/xqdoo00o/jszip/blob/master/lib/sjcl.js and https://github.com/bitwiseshiftleft/sjcl

	// deno-lint-ignore-file no-this-alias

	/*
	 * SJCL is open. You can use, modify and redistribute it under a BSD
	 * license or under the GNU GPL, version 2.0.
	 */

	/** @fileOverview Javascript cryptography implementation.
	 *
	 * Crush to remove comments, shorten variable names and
	 * generally reduce transmission size.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */

	/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/**
	 * Arrays of bits, encoded as arrays of Numbers.
	 * @namespace
	 * @description
	 * <p>
	 * These objects are the currency accepted by SJCL's crypto functions.
	 * </p>
	 *
	 * <p>
	 * Most of our crypto primitives operate on arrays of 4-byte words internally,
	 * but many of them can take arguments that are not a multiple of 4 bytes.
	 * This library encodes arrays of bits (whose size need not be a multiple of 8
	 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
	 * array of words, 32 bits at a time.  Since the words are double-precision
	 * floating point numbers, they fit some extra data.  We use this (in a private,
	 * possibly-changing manner) to encode the number of bits actually  present
	 * in the last word of the array.
	 * </p>
	 *
	 * <p>
	 * Because bitwise ops clear this out-of-band data, these arrays can be passed
	 * to ciphers like AES which want arrays of words.
	 * </p>
	 */
	const bitArray = {
		/**
		 * Concatenate two bit arrays.
		 * @param {bitArray} a1 The first array.
		 * @param {bitArray} a2 The second array.
		 * @return {bitArray} The concatenation of a1 and a2.
		 */
		concat(a1, a2) {
			if (a1.length === 0 || a2.length === 0) {
				return a1.concat(a2);
			}

			const last = a1[a1.length - 1], shift = bitArray.getPartial(last);
			if (shift === 32) {
				return a1.concat(a2);
			} else {
				return bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
			}
		},

		/**
		 * Find the length of an array of bits.
		 * @param {bitArray} a The array.
		 * @return {Number} The length of a, in bits.
		 */
		bitLength(a) {
			const l = a.length;
			if (l === 0) {
				return 0;
			}
			const x = a[l - 1];
			return (l - 1) * 32 + bitArray.getPartial(x);
		},

		/**
		 * Truncate an array.
		 * @param {bitArray} a The array.
		 * @param {Number} len The length to truncate to, in bits.
		 * @return {bitArray} A new array, truncated to len bits.
		 */
		clamp(a, len) {
			if (a.length * 32 < len) {
				return a;
			}
			a = a.slice(0, Math.ceil(len / 32));
			const l = a.length;
			len = len & 31;
			if (l > 0 && len) {
				a[l - 1] = bitArray.partial(len, a[l - 1] & 0x80000000 >> (len - 1), 1);
			}
			return a;
		},

		/**
		 * Make a partial word for a bit array.
		 * @param {Number} len The number of bits in the word.
		 * @param {Number} x The bits.
		 * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
		 * @return {Number} The partial word.
		 */
		partial(len, x, _end) {
			if (len === 32) {
				return x;
			}
			return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
		},

		/**
		 * Get the number of bits used by a partial word.
		 * @param {Number} x The partial word.
		 * @return {Number} The number of bits used by the partial word.
		 */
		getPartial(x) {
			return Math.round(x / 0x10000000000) || 32;
		},

		/** Shift an array right.
		 * @param {bitArray} a The array to shift.
		 * @param {Number} shift The number of bits to shift.
		 * @param {Number} [carry=0] A byte to carry in
		 * @param {bitArray} [out=[]] An array to prepend to the output.
		 * @private
		 */
		_shiftRight(a, shift, carry, out) {
			if (out === undefined) {
				out = [];
			}

			for (; shift >= 32; shift -= 32) {
				out.push(carry);
				carry = 0;
			}
			if (shift === 0) {
				return out.concat(a);
			}

			for (let i = 0; i < a.length; i++) {
				out.push(carry | a[i] >>> shift);
				carry = a[i] << (32 - shift);
			}
			const last2 = a.length ? a[a.length - 1] : 0;
			const shift2 = bitArray.getPartial(last2);
			out.push(bitArray.partial(shift + shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(), 1));
			return out;
		}
	};

	/** @fileOverview Bit array codec implementations.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/**
	 * Arrays of bytes
	 * @namespace
	 */
	const codec = {
		bytes: {
			/** Convert from a bitArray to an array of bytes. */
			fromBits(arr) {
				const bl = bitArray.bitLength(arr);
				const byteLength = bl / 8;
				const out = new Uint8Array(byteLength);
				let tmp;
				for (let i = 0; i < byteLength; i++) {
					if ((i & 3) === 0) {
						tmp = arr[i / 4];
					}
					out[i] = tmp >>> 24;
					tmp <<= 8;
				}
				return out;
			},
			/** Convert from an array of bytes to a bitArray. */
			toBits(bytes) {
				const out = [];
				let i;
				let tmp = 0;
				for (i = 0; i < bytes.length; i++) {
					tmp = tmp << 8 | bytes[i];
					if ((i & 3) === 3) {
						out.push(tmp);
						tmp = 0;
					}
				}
				if (i & 3) {
					out.push(bitArray.partial(8 * (i & 3), tmp));
				}
				return out;
			}
		}
	};

	const hash = {};

	/**
	 * Context for a SHA-1 operation in progress.
	 * @constructor
	 */
	hash.sha1 = class {
		constructor(hash) {
			const sha1 = this;
			/**
			 * The hash's block size, in bits.
			 * @constant
			 */
			sha1.blockSize = 512;
			/**
			 * The SHA-1 initialization vector.
			 * @private
			 */
			sha1._init = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
			/**
			 * The SHA-1 hash key.
			 * @private
			 */
			sha1._key = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];
			if (hash) {
				sha1._h = hash._h.slice(0);
				sha1._buffer = hash._buffer.slice(0);
				sha1._length = hash._length;
			} else {
				sha1.reset();
			}
		}

		/**
		 * Reset the hash state.
		 * @return this
		 */
		reset() {
			const sha1 = this;
			sha1._h = sha1._init.slice(0);
			sha1._buffer = [];
			sha1._length = 0;
			return sha1;
		}

		/**
		 * Input several words to the hash.
		 * @param {bitArray|String} data the data to hash.
		 * @return this
		 */
		update(data) {
			const sha1 = this;
			if (typeof data === "string") {
				data = codec.utf8String.toBits(data);
			}
			const b = sha1._buffer = bitArray.concat(sha1._buffer, data);
			const ol = sha1._length;
			const nl = sha1._length = ol + bitArray.bitLength(data);
			if (nl > 9007199254740991) {
				throw new Error("Cannot hash more than 2^53 - 1 bits");
			}
			const c = new Uint32Array(b);
			let j = 0;
			for (let i = sha1.blockSize + ol - ((sha1.blockSize + ol) & (sha1.blockSize - 1)); i <= nl;
				i += sha1.blockSize) {
				sha1._block(c.subarray(16 * j, 16 * (j + 1)));
				j += 1;
			}
			b.splice(0, 16 * j);
			return sha1;
		}

		/**
		 * Complete hashing and output the hash value.
		 * @return {bitArray} The hash value, an array of 5 big-endian words. TODO
		 */
		finalize() {
			const sha1 = this;
			let b = sha1._buffer;
			const h = sha1._h;

			// Round out and push the buffer
			b = bitArray.concat(b, [bitArray.partial(1, 1)]);
			// Round out the buffer to a multiple of 16 words, less the 2 length words.
			for (let i = b.length + 2; i & 15; i++) {
				b.push(0);
			}

			// append the length
			b.push(Math.floor(sha1._length / 0x100000000));
			b.push(sha1._length | 0);

			while (b.length) {
				sha1._block(b.splice(0, 16));
			}

			sha1.reset();
			return h;
		}

		/**
		 * The SHA-1 logical functions f(0), f(1), ..., f(79).
		 * @private
		 */
		_f(t, b, c, d) {
			if (t <= 19) {
				return (b & c) | (~b & d);
			} else if (t <= 39) {
				return b ^ c ^ d;
			} else if (t <= 59) {
				return (b & c) | (b & d) | (c & d);
			} else if (t <= 79) {
				return b ^ c ^ d;
			}
		}

		/**
		 * Circular left-shift operator.
		 * @private
		 */
		_S(n, x) {
			return (x << n) | (x >>> 32 - n);
		}

		/**
		 * Perform one cycle of SHA-1.
		 * @param {Uint32Array|bitArray} words one block of words.
		 * @private
		 */
		_block(words) {
			const sha1 = this;
			const h = sha1._h;
			// When words is passed to _block, it has 16 elements. SHA1 _block
			// function extends words with new elements (at the end there are 80 elements). 
			// The problem is that if we use Uint32Array instead of Array, 
			// the length of Uint32Array cannot be changed. Thus, we replace words with a 
			// normal Array here.
			const w = Array(80); // do not use Uint32Array here as the instantiation is slower
			for (let j = 0; j < 16; j++) {
				w[j] = words[j];
			}

			let a = h[0];
			let b = h[1];
			let c = h[2];
			let d = h[3];
			let e = h[4];

			for (let t = 0; t <= 79; t++) {
				if (t >= 16) {
					w[t] = sha1._S(1, w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]);
				}
				const tmp = (sha1._S(5, a) + sha1._f(t, b, c, d) + e + w[t] +
					sha1._key[Math.floor(t / 20)]) | 0;
				e = d;
				d = c;
				c = sha1._S(30, b);
				b = a;
				a = tmp;
			}

			h[0] = (h[0] + a) | 0;
			h[1] = (h[1] + b) | 0;
			h[2] = (h[2] + c) | 0;
			h[3] = (h[3] + d) | 0;
			h[4] = (h[4] + e) | 0;
		}
	};

	/** @fileOverview Low-level AES implementation.
	 *
	 * This file contains a low-level implementation of AES, optimized for
	 * size and for efficiency on several browsers.  It is based on
	 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
	 * Rijmen, Antoon Bosselaers and Paulo Barreto.
	 *
	 * An older version of this implementation is available in the public
	 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
	 * Stanford University 2008-2010 and BSD-licensed for liability
	 * reasons.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	const cipher = {};

	/**
	 * Schedule out an AES key for both encryption and decryption.  This
	 * is a low-level class.  Use a cipher mode to do bulk encryption.
	 *
	 * @constructor
	 * @param {Array} key The key as an array of 4, 6 or 8 words.
	 */
	cipher.aes = class {
		constructor(key) {
			/**
			 * The expanded S-box and inverse S-box tables.  These will be computed
			 * on the client so that we don't have to send them down the wire.
			 *
			 * There are two tables, _tables[0] is for encryption and
			 * _tables[1] is for decryption.
			 *
			 * The first 4 sub-tables are the expanded S-box with MixColumns.  The
			 * last (_tables[01][4]) is the S-box itself.
			 *
			 * @private
			 */
			const aes = this;
			aes._tables = [[[], [], [], [], []], [[], [], [], [], []]];

			if (!aes._tables[0][0][0]) {
				aes._precompute();
			}

			const sbox = aes._tables[0][4];
			const decTable = aes._tables[1];
			const keyLen = key.length;

			let i, encKey, decKey, rcon = 1;

			if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
				throw new Error("invalid aes key size");
			}

			aes._key = [encKey = key.slice(0), decKey = []];

			// schedule encryption keys
			for (i = keyLen; i < 4 * keyLen + 28; i++) {
				let tmp = encKey[i - 1];

				// apply sbox
				if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
					tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];

					// shift rows and add rcon
					if (i % keyLen === 0) {
						tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
						rcon = rcon << 1 ^ (rcon >> 7) * 283;
					}
				}

				encKey[i] = encKey[i - keyLen] ^ tmp;
			}

			// schedule decryption keys
			for (let j = 0; i; j++, i--) {
				const tmp = encKey[j & 3 ? i : i - 4];
				if (i <= 4 || j < 4) {
					decKey[j] = tmp;
				} else {
					decKey[j] = decTable[0][sbox[tmp >>> 24]] ^
						decTable[1][sbox[tmp >> 16 & 255]] ^
						decTable[2][sbox[tmp >> 8 & 255]] ^
						decTable[3][sbox[tmp & 255]];
				}
			}
		}
		// public
		/* Something like this might appear here eventually
		name: "AES",
		blockSize: 4,
		keySizes: [4,6,8],
		*/

		/**
		 * Encrypt an array of 4 big-endian words.
		 * @param {Array} data The plaintext.
		 * @return {Array} The ciphertext.
		 */
		encrypt(data) {
			return this._crypt(data, 0);
		}

		/**
		 * Decrypt an array of 4 big-endian words.
		 * @param {Array} data The ciphertext.
		 * @return {Array} The plaintext.
		 */
		decrypt(data) {
			return this._crypt(data, 1);
		}

		/**
		 * Expand the S-box tables.
		 *
		 * @private
		 */
		_precompute() {
			const encTable = this._tables[0];
			const decTable = this._tables[1];
			const sbox = encTable[4];
			const sboxInv = decTable[4];
			const d = [];
			const th = [];
			let xInv, x2, x4, x8;

			// Compute double and third tables
			for (let i = 0; i < 256; i++) {
				th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
			}

			for (let x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
				// Compute sbox
				let s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
				s = s >> 8 ^ s & 255 ^ 99;
				sbox[x] = s;
				sboxInv[s] = x;

				// Compute MixColumns
				x8 = d[x4 = d[x2 = d[x]]];
				let tDec = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
				let tEnc = d[s] * 0x101 ^ s * 0x1010100;

				for (let i = 0; i < 4; i++) {
					encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
					decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
				}
			}

			// Compactify.  Considerable speedup on Firefox.
			for (let i = 0; i < 5; i++) {
				encTable[i] = encTable[i].slice(0);
				decTable[i] = decTable[i].slice(0);
			}
		}

		/**
		 * Encryption and decryption core.
		 * @param {Array} input Four words to be encrypted or decrypted.
		 * @param dir The direction, 0 for encrypt and 1 for decrypt.
		 * @return {Array} The four encrypted or decrypted words.
		 * @private
		 */
		_crypt(input, dir) {
			if (input.length !== 4) {
				throw new Error("invalid aes block size");
			}

			const key = this._key[dir];

			const nInnerRounds = key.length / 4 - 2;
			const out = [0, 0, 0, 0];
			const table = this._tables[dir];

			// load up the tables
			const t0 = table[0];
			const t1 = table[1];
			const t2 = table[2];
			const t3 = table[3];
			const sbox = table[4];

			// state variables a,b,c,d are loaded with pre-whitened data
			let a = input[0] ^ key[0];
			let b = input[dir ? 3 : 1] ^ key[1];
			let c = input[2] ^ key[2];
			let d = input[dir ? 1 : 3] ^ key[3];
			let kIndex = 4;
			let a2, b2, c2;

			// Inner rounds.  Cribbed from OpenSSL.
			for (let i = 0; i < nInnerRounds; i++) {
				a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ key[kIndex];
				b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
				c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
				d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
				kIndex += 4;
				a = a2; b = b2; c = c2;
			}

			// Last round.
			for (let i = 0; i < 4; i++) {
				out[dir ? 3 & -i : i] =
					sbox[a >>> 24] << 24 ^
					sbox[b >> 16 & 255] << 16 ^
					sbox[c >> 8 & 255] << 8 ^
					sbox[d & 255] ^
					key[kIndex++];
				a2 = a; a = b; b = c; c = d; d = a2;
			}

			return out;
		}
	};

	/**
	 * Random values
	 * @namespace
	 */
	const random = {
		/** 
		 * Generate random words with pure js, cryptographically not as strong & safe as native implementation.
		 * @param {TypedArray} typedArray The array to fill.
		 * @return {TypedArray} The random values.
		 */
		getRandomValues(typedArray) {
			const words = new Uint32Array(typedArray.buffer);
			const r = (m_w) => {
				let m_z = 0x3ade68b1;
				const mask = 0xffffffff;
				return function () {
					m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
					m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
					const result = ((((m_z << 0x10) + m_w) & mask) / 0x100000000) + .5;
					return result * (Math.random() > .5 ? 1 : -1);
				};
			};
			for (let i = 0, rcache; i < typedArray.length; i += 4) {
				const _r = r((rcache || Math.random()) * 0x100000000);
				rcache = _r() * 0x3ade67b7;
				words[i / 4] = (_r() * 0x100000000) | 0;
			}
			return typedArray;
		}
	};

	/** @fileOverview CTR mode implementation.
	 *
	 * Special thanks to Roy Nicholson for pointing out a bug in our
	 * implementation.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/** Brian Gladman's CTR Mode.
	* @constructor
	* @param {Object} _prf The aes instance to generate key.
	* @param {bitArray} _iv The iv for ctr mode, it must be 128 bits.
	*/

	const mode = {};

	/**
	 * Brian Gladman's CTR Mode.
	 * @namespace
	 */
	mode.ctrGladman = class {
		constructor(prf, iv) {
			this._prf = prf;
			this._initIv = iv;
			this._iv = iv;
		}

		reset() {
			this._iv = this._initIv;
		}

		/** Input some data to calculate.
		 * @param {bitArray} data the data to process, it must be intergral multiple of 128 bits unless it's the last.
		 */
		update(data) {
			return this.calculate(this._prf, data, this._iv);
		}

		incWord(word) {
			if (((word >> 24) & 0xff) === 0xff) { //overflow
				let b1 = (word >> 16) & 0xff;
				let b2 = (word >> 8) & 0xff;
				let b3 = word & 0xff;

				if (b1 === 0xff) { // overflow b1   
					b1 = 0;
					if (b2 === 0xff) {
						b2 = 0;
						if (b3 === 0xff) {
							b3 = 0;
						} else {
							++b3;
						}
					} else {
						++b2;
					}
				} else {
					++b1;
				}

				word = 0;
				word += (b1 << 16);
				word += (b2 << 8);
				word += b3;
			} else {
				word += (0x01 << 24);
			}
			return word;
		}

		incCounter(counter) {
			if ((counter[0] = this.incWord(counter[0])) === 0) {
				// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
				counter[1] = this.incWord(counter[1]);
			}
		}

		calculate(prf, data, iv) {
			let l;
			if (!(l = data.length)) {
				return [];
			}
			const bl = bitArray.bitLength(data);
			for (let i = 0; i < l; i += 4) {
				this.incCounter(iv);
				const e = prf.encrypt(iv);
				data[i] ^= e[0];
				data[i + 1] ^= e[1];
				data[i + 2] ^= e[2];
				data[i + 3] ^= e[3];
			}
			return bitArray.clamp(data, bl);
		}
	};

	const misc = {
		importKey(password) {
			return new misc.hmacSha1(codec.bytes.toBits(password));
		},
		pbkdf2(prf, salt, count, length) {
			count = count || 10000;
			if (length < 0 || count < 0) {
				throw new Error("invalid params to pbkdf2");
			}
			const byteLength = ((length >> 5) + 1) << 2;
			let u, ui, i, j, k;
			const arrayBuffer = new ArrayBuffer(byteLength);
			const out = new DataView(arrayBuffer);
			let outLength = 0;
			const b = bitArray;
			salt = codec.bytes.toBits(salt);
			for (k = 1; outLength < (byteLength || 1); k++) {
				u = ui = prf.encrypt(b.concat(salt, [k]));
				for (i = 1; i < count; i++) {
					ui = prf.encrypt(ui);
					for (j = 0; j < ui.length; j++) {
						u[j] ^= ui[j];
					}
				}
				for (i = 0; outLength < (byteLength || 1) && i < u.length; i++) {
					out.setInt32(outLength, u[i]);
					outLength += 4;
				}
			}
			return arrayBuffer.slice(0, length / 8);
		}
	};

	/** @fileOverview HMAC implementation.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/** HMAC with the specified hash function.
	 * @constructor
	 * @param {bitArray} key the key for HMAC.
	 * @param {Object} [Hash=hash.sha1] The hash function to use.
	 */
	misc.hmacSha1 = class {

		constructor(key) {
			const hmac = this;
			const Hash = hmac._hash = hash.sha1;
			const exKey = [[], []];
			hmac._baseHash = [new Hash(), new Hash()];
			const bs = hmac._baseHash[0].blockSize / 32;

			if (key.length > bs) {
				key = new Hash().update(key).finalize();
			}

			for (let i = 0; i < bs; i++) {
				exKey[0][i] = key[i] ^ 0x36363636;
				exKey[1][i] = key[i] ^ 0x5C5C5C5C;
			}

			hmac._baseHash[0].update(exKey[0]);
			hmac._baseHash[1].update(exKey[1]);
			hmac._resultHash = new Hash(hmac._baseHash[0]);
		}
		reset() {
			const hmac = this;
			hmac._resultHash = new hmac._hash(hmac._baseHash[0]);
			hmac._updated = false;
		}

		update(data) {
			const hmac = this;
			hmac._updated = true;
			hmac._resultHash.update(data);
		}

		digest() {
			const hmac = this;
			const w = hmac._resultHash.finalize();
			const result = new (hmac._hash)(hmac._baseHash[1]).update(w).finalize();

			hmac.reset();

			return result;
		}

		encrypt(data) {
			if (!this._updated) {
				this.update(data);
				return this.digest(data);
			} else {
				throw new Error("encrypt on already updated hmac called!");
			}
		}
	};

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const GET_RANDOM_VALUES_SUPPORTED = typeof crypto != UNDEFINED_TYPE && typeof crypto.getRandomValues == FUNCTION_TYPE;

	const ERR_INVALID_PASSWORD = "Invalid password";
	const ERR_INVALID_SIGNATURE = "Invalid signature";
	const ERR_ABORT_CHECK_PASSWORD = "zipjs-abort-check-password";

	function getRandomValues(array) {
		if (GET_RANDOM_VALUES_SUPPORTED) {
			return crypto.getRandomValues(array);
		} else {
			return random.getRandomValues(array);
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const BLOCK_LENGTH = 16;
	const RAW_FORMAT = "raw";
	const PBKDF2_ALGORITHM = { name: "PBKDF2" };
	const HASH_ALGORITHM = { name: "HMAC" };
	const HASH_FUNCTION = "SHA-1";
	const BASE_KEY_ALGORITHM = Object.assign({ hash: HASH_ALGORITHM }, PBKDF2_ALGORITHM);
	const DERIVED_BITS_ALGORITHM = Object.assign({ iterations: 1000, hash: { name: HASH_FUNCTION } }, PBKDF2_ALGORITHM);
	const DERIVED_BITS_USAGE = ["deriveBits"];
	const SALT_LENGTH = [8, 12, 16];
	const KEY_LENGTH = [16, 24, 32];
	const SIGNATURE_LENGTH = 10;
	const COUNTER_DEFAULT_VALUE = [0, 0, 0, 0];
	// deno-lint-ignore valid-typeof
	const CRYPTO_API_SUPPORTED = typeof crypto != UNDEFINED_TYPE;
	const subtle = CRYPTO_API_SUPPORTED && crypto.subtle;
	const SUBTLE_API_SUPPORTED = CRYPTO_API_SUPPORTED && typeof subtle != UNDEFINED_TYPE;
	const codecBytes = codec.bytes;
	const Aes = cipher.aes;
	const CtrGladman = mode.ctrGladman;
	const HmacSha1 = misc.hmacSha1;

	let IMPORT_KEY_SUPPORTED = CRYPTO_API_SUPPORTED && SUBTLE_API_SUPPORTED && typeof subtle.importKey == FUNCTION_TYPE;
	let DERIVE_BITS_SUPPORTED = CRYPTO_API_SUPPORTED && SUBTLE_API_SUPPORTED && typeof subtle.deriveBits == FUNCTION_TYPE;

	class AESDecryptionStream extends TransformStream {

		constructor({ password, rawPassword, signed, encryptionStrength, checkPasswordOnly }) {
			super({
				start() {
					Object.assign(this, {
						ready: new Promise(resolve => this.resolveReady = resolve),
						password: encodePassword(password, rawPassword),
						signed,
						strength: encryptionStrength - 1,
						pending: new Uint8Array()
					});
				},
				async transform(chunk, controller) {
					const aesCrypto = this;
					const {
						password,
						strength,
						resolveReady,
						ready
					} = aesCrypto;
					if (password) {
						await createDecryptionKeys(aesCrypto, strength, password, subarray(chunk, 0, SALT_LENGTH[strength] + 2));
						chunk = subarray(chunk, SALT_LENGTH[strength] + 2);
						if (checkPasswordOnly) {
							controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
						} else {
							resolveReady();
						}
					} else {
						await ready;
					}
					const output = new Uint8Array(chunk.length - SIGNATURE_LENGTH - ((chunk.length - SIGNATURE_LENGTH) % BLOCK_LENGTH));
					controller.enqueue(append(aesCrypto, chunk, output, 0, SIGNATURE_LENGTH, true));
				},
				async flush(controller) {
					const {
						signed,
						ctr,
						hmac,
						pending,
						ready
					} = this;
					if (hmac && ctr) {
						await ready;
						const chunkToDecrypt = subarray(pending, 0, pending.length - SIGNATURE_LENGTH);
						const originalSignature = subarray(pending, pending.length - SIGNATURE_LENGTH);
						let decryptedChunkArray = new Uint8Array();
						if (chunkToDecrypt.length) {
							const encryptedChunk = toBits(codecBytes, chunkToDecrypt);
							hmac.update(encryptedChunk);
							const decryptedChunk = ctr.update(encryptedChunk);
							decryptedChunkArray = fromBits(codecBytes, decryptedChunk);
						}
						if (signed) {
							const signature = subarray(fromBits(codecBytes, hmac.digest()), 0, SIGNATURE_LENGTH);
							for (let indexSignature = 0; indexSignature < SIGNATURE_LENGTH; indexSignature++) {
								if (signature[indexSignature] != originalSignature[indexSignature]) {
									throw new Error(ERR_INVALID_SIGNATURE);
								}
							}
						}
						controller.enqueue(decryptedChunkArray);
					}
				}
			});
		}
	}

	class AESEncryptionStream extends TransformStream {

		constructor({ password, rawPassword, encryptionStrength }) {
			// deno-lint-ignore prefer-const
			let stream;
			super({
				start() {
					Object.assign(this, {
						ready: new Promise(resolve => this.resolveReady = resolve),
						password: encodePassword(password, rawPassword),
						strength: encryptionStrength - 1,
						pending: new Uint8Array()
					});
				},
				async transform(chunk, controller) {
					const aesCrypto = this;
					const {
						password,
						strength,
						resolveReady,
						ready
					} = aesCrypto;
					let preamble = new Uint8Array();
					if (password) {
						preamble = await createEncryptionKeys(aesCrypto, strength, password);
						resolveReady();
					} else {
						await ready;
					}
					const output = new Uint8Array(preamble.length + chunk.length - (chunk.length % BLOCK_LENGTH));
					output.set(preamble, 0);
					controller.enqueue(append(aesCrypto, chunk, output, preamble.length, 0));
				},
				async flush(controller) {
					const {
						ctr,
						hmac,
						pending,
						ready
					} = this;
					if (hmac && ctr) {
						await ready;
						let encryptedChunkArray = new Uint8Array();
						if (pending.length) {
							const encryptedChunk = ctr.update(toBits(codecBytes, pending));
							hmac.update(encryptedChunk);
							encryptedChunkArray = fromBits(codecBytes, encryptedChunk);
						}
						stream.signature = fromBits(codecBytes, hmac.digest()).slice(0, SIGNATURE_LENGTH);
						controller.enqueue(concat(encryptedChunkArray, stream.signature));
					}
				}
			});
			stream = this;
		}
	}

	function append(aesCrypto, input, output, paddingStart, paddingEnd, verifySignature) {
		const {
			ctr,
			hmac,
			pending
		} = aesCrypto;
		const inputLength = input.length - paddingEnd;
		if (pending.length) {
			input = concat(pending, input);
			output = expand(output, inputLength - (inputLength % BLOCK_LENGTH));
		}
		let offset;
		for (offset = 0; offset <= inputLength - BLOCK_LENGTH; offset += BLOCK_LENGTH) {
			const inputChunk = toBits(codecBytes, subarray(input, offset, offset + BLOCK_LENGTH));
			if (verifySignature) {
				hmac.update(inputChunk);
			}
			const outputChunk = ctr.update(inputChunk);
			if (!verifySignature) {
				hmac.update(outputChunk);
			}
			output.set(fromBits(codecBytes, outputChunk), offset + paddingStart);
		}
		aesCrypto.pending = subarray(input, offset);
		return output;
	}

	async function createDecryptionKeys(decrypt, strength, password, preamble) {
		const passwordVerificationKey = await createKeys$1(decrypt, strength, password, subarray(preamble, 0, SALT_LENGTH[strength]));
		const passwordVerification = subarray(preamble, SALT_LENGTH[strength]);
		if (passwordVerificationKey[0] != passwordVerification[0] || passwordVerificationKey[1] != passwordVerification[1]) {
			throw new Error(ERR_INVALID_PASSWORD);
		}
	}

	async function createEncryptionKeys(encrypt, strength, password) {
		const salt = getRandomValues(new Uint8Array(SALT_LENGTH[strength]));
		const passwordVerification = await createKeys$1(encrypt, strength, password, salt);
		return concat(salt, passwordVerification);
	}

	async function createKeys$1(aesCrypto, strength, password, salt) {
		aesCrypto.password = null;
		const baseKey = await importKey(RAW_FORMAT, password, BASE_KEY_ALGORITHM, false, DERIVED_BITS_USAGE);
		const derivedBits = await deriveBits(Object.assign({ salt }, DERIVED_BITS_ALGORITHM), baseKey, 8 * ((KEY_LENGTH[strength] * 2) + 2));
		const compositeKey = new Uint8Array(derivedBits);
		const key = toBits(codecBytes, subarray(compositeKey, 0, KEY_LENGTH[strength]));
		const authentication = toBits(codecBytes, subarray(compositeKey, KEY_LENGTH[strength], KEY_LENGTH[strength] * 2));
		const passwordVerification = subarray(compositeKey, KEY_LENGTH[strength] * 2);
		Object.assign(aesCrypto, {
			keys: {
				key,
				authentication,
				passwordVerification
			},
			ctr: new CtrGladman(new Aes(key), Array.from(COUNTER_DEFAULT_VALUE)),
			hmac: new HmacSha1(authentication)
		});
		return passwordVerification;
	}

	async function importKey(format, password, algorithm, extractable, keyUsages) {
		if (IMPORT_KEY_SUPPORTED) {
			try {
				return await subtle.importKey(format, password, algorithm, extractable, keyUsages);
			} catch (_error) {
				IMPORT_KEY_SUPPORTED = false;
				return misc.importKey(password);
			}
		} else {
			return misc.importKey(password);
		}
	}

	async function deriveBits(algorithm, baseKey, length) {
		if (DERIVE_BITS_SUPPORTED) {
			try {
				return await subtle.deriveBits(algorithm, baseKey, length);
			} catch (_error) {
				DERIVE_BITS_SUPPORTED = false;
				return misc.pbkdf2(baseKey, algorithm.salt, DERIVED_BITS_ALGORITHM.iterations, length);
			}
		} else {
			return misc.pbkdf2(baseKey, algorithm.salt, DERIVED_BITS_ALGORITHM.iterations, length);
		}
	}

	function encodePassword(password, rawPassword) {
		if (rawPassword === UNDEFINED_VALUE) {
			return encodeText(password);
		} else {
			return rawPassword;
		}
	}

	function concat(leftArray, rightArray) {
		let array = leftArray;
		if (leftArray.length + rightArray.length) {
			array = new Uint8Array(leftArray.length + rightArray.length);
			array.set(leftArray, 0);
			array.set(rightArray, leftArray.length);
		}
		return array;
	}

	function expand(inputArray, length) {
		if (length && length > inputArray.length) {
			const array = inputArray;
			inputArray = new Uint8Array(length);
			inputArray.set(array, 0);
		}
		return inputArray;
	}

	function subarray(array, begin, end) {
		return array.subarray(begin, end);
	}

	function fromBits(codecBytes, chunk) {
		return codecBytes.fromBits(chunk);
	}
	function toBits(codecBytes, chunk) {
		return codecBytes.toBits(chunk);
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const HEADER_LENGTH = 12;

	class ZipCryptoDecryptionStream extends TransformStream {

		constructor({ password, passwordVerification, checkPasswordOnly }) {
			super({
				start() {
					Object.assign(this, {
						password,
						passwordVerification
					});
					createKeys(this, password);
				},
				transform(chunk, controller) {
					const zipCrypto = this;
					if (zipCrypto.password) {
						const decryptedHeader = decrypt(zipCrypto, chunk.subarray(0, HEADER_LENGTH));
						zipCrypto.password = null;
						if (decryptedHeader[HEADER_LENGTH - 1] != zipCrypto.passwordVerification) {
							throw new Error(ERR_INVALID_PASSWORD);
						}
						chunk = chunk.subarray(HEADER_LENGTH);
					}
					if (checkPasswordOnly) {
						controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
					} else {
						controller.enqueue(decrypt(zipCrypto, chunk));
					}
				}
			});
		}
	}

	class ZipCryptoEncryptionStream extends TransformStream {

		constructor({ password, passwordVerification }) {
			super({
				start() {
					Object.assign(this, {
						password,
						passwordVerification
					});
					createKeys(this, password);
				},
				transform(chunk, controller) {
					const zipCrypto = this;
					let output;
					let offset;
					if (zipCrypto.password) {
						zipCrypto.password = null;
						const header = getRandomValues(new Uint8Array(HEADER_LENGTH));
						header[HEADER_LENGTH - 1] = zipCrypto.passwordVerification;
						output = new Uint8Array(chunk.length + header.length);
						output.set(encrypt(zipCrypto, header), 0);
						offset = HEADER_LENGTH;
					} else {
						output = new Uint8Array(chunk.length);
						offset = 0;
					}
					output.set(encrypt(zipCrypto, chunk), offset);
					controller.enqueue(output);
				}
			});
		}
	}

	function decrypt(target, input) {
		const output = new Uint8Array(input.length);
		for (let index = 0; index < input.length; index++) {
			output[index] = getByte(target) ^ input[index];
			updateKeys(target, output[index]);
		}
		return output;
	}

	function encrypt(target, input) {
		const output = new Uint8Array(input.length);
		for (let index = 0; index < input.length; index++) {
			output[index] = getByte(target) ^ input[index];
			updateKeys(target, input[index]);
		}
		return output;
	}

	function createKeys(target, password) {
		const keys = [0x12345678, 0x23456789, 0x34567890];
		Object.assign(target, {
			keys,
			crcKey0: new Crc32(keys[0]),
			crcKey2: new Crc32(keys[2]),
		});
		for (let index = 0; index < password.length; index++) {
			updateKeys(target, password.charCodeAt(index));
		}
	}

	function updateKeys(target, byte) {
		let [key0, key1, key2] = target.keys;
		target.crcKey0.append([byte]);
		key0 = ~target.crcKey0.get();
		key1 = getInt32(Math.imul(getInt32(key1 + getInt8(key0)), 134775813) + 1);
		target.crcKey2.append([key1 >>> 24]);
		key2 = ~target.crcKey2.get();
		target.keys = [key0, key1, key2];
	}

	function getByte(target) {
		const temp = target.keys[2] | 2;
		return getInt8(Math.imul(temp, (temp ^ 1)) >>> 8);
	}

	function getInt8(number) {
		return number & 0xFF;
	}

	function getInt32(number) {
		return number & 0xFFFFFFFF;
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const COMPRESSION_FORMAT = "deflate-raw";

	class DeflateStream extends TransformStream {

		constructor(options, { chunkSize, CompressionStream, CompressionStreamNative }) {
			super({});
			const { compressed, encrypted, useCompressionStream, zipCrypto, signed, level } = options;
			const stream = this;
			let crc32Stream, encryptionStream;
			let readable = filterEmptyChunks(super.readable);
			if ((!encrypted || zipCrypto) && signed) {
				crc32Stream = new Crc32Stream();
				readable = pipeThrough(readable, crc32Stream);
			}
			if (compressed) {
				readable = pipeThroughCommpressionStream(readable, useCompressionStream, { level, chunkSize }, CompressionStreamNative, CompressionStream);
			}
			if (encrypted) {
				if (zipCrypto) {
					readable = pipeThrough(readable, new ZipCryptoEncryptionStream(options));
				} else {
					encryptionStream = new AESEncryptionStream(options);
					readable = pipeThrough(readable, encryptionStream);
				}
			}
			setReadable(stream, readable, () => {
				let signature;
				if (encrypted && !zipCrypto) {
					signature = encryptionStream.signature;
				}
				if ((!encrypted || zipCrypto) && signed) {
					signature = new DataView(crc32Stream.value.buffer).getUint32(0);
				}
				stream.signature = signature;
			});
		}
	}

	class InflateStream extends TransformStream {

		constructor(options, { chunkSize, DecompressionStream, DecompressionStreamNative }) {
			super({});
			const { zipCrypto, encrypted, signed, signature, compressed, useCompressionStream } = options;
			let crc32Stream, decryptionStream;
			let readable = filterEmptyChunks(super.readable);
			if (encrypted) {
				if (zipCrypto) {
					readable = pipeThrough(readable, new ZipCryptoDecryptionStream(options));
				} else {
					decryptionStream = new AESDecryptionStream(options);
					readable = pipeThrough(readable, decryptionStream);
				}
			}
			if (compressed) {
				readable = pipeThroughCommpressionStream(readable, useCompressionStream, { chunkSize }, DecompressionStreamNative, DecompressionStream);
			}
			if ((!encrypted || zipCrypto) && signed) {
				crc32Stream = new Crc32Stream();
				readable = pipeThrough(readable, crc32Stream);
			}
			setReadable(this, readable, () => {
				if ((!encrypted || zipCrypto) && signed) {
					const dataViewSignature = new DataView(crc32Stream.value.buffer);
					if (signature != dataViewSignature.getUint32(0, false)) {
						throw new Error(ERR_INVALID_SIGNATURE);
					}
				}
			});
		}
	}

	function filterEmptyChunks(readable) {
		return pipeThrough(readable, new TransformStream({
			transform(chunk, controller) {
				if (chunk && chunk.length) {
					controller.enqueue(chunk);
				}
			}
		}));
	}

	function setReadable(stream, readable, flush) {
		readable = pipeThrough(readable, new TransformStream({ flush }));
		Object.defineProperty(stream, "readable", {
			get() {
				return readable;
			}
		});
	}

	function pipeThroughCommpressionStream(readable, useCompressionStream, options, CodecStreamNative, CodecStream) {
		try {
			const CompressionStream = useCompressionStream && CodecStreamNative ? CodecStreamNative : CodecStream;
			readable = pipeThrough(readable, new CompressionStream(COMPRESSION_FORMAT, options));
		} catch (error) {
			if (useCompressionStream) {
				try {
					readable = pipeThrough(readable, new CodecStream(COMPRESSION_FORMAT, options));
				} catch (error) {
					return readable;
				}
			} else {
				return readable;
			}
		}
		return readable;
	}

	function pipeThrough(readable, transformStream) {
		return readable.pipeThrough(transformStream);
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const MESSAGE_EVENT_TYPE = "message";
	const MESSAGE_START = "start";
	const MESSAGE_PULL = "pull";
	const MESSAGE_DATA = "data";
	const MESSAGE_ACK_DATA = "ack";
	const MESSAGE_CLOSE = "close";
	const CODEC_DEFLATE = "deflate";
	const CODEC_INFLATE = "inflate";

	class CodecStream extends TransformStream {

		constructor(options, config) {
			super({});
			const codec = this;
			const { codecType } = options;
			let Stream;
			if (codecType.startsWith(CODEC_DEFLATE)) {
				Stream = DeflateStream;
			} else if (codecType.startsWith(CODEC_INFLATE)) {
				Stream = InflateStream;
			}
			let outputSize = 0;
			let inputSize = 0;
			const stream = new Stream(options, config);
			const readable = super.readable;
			const inputSizeStream = new TransformStream({
				transform(chunk, controller) {
					if (chunk && chunk.length) {
						inputSize += chunk.length;
						controller.enqueue(chunk);
					}
				},
				flush() {
					Object.assign(codec, {
						inputSize
					});
				}
			});
			const outputSizeStream = new TransformStream({
				transform(chunk, controller) {
					if (chunk && chunk.length) {
						outputSize += chunk.length;
						controller.enqueue(chunk);
					}
				},
				flush() {
					const { signature } = stream;
					Object.assign(codec, {
						signature,
						outputSize,
						inputSize
					});
				}
			});
			Object.defineProperty(codec, "readable", {
				get() {
					return readable.pipeThrough(inputSizeStream).pipeThrough(stream).pipeThrough(outputSizeStream);
				}
			});
		}
	}

	class ChunkStream extends TransformStream {

		constructor(chunkSize) {
			let pendingChunk;
			super({
				transform,
				flush(controller) {
					if (pendingChunk && pendingChunk.length) {
						controller.enqueue(pendingChunk);
					}
				}
			});

			function transform(chunk, controller) {
				if (pendingChunk) {
					const newChunk = new Uint8Array(pendingChunk.length + chunk.length);
					newChunk.set(pendingChunk);
					newChunk.set(chunk, pendingChunk.length);
					chunk = newChunk;
					pendingChunk = null;
				}
				if (chunk.length > chunkSize) {
					controller.enqueue(chunk.slice(0, chunkSize));
					transform(chunk.slice(chunkSize), controller);
				} else {
					pendingChunk = chunk;
				}
			}
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	// deno-lint-ignore valid-typeof
	let WEB_WORKERS_SUPPORTED = typeof Worker != UNDEFINED_TYPE;

	class CodecWorker {

		constructor(workerData, { readable, writable }, { options, config, streamOptions, useWebWorkers, transferStreams, scripts }, onTaskFinished) {
			const { signal } = streamOptions;
			Object.assign(workerData, {
				busy: true,
				readable: readable
					.pipeThrough(new ChunkStream(config.chunkSize))
					.pipeThrough(new ProgressWatcherStream(readable, streamOptions), { signal }),
				writable,
				options: Object.assign({}, options),
				scripts,
				transferStreams,
				terminate() {
					return new Promise(resolve => {
						const { worker, busy } = workerData;
						if (worker) {
							if (busy) {
								workerData.resolveTerminated = resolve;
							} else {
								worker.terminate();
								resolve();
							}
							workerData.interface = null;
						} else {
							resolve();
						}
					});
				},
				onTaskFinished() {
					const { resolveTerminated } = workerData;
					if (resolveTerminated) {
						workerData.resolveTerminated = null;
						workerData.terminated = true;
						workerData.worker.terminate();
						resolveTerminated();
					}
					workerData.busy = false;
					onTaskFinished(workerData);
				}
			});
			return (useWebWorkers && WEB_WORKERS_SUPPORTED ? createWebWorkerInterface : createWorkerInterface)(workerData, config);
		}
	}

	class ProgressWatcherStream extends TransformStream {

		constructor(readableSource, { onstart, onprogress, size, onend }) {
			let chunkOffset = 0;
			super({
				async start() {
					if (onstart) {
						await callHandler(onstart, size);
					}
				},
				async transform(chunk, controller) {
					chunkOffset += chunk.length;
					if (onprogress) {
						await callHandler(onprogress, chunkOffset, size);
					}
					controller.enqueue(chunk);
				},
				async flush() {
					readableSource.size = chunkOffset;
					if (onend) {
						await callHandler(onend, chunkOffset);
					}
				}
			});
		}
	}

	async function callHandler(handler, ...parameters) {
		try {
			await handler(...parameters);
		} catch (_error) {
			// ignored
		}
	}

	function createWorkerInterface(workerData, config) {
		return {
			run: () => runWorker$1(workerData, config)
		};
	}

	function createWebWorkerInterface(workerData, config) {
		const { baseURL, chunkSize } = config;
		if (!workerData.interface) {
			let worker;
			try {
				worker = getWebWorker(workerData.scripts[0], baseURL, workerData);
			} catch (error) {
				WEB_WORKERS_SUPPORTED = false;
				return createWorkerInterface(workerData, config);
			}
			Object.assign(workerData, {
				worker,
				interface: {
					run: () => runWebWorker(workerData, { chunkSize })
				}
			});
		}
		return workerData.interface;
	}

	async function runWorker$1({ options, readable, writable, onTaskFinished }, config) {
		try {
			const codecStream = new CodecStream(options, config);
			await readable.pipeThrough(codecStream).pipeTo(writable, { preventClose: true, preventAbort: true });
			const {
				signature,
				inputSize,
				outputSize
			} = codecStream;
			return {
				signature,
				inputSize,
				outputSize
			};
		} finally {
			onTaskFinished();
		}
	}

	async function runWebWorker(workerData, config) {
		let resolveResult, rejectResult;
		const result = new Promise((resolve, reject) => {
			resolveResult = resolve;
			rejectResult = reject;
		});
		Object.assign(workerData, {
			reader: null,
			writer: null,
			resolveResult,
			rejectResult,
			result
		});
		const { readable, options, scripts } = workerData;
		const { writable, closed } = watchClosedStream(workerData.writable);
		const streamsTransferred = sendMessage({
			type: MESSAGE_START,
			scripts: scripts.slice(1),
			options,
			config,
			readable,
			writable
		}, workerData);
		if (!streamsTransferred) {
			Object.assign(workerData, {
				reader: readable.getReader(),
				writer: writable.getWriter()
			});
		}
		const resultValue = await result;
		if (!streamsTransferred) {
			await writable.getWriter().close();
		}
		await closed;
		return resultValue;
	}

	function watchClosedStream(writableSource) {
		let resolveStreamClosed;
		const closed = new Promise(resolve => resolveStreamClosed = resolve);
		const writable = new WritableStream({
			async write(chunk) {
				const writer = writableSource.getWriter();
				await writer.ready;
				await writer.write(chunk);
				writer.releaseLock();
			},
			close() {
				resolveStreamClosed();
			},
			abort(reason) {
				const writer = writableSource.getWriter();
				return writer.abort(reason);
			}
		});
		return { writable, closed };
	}

	let classicWorkersSupported = true;
	let transferStreamsSupported = true;

	function getWebWorker(url, baseURL, workerData) {
		const workerOptions = { type: "module" };
		let scriptUrl, worker;
		// deno-lint-ignore valid-typeof
		if (typeof url == FUNCTION_TYPE) {
			url = url();
		}
		try {
			scriptUrl = new URL(url, baseURL);
		} catch (_error) {
			scriptUrl = url;
		}
		if (classicWorkersSupported) {
			try {
				worker = new Worker(scriptUrl);
			} catch (_error) {
				classicWorkersSupported = false;
				worker = new Worker(scriptUrl, workerOptions);
			}
		} else {
			worker = new Worker(scriptUrl, workerOptions);
		}
		worker.addEventListener(MESSAGE_EVENT_TYPE, event => onMessage(event, workerData));
		return worker;
	}

	function sendMessage(message, { worker, writer, onTaskFinished, transferStreams }) {
		try {
			let { value, readable, writable } = message;
			const transferables = [];
			if (value) {
				if (value.byteLength < value.buffer.byteLength) {
					message.value = value.buffer.slice(0, value.byteLength);
				}
				else {
					message.value = value.buffer;
				}
				transferables.push(message.value);
			}
			if (transferStreams && transferStreamsSupported) {
				if (readable) {
					transferables.push(readable);
				}
				if (writable) {
					transferables.push(writable);
				}
			} else {
				message.readable = message.writable = null;
			}
			if (transferables.length) {
				try {
					worker.postMessage(message, transferables);
					return true;
				} catch (_error) {
					transferStreamsSupported = false;
					message.readable = message.writable = null;
					worker.postMessage(message);
				}
			} else {
				worker.postMessage(message);
			}
		} catch (error) {
			if (writer) {
				writer.releaseLock();
			}
			onTaskFinished();
			throw error;
		}
	}

	async function onMessage({ data }, workerData) {
		const { type, value, messageId, result, error } = data;
		const { reader, writer, resolveResult, rejectResult, onTaskFinished } = workerData;
		try {
			if (error) {
				const { message, stack, code, name } = error;
				const responseError = new Error(message);
				Object.assign(responseError, { stack, code, name });
				close(responseError);
			} else {
				if (type == MESSAGE_PULL) {
					const { value, done } = await reader.read();
					sendMessage({ type: MESSAGE_DATA, value, done, messageId }, workerData);
				}
				if (type == MESSAGE_DATA) {
					await writer.ready;
					await writer.write(new Uint8Array(value));
					sendMessage({ type: MESSAGE_ACK_DATA, messageId }, workerData);
				}
				if (type == MESSAGE_CLOSE) {
					close(null, result);
				}
			}
		} catch (error) {
			sendMessage({ type: MESSAGE_CLOSE, messageId }, workerData);
			close(error);
		}

		function close(error, result) {
			if (error) {
				rejectResult(error);
			} else {
				resolveResult(result);
			}
			if (writer) {
				writer.releaseLock();
			}
			onTaskFinished();
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	let pool = [];
	const pendingRequests = [];

	let indexWorker = 0;

	async function runWorker(stream, workerOptions) {
		const { options, config } = workerOptions;
		const { transferStreams, useWebWorkers, useCompressionStream, codecType, compressed, signed, encrypted } = options;
		const { workerScripts, maxWorkers } = config;
		workerOptions.transferStreams = transferStreams || transferStreams === UNDEFINED_VALUE;
		const streamCopy = !compressed && !signed && !encrypted && !workerOptions.transferStreams;
		workerOptions.useWebWorkers = !streamCopy && (useWebWorkers || (useWebWorkers === UNDEFINED_VALUE && config.useWebWorkers));
		workerOptions.scripts = workerOptions.useWebWorkers && workerScripts ? workerScripts[codecType] : [];
		options.useCompressionStream = useCompressionStream || (useCompressionStream === UNDEFINED_VALUE && config.useCompressionStream);
		return (await getWorker()).run();

		async function getWorker() {
			const workerData = pool.find(workerData => !workerData.busy);
			if (workerData) {
				clearTerminateTimeout(workerData);
				return new CodecWorker(workerData, stream, workerOptions, onTaskFinished);
			} else if (pool.length < maxWorkers) {
				const workerData = { indexWorker };
				indexWorker++;
				pool.push(workerData);
				return new CodecWorker(workerData, stream, workerOptions, onTaskFinished);
			} else {
				return new Promise(resolve => pendingRequests.push({ resolve, stream, workerOptions }));
			}
		}

		function onTaskFinished(workerData) {
			if (pendingRequests.length) {
				const [{ resolve, stream, workerOptions }] = pendingRequests.splice(0, 1);
				resolve(new CodecWorker(workerData, stream, workerOptions, onTaskFinished));
			} else if (workerData.worker) {
				clearTerminateTimeout(workerData);
				terminateWorker(workerData, workerOptions);
			} else {
				pool = pool.filter(data => data != workerData);
			}
		}
	}

	function terminateWorker(workerData, workerOptions) {
		const { config } = workerOptions;
		const { terminateWorkerTimeout } = config;
		if (Number.isFinite(terminateWorkerTimeout) && terminateWorkerTimeout >= 0) {
			if (workerData.terminated) {
				workerData.terminated = false;
			} else {
				workerData.terminateTimeout = setTimeout(async () => {
					pool = pool.filter(data => data != workerData);
					try {
						await workerData.terminate();
					} catch (_error) {
						// ignored
					}
				}, terminateWorkerTimeout);
			}
		}
	}

	function clearTerminateTimeout(workerData) {
		const { terminateTimeout } = workerData;
		if (terminateTimeout) {
			clearTimeout(terminateTimeout);
			workerData.terminateTimeout = null;
		}
	}

	function e(e){const t=()=>URL.createObjectURL(new Blob(['const{Array:e,Object:t,Number:n,Math:r,Error:s,Uint8Array:i,Uint16Array:o,Uint32Array:c,Int32Array:f,Map:a,DataView:l,Promise:u,TextEncoder:w,crypto:h,postMessage:d,TransformStream:p,ReadableStream:y,WritableStream:m,CompressionStream:b,DecompressionStream:g}=self,k=void 0,v="undefined",S="function";class z{constructor(e){return class extends p{constructor(t,n){const r=new e(n);super({transform(e,t){t.enqueue(r.append(e))},flush(e){const t=r.flush();t&&e.enqueue(t)}})}}}}const C=[];for(let e=0;256>e;e++){let t=e;for(let e=0;8>e;e++)1&t?t=t>>>1^3988292384:t>>>=1;C[e]=t}class x{constructor(e){this.t=e||-1}append(e){let t=0|this.t;for(let n=0,r=0|e.length;r>n;n++)t=t>>>8^C[255&(t^e[n])];this.t=t}get(){return~this.t}}class A extends p{constructor(){let e;const t=new x;super({transform(e,n){t.append(e),n.enqueue(e)},flush(){const n=new i(4);new l(n.buffer).setUint32(0,t.get()),e.value=n}}),e=this}}const _={concat(e,t){if(0===e.length||0===t.length)return e.concat(t);const n=e[e.length-1],r=_.i(n);return 32===r?e.concat(t):_.o(t,r,0|n,e.slice(0,e.length-1))},l(e){const t=e.length;if(0===t)return 0;const n=e[t-1];return 32*(t-1)+_.i(n)},u(e,t){if(32*e.length<t)return e;const n=(e=e.slice(0,r.ceil(t/32))).length;return t&=31,n>0&&t&&(e[n-1]=_.h(t,e[n-1]&2147483648>>t-1,1)),e},h:(e,t,n)=>32===e?t:(n?0|t:t<<32-e)+1099511627776*e,i:e=>r.round(e/1099511627776)||32,o(e,t,n,r){for(void 0===r&&(r=[]);t>=32;t-=32)r.push(n),n=0;if(0===t)return r.concat(e);for(let s=0;s<e.length;s++)r.push(n|e[s]>>>t),n=e[s]<<32-t;const s=e.length?e[e.length-1]:0,i=_.i(s);return r.push(_.h(t+i&31,t+i>32?n:r.pop(),1)),r}},I={p:{m(e){const t=_.l(e)/8,n=new i(t);let r;for(let s=0;t>s;s++)3&s||(r=e[s/4]),n[s]=r>>>24,r<<=8;return n},k(e){const t=[];let n,r=0;for(n=0;n<e.length;n++)r=r<<8|e[n],3&~n||(t.push(r),r=0);return 3&n&&t.push(_.h(8*(3&n),r)),t}}},P=class{constructor(e){const t=this;t.blockSize=512,t.v=[1732584193,4023233417,2562383102,271733878,3285377520],t.S=[1518500249,1859775393,2400959708,3395469782],e?(t.C=e.C.slice(0),t.A=e.A.slice(0),t._=e._):t.reset()}reset(){const e=this;return e.C=e.v.slice(0),e.A=[],e._=0,e}update(e){const t=this;"string"==typeof e&&(e=I.I.k(e));const n=t.A=_.concat(t.A,e),r=t._,i=t._=r+_.l(e);if(i>9007199254740991)throw new s("Cannot hash more than 2^53 - 1 bits");const o=new c(n);let f=0;for(let e=t.blockSize+r-(t.blockSize+r&t.blockSize-1);i>=e;e+=t.blockSize)t.P(o.subarray(16*f,16*(f+1))),f+=1;return n.splice(0,16*f),t}D(){const e=this;let t=e.A;const n=e.C;t=_.concat(t,[_.h(1,1)]);for(let e=t.length+2;15&e;e++)t.push(0);for(t.push(r.floor(e._/4294967296)),t.push(0|e._);t.length;)e.P(t.splice(0,16));return e.reset(),n}V(e,t,n,r){return e>19?e>39?e>59?e>79?void 0:t^n^r:t&n|t&r|n&r:t^n^r:t&n|~t&r}R(e,t){return t<<e|t>>>32-e}P(t){const n=this,s=n.C,i=e(80);for(let e=0;16>e;e++)i[e]=t[e];let o=s[0],c=s[1],f=s[2],a=s[3],l=s[4];for(let e=0;79>=e;e++){16>e||(i[e]=n.R(1,i[e-3]^i[e-8]^i[e-14]^i[e-16]));const t=n.R(5,o)+n.V(e,c,f,a)+l+i[e]+n.S[r.floor(e/20)]|0;l=a,a=f,f=n.R(30,c),c=o,o=t}s[0]=s[0]+o|0,s[1]=s[1]+c|0,s[2]=s[2]+f|0,s[3]=s[3]+a|0,s[4]=s[4]+l|0}},D={getRandomValues(e){const t=new c(e.buffer),n=e=>{let t=987654321;const n=4294967295;return()=>(t=36969*(65535&t)+(t>>16)&n,(((t<<16)+(e=18e3*(65535&e)+(e>>16)&n)&n)/4294967296+.5)*(r.random()>.5?1:-1))};for(let s,i=0;i<e.length;i+=4){const e=n(4294967296*(s||r.random()));s=987654071*e(),t[i/4]=4294967296*e()|0}return e}},V={importKey:e=>new V.B(I.p.k(e)),M(e,t,n,r){if(n=n||1e4,0>r||0>n)throw new s("invalid params to pbkdf2");const i=1+(r>>5)<<2;let o,c,f,a,u;const w=new ArrayBuffer(i),h=new l(w);let d=0;const p=_;for(t=I.p.k(t),u=1;(i||1)>d;u++){for(o=c=e.encrypt(p.concat(t,[u])),f=1;n>f;f++)for(c=e.encrypt(c),a=0;a<c.length;a++)o[a]^=c[a];for(f=0;(i||1)>d&&f<o.length;f++)h.setInt32(d,o[f]),d+=4}return w.slice(0,r/8)},B:class{constructor(e){const t=this,n=t.U=P,r=[[],[]];t.K=[new n,new n];const s=t.K[0].blockSize/32;e.length>s&&(e=(new n).update(e).D());for(let t=0;s>t;t++)r[0][t]=909522486^e[t],r[1][t]=1549556828^e[t];t.K[0].update(r[0]),t.K[1].update(r[1]),t.N=new n(t.K[0])}reset(){const e=this;e.N=new e.U(e.K[0]),e.O=!1}update(e){this.O=!0,this.N.update(e)}digest(){const e=this,t=e.N.D(),n=new e.U(e.K[1]).update(t).D();return e.reset(),n}encrypt(e){if(this.O)throw new s("encrypt on already updated hmac called!");return this.update(e),this.digest(e)}}},R=typeof h!=v&&typeof h.getRandomValues==S,B="Invalid password",E="Invalid signature",M="zipjs-abort-check-password";function U(e){return R?h.getRandomValues(e):D.getRandomValues(e)}const K=16,N={name:"PBKDF2"},O=t.assign({hash:{name:"HMAC"}},N),T=t.assign({iterations:1e3,hash:{name:"SHA-1"}},N),W=["deriveBits"],j=[8,12,16],H=[16,24,32],L=10,F=[0,0,0,0],q=typeof h!=v,G=q&&h.subtle,J=q&&typeof G!=v,Q=I.p,X=class{constructor(e){const t=this;t.T=[[[],[],[],[],[]],[[],[],[],[],[]]],t.T[0][0][0]||t.W();const n=t.T[0][4],r=t.T[1],i=e.length;let o,c,f,a=1;if(4!==i&&6!==i&&8!==i)throw new s("invalid aes key size");for(t.S=[c=e.slice(0),f=[]],o=i;4*i+28>o;o++){let e=c[o-1];(o%i==0||8===i&&o%i==4)&&(e=n[e>>>24]<<24^n[e>>16&255]<<16^n[e>>8&255]<<8^n[255&e],o%i==0&&(e=e<<8^e>>>24^a<<24,a=a<<1^283*(a>>7))),c[o]=c[o-i]^e}for(let e=0;o;e++,o--){const t=c[3&e?o:o-4];f[e]=4>=o||4>e?t:r[0][n[t>>>24]]^r[1][n[t>>16&255]]^r[2][n[t>>8&255]]^r[3][n[255&t]]}}encrypt(e){return this.j(e,0)}decrypt(e){return this.j(e,1)}W(){const e=this.T[0],t=this.T[1],n=e[4],r=t[4],s=[],i=[];let o,c,f,a;for(let e=0;256>e;e++)i[(s[e]=e<<1^283*(e>>7))^e]=e;for(let l=o=0;!n[l];l^=c||1,o=i[o]||1){let i=o^o<<1^o<<2^o<<3^o<<4;i=i>>8^255&i^99,n[l]=i,r[i]=l,a=s[f=s[c=s[l]]];let u=16843009*a^65537*f^257*c^16843008*l,w=257*s[i]^16843008*i;for(let n=0;4>n;n++)e[n][l]=w=w<<24^w>>>8,t[n][i]=u=u<<24^u>>>8}for(let n=0;5>n;n++)e[n]=e[n].slice(0),t[n]=t[n].slice(0)}j(e,t){if(4!==e.length)throw new s("invalid aes block size");const n=this.S[t],r=n.length/4-2,i=[0,0,0,0],o=this.T[t],c=o[0],f=o[1],a=o[2],l=o[3],u=o[4];let w,h,d,p=e[0]^n[0],y=e[t?3:1]^n[1],m=e[2]^n[2],b=e[t?1:3]^n[3],g=4;for(let e=0;r>e;e++)w=c[p>>>24]^f[y>>16&255]^a[m>>8&255]^l[255&b]^n[g],h=c[y>>>24]^f[m>>16&255]^a[b>>8&255]^l[255&p]^n[g+1],d=c[m>>>24]^f[b>>16&255]^a[p>>8&255]^l[255&y]^n[g+2],b=c[b>>>24]^f[p>>16&255]^a[y>>8&255]^l[255&m]^n[g+3],g+=4,p=w,y=h,m=d;for(let e=0;4>e;e++)i[t?3&-e:e]=u[p>>>24]<<24^u[y>>16&255]<<16^u[m>>8&255]<<8^u[255&b]^n[g++],w=p,p=y,y=m,m=b,b=w;return i}},Y=class{constructor(e,t){this.H=e,this.L=t,this.F=t}reset(){this.F=this.L}update(e){return this.q(this.H,e,this.F)}G(e){if(255&~(e>>24))e+=1<<24;else{let t=e>>16&255,n=e>>8&255,r=255&e;255===t?(t=0,255===n?(n=0,255===r?r=0:++r):++n):++t,e=0,e+=t<<16,e+=n<<8,e+=r}return e}J(e){0===(e[0]=this.G(e[0]))&&(e[1]=this.G(e[1]))}q(e,t,n){let r;if(!(r=t.length))return[];const s=_.l(t);for(let s=0;r>s;s+=4){this.J(n);const r=e.encrypt(n);t[s]^=r[0],t[s+1]^=r[1],t[s+2]^=r[2],t[s+3]^=r[3]}return _.u(t,s)}},Z=V.B;let $=q&&J&&typeof G.importKey==S,ee=q&&J&&typeof G.deriveBits==S;class te extends p{constructor({password:e,rawPassword:n,signed:r,encryptionStrength:o,checkPasswordOnly:c}){super({start(){t.assign(this,{ready:new u((e=>this.X=e)),password:ie(e,n),signed:r,Y:o-1,pending:new i})},async transform(e,t){const n=this,{password:r,Y:o,X:f,ready:a}=n;r?(await(async(e,t,n,r)=>{const i=await se(e,t,n,ce(r,0,j[t])),o=ce(r,j[t]);if(i[0]!=o[0]||i[1]!=o[1])throw new s(B)})(n,o,r,ce(e,0,j[o]+2)),e=ce(e,j[o]+2),c?t.error(new s(M)):f()):await a;const l=new i(e.length-L-(e.length-L)%K);t.enqueue(re(n,e,l,0,L,!0))},async flush(e){const{signed:t,Z:n,$:r,pending:o,ready:c}=this;if(r&&n){await c;const f=ce(o,0,o.length-L),a=ce(o,o.length-L);let l=new i;if(f.length){const e=ae(Q,f);r.update(e);const t=n.update(e);l=fe(Q,t)}if(t){const e=ce(fe(Q,r.digest()),0,L);for(let t=0;L>t;t++)if(e[t]!=a[t])throw new s(E)}e.enqueue(l)}}})}}class ne extends p{constructor({password:e,rawPassword:n,encryptionStrength:r}){let s;super({start(){t.assign(this,{ready:new u((e=>this.X=e)),password:ie(e,n),Y:r-1,pending:new i})},async transform(e,t){const n=this,{password:r,Y:s,X:o,ready:c}=n;let f=new i;r?(f=await(async(e,t,n)=>{const r=U(new i(j[t]));return oe(r,await se(e,t,n,r))})(n,s,r),o()):await c;const a=new i(f.length+e.length-e.length%K);a.set(f,0),t.enqueue(re(n,e,a,f.length,0))},async flush(e){const{Z:t,$:n,pending:r,ready:o}=this;if(n&&t){await o;let c=new i;if(r.length){const e=t.update(ae(Q,r));n.update(e),c=fe(Q,e)}s.signature=fe(Q,n.digest()).slice(0,L),e.enqueue(oe(c,s.signature))}}}),s=this}}function re(e,t,n,r,s,o){const{Z:c,$:f,pending:a}=e,l=t.length-s;let u;for(a.length&&(t=oe(a,t),n=((e,t)=>{if(t&&t>e.length){const n=e;(e=new i(t)).set(n,0)}return e})(n,l-l%K)),u=0;l-K>=u;u+=K){const e=ae(Q,ce(t,u,u+K));o&&f.update(e);const s=c.update(e);o||f.update(s),n.set(fe(Q,s),u+r)}return e.pending=ce(t,u),n}async function se(n,r,s,o){n.password=null;const c=await(async(e,t,n,r,s)=>{if(!$)return V.importKey(t);try{return await G.importKey("raw",t,n,!1,s)}catch(e){return $=!1,V.importKey(t)}})(0,s,O,0,W),f=await(async(e,t,n)=>{if(!ee)return V.M(t,e.salt,T.iterations,n);try{return await G.deriveBits(e,t,n)}catch(r){return ee=!1,V.M(t,e.salt,T.iterations,n)}})(t.assign({salt:o},T),c,8*(2*H[r]+2)),a=new i(f),l=ae(Q,ce(a,0,H[r])),u=ae(Q,ce(a,H[r],2*H[r])),w=ce(a,2*H[r]);return t.assign(n,{keys:{key:l,ee:u,passwordVerification:w},Z:new Y(new X(l),e.from(F)),$:new Z(u)}),w}function ie(e,t){return t===k?(e=>{if(typeof w==v){const t=new i((e=unescape(encodeURIComponent(e))).length);for(let n=0;n<t.length;n++)t[n]=e.charCodeAt(n);return t}return(new w).encode(e)})(e):t}function oe(e,t){let n=e;return e.length+t.length&&(n=new i(e.length+t.length),n.set(e,0),n.set(t,e.length)),n}function ce(e,t,n){return e.subarray(t,n)}function fe(e,t){return e.m(t)}function ae(e,t){return e.k(t)}class le extends p{constructor({password:e,passwordVerification:n,checkPasswordOnly:r}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;if(n.password){const t=we(n,e.subarray(0,12));if(n.password=null,t[11]!=n.passwordVerification)throw new s(B);e=e.subarray(12)}r?t.error(new s(M)):t.enqueue(we(n,e))}})}}class ue extends p{constructor({password:e,passwordVerification:n}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;let r,s;if(n.password){n.password=null;const t=U(new i(12));t[11]=n.passwordVerification,r=new i(e.length+t.length),r.set(he(n,t),0),s=12}else r=new i(e.length),s=0;r.set(he(n,e),s),t.enqueue(r)}})}}function we(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,n[r]);return n}function he(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,t[r]);return n}function de(e,n){const r=[305419896,591751049,878082192];t.assign(e,{keys:r,te:new x(r[0]),ne:new x(r[2])});for(let t=0;t<n.length;t++)pe(e,n.charCodeAt(t))}function pe(e,t){let[n,s,i]=e.keys;e.te.append([t]),n=~e.te.get(),s=be(r.imul(be(s+me(n)),134775813)+1),e.ne.append([s>>>24]),i=~e.ne.get(),e.keys=[n,s,i]}function ye(e){const t=2|e.keys[2];return me(r.imul(t,1^t)>>>8)}function me(e){return 255&e}function be(e){return 4294967295&e}const ge="deflate-raw";class ke extends p{constructor(e,{chunkSize:t,CompressionStream:n,CompressionStreamNative:r}){super({});const{compressed:s,encrypted:i,useCompressionStream:o,zipCrypto:c,signed:f,level:a}=e,u=this;let w,h,d=Se(super.readable);i&&!c||!f||(w=new A,d=xe(d,w)),s&&(d=Ce(d,o,{level:a,chunkSize:t},r,n)),i&&(c?d=xe(d,new ue(e)):(h=new ne(e),d=xe(d,h))),ze(u,d,(()=>{let e;i&&!c&&(e=h.signature),i&&!c||!f||(e=new l(w.value.buffer).getUint32(0)),u.signature=e}))}}class ve extends p{constructor(e,{chunkSize:t,DecompressionStream:n,DecompressionStreamNative:r}){super({});const{zipCrypto:i,encrypted:o,signed:c,signature:f,compressed:a,useCompressionStream:u}=e;let w,h,d=Se(super.readable);o&&(i?d=xe(d,new le(e)):(h=new te(e),d=xe(d,h))),a&&(d=Ce(d,u,{chunkSize:t},r,n)),o&&!i||!c||(w=new A,d=xe(d,w)),ze(this,d,(()=>{if((!o||i)&&c){const e=new l(w.value.buffer);if(f!=e.getUint32(0,!1))throw new s(E)}}))}}function Se(e){return xe(e,new p({transform(e,t){e&&e.length&&t.enqueue(e)}}))}function ze(e,n,r){n=xe(n,new p({flush:r})),t.defineProperty(e,"readable",{get:()=>n})}function Ce(e,t,n,r,s){try{e=xe(e,new(t&&r?r:s)(ge,n))}catch(r){if(!t)return e;try{e=xe(e,new s(ge,n))}catch(t){return e}}return e}function xe(e,t){return e.pipeThrough(t)}const Ae="data",_e="close";class Ie extends p{constructor(e,n){super({});const r=this,{codecType:s}=e;let i;s.startsWith("deflate")?i=ke:s.startsWith("inflate")&&(i=ve);let o=0,c=0;const f=new i(e,n),a=super.readable,l=new p({transform(e,t){e&&e.length&&(c+=e.length,t.enqueue(e))},flush(){t.assign(r,{inputSize:c})}}),u=new p({transform(e,t){e&&e.length&&(o+=e.length,t.enqueue(e))},flush(){const{signature:e}=f;t.assign(r,{signature:e,outputSize:o,inputSize:c})}});t.defineProperty(r,"readable",{get:()=>a.pipeThrough(l).pipeThrough(f).pipeThrough(u)})}}class Pe extends p{constructor(e){let t;super({transform:function n(r,s){if(t){const e=new i(t.length+r.length);e.set(t),e.set(r,t.length),r=e,t=null}r.length>e?(s.enqueue(r.slice(0,e)),n(r.slice(e),s)):t=r},flush(e){t&&t.length&&e.enqueue(t)}})}}const De=new a,Ve=new a;let Re,Be=0,Ee=!0;async function Me(e){try{const{options:t,scripts:r,config:s}=e;if(r&&r.length)try{Ee?importScripts.apply(k,r):await Ue(r)}catch(e){Ee=!1,await Ue(r)}self.initCodec&&self.initCodec(),s.CompressionStreamNative=self.CompressionStream,s.DecompressionStreamNative=self.DecompressionStream,self.Deflate&&(s.CompressionStream=new z(self.Deflate)),self.Inflate&&(s.DecompressionStream=new z(self.Inflate));const i={highWaterMark:1},o=e.readable||new y({async pull(e){const t=new u((e=>De.set(Be,e)));Ke({type:"pull",messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER;const{value:r,done:s}=await t;e.enqueue(r),s&&e.close()}},i),c=e.writable||new m({async write(e){let t;const r=new u((e=>t=e));Ve.set(Be,t),Ke({type:Ae,value:e,messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER,await r}},i),f=new Ie(t,s);Re=new AbortController;const{signal:a}=Re;await o.pipeThrough(f).pipeThrough(new Pe(s.chunkSize)).pipeTo(c,{signal:a,preventClose:!0,preventAbort:!0}),await c.getWriter().close();const{signature:l,inputSize:w,outputSize:h}=f;Ke({type:_e,result:{signature:l,inputSize:w,outputSize:h}})}catch(e){Ne(e)}}async function Ue(e){for(const t of e)await import(t)}function Ke(e){let{value:t}=e;if(t)if(t.length)try{t=new i(t),e.value=t.buffer,d(e,[e.value])}catch(t){d(e)}else d(e);else d(e)}function Ne(e=new s("Unknown error")){const{message:t,stack:n,code:r,name:i}=e;d({error:{message:t,stack:n,code:r,name:i}})}addEventListener("message",(({data:e})=>{const{type:t,messageId:n,value:r,done:s}=e;try{if("start"==t&&Me(e),t==Ae){const e=De.get(n);De.delete(n),e({value:new i(r),done:s})}if("ack"==t){const e=Ve.get(n);Ve.delete(n),e()}t==_e&&Re.abort()}catch(e){Ne(e)}}));const Oe=15,Te=573,We=-2;function je(t){return He(t.map((([t,n])=>new e(t).fill(n,0,t))))}function He(t){return t.reduce(((t,n)=>t.concat(e.isArray(n)?He(n):n)),[])}const Le=[0,1,2,3].concat(...je([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function Fe(){const e=this;function t(e,t){let n=0;do{n|=1&e,e>>>=1,n<<=1}while(--t>0);return n>>>1}e.re=n=>{const s=e.se,i=e.oe.ie,o=e.oe.ce;let c,f,a,l=-1;for(n.fe=0,n.ae=Te,c=0;o>c;c++)0!==s[2*c]?(n.le[++n.fe]=l=c,n.ue[c]=0):s[2*c+1]=0;for(;2>n.fe;)a=n.le[++n.fe]=2>l?++l:0,s[2*a]=1,n.ue[a]=0,n.we--,i&&(n.he-=i[2*a+1]);for(e.de=l,c=r.floor(n.fe/2);c>=1;c--)n.pe(s,c);a=o;do{c=n.le[1],n.le[1]=n.le[n.fe--],n.pe(s,1),f=n.le[1],n.le[--n.ae]=c,n.le[--n.ae]=f,s[2*a]=s[2*c]+s[2*f],n.ue[a]=r.max(n.ue[c],n.ue[f])+1,s[2*c+1]=s[2*f+1]=a,n.le[1]=a++,n.pe(s,1)}while(n.fe>=2);n.le[--n.ae]=n.le[1],(t=>{const n=e.se,r=e.oe.ie,s=e.oe.ye,i=e.oe.me,o=e.oe.be;let c,f,a,l,u,w,h=0;for(l=0;Oe>=l;l++)t.ge[l]=0;for(n[2*t.le[t.ae]+1]=0,c=t.ae+1;Te>c;c++)f=t.le[c],l=n[2*n[2*f+1]+1]+1,l>o&&(l=o,h++),n[2*f+1]=l,f>e.de||(t.ge[l]++,u=0,i>f||(u=s[f-i]),w=n[2*f],t.we+=w*(l+u),r&&(t.he+=w*(r[2*f+1]+u)));if(0!==h){do{for(l=o-1;0===t.ge[l];)l--;t.ge[l]--,t.ge[l+1]+=2,t.ge[o]--,h-=2}while(h>0);for(l=o;0!==l;l--)for(f=t.ge[l];0!==f;)a=t.le[--c],a>e.de||(n[2*a+1]!=l&&(t.we+=(l-n[2*a+1])*n[2*a],n[2*a+1]=l),f--)}})(n),((e,n,r)=>{const s=[];let i,o,c,f=0;for(i=1;Oe>=i;i++)s[i]=f=f+r[i-1]<<1;for(o=0;n>=o;o++)c=e[2*o+1],0!==c&&(e[2*o]=t(s[c]++,c))})(s,e.de,n.ge)}}function qe(e,t,n,r,s){const i=this;i.ie=e,i.ye=t,i.me=n,i.ce=r,i.be=s}Fe.ke=[0,1,2,3,4,5,6,7].concat(...je([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]])),Fe.ve=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0],Fe.Se=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576],Fe.ze=e=>256>e?Le[e]:Le[256+(e>>>7)],Fe.Ce=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],Fe.xe=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],Fe.Ae=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],Fe._e=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const Ge=je([[144,8],[112,9],[24,7],[8,8]]);qe.Ie=He([12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227].map(((e,t)=>[e,Ge[t]])));const Je=je([[30,5]]);function Qe(e,t,n,r,s){const i=this;i.Pe=e,i.De=t,i.Ve=n,i.Re=r,i.Be=s}qe.Ee=He([0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23].map(((e,t)=>[e,Je[t]]))),qe.Me=new qe(qe.Ie,Fe.Ce,257,286,Oe),qe.Ue=new qe(qe.Ee,Fe.xe,0,30,Oe),qe.Ke=new qe(null,Fe.Ae,0,19,7);const Xe=[new Qe(0,0,0,0,0),new Qe(4,4,8,4,1),new Qe(4,5,16,8,1),new Qe(4,6,32,32,1),new Qe(4,4,16,16,2),new Qe(8,16,32,32,2),new Qe(8,16,128,128,2),new Qe(8,32,128,256,2),new Qe(32,128,258,1024,2),new Qe(32,258,258,4096,2)],Ye=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],Ze=113,$e=666,et=262;function tt(e,t,n,r){const s=e[2*t],i=e[2*n];return i>s||s==i&&r[t]<=r[n]}function nt(){const e=this;let t,n,s,c,f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z,C,x,A,_,I,P,D,V,R,B,E,M,U;const K=new Fe,N=new Fe,O=new Fe;let T,W,j,H,L,F;function q(){let t;for(t=0;286>t;t++)E[2*t]=0;for(t=0;30>t;t++)M[2*t]=0;for(t=0;19>t;t++)U[2*t]=0;E[512]=1,e.we=e.he=0,W=j=0}function G(e,t){let n,r=-1,s=e[1],i=0,o=7,c=4;0===s&&(o=138,c=3),e[2*(t+1)+1]=65535;for(let f=0;t>=f;f++)n=s,s=e[2*(f+1)+1],++i<o&&n==s||(c>i?U[2*n]+=i:0!==n?(n!=r&&U[2*n]++,U[32]++):i>10?U[36]++:U[34]++,i=0,r=n,0===s?(o=138,c=3):n==s?(o=6,c=3):(o=7,c=4))}function J(t){e.Ne[e.pending++]=t}function Q(e){J(255&e),J(e>>>8&255)}function X(e,t){let n;const r=t;F>16-r?(n=e,L|=n<<F&65535,Q(L),L=n>>>16-F,F+=r-16):(L|=e<<F&65535,F+=r)}function Y(e,t){const n=2*e;X(65535&t[n],65535&t[n+1])}function Z(e,t){let n,r,s=-1,i=e[1],o=0,c=7,f=4;for(0===i&&(c=138,f=3),n=0;t>=n;n++)if(r=i,i=e[2*(n+1)+1],++o>=c||r!=i){if(f>o)do{Y(r,U)}while(0!=--o);else 0!==r?(r!=s&&(Y(r,U),o--),Y(16,U),X(o-3,2)):o>10?(Y(18,U),X(o-11,7)):(Y(17,U),X(o-3,3));o=0,s=r,0===i?(c=138,f=3):r==i?(c=6,f=3):(c=7,f=4)}}function $(){16==F?(Q(L),L=0,F=0):8>F||(J(255&L),L>>>=8,F-=8)}function ee(t,n){let s,i,o;if(e.Oe[W]=t,e.Te[W]=255&n,W++,0===t?E[2*n]++:(j++,t--,E[2*(Fe.ke[n]+256+1)]++,M[2*Fe.ze(t)]++),!(8191&W)&&D>2){for(s=8*W,i=C-k,o=0;30>o;o++)s+=M[2*o]*(5+Fe.xe[o]);if(s>>>=3,j<r.floor(W/2)&&s<r.floor(i/2))return!0}return W==T-1}function te(t,n){let r,s,i,o,c=0;if(0!==W)do{r=e.Oe[c],s=e.Te[c],c++,0===r?Y(s,t):(i=Fe.ke[s],Y(i+256+1,t),o=Fe.Ce[i],0!==o&&(s-=Fe.ve[i],X(s,o)),r--,i=Fe.ze(r),Y(i,n),o=Fe.xe[i],0!==o&&(r-=Fe.Se[i],X(r,o)))}while(W>c);Y(256,t),H=t[513]}function ne(){F>8?Q(L):F>0&&J(255&L),L=0,F=0}function re(t,n,r){X(0+(r?1:0),3),((t,n)=>{ne(),H=8,Q(n),Q(~n),e.Ne.set(u.subarray(t,t+n),e.pending),e.pending+=n})(t,n)}function se(n){((t,n,r)=>{let s,i,o=0;D>0?(K.re(e),N.re(e),o=(()=>{let t;for(G(E,K.de),G(M,N.de),O.re(e),t=18;t>=3&&0===U[2*Fe._e[t]+1];t--);return e.we+=14+3*(t+1),t})(),s=e.we+3+7>>>3,i=e.he+3+7>>>3,i>s||(s=i)):s=i=n+5,n+4>s||-1==t?i==s?(X(2+(r?1:0),3),te(qe.Ie,qe.Ee)):(X(4+(r?1:0),3),((e,t,n)=>{let r;for(X(e-257,5),X(t-1,5),X(n-4,4),r=0;n>r;r++)X(U[2*Fe._e[r]+1],3);Z(E,e-1),Z(M,t-1)})(K.de+1,N.de+1,o+1),te(E,M)):re(t,n,r),q(),r&&ne()})(0>k?-1:k,C-k,n),k=C,t.We()}function ie(){let e,n,r,s;do{if(s=w-A-C,0===s&&0===C&&0===A)s=f;else if(-1==s)s--;else if(C>=f+f-et){u.set(u.subarray(f,f+f),0),x-=f,C-=f,k-=f,e=y,r=e;do{n=65535&d[--r],d[r]=f>n?0:n-f}while(0!=--e);e=f,r=e;do{n=65535&h[--r],h[r]=f>n?0:n-f}while(0!=--e);s+=f}if(0===t.je)return;e=t.He(u,C+A,s),A+=e,3>A||(p=255&u[C],p=(p<<g^255&u[C+1])&b)}while(et>A&&0!==t.je)}function oe(e){let t,n,r=I,s=C,i=_;const o=C>f-et?C-(f-et):0;let c=B;const a=l,w=C+258;let d=u[s+i-1],p=u[s+i];R>_||(r>>=2),c>A&&(c=A);do{if(t=e,u[t+i]==p&&u[t+i-1]==d&&u[t]==u[s]&&u[++t]==u[s+1]){s+=2,t++;do{}while(u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&w>s);if(n=258-(w-s),s=w-258,n>i){if(x=e,i=n,n>=c)break;d=u[s+i-1],p=u[s+i]}}}while((e=65535&h[e&a])>o&&0!=--r);return i>A?A:i}e.ue=[],e.ge=[],e.le=[],E=[],M=[],U=[],e.pe=(t,n)=>{const r=e.le,s=r[n];let i=n<<1;for(;i<=e.fe&&(i<e.fe&&tt(t,r[i+1],r[i],e.ue)&&i++,!tt(t,s,r[i],e.ue));)r[n]=r[i],n=i,i<<=1;r[n]=s},e.Le=(t,S,x,W,j,G)=>(W||(W=8),j||(j=8),G||(G=0),t.Fe=null,-1==S&&(S=6),1>j||j>9||8!=W||9>x||x>15||0>S||S>9||0>G||G>2?We:(t.qe=e,a=x,f=1<<a,l=f-1,m=j+7,y=1<<m,b=y-1,g=r.floor((m+3-1)/3),u=new i(2*f),h=[],d=[],T=1<<j+6,e.Ne=new i(4*T),s=4*T,e.Oe=new o(T),e.Te=new i(T),D=S,V=G,(t=>(t.Ge=t.Je=0,t.Fe=null,e.pending=0,e.Qe=0,n=Ze,c=0,K.se=E,K.oe=qe.Me,N.se=M,N.oe=qe.Ue,O.se=U,O.oe=qe.Ke,L=0,F=0,H=8,q(),(()=>{w=2*f,d[y-1]=0;for(let e=0;y-1>e;e++)d[e]=0;P=Xe[D].De,R=Xe[D].Pe,B=Xe[D].Ve,I=Xe[D].Re,C=0,k=0,A=0,v=_=2,z=0,p=0})(),0))(t))),e.Xe=()=>42!=n&&n!=Ze&&n!=$e?We:(e.Te=null,e.Oe=null,e.Ne=null,d=null,h=null,u=null,e.qe=null,n==Ze?-3:0),e.Ye=(e,t,n)=>{let r=0;return-1==t&&(t=6),0>t||t>9||0>n||n>2?We:(Xe[D].Be!=Xe[t].Be&&0!==e.Ge&&(r=e.Ze(1)),D!=t&&(D=t,P=Xe[D].De,R=Xe[D].Pe,B=Xe[D].Ve,I=Xe[D].Re),V=n,r)},e.$e=(e,t,r)=>{let s,i=r,o=0;if(!t||42!=n)return We;if(3>i)return 0;for(i>f-et&&(i=f-et,o=r-i),u.set(t.subarray(o,o+i),0),C=i,k=i,p=255&u[0],p=(p<<g^255&u[1])&b,s=0;i-3>=s;s++)p=(p<<g^255&u[s+2])&b,h[s&l]=d[p],d[p]=s;return 0},e.Ze=(r,i)=>{let o,w,m,I,R;if(i>4||0>i)return We;if(!r.et||!r.tt&&0!==r.je||n==$e&&4!=i)return r.Fe=Ye[4],We;if(0===r.nt)return r.Fe=Ye[7],-5;var B;if(t=r,I=c,c=i,42==n&&(w=8+(a-8<<4)<<8,m=(D-1&255)>>1,m>3&&(m=3),w|=m<<6,0!==C&&(w|=32),w+=31-w%31,n=Ze,J((B=w)>>8&255),J(255&B)),0!==e.pending){if(t.We(),0===t.nt)return c=-1,0}else if(0===t.je&&I>=i&&4!=i)return t.Fe=Ye[7],-5;if(n==$e&&0!==t.je)return r.Fe=Ye[7],-5;if(0!==t.je||0!==A||0!=i&&n!=$e){switch(R=-1,Xe[D].Be){case 0:R=(e=>{let n,r=65535;for(r>s-5&&(r=s-5);;){if(1>=A){if(ie(),0===A&&0==e)return 0;if(0===A)break}if(C+=A,A=0,n=k+r,(0===C||C>=n)&&(A=C-n,C=n,se(!1),0===t.nt))return 0;if(C-k>=f-et&&(se(!1),0===t.nt))return 0}return se(4==e),0===t.nt?4==e?2:0:4==e?3:1})(i);break;case 1:R=(e=>{let n,r=0;for(;;){if(et>A){if(ie(),et>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C),0===r||(C-r&65535)>f-et||2!=V&&(v=oe(r)),3>v)n=ee(0,255&u[C]),A--,C++;else if(n=ee(C-x,v-3),A-=v,v>P||3>A)C+=v,v=0,p=255&u[C],p=(p<<g^255&u[C+1])&b;else{v--;do{C++,p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C}while(0!=--v);C++}if(n&&(se(!1),0===t.nt))return 0}return se(4==e),0===t.nt?4==e?2:0:4==e?3:1})(i);break;case 2:R=(e=>{let n,r,s=0;for(;;){if(et>A){if(ie(),et>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C),_=v,S=x,v=2,0!==s&&P>_&&f-et>=(C-s&65535)&&(2!=V&&(v=oe(s)),5>=v&&(1==V||3==v&&C-x>4096)&&(v=2)),3>_||v>_)if(0!==z){if(n=ee(0,255&u[C-1]),n&&se(!1),C++,A--,0===t.nt)return 0}else z=1,C++,A--;else{r=C+A-3,n=ee(C-1-S,_-3),A-=_-1,_-=2;do{++C>r||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C)}while(0!=--_);if(z=0,v=2,C++,n&&(se(!1),0===t.nt))return 0}}return 0!==z&&(n=ee(0,255&u[C-1]),z=0),se(4==e),0===t.nt?4==e?2:0:4==e?3:1})(i)}if(2!=R&&3!=R||(n=$e),0==R||2==R)return 0===t.nt&&(c=-1),0;if(1==R){if(1==i)X(2,3),Y(256,qe.Ie),$(),9>1+H+10-F&&(X(2,3),Y(256,qe.Ie),$()),H=7;else if(re(0,0,!1),3==i)for(o=0;y>o;o++)d[o]=0;if(t.We(),0===t.nt)return c=-1,0}}return 4!=i?0:1}}function rt(){const e=this;e.rt=0,e.st=0,e.je=0,e.Ge=0,e.nt=0,e.Je=0}function st(e){const t=new rt,n=(o=e&&e.chunkSize?e.chunkSize:65536)+5*(r.floor(o/16383)+1);var o;const c=new i(n);let f=e?e.level:-1;void 0===f&&(f=-1),t.Le(f),t.et=c,this.append=(e,r)=>{let o,f,a=0,l=0,u=0;const w=[];if(e.length){t.rt=0,t.tt=e,t.je=e.length;do{if(t.st=0,t.nt=n,o=t.Ze(0),0!=o)throw new s("deflating: "+t.Fe);t.st&&(t.st==n?w.push(new i(c)):w.push(c.subarray(0,t.st))),u+=t.st,r&&t.rt>0&&t.rt!=a&&(r(t.rt),a=t.rt)}while(t.je>0||0===t.nt);return w.length>1?(f=new i(u),w.forEach((e=>{f.set(e,l),l+=e.length}))):f=w[0]?new i(w[0]):new i,f}},this.flush=()=>{let e,r,o=0,f=0;const a=[];do{if(t.st=0,t.nt=n,e=t.Ze(4),1!=e&&0!=e)throw new s("deflating: "+t.Fe);n-t.nt>0&&a.push(c.slice(0,t.st)),f+=t.st}while(t.je>0||0===t.nt);return t.Xe(),r=new i(f),a.forEach((e=>{r.set(e,o),o+=e.length})),r}}rt.prototype={Le(e,t){const n=this;return n.qe=new nt,t||(t=Oe),n.qe.Le(n,e,t)},Ze(e){const t=this;return t.qe?t.qe.Ze(t,e):We},Xe(){const e=this;if(!e.qe)return We;const t=e.qe.Xe();return e.qe=null,t},Ye(e,t){const n=this;return n.qe?n.qe.Ye(n,e,t):We},$e(e,t){const n=this;return n.qe?n.qe.$e(n,e,t):We},He(e,t,n){const r=this;let s=r.je;return s>n&&(s=n),0===s?0:(r.je-=s,e.set(r.tt.subarray(r.rt,r.rt+s),t),r.rt+=s,r.Ge+=s,s)},We(){const e=this;let t=e.qe.pending;t>e.nt&&(t=e.nt),0!==t&&(e.et.set(e.qe.Ne.subarray(e.qe.Qe,e.qe.Qe+t),e.st),e.st+=t,e.qe.Qe+=t,e.Je+=t,e.nt-=t,e.qe.pending-=t,0===e.qe.pending&&(e.qe.Qe=0))}};const it=0,ot=1,ct=-2,ft=-3,at=-4,lt=-5,ut=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],wt=1440,ht=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],dt=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],pt=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],yt=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],mt=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],bt=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],gt=15;function kt(){let e,t,n,r,s,i;function o(e,t,o,c,f,a,l,u,w,h,d){let p,y,m,b,g,k,v,S,z,C,x,A,_,I,P;C=0,g=o;do{n[e[t+C]]++,C++,g--}while(0!==g);if(n[0]==o)return l[0]=-1,u[0]=0,it;for(S=u[0],k=1;gt>=k&&0===n[k];k++);for(v=k,k>S&&(S=k),g=gt;0!==g&&0===n[g];g--);for(m=g,S>g&&(S=g),u[0]=S,I=1<<k;g>k;k++,I<<=1)if(0>(I-=n[k]))return ft;if(0>(I-=n[g]))return ft;for(n[g]+=I,i[1]=k=0,C=1,_=2;0!=--g;)i[_]=k+=n[C],_++,C++;g=0,C=0;do{0!==(k=e[t+C])&&(d[i[k]++]=g),C++}while(++g<o);for(o=i[m],i[0]=g=0,C=0,b=-1,A=-S,s[0]=0,x=0,P=0;m>=v;v++)for(p=n[v];0!=p--;){for(;v>A+S;){if(b++,A+=S,P=m-A,P=P>S?S:P,(y=1<<(k=v-A))>p+1&&(y-=p+1,_=v,P>k))for(;++k<P&&(y<<=1)>n[++_];)y-=n[_];if(P=1<<k,h[0]+P>wt)return ft;s[b]=x=h[0],h[0]+=P,0!==b?(i[b]=g,r[0]=k,r[1]=S,k=g>>>A-S,r[2]=x-s[b-1]-k,w.set(r,3*(s[b-1]+k))):l[0]=x}for(r[1]=v-A,o>C?d[C]<c?(r[0]=256>d[C]?0:96,r[2]=d[C++]):(r[0]=a[d[C]-c]+16+64,r[2]=f[d[C++]-c]):r[0]=192,y=1<<v-A,k=g>>>A;P>k;k+=y)w.set(r,3*(x+k));for(k=1<<v-1;g&k;k>>>=1)g^=k;for(g^=k,z=(1<<A)-1;(g&z)!=i[b];)b--,A-=S,z=(1<<A)-1}return 0!==I&&1!=m?lt:it}function c(o){let c;for(e||(e=[],t=[],n=new f(gt+1),r=[],s=new f(gt),i=new f(gt+1)),t.length<o&&(t=[]),c=0;o>c;c++)t[c]=0;for(c=0;gt+1>c;c++)n[c]=0;for(c=0;3>c;c++)r[c]=0;s.set(n.subarray(0,gt),0),i.set(n.subarray(0,gt+1),0)}this.it=(n,r,s,i,f)=>{let a;return c(19),e[0]=0,a=o(n,0,19,19,null,null,s,r,i,e,t),a==ft?f.Fe="oversubscribed dynamic bit lengths tree":a!=lt&&0!==r[0]||(f.Fe="incomplete dynamic bit lengths tree",a=ft),a},this.ot=(n,r,s,i,f,a,l,u,w)=>{let h;return c(288),e[0]=0,h=o(s,0,n,257,pt,yt,a,i,u,e,t),h!=it||0===i[0]?(h==ft?w.Fe="oversubscribed literal/length tree":h!=at&&(w.Fe="incomplete literal/length tree",h=ft),h):(c(288),h=o(s,n,r,0,mt,bt,l,f,u,e,t),h!=it||0===f[0]&&n>257?(h==ft?w.Fe="oversubscribed distance tree":h==lt?(w.Fe="incomplete distance tree",h=ft):h!=at&&(w.Fe="empty distance tree with lengths",h=ft),h):it)}}kt.ct=(e,t,n,r)=>(e[0]=9,t[0]=5,n[0]=ht,r[0]=dt,it);const vt=0,St=1,zt=2,Ct=3,xt=4,At=5,_t=6,It=7,Pt=8,Dt=9;function Vt(){const e=this;let t,n,r,s,i=0,o=0,c=0,f=0,a=0,l=0,u=0,w=0,h=0,d=0;function p(e,t,n,r,s,i,o,c){let f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z;d=c.rt,p=c.je,w=o.ft,h=o.lt,y=o.write,m=y<o.read?o.read-y-1:o.end-y,b=ut[e],g=ut[t];do{for(;20>h;)p--,w|=(255&c.ut(d++))<<h,h+=8;if(f=w&b,a=n,l=r,z=3*(l+f),0!==(u=a[z]))for(;;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15,k=a[z+2]+(w&ut[u]),w>>=u,h-=u;15>h;)p--,w|=(255&c.ut(d++))<<h,h+=8;for(f=w&g,a=s,l=i,z=3*(l+f),u=a[z];;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15;u>h;)p--,w|=(255&c.ut(d++))<<h,h+=8;if(v=a[z+2]+(w&ut[u]),w>>=u,h-=u,m-=k,v>y){S=y-v;do{S+=o.end}while(0>S);if(u=o.end-S,k>u){if(k-=u,y-S>0&&u>y-S)do{o.wt[y++]=o.wt[S++]}while(0!=--u);else o.wt.set(o.wt.subarray(S,S+u),y),y+=u,S+=u,u=0;S=0}}else S=y-v,y-S>0&&2>y-S?(o.wt[y++]=o.wt[S++],o.wt[y++]=o.wt[S++],k-=2):(o.wt.set(o.wt.subarray(S,S+2),y),y+=2,S+=2,k-=2);if(y-S>0&&k>y-S)do{o.wt[y++]=o.wt[S++]}while(0!=--k);else o.wt.set(o.wt.subarray(S,S+k),y),y+=k,S+=k,k=0;break}if(64&u)return c.Fe="invalid distance code",k=c.je-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ft=w,o.lt=h,c.je=p,c.Ge+=d-c.rt,c.rt=d,o.write=y,ft;f+=a[z+2],f+=w&ut[u],z=3*(l+f),u=a[z]}break}if(64&u)return 32&u?(k=c.je-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ft=w,o.lt=h,c.je=p,c.Ge+=d-c.rt,c.rt=d,o.write=y,ot):(c.Fe="invalid literal/length code",k=c.je-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ft=w,o.lt=h,c.je=p,c.Ge+=d-c.rt,c.rt=d,o.write=y,ft);if(f+=a[z+2],f+=w&ut[u],z=3*(l+f),0===(u=a[z])){w>>=a[z+1],h-=a[z+1],o.wt[y++]=a[z+2],m--;break}}else w>>=a[z+1],h-=a[z+1],o.wt[y++]=a[z+2],m--}while(m>=258&&p>=10);return k=c.je-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ft=w,o.lt=h,c.je=p,c.Ge+=d-c.rt,c.rt=d,o.write=y,it}e.init=(e,i,o,c,f,a)=>{t=vt,u=e,w=i,r=o,h=c,s=f,d=a,n=null},e.ht=(e,y,m)=>{let b,g,k,v,S,z,C,x=0,A=0,_=0;for(_=y.rt,v=y.je,x=e.ft,A=e.lt,S=e.write,z=S<e.read?e.read-S-1:e.end-S;;)switch(t){case vt:if(z>=258&&v>=10&&(e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,m=p(u,w,r,h,s,d,e,y),_=y.rt,v=y.je,x=e.ft,A=e.lt,S=e.write,z=S<e.read?e.read-S-1:e.end-S,m!=it)){t=m==ot?It:Dt;break}c=u,n=r,o=h,t=St;case St:for(b=c;b>A;){if(0===v)return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);m=it,v--,x|=(255&y.ut(_++))<<A,A+=8}if(g=3*(o+(x&ut[b])),x>>>=n[g+1],A-=n[g+1],k=n[g],0===k){f=n[g+2],t=_t;break}if(16&k){a=15&k,i=n[g+2],t=zt;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}if(32&k){t=It;break}return t=Dt,y.Fe="invalid literal/length code",m=ft,e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);case zt:for(b=a;b>A;){if(0===v)return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);m=it,v--,x|=(255&y.ut(_++))<<A,A+=8}i+=x&ut[b],x>>=b,A-=b,c=w,n=s,o=d,t=Ct;case Ct:for(b=c;b>A;){if(0===v)return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);m=it,v--,x|=(255&y.ut(_++))<<A,A+=8}if(g=3*(o+(x&ut[b])),x>>=n[g+1],A-=n[g+1],k=n[g],16&k){a=15&k,l=n[g+2],t=xt;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}return t=Dt,y.Fe="invalid distance code",m=ft,e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);case xt:for(b=a;b>A;){if(0===v)return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);m=it,v--,x|=(255&y.ut(_++))<<A,A+=8}l+=x&ut[b],x>>=b,A-=b,t=At;case At:for(C=S-l;0>C;)C+=e.end;for(;0!==i;){if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.dt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);e.wt[S++]=e.wt[C++],z--,C==e.end&&(C=0),i--}t=vt;break;case _t:if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.dt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);m=it,e.wt[S++]=f,z--,t=vt;break;case It:if(A>7&&(A-=8,v++,_--),e.write=S,m=e.dt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,e.read!=e.write)return e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);t=Pt;case Pt:return m=ot,e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);case Dt:return m=ft,e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m);default:return m=ct,e.ft=x,e.lt=A,y.je=v,y.Ge+=_-y.rt,y.rt=_,e.write=S,e.dt(y,m)}},e.yt=()=>{}}const Rt=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],Bt=0,Et=1,Mt=2,Ut=3,Kt=4,Nt=5,Ot=6,Tt=7,Wt=8,jt=9;function Ht(e,t){const n=this;let r,s=Bt,o=0,c=0,a=0;const l=[0],u=[0],w=new Vt;let h=0,d=new f(3*wt);const p=new kt;n.lt=0,n.ft=0,n.wt=new i(t),n.end=t,n.read=0,n.write=0,n.reset=(e,t)=>{t&&(t[0]=0),s==Ot&&w.yt(e),s=Bt,n.lt=0,n.ft=0,n.read=n.write=0},n.reset(e,null),n.dt=(e,t)=>{let r,s,i;return s=e.st,i=n.read,r=(i>n.write?n.end:n.write)-i,r>e.nt&&(r=e.nt),0!==r&&t==lt&&(t=it),e.nt-=r,e.Je+=r,e.et.set(n.wt.subarray(i,i+r),s),s+=r,i+=r,i==n.end&&(i=0,n.write==n.end&&(n.write=0),r=n.write-i,r>e.nt&&(r=e.nt),0!==r&&t==lt&&(t=it),e.nt-=r,e.Je+=r,e.et.set(n.wt.subarray(i,i+r),s),s+=r,i+=r),e.st=s,n.read=i,t},n.ht=(e,t)=>{let i,f,y,m,b,g,k,v;for(m=e.rt,b=e.je,f=n.ft,y=n.lt,g=n.write,k=g<n.read?n.read-g-1:n.end-g;;){let S,z,C,x,A,_,I,P;switch(s){case Bt:for(;3>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}switch(i=7&f,h=1&i,i>>>1){case 0:f>>>=3,y-=3,i=7&y,f>>>=i,y-=i,s=Et;break;case 1:S=[],z=[],C=[[]],x=[[]],kt.ct(S,z,C,x),w.init(S[0],z[0],C[0],0,x[0],0),f>>>=3,y-=3,s=Ot;break;case 2:f>>>=3,y-=3,s=Ut;break;case 3:return f>>>=3,y-=3,s=jt,e.Fe="invalid block type",t=ft,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t)}break;case Et:for(;32>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}if((~f>>>16&65535)!=(65535&f))return s=jt,e.Fe="invalid stored block lengths",t=ft,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);o=65535&f,f=y=0,s=0!==o?Mt:0!==h?Tt:Bt;break;case Mt:if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);if(0===k&&(g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k&&(n.write=g,t=n.dt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k)))return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);if(t=it,i=o,i>b&&(i=b),i>k&&(i=k),n.wt.set(e.He(m,i),g),m+=i,b-=i,g+=i,k-=i,0!=(o-=i))break;s=0!==h?Tt:Bt;break;case Ut:for(;14>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}if(c=i=16383&f,(31&i)>29||(i>>5&31)>29)return s=jt,e.Fe="too many length or distance symbols",t=ft,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);if(i=258+(31&i)+(i>>5&31),!r||r.length<i)r=[];else for(v=0;i>v;v++)r[v]=0;f>>>=14,y-=14,a=0,s=Kt;case Kt:for(;4+(c>>>10)>a;){for(;3>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}r[Rt[a++]]=7&f,f>>>=3,y-=3}for(;19>a;)r[Rt[a++]]=0;if(l[0]=7,i=p.it(r,l,u,d,e),i!=it)return(t=i)==ft&&(r=null,s=jt),n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);a=0,s=Nt;case Nt:for(;i=c,258+(31&i)+(i>>5&31)>a;){let o,w;for(i=l[0];i>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}if(i=d[3*(u[0]+(f&ut[i]))+1],w=d[3*(u[0]+(f&ut[i]))+2],16>w)f>>>=i,y-=i,r[a++]=w;else{for(v=18==w?7:w-14,o=18==w?11:3;i+v>y;){if(0===b)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);t=it,b--,f|=(255&e.ut(m++))<<y,y+=8}if(f>>>=i,y-=i,o+=f&ut[v],f>>>=v,y-=v,v=a,i=c,v+o>258+(31&i)+(i>>5&31)||16==w&&1>v)return r=null,s=jt,e.Fe="invalid bit length repeat",t=ft,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);w=16==w?r[v-1]:0;do{r[v++]=w}while(0!=--o);a=v}}if(u[0]=-1,A=[],_=[],I=[],P=[],A[0]=9,_[0]=6,i=c,i=p.ot(257+(31&i),1+(i>>5&31),r,A,_,I,P,d,e),i!=it)return i==ft&&(r=null,s=jt),t=i,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);w.init(A[0],_[0],d,I[0],d,P[0]),s=Ot;case Ot:if(n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,(t=w.ht(n,e,t))!=ot)return n.dt(e,t);if(t=it,w.yt(e),m=e.rt,b=e.je,f=n.ft,y=n.lt,g=n.write,k=g<n.read?n.read-g-1:n.end-g,0===h){s=Bt;break}s=Tt;case Tt:if(n.write=g,t=n.dt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,n.read!=n.write)return n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);s=Wt;case Wt:return t=ot,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);case jt:return t=ft,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t);default:return t=ct,n.ft=f,n.lt=y,e.je=b,e.Ge+=m-e.rt,e.rt=m,n.write=g,n.dt(e,t)}}},n.yt=e=>{n.reset(e,null),n.wt=null,d=null},n.bt=(e,t,r)=>{n.wt.set(e.subarray(t,t+r),0),n.read=n.write=r},n.gt=()=>s==Et?1:0}const Lt=13,Ft=[0,0,255,255];function qt(){const e=this;function t(e){return e&&e.kt?(e.Ge=e.Je=0,e.Fe=null,e.kt.mode=7,e.kt.vt.reset(e,null),it):ct}e.mode=0,e.method=0,e.St=[0],e.zt=0,e.marker=0,e.Ct=0,e.xt=t=>(e.vt&&e.vt.yt(t),e.vt=null,it),e.At=(n,r)=>(n.Fe=null,e.vt=null,8>r||r>15?(e.xt(n),ct):(e.Ct=r,n.kt.vt=new Ht(n,1<<r),t(n),it)),e._t=(e,t)=>{let n,r;if(!e||!e.kt||!e.tt)return ct;const s=e.kt;for(t=4==t?lt:it,n=lt;;)switch(s.mode){case 0:if(0===e.je)return n;if(n=t,e.je--,e.Ge++,8!=(15&(s.method=e.ut(e.rt++)))){s.mode=Lt,e.Fe="unknown compression method",s.marker=5;break}if(8+(s.method>>4)>s.Ct){s.mode=Lt,e.Fe="invalid win size",s.marker=5;break}s.mode=1;case 1:if(0===e.je)return n;if(n=t,e.je--,e.Ge++,r=255&e.ut(e.rt++),((s.method<<8)+r)%31!=0){s.mode=Lt,e.Fe="incorrect header check",s.marker=5;break}if(!(32&r)){s.mode=7;break}s.mode=2;case 2:if(0===e.je)return n;n=t,e.je--,e.Ge++,s.zt=(255&e.ut(e.rt++))<<24&4278190080,s.mode=3;case 3:if(0===e.je)return n;n=t,e.je--,e.Ge++,s.zt+=(255&e.ut(e.rt++))<<16&16711680,s.mode=4;case 4:if(0===e.je)return n;n=t,e.je--,e.Ge++,s.zt+=(255&e.ut(e.rt++))<<8&65280,s.mode=5;case 5:return 0===e.je?n:(n=t,e.je--,e.Ge++,s.zt+=255&e.ut(e.rt++),s.mode=6,2);case 6:return s.mode=Lt,e.Fe="need dictionary",s.marker=0,ct;case 7:if(n=s.vt.ht(e,n),n==ft){s.mode=Lt,s.marker=0;break}if(n==it&&(n=t),n!=ot)return n;n=t,s.vt.reset(e,s.St),s.mode=12;case 12:return e.je=0,ot;case Lt:return ft;default:return ct}},e.It=(e,t,n)=>{let r=0,s=n;if(!e||!e.kt||6!=e.kt.mode)return ct;const i=e.kt;return s<1<<i.Ct||(s=(1<<i.Ct)-1,r=n-s),i.vt.bt(t,r,s),i.mode=7,it},e.Pt=e=>{let n,r,s,i,o;if(!e||!e.kt)return ct;const c=e.kt;if(c.mode!=Lt&&(c.mode=Lt,c.marker=0),0===(n=e.je))return lt;for(r=e.rt,s=c.marker;0!==n&&4>s;)e.ut(r)==Ft[s]?s++:s=0!==e.ut(r)?0:4-s,r++,n--;return e.Ge+=r-e.rt,e.rt=r,e.je=n,c.marker=s,4!=s?ft:(i=e.Ge,o=e.Je,t(e),e.Ge=i,e.Je=o,c.mode=7,it)},e.Dt=e=>e&&e.kt&&e.kt.vt?e.kt.vt.gt():ct}function Gt(){}function Jt(e){const t=new Gt,n=e&&e.chunkSize?r.floor(2*e.chunkSize):131072,o=new i(n);let c=!1;t.At(),t.et=o,this.append=(e,r)=>{const f=[];let a,l,u=0,w=0,h=0;if(0!==e.length){t.rt=0,t.tt=e,t.je=e.length;do{if(t.st=0,t.nt=n,0!==t.je||c||(t.rt=0,c=!0),a=t._t(0),c&&a===lt){if(0!==t.je)throw new s("inflating: bad input")}else if(a!==it&&a!==ot)throw new s("inflating: "+t.Fe);if((c||a===ot)&&t.je===e.length)throw new s("inflating: bad input");t.st&&(t.st===n?f.push(new i(o)):f.push(o.subarray(0,t.st))),h+=t.st,r&&t.rt>0&&t.rt!=u&&(r(t.rt),u=t.rt)}while(t.je>0||0===t.nt);return f.length>1?(l=new i(h),f.forEach((e=>{l.set(e,w),w+=e.length}))):l=f[0]?new i(f[0]):new i,l}},this.flush=()=>{t.xt()}}Gt.prototype={At(e){const t=this;return t.kt=new qt,e||(e=15),t.kt.At(t,e)},_t(e){const t=this;return t.kt?t.kt._t(t,e):ct},xt(){const e=this;if(!e.kt)return ct;const t=e.kt.xt(e);return e.kt=null,t},Pt(){const e=this;return e.kt?e.kt.Pt(e):ct},It(e,t){const n=this;return n.kt?n.kt.It(n,e,t):ct},ut(e){return this.tt[e]},He(e,t){return this.tt.subarray(e,e+t)}},self.initCodec=()=>{self.Deflate=st,self.Inflate=Jt};\n'],{type:"text/javascript"}));e({workerScripts:{inflate:[t],deflate:[t]}});}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	const ERR_ITERATOR_COMPLETED_TOO_SOON = "Writer iterator completed too soon";
	const DEFAULT_CHUNK_SIZE = 64 * 1024;

	const PROPERTY_NAME_WRITABLE = "writable";

	class Stream {

		constructor() {
			this.size = 0;
		}

		init() {
			this.initialized = true;
		}
	}

	class Reader extends Stream {

		get readable() {
			const reader = this;
			const { chunkSize = DEFAULT_CHUNK_SIZE } = reader;
			const readable = new ReadableStream({
				start() {
					this.chunkOffset = 0;
				},
				async pull(controller) {
					const { offset = 0, size, diskNumberStart } = readable;
					const { chunkOffset } = this;
					controller.enqueue(await readUint8Array(reader, offset + chunkOffset, Math.min(chunkSize, size - chunkOffset), diskNumberStart));
					if (chunkOffset + chunkSize > size) {
						controller.close();
					} else {
						this.chunkOffset += chunkSize;
					}
				}
			});
			return readable;
		}
	}

	class Writer extends Stream {

		constructor() {
			super();
			const writer = this;
			const writable = new WritableStream({
				write(chunk) {
					return writer.writeUint8Array(chunk);
				}
			});
			Object.defineProperty(writer, PROPERTY_NAME_WRITABLE, {
				get() {
					return writable;
				}
			});
		}

		writeUint8Array() {
			// abstract
		}
	}

	class BlobReader extends Reader {

		constructor(blob) {
			super();
			Object.assign(this, {
				blob,
				size: blob.size
			});
		}

		async readUint8Array(offset, length) {
			const reader = this;
			const offsetEnd = offset + length;
			const blob = offset || offsetEnd < reader.size ? reader.blob.slice(offset, offsetEnd) : reader.blob;
			let arrayBuffer = await blob.arrayBuffer();
			if (arrayBuffer.byteLength > length) {
				arrayBuffer = arrayBuffer.slice(offset, offsetEnd);
			}
			return new Uint8Array(arrayBuffer);
		}
	}


	class Uint8ArrayReader extends Reader {

		constructor(array) {
			super();
			Object.assign(this, {
				array,
				size: array.length
			});
		}

		readUint8Array(index, length) {
			return this.array.slice(index, index + length);
		}
	}

	class Uint8ArrayWriter extends Writer {

		init(initSize = 0) {
			Object.assign(this, {
				offset: 0,
				array: new Uint8Array(initSize)
			});
			super.init();
		}

		writeUint8Array(array) {
			const writer = this;
			if (writer.offset + array.length > writer.array.length) {
				const previousArray = writer.array;
				writer.array = new Uint8Array(previousArray.length + array.length);
				writer.array.set(previousArray);
			}
			writer.array.set(array, writer.offset);
			writer.offset += array.length;
		}

		getData() {
			return this.array;
		}
	}

	class SplitDataReader extends Reader {

		constructor(readers) {
			super();
			this.readers = readers;
		}

		async init() {
			const reader = this;
			const { readers } = reader;
			reader.lastDiskNumber = 0;
			reader.lastDiskOffset = 0;
			await Promise.all(readers.map(async (diskReader, indexDiskReader) => {
				await diskReader.init();
				if (indexDiskReader != readers.length - 1) {
					reader.lastDiskOffset += diskReader.size;
				}
				reader.size += diskReader.size;
			}));
			super.init();
		}

		async readUint8Array(offset, length, diskNumber = 0) {
			const reader = this;
			const { readers } = this;
			let result;
			let currentDiskNumber = diskNumber;
			if (currentDiskNumber == -1) {
				currentDiskNumber = readers.length - 1;
			}
			let currentReaderOffset = offset;
			while (currentReaderOffset >= readers[currentDiskNumber].size) {
				currentReaderOffset -= readers[currentDiskNumber].size;
				currentDiskNumber++;
			}
			const currentReader = readers[currentDiskNumber];
			const currentReaderSize = currentReader.size;
			if (currentReaderOffset + length <= currentReaderSize) {
				result = await readUint8Array(currentReader, currentReaderOffset, length);
			} else {
				const chunkLength = currentReaderSize - currentReaderOffset;
				result = new Uint8Array(length);
				result.set(await readUint8Array(currentReader, currentReaderOffset, chunkLength));
				result.set(await reader.readUint8Array(offset + chunkLength, length - chunkLength, diskNumber), chunkLength);
			}
			reader.lastDiskNumber = Math.max(currentDiskNumber, reader.lastDiskNumber);
			return result;
		}
	}

	class SplitDataWriter extends Stream {

		constructor(writerGenerator, maxSize = 4294967295) {
			super();
			const writer = this;
			Object.assign(writer, {
				diskNumber: 0,
				diskOffset: 0,
				size: 0,
				maxSize,
				availableSize: maxSize
			});
			let diskSourceWriter, diskWritable, diskWriter;
			const writable = new WritableStream({
				async write(chunk) {
					const { availableSize } = writer;
					if (!diskWriter) {
						const { value, done } = await writerGenerator.next();
						if (done && !value) {
							throw new Error(ERR_ITERATOR_COMPLETED_TOO_SOON);
						} else {
							diskSourceWriter = value;
							diskSourceWriter.size = 0;
							if (diskSourceWriter.maxSize) {
								writer.maxSize = diskSourceWriter.maxSize;
							}
							writer.availableSize = writer.maxSize;
							await initStream(diskSourceWriter);
							diskWritable = value.writable;
							diskWriter = diskWritable.getWriter();
						}
						await this.write(chunk);
					} else if (chunk.length >= availableSize) {
						await writeChunk(chunk.slice(0, availableSize));
						await closeDisk();
						writer.diskOffset += diskSourceWriter.size;
						writer.diskNumber++;
						diskWriter = null;
						await this.write(chunk.slice(availableSize));
					} else {
						await writeChunk(chunk);
					}
				},
				async close() {
					await diskWriter.ready;
					await closeDisk();
				}
			});
			Object.defineProperty(writer, PROPERTY_NAME_WRITABLE, {
				get() {
					return writable;
				}
			});

			async function writeChunk(chunk) {
				const chunkLength = chunk.length;
				if (chunkLength) {
					await diskWriter.ready;
					await diskWriter.write(chunk);
					diskSourceWriter.size += chunkLength;
					writer.size += chunkLength;
					writer.availableSize -= chunkLength;
				}
			}

			async function closeDisk() {
				diskWritable.size = diskSourceWriter.size;
				await diskWriter.close();
			}
		}
	}

	async function initStream(stream, initSize) {
		if (stream.init && !stream.initialized) {
			await stream.init(initSize);
		} else {
			return Promise.resolve();
		}
	}

	function initReader(reader) {
		if (Array.isArray(reader)) {
			reader = new SplitDataReader(reader);
		}
		if (reader instanceof ReadableStream) {
			reader = {
				readable: reader
			};
		}
		return reader;
	}

	function initWriter(writer) {
		if (writer.writable === UNDEFINED_VALUE && typeof writer.next == FUNCTION_TYPE) {
			writer = new SplitDataWriter(writer);
		}
		if (writer instanceof WritableStream) {
			writer = {
				writable: writer
			};
		}
		const { writable } = writer;
		if (writable.size === UNDEFINED_VALUE) {
			writable.size = 0;
		}
		if (!(writer instanceof SplitDataWriter)) {
			Object.assign(writer, {
				diskNumber: 0,
				diskOffset: 0,
				availableSize: Infinity,
				maxSize: Infinity
			});
		}
		return writer;
	}

	function readUint8Array(reader, offset, size, diskNumber) {
		return reader.readUint8Array(offset, size, diskNumber);
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	/* global TextDecoder */

	const CP437 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");
	const VALID_CP437 = CP437.length == 256;

	function decodeCP437(stringValue) {
		if (VALID_CP437) {
			let result = "";
			for (let indexCharacter = 0; indexCharacter < stringValue.length; indexCharacter++) {
				result += CP437[stringValue[indexCharacter]];
			}
			return result;
		} else {
			return new TextDecoder().decode(stringValue);
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	function decodeText(value, encoding) {
		if (encoding && encoding.trim().toLowerCase() == "cp437") {
			return decodeCP437(value);
		} else {
			return new TextDecoder(encoding).decode(value);
		}
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright 
	 notice, this list of conditions and the following disclaimer in 
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	const PROPERTY_NAME_FILENAME = "filename";
	const PROPERTY_NAME_RAW_FILENAME = "rawFilename";
	const PROPERTY_NAME_COMMENT = "comment";
	const PROPERTY_NAME_RAW_COMMENT = "rawComment";
	const PROPERTY_NAME_UNCOMPPRESSED_SIZE = "uncompressedSize";
	const PROPERTY_NAME_COMPPRESSED_SIZE = "compressedSize";
	const PROPERTY_NAME_OFFSET = "offset";
	const PROPERTY_NAME_DISK_NUMBER_START = "diskNumberStart";
	const PROPERTY_NAME_LAST_MODIFICATION_DATE = "lastModDate";
	const PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE = "rawLastModDate";
	const PROPERTY_NAME_LAST_ACCESS_DATE = "lastAccessDate";
	const PROPERTY_NAME_RAW_LAST_ACCESS_DATE = "rawLastAccessDate";
	const PROPERTY_NAME_CREATION_DATE = "creationDate";
	const PROPERTY_NAME_RAW_CREATION_DATE = "rawCreationDate";
	const PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTE = "internalFileAttribute";
	const PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTE = "externalFileAttribute";
	const PROPERTY_NAME_MS_DOS_COMPATIBLE = "msDosCompatible";
	const PROPERTY_NAME_ZIP64 = "zip64";

	const PROPERTY_NAMES = [
		PROPERTY_NAME_FILENAME, PROPERTY_NAME_RAW_FILENAME, PROPERTY_NAME_COMPPRESSED_SIZE, PROPERTY_NAME_UNCOMPPRESSED_SIZE,
		PROPERTY_NAME_LAST_MODIFICATION_DATE, PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE, PROPERTY_NAME_COMMENT, PROPERTY_NAME_RAW_COMMENT,
		PROPERTY_NAME_LAST_ACCESS_DATE, PROPERTY_NAME_CREATION_DATE, PROPERTY_NAME_OFFSET, PROPERTY_NAME_DISK_NUMBER_START,
		PROPERTY_NAME_DISK_NUMBER_START, PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTE, PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTE,
		PROPERTY_NAME_MS_DOS_COMPATIBLE, PROPERTY_NAME_ZIP64,
		"directory", "bitFlag", "encrypted", "signature", "filenameUTF8", "commentUTF8", "compressionMethod", "version", "versionMadeBy",
		"extraField", "rawExtraField", "extraFieldZip64", "extraFieldUnicodePath", "extraFieldUnicodeComment", "extraFieldAES", "extraFieldNTFS",
		"extraFieldExtendedTimestamp"];

	class Entry {

		constructor(data) {
			PROPERTY_NAMES.forEach(name => this[name] = data[name]);
		}

	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright
	 notice, this list of conditions and the following disclaimer in
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	const ERR_BAD_FORMAT = "File format is not recognized";
	const ERR_EOCDR_NOT_FOUND = "End of central directory not found";
	const ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND = "End of Zip64 central directory locator not found";
	const ERR_CENTRAL_DIRECTORY_NOT_FOUND = "Central directory header not found";
	const ERR_LOCAL_FILE_HEADER_NOT_FOUND = "Local file header not found";
	const ERR_EXTRAFIELD_ZIP64_NOT_FOUND = "Zip64 extra field not found";
	const ERR_ENCRYPTED = "File contains encrypted entry";
	const ERR_UNSUPPORTED_ENCRYPTION = "Encryption method not supported";
	const ERR_UNSUPPORTED_COMPRESSION = "Compression method not supported";
	const ERR_SPLIT_ZIP_FILE = "Split zip file";
	const CHARSET_UTF8 = "utf-8";
	const CHARSET_CP437 = "cp437";
	const ZIP64_PROPERTIES = [
		[PROPERTY_NAME_UNCOMPPRESSED_SIZE, MAX_32_BITS],
		[PROPERTY_NAME_COMPPRESSED_SIZE, MAX_32_BITS],
		[PROPERTY_NAME_OFFSET, MAX_32_BITS],
		[PROPERTY_NAME_DISK_NUMBER_START, MAX_16_BITS]
	];
	const ZIP64_EXTRACTION = {
		[MAX_16_BITS]: {
			getValue: getUint32,
			bytes: 4
		},
		[MAX_32_BITS]: {
			getValue: getBigUint64,
			bytes: 8
		}
	};

	class ZipReader {

		constructor(reader, options = {}) {
			Object.assign(this, {
				reader: initReader(reader),
				options,
				config: getConfiguration()
			});
		}

		async* getEntriesGenerator(options = {}) {
			const zipReader = this;
			let { reader } = zipReader;
			const { config } = zipReader;
			await initStream(reader);
			if (reader.size === UNDEFINED_VALUE || !reader.readUint8Array) {
				reader = new BlobReader(await new Response(reader.readable).blob());
				await initStream(reader);
			}
			if (reader.size < END_OF_CENTRAL_DIR_LENGTH) {
				throw new Error(ERR_BAD_FORMAT);
			}
			reader.chunkSize = getChunkSize(config);
			const endOfDirectoryInfo = await seekSignature(reader, END_OF_CENTRAL_DIR_SIGNATURE, reader.size, END_OF_CENTRAL_DIR_LENGTH, MAX_16_BITS * 16);
			if (!endOfDirectoryInfo) {
				const signatureArray = await readUint8Array(reader, 0, 4);
				const signatureView = getDataView(signatureArray);
				if (getUint32(signatureView) == SPLIT_ZIP_FILE_SIGNATURE) {
					throw new Error(ERR_SPLIT_ZIP_FILE);
				} else {
					throw new Error(ERR_EOCDR_NOT_FOUND);
				}
			}
			const endOfDirectoryView = getDataView(endOfDirectoryInfo);
			let directoryDataLength = getUint32(endOfDirectoryView, 12);
			let directoryDataOffset = getUint32(endOfDirectoryView, 16);
			const commentOffset = endOfDirectoryInfo.offset;
			const commentLength = getUint16(endOfDirectoryView, 20);
			const appendedDataOffset = commentOffset + END_OF_CENTRAL_DIR_LENGTH + commentLength;
			let lastDiskNumber = getUint16(endOfDirectoryView, 4);
			const expectedLastDiskNumber = reader.lastDiskNumber || 0;
			let diskNumber = getUint16(endOfDirectoryView, 6);
			let filesLength = getUint16(endOfDirectoryView, 8);
			let prependedDataLength = 0;
			let startOffset = 0;
			if (directoryDataOffset == MAX_32_BITS || directoryDataLength == MAX_32_BITS || filesLength == MAX_16_BITS || diskNumber == MAX_16_BITS) {
				const endOfDirectoryLocatorArray = await readUint8Array(reader, endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH, ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH);
				const endOfDirectoryLocatorView = getDataView(endOfDirectoryLocatorArray);
				if (getUint32(endOfDirectoryLocatorView, 0) == ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE) {
					directoryDataOffset = getBigUint64(endOfDirectoryLocatorView, 8);
					let endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH, -1);
					let endOfDirectoryView = getDataView(endOfDirectoryArray);
					const expectedDirectoryDataOffset = endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH - ZIP64_END_OF_CENTRAL_DIR_LENGTH;
					if (getUint32(endOfDirectoryView, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE && directoryDataOffset != expectedDirectoryDataOffset) {
						const originalDirectoryDataOffset = directoryDataOffset;
						directoryDataOffset = expectedDirectoryDataOffset;
						prependedDataLength = directoryDataOffset - originalDirectoryDataOffset;
						endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH, -1);
						endOfDirectoryView = getDataView(endOfDirectoryArray);
					}
					if (getUint32(endOfDirectoryView, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE) {
						throw new Error(ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND);
					}
					if (lastDiskNumber == MAX_16_BITS) {
						lastDiskNumber = getUint32(endOfDirectoryView, 16);
					}
					if (diskNumber == MAX_16_BITS) {
						diskNumber = getUint32(endOfDirectoryView, 20);
					}
					if (filesLength == MAX_16_BITS) {
						filesLength = getBigUint64(endOfDirectoryView, 32);
					}
					if (directoryDataLength == MAX_32_BITS) {
						directoryDataLength = getBigUint64(endOfDirectoryView, 40);
					}
					directoryDataOffset -= directoryDataLength;
				}
			}
			if (directoryDataOffset >= reader.size) {
				prependedDataLength = reader.size - directoryDataOffset - directoryDataLength - END_OF_CENTRAL_DIR_LENGTH;
				directoryDataOffset = reader.size - directoryDataLength - END_OF_CENTRAL_DIR_LENGTH;
			}
			if (expectedLastDiskNumber != lastDiskNumber) {
				throw new Error(ERR_SPLIT_ZIP_FILE);
			}
			if (directoryDataOffset < 0) {
				throw new Error(ERR_BAD_FORMAT);
			}
			let offset = 0;
			let directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength, diskNumber);
			let directoryView = getDataView(directoryArray);
			if (directoryDataLength) {
				const expectedDirectoryDataOffset = endOfDirectoryInfo.offset - directoryDataLength;
				if (getUint32(directoryView, offset) != CENTRAL_FILE_HEADER_SIGNATURE && directoryDataOffset != expectedDirectoryDataOffset) {
					const originalDirectoryDataOffset = directoryDataOffset;
					directoryDataOffset = expectedDirectoryDataOffset;
					prependedDataLength += directoryDataOffset - originalDirectoryDataOffset;
					directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength, diskNumber);
					directoryView = getDataView(directoryArray);
				}
			}
			const expectedDirectoryDataLength = endOfDirectoryInfo.offset - directoryDataOffset - (reader.lastDiskOffset || 0);
			if (directoryDataLength != expectedDirectoryDataLength && expectedDirectoryDataLength >= 0) {
				directoryDataLength = expectedDirectoryDataLength;
				directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength, diskNumber);
				directoryView = getDataView(directoryArray);
			}
			if (directoryDataOffset < 0 || directoryDataOffset >= reader.size) {
				throw new Error(ERR_BAD_FORMAT);
			}
			const filenameEncoding = getOptionValue(zipReader, options, "filenameEncoding");
			const commentEncoding = getOptionValue(zipReader, options, "commentEncoding");
			for (let indexFile = 0; indexFile < filesLength; indexFile++) {
				const fileEntry = new ZipEntry(reader, config, zipReader.options);
				if (getUint32(directoryView, offset) != CENTRAL_FILE_HEADER_SIGNATURE) {
					throw new Error(ERR_CENTRAL_DIRECTORY_NOT_FOUND);
				}
				readCommonHeader(fileEntry, directoryView, offset + 6);
				const languageEncodingFlag = Boolean(fileEntry.bitFlag.languageEncodingFlag);
				const filenameOffset = offset + 46;
				const extraFieldOffset = filenameOffset + fileEntry.filenameLength;
				const commentOffset = extraFieldOffset + fileEntry.extraFieldLength;
				const versionMadeBy = getUint16(directoryView, offset + 4);
				const msDosCompatible = (versionMadeBy & 0) == 0;
				const rawFilename = directoryArray.subarray(filenameOffset, extraFieldOffset);
				const commentLength = getUint16(directoryView, offset + 32);
				const endOffset = commentOffset + commentLength;
				const rawComment = directoryArray.subarray(commentOffset, endOffset);
				const filenameUTF8 = languageEncodingFlag;
				const commentUTF8 = languageEncodingFlag;
				const directory = msDosCompatible && ((getUint8(directoryView, offset + 38) & FILE_ATTR_MSDOS_DIR_MASK) == FILE_ATTR_MSDOS_DIR_MASK);
				const offsetFileEntry = getUint32(directoryView, offset + 42) + prependedDataLength;
				Object.assign(fileEntry, {
					versionMadeBy,
					msDosCompatible,
					compressedSize: 0,
					uncompressedSize: 0,
					commentLength,
					directory,
					offset: offsetFileEntry,
					diskNumberStart: getUint16(directoryView, offset + 34),
					internalFileAttribute: getUint16(directoryView, offset + 36),
					externalFileAttribute: getUint32(directoryView, offset + 38),
					rawFilename,
					filenameUTF8,
					commentUTF8,
					rawExtraField: directoryArray.subarray(extraFieldOffset, commentOffset)
				});
				const decode = getOptionValue(zipReader, options, "decodeText") || decodeText;
				const rawFilenameEncoding = filenameUTF8 ? CHARSET_UTF8 : filenameEncoding || CHARSET_CP437;
				const rawCommentEncoding = commentUTF8 ? CHARSET_UTF8 : commentEncoding || CHARSET_CP437;
				let filename = decode(rawFilename, rawFilenameEncoding);
				if (filename === UNDEFINED_VALUE) {
					filename = decodeText(rawFilename, rawFilenameEncoding);
				}
				let comment = decode(rawComment, rawCommentEncoding);
				if (comment === UNDEFINED_VALUE) {
					comment = decodeText(rawComment, rawCommentEncoding);
				}
				Object.assign(fileEntry, {
					rawComment,
					filename,
					comment,
					directory: directory || filename.endsWith(DIRECTORY_SIGNATURE)
				});
				startOffset = Math.max(offsetFileEntry, startOffset);
				await readCommonFooter(fileEntry, fileEntry, directoryView, offset + 6);
				const entry = new Entry(fileEntry);
				entry.getData = (writer, options) => fileEntry.getData(writer, entry, options);
				offset = endOffset;
				const { onprogress } = options;
				if (onprogress) {
					try {
						await onprogress(indexFile + 1, filesLength, new Entry(fileEntry));
					} catch (_error) {
						// ignored
					}
				}
				yield entry;
			}
			const extractPrependedData = getOptionValue(zipReader, options, "extractPrependedData");
			const extractAppendedData = getOptionValue(zipReader, options, "extractAppendedData");
			if (extractPrependedData) {
				zipReader.prependedData = startOffset > 0 ? await readUint8Array(reader, 0, startOffset) : new Uint8Array();
			}
			zipReader.comment = commentLength ? await readUint8Array(reader, commentOffset + END_OF_CENTRAL_DIR_LENGTH, commentLength) : new Uint8Array();
			if (extractAppendedData) {
				zipReader.appendedData = appendedDataOffset < reader.size ? await readUint8Array(reader, appendedDataOffset, reader.size - appendedDataOffset) : new Uint8Array();
			}
			return true;
		}

		async getEntries(options = {}) {
			const entries = [];
			for await (const entry of this.getEntriesGenerator(options)) {
				entries.push(entry);
			}
			return entries;
		}

		async close() {
		}
	}

	class ZipEntry {

		constructor(reader, config, options) {
			Object.assign(this, {
				reader,
				config,
				options
			});
		}

		async getData(writer, fileEntry, options = {}) {
			const zipEntry = this;
			const {
				reader,
				offset,
				diskNumberStart,
				extraFieldAES,
				compressionMethod,
				config,
				bitFlag,
				signature,
				rawLastModDate,
				uncompressedSize,
				compressedSize
			} = zipEntry;
			const localDirectory = fileEntry.localDirectory = {};
			const dataArray = await readUint8Array(reader, offset, 30, diskNumberStart);
			const dataView = getDataView(dataArray);
			let password = getOptionValue(zipEntry, options, "password");
			let rawPassword = getOptionValue(zipEntry, options, "rawPassword");
			password = password && password.length && password;
			rawPassword = rawPassword && rawPassword.length && rawPassword;
			if (extraFieldAES) {
				if (extraFieldAES.originalCompressionMethod != COMPRESSION_METHOD_AES) {
					throw new Error(ERR_UNSUPPORTED_COMPRESSION);
				}
			}
			if (compressionMethod != COMPRESSION_METHOD_STORE && compressionMethod != COMPRESSION_METHOD_DEFLATE) {
				throw new Error(ERR_UNSUPPORTED_COMPRESSION);
			}
			if (getUint32(dataView, 0) != LOCAL_FILE_HEADER_SIGNATURE) {
				throw new Error(ERR_LOCAL_FILE_HEADER_NOT_FOUND);
			}
			readCommonHeader(localDirectory, dataView, 4);
			localDirectory.rawExtraField = localDirectory.extraFieldLength ?
				await readUint8Array(reader, offset + 30 + localDirectory.filenameLength, localDirectory.extraFieldLength, diskNumberStart) :
				new Uint8Array();
			await readCommonFooter(zipEntry, localDirectory, dataView, 4, true);
			Object.assign(fileEntry, {
				lastAccessDate: localDirectory.lastAccessDate,
				creationDate: localDirectory.creationDate
			});
			const encrypted = zipEntry.encrypted && localDirectory.encrypted;
			const zipCrypto = encrypted && !extraFieldAES;
			if (encrypted) {
				if (!zipCrypto && extraFieldAES.strength === UNDEFINED_VALUE) {
					throw new Error(ERR_UNSUPPORTED_ENCRYPTION);
				} else if (!password && !rawPassword) {
					throw new Error(ERR_ENCRYPTED);
				}
			}
			const dataOffset = offset + 30 + localDirectory.filenameLength + localDirectory.extraFieldLength;
			const size = compressedSize;
			const readable = reader.readable;
			Object.assign(readable, {
				diskNumberStart,
				offset: dataOffset,
				size
			});
			const signal = getOptionValue(zipEntry, options, "signal");
			const checkPasswordOnly = getOptionValue(zipEntry, options, "checkPasswordOnly");
			if (checkPasswordOnly) {
				writer = new WritableStream();
			}
			writer = initWriter(writer);
			await initStream(writer, uncompressedSize);
			const { writable } = writer;
			const { onstart, onprogress, onend } = options;
			const workerOptions = {
				options: {
					codecType: CODEC_INFLATE,
					password,
					rawPassword,
					zipCrypto,
					encryptionStrength: extraFieldAES && extraFieldAES.strength,
					signed: getOptionValue(zipEntry, options, "checkSignature"),
					passwordVerification: zipCrypto && (bitFlag.dataDescriptor ? ((rawLastModDate >>> 8) & 0xFF) : ((signature >>> 24) & 0xFF)),
					signature,
					compressed: compressionMethod != 0,
					encrypted,
					useWebWorkers: getOptionValue(zipEntry, options, "useWebWorkers"),
					useCompressionStream: getOptionValue(zipEntry, options, "useCompressionStream"),
					transferStreams: getOptionValue(zipEntry, options, "transferStreams"),
					checkPasswordOnly
				},
				config,
				streamOptions: { signal, size, onstart, onprogress, onend }
			};
			let outputSize = 0;
			try {
				({ outputSize } = (await runWorker({ readable, writable }, workerOptions)));
			} catch (error) {
				if (!checkPasswordOnly || error.message != ERR_ABORT_CHECK_PASSWORD) {
					throw error;
				}
			} finally {
				const preventClose = getOptionValue(zipEntry, options, "preventClose");
				writable.size += outputSize;
				if (!preventClose && !writable.locked) {
					await writable.getWriter().close();
				}
			}
			return checkPasswordOnly ? UNDEFINED_VALUE : writer.getData ? writer.getData() : writable;
		}
	}

	function readCommonHeader(directory, dataView, offset) {
		const rawBitFlag = directory.rawBitFlag = getUint16(dataView, offset + 2);
		const encrypted = (rawBitFlag & BITFLAG_ENCRYPTED) == BITFLAG_ENCRYPTED;
		const rawLastModDate = getUint32(dataView, offset + 6);
		Object.assign(directory, {
			encrypted,
			version: getUint16(dataView, offset),
			bitFlag: {
				level: (rawBitFlag & BITFLAG_LEVEL) >> 1,
				dataDescriptor: (rawBitFlag & BITFLAG_DATA_DESCRIPTOR) == BITFLAG_DATA_DESCRIPTOR,
				languageEncodingFlag: (rawBitFlag & BITFLAG_LANG_ENCODING_FLAG) == BITFLAG_LANG_ENCODING_FLAG
			},
			rawLastModDate,
			lastModDate: getDate(rawLastModDate),
			filenameLength: getUint16(dataView, offset + 22),
			extraFieldLength: getUint16(dataView, offset + 24)
		});
	}

	async function readCommonFooter(fileEntry, directory, dataView, offset, localDirectory) {
		const { rawExtraField } = directory;
		const extraField = directory.extraField = new Map();
		const rawExtraFieldView = getDataView(new Uint8Array(rawExtraField));
		let offsetExtraField = 0;
		try {
			while (offsetExtraField < rawExtraField.length) {
				const type = getUint16(rawExtraFieldView, offsetExtraField);
				const size = getUint16(rawExtraFieldView, offsetExtraField + 2);
				extraField.set(type, {
					type,
					data: rawExtraField.slice(offsetExtraField + 4, offsetExtraField + 4 + size)
				});
				offsetExtraField += 4 + size;
			}
		} catch (_error) {
			// ignored
		}
		const compressionMethod = getUint16(dataView, offset + 4);
		Object.assign(directory, {
			signature: getUint32(dataView, offset + 10),
			uncompressedSize: getUint32(dataView, offset + 18),
			compressedSize: getUint32(dataView, offset + 14)
		});
		const extraFieldZip64 = extraField.get(EXTRAFIELD_TYPE_ZIP64);
		if (extraFieldZip64) {
			readExtraFieldZip64(extraFieldZip64, directory);
			directory.extraFieldZip64 = extraFieldZip64;
		}
		const extraFieldUnicodePath = extraField.get(EXTRAFIELD_TYPE_UNICODE_PATH);
		if (extraFieldUnicodePath) {
			await readExtraFieldUnicode(extraFieldUnicodePath, PROPERTY_NAME_FILENAME, PROPERTY_NAME_RAW_FILENAME, directory, fileEntry);
			directory.extraFieldUnicodePath = extraFieldUnicodePath;
		}
		const extraFieldUnicodeComment = extraField.get(EXTRAFIELD_TYPE_UNICODE_COMMENT);
		if (extraFieldUnicodeComment) {
			await readExtraFieldUnicode(extraFieldUnicodeComment, PROPERTY_NAME_COMMENT, PROPERTY_NAME_RAW_COMMENT, directory, fileEntry);
			directory.extraFieldUnicodeComment = extraFieldUnicodeComment;
		}
		const extraFieldAES = extraField.get(EXTRAFIELD_TYPE_AES);
		if (extraFieldAES) {
			readExtraFieldAES(extraFieldAES, directory, compressionMethod);
			directory.extraFieldAES = extraFieldAES;
		} else {
			directory.compressionMethod = compressionMethod;
		}
		const extraFieldNTFS = extraField.get(EXTRAFIELD_TYPE_NTFS);
		if (extraFieldNTFS) {
			readExtraFieldNTFS(extraFieldNTFS, directory);
			directory.extraFieldNTFS = extraFieldNTFS;
		}
		const extraFieldExtendedTimestamp = extraField.get(EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
		if (extraFieldExtendedTimestamp) {
			readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory, localDirectory);
			directory.extraFieldExtendedTimestamp = extraFieldExtendedTimestamp;
		}
		const extraFieldUSDZ = extraField.get(EXTRAFIELD_TYPE_USDZ);
		if (extraFieldUSDZ) {
			directory.extraFieldUSDZ = extraFieldUSDZ;
		}
	}

	function readExtraFieldZip64(extraFieldZip64, directory) {
		directory.zip64 = true;
		const extraFieldView = getDataView(extraFieldZip64.data);
		const missingProperties = ZIP64_PROPERTIES.filter(([propertyName, max]) => directory[propertyName] == max);
		for (let indexMissingProperty = 0, offset = 0; indexMissingProperty < missingProperties.length; indexMissingProperty++) {
			const [propertyName, max] = missingProperties[indexMissingProperty];
			if (directory[propertyName] == max) {
				const extraction = ZIP64_EXTRACTION[max];
				directory[propertyName] = extraFieldZip64[propertyName] = extraction.getValue(extraFieldView, offset);
				offset += extraction.bytes;
			} else if (extraFieldZip64[propertyName]) {
				throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
			}
		}
	}

	async function readExtraFieldUnicode(extraFieldUnicode, propertyName, rawPropertyName, directory, fileEntry) {
		const extraFieldView = getDataView(extraFieldUnicode.data);
		const crc32 = new Crc32();
		crc32.append(fileEntry[rawPropertyName]);
		const dataViewSignature = getDataView(new Uint8Array(4));
		dataViewSignature.setUint32(0, crc32.get(), true);
		const signature = getUint32(extraFieldView, 1);
		Object.assign(extraFieldUnicode, {
			version: getUint8(extraFieldView, 0),
			[propertyName]: decodeText(extraFieldUnicode.data.subarray(5)),
			valid: !fileEntry.bitFlag.languageEncodingFlag && signature == getUint32(dataViewSignature, 0)
		});
		if (extraFieldUnicode.valid) {
			directory[propertyName] = extraFieldUnicode[propertyName];
			directory[propertyName + "UTF8"] = true;
		}
	}

	function readExtraFieldAES(extraFieldAES, directory, compressionMethod) {
		const extraFieldView = getDataView(extraFieldAES.data);
		const strength = getUint8(extraFieldView, 4);
		Object.assign(extraFieldAES, {
			vendorVersion: getUint8(extraFieldView, 0),
			vendorId: getUint8(extraFieldView, 2),
			strength,
			originalCompressionMethod: compressionMethod,
			compressionMethod: getUint16(extraFieldView, 5)
		});
		directory.compressionMethod = extraFieldAES.compressionMethod;
	}

	function readExtraFieldNTFS(extraFieldNTFS, directory) {
		const extraFieldView = getDataView(extraFieldNTFS.data);
		let offsetExtraField = 4;
		let tag1Data;
		try {
			while (offsetExtraField < extraFieldNTFS.data.length && !tag1Data) {
				const tagValue = getUint16(extraFieldView, offsetExtraField);
				const attributeSize = getUint16(extraFieldView, offsetExtraField + 2);
				if (tagValue == EXTRAFIELD_TYPE_NTFS_TAG1) {
					tag1Data = extraFieldNTFS.data.slice(offsetExtraField + 4, offsetExtraField + 4 + attributeSize);
				}
				offsetExtraField += 4 + attributeSize;
			}
		} catch (_error) {
			// ignored
		}
		try {
			if (tag1Data && tag1Data.length == 24) {
				const tag1View = getDataView(tag1Data);
				const rawLastModDate = tag1View.getBigUint64(0, true);
				const rawLastAccessDate = tag1View.getBigUint64(8, true);
				const rawCreationDate = tag1View.getBigUint64(16, true);
				Object.assign(extraFieldNTFS, {
					rawLastModDate,
					rawLastAccessDate,
					rawCreationDate
				});
				const lastModDate = getDateNTFS(rawLastModDate);
				const lastAccessDate = getDateNTFS(rawLastAccessDate);
				const creationDate = getDateNTFS(rawCreationDate);
				const extraFieldData = { lastModDate, lastAccessDate, creationDate };
				Object.assign(extraFieldNTFS, extraFieldData);
				Object.assign(directory, extraFieldData);
			}
		} catch (_error) {
			// ignored
		}
	}

	function readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory, localDirectory) {
		const extraFieldView = getDataView(extraFieldExtendedTimestamp.data);
		const flags = getUint8(extraFieldView, 0);
		const timeProperties = [];
		const timeRawProperties = [];
		if (localDirectory) {
			if ((flags & 0x1) == 0x1) {
				timeProperties.push(PROPERTY_NAME_LAST_MODIFICATION_DATE);
				timeRawProperties.push(PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
			}
			if ((flags & 0x2) == 0x2) {
				timeProperties.push(PROPERTY_NAME_LAST_ACCESS_DATE);
				timeRawProperties.push(PROPERTY_NAME_RAW_LAST_ACCESS_DATE);
			}
			if ((flags & 0x4) == 0x4) {
				timeProperties.push(PROPERTY_NAME_CREATION_DATE);
				timeRawProperties.push(PROPERTY_NAME_RAW_CREATION_DATE);
			}
		} else if (extraFieldExtendedTimestamp.data.length >= 5) {
			timeProperties.push(PROPERTY_NAME_LAST_MODIFICATION_DATE);
			timeRawProperties.push(PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
		}
		let offset = 1;
		timeProperties.forEach((propertyName, indexProperty) => {
			if (extraFieldExtendedTimestamp.data.length >= offset + 4) {
				const time = getUint32(extraFieldView, offset);
				directory[propertyName] = extraFieldExtendedTimestamp[propertyName] = new Date(time * 1000);
				const rawPropertyName = timeRawProperties[indexProperty];
				extraFieldExtendedTimestamp[rawPropertyName] = time;
			}
			offset += 4;
		});
	}

	async function seekSignature(reader, signature, startOffset, minimumBytes, maximumLength) {
		const signatureArray = new Uint8Array(4);
		const signatureView = getDataView(signatureArray);
		setUint32(signatureView, 0, signature);
		const maximumBytes = minimumBytes + maximumLength;
		return (await seek(minimumBytes)) || await seek(Math.min(maximumBytes, startOffset));

		async function seek(length) {
			const offset = startOffset - length;
			const bytes = await readUint8Array(reader, offset, length);
			for (let indexByte = bytes.length - minimumBytes; indexByte >= 0; indexByte--) {
				if (bytes[indexByte] == signatureArray[0] && bytes[indexByte + 1] == signatureArray[1] &&
					bytes[indexByte + 2] == signatureArray[2] && bytes[indexByte + 3] == signatureArray[3]) {
					return {
						offset: offset + indexByte,
						buffer: bytes.slice(indexByte, indexByte + minimumBytes).buffer
					};
				}
			}
		}
	}

	function getOptionValue(zipReader, options, name) {
		return options[name] === UNDEFINED_VALUE ? zipReader.options[name] : options[name];
	}

	function getDate(timeRaw) {
		const date = (timeRaw & 0xffff0000) >> 16, time = timeRaw & 0x0000ffff;
		try {
			return new Date(1980 + ((date & 0xFE00) >> 9), ((date & 0x01E0) >> 5) - 1, date & 0x001F, (time & 0xF800) >> 11, (time & 0x07E0) >> 5, (time & 0x001F) * 2, 0);
		} catch (_error) {
			// ignored
		}
	}

	function getDateNTFS(timeRaw) {
		return new Date((Number((timeRaw / BigInt(10000)) - BigInt(11644473600000))));
	}

	function getUint8(view, offset) {
		return view.getUint8(offset);
	}

	function getUint16(view, offset) {
		return view.getUint16(offset, true);
	}

	function getUint32(view, offset) {
		return view.getUint32(offset, true);
	}

	function getBigUint64(view, offset) {
		return Number(view.getBigUint64(offset, true));
	}

	function setUint32(view, offset, value) {
		view.setUint32(offset, value, true);
	}

	function getDataView(array) {
		return new DataView(array.buffer);
	}

	/*
	 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

	 Redistribution and use in source and binary forms, with or without
	 modification, are permitted provided that the following conditions are met:

	 1. Redistributions of source code must retain the above copyright notice,
	 this list of conditions and the following disclaimer.

	 2. Redistributions in binary form must reproduce the above copyright
	 notice, this list of conditions and the following disclaimer in
	 the documentation and/or other materials provided with the distribution.

	 3. The names of the authors may not be used to endorse or promote products
	 derived from this software without specific prior written permission.

	 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
	 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
	 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
	 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
	 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */


	let baseURL;
	try {
		baseURL = (_documentCurrentScript && _documentCurrentScript.src || new URL('__entry.js', document.baseURI).href);
	} catch (_error) {
		// ignored
	}
	configure({ baseURL });
	e(configure);

	/// <reference types="./index.d.ts" />


	configure({ Deflate: ZipDeflate, Inflate: ZipInflate });

	const PID_EXTRACT = /\/(\d+)_([a-z]+)\d*\.\w*$/;
	class PixivMatcher extends BaseMatcher {
	  authorID;
	  meta;
	  pidList = [];
	  pageCount = 0;
	  works = {};
	  ugoiraMetas = {};
	  pageSize = {};
	  convertor;
	  first;
	  constructor() {
	    super();
	    this.meta = new GalleryMeta(window.location.href, "UNTITLE");
	  }
	  async processData(data, contentType, url) {
	    const meta = this.ugoiraMetas[url];
	    if (!meta)
	      return [data, contentType];
	    const zipReader = new ZipReader(new Uint8ArrayReader(data));
	    const start = performance.now();
	    if (!this.convertor)
	      this.convertor = await new FFmpegConvertor().init();
	    const initConvertorEnd = performance.now();
	    const promises = await zipReader.getEntries().then(
	      (entries) => entries.map(
	        (e) => e.getData?.(new Uint8ArrayWriter()).then((data2) => ({ name: e.filename, data: data2 }))
	      )
	    );
	    const files = await Promise.all(promises).then((entries) => entries.filter((f) => f && f.data.length > 0).map((f) => f));
	    const unpackUgoira = performance.now();
	    if (files.length !== meta.body.frames.length) {
	      throw new Error("unpack ugoira file error: file count not equal to meta");
	    }
	    const blob = await this.convertor.convertTo(files, conf.convertTo, meta.body.frames);
	    const convertEnd = performance.now();
	    evLog("debug", `convert ugoira to ${conf.convertTo}
init convertor cost: ${initConvertorEnd - start}ms
unpack ugoira  cost: ${unpackUgoira - initConvertorEnd}ms
ffmpeg convert cost: ${convertEnd - unpackUgoira}ms
total cost: ${(convertEnd - start) / 1e3}s
size: ${blob.size / 1e3} KB, original size: ${data.byteLength / 1e3} KB
before contentType: ${contentType}, after contentType: ${blob.type}
`);
	    return blob.arrayBuffer().then((buffer) => [new Uint8Array(buffer), blob.type]);
	  }
	  workURL() {
	    return /pixiv.net\/(\w*\/)?(artworks|users)\/.*/;
	  }
	  galleryMeta() {
	    this.meta.title = `PIXIV_${this.authorID}_w${this.pidList.length}_p${this.pageCount}` || "UNTITLE";
	    let tags = Object.values(this.works).map((w) => w.tags).flat();
	    this.meta.tags = { "author": [this.authorID || "UNTITLE"], "all": [...new Set(tags)], "pids": this.pidList, "works": Object.values(this.works) };
	    return this.meta;
	  }
	  async fetchOriginMeta(url) {
	    const matches = url.match(PID_EXTRACT);
	    if (!matches || matches.length < 2) {
	      return { url };
	    }
	    const pid = matches[1];
	    const p = matches[2];
	    if (this.works[pid]?.illustType !== 2 || p !== "ugoira") {
	      return { url };
	    }
	    const meta = await window.fetch(`https://www.pixiv.net/ajax/illust/${pid}/ugoira_meta?lang=en`).then((resp) => resp.json());
	    this.ugoiraMetas[meta.body.src] = meta;
	    return { url: meta.body.src };
	  }
	  async fetchTagsByPids(pids) {
	    try {
	      const raw = await window.fetch(`https://www.pixiv.net/ajax/user/${this.authorID}/profile/illusts?ids[]=${pids.join("&ids[]=")}&work_category=illustManga&is_first_page=0&lang=en`).then((resp) => resp.json());
	      const data = raw;
	      if (!data.error) {
	        const works = {};
	        Object.entries(data.body.works).forEach(([k, w]) => {
	          works[k] = {
	            id: w.id,
	            title: w.title,
	            alt: w.alt,
	            illustType: w.illustType,
	            description: w.description,
	            tags: w.tags,
	            pageCount: w.pageCount
	          };
	        });
	        this.works = { ...this.works, ...works };
	      } else {
	        evLog("error", "WARN: fetch tags by pids error: ", data.message);
	      }
	    } catch (error) {
	      evLog("error", "ERROR: fetch tags by pids error: ", error);
	    }
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    const pidList = JSON.parse(source);
	    this.fetchTagsByPids(pidList);
	    const pageListData = await fetchUrls(pidList.map((p) => `https://www.pixiv.net/ajax/illust/${p}/pages?lang=en`), 5);
	    for (let i = 0; i < pidList.length; i++) {
	      const pid = pidList[i];
	      const data = JSON.parse(pageListData[i]);
	      if (data.error) {
	        throw new Error(`Fetch page list error: ${data.message}`);
	      }
	      this.pageCount += data.body.length;
	      let digits = data.body.length.toString().length;
	      let j = -1;
	      for (const p of data.body) {
	        this.pageSize[p.urls.original] = [p.width, p.height];
	        let title = p.urls.original.split("/").pop() || `${pid}_p${j.toString().padStart(digits)}.jpg`;
	        const matches = p.urls.original.match(PID_EXTRACT);
	        if (matches && matches.length > 2 && matches[2] && matches[2] === "ugoira") {
	          title = title.replace(/\.\w+$/, ".gif");
	        }
	        j++;
	        const node = new ImageNode(
	          p.urls.small,
	          p.urls.original,
	          title
	        );
	        list.push(node);
	      }
	    }
	    return list;
	  }
	  async *fetchPagesSource() {
	    let u = document.querySelector("a[data-gtm-value][href*='/users/']")?.href || document.querySelector("a.user-details-icon[href*='/users/']")?.href || window.location.href;
	    const author = /users\/(\d+)/.exec(u)?.[1];
	    if (!author) {
	      throw new Error("Cannot find author id!");
	    }
	    this.authorID = author;
	    const res = await window.fetch(`https://www.pixiv.net/ajax/user/${author}/profile/all`).then((resp) => resp.json());
	    if (res.error) {
	      throw new Error(`Fetch illust list error: ${res.message}`);
	    }
	    let pidList = [...Object.keys(res.body.illusts), ...Object.keys(res.body.manga)];
	    this.pidList = [...pidList];
	    pidList = pidList.sort((a, b) => parseInt(b) - parseInt(a));
	    this.first = window.location.href.match(/artworks\/(\d+)$/)?.[1];
	    if (this.first) {
	      const index = pidList.indexOf(this.first);
	      if (index > -1) {
	        pidList.splice(index, 1);
	      }
	      pidList.unshift(this.first);
	    }
	    while (pidList.length > 0) {
	      const pids = pidList.splice(0, 20);
	      yield JSON.stringify(pids);
	    }
	  }
	}
	async function fetchUrls(urls, concurrency) {
	  const results = new Array(urls.length);
	  let i = 0;
	  while (i < urls.length) {
	    const batch = urls.slice(i, i + concurrency);
	    const batchPromises = batch.map(
	      (url, index) => window.fetch(url).then((resp) => {
	        if (resp.ok) {
	          return resp.text();
	        }
	        throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
	      }).then((raw) => results[index + i] = raw)
	    );
	    await Promise.all(batchPromises);
	    i += concurrency;
	  }
	  return results;
	}

	class RokuHentaiMatcher extends BaseMatcher {
	  sprites = [];
	  fetchedThumbnail = [];
	  galleryId = "";
	  imgCount = 0;
	  workURL() {
	    return /rokuhentai.com\/\w+$/;
	  }
	  galleryMeta(doc) {
	    const title = doc.querySelector(".site-manga-info__title-text")?.textContent || "UNTITLE";
	    const meta = new GalleryMeta(window.location.href, title);
	    meta.originTitle = title;
	    const tagTrList = doc.querySelectorAll("div.mdc-chip .site-tag-count");
	    const tags = {};
	    tagTrList.forEach((tr) => {
	      const splits = tr.getAttribute("data-tag")?.trim().split(":");
	      if (splits === void 0 || splits.length === 0)
	        return;
	      const cat = splits[0];
	      if (tags[cat] === void 0)
	        tags[cat] = [];
	      tags[cat].push(splits[1].replaceAll('"', ""));
	    });
	    meta.tags = tags;
	    return meta;
	  }
	  async fetchOriginMeta(url, _) {
	    return { url };
	  }
	  async parseImgNodes(source) {
	    const range = source.split("-").map(Number);
	    const list = [];
	    const digits = this.imgCount.toString().length;
	    for (let i = range[0]; i < range[1]; i++) {
	      let thumbnail = `https://rokuhentai.com/_images/page-thumbnails/${this.galleryId}/${i}.jpg`;
	      if (this.sprites[i]) {
	        thumbnail = await this.fetchThumbnail(i);
	      }
	      const newNode = new ImageNode(
	        thumbnail,
	        `https://rokuhentai.com/_images/pages/${this.galleryId}/${i}.jpg`,
	        i.toString().padStart(digits, "0") + ".jpg"
	      );
	      list.push(newNode);
	    }
	    return list;
	  }
	  async *fetchPagesSource() {
	    const doc = document;
	    const imgCount = parseInt(doc.querySelector(".mdc-typography--caption")?.textContent || "");
	    if (isNaN(imgCount)) {
	      throw new Error("error: failed query image count!");
	    }
	    this.imgCount = imgCount;
	    this.galleryId = window.location.href.split("/").pop();
	    const images = Array.from(doc.querySelectorAll(".mdc-layout-grid__cell .site-page-card__media"));
	    for (const img of images) {
	      this.fetchedThumbnail.push(void 0);
	      const x = parseInt(img.getAttribute("data-offset-x") || "");
	      const y = parseInt(img.getAttribute("data-offset-y") || "");
	      const width = parseInt(img.getAttribute("data-width") || "");
	      const height = parseInt(img.getAttribute("data-height") || "");
	      if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
	        this.sprites.push(void 0);
	        continue;
	      }
	      const src = img.getAttribute("data-src");
	      this.sprites.push({ src, pos: { x, y, width, height } });
	    }
	    for (let i = 0; i < this.imgCount; i += 20) {
	      yield `${i}-${Math.min(i + 20, this.imgCount)}`;
	    }
	  }
	  async fetchThumbnail(index) {
	    if (this.fetchedThumbnail[index]) {
	      return this.fetchedThumbnail[index];
	    } else {
	      const src = this.sprites[index].src;
	      const positions = [];
	      for (let i = index; i < this.imgCount; i++) {
	        if (src === this.sprites[i]?.src) {
	          positions.push(this.sprites[i].pos);
	        } else {
	          break;
	        }
	      }
	      const urls = await splitImagesFromUrl(src, positions);
	      for (let i = index; i < index + urls.length; i++) {
	        this.fetchedThumbnail[i] = urls[i - index];
	      }
	      return this.fetchedThumbnail[index];
	    }
	  }
	}

	const STEAM_THUMB_IMG_URL_REGEX = /background-image:\surl\(.*?(h.*\/).*?\)/;
	class SteamMatcher extends BaseMatcher {
	  workURL() {
	    return /steamcommunity.com\/id\/[^/]+\/screenshots.*/;
	  }
	  async fetchOriginMeta(href) {
	    let raw = "";
	    try {
	      raw = await window.fetch(href).then((resp) => resp.text());
	      if (!raw)
	        throw new Error("[text] is empty");
	    } catch (error) {
	      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
	    }
	    const domParser = new DOMParser();
	    const doc = domParser.parseFromString(raw, "text/html");
	    let imgURL = doc.querySelector(".actualmediactn > a")?.getAttribute("href");
	    if (!imgURL) {
	      throw new Error("Cannot Query Steam original Image URL");
	    }
	    return { url: imgURL };
	  }
	  async parseImgNodes(source) {
	    const list = [];
	    const doc = await window.fetch(source).then((resp) => resp.text()).then((raw) => new DOMParser().parseFromString(raw, "text/html"));
	    if (!doc) {
	      throw new Error("warn: steam matcher failed to get document from source page!");
	    }
	    const nodes = doc.querySelectorAll(".profile_media_item");
	    if (!nodes || nodes.length == 0) {
	      throw new Error("warn: failed query image nodes!");
	    }
	    for (const node of Array.from(nodes)) {
	      const src = STEAM_THUMB_IMG_URL_REGEX.exec(node.innerHTML)?.[1];
	      if (!src) {
	        throw new Error(`Cannot Match Steam Image URL, Content: ${node.innerHTML}`);
	      }
	      const newNode = new ImageNode(
	        src,
	        node.getAttribute("href"),
	        node.getAttribute("data-publishedfileid") + ".jpg"
	      );
	      list.push(newNode);
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
	      doc.querySelectorAll(".pagingPageLink").forEach((ele) => totalPages = Number(ele.textContent));
	    }
	    if (totalPages > 0) {
	      for (let p = 1; p <= totalPages; p++) {
	        url.searchParams.set("p", p.toString());
	        yield url.href;
	      }
	    } else {
	      yield url.href;
	    }
	  }
	  parseGalleryMeta() {
	    const url = new URL(window.location.href);
	    let appid = url.searchParams.get("appid");
	    return new GalleryMeta(window.location.href, "steam-" + appid || "all");
	  }
	}

	const matchers = [
	  new EHMatcher(),
	  new NHMatcher(),
	  new HitomiMather(),
	  new PixivMatcher(),
	  new SteamMatcher(),
	  new RokuHentaiMatcher(),
	  new Comic18Matcher(),
	  new DanbooruDonmaiMatcher(),
	  new Rule34Matcher(),
	  new YandereMatcher(),
	  new GelBooruMatcher(),
	  new IMHentaiMatcher()
	];
	function adaptMatcher(url) {
	  const workURLs = matchers.flatMap((m) => m.workURLs()).map((r) => r.source);
	  const newExcludeURLs = conf.excludeURLs.filter((source) => {
	    return workURLs.indexOf(source) > -1;
	  });
	  if (newExcludeURLs.length !== conf.excludeURLs.length) {
	    conf.excludeURLs = newExcludeURLs;
	    saveConf(conf);
	  }
	  if (conf.excludeURLs.length < matchers.length) {
	    for (const regex of conf.excludeURLs) {
	      if (new RegExp(regex).test(url)) {
	        return null;
	      }
	    }
	  }
	  return matchers.find((m) => m.workURLs().find((r) => r.test(url))) || null;
	}

	function parseKey(event) {
	  const keys = [];
	  if (event.ctrlKey)
	    keys.push("Ctrl");
	  if (event.shiftKey)
	    keys.push("Shift");
	  if (event.altKey)
	    keys.push("Alt");
	  let key = event.key;
	  if (key === " ")
	    key = "Space";
	  keys.push(key);
	  return keys.join("+");
	}

	function queryCSSRules(root, selector) {
	  return Array.from(root.sheet?.cssRules || []).find((rule) => rule.selectorText === selector);
	}

	function createExcludeURLPanel(root) {
	  const workURLs = matchers.flatMap((m) => m.workURLs()).map((r) => r.source);
	  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>Exclude URL|Site</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
    <div class="ehvp-custom-panel-content">
        <ul class="ehvp-custom-panel-list">
          ${workURLs.map((r, index) => `
             <li data-index="${index}" class="ehvp-custom-panel-list-item ${conf.excludeURLs.indexOf(r) !== -1 ? "ehvp-custom-panel-list-item-disable" : ""}">
               <span>${r}</span>
             </li>
          `).join("")}
        </ul>
    </div>
</div>
`;
	  const fullPanel = document.createElement("div");
	  fullPanel.classList.add("ehvp-full-panel");
	  fullPanel.innerHTML = HTML_STR;
	  fullPanel.addEventListener("click", (event) => {
	    if (event.target.classList.contains("ehvp-full-panel")) {
	      fullPanel.remove();
	    }
	  });
	  root.appendChild(fullPanel);
	  fullPanel.querySelector(".ehvp-custom-panel-close").addEventListener("click", () => fullPanel.remove());
	  const list = Array.from(fullPanel.querySelectorAll(".ehvp-custom-panel-list-item"));
	  list.forEach((li) => {
	    const index = parseInt(li.getAttribute("data-index"));
	    li.addEventListener("click", () => {
	      const i = conf.excludeURLs.indexOf(workURLs[index]);
	      if (i === -1) {
	        li.classList.add("ehvp-custom-panel-list-item-disable");
	        conf.excludeURLs.push(workURLs[index]);
	      } else {
	        li.classList.remove("ehvp-custom-panel-list-item-disable");
	        conf.excludeURLs.splice(i, 1);
	      }
	      saveConf(conf);
	    });
	  });
	}

	function createKeyboardCustomPanel(keyboardEvents, root) {
	  function addKeyboardDescElement(btn, category, id, key) {
	    const str = `<span data-id="${id}" data-key="${key}" class="ehvp-custom-panel-item-value"><span >${key}</span><button>x</button></span>`;
	    const tamplate = document.createElement("div");
	    tamplate.innerHTML = str;
	    const element = tamplate.firstElementChild;
	    btn.before(element);
	    element.querySelector("button").addEventListener("click", (event) => {
	      const keys = conf.keyboards[category][id];
	      if (keys && keys.length > 0) {
	        const index = keys.indexOf(key);
	        if (index !== -1)
	          keys.splice(index, 1);
	        if (keys.length === 0) {
	          delete conf.keyboards[category][id];
	        }
	        saveConf(conf);
	      }
	      event.target.parentElement.remove();
	      const values = Array.from(btn.parentElement.querySelectorAll(".ehvp-custom-panel-item-value"));
	      if (values.length === 0) {
	        const desc = keyboardEvents[category][id];
	        desc.defaultKeys.forEach((key2) => addKeyboardDescElement(btn, category, id, key2));
	      }
	    });
	    tamplate.remove();
	  }
	  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>Custom Keyboard</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inMain).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboardCustom.inMain[id].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inMain" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inFullViewGrid).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboardCustom.inFullViewGrid[id].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inFullViewGrid" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inBigImageMode).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboardCustom.inBigImageMode[id].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inBigImageMode" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
</div>
`;
	  const fullPanel = document.createElement("div");
	  fullPanel.classList.add("ehvp-full-panel");
	  fullPanel.innerHTML = HTML_STR;
	  fullPanel.addEventListener("click", (event) => {
	    if (event.target.classList.contains("ehvp-full-panel")) {
	      fullPanel.remove();
	    }
	  });
	  root.appendChild(fullPanel);
	  fullPanel.querySelector(".ehvp-custom-panel-close").addEventListener("click", () => fullPanel.remove());
	  const buttons = Array.from(fullPanel.querySelectorAll(".ehvp-custom-panel-item-add-btn"));
	  buttons.forEach((btn) => {
	    const category = btn.getAttribute("data-cate");
	    const id = btn.getAttribute("data-id");
	    let keys = conf.keyboards[category][id];
	    if (keys === void 0 || keys.length === 0) {
	      keys = keyboardEvents[category][id].defaultKeys;
	    }
	    keys.forEach((key) => addKeyboardDescElement(btn, category, id, key));
	    const addKeyBoardDesc = (event) => {
	      event.preventDefault();
	      if (event.key === "Alt" || event.key === "Shift" || event.key === "Control")
	        return;
	      const key = parseKey(event);
	      if (conf.keyboards[category][id] !== void 0) {
	        conf.keyboards[category][id].push(key);
	      } else {
	        conf.keyboards[category][id] = keys.concat(key);
	      }
	      saveConf(conf);
	      addKeyboardDescElement(btn, category, id, key);
	      btn.textContent = "+";
	    };
	    btn.addEventListener("click", () => {
	      btn.textContent = "Press Key";
	      btn.addEventListener("keydown", addKeyBoardDesc);
	    });
	    btn.addEventListener("mouseleave", () => {
	      btn.textContent = "+";
	      btn.removeEventListener("keydown", addKeyBoardDesc);
	    });
	  });
	}

	function toggleAnimationStyle(disable) {
	  removeAnimationStyleSheel();
	  if (disable)
	    return;
	  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
	  const style = document.createElement("style");
	  style.id = "ehvp-style-animation";
	  const css = `
.ehvp-root {
  transition: height 0.3s linear;
}
.ehvp-root-collapse {
  transition: height 0.3s linear;
}
.big-img-frame {
  transition: width 0.3s cubic-bezier(0.06, 0.9, 0.33, 1.1);
}
.p-helper {
  transition: min-width 0.4s linear;
}
.p-helper .p-panel {
  transition: width 0.4s ease 0s, height 0.4s ease 0s;
}
.p-collapse {
  transition: height 0.4s;
}
.p-helper .b-main {
  transition: flex-grow 0.6s ease, max-width 0.4s ease;
}
.p-helper-extend .b-main {
  transition: flex-grow 0.6s ease, max-width 0.4s ease;
}
.big-img-frame-collapse {
  transition: width 0.2s cubic-bezier(1, -0.36, 1, 1);
}
.p-minify:not(:hover),
.p-minify:not(:hover) .lightgreen {
  transition: color 0.5s ease-in-out, background-color 0.3s ease-in-out;
}
@media (min-width: ${isMobile ? "1440px" : "720px"}) {
  .p-helper.p-helper-extend {
    transition: min-width 0.4s ease, color 0.5s ease-in-out, background-color 0.3s ease-in-out;
  }
}
@media (max-width: ${isMobile ? "1440px" : "720px"}) {
  .p-helper.p-helper-extend {
    transition: min-width 0.4s ease;
  }
}
`;
	  style.textContent = css;
	  document.head.appendChild(style);
	}
	function removeAnimationStyleSheel() {
	  const style = document.getElementById("ehvp-style-animation");
	  if (style) {
	    document.head.removeChild(style);
	  }
	}
	function loadStyleSheel() {
	  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
	  const style = document.createElement("style");
	  style.id = "ehvp-style";
	  const css = `
.ehvp-root {
  width: 100vw;
  height: 100vh;
  background-color: rgb(0, 0, 0);
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 2000;
  box-sizing: border-box;
  overflow: clip;
}
.ehvp-root-collapse {
  height: 0;
}
.full-view-grid {
  width: 100vw;
  height: 100vh;
  display: grid;
  align-content: start;
  grid-gap: 0.7rem;
  grid-template-columns: repeat(${conf.colCount}, 1fr);
  overflow: hidden scroll;
  padding: 0.3rem;
  box-sizing: border-box;
}
.ehvp-root * {
  font-family: initial;
}
.ehvp-root a {
  color: unset;
}
.ehvp-root input, .ehvp-root select {
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
.ehvp-root input:enabled:hover, .ehvp-root select:enabled:hover, .ehvp-root input:enabled:focus, .ehvp-root select:enabled:focus {
  background-color: #34355b !important;
}
.ehvp-root select option {
  background-color: #34355b !important;
  color: #f1f1f1;
  font-size: 1rem;
}
.p-label {
  cursor: pointer;
}
.full-view-grid .img-node {
  position: relative;
}
.img-node canvas, .img-node img {
  position: relative;
  width: 100%;
  height: auto;
  border: 3px solid #fff;
  box-sizing: border-box;
}
.img-node:hover .ehvp-chapter-description {
  color: #ffe7f5;
}
.img-node > a {
  display: block;
  line-height: 0;
  position: relative;
}
.ehvp-chapter-description {
  display: block;
  position: absolute;
  bottom: 0;
  background-color: #708090e3;
  color: #ffe785;
  width: 100%;
  font-weight: 600;
  min-height: 3rem;
  font-size: 1.2rem;
  padding: 0.5rem;
  box-sizing: border-box;
  line-height: 1.3rem;
}
.img-fetched img, .img-fetched canvas {
  border: 3px solid #90ffae !important;
}
.img-fetch-failed img, .img-fetch-failed canvas {
  border: 3px solid red !important;
}
.img-fetching img, .img-fetching canvas {
  border: 3px solid #00000000 !important;
}
.img-fetching a::after {
	content: '';
	position: absolute;
	z-index: -1;
  top: 0%;
  left: 0%;
	width: 30%;
	height: 30%;
	background-color: #ff0000;
	animation: img-loading 1s linear infinite;
}
@keyframes img-loading {
	25% {
    background-color: #ff00ff;
    top: 0%;
    left: 70%;
	}
	50% {
    background-color: #00ffff;
    top: 70%;
    left: 70%;
	}
	75% {
    background-color: #ffff00;
    top: 70%;
    left: 0%;
	}
}
.big-img-frame::-webkit-scrollbar {
  display: none;
}
.big-img-frame {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  right: 0;
  overflow: auto;
  scrollbar-width: none;
  z-index: 2001;
  background-color: #000000d6;
}
.big-img-frame > img, .big-img-frame > video {
  object-fit: contain;
  display: block;
}
.bifm-flex {
  display: flex;
  justify-content: flex-start;
  flex-direction: ${conf.reversePages ? "row-reverse" : "row"};
}
.bifm-img { }
.p-helper {
  position: fixed;
  display: flex !important;
  justify-content: space-between;
  background-color: #4a4a4ae6;
  z-index: 2011 !important;
  box-sizing: border-box;
  font-weight: bold;
  color: #fff;
  min-width: 0px;
}
.p-helper .p-panel {
  z-index: 2012 !important;
  background-color: rgba(38, 20, 25, 0.8);
  box-sizing: border-box;
  position: absolute;
  color: rgb(200, 222, 200);
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.2);
  overflow: auto scroll;
  padding: 3px;
  scrollbar-width: none;
}
.p-panel::-webkit-scrollbar {
  display: none;
}
@media (min-width: ${isMobile ? "1440px" : "720px"}) {
  .p-helper.p-helper-extend {
    min-width: 24rem;
    font-size: 1rem;
    line-height: 1.2rem;
  }
  .p-helper {
    top: ${conf.pageHelperAbTop};
    left: ${conf.pageHelperAbLeft};
    bottom: ${conf.pageHelperAbBottom};
    right: ${conf.pageHelperAbRight};
    font-size: 1rem;
    line-height: 1.2rem;
  }
  .p-helper .p-panel {
    width: 24rem;
    height: 32rem;
    ${conf.pageHelperAbBottom === "unset" ? "top: 100%" : "bottom: 100%"}
  }
  .p-helper .p-btn {
    height: 1.5rem;
    width: 1.5rem;
    border: 1px solid #000000;
    border-radius: 4px;
    line-height: initial;
  }
  .p-helper-extend .b-main {
    max-width: 24rem !important;
  }
  .ehvp-root input[type="checkbox"] {
    width: 1rem;
    height: unset !important;
  }
  .ehvp-root select {
    width: 7rem !important;
  }
  .ehvp-root input, .ehvp-root select {
    width: 3rem;
    height: 1.5rem;
  }
  .p-helper .p-config {
    line-height: 1.85rem;
  }
  #imgScaleResetBTN {
    width: 4rem;
  }
  .bifm-vid-ctl {
    bottom: 0.2rem;
    left: 30%;
    width: 40vw;
  }
  .b-extra {
    ${conf.pageHelperAbLeft !== "unset" ? "left" : "right"}: 100%;
  }
}
@media (max-width: ${isMobile ? "1440px" : "720px"}) {
  .p-helper.p-helper-extend {
    min-width: 100vw;
    font-size: 4.2cqw;
    line-height: 5cqw;
  }
  .p-helper {
    bottom: 0px;
    left: 0px;
    font-size: 8cqw;
    line-height: 8.1cqw;
  }
  .p-helper .p-panel {
    width: 100vw;
    height: 80vh;
    bottom: 5.7cqw;
  }
  .p-helper .p-btn {
    height: 6cqw;
    width: 6cqw;
    border: 0.4cqw solid #000000;
    border-radius: 1cqw;
  }
  .p-helper-extend .b-main {
    max-width: 100vw !important;
  }
  .ehvp-root input[type="checkbox"] {
    width: 4cqw;
    height: unset !important;
  }
  .ehvp-root select {
    width: 25cqw !important;
  }
  .ehvp-root input, .ehvp-root select {
    width: 10cqw;
    height: 6cqw;
    font-size: 3cqw;
  }
  .p-helper .p-config {
    line-height: 8.2cqw;
  }
  #imgScaleResetBTN {
    width: 14cqw;
  }
  .bifm-vid-ctl {
    bottom: 5.2cqw;
    left: 0;
    width: 100vw;
  }
  .b-extra {
    left: 0;
    bottom: 101%;
  }
}
.p-helper:hover {
  background-color: #3a3a3ae6;
}
.p-helper .clickable {
  text-decoration-line: underline;
  z-index: 2111;
  user-select: none;
  text-align: center;
  white-space: nowrap;
}
.clickable:hover {
  color: #90ea90 !important;
}
.p-helper .p-img-scale {
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
  padding: 0px !important;
}
.p-helper .b-main {
  max-width: 0px;
  overflow: hidden !important;
  display: flex;
  justify-content: space-between;
  white-space: nowrap !important;
}
.p-helper-extend .b-main {
  flex-grow: 1;
}
.p-helper .p-config {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  align-content: start;
}
.p-helper .p-config label {
  display: flex;
  justify-content: space-between;
  padding-right: 10px;
  margin-bottom: unset;
}
.p-helper .p-config input {
  cursor: ns-resize;
}
.p-helper .p-downloader {
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
.p-helper .p-btn {
  color: rgb(255, 255, 255);
  cursor: pointer;
  font-weight: 900;
  background: rgb(81, 81, 81);
  vertical-align: middle;
}
.p-helper-fetching {
  border: none !important;
  box-sizing: border-box;
}
.p-helper-fetching::after {
	content: '';
	position: absolute;
	z-index: -1;
  top: 0%;
  left: 0%;
	width: 2%;
	height: 100%;
	background-color: #ff0000;
	animation: img-loading-page 1s linear infinite;
}
@keyframes img-loading-page {
	15% {
    background-color: #fff303;
	}
	50% {
    background-color: #ff0000;
    left: 98%;
	}
	85% {
    background-color: #fff303;
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
.big-img-frame-collapse {
  width: 0px !important;
}
.big-img-frame-collapse .img-land-left,
.big-img-frame-collapse .img-land-right,
.big-img-frame-collapse .img-land-top,
.big-img-frame-collapse .img-land-bottom {
  display: none !important;
}
.download-bar {
  background-color: #333333c0;
  height: 0.3rem;
  width: 100%;
  bottom: -0.3rem;
  position: absolute;
  border-left: 3px solid #00000000;
  border-right: 3px solid #00000000;
  box-sizing: border-box;
}
.download-bar > div {
  background-color: #f0fff0;
  height: 100%;
  border: none;
}
.img-land-left, .img-land-right {
  width: 15%;
  height: 50%;
  position: fixed;
  z-index: 2004;
  top: 25%;
}
.img-land-top, .img-land-bottom {
  width: 50%;
  height: 10%;
  left: 25%;
  position: fixed;
  z-index: 2005;
}
.img-land-left {
  left: 0;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.img-land-right {
  right: 0;
  cursor: url("https://exhentai.org/img/n.png"), auto;
}
.img-land-top {
  top: 0;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.img-land-bottom {
  bottom: 0;
  cursor: url("https://exhentai.org/img/b.png"), auto;
}
.p-tooltip {
  border-bottom: 1px dotted black;
}
.p-tooltip .p-tooltiptext {
  visibility: hidden;
  width: 100%;
  left: 0px;
  margin-top: 2rem;
  background-color: #000000bf;
  color: #fff;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  font-size: medium;
  white-space: normal;
  text-align: left;
  padding: 0.3rem 1rem;
  box-sizing: border-box;
}
.p-tooltip:hover .p-tooltiptext {
  visibility: visible;
}
.page-loading {
  width: 100vw;
  height: 100vh;
  justify-content: center;
  align-items: center;
  background-color: #333333a6;
}
.page-loading-text {
  color: #ffffff;
  font-size: 6rem;
}
@keyframes rotate {
	100% {
		transform: rotate(1turn);
	}
}
.border-ani {
	position: relative;
	z-index: 0;
	overflow: hidden;
	padding: 2rem;
}
.border-ani::before {
	content: '';
	position: absolute;
	z-index: -2;
	left: -50%;
	top: -50%;
	width: 200%;
	height: 200%;
	background-color: #fff;
	animation: rotate 4s linear infinite;
}
.border-ani::after {
	content: '';
	position: absolute;
	z-index: -1;
	left: 6px;
	top: 6px;
	width: calc(100% - 16px);
	height: calc(100% - 16px);
	background: #333;
}
.overlay-tip {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 10;
  height: 1rem;
  border-radius: 10%;
  border: 1px solid #333;
  color: white;
  background-color: #959595d1;
  line-height: 1rem;
  font-size: 1rem;
  text-align: center;
  font-weight: bold;
}
.lightgreen { color: #90ea90; }
.p-minify:not(:hover),
.p-minify:not(:hover) .lightgreen {
  color: #00000000 !important;
  background-color: #00000000 !important;
}
.p-minify:not(:hover) .b-main .b-m-page {
  order: ${conf.pageHelperAbLeft !== "unset" ? -2 : 1};
}
.p-minify:not(:hover) #p-curr-page,
.p-minify:not(:hover) #p-total,
.p-minify:not(:hover) #p-slash-1 {
  color: #fff !important;
  background-color: #333333aa !important;
}
.p-minify:not(:hover) #p-curr-page {
  color: #ffc005 !important;
}
.p-minify:not(:hover) #auto-page-btn {
  border: 1px solid #00000000 !important;
}
.ehvp-full-panel {
  position: fixed;
  width: 100vw;
  height: 100vh;
  background-color: #000000e8;
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  top: 0;
}
.ehvp-custom-panel {
  min-width: 50rem;
  min-height: 50vh;
  background-color: rgba(38, 20, 25, 0.8);
  border: 1px solid #000000;
  overflow: auto;
  display: flex;
  flex-direction: column;
  text-align: start;
  color: rgb(200, 222, 200);
}
.ehvp-custom-panel-title {
  font-size: 2.1rem;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  padding-left: 1rem;
}
.ehvp-custom-panel-close {
  width: 2rem;
  text-align: center;
}
.ehvp-custom-panel-close:hover {
  background-color: #c3c0e0;
}
.ehvp-custom-panel-content {
  border: 1px solid #000000;
  border-radius: 4px;
  margin: 0.5rem;
  padding: 0.5rem;
}
.ehvp-custom-panel-item {
  margin: 0.2rem 0rem;
}
.ehvp-custom-panel-item-title {
  font-size: 1.4rem;
}
.ehvp-custom-panel-item-values {
  margin-top: 0.3rem;
  text-align: end;
}
.ehvp-custom-panel-item-value {
  font-size: 1.1rem;
  line-height: 1.2rem;
  font-weight: bold;
  color: black;
  background-color: #c5c5c5;
  border: 1px solid #000000;
  box-sizing: border-box;
  margin-left: 0.3rem;
  display: inline-flex;
}
.ehvp-custom-panel-item-value span {
  padding: 0rem 0.5rem;
}
.ehvp-custom-panel-item-value button {
  background-color: #fff;
  color: black;
  border: none;
  height: 1.2rem;
}
.ehvp-custom-panel-item-value button:hover {
  background-color: #ffff00;
}
.ehvp-custom-panel-item-add-btn {
  font-size: 1.1rem;
  line-height: 1.2rem;
  font-weight: bold;
  background-color: #7fef7b;
  color: black;
  margin-left: 0.3rem;
  border: none;
}
.ehvp-custom-panel-item-add-btn:hover {
  background-color: #ffff00;
}
.ehvp-custom-panel-list > li {
  line-height: 3rem;
  margin-left: 0.5rem;
  font-size: 1.4rem;
}
.ehvp-custom-panel-list-item-disable {
  text-decoration: line-through;
  color: red;
}
html {
  font-size: unset !important;
}
.bifm-vid-ctl {
  position: fixed;
  z-index: 2010;
}
.bifm-vid-ctl > div {
  line-height: 1.2rem;
  display: flex;
  align-items: center;
}
.bifm-vid-ctl > div > * {
  margin: 0 0.1rem;
}
.bifm-vid-ctl:not(:hover) .bifm-vid-ctl-btn,
.bifm-vid-ctl:not(:hover) .bifm-vid-ctl-span,
.bifm-vid-ctl:not(:hover) #bifm-vid-ctl-volume
{
  opacity: 0;
}
.bifm-vid-ctl-btn {
  height: 1.5rem;
  width: 1.5rem;
  font-size: 1.2rem;
  padding: 0;
  margin: 0;
  border: none;
  background-color: #00000000;
  cursor: pointer;
}
#bifm-vid-ctl-volume {
  width: 7rem;
  height: 0.5rem;
}
.bifm-vid-ctl-pg {
  border: 1px solid #00000000;
  background-color: #3333337e;
  -webkit-appearance: none;
}
#bifm-vid-ctl-pg {
  width: 100%;
  height: 0.2rem;
  background-color: #333333ee;
}
.bifm-vid-ctl:hover #bifm-vid-ctl-pg {
  height: 0.7rem;
}
.bifm-vid-ctl-pg-inner {
  background-color: #ffffffa0;
  height: 100%;
}
.bifm-vid-ctl:hover #bifm-vid-ctl-pg .bifm-vid-ctl-pg-inner {
  background-color: #fff;
}
.bifm-vid-ctl-span {
  color: white;
  font-weight: bold;
}
.p-helper-extend #ehvp-gate-book {
  display: none !important;
}
.b-extra {
  position: absolute;
  background-color: #4a4a4ae6;
  height: 100%;
  display: none;
}
.b-extra .clickable {
  margin: 0rem 0.1rem;
}
.b-extra:hover {
  background-color: #3a3a3ae6;
}
.p-helper-extend:not(.p-minify) .b-extra {
  display: flex;
}
.download-middle {
  width: 100%;
  height: auto;
  flex-grow: 1;
  overflow: hidden;
}
.download-middle .ehvp-tabs + div {
  width: 100%;
  height: calc(100% - 2rem);
}
.ehvp-tabs {
  height: 2rem;
  width: 100%;
  line-height: 2rem;
}
.ehvp-p-tab {
  border: 1px dotted #ff0;
  font-size: 1rem;
  padding: 0 0.4rem;
}
.download-chapters, .download-dashboard {
  width: 100%;
  height: 100%;
}
.download-chapters {
  overflow: hidden auto;
}
.download-chapters label {
  white-space: nowrap;
}
.download-chapters label span {
  margin-left: 0.5rem;
}
.ehvp-p-tab-selected {
  color: rgb(120, 240, 80) !important;
}
`;
	  style.textContent = css;
	  document.head.appendChild(style);
	  return style;
	}

	class KeyboardDesc {
	  defaultKeys;
	  cb;
	  noPreventDefault = false;
	  constructor(defaultKeys, cb, noPreventDefault) {
	    this.defaultKeys = defaultKeys;
	    this.cb = cb;
	    this.noPreventDefault = noPreventDefault || false;
	  }
	}
	function initEvents(HTML, BIFM, FVGM, IFQ, PF, IL, PH) {
	  function modPageHelperPostion() {
	    const style = HTML.pageHelper.style;
	    conf.pageHelperAbTop = style.top;
	    conf.pageHelperAbLeft = style.left;
	    conf.pageHelperAbBottom = style.bottom;
	    conf.pageHelperAbRight = style.right;
	    saveConf(conf);
	  }
	  function modNumberConfigEvent(key, data) {
	    const range = {
	      colCount: [1, 12],
	      threads: [1, 10],
	      downloadThreads: [1, 10],
	      timeout: [8, 40],
	      autoPageInterval: [500, 9e4],
	      preventScrollPageTime: [0, 9e4],
	      paginationIMGCount: [1, 5]
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
	    const inputElement = q(`#${key}Input`);
	    if (inputElement) {
	      inputElement.value = conf[key].toString();
	    }
	    if (key === "colCount") {
	      const rule = queryCSSRules(HTML.styleSheel, ".full-view-grid");
	      if (rule)
	        rule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
	    }
	    if (key === "paginationIMGCount") {
	      const rule = queryCSSRules(HTML.styleSheel, ".bifm-img");
	      if (rule)
	        rule.style.minWidth = conf[key] > 1 ? "" : "100vw";
	    }
	    saveConf(conf);
	  }
	  function modBooleanConfigEvent(key) {
	    const inputElement = q(`#${key}Checkbox`);
	    conf[key] = inputElement?.checked || false;
	    saveConf(conf);
	    if (key === "autoLoad") {
	      IL.autoLoad = conf.autoLoad;
	      IL.abort(0, conf.restartIdleLoader / 3);
	    }
	    if (key === "reversePages") {
	      const rule = queryCSSRules(HTML.styleSheel, ".bifm-flex");
	      if (rule) {
	        rule.style.flexDirection = conf.reversePages ? "row-reverse" : "row";
	      }
	    }
	    if (key === "disableCssAnimation")
	      toggleAnimationStyle(conf.disableCssAnimation);
	  }
	  function modSelectConfigEvent(key) {
	    const inputElement = q(`#${key}Select`);
	    const value = inputElement?.value;
	    if (value) {
	      conf[key] = value;
	      saveConf(conf);
	    }
	    if (key === "readMode") {
	      BIFM.resetScaleBigImages(true);
	      if (conf.readMode === "pagination") {
	        BIFM.frame.classList.add("bifm-flex");
	        if (BIFM.visible) {
	          const queue = BIFM.getChapter(BIFM.chapterIndex).queue;
	          const index = parseInt(BIFM.elements.curr[0]?.getAttribute("d-index") || "0");
	          BIFM.initElements(queue[index]);
	        }
	      } else {
	        BIFM.frame.classList.remove("bifm-flex");
	      }
	    }
	    if (key === "minifyPageHelper") {
	      switch (conf.minifyPageHelper) {
	        case "inBigMode":
	          PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
	          break;
	        case "always":
	          PH.minify(true, "fullViewGrid");
	          break;
	        case "never":
	          PH.minify(false, "fullViewGrid");
	          break;
	      }
	    }
	  }
	  const cancelIDContext = {};
	  function collapsePanelEvent(target, id) {
	    if (id) {
	      abortMouseleavePanelEvent(id);
	    }
	    const timeoutId = window.setTimeout(() => target.classList.add("p-collapse"), 100);
	    if (id) {
	      cancelIDContext[id] = timeoutId;
	    }
	  }
	  function abortMouseleavePanelEvent(id) {
	    (id ? [id] : [...Object.keys(cancelIDContext)]).forEach((k) => {
	      window.clearTimeout(cancelIDContext[k]);
	      delete cancelIDContext[k];
	    });
	  }
	  let restoreMinify = false;
	  function togglePanelEvent(id, collapse) {
	    let element = q(`#${id}-panel`);
	    if (!element)
	      return;
	    if (collapse === false) {
	      element.classList.remove("p-collapse");
	      return;
	    }
	    if (collapse === true) {
	      collapsePanelEvent(element, id);
	      if (BIFM.visible) {
	        BIFM.frame.focus();
	      } else {
	        HTML.fullViewGrid.focus();
	      }
	      return;
	    }
	    if (!element.classList.toggle("p-collapse")) {
	      ["config", "downloader"].filter((k) => k !== id).forEach((k) => togglePanelEvent(k, true));
	      if (!conf.autoCollapsePanel) {
	        PH.minify(false, "fullViewGrid");
	        restoreMinify = true;
	      }
	    } else {
	      if (restoreMinify) {
	        PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
	        restoreMinify = false;
	      }
	    }
	  }
	  let bodyOverflow = document.body.style.overflow;
	  function showFullViewGrid() {
	    PH.minify(true, "fullViewGrid");
	    HTML.root.classList.remove("ehvp-root-collapse");
	    HTML.fullViewGrid.focus();
	    document.body.style.overflow = "hidden";
	  }
	  function hiddenFullViewGridEvent(event) {
	    if (event.target === HTML.fullViewGrid || event.target.classList.contains("img-node")) {
	      main(false);
	    }
	  }
	  function hiddenFullViewGrid() {
	    BIFM.hidden();
	    PH.minify(false, "fullViewGrid");
	    HTML.root.classList.add("ehvp-root-collapse");
	    HTML.fullViewGrid.blur();
	    document.body.style.overflow = bodyOverflow;
	  }
	  function scrollEvent() {
	    if (HTML.root.classList.contains("ehvp-root-collapse"))
	      return;
	    FVGM.renderCurrView();
	    FVGM.tryExtend();
	  }
	  function scrollImage(oriented, key) {
	    if (BIFM.isReachedBoundary(oriented)) {
	      const isSpace = key === "Space" || key === "Shift+Space";
	      if (!isSpace && conf.stickyMouse !== "disable" && BIFM.tryPreventStep())
	        return false;
	      BIFM.onWheel(new WheelEvent("wheel", { deltaY: oriented === "prev" ? -1 : 1 }), !isSpace);
	      return true;
	    }
	    return false;
	  }
	  let scrolling = false;
	  function initKeyboardEvent() {
	    const inBigImageMode = {
	      "exit-big-image-mode": new KeyboardDesc(
	        ["Escape", "Enter"],
	        () => BIFM.hidden()
	      ),
	      "step-image-prev": new KeyboardDesc(
	        ["ArrowLeft"],
	        () => BIFM.stepNext(conf.reversePages ? "next" : "prev")
	      ),
	      "step-image-next": new KeyboardDesc(
	        ["ArrowRight"],
	        () => BIFM.stepNext(conf.reversePages ? "prev" : "next")
	      ),
	      "step-to-first-image": new KeyboardDesc(
	        ["Home"],
	        () => BIFM.stepNext("next", -1)
	      ),
	      "step-to-last-image": new KeyboardDesc(
	        ["End"],
	        () => BIFM.stepNext("prev", -1)
	      ),
	      "scale-image-increase": new KeyboardDesc(
	        ["="],
	        () => BIFM.scaleBigImages(1, 5)
	      ),
	      "scale-image-decrease": new KeyboardDesc(
	        ["-"],
	        () => BIFM.scaleBigImages(-1, 5)
	      ),
	      "scroll-image-up": new KeyboardDesc(
	        ["PageUp", "ArrowUp", "Shift+Space"],
	        (event) => {
	          const key = parseKey(event);
	          if (!["PageUp", "ArrowUp", "Shift+Space"].includes(key)) {
	            if (scrolling)
	              return;
	            scrolling = true;
	            BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
	            BIFM.frame.scrollBy({ left: 0, top: -(BIFM.frame.clientHeight / 2), behavior: "smooth" });
	          }
	          if (scrollImage("prev", key)) {
	            event.preventDefault();
	            scrolling = false;
	          }
	        },
	        true
	      ),
	      "scroll-image-down": new KeyboardDesc(
	        ["PageDown", "ArrowDown", "Space"],
	        (event) => {
	          const key = parseKey(event);
	          if (!["PageDown", "ArrowDown", "Space"].includes(key)) {
	            if (scrolling)
	              return;
	            scrolling = true;
	            BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
	            BIFM.frame.scrollBy({ left: 0, top: BIFM.frame.clientHeight / 2, behavior: "smooth" });
	          }
	          if (scrollImage("next", key)) {
	            event.preventDefault();
	            scrolling = false;
	          }
	        },
	        true
	      )
	    };
	    const inFullViewGrid = {
	      "open-big-image-mode": new KeyboardDesc(
	        ["Enter"],
	        () => {
	          let start = IFQ.currIndex;
	          if (numberRecord && numberRecord.length > 0) {
	            start = Number(numberRecord.join("")) - 1;
	            numberRecord = null;
	            if (isNaN(start))
	              return;
	            start = Math.max(0, Math.min(start, IFQ.length - 1));
	          }
	          IFQ[start].node.root?.querySelector("a")?.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
	        }
	      ),
	      "pause-auto-load-temporarily": new KeyboardDesc(
	        ["p"],
	        () => {
	          IL.autoLoad = !IL.autoLoad;
	          if (IL.autoLoad) {
	            IL.abort(IFQ.currIndex, conf.restartIdleLoader / 3);
	          }
	        }
	      ),
	      "exit-full-view-grid": new KeyboardDesc(
	        ["Escape"],
	        () => main(false)
	      ),
	      "columns-increase": new KeyboardDesc(
	        ["="],
	        () => modNumberConfigEvent("colCount", "add")
	      ),
	      "columns-decrease": new KeyboardDesc(
	        ["-"],
	        () => modNumberConfigEvent("colCount", "minus")
	      ),
	      "back-chapters-selection": new KeyboardDesc(
	        ["b"],
	        () => PF.backChaptersSelection()
	      )
	    };
	    const inMain = {
	      "open-full-view-grid": new KeyboardDesc(["Enter"], (_) => {
	        const activeElement = document.activeElement;
	        if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLSelectElement)
	          return;
	        main(true);
	      }, true)
	    };
	    return { inBigImageMode, inFullViewGrid, inMain };
	  }
	  const keyboardEvents = initKeyboardEvent();
	  let numberRecord = null;
	  function bigImageFrameKeyBoardEvent(event) {
	    if (HTML.bigImageFrame.classList.contains("big-img-frame-collapse"))
	      return;
	    const key = parseKey(event);
	    const triggered = Object.entries(keyboardEvents.inBigImageMode).some(([id, desc]) => {
	      const override = conf.keyboards.inBigImageMode[id];
	      if (override !== void 0 && override.length > 0 ? override.includes(key) : desc.defaultKeys.includes(key)) {
	        desc.cb(event);
	        return !desc.noPreventDefault;
	      }
	      return false;
	    });
	    if (triggered) {
	      event.preventDefault();
	    }
	  }
	  function fullViewGridKeyBoardEvent(event) {
	    if (HTML.root.classList.contains("ehvp-root-collapse"))
	      return;
	    const key = parseKey(event);
	    const triggered = Object.entries(keyboardEvents.inFullViewGrid).some(([id, desc]) => {
	      const override = conf.keyboards.inFullViewGrid[id];
	      if (override !== void 0 && override.length > 0 ? override.includes(key) : desc.defaultKeys.includes(key)) {
	        desc.cb(event);
	        return !desc.noPreventDefault;
	      }
	      return false;
	    });
	    if (triggered) {
	      event.preventDefault();
	    } else if (event.key.length === 1 && event.key >= "0" && event.key <= "9") {
	      numberRecord = numberRecord ? [...numberRecord, Number(event.key)] : [Number(event.key)];
	      event.preventDefault();
	    }
	  }
	  function keyboardEvent(event) {
	    if (!HTML.root.classList.contains("ehvp-root-collapse"))
	      return;
	    if (!HTML.bigImageFrame.classList.contains("big-img-frame-collapse"))
	      return;
	    const key = parseKey(event);
	    const triggered = Object.entries(keyboardEvents.inMain).some(([id, desc]) => {
	      const override = conf.keyboards.inMain[id];
	      if (override !== void 0 ? override.includes(key) : desc.defaultKeys.includes(key)) {
	        desc.cb(event);
	        return !desc.noPreventDefault;
	      }
	      return false;
	    });
	    if (triggered) {
	      event.preventDefault();
	    }
	  }
	  function showGuideEvent() {
	    const oldGuide = document.getElementById("ehvp-guide");
	    if (oldGuide) {
	      oldGuide.remove();
	    }
	    const guideElement = document.createElement("div");
	    guideElement.setAttribute("id", "ehvp-guide");
	    guideElement.innerHTML = `<div style="width: 50vw; min-height: 300px; border: 1px solid black; background-color: rgba(255, 255, 255, 0.8); font-weight: bold; line-height: 30px">${i18n.help.get()}</div>`;
	    guideElement.classList.add("ehvp-full-panel");
	    guideElement.setAttribute("style", `align-items: center; color: black; text-align: left;`);
	    guideElement.addEventListener("click", () => guideElement.remove());
	    if (HTML.root.classList.contains("ehvp-root-collapse")) {
	      document.body.after(guideElement);
	    } else {
	      HTML.root.appendChild(guideElement);
	    }
	  }
	  function showKeyboardCustomEvent() {
	    createKeyboardCustomPanel(keyboardEvents, HTML.root);
	  }
	  function showExcludeURLEvent() {
	    createExcludeURLPanel(HTML.root);
	  }
	  const signal = { first: true };
	  function main(expand) {
	    if (HTML.pageHelper) {
	      if (expand && !HTML.pageHelper.classList.contains("p-helper-extend")) {
	        HTML.pageHelper.classList.add("p-helper-extend");
	        showFullViewGrid();
	        if (signal.first) {
	          signal.first = false;
	          PF.init();
	        }
	      } else {
	        HTML.pageHelper.classList.remove("p-helper-extend");
	        ["config", "downloader"].forEach((id) => togglePanelEvent(id, true));
	        hiddenFullViewGrid();
	      }
	    }
	  }
	  return {
	    main,
	    modNumberConfigEvent,
	    modBooleanConfigEvent,
	    modSelectConfigEvent,
	    modPageHelperPostion,
	    togglePanelEvent,
	    showFullViewGrid,
	    hiddenFullViewGridEvent,
	    hiddenFullViewGrid,
	    scrollEvent,
	    fullViewGridKeyBoardEvent,
	    bigImageFrameKeyBoardEvent,
	    keyboardEvent,
	    showGuideEvent,
	    collapsePanelEvent,
	    abortMouseleavePanelEvent,
	    showKeyboardCustomEvent,
	    showExcludeURLEvent
	  };
	}

	class FullViewGridManager {
	  root;
	  // renderRangeRecord: [number, number] = [0, 0];
	  queue = [];
	  done = false;
	  chapterIndex = 0;
	  constructor(HTML, BIFM) {
	    this.root = HTML.fullViewGrid;
	    EBUS.subscribe("pf-on-appended", (_total, nodes, done) => {
	      this.append(nodes);
	      this.done = done || false;
	      setTimeout(() => this.renderCurrView(), 200);
	    });
	    EBUS.subscribe("pf-change-chapter", (index) => {
	      this.chapterIndex = Math.max(0, index);
	      this.root.innerHTML = "";
	      this.queue = [];
	      this.done = false;
	    });
	    EBUS.subscribe("ifq-do", (_, imf) => {
	      if (!BIFM.visible)
	        return;
	      if (imf.chapterIndex !== this.chapterIndex)
	        return;
	      if (!imf.node.root)
	        return;
	      let scrollTo = imf.node.root.offsetTop - window.screen.availHeight / 3;
	      scrollTo = scrollTo <= 0 ? 0 : scrollTo >= this.root.scrollHeight ? this.root.scrollHeight : scrollTo;
	      if (this.root.scrollTo.toString().includes("[native code]")) {
	        this.root.scrollTo({ top: scrollTo, behavior: "smooth" });
	      } else {
	        this.root.scrollTop = scrollTo;
	      }
	    });
	  }
	  append(nodes) {
	    if (nodes.length > 0) {
	      const list = nodes.map((n) => {
	        return {
	          node: n,
	          element: n.create()
	        };
	      });
	      this.queue.push(...list);
	      this.root.append(...list.map((l) => l.element));
	    }
	  }
	  tryExtend() {
	    if (this.done)
	      return;
	    const nodes = Array.from(this.root.childNodes);
	    if (nodes.length === 0)
	      return;
	    const lastImgNode = nodes[nodes.length - 1];
	    const viewButtom = this.root.scrollTop + this.root.clientHeight;
	    if (viewButtom + this.root.clientHeight * 2.5 < lastImgNode.offsetTop + lastImgNode.offsetHeight) {
	      return;
	    }
	    EBUS.emit("pf-try-extend");
	  }
	  /**
	   *  当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
	   */
	  renderCurrView() {
	    const [scrollTop, clientHeight] = [this.root.scrollTop, this.root.clientHeight];
	    const [start, end] = this.findOutsideRoundView(scrollTop, clientHeight);
	    this.queue.slice(start, end + 1 + conf.colCount).forEach((e) => e.node.render());
	  }
	  findOutsideRoundView(currTop, clientHeight) {
	    const viewButtom = currTop + clientHeight;
	    let outsideTop = 0;
	    let outsideBottom = 0;
	    for (let i = 0; i < this.queue.length; i += conf.colCount) {
	      const element = this.queue[i].element;
	      if (outsideBottom === 0) {
	        if (element.offsetTop + 2 >= currTop) {
	          outsideBottom = i + 1;
	        } else {
	          outsideTop = i;
	        }
	      } else {
	        outsideBottom = i;
	        if (element.offsetTop + element.offsetHeight > viewButtom) {
	          break;
	        }
	      }
	    }
	    return [outsideTop, Math.min(outsideBottom + conf.colCount, this.queue.length - 1)];
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
	        element.style.top = Math.max(mouseY, 5) + "px";
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
	      callback?.(element.offsetTop, element.offsetLeft);
	    }, { once: true });
	  });
	}

	function createOption(item) {
	  const i18nKey = item.i18nKey || item.key;
	  const i18nValue = i18n[i18nKey];
	  const i18nValueTooltip = i18n[`${i18nKey}Tooltip`];
	  if (!i18nValue) {
	    throw new Error(`i18n key ${i18nKey} not found`);
	  }
	  let display = true;
	  if (item.displayInSite) {
	    display = item.displayInSite.test(location.href);
	  }
	  let input = "";
	  switch (item.typ) {
	    case "boolean":
	      input = `<input id="${item.key}Checkbox" ${conf[item.key] ? "checked" : ""} type="checkbox" />`;
	      break;
	    case "number":
	      input = `<span>
                  <button id="${item.key}MinusBTN" class="p-btn" type="button">-</button>
                  <input id="${item.key}Input" value="${conf[item.key]}" disabled type="text" />
                  <button id="${item.key}AddBTN" class="p-btn" type="button">+</button></span>`;
	      break;
	    case "select":
	      if (!item.options) {
	        throw new Error(`options for ${item.key} not found`);
	      }
	      const optionsStr = item.options.map((o) => `<option value="${o.value}" ${conf[item.key] == o.value ? "selected" : ""}>${o.display}</option>`).join("");
	      input = `<select id="${item.key}Select">${optionsStr}</select>`;
	      break;
	  }
	  const [start, end] = item.gridColumnRange ? item.gridColumnRange : [1, 11];
	  return `<div style="grid-column-start: ${start}; grid-column-end: ${end}; padding-left: 5px;${display ? "" : " display: none;"}"><label class="p-label"><span><span>${i18nValue.get()}</span><span class="p-tooltip">${i18nValueTooltip ? "?" : ""}<span class="p-tooltiptext">${i18nValueTooltip?.get() || ""}</span></span><span>:</span></span>${input}</label></div>`;
	}
	function createHTML() {
	  const fullViewGrid = document.createElement("div");
	  fullViewGrid.classList.add("ehvp-root");
	  fullViewGrid.classList.add("ehvp-root-collapse");
	  document.body.after(fullViewGrid);
	  const configItemStr = ConfigItems.map(createOption).join("");
	  const HTML_STRINGS = `
<div id="page-loading" class="page-loading" style="display: none;">
    <div class="page-loading-text border-ani">Loading...</div>
</div>
<div id="ehvp-nodes-container" class="full-view-grid" tabindex="6"></div>
<div id="big-img-frame" class="big-img-frame big-img-frame-collapse${conf.readMode === "pagination" ? " bifm-flex" : ""}" tabindex="7">
   <a id="img-land-left" class="img-land-left"></a>
   <a id="img-land-right" class="img-land-right"></a>
</div>
<div id="p-helper" class="p-helper">
    <div style="position: relative">
        <div id="config-panel" class="p-panel p-config p-collapse">
            ${configItemStr}
            <div style="grid-column-start: 1; grid-column-end: 10; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.dragToMove.get()}:</span>
                    <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px; text-align: left;">
                 <a id="show-guide-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showHelp.get()}</a>
                 <a id="show-keyboard-custom-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showKeyboard.get()}</a>
                 <a id="show-exclude-url-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showExcludes.get()}</a>
                 <a class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank">${i18n.letUsStar.get()}</a>
            </div>
            <div id="img-scale-bar" class="p-img-scale" style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px;">
                <div><span>${i18n.imageScale.get()}:</span></div>
                <div class="scale-status"><span id="img-scale-status">${conf.imgScale}%</span></div>
                <div id="img-decrease-btn" class="scale-btn"><span>-</span></div>
                <div id="img-scale-progress" class="scale-progress"><div id="img-scale-progress-inner" class="scale-progress-inner" style="width: ${conf.imgScale}%"></div></div>
                <div id="img-increase-btn" class="scale-btn"><span>+</span></div>
                <div id="img-scale-reset-btn" class="scale-btn" style="width: auto;"><span>RESET</span></div>
            </div>
        </div>
        <div id="downloader-panel" class="p-panel p-downloader p-collapse">
            <div id="download-notice" class="download-notice"></div>
            <div id="download-middle" class="download-middle">
              <div class="ehvp-tabs">
                <a id="download-tab-dashboard" class="clickable ehvp-p-tab">Dashboard</a>
                <a id="download-tab-chapters" class="clickable ehvp-p-tab">Select Chapters</a>
              </div>
              <div>
                <div id="download-dashboard" class="download-dashboard" hidden>
                  <canvas id="downloader-canvas" width="0" height="0"></canvas>
                </div>
                <div id="download-chapters" class="download-chapters" hidden></div>
              </div>
            </div>
            <div class="download-btn-group">
               <a id="download-force" style="color: gray;" class="clickable">${i18n.forceDownload.get()}</a>
               <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
            </div>
        </div>
    </div>
    <div id="ehvp-gate-icon">
        <span>&lessdot;</span><span id="ehvp-gate-book">📖</span>
    </div>
    <div id="b-main" class="b-main b-collapse">
        <div id="config-panel-btn" class="clickable">${i18n.config.get()}</div>
        <div id="downloader-panel-btn" class="clickable">${i18n.download.get()}</div>
        <div class="b-m-page">
            <span class="clickable" id="p-curr-page" style="color:#ffc005;">1</span><span id="p-slash-1">/</span><span id="p-total">0</span><span id="p-slash-2">/</span><span>FIN:</span><span id="p-finished">0</span>
        </div>
        <div id="auto-page-btn" class="clickable" style="padding: 0rem 1rem; position: relative; border: 1px solid #777;">
           <span>${i18n.autoPagePlay.get()}</span>
           <div id="auto-page-progress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
        </div>
        <div id="collapse-btn" class="clickable">${i18n.collapse.get()}</div>
    </div>
    <div id="ehvp-bar-gtdot">
        <span>&gtdot;</span>
    </div>
    <div id="ehvp-p-extra" class="b-extra">
        <div id="backChaptersSelection" class="clickable" hidden="">${i18n.backChapters.get()}</div>
    </div>
</div>
`;
	  fullViewGrid.innerHTML = HTML_STRINGS;
	  const styleSheel = loadStyleSheel();
	  if (!conf.disableCssAnimation) {
	    toggleAnimationStyle(conf.disableCssAnimation);
	  }
	  return {
	    root: fullViewGrid,
	    fullViewGrid: q("#ehvp-nodes-container", fullViewGrid),
	    // root element
	    bigImageFrame: q("#big-img-frame", fullViewGrid),
	    // page helper
	    pageHelper: q("#p-helper", fullViewGrid),
	    // config button in pageHelper
	    configPanelBTN: q("#config-panel-btn", fullViewGrid),
	    // config panel mouse leave event
	    configPanel: q("#config-panel", fullViewGrid),
	    // download button in pageHelper
	    downloaderPanelBTN: q("#downloader-panel-btn", fullViewGrid),
	    // download panel mouse leave event
	    downloaderPanel: q("#downloader-panel", fullViewGrid),
	    collapseBTN: q("#collapse-btn", fullViewGrid),
	    gate: q("#ehvp-gate-icon", fullViewGrid),
	    currPageElement: q("#p-curr-page", fullViewGrid),
	    totalPageElement: q("#p-total", fullViewGrid),
	    finishedElement: q("#p-finished", fullViewGrid),
	    showGuideElement: q("#show-guide-element", fullViewGrid),
	    showKeyboardCustomElement: q("#show-keyboard-custom-element", fullViewGrid),
	    showExcludeURLElement: q("#show-exclude-url-element", fullViewGrid),
	    imgLandLeft: q("#img-land-left", fullViewGrid),
	    imgLandRight: q("#img-land-right", fullViewGrid),
	    imgScaleBar: q("#img-scale-bar", fullViewGrid),
	    autoPageBTN: q("#auto-page-btn", fullViewGrid),
	    pageLoading: q("#page-loading", fullViewGrid),
	    downloaderCanvas: q("#downloader-canvas", fullViewGrid),
	    downloadTabDashboard: q("#download-tab-dashboard", fullViewGrid),
	    downloadTabChapters: q("#download-tab-chapters", fullViewGrid),
	    downloadDashboard: q("#download-dashboard", fullViewGrid),
	    downloadChapters: q("#download-chapters", fullViewGrid),
	    downloadNotice: q("#download-notice", fullViewGrid),
	    downloadBTNForce: q("#download-force", fullViewGrid),
	    downloadBTNStart: q("#download-start", fullViewGrid),
	    styleSheel
	  };
	}
	function addEventListeners(events, HTML, BIFM, DL) {
	  HTML.configPanelBTN.addEventListener("click", () => events.togglePanelEvent("config"));
	  HTML.downloaderPanelBTN.addEventListener("click", () => {
	    events.togglePanelEvent("downloader");
	    DL.check();
	  });
	  function collapsePanel(key) {
	    const elements = { "config": HTML.configPanel, "downloader": HTML.downloaderPanel };
	    conf.autoCollapsePanel && events.collapsePanelEvent(elements[key], key);
	  }
	  HTML.configPanel.addEventListener("mouseleave", () => collapsePanel("config"));
	  HTML.configPanel.addEventListener("blur", () => collapsePanel("config"));
	  HTML.downloaderPanel.addEventListener("mouseleave", () => collapsePanel("downloader"));
	  HTML.downloaderPanel.addEventListener("blur", () => collapsePanel("downloader"));
	  HTML.pageHelper.addEventListener("mouseover", () => events.abortMouseleavePanelEvent());
	  HTML.pageHelper.addEventListener("mouseleave", () => ["config", "downloader"].forEach((k) => collapsePanel(k)));
	  ConfigItems.forEach((item) => {
	    switch (item.typ) {
	      case "number":
	        q(`#${item.key}MinusBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(item.key, "minus"));
	        q(`#${item.key}AddBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(item.key, "add"));
	        q(`#${item.key}Input`, HTML.root).addEventListener("wheel", (event) => {
	          event.preventDefault();
	          if (event.deltaY < 0) {
	            events.modNumberConfigEvent(item.key, "add");
	          } else if (event.deltaY > 0) {
	            events.modNumberConfigEvent(item.key, "minus");
	          }
	        });
	        break;
	      case "boolean":
	        q(`#${item.key}Checkbox`, HTML.root).addEventListener("click", () => events.modBooleanConfigEvent(item.key));
	        break;
	      case "select":
	        q(`#${item.key}Select`, HTML.root).addEventListener("change", () => events.modSelectConfigEvent(item.key));
	        break;
	    }
	  });
	  HTML.collapseBTN.addEventListener("click", () => events.main(false));
	  HTML.gate.addEventListener("click", () => events.main(true));
	  const debouncer = new Debouncer();
	  HTML.fullViewGrid.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 400));
	  HTML.fullViewGrid.addEventListener("click", events.hiddenFullViewGridEvent);
	  HTML.currPageElement.addEventListener("wheel", (event) => BIFM.stepNext(event.deltaY > 0 ? "next" : "prev", parseInt(event.target.textContent ?? "") - 1));
	  document.addEventListener("keydown", (event) => events.keyboardEvent(event));
	  HTML.fullViewGrid.addEventListener("keydown", (event) => {
	    events.fullViewGridKeyBoardEvent(event);
	    event.stopPropagation();
	  });
	  HTML.bigImageFrame.addEventListener("keydown", (event) => {
	    events.bigImageFrameKeyBoardEvent(event);
	    event.stopPropagation();
	  });
	  HTML.imgLandLeft.addEventListener("click", (event) => {
	    BIFM.stepNext(conf.reversePages ? "next" : "prev");
	    event.stopPropagation();
	  });
	  HTML.imgLandRight.addEventListener("click", (event) => {
	    BIFM.stepNext(conf.reversePages ? "prev" : "next");
	    event.stopPropagation();
	  });
	  HTML.showGuideElement.addEventListener("click", events.showGuideEvent);
	  HTML.showKeyboardCustomElement.addEventListener("click", events.showKeyboardCustomEvent);
	  HTML.showExcludeURLElement.addEventListener("click", events.showExcludeURLEvent);
	  dragElement(HTML.pageHelper, q("#dragHub", HTML.pageHelper), events.modPageHelperPostion);
	}

	class PageHelper {
	  html;
	  chapterIndex = 0;
	  constructor(html, getChapter) {
	    this.html = html;
	    EBUS.subscribe("pf-change-chapter", (index) => {
	      this.chapterIndex = index;
	      const [total, finished] = (() => {
	        const queue = getChapter(index)?.queue;
	        if (!queue)
	          return [0, 0];
	        const finished2 = queue.filter((imf) => imf.stage === FetchState.DONE).length;
	        return [finished2, queue.length];
	      })();
	      this.setPageState({ finished: finished.toString(), total: total.toString(), current: "1" });
	    });
	    EBUS.subscribe("bifm-on-show", () => this.minify(true, "bigImageFrame"));
	    EBUS.subscribe("bifm-on-hidden", () => this.minify(false, "bigImageFrame"));
	    EBUS.subscribe("ifq-do", (index, imf) => {
	      if (imf.chapterIndex !== this.chapterIndex)
	        return;
	      const queue = getChapter(this.chapterIndex)?.queue;
	      if (!queue)
	        return;
	      this.setPageState({ current: (index + 1).toString() });
	      if (imf.stage !== FetchState.DONE) {
	        this.setFetchState("fetching");
	      }
	    });
	    EBUS.subscribe("ifq-on-finished-report", (index, queue) => {
	      if (queue.chapterIndex !== this.chapterIndex)
	        return;
	      this.setPageState({ finished: queue.finishedIndex.size.toString() });
	      evLog("info", `No.${index + 1} Finished，Current index at No.${queue.currIndex + 1}`);
	      if (queue[queue.currIndex].stage === FetchState.DONE) {
	        this.setFetchState("fetched");
	      }
	    });
	    EBUS.subscribe("pf-on-appended", (total, _ifs, done) => {
	      this.setPageState({ total: `${total}${done ? "" : ".."}` });
	    });
	    html.currPageElement.addEventListener("click", (event) => {
	      const ele = event.target;
	      const index = parseInt(ele.textContent || "1") - 1;
	      const queue = getChapter(this.chapterIndex)?.queue;
	      if (!queue || !queue[index])
	        return;
	      EBUS.emit("imf-on-click", queue[index]);
	    });
	  }
	  setFetchState(state) {
	    if (state === "fetching") {
	      this.html.pageHelper.classList.add("p-helper-fetching");
	    } else {
	      this.html.pageHelper.classList.remove("p-helper-fetching");
	    }
	  }
	  setPageState({ total, current, finished }) {
	    if (total !== void 0) {
	      this.html.totalPageElement.textContent = total;
	    }
	    if (current !== void 0) {
	      this.html.currPageElement.textContent = current;
	    }
	    if (finished !== void 0) {
	      this.html.finishedElement.textContent = finished;
	    }
	  }
	  minify(ok, level) {
	    switch (conf.minifyPageHelper) {
	      case "inBigMode":
	        if (level === "fullViewGrid") {
	          return;
	        }
	        break;
	      case "always":
	        if (level === "bigImageFrame") {
	          return;
	        }
	        break;
	      case "never":
	        this.html.pageHelper.classList.remove("p-minify");
	        return;
	    }
	    if (ok) {
	      this.html.pageHelper.classList.add("p-minify");
	    } else {
	      this.html.pageHelper.classList.remove("p-minify");
	    }
	  }
	}

	function sleep(ms) {
	  return new Promise((resolve) => setTimeout(resolve, ms));
	}

	var hammer = {exports: {}};

	/*! Hammer.JS - v2.0.7 - 2016-04-22
	 * http://hammerjs.github.io/
	 *
	 * Copyright (c) 2016 Jorik Tangelder;
	 * Licensed under the MIT license */

	(function (module) {
		(function(window, document, exportName, undefined$1) {

		var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
		var TEST_ELEMENT = document.createElement('div');

		var TYPE_FUNCTION = 'function';

		var round = Math.round;
		var abs = Math.abs;
		var now = Date.now;

		/**
		 * set a timeout with a given scope
		 * @param {Function} fn
		 * @param {Number} timeout
		 * @param {Object} context
		 * @returns {number}
		 */
		function setTimeoutContext(fn, timeout, context) {
		    return setTimeout(bindFn(fn, context), timeout);
		}

		/**
		 * if the argument is an array, we want to execute the fn on each entry
		 * if it aint an array we don't want to do a thing.
		 * this is used by all the methods that accept a single and array argument.
		 * @param {*|Array} arg
		 * @param {String} fn
		 * @param {Object} [context]
		 * @returns {Boolean}
		 */
		function invokeArrayArg(arg, fn, context) {
		    if (Array.isArray(arg)) {
		        each(arg, context[fn], context);
		        return true;
		    }
		    return false;
		}

		/**
		 * walk objects and arrays
		 * @param {Object} obj
		 * @param {Function} iterator
		 * @param {Object} context
		 */
		function each(obj, iterator, context) {
		    var i;

		    if (!obj) {
		        return;
		    }

		    if (obj.forEach) {
		        obj.forEach(iterator, context);
		    } else if (obj.length !== undefined$1) {
		        i = 0;
		        while (i < obj.length) {
		            iterator.call(context, obj[i], i, obj);
		            i++;
		        }
		    } else {
		        for (i in obj) {
		            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
		        }
		    }
		}

		/**
		 * wrap a method with a deprecation warning and stack trace
		 * @param {Function} method
		 * @param {String} name
		 * @param {String} message
		 * @returns {Function} A new function wrapping the supplied method.
		 */
		function deprecate(method, name, message) {
		    var deprecationMessage = 'DEPRECATED METHOD: ' + name + '\n' + message + ' AT \n';
		    return function() {
		        var e = new Error('get-stack-trace');
		        var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
		            .replace(/^\s+at\s+/gm, '')
		            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

		        var log = window.console && (window.console.warn || window.console.log);
		        if (log) {
		            log.call(window.console, deprecationMessage, stack);
		        }
		        return method.apply(this, arguments);
		    };
		}

		/**
		 * extend object.
		 * means that properties in dest will be overwritten by the ones in src.
		 * @param {Object} target
		 * @param {...Object} objects_to_assign
		 * @returns {Object} target
		 */
		var assign;
		if (typeof Object.assign !== 'function') {
		    assign = function assign(target) {
		        if (target === undefined$1 || target === null) {
		            throw new TypeError('Cannot convert undefined or null to object');
		        }

		        var output = Object(target);
		        for (var index = 1; index < arguments.length; index++) {
		            var source = arguments[index];
		            if (source !== undefined$1 && source !== null) {
		                for (var nextKey in source) {
		                    if (source.hasOwnProperty(nextKey)) {
		                        output[nextKey] = source[nextKey];
		                    }
		                }
		            }
		        }
		        return output;
		    };
		} else {
		    assign = Object.assign;
		}

		/**
		 * extend object.
		 * means that properties in dest will be overwritten by the ones in src.
		 * @param {Object} dest
		 * @param {Object} src
		 * @param {Boolean} [merge=false]
		 * @returns {Object} dest
		 */
		var extend = deprecate(function extend(dest, src, merge) {
		    var keys = Object.keys(src);
		    var i = 0;
		    while (i < keys.length) {
		        if (!merge || (merge && dest[keys[i]] === undefined$1)) {
		            dest[keys[i]] = src[keys[i]];
		        }
		        i++;
		    }
		    return dest;
		}, 'extend', 'Use `assign`.');

		/**
		 * merge the values from src in the dest.
		 * means that properties that exist in dest will not be overwritten by src
		 * @param {Object} dest
		 * @param {Object} src
		 * @returns {Object} dest
		 */
		var merge = deprecate(function merge(dest, src) {
		    return extend(dest, src, true);
		}, 'merge', 'Use `assign`.');

		/**
		 * simple class inheritance
		 * @param {Function} child
		 * @param {Function} base
		 * @param {Object} [properties]
		 */
		function inherit(child, base, properties) {
		    var baseP = base.prototype,
		        childP;

		    childP = child.prototype = Object.create(baseP);
		    childP.constructor = child;
		    childP._super = baseP;

		    if (properties) {
		        assign(childP, properties);
		    }
		}

		/**
		 * simple function bind
		 * @param {Function} fn
		 * @param {Object} context
		 * @returns {Function}
		 */
		function bindFn(fn, context) {
		    return function boundFn() {
		        return fn.apply(context, arguments);
		    };
		}

		/**
		 * let a boolean value also be a function that must return a boolean
		 * this first item in args will be used as the context
		 * @param {Boolean|Function} val
		 * @param {Array} [args]
		 * @returns {Boolean}
		 */
		function boolOrFn(val, args) {
		    if (typeof val == TYPE_FUNCTION) {
		        return val.apply(args ? args[0] || undefined$1 : undefined$1, args);
		    }
		    return val;
		}

		/**
		 * use the val2 when val1 is undefined
		 * @param {*} val1
		 * @param {*} val2
		 * @returns {*}
		 */
		function ifUndefined(val1, val2) {
		    return (val1 === undefined$1) ? val2 : val1;
		}

		/**
		 * addEventListener with multiple events at once
		 * @param {EventTarget} target
		 * @param {String} types
		 * @param {Function} handler
		 */
		function addEventListeners(target, types, handler) {
		    each(splitStr(types), function(type) {
		        target.addEventListener(type, handler, false);
		    });
		}

		/**
		 * removeEventListener with multiple events at once
		 * @param {EventTarget} target
		 * @param {String} types
		 * @param {Function} handler
		 */
		function removeEventListeners(target, types, handler) {
		    each(splitStr(types), function(type) {
		        target.removeEventListener(type, handler, false);
		    });
		}

		/**
		 * find if a node is in the given parent
		 * @method hasParent
		 * @param {HTMLElement} node
		 * @param {HTMLElement} parent
		 * @return {Boolean} found
		 */
		function hasParent(node, parent) {
		    while (node) {
		        if (node == parent) {
		            return true;
		        }
		        node = node.parentNode;
		    }
		    return false;
		}

		/**
		 * small indexOf wrapper
		 * @param {String} str
		 * @param {String} find
		 * @returns {Boolean} found
		 */
		function inStr(str, find) {
		    return str.indexOf(find) > -1;
		}

		/**
		 * split string on whitespace
		 * @param {String} str
		 * @returns {Array} words
		 */
		function splitStr(str) {
		    return str.trim().split(/\s+/g);
		}

		/**
		 * find if a array contains the object using indexOf or a simple polyFill
		 * @param {Array} src
		 * @param {String} find
		 * @param {String} [findByKey]
		 * @return {Boolean|Number} false when not found, or the index
		 */
		function inArray(src, find, findByKey) {
		    if (src.indexOf && !findByKey) {
		        return src.indexOf(find);
		    } else {
		        var i = 0;
		        while (i < src.length) {
		            if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
		                return i;
		            }
		            i++;
		        }
		        return -1;
		    }
		}

		/**
		 * convert array-like objects to real arrays
		 * @param {Object} obj
		 * @returns {Array}
		 */
		function toArray(obj) {
		    return Array.prototype.slice.call(obj, 0);
		}

		/**
		 * unique array with objects based on a key (like 'id') or just by the array's value
		 * @param {Array} src [{id:1},{id:2},{id:1}]
		 * @param {String} [key]
		 * @param {Boolean} [sort=False]
		 * @returns {Array} [{id:1},{id:2}]
		 */
		function uniqueArray(src, key, sort) {
		    var results = [];
		    var values = [];
		    var i = 0;

		    while (i < src.length) {
		        var val = key ? src[i][key] : src[i];
		        if (inArray(values, val) < 0) {
		            results.push(src[i]);
		        }
		        values[i] = val;
		        i++;
		    }

		    if (sort) {
		        if (!key) {
		            results = results.sort();
		        } else {
		            results = results.sort(function sortUniqueArray(a, b) {
		                return a[key] > b[key];
		            });
		        }
		    }

		    return results;
		}

		/**
		 * get the prefixed property
		 * @param {Object} obj
		 * @param {String} property
		 * @returns {String|Undefined} prefixed
		 */
		function prefixed(obj, property) {
		    var prefix, prop;
		    var camelProp = property[0].toUpperCase() + property.slice(1);

		    var i = 0;
		    while (i < VENDOR_PREFIXES.length) {
		        prefix = VENDOR_PREFIXES[i];
		        prop = (prefix) ? prefix + camelProp : property;

		        if (prop in obj) {
		            return prop;
		        }
		        i++;
		    }
		    return undefined$1;
		}

		/**
		 * get a unique id
		 * @returns {number} uniqueId
		 */
		var _uniqueId = 1;
		function uniqueId() {
		    return _uniqueId++;
		}

		/**
		 * get the window object of an element
		 * @param {HTMLElement} element
		 * @returns {DocumentView|Window}
		 */
		function getWindowForElement(element) {
		    var doc = element.ownerDocument || element;
		    return (doc.defaultView || doc.parentWindow || window);
		}

		var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

		var SUPPORT_TOUCH = ('ontouchstart' in window);
		var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined$1;
		var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

		var INPUT_TYPE_TOUCH = 'touch';
		var INPUT_TYPE_PEN = 'pen';
		var INPUT_TYPE_MOUSE = 'mouse';
		var INPUT_TYPE_KINECT = 'kinect';

		var COMPUTE_INTERVAL = 25;

		var INPUT_START = 1;
		var INPUT_MOVE = 2;
		var INPUT_END = 4;
		var INPUT_CANCEL = 8;

		var DIRECTION_NONE = 1;
		var DIRECTION_LEFT = 2;
		var DIRECTION_RIGHT = 4;
		var DIRECTION_UP = 8;
		var DIRECTION_DOWN = 16;

		var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
		var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
		var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

		var PROPS_XY = ['x', 'y'];
		var PROPS_CLIENT_XY = ['clientX', 'clientY'];

		/**
		 * create new input type manager
		 * @param {Manager} manager
		 * @param {Function} callback
		 * @returns {Input}
		 * @constructor
		 */
		function Input(manager, callback) {
		    var self = this;
		    this.manager = manager;
		    this.callback = callback;
		    this.element = manager.element;
		    this.target = manager.options.inputTarget;

		    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
		    // so when disabled the input events are completely bypassed.
		    this.domHandler = function(ev) {
		        if (boolOrFn(manager.options.enable, [manager])) {
		            self.handler(ev);
		        }
		    };

		    this.init();

		}

		Input.prototype = {
		    /**
		     * should handle the inputEvent data and trigger the callback
		     * @virtual
		     */
		    handler: function() { },

		    /**
		     * bind the events
		     */
		    init: function() {
		        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
		        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
		        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
		    },

		    /**
		     * unbind the events
		     */
		    destroy: function() {
		        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
		        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
		        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
		    }
		};

		/**
		 * create new input type manager
		 * called by the Manager constructor
		 * @param {Hammer} manager
		 * @returns {Input}
		 */
		function createInputInstance(manager) {
		    var Type;
		    var inputClass = manager.options.inputClass;

		    if (inputClass) {
		        Type = inputClass;
		    } else if (SUPPORT_POINTER_EVENTS) {
		        Type = PointerEventInput;
		    } else if (SUPPORT_ONLY_TOUCH) {
		        Type = TouchInput;
		    } else if (!SUPPORT_TOUCH) {
		        Type = MouseInput;
		    } else {
		        Type = TouchMouseInput;
		    }
		    return new (Type)(manager, inputHandler);
		}

		/**
		 * handle input events
		 * @param {Manager} manager
		 * @param {String} eventType
		 * @param {Object} input
		 */
		function inputHandler(manager, eventType, input) {
		    var pointersLen = input.pointers.length;
		    var changedPointersLen = input.changedPointers.length;
		    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
		    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

		    input.isFirst = !!isFirst;
		    input.isFinal = !!isFinal;

		    if (isFirst) {
		        manager.session = {};
		    }

		    // source event is the normalized value of the domEvents
		    // like 'touchstart, mouseup, pointerdown'
		    input.eventType = eventType;

		    // compute scale, rotation etc
		    computeInputData(manager, input);

		    // emit secret event
		    manager.emit('hammer.input', input);

		    manager.recognize(input);
		    manager.session.prevInput = input;
		}

		/**
		 * extend the data with some usable properties like scale, rotate, velocity etc
		 * @param {Object} manager
		 * @param {Object} input
		 */
		function computeInputData(manager, input) {
		    var session = manager.session;
		    var pointers = input.pointers;
		    var pointersLength = pointers.length;

		    // store the first input to calculate the distance and direction
		    if (!session.firstInput) {
		        session.firstInput = simpleCloneInputData(input);
		    }

		    // to compute scale and rotation we need to store the multiple touches
		    if (pointersLength > 1 && !session.firstMultiple) {
		        session.firstMultiple = simpleCloneInputData(input);
		    } else if (pointersLength === 1) {
		        session.firstMultiple = false;
		    }

		    var firstInput = session.firstInput;
		    var firstMultiple = session.firstMultiple;
		    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

		    var center = input.center = getCenter(pointers);
		    input.timeStamp = now();
		    input.deltaTime = input.timeStamp - firstInput.timeStamp;

		    input.angle = getAngle(offsetCenter, center);
		    input.distance = getDistance(offsetCenter, center);

		    computeDeltaXY(session, input);
		    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

		    var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
		    input.overallVelocityX = overallVelocity.x;
		    input.overallVelocityY = overallVelocity.y;
		    input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

		    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
		    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

		    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
		        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

		    computeIntervalInputData(session, input);

		    // find the correct target
		    var target = manager.element;
		    if (hasParent(input.srcEvent.target, target)) {
		        target = input.srcEvent.target;
		    }
		    input.target = target;
		}

		function computeDeltaXY(session, input) {
		    var center = input.center;
		    var offset = session.offsetDelta || {};
		    var prevDelta = session.prevDelta || {};
		    var prevInput = session.prevInput || {};

		    if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
		        prevDelta = session.prevDelta = {
		            x: prevInput.deltaX || 0,
		            y: prevInput.deltaY || 0
		        };

		        offset = session.offsetDelta = {
		            x: center.x,
		            y: center.y
		        };
		    }

		    input.deltaX = prevDelta.x + (center.x - offset.x);
		    input.deltaY = prevDelta.y + (center.y - offset.y);
		}

		/**
		 * velocity is calculated every x ms
		 * @param {Object} session
		 * @param {Object} input
		 */
		function computeIntervalInputData(session, input) {
		    var last = session.lastInterval || input,
		        deltaTime = input.timeStamp - last.timeStamp,
		        velocity, velocityX, velocityY, direction;

		    if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined$1)) {
		        var deltaX = input.deltaX - last.deltaX;
		        var deltaY = input.deltaY - last.deltaY;

		        var v = getVelocity(deltaTime, deltaX, deltaY);
		        velocityX = v.x;
		        velocityY = v.y;
		        velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
		        direction = getDirection(deltaX, deltaY);

		        session.lastInterval = input;
		    } else {
		        // use latest velocity info if it doesn't overtake a minimum period
		        velocity = last.velocity;
		        velocityX = last.velocityX;
		        velocityY = last.velocityY;
		        direction = last.direction;
		    }

		    input.velocity = velocity;
		    input.velocityX = velocityX;
		    input.velocityY = velocityY;
		    input.direction = direction;
		}

		/**
		 * create a simple clone from the input used for storage of firstInput and firstMultiple
		 * @param {Object} input
		 * @returns {Object} clonedInputData
		 */
		function simpleCloneInputData(input) {
		    // make a simple copy of the pointers because we will get a reference if we don't
		    // we only need clientXY for the calculations
		    var pointers = [];
		    var i = 0;
		    while (i < input.pointers.length) {
		        pointers[i] = {
		            clientX: round(input.pointers[i].clientX),
		            clientY: round(input.pointers[i].clientY)
		        };
		        i++;
		    }

		    return {
		        timeStamp: now(),
		        pointers: pointers,
		        center: getCenter(pointers),
		        deltaX: input.deltaX,
		        deltaY: input.deltaY
		    };
		}

		/**
		 * get the center of all the pointers
		 * @param {Array} pointers
		 * @return {Object} center contains `x` and `y` properties
		 */
		function getCenter(pointers) {
		    var pointersLength = pointers.length;

		    // no need to loop when only one touch
		    if (pointersLength === 1) {
		        return {
		            x: round(pointers[0].clientX),
		            y: round(pointers[0].clientY)
		        };
		    }

		    var x = 0, y = 0, i = 0;
		    while (i < pointersLength) {
		        x += pointers[i].clientX;
		        y += pointers[i].clientY;
		        i++;
		    }

		    return {
		        x: round(x / pointersLength),
		        y: round(y / pointersLength)
		    };
		}

		/**
		 * calculate the velocity between two points. unit is in px per ms.
		 * @param {Number} deltaTime
		 * @param {Number} x
		 * @param {Number} y
		 * @return {Object} velocity `x` and `y`
		 */
		function getVelocity(deltaTime, x, y) {
		    return {
		        x: x / deltaTime || 0,
		        y: y / deltaTime || 0
		    };
		}

		/**
		 * get the direction between two points
		 * @param {Number} x
		 * @param {Number} y
		 * @return {Number} direction
		 */
		function getDirection(x, y) {
		    if (x === y) {
		        return DIRECTION_NONE;
		    }

		    if (abs(x) >= abs(y)) {
		        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
		    }
		    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
		}

		/**
		 * calculate the absolute distance between two points
		 * @param {Object} p1 {x, y}
		 * @param {Object} p2 {x, y}
		 * @param {Array} [props] containing x and y keys
		 * @return {Number} distance
		 */
		function getDistance(p1, p2, props) {
		    if (!props) {
		        props = PROPS_XY;
		    }
		    var x = p2[props[0]] - p1[props[0]],
		        y = p2[props[1]] - p1[props[1]];

		    return Math.sqrt((x * x) + (y * y));
		}

		/**
		 * calculate the angle between two coordinates
		 * @param {Object} p1
		 * @param {Object} p2
		 * @param {Array} [props] containing x and y keys
		 * @return {Number} angle
		 */
		function getAngle(p1, p2, props) {
		    if (!props) {
		        props = PROPS_XY;
		    }
		    var x = p2[props[0]] - p1[props[0]],
		        y = p2[props[1]] - p1[props[1]];
		    return Math.atan2(y, x) * 180 / Math.PI;
		}

		/**
		 * calculate the rotation degrees between two pointersets
		 * @param {Array} start array of pointers
		 * @param {Array} end array of pointers
		 * @return {Number} rotation
		 */
		function getRotation(start, end) {
		    return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
		}

		/**
		 * calculate the scale factor between two pointersets
		 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
		 * @param {Array} start array of pointers
		 * @param {Array} end array of pointers
		 * @return {Number} scale
		 */
		function getScale(start, end) {
		    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
		}

		var MOUSE_INPUT_MAP = {
		    mousedown: INPUT_START,
		    mousemove: INPUT_MOVE,
		    mouseup: INPUT_END
		};

		var MOUSE_ELEMENT_EVENTS = 'mousedown';
		var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

		/**
		 * Mouse events input
		 * @constructor
		 * @extends Input
		 */
		function MouseInput() {
		    this.evEl = MOUSE_ELEMENT_EVENTS;
		    this.evWin = MOUSE_WINDOW_EVENTS;

		    this.pressed = false; // mousedown state

		    Input.apply(this, arguments);
		}

		inherit(MouseInput, Input, {
		    /**
		     * handle mouse events
		     * @param {Object} ev
		     */
		    handler: function MEhandler(ev) {
		        var eventType = MOUSE_INPUT_MAP[ev.type];

		        // on start we want to have the left mouse button down
		        if (eventType & INPUT_START && ev.button === 0) {
		            this.pressed = true;
		        }

		        if (eventType & INPUT_MOVE && ev.which !== 1) {
		            eventType = INPUT_END;
		        }

		        // mouse must be down
		        if (!this.pressed) {
		            return;
		        }

		        if (eventType & INPUT_END) {
		            this.pressed = false;
		        }

		        this.callback(this.manager, eventType, {
		            pointers: [ev],
		            changedPointers: [ev],
		            pointerType: INPUT_TYPE_MOUSE,
		            srcEvent: ev
		        });
		    }
		});

		var POINTER_INPUT_MAP = {
		    pointerdown: INPUT_START,
		    pointermove: INPUT_MOVE,
		    pointerup: INPUT_END,
		    pointercancel: INPUT_CANCEL,
		    pointerout: INPUT_CANCEL
		};

		// in IE10 the pointer types is defined as an enum
		var IE10_POINTER_TYPE_ENUM = {
		    2: INPUT_TYPE_TOUCH,
		    3: INPUT_TYPE_PEN,
		    4: INPUT_TYPE_MOUSE,
		    5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
		};

		var POINTER_ELEMENT_EVENTS = 'pointerdown';
		var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

		// IE10 has prefixed support, and case-sensitive
		if (window.MSPointerEvent && !window.PointerEvent) {
		    POINTER_ELEMENT_EVENTS = 'MSPointerDown';
		    POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
		}

		/**
		 * Pointer events input
		 * @constructor
		 * @extends Input
		 */
		function PointerEventInput() {
		    this.evEl = POINTER_ELEMENT_EVENTS;
		    this.evWin = POINTER_WINDOW_EVENTS;

		    Input.apply(this, arguments);

		    this.store = (this.manager.session.pointerEvents = []);
		}

		inherit(PointerEventInput, Input, {
		    /**
		     * handle mouse events
		     * @param {Object} ev
		     */
		    handler: function PEhandler(ev) {
		        var store = this.store;
		        var removePointer = false;

		        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
		        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
		        var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

		        var isTouch = (pointerType == INPUT_TYPE_TOUCH);

		        // get index of the event in the store
		        var storeIndex = inArray(store, ev.pointerId, 'pointerId');

		        // start and mouse must be down
		        if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
		            if (storeIndex < 0) {
		                store.push(ev);
		                storeIndex = store.length - 1;
		            }
		        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
		            removePointer = true;
		        }

		        // it not found, so the pointer hasn't been down (so it's probably a hover)
		        if (storeIndex < 0) {
		            return;
		        }

		        // update the event in the store
		        store[storeIndex] = ev;

		        this.callback(this.manager, eventType, {
		            pointers: store,
		            changedPointers: [ev],
		            pointerType: pointerType,
		            srcEvent: ev
		        });

		        if (removePointer) {
		            // remove from the store
		            store.splice(storeIndex, 1);
		        }
		    }
		});

		var SINGLE_TOUCH_INPUT_MAP = {
		    touchstart: INPUT_START,
		    touchmove: INPUT_MOVE,
		    touchend: INPUT_END,
		    touchcancel: INPUT_CANCEL
		};

		var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
		var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

		/**
		 * Touch events input
		 * @constructor
		 * @extends Input
		 */
		function SingleTouchInput() {
		    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
		    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
		    this.started = false;

		    Input.apply(this, arguments);
		}

		inherit(SingleTouchInput, Input, {
		    handler: function TEhandler(ev) {
		        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

		        // should we handle the touch events?
		        if (type === INPUT_START) {
		            this.started = true;
		        }

		        if (!this.started) {
		            return;
		        }

		        var touches = normalizeSingleTouches.call(this, ev, type);

		        // when done, reset the started state
		        if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
		            this.started = false;
		        }

		        this.callback(this.manager, type, {
		            pointers: touches[0],
		            changedPointers: touches[1],
		            pointerType: INPUT_TYPE_TOUCH,
		            srcEvent: ev
		        });
		    }
		});

		/**
		 * @this {TouchInput}
		 * @param {Object} ev
		 * @param {Number} type flag
		 * @returns {undefined|Array} [all, changed]
		 */
		function normalizeSingleTouches(ev, type) {
		    var all = toArray(ev.touches);
		    var changed = toArray(ev.changedTouches);

		    if (type & (INPUT_END | INPUT_CANCEL)) {
		        all = uniqueArray(all.concat(changed), 'identifier', true);
		    }

		    return [all, changed];
		}

		var TOUCH_INPUT_MAP = {
		    touchstart: INPUT_START,
		    touchmove: INPUT_MOVE,
		    touchend: INPUT_END,
		    touchcancel: INPUT_CANCEL
		};

		var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

		/**
		 * Multi-user touch events input
		 * @constructor
		 * @extends Input
		 */
		function TouchInput() {
		    this.evTarget = TOUCH_TARGET_EVENTS;
		    this.targetIds = {};

		    Input.apply(this, arguments);
		}

		inherit(TouchInput, Input, {
		    handler: function MTEhandler(ev) {
		        var type = TOUCH_INPUT_MAP[ev.type];
		        var touches = getTouches.call(this, ev, type);
		        if (!touches) {
		            return;
		        }

		        this.callback(this.manager, type, {
		            pointers: touches[0],
		            changedPointers: touches[1],
		            pointerType: INPUT_TYPE_TOUCH,
		            srcEvent: ev
		        });
		    }
		});

		/**
		 * @this {TouchInput}
		 * @param {Object} ev
		 * @param {Number} type flag
		 * @returns {undefined|Array} [all, changed]
		 */
		function getTouches(ev, type) {
		    var allTouches = toArray(ev.touches);
		    var targetIds = this.targetIds;

		    // when there is only one touch, the process can be simplified
		    if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
		        targetIds[allTouches[0].identifier] = true;
		        return [allTouches, allTouches];
		    }

		    var i,
		        targetTouches,
		        changedTouches = toArray(ev.changedTouches),
		        changedTargetTouches = [],
		        target = this.target;

		    // get target touches from touches
		    targetTouches = allTouches.filter(function(touch) {
		        return hasParent(touch.target, target);
		    });

		    // collect touches
		    if (type === INPUT_START) {
		        i = 0;
		        while (i < targetTouches.length) {
		            targetIds[targetTouches[i].identifier] = true;
		            i++;
		        }
		    }

		    // filter changed touches to only contain touches that exist in the collected target ids
		    i = 0;
		    while (i < changedTouches.length) {
		        if (targetIds[changedTouches[i].identifier]) {
		            changedTargetTouches.push(changedTouches[i]);
		        }

		        // cleanup removed touches
		        if (type & (INPUT_END | INPUT_CANCEL)) {
		            delete targetIds[changedTouches[i].identifier];
		        }
		        i++;
		    }

		    if (!changedTargetTouches.length) {
		        return;
		    }

		    return [
		        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
		        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
		        changedTargetTouches
		    ];
		}

		/**
		 * Combined touch and mouse input
		 *
		 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
		 * This because touch devices also emit mouse events while doing a touch.
		 *
		 * @constructor
		 * @extends Input
		 */

		var DEDUP_TIMEOUT = 2500;
		var DEDUP_DISTANCE = 25;

		function TouchMouseInput() {
		    Input.apply(this, arguments);

		    var handler = bindFn(this.handler, this);
		    this.touch = new TouchInput(this.manager, handler);
		    this.mouse = new MouseInput(this.manager, handler);

		    this.primaryTouch = null;
		    this.lastTouches = [];
		}

		inherit(TouchMouseInput, Input, {
		    /**
		     * handle mouse and touch events
		     * @param {Hammer} manager
		     * @param {String} inputEvent
		     * @param {Object} inputData
		     */
		    handler: function TMEhandler(manager, inputEvent, inputData) {
		        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
		            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

		        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
		            return;
		        }

		        // when we're in a touch event, record touches to  de-dupe synthetic mouse event
		        if (isTouch) {
		            recordTouches.call(this, inputEvent, inputData);
		        } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
		            return;
		        }

		        this.callback(manager, inputEvent, inputData);
		    },

		    /**
		     * remove the event listeners
		     */
		    destroy: function destroy() {
		        this.touch.destroy();
		        this.mouse.destroy();
		    }
		});

		function recordTouches(eventType, eventData) {
		    if (eventType & INPUT_START) {
		        this.primaryTouch = eventData.changedPointers[0].identifier;
		        setLastTouch.call(this, eventData);
		    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
		        setLastTouch.call(this, eventData);
		    }
		}

		function setLastTouch(eventData) {
		    var touch = eventData.changedPointers[0];

		    if (touch.identifier === this.primaryTouch) {
		        var lastTouch = {x: touch.clientX, y: touch.clientY};
		        this.lastTouches.push(lastTouch);
		        var lts = this.lastTouches;
		        var removeLastTouch = function() {
		            var i = lts.indexOf(lastTouch);
		            if (i > -1) {
		                lts.splice(i, 1);
		            }
		        };
		        setTimeout(removeLastTouch, DEDUP_TIMEOUT);
		    }
		}

		function isSyntheticEvent(eventData) {
		    var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
		    for (var i = 0; i < this.lastTouches.length; i++) {
		        var t = this.lastTouches[i];
		        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
		        if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
		            return true;
		        }
		    }
		    return false;
		}

		var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
		var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined$1;

		// magical touchAction value
		var TOUCH_ACTION_COMPUTE = 'compute';
		var TOUCH_ACTION_AUTO = 'auto';
		var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
		var TOUCH_ACTION_NONE = 'none';
		var TOUCH_ACTION_PAN_X = 'pan-x';
		var TOUCH_ACTION_PAN_Y = 'pan-y';
		var TOUCH_ACTION_MAP = getTouchActionProps();

		/**
		 * Touch Action
		 * sets the touchAction property or uses the js alternative
		 * @param {Manager} manager
		 * @param {String} value
		 * @constructor
		 */
		function TouchAction(manager, value) {
		    this.manager = manager;
		    this.set(value);
		}

		TouchAction.prototype = {
		    /**
		     * set the touchAction value on the element or enable the polyfill
		     * @param {String} value
		     */
		    set: function(value) {
		        // find out the touch-action by the event handlers
		        if (value == TOUCH_ACTION_COMPUTE) {
		            value = this.compute();
		        }

		        if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
		            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
		        }
		        this.actions = value.toLowerCase().trim();
		    },

		    /**
		     * just re-set the touchAction value
		     */
		    update: function() {
		        this.set(this.manager.options.touchAction);
		    },

		    /**
		     * compute the value for the touchAction property based on the recognizer's settings
		     * @returns {String} value
		     */
		    compute: function() {
		        var actions = [];
		        each(this.manager.recognizers, function(recognizer) {
		            if (boolOrFn(recognizer.options.enable, [recognizer])) {
		                actions = actions.concat(recognizer.getTouchAction());
		            }
		        });
		        return cleanTouchActions(actions.join(' '));
		    },

		    /**
		     * this method is called on each input cycle and provides the preventing of the browser behavior
		     * @param {Object} input
		     */
		    preventDefaults: function(input) {
		        var srcEvent = input.srcEvent;
		        var direction = input.offsetDirection;

		        // if the touch action did prevented once this session
		        if (this.manager.session.prevented) {
		            srcEvent.preventDefault();
		            return;
		        }

		        var actions = this.actions;
		        var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
		        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
		        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

		        if (hasNone) {
		            //do not prevent defaults if this is a tap gesture

		            var isTapPointer = input.pointers.length === 1;
		            var isTapMovement = input.distance < 2;
		            var isTapTouchTime = input.deltaTime < 250;

		            if (isTapPointer && isTapMovement && isTapTouchTime) {
		                return;
		            }
		        }

		        if (hasPanX && hasPanY) {
		            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
		            return;
		        }

		        if (hasNone ||
		            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
		            (hasPanX && direction & DIRECTION_VERTICAL)) {
		            return this.preventSrc(srcEvent);
		        }
		    },

		    /**
		     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
		     * @param {Object} srcEvent
		     */
		    preventSrc: function(srcEvent) {
		        this.manager.session.prevented = true;
		        srcEvent.preventDefault();
		    }
		};

		/**
		 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
		 * @param {String} actions
		 * @returns {*}
		 */
		function cleanTouchActions(actions) {
		    // none
		    if (inStr(actions, TOUCH_ACTION_NONE)) {
		        return TOUCH_ACTION_NONE;
		    }

		    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
		    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

		    // if both pan-x and pan-y are set (different recognizers
		    // for different directions, e.g. horizontal pan but vertical swipe?)
		    // we need none (as otherwise with pan-x pan-y combined none of these
		    // recognizers will work, since the browser would handle all panning
		    if (hasPanX && hasPanY) {
		        return TOUCH_ACTION_NONE;
		    }

		    // pan-x OR pan-y
		    if (hasPanX || hasPanY) {
		        return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
		    }

		    // manipulation
		    if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
		        return TOUCH_ACTION_MANIPULATION;
		    }

		    return TOUCH_ACTION_AUTO;
		}

		function getTouchActionProps() {
		    if (!NATIVE_TOUCH_ACTION) {
		        return false;
		    }
		    var touchMap = {};
		    var cssSupports = window.CSS && window.CSS.supports;
		    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

		        // If css.supports is not supported but there is native touch-action assume it supports
		        // all values. This is the case for IE 10 and 11.
		        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
		    });
		    return touchMap;
		}

		/**
		 * Recognizer flow explained; *
		 * All recognizers have the initial state of POSSIBLE when a input session starts.
		 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
		 * Example session for mouse-input: mousedown -> mousemove -> mouseup
		 *
		 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
		 * which determines with state it should be.
		 *
		 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
		 * POSSIBLE to give it another change on the next cycle.
		 *
		 *               Possible
		 *                  |
		 *            +-----+---------------+
		 *            |                     |
		 *      +-----+-----+               |
		 *      |           |               |
		 *   Failed      Cancelled          |
		 *                          +-------+------+
		 *                          |              |
		 *                      Recognized       Began
		 *                                         |
		 *                                      Changed
		 *                                         |
		 *                                  Ended/Recognized
		 */
		var STATE_POSSIBLE = 1;
		var STATE_BEGAN = 2;
		var STATE_CHANGED = 4;
		var STATE_ENDED = 8;
		var STATE_RECOGNIZED = STATE_ENDED;
		var STATE_CANCELLED = 16;
		var STATE_FAILED = 32;

		/**
		 * Recognizer
		 * Every recognizer needs to extend from this class.
		 * @constructor
		 * @param {Object} options
		 */
		function Recognizer(options) {
		    this.options = assign({}, this.defaults, options || {});

		    this.id = uniqueId();

		    this.manager = null;

		    // default is enable true
		    this.options.enable = ifUndefined(this.options.enable, true);

		    this.state = STATE_POSSIBLE;

		    this.simultaneous = {};
		    this.requireFail = [];
		}

		Recognizer.prototype = {
		    /**
		     * @virtual
		     * @type {Object}
		     */
		    defaults: {},

		    /**
		     * set options
		     * @param {Object} options
		     * @return {Recognizer}
		     */
		    set: function(options) {
		        assign(this.options, options);

		        // also update the touchAction, in case something changed about the directions/enabled state
		        this.manager && this.manager.touchAction.update();
		        return this;
		    },

		    /**
		     * recognize simultaneous with an other recognizer.
		     * @param {Recognizer} otherRecognizer
		     * @returns {Recognizer} this
		     */
		    recognizeWith: function(otherRecognizer) {
		        if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
		            return this;
		        }

		        var simultaneous = this.simultaneous;
		        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
		        if (!simultaneous[otherRecognizer.id]) {
		            simultaneous[otherRecognizer.id] = otherRecognizer;
		            otherRecognizer.recognizeWith(this);
		        }
		        return this;
		    },

		    /**
		     * drop the simultaneous link. it doesnt remove the link on the other recognizer.
		     * @param {Recognizer} otherRecognizer
		     * @returns {Recognizer} this
		     */
		    dropRecognizeWith: function(otherRecognizer) {
		        if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
		            return this;
		        }

		        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
		        delete this.simultaneous[otherRecognizer.id];
		        return this;
		    },

		    /**
		     * recognizer can only run when an other is failing
		     * @param {Recognizer} otherRecognizer
		     * @returns {Recognizer} this
		     */
		    requireFailure: function(otherRecognizer) {
		        if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
		            return this;
		        }

		        var requireFail = this.requireFail;
		        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
		        if (inArray(requireFail, otherRecognizer) === -1) {
		            requireFail.push(otherRecognizer);
		            otherRecognizer.requireFailure(this);
		        }
		        return this;
		    },

		    /**
		     * drop the requireFailure link. it does not remove the link on the other recognizer.
		     * @param {Recognizer} otherRecognizer
		     * @returns {Recognizer} this
		     */
		    dropRequireFailure: function(otherRecognizer) {
		        if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
		            return this;
		        }

		        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
		        var index = inArray(this.requireFail, otherRecognizer);
		        if (index > -1) {
		            this.requireFail.splice(index, 1);
		        }
		        return this;
		    },

		    /**
		     * has require failures boolean
		     * @returns {boolean}
		     */
		    hasRequireFailures: function() {
		        return this.requireFail.length > 0;
		    },

		    /**
		     * if the recognizer can recognize simultaneous with an other recognizer
		     * @param {Recognizer} otherRecognizer
		     * @returns {Boolean}
		     */
		    canRecognizeWith: function(otherRecognizer) {
		        return !!this.simultaneous[otherRecognizer.id];
		    },

		    /**
		     * You should use `tryEmit` instead of `emit` directly to check
		     * that all the needed recognizers has failed before emitting.
		     * @param {Object} input
		     */
		    emit: function(input) {
		        var self = this;
		        var state = this.state;

		        function emit(event) {
		            self.manager.emit(event, input);
		        }

		        // 'panstart' and 'panmove'
		        if (state < STATE_ENDED) {
		            emit(self.options.event + stateStr(state));
		        }

		        emit(self.options.event); // simple 'eventName' events

		        if (input.additionalEvent) { // additional event(panleft, panright, pinchin, pinchout...)
		            emit(input.additionalEvent);
		        }

		        // panend and pancancel
		        if (state >= STATE_ENDED) {
		            emit(self.options.event + stateStr(state));
		        }
		    },

		    /**
		     * Check that all the require failure recognizers has failed,
		     * if true, it emits a gesture event,
		     * otherwise, setup the state to FAILED.
		     * @param {Object} input
		     */
		    tryEmit: function(input) {
		        if (this.canEmit()) {
		            return this.emit(input);
		        }
		        // it's failing anyway
		        this.state = STATE_FAILED;
		    },

		    /**
		     * can we emit?
		     * @returns {boolean}
		     */
		    canEmit: function() {
		        var i = 0;
		        while (i < this.requireFail.length) {
		            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
		                return false;
		            }
		            i++;
		        }
		        return true;
		    },

		    /**
		     * update the recognizer
		     * @param {Object} inputData
		     */
		    recognize: function(inputData) {
		        // make a new copy of the inputData
		        // so we can change the inputData without messing up the other recognizers
		        var inputDataClone = assign({}, inputData);

		        // is is enabled and allow recognizing?
		        if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
		            this.reset();
		            this.state = STATE_FAILED;
		            return;
		        }

		        // reset when we've reached the end
		        if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
		            this.state = STATE_POSSIBLE;
		        }

		        this.state = this.process(inputDataClone);

		        // the recognizer has recognized a gesture
		        // so trigger an event
		        if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
		            this.tryEmit(inputDataClone);
		        }
		    },

		    /**
		     * return the state of the recognizer
		     * the actual recognizing happens in this method
		     * @virtual
		     * @param {Object} inputData
		     * @returns {Const} STATE
		     */
		    process: function(inputData) { }, // jshint ignore:line

		    /**
		     * return the preferred touch-action
		     * @virtual
		     * @returns {Array}
		     */
		    getTouchAction: function() { },

		    /**
		     * called when the gesture isn't allowed to recognize
		     * like when another is being recognized or it is disabled
		     * @virtual
		     */
		    reset: function() { }
		};

		/**
		 * get a usable string, used as event postfix
		 * @param {Const} state
		 * @returns {String} state
		 */
		function stateStr(state) {
		    if (state & STATE_CANCELLED) {
		        return 'cancel';
		    } else if (state & STATE_ENDED) {
		        return 'end';
		    } else if (state & STATE_CHANGED) {
		        return 'move';
		    } else if (state & STATE_BEGAN) {
		        return 'start';
		    }
		    return '';
		}

		/**
		 * direction cons to string
		 * @param {Const} direction
		 * @returns {String}
		 */
		function directionStr(direction) {
		    if (direction == DIRECTION_DOWN) {
		        return 'down';
		    } else if (direction == DIRECTION_UP) {
		        return 'up';
		    } else if (direction == DIRECTION_LEFT) {
		        return 'left';
		    } else if (direction == DIRECTION_RIGHT) {
		        return 'right';
		    }
		    return '';
		}

		/**
		 * get a recognizer by name if it is bound to a manager
		 * @param {Recognizer|String} otherRecognizer
		 * @param {Recognizer} recognizer
		 * @returns {Recognizer}
		 */
		function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
		    var manager = recognizer.manager;
		    if (manager) {
		        return manager.get(otherRecognizer);
		    }
		    return otherRecognizer;
		}

		/**
		 * This recognizer is just used as a base for the simple attribute recognizers.
		 * @constructor
		 * @extends Recognizer
		 */
		function AttrRecognizer() {
		    Recognizer.apply(this, arguments);
		}

		inherit(AttrRecognizer, Recognizer, {
		    /**
		     * @namespace
		     * @memberof AttrRecognizer
		     */
		    defaults: {
		        /**
		         * @type {Number}
		         * @default 1
		         */
		        pointers: 1
		    },

		    /**
		     * Used to check if it the recognizer receives valid input, like input.distance > 10.
		     * @memberof AttrRecognizer
		     * @param {Object} input
		     * @returns {Boolean} recognized
		     */
		    attrTest: function(input) {
		        var optionPointers = this.options.pointers;
		        return optionPointers === 0 || input.pointers.length === optionPointers;
		    },

		    /**
		     * Process the input and return the state for the recognizer
		     * @memberof AttrRecognizer
		     * @param {Object} input
		     * @returns {*} State
		     */
		    process: function(input) {
		        var state = this.state;
		        var eventType = input.eventType;

		        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
		        var isValid = this.attrTest(input);

		        // on cancel input and we've recognized before, return STATE_CANCELLED
		        if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
		            return state | STATE_CANCELLED;
		        } else if (isRecognized || isValid) {
		            if (eventType & INPUT_END) {
		                return state | STATE_ENDED;
		            } else if (!(state & STATE_BEGAN)) {
		                return STATE_BEGAN;
		            }
		            return state | STATE_CHANGED;
		        }
		        return STATE_FAILED;
		    }
		});

		/**
		 * Pan
		 * Recognized when the pointer is down and moved in the allowed direction.
		 * @constructor
		 * @extends AttrRecognizer
		 */
		function PanRecognizer() {
		    AttrRecognizer.apply(this, arguments);

		    this.pX = null;
		    this.pY = null;
		}

		inherit(PanRecognizer, AttrRecognizer, {
		    /**
		     * @namespace
		     * @memberof PanRecognizer
		     */
		    defaults: {
		        event: 'pan',
		        threshold: 10,
		        pointers: 1,
		        direction: DIRECTION_ALL
		    },

		    getTouchAction: function() {
		        var direction = this.options.direction;
		        var actions = [];
		        if (direction & DIRECTION_HORIZONTAL) {
		            actions.push(TOUCH_ACTION_PAN_Y);
		        }
		        if (direction & DIRECTION_VERTICAL) {
		            actions.push(TOUCH_ACTION_PAN_X);
		        }
		        return actions;
		    },

		    directionTest: function(input) {
		        var options = this.options;
		        var hasMoved = true;
		        var distance = input.distance;
		        var direction = input.direction;
		        var x = input.deltaX;
		        var y = input.deltaY;

		        // lock to axis?
		        if (!(direction & options.direction)) {
		            if (options.direction & DIRECTION_HORIZONTAL) {
		                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
		                hasMoved = x != this.pX;
		                distance = Math.abs(input.deltaX);
		            } else {
		                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
		                hasMoved = y != this.pY;
		                distance = Math.abs(input.deltaY);
		            }
		        }
		        input.direction = direction;
		        return hasMoved && distance > options.threshold && direction & options.direction;
		    },

		    attrTest: function(input) {
		        return AttrRecognizer.prototype.attrTest.call(this, input) &&
		            (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
		    },

		    emit: function(input) {

		        this.pX = input.deltaX;
		        this.pY = input.deltaY;

		        var direction = directionStr(input.direction);

		        if (direction) {
		            input.additionalEvent = this.options.event + direction;
		        }
		        this._super.emit.call(this, input);
		    }
		});

		/**
		 * Pinch
		 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
		 * @constructor
		 * @extends AttrRecognizer
		 */
		function PinchRecognizer() {
		    AttrRecognizer.apply(this, arguments);
		}

		inherit(PinchRecognizer, AttrRecognizer, {
		    /**
		     * @namespace
		     * @memberof PinchRecognizer
		     */
		    defaults: {
		        event: 'pinch',
		        threshold: 0,
		        pointers: 2
		    },

		    getTouchAction: function() {
		        return [TOUCH_ACTION_NONE];
		    },

		    attrTest: function(input) {
		        return this._super.attrTest.call(this, input) &&
		            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
		    },

		    emit: function(input) {
		        if (input.scale !== 1) {
		            var inOut = input.scale < 1 ? 'in' : 'out';
		            input.additionalEvent = this.options.event + inOut;
		        }
		        this._super.emit.call(this, input);
		    }
		});

		/**
		 * Press
		 * Recognized when the pointer is down for x ms without any movement.
		 * @constructor
		 * @extends Recognizer
		 */
		function PressRecognizer() {
		    Recognizer.apply(this, arguments);

		    this._timer = null;
		    this._input = null;
		}

		inherit(PressRecognizer, Recognizer, {
		    /**
		     * @namespace
		     * @memberof PressRecognizer
		     */
		    defaults: {
		        event: 'press',
		        pointers: 1,
		        time: 251, // minimal time of the pointer to be pressed
		        threshold: 9 // a minimal movement is ok, but keep it low
		    },

		    getTouchAction: function() {
		        return [TOUCH_ACTION_AUTO];
		    },

		    process: function(input) {
		        var options = this.options;
		        var validPointers = input.pointers.length === options.pointers;
		        var validMovement = input.distance < options.threshold;
		        var validTime = input.deltaTime > options.time;

		        this._input = input;

		        // we only allow little movement
		        // and we've reached an end event, so a tap is possible
		        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
		            this.reset();
		        } else if (input.eventType & INPUT_START) {
		            this.reset();
		            this._timer = setTimeoutContext(function() {
		                this.state = STATE_RECOGNIZED;
		                this.tryEmit();
		            }, options.time, this);
		        } else if (input.eventType & INPUT_END) {
		            return STATE_RECOGNIZED;
		        }
		        return STATE_FAILED;
		    },

		    reset: function() {
		        clearTimeout(this._timer);
		    },

		    emit: function(input) {
		        if (this.state !== STATE_RECOGNIZED) {
		            return;
		        }

		        if (input && (input.eventType & INPUT_END)) {
		            this.manager.emit(this.options.event + 'up', input);
		        } else {
		            this._input.timeStamp = now();
		            this.manager.emit(this.options.event, this._input);
		        }
		    }
		});

		/**
		 * Rotate
		 * Recognized when two or more pointer are moving in a circular motion.
		 * @constructor
		 * @extends AttrRecognizer
		 */
		function RotateRecognizer() {
		    AttrRecognizer.apply(this, arguments);
		}

		inherit(RotateRecognizer, AttrRecognizer, {
		    /**
		     * @namespace
		     * @memberof RotateRecognizer
		     */
		    defaults: {
		        event: 'rotate',
		        threshold: 0,
		        pointers: 2
		    },

		    getTouchAction: function() {
		        return [TOUCH_ACTION_NONE];
		    },

		    attrTest: function(input) {
		        return this._super.attrTest.call(this, input) &&
		            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
		    }
		});

		/**
		 * Swipe
		 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
		 * @constructor
		 * @extends AttrRecognizer
		 */
		function SwipeRecognizer() {
		    AttrRecognizer.apply(this, arguments);
		}

		inherit(SwipeRecognizer, AttrRecognizer, {
		    /**
		     * @namespace
		     * @memberof SwipeRecognizer
		     */
		    defaults: {
		        event: 'swipe',
		        threshold: 10,
		        velocity: 0.3,
		        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
		        pointers: 1
		    },

		    getTouchAction: function() {
		        return PanRecognizer.prototype.getTouchAction.call(this);
		    },

		    attrTest: function(input) {
		        var direction = this.options.direction;
		        var velocity;

		        if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
		            velocity = input.overallVelocity;
		        } else if (direction & DIRECTION_HORIZONTAL) {
		            velocity = input.overallVelocityX;
		        } else if (direction & DIRECTION_VERTICAL) {
		            velocity = input.overallVelocityY;
		        }

		        return this._super.attrTest.call(this, input) &&
		            direction & input.offsetDirection &&
		            input.distance > this.options.threshold &&
		            input.maxPointers == this.options.pointers &&
		            abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
		    },

		    emit: function(input) {
		        var direction = directionStr(input.offsetDirection);
		        if (direction) {
		            this.manager.emit(this.options.event + direction, input);
		        }

		        this.manager.emit(this.options.event, input);
		    }
		});

		/**
		 * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
		 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
		 * a single tap.
		 *
		 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
		 * multi-taps being recognized.
		 * @constructor
		 * @extends Recognizer
		 */
		function TapRecognizer() {
		    Recognizer.apply(this, arguments);

		    // previous time and center,
		    // used for tap counting
		    this.pTime = false;
		    this.pCenter = false;

		    this._timer = null;
		    this._input = null;
		    this.count = 0;
		}

		inherit(TapRecognizer, Recognizer, {
		    /**
		     * @namespace
		     * @memberof PinchRecognizer
		     */
		    defaults: {
		        event: 'tap',
		        pointers: 1,
		        taps: 1,
		        interval: 300, // max time between the multi-tap taps
		        time: 250, // max time of the pointer to be down (like finger on the screen)
		        threshold: 9, // a minimal movement is ok, but keep it low
		        posThreshold: 10 // a multi-tap can be a bit off the initial position
		    },

		    getTouchAction: function() {
		        return [TOUCH_ACTION_MANIPULATION];
		    },

		    process: function(input) {
		        var options = this.options;

		        var validPointers = input.pointers.length === options.pointers;
		        var validMovement = input.distance < options.threshold;
		        var validTouchTime = input.deltaTime < options.time;

		        this.reset();

		        if ((input.eventType & INPUT_START) && (this.count === 0)) {
		            return this.failTimeout();
		        }

		        // we only allow little movement
		        // and we've reached an end event, so a tap is possible
		        if (validMovement && validTouchTime && validPointers) {
		            if (input.eventType != INPUT_END) {
		                return this.failTimeout();
		            }

		            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
		            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

		            this.pTime = input.timeStamp;
		            this.pCenter = input.center;

		            if (!validMultiTap || !validInterval) {
		                this.count = 1;
		            } else {
		                this.count += 1;
		            }

		            this._input = input;

		            // if tap count matches we have recognized it,
		            // else it has began recognizing...
		            var tapCount = this.count % options.taps;
		            if (tapCount === 0) {
		                // no failing requirements, immediately trigger the tap event
		                // or wait as long as the multitap interval to trigger
		                if (!this.hasRequireFailures()) {
		                    return STATE_RECOGNIZED;
		                } else {
		                    this._timer = setTimeoutContext(function() {
		                        this.state = STATE_RECOGNIZED;
		                        this.tryEmit();
		                    }, options.interval, this);
		                    return STATE_BEGAN;
		                }
		            }
		        }
		        return STATE_FAILED;
		    },

		    failTimeout: function() {
		        this._timer = setTimeoutContext(function() {
		            this.state = STATE_FAILED;
		        }, this.options.interval, this);
		        return STATE_FAILED;
		    },

		    reset: function() {
		        clearTimeout(this._timer);
		    },

		    emit: function() {
		        if (this.state == STATE_RECOGNIZED) {
		            this._input.tapCount = this.count;
		            this.manager.emit(this.options.event, this._input);
		        }
		    }
		});

		/**
		 * Simple way to create a manager with a default set of recognizers.
		 * @param {HTMLElement} element
		 * @param {Object} [options]
		 * @constructor
		 */
		function Hammer(element, options) {
		    options = options || {};
		    options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
		    return new Manager(element, options);
		}

		/**
		 * @const {string}
		 */
		Hammer.VERSION = '2.0.7';

		/**
		 * default settings
		 * @namespace
		 */
		Hammer.defaults = {
		    /**
		     * set if DOM events are being triggered.
		     * But this is slower and unused by simple implementations, so disabled by default.
		     * @type {Boolean}
		     * @default false
		     */
		    domEvents: false,

		    /**
		     * The value for the touchAction property/fallback.
		     * When set to `compute` it will magically set the correct value based on the added recognizers.
		     * @type {String}
		     * @default compute
		     */
		    touchAction: TOUCH_ACTION_COMPUTE,

		    /**
		     * @type {Boolean}
		     * @default true
		     */
		    enable: true,

		    /**
		     * EXPERIMENTAL FEATURE -- can be removed/changed
		     * Change the parent input target element.
		     * If Null, then it is being set the to main element.
		     * @type {Null|EventTarget}
		     * @default null
		     */
		    inputTarget: null,

		    /**
		     * force an input class
		     * @type {Null|Function}
		     * @default null
		     */
		    inputClass: null,

		    /**
		     * Default recognizer setup when calling `Hammer()`
		     * When creating a new Manager these will be skipped.
		     * @type {Array}
		     */
		    preset: [
		        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
		        [RotateRecognizer, {enable: false}],
		        [PinchRecognizer, {enable: false}, ['rotate']],
		        [SwipeRecognizer, {direction: DIRECTION_HORIZONTAL}],
		        [PanRecognizer, {direction: DIRECTION_HORIZONTAL}, ['swipe']],
		        [TapRecognizer],
		        [TapRecognizer, {event: 'doubletap', taps: 2}, ['tap']],
		        [PressRecognizer]
		    ],

		    /**
		     * Some CSS properties can be used to improve the working of Hammer.
		     * Add them to this method and they will be set when creating a new Manager.
		     * @namespace
		     */
		    cssProps: {
		        /**
		         * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
		         * @type {String}
		         * @default 'none'
		         */
		        userSelect: 'none',

		        /**
		         * Disable the Windows Phone grippers when pressing an element.
		         * @type {String}
		         * @default 'none'
		         */
		        touchSelect: 'none',

		        /**
		         * Disables the default callout shown when you touch and hold a touch target.
		         * On iOS, when you touch and hold a touch target such as a link, Safari displays
		         * a callout containing information about the link. This property allows you to disable that callout.
		         * @type {String}
		         * @default 'none'
		         */
		        touchCallout: 'none',

		        /**
		         * Specifies whether zooming is enabled. Used by IE10>
		         * @type {String}
		         * @default 'none'
		         */
		        contentZooming: 'none',

		        /**
		         * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
		         * @type {String}
		         * @default 'none'
		         */
		        userDrag: 'none',

		        /**
		         * Overrides the highlight color shown when the user taps a link or a JavaScript
		         * clickable element in iOS. This property obeys the alpha value, if specified.
		         * @type {String}
		         * @default 'rgba(0,0,0,0)'
		         */
		        tapHighlightColor: 'rgba(0,0,0,0)'
		    }
		};

		var STOP = 1;
		var FORCED_STOP = 2;

		/**
		 * Manager
		 * @param {HTMLElement} element
		 * @param {Object} [options]
		 * @constructor
		 */
		function Manager(element, options) {
		    this.options = assign({}, Hammer.defaults, options || {});

		    this.options.inputTarget = this.options.inputTarget || element;

		    this.handlers = {};
		    this.session = {};
		    this.recognizers = [];
		    this.oldCssProps = {};

		    this.element = element;
		    this.input = createInputInstance(this);
		    this.touchAction = new TouchAction(this, this.options.touchAction);

		    toggleCssProps(this, true);

		    each(this.options.recognizers, function(item) {
		        var recognizer = this.add(new (item[0])(item[1]));
		        item[2] && recognizer.recognizeWith(item[2]);
		        item[3] && recognizer.requireFailure(item[3]);
		    }, this);
		}

		Manager.prototype = {
		    /**
		     * set options
		     * @param {Object} options
		     * @returns {Manager}
		     */
		    set: function(options) {
		        assign(this.options, options);

		        // Options that need a little more setup
		        if (options.touchAction) {
		            this.touchAction.update();
		        }
		        if (options.inputTarget) {
		            // Clean up existing event listeners and reinitialize
		            this.input.destroy();
		            this.input.target = options.inputTarget;
		            this.input.init();
		        }
		        return this;
		    },

		    /**
		     * stop recognizing for this session.
		     * This session will be discarded, when a new [input]start event is fired.
		     * When forced, the recognizer cycle is stopped immediately.
		     * @param {Boolean} [force]
		     */
		    stop: function(force) {
		        this.session.stopped = force ? FORCED_STOP : STOP;
		    },

		    /**
		     * run the recognizers!
		     * called by the inputHandler function on every movement of the pointers (touches)
		     * it walks through all the recognizers and tries to detect the gesture that is being made
		     * @param {Object} inputData
		     */
		    recognize: function(inputData) {
		        var session = this.session;
		        if (session.stopped) {
		            return;
		        }

		        // run the touch-action polyfill
		        this.touchAction.preventDefaults(inputData);

		        var recognizer;
		        var recognizers = this.recognizers;

		        // this holds the recognizer that is being recognized.
		        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
		        // if no recognizer is detecting a thing, it is set to `null`
		        var curRecognizer = session.curRecognizer;

		        // reset when the last recognizer is recognized
		        // or when we're in a new session
		        if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
		            curRecognizer = session.curRecognizer = null;
		        }

		        var i = 0;
		        while (i < recognizers.length) {
		            recognizer = recognizers[i];

		            // find out if we are allowed try to recognize the input for this one.
		            // 1.   allow if the session is NOT forced stopped (see the .stop() method)
		            // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
		            //      that is being recognized.
		            // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
		            //      this can be setup with the `recognizeWith()` method on the recognizer.
		            if (session.stopped !== FORCED_STOP && ( // 1
		                    !curRecognizer || recognizer == curRecognizer || // 2
		                    recognizer.canRecognizeWith(curRecognizer))) { // 3
		                recognizer.recognize(inputData);
		            } else {
		                recognizer.reset();
		            }

		            // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
		            // current active recognizer. but only if we don't already have an active recognizer
		            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
		                curRecognizer = session.curRecognizer = recognizer;
		            }
		            i++;
		        }
		    },

		    /**
		     * get a recognizer by its event name.
		     * @param {Recognizer|String} recognizer
		     * @returns {Recognizer|Null}
		     */
		    get: function(recognizer) {
		        if (recognizer instanceof Recognizer) {
		            return recognizer;
		        }

		        var recognizers = this.recognizers;
		        for (var i = 0; i < recognizers.length; i++) {
		            if (recognizers[i].options.event == recognizer) {
		                return recognizers[i];
		            }
		        }
		        return null;
		    },

		    /**
		     * add a recognizer to the manager
		     * existing recognizers with the same event name will be removed
		     * @param {Recognizer} recognizer
		     * @returns {Recognizer|Manager}
		     */
		    add: function(recognizer) {
		        if (invokeArrayArg(recognizer, 'add', this)) {
		            return this;
		        }

		        // remove existing
		        var existing = this.get(recognizer.options.event);
		        if (existing) {
		            this.remove(existing);
		        }

		        this.recognizers.push(recognizer);
		        recognizer.manager = this;

		        this.touchAction.update();
		        return recognizer;
		    },

		    /**
		     * remove a recognizer by name or instance
		     * @param {Recognizer|String} recognizer
		     * @returns {Manager}
		     */
		    remove: function(recognizer) {
		        if (invokeArrayArg(recognizer, 'remove', this)) {
		            return this;
		        }

		        recognizer = this.get(recognizer);

		        // let's make sure this recognizer exists
		        if (recognizer) {
		            var recognizers = this.recognizers;
		            var index = inArray(recognizers, recognizer);

		            if (index !== -1) {
		                recognizers.splice(index, 1);
		                this.touchAction.update();
		            }
		        }

		        return this;
		    },

		    /**
		     * bind event
		     * @param {String} events
		     * @param {Function} handler
		     * @returns {EventEmitter} this
		     */
		    on: function(events, handler) {
		        if (events === undefined$1) {
		            return;
		        }
		        if (handler === undefined$1) {
		            return;
		        }

		        var handlers = this.handlers;
		        each(splitStr(events), function(event) {
		            handlers[event] = handlers[event] || [];
		            handlers[event].push(handler);
		        });
		        return this;
		    },

		    /**
		     * unbind event, leave emit blank to remove all handlers
		     * @param {String} events
		     * @param {Function} [handler]
		     * @returns {EventEmitter} this
		     */
		    off: function(events, handler) {
		        if (events === undefined$1) {
		            return;
		        }

		        var handlers = this.handlers;
		        each(splitStr(events), function(event) {
		            if (!handler) {
		                delete handlers[event];
		            } else {
		                handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
		            }
		        });
		        return this;
		    },

		    /**
		     * emit event to the listeners
		     * @param {String} event
		     * @param {Object} data
		     */
		    emit: function(event, data) {
		        // we also want to trigger dom events
		        if (this.options.domEvents) {
		            triggerDomEvent(event, data);
		        }

		        // no handlers, so skip it all
		        var handlers = this.handlers[event] && this.handlers[event].slice();
		        if (!handlers || !handlers.length) {
		            return;
		        }

		        data.type = event;
		        data.preventDefault = function() {
		            data.srcEvent.preventDefault();
		        };

		        var i = 0;
		        while (i < handlers.length) {
		            handlers[i](data);
		            i++;
		        }
		    },

		    /**
		     * destroy the manager and unbinds all events
		     * it doesn't unbind dom events, that is the user own responsibility
		     */
		    destroy: function() {
		        this.element && toggleCssProps(this, false);

		        this.handlers = {};
		        this.session = {};
		        this.input.destroy();
		        this.element = null;
		    }
		};

		/**
		 * add/remove the css properties as defined in manager.options.cssProps
		 * @param {Manager} manager
		 * @param {Boolean} add
		 */
		function toggleCssProps(manager, add) {
		    var element = manager.element;
		    if (!element.style) {
		        return;
		    }
		    var prop;
		    each(manager.options.cssProps, function(value, name) {
		        prop = prefixed(element.style, name);
		        if (add) {
		            manager.oldCssProps[prop] = element.style[prop];
		            element.style[prop] = value;
		        } else {
		            element.style[prop] = manager.oldCssProps[prop] || '';
		        }
		    });
		    if (!add) {
		        manager.oldCssProps = {};
		    }
		}

		/**
		 * trigger dom event
		 * @param {String} event
		 * @param {Object} data
		 */
		function triggerDomEvent(event, data) {
		    var gestureEvent = document.createEvent('Event');
		    gestureEvent.initEvent(event, true, true);
		    gestureEvent.gesture = data;
		    data.target.dispatchEvent(gestureEvent);
		}

		assign(Hammer, {
		    INPUT_START: INPUT_START,
		    INPUT_MOVE: INPUT_MOVE,
		    INPUT_END: INPUT_END,
		    INPUT_CANCEL: INPUT_CANCEL,

		    STATE_POSSIBLE: STATE_POSSIBLE,
		    STATE_BEGAN: STATE_BEGAN,
		    STATE_CHANGED: STATE_CHANGED,
		    STATE_ENDED: STATE_ENDED,
		    STATE_RECOGNIZED: STATE_RECOGNIZED,
		    STATE_CANCELLED: STATE_CANCELLED,
		    STATE_FAILED: STATE_FAILED,

		    DIRECTION_NONE: DIRECTION_NONE,
		    DIRECTION_LEFT: DIRECTION_LEFT,
		    DIRECTION_RIGHT: DIRECTION_RIGHT,
		    DIRECTION_UP: DIRECTION_UP,
		    DIRECTION_DOWN: DIRECTION_DOWN,
		    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
		    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
		    DIRECTION_ALL: DIRECTION_ALL,

		    Manager: Manager,
		    Input: Input,
		    TouchAction: TouchAction,

		    TouchInput: TouchInput,
		    MouseInput: MouseInput,
		    PointerEventInput: PointerEventInput,
		    TouchMouseInput: TouchMouseInput,
		    SingleTouchInput: SingleTouchInput,

		    Recognizer: Recognizer,
		    AttrRecognizer: AttrRecognizer,
		    Tap: TapRecognizer,
		    Pan: PanRecognizer,
		    Swipe: SwipeRecognizer,
		    Pinch: PinchRecognizer,
		    Rotate: RotateRecognizer,
		    Press: PressRecognizer,

		    on: addEventListeners,
		    off: removeEventListeners,
		    each: each,
		    merge: merge,
		    extend: extend,
		    assign: assign,
		    inherit: inherit,
		    bindFn: bindFn,
		    prefixed: prefixed
		});

		// this prevents errors when Hammer is loaded in the presence of an AMD
		//  style loader but by script tag, not by the loader.
		var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
		freeGlobal.Hammer = Hammer;

		if (typeof undefined$1 === 'function' && undefined$1.amd) {
		    undefined$1(function() {
		        return Hammer;
		    });
		} else if (module.exports) {
		    module.exports = Hammer;
		} else {
		    window[exportName] = Hammer;
		}

		})(window, document, 'Hammer'); 
	} (hammer));

	var hammerExports = hammer.exports;
	const Hammer = /*@__PURE__*/getDefaultExportFromCjs(hammerExports);

	function onMouse(ele, callback, signal) {
	  ele.addEventListener("mousedown", (event) => {
	    const { left } = ele.getBoundingClientRect();
	    const mouseMove = (event2) => {
	      const xInProgress = event2.clientX - left;
	      const percent = Math.round(xInProgress / ele.clientWidth * 100);
	      callback(percent);
	    };
	    mouseMove(event);
	    ele.addEventListener("mousemove", mouseMove);
	    ele.addEventListener("mouseup", () => {
	      ele.removeEventListener("mousemove", mouseMove);
	    }, { once: true });
	    ele.addEventListener("mouseleave", () => {
	      ele.removeEventListener("mousemove", mouseMove);
	    }, { once: true });
	  }, { signal });
	}

	const PLAY_ICON = `<svg width="1.4rem" height="1.4rem" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M106.854 106.002a26.003 26.003 0 0 0-25.64 29.326c16 124 16 117.344 0 241.344a26.003 26.003 0 0 0 35.776 27.332l298-124a26.003 26.003 0 0 0 0-48.008l-298-124a26.003 26.003 0 0 0-10.136-1.994z"/></svg>`;
	const PAUSE_ICON = `<svg width="1.4rem" height="1.4rem" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M120.16 45A20.162 20.162 0 0 0 100 65.16v381.68A20.162 20.162 0 0 0 120.16 467h65.68A20.162 20.162 0 0 0 206 446.84V65.16A20.162 20.162 0 0 0 185.84 45h-65.68zm206 0A20.162 20.162 0 0 0 306 65.16v381.68A20.162 20.162 0 0 0 326.16 467h65.68A20.162 20.162 0 0 0 412 446.84V65.16A20.162 20.162 0 0 0 391.84 45h-65.68z"/></svg>`;
	const VOLUME_ICON = `<svg width="1.4rem" height="1.4rem" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <path fill="#fff" d="M10.0012 8.99984H9.1C8.53995 8.99984 8.25992 8.99984 8.04601 9.10883C7.85785 9.20471 7.70487 9.35769 7.60899 9.54585C7.5 9.75976 7.5 10.0398 7.5 10.5998V13.3998C7.5 13.9599 7.5 14.2399 7.60899 14.4538C7.70487 14.642 7.85785 14.795 8.04601 14.8908C8.25992 14.9998 8.53995 14.9998 9.1 14.9998H10.0012C10.5521 14.9998 10.8276 14.9998 11.0829 15.0685C11.309 15.1294 11.5228 15.2295 11.7143 15.3643C11.9305 15.5164 12.1068 15.728 12.4595 16.1512L15.0854 19.3023C15.5211 19.8252 15.739 20.0866 15.9292 20.1138C16.094 20.1373 16.2597 20.0774 16.3712 19.9538C16.5 19.811 16.5 19.4708 16.5 18.7902V5.20948C16.5 4.52892 16.5 4.18864 16.3712 4.04592C16.2597 3.92233 16.094 3.86234 15.9292 3.8859C15.7389 3.9131 15.5211 4.17451 15.0854 4.69733L12.4595 7.84843C12.1068 8.27166 11.9305 8.48328 11.7143 8.63542C11.5228 8.77021 11.309 8.87032 11.0829 8.93116C10.8276 8.99984 10.5521 8.99984 10.0012 8.99984Z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const MUTED_ICON = `<svg width="1.4rem" height="1.4rem" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M16 9.50009L21 14.5001M21 9.50009L16 14.5001M4.6 9.00009H5.5012C6.05213 9.00009 6.32759 9.00009 6.58285 8.93141C6.80903 8.87056 7.02275 8.77046 7.21429 8.63566C7.43047 8.48353 7.60681 8.27191 7.95951 7.84868L10.5854 4.69758C11.0211 4.17476 11.2389 3.91335 11.4292 3.88614C11.594 3.86258 11.7597 3.92258 11.8712 4.04617C12 4.18889 12 4.52917 12 5.20973V18.7904C12 19.471 12 19.8113 11.8712 19.954C11.7597 20.0776 11.594 20.1376 11.4292 20.114C11.239 20.0868 11.0211 19.8254 10.5854 19.3026L7.95951 16.1515C7.60681 15.7283 7.43047 15.5166 7.21429 15.3645C7.02275 15.2297 6.80903 15.1296 6.58285 15.0688C6.32759 15.0001 6.05213 15.0001 5.5012 15.0001H4.6C4.03995 15.0001 3.75992 15.0001 3.54601 14.8911C3.35785 14.7952 3.20487 14.6422 3.10899 14.4541C3 14.2402 3 13.9601 3 13.4001V10.6001C3 10.04 3 9.76001 3.10899 9.54609C3.20487 9.35793 3.35785 9.20495 3.54601 9.10908C3.75992 9.00009 4.03995 9.00009 4.6 9.00009Z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	class VideoControl {
	  ui;
	  context = /* @__PURE__ */ new Map();
	  paused = false;
	  abortController;
	  constructor(root) {
	    this.ui = this.create(root);
	    this.flushUI();
	  }
	  show() {
	    this.ui.root.hidden = false;
	  }
	  hidden() {
	    this.ui.root.hidden = true;
	  }
	  create(root) {
	    const ui = document.createElement("div");
	    ui.classList.add("bifm-vid-ctl");
	    ui.innerHTML = `
<div>
  <button id="bifm-vid-ctl-play" class="bifm-vid-ctl-btn">${PLAY_ICON}</button>
  <button id="bifm-vid-ctl-mute" class="bifm-vid-ctl-btn">▶️</button>
  <div id="bifm-vid-ctl-volume" class="bifm-vid-ctl-pg">
    <div class="bifm-vid-ctl-pg-inner" style="width: 30%"></div>
  </div>
  <span id="bifm-vid-ctl-time" class="bifm-vid-ctl-span">00:00</span>
  <span class="bifm-vid-ctl-span">/</span>
  <span id="bifm-vid-ctl-duration" class="bifm-vid-ctl-span">10:00</span>
</div>
<div>
  <div id="bifm-vid-ctl-pg" class="bifm-vid-ctl-pg">
    <div class="bifm-vid-ctl-pg-inner" style="width: 30%"></div>
  </div>
</div>
`;
	    root.appendChild(ui);
	    return {
	      root: ui,
	      playBTN: q("#bifm-vid-ctl-play", ui),
	      volumeBTN: q("#bifm-vid-ctl-mute", ui),
	      volumeProgress: q("#bifm-vid-ctl-volume", ui),
	      progress: q("#bifm-vid-ctl-pg", ui),
	      time: q("#bifm-vid-ctl-time", ui),
	      duration: q("#bifm-vid-ctl-duration", ui)
	    };
	  }
	  flushUI(state, onlyState) {
	    let { value, max } = state ? { value: state.time, max: state.duration } : { value: 0, max: 10 };
	    const percent = value / max * 100;
	    this.ui.progress.firstElementChild.style.width = `${percent}%`;
	    this.ui.time.textContent = secondsToTime(value);
	    this.ui.duration.textContent = secondsToTime(max);
	    if (onlyState)
	      return;
	    this.ui.playBTN.innerHTML = this.paused ? PLAY_ICON : PAUSE_ICON;
	    this.ui.volumeBTN.innerHTML = conf.muted ? MUTED_ICON : VOLUME_ICON;
	    this.ui.volumeProgress.firstElementChild.style.width = `${conf.volume || 30}%`;
	  }
	  attach(element) {
	    evLog("info", "attach video control");
	    this.detach();
	    this.show();
	    this.abortController = new AbortController();
	    let state = this.context.get(element.src);
	    if (!state) {
	      state = { time: element.currentTime, duration: element.duration };
	      this.context.set(element.src, state);
	    } else {
	      element.currentTime = state.time;
	    }
	    this.flushUI(state);
	    element.addEventListener("timeupdate", (event) => {
	      const ele = event.target;
	      if (!state)
	        return;
	      state.time = ele.currentTime;
	      this.flushUI(state, true);
	    }, { signal: this.abortController.signal });
	    element.onwaiting = () => evLog("debug", "onwaiting");
	    element.loop = true;
	    element.muted = conf.muted || false;
	    element.volume = (conf.volume || 30) / 100;
	    if (!this.paused) {
	      element.play();
	    }
	    let elementID = element.id;
	    if (!elementID) {
	      elementID = "vid-" + Math.random().toString(36).slice(2);
	      element.id = elementID;
	    }
	    this.ui.playBTN.addEventListener("click", () => {
	      const vid = document.querySelector(`#${elementID}`);
	      if (vid) {
	        this.paused = !this.paused;
	        if (this.paused) {
	          vid.pause();
	        } else {
	          vid.play();
	        }
	        this.flushUI(this.context.get(vid.src));
	      }
	    }, { signal: this.abortController.signal });
	    this.ui.volumeBTN.addEventListener("click", () => {
	      const vid = document.querySelector(`#${elementID}`);
	      if (vid) {
	        conf.muted = !conf.muted;
	        vid.muted = conf.muted;
	        saveConf(conf);
	        this.flushUI(this.context.get(vid.src));
	      }
	    }, { signal: this.abortController.signal });
	    onMouse(this.ui.progress, (percent) => {
	      const vid = document.querySelector(`#${elementID}`);
	      if (vid) {
	        vid.currentTime = vid.duration * (percent / 100);
	        const state2 = this.context.get(vid.src);
	        state2.time = vid.currentTime;
	        this.flushUI(state2);
	      }
	    }, this.abortController.signal);
	    onMouse(this.ui.volumeProgress, (percent) => {
	      const vid = document.querySelector(`#${elementID}`);
	      if (vid) {
	        conf.volume = percent;
	        saveConf(conf);
	        vid.volume = conf.volume / 100;
	        this.flushUI(this.context.get(vid.src));
	      }
	    }, this.abortController.signal);
	  }
	  detach() {
	    this.abortController?.abort();
	    this.abortController = void 0;
	    this.flushUI();
	  }
	}
	function secondsToTime(seconds) {
	  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
	  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
	  return `${min}:${sec}`;
	}

	class BigImageFrameManager {
	  frame;
	  lockInit;
	  lastMouse;
	  fragment;
	  // image decode will take a while, so cache it to fragment
	  elements = { next: [], curr: [], prev: [] };
	  imgScaleBar;
	  debouncer;
	  throttler;
	  callbackOnWheel;
	  hammer;
	  preventStep = { fin: false };
	  visible = false;
	  html;
	  frameScrollAbort;
	  vidController;
	  chapterIndex = 0;
	  getChapter;
	  constructor(HTML, getChapter) {
	    this.html = HTML;
	    this.frame = HTML.bigImageFrame;
	    this.fragment = new DocumentFragment();
	    this.imgScaleBar = HTML.imgScaleBar;
	    this.debouncer = new Debouncer();
	    this.throttler = new Debouncer("throttle");
	    this.lockInit = false;
	    this.getChapter = getChapter;
	    this.resetStickyMouse();
	    this.initFrame();
	    this.initImgScaleBar();
	    this.initImgScaleStyle();
	    this.initHammer();
	    EBUS.subscribe("pf-change-chapter", (index) => this.chapterIndex = Math.max(0, index));
	    EBUS.subscribe("imf-on-click", (imf) => this.show(imf));
	    EBUS.subscribe("imf-on-finished", (index, success, imf) => {
	      if (imf.chapterIndex !== this.chapterIndex)
	        return;
	      if (!this.visible || !success)
	        return;
	      const elements = [
	        ...this.elements.curr.map((e, i) => ({ img: e, eleIndex: i, key: "curr" })),
	        ...this.elements.prev.map((e, i) => ({ img: e, eleIndex: i, key: "prev" })),
	        ...this.elements.next.map((e, i) => ({ img: e, eleIndex: i, key: "next" })),
	        ...this.getMediaNodes().map((e, i) => ({ img: e, eleIndex: i, key: "" }))
	      ];
	      const ret = elements.find((o) => index === parseIndex(o.img));
	      if (!ret)
	        return;
	      let { img, eleIndex, key } = ret;
	      if (imf.contentType?.startsWith("video")) {
	        const vid = this.newMediaNode(index, imf);
	        if (["curr", "prev", "next"].includes(key)) {
	          this.elements[key][eleIndex] = vid;
	        }
	        img.replaceWith(vid);
	        img.remove();
	        return;
	      }
	      img.setAttribute("src", imf.blobUrl);
	    });
	    new AutoPage(this, HTML.autoPageBTN);
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
	      if (conf.readMode === "pagination") {
	        switch (ev.direction) {
	          case Hammer.DIRECTION_LEFT:
	            this.stepNext(conf.reversePages ? "prev" : "next");
	            break;
	          case Hammer.DIRECTION_UP:
	            this.stepNext("next");
	            break;
	          case Hammer.DIRECTION_RIGHT:
	            this.stepNext(conf.reversePages ? "next" : "prev");
	            break;
	          case Hammer.DIRECTION_DOWN:
	            this.stepNext("prev");
	            break;
	        }
	      }
	    });
	  }
	  resetStickyMouse() {
	    this.lastMouse = void 0;
	  }
	  flushImgScaleBar() {
	    q("#img-scale-status", this.imgScaleBar).innerHTML = `${conf.imgScale}%`;
	    q("#img-scale-progress-inner", this.imgScaleBar).style.width = `${conf.imgScale}%`;
	  }
	  initFrame() {
	    this.frame.addEventListener("wheel", (event) => this.onWheel(event, true));
	    this.frame.addEventListener("click", (event) => this.hidden(event));
	    this.frame.addEventListener("contextmenu", (event) => event.preventDefault());
	    const debouncer = new Debouncer("throttle");
	    this.frame.addEventListener("mousemove", (event) => {
	      debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
	        if (this.lastMouse)
	          this.stickyMouse(event, this.lastMouse);
	        this.lastMouse = { x: event.clientX, y: event.clientY };
	      }, 5);
	    });
	  }
	  initImgScaleBar() {
	    q("#img-increase-btn", this.imgScaleBar).addEventListener("click", () => this.scaleBigImages(1, 5));
	    q("#img-decrease-btn", this.imgScaleBar).addEventListener("click", () => this.scaleBigImages(-1, 5));
	    q("#img-scale-reset-btn", this.imgScaleBar).addEventListener("click", () => this.resetScaleBigImages(true));
	    const progress = q("#img-scale-progress", this.imgScaleBar);
	    onMouse(progress, (percent) => this.scaleBigImages(0, 0, percent));
	  }
	  hidden(event) {
	    if (event && event.target && event.target.tagName === "SPAN")
	      return;
	    this.visible = false;
	    EBUS.emit("bifm-on-hidden");
	    this.html.fullViewGrid.focus();
	    this.frameScrollAbort?.abort();
	    this.frame.classList.add("big-img-frame-collapse");
	    this.debouncer.addEvent("TOGGLE-CHILDREN", () => this.resetElements(), 200);
	  }
	  show(imf) {
	    this.visible = true;
	    this.frame.classList.remove("big-img-frame-collapse");
	    this.frame.focus();
	    this.frameScrollAbort = new AbortController();
	    this.frame.addEventListener("scroll", () => this.onScroll(), { signal: this.frameScrollAbort.signal });
	    this.debouncer.addEvent("TOGGLE-CHILDREN-D", () => imf.chapterIndex === this.chapterIndex && this.setNow(imf), 100);
	    EBUS.emit("bifm-on-show");
	  }
	  setNow(imf, oriented) {
	    if (this.visible) {
	      this.resetStickyMouse();
	      this.initElements(imf, oriented);
	    } else {
	      const queue = this.getChapter(this.chapterIndex).queue;
	      const index = queue.indexOf(imf);
	      if (index === -1)
	        return;
	      EBUS.emit("ifq-do", index, imf, oriented || "next");
	    }
	  }
	  initElements(imf, oriented = "next") {
	    this.resetPreventStep();
	    const queue = this.getChapter(this.chapterIndex).queue;
	    const index = queue.indexOf(imf);
	    if (index === -1)
	      return;
	    if (conf.readMode === "continuous") {
	      this.resetElements();
	      this.elements.curr[0] = this.newMediaNode(index, imf);
	      this.frame.appendChild(this.elements.curr[0]);
	      this.tryExtend();
	      this.hammer?.get("swipe").set({ enable: false });
	    } else {
	      this.balanceElements(index, queue, oriented);
	      this.placeElements();
	      this.checkFrameOverflow();
	      this.hammer?.get("swipe").set({ enable: true });
	    }
	    EBUS.emit("ifq-do", index, imf, oriented);
	    this.elements.curr[0]?.scrollIntoView();
	  }
	  placeElements() {
	    this.removeMediaNode();
	    this.elements.curr.forEach((element) => this.frame.appendChild(element));
	    this.elements.prev.forEach((element) => this.fragment.appendChild(element));
	    this.elements.next.forEach((element) => this.fragment.appendChild(element));
	    const vid = this.elements.curr[0];
	    if (vid && vid instanceof HTMLVideoElement) {
	      if (vid.paused)
	        this.tryPlayVideo(vid);
	    }
	  }
	  balanceElements(index, queue, oriented) {
	    const indices = { prev: [], curr: [], next: [] };
	    for (let i = 0; i < conf.paginationIMGCount; i++) {
	      const prevIndex = i + index - conf.paginationIMGCount;
	      const currIndex = i + index;
	      const nextIndex = i + index + conf.paginationIMGCount;
	      if (prevIndex > -1)
	        indices.prev.push(prevIndex);
	      if (currIndex > -1 && currIndex < queue.length)
	        indices.curr.push(currIndex);
	      if (nextIndex < queue.length)
	        indices.next.push(nextIndex);
	    }
	    console.log("balanceElements", indices);
	    if (oriented === "next") {
	      this.elements.prev = this.elements.curr;
	      this.elements.curr = this.elements.next;
	      this.elements.next = [];
	    } else {
	      this.elements.next = this.elements.curr;
	      this.elements.curr = this.elements.prev;
	      this.elements.prev = [];
	    }
	    Object.entries(indices).forEach(([k, indexRange]) => {
	      const elements = this.elements[k];
	      if (elements.length > indexRange.length) {
	        elements.splice(indexRange.length, elements.length - indexRange.length).forEach((ele) => ele.remove());
	      }
	      for (let j = 0; j < indexRange.length; j++) {
	        if (indexRange[j] === parseIndex(elements[j]))
	          continue;
	        if (elements[j])
	          elements[j].remove();
	        elements[j] = this.newMediaNode(indexRange[j], queue[indexRange[j]]);
	      }
	    });
	  }
	  resetElements() {
	    this.elements = { prev: [], curr: [], next: [] };
	    this.fragment.childNodes.forEach((child) => child.remove());
	    this.removeMediaNode();
	  }
	  removeMediaNode() {
	    this.vidController?.detach();
	    this.vidController?.hidden();
	    this.getMediaNodes().forEach((ele) => {
	      if (ele instanceof HTMLVideoElement) {
	        ele.pause();
	      }
	      ele.remove();
	    });
	  }
	  getMediaNodes() {
	    const list = Array.from(this.frame.querySelectorAll("img, video"));
	    let last = 0;
	    for (const ele of list) {
	      const index = parseIndex(ele);
	      if (index < last) {
	        throw new Error("BIFM: getMediaNodes: list is not ordered by d-index");
	      }
	      last = index;
	    }
	    return list;
	  }
	  stepNext(oriented, current) {
	    let index = current !== void 0 ? current : this.elements.curr[0] ? parseInt(this.elements.curr[0].getAttribute("d-index")) : void 0;
	    if (index === void 0 || isNaN(index))
	      return;
	    const queue = this.getChapter(this.chapterIndex)?.queue;
	    if (!queue || queue.length === 0)
	      return;
	    index = oriented === "next" ? index + conf.paginationIMGCount : index - conf.paginationIMGCount;
	    if (index < -conf.paginationIMGCount)
	      index = queue.length - 1;
	    if (!queue[index])
	      return;
	    this.setNow(queue[index], oriented);
	  }
	  // isMouse: onWheel triggered by mousewheel, if not, means by keyboard control
	  onWheel(event, isMouse, preventCallback) {
	    if (!preventCallback)
	      this.callbackOnWheel?.(event);
	    if (event.buttons === 2) {
	      event.preventDefault();
	      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
	      return;
	    }
	    if (conf.readMode === "continuous")
	      return;
	    const oriented = event.deltaY > 0 ? "next" : "prev";
	    if (conf.stickyMouse === "disable") {
	      if (!this.isReachedBoundary(oriented))
	        return;
	      if (isMouse && this.tryPreventStep())
	        return;
	    }
	    event.preventDefault();
	    this.stepNext(oriented);
	  }
	  onScroll() {
	    if (conf.readMode === "continuous") {
	      this.consecutive();
	    }
	  }
	  resetPreventStep(fin) {
	    this.preventStep.ani?.cancel();
	    this.preventStep.ele?.remove();
	    this.preventStep = { fin: fin ?? false };
	  }
	  // prevent scroll to next page while mouse scrolling;
	  tryPreventStep() {
	    if (!conf.imgScale || conf.imgScale === 0 || conf.preventScrollPageTime === 0) {
	      return false;
	    }
	    if (this.preventStep.fin) {
	      this.resetPreventStep();
	      return false;
	    } else {
	      if (!this.preventStep.ele) {
	        const lockEle = document.createElement("div");
	        lockEle.style.width = "100vw";
	        lockEle.style.position = "fixed";
	        lockEle.style.display = "flex";
	        lockEle.style.justifyContent = "center";
	        lockEle.style.bottom = "0px";
	        lockEle.innerHTML = `<div style="width: 30vw;height: 0.4rem;background-color: #ff8181d6;text-align: center;font-size: 0.8rem;position: relative;font-weight: 800;color: gray;border-radius: 7px;border: 1px solid #510000;"><span style="position: absolute;bottom: -3px;"></span></div>`;
	        this.frame.appendChild(lockEle);
	        const ani = lockEle.children[0].animate([{ width: "30vw" }, { width: "0vw" }], { duration: conf.preventScrollPageTime });
	        this.preventStep = { ele: lockEle, ani, fin: false };
	        ani.onfinish = () => this.resetPreventStep(true);
	        ani.oncancel = () => this.resetPreventStep(true);
	      }
	      return true;
	    }
	  }
	  isReachedBoundary(oriented) {
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
	        if (!this.elements.curr[0])
	          return;
	        const distance2 = this.getRealOffsetTop(this.elements.curr[0]) - this.frame.scrollTop;
	        if (this.tryReduce()) {
	          this.restoreScrollTop(this.elements.curr[0], distance2);
	        }
	      }, 500);
	      let mediaNodes = this.getMediaNodes();
	      let index = this.findMediaNodeIndexOnCenter(mediaNodes);
	      const centerNode = mediaNodes[index];
	      if (this.elements.curr[0] !== centerNode) {
	        const oldIndex = parseIndex(this.elements.curr[0]);
	        const newIndex = parseIndex(centerNode);
	        const oriented = oldIndex < newIndex ? "next" : "prev";
	        const queue = this.getChapter(this.chapterIndex).queue;
	        if (queue.length === 0 || newIndex < 0 || newIndex > queue.length - 1)
	          return;
	        const imf = queue[newIndex];
	        EBUS.emit("ifq-do", newIndex, imf, oriented);
	        if (this.elements.curr[0] instanceof HTMLVideoElement) {
	          this.elements.curr[0].pause();
	        }
	        this.tryPlayVideo(centerNode);
	      }
	      this.elements.curr[0] = centerNode;
	      const distance = this.getRealOffsetTop(this.elements.curr[0]) - this.frame.scrollTop;
	      if (this.tryExtend() > 0) {
	        this.restoreScrollTop(this.elements.curr[0], distance);
	      }
	    }, 60);
	  }
	  restoreScrollTop(imgNode, distance) {
	    this.frame.scrollTop = this.getRealOffsetTop(imgNode) - distance;
	  }
	  getRealOffsetTop(imgNode) {
	    return imgNode.offsetTop;
	  }
	  tryExtend() {
	    let indexOffset = 0;
	    let mediaNodes = [];
	    let scrollTopFix = 0;
	    while (true) {
	      mediaNodes = this.getMediaNodes();
	      const frist = mediaNodes[0];
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
	      mediaNodes = this.getMediaNodes();
	      const last = mediaNodes[mediaNodes.length - 1];
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
	    const imgNodes = this.getMediaNodes();
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
	  extendImgNode(mediaNode, oriented) {
	    let extendedNode;
	    const index = parseInt(mediaNode.getAttribute("d-index"));
	    if (isNaN(index)) {
	      throw new Error("BIFM: extendImgNode: media node index is NaN");
	    }
	    const queue = this.getChapter(this.chapterIndex).queue;
	    if (queue.length === 0)
	      return null;
	    if (oriented === "prev") {
	      if (index === 0)
	        return null;
	      extendedNode = this.newMediaNode(index - 1, queue[index - 1]);
	      mediaNode.before(extendedNode);
	    } else {
	      if (index === queue.length - 1)
	        return null;
	      extendedNode = this.newMediaNode(index + 1, queue[index + 1]);
	      mediaNode.after(extendedNode);
	    }
	    return extendedNode;
	  }
	  newMediaNode(index, imf) {
	    if (!imf)
	      throw new Error("BIFM: newMediaNode: img fetcher is null");
	    if (imf.contentType?.startsWith("video")) {
	      const vid = document.createElement("video");
	      vid.classList.add("bifm-img");
	      vid.classList.add("bifm-vid");
	      vid.setAttribute("d-index", index.toString());
	      vid.onloadeddata = () => {
	        if (this.visible && vid === this.elements.curr[0]) {
	          this.tryPlayVideo(vid);
	        }
	      };
	      vid.src = imf.blobUrl;
	      return vid;
	    } else {
	      const img = document.createElement("img");
	      img.decoding = "sync";
	      img.classList.add("bifm-img");
	      img.setAttribute("d-index", index.toString());
	      if (imf.stage === FetchState.DONE) {
	        img.src = imf.blobUrl;
	      } else {
	        img.src = imf.node.src;
	      }
	      return img;
	    }
	  }
	  tryPlayVideo(vid) {
	    if (vid instanceof HTMLVideoElement) {
	      if (!this.vidController) {
	        this.vidController = new VideoControl(this.html.root);
	      }
	      this.vidController.attach(vid);
	    } else {
	      this.vidController?.hidden();
	    }
	  }
	  /**
	   * @param fix: 1 or -1, means scale up or down
	   * @param rate: step of scale, eg: current scale is 80, rate is 10, then new scale is 90
	   * @param _percent: directly set width percent
	   */
	  scaleBigImages(fix, rate, _percent) {
	    const rule = queryCSSRules(this.html.styleSheel, ".bifm-img");
	    if (!rule)
	      return 0;
	    let percent = _percent || parseInt(conf.readMode === "pagination" ? rule.style.height : rule.style.width);
	    if (isNaN(percent))
	      percent = 100;
	    percent = percent + rate * fix;
	    switch (conf.readMode) {
	      case "pagination":
	        percent = Math.max(percent, 100);
	        percent = Math.min(percent, 300);
	        rule.style.height = `${percent}vh`;
	        break;
	      case "continuous":
	        percent = Math.max(percent, 20);
	        percent = Math.min(percent, 100);
	        rule.style.width = `${percent}vw`;
	        break;
	    }
	    if (conf.readMode === "pagination") {
	      this.checkFrameOverflow();
	      rule.style.minWidth = percent > 100 ? "" : "100vw";
	      if (percent === 100) {
	        this.resetScaleBigImages(true);
	        return 100;
	      }
	    }
	    conf.imgScale = percent;
	    saveConf(conf);
	    this.flushImgScaleBar();
	    return percent;
	  }
	  checkFrameOverflow() {
	    const flexRule = queryCSSRules(this.html.styleSheel, ".bifm-flex");
	    if (flexRule) {
	      if (this.frame.offsetWidth < this.frame.scrollWidth) {
	        flexRule.style.justifyContent = "flex-start";
	      } else {
	        flexRule.style.justifyContent = "center";
	      }
	    }
	  }
	  resetScaleBigImages(syncConf) {
	    const rule = queryCSSRules(this.html.styleSheel, ".bifm-img");
	    if (!rule)
	      return;
	    rule.style.minWidth = "";
	    rule.style.minHeight = "";
	    rule.style.maxWidth = "";
	    rule.style.maxHeight = "";
	    rule.style.height = "";
	    rule.style.width = "";
	    rule.style.margin = "";
	    if (conf.readMode === "pagination") {
	      rule.style.height = "100vh";
	      rule.style.margin = "0";
	      if (conf.paginationIMGCount === 1)
	        rule.style.minWidth = "100vw";
	    } else {
	      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
	      rule.style.maxWidth = "100vw";
	      rule.style.width = isMobile ? "100vw" : "80vw";
	      rule.style.margin = "0 auto";
	    }
	    if (syncConf) {
	      conf.imgScale = 0;
	      saveConf(conf);
	    }
	    this.flushImgScaleBar();
	  }
	  initImgScaleStyle() {
	    this.resetScaleBigImages(false);
	    if (conf.imgScale && conf.imgScale > 0) {
	      this.scaleBigImages(1, 0, conf.imgScale);
	    }
	  }
	  stickyMouse(event, lastMouse) {
	    if (conf.readMode !== "pagination" || conf.stickyMouse === "disable")
	      return;
	    let [distanceY, distanceX] = [event.clientY - lastMouse.y, event.clientX - lastMouse.x];
	    if (conf.stickyMouse === "enable")
	      [distanceY, distanceX] = [-distanceY, -distanceX];
	    const overflowY = this.frame.scrollHeight - this.frame.offsetHeight;
	    if (overflowY > 0) {
	      const rateY = overflowY / (this.frame.offsetHeight / 4) * 3;
	      let scrollTop = this.frame.scrollTop + distanceY * rateY;
	      scrollTop = Math.max(scrollTop, 0);
	      scrollTop = Math.min(scrollTop, overflowY);
	      this.frame.scrollTop = scrollTop;
	    }
	    const overflowX = this.frame.scrollWidth - this.frame.offsetWidth;
	    if (overflowX > 0) {
	      const rateX = overflowX / (this.frame.offsetWidth / 4) * 3;
	      let scrollLeft = this.frame.scrollLeft + distanceX * rateX;
	      if (conf.reversePages) {
	        scrollLeft = Math.min(scrollLeft, 0);
	        scrollLeft = Math.max(scrollLeft, -overflowX);
	      } else {
	        scrollLeft = Math.max(scrollLeft, 0);
	        scrollLeft = Math.min(scrollLeft, overflowX);
	      }
	      this.frame.scrollLeft = scrollLeft;
	    }
	  }
	  findMediaNodeIndexOnCenter(imgNodes) {
	    const centerLine = this.frame.offsetHeight / 2;
	    for (let i = 0; i < imgNodes.length; i++) {
	      const imgNode = imgNodes[i];
	      const realOffsetTop = imgNode.offsetTop - this.frame.scrollTop;
	      if (realOffsetTop < centerLine && realOffsetTop + imgNode.offsetHeight >= centerLine) {
	        return i;
	      }
	    }
	    return 0;
	  }
	}
	class AutoPage {
	  bifm;
	  status;
	  button;
	  lockVer;
	  restart;
	  constructor(BIFM, root) {
	    this.bifm = BIFM;
	    this.status = "stop";
	    this.button = root;
	    this.lockVer = 0;
	    this.restart = false;
	    this.bifm.callbackOnWheel = () => {
	      if (this.status === "running") {
	        this.stop();
	        this.start(this.lockVer);
	      }
	    };
	    EBUS.subscribe("bifm-on-hidden", () => this.stop());
	    EBUS.subscribe("bifm-on-show", () => conf.autoPlay && this.start(this.lockVer));
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
	    const b = this.bifm.frame;
	    if (this.bifm.frame.classList.contains("big-img-frame-collapse")) {
	      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
	      if (queue.length === 0)
	        return;
	      const index = Math.max(parseIndex(this.bifm.elements.curr[0]), 0);
	      this.bifm.show(queue[index]);
	    }
	    const progress = q("#auto-page-progress", this.button);
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
	      if (this.bifm.elements.curr.length === 0)
	        break;
	      const index = parseInt(this.bifm.elements.curr[0]?.getAttribute("d-index"));
	      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
	      if (index < 0 || index >= queue.length)
	        break;
	      const deltaY = this.bifm.frame.offsetHeight / 2;
	      if (this.bifm.isReachedBoundary("next")) {
	        this.bifm.onWheel(new WheelEvent("wheel", { deltaY }), false, true);
	        if (conf.readMode === "pagination")
	          continue;
	      }
	      b.scrollBy({ top: deltaY, behavior: "smooth" });
	    }
	    this.stop();
	  }
	  stop() {
	    this.status = "stop";
	    const progress = q("#auto-page-progress", this.button);
	    progress.style.animation = ``;
	    this.lockVer += 1;
	    this.button.firstElementChild.innerText = i18n.autoPagePlay.get();
	  }
	}
	function parseIndex(ele) {
	  if (!ele)
	    return -1;
	  const d = ele.getAttribute("d-index") || "";
	  const i = parseInt(d);
	  return isNaN(i) ? -1 : i;
	}

	function revertMonkeyPatch(element) {
	  const originalScrollTo = Element.prototype.scrollTo;
	  Object.defineProperty(element, "scrollTo", {
	    value: originalScrollTo,
	    writable: true,
	    configurable: true
	  });
	}

	function main(MATCHER) {
	  const HTML = createHTML();
	  [HTML.fullViewGrid, HTML.bigImageFrame].forEach((e) => revertMonkeyPatch(e));
	  const IFQ = IMGFetcherQueue.newQueue();
	  const IL = new IdleLoader(IFQ);
	  const PF = new PageFetcher(IFQ, MATCHER);
	  const DL = new Downloader(HTML, IFQ, IL, PF, MATCHER);
	  const PH = new PageHelper(HTML, (index) => PF.chapters[index]);
	  const BIFM = new BigImageFrameManager(HTML, (index) => PF.chapters[index]);
	  const FVGM = new FullViewGridManager(HTML, BIFM);
	  const events = initEvents(HTML, BIFM, FVGM, IFQ, PF, IL, PH);
	  addEventListeners(events, HTML, BIFM, DL);
	  EBUS.subscribe("downloader-canvas-on-click", (index) => {
	    IFQ.currIndex = index;
	    if (IFQ.chapterIndex !== BIFM.chapterIndex)
	      return;
	    BIFM.show(IFQ[index]);
	  });
	  PF.beforeInit = () => HTML.pageLoading.style.display = "flex";
	  PF.afterInit = () => {
	    HTML.pageLoading.style.display = "none";
	    IL.processingIndexList = [0];
	    IL.start();
	  };
	  if (conf["first"]) {
	    events.showGuideEvent();
	    conf["first"] = false;
	    saveConf(conf);
	  }
	  if (conf.autoOpen)
	    events.main(true);
	  return () => {
	    console.log("destory eh-view-enhance");
	    PF.abort();
	    IL.abort();
	    IFQ.length = 0;
	    EBUS.reset();
	    HTML.root.remove();
	    return sleep(500);
	  };
	}
	(() => {
	  let oldPushState = history.pushState;
	  history.pushState = function pushState(...args) {
	    let ret = oldPushState.apply(this, args);
	    window.dispatchEvent(new Event("pushstate"));
	    window.dispatchEvent(new Event("locationchange"));
	    return ret;
	  };
	  let oldReplaceState = history.replaceState;
	  history.replaceState = function replaceState(...args) {
	    let ret = oldReplaceState.apply(this, args);
	    window.dispatchEvent(new Event("replacestate"));
	    window.dispatchEvent(new Event("locationchange"));
	    return ret;
	  };
	  window.addEventListener("popstate", () => {
	    window.dispatchEvent(new Event("locationchange"));
	  });
	})();
	let destoryFunc;
	const debouncer = new Debouncer();
	window.addEventListener("locationchange", () => {
	  debouncer.addEvent("LOCATION-CHANGE", () => {
	    const newStart = () => {
	      if (document.querySelector(".ehvp-root"))
	        return;
	      const matcher2 = adaptMatcher(window.location.href);
	      matcher2 && (destoryFunc = main(matcher2));
	    };
	    if (destoryFunc) {
	      console.log("locationchange");
	      destoryFunc().then(newStart);
	    } else {
	      newStart();
	    }
	  }, 10);
	});
	const matcher = adaptMatcher(window.location.href);
	if (matcher !== null) {
	  destoryFunc = main(matcher);
	}

})();