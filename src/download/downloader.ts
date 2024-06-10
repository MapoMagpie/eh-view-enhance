import { FetchState, IMGFetcher } from "../img-fetcher";
import { conf } from "../config";
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
import { DownloaderPanel } from "../ui/downloader-panel";

const FILENAME_INVALIDCHAR = /[\\/:*?"<>|\n]/g;
export class Downloader {
  meta: (ch: Chapter) => GalleryMeta;
  title: () => string;
  downloading: boolean;
  queue: IMGFetcherQueue;
  idleLoader: IdleLoader;
  pageFetcher: PageFetcher;
  done: boolean = false;
  selectedChapters: ChapterStat[] = [];
  filenames: Set<string> = new Set();
  panel: DownloaderPanel;
  canvas: DownloaderCanvas;
  cherryPicks: CherryPick[] = [new CherryPick()]; // TODO: support multiple chapters

  constructor(HTML: Elements, queue: IMGFetcherQueue, idleLoader: IdleLoader, pageFetcher: PageFetcher, matcher: Matcher) {
    this.panel = HTML.downloader;
    this.panel.initTabs();
    this.initEvents(this.panel);
    this.panel.initCherryPick(
      range => this.cherryPicks[0].add(range),
      id => this.cherryPicks[0].remove(id)
    );


    this.queue = queue;
    this.queue.cherryPick = () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick();
    this.idleLoader = idleLoader;
    this.idleLoader.cherryPick = () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick();
    this.canvas = new DownloaderCanvas(this.panel.canvas, queue, () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick());
    this.pageFetcher = pageFetcher;
    this.meta = (ch: Chapter) => matcher.galleryMeta(document, ch);
    this.title = () => matcher.title(document);
    this.downloading = false;
    this.queue.downloading = () => this.downloading;

    EBUS.subscribe("ifq-on-finished-report", (_, queue) => {
      if (queue.isFinished()) {
        const sel = this.selectedChapters.find(sel => sel.index === queue.chapterIndex);
        if (sel) {
          sel.done = true;
          sel.resolve(true);
        }
        if (!this.downloading && !this.done) {
          this.panel.noticeableBTN();
        }
      }
    });
  }

  initEvents(panel: DownloaderPanel) {
    panel.forceBTN.addEventListener("click", () => this.download(this.pageFetcher.chapters));
    panel.startBTN.addEventListener("click", () => {
      if (this.downloading) {
        this.abort("downloadStart");
      } else {
        this.start();
      }
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


  // check > start > download
  check() {
    if (this.downloading) return;
    if (!conf.fetchOriginal) this.panel.noticeOriginal(() => this.fetchOriginalTemporarily());
    setTimeout(() => EBUS.emit("downloader-canvas-resize"), 110);
    this.panel.createChapterSelectList(this.pageFetcher.chapters, this.selectedChapters);
    if (this.queue.length > 0) {
      this.panel.switchTab("status");
    } else if (this.pageFetcher.chapters.length > 1) {
      this.panel.switchTab("chapters");
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
    const idSet = this.panel.selectedChapters();
    if (idSet.size === 0) {
      this.selectedChapters.push({ index: 0, done: false, ...promiseWithResolveAndReject() });
    } else {
      this.pageFetcher.chapters.forEach((c, i) => idSet.has(c.id) && this.selectedChapters.push({ index: i, done: false, ...promiseWithResolveAndReject() }));
    }
    // evLog("debug", "get selected chapters: ", this.selectedChapters);
    return this.selectedChapters;
  }

  async start() {
    if (this.downloading) return;
    this.panel.flushUI("downloading");
    this.downloading = true;
    this.idleLoader.autoLoad = true;
    this.checkSelectedChapters();
    try {
      // when downloading, the page fetcher's changeChapter will only change the this.queue (IMGFetcherQueue)
      for (const sel of this.selectedChapters) {
        if (!this.downloading) return;
        // the queue has been reset, IMGFetcherQueue.restore(chapter.queue)
        await this.pageFetcher.changeChapter(sel.index);
        // reset img fetcher stage to url, if it's failed
        this.queue.forEach((imf) => {
          if (imf.stage === FetchState.FAILED) {
            imf.retry();
          }
        });
        // already done
        if (this.queue.isFinished()) {
          sel.done = true;
          sel.resolve(true);
        } else { // not yet done
          // find all of unloading imgFetcher and splice frist few imgFetchers
          this.idleLoader.processingIndexList = this.queue.map((imgFetcher, index) => (!imgFetcher.lock && imgFetcher.stage === FetchState.URL ? index : -1))
            .filter((index) => index >= 0)
            .splice(0, conf.downloadThreads);
          this.idleLoader.onFailed(() => sel.reject("download failed or canceled"));
          this.idleLoader.checkProcessingIndex();
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


  mapToFileLikes(chapter: Chapter, picked: CherryPick, singleChapter: boolean, separator: string): FileLike[] {
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
      .filter((imf, i) => picked.picked(i) && imf.stage === FetchState.DONE && imf.data)
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
      this.panel.flushUI("packaging");
      const files: FileLike[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const picked = this.cherryPicks[i] || new CherryPick();
        const ret = this.mapToFileLikes(chapter, picked, singleChapter, separator);
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
    this.downloading = false;
    this.panel.abort(stage);
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
export type ChapterStat = {
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

// Download ranges of pages, split each range with comma (,)
// Ranges prefixed with ! means negative range, pages in these range will be excluded
// Example: 
//   -10:   Download from page 1 to 10
//   !8:   Exclude page 8
//   12:   Download page 12
//   14-20:   Download from page 14 to 20
//   15-17:   Exclude page 15 to 17
//   30-40/2:   Download each 2 pages in 30-40 (30, 32, 34, 36, 38, 40)
//   50-60/3:   Download each 3 pages in 50-60 (50, 53, 56, 59)
//   70-:   Download from page 70 to the last page
// Pages range follows your order, a negative range can drop previous selected pages, the latter positive range can add it back
// Example: 
//   !10-20:   Download every page except page 10 to 20
//   1-10,!1-8/2,!4,5:   Download page 1 to 10 but remove 1, 3, 5, 7 and 4, then add 5 back (2, 5, 6, 8, 9, 10)
export class CherryPick {
  values: CherryPickRnage[] = [];
  positive = false; // if values has positive picked, ignore exclude
  sieve: boolean[] = [];

  add(range: CherryPickRnage): CherryPickRnage[] | null {
    if (this.values.length === 0) {
      this.positive = range.positive;
      this.values.push(range);
      this.setSieve(range);
      return this.values;
    }

    const exists = this.values.find(v => v.id === range.id);
    if (exists) return null;
    const newR = range.range();
    const remIdSet: Set<string> = new Set();
    const addIdSet: Set<string> = new Set();
    const addList: CherryPickRnage[] = [];
    let contained = false;
    for (let i = 0; i < this.values.length; i++) {
      const old = this.values[i];
      const oldR = old.range();
      // new range overlaps with old range
      if (newR[0] >= oldR[0] && newR[1] <= oldR[1]) {
        if (range.positive === this.positive) {
          contained = true;
        } else {
          remIdSet.add(old.id);
          if (oldR[0] < newR[0]) {
            addList.push(new CherryPickRnage([oldR[0], newR[0] - 1], old.positive));
          }
          if (oldR[1] > newR[1]) {
            addList.push(new CherryPickRnage([newR[1] + 1, oldR[1]], old.positive));
          }
        }
        break;
      }
      if (newR[0] <= oldR[0] && newR[1] >= oldR[1]) {
        // new range contains old range
        remIdSet.add(old.id)
      } else if (newR[0] <= oldR[0] && newR[1] >= oldR[0] && newR[1] <= oldR[1]) {
        // new range right part intersects with old range
        old.reset([newR[1] + 1, oldR[1]]);
        if (range.positive === this.positive) {
          if (!addIdSet.has(range.id)) {
            addIdSet.add(range.id);
            addList.push(range);
          }
        }
      } else if (newR[0] >= oldR[0] && newR[0] <= oldR[1] && newR[1] >= oldR[1]) {
        // new range left part intersects with old range
        old.reset([oldR[0], newR[0] - 1]);
        if (range.positive === this.positive) {
          if (!addIdSet.has(range.id)) {
            addIdSet.add(range.id);
            addList.push(range);
          }
        }
      }
    }

    if (remIdSet.size > 0) {
      this.values = this.values.filter(v => !remIdSet.has(v.id));
    }
    if (addList.length > 0) {
      this.values.push(...addList);
    } else if (!contained && range.positive === this.positive) {
      this.values.push(range);
    }
    if (this.values.length === 0) {
      this.values.push(range);
      this.positive = range.positive;
      this.sieve = [];
    } else {
      this.concat();
    }
    this.setSieve(range);
    return this.values;
  }

  setSieve(range: CherryPickRnage) {
    const newR = range.range();
    for (let i = newR[0] - 1; i < newR[1]; i++) {
      this.sieve[i] = range.positive === this.positive;
    }
  }

  concat() {
    if (this.values.length < 2) return;
    this.values.sort((v1, v2) => v1.range()[0] - v2.range()[0]);
    let i = 0, j = 1;
    let skip: number[] = [];
    while (i < this.values.length && j < this.values.length) {
      const r1 = this.values[i];
      const r2 = this.values[j];
      const r1v = r1.range();
      const r2v = r2.range();
      if (r1v[1] + 1 === r2v[0]) {
        r1.reset([r1v[0], r2v[1]]);
        skip.push(j);
        j++;
      } else {
        do {
          i++;
        } while (skip.includes(i));
        j = i + 1;
      }
    }
    this.values = this.values.filter((_, i) => !skip.includes(i));
  }

  remove(id: string) {
    const index = this.values.findIndex(v => v.id === id);
    if (index === -1) return;
    const range = this.values.splice(index, 1)[0];
    const r = range.range();
    for (let i = r[0] - 1; i < r[1]; i++) {
      this.sieve[i] = false;
    }
    if (this.values.length === 0) {
      this.sieve = [];
      this.positive = false;
    }
  }

  picked(index: number): boolean {
    return this.positive ? this.sieve[index] : !this.sieve[index];
  }

}

export class CherryPickRnage {
  value: number | number[];
  positive: boolean;
  id: string;
  constructor(value: number | number[], positive: boolean) {
    if (value instanceof Array && value[0] === value[1]) {
      value = value[0];
    }
    this.value = value;
    this.positive = positive;
    this.id = CherryPickRnage.rangeToString(value, positive);
  }

  toString() {
    return CherryPickRnage.rangeToString(this.value, this.positive);
  }

  reset(newRange: number[]) {
    this.value = newRange[0] == newRange[1] ? newRange[0] : newRange;
    this.id = CherryPickRnage.rangeToString(this.value, this.positive);
  }

  range(): number[] {
    if (typeof this.value === "number") {
      return [this.value, this.value];
    }
    return this.value;
  }

  static rangeToString(value: number | number[], positive: boolean) {
    let str = "";
    if (typeof value === "number") {
      str = value.toString();
    } else {
      str = value.map(v => v.toString()).join("-");
    }
    return positive ? str : "!" + str;
  }

  static from(value: string): CherryPickRnage | null {
    value = value?.trim();
    if (!value) return null;
    value = value.replace(/!+/, "!");
    const exclude = value.startsWith("!");
    if (/^!?\d+$/.test(value)) {
      return new CherryPickRnage(parseInt(value.replace("!", "")), !exclude);
    }
    if (/^!?\d+-\d+$/.test(value)) {
      const splits = value.replace("!", "").split("-").map(v => parseInt(v));
      return new CherryPickRnage([splits[0], splits[1]], !exclude);
    }
    return null;
  }
}
