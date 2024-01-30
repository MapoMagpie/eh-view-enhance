import { FetchState } from "../img-fetcher";
import { conf } from "../config";
import { i18n } from "../utils/i18n";
import { IMGFetcherQueue } from "../fetcher-queue";
import { IdleLoader } from "../idle-loader";
import { Matcher } from "../platform/platform";
import { GalleryMeta } from "./gallery-meta";
import { Elements } from "../ui/html";
import { Zip } from "../utils/zip-stream";
import { saveAs } from "file-saver";
import q from "../utils/query-element";

const FILENAME_INVALIDCHAR = /[\\/:*?"<>|]/g;
export class Downloader {
  meta: () => GalleryMeta;
  downloading: boolean;
  downloadForceElement: HTMLElement;
  downloadStartElement: HTMLAnchorElement;
  downloadNoticeElement: HTMLElement;
  downloaderPanelBTN: HTMLElement;
  queue: IMGFetcherQueue;
  idleLoader: IdleLoader;
  done: boolean = false;
  isReady: () => boolean;
  filenames: Set<string> = new Set();

  constructor(HTML: Elements, queue: IMGFetcherQueue, idleLoader: IdleLoader, matcher: Matcher, allPagesReady: () => boolean) {
    this.queue = queue;
    this.idleLoader = idleLoader;
    this.isReady = allPagesReady;
    this.meta = () => matcher.parseGalleryMeta(document);
    this.downloading = false;
    this.downloadForceElement = q("#download-force");
    this.downloadStartElement = q("#download-start");
    this.downloadNoticeElement = q("#download-notice");
    this.downloaderPanelBTN = HTML.downloaderPanelBTN;
    this.downloadForceElement.addEventListener("click", () => this.download());
    this.downloadStartElement.addEventListener("click", () => this.start());
    this.queue.subscribeOnDo(1, () => this.downloading);
    this.queue.subscribeOnFinishedReport(0, (_, queue) => {
      if (queue.isFinised()) {
        if (this.downloading) {
          this.download();
        } else if (!this.done && !this.downloaderPanelBTN.classList.contains("lightgreen")) {
          this.downloaderPanelBTN.classList.add("lightgreen");
          if (!/✓/.test(this.downloaderPanelBTN.textContent!)) {
            this.downloaderPanelBTN.textContent += "✓";
          }
        }
      }
      return false;
    });
  }

  needNumberTitle(): boolean {
    let lastTitle = "";
    for (const fetcher of this.queue) {
      if (fetcher.node.title < lastTitle) {
        return true
      }
      lastTitle = fetcher.node.title;
    }
    return false;
  }

  checkDuplicateTitle(index: number, $title: string): string {
    let newTitle = $title.replace(FILENAME_INVALIDCHAR, "_");
    if (this.filenames.has(newTitle)) {
      let splits = newTitle.split(".");
      const ext = splits.pop();
      const prefix = splits.join(".");
      const num = parseInt(prefix.match(/_(\d+)$/)?.[1] || "");
      if (isNaN(num)) {
        newTitle = `${prefix}_1.${ext}`;
      } else {
        newTitle = `${prefix.replace(/\d+$/, (num + 1).toString())}.${ext}`;
      }
      return this.checkDuplicateTitle(index, newTitle);
    } else {
      return newTitle;
    }
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
    conf.fetchOriginal = true; // May result in incorrect persistence of the conf
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
    this.flushUI("downloading")
    this.downloading = true;
    // Temporary enable "autoload", but it may result in persisting this to the config.
    this.idleLoader.autoLoad = true;

    // reset img fetcher stage to url, if it's failed
    this.queue.forEach((imf) => {
      if (imf.stage === FetchState.FAILED) {
        imf.retry();
      }
    });
    // find all of unloading imgFetcher and splice frist few imgFetchers
    this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => (!imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1))
      .filter((index) => index >= 0)
      .splice(0, conf.downloadThreads);
    this.idleLoader.onFailed(() => {
      this.downloading = false;
      this.flushUI("downloadFailed")
    });
    this.idleLoader.start(++this.idleLoader.lockVer);
  }

  flushUI(stage: "downloadFailed" | "downloaded" | "downloading" | "downloadStart" | "packaging") {
    if (this.downloadNoticeElement) {
      this.downloadNoticeElement.innerHTML = `<span>${i18n[stage].get()}</span>`;
    }
    if (this.downloadStartElement) {
      this.downloadStartElement.style.color = stage === "downloadFailed" ? "red" : "";
      this.downloadStartElement.textContent = i18n[stage].get();
    }
    this.downloaderPanelBTN.style.color = stage === "downloadFailed" ? "red" : "";
  }

  download() {
    this.downloading = false;
    this.idleLoader.abort(this.queue.currIndex);

    this.flushUI("packaging");

    let checkTitle: (title: string, index: number) => string;
    const needNumberTitle = this.needNumberTitle();
    if (needNumberTitle) {
      const digits = this.queue.length.toString().length;
      checkTitle = (title: string, index: number) => `${index + 1}`.padStart(digits, "0") + "_" + title;
    } else {
      checkTitle = (title: string, index: number) => this.checkDuplicateTitle(index, title);
    }

    let files = this.queue
      .filter((imf) => imf.stage === FetchState.DONE && imf.data)
      .map((imf, index) => {
        // console.log("img fetcher :", imf.data?.length, ", title: ", checkTitle(imf.node.title, index));
        return {
          stream: () => Promise.resolve(uint8ArrayToReadableStream(imf.data!)),
          size: () => imf.data!.byteLength,
          name: checkTitle(imf.node.title, index)
        }
      });
    const zip = new Zip({ volumeSize: 1024 * 1024 * (conf.archiveVolumeSize || 1500) });
    files.forEach((file) => zip.add(file));
    let meta = new TextEncoder().encode(JSON.stringify(this.meta(), null, 2));
    zip.add({
      stream: () => Promise.resolve(new ReadableStream({
        start(c) {
          c.enqueue(meta);
          c.close();
        }
      })),
      size: () => meta.byteLength,
      name: "meta.json"
    });

    let save = async () => {
      let readable;
      while (readable = zip.nextReadableStream()) {
        const blob = await new Response(readable).blob();
        let ext = zip.currVolumeNo === zip.volumes - 1 ?
          "zip" :
          "z" + (zip.currVolumeNo + 1).toString().padStart(2, "0");
        saveAs(blob, `${this.meta().originTitle || this.meta().title}.${ext}`);
      }
      this.flushUI("downloaded");
      this.done = true;
      this.downloaderPanelBTN.textContent = i18n.download.get();
      this.downloaderPanelBTN.classList.remove("lightgreen");
    }
    save();
  };
}

function uint8ArrayToReadableStream(arr: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(arr);
      controller.close();
    }
  });
}
