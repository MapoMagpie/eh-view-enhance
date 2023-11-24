import { FetchState, IMGFetcher } from "./img-fetcher";
import { conf } from "./config";
import { evLog } from "./utils/ev-log";
import { i18n } from "./utils/i18n";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
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
  }

  fetchOriginalTemporarily() {
    this.queue.forEach(imgFetcher => {
      imgFetcher.stage = FetchState.URL;
    });
    this.start();
  }

  start() {
    if (this.queue.isFinised()) {
      this.download();
      return;
    }
    if (this.downloadNoticeElement) {
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
    this.downloading = false;
    this.zip.generateAsync({ type: "blob" }, (_metadata) => {
      // console.log(metadata);
      // TODO: progress bar
    }).then(data => {
      saveAs(data, `${this.title}.zip`);
      if (this.downloadNoticeElement) this.downloadNoticeElement.innerHTML = "";
      if (this.downloadStartElement) this.downloadStartElement.textContent = i18n.download.get();
    });
  };
}

