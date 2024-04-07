import EBUS from "./event-bus";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IMGFetcher } from "./img-fetcher";
import ImageNode, { ChapterNode, VisualNode } from "./img-node";
import { Matcher } from "./platform/platform";
import { Debouncer } from "./utils/debouncer";
import { evLog } from "./utils/ev-log";
import q from "./utils/query-element";

export type PagesSource = string | Document;

export type Chapter = {
  id: number;
  title: string | string[];
  source: string; // url
  queue: IMGFetcher[];
  thumbimg?: string;
  sourceIter?: AsyncGenerator<PagesSource>;
  done?: boolean;
  onclick?: (index: number) => void;
}

export class PageFetcher {
  chapters: Chapter[] = [];
  chapterIndex: number = 0;
  queue: IMGFetcherQueue;
  matcher: Matcher;
  done: boolean = false;
  beforeInit?: () => void;
  afterInit?: () => void;
  private appendPageLock: boolean = false;
  private abortb: boolean = false;
  private chaptersSelectionElement: HTMLElement;

  constructor(queue: IMGFetcherQueue, matcher: Matcher) {
    this.queue = queue;
    this.matcher = matcher;
    this.chaptersSelectionElement = q("#backChaptersSelection");
    this.chaptersSelectionElement.addEventListener("click", () => this.backChaptersSelection());
    const debouncer = new Debouncer();
    EBUS.subscribe("ifq-on-finished-report", (index) => debouncer.addEvent("APPEND-NEXT-PAGES", () => this.appendPages(index, !this.queue.downloading?.()), 5));
    EBUS.subscribe("pf-try-extend", () => debouncer.addEvent("APPEND-NEXT-PAGES", () => !this.queue.downloading?.() && this.appendNextPage(true), 5));
  }

  appendToView(total: number, nodes: VisualNode[], done?: boolean) {
    EBUS.emit("pf-on-appended", total, nodes, done);
  }

  abort() {
    this.abortb = true;
  }

  async init() {
    this.chapters = await this.matcher.fetchChapters();
    this.chapters.forEach(c => {
      c.sourceIter = this.matcher.fetchPagesSource(c);
      c.onclick = (index) => {
        EBUS.emit("pf-change-chapter", index);
        if (this.chapters[index].queue) {
          this.appendToView(this.chapters[index].queue!.length, this.chapters[index].queue!, false);
          if (this.chapters.length > 1) {
            this.chaptersSelectionElement.hidden = false;
          }
        }
        if (!this.queue.downloading?.()) {
          this.beforeInit?.();
          this.changeChapter(index, true).finally(() => this.afterInit?.());
        }
      };
    });

    if (this.chapters.length === 1) {
      this.beforeInit?.();
      this.changeChapter(0, true).finally(() => this.afterInit?.());
    }
    if (this.chapters.length > 1) {
      this.appendToView(this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)), true);
    }
  }

  backChaptersSelection() {
    EBUS.emit("pf-change-chapter", -1);
    this.appendToView(this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)), true);
    this.chaptersSelectionElement.hidden = true;
  }

  /// start the chapter by index
  async changeChapter(index: number, appendToView: boolean) {
    this.chapterIndex = index;
    const chapter = this.chapters[this.chapterIndex];
    this.queue.restore(index, chapter.queue);

    if (!chapter.sourceIter) {
      evLog("error", "chapter sourceIter is not set!");
      return;
    }
    let first = await chapter.sourceIter.next();
    if (!first.done) {
      await this.appendImages(first.value, appendToView);
    }
    this.appendPages(this.queue.length - 1, appendToView);
  }

  // append next page until the queue length is 60 more than finished
  private async appendPages(appendedCount: number, appendToView: boolean) {
    while (true) {
      if (appendedCount + 60 < this.queue.length) break;
      if (!await this.appendNextPage(appendToView)) break;
    }
  }

  async appendNextPage(appendToView: boolean): Promise<boolean> {
    if (this.appendPageLock) return false;
    try {
      this.appendPageLock = true;
      if (this.done || this.abortb) return false;
      const chapter = this.chapters[this.chapterIndex];
      const next = await chapter.sourceIter!.next();
      if (next.done) {
        chapter.done = true;
        // this chapter is done
        this.appendToView(this.queue.length, [], true);
        return false;
      } else {
        await this.appendImages(next.value, appendToView);
        return true;
      }
    } finally {
      this.appendPageLock = false;
    }
  }

  async appendImages(page: PagesSource, appendToView: boolean): Promise<boolean> {
    try {
      const nodes = await this.obtainImageNodeList(page);
      if (this.abortb) return false;
      const IFs = nodes.map(
        (imgNode) => new IMGFetcher(imgNode, this.matcher, this.chapterIndex)
      );
      this.queue.push(...IFs);
      this.chapters[this.chapterIndex].queue.push(...IFs);
      if (appendToView) {
        this.appendToView(this.queue.length, IFs);
      }
      return true;
    } catch (error) {
      evLog("error", `page fetcher append images error: `, error);
      return false;
    }
  }

  //从文档的字符串中创建缩略图元素列表
  async obtainImageNodeList(page: PagesSource): Promise<ImageNode[]> {
    let tryTimes = 0;
    while (tryTimes < 3) {
      try {
        return await this.matcher.parseImgNodes(page, this.chapters[this.chapterIndex].id);
      } catch (error) {
        evLog("error", "warn: parse image nodes failed, retrying: ", error)
        tryTimes++;
      }
    }
    evLog("error", "warn: parse image nodes failed: reached max try times!");
    return [];
  }

  //通过地址请求该页的文档
  async fetchDocument(pageURL: string): Promise<string> {
    return await window.fetch(pageURL).then((response) => response.text());
  }

}

