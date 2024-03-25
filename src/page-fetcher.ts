import EBUS from "./event-bus";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IMGFetcher } from "./img-fetcher";
import ImageNode, { ChapterNode } from "./img-node";
import { Matcher } from "./platform/platform";
import { Debouncer } from "./utils/debouncer";
import { evLog } from "./utils/ev-log";
import q from "./utils/query-element";

export type PagesSource = string | Document;

export type Chapter = {
  id: string;
  title: string | string[];
  source: PagesSource;
  queue?: IMGFetcher[];
  thumbimg?: string;
  sourceIter?: AsyncGenerator<PagesSource>;
  done?: boolean;
  onclick?: (index: number) => void;
}

export class PageFetcher {
  chapters: Chapter[] = [];
  currChapterIndex: number = 0;
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
    EBUS.subscribe("ifq-on-finished-report", (index) => debouncer.addEvent("APPEND-NEXT-PAGES", () => this.appendA(index), 5));
    EBUS.subscribe("fvgm-want-extend", () => debouncer.addEvent("APPEND-NEXT-PAGES", () => this.appendNextPage(), 5));
  }

  onAppended(total: number, ifs: ImageNode[], done?: boolean) {
    EBUS.emit("pf-on-appended", total, ifs, done);
  }

  abort() {
    this.abortb = true;
  }

  async init() {
    this.chapters = await this.matcher.fetchChapters();
    this.chapters.forEach(c => {
      c.sourceIter = this.matcher.fetchPagesSource(c);
      c.onclick = (index) => {
        this.beforeInit?.();
        this.changeChapter(index).finally(() => this.afterInit?.());
      };
    });

    if (this.chapters.length === 1) {
      this.beforeInit?.();
      this.changeChapter(0).finally(() => this.afterInit?.());
    }
    if (this.chapters.length > 1) {
      EBUS.emit("pf-on-appended", this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)), true);
    }
  }

  backChaptersSelection() {
    if (this.chapters.length > 1) {
      this.queue.forEach(imf => imf.unrender());
      this.chapters[this.currChapterIndex].queue = [...this.queue];
      this.queue.clear();
      EBUS.emit("pf-change-chapter");
      EBUS.emit("pf-on-appended", this.chapters.length, this.chapters.map((c, i) => new ChapterNode(c, i)));
      this.chaptersSelectionElement.hidden = true;
    }
  }

  async changeChapter(index: number) {
    this.currChapterIndex = index;
    // set full view grid to empty
    EBUS.emit("pf-change-chapter");

    const chapter = this.chapters[this.currChapterIndex];
    // if chapter has nodes
    if (chapter.queue && chapter.queue.length > 0) {
      this.queue.restore(...chapter.queue);
      this.onAppended(this.queue.length, chapter.queue.map(imf => imf.node));
    }

    if (!chapter.sourceIter) {
      evLog("error", "chapter sourceIter is not set!");
      return;
    }
    let first = await chapter.sourceIter.next();
    if (!first.done) {
      await this.appendPageImg(first.value);
    }
    if (this.chapters.length > 1) {
      this.chaptersSelectionElement.hidden = false;
    }
    this.appendA(this.queue.length - 1);
  }

  // append next page until the queue length is 60 more than finished
  private async appendA(finished: number) {
    while (true) {
      if (finished + 60 < this.queue.length) break;
      if (!await this.appendNextPage()) break;
    }
  }

  async appendNextPage(): Promise<boolean> {
    if (this.appendPageLock) return false;
    try {
      this.appendPageLock = true;
      if (this.done || this.abortb) return false;
      const chapter = this.chapters[this.currChapterIndex];
      const next = await chapter.sourceIter!.next();
      if (next.done) {
        chapter.done = true;
        this.onAppended(this.queue.length, [], true);
        return false;
      } else {
        await this.appendPageImg(next.value);
        return true;
      }
    } finally {
      this.appendPageLock = false;
    }
  }

  async appendPageImg(page: PagesSource): Promise<boolean> {
    try {
      const nodes = await this.obtainImageNodeList(page);
      if (this.abortb) return false;
      const IFs = nodes.map(
        (imgNode) => new IMGFetcher(imgNode, this.matcher)
      );
      this.queue.push(...IFs);
      this.onAppended(this.queue.length, nodes);
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
        return await this.matcher.parseImgNodes(page);
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

