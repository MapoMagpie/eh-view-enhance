import { conf, saveConf, Oriented } from "../config";
import { FetchState, IMGFetcher } from "../img-fetcher";
import { Debouncer } from "../utils/debouncer";
import { sleep } from "../utils/sleep";
import { Elements } from "./html";
import q from "../utils/query-element";
import { VideoControl } from "./video-control";
import EBUS from "../event-bus";
import { Chapter } from "../page-fetcher";
import queryCSSRules from "../utils/query-cssrules";
import { Scroller } from "../utils/scroller";
import { TouchManager } from "../utils/touch";

type MediaElement = HTMLImageElement | HTMLVideoElement;

export class BigImageFrameManager {
  frame: HTMLElement;
  lockInit: boolean;
  fragment: DocumentFragment;
  // image decode will take a while, so cache it to fragment
  elements: { next: MediaElement[], curr: MediaElement[], prev: MediaElement[] } = { next: [], curr: [], prev: [] };
  debouncer: Debouncer;
  throttler: Debouncer;
  callbackOnWheel?: (event: WheelEvent) => void;
  preventStep: { ele?: HTMLElement, ani?: Animation, currentPreventFinished: boolean } = { currentPreventFinished: false };
  visible: boolean = false;
  html: Elements;
  frameScrollAbort?: AbortController;
  vidController?: VideoControl;
  chapterIndex: number = 0;
  getChapter: (index: number) => Chapter;
  loadingHelper: HTMLElement;
  currLoadingState: Map<number, number> = new Map();
  scroller: Scroller;
  lastMouse?: { x: number, y: number };
  private pageNumInChapter: number[] = [];

  constructor(HTML: Elements, getChapter: (index: number) => Chapter) {
    this.html = HTML;
    this.frame = HTML.bigImageFrame;
    this.fragment = new DocumentFragment();
    this.debouncer = new Debouncer();
    this.throttler = new Debouncer("throttle");
    this.lockInit = false;
    this.getChapter = getChapter;
    this.scroller = new Scroller(this.frame);
    this.initFrame();
    this.initImgScaleStyle();
    EBUS.subscribe("pf-change-chapter", index => {
      this.elements = { next: [], curr: [], prev: [] };
      this.chapterIndex = Math.max(0, index);
    });
    EBUS.subscribe("imf-on-click", (imf) => this.show(imf));
    EBUS.subscribe("imf-on-finished", (index, success, imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      this.currLoadingState.delete(index);
      if (!this.visible || !success) return;
      const elements = [
        ...this.elements.curr.map((e, i) => ({ img: e, eleIndex: i, key: "curr" })),
        ...this.elements.prev.map((e, i) => ({ img: e, eleIndex: i, key: "prev" })),
        ...this.elements.next.map((e, i) => ({ img: e, eleIndex: i, key: "next" })),
        ...this.getMediaNodes().map((e, i) => ({ img: e, eleIndex: i, key: "" }))
      ];
      const ret = elements.find((o) => index === parseIndex(o.img));
      if (!ret) return;
      const { img, eleIndex, key } = ret;
      // if is video, then replace img with video
      if (imf.contentType?.startsWith("video")) {
        const vid = this.newMediaNode(index, imf) as HTMLVideoElement;
        if (["curr", "prev", "next"].includes(key)) {
          this.elements[key as "curr" | "prev" | "next"][eleIndex] = vid;
        }
        img.replaceWith(vid);
        img.remove();
        return;
      }
      img.setAttribute("src", imf.node.blobSrc!);
      this.debouncer.addEvent("FLUSH-LOADING-HELPER", () => this.flushLoadingHelper(), 20);
    });

    this.loadingHelper = document.createElement("span");
    this.loadingHelper.id = "bifm-loading-helper";
    this.loadingHelper.style.position = "absolute";
    this.loadingHelper.style.zIndex = "3000";
    this.loadingHelper.style.display = "none";
    this.loadingHelper.style.padding = "0px 3px";
    this.loadingHelper.style.backgroundColor = "#ffffff90";
    this.loadingHelper.style.fontWeight = "bold";
    this.loadingHelper.style.left = "0px";
    this.frame.append(this.loadingHelper);

    EBUS.subscribe("imf-download-state-change", (imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      const element = this.elements.curr.find(e => e.getAttribute("d-random-id") === imf.randomID);
      if (!element) return;
      const index = parseIndex(element);
      this.currLoadingState.set(index, Math.floor(imf.downloadState.loaded / imf.downloadState.total * 100));
      this.debouncer.addEvent("FLUSH-LOADING-HELPER", () => this.flushLoadingHelper(), 20);
    });

    // enable auto page
    new AutoPage(this, this.scroller, HTML.autoPageBTN);
  }

  initFrame() {
    this.frame.addEventListener("wheel", (event) => this.onWheel(event, true));
    this.frame.addEventListener("contextmenu", (event) => event.preventDefault());
    const debouncer = new Debouncer("throttle");
    let magnifying = true;
    // for stick mouse
    this.frame.addEventListener("mousemove", (mmevt) => {
      if (conf.stickyMouse === "disable" || conf.readMode !== "pagination") return;
      if (magnifying) return;
      debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
        if (this.lastMouse) {
          stickyMouse(this.frame, mmevt, this.lastMouse, conf.stickyMouse === "enable");
        }
        this.lastMouse = { x: mmevt.clientX, y: mmevt.clientY };
      }, 5);
    });
    // for click
    this.frame.addEventListener("mousedown", (mdevt) => {
      if (mdevt.button !== 0) return;
      if ((mdevt.target as HTMLElement).classList.contains("img-land")) return;
      magnifying = true;
      let moved = false;
      let last = { x: mdevt.clientX, y: mdevt.clientY };
      const abort = new AbortController();
      // mouseup 
      this.frame.addEventListener("mouseup", (muevt) => {
        abort.abort();
        if (!moved) {
          this.hidden(muevt);
        } else if (conf.imgScale === 100) {
          this.scaleBigImages(1, 0, conf.imgScale, false);
        }
        moved = false;
        magnifying = false;
      }, { once: true });
      // for magnifier, mouse move
      this.frame.addEventListener("mousemove", (mmevt) => {
        if (!conf.magnifier || conf.readMode !== "pagination") return;
        if (!moved && conf.imgScale === 100) { // temporarily zoom if img not scale
          this.scaleBigImages(1, 0, 150, false);
        }
        moved = true;
        debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
          stickyMouse(this.frame, mmevt, last, true);
          last = { x: mmevt.clientX, y: mmevt.clientY };
        }, 5);
      }, { signal: abort.signal });
    });
    // touch
    new TouchManager(this.frame, {
      swipe: (direction) => {
        if (conf.readMode === "continuous") return;
        const oriented: Oriented = (() => {
          switch (direction) {
            case "L":
              return conf.reversePages ? "next" : "prev";
            case "R":
              return conf.reversePages ? "prev" : "next";
            case "U":
              return "next";
            case "D":
              return "prev";
          }
        })();
        if (conf.imgScale === 100) {
          this.stepNext(oriented);
        } else if (this.isReachedBoundary(oriented, direction === "L" || direction === "R") && !this.tryPreventStep()) {
          this.stepNext(oriented);
        }
      },
    });
  }

  scroll(y: number) {
    this.scroller.step = conf.scrollingSpeed;
    this.scroller.scroll(y);
  }

  scrollStop() {
    this.scroller.scrolling = false;
  }

  hidden(event?: MouseEvent) {
    if (event && event.target && (event.target as HTMLElement).tagName === "SPAN") return;
    this.visible = false;
    EBUS.emit("bifm-on-hidden");
    this.html.fullViewGrid.focus();
    this.frameScrollAbort?.abort();
    this.frame.classList.add("big-img-frame-collapse");
    this.debouncer.addEvent("TOGGLE-CHILDREN", () => this.resetElements(), 200);
  }

  show(imf: IMGFetcher) {
    this.visible = true;
    this.frame.classList.remove("big-img-frame-collapse");
    this.frame.focus();
    this.frameScrollAbort = new AbortController();
    this.frame.addEventListener("scroll", () => this.onScroll(), { signal: this.frameScrollAbort.signal });
    // setNow
    this.debouncer.addEvent("TOGGLE-CHILDREN-D", () => (imf.chapterIndex === this.chapterIndex) && this.setNow(imf), 100);
    EBUS.emit("bifm-on-show");
  }

  setNow(imf: IMGFetcher, oriented?: Oriented) {
    if (this.visible) {
      this.initElements(imf, oriented);
    } else {
      const queue = this.getChapter(this.chapterIndex).queue;
      const index = queue.indexOf(imf);
      if (index === -1) return;
      this.pageNumInChapter[this.chapterIndex] = index;
      EBUS.emit("ifq-do", index, imf, oriented || "next");
    }
    this.lastMouse = undefined;
    this.currLoadingState.clear();
    this.flushLoadingHelper();
  }

  initElements(imf: IMGFetcher, oriented: Oriented = "next") {
    this.resetPreventStep();
    const queue = this.getChapter(this.chapterIndex).queue;
    const index = queue.indexOf(imf);
    if (index === -1) return;
    if (conf.readMode === "continuous") {
      this.resetElements();
      this.elements.curr[0] = this.newMediaNode(index, imf);
      this.frame.appendChild(this.elements.curr[0]);
      this.tryExtend();
    } else {
      this.balanceElements(index, queue, oriented);
      this.placeElements();
      this.checkFrameOverflow();
    }
    this.pageNumInChapter[this.chapterIndex] = index;
    EBUS.emit("ifq-do", index, imf, oriented);
    this.elements.curr[0]?.scrollIntoView();
  }

  placeElements() {
    this.removeMediaNode();// remove element from root;
    this.elements.curr.forEach(element => this.frame.appendChild(element));
    this.elements.prev.forEach(element => this.fragment.appendChild(element));
    this.elements.next.forEach(element => this.fragment.appendChild(element));
    const vid = this.elements.curr[0];
    if (vid && vid instanceof HTMLVideoElement) {
      if (vid.paused) this.tryPlayVideo(vid);
    }
  }

  balanceElements(index: number, queue: IMGFetcher[], oriented: Oriented) {
    const indices: { prev: number[], curr: number[], next: number[] } = { prev: [], curr: [], next: [] }
    for (let i = 0; i < conf.paginationIMGCount; i++) {
      const prevIndex = i + index - conf.paginationIMGCount;
      const currIndex = i + index;
      const nextIndex = i + index + conf.paginationIMGCount;
      if (prevIndex > -1) indices.prev.push(prevIndex);
      if (currIndex > -1 && currIndex < queue.length) indices.curr.push(currIndex);
      if (nextIndex < queue.length) indices.next.push(nextIndex);
    }
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
      const elements = this.elements[k as "prev" | "curr" | "next"];
      if (elements.length > indexRange.length) {
        elements.splice(indexRange.length, elements.length - indexRange.length).forEach(ele => ele.remove());
      }
      for (let j = 0; j < indexRange.length; j++) {
        if (indexRange[j] === parseIndex(elements[j])) continue;
        if (elements[j]) elements[j].remove();
        elements[j] = this.newMediaNode(indexRange[j], queue[indexRange[j]]);
      }
    });
  }

  resetElements() {
    this.elements = { prev: [], curr: [], next: [] };
    this.fragment.childNodes.forEach(child => child.remove());
    this.removeMediaNode();
  }

  removeMediaNode() {
    this.vidController?.detach();
    this.vidController?.hidden();
    this.getMediaNodes().forEach(ele => {
      if (ele instanceof HTMLVideoElement) {
        ele.pause();
      }
      ele.remove();
    });
  }

  getMediaNodes(): MediaElement[] {
    const list = Array.from(this.frame.querySelectorAll<MediaElement>("img, video"));
    // check list is ordered by d-index
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

  stepNext(oriented: Oriented, fixStep: number = 0, current?: number) {
    let index = current !== undefined ? current : this.elements.curr[0] ? parseInt(this.elements.curr[0].getAttribute("d-index")!) : undefined;
    if (index === undefined || isNaN(index)) return;
    const queue = this.getChapter(this.chapterIndex)?.queue;
    if (!queue || queue.length === 0) return;
    index = oriented === "next" ? index + conf.paginationIMGCount : index - conf.paginationIMGCount;
    if (conf.paginationIMGCount > 1) {
      index += fixStep;
    }
    // current === -1 and oriented === "prev", this called by kayboard event "step-to-last-image", so reset index to last
    if (index < -conf.paginationIMGCount) {
      index = queue.length - 1;
    } else {
      index = Math.max(0, index);
    }
    if (!queue[index]) return
    this.setNow(queue[index], oriented);
  }

  // isMouse: onWheel triggered by mousewheel, if not, means by keyboard control
  onWheel(event: WheelEvent, isMouse?: boolean, preventCallback?: boolean) {
    if (!preventCallback) this.callbackOnWheel?.(event);
    // right click + scroll
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
      return;
    }
    // consecutively will proceed by onScroll
    if (conf.readMode === "continuous") return;

    const oriented: Oriented = event.deltaY > 0 ? "next" : "prev";

    // if sticky mouse is enabled, just simplely scroll to next page;
    if (conf.stickyMouse === "disable") {
      if (!this.isReachedBoundary(oriented)) return;
      if (isMouse && this.tryPreventStep()) return;
    }
    event.preventDefault();
    this.stepNext(oriented);
  }

  onScroll() {
    if (conf.readMode === "continuous") {
      this.consecutive();
    }
  }

  resetPreventStep(fin?: boolean) {
    this.preventStep.ani?.cancel();
    this.preventStep.ele?.remove();
    this.preventStep = { currentPreventFinished: fin ?? false };
  }

  // prevent scroll to next page while mouse scrolling;
  tryPreventStep(): boolean {
    if (!conf.imgScale || conf.imgScale === 100 || conf.preventScrollPageTime === 0) {
      return false;
    }
    if (this.preventStep.currentPreventFinished) {
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
        lockEle.innerHTML = `<div style="width: 30vw;height: 0.1rem;background-color: #1b00ff59;text-align: center;font-size: 0.8rem;position: relative;font-weight: 800;color: gray;border-radius: 7px;border: 1px solid #510000;"><span style="position: absolute;bottom: -3px;"></span></div>`;
        this.frame.appendChild(lockEle);
        this.preventStep.ele = lockEle;
        // prevent time < 0 means prevent paging forever
        if (conf.preventScrollPageTime > 0) {
          const ani = lockEle.children[0].animate([{ width: "30vw" }, { width: "0vw" }], { duration: conf.preventScrollPageTime });
          ani.onfinish = () => this.preventStep.ele && this.resetPreventStep(true);
          this.preventStep.ani = ani;
        }
        this.preventStep.currentPreventFinished = false;
      }
      return true;
    }
  }

  isReachedBoundary(oriented: Oriented, side: boolean = false): boolean {
    if (!side) {
      if (oriented === "prev") {
        return this.frame.scrollTop <= 0;
      }
      if (oriented === "next") {
        return this.frame.scrollTop >= this.frame.scrollHeight - this.frame.offsetHeight;
      }
    } else {
      if (oriented === "prev") {
        return this.frame.scrollLeft <= 0;
      }
      if (oriented === "next") {
        return this.frame.scrollLeft >= this.frame.scrollWidth - this.frame.offsetWidth;
      }
    }
    return false;
  }

  consecutive() {
    this.throttler.addEvent("SCROLL", () => {
      // delay to reduce the image element in big image frame;
      this.debouncer.addEvent("REDUCE", () => {
        if (!this.elements.curr[0]) return;
        const distance = this.getRealOffsetTop(this.elements.curr[0]) - this.frame.scrollTop;
        if (this.tryReduce()) {
          this.restoreScrollTop(this.elements.curr[0], distance);
        }
      }, 500);
      const mediaNodes = this.getMediaNodes();
      const index = this.findMediaNodeIndexOnCenter(mediaNodes);
      const centerNode = mediaNodes[index];

      if (this.elements.curr[0] !== centerNode) {
        const oldIndex = parseIndex(this.elements.curr[0]);
        const newIndex = parseIndex(centerNode);
        const oriented = oldIndex < newIndex ? "next" : "prev";
        const queue = this.getChapter(this.chapterIndex).queue;
        if (queue.length === 0 || newIndex < 0 || newIndex > queue.length - 1) return;
        const imf = queue[newIndex];
        this.pageNumInChapter[this.chapterIndex] = newIndex;
        EBUS.emit("ifq-do", newIndex, imf, oriented);
        // play new current video
        if (this.elements.curr[0] instanceof HTMLVideoElement) {
          this.elements.curr[0].pause();
        }
        this.tryPlayVideo(centerNode);
      }
      this.elements.curr[0] = centerNode;
      const distance = this.getRealOffsetTop(this.elements.curr[0]) - this.frame.scrollTop;
      // try extend imgNodes
      if (this.tryExtend() > 0) {
        this.restoreScrollTop(this.elements.curr[0], distance);
      }
    }, 60)
  }

  restoreScrollTop(imgNode: HTMLElement, distance: number) {
    this.frame.scrollTop = this.getRealOffsetTop(imgNode) - distance;
  }

  getRealOffsetTop(imgNode: HTMLElement) {
    return imgNode.offsetTop;
  }

  tryExtend(): number {
    let indexOffset = 0;
    let mediaNodes = [];
    let scrollTopFix = 0;
    // try extend prev, until has enough scroll up space
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
    // try extend next, until has enough scroll down space
    while (true) {
      mediaNodes = this.getMediaNodes();
      const last = mediaNodes[mediaNodes.length - 1];
      if (last.offsetTop < this.frame.scrollTop + this.frame.offsetHeight) {
        if (this.extendImgNode(last, "next") === null) break;
      } else {
        break;
      }
    }
    return indexOffset;
  }

  tryReduce(): boolean {
    const imgNodes = this.getMediaNodes();
    const shouldRemoveNodes = [];
    let oriented: Oriented | "remove" = "prev";
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
    if (shouldRemoveNodes.length === 0) return false;
    for (const imgNode of shouldRemoveNodes) {
      imgNode.remove();
    }
    return true;
  }

  extendImgNode(mediaNode: HTMLElement, oriented: Oriented): HTMLImageElement | HTMLVideoElement | null {
    let extendedNode: HTMLImageElement | HTMLVideoElement | null;
    const index = parseIndex(mediaNode);
    if (index === -1) {
      throw new Error("BIFM: extendImgNode: media node index is NaN");
    }
    const queue = this.getChapter(this.chapterIndex).queue;
    if (queue.length === 0) return null;
    if (oriented === "prev") {
      if (index === 0) return null;
      // evLog("BIFM: extendImgNode: prev newMediaNode");
      extendedNode = this.newMediaNode(index - 1, queue[index - 1]);
      mediaNode.before(extendedNode);
    } else {
      if (index === queue.length - 1) return null;
      // evLog("BIFM: extendImgNode: next newMediaNode");
      extendedNode = this.newMediaNode(index + 1, queue[index + 1]);
      mediaNode.after(extendedNode);
    }
    return extendedNode;
  }

  newMediaNode(index: number, imf: IMGFetcher): MediaElement {
    if (!imf) throw new Error("BIFM: newMediaNode: img fetcher is null");
    if (imf.contentType?.startsWith("video")) {
      const vid = document.createElement("video");
      vid.classList.add("bifm-img");
      vid.classList.add("bifm-vid");
      vid.draggable = !(conf.magnifier && conf.readMode === "pagination");
      vid.setAttribute("d-index", index.toString());
      vid.setAttribute("d-random-id", imf.randomID);
      vid.onloadeddata = () => {
        if (this.visible && vid === this.elements.curr[0]) {
          this.tryPlayVideo(vid);
        }
      };
      vid.src = imf.node.blobSrc!;
      // vid.addEventListener("click", () => this.hidden());
      return vid;
    } else {
      const img = document.createElement("img");
      img.decoding = "sync";
      img.classList.add("bifm-img");
      img.draggable = !(conf.magnifier && conf.readMode === "pagination");
      // img.addEventListener("click", () => this.hidden());
      img.setAttribute("d-index", index.toString());
      img.setAttribute("d-random-id", imf.randomID);
      if (imf.stage === FetchState.DONE) {
        img.src = imf.node.blobSrc!;
      } else {
        img.src = imf.node.thumbnailSrc;
      }
      return img;
    }
  }

  tryPlayVideo(vid: HTMLElement) {
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
   * @param syncConf: sync to config, default = true 
   */
  scaleBigImages(fix: number, rate: number, _percent?: number, syncConf?: boolean): number {
    const rule = queryCSSRules(this.html.styleSheet, ".bifm-img");
    if (!rule) return 0;

    let percent = _percent || parseInt(conf.readMode === "pagination" ? rule.style.height : rule.style.width);
    if (isNaN(percent)) percent = 100;
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
      rule.style.minWidth = percent > 100 ? "" : "100vw";
      if (percent === 100) this.resetScaleBigImages(false);
      this.checkFrameOverflow();
    }
    if (syncConf ?? true) {
      conf.imgScale = percent;
      saveConf(conf);
    }
    q("#scaleInput", this.html.pageHelper).textContent = `${percent}`;
    return percent;
  }

  checkFrameOverflow() {
    const flexRule = queryCSSRules(this.html.styleSheet, ".bifm-flex");
    if (flexRule) {
      const width = Array.from(this.frame.querySelectorAll<HTMLImageElement>(".bifm-img")).reduce((width, img) => width + img.offsetWidth, 0);
      if (width > this.frame.offsetWidth) {
        flexRule.style.justifyContent = "flex-start";
      } else {
        flexRule.style.justifyContent = "center";
      }
    }
  }

  resetScaleBigImages(syncConf: boolean) {
    const rule = queryCSSRules(this.html.styleSheet, ".bifm-img");
    if (!rule) return;
    let percent = 100;
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
      if (conf.paginationIMGCount === 1) rule.style.minWidth = "100vw";
    } else {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
      rule.style.maxWidth = "100vw";
      rule.style.width = isMobile ? "100vw" : "80vw";
      rule.style.margin = "0 auto";
      percent = isMobile ? 100 : 80;
    }
    if (syncConf) {
      conf.imgScale = percent;
      saveConf(conf);
      q("#scaleInput", this.html.pageHelper).textContent = `${conf.imgScale}`;
    }
  }

  initImgScaleStyle() {
    this.resetScaleBigImages(false);
    if (conf.imgScale && conf.imgScale > 0) {
      this.scaleBigImages(1, 0, conf.imgScale);
    }
  }

  findMediaNodeIndexOnCenter(imgNodes: HTMLElement[]): number {
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

  flushLoadingHelper() {
    if (this.currLoadingState.size === 0) {
      this.loadingHelper.style.display = "none";
    } else {
      if (this.loadingHelper.style.display === "none") {
        this.loadingHelper.style.display = "inline-block";
      }
      const ret = Array.from(this.currLoadingState).map(([k, v]) => `[P-${k + 1}: ${v}%]`);
      if (conf.reversePages) ret.reverse();
      this.loadingHelper.textContent = `Loading ${ret.join(",")}`;
    }
  }

  getPageNumber() {
    return this.pageNumInChapter[this.chapterIndex] ?? 0;
  }
}

// 自动翻页
class AutoPage {
  bifm: BigImageFrameManager;
  status: 'stop' | 'running';
  button: HTMLElement;
  lockVer: number;
  scroller: Scroller;
  constructor(BIFM: BigImageFrameManager, scroller: Scroller, root: HTMLElement) {
    this.bifm = BIFM;
    this.scroller = scroller;
    this.status = "stop";
    this.button = root;
    this.lockVer = 0;
    this.bifm.callbackOnWheel = () => {
      if (this.status === "running") {
        this.stop();
        this.start(this.lockVer);
      }
    };
    EBUS.subscribe("bifm-on-hidden", () => this.stop());
    EBUS.subscribe("bifm-on-show", () => conf.autoPlay && this.start(this.lockVer));
    EBUS.subscribe("toggle-auto-play", () => {
      if (this.status === "stop") {
        this.start(this.lockVer);
      } else {
        this.stop();
      }
    });
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

  async start(lockVer: number) {
    this.status = "running";
    this.button.setAttribute("data-status", "playing");
    const displayTexts = this.button.getAttribute("data-display-texts")!.split(",");
    (this.button.firstElementChild as HTMLSpanElement).innerText = displayTexts[1];
    const frame = this.bifm.frame;
    if (!this.bifm.visible) {
      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
      if (queue.length === 0) return;
      const index = Math.max(parseIndex(this.bifm.elements.curr[0]), 0);
      this.bifm.show(queue[index]);
    }
    const progress = q("#auto-page-progress", this.button);
    const interval = () => conf.readMode === "pagination" ? conf.autoPageSpeed : 1;
    while (true) {
      await sleep(10); // need to wait 10ms for animation style changed
      progress.style.animation = `${interval() * 1000}ms linear main-progress`;
      await sleep(interval() * 1000);
      if (this.lockVer !== lockVer) {
        return;
      }
      progress.style.animation = ``;
      // this.stop has been called
      if (this.status !== "running") {
        break;
      }

      if (this.bifm.elements.curr.length === 0) break;
      // check boundary
      const index = parseInt(this.bifm.elements.curr[0]?.getAttribute("d-index")!);
      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
      if (index < 0 || index >= queue.length) break;

      if (conf.readMode === "pagination") {
        if (this.bifm.isReachedBoundary("next")) {
          const curr = this.bifm.elements.curr[0]!;
          if (curr instanceof HTMLVideoElement) {
            let resolve: () => void;
            const promise = new Promise<void>(r => resolve = r);
            curr.addEventListener("timeupdate", () => {
              if (curr.currentTime >= curr.duration - 1) {
                sleep(1000).then(resolve);
              }
            });
            await promise;
          }
          this.bifm.onWheel(new WheelEvent("wheel", { deltaY: 1 }), false, true);
        } else {
          const deltaY = this.bifm.frame.offsetHeight / 2;
          frame.scrollBy({ top: deltaY, behavior: "smooth" });
        }
      } else {
        this.scroller.step = conf.autoPageSpeed;
        this.scroller.scroll(this.bifm.frame.offsetHeight);
      }
    }
    this.stop();
  }

  stop() {
    this.status = "stop";
    this.button.setAttribute("data-status", "paused");
    const progress = q("#auto-page-progress", this.button);
    progress.style.animation = ``;
    this.lockVer += 1;
    const displayTexts = this.button.getAttribute("data-display-texts")!.split(",");
    (this.button.firstElementChild as HTMLSpanElement).innerText = displayTexts[0];
    this.scroller.scroll(-1);
  }
}

function parseIndex(ele: HTMLElement): number {
  if (!ele) return -1;
  const d = ele.getAttribute("d-index") || "";
  const i = parseInt(d);
  return isNaN(i) ? -1 : i;
}

function stickyMouse(element: HTMLElement, event: MouseEvent, lastMouse: { x: number, y: number }, reverse: boolean) {
  let [distanceY, distanceX] = [event.clientY - lastMouse.y, event.clientX - lastMouse.x];
  if (reverse) [distanceY, distanceX] = [-distanceY, -distanceX];

  const overflowY = element.scrollHeight - element.offsetHeight;
  if (overflowY > 0) {
    const rateY = overflowY / (element.offsetHeight / 4) * 3;
    let scrollTop = element.scrollTop + distanceY * rateY;
    scrollTop = Math.max(scrollTop, 0);
    scrollTop = Math.min(scrollTop, overflowY);
    element.scrollTop = scrollTop;
  }
  const overflowX = element.scrollWidth - element.offsetWidth;
  if (overflowX > 0) {
    const rateX = overflowX / (element.offsetWidth / 4) * 3;
    let scrollLeft = element.scrollLeft + distanceX * rateX;
    if (conf.reversePages) { // if conf reversePages, then scrollLeft should be negative
      scrollLeft = Math.min(scrollLeft, 0);
      scrollLeft = Math.max(scrollLeft, -overflowX);
    } else {
      scrollLeft = Math.max(scrollLeft, 0);
      scrollLeft = Math.min(scrollLeft, overflowX);
    }
    element.scrollLeft = scrollLeft;
  }
}


