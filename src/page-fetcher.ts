import { conf } from "./config";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IMGFetcher, IMGFetcherSettings } from "./img-fetcher";
import ImageNode from "./img-node";
import { Matcher, PagesSource } from "./platform/platform";
import { evLog } from "./utils/ev-log";

type AsyncAppendFunc = () => Promise<boolean>;

export class PageFetcher {
  queue: IMGFetcherQueue;
  fullViewPlane: HTMLElement;
  pageURLs: string[];
  currPage: number;
  fetched: boolean;
  imgAppends: Record<"prev" | "next", AsyncAppendFunc[]>;
  matcher: Matcher;
  done: boolean = false;
  onAppended?: (total: number, done?: boolean) => void;
  imgFetcherSettings: IMGFetcherSettings;
  renderRangeRecord: [number, number] = [0, 0];
  beforeInit?: () => void;
  afterInit?: () => void;
  private pageSourceIter?: AsyncGenerator<PagesSource>;
  private appendPageLock: boolean = false;
  private abortb: boolean = false;
  constructor(fullViewPlane: HTMLElement, queue: IMGFetcherQueue, matcher: Matcher, imgFetcherSettings: IMGFetcherSettings) {
    this.fullViewPlane = fullViewPlane;
    this.queue = queue;
    this.matcher = matcher;
    this.imgFetcherSettings = imgFetcherSettings;
    //所有页的地址
    this.pageURLs = [];
    //当前页所在的索引
    this.currPage = 0;
    //每页的图片获取器列表，用于实现懒加载
    this.imgAppends = { prev: [], next: [] };
    //平均高度，用于渲染未加载的缩略图,单位px
    this.fetched = false;
  }

  abort() {
    this.abortb = true;
  }

  async init() {
    this.beforeInit?.();
    await this.initPageAppend();
    this.afterInit?.();
  }

  async initPageAppend() {
    this.pageSourceIter = this.matcher.fetchPagesSource();
    let first = await this.pageSourceIter.next();
    if (!first.done) {
      await this.appendPageImg(first.value);
    }
    // check iterator is done
    this.appendNextPages(this.queue.length - 1);
  }

  async appendNextPages(finished?: number) {
    if (this.appendPageLock) return;
    try {
      this.appendPageLock = true;
      if (this.done || this.abortb) return;
      while (true) {
        const viewButtom = this.fullViewPlane.scrollTop + this.fullViewPlane.clientHeight;
        // if finished is not undefined, then append next page until the queue length is 40 more than finished
        if (finished !== undefined) {
          if (finished + 40 < this.queue.length) {
            break;
          }
        }
        // here is triggered by fullViewPlane onscroll
        else {
          // find the last image node if overflow (screen height * 2.5), then append next page
          const lastImgNode = this.queue[this.queue.length - 1].node.root!;
          if (viewButtom + (this.fullViewPlane.clientHeight * 1.5) < lastImgNode.offsetTop + lastImgNode.offsetHeight) {
            break;
          }
        }
        const next = await this.pageSourceIter!.next();
        if (next.done) {
          this.done = true;
          this.onAppended?.(this.queue.length, true);
          break;
        } else {
          await this.appendPageImg(next.value);
        }
      }
    } finally {
      this.appendPageLock = false;
    }
  }

  setOnAppended(onAppended: (total: number, done?: boolean) => void) {
    this.onAppended = onAppended;
  }

  async appendPageImg(page: PagesSource): Promise<boolean> {
    try {
      const nodes = await this.obtainImageNodeList(page);
      if (this.abortb) return false;
      const IFs = nodes.map(
        (imgNode) => new IMGFetcher(imgNode, this.imgFetcherSettings)
      );
      this.fullViewPlane.lastElementChild!.after(...nodes.map(node => node.create()));
      this.queue.push(...IFs);
      this.onAppended?.(this.queue.length);
      return true;
    } catch (error) {
      evLog(`page fetcher append images error: `, error);
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
        evLog("warn: parse image nodes failed, retrying: ", error)
        tryTimes++;
      }
    }
    evLog("warn: parse image nodes failed: reached max try times!");
    return [];
  }

  //通过地址请求该页的文档
  async fetchDocument(pageURL: string): Promise<string> {
    return await window.fetch(pageURL).then((response) => response.text());
  }

  /**
   *  当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
   */
  renderCurrView() {
    const [scrollTop, clientHeight] = [this.fullViewPlane.scrollTop, this.fullViewPlane.clientHeight];
    const [startRander, endRander] = this.findOutsideRoundView(scrollTop, clientHeight);
    this.queue.slice(startRander, endRander + 1).forEach((imgFetcher) => imgFetcher.render());
    if (this.queue.dataSize >= 1000000000) {
      const unrenders = findNotInNewRange(this.renderRangeRecord, [startRander, endRander]);
      unrenders.forEach(([start, end]) => this.queue.slice(start, end + 1).forEach((imgFetcher) => imgFetcher.unrender()));
      evLog(`要渲染的范围是:${startRander + 1}-${endRander + 1}, 旧范围是:${this.renderRangeRecord[0] + 1}-${this.renderRangeRecord[1] + 1}, 取消渲染范围是:${unrenders.map(([start, end]) => `${start + 1}-${end + 1}`).join(",")}`);
    }
    this.renderRangeRecord = [startRander, endRander];
  }

  findOutsideRoundView(currTop: number, clientHeight: number): [number, number] {
    const viewButtom = currTop + clientHeight;
    let outsideTop: number = 0;
    let outsideBottom: number = 0;
    for (let i = 0; i < this.queue.length; i += conf.colCount) {
      const { root } = this.queue[i].node;
      if (!root) continue;
      // 查询最靠近当前视图上边的缩略图索引
      // 缩略图在父元素的位置 - 当前视图上边位置 = 缩略图与当前视图上边的距离，如果距离 >= 0，说明缩略图在当前视图内
      if (outsideBottom === 0) {
        if (root.offsetTop + 2 >= currTop) { // +2 for deviation
          outsideBottom = i + 1; // +1 for skip current condition
        } else {
          outsideTop = i;
        }
      } else {
        outsideBottom = i;
        if (root.offsetTop + root.offsetHeight > viewButtom) {
          break;
        }
      }
    }
    return [outsideTop, Math.min(outsideBottom + conf.colCount, this.queue.length - 1)];
  }
}

function findNotInNewRange(old: number[], neo: number[]): number[][] {
  const ret: number[][] = [];
  if (neo[0] > old[0]) {
    ret.push([old[0], neo[0] - 1]);
  }

  if (neo[1] < old[1]) {
    ret.push([neo[1] + 1, old[1]]);
  }

  if (ret.length === 2) {
    if (ret[1][0] < ret[0][1]) {
      ret[1][0] = ret[0][1];
      ret.shift();
    }
    if (ret[0][1] > ret[1][0]) {
      ret[0][1] = ret[1][0];
      ret.pop();
    }
  }
  return ret;
}
