import { Debouncer } from "./utils/debouncer";
import { FetchState, IMGFetcher } from "./img-fetcher";
import { HTML, DL, IL, Oriented } from "./main";
import { evLog } from "./utils/ev-log";
import { conf } from "./config";
import { updatePageHelper } from "./ui/page-helper";

export class IMGFetcherQueue extends Array<IMGFetcher> {
  executableQueue: number[];
  currIndex: number;
  finishedIndex: number[];
  debouncer: Debouncer;
  constructor() {
    super();
    //可执行队列
    this.executableQueue = [];
    //当前的显示的大图的图片请求器所在的索引
    this.currIndex = 0;
    //已经完成加载的
    this.finishedIndex = [];
    this.debouncer = new Debouncer();
  }

  isFinised() {
    return this.finishedIndex.length === this.length;
  }

  push(...items: IMGFetcher[]): number {
    items.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
    return super.push(...items);
  }

  unshift(...items: IMGFetcher[]): number {
    items.forEach((imgFetcher) => imgFetcher.onFinished("QUEUE-REPORT", (index) => this.finishedReport(index)));
    return super.unshift(...items);
  }

  do(start: number, oriented?: Oriented) {
    oriented = oriented || "next";
    //边界约束
    this.currIndex = this.fixIndex(start);
    if (DL.downloading) {
      //立即加载和展示当前的元素
      this[this.currIndex].setNow(this.currIndex);
      return;
    }
    //立即中止空闲加载器
    IL.abort(this.currIndex);
    //立即加载和展示当前的元素
    this[this.currIndex].setNow(this.currIndex);

    //从当前索引开始往后,放入指定数量的图片获取器,如果该图片获取器已经获取完成则向后延伸.
    //如果最后放入的数量为0,说明已经没有可以继续执行的图片获取器,可能意味着后面所有的图片都已经加载完毕,也可能意味着中间出现了什么错误
    if (!this.pushInExecutableQueue(oriented)) return;

    /* 300毫秒的延迟，在这300毫秒的时间里，可执行队列executableQueue可能随时都会变更，100毫秒过后，只执行最新的可执行队列executableQueue中的图片请求器
            在对大图元素使用滚轮事件的时候，由于速度非常快，大量的IMGFetcher图片请求器被添加到executableQueue队列中，如果调用这些图片请求器请求大图，可能会被认为是爬虫脚本
            因此会有一个时间上的延迟，在这段时间里，executableQueue中的IMGFetcher图片请求器会不断更替，300毫秒结束后，只调用最新的executableQueue中的IMGFetcher图片请求器。
        */
    this.debouncer.addEvent("IFQ-EXECUTABLE", () => {
      this.executableQueue.forEach((imgFetcherIndex) => this[imgFetcherIndex].start(imgFetcherIndex));
    }, 300);
  }

  //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
  finishedReport(index: number) {
    const imgFetcher = this[index];
    if (imgFetcher.stage !== FetchState.DONE) return;
    if (DL) {
      if (this.finishedIndex.indexOf(index) < 0) {
        DL.addToDownloadZip(imgFetcher);
      }
    }
    this.pushFinishedIndex(index);
    if (DL && DL.downloading && this.isFinised()) {
      DL.download();
    }
    updatePageHelper("updateFinished", this.finishedIndex.length.toString());
    evLog(`第${index + 1}张完成，大图所在第${this.currIndex + 1}张`);
    if (index !== this.currIndex) return;
    updatePageHelper("fetched");
    this.scrollTo(index);
  }

  scrollTo(index: number) {
    const imgFetcher = this[index];
    let scrollTo = imgFetcher.root.offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= HTML.fullViewPlane.scrollHeight ? HTML.fullViewPlane.scrollHeight : scrollTo;
    HTML.fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" });
  }

  //如果开始的索引小于0,则修正索引为0,如果开始的索引超过队列的长度,则修正索引为队列的最后一位
  fixIndex(start: number) {
    return start < 0 ? 0 : start > this.length - 1 ? this.length - 1 : start;
  }

  /**
   * 将方向前|后 的未加载大图数据的图片获取器放入待加载队列中
   * 从当前索引开始，向后或向前进行遍历，
   * 会跳过已经加载完毕的图片获取器，
   * 会添加正在获取大图数据或未获取大图数据的图片获取器到待加载队列中
   * @param oriented 方向 前后 
   * @returns 是否添加成功
   */
  pushInExecutableQueue(oriented: Oriented) {
    //把要执行获取器先放置到队列中，延迟执行
    this.executableQueue = [];
    for (let count = 0, index = this.currIndex; this.pushExecQueueSlave(index, oriented, count); oriented === "next" ? ++index : --index) {
      if (this[index].stage === FetchState.DONE) continue;
      this.executableQueue.push(index);
      count++;
    }
    return this.executableQueue.length > 0;
  }

  // 如果索引已到达边界且添加数量在配置最大同时获取数量的范围内
  pushExecQueueSlave(index: number, oriented: Oriented, count: number) {
    return ((oriented === "next" && index < this.length) || (oriented === "prev" && index > -1)) && count < conf.threads;
  }

  findImgIndex(imgElement: HTMLElement): number {
    for (let index = 0; index < this.length; index++) {
      if (this[index] instanceof IMGFetcher && this[index].imgElement === imgElement) {
        return index;
      }
    }
    return 0;
  }

  pushFinishedIndex(index: number) {
    // const fd = this.finishedIndex;
    if (this.finishedIndex.length === 0) {
      this.finishedIndex.push(index);
      return;
    }
    for (let i = 0; i < this.finishedIndex.length; i++) {
      if (index === this.finishedIndex[i]) return;
      if (index < this.finishedIndex[i]) {
        this.finishedIndex.splice(i, 0, index);
        return;
      }
    }
    this.finishedIndex.push(index);
  }
}
