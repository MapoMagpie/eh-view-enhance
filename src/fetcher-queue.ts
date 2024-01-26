import { Debouncer } from "./utils/debouncer";
import { FetchState, IMGFetcher } from "./img-fetcher";
import { Oriented, conf } from "./config";

/// return boolean, true means stop, false means continue
type Callback = (index: number, queue: IMGFetcherQueue) => boolean;

export class IMGFetcherQueue extends Array<IMGFetcher> {
  executableQueue: number[];
  currIndex: number;
  finishedIndex: Set<number> = new Set();
  private debouncer: Debouncer;
  private onDo: Map<number, Callback> = new Map();
  private onFinishedReport: Map<number, Callback> = new Map();
  dataSize: number = 0;
  constructor() {
    super();
    //可执行队列
    this.executableQueue = [];
    //当前的显示的大图的图片请求器所在的索引
    this.currIndex = 0;
    //已经完成加载的
    this.debouncer = new Debouncer();
  }

  subscribeOnDo(index: number, callback: Callback) {
    this.onDo.set(index, callback);
  }

  subscribeOnFinishedReport(index: number, callback: Callback) {
    this.onFinishedReport.set(index, callback);
  }

  isFinised() {
    return this.finishedIndex.size === this.length;
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
    this[this.currIndex].setNow(this.currIndex);

    // keys will be empty in yande site
    let keys = [...this.onDo.keys()].sort();
    for (const key of keys) {
      if (this.onDo.get(key)?.(this.currIndex, this)) {
        return;
      }
    }

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
    this.finishedIndex.add(index);
    if (this.dataSize < 1000000000) { // 1GB
      this.dataSize += imgFetcher.data?.byteLength || 0;
    }

    let keys = [...this.onFinishedReport.keys()].sort();
    for (const key of keys) {
      if (this.onFinishedReport.get(key)?.(index, this)) {
        return;
      }
    }
  }

  stepImageEvent(oriented: Oriented) {
    let start = oriented === "next" ? this.currIndex + 1 : this.currIndex - 1;
    this.do(start, oriented);
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

  findImgIndex(ele: HTMLElement): number {
    for (let index = 0; index < this.length; index++) {
      if (this[index].node.equal(ele)) {
        return index;
      }
    }
    return 0;
  }

}
