import { FetchState, IMGFetcher } from "../img-fetcher";
import { conf } from "../config";
import { i18n } from "../utils/i18n";
import { IMGFetcherQueue } from "../fetcher-queue";
import { IdleLoader } from "../idle-loader";
import { Matcher } from "../platform/platform";
import { GalleryMeta } from "./gallery-meta";
import { Elements } from "../ui/html";
import { FileLike, Zip } from "../utils/zip-stream";
import { saveAs } from "file-saver";
import EBUS from "../event-bus";
import { DownloaderCanvas } from "../ui/downloader-canvas";
import { Chapter, PageFetcher } from "../page-fetcher";
import { evLog } from "../utils/ev-log";

const FILENAME_INVALIDCHAR = /[\\/:*?"<>|]/g;
export class Downloader {
  meta: (ch: Chapter) => GalleryMeta;
  title: () => string;
  downloading: boolean;
  buttonForce: HTMLAnchorElement;
  buttonStart: HTMLAnchorElement;
  elementNotice: HTMLElement;
  downloaderPanelBTN: HTMLElement;
  queue: IMGFetcherQueue;
  idleLoader: IdleLoader;
  pageFetcher: PageFetcher;
  done: boolean = false;
  selectedChapters: ChapterStat[] = [];
  filenames: Set<string> = new Set();
  canvas: DownloaderCanvas;
  dashboardTab: HTMLElement;
  chapterTab: HTMLElement;
  elementDashboard: HTMLElement;
  elementChapters: HTMLElement;

  constructor(HTML: Elements, queue: IMGFetcherQueue, idleLoader: IdleLoader, pageFetcher: PageFetcher, matcher: Matcher) {
    this.queue = queue;
    this.idleLoader = idleLoader;
    this.pageFetcher = pageFetcher;
    this.meta = (ch: Chapter) => matcher.galleryMeta(document, ch);
    this.title = () => matcher.title(document);
    this.downloading = false;
    this.buttonForce = HTML.downloadBTNForce;
    this.buttonStart = HTML.downloadBTNStart;
    this.elementNotice = HTML.downloadNotice;
    this.downloaderPanelBTN = HTML.downloaderPanelBTN;
    this.buttonForce.addEventListener("click", () => this.download(this.pageFetcher.chapters));
    this.buttonStart.addEventListener("click", () => {
      if (this.downloading) {
        this.abort("downloadStart");
      } else {
        this.start();
      }
    });
    this.queue.downloading = () => this.downloading;
    this.dashboardTab = HTML.downloadTabDashboard;
    this.chapterTab = HTML.downloadTabChapters;
    this.elementDashboard = HTML.downloadDashboard;
    this.elementChapters = HTML.downloadChapters;
    this.canvas = new DownloaderCanvas(HTML.downloaderCanvas, HTML, queue);
    EBUS.subscribe("ifq-on-finished-report", (_, queue) => {
      if (queue.isFinised()) {
        const sel = this.selectedChapters.find(sel => sel.index === queue.chapterIndex);
        if (sel) {
          sel.done = true;
          sel.resolve(true);
        }
        if (!this.downloading && !this.done && !this.downloaderPanelBTN.classList.contains("lightgreen")) {
          this.downloaderPanelBTN.classList.add("lightgreen");
          if (!/✓/.test(this.downloaderPanelBTN.textContent!)) {
            this.downloaderPanelBTN.textContent += "✓";
          }
        }
      }
    });
    this.initTabs();
  }

  initTabs() {
    const tabs = [{
      ele: this.dashboardTab, cb: () => {
        this.elementDashboard.hidden = false;
        this.elementChapters.hidden = true;
        this.canvas.resize(this.elementDashboard);
      }
    }, {
      ele: this.chapterTab, cb: () => {
        this.elementDashboard.hidden = true;
        this.elementChapters.hidden = false;
      }
    }];
    tabs.forEach(({ ele, cb }, i) => {
      ele.addEventListener("click", () => {
        ele.classList.add("ehvp-p-tab-selected")
        tabs.filter((_, j) => j != i).forEach(t => t.ele.classList.remove("ehvp-p-tab-selected"));
        cb();
      });
    });
  }

  needNumberTitle(queue: IMGFetcher[]): boolean {
    let lastTitle = "";
    for (const fetcher of queue) {
      if (fetcher.node.title < lastTitle) {
        return true
      }
      lastTitle = fetcher.node.title;
    }
    return false;
  }

  checkDuplicateTitle(index: number, title: string): string {
    let newTitle = title;
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
      this.filenames.add(newTitle);
      return newTitle;
    }
  }

  createChapterSelectList() {
    const chapters = this.pageFetcher.chapters;
    const selectAll = chapters.length === 1;
    this.elementChapters.innerHTML = `
<div>
  <span id="download-chapters-select-all" class="clickable p-btn">Select All</span>
  <span id="download-chapters-unselect-all" class="clickable p-btn">Unselect All</span>
</div>
${chapters.map((c, i) => `<div><label>
  <input type="checkbox" id="ch-${c.id}" value="${c.id}" ${selectAll || this.selectedChapters.find(sel => sel.index === i) ? "checked" : ""} />
  <span>${c.title}</span></label></div>`).join("")}
`;
    ([["#download-chapters-select-all", true], ["#download-chapters-unselect-all", false]] as [string, boolean][]).forEach(([id, checked]) =>
      this.elementChapters.querySelector<HTMLInputElement>(id)?.addEventListener("click", () =>
        chapters.forEach(c => {
          const checkbox = this.elementChapters.querySelector<HTMLInputElement>("#ch-" + c.id);
          if (checkbox) checkbox.checked = checked;
        })
      )
    );
  }

  // check > start > download
  check() {
    if (this.downloading) return;
    if (!conf.fetchOriginal) {
      // append adviser element
      if (this.elementNotice && !this.downloading) {
        this.elementNotice.innerHTML = `<span>${i18n.originalCheck.get()}</span>`;
        this.elementNotice.querySelector("a")?.addEventListener("click", () => this.fetchOriginalTemporarily());
      }
    }
    setTimeout(() => this.canvas.resize(this.elementDashboard), 110);
    this.createChapterSelectList();
    if (this.queue.length > 0) {
      this.dashboardTab.click();
    } else if (this.pageFetcher.chapters.length > 1) {
      this.chapterTab.click();
    }
  }

  fetchOriginalTemporarily() {
    conf.fetchOriginal = true; // May result in incorrect persistence of the conf
    this.pageFetcher.chapters.forEach(ch => {
      ch.done = false;
      ch.queue.forEach(imf => imf.stage = FetchState.URL);
    });
    this.start();
  }

  checkSelectedChapters() {
    this.selectedChapters.length = 0;
    const idSet = new Set<number>();
    this.elementChapters.querySelectorAll<HTMLInputElement>("input[type=checkbox][id^=ch-]:checked").forEach(checkbox => idSet.add(Number(checkbox.value)));
    if (idSet.size === 0) {
      this.selectedChapters.push({ index: 0, done: false, ...promiseWithResolveAndReject() });
    } else {
      this.selectedChapters = this.pageFetcher.chapters.filter(c => idSet.has(c.id)).map(c => ({ index: c.id, done: false, ...promiseWithResolveAndReject() }));
    }
    evLog("debug", "get selected chapters: ", this.selectedChapters);
    return this.selectedChapters;
  }

  async start() {
    if (this.downloading) return;
    this.flushUI("downloading");
    this.downloading = true;
    this.idleLoader.autoLoad = true;
    this.checkSelectedChapters();
    try {
      // when downloading, the page fetcher's changeChapter will only change the this.queue (IMGFetcherQueue)
      for (const sel of this.selectedChapters) {
        if (!this.downloading) return;
        // the queue has been reset, IMGFetcherQueue.restore(chapter.queue)
        await this.pageFetcher.changeChapter(sel.index, false);
        // reset img fetcher stage to url, if it's failed
        this.queue.forEach((imf) => {
          if (imf.stage === FetchState.FAILED) {
            imf.retry();
          }
        });
        // already done
        if (this.queue.isFinised()) {
          sel.done = true;
          sel.resolve(true);
        } else { // not yet done
          // find all of unloading imgFetcher and splice frist few imgFetchers
          this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => (!imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1))
            .filter((index) => index >= 0)
            .splice(0, conf.downloadThreads);
          this.idleLoader.onFailed(() => sel.reject("download failed or canceled"));
          this.idleLoader.start();
        }
        // wait all finished
        await sel.promise;
      }
      if (this.downloading) await this.download(this.selectedChapters.filter(sel => sel.done).map(sel => this.pageFetcher.chapters[sel.index]));
    } catch (error) {
      if ("abort" === error) return;
      this.abort("downloadFailed");
      evLog("error", "download failed: ", error);
    } finally {
      this.downloading = false;
    }
  }

  flushUI(stage: "downloadFailed" | "downloaded" | "downloading" | "downloadStart" | "packaging") {
    if (this.elementNotice) {
      this.elementNotice.innerHTML = `<span>${i18n[stage].get()}</span>`;
    }
    if (this.buttonStart) {
      this.buttonStart.style.color = stage === "downloadFailed" ? "red" : "";
      this.buttonStart.textContent = i18n[stage].get();
    }
    this.downloaderPanelBTN.style.color = stage === "downloadFailed" ? "red" : "";
  }

  mapToFileLikes(chapter: Chapter, singleChapter: boolean, separator: string): FileLike[] {
    if (!chapter || chapter.queue.length === 0) return [];
    let checkTitle: (title: string, index: number) => string;
    const needNumberTitle = this.needNumberTitle(chapter.queue);
    if (needNumberTitle) {
      const digits = chapter.queue.length.toString().length;
      checkTitle = (title: string, index: number) => `${index + 1}`.padStart(digits, "0") + "_" + title.replaceAll(FILENAME_INVALIDCHAR, "_");
    } else {
      this.filenames.clear();
      checkTitle = (title: string, index: number) => this.checkDuplicateTitle(index, title.replaceAll(FILENAME_INVALIDCHAR, "_"));
    }
    let directory = (() => {
      if (singleChapter) return "";
      if (chapter.title instanceof Array) {
        return chapter.title.join("_").replaceAll(FILENAME_INVALIDCHAR, "_") + separator;
      } else {
        return chapter.title.replaceAll(FILENAME_INVALIDCHAR, "_") + separator;
      }
    })();

    const ret = chapter.queue
      .filter((imf) => imf.stage === FetchState.DONE && imf.data)
      .map((imf, index) => {
        return {
          stream: () => Promise.resolve(uint8ArrayToReadableStream(imf.data!)),
          size: () => imf.data!.byteLength,
          name: directory + checkTitle(imf.node.title, index)
        }
      });
    // gallery meta
    let meta = new TextEncoder().encode(JSON.stringify(this.meta(chapter), null, 2));
    ret.push({
      stream: () => Promise.resolve(new ReadableStream({
        start(c) {
          c.enqueue(meta);
          c.close();
        }
      })),
      size: () => meta.byteLength,
      name: directory + "meta.json"
    });
    return ret;
  }

  async download(chapters: Chapter[]) {
    try {
      let archiveName = this.title().replaceAll(FILENAME_INVALIDCHAR, "_");
      let separator = navigator.userAgent.indexOf("Win") !== -1 ? "\\" : "/";
      let singleChapter = chapters.length === 1;
      this.flushUI("packaging");
      const files: FileLike[] = [];
      for (const chapter of chapters) {
        const ret = this.mapToFileLikes(chapter, singleChapter, separator);
        files.push(...ret);
      }
      const zip = new Zip({ volumeSize: 1024 * 1024 * (conf.archiveVolumeSize || 1500) });
      files.forEach((file) => zip.add(file));
      let save = async () => {
        let readable;
        while (readable = zip.nextReadableStream()) {
          const blob = await new Response(readable).blob();
          let ext = zip.currVolumeNo === zip.volumes - 1 ?
            "zip" :
            "z" + (zip.currVolumeNo + 1).toString().padStart(2, "0");
          // TODO: chromium support writeableStream https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#write-file
          saveAs(blob, `${archiveName}.${ext}`);
        }
      }
      await save();
      this.done = true;
    } finally {
      this.abort(this.done ? "downloaded" : "downloadFailed");
    }
  };

  abort(stage: "downloadFailed" | "downloaded" | "downloadStart") {
    this.downloaderPanelBTN.textContent = i18n.download.get();
    this.downloaderPanelBTN.classList.remove("lightgreen");
    this.downloading = false;
    this.flushUI(stage);
    this.idleLoader.abort();
    this.selectedChapters.forEach(sel => sel.reject("abort"));
  }
}

function uint8ArrayToReadableStream(arr: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(arr);
      controller.close();
    }
  });
}
type ChapterStat = {
  index: number,
  done: boolean,
  promise: Promise<boolean>,
  reject: (reason?: any) => void
  resolve: (value: boolean | PromiseLike<boolean>) => void
};

function promiseWithResolveAndReject() {
  let resolve: (value: boolean | PromiseLike<boolean>) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<boolean>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve: resolve!, reject: reject!, promise };
}
