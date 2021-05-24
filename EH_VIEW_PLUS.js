// ==UserScript==
// @name         E-HENTAI-VIEW-ENHANCE
// @namespace    https://github.com/kamo2020/eh-view-enhance
// @version      2.0.3
// @description  强化E绅士看图体验
// @author       kamo2020
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @connect      hath.network
// @icon         https://exhentai.org/favicon.ico
// @grant        GM.xmlHttpRequest
// ==/UserScript==

//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================START
class IMGFetcher {
  constructor(node) {
    this.node = node;
    this.pageUrl = node.getAttribute("ahref");
    //当前处理阶段，1: 获取大图地址 2: 获取大图数据
    this.stage = 1;
    this.tryTime = 0;
    this.lock = false;
    this.rendered = false;
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
        throw new Error("失败");
      }
      //成功获取到大图的地址后，将本图片获取器的状态修改为1，表示大图地址已经成功获取到
      if (!this.bigImageUrl) {
        throw new Error("大图地址不存在！");
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
    try {
      if (!(await this.fetchBigImage())) {
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
    this.rendered = false;
    this.render();
    return true;
  }

  async set(index) {
    if (this.lock) return;
    this.lock = true;
    try {
      this.changeStyle("add");
      if (!(await this.fetchImg())) {
        throw new Error("图片获取器失败，中止获取！");
      }
      this.changeStyle("remove", "success");
    } catch (error) {
      this.changeStyle("remove", "failed");
      evLog(`图片获取器获取失败:`, error);
    } finally {
      IFQ.report(index, this.blobUrl, this.node.offsetTop);
      this.lock = false;
    }
  }

  //被滚动事件触发
  //滚动事件触发
  //被获取大图数据成功时触发
  render() {
    if (this.stage === 3) {
      if (this.rendered) return;
      this.node.style.height = "auto";
      this.node.src = this.blobUrl;
      this.rendered = true;
    } else {
      if (this.rendered) return;
      this.node.style.height = "auto";
      this.node.src = this.node.getAttribute("asrc");
      this.rendered = true;
    }
  }

  //立刻将当前元素的src赋值给大图元素
  setNow(index) {
    if (this.stage === 3) {
      IFQ.report(index, this.blobUrl, this.node.offsetTop);
    } else {
      bigImageElement.src = this.node.getAttribute("asrc");
      pageHelperHandler(null, null, "fetching");
    }
    pageHelperHandler(1, index + 1);
  }

  async fetchBigImageUrl() {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      const onload = (response) => {
        const text = response.response;
        if (!(typeof text === "string")) {
          throw new Error("未获取到有效的文档！");
        }
        //抽取最佳质量的图片的地址
        if (conf["fetchOriginal"]) {
          imgFetcher.bigImageUrl = IMGFetcher.extractUrl["original"].exec(text)[1].replace(/&amp;/g, "&");
        }
        //抽取正常的有压缩的大图地址
        else if (imgFetcher.tryTime === 0) {
          imgFetcher.bigImageUrl = IMGFetcher.extractUrl["normal"].exec(text)[1];
        }
        //如果是重试状态,则进行换源
        else {
          const nlValue = IMGFetcher.extractUrl["nlValue"].exec(text)[1];
          imgFetcher.pageUrl += ((imgFetcher.pageUrl + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
          evLog(`获取到重试地址:${imgFetcher.pageUrl}`);
        }
        resolve(true);
      };
      xhrWapper(imgFetcher.pageUrl, imgFetcher.pageUrl, "text", { onload });
    });
  }

  async fetchBigImage() {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      xhrWapper(imgFetcher.bigImageUrl, imgFetcher.bigImageUrl, "blob", {
        onload: function (response) {
          let data = response.response;
          if (!(data instanceof Blob)) throw new Error("未下载到有效的数据！");
          imgFetcher.blobData = data;
          imgFetcher.blobUrl = URL.createObjectURL(data);
          resolve(true);
        },
        onerror: function () {
          resolve(false);
        },
        ontimeout: function () {
          resolve(false);
        },
      });
    });
  }

  changeStyle(action, success) {
    if (action === "remove") {
      //当获取到内容，或者获取失败，则移除本缩略图的边框效果
      this.node.classList.remove("fetching");
    } else if (action === "add") {
      //给当前缩略图元素添加一个获取中的边框样式
      this.node.classList.add("fetching");
    }
    if (success === "success") {
      this.node.style.border = "3px #602a5c solid";
    } else if (success === "failed") {
      this.node.style.border = "3px red solid";
    } else if (success === "retry") {
      this.node.style.border = "3px white solid";
    }
  }
}

IMGFetcher.extractUrl = {
  normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
  original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai\.org\/fullimg\.php\?[^"\\]*)\"\>/,
  nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
};

class IMGFetcherQueue extends Array {
  constructor() {
    super();
    //可执行队列
    this.executableQueue = [];
    //当前的显示的大图的图片请求器所在的索引
    this.currIndex = 0;
    //已经完成加载的
    this.finished = [];
    this.debouncer = new Debouncer();
  }

  do(start, oriented) {
    oriented = oriented || "next";
    //边界约束
    this.currIndex = this.fixIndex(start, oriented);
    //立即中止空闲加载器
    idleLoader.abort(this.currIndex);
    //立即加载和展示当前的元素
    this[this.currIndex].setNow(this.currIndex);

    //从当前索引开始往后,放入指定数量的图片获取器,如果该图片获取器已经获取完成则向后延伸.
    //如果最后放入的数量为0,说明已经没有可以继续执行的图片获取器,可能意味着后面所有的图片都已经加载完毕,也可能意味着中间出现了什么错误
    if (!this.pushExecQueue(oriented)) return;

    /* 300毫秒的延迟，在这300毫秒的时间里，可执行队列executableQueue可能随时都会变更，100毫秒过后，只执行最新的可执行队列executableQueue中的图片请求器
            在对大图元素使用滚轮事件的时候，由于速度非常快，大量的IMGFetcher图片请求器被添加到executableQueue队列中，如果调用这些图片请求器请求大图，可能会被认为是爬虫脚本
            因此会有一个时间上的延迟，在这段时间里，executableQueue中的IMGFetcher图片请求器会不断更替，300毫秒结束后，只调用最新的executableQueue中的IMGFetcher图片请求器。
        */
    this.debouncer.addEvent(() => {
      this.executableQueue.forEach((imgFetcherIndex) => this[imgFetcherIndex].set(imgFetcherIndex));
    }, 300);
  }

  //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
  report(index, imgSrc, offsetTop) {
    this.pushFinished(index);
    pageHelperHandler(3, `已加载${this.finished.length}张`);
    evLog(`第${index + 1}张完成，大图所在第${this.currIndex + 1}张`);
    if (index !== this.currIndex) return;
    if (!conf.keepScale) {
      //是否保留缩放
      bigImageElement.style.width = "100%";
      bigImageElement.style.height = "100%";
      bigImageElement.style.top = "0px";
    }
    // bigImageElement.classList.remove("fetching");
    pageHelperHandler(null, null, "fetched");
    bigImageElement.src = imgSrc;
    let scrollTo = offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= fullViewPlane.scrollHeight ? fullViewPlane.scrollHeight : scrollTo;
    fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" });
  }

  //如果开始的索引小于0,则修正索引为0,如果开始的索引超过队列的长度,则修正索引为队列的最后一位
  fixIndex(start) {
    return start < 0 ? 0 : start > this.length - 1 ? this.length - 1 : start;
  }

  pushExecQueue(oriented) {
    //把要执行获取器先放置到队列中，延迟执行
    this.executableQueue = [];
    for (
      let count = 0, index = this.currIndex;
      this.pushExecQueueSlave(index, oriented, count);
      oriented === "next" ? ++index : --index
    ) {
      if (this[index].stage === 3) continue;
      this.executableQueue.push(index);
      count++;
    }
    return this.executableQueue.length > 0;
  }

  pushExecQueueSlave(index, oriented, count) {
    return (
      ((oriented === "next" && index < this.length) || (oriented === "prev" && index > -1)) && count < conf["threads"]
    ); //丧心病
  }

  findIndex(node) {
    for (let index = 0; index < this.length; index++) {
      if (this[index] instanceof IMGFetcher && this[index].node === node) {
        return index;
      }
    }
    return 0;
  }

  pushFinished(index) {
    const fd = this.finished;
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
    //当前处理
    this.currIndex = 0;
    //是否终止
    this.abort_ = false;
    //已完成
    this.finishedIF = [];
    //递归次数，防止无限递归
    this.recuTimes = 0;
    //中止后的用于重新启动的延迟器的id
    this.restartId;
  }
  async start(index) {
    evLog("空闲自加载启动:" + index);
    const finished = this.queue.finished;
    index && (this.currIndex = index);
    //如果当前要开始的索引大于获取队列的长度，说明触底，从0开始
    if (this.currIndex >= this.queue.length) this.currIndex = 0;
    //如果被中止了，则停止
    if (this.abort_ || !conf["autoLoad"]) return;
    //如果所有的图片都加载完毕，则停止
    if (finished.length === this.queue.length) return (this.abort_ = true);
    //如果该当前索引的图片获取器已经存在于已完成列表里则直接递归到下一个索引
    if (finished.indexOf(this.currIndex) > -1) return this.start(++this.currIndex);

    //通过当前的索引获取队列中的图片获取器IMGFetcher,然后调用器获取图片的方法,在获取的过程中进行加锁
    const imgFetcher = this.queue[this.currIndex];
    //如果当前图片获取器不在获取中
    if (!imgFetcher.lock) {
      await imgFetcher.set(this.currIndex);
    }
    //当前要处理的图片获取器被锁住了，可能正在获取图片中，则停止自动获取，5s后再次执行
    else if (imgFetcher.lock || this.recuTimes > 1000) {
      this.recuTimes = 0;
      return window.setTimeout(() => this.start(this.currIndex), 5000);
    }

    this.recuTimes++;
    this.timeOut().then(() => this.start(++this.currIndex));
  }

  async timeOut() {
    return new Promise(function (resolve) {
      const time = Math.floor(Math.random() * 1500 + 500);
      window.setTimeout(() => resolve(), time);
    });
  }

  abort(newStart) {
    if (!conf.autoLoad) return;
    this.abort_ = true;
    window.clearTimeout(this.restartId);
    //8s后重新开启，todo 但这里可能会出现小概率的双线程危机
    this.restartId = window.setTimeout(() => {
      this.abort_ = false;
      this.start(newStart);
    }, conf["restartIdleLoader"]);
  }
}

//页获取器，可获取下一个列表页，以及下一个图片页
class PageFetcher {
  constructor(IFQ) {
    this.queue = IFQ;
    //文档对象模型的引用，当前页的文档对象、下一个、上一个列表页的文档对象模型。
    this.stepSource = { prev: document, next: document };
    //是否正在获取上一页或者下一页中
    this.fetching = { prev: false, next: false };
    //第一页或者最后一页是否获取完毕
    this.fetched = { prev: false, next: false };
    //所有页的地址
    this.pageUrls = [];
    //当前页所在的索引
    this.currPage = 0;
    //每页的图片获取器列表，用于实现懒加载
    this.imgAppends = { prev: [], next: [] };
    //平均高度，用于渲染未加载的缩略图,单位px
    this.avgHeight = 100;
  }

  async init() {
    this.initPageUrls();
    await this.initPageAppend();
    await this.loadAllPageImg();
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
    const document_ = await this.fetchDocument(pageUrl);
    const imgList = this.extractImageList(document_);
    const IFs = imgList.map((imgNode) => new IMGFetcher(imgNode));
    fullViewPlane.firstElementChild.nextElementSibling.after(...imgList);
    IFs.forEach(({ node }) => node.addEventListener("click", showBigImageEvent));
    IFs.forEach((imgFetcher) => imgFetcher.render());
    this.queue.push(...IFs);
    this.avgHeight = imgList.reduce((avg, img) => Math.round((img.height + avg) / 2), imgList[0].height);
    evLog("平均高度为:" + this.avgHeight);
    pageHelperHandler(2, this.queue.length);
  }

  async appendPageImg(pageUrl, oriented) {
    try {
      const document_ = await this.fetchDocument(pageUrl);
      const imgList = this.extractImageList(document_);
      const IFs = imgList.map((imgNode) => new IMGFetcher(imgNode));
      switch (oriented) {
        case "prev":
          fullViewPlane.firstElementChild.nextElementSibling.after(...imgList);
          this.queue.unshift(...IFs);
          break;
        case "next":
          fullViewPlane.lastElementChild.after(...imgList);
          this.queue.push(...IFs);
          break;
      }
      imgList.forEach((e) => {
        e.addEventListener("click", showBigImageEvent);
        e.height = this.avgHeight;
      });
      pageHelperHandler(2, this.queue.length);
      return true;
    } catch (error) {
      evLog(`从下一页或上一页中提取图片元素时出现了错误！`, error);
      return false;
    }
  }

  //从文档的字符中提取有效的缩略图元素
  extractImageList(documnt) {
    const regx = /(?<=<a\shref=\"(.*?)\">)<img\salt=\"(\d+)\"\stitle=\"(.*?)\"\ssrc=\"(.*?)\".*?><\/a>/g;
    if (!documnt) return [];
    const imageList = [];
    const iterator = documnt.matchAll(regx);
    while (true) {
      const next = iterator.next();
      if (next.done) break;
      const [, href, , title, src] = next.value;
      const img = new Image();
      img.title = title;
      img.setAttribute("ahref", href);
      img.setAttribute("asrc", src);
      imageList.push(img);
    }
    return imageList;
  }

  //通过地址请求该页的文h档
  async fetchDocument(pageUrl) {
    return await window.fetch(pageUrl).then((response) => response.text());
  }

  renderCurrView(currTop, clientHeight) {
    const ct = currTop,
      cb = currTop + clientHeight,
      colCount = conf["colCount"],
      IFs = this.queue;
    let nearlyTop = 99999,
      nearlyBottom = 99999,
      startRander = 0,
      endRander = 0;
    for (let i = 0, findBottom = false; i < IFs.length; i += colCount) {
      const { node } = IFs[i];
      if (!findBottom) {
        startRander = Math.max(i - 1 - colCount * 2, 0);
        const distance = Math.abs(node.y - ct);
        if (distance < nearlyTop) {
          nearlyTop = distance;
        } else {
          findBottom = true;
        }
      } else {
        endRander = Math.min(i - 1 + colCount * 2, IFs.length);
        const distance = Math.abs(node.y - cb);
        if (distance < nearlyBottom) {
          nearlyBottom = distance;
        } else {
          break;
        }
      }
    }
    evLog(`要渲染的范围是:${startRander}- ${endRander}`);
    IFs.slice(startRander, endRander + 1).forEach((f) => f.render());
  }
}

//防反跳，延迟执行，如果有新的事件则重置延迟时间，到达延迟时间后，只执行最后一次的事件
class Debouncer {
  constructor() {
    this.tids = [];
  }
  addEvent(event, timeout) {
    this.tids.forEach((tid) => window.clearTimeout(tid));
    this.tids = [];
    const tid = window.setTimeout(event, timeout);
    this.tids.push(tid);
  }
}

//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//===============================================配置管理器=================================================START
const signal = { first: true };

let conf = JSON.parse(window.localStorage.getItem("cfg_"));
//获取宽度
const screenWidth = window.screen.availWidth;

if (!conf || conf.version !== "2.0.2") {
  //如果配置不存在则初始化一个
  let colCount = screenWidth > 2500 ? 8 : screenWidth > 1900 ? 7 : 5;
  conf = {
    backgroundImage: `data:image/png;base64,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`,
    colCount: colCount, //每行显示的数量
    followMouse: false, //大图是否跟随鼠标
    keepScale: false, //是否保留缩放
    autoLoad: true, //是否启用空闲加载器
    fetchOriginal: false, //是否获取最佳质量的图片
    restartIdleLoader: 8000, //中止空闲加载器后的重新启动时间
    threads: 3, //同时加载的图片数量
    autoLoadPage: true, //是否自动加载所有页
    timeout: 8000, //超时时间，默认8秒
    version: "2.0.2",
    debug: true,
    first: true,
  };
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
}

const modCFG = function (k, v) {
  conf[k] = v;
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
  updateEvent(k, v);
};

const updateEvent = function (k, v) {
  switch (k) {
    case "backgroundImage": {
      let css_ = [].slice.call(styleSheel.sheet.rules).filter((rule) => rule.selectorText === ".fullViewPlane")[0];
      css_.style.backgroundImage = `url(${v})`;
      break;
    }
    case "colCount": {
      let percent = (100 - ((v * 22) / window.screen.availWidth) * 100) / v;
      percent = Math.floor(percent * 10) / 10;
      let css_ = [].slice
        .call(styleSheel.sheet.rules)
        .filter((rule) => rule.selectorText === ".fullViewPlane > img:not(.bigImageFrame)")[0];
      // css_.style.flexBasis = percent + "%";
      css_.style.width = percent + "%";
      break;
    }
    case "followMouse": {
      if (v) {
        bigImageFrame.addEventListener("mousemove", followMouseEvent);
      } else {
        bigImageFrame.removeEventListener("mousemove", followMouseEvent);
        bigImageElement.style.left = "";
      }
      break;
    }
    case "pageHelper": {
      pageHelperHandler(1, IFQ.currIndex + 1);
      pageHelperHandler(2, IFQ.length);
      break;
    }
    case "showGuide": {
      if (conf.first) {
        showGuideEvent();
        modCFG("first", false);
      }
      break;
    }
  }
};
//===============================================配置管理器=================================================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//===============================================方法区=================================================START
//图片获取器调用队列
const IFQ = new IMGFetcherQueue();
//页加载器
const PF = new PageFetcher(IFQ);
//空闲自加载器
const idleLoader = new IdleLoader(IFQ);

//向配置面板增加配置项
const createChild = function (type, parent, innerHTML) {
  const childElement = document.createElement(type);
  parent.appendChild(childElement);
  childElement.innerHTML = innerHTML;
  return childElement;
};
//===============================================方法区=================================================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//========================================事件库============================================START
//点击入口按钮事件
const gateEvent = function () {
  if (gateButton.textContent === "展开") {
    showFullViewPlan();
    if (signal["first"]) {
      signal["first"] = false;
      PF.init().then(() => idleLoader.start(0));
    }
  } else {
    hiddenFullViewPlan();
  }
};

const showFullViewPlan = function () {
  fullViewPlane.scroll(0, 0); //否则加载会触发滚动事件
  fullViewPlane.classList.remove("retract_full_view");
  document.body.style.display = "none";
  gateButton.textContent = "收起";
};

const hiddenFullViewPlanEvent = function (event) {
  if (event.target === fullViewPlane) {
    hiddenFullViewPlan();
  }
};

const hiddenFullViewPlan = function () {
  fullViewPlane.classList.add("retract_full_view");
  document.body.style.display = "";
  gateButton.textContent = "展开";
};

//全屏阅览元素的滚动事件
const scrollEvent = function () {
  //对冒泡的处理
  if (fullViewPlane.classList.contains("retract_full_view")) return;
  //根据currTop获取当前滚动高度对应的未渲染缩略图的图片元素
  PF.renderCurrView(fullViewPlane.scrollTop, fullViewPlane.clientHeight);
};

//大图框架点击事件，点击后隐藏大图框架
const hiddenBigImageEvent = function (event) {
  if (event.target.tagName === "SPAN") return;
  bigImageFrame.classList.add("retract");
  img_land_left.hidden = true;
  img_land_right.hidden = true;
  window.setTimeout(() => {
    // fragment.appendChild(bigImageFrame.firstElementChild);
    bigImageElement.hidden = true;
    pageHelper.hidden = true;
  }, 700);
};

//大图框架元素的滚轮事件/按下鼠标右键滚动则是缩放/直接滚动则是切换到下一张或上一张
const bigImageWheelEvent = function (event) {
  if (event.buttons === 2) {
    scaleImageEvent(event);
  } else {
    stepImageEvent(event.deltaY > 0 ? "next" : "prev");
  }
};

//按键事件
const KeyEvent = function (event) {
  if (img_land_left.hidden) return;
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

//大图框架添加鼠标移动事件，该事件会将让大图跟随鼠标左右移动
const followMouseEvent = function (event) {
  if (bigImageFrame.moveEventLock) return;
  bigImageFrame.moveEventLock = true;
  window.setTimeout(() => {
    bigImageFrame.moveEventLock = false;
  }, 20);
  bigImageElement.style.left = `${event.clientX - window.screen.availWidth / 2}px`;
};

//点击缩略图后展示大图元素的事件
const showBigImageEvent = function (event) {
  showBigImage(IFQ.findIndex(event.target));
};
const showBigImage = function (start) {
  //展开大图阅览元素
  bigImageFrame.classList.remove("retract");
  bigImageElement.hidden = false;
  img_land_left.hidden = false;
  img_land_right.hidden = false;
  pageHelper.hidden = false;
  //获取该元素所在的索引，并执行该索引位置的图片获取器，来获取大图
  IFQ.do(start);
};

//修正图片top位置
const fixImageTop = function (mouseY, isScale) {
  //垂直轴中心锚点，用来计算鼠标距离垂直中心点的距离，值是一个正负数
  const vertAnchor = bigImageFrame.offsetHeight >> 1;
  //大图和父元素的高度差，用来修正图片的top值，让图片即使放大后也垂直居中在父元素上
  const diffHeight = bigImageElement.offsetHeight - bigImageFrame.offsetHeight - 3;
  //如果高度差<=0，说明图片没放大，不做处理
  if (diffHeight <= 0 && !isScale) return;
  // 鼠标距离垂直中心的距离，正负值
  const dist = mouseY - vertAnchor;
  /* 移动比率，根据这个来决定imgE的top位置
     1.6是一个比率放大因子，
        比如鼠标向上移动时，移动到一定的距离就能看到图片的底部了，
                          而不是鼠标移动到浏览器的顶部才能看到图片底部 */
  const rate = Math.round((dist / vertAnchor) * 1.6 * 100) / 100;
  //如果移动比率到达1或者-1，说明图片到低或到顶，停止继续移动
  if ((rate > 1 || rate < -1) && !isScale) return;
  //根据移动比率和高度差的1/2来计算需要移动的距离
  const topMove = Math.round((diffHeight >> 1) * rate);
  /* -(diffHeight >> 1) 修正图片位置基准，让放大的图片也垂直居中在父元素上 */
  bigImageElement.style.top = -(diffHeight >> 1) + topMove + "px";
};
//缩放图片事件
const scaleImageEvent = function (event) {
  //获取图片的高度, 值是百分比
  let height = bigImageElement.style.height || "100%";
  if (event.deltaY < 0) {
    //放大
    height = parseInt(height) + 15 + "%";
  } else {
    //缩小
    height = parseInt(height) - 15 + "%";
  }
  if (parseInt(height) < 100 || parseInt(height) > 200) return;
  bigImageElement.style.height = height;
  bigImageElement.style.width = height;
  //最后对图片top进行修正
  fixImageTop(event.clientY, true);
};

//加载上一张或下一张事件
const stepImageEvent = function (oriented) {
  const start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
  IFQ.do(start, oriented);
};
//点击配置面板两侧的箭头滚动内容
const scrollToArrow = function (event) {
  let direction = event.target.getAttribute("direction");
  if (!direction) return;
  switch (direction) {
    case "left":
      configPlane.scrollTo({
        left: configPlane.scrollLeft - screenWidth / 2,
        behavior: "smooth",
      });
      break;
    case "rigth":
      configPlane.scrollTo({
        left: configPlane.scrollLeft + screenWidth / 2,
        behavior: "smooth",
      });
      break;
  }
};
//修改配置时的布尔值类型的事件
const boolElementEvent = function (event) {
  event.target.blur(); //让该输入框元素立即失去焦点
  let val = event.target.value;
  if (val === "✓") {
    event.target.value = "X";
    modCFG(event.target.getAttribute("confKey"), false);
  } else {
    event.target.value = "✓";
    modCFG(event.target.getAttribute("confKey"), true);
  }
};
//修改配置时的输入型类型事件
const inputElementEvent = function (event) {
  let val = event.target.previousElementSibling.value;
  if (val) {
    modCFG(event.target.previousElementSibling.getAttribute("confKey"), val);
  } else {
    alert("请输入有效的网络图片地址！");
  }
};
//页码指示器通用修改事件
const pageHelperHandler = function (index, value, type) {
  if (type === "fetching") {
    pageHelper.classList.add("fetching");
  } else if (type === "fetched") {
    pageHelper.classList.remove("fetching");
  } else {
    const node = [].filter.call(pageHelper.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE)[index];
    if (type === "class") {
      node.classList.add(value);
    } else {
      node.textContent = value;
    }
  }
};
//修改每行数量事件的添加
const modRowEvent = function () {
  [].slice
    .call(modRowCount.childNodes)
    .filter((node) => node.nodeType === Node.ELEMENT_NODE)
    .forEach((node, index) => {
      switch (index) {
        case 1:
        case 3: {
          node.addEventListener("click", (event) => {
            if (event.target.textContent === "-") {
              let val = event.target.nextElementSibling.value;
              event.target.nextElementSibling.value = parseInt(val) - 1;
              modCFG("colCount", parseInt(val) - 1);
            }
            if (event.target.textContent === "+") {
              let val = event.target.previousElementSibling.value;
              event.target.previousElementSibling.value = parseInt(val) + 1;
              modCFG("colCount", parseInt(val) + 1);
            }
          });
          break;
        }
        case 2: {
          node.addEventListener("input", (event) => {
            let val = event.target.value || "7";
            modCFG("colCount", parseInt(val));
          });
          break;
        }
      }
    });
};
//显示简易指南事件
const showGuideEvent = function (event) {
  const guideFull = document.createElement("div");
  document.body.after(guideFull);
  guideFull.innerHTML = `<img src="https://tvax3.sinaimg.cn/mw690/6762c771gy1gd1wqc5j1vj20r70eytcd.jpg" style="width: 60%; object-fit: contain;">`;
  guideFull.style = `position: absolute;width: 100%;height: 100%;background-color: #363c3c78;z-index: 2004;top: 0; display: flex; justify-content: center;`;
  guideFull.addEventListener("click", () => guideFull.remove());
};
//========================================事件库============================================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//==================创建入口按钮，追加到tag面板的右侧=====================START

//判断是否是Large模式，这样缩略图也算能看
if (document.querySelector("div.ths:nth-child(2)") === null) {
  const showBTNRoot = document.querySelector("#gd5");
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = `<p class="g2"><img src="https://exhentai.org/img/mr.gif"> <a id="renamelink" href="${window.location.href}?inline_set=ts_l">请切换至Large模式</a></p>`;
  showBTNRoot.appendChild(tempContainer.firstElementChild);
}

//==================创建入口按钮，追加到tag面板的右侧=====================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//========================================创建一个全屏阅读元素============================================START
const fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");
fullViewPlane.classList.add("retract_full_view");
document.body.after(fullViewPlane);

//创建一个配置面板，追加到全屏阅读元素的第一个位置
const configPlane = document.createElement("div");
configPlane.classList.add("configPlane");
fullViewPlane.appendChild(configPlane);

//向前滚动
const scrollToLeft = document.createElement("div");
configPlane.appendChild(scrollToLeft);
scrollToLeft.classList.add("scrollArrow");
scrollToLeft.classList.add("l");
scrollToLeft.addEventListener("click", scrollToArrow);
scrollToLeft.setAttribute("direction", "left");
scrollToLeft.textContent = "❮";

//向前滚动
const scrollToRigth = document.createElement("div");
configPlane.appendChild(scrollToRigth);
scrollToRigth.classList.add("scrollArrow");
scrollToRigth.classList.add("r");
scrollToRigth.addEventListener("click", scrollToArrow);
scrollToRigth.setAttribute("direction", "rigth");
scrollToRigth.textContent = "❯";

//修改背景图片
const modBGElement = createChild(
  "div",
  configPlane,
  `<span>修改背景图 : </span><input type="text" placeholder="网络图片" style="width: 200px;" confKey="backgroundImage"><button>确认</button>`
);
modBGElement.lastElementChild.addEventListener("click", inputElementEvent);

//每行显示数量
const modRowCount = createChild(
  "div",
  configPlane,
  `<span>每行数量 : </span><button>-</button><input type="text" style="width: 20px;" value="${conf.colCount}"><button>+</button>`
);
modRowEvent();

//获取最佳质量图片
const fetchOriginal = createChild(
  "div",
  configPlane,
  `<span>最佳质量图片 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="fetchOriginal"  value="${
    conf.fetchOriginal ? "✓" : "X"
  }" type="text"><button style="cursor: not-allowed;">装饰</button>`
);
fetchOriginal.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//大图是否跟随鼠标
const modfollowMouse = createChild(
  "div",
  configPlane,
  `<span>大图跟随鼠标 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="followMouse"  value="${
    conf.followMouse ? "✓" : "X"
  }" type="text"><button style="cursor: not-allowed;">装饰</button>`
);
modfollowMouse.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//下一张是否保留图片放大
const keepImageScale = createChild(
  "div",
  configPlane,
  `<span>保留缩放 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="keepScale" value="${
    conf.keepScale ? "✓" : "X"
  }" type="text"><button style="cursor: not-allowed;">装饰</button>`
);
keepImageScale.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//是否自动加载
const autoLoad = createChild(
  "div",
  configPlane,
  `<span>自动加载 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="autoLoad"  value="${
    conf.autoLoad ? "✓" : "X"
  }" type="text"><button style="cursor: not-allowed;">装饰</button>`
);
autoLoad.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//显示指南
const showGuide = createChild("div", configPlane, `<span>指南 : </span><button>打开</button>`);
showGuide.style = "margin-right: 40px;";
showGuide.lastElementChild.addEventListener("click", showGuideEvent);

//创建一个大图框架元素，追加到全屏阅读元素的第二个位置
const bigImageFrame = document.createElement("div");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.classList.add("retract");
fullViewPlane.appendChild(bigImageFrame);

//大图框架图像容器，追加到大图框架里
const fragment = document.createDocumentFragment();
const bigImageElement = document.createElement("img");

const img_land_left = document.createElement("a");
img_land_left.classList.add("img_land_left");
img_land_left.hidden = true;
const img_land_right = document.createElement("a");
img_land_right.classList.add("img_land_right");
img_land_right.hidden = true;

const pageHelper = document.createElement("div");
pageHelper.classList.add("pageHelper");
pageHelper.innerHTML = `
<button class="btn">展开</button>
|<span class="currPage">${IFQ.currIndex}</span>
/<span>${IFQ.length}</span>
|<span>...</span>
|<button class="btn">下载</button>
`;

//入口
const gateButton = [].filter.call(pageHelper.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE)[0];
gateButton.addEventListener("click", gateEvent);
//继续查看大图
const continueBigImg = [].filter.call(pageHelper.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE)[1];
continueBigImg.addEventListener("click", () => showBigImage(IFQ.currIndex));
//下载
const downloadButton = [].filter.call(pageHelper.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE)[4];
downloadButton.addEventListener("click", () => alert("未实现"));

bigImageFrame.appendChild(bigImageElement);
bigImageFrame.appendChild(img_land_left);
bigImageFrame.appendChild(img_land_right);
bigImageFrame.appendChild(pageHelper);

bigImageElement.hidden = true;

const debouncer = new Debouncer();
//全屏阅读元素滚动事件
fullViewPlane.addEventListener("scroll", () => debouncer.addEvent(scrollEvent, 300));

//全屏阅览元素点击事件，点击空白处隐藏
fullViewPlane.addEventListener("click", hiddenFullViewPlanEvent);

//取消在大图框架元素上的右键事件
bigImageFrame.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

//大图框架点击事件，点击后隐藏大图框架
bigImageFrame.addEventListener("click", hiddenBigImageEvent);

//大图框架元素的滚轮事件
bigImageFrame.addEventListener("wheel", bigImageWheelEvent);

//大图放大后鼠标移动事件
bigImageFrame.addEventListener("mousemove", (event) => {
  fixImageTop(event.clientY, false);
});

//按键事件
document.addEventListener("keyup", KeyEvent);

//点击左/右以切换上/下一张
img_land_left.onclick = (event) => {
  stepImageEvent("prev");
  event.stopPropagation();
};
img_land_right.onclick = (event) => {
  stepImageEvent("next");
  event.stopPropagation();
};
//========================================创建一个全屏阅读元素============================================FIN

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//=========================================创建样式表==================================================START
let styleSheel = document.createElement("style");
styleSheel.textContent = `
.fullViewPlane {
  width:100vw;
  height:100vh;
  align-content: start;
  background-color:#000;
  position:fixed;
  top:0;
  right:0;
  z-index:1000;
  overflow:hidden scroll;
  transition:height .4s;
  display:flex;
  flex-wrap:wrap;
  scrollbar-width:thin!important
 }
 .fullViewPlane>img:not(.bigImageFrame) {
  margin:20px 0 0 20px;
  border:3px white solid;
  box-sizing:border-box;
  align-self:start
 }
 .retract_full_view {
  height:0;
  transition:height .4s
 }
 .configPlane {
  height:30px;
  width:100%;
  background-color:#1e1c1c;
  margin:20px 20px 0;
  overflow:scroll hidden;
  white-space:nowrap;
  scrollbar-width:none!important;
  padding:0 35px;
   display: flex;
   justify-content: center;
 }
 .configPlane>div:not(.scrollArrow) {
  display:inline-block;
  background-color:#00ffff3d;
  border:1px solid black;
  margin:0 5px;
  box-sizing:border-box;
  height:30px;
  padding:0 5px
 }
 .configPlane>div>span {
  line-height:20px;
  color:black;
  font-size:15px;
  font-weight:bolder
 }
 .configPlane>div>input {
  border:2px solid black;
  border-radius:0;
  margin-top:0!important;
  vertical-align:bottom
 }
 .configPlane>div>button {
  height:25px;
  border:2px solid black;
  background-color:#383940;
  margin-top:1px;
  box-sizing:border-box;
  color:white
 }
 .bigImageFrame {
  position:fixed;
  width:100%;
  height:100%;
  right:0;
  display:flex;
  z-index:1001;
  background-color:#000000d6;
  justify-content:center;
  transition:width .4s
 }
 .bigImageFrame>img {
  width: 100%;
  height:100%;
  object-fit: contain;
  position:relative
 }
 .img_land_left {
  width:33%;
  height:100%;
  position:fixed;
  left:0;
  top:0;
  z-index:1002;
  cursor:url("https://tb2.bdstatic.com/tb/static-album/img/mouseleft.cur"),auto
 }
 .img_land_right {
  width:33%;
  height:100%;
  position:fixed;
  right:0;
  top:0;
  z-index:1002;
  cursor:url("https://tb2.bdstatic.com/tb/static-album/img/mouseright.cur"),auto
 }
 .bigImageFrame>.pageHelper {
  position: fixed;
  display: block !important;
  right: 100px;
  bottom: 40px;
  background-color: rgb(30, 28, 28);
  z-index: 1003;
  box-sizing: border-box;
  font-weight: bold;
  color: rgb(53, 170, 142);
  font-size: 1rem;
 }
 .pageHelper>.btn {
  color: rgb(255, 232, 176);
  cursor: pointer;
  border: 1px solid rgb(0, 0, 0);
  border-radius: 4px;
  height: 30px;
  font-weight: 900;
  background: rgb(70, 69, 98) none repeat scroll 0% 0%;
 }
 .pageHelper>.currPage {
  color: orange;
  font-size: 1.3rem;
  text-decoration-line: underline;
  text-decoration-style: double;
  cursor: pointer;
  text-decoration-color: #00c3ff;
 }
 .fetching {
  padding:2px;
  border:none!important;
  animation:1s linear infinite cco;
  -webkit-animation:1s linear infinite cco
 }
 @keyframes cco {
  0% {
   background-color:#f00
  }
  50% {
   background-color:#48ff00
  }
  100% {
   background-color:#ae00ff
  }
 }
 .retract {
  width:0;
  transition:width .7s
 }
 .closeBTN {
  width:100%;
  height:100%;
  background-color:#0000;
  color:#f45b8d;
  font-size:30px;
  font-weight:bold;
  border:4px #f45b8d solid;
  border-bottom-left-radius:60px
 }
 .closeBTN>span {
  position:fixed;
  right:11px;
  top:0
 }
 .scrollArrow {
  width:30px;
  height:30px;
  position:absolute;
  display:inline-block;
  z-index:1000;
  background-size:contain;
  background-color:#214e4e;
  font-weight: 900;
  font-size: 1.5rem;
  text-align: center;
  color: aquamarine;
  line-height: 30px;
  
 }
 .scrollArrow.l {
  left:20px;
 }
 .scrollArrow.r {
  right:20px;
 }
 ::-webkit-scrollbar {
  display:none!important
 }
 * {
  scrollbar-width:thin!important
 }
`;
document.head.appendChild(styleSheel);

updateEvent("backgroundImage", conf.backgroundImage);
updateEvent("colCount", conf.colCount);
updateEvent("followMouse", conf.followMouse);
updateEvent("pageHelper", null);
updateEvent("showGuide", null);
//=========================================创建样式表==================================================FIN

function evLog(msg, ...info) {
  if (conf.debug) {
    console.log("EHVP:" + msg, ...info);
  }
}

// GM.xhr简单包装
function xhrWapper(url, refer, resType, { onprogress, onload, onerror, ontimeout }) {
  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    responseType: resType,
    timeout: conf["timeout"],
    headers: {
      Referer: refer,
      "X-Alt-Referer": refer,
    },
    onprogress,
    onload,
    onerror,
    ontimeout,
  });
}
