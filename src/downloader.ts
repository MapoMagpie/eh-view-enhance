import { FetchState, IMGFetcher } from "./img-fetcher";
import { conf } from "./config";
import { evLog } from "./utils/ev-log";
import { i18n } from "./utils/i18n";
import { IMGFetcherQueue } from "./fetcher-queue";
import { Debouncer } from "./utils/debouncer";
import { IdleLoader } from "./idle-loader";
import { events } from "./ui/event";
import JSZip from "jszip";
import saveAs from "file-saver";

class GalleryMeta {
  url: string;
  title?: string;
  originTitle?: string;
  tags: Record<string, string[]>;
  constructor($doc: Document) {
    this.url = $doc.location.href;
    const titleList = $doc.querySelectorAll<HTMLElement>("#gd2 h1");
    if (titleList && titleList.length > 0) {
      this.title = titleList[0].textContent || undefined;
      if (titleList.length > 1) {
        this.originTitle = titleList[1].textContent || undefined;
      }
    }
    this.tags = GalleryMeta.parser_tags($doc);
    // console.log(this);
  }

  static parser_tags($doc: Document): Record<string, string[]> {
    const tagTrList = $doc.querySelectorAll<HTMLElement>("#taglist tr");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const tds = tr.childNodes;
      const cat = tds[0].textContent;
      if (cat) {
        const list: string[] = [];
        tds[1].childNodes.forEach((ele) => {
          if (ele.textContent) list.push(ele.textContent);
        });
        tags[cat] = list;
      }
    });
    return tags;
  }
}

export class Downloader {
  meta: GalleryMeta;
  zip: JSZip;
  title?: string;
  downloading: boolean;
  downloadForceElement?: HTMLElement;
  downloadStartElement?: HTMLAnchorElement;
  downloadNoticeElement?: HTMLElement;
  queue: IMGFetcherQueue;
  idleLoader: IdleLoader;
  constructor(queue: IMGFetcherQueue, idleLoader: IdleLoader) {
    this.queue = queue;
    this.idleLoader = idleLoader;
    this.meta = new GalleryMeta(document);
    this.zip = new JSZip();
    this.title = this.meta.originTitle || this.meta.title;
    this.zip.file("meta.json", JSON.stringify(this.meta));
    this.downloading = false;
    this.downloadForceElement = document.querySelector("#download-force") || undefined;
    this.downloadStartElement = document.querySelector("#download-start") || undefined;
    this.downloadNoticeElement = document.querySelector("#download-notice") || undefined;
    this.downloadForceElement?.addEventListener("click", () => this.download());
    this.downloadStartElement?.addEventListener("click", () => this.start());
  }

  addToDownloadZip(imgFetcher: IMGFetcher) {
    if (conf.disableDownload) return;
    let title = imgFetcher.title;
    if (title) {
      title = title.replace(/Page\s\d+[:_]\s*/, "");
    } else {
      title = imgFetcher.root.firstElementChild?.getAttribute("asrc")?.split("/").pop();
    }
    if (!title) {
      evLog("无法解析图片文件名，因此该图片无法下载");
      return;
    }
    if (!imgFetcher.blobData) {
      evLog("无法获取图片数据，因此该图片无法下载");
      return;
    }
    this.zip.file(title, imgFetcher.blobData, { binary: true });
  }
  // check > start > download
  check() {
    if (conf.fetchOriginal) return;
    // append adviser element
    if (this.downloadNoticeElement && !this.downloading) {
      this.downloadNoticeElement.innerHTML = `<span>${i18n.originalCheck.get()}</span>`;
      this.downloadNoticeElement.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
    }
    if (conf.disableDownload && this.downloadNoticeElement) {
      this.downloadNoticeElement.innerHTML = "<span>下载功能已禁用</span>";
      this.downloadNoticeElement.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
      if (this.downloadStartElement) {
        this.downloadStartElement.setAttribute("disabled", "true");
      }
    }
  }

  fetchOriginalTemporarily() {
    this.queue.forEach(imgFetcher => {
      if (!imgFetcher.fetchOriginal || imgFetcher.stage !== FetchState.DONE) {
        imgFetcher.fetchOriginal = true;
        imgFetcher.stage = FetchState.URL;
      }
    });
    this.start();
  }

  start() {
    if (this.queue.isFinised()) {
      this.download();
      return;
    }
    if (this.downloadNoticeElement && !conf.disableDownload) {
      this.downloadNoticeElement.innerHTML = `<span>${i18n.downloading.get()}</span>`;
    }
    if (this.downloadStartElement) {
      this.downloadStartElement.textContent = i18n.downloading.get();
    }
    this.downloading = true;

    if (!conf.autoLoad) conf.autoLoad = true;
    this.idleLoader.lockVer++;
    // find all of unloading imgFetcher and splice frist few imgFetchers
    this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => (!imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1))
      .filter((index) => index >= 0)
      .splice(0, conf.downloadThreads);
    this.idleLoader.start(this.idleLoader.lockVer);
  }

  download() {
    if (conf.disableDownload) return;
    this.downloading = false;
    this.zip.generateAsync({ type: "blob" }, (_metadata) => {
      // console.log(metadata);
      // todo progress bar
    }).then(data => {
      saveAs(data, `${this.title}.zip`);
      if (this.downloadNoticeElement) this.downloadNoticeElement.innerHTML = "";
      if (this.downloadStartElement) this.downloadStartElement.textContent = i18n.download.get();
    });
  };
}

type MouseMoveState = {
  x: number;
  y: number;
};

export class DownloaderCanvas {
  canvas: HTMLCanvasElement;
  mousemoveState: MouseMoveState;
  ctx: CanvasRenderingContext2D;
  queue: IMGFetcherQueue;
  rectSize: number;
  rectGap: number;
  columns: number;
  padding: number;
  scrollSize: number;
  scrollTop: number;
  debouncer: Debouncer;

  constructor(id: string, queue: IMGFetcherQueue) {
    this.queue = queue;
    const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`);
    if (!canvas) {
      throw new Error("canvas not found");
    }
    this.canvas = canvas;
    this.canvas.addEventListener("wheel", (event) => this.onwheel(event.deltaY));
    this.mousemoveState = { x: 0, y: 0 };
    this.canvas.addEventListener("mousemove", (event) => {
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      this.drawDebouce();
    });
    this.canvas.addEventListener("click", (event) => {
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      const index = this.computeDrawList()?.find(state => state.isSelected).index;
      events.showBigImage(index);
    });
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas context not found");
    }
    this.ctx = ctx;
    this.rectSize = 12; // 矩形大小(正方形)
    this.rectGap = 6; // 矩形之间间隔
    this.columns = 15; // 每行矩形数量
    this.padding = 7; // 画布内边距
    // this.scrollTo = 0; // 滚动位置
    this.scrollTop = 0;
    this.scrollSize = 10; // 每次滚动粒度
    this.debouncer = new Debouncer();
  }

  onwheel(deltaY: number) {
    const [_, h] = this.getWH();
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
    this.debouncer.addEvent("DOWNLOADER-DRAW", () => this.draw(), 20);
  }

  computeDrawList(): any[] {
    const list = [];
    const [_, h] = this.getWH();
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

  scrollTo(index: number) {
    const clientHeight = this.computeClientHeight();
    const [_, h] = this.getWH();
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

  isSelected(atX: number, atY: number): boolean {
    return this.mousemoveState.x - atX >= 0
      && this.mousemoveState.x - atX <= this.rectSize
      && this.mousemoveState.y - atY >= 0
      && this.mousemoveState.y - atY <= this.rectSize;
  }

  computeStartX(): number {
    const [w, _] = this.getWH();
    const drawW = this.rectSize * this.columns + this.rectGap * this.columns - 1;
    let startX = (w - drawW) >> 1;
    return startX;
  }

  drawSmallRect(x: number, y: number, imgFetcher: IMGFetcher, isCurr: boolean, isSelected: boolean) {
    switch (imgFetcher.stage) {
      case FetchState.DONE:
        this.ctx.fillStyle = "rgb(110, 200, 120)";
        break;
      case FetchState.DATA:
        const percent = imgFetcher.downloadState.loaded / imgFetcher.downloadState.total;
        this.ctx.fillStyle = `rgba(110, ${Math.ceil(percent * 200)}, 120, ${Math.max(percent, 0.1)})`;
        break;
      default:
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
