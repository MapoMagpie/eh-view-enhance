import { conf } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { FetchState } from "../img-fetcher";
import { HTML, Oriented } from "../main";
import { Debouncer } from "../utils/debouncer";
import { events } from "./event";

export class BigImageFrameManager {
  frame: HTMLElement;
  queue: IMGFetcherQueue;
  lockInit: boolean;
  currImageNode?: HTMLImageElement;
  lastMouseY?: number;
  imgScaleBar: HTMLElement;
  reduceDebouncer: Debouncer;
  constructor(frame: HTMLElement, queue: IMGFetcherQueue, imgScaleBar: HTMLElement) {
    this.frame = frame;
    this.queue = queue;
    this.imgScaleBar = imgScaleBar;
    this.reduceDebouncer = new Debouncer();
    this.lockInit = false;
    this.initFrame();
    this.initImgScaleBar();
    this.initImgScaleStyle();
  }

  flushImgScaleBar() {
    this.imgScaleBar.querySelector<HTMLElement>("#imgScaleStatus")!.innerHTML = `${conf.imgScale}%`;
    this.imgScaleBar.querySelector<HTMLElement>("#imgScaleProgressInner")!.style.width = `${conf.imgScale}%`;
  }

  setNow(index: number) {
    // every time call this.onWheel(), will set this.lockInit to true
    if (this.lockInit) {
      this.lockInit = false;
      return
    }
    this.init(index);
  }

  init(start: number) {
    // remove frame's img children
    this.removeImgNodes();
    this.currImageNode = this.createImgElement();
    this.frame.appendChild(this.currImageNode);
    this.setImgNode(this.currImageNode, start);

    if (conf.readMode === "consecutively") {
      this.tryExtend();
      this.restoreScrollTop(this.currImageNode, 0, 0);
    }
  }

  initFrame() {
    this.frame.addEventListener("wheel", event => this.onwheel(event));
    this.frame.addEventListener("click", events.hiddenBigImageEvent);
    this.frame.addEventListener("contextmenu", (event) => event.preventDefault());
    const debouncer = new Debouncer("throttle");
    this.frame.addEventListener("mousemove", event => {
      debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
        if (this.lastMouseY) {
          this.stickyMouse(event, this.lastMouseY);
        }
        this.lastMouseY = event.clientY;
      }, 5);
    });
  }

  initImgScaleBar() {
    this.imgScaleBar.querySelector("#imgIncreaseBTN")?.addEventListener("click", () => {
      this.scaleBigImages(1, 5);
    });
    this.imgScaleBar.querySelector("#imgDecreaseBTN")?.addEventListener("click", () => {
      this.scaleBigImages(-1, 5);
    });
    this.imgScaleBar.querySelector("#imgScaleResetBTN")?.addEventListener("click", () => {
      this.resetScaleBigImages();
    });
    const progress = this.imgScaleBar.querySelector<HTMLElement>("#imgScaleProgress")!;
    progress.addEventListener("mousedown", (event) => {
      const { left } = progress.getBoundingClientRect();
      const mouseMove = (event: MouseEvent) => {
        const xInProgress = event.clientX - left;
        const percent = Math.round(xInProgress / progress.clientWidth * 100);
        this.scaleBigImages(0, 0, percent);
      }
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

  createImgElement(): HTMLImageElement {
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
    this.frame.classList.add("collapse");
    window.setTimeout(() => {
      this.frame.childNodes.forEach(child => (child as HTMLElement).hidden = true);
      this.removeImgNodes();
    }, 700);
    this.imgScaleBar.style.display = "none";
  }

  show() {
    this.frame.classList.remove("collapse");
    this.frame.childNodes.forEach(child => (child as HTMLElement).hidden = false);
    this.imgScaleBar.style.display = "";
  }

  getImgNodes(): HTMLImageElement[] {
    return Array.from(this.frame.querySelectorAll("img"));
  }

  onwheel(event: WheelEvent) {
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5);
    } else if (conf.readMode === "consecutively") {
      this.consecutive(event);
    } else {
      event.preventDefault();
      const oriented: Oriented = event.deltaY > 0 ? "next" : "prev";
      events.stepImageEvent(oriented);
    }
  }

  consecutive(event: WheelEvent) {
    this.reduceDebouncer.addEvent("REDUCE", () => {
      let imgNodes = this.getImgNodes();
      let index = this.findImgNodeIndexOnCenter(imgNodes, 0);
      const centerNode = imgNodes[index];
      const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;
      if (this.tryReduce()) {
        this.restoreScrollTop(centerNode, distance, 0);
      }
    }, 200);

    const oriented = event.deltaY > 0 ? "next" : "prev";
    // find the center image node
    let imgNodes = this.getImgNodes();
    let index = this.findImgNodeIndexOnCenter(imgNodes, event.deltaY);
    const centerNode = imgNodes[index];
    this.currImageNode = centerNode;

    // record the distance of the centerNode from the top of the screen
    const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;

    // try extend imgNodes, if success, index will be changed
    const indexOffset = this.tryExtend();
    if (indexOffset !== 0) {
      this.restoreScrollTop(centerNode, distance, 0);
    }

    const indexOfQueue = parseInt(this.currImageNode.getAttribute("d-index")!);
    // queue.do() > imgFetcher.setNow() > this.setNow() > this.init(); 
    // in here, this.init() will be called again, set this.lockInit to prevent it
    if (indexOfQueue != this.queue.currIndex) {
      this.lockInit = true;
      this.queue.do(indexOfQueue, oriented);
    }
  }

  restoreScrollTop(imgNode: HTMLImageElement, distance: number, deltaY: number) {
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
  getRealOffsetTop(imgNode: HTMLImageElement) {
    const naturalRatio = imgNode.naturalWidth / imgNode.naturalHeight;
    const clientRatio = imgNode.clientWidth / imgNode.clientHeight;
    if (naturalRatio > clientRatio) {
      const clientHeight = Math.round(imgNode.naturalHeight * (imgNode.clientWidth / imgNode.naturalWidth));
      // console.log(`clientHeigh should be: ${clientHeight}`);
      return (imgNode.clientHeight - clientHeight) / 2 + imgNode.offsetTop;
    }
    return imgNode.offsetTop;
  }

  tryExtend(): number {
    let indexOffset = 0;
    let imgNodes = [];
    let scrollTopFix = 0;
    // try extend prev, until has enough scroll up space
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
    // try extend next, until has enough scroll down space
    while (true) {
      imgNodes = this.getImgNodes();
      const last = imgNodes[imgNodes.length - 1];
      if (last.offsetTop < this.frame.scrollTop + this.frame.offsetHeight) {
        if (this.extendImgNode(last, "next") === null) break;
      } else {
        break;
      }
    }
    return indexOffset;
  }

  tryReduce(): boolean {
    const imgNodes = this.getImgNodes();
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

  extendImgNode(imgNode: HTMLImageElement, oriented: Oriented): HTMLImageElement | null {
    let extendedImgNode: HTMLImageElement | null;
    const index = parseInt(imgNode.getAttribute("d-index")!);
    if (oriented === "prev") {
      if (index === 0) return null;
      extendedImgNode = this.createImgElement();
      imgNode.before(extendedImgNode);
      this.setImgNode(extendedImgNode, index - 1);
    } else {
      if (index === this.queue.length - 1) return null;
      extendedImgNode = this.createImgElement();
      imgNode.after(extendedImgNode);
      this.setImgNode(extendedImgNode, index + 1);
    }
    return extendedImgNode;
  }

  setImgNode(imgNode: HTMLImageElement, index: number) {
    imgNode.setAttribute("d-index", index.toString());
    const imgFetcher = this.queue[index];
    if (imgFetcher.stage === FetchState.DONE) {
      imgNode.src = imgFetcher.blobUrl!;
    } else {
      imgNode.src = imgFetcher.imgElement.getAttribute("asrc")!;
      imgFetcher.onFinished("BIG-IMG-SRC-UPDATE", ($index, $imgFetcher) => {
        if ($index === parseInt(imgNode.getAttribute("d-index")!)) {
          imgNode.src = $imgFetcher.blobUrl!;
        }
      });
    }
  }

  /**
   * @param fix: 1 or -1, means scale up or down
   * @param rate: step of scale, eg: current scale is 80, rate is 10, then new scale is 90
   * @param _percent: directly set width percent
   */
  scaleBigImages(fix: number, rate: number, _percent?: number): number {
    let percent = 0;
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bigImageFrame > img") {
          // if is default scale, then set height to unset, and compute current width percent
          if (!conf.imgScale) conf.imgScale = 0; // fix imgScale if it is null
          if (conf.imgScale == 0 && this.currImageNode) {
            // compute current width percent
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
    conf.imgScale = percent;
    window.localStorage.setItem("cfg_", JSON.stringify(conf));
    this.flushImgScaleBar();
    return percent;
  }

  resetScaleBigImages() {
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules ?? []);
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
            cssRule.style.width = "80vw";
          }
          break;
        }
      }
    }
    conf.imgScale = 0;
    window.localStorage.setItem("cfg_", JSON.stringify(conf));
    this.flushImgScaleBar();
  }

  initImgScaleStyle() {
    if (conf.imgScale && conf.imgScale > 0) {
      this.scaleBigImages(1, 0);
    } else {
      this.resetScaleBigImages();
    }
  }

  stickyMouse(event: MouseEvent, lastMouseY: number) {
    if (conf.readMode === "singlePage" && this.frame.scrollHeight > this.frame.offsetHeight && conf.stickyMouse !== "disable") {
      let distance = event.clientY - lastMouseY;
      if (conf.stickyMouse === "enable") {
        distance = -distance;
      }
      const rate = (this.frame.scrollHeight - this.frame.offsetHeight) / (this.frame.offsetHeight / 4) * 3;
      let scrollTop = this.frame.scrollTop + distance * rate;
      if (distance > 0) {
        if (scrollTop > this.frame.scrollHeight - this.frame.offsetHeight) {
          scrollTop = this.frame.scrollHeight - this.frame.offsetHeight;
        }
      } else {
        if (scrollTop < 0) {
          scrollTop = 0;
        }
      }
      this.frame.scrollTo({ top: scrollTop, behavior: "auto" });
    }
  }

  findImgNodeIndexOnCenter(imgNodes: HTMLImageElement[], fixOffset: number): number {
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
