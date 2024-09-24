import EBUS from "./event-bus";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IMGFetcher } from "./img-fetcher";
import ImageNode, { VisualNode } from "./img-node";
import { Matcher } from "./platform/platform";
import { Debouncer } from "./utils/debouncer";
import { evLog } from "./utils/ev-log";

export type Chapter = {
  id: number;
  title: string | string[];
  source: string; // url
  queue: IMGFetcher[];
  thumbimg?: string;
  sourceIter?: AsyncGenerator<any>;
  done?: boolean;
  onclick?: (index: number) => void;
}

export class PageFetcher {
  chapters: Chapter[] = [];
  chapterIndex: number = 0;
  queue: IMGFetcherQueue;
  matcher: Matcher<any>;
  beforeInit?: () => void;
  afterInit?: () => void;
  private appendPageLock: boolean = false;
  private abortb: boolean = false;

  constructor(queue: IMGFetcherQueue, matcher: Matcher<any>) {
    this.queue = queue;
    this.matcher = matcher;
    const debouncer = new Debouncer();
    // triggered then ifq finished
    EBUS.subscribe("ifq-on-finished-report", (index) => debouncer.addEvent("APPEND-NEXT-PAGES", () => this.appendPages(index), 5));
    // triggered when scrolling
    EBUS.subscribe("pf-try-extend", () => debouncer.addEvent("APPEND-NEXT-PAGES", () => !this.queue.downloading?.() && this.appendNextPage(), 5));
    EBUS.subscribe("pf-init", (cb) => this.init().then(cb));
  }

  appendToView(total: number, nodes: VisualNode[], chapterIndex: number, done?: boolean) {
    EBUS.emit("pf-on-appended", total, nodes, chapterIndex, done);
  }

  abort() {
    this.abortb = true;
  }

  async init() {
    this.chapters = await this.matcher.fetchChapters().catch(reason => EBUS.emit("notify-message", "error", reason) || []);
    this.chapters.forEach(c => {
      c.sourceIter = this.matcher.fetchPagesSource(c);
      c.onclick = (index) => {
        EBUS.emit("pf-change-chapter", index, c);
        if (this.chapters[index].queue) {
          this.appendToView(this.chapters[index].queue.length, this.chapters[index].queue, index, this.chapters[index].done);
        }
        if (!this.queue.downloading?.()) {
          this.beforeInit?.();
          this.changeChapter(index).then(this.afterInit).catch(this.onFailed);
        }
      };
    });
    EBUS.emit("pf-update-chapters", this.chapters);
    if (this.chapters.length === 1) {
      this.beforeInit?.();
      EBUS.emit("pf-change-chapter", 0, this.chapters[0]);
      await this.changeChapter(0).then(this.afterInit).catch(this.onFailed);
    }
  }

  /// start the chapter by index
  async changeChapter(index: number) {
    this.chapterIndex = index;
    const chapter = this.chapters[this.chapterIndex];
    this.queue.restore(index, chapter.queue);

    if (!chapter.sourceIter) {
      evLog("error", "chapter sourceIter is not set!");
      return;
    }
    const first = await chapter.sourceIter.next();
    if (!first.done) {
      await this.appendImages(first.value);
    }
    this.appendPages(this.queue.length);
  }

  // append next page until the queue length is 60 more than finished
  private async appendPages(appendedCount: number) {
    while (true) {
      if (appendedCount + 60 < this.queue.length) break;
      if (!await this.appendNextPage()) break;
    }
  }

  async appendNextPage(): Promise<boolean> {
    if (this.appendPageLock) return false;
    try {
      this.appendPageLock = true;
      const chapter = this.chapters[this.chapterIndex];
      if (chapter.done || this.abortb) return false;
      const next = await chapter.sourceIter!.next();
      if (next.done) {
        chapter.done = true;
        this.appendToView(this.queue.length, [], this.chapterIndex, true);
        return false;
      } else {
        return await this.appendImages(next.value);
      }
    } catch (error) {
      evLog("error", "PageFetcher:appendNextPage error: ", error);
      this.onFailed?.(error);
      return false;
    } finally {
      this.appendPageLock = false;
    }
  }

  async appendImages(page: any): Promise<boolean> {
    try {
      const nodes = await this.obtainImageNodeList(page);
      if (this.abortb) return false;
      if (nodes.length === 0) return false;
      const len = this.queue.length;
      const IFs = nodes.map(
        (imgNode, index) => new IMGFetcher(index + len, imgNode, this.matcher, this.chapterIndex)
      );
      this.queue.push(...IFs);
      this.chapters[this.chapterIndex].queue.push(...IFs);
      this.appendToView(this.queue.length, IFs, this.chapterIndex);
      return true;
    } catch (error) {
      evLog("error", `page fetcher append images error: `, error);
      this.onFailed?.(error)
      return false;
    }
  }

  //从文档的字符串中创建缩略图元素列表
  async obtainImageNodeList(page: any): Promise<ImageNode[]> {
    let tryTimes = 0;
    let err: any;
    while (tryTimes < 3) {
      try {
        return await this.matcher.parseImgNodes(page, this.chapters[this.chapterIndex].id);
      } catch (error) {
        evLog("error", "warn: parse image nodes failed, retrying: ", error)
        tryTimes++;
        err = error;
      }
    }
    evLog("error", "warn: parse image nodes failed: reached max try times!");
    throw err;
  }

  //通过地址请求该页的文档
  async fetchDocument(pageURL: string): Promise<string> {
    return await window.fetch(pageURL).then((response) => response.text());
  }

  onFailed(reason: any) {
    EBUS.emit("notify-message", "error", reason.toString());
  }

}

