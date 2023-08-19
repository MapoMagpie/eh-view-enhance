import { conf } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { FetchState } from "../img-fetcher";
import { HTML, Oriented } from "../main";
import { Debouncer } from "../utils/debouncer";
import { evLog } from "../utils/ev-log";
import { events } from "./event";

export class BigImageFrameManager {
  frame: HTMLElement;
  queue: IMGFetcherQueue;
  lockInit: boolean;
  currImageNode?: HTMLImageElement;
  lastMouseY?: number;
  imgScaleBar: HTMLElement;
  constructor(frame: HTMLElement, queue: IMGFetcherQueue, imgScaleBar: HTMLElement) {
    this.frame = frame;
    this.queue = queue;
    this.imgScaleBar = imgScaleBar;
    this.frame.addEventListener("wheel", event => this.onwheel(event));
    this.frame.addEventListener("click", events.hiddenBigImageEvent);
    const debouncer = new Debouncer("throttle");
    this.frame.addEventListener("mousemove", event => {
      debouncer.addEvent("BIG-IMG-MOUSE-MOVE", () => {
        if (this.lastMouseY) {
          this.stickyMouse(event, this.lastMouseY);
        }
        this.lastMouseY = event.clientY;
      }, 5);
    });
    this.lockInit = false;
    this.initImgScaleBar();
  }

  initImgScaleBar() {
    this.imgScaleBar.querySelector("#imgIncreaseBTN")?.addEventListener("click", () => {
      conf.imgScale = this.scaleBigImages(1, 5);
      window.localStorage.setItem("cfg_", JSON.stringify(conf));
      this.flushImgScaleBar();
    });
    this.imgScaleBar.querySelector("#imgDecreaseBTN")?.addEventListener("click", () => {
      conf.imgScale = this.scaleBigImages(-1, 5);
      evLog("conf.imgScale: ", conf.imgScale, ", currImageNode width: ", this.currImageNode?.style.width);
      window.localStorage.setItem("cfg_", JSON.stringify(conf));
      this.flushImgScaleBar();
    });
    this.imgScaleBar.querySelector("#imgScaleResetBTN")?.addEventListener("click", () => {
      this.resetScaleBigImages();
      conf.imgScale = 0;
      window.localStorage.setItem("cfg_", JSON.stringify(conf));
      this.flushImgScaleBar();
    });
  }

  flushImgScaleBar() {
    this.imgScaleBar.querySelector<HTMLElement>("#imgScaleStatus")!.innerHTML = `${conf.imgScale}%`;
    this.imgScaleBar.querySelector<HTMLElement>("#imgScaleProgressInner")!.style.width = `${conf.imgScale}%`;
  }

  setNow(index: number) {
    // every time call this.onWheel(), will set this.lockInit to true
    if (this.lockInit) {
      this.lockInit = false;
    } else {
      this.init(index);
    }
  }

  init(start: number) {
    let imgNodes = this.getImgNodes() || [];
    const indices = [start];
    // keeep the number of img nodes equal to the number of indices, 
    // in here look like number of indices is 1;
    for (let i = indices.length - 1; i < imgNodes.length - 1; i++) {
      imgNodes[i].remove();
    }
    // still keep the number of img nodes equal to the number of indices,
    for (let i = 0; i < indices.length - imgNodes.length; i++) {
      this.frame.appendChild(this.createImgElement());
    }
    imgNodes = this.getImgNodes();
    // set the src to img nodes, one by one
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const imgNode = imgNodes[i];
      this.setImgNode(imgNode, index);
      if (index == start) {
        this.currImageNode = imgNode;
      }
    }
    this.frame.scrollTo({ top: 0, behavior: "smooth" });
  }

  createImgElement(): HTMLImageElement {
    const img = document.createElement("img");
    img.addEventListener("click", events.hiddenBigImageEvent);
    return img;
  }

  hidden() {
    this.frame.classList.add("collapse");
    window.setTimeout(() => this.frame.childNodes.forEach(child => (child as HTMLElement).hidden = true), 700);
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
    if (conf.readMode === "consecutively") {
      this.consecutive(event);
    } else {
      event.preventDefault();
      const oriented: Oriented = event.deltaY > 0 ? "next" : "prev";
      events.stepImageEvent(oriented);
    }
  }

  consecutive(event: WheelEvent) {
    const oriented = event.deltaY > 0 ? "next" : "prev";

    // find the center image node
    let imgNodes = this.getImgNodes();
    let index = this.findImgNodeIndexOnCenter(imgNodes, event.deltaY);
    const centerNode = imgNodes[index];
    this.currImageNode = centerNode;

    // before switch imgNodes, record the distance of the centerNode from the top of the screen
    const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;
    // console.log("before extend, offsetTop is", centerNode.offsetTop);

    // try extend imgNodes, if success, index will be changed
    const indexOffset = this.tryExtend();
    index = index + indexOffset;
    if (indexOffset !== 0) {
      this.restoreScrollTop(centerNode, distance, event.deltaY);
    }
    imgNodes = this.getImgNodes();

    const indexOfQueue = parseInt(imgNodes[index].getAttribute("d-index")!);
    // queue.do() > imgFetcher.setNow() > this.setNow() > this.init(); 
    // in here, this.init() will be called again, set this.lockInit to prevent it
    if (indexOfQueue != this.queue.currIndex) {
      this.lockInit = true;
      this.queue.do(indexOfQueue, oriented);
    }

    // try switch imgNodes
    if (oriented === "next" && index !== imgNodes.length - 1) return;
    if (oriented === "prev" && index !== 0) return;
    if (indexOfQueue === 0 || indexOfQueue === this.queue.length - 1) return;
    if (imgNodes.length < 2) return; // should be extended greater than 2

    if (oriented === "next") {
      imgNodes[imgNodes.length - 1].after(imgNodes[0]);
      this.setImgNode(imgNodes[0], parseInt(centerNode.getAttribute("d-index")!) + 1);
    } else {
      imgNodes[0].before(imgNodes[imgNodes.length - 1]);
      this.setImgNode(imgNodes[imgNodes.length - 1], parseInt(centerNode.getAttribute("d-index")!) - 1);
    }
    // after switch, fix scrolltop
    this.restoreScrollTop(centerNode, distance, event.deltaY);
  }

  restoreScrollTop(imgNode: HTMLImageElement, distance: number, deltaY: number) {
    // this.frame.scrollTo(0, imgNode.offsetTop - distance);
    this.frame.scrollTo({ top: imgNode.offsetTop - distance + deltaY, behavior: "instant" });
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
      console.log(`clientHeigh should be: ${clientHeight}`);
      return (imgNode.clientHeight - clientHeight) / 2 + imgNode.offsetTop;
    }
    return imgNode.offsetTop;
  }

  tryExtend() {
    let indexOffset = 0;
    let imgNodes = [];
    let offsetAfterSwap = 0;
    while (true) {
      imgNodes = this.getImgNodes();
      const frist = imgNodes[0];
      const fixTop = this.getRealOffsetTop(frist);
      if (fixTop > this.frame.scrollTop || parseInt(frist.getAttribute("d-index")!) === this.queue.length - 1) {
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

  extendImgNode(imgNode: HTMLImageElement, oriented: Oriented) {
    const index = parseInt(imgNode.getAttribute("d-index")!);
    if (oriented === "prev") {
      if (index === 0) return false;
      imgNode.before(this.createImgElement());
      this.setImgNode(imgNode.previousElementSibling as HTMLImageElement, index - 1);
    } else {
      if (index === this.queue.length - 1) return false;
      imgNode.after(this.createImgElement());
      this.setImgNode(imgNode.nextElementSibling as HTMLImageElement, index + 1);
    }
    return true;
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
   */
  scaleBigImages(fix: number, rate: number): number {
    let percent = 0;
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bigImageFrame > img") {
          // if is default scale, then set height to unset, and compute current width percent
          if (cssRule.style.height === "100vh") {
            // compute current width percent
            if (this.currImageNode) {
              const vw = this.frame.offsetWidth;
              const width = this.currImageNode.offsetWidth;
              percent = Math.round(width / vw * 100);
              cssRule.style.width = `${percent}vw`;
              cssRule.style.height = "unset";
            } else {
              evLog("ultra image frame manager > scaleBigImages > currImageNode is null")
            }
          }
          percent = Math.max(parseInt(cssRule.style.width) + rate * fix, 10);
          cssRule.style.width = `${percent}vw`;
          break;
        }
      }
    }
    return percent;
  }

  resetScaleBigImages() {
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bigImageFrame > img") {
          cssRule.style.height = "100vh"
          cssRule.style.width = "unset"
          break;
        }
      }
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

  findImgNodeIndexOnCenter(imgNodes: HTMLImageElement[], fixOffset: number) {
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
