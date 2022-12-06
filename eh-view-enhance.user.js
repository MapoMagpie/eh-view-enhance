// ==UserScript==
// @name          E-HENTAI-VIEW-ENHANCE
// @name:zh-CN    E-HENTAI-VIEW-ENHANCE
// @namespace     https://github.com/MapoMagpie/eh-view-enhance
// @homepageURL   https://github.com/MapoMagpie/eh-view-enhance
// @version       3.0.5
// @license       MIT
// @description   e-hentai.org better viewer, All of thumbnail images exhibited in grid, and show the best quality image.
// @description:zh-CN   强化E绅士看图体验
// @author        MapoMagpie
// @author        zsyjklive.cn
// @match         https://exhentai.org/g/*
// @match         https://e-hentai.org/g/*
// @connect       hath.network
// @icon          https://exhentai.org/favicon.ico
// @grant         GM.xmlHttpRequest
// @require       https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// @require       https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @updateURL     https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js     
// ==/UserScript==

const regulars = {
  // 有压缩的大图地址
  normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
  // 原图地址
  original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai\.org\/fullimg\.php\?[^"\\]*)\"\>/,
  // 大图重载地址
  nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
  // 是否开启自动多页查看器
  isMPV: /https?:\/\/e[-x]hentai.org\/mpv\/\w+\/\w+\/#page\w/,
  // 多页查看器图片列表提取
  mpvImageList: /\{"n":"(.*?)","k":"(\w+)","t":"(.*?)".*?\}/g,
};

//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================START
class IMGFetcher {
  constructor(node) {
    this.node = node;
    this.imgElement = node.childNodes[0];
    this.pageUrl = this.imgElement.getAttribute("ahref");
    //当前处理阶段，1: 获取大图地址 2: 获取大图数据 3: 加载完成
    this.stage = 1;
    this.tryTime = 0;
    this.lock = false;
    this.rendered = false;
    this.blobData = undefined;
    this.title = this.imgElement.getAttribute("title");
    /**
     * 下载状态
     * total: 图片数据量
     * loaded: 已下载的数据量
     * readyState: 0未开始下载; 1-3下载中; 4下载完毕
     * rate:下载速率
     */
    this.downloadState = { total: 100, loaded: 0, readyState: 0, rate: 0 };
    /**
     * 当获取完成时的回调函数，从其他地方进行事件注册
     */
    this.onFinishedEventContext = new Map();
    this.fetchOriginal = false;
  }

  // 刷新下载状态
  setDownloadState(newDLState) {
    const increased = (newDLState.loaded || 0) - this.downloadState.loaded;
    this.downloadState.rate = increased;
    this.downloadState = { ...this.downloadState, ...newDLState };
    if (this.downloadState.readyState === 4) {
      if (this.downloadBar) {
        this.downloadBar.remove();
      }
      return;
    }
    if (!this.downloadBar) {
      this.downloadBar = document.createElement("div");
      this.downloadBar.classList.add("downloadBar");
      this.downloadBar.innerHTML = `
      <progress style="position: absolute; width: 100%; height: 10px;" value="0" max="100" />
      `;
      this.node.appendChild(this.downloadBar);
    }
    [...this.downloadBar.childNodes].filter((node) => node.nodeType === 1)[0].value = (this.downloadState.loaded / this.downloadState.total) * 100;
    downloaderCanvas.drawDebouce();
  }

  async start(index) {
    if (this.lock) return;
    this.lock = true;
    try {
      this.changeStyle("add");
      if (!(await this.fetchImg())) {
        throw new Error("图片获取器失败，中止获取！");
      }
      this.changeStyle("remove", "success");
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } catch (error) {
      this.changeStyle("remove", "failed");
      evLog(`图片获取器获取失败:`, error);
    } finally {
      this.lock = false;
    }
  }

  onFinished(eventId, callback) {
    this.onFinishedEventContext.set(eventId, callback);
  }

  async fetchImg() {
    switch (this.stage) {
      case 1:
        return await this.stage1FetchUrl();
      case 2:
        return await this.stage2FetchImg();
      case 3:
        return this.stage3Done();
    }
  }

  // 阶段一：获取大图的地址
  async stage1FetchUrl() {
    try {
      this.changeStyle("add");
      if (!(await this.fetchBigImageUrl())) {
        evLog("获取大图地址失败");
        return false;
      }
      //成功获取到大图的地址后，将本图片获取器的状态修改为1，表示大图地址已经成功获取到
      if (!this.bigImageUrl) {
        evLog("大图地址不存在！");
        return false;
      }
      this.stage = 2;
      return this.fetchImg();
    } catch (error) {
      evLog(`获取大图地址时出现了异常:`, error);
      return false;
    }
  }
  // 阶段二：获取大图数据
  async stage2FetchImg() {
    this.setDownloadState(this.downloadState);
    try {
      let ok = false;
      if (conf["disableDownload"]) {
        ok = await this.fetchBigImageWeird();
      } else {
        ok = await this.fetchBigImage();
      }
      if (!ok) {
        throw new Error(`获取大图数据失败,大图地址:${this.bigImageUrl}`);
      }
      this.stage = 3;
      return this.fetchImg();
    } catch (error) {
      evLog(`获取大图数据时出现了异常:`, error);
      //如果失败了，则进行重试，重试会进行2次
      ++this.tryTime;
      this.stage = 1;
      // 重试2次后，直接失败，避免无限请求
      evLog(`当前重试第${this.tryTime}次`);
      if (this.tryTime > 2) {
        return false;
      }
      return this.fetchImg();
    }
  }
  // 阶段三：获取器结束
  stage3Done() {
    return true;
  }

  render() {
    if (this.rendered) return;
    // this.imgElement.style.height = "auto";
    this.imgElement.src = this.imgElement.getAttribute("asrc");
    this.rendered = true;
  }

  //立刻将当前元素的src赋值给大图元素
  setNow(index) {
    BIFM.setNow(index);
    if (this.stage === 3) {
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } else {
      pageHandler("fetching");
    }
    pageHandler("updateCurrPage", index + 1);
  }

  /**
   *  获取大图地址
   * @param {是否为重新换源状态，为true时，不再进行新的换源动作，避免无限递归} originChanged
   * @return boolean
   */
  async fetchBigImageUrl(originChanged) {
    let text = "";
    try {
      text = await window.fetch(this.pageUrl).then(resp => resp.text());
    } catch (error) {
      evLog("获取大图页面内容失败！", error);
    }
    if (!text) return false;
    //抽取最佳质量的图片的地址
    if (conf["fetchOriginal"] || this.fetchOriginal) {
      const matchs = regulars["original"].exec(text);
      if (matchs && matchs.length > 0) {
        this.bigImageUrl = matchs[1].replace(/&amp;/g, "&");
      } else {
        const normalMatchs = regulars["normal"].exec(text);
        if (normalMatchs == null || normalMatchs.length == 0) {
          evLog("获取大图地址失败，内容为: ", text);
          return false;
        } else {
          this.bigImageUrl = normalMatchs[1];
        }
      }
      return true;
    }
    //抽取正常的有压缩的大图地址
    if (this.tryTime === 0 || originChanged) {
      this.bigImageUrl = regulars["normal"].exec(text)[1];
      return true;
    } else { //如果是重试状态,则进行换源
      const nlValue = regulars["nlValue"].exec(text)[1];
      this.pageUrl += ((this.pageUrl + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
      evLog(`获取到重试地址:${this.pageUrl}`);
      return await this.fetchBigImageUrl(true);
    }
  }

  async fetchBigImageWeird() {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      imgFetcher.imgElement.onloadend = () => {
        window.clearTimeout(imgFetcher.timeoutId);
        imgFetcher.setDownloadState({ total: 1, loaded: 1, readyState: 4 });
        resolve(true);
      };
      imgFetcher.imgElement.onloadstart = () => {
        imgFetcher.timeoutId = window.setTimeout(() => {
          imgFetcher.imgElement.onloadstart = null;
          imgFetcher.imgElement.onloadend = null;
          imgFetcher.imgElement.src = this.imgElement.getAttribute("asrc");
          resolve(false);
        }, conf["timeout"] * 1000);
      };
      imgFetcher.blobUrl = imgFetcher.bigImageUrl;
      imgFetcher.imgElement.src = imgFetcher.blobUrl;
      imgFetcher.rendered = true;
    });
  }

  async fetchBigImage() {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      xhrWapper(imgFetcher.bigImageUrl, "blob", {
        onload: function (response) {
          let data = response.response;
          if (!(data instanceof Blob)) throw new Error("未下载到有效的数据！");
          imgFetcher.blobData = data;
          imgFetcher.blobUrl = URL.createObjectURL(data);
          imgFetcher.imgElement.src = imgFetcher.blobUrl;
          imgFetcher.rendered = true;
          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
          resolve(true);
        },
        onerror: function (response) {
          evLog("加载大图失败:", response);
          resolve(false);
        },
        ontimeout: function (response) {
          evLog("加载大图超时:", response);
          resolve(false);
        },
        onprogress: function (response) {
          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
        },
      });
    });
  }

  changeStyle(action, fetchStatus) {
    if (action === "remove") {
      //当获取到内容，或者获取失败，则移除本缩略图的边框效果
      this.imgElement.classList.remove("fetching");
    } else if (action === "add") {
      //给当前缩略图元素添加一个获取中的边框样式
      this.imgElement.classList.add("fetching");
    }
    if (fetchStatus === "success") {
      this.imgElement.classList.add("fetched");
      this.imgElement.classList.remove("fetch-failed");
    } else if (fetchStatus === "failed") {
      this.imgElement.classList.add("fetch-failed");
      this.imgElement.classList.remove("fetched");
    }
  }
}

class IMGFetcherQueue extends Array {
  constructor() {
    super();
    //可执行队列
    this.executableQueue = [];
    //当前的显示的大图的图片请求器所在的索引
    this.currIndex = 0;
    //已经完成加载的
    this.finishedIndex = [];
    this.debouncer = new Debouncer();
  }

  isFinised() {
    return this.finishedIndex.length === this.length;
  }

  push(...IFs) {
    IFs.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
    super.push(...IFs);
  }

  unshift(...IFs) {
    IFs.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
    super.unshift(...IFs);
  }

  do(start, oriented) {
    oriented = oriented || "next";
    //边界约束
    this.currIndex = this.fixIndex(start, oriented);
    if (downloader.downloading) {
      //立即加载和展示当前的元素
      this[this.currIndex].setNow(this.currIndex);
      return;
    }
    //立即中止空闲加载器
    idleLoader.abort(this.currIndex);
    //立即加载和展示当前的元素
    this[this.currIndex].setNow(this.currIndex);

    //从当前索引开始往后,放入指定数量的图片获取器,如果该图片获取器已经获取完成则向后延伸.
    //如果最后放入的数量为0,说明已经没有可以继续执行的图片获取器,可能意味着后面所有的图片都已经加载完毕,也可能意味着中间出现了什么错误
    if (!this.pushInExecutableQueue(oriented)) return;

    /* 300毫秒的延迟，在这300毫秒的时间里，可执行队列executableQueue可能随时都会变更，100毫秒过后，只执行最新的可执行队列executableQueue中的图片请求器
            在对大图元素使用滚轮事件的时候，由于速度非常快，大量的IMGFetcher图片请求器被添加到executableQueue队列中，如果调用这些图片请求器请求大图，可能会被认为是爬虫脚本
            因此会有一个时间上的延迟，在这段时间里，executableQueue中的IMGFetcher图片请求器会不断更替，300毫秒结束后，只调用最新的executableQueue中的IMGFetcher图片请求器。
        */
    this.debouncer.addEvent("IFQ-EXECUTABLE", () => {
      this.executableQueue.forEach((imgFetcherIndex) => this[imgFetcherIndex].start(imgFetcherIndex));
    }, 300);
  }

  //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
  finishedReport(index) {
    const imgFetcher = this[index];
    if (imgFetcher.stage !== 3) return;
    if (downloader) {
      if (this.finishedIndex.indexOf(index) < 0) {
        downloader.addToDownloadZip(imgFetcher);
      }
    }
    this.pushFinishedIndex(index);
    if (downloader && downloader.downloading && this.isFinised()) {
      downloader.download();
    }
    pageHandler("updateFinished", this.finishedIndex.length);
    evLog(`第${index + 1}张完成，大图所在第${this.currIndex + 1}张`);
    if (index !== this.currIndex) return;
    pageHandler("fetched");
    this.scrollTo(index);
  }

  scrollTo(index) {
    const imgFetcher = this[index];
    let scrollTo = imgFetcher.node.offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= fullViewPlane.scrollHeight ? fullViewPlane.scrollHeight : scrollTo;
    fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" });
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
   * @param {方向 前后} oriented
   * @returns 是否添加成功
   */
  pushInExecutableQueue(oriented) {
    //把要执行获取器先放置到队列中，延迟执行
    this.executableQueue = [];
    for (let count = 0, index = this.currIndex; this.pushExecQueueSlave(index, oriented, count); oriented === "next" ? ++index : --index) {
      if (this[index].stage === 3) continue;
      this.executableQueue.push(index);
      count++;
    }
    return this.executableQueue.length > 0;
  }

  // 如果索引已到达边界且添加数量在配置最大同时获取数量的范围内
  pushExecQueueSlave(index, oriented, count) {
    return ((oriented === "next" && index < this.length) || (oriented === "prev" && index > -1)) && count < conf["threads"];
  }

  findIndex(imgElement) {
    for (let index = 0; index < this.length; index++) {
      if (this[index] instanceof IMGFetcher && this[index].imgElement === imgElement) {
        return index;
      }
    }
    return 0;
  }

  pushFinishedIndex(index) {
    const fd = this.finishedIndex;
    if (fd.length === 0) {
      fd.push(index);
      return;
    }
    for (let i = 0; i < fd.length; i++) {
      if (index === fd[i]) return;
      if (index < fd[i]) {
        fd.splice(i, 0, index);
        return;
      }
    }
    fd.push(index);
  }
}

//空闲自加载
class IdleLoader {
  constructor(IFQ) {
    //图片获取器队列
    this.queue = IFQ;
    //当前处理的索引列表
    this.processingIndexList = [0];
    this.lockVer = 0;
    //中止后的用于重新启动的延迟器的id
    this.restartId;
    this.maxWaitMS = 1000;
    this.minWaitMS = 300;
  }

  async start(lockVer) {
    evLog("空闲自加载启动:" + this.processingIndexList.toString());
    //如果被中止了，则停止
    if (this.lockVer != lockVer || !conf["autoLoad"]) return;
    // 如果已经没有要处理的列表
    if (this.processingIndexList.length === 0) {
      return;
    }
    for (let i = 0; i < this.processingIndexList.length; i++) {
      const processingIndex = this.processingIndexList[i];
      // 获取索引所对应的图片获取器，并添加完成事件，当图片获取完成时，重新查找新的可获取的图片获取器，并递归
      const imgFetcher = this.queue[processingIndex];
      // 当图片获取器还没有获取图片时，则启动图片获取器
      if (imgFetcher.lock || imgFetcher.stage === 3) {
        continue;
      }
      imgFetcher.onFinished("IDLE-REPORT", () => {
        this.wait().then(() => {
          this.checkProcessingIndex(i);
          this.start(lockVer);
        });
      });
      imgFetcher.start(processingIndex);
    }
  }

  /**
   * @param {当前处理列表中的位置} i
   */
  checkProcessingIndex(i) {
    const processedIndex = this.processingIndexList[i];
    let restart = false;
    // 从图片获取器队列中获取一个还未获取图片的获取器所对应的索引，如果不存在则从处理列表中删除该索引，缩减处理列表
    for (let j = processedIndex, max = this.queue.length - 1; j <= max; j++) {
      const imgFetcher = this.queue[j];
      // 如果图片获取器正在获取或者图片获取器已完成获取，
      if (imgFetcher.stage === 3 || imgFetcher.lock) {
        if (j === max && !restart) {
          j = -1;
          max = processedIndex - 1;
          restart = true;
        }
        continue;
      }
      this.processingIndexList[i] = j;
      return;
    }
    this.processingIndexList.splice(i, 1);
  }

  async wait() {
    const { maxWaitMS, minWaitMS } = this;
    return new Promise(function (resolve) {
      const time = Math.floor(Math.random() * maxWaitMS + minWaitMS);
      window.setTimeout(() => resolve(), time);
    });
  }

  abort(newIndex) {
    this.lockVer++;
    evLog(`终止空闲自加载, 下次将从第${this.processingIndexList[0] + 1}张开始加载`);
    if (!conf.autoLoad) return;
    // 中止空闲加载后，会在等待一段时间后再次重启空闲加载
    window.clearTimeout(this.restartId);
    this.restartId = window.setTimeout(() => {
      this.processingIndexList = [newIndex];
      this.checkProcessingIndex(0);
      this.start(this.lockVer);
    }, conf["restartIdleLoader"]);
  }
}

//页获取器，可获取下一个列表页，以及下一个图片页
class PageFetcher {
  constructor(IFQ, idleLoader) {
    this.queue = IFQ;
    //所有页的地址
    this.pageUrls = [];
    //当前页所在的索引
    this.currPage = 0;
    //每页的图片获取器列表，用于实现懒加载
    this.imgAppends = { prev: [], next: [] };
    //平均高度，用于渲染未加载的缩略图,单位px
    this.idleLoader = idleLoader;
    this.fetched = false;
  }

  async init() {
    this.initPageUrls();
    await this.initPageAppend();
    this.loadAllPageImg();
    this.renderCurrView(fullViewPlane.scrollTop, fullViewPlane.clientHeight);
  }

  initPageUrls() {
    const pager = document.querySelector(".gtb");
    if (!pager) {
      throw new Error("未获取到分页元素！");
    }
    const tds = pager.querySelectorAll("td");
    if (!tds || tds.length == 0) {
      throw new Error("未获取到有效的分页元素！");
    }
    const curr = [...tds].filter((p) => p.className.indexOf("ptds") != -1)[0];
    const currPageNum = PageFetcher.findPageNum(!curr ? "" : curr.firstElementChild.href);
    const lastPage = PageFetcher.findPageNum(tds[tds.length - 2].firstElementChild.href);
    const firstPageUrl = tds[1].firstElementChild.href;
    this.pageUrls.push(firstPageUrl);
    for (let i = 1; i <= lastPage; i++) {
      this.pageUrls.push(`${firstPageUrl}?p=${i}`);
      if (i == currPageNum) {
        this.currPage = i;
      }
    }
    evLog("所有页码地址加载完毕:", this.pageUrls);
  }

  async initPageAppend() {
    for (let i = 0; i < this.pageUrls.length; i++) {
      const pageUrl = this.pageUrls[i];
      if (i == this.currPage) {
        await this.appendDefaultPage(pageUrl);
      } else {
        const oriented = i < this.currPage ? "prev" : "next";
        this.imgAppends[oriented].push(async () => await this.appendPageImg(pageUrl, oriented));
      }
    }
  }

  async loadAllPageImg() {
    if (this.fetched) return;
    for (let i = 0; i < this.imgAppends["next"].length; i++) {
      const executor = this.imgAppends["next"][i];
      await executor();
    }
    for (let i = this.imgAppends["prev"].length - 1; i > -1; i--) {
      const executor = this.imgAppends["prev"][i];
      await executor();
    }
  }

  static findPageNum(pageUrl) {
    if (pageUrl) {
      const arr = pageUrl.split("?");
      if (arr && arr.length > 1) {
        return parseInt(/p=(\d*)/.exec(arr[1]).pop());
      }
    }
    return 0;
  }

  async appendDefaultPage(pageUrl) {
    const doc = await this.fetchDocument(pageUrl);
    const imgNodeList = await this.obtainImageNodeList(doc);
    const IFs = imgNodeList.map((imgNode) => new IMGFetcher(imgNode));
    fullViewPlane.firstElementChild.nextElementSibling.after(...imgNodeList);
    this.queue.push(...IFs);
    pageHandler("updateTotal", this.queue.length);
  }

  async appendPageImg(pageUrl, oriented) {
    try {
      const doc = await this.fetchDocument(pageUrl);
      const imgNodeList = await this.obtainImageNodeList(doc);
      const IFs = imgNodeList.map((imgNode) => new IMGFetcher(imgNode));
      switch (oriented) {
        case "prev":
          fullViewPlane.firstElementChild.nextElementSibling.after(...imgNodeList);
          this.queue.unshift(...IFs);
          this.idleLoader.processingIndexList[0] += IFs.length;
          const { node } = this.queue[this.idleLoader.processingIndexList[0]];
          fullViewPlane.scrollTo(0, node.offsetTop);
          break;
        case "next":
          fullViewPlane.lastElementChild.after(...imgNodeList);
          this.queue.push(...IFs);
          break;
      }
      pageHandler("updateTotal", this.queue.length);
      return true;
    } catch (error) {
      evLog(`从下一页或上一页中提取图片元素时出现了错误！`, error);
      return false;
    }
  }

  //从文档的字符串中创建缩略图元素列表
  async obtainImageNodeList(docString) {
    const list = [];
    if (!docString) return list;
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(docString, "text/html");
    const aNodes = doc.querySelectorAll("#gdt a");
    if (!aNodes || aNodes.length == 0) {
      evLog("wried to get a nodes from document, but failed!");
      return list;
    }
    const aNode = aNodes[0];

    // make node template
    const imgNodeTemplate = document.createElement("div");
    imgNodeTemplate.classList.add("img-node");
    const imgTemplate = document.createElement("img");
    imgTemplate.setAttribute("decoding", "async");
    imgTemplate.style.height = "auto";
    imgTemplate.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==");
    imgNodeTemplate.appendChild(imgTemplate);

    // MPV
    if (regulars.isMPV.test(aNode.href)) {
      const mpvDoc = await this.fetchDocument(aNode.href);
      const matchs = mpvDoc.matchAll(regulars.mpvImageList);
      const gid = location.pathname.split("/")[2];
      let i = 0;
      for (const match of matchs) {
        i++;
        const newImgNode = imgNodeTemplate.cloneNode(true);
        const newImg = newImgNode.firstChild;
        newImg.setAttribute("title", match[1]);
        newImg.setAttribute("ahref", `${location.origin}/s/${match[2]}/${gid}-${i}`);
        newImg.setAttribute("asrc", match[3].replaceAll("\\", ""));
        newImg.addEventListener("click", showBigImageEvent);
        list.push(newImgNode);
      }
      this.fetched = true;
    }
    // normal
    else {
      for (const aNode of aNodes) {
        const imgNode = aNode.querySelector("img");
        const newImgNode = imgNodeTemplate.cloneNode(true);
        const newImg = newImgNode.firstChild;
        newImg.setAttribute("ahref", aNode.href);
        newImg.setAttribute("asrc", imgNode.src);
        newImg.setAttribute("title", imgNode.getAttribute("title"));
        newImg.addEventListener("click", showBigImageEvent);
        list.push(newImgNode);
      }
    }
    return list;
  }

  //通过地址请求该页的文档
  async fetchDocument(pageUrl) {
    return await window.fetch(pageUrl).then((response) => response.text());
  }

  /**
   *当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
   * @param {当前滚动位置} currTop
   * @param {窗口高度} clientHeight
   */
  renderCurrView(currTop, clientHeight) {
    // 当前视图，即浏览器显示的内容、滚动到的区域
    // 当前视图上边位置
    const viewTop = currTop;
    // 当前视图下边位置
    const viewButtom = currTop + clientHeight;
    const colCount = conf["colCount"];
    const IFs = this.queue;
    let startRander = 0;
    let endRander = 0;
    for (let i = 0, findBottom = false; i < IFs.length; i += colCount) {
      const { node } = IFs[i];
      // 查询最靠近当前视图上边的缩略图索引
      // 缩略图在父元素的位置 - 当前视图上边位置 = 缩略图与当前视图上边的距离，如果距离 >= 0，说明缩略图在当前视图内
      if (!findBottom) {
        const distance = node.offsetTop - viewTop;
        if (distance >= 0) {
          startRander = Math.max(i - colCount, 0);
          findBottom = true;
        }
      }
      // 查询最靠近当前试图下边的缩略图索引
      if (findBottom) {
        // 当前视图下边的位置 - (缩略图在父元素的位置 + 缩略图的高度)  =  缩略图与当前视图下边的距离，如果距离 <= 0 说明缩略图在当前视图内，但仍有部分图片内容在视图外，当然此缩略图之后的图片也符合这样的条件，但此为顺序遍历
        const distance = viewButtom - (node.offsetTop + node.offsetHeight);
        endRander = Math.min(i + colCount, IFQ.length);
        if (distance <= 0) break;
      }
    }
    evLog(`要渲染的范围是:${startRander + 1}-${endRander + 1}`);
    IFs.slice(startRander, endRander + 1).forEach((f) => f.render());
  }
}

class BigImageFrameManager {
  constructor(bigImageFrameElement, imgFetcherQueue, switchOnWheel) {
    this.frame = bigImageFrameElement;
    this.queue = imgFetcherQueue;
    this.currImageNode = null;
    this.frame.addEventListener("wheel", event => this.onwheel(event));
    this.lockInit = false;
    // 通过滚轮直接切换页
    this.switchOnWheel = switchOnWheel || false;
  }

  setNow() {
    // every time call this.onWheel(), will set this.lockInit to true
    if (this.lockInit) {
      this.lockInit = false;
    } else {
      this.init(this.queue.currIndex);
    }
  }

  init(start) {
    let imgNodes = this.getImgNodes() || [];
    const indexList = [start]; // now just show one image, maybe change to show more
    for (let i = indexList.length - 1; i < imgNodes.length - 1; i++) {
      imgNodes[i].remove();
    }
    for (let i = 0; i < indexList.length - imgNodes.length; i++) {
      this.frame.appendChild(this.createImgElement());
    }
    imgNodes = this.getImgNodes();
    for (let i = 0; i < indexList.length; i++) {
      const index = indexList[i];
      const imgNode = imgNodes[i];
      if (index === start) this.currImageNode = imgNode;
      this.setImgNode(imgNode, index);
    }
  }

  createImgElement() {
    const img = document.createElement("img");
    img.addEventListener("click", hiddenBigImageEvent);
    return img;
  }

  hidden() {
    [].forEach.call(this.frame.children, (child) => child.hidden = true);
  }

  show() {
    [].forEach.call(this.frame.children, (child) => child.hidden = false);
  }

  getImgNodes() {
    return this.frame.querySelectorAll("img");
  }

  onwheel(event) {
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 10);
    } else if (this.switchOnWheel) {
      event.preventDefault();
      this.queue.do(this.queue.currIndex + (event.deltaY > 0 ? 1 : -1), event.deltaY > 0 ? "next" : "prev");
    } else {
      this.consecutive(event);
    }
  }

  consecutive(event) {
    const oriented = event.deltaY > 0 ? "next" : "prev";

    let imgNodes = this.getImgNodes();
    let index = this.findImgNodeIndexOnCenter(imgNodes, event.deltaY);
    const centerNode = imgNodes[index];

    // before switch imgNodes, record the distance of the centerNode from the top of the screen
    const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;
    console.log("before extend, offsetTop is", centerNode.offsetTop);

    // extend imgNodes
    const indexOffset = this.tryExtend2();
    index = index + indexOffset;
    if (indexOffset !== 0) {
      this.restoreScrollTop(centerNode, distance, event.deltaY);
    }
    imgNodes = this.getImgNodes();

    // boundary check
    const indexOfQueue = parseInt(imgNodes[index].getAttribute("d-index"));
    if (oriented === "next" && index !== imgNodes.length - 1) return;
    if (oriented === "prev" && index !== 0) return;
    if (indexOfQueue === 0 || indexOfQueue === this.queue.length - 1) return;
    if (imgNodes.length < 2) return; // should be extended greater than 2

    // switch imgNodes
    if (oriented === "next") {
      imgNodes[imgNodes.length - 1].after(imgNodes[0]);
      this.setImgNode(imgNodes[0], parseInt(centerNode.getAttribute("d-index")) + 1);
    } else {
      imgNodes[0].before(imgNodes[imgNodes.length - 1]);
      this.setImgNode(imgNodes[imgNodes.length - 1], parseInt(centerNode.getAttribute("d-index")) - 1);
    }

    // fix scrolltop
    this.restoreScrollTop(centerNode, distance, event.deltaY);
    // queue.do() > imgFetcher.setNow() > this.setNow() > this.init(); in here, this.init() will be called again, so we need to lock this.init() in this.setNow() 
    this.lockInit = true;
    this.queue.do(indexOfQueue, oriented);
  }

  restoreScrollTop(imgNode, distance, deltaY) {
    this.frame.scrollTo(0, imgNode.offsetTop - distance);
    this.frame.scrollTo({ top: imgNode.offsetTop - distance + deltaY, behavior: "smooth" });
  }

  getRealOffsetTop(imgNode) {
    const naturalRatio = imgNode.naturalWidth / imgNode.naturalHeight;
    const clientRatio = imgNode.clientWidth / imgNode.clientHeight;
    if (naturalRatio > clientRatio) {
      const clientHeight = Math.round(imgNode.naturalHeight * (imgNode.clientWidth / imgNode.naturalWidth));
      console.log(`clientHeigh should be: ${clientHeight}`);
      return (imgNode.clientHeight - clientHeight) / 2 + imgNode.offsetTop;
    }
    return imgNode.offsetTop;
  }

  tryExtend2() {
    let indexOffset = 0;
    let imgNodes = [];
    let offsetAfterSwap = 0;
    while (true) {
      imgNodes = this.getImgNodes();
      const frist = imgNodes[0];
      const fixTop = this.getRealOffsetTop(frist);
      if (fixTop > this.frame.scrollTop) {
        const extended = this.extendImgNode(frist, "prev");
        if (extended) {
          indexOffset++;
          continue;
        } else {
          break;
        }
      } else {
        if (fixTop + frist.offsetHeight <= this.frame.scrollTop) {
          offsetAfterSwap = frist.offsetHeight;
        }
        break;
      }
    }
    while (true) {
      imgNodes = this.getImgNodes();
      const last = imgNodes[imgNodes.length - 1];
      if (last.offsetTop + last.offsetHeight + offsetAfterSwap < this.frame.scrollTop + this.frame.offsetHeight + this.frame.offsetHeight / 2) {
        if (!this.extendImgNode(last, "next")) break;
      } else {
        break;
      }
    }
    if (imgNodes.length == 2) {
      this.extendImgNode(imgNodes[imgNodes.length - 1], "next");
    }
    return indexOffset;
  }

  extendImgNode(imgNode, oriented) {
    const index = parseInt(imgNode.getAttribute("d-index"));
    if (oriented === "prev") {
      if (index === 0) return false;
      imgNode.before(this.createImgElement());
      this.setImgNode(imgNode.previousElementSibling, index - 1);
    } else {
      if (index === this.queue.length - 1) return false;
      imgNode.after(this.createImgElement());
      this.setImgNode(imgNode.nextElementSibling, index + 1);
    }
    return true;
  }

  setImgNode(imgNode, index) {
    imgNode.setAttribute("d-index", index);
    const imgFetcher = this.queue[index];
    if (imgFetcher.stage === 3) {
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

  scaleBigImages(fix, rate) {
    const css_ = [].slice.call(styleSheel.sheet.cssRules).filter((rule) => rule.selectorText === ".bigImageFrame > img")?.[0];
    css_.style.height = `${Math.max(parseInt(css_.style.height) + rate * fix, 100)}vh`;
  }

  findImgNodeIndexOnCenter(imgNodes, preFixOffset) {
    const centerLine = this.frame.offsetHeight / 2;
    for (let i = 0; i < imgNodes.length; i++) {
      const imgNode = imgNodes[i];
      if (imgNode.offsetTop + imgNode.offsetHeight + preFixOffset - this.frame.scrollTop > centerLine) return i;
    }
    return 0;
  }
}

//防反跳，延迟执行，如果有新的事件则重置延迟时间，到达延迟时间后，只执行最后一次的事件
class Debouncer {
  constructor() {
    this.tids = {};
  }
  addEvent(id, event, timeout) {
    window.clearTimeout(this.tids[id]);
    this.tids[id] = window.setTimeout(event, timeout);
  }
}

//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================START

//========================================配置管理器=================================================START
const signal = { first: true };

let conf = JSON.parse(window.localStorage.getItem("cfg_"));
//获取宽度
const screenWidth = window.screen.availWidth;

if (!conf || conf.version !== "3.0.5") {
  //如果配置不存在则初始化一个
  let colCount = screenWidth > 2500 ? 8 : screenWidth > 1900 ? 7 : 5;
  conf = {
    backgroundImage: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAAC4AgMAAADvbYrQAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFi/guUAABYlAUlSJPAAAAAJUExURQwMDA8PDxISEkrSJjgAAAVcSURBVGjevZqxjtwwDETZTOOvm2Yafp0aNvzKFJRsade3ycqHLA4IcMo70LRIDsk1iDZ/0P8VbTmAZGZmpGiejaBECpLcIUH0DAUpSpIgHZkuSfTchaIJBtk4ggTJnVL94DzJkJjZNqFsECUDjwhEQpKUyXAKExSHh0T3bYgASSNn8zLpomSSSYg4Mo58BEEETaz3N35OL3SoW0iREvcgAyHzGKfoEN4g1t+qS7UBlR2ZLfO8L5J0WQh3KOABybNJfADpDfIol88vF1I6n0Ev5kFyUWodCoSOCIgfnumfoVigk1CkQpCQAVG+D/VMAuuJQ+hXij2RaCQW1lWY0s93UGaTCCFTw7bziSvyM4/MI/pJZtuHnKIy5TmCkJ4tev7qUKZSDyFXQXGFOz1beFsh11OonvjNEeGUFJN5T6GIHh1azAu9OUKSLJN70P/7jHCvotbrTEZGG0EjTSfBDG5CQfX7uUC5QBF1IlFqm1A/4kdIOi6IDyHwA5SCApKcnk+hH82bat2/P9MN1PNUr1W3lwb3d+lbqF5XRpv0wFSomTlElmz8bh9yZt5Btl7Y34MwILvM0xIaTyF3ZsYE9VMOKMav7SFUFpakQRU1dp0lm65Rr3UPIPZ7UVUSpJmB9KBkhhkyjHDfgkb+nX1bmV5OCSGkwytP0/MhFD9BdkofjSL0DJqTb6n7zObeTzKh0CkJnkIvN7OXcMnjyDghD+5BZzM3pRDIxot8EVlrevkSIj3rysyOGIKKZx+UgQzQMtsehK56V+jUJAMaqoB8Avk7pBfIT/1h+xCZGXFnni/mRRyZvWXdg8SIiLgxz18cgQ5xD/r02dJo/KjCuJhXwb80/BRcJnpOQfg95KoCIAlmBkNQQZ3TBZsLwCPILwiCiKDEOC0kxEMBUfkIGiLxgkSVhWsnjnqSZ1DwhGCz+DhdngGZXNvQmZdWMfWa4+z+9BtoxPWiMoyekUlJqM44IchDEsWH0JIvK9m0KQhNkI+JyTNo1WhvEKQa1QFPIV+KWmZTNeiAdLhMPGv1HnQ3v5pEIs1MgsvMkMQ8bPoSMpYf+wCNFdo8U1WJLBEyOI0l/HcgjysGShCOsVZ3x3BOjR9JxS50PfTxDvncXx69NW/PIa0QLS7oiKjhrYt7kGJuEeahIGVrVa3hrWITmkdY0muykRnMNEauxJx5voS0DGpXkXglyzFFOXLuNb6GYploQjqiqd8hdt2W1YbXvGYb0hvkbbR8FxS1NXgOaZlxN+/maTLvFyB/FfMepyPMjvTRoOgJ9P8+ZcQ6vAL52rfUVKYGXnwC+Yg2Xzr7VaX6M8i7eeM0XsYlb3o4apX0PdQd4Yt55QjYEptEXzBsQq/mVXWjRKDyG/oAjbUM8V3oB9let5K80Vo/a/3PkNCVR6ZCRyRAXAuSNirCWWoy2x4EnP9hzop+C+Uj6FolHcpaLqIL/FcoUmdzvAPZnXnVHwzIZkf4NkTJlF0kesylpoIwZOybQMPliG+hGmuZGfEyP3WRNdbCuVDqV+tnqGr8PXTtlY1LARgrxt4ZD+kj8SPEv0MobQvxGKp3qJ9zR/IImiWBrRrtzjz7K4QfoPHEBhquXOUTFJd5lXL2IIyXu07UMaA+5MKSez5AnCZjb9Cc6X3xLUdO5jDcGTVj+R4aY+e5u5Iou/5WrWYjIGW0zLYHnYlFOnSpjLmoRcxF7QFkA5rME+dlfUA6ukhs7tvQ7Ai/M29Z/dDFPeg/byRXOxykJM96xZimqhJ5r5Z3oP61AHo2aCSbCeLvQTFB8xd6xmL4t6BjQF1i/zp0tg31PY0OmY1taUFYHfEV9K/7x/nzB/aTFFDPHGpXAAAAAElFTkSuQmCC`,
    colCount: colCount, //每行显示的数量
    scrollPage: false, //滚动换页
    autoLoad: true, //是否启用空闲加载器
    fetchOriginal: false, //是否获取最佳质量的图片
    restartIdleLoader: 8000, //中止空闲加载器后的重新启动时间
    threads: 3, //同时加载的图片数量
    downloadThreads: 3, //同时下载的图片数量
    timeout: 16, //超时时间(秒)，默认16秒
    version: "3.0.5", //配置版本
    debug: true, // 是否打印控制台日志
    first: true, // 是否初次使用脚本
    disableDownload: false, // 禁用下载功能
  };
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
}

const i18n = {
  download: ["DL", "下载"],
  config: ["CONF", "配置"],
  collapse: ["FOLD", "收起"],
  columns: ["Columns", "每行数量"],
  scrollPage: ["ScrollPage", "滚动换页"],
  maxPreloadThreads: ["PreloadThreads", "最大同时加载"],
  maxDownloadThreads: ["DonloadThreads", "最大同时下载"],
  timeout: ["Timeout(second)", "超时时间(秒)"],
  bestQuality: ["RawImage", "最佳质量"],
  autoLoad: ["AutoLoad", "自动加载"],
  scrollPageTooltip: ["Switch to the next picture when scrolling, otherwise read continuously", "滚动时切换到下一张图片，否则连续阅读"],
  maxPreloadThreadsTooltip: ["Max Preload Threads", "大图浏览时，每次滚动到下一张时，预加载的图片数量，大于1时体现为越看加载的图片越多，将提升浏览体验。"],
  maxDownloadThreadsTooltip: ["Max Download Threads, suggest: <5", "下载模式下，同时加载的图片数量，建议小于等于5"],
  bestQualityTooltip: ["enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"],
  autoLoadTooltip: ["", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"],
  forceDownload: ["Take Loaded", "强制下载已加载的"],
  startDownload: ["Start Download", "开始下载"],
  downloading: ["Downloading...", "下载中..."],
  downloaded: ["Downloaded", "下载完成"],
  originalCheck: ["<a class='clickable' style='color:gray;'>Enable RawImage Transient</a>", "未启用最佳质量图片，点击此处<a class='clickable' style='color:gray;'>临时开启最佳质量</a>"],
  help: [`
    <h1>GUIDE:</h1>
    <ol>
      <li>Before use this script，make sure gallery switch to <a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Large</a> mode</li>
      <li>Click bottom right corner<span style="background-color: gray;">&lessdot;📖&gtdot;</span>，enter into viewer mode</li>
      <li>Just a moment，All of thumbnail images exhibited in grid，<strong style="color: red;">click</strong> one of thumbnail images, into big image mode</li>
      <li><strong style="color: orange">Image quality:</strong>level 1、thumbnail； level 2、compressed image； level 3、original image；<br>
        In default config，auto load compressed image，with low traffic consumption with good clarity。also you can enable best quality in config plane, This increases the consumption of traffic and browsing quotas。
      </li>
      <li><strong style="color: orange">Big image:</strong>click thumbnail image, into big image mode, use mouse wheel switch to next or prev</li>
      <li><strong style="color: orange">Image zoom:</strong>right mouse button + mouse wheel</li>
      <li><strong style="color: orange">Download:</strong>click download button，popup download plane，the loading status of all images is indicated by small squares.</li>
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
      <li><strong style="color: orange">图片缩放:</strong>在大图上鼠标右键+滚轮<strong style="color: red">缩放</strong>图片</li>
      <li><strong style="color: orange">下载功能:</strong>右下角点击下载按钮，弹出下载面板，内部通过小方块展示了所有图片的加载状态，点击开始下载按钮后，会加快图片加载效率并在所有图片加载完成后进行下载。 </li>
    </ol>
  `]
};
const lang = navigator.language;
const i18nIndex = lang === "zh-CN" ? 1 : 0;
function geti18n(i18nKey) {
  return i18nKey[i18nIndex];
}
// const updateEvent = function (k, v) {
//   switch (k) {
//     case "backgroundImage": {
//       let css_ = [].slice.call(styleSheel.sheet.cssRules).filter((rule) => rule.selectorText === ".fullViewPlane")[0];
//       css_.style.backgroundImage = `url(${v})`;
//       break;
//     }
// };
//========================================配置管理器=================================================FIN

//=========================================事件库===================================================START
// 修改配置事件
function modConfEvent(ele, key, data) {
  if (["timeout", "threads", "downloadThreads", "colCount"].indexOf(key) !== -1) {
    const range = {
      colCount: [1, 12],
      threads: [1, 10],
      downloadThreads: [1, 10],
      timeout: [8, 40],
    };
    if (data === "add") {
      if (conf[key] < range[key][1]) {
        conf[key]++;
      }
    } else if (data === "minus") {
      if (conf[key] > range[key][0]) {
        conf[key]--;
      }
    }
    document.querySelector(`#${key}Input`).value = conf[key];
    if (key === "colCount") {
      const css_ = [].slice.call(styleSheel.sheet.cssRules).filter((rule) => rule.selectorText === ".fullViewPlane")?.[0];
      css_.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
    }
  }
  if (["autoLoad", "fetchOriginal", "scrollPage"].indexOf(key) !== -1) {
    conf[key] = ele.checked;
    if (key === "autoLoad") { idleLoader; }
    if (key === "scrollPage") {
      BIFM.switchOnWheel = conf[key];
    }
  }
  // todo backgroud image
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
}

// 入口
function togglePageHelper(type) {
  const ele = document.querySelector("#pageHelper #main");
  if (ele) {
    if (type == 1) {
      ele.classList.add("b-collapse");
      hiddenFullViewPlane();
      ["config", "downloader"].forEach(id => togglePlaneEvent(id, 1));
    } else {
      ele.classList.remove("b-collapse");
      showFullViewPlane();
      if (signal["first"]) {
        signal["first"] = false;
        PF.init().then(() => idleLoader.start(idleLoader.lockVer));
      }
    }
  }
}

function mouseleavePlaneEvent(target) {
  target.classList.add("p-collapse");
}

function togglePlaneEvent(id, type) {
  setTimeout(() => {
    let ele = document.querySelector(`#${id}Plane`);
    if (ele) {
      if (type == 0) {
        ele.classList.remove("p-collapse");
      } else if (type == 1) {
        mouseleavePlaneEvent(ele);
      } else {
        ele.classList.toggle("p-collapse");
        ["config", "downloader"].filter(k => k !== id).forEach(k => togglePlaneEvent(k, 1));
      }
    }
  }, 10);
}

const showFullViewPlane = function () {
  fullViewPlane.scroll(0, 0); //否则加载会触发滚动事件
  fullViewPlane.classList.remove("collapse_full_view");
  document.body.style.display = "none";
};

const hiddenFullViewPlaneEvent = function (event) {
  if (event.target === fullViewPlane) {
    togglePageHelper(1);
  }
};

const hiddenFullViewPlane = function () {
  hiddenBigImageEvent();
  fullViewPlane.classList.add("collapse_full_view");
  document.body.style.display = "";
};

//全屏阅览元素的滚动事件
const scrollEvent = function () {
  //对冒泡的处理
  if (fullViewPlane.classList.contains("collapse_full_view")) return;
  //根据currTop获取当前滚动高度对应的未渲染缩略图的图片元素
  PF.renderCurrView(fullViewPlane.scrollTop, fullViewPlane.clientHeight);
};

//大图框架点击事件，点击后隐藏大图框架
const hiddenBigImageEvent = function (event) {
  if (event && event.target.tagName === "SPAN") return;
  bigImageFrame.classList.add("collapse");
  window.setTimeout(() => BIFM.hidden(), 700);
};

//大图框架元素的滚轮事件/按下鼠标右键滚动则是缩放/直接滚动则是切换到下一张或上一张
const bigImageWheelEvent = function (event) {
  stepImageEvent(event.deltaY > 0 ? "next" : "prev");
};

//按键事件
const KeyEvent = function (event) {
  switch (event.key) {
    case "ArrowLeft":
      stepImageEvent("prev");
      break;
    case "ArrowRight":
      stepImageEvent("next");
      break;
    case "Escape":
      hiddenBigImageEvent(event);
      break;
  }
};

//点击缩略图后展示大图元素的事件
const showBigImageEvent = function (event) {
  showBigImage(IFQ.findIndex(event.target));
};
const showBigImage = function (start) {
  //展开大图阅览元素
  bigImageFrame.classList.remove("collapse");
  BIFM.show();
  //获取该元素所在的索引，并执行该索引位置的图片获取器，来获取大图
  IFQ.do(start);
};

//加载上一张或下一张事件
const stepImageEvent = function (oriented) {
  const start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
  IFQ.do(start, oriented);
};

//显示简易指南事件
const showGuideEvent = function () {
  const guideFull = document.createElement("div");
  document.body.after(guideFull);
  guideFull.innerHTML = `
  <div style="width: 50vw; min-height: 300px; border: 1px solid black; background-color: rgba(255, 255, 255, 0.8); font-weight: bold; line-height: 30px">${geti18n(i18n.help)}</div>
  `;
  guideFull.style = `position: absolute;width: 100%;height: 100%;background-color: #363c3c78;z-index: 2004;top: 0; display: flex; justify-content: center;align-items: center;`;
  guideFull.addEventListener("click", () => guideFull.remove());
};
//=========================================事件库===================================================FIN

//===============================创建入口按钮，追加到tag面板的右侧======================================START
//判断是否是Large模式，这样缩略图也算能看
if (document.querySelector("div.ths:nth-child(2)") === null) {
  const showBTNRoot = document.querySelector("#gd5");
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = `<p class="g2"><img src="https://exhentai.org/img/mr.gif"> <a id="renamelink" href="${window.location.href}?inline_set=ts_l">请切换至Large模式</a></p>`;
  showBTNRoot.appendChild(tempContainer.firstElementChild);
}
//===============================创建入口按钮，追加到tag面板的右侧======================================FIN

//====================================创建一个全屏阅读元素============================================START
const fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");
fullViewPlane.classList.add("collapse_full_view");
document.body.after(fullViewPlane);
fullViewPlane.innerHTML = `
 <div id="bigImageFrame" class="bigImageFrame collapse">
    <a id="imgLandLeft" hidden="true" class="imgLandLeft"></a>
    <a id="imgLandRight" hidden="true" class="imgLandRight"></a>
 </div>
 <div id="pageHelper" class="pageHelper">
     <div style="position: relative">
         <div id="configPlane" class="plane p-config p-collapse">
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${geti18n(i18n.columns)}:</span>
                     <span>
                         <button id="colCountMinusBTN" type="button">-</button>
                         <input id="colCountInput" value="${conf.colCount}" disabled type="text" style="width: 15px;" />
                         <button id="colCountAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${geti18n(i18n.maxPreloadThreads)}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left: -100px">${geti18n(i18n.maxPreloadThreadsTooltip)}</span></span>:
                     </span>
                     <span>
                         <button id="threadsMinusBTN" type="button">-</button>
                         <input id="threadsInput" value="${conf.threads}" disabled type="text" style="width: 15px;" />
                         <button id="threadsAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${geti18n(i18n.maxDownloadThreads)}
                        <span class="tooltip"><span class="tooltiptext" style="width: 200px; left: -100px">${geti18n(i18n.maxDownloadThreadsTooltip)}</span></span>:
                     </span>
                     <span>
                         <button id="downloadThreadsMinusBTN" type="button">-</button>
                         <input id="downloadThreadsInput" value="${conf.downloadThreads}" disabled type="text" style="width: 15px;" />
                         <button id="downloadThreadsAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${geti18n(i18n.timeout)}:</span>
                     <span>
                         <button id="timeoutMinusBTN" type="button">-</button>
                         <input id="timeoutInput" value="${conf.timeout}" disabled type="text" style="width: 15px;" />
                         <button id="timeoutAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${geti18n(i18n.bestQuality)}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left: -100px">${geti18n(i18n.bestQualityTooltip)}</span></span>:
                     </span>
                     <input id="fetchOriginalCheckbox" ${conf.fetchOriginal ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label>
                     <span>${geti18n(i18n.autoLoad)}
                        <span class="tooltip"><span class="tooltiptext" style="width: 200px; right:0;">${geti18n(i18n.autoLoadTooltip)}</span></span>:
                     </span>
                     <input id="autoLoadCheckbox" ${conf.autoLoad ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${geti18n(i18n.scrollPage)}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left:0;">${geti18n(i18n.scrollPageTooltip)}</span></span>:
                     </span>
                     <input id="scrollPageCheckbox" ${conf.scrollPage ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 2; padding-left: 5px;">
                  <a id="showGuideElement" class="clickable">Help</a>
             </div>
         </div>
         <div id="downloaderPlane" class="plane p-downloader p-collapse">
             <div id="download-notice" class="download-notice"></div>
             <canvas id="downloaderCanvas" width="337" height="250"></canvas>
             <div class="download-btn-group">
                <a id="download-force" style="color: gray;" class="clickable">${geti18n(i18n.forceDownload)}</a>
                <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${geti18n(i18n.startDownload)}</a>
             </div>
         </div>
     </div>
     <div>
         <span id="gate" style="font-weight: 800; font-size: large; text-align: center;">&lessdot;📖</span>
     </div>
     <!-- <span>展开</span> -->
     <div id="main" class="b-main b-collapse">
         <div id="configPlaneBTN" class="clickable" style="z-index: 1111;"> ${geti18n(i18n.config)} </div>
         <div id="downloaderPlaneBTN" class="clickable" style="z-index: 1111;"> ${geti18n(i18n.download)} </div>
         <div class="page">
             <span class="clickable" id="p-currPage"
                 style="color:orange;">1</span>/<span id="p-total">0</span>/<span>FIN:</span><span id="p-finished">0</span>
         </div>
         <div id="collapseBTN" class="clickable">${geti18n(i18n.collapse)}</div>
     </div>
     <div>
         <span style="font-weight: 800; font-size: large; text-align: center;">&gtdot;</span>
     </div>
 </div>
`;
const bigImageFrame = fullViewPlane.querySelector("#bigImageFrame");
const pageHelper = fullViewPlane.querySelector("#pageHelper");
bigImageFrame.addEventListener("click", hiddenBigImageEvent);
// bigImageFrame.addEventListener("wheel", bigImageWheelEvent);
bigImageFrame.addEventListener("contextmenu", (event) => event.preventDefault());
const imgLandLeft = fullViewPlane.querySelector("#imgLandLeft");
imgLandLeft.addEventListener("click", (event) => {
  stepImageEvent("prev");
  event.stopPropagation();
});
const imgLandRight = fullViewPlane.querySelector("#imgLandRight");
imgLandRight.addEventListener("click", (event) => {
  stepImageEvent("next");
  event.stopPropagation();
});


const configPlane = fullViewPlane.querySelector("#configPlane");
configPlane.addEventListener("mouseleave", (event) => mouseleavePlaneEvent(event.target));
const downloaderPlane = fullViewPlane.querySelector("#downloaderPlane");
downloaderPlane.addEventListener("mouseleave", (event) => mouseleavePlaneEvent(event.target));

// 配置按钮
const configPlaneBTN = fullViewPlane.querySelector("#configPlaneBTN");
configPlaneBTN.addEventListener("click", () => togglePlaneEvent("config"));
// 下载按钮
const downloaderPlaneBTN = fullViewPlane.querySelector("#downloaderPlaneBTN");
downloaderPlaneBTN.addEventListener("click", () => {
  togglePlaneEvent("downloader");
  downloader.check();
});

for (const key of ["colCount", "threads", "downloadThreads", "timeout"]) {
  fullViewPlane.querySelector(`#${key}MinusBTN`).addEventListener("click", (event) => modConfEvent(event.target, key, 'minus'));
  fullViewPlane.querySelector(`#${key}AddBTN`).addEventListener("click", (event) => modConfEvent(event.target, key, 'add'));
}
for (const key of ["fetchOriginal", "autoLoad", "scrollPage"]) {
  fullViewPlane.querySelector(`#${key}Checkbox`).addEventListener("input", (event) => modConfEvent(event.target, key));
}

const collapseBTN = fullViewPlane.querySelector("#collapseBTN");
collapseBTN.addEventListener("click", () => togglePageHelper(1));

const gate = fullViewPlane.querySelector("#gate");
gate.addEventListener("click", () => togglePageHelper(0));

const debouncer = new Debouncer();
//全屏阅读元素滚动事件
fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", scrollEvent, 500));
fullViewPlane.addEventListener("click", hiddenFullViewPlaneEvent);

//按键事件
document.addEventListener("keyup", KeyEvent);

const currPageElement = fullViewPlane.querySelector("#p-currPage");
currPageElement.addEventListener("click", () => showBigImage(IFQ.currIndex));
currPageElement.addEventListener("wheel", bigImageWheelEvent);
const totalPageElement = fullViewPlane.querySelector("#p-total");
const finishedElement = fullViewPlane.querySelector("#p-finished");
//页码指示器通用修改事件
const pageHandler = function (type, data) {
  switch (type) {
    case "fetching":
      pageHelper.classList.add("pageHelperFetching");
      break;
    case "fetched":
      pageHelper.classList.remove("pageHelperFetching");
      break;
    case "updateTotal":
      totalPageElement.textContent = data;
      downloaderCanvas.drawDebouce();
      break;
    case "updateCurrPage":
      currPageElement.textContent = data;
      downloaderCanvas.drawDebouce();
      break;
    case "updateFinished":
      finishedElement.textContent = data;
      downloaderCanvas.drawDebouce();
      break;
  }
};
fullViewPlane.querySelector("#showGuideElement")?.addEventListener("click", showGuideEvent);


// 图片获取器调用队列
const IFQ = new IMGFetcherQueue();
// 空闲自加载器
const idleLoader = new IdleLoader(IFQ);
// 页加载器
const PF = new PageFetcher(IFQ, idleLoader);
// 大图管理器
const BIFM = new BigImageFrameManager(bigImageFrame, IFQ, conf["scrollPage"]);

//====================================创建一个全屏阅读元素============================================FIN

//=======================================创建样式表=================================================START
let styleSheel = document.createElement("style");
styleSheel.textContent = `
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
        grid-gap: 10px;
        grid-template-columns: repeat(${conf.colCount}, 1fr);
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
    .bigImageFrame {
        position: fixed;
        width: 100%;
        height: 100%;
        right: 0;
        overflow: scroll;
        z-index: 1001;
        background-color: #000000d6;
        transition: width 0.4s;
        display: flex;
        flex-direction: column;
    }
    .bigImageFrame > img {
        width: 100%;
        height: 100vh;
        object-fit: contain;
        border-bottom: 1px solid #ffffff;
    }
    .fullViewPlane>.pageHelper {
        position: fixed;
        display: flex !important;
        justify-content: space-between;
        right: 50px;
        line-height: 25px;
        bottom: 30px;
        background-color: rgba(114, 114, 114, 0.8);
        z-index: 1011 !important;
        box-sizing: border-box;
        font-weight: bold;
        color: rgb(135, 255, 184);
        font-size: 1rem;
        cursor: pointer;
    }
    .pageHelper:hover {
        background-color: rgba(40, 40, 40, 0.8);
    }
    .pageHelper .clickable {
        text-decoration-line: underline;
    }
    .clickable:hover {
        color: white !important;
    }
    .pageHelper .plane {
        z-index: 1010 !important;
        background-color: rgba(38, 20, 25, 0.8);
        box-sizing: border-box;
        /* border: 1px solid red; */
        position: absolute;
        left: 0;
        bottom: 25px;
        color: rgb(200, 222, 200);
        box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.2);
        transition: height 0.4s;
        overflow: hidden;
        width: 337px;
    }
    .p-collapse {
        height: 0px !important;
        transition: height 0.4s;
    }
    .pageHelper .b-main {
        width: 284px;
        overflow: hidden !important;
        transition: width 0.4s;
        display: flex;
        justify-content: space-between;
        white-space: nowrap !important;
    }
    .b-collapse {
        width: 0px !important;
        transition: width 0.4s;
    }
    .pageHelper .p-config {
        height: 300px;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        align-content: start;
        grid-gap: 10px 0px;
    }
    .pageHelper .p-downloader {
        height: 310px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
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
    .pageHelper .btn {
        color: rgb(255, 232, 176);
        cursor: pointer;
        border: 1px solid rgb(0, 0, 0);
        border-radius: 4px;
        height: 30px;
        font-weight: 900;
        background: rgb(70, 69, 98) none repeat scroll 0% 0%;
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
    .collapse {
        width: 0px !important;
        transition: width 0.4s;
    }
    .downloadBar {
        background-color: rgba(100, 100, 100, .8);
        height: 10px;
        width: 100%;
        position: absolute;
        bottom: 0;
    }
    .imgLandLeft {
      width: 25%;
      height: 100%;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1004;
      cursor: url("https://tb2.bdstatic.com/tb/static-album/img/mouseleft.cur"), auto;
    }
    .imgLandRight {
      width: 25%;
      height: 100%;
      position: fixed;
      right: 0;
      top: 0;
      z-index: 1004;
      cursor: url("https://tb2.bdstatic.com/tb/static-album/img/mouseright.cur"), auto;
    }
    .tooltip {
      position: relative;
      border-bottom: 1px dotted black;
    }
    .tooltip .tooltiptext {
      visibility: hidden;
      width: 100px;
      background-color: black;
      color: #fff;
      text-align: center;
      padding: 5px 0;
      border-radius: 6px;
      position: absolute;
      z-index: 1;
      font-size: small;
    }
    .tooltip:hover .tooltiptext {
      visibility: visible;
    }
`;
document.head.appendChild(styleSheel);
//=======================================创建样式表=================================================FIN

function evLog(msg, ...info) {
  if (conf.debug) {
    console.log(new Date().toLocaleString(), "EHVP:" + msg, ...info);
  }
}

// GM.xhr简单包装
function xhrWapper(url, resType, { onprogress, onload, onerror, ontimeout }) {
  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    responseType: resType,
    timeout: conf["timeout"] * 1000,
    headers: {
      "Host": url.replace("https://", "").split("/").shift(),
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
      "Accept": "image/avif,image/webp,*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Referer": window.location.href.replace("/g/", "/mpv/"),
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
      "Cache-Control": "public,max-age=3600,immutable",
    },
    onprogress,
    onload,
    onerror,
    ontimeout,
  });
}

//=======================================画廊信息==================================================START
class GalleryMeta {
  constructor($doc) {
    this.url = $doc.location.href;
    const titleList = $doc.querySelectorAll("#gd2 h1");
    if (titleList && titleList.length > 0) {
      this.title = titleList[0].textContent;
      if (titleList.length > 1) {
        this.originTitle = titleList[1].textContent;
      }
    }
    const tagTrList = $doc.querySelectorAll("#taglist tr");
    this.tag = [...tagTrList].reduce((prev, tr) => {
      const tds = tr.childNodes;
      prev[tds[0].textContent] = [...tds[1].childNodes].map((ele) => ele.textContent);
      return prev;
    }, {});
    console.log(this);
  }
}
//=======================================画廊信息==================================================FIN

//=======================================下载功能==================================================START
class Downloader {
  constructor() {
    this.meta = new GalleryMeta(document);
    this.zip = new JSZip();
    this.title = this.meta.originTitle || this.meta.title;
    this.zip.file("meta.json", JSON.stringify(this.meta));
    this.downloading = false;
    this.downloadForceElement = document.querySelector("#download-force");
    this.downloadStartElement = document.querySelector("#download-start");
    this.downloadNoticeElement = document.querySelector("#download-notice");
    this.downloadForceElement?.addEventListener("click", () => this.download());
    this.downloadStartElement?.addEventListener("click", () => this.start());
  }
  addToDownloadZip(imgFetcher) {
    if (conf["disableDownload"]) return;
    let title = imgFetcher.title;
    if (title) {
      title = title.replace(/Page\s\d+_/, "");
    } else {
      title = imgFetcher.node.childNodes?.[0]?.getAttribute("asrc")?.split("/").pop();
    }
    if (!title) {
      evLog("无法解析图片文件名，因此该图片无法下载");
      return;
    }
    this.zip.file(title, imgFetcher.blobData, { binary: true });
  }
  // check > start > download
  check() {
    if (conf.fetchOriginal) return;
    // append adviser element
    if (this.downloadNoticeElement && !this.downloading) {
      this.downloadNoticeElement.innerHTML = `<span>${geti18n(i18n.originalCheck)}</span>`;
      this.downloadNoticeElement.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
    }
    if (conf["disableDownload"]) {
      this.downloadNoticeElement.innerHTML = "<span>下载功能已禁用</span>";
      this.downloadNoticeElement.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
      this.downloadStartElement.disable = true;
    }
  }
  fetchOriginalTemporarily() {
    IFQ.forEach(imgFetcher => {
      if (!imgFetcher.fetchOriginal || imgFetcher.stage !== 3) {
        imgFetcher.fetchOriginal = true;
        imgFetcher.stage = 1;
      }
    });
    this.start();
  }
  start() {
    if (IFQ.isFinised()) {
      this.download();
      return;
    }
    if (this.downloadNoticeElement && !conf["disableDownload"]) this.downloadNoticeElement.innerHTML = `<span>${geti18n(i18n.downloading)}</span>`;
    this.downloadStartElement.textContent = geti18n(i18n.downloading);
    this.downloading = true;

    if (!conf["autoLoad"]) conf["autoLoad"] = true;
    idleLoader.lockVer++;
    // find all of unloading imgFetcher and splice frist few imgFetchers
    idleLoader.processingIndexList = [...IFQ].map((imgFetcher, index) => (!imgFetcher.lock && imgFetcher.stage === 1 ? index : -1))
      .filter((index) => index >= 0)
      .splice(0, conf["downloadThreads"]);
    idleLoader.start(idleLoader.lockVer);
  }

  download() {
    if (conf["disableDownload"]) return;
    this.downloading = false;
    this.zip.generateAsync({ type: "blob" }, (metadata) => {
      // console.log(metadata);
      // todo progress bar
    }).then(data => {
      saveAs(data, `${this.title}.zip`);
      if (this.downloadNoticeElement) this.downloadNoticeElement.innerHTML = "";
      this.downloadStartElement.textContent = geti18n(i18n.downloaded);
    });
  };
}
const downloader = new Downloader();

class DownloaderCanvas {
  constructor(id, queue) {
    this.canvas = document.getElementById(id);
    this.canvas.addEventListener("wheel", (event) => this.onwheel(event.deltaY));
    this.mousemoveState = { x: 0, y: 0 };
    this.canvas.addEventListener("mousemove", (event) => {
      // console.log("canvas mousemove, X:", event.offsetX, ", Y:", event.offsetY);
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      this.drawDebouce();
    });
    this.canvas.addEventListener("click", (event) => {
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      const index = this.computeDrawList()?.find(state => state.isSelected).index;
      showBigImage(index);
    });
    this.ctx = this.canvas.getContext("2d");
    this.queue = queue;
    this.rectSize = 12; // 矩形大小(正方形)
    this.rectGap = 6; // 矩形之间间隔
    this.columns = 15; // 每行矩形数量
    this.padding = 7; // 画布内边距
    this.scrollTop = 0; // 滚动位置
    this.scrollSize = 10; // 每次滚动粒度
  }

  onwheel(deltaY) {
    const [w, h] = this.getWH();
    const clientHeight = this.computeClientHeight();
    if (clientHeight > h) {
      deltaY = deltaY >> 1;
      this.scrollTop += deltaY;
      if (this.scrollTop < 0) this.scrollTop = 0;
      if (this.scrollTop + h > clientHeight + 20) this.scrollTop = clientHeight - h + 20;
      this.draw();
    }
  }

  drawDebouce() {
    debouncer.addEvent("DOWNLOADER-DRAW", () => this.draw(), 20);
  }

  computeDrawList() {
    const list = [];
    const [w, h] = this.getWH();
    const startX = this.computeStartX();
    const startY = -this.scrollTop;
    for (let i = 0, row = -1; i < this.queue.length; i++) {
      const currCol = i % this.columns;
      if (currCol == 0) {
        row++;
      }
      const atX = startX + ((this.rectSize + this.rectGap) * currCol);
      const atY = startY + ((this.rectSize + this.rectGap) * row);
      if (atY + this.rectSize < 0) {
        continue;
      }
      if (atY > h) {
        break;
      }
      list.push({ index: i, atX, atY, isSelected: this.isSelected(atX, atY) });
    }
    return list;
  }

  draw() {
    const [w, h] = this.getWH();
    this.ctx.clearRect(0, 0, w, h);
    const list = this.computeDrawList();
    for (const rectState of list) {
      this.drawSmallRect(
        rectState.atX,
        rectState.atY,
        this.queue[rectState.index],
        rectState.index === this.queue.currIndex,
        rectState.isSelected
      );
    }
  }

  computeClientHeight() {
    return Math.ceil(this.queue.length / this.columns) * (this.rectSize + this.rectGap) - this.rectGap;
  }

  scrollTo(index) {
    const clientHeight = this.computeClientHeight();
    const [w, h] = this.getWH();
    if (clientHeight <= h) {
      return;
    }

    // compute offsetY of index in list
    const rowNo = (Math.ceil((index + 1) / this.columns));
    const offsetY = (rowNo - 1) * (this.rectSize + this.rectGap);

    if (offsetY > h) {
      this.scrollTop = offsetY + this.rectSize - h;
      const maxScrollTop = clientHeight - h + 20;
      if (this.scrollTop + 20 <= maxScrollTop) {
        this.scrollTop += 20; //todo 
      }
    }
  }

  isSelected(atX, atY) {
    return this.mousemoveState.x - atX >= 0
      && this.mousemoveState.x - atX <= this.rectSize
      && this.mousemoveState.y - atY >= 0
      && this.mousemoveState.y - atY <= this.rectSize;
  }

  computeStartX() {
    const [w, h] = this.getWH();
    const drawW = this.rectSize * this.columns + this.rectGap * this.columns - 1;
    let startX = (w - drawW) >> 1;
    return startX;
  }

  drawSmallRect(x, y, imgFetcher, isCurr, isSelected) {
    if (imgFetcher.stage == 3) {
      this.ctx.fillStyle = "rgb(110, 200, 120)";
    } else if (imgFetcher.stage === 2) {
      const percent = imgFetcher.downloadState.loaded / imgFetcher.downloadState.total;
      this.ctx.fillStyle = `rgba(110, ${Math.ceil(percent * 200)}, 120, ${Math.max(percent, 0.1)})`;
    } else {
      this.ctx.fillStyle = "rgba(200, 200, 200, 0.1)";
    }
    this.ctx.fillRect(x, y, this.rectSize, this.rectSize);
    this.ctx.shadowColor = '#d53';
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

const downloaderCanvas = new DownloaderCanvas("downloaderCanvas", IFQ);
// downloaderCanvas.draw();
//=======================================下载功能==================================================FIN
if (conf["first"]) {
  showGuideEvent();
  conf["first"] = false;
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
}