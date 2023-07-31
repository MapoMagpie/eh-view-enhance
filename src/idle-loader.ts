import { conf } from "./config";
import { IMGFetcherQueue } from "./fetcher-queue";
import { evLog } from "./utils/ev-log";

export class IdleLoader {
  queue: IMGFetcherQueue;
  processingIndexList: number[];
  lockVer: number;
  restartId?: number;
  maxWaitMS: number;
  minWaitMS: number;
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

  async start(lockVer: number) {
    evLog("空闲自加载启动:" + this.processingIndexList.toString());
    //如果被中止了，则停止
    if (this.lockVer != lockVer || !conf.autoLoad) return;
    // 如果已经没有要处理的列表
    if (this.processingIndexList.length === 0) {
      return;
    }
    for (let i = 0; i < this.processingIndexList.length; i++) {
      const processingIndex = this.processingIndexList[i];
      // 获取索引所对应的图片获取器，并添加完成事件，当图片获取完成时，重新查找新的可获取的图片获取器，并递归
      const imgFetcher = this.queue[processingIndex];
      // 当图片获取器还没有获取图片时，则启动图片获取器
      if (imgFetcher.lock || imgFetcher.stage === 3) {
        continue;
      }
      imgFetcher.onFinished("IDLE-REPORT", () => {
        this.wait().then(() => {
          this.checkProcessingIndex(i);
          this.start(lockVer);
        });
      });
      imgFetcher.start(processingIndex);
    }
  }

  /**
   * @param {当前处理列表中的位置} i
   */
  checkProcessingIndex(i: number) {
    const processedIndex = this.processingIndexList[i];
    let restart = false;
    // 从图片获取器队列中获取一个还未获取图片的获取器所对应的索引，如果不存在则从处理列表中删除该索引，缩减处理列表
    for (let j = processedIndex, max = this.queue.length - 1; j <= max; j++) {
      const imgFetcher = this.queue[j];
      // 如果图片获取器正在获取或者图片获取器已完成获取，
      if (imgFetcher.stage === 3 || imgFetcher.lock) {
        if (j === max && !restart) {
          j = -1;
          max = processedIndex - 1;
          restart = true;
        }
        continue;
      }
      this.processingIndexList[i] = j;
      return;
    }
    this.processingIndexList.splice(i, 1);
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
      this.checkProcessingIndex(0);
      this.start(this.lockVer);
    }, conf.restartIdleLoader);
  }
}

