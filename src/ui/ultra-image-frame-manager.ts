import { conf } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { HTML, Oriented } from "../main";
import { events } from "./event";

export class BigImageFrameManager {
  frame: HTMLElement;
  queue: IMGFetcherQueue;
  currImageNode?: Element;
  lockInit: boolean;
  constructor(frame: HTMLElement, queue: IMGFetcherQueue) {
    this.frame = frame;
    this.queue = queue;
    // this.currImageNode = null;
    this.frame.addEventListener("wheel", event => this.onwheel(event as WheelEvent));
    this.lockInit = false;
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
    const indices = [start]; // now just show one image, maybe change to show more
    for (let i = indices.length - 1; i < imgNodes.length - 1; i++) {
      imgNodes[i].remove();
    }
    for (let i = 0; i < indices.length - imgNodes.length; i++) {
      this.frame.appendChild(this.createImgElement());
    }
    imgNodes = this.getImgNodes();
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const imgNode = imgNodes[i];
      if (index === start) this.currImageNode = imgNode;
      this.setImgNode(imgNode, index);
    }
  }

  createImgElement(): HTMLImageElement {
    const img = document.createElement("img");
    img.addEventListener("click", events.hiddenBigImageEvent);
    return img;
  }

  hidden() {
    this.frame.childNodes.forEach(child => (child as HTMLElement).hidden = true);
  }

  show() {
    this.frame.childNodes.forEach(child => (child as HTMLElement).hidden = false);
  }

  getImgNodes(): HTMLImageElement[] {
    return Array.from(this.frame.querySelectorAll("img"));
  }

  onwheel(event: WheelEvent) {
    if (event.buttons === 2) {
      event.preventDefault();
      this.scaleBigImages(event.deltaY > 0 ? -1 : 1, 10);
    } else if (conf.consecutiveMode) {
      this.consecutive(event);
    } else {
      event.preventDefault();
      const oriented: Oriented = event.deltaY > 0 ? "next" : "prev";
      events.stepImageEvent(oriented);
    }
  }

  consecutive(event: WheelEvent) {
    const oriented = event.deltaY > 0 ? "next" : "prev";

    let imgNodes = this.getImgNodes();
    let index = this.findImgNodeIndexOnCenter(imgNodes, event.deltaY);
    const centerNode = imgNodes[index];

    // before switch imgNodes, record the distance of the centerNode from the top of the screen
    const distance = this.getRealOffsetTop(centerNode) - this.frame.scrollTop;
    console.log("before extend, offsetTop is", centerNode.offsetTop);

    // extend imgNodes
    const indexOffset = this.tryExtend();
    index = index + indexOffset;
    if (indexOffset !== 0) {
      this.restoreScrollTop(centerNode, distance, event.deltaY);
    }
    imgNodes = this.getImgNodes();

    // boundary check
    const indexOfQueue = parseInt(imgNodes[index].getAttribute("d-index")!);
    if (oriented === "next" && index !== imgNodes.length - 1) return;
    if (oriented === "prev" && index !== 0) return;
    if (indexOfQueue === 0 || indexOfQueue === this.queue.length - 1) return;
    if (imgNodes.length < 2) return; // should be extended greater than 2

    // switch imgNodes
    if (oriented === "next") {
      imgNodes[imgNodes.length - 1].after(imgNodes[0]);
      this.setImgNode(imgNodes[0], parseInt(centerNode.getAttribute("d-index")!) + 1);
    } else {
      imgNodes[0].before(imgNodes[imgNodes.length - 1]);
      this.setImgNode(imgNodes[imgNodes.length - 1], parseInt(centerNode.getAttribute("d-index")!) - 1);
    }

    // fix scrolltop
    this.restoreScrollTop(centerNode, distance, event.deltaY);
    // queue.do() > imgFetcher.setNow() > this.setNow() > this.init(); in here, this.init() will be called again, so we need to lock this.init() in this.setNow()
    this.lockInit = true;
    this.queue.do(indexOfQueue, oriented);
  }

  restoreScrollTop(imgNode: HTMLImageElement, distance: number, deltaY: number) {
    this.frame.scrollTo(0, imgNode.offsetTop - distance);
    this.frame.scrollTo({ top: imgNode.offsetTop - distance + deltaY, behavior: "smooth" });
  }

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
    if (imgFetcher.stage === 3) {
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

  scaleBigImages(fix: number, rate: number) {
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules ?? []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".bigImageFrame > img") {
          cssRule.style.height = `${Math.max(parseInt(cssRule.style.height) + rate * fix, 100)}vh`;
          break;
        }
      }
    }
  }

  findImgNodeIndexOnCenter(imgNodes: HTMLImageElement[], fixOffset: number) {
    const centerLine = this.frame.offsetHeight / 2;
    for (let i = 0; i < imgNodes.length; i++) {
      const imgNode = imgNodes[i];
      if (imgNode.offsetTop + imgNode.offsetHeight + fixOffset - this.frame.scrollTop > centerLine) return i;
    }
    return 0;
  }
}
