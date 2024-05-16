import { DownloadState } from "./img-fetcher";
import { Chapter } from "./page-fetcher";
import { resizing } from "./utils/image-resizing";

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

export interface VisualNode {
  create(): HTMLElement;
  render(): void;
}

export default class ImageNode {
  root?: HTMLElement;
  src: string;
  href: string;
  title: string;
  onclick?: (event: MouseEvent) => void;
  imgElement?: HTMLImageElement;
  canvasElement?: HTMLCanvasElement;
  canvasCtx?: CanvasRenderingContext2D;
  canvasSized: boolean = false;
  delaySRC?: Promise<string>;
  private blobUrl?: string;
  mimeType?: string;
  private downloadBar?: HTMLElement;
  private rendered: boolean = false;
  constructor(src: string, href: string, title: string, delaySRC?: Promise<string>) {
    this.src = src;
    this.href = href;
    this.title = title;
    this.delaySRC = delaySRC;
  }

  create(): HTMLElement {
    this.root = DEFAULT_NODE_TEMPLATE.cloneNode(true) as HTMLElement;
    const anchor = this.root.firstElementChild as HTMLAnchorElement;
    anchor.href = this.href;
    anchor.target = "_blank";
    this.imgElement = anchor.firstElementChild as HTMLImageElement;
    this.canvasElement = anchor.lastElementChild as HTMLCanvasElement;
    this.imgElement.setAttribute("title", this.title);
    this.canvasElement.id = "canvas-" + this.title.replaceAll(/[^\w]/g, "_");
    this.canvasCtx = this.canvasElement.getContext("2d")!;
    this.canvasCtx!.fillStyle = "#aaa";
    this.canvasCtx!.fillRect(0, 0, 1, 1);
    if (this.onclick) {
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        this.onclick!(event);
      });
    }
    this.imgElement.onload = () => this.resize();
    return this.root;
  }

  resize() {
    if (!this.root || !this.imgElement || !this.canvasElement) return;
    if (!this.imgElement.src || this.imgElement.src === DEFAULT_THUMBNAIL) return;
    const newRatio = this.imgElement.naturalHeight / this.imgElement.naturalWidth;
    const oldRatio = this.canvasElement.height / this.canvasElement.width;
    if (this.canvasSized) {
      // if newRatio is less than (or more than) the oldRatio by 20%, we don't need to resize
      this.canvasSized = Math.abs(newRatio - oldRatio) < 1.2;
    }
    // TODO: maybe limit the ratio of the image, if it's too large
    if (!this.canvasSized) {
      this.canvasElement.width = this.root.offsetWidth;
      this.canvasElement.height = Math.floor(this.root.offsetWidth * newRatio);
      this.canvasSized = true;
    }
    if (this.imgElement.src === this.src) {
      // https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
      this.canvasCtx?.drawImage(this.imgElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      this.imgElement!.src = "";
    } else {
      resizing(this.imgElement, this.canvasElement)
        .then(() => this.imgElement!.src = "")
        .catch(() => this.imgElement!.src = this.canvasCtx?.drawImage(this.imgElement!, 0, 0, this.canvasElement!.width, this.canvasElement!.height) || "");
    }
  }

  render() {
    if (!this.imgElement) return;
    this.rendered = true;
    let justThumbnail = !this.blobUrl;
    if (this.mimeType === "image/gif" || this.mimeType?.startsWith("video")) {
      const tip = OVERLAY_TIP.cloneNode(true);
      tip.firstChild!.textContent = this.mimeType.split("/")[1].toUpperCase();
      this.root?.appendChild(tip);
      justThumbnail = true;
    }
    if (justThumbnail) {
      const delaySRC = this.delaySRC;
      this.delaySRC = undefined;
      if (delaySRC) {
        delaySRC.then(src => (this.src = src) && this.render());
      } else { // normally set src
        this.imgElement.src = this.src || this.blobUrl || DEFAULT_THUMBNAIL;
      }
      return;
    }
    this.imgElement.src = this.blobUrl || this.src || DEFAULT_THUMBNAIL;
  }

  unrender() {
    if (!this.rendered || !this.imgElement) return;
    this.imgElement.src = "";
    this.canvasSized = false;
  }

  onloaded(blobUrl: string, mimeType: string) {
    this.blobUrl = blobUrl;
    this.mimeType = mimeType;
  }

  progress(state: DownloadState) {
    if (!this.root) return;
    if (state.readyState === 4) {
      if (this.downloadBar && this.downloadBar.parentNode) {
        // this.downloadBar.remove(); // in steam, it randomly throw parentNode is null
        this.downloadBar.parentNode.removeChild(this.downloadBar);
      }
      return;
    }
    if (!this.downloadBar) {
      const downloadBar = document.createElement("div");
      downloadBar.classList.add("download-bar");
      downloadBar.innerHTML = `<div style="width: 0%"></div>`;
      this.downloadBar = downloadBar;
      this.root.firstElementChild!.appendChild(this.downloadBar);
    }
    if (this.downloadBar) {
      (this.downloadBar.firstElementChild as HTMLDivElement).style.width = (state.loaded / state.total) * 100 + "%";
    }
  }

  changeStyle(fetchStatus?: "fetching" | "fetched" | "failed") {
    if (!this.root) return;
    switch (fetchStatus) {
      case "fetching":
        this.root.classList.add("img-fetching");
        this.root.classList.remove("img-fetched");
        this.root.classList.remove("img-fetch-failed");
        break
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

  equal(ele: HTMLElement) {
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

export class ChapterNode implements VisualNode {
  chapter: Chapter;
  index: number;
  constructor(chapter: Chapter, index: number) {
    this.chapter = chapter;
    this.index = index;
  }

  create(): HTMLElement {
    const element = DEFAULT_NODE_TEMPLATE.cloneNode(true) as HTMLElement;
    const anchor = element.firstElementChild as HTMLAnchorElement;
    if (this.chapter.thumbimg) {
      const img = anchor.firstElementChild as HTMLImageElement;
      img.src = this.chapter.thumbimg;
      img.title = this.chapter.title.toString();
      img.style.display = "block";
      img.nextElementSibling?.remove();
    }
    // create title element
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

  render(): void { }
}
