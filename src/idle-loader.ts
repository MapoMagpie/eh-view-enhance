import { conf } from "./config";
import { IMGFetcherQueue } from "./fetcher-queue";
import { FetchState } from "./img-fetcher";
import { evLog } from "./utils/ev-log";

export class IdleLoader {
  queue: IMGFetcherQueue;
  processingIndexList: number[];
  lockVer: number;
  restartId?: number;
  maxWaitMS: number;
  minWaitMS: number;
  onFailedCallback?: () => void;
  constructor(queue: IMGFetcherQueue) {
    //图片获取器队列
    this.queue = queue;
    //当前处理的索引列表
    this.processingIndexList = [0];
    this.lockVer = 0;
    //中止后的用于重新启动的延迟器的id
    this.restartId;
    this.maxWaitMS = 1000;
    this.minWaitMS = 300;
  }

  onFailed(cb: () => void) {
    this.onFailedCallback = cb;
  }

  start(lockVer: number) {
    // 如果被中止了，则停止
    if (this.lockVer != lockVer || !conf.autoLoad) return;
    // 如果已经没有要处理的列表
    if (this.processingIndexList.length === 0) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }
    evLog("空闲自加载启动:" + this.processingIndexList.toString());
    for (const processingIndex of this.processingIndexList) {
      const imgFetcher = this.queue[processingIndex];
      imgFetcher.onFinished("IDLE-REPORT", () => {
        this.wait().then(() => {
          this.checkProcessingIndex();
          this.start(lockVer);
        });
      });
      imgFetcher.onFailed("IDLE-REPORT", () => {
        this.wait().then(() => {
          this.checkProcessingIndex();
          this.start(lockVer);
        });
      });
      imgFetcher.start(processingIndex);
    }
  }

  checkProcessingIndex() {
    // Skip found Fetcher
    let foundFetcherIndex = new Set<Number>();
    for (let i = 0; i < this.processingIndexList.length; i++) {
      let processingIndex = this.processingIndexList[i];
      const imf = this.queue[processingIndex];
      // img fetcher still fetching, or not yet fetching, continue.
      if (imf.lock || imf.stage === FetchState.URL) {
        continue;
      }
      // find unfinished imgFetcher
      let found = false;
      let hasFailed = imf.stage === FetchState.FAILED;
      for (
        let j = Math.min(processingIndex + 1, this.queue.length - 1), limit = this.queue.length;
        (j < limit);
        j++
      ) {
        const imf = this.queue[j];
        // find img fetcher that hasn't been fetching
        if (!imf.lock && imf.stage === FetchState.URL && !foundFetcherIndex.has(j)) {
          foundFetcherIndex.add(j);
          this.processingIndexList[i] = j;
          found = true;
          break;
        }
        if (imf.stage === FetchState.FAILED) {
          hasFailed = true;
        }
        // begin from the frist, stop at the processingIndex
        if (j >= this.queue.length - 1) {
          limit = processingIndex;
          j = 0;
        }
      }
      if (!found) {
        this.processingIndexList = [];
        if (hasFailed && this.onFailedCallback) {
          this.onFailedCallback();
          this.onFailedCallback = undefined;
        }
        return;
      }
    }
  }

  async wait(): Promise<boolean> {
    const { maxWaitMS, minWaitMS } = this;
    return new Promise(function(resolve) {
      const time = Math.floor(Math.random() * maxWaitMS + minWaitMS);
      window.setTimeout(() => resolve(true), time);
    });
  }

  abort(newIndex: number) {
    this.lockVer++;
    evLog(`终止空闲自加载, 下次将从第${this.processingIndexList[0] + 1}张开始加载`);
    if (!conf.autoLoad) return;
    // 中止空闲加载后，会在等待一段时间后再次重启空闲加载
    window.clearTimeout(this.restartId);
    this.restartId = window.setTimeout(() => {
      this.processingIndexList = [newIndex];
      this.checkProcessingIndex();
      this.start(this.lockVer);
    }, conf.restartIdleLoader);
  }
}

