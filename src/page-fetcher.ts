import { conf } from "./config";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { IMGFetcher } from "./img-fetcher";
import { HTML, Oriented } from "./main";
import { Matcher, PagesSource } from "./platform/platform";
import { events } from "./ui/event";
import { updatePageHelper } from "./ui/page-helper";
import { evLog } from "./utils/ev-log";

type AsyncAppendFunc = () => Promise<boolean>;

export class PageFetcher {
  queue: IMGFetcherQueue;
  pageURLs: string[];
  currPage: number;
  idleLoader: IdleLoader;
  fetched: boolean;
  imgAppends: Record<"prev" | "next", AsyncAppendFunc[]>;
  matcher: Matcher;
  done: boolean = false;
  constructor(queue: IMGFetcherQueue, idleLoader: IdleLoader, matcher: Matcher) {
    this.queue = queue;
    this.idleLoader = idleLoader;
    //所有页的地址
    this.pageURLs = [];
    //当前页所在的索引
    this.currPage = 0;
    //每页的图片获取器列表，用于实现懒加载
    this.imgAppends = { prev: [], next: [] };
    //平均高度，用于渲染未加载的缩略图,单位px
    this.fetched = false;
    this.matcher = matcher;
  }

  async init() {
    await this.initPageAppend();
  }

  async initPageAppend() {
    let fetchIter = this.matcher.fetchPagesSource();
    let first = await fetchIter.next();
    if (!first.done) {
      await this.appendPageImg(first.value, "next");
      setTimeout(() => this.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight), 200)
    }
    this.loadAllPageImg(fetchIter);
  }

  async loadAllPageImg(iter: AsyncGenerator<PagesSource>) {
    for await (const page of iter) {
      // console.log("page source: ", page)
      await this.appendPageImg(page, "next");
      this.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
    }
    this.done = true;
  }

  async appendPageImg(page: PagesSource, oriented: Oriented): Promise<boolean> {
    try {
      const imgNodeList = await this.obtainImageNodeList(page);
      const IFs = imgNodeList.map(
        (imgNode) => new IMGFetcher(imgNode as HTMLElement, this.matcher)
      );
      switch (oriented) {
        case "prev":
          HTML.fullViewPlane.firstElementChild!.nextElementSibling!.after(
            ...imgNodeList
          );
          const len = this.queue.length;
          this.queue.unshift(...IFs);
          if (len > 0) {
            this.idleLoader.processingIndexList[0] += IFs.length;
            const { root } = this.queue[this.idleLoader.processingIndexList[0]];
            HTML.fullViewPlane.scrollTo(0, root.offsetTop);
          }
          break;
        case "next":
          HTML.fullViewPlane.lastElementChild!.after(...imgNodeList);
          this.queue.push(...IFs);
          break;
      }
      updatePageHelper("updateTotal", this.queue.length.toString());
      return true;
    } catch (error) {
      evLog(`从下一页或上一页中提取图片元素时出现了错误！`, error);
      return false;
    }
  }

  //从文档的字符串中创建缩略图元素列表
  async obtainImageNodeList(page: PagesSource): Promise<Element[]> {
    // make node template
    const imgNodeTemplate = document.createElement("div");
    imgNodeTemplate.classList.add("img-node");
    const imgTemplate = document.createElement("img");
    imgTemplate.setAttribute("decoding", "async");
    imgTemplate.setAttribute("title", "untitle.jpg");
    imgTemplate.style.height = "auto";
    imgTemplate.setAttribute(
      "src",
      "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
    );
    imgNodeTemplate.appendChild(imgTemplate);

    let tryTimes = 0;
    while (tryTimes < 3) {
      try {
        const list = await this.matcher.parseImgNodes(page, imgNodeTemplate);
        list.forEach((imgNode) => {
          imgNode.addEventListener("click", events.showBigImageEvent);
        })
        return list;
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
   *当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
   * @param {当前滚动位置} currTop
   * @param {窗口高度} clientHeight
   */
  renderCurrView(currTop: number, clientHeight: number) {
    const [startRander, endRander] = this.findOutsideRoundView(currTop, clientHeight);
    evLog(`要渲染的范围是:${startRander + 1}-${endRander + 1}`);
    this.queue.slice(startRander, endRander + 1).forEach((imgFetcher) => imgFetcher.render());
  }

  findOutsideRoundViewNode(currTop: number, clientHeight: number): [HTMLElement, HTMLElement] {
    const [outsideTop, outsideBottom] = this.findOutsideRoundView(currTop, clientHeight);
    return [this.queue[outsideTop].root, this.queue[outsideBottom].root];
  }

  findOutsideRoundView(currTop: number, clientHeight: number): [number, number] {
    const viewButtom = currTop + clientHeight;
    let outsideTop: number = 0;
    let outsideBottom: number = 0;
    for (let i = 0; i < this.queue.length; i += conf.colCount) {
      const { root } = this.queue[i];
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
