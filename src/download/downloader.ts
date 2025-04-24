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
import { i18n } from "../utils/i18n";

const FILENAME_INVALIDCHAR = /[\\/:*?"<>|\n\t]/g;
export class Downloader {
  meta: (chapter: Chapter) => GalleryMeta;
  title: (chapters: Chapter[]) => string;
  downloading: boolean;
  queue: IMGFetcherQueue;
  idleLoader: IdleLoader;
  pageFetcher: PageFetcher;
  done: boolean = false;
  selectedChapters: ChapterStat[] = [];
  filenames: Set<string> = new Set();
  panel: DownloaderPanel;
  canvas: DownloaderCanvas;
  cherryPicks: CherryPick[] = [new CherryPick()];

  constructor(HTML: Elements, queue: IMGFetcherQueue, idleLoader: IdleLoader, pageFetcher: PageFetcher, matcher: Matcher<any>) {
    this.panel = HTML.downloader;
    this.panel.initTabs();
    this.initEvents(this.panel);
    this.panel.initCherryPick(
      (chapterIndex, range) => {
        if (this.cherryPicks[chapterIndex] === undefined) {
          this.cherryPicks[chapterIndex] = new CherryPick();
        }
        const ret = this.cherryPicks[chapterIndex].add(range);
        EBUS.emit("cherry-pick-changed", chapterIndex, this.cherryPicks[chapterIndex]);
        return ret;
      },
      (chapterIndex, id) => {
        if (this.cherryPicks[chapterIndex] === undefined) {
          this.cherryPicks[chapterIndex] = new CherryPick();
        }
        const ret = this.cherryPicks[chapterIndex].remove(id);
        EBUS.emit("cherry-pick-changed", chapterIndex, this.cherryPicks[chapterIndex]);
        return ret;
      },
      (chapterIndex) => {
        if (this.cherryPicks[chapterIndex] === undefined) {
          this.cherryPicks[chapterIndex] = new CherryPick();
        }
        this.cherryPicks[chapterIndex].reset();
        EBUS.emit("cherry-pick-changed", chapterIndex, this.cherryPicks[chapterIndex]);
      },
      (chapterIndex) => {
        if (this.cherryPicks[chapterIndex] === undefined) {
          this.cherryPicks[chapterIndex] = new CherryPick();
        }
        return this.cherryPicks[chapterIndex].values;
      }
    );
    this.panel.initNotice([
      {
        btn: i18n.resetDownloaded.get(),
        cb: () => {
          if (confirm(i18n.resetDownloadedConfirm.get())) this.queue.forEach(imf => (imf.stage === FetchState.DONE) && imf.resetStage());
        }
      },
      {
        btn: i18n.resetFailed.get(),
        cb: () => {
          this.queue.forEach(imf => (imf.stage === FetchState.FAILED) && imf.resetStage());
          if (!this.downloading) this.idleLoader.abort(0, 100);
        }
      }
    ]);
    this.queue = queue;
    this.queue.cherryPick = () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick();
    this.idleLoader = idleLoader;
    this.idleLoader.cherryPick = () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick();
    this.canvas = new DownloaderCanvas(this.panel.canvas, queue, () => this.cherryPicks[this.queue.chapterIndex] || new CherryPick());
    this.pageFetcher = pageFetcher;
    this.meta = (chapter: Chapter) => matcher.galleryMeta(chapter);
    this.title = (chapters: Chapter[]) => matcher.title(chapters);
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
    EBUS.subscribe("imf-check-picked", (chapterIndex, index) => this.cherryPicks[chapterIndex]?.picked(index));
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
    if (conf.filenameOrder === "numbers") return true;
    if (conf.filenameOrder === "original") return false;
    let comparer;
    if (conf.filenameOrder === "alphabetically") {
      comparer = (a: string, before: string) => a < before;
    } else {
      comparer = (a: string, before: string) => a.localeCompare(before, undefined, { numeric: true, sensitivity: 'base' }) < 0;
    }
    let lastTitle = "";
    for (const fetcher of queue) {
      if (lastTitle && comparer(fetcher.node.title, lastTitle)) {
        return true;
      }
      lastTitle = fetcher.node.title;
    }
    return false;
  }


  // check > start > download
  check() {
    if (this.downloading) return;
    setTimeout(() => EBUS.emit("downloader-canvas-resize"), 110);
    this.panel.createChapterSelectList(this.pageFetcher.chapters, this.selectedChapters);
    if (this.queue.length > 0) {
      this.panel.switchTab("status");
    } else if (this.pageFetcher.chapters.length > 1) {
      this.panel.switchTab("chapters");
    }
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
    // if (this.pageFetcher.chapters.length === 0) {
    //   EBUS.emit("pf-init", () => this.start());
    //   return;
    // }
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
        this.queue.forEach((imf) => (imf.stage === FetchState.FAILED) && imf.resetStage());
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

  mapToFileLikes(chapter: Chapter, picked: CherryPick, directory: string): FileLike[] {
    if (!chapter || chapter.queue.length === 0) return [];
    let checkTitle: (title: string, index: number) => string;
    const needNumberTitle = this.needNumberTitle(chapter.queue);
    if (needNumberTitle) {
      const digits = chapter.queue.length.toString().length;
      if (conf.filenameOrder === "numbers") {
        checkTitle = (title: string, index: number) => `${index + 1}`.padStart(digits, "0") + "." + title.split(".").pop();
      } else {
        checkTitle = (title: string, index: number) => `${index + 1}`.padStart(digits, "0") + "_" + title.replaceAll(FILENAME_INVALIDCHAR, "_");
      }
    } else {
      this.filenames.clear();
      checkTitle = (title: string) => deduplicate(this.filenames, title.replaceAll(FILENAME_INVALIDCHAR, "_"));
    }
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
    const meta = new TextEncoder().encode(JSON.stringify(this.meta(chapter), null, 2));
    ret.push({
      stream: () => Promise.resolve(uint8ArrayToReadableStream(meta)),
      size: () => meta.byteLength,
      name: directory + "meta.json"
    });
    return ret;
  }

  async download(chapters: Chapter[]) {
    try {
      const archiveName = this.title(chapters).replaceAll(FILENAME_INVALIDCHAR, "_");
      const separator = navigator.userAgent.indexOf("Win") !== -1 ? "\\" : "/";
      const singleChapter = chapters.length === 1;
      this.panel.flushUI("packaging");
      const dirnameSet = new Set<string>();
      const files: FileLike[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const picked = this.cherryPicks[i] || new CherryPick();
        let directory = (() => {
          if (singleChapter) return "";
          if (chapter.title instanceof Array) {
            return chapter.title.join("_").replaceAll(FILENAME_INVALIDCHAR, "_").replaceAll(/\s+/g, " ") + separator;
          } else {
            return chapter.title.replaceAll(FILENAME_INVALIDCHAR, "_").replaceAll(/\s+/g, " ") + separator;
          }
        })();
        directory = shrinkFilename(directory, 200);
        directory = deduplicate(dirnameSet, directory);
        const ret = this.mapToFileLikes(chapter, picked, directory);
        files.push(...ret);
      }
      const zip = new Zip({ volumeSize: 1024 * 1024 * (conf.archiveVolumeSize || 1500) });
      files.forEach((file) => zip.add(file));
      const save = async () => {
        let readable;
        while (readable = zip.nextReadableStream()) {
          const blob = await new Response(readable).blob();
          const ext = zip.currVolumeNo === zip.volumes - 1 ?
            "zip" :
            "z" + (zip.currVolumeNo + 1).toString().padStart(2, "0");
          // TODO: chromium support writeableStream https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#write-file
          saveAs(blob, `${archiveName}.${ext}`);
        }
      }
      await save();
      this.done = true;
    } catch (error: any) {
      let reason = error.toString() as string;
      if (reason.includes(`autoAllocateChunkSize`)) {
        reason = "Create Zip archive prevented by The content security policy of this page. Please refer to the CONF > Help for a solution.";
      }
      EBUS.emit("notify-message", "error", `packaging failed, ${reason}`);
      throw error;
    } finally {
      this.abort(this.done ? "downloaded" : "downloadFailed");
    }
  }

  abort(stage: "downloadFailed" | "downloaded" | "downloadStart") {
    this.downloading = false;
    this.panel.abort(stage);
    this.idleLoader.abort();
    this.selectedChapters.forEach(sel => sel.reject("abort"));
  }
}

function shrinkFilename(str: string, limit: number): string {
  const encoder = new TextEncoder();
  const byteLen = (s: string) => encoder.encode(s).byteLength;
  const bLen = byteLen(str);
  if (bLen <= limit) return str;
  const sliceRange = [str.length >> 1, (str.length >> 1) + 1]
  let left = true;
  while (true) {
    if (bLen - byteLen(str.slice(...sliceRange)) <= limit) {
      return str.slice(0, sliceRange[0]) + ",,," + str.slice(sliceRange[1]);
    }
    if (left && sliceRange[0] > 3) {
      sliceRange[0] -= 1;
      left = false;
      continue;
    }
    if (sliceRange[1] < str.length - 3) {
      sliceRange[1] += 1;
      left = true;
      continue;
    }
    break;
  }
  return str.slice(0, limit);
}

function deduplicate(set: Set<string>, title: string): string {
  let newTitle = title;
  if (set.has(newTitle)) {
    const splits = newTitle.split(".");
    const ext = splits.pop();
    const prefix = splits.join(".");
    const num = parseInt(prefix.match(/_(\d+)$/)?.[1] || "");
    if (isNaN(num)) {
      newTitle = `${prefix}_1.${ext}`;
    } else {
      newTitle = `${prefix.replace(/\d+$/, (num + 1).toString())}.${ext}`;
    }
    return deduplicate(set, newTitle);
  } else {
    set.add(newTitle);
    return newTitle;
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

function promiseWithResolveAndReject() {
  let resolve: (value: boolean | PromiseLike<boolean>) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<boolean>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve: resolve!, reject: reject!, promise };
}

export type ChapterStat = {
  index: number,
  done: boolean,
  promise: Promise<boolean>,
  reject: (reason?: any) => void
  resolve: (value: boolean | PromiseLike<boolean>) => void
};

export class CherryPick {
  values: CherryPickRange[] = [];
  positive = false; // if values has positive picked, ignore exclude
  sieve: boolean[] = [];

  reset() {
    this.values = [];
    this.positive = false;
    this.sieve = [];
  }

  add(range: CherryPickRange): CherryPickRange[] | null {
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
    const addList: CherryPickRange[] = [];
    let equalsOld = false;
    for (let i = 0; i < this.values.length; i++) {
      const old = this.values[i];
      const oldR = old.range();
      // new range overlaped by old range
      if (newR[0] >= oldR[0] && newR[1] <= oldR[1]) {
        if (range.positive !== this.positive) {
          remIdSet.add(old.id);
          if (oldR[0] < newR[0]) {
            addList.push(new CherryPickRange([oldR[0], newR[0] - 1], old.positive));
          }
          if (oldR[1] > newR[1]) {
            addList.push(new CherryPickRange([newR[1] + 1, oldR[1]], old.positive));
          }
          equalsOld = newR[0] === newR[1] && newR[0] === oldR[0] && newR[1] === oldR[1];
        }
        break;
      }

      if (newR[0] <= oldR[0] && newR[1] >= oldR[1]) {
        // new range contains old range
        remIdSet.add(old.id);
      } else if (newR[0] <= oldR[0] && newR[1] >= oldR[0] && newR[1] <= oldR[1]) {
        // new range right part intersects with old range
        old.reset([newR[1] + 1, oldR[1]]);
      } else if (newR[0] >= oldR[0] && newR[0] <= oldR[1] && newR[1] >= oldR[1]) {
        // new range left part intersects with old range
        old.reset([oldR[0], newR[0] - 1]);
      }
      if (range.positive === this.positive) {
        if (!addIdSet.has(range.id)) {
          addIdSet.add(range.id);
          addList.push(range);
        }
      }
    }

    if (remIdSet.size > 0) {
      this.values = this.values.filter(v => !remIdSet.has(v.id));
    }
    if (addList.length > 0) {
      this.values.push(...addList);
    }
    if (this.values.length === 0) {
      this.reset();
      if (equalsOld) {
        return this.values;
      }
      this.positive = range.positive;
      this.values.push(range);
    } else {
      this.concat();
    }
    this.setSieve(range);
    return this.values;
  }

  setSieve(range: CherryPickRange) {
    const newR = range.range();
    for (let i = newR[0] - 1; i < newR[1]; i++) {
      this.sieve[i] = range.positive === this.positive;
    }
  }

  concat() {
    if (this.values.length < 2) return;
    this.values.sort((v1, v2) => v1.range()[0] - v2.range()[0]);
    let i = 0, j = 1;
    const skip: number[] = [];
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
    return Boolean(this.positive ? this.sieve[index] : !this.sieve[index]);
  }

}

export class CherryPickRange {
  value: number[];
  positive: boolean;
  id: string;
  constructor(value: number[], positive: boolean) {
    this.positive = positive;
    this.value = value.sort((a, b) => a - b);
    this.id = CherryPickRange.rangeToString(this.value, this.positive);
  }

  toString() {
    return CherryPickRange.rangeToString(this.value, this.positive);
  }

  reset(newRange: number[]) {
    this.value = newRange.sort((a, b) => a - b);
    this.id = CherryPickRange.rangeToString(this.value, this.positive);
  }

  range(): number[] {
    return this.value;
  }

  static rangeToString(value: number[], positive: boolean) {
    let str = "";
    if (value[0] === value[1]) {
      str = value[0].toString();
    } else {
      str = value.map(v => v.toString()).join("-");
    }
    return positive ? str : "!" + str;
  }

  static from(value: string): CherryPickRange | null {
    value = value?.trim();
    if (!value) return null;
    value = value.replace(/!+/, "!");
    const exclude = value.startsWith("!");
    if (/^!?\d+$/.test(value)) {
      const index = parseInt(value.replace("!", ""));
      return new CherryPickRange([index, index], !exclude);
    }
    if (/^!?\d+-\d+$/.test(value)) {
      const splits = value.replace("!", "").split("-").map(v => parseInt(v));
      return new CherryPickRange([splits[0], splits[1]], !exclude);
    }
    return null;
  }
}
