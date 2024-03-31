import { conf, saveConf, Oriented } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { FetchState, IMGFetcher } from "../img-fetcher";
import { Debouncer } from "../utils/debouncer";
import { i18n } from "../utils/i18n";
import { sleep } from "../utils/sleep";
import Hammer from "hammerjs";
import { Elements } from "./html";
import q from "../utils/query-element";
import { VideoControl } from "./video-control";
import onMouse from "../utils/progress-bar";
import EBUS from "../event-bus";

export class BigImageFrameManager {
  frame: HTMLElement;
  queue: IMGFetcherQueue;
  lockInit: boolean;
  currMediaNode?: HTMLImageElement | HTMLVideoElement;
  lastMouseY?: number;
  recordedDistance!: number;
  reachBottom!: boolean; // for sticky mouse, if reach bottom, when mouse move up util reach top, will step next image page
  imgScaleBar: HTMLElement;
  debouncer: Debouncer;
  throttler: Debouncer;
  callbackOnWheel?: (event: WheelEvent) => void;
  hammer?: HammerManager;
  preventStep: { ele?: HTMLElement, ani?: Animation, fin: boolean } = { fin: false };
  visible: boolean = false;
  html: Elements;
  frameScrollAbort?: AbortController;
  vidController?: VideoControl;
  /* prevent mouse wheel step next image */
  constructor(HTML: Elements, queue: IMGFetcherQueue) {
    this.html = HTML;
    this.frame = HTML.bigImageFrame;
    this.queue = queue;
    this.imgScaleBar = HTML.imgScaleBar;
    this.debouncer = new Debouncer();
    this.throttler = new Debouncer("throttle");
    this.lockInit = false;
    this.resetStickyMouse();
    this.initFrame();
    this.initImgScaleBar();
    this.initImgScaleStyle();
    this.initHammer();
    EBUS.subscribe("imf-set-now", (index) => this.setNow(index));
    EBUS.subscribe("imf-on-click", (event) => this.show(event));
    EBUS.subscribe("imf-on-finished", (index, success, imf) => {
      if (!this.visible || !success) return;
      const img = this.getMediaNodes().find((img) => index === parseInt(img.getAttribute("d-index")!));
      if (!img) return;
      if (imf.contentType !== "video/mp4") {
        img.setAttribute("src", imf.blobUrl!);
        return
      }
      // if is video, then replace img with video
      // evLog("BIFM: newMediaNode: newMediaNode");
      const vid = this.newMediaNode(index, imf) as HTMLVideoElement;
      img.replaceWith(vid);
      if (img === this.currMediaNode) {
        this.currMediaNode = vid;
      }
      img.remove();
    });
    // enable auto page
    new AutoPage(this, HTML.autoPageBTN);
  }

  initHammer() {
    this.hammer = new Hammer(this.frame, {
      // touchAction: "auto",
      recognizers: [
        [Hammer.Swipe, { direction: Hammer.DIRECTION_ALL, enable: false }],
      ]
    });
    this.hammer.on("swipe", (ev) => {
      ev.preventDefault();
      if (conf.readMode === "singlePage") {
        switch (ev.direction) {
          case Hammer.DIRECTION_LEFT:
            this.queue.stepImageEvent(conf.reversePages ? "prev" : "next");
            break;
          case Hammer.DIRECTION_UP:
            this.queue.stepImageEvent("next");
            break;
          case Hammer.DIRECTION_RIGHT:
            this.queue.stepImageEvent(conf.reversePages ? "next" : "prev");
            break;
          case Hammer.DIRECTION_DOWN:
            this.queue.stepImageEvent("prev");
            break;
        }
      }
    });
  }

  resetStickyMouse() {
    this.reachBottom = false;
    this.recordedDistance = 0;
    this.lastMouseY = undefined;
  }

  flushImgScaleBar() {
    q("#img-scale-status", this.imgScaleBar).innerHTML = `${conf.imgScale}%`;
    q("#img-scale-progress-inner", this.imgScaleBar).style.width = `${conf.imgScale}%`;
  }

  setNow(index: number) {
    if (!this.visible) return;
    this.resetStickyMouse();
    // every time call this.onWheel(), will set this.lockInit to true
    if (this.lockInit) {
      this.lockInit = false;
      return
    }
    this.init(index);
  }

  init(start: number) {
    // remove frame's img children
    this.removeMediaNode();
    this.resetPreventStep();
    // evLog("BIFM: init: newMediaNode");
    this.currMediaNode = this.newMediaNode(start, this.queue[start]);
    this.frame.appendChild(this.currMediaNode);

    if (conf.readMode === "consecutively") {
      this.hammer?.get("swipe").set({ enable: false });
      this.tryExtend();
    } else {
      this.hammer?.get("swipe").set({ enable: true });
    }
    this.currMediaNode.scrollIntoView();
  }

  initFrame() {
    this.frame.addEventListener("wheel", event => {
      this.callbackOnWheel?.(event);
      this.onWheel(event);
    });
    // this.frame.addEventListener("scroll", (event) => this.onScroll(event)); // move to show()
    this.frame.addEventListener("click", (event) => this.hidden(event));
    this.frame.addEventListener("contextmenu", (event) => event.preventDefault());
    const debouncer = new Debouncer("throttle");
    this.frame.addEventListener("mousemove", event => {
      debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
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
    q("#img-increase-btn", this.imgScaleBar).addEventListener("click", () => this.scaleBigImages(1, 5));
    q("#img-decrease-btn", this.imgScaleBar).addEventListener("click", () => this.scaleBigImages(-1, 5));
    q("#img-scale-reset-btn", this.imgScaleBar).addEventListener("click", () => this.resetScaleBigImages());
    const progress = q<HTMLProgressElement>("#img-scale-progress", this.imgScaleBar);
    onMouse(progress, (percent) => this.scaleBigImages(0, 0, percent));
  }

  createNextLand(x: number, y: number) {
    this.frame.querySelector<HTMLElement>("#nextLand")?.remove();
    const nextLand = document.createElement("div");
    nextLand.setAttribute("id", "nextLand");
    const svg_bg = `<svg version="1.1" width="150" height="40" viewBox="0 0 256 256" xml:space="preserve" id="svg1" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1" /><path style="color:#000000;display:inline;mix-blend-mode:normal;fill:#86e690;fill-opacity:0.942853;fill-rule:evenodd;stroke:#000000;stroke-width:2.56;stroke-linejoin:bevel;stroke-miterlimit:10;stroke-dasharray:61.44, 2.56;stroke-dashoffset:0.768;stroke-opacity:0.319655" d="M -0.07467348,3.2775653 -160.12951,3.3501385 127.96339,156.87088 415.93447,3.2743495 255.93798,3.2807133 128.00058,48.081351 Z" id="path15" /></svg>`;
    let yFix = this.frame.clientHeight / 9;
    if (conf.stickyMouse === "reverse") {
      yFix = -yFix
    }
    nextLand.setAttribute("style",
      `position: fixed; width: 150px; height: 40px; top: ${y + yFix}px; left: ${x - 75}px; z-index: 1006;`);
    nextLand.innerHTML = svg_bg;
    nextLand.addEventListener("mouseover", () => {
      nextLand.remove();
      this.queue.stepImageEvent("next");
    });
    this.frame.appendChild(nextLand);
    window.setTimeout(() => nextLand.remove(), 1500)
  }

  removeMediaNode() {
    this.currMediaNode = undefined;
    this.vidController?.detach();
    this.vidController?.hidden();
    for (const child of Array.from(this.frame.children)) {
      if (child.nodeName.toLowerCase() === "img" || child.nodeName.toLowerCase() === "video") {
        if (child instanceof HTMLVideoElement) {
          child.pause();
          child.removeAttribute("src");
          child.load();
        }
        child.remove();
      }
    }
  }

  hidden(event?: MouseEvent) {
    if (event && event.target && (event.target as HTMLElement).tagName === "SPAN") return;
    this.visible = false;
    EBUS.emit("bifm-on-hidden");
    this.html.fullViewGrid.focus();
    this.frameScrollAbort?.abort();
    this.frame.classList.add("big-img-frame-collapse");
    this.debouncer.addEvent("TOGGLE-CHILDREN", () => this.removeMediaNode(), 200);
  }

  show(event?: Event) {
    this.visible = true;
    this.frame.classList.remove("big-img-frame-collapse");
    this.frame.focus();
    this.frameScrollAbort = new AbortController();
    this.frame.addEventListener("scroll", () => this.onScroll(), { signal: this.frameScrollAbort.signal });
    this.debouncer.addEvent("TOGGLE-CHILDREN-D", () => {
      let start = this.queue.currIndex;
      if (event && event.target) start = this.queue.findImgIndex(event.target as HTMLElement);
      this.queue.do(start); // this will trigger imgFetcher.setNow > this.setNow > this.init
    }, 100);
    EBUS.emit("bifm-on-show");
  }

  getMediaNodes(): HTMLElement[] {
    const list = Array.from(this.frame.querySelectorAll<HTMLElement>("img, video"));
    // check list is ordered by d-index
    let last = 0;
    for (const ele of list) {
      const index = parseInt(ele.getAttribute("d-index")!);
      if (index < last) {
        throw new Error("BIFM: getMediaNodes: list is not ordered by d-index");
      }
      last = index;
    }
    return list;
  }

  onWheel(event: WheelEvent) {
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
    } else if (conf.readMode === "singlePage") {
      const oriented: Oriented = event.deltaY > 0 ? "next" : "prev";
      if (this.isReachBoundary(oriented)) {
        event.preventDefault();
        if (!this.tryPreventStep()) {
          this.queue.stepImageEvent(oriented);
        }
      }
    } else {
      // move to onScroll
    }
  }

  onScroll() {
    if (conf.readMode === "consecutively") {
      this.consecutive();
    }
  }

  resetPreventStep(fin?: boolean) {
    this.preventStep.ani?.cancel();
    this.preventStep.ele?.remove();
    this.preventStep = { fin: fin ?? false };
  }

  tryPreventStep(): boolean {
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
        this.preventStep = { ele: lockEle, ani: ani, fin: false }
        ani.onfinish = () => this.resetPreventStep(true);
        ani.oncancel = () => this.resetPreventStep(true);
      }
      return true;
    }
  }

  isReachBoundary(oriented: Oriented): boolean {
    if (oriented === "prev") {
      return this.frame.scrollTop <= 0;
    }
    if (oriented === "next") {
      return this.frame.scrollTop >= this.frame.scrollHeight - this.frame.offsetHeight
    }
    return false;
  }

  consecutive() {
    this.throttler.addEvent("SCROLL", () => {
      // delay to reduce the image element in big image frame;
      this.debouncer.addEvent("REDUCE", () => {
        const distance = this.getRealOffsetTop(this.currMediaNode!) - this.frame.scrollTop;
        if (this.tryReduce()) {
          this.restoreScrollTop(this.currMediaNode!, distance);
        }
      }, 500);
      let mediaNodes = this.getMediaNodes();
      let index = this.findMediaNodeIndexOnCenter(mediaNodes);
      const centerNode = mediaNodes[index];

      const indexOfQueue = parseInt(centerNode.getAttribute("d-index")!);
      if (indexOfQueue != this.queue.currIndex) {
        // set true for prevent this.init()
        // queue.do() > imgFetcher.setNow() > this.setNow() > this.init(); 
        // in here, this.init() will be called again, set this.lockInit to prevent it
        this.lockInit = true;
        this.queue.do(indexOfQueue, indexOfQueue < this.queue.currIndex ? "prev" : "next");
        // this.vidController?.hidden();
        // play new current video
        if (this.currMediaNode instanceof HTMLVideoElement) {
          this.currMediaNode.pause();
        }
        this.tryPlayVideo(centerNode);
      }

      this.currMediaNode = centerNode as HTMLImageElement | HTMLVideoElement;
      const distance = this.getRealOffsetTop(this.currMediaNode) - this.frame.scrollTop;
      // try extend imgNodes
      if (this.tryExtend() > 0) {
        this.restoreScrollTop(this.currMediaNode, distance);
      }
    }, 60)
  }

  restoreScrollTop(imgNode: HTMLElement, distance: number) {
    this.frame.scrollTop = this.getRealOffsetTop(imgNode) - distance;
  }

  /**
   * Usually, when the central image occupies the full height of the screen, 
   * it is simple to obtain the offsetTop of that image element. 
   * However, when encountering images with aspect ratios that exceed the screen's aspect ratio, 
   * it is necessary to rely on natureWidth and natureHeight to obtain the actual offsetTop.
   */
  getRealOffsetTop(imgNode: HTMLElement) {
    // const naturalRatio = imgNode.naturalWidth / imgNode.naturalHeight;
    // const clientRatio = imgNode.clientWidth / imgNode.clientHeight;
    // if (naturalRatio > clientRatio) {
    //   const clientHeight = Math.round(imgNode.naturalHeight * (imgNode.clientWidth / imgNode.naturalWidth));
    //   // console.log(`clientHeigh should be: ${clientHeight}`);
    //   return (imgNode.clientHeight - clientHeight) / 2 + imgNode.offsetTop;
    // }
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
    const index = parseInt(mediaNode.getAttribute("d-index")!);
    if (isNaN(index)) {
      throw new Error("BIFM: extendImgNode: media node index is NaN");
    }
    if (oriented === "prev") {
      if (index === 0) return null;
      // evLog("BIFM: extendImgNode: prev newMediaNode");
      extendedNode = this.newMediaNode(index - 1, this.queue[index - 1]);
      mediaNode.before(extendedNode);
    } else {
      if (index === this.queue.length - 1) return null;
      // evLog("BIFM: extendImgNode: next newMediaNode");
      extendedNode = this.newMediaNode(index + 1, this.queue[index + 1]);
      mediaNode.after(extendedNode);
    }
    return extendedNode;
  }

  newMediaNode(index: number, imf: IMGFetcher): HTMLImageElement | HTMLVideoElement {
    if (!imf) throw new Error("BIFM: newMediaNode: img fetcher is null");
    if (imf.contentType === "video/mp4") {
      const vid = document.createElement("video");
      vid.classList.add("bifm-img");
      vid.classList.add("bifm-vid");
      vid.setAttribute("d-index", index.toString());
      vid.onloadeddata = () => {
        if (this.visible && index === this.queue.currIndex) {
          this.tryPlayVideo(vid);
        }
      };
      vid.src = imf.blobUrl!;
      // vid.addEventListener("click", () => this.hidden());
      return vid;
    } else {
      const img = document.createElement("img");
      img.classList.add("bifm-img");
      // img.addEventListener("click", () => this.hidden());
      img.setAttribute("d-index", index.toString());
      if (imf.stage === FetchState.DONE) {
        img.src = imf.blobUrl!;
      } else {
        img.src = imf.node.src;
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
   */
  scaleBigImages(fix: number, rate: number, _percent?: number): number {
    let percent = 0;
    const cssRules = Array.from(this.html.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bifm-img") {
          // if is default scale, then set height to unset, and compute current width percent
          if (!conf.imgScale) conf.imgScale = 0; // fix imgScale if it is null
          if (conf.imgScale == 0 && (_percent || this.currMediaNode)) {
            // compute current width percent
            percent = _percent ?? Math.round(this.currMediaNode!.offsetWidth / this.frame.offsetWidth * 100);
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
    if (conf.readMode === "singlePage" && this.currMediaNode && this.currMediaNode.offsetHeight <= this.frame.offsetHeight) {
      this.resetScaleBigImages();
    } else {
      conf.imgScale = percent;
    }
    saveConf(conf);
    this.flushImgScaleBar();
    return percent;
  }

  resetScaleBigImages() {
    const cssRules = Array.from(this.html.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bifm-img") {
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

  stickyMouse(event: MouseEvent, lastMouseY: number): [boolean, number] {
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
          // At least (screenHeight / 9)px of movement is required to confirm reaching the bottom.
          this.reachBottom = this.recordedDistance >= (this.frame.clientHeight / 9);
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

}

// 自动翻页
class AutoPage {
  frameManager: BigImageFrameManager;
  status: 'stop' | 'running';
  button: HTMLElement;
  lockVer: number;
  restart: boolean;
  constructor(frameManager: BigImageFrameManager, root: HTMLElement) {
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

  async start(lockVer: number) {
    this.status = "running";
    (this.button.firstElementChild as HTMLSpanElement).innerText = i18n.autoPagePause.get();
    const b = this.frameManager.frame;
    if (this.frameManager.frame.classList.contains("big-img-frame-collapse")) {
      this.frameManager.show();
    }
    const progress = q("#auto-page-progress", this.button);
    while (true) {
      await sleep(10);
      progress.style.animation = `${conf.autoPageInterval ?? 10000}ms linear main-progress`;
      await sleep(conf.autoPageInterval ?? 10000);
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
    const progress = q("#auto-page-progress", this.button);
    progress.style.animation = ``;
    this.lockVer += 1;
    (this.button.firstElementChild as HTMLSpanElement).innerText = i18n.autoPagePlay.get();
  }
}

