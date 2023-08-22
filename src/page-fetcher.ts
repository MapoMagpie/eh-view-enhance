import { conf } from "./config";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { IMGFetcher } from "./img-fetcher";
import { HTML, Oriented } from "./main";
import { regulars } from "./regulars";
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
  constructor(queue: IMGFetcherQueue, idleLoader: IdleLoader) {
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
  }

  async init() {
    this.initPageURLs();
    await this.initPageAppend();
    this.loadAllPageImg();
    this.renderCurrView(
      HTML.fullViewPlane.scrollTop,
      HTML.fullViewPlane.clientHeight
    );
  }

  initPageURLs() {
    const pager = document.querySelector(".gtb");
    if (!pager) {
      throw new Error("未获取到分页元素！");
    }
    const tds = Array.from(pager.querySelectorAll("td"));
    if (!tds || tds.length == 0) {
      throw new Error("未获取到有效的分页元素！");
    }
    const ptds = tds.filter((p) => p.className.indexOf("ptds") != -1);
    if (!ptds || ptds.length == 0) {
      throw new Error("未获取到有效的分页元素！");
    }
    // find current page number, if not found, set to 0
    const currPageNum = PageFetcher.findPageNum(
      ptds[0].firstElementChild?.getAttribute("href") || undefined
    );

    const firstPageUrl =
      tds[1].firstElementChild?.getAttribute("href") || undefined;
    if (!firstPageUrl) {
      throw new Error("未获取到有效的分页地址！");
    }
    this.pageURLs.push(firstPageUrl);
    const lastPage = PageFetcher.findPageNum(
      tds[tds.length - 2].firstElementChild?.getAttribute("href") || undefined
    );
    for (let i = 1; i <= lastPage; i++) {
      this.pageURLs.push(`${firstPageUrl}?p=${i}`);
      if (i == currPageNum) {
        this.currPage = i;
      }
    }
    evLog("所有页码地址加载完毕:", this.pageURLs);
  }

  async initPageAppend() {
    for (let i = 0; i < this.pageURLs.length; i++) {
      const pageURL = this.pageURLs[i];
      if (i == this.currPage) {
        await this.appendDefaultPage(pageURL);
      } else {
        const oriented = i < this.currPage ? "prev" : "next";
        this.imgAppends[oriented].push(
          async () => await this.appendPageImg(pageURL, oriented)
        );
      }
    }
  }

  async loadAllPageImg() {
    if (this.fetched) return;
    for (let i = 0; i < this.imgAppends["next"].length; i++) {
      const executor = this.imgAppends["next"][i];
      await executor();
    }
    for (let i = this.imgAppends["prev"].length - 1; i > -1; i--) {
      const executor = this.imgAppends["prev"][i];
      await executor();
    }
  }

  static findPageNum(pageURL?: string): number {
    if (pageURL) {
      const arr = pageURL.split("?");
      if (arr && arr.length > 1) {
        let matchs = /p=(\d*)/.exec(arr[1]);
        if (matchs && matchs.length > 1) {
          return parseInt(matchs.pop()!);
        }
      }
    }
    return 0;
  }

  async appendDefaultPage(pageURL: string) {
    const doc = await this.fetchDocument(pageURL);
    const imgNodeList = await this.obtainImageNodeList(doc);
    const IFs = imgNodeList.map(
      (imgNode) => new IMGFetcher(imgNode as HTMLElement)
    );
    HTML.fullViewPlane.firstElementChild!.nextElementSibling!.after(
      ...imgNodeList
    );
    this.queue.push(...IFs);
    updatePageHelper("updateTotal", this.queue.length.toString());
  }

  async appendPageImg(pageURL: string, oriented: Oriented): Promise<boolean> {
    try {
      const doc = await this.fetchDocument(pageURL);
      const imgNodeList = await this.obtainImageNodeList(doc);
      const IFs = imgNodeList.map(
        (imgNode) => new IMGFetcher(imgNode as HTMLElement)
      );
      switch (oriented) {
        case "prev":
          HTML.fullViewPlane.firstElementChild!.nextElementSibling!.after(
            ...imgNodeList
          );
          this.queue.unshift(...IFs);
          this.idleLoader.processingIndexList[0] += IFs.length;
          const { root } = this.queue[this.idleLoader.processingIndexList[0]];
          HTML.fullViewPlane.scrollTo(0, root.offsetTop);
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
  async obtainImageNodeList(docString: string): Promise<Element[]> {
    const list: Element[] = [];
    if (!docString) return list;
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(docString, "text/html");
    const aNodes = doc.querySelectorAll("#gdt a");
    if (!aNodes || aNodes.length == 0) {
      evLog("wried to get a nodes from document, but failed!");
      return list;
    }
    const aNode = aNodes[0];

    // make node template
    const imgNodeTemplate = document.createElement("div");
    imgNodeTemplate.classList.add("img-node");
    const imgTemplate = document.createElement("img");
    imgTemplate.setAttribute("decoding", "async");
    imgTemplate.style.height = "auto";
    imgTemplate.setAttribute(
      "src",
      "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
    );
    imgNodeTemplate.appendChild(imgTemplate);

    // MPV
    const href = aNode.getAttribute("href")!;
    if (regulars.isMPV.test(href)) {
      const mpvDoc = await this.fetchDocument(href);
      const matchs = mpvDoc.matchAll(regulars.mpvImageList);
      const gid = location.pathname.split("/")[2];
      let i = 0;
      for (const match of matchs) {
        i++;
        const newImgNode = imgNodeTemplate.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("title", match[1]);
        newImg.setAttribute(
          "ahref",
          `${location.origin}/s/${match[2]}/${gid}-${i}`
        );
        newImg.setAttribute("asrc", match[3].replaceAll("\\", ""));
        newImg.addEventListener("click", events.showBigImageEvent);
        list.push(newImgNode);
      }
      this.fetched = true;
    }
    // normal
    else {
      for (const aNode of Array.from(aNodes)) {
        const imgNode = aNode.querySelector("img");
        if (!imgNode) {
          throw new Error("Cannot find Image");
        }
        const newImgNode = imgNodeTemplate.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("ahref", aNode.getAttribute("href")!);
        newImg.setAttribute("asrc", imgNode.src);
        newImg.setAttribute("title", imgNode.getAttribute("title") || "");
        newImg.addEventListener("click", events.showBigImageEvent);
        list.push(newImgNode);
      }
    }
    return list;
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
