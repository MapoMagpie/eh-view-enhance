import { conf, Oriented, saveConf } from "../config";
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
import { DEFAULT_THUMBNAIL } from "../img-node";

type MediaElement = HTMLImageElement | HTMLVideoElement;

export class BigImageFrameManager {
  root: HTMLElement;
  container: HTMLElement;
  observer: IntersectionObserver;
  intersectingElements: HTMLElement[] = [];
  renderingElements: HTMLElement[] = [];
  currentIndex: number = 0;

  lockInit: boolean;
  preventStep: { ele?: HTMLElement, ani?: Animation, currentPreventFinished: boolean } = { currentPreventFinished: false };

  debouncer: Debouncer;
  throttler: Debouncer;

  callbackOnWheel?: (event: WheelEvent) => void;

  visible: boolean = false;
  html: Elements;
  frameScrollAbort?: AbortController;
  vidController?: VideoControl;
  chapterIndex: number = 0;
  getChapter: (index: number) => Chapter;
  loadingHelper: HTMLElement;
  currLoadingState: Map<number, number> = new Map();

  scrollerY: Scroller;
  scrollerX: Scroller;
  lastMouse?: { x: number, y: number };
  pageNumInChapter: number[] = [];

  constructor(HTML: Elements, getChapter: (index: number) => Chapter) {
    this.html = HTML;
    this.root = HTML.bigImageFrame;
    this.lockInit = false;
    this.debouncer = new Debouncer();
    this.throttler = new Debouncer("throttle");
    this.getChapter = getChapter;
    this.scrollerY = new Scroller(this.root);
    this.scrollerX = new Scroller(this.root, undefined, "x");

    this.container = document.createElement("div");
    this.container.classList.add("bifm-container");
    switch (conf.readMode) {
      case "continuous":
        this.container.classList.add("bifm-container-vert");
        break;
      case "pagination":
      case "horizontal":
        this.container.classList.add("bifm-container-hori");
        break;
    }
    this.observer = new IntersectionObserver((entries) => this.intersecting(entries), { root: this.root });
    this.root.appendChild(this.container);

    this.initEvent();

    EBUS.subscribe("pf-on-appended", (_total, nodes, chapterIndex) => {
      if (chapterIndex !== this.chapterIndex) return;
      this.append(nodes);
    });
    EBUS.subscribe("pf-change-chapter", index => {
      this.chapterIndex = Math.max(0, index);
      this.container.innerHTML = "";
    });

    EBUS.subscribe("imf-on-click", (imf) => this.show(imf));
    EBUS.subscribe("imf-on-finished", (index, success, imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      this.currLoadingState.delete(index);
      this.debouncer.addEvent("FLUSH-LOADING-HELPER", () => this.flushLoadingHelper(), 20);

      if (!this.visible || !success) return;
      const current = this.renderingElements.find(element => parseIndex(element) === index);
      if (current) {
        current.innerHTML = "";
        current.appendChild(this.newMediaNode(imf));
      }
    });
    EBUS.subscribe("imf-resize", (imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      this.onResize(imf);
    });

    this.loadingHelper = document.createElement("span");
    this.loadingHelper.id = "bifm-loading-helper";
    this.root.appendChild(this.loadingHelper);

    EBUS.subscribe("imf-download-state-change", (imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      const [start, end] = [this.currentIndex, this.currentIndex + (conf.readMode !== "pagination" ? 1 : conf.paginationIMGCount)];
      if (imf.index < start || imf.index >= end) return;
      this.currLoadingState.set(imf.index, Math.floor(imf.downloadState.loaded / imf.downloadState.total * 100));
      this.debouncer.addEvent("FLUSH-LOADING-HELPER", () => this.flushLoadingHelper(), 20);
    });
    // enable auto page
    new AutoPage(this, HTML.autoPageBTN);
  }

  onResize(imf: IMGFetcher) {
    const element = this.container.querySelector<HTMLElement>(`div[d-index="${imf.index}"]`);
    const current = this.container.querySelector<HTMLElement>(`div[d-index="${this.currentIndex}"]`);
    if (!element || !current) return;
    if (conf.readMode === "continuous") {
      const currOffsetTop = current.offsetTop;
      const currScrollTop = this.root.scrollTop;
      element.style.aspectRatio = imf.ratio().toString();
      if (currOffsetTop !== current.offsetTop) {
        this.root.scrollTop = current.offsetTop + (currOffsetTop - currScrollTop);
      }
    } else {
      const currOffsetLeft = current.offsetLeft;
      const currScrollLeft = this.root.scrollLeft;
      element.style.aspectRatio = imf.ratio().toString();
      if (currOffsetLeft !== current.offsetLeft) {
        this.root.scrollLeft = current.offsetLeft - (currOffsetLeft - currScrollLeft);
      }
    }
  }

  intersecting(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const index = parseIndex(element);
        if (index === -1) continue;
        this.intersectingElements.push(element);
      } else {
        const index = this.intersectingElements.indexOf(entry.target as HTMLElement);
        if (index > -1) this.intersectingElements.splice(index, 1);
      }
    }
    this.debouncer.addEvent("rendering-images", () => this.rendering(), 50);
  }

  rendering() {
    const sorting = this.intersectingElements.map((elem) => ({ index: parseIndex(elem), elem }));
    // make sure intersectingElements in order in the document flow
    sorting.filter(e => e.index > -1).sort((a, b) => a.index - b.index);
    if (conf.reversePages) sorting.reverse();
    const intersecting = sorting.map(e => e.elem);
    if (intersecting.length === 0) return;
    // extend the renderingElements array to pre-decode the image
    const prevElem = intersecting[0]?.previousElementSibling as HTMLElement | null;
    if (prevElem) intersecting.unshift(prevElem);
    const nextElem = intersecting[intersecting.length - 1]?.nextElementSibling as HTMLElement | null;
    if (nextElem) intersecting.push(nextElem);

    const unrender = [];
    const rendered = [];
    for (const elem of this.renderingElements) {
      if (intersecting.includes(elem)) {
        rendered.push(elem);
      } else {
        unrender.push(elem);
      }
    }
    unrender.forEach(ele => ele.innerHTML = "");
    for (const elem of intersecting) {
      if (!rendered.includes(elem)) {
        elem.innerHTML = "";
        const imf = this.getIMF(elem);
        if (imf) {
          elem.appendChild(this.newMediaNode(imf));
        }
      }
    }
    this.renderingElements = intersecting;
  }

  getIMF(element: HTMLElement): IMGFetcher | null {
    const index = parseIndex(element);
    if (index === -1 || isNaN(index)) return null;
    const queue = this.getChapter(this.chapterIndex).queue;
    return queue[index] ?? null;
  }

  initEvent() {
    this.root.addEventListener("wheel", (event) => this.onWheel(event));
    this.root.addEventListener("scroll", () => this.onScroll());
    this.root.addEventListener("contextmenu", (event) => event.preventDefault());
    // const debouncer = new Debouncer("throttle");
    // let magnifying = true;
    // for stick mouse
    // this.root.addEventListener("mousemove", (mmevt) => {
    //   if (conf.stickyMouse === "disable" || conf.readMode !== "pagination") return;
    //   if (magnifying) return;
    //   debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
    //     if (this.lastMouse) {
    //       stickyMouse(this.root, mmevt, this.lastMouse, conf.stickyMouse === "enable");
    //     }
    //     this.lastMouse = { x: mmevt.clientX, y: mmevt.clientY };
    //   }, 5);
    // });
    // for click
    this.root.addEventListener("mousedown", (mdevt) => {
      if (mdevt.button !== 0) return;
      if ((mdevt.target as HTMLElement).classList.contains("img-land")) return;
      // magnifying = true;
      let moved = false;
      let last = { x: mdevt.clientX, y: mdevt.clientY };
      let elementsWidth: number | undefined = undefined;
      const abort = new AbortController();
      const [scrollTop, scrollLeft] = [this.root.scrollTop, this.root.scrollLeft];
      // mouseup 
      this.root.addEventListener("mouseup", (muevt) => {
        abort.abort();
        if (!moved) { // just click
          this.hidden(muevt);
        } else if (conf.magnifier && conf.imgScale === 100) { // restore scale
          this.scaleBigImages(1, 0, conf.imgScale, false);
          [this.root.scrollTop, this.root.scrollLeft] = [scrollTop, scrollLeft];
        }
        moved = false;
        // magnifying = false;
      }, { once: true });
      // for magnifier, mouse move
      this.root.addEventListener("mousemove", (mmevt) => {
        if (!moved) { // first move
          if (conf.magnifier && conf.imgScale === 100) { // temporarily zoom if img not scale
            this.scaleBigImages(5, 0, 150, false);
          }
          if (conf.readMode === "pagination") {
            const { showing } = this.getElements();
            if (showing.length > 0) {
              elementsWidth = showing[showing.length - 1].offsetLeft + showing[showing.length - 1].offsetWidth - showing[0].offsetLeft;
            }
          }
        }
        moved = true;
        this.debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
          stickyMouse(this.root, mmevt, last, elementsWidth);
          last = { x: mmevt.clientX, y: mmevt.clientY };
        }, 5);
      }, { signal: abort.signal });
    });
    // touch
    new TouchManager(this.root, {
      swipe: (direction) => {
        if (conf.readMode === "continuous" || conf.readMode === "horizontal") return;
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
        } else if (this.checkOverflow() && !this.tryPreventStep()) {
          this.stepNext(oriented);
        }
      },
    });
  }

  scroll(y: number) {
    this.scrollerY.scroll(y, conf.scrollingSpeed);
  }

  scrollStop() {
    this.scrollerY.scrolling = false;
    this.scrollerX.scrolling = false;
  }

  hidden(event?: MouseEvent) {
    if (event && event.target && (event.target as HTMLElement).tagName === "SPAN") return;
    this.visible = false;
    EBUS.emit("bifm-on-hidden");
    this.html.fullViewGrid.focus();
    this.frameScrollAbort?.abort();
    this.root.classList.add("big-img-frame-collapse");
  }

  show(imf: IMGFetcher) {
    this.visible = true;
    this.root.classList.remove("big-img-frame-collapse");
    this.root.focus();
    this.frameScrollAbort = new AbortController();
    // setNow
    this.debouncer.addEvent("TOGGLE-CHILDREN-D", () => (imf.chapterIndex === this.chapterIndex) && this.setNow(imf), 100);
    EBUS.emit("bifm-on-show");
  }

  setNow(imf: IMGFetcher, oriented?: Oriented) {
    if (this.visible) {
      this.jumpTo(imf.index);
    }
    this.pageNumInChapter[this.chapterIndex] = imf.index;
    this.currentIndex = imf.index;
    EBUS.emit("ifq-do", imf.index, imf, oriented ?? "next");
    this.lastMouse = undefined;
    this.currLoadingState.clear();
    this.flushLoadingHelper();
  }

  append(nodes: IMGFetcher[]) {
    const elements = [];
    const scrollWidth = this.root.scrollWidth;
    for (const node of nodes) {
      const div = document.createElement("div");
      div.style.aspectRatio = node.ratio().toString();
      div.setAttribute("d-index", node.index.toString());
      elements.push(div);
      this.observer.observe(div);
    }
    const reverse = conf.readMode !== "continuous" && conf.reversePages;
    if (this.container.childElementCount === 0) {
      const paddingRatio = (window.innerWidth / 2) / window.innerHeight;
      const start = document.createElement("div");
      start.style.aspectRatio = paddingRatio.toString();
      start.setAttribute("d-index", "-1");
      elements.unshift(start);
      const end = document.createElement("div");
      end.style.aspectRatio = paddingRatio.toString();
      end.setAttribute("d-index", "-1");
      elements.push(end);
    } else {
      elements.push((reverse ? this.container.firstElementChild : this.container.lastElementChild) as HTMLElement);
    }
    if (reverse) {
      elements.reverse();
      this.container.prepend(...elements);
      this.root.scrollLeft = this.root.scrollLeft + this.root.scrollWidth - scrollWidth;
    } else {
      this.container.append(...elements);
    }
  }

  changeLayout() {
    this.resetScaleBigImages(true);
    let reAppend = false;
    switch (conf.readMode) {
      case "continuous":
        reAppend = this.container.classList.contains("bifm-container-hori") && conf.reversePages;
        this.container.classList.add("bifm-container-vert");
        this.container.classList.remove("bifm-container-hori");
        break;
      case "pagination":
      case "horizontal":
        reAppend = this.container.classList.contains("bifm-container-vert") && conf.reversePages;
        this.container.classList.add("bifm-container-hori");
        this.container.classList.remove("bifm-container-vert");
        break;
    }
    if (reAppend) {
      this.container.innerHTML = "";
      const queue = this.getChapter(this.chapterIndex).queue;
      this.append(queue);
    } else {
      for (const elem of Array.from(this.container.children)) {
        (elem as HTMLElement).style.opacity = "";
      }
    }
    this.jumpTo(this.currentIndex);
  }

  jumpTo(index: number) {
    const element = this.container.querySelector<HTMLElement>(`div[d-index="${index}"]`);
    if (!element) return;
    switch (conf.readMode) {
      case "pagination": {
        const { showing, hiding } = this.getElements(element);
        showing.forEach(elem => elem.style.opacity = "1");
        hiding.forEach(elem => elem.style.opacity = "0");
        const rootW = this.root.offsetWidth;
        const [first, last] = [showing[0], showing[showing.length - 1]];
        const width = last.offsetLeft + last.offsetWidth - first.offsetLeft;
        let margin = Math.floor((rootW - width) / 2);
        margin = Math.max(0, margin);
        if (conf.reversePages) {
          this.root.scrollLeft = element.offsetLeft - this.root.offsetWidth + element.offsetWidth + margin;
        } else {
          this.root.scrollLeft = element.offsetLeft - margin;
        }
        this.root.scrollTop = 0;
        if (element.firstElementChild) {
          this.tryPlayVideo(element.firstElementChild as HTMLElement);
        }
        break;
      }
      case "horizontal": {
        if (conf.reversePages) {
          this.root.scrollLeft = element.offsetLeft - this.root.offsetWidth + element.offsetWidth;
        } else {
          this.root.scrollLeft = element.offsetLeft;
        }
        break;
      }
      case "continuous": {
        const rootH = this.root.offsetHeight;
        const height = element.offsetHeight;
        let marginT = index === 0 ? 0 : Math.floor((rootH - height) / 2);
        marginT = Math.max(0, marginT);
        this.root.scrollTop = element.offsetTop - marginT;
        break;
      }
    }
  }

  stepNext(oriented: Oriented, fixStep: number = 0, current?: number) {
    let index = current || this.currentIndex;
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
    this.resetPreventStep();
    this.setNow(queue[index], oriented);
  }

  checkCurrent(oriented: Oriented = "next") {
    const rootRect = this.root.getBoundingClientRect();
    const isCenter: (rect: DOMRect, rootRect: DOMRect) => boolean = (() => {
      if (conf.readMode === "continuous") {
        return (rect, rootRect) => rect.top <= (rootRect.height / 2) && rect.bottom >= (rootRect.height / 2);
      } else {
        return (rect, rootRect) => rect.left <= (rootRect.width / 2) && rect.right >= (rootRect.width / 2);
      }
    })();
    for (const element of this.intersectingElements) {
      // check element middle
      const rect = element.getBoundingClientRect();
      if (isCenter(rect, rootRect)) {
        const imf = this.getIMF(element);
        if (imf === null) continue;
        if (imf.index === this.currentIndex) continue;
        EBUS.emit("ifq-do", imf.index, imf, oriented);
        this.currentIndex = imf.index;
        if (element.firstElementChild) {
          this.tryPlayVideo(element.firstElementChild as HTMLElement);
        }
        break;
      }
    }
  }

  // limit scrollTop or scrollLeft
  onScroll() {
    switch (conf.readMode) {
      case "continuous": {
        const [first, last] = [
          this.container.children.item(1) as HTMLElement,
          this.container.children.item(this.container.children.length - 2) as HTMLElement,
        ];
        let offsetTop = first.offsetTop ?? 0;
        if (this.root.scrollTop < offsetTop - 3) {
          this.root.scrollTop = offsetTop - 2;
        } else {
          offsetTop = last ? last.offsetTop + last.offsetHeight - this.root.offsetHeight : this.root.scrollHeight;
          if (this.root.scrollTop > offsetTop + 3) {
            this.root.scrollTop = offsetTop + 2;
          }
        }
        break;
      }
      case "pagination": {
        const { showing } = this.getElements();
        const [first, last] = [showing[0] ?? null, showing[showing.length - 1] ?? null];
        const width = last.offsetLeft + last.offsetWidth - first.offsetLeft;
        let offsetLeft = first?.offsetLeft ?? 0;
        const maxLeft = offsetLeft + Math.max(width - this.root.offsetWidth, 0);
        const minLeft = offsetLeft + Math.min(width - this.root.offsetWidth, 0);
        if (this.root.scrollLeft > maxLeft) {
          this.root.scrollLeft = maxLeft;
        } else if (this.root.scrollLeft < minLeft) {
          this.root.scrollLeft = minLeft;
        }
        break;
      }
      case "horizontal": {
        const [first, last] = [
          this.container.children.item(1) as HTMLElement,
          this.container.children.item(this.container.children.length - 2) as HTMLElement,
        ];
        let offsetLeft = first?.offsetLeft ?? 0;
        if (this.root.scrollLeft < offsetLeft - 3) {
          this.root.scrollLeft = offsetLeft - 2;
        } else {
          offsetLeft = last ? last.offsetLeft + last.offsetWidth - this.root.offsetWidth : this.root.scrollWidth;
          if (this.root.scrollLeft > offsetLeft + 3) {
            this.root.scrollLeft = offsetLeft + 2;
          }
        }
        break;
      }
    }
  }

  onWheel(event: WheelEvent, noPrevent?: boolean, customScrolling?: boolean, noCallback?: boolean) {
    if (!noCallback) this.callbackOnWheel?.(event);
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
      return;
    }
    const [oriented, negative]: [Oriented, Oriented] = event.deltaY > 0 ? ["next", "prev"] : ["prev", "next"];
    switch (conf.readMode) {
      case "pagination": {
        const over = this.checkOverflow();
        const [$ori, $neg] = conf.reversePages ? [negative, oriented] : [oriented, negative];
        if (over[oriented].overY - 1 <= 0 && over[$ori].overX - 1 <= 0) { // reached boundary, step next
          event.preventDefault();
          if (!noPrevent) {
            if (over[$neg].overX > 0 || over[negative].overY > 0) {
              if (this.tryPreventStep()) break;
            }
          }
          this.stepNext(oriented);
          break;
        }
        let fix = oriented === "next" ? 1 : -1;
        if (customScrolling && over[oriented].overY > 0) {
          this.scrollerY.scroll(Math.min(over[oriented].overY, Math.abs(event.deltaY * 3)) * fix, Math.abs(Math.ceil(event.deltaY / 4)));
        }
        fix = fix * (conf.reversePages ? -1 : 1);
        if (over[oriented].overY - 1 <= 0 && over[$ori].overX > 0) { // should scroll
          this.scrollerX.scroll(Math.min(over[$ori].overX, Math.abs(event.deltaY * 3)) * fix, Math.abs(Math.ceil(event.deltaY / 4)));
        }
        break;
      }
      case "horizontal": {
        event.preventDefault();
        this.scrollerX.scroll(event.deltaY * 3 * (conf.reversePages ? -1 : 1), Math.abs(Math.ceil(event.deltaY / 4)));
        break;
      }
      case "continuous": {
        if (customScrolling) {
          this.scrollerY.scroll(event.deltaY, conf.scrollingSpeed);
        }
        break;
      }
    }
    if (conf.readMode !== "pagination") {
      this.debouncer.addEvent("bifm-on-wheel", () => this.checkCurrent(oriented), 100);
    }
  }

  resetPreventStep(fin?: boolean) {
    this.preventStep.ani?.cancel();
    this.preventStep.ele?.remove();
    this.preventStep = { currentPreventFinished: fin ?? false };
  }

  // prevent scroll to next page while mouse scrolling;
  tryPreventStep(): boolean {
    if (conf.preventScrollPageTime === 0) return false;
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
        this.root.appendChild(lockEle);
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

  checkOverflow(): { "prev": { overX: number, overY: number }, "next": { overX: number, overY: number }, elements: HTMLElement[] } {
    const { showing } = this.getElements();
    if (showing.length === 0) return { "prev": { overX: 0, overY: 0 }, "next": { overX: 0, overY: 0 }, elements: [] };
    const rectL = showing[0].getBoundingClientRect();
    const rectR = showing[showing.length - 1].getBoundingClientRect();
    return {
      "prev": {
        overX: Math.round(rectL.left) * -1,
        overY: Math.round(rectL.top) * -1,
      },
      "next": {
        overX: Math.round(rectR.right) - this.root.offsetWidth,
        overY: Math.round(rectL.bottom) - this.root.offsetHeight,
      },
      elements: showing,
    }
  }

  restoreScrollTop(imgNode: HTMLElement, distance: number) {
    this.root.scrollTop = this.getRealOffsetTop(imgNode) - distance;
  }

  getRealOffsetTop(imgNode: HTMLElement) {
    return imgNode.offsetTop;
  }

  newMediaNode(imf: IMGFetcher): MediaElement {
    if (imf.contentType?.startsWith("video")) {
      const vid = document.createElement("video");
      vid.classList.add("bifm-img");
      vid.classList.add("bifm-vid");
      vid.draggable = !(conf.magnifier && conf.readMode !== "continuous");
      vid.draggable = false;
      vid.onloadeddata = () => {
        if (this.visible && imf.index === this.currentIndex) {
          this.tryPlayVideo(vid);
        }
      };
      vid.src = imf.node.blobSrc!;
      return vid;
    } else {
      const img = document.createElement("img");
      img.decoding = "sync";
      img.classList.add("bifm-img");
      // img.draggable = !(conf.magnifier && conf.readMode !== "continuous");
      img.draggable = false;
      if (imf.stage === FetchState.DONE) {
        img.src = imf.node.blobSrc!;
      } else if (imf.node.thumbnailSrc) {
        img.src = imf.node.thumbnailSrc;
      } else { // maybe delaySRC
        img.src = DEFAULT_THUMBNAIL;
      }
      return img;
    }
  }

  // if element is not HTMLVideoElement, video controller will pause(detach) the last one which is HTMLVideoElement;
  tryPlayVideo(element: HTMLElement) {
    if (element instanceof HTMLVideoElement) {
      if (!this.vidController) {
        this.vidController = new VideoControl(this.html.root);
      }
      this.vidController.attach(element);
    } else {
      this.vidController?.detach();
    }
  }

  /**
   * @param fix: 1 or -1, means scale up or down
   * @param rate: step of scale, eg: current scale is 80, rate is 10, then new scale is 90
   * @param specifiedPercent: directly set width percent 
   * @param syncConf: sync to config, default = true 
   */
  scaleBigImages(fix: number, rate: number, specifiedPercent?: number, syncConf?: boolean): number {
    let oldPercent = conf.imgScale;
    let newPercent = specifiedPercent ?? (oldPercent + rate * fix);
    switch (conf.readMode) {
      case "pagination": {
        const scrollLeft = this.root.scrollLeft;
        const rule = queryCSSRules(this.html.styleSheet, ".bifm-container-hori");
        newPercent = Math.max(newPercent, 100);
        newPercent = Math.min(newPercent, 300);
        if (rule) rule.style.height = `${newPercent}%`;
        this.root.scrollLeft = scrollLeft * (newPercent / oldPercent);
        this.jumpTo(this.currentIndex);
      }
        break;
      case "horizontal": {
        const scrollLeft = this.root.scrollLeft;
        const rule = queryCSSRules(this.html.styleSheet, ".bifm-container-hori");
        newPercent = Math.max(newPercent, 80);
        newPercent = Math.min(newPercent, 300);
        if (rule) rule.style.height = `${newPercent}%`;
        this.root.scrollLeft = scrollLeft * (newPercent / oldPercent);
      }
        break;
      case "continuous": {
        const scrollTop = this.root.scrollTop;
        const rule = queryCSSRules(this.html.styleSheet, ".bifm-container-vert");
        newPercent = Math.max(newPercent, 20);
        newPercent = Math.min(newPercent, 100);
        if (rule) rule.style.width = `${newPercent}%`;
        this.root.scrollTop = scrollTop * (newPercent / oldPercent);
      }
        break;
    }
    if (syncConf ?? true) {
      conf.imgScale = newPercent;
      saveConf(conf);
    }
    q("#scaleInput", this.html.pageHelper).textContent = `${newPercent}`;
    return newPercent;
  }

  resetScaleBigImages(syncConf: boolean) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    const percent = (conf.readMode !== "continuous" || isMobile) ? 100 : 80;
    this.scaleBigImages(1, 0, percent, syncConf);
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

  /**
  * This method will only be called when readmode is not continuous
  * get elements, showing will set opacity to 1, hiding will set opacity to 0;
  * If conf.reversePages is true, the elements in the showing array are still kept in order in the document flow. [31, 30, 29(current)]
  */
  getElements(element?: HTMLElement): { showing: HTMLElement[], hiding: HTMLElement[] } {
    element = element || this.container.querySelector<HTMLElement>(`div[d-index="${this.currentIndex}"]`) || undefined;
    if (!element) return { showing: [], hiding: [] };
    const showing = [element];
    const hiding = [];
    let sibling: HTMLElement | null = element;
    const getSibling = (next: boolean) => {
      next = conf.reversePages ? !next : next;
      return (next ? sibling?.nextElementSibling : sibling?.previousElementSibling) as HTMLElement | null;
    };
    let t = 0;
    while (t < 5) {
      sibling = getSibling(false);
      if (!sibling) break;
      hiding.push(sibling);
      t++;
    }
    sibling = element;
    t = 0;
    while (t < 5) {
      sibling = getSibling(true);
      if (!sibling) break;
      if (t < conf.paginationIMGCount - 1 && sibling.getAttribute("d-index") !== "-1") {
        showing.push(sibling);
      } else {
        hiding.push(sibling);
      }
      t++;
    }
    if (conf.reversePages) showing.reverse();
    return { showing, hiding };
  }

}

// 自动翻页
class AutoPage {
  bifm: BigImageFrameManager;
  status: 'stop' | 'running';
  button: HTMLElement;
  lockVer: number;
  constructor(BIFM: BigImageFrameManager, button: HTMLElement) {
    this.bifm = BIFM;
    this.status = "stop";
    this.button = button;
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
    if (!this.bifm.visible) {
      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
      if (queue.length === 0) return;
      this.bifm.show(queue[this.bifm.currentIndex]);
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

      // if (this.bifm.elements.curr.length === 0) break;
      // check boundary
      const queue = this.bifm.getChapter(this.bifm.chapterIndex).queue;
      if (this.bifm.currentIndex < 0 || this.bifm.currentIndex >= queue.length) break;

      if (conf.readMode === "pagination") {
        const curr = this.bifm.container.querySelector<HTMLElement>(`div[d-index="${this.bifm.currentIndex}"]`)?.firstElementChild;
        if (curr instanceof HTMLVideoElement) {
          let resolve: () => void;
          const promise = new Promise<void>(r => resolve = r);
          curr.addEventListener("timeupdate", () => {
            if (curr.currentTime >= curr.duration - 1) sleep(1000).then(resolve);
          });
          await promise;
        }
      }
      const deltaY = this.bifm.root.offsetHeight / 2;
      this.bifm.onWheel(new WheelEvent("wheel", { deltaY: deltaY }), true, true, true);
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
    this.bifm.scrollStop();
  }
}

function parseIndex(ele: HTMLElement): number {
  if (!ele) return -1;
  const d = ele.getAttribute("d-index") || "";
  const i = parseInt(d);
  return isNaN(i) ? -1 : i;
}

function stickyMouse(element: HTMLElement, event: MouseEvent, lastMouse: { x: number, y: number }, elementsWidth?: number) {
  let [distanceY, distanceX] = [event.clientY - lastMouse.y, event.clientX - lastMouse.x];
  [distanceY, distanceX] = [-distanceY, -distanceX];

  const overflowY = element.scrollHeight - element.offsetHeight;
  if (overflowY > 0) {
    const rateY = (conf.readMode === "continuous") ? 1 : overflowY / (element.offsetHeight / 4) * 3;
    let scrollTop = element.scrollTop + distanceY * rateY;
    scrollTop = Math.max(scrollTop, 0);
    scrollTop = Math.min(scrollTop, overflowY);
    element.scrollTop = scrollTop;
  }
  const overflowX = (elementsWidth ?? element.scrollWidth) - element.offsetWidth;
  if (overflowX > 0) {
    const rateX = (conf.readMode !== "pagination") ? 1 : overflowX / (element.offsetWidth / 4) * 3;
    let scrollLeft = element.scrollLeft + distanceX * rateX;
    console.log(`overflow ${overflowX}, element.offsetWidth / 4: ${element.offsetWidth / 4}, rateX: ${rateX}, scrollLeft: ${scrollLeft}, distanceX: ${distanceX}`);
    element.scrollLeft = scrollLeft;
  }
}
