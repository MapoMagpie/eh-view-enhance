import ImageNode from "./img-node";
import { Matcher, OriginMeta } from "./platform/platform";
import { evLog } from "./utils/ev-log";
import { xhrWapper } from "./utils/query";

export type DownloadState = {
  total: number;
  loaded: number;
  /**
   * Unsent = 0,
   * Opened = 1,
   * HeadersReceived = 2,
   * Loading = 3,
   * Done = 4
   */
  readyState: 0 | 1 | 2 | 3 | 4;
}

type ResultCallback = (index: number, imgFetcher: IMGFetcher) => void;

export enum FetchState {
  FAILED = 0,
  URL = 1,
  DATA = 2,
  DONE = 3,
}

export type IMGFetcherSettings = {
  matcher: Matcher;
  downloadStateReporter?: (state: DownloadState) => void;
  setNow?: (index: number) => void;
  onClick?: (event: MouseEvent) => void;
}

export class IMGFetcher {
  node: ImageNode;
  originURL?: string;
  stage: FetchState = FetchState.URL;
  tryTimes: number = 0;
  lock: boolean = false;
  /// 0: not rendered, 1: rendered tumbinal, 2: rendered big image
  rendered: 0 | 1 | 2 = 0;
  data?: Uint8Array;
  contentType?: string;
  blobUrl?: string;
  downloadState: DownloadState;
  onFinishedEventContext: Map<string, ResultCallback>;
  onFailedEventContext: Map<string, ResultCallback>;
  downloadBar?: HTMLElement;
  timeoutId?: number;
  settings: IMGFetcherSettings;

  constructor(root: ImageNode, settings: IMGFetcherSettings) {
    this.node = root;
    this.node.onclick = (event) => settings.onClick?.(event);
    this.downloadState = { total: 100, loaded: 0, readyState: 0, };
    /**
     * 当获取完成时的回调函数，从其他地方进行事件注册
     */
    this.onFinishedEventContext = new Map();
    this.onFailedEventContext = new Map();
    this.settings = settings;
  }

  // 刷新下载状态
  setDownloadState(newState: Partial<DownloadState>) {
    this.downloadState = { ...this.downloadState, ...newState };
    this.node.progress(this.downloadState);
    this.settings.downloadStateReporter?.(this.downloadState);
  }

  async start(index: number) {
    if (this.lock) return;
    this.lock = true;
    try {
      this.node.changeStyle("fetching");
      await this.fetchImage();
      this.node.changeStyle("fetched");
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } catch (error) {
      this.node.changeStyle("failed");
      evLog(`IMG-FETCHER ERROR:`, error);
      this.stage = FetchState.FAILED;
      this.onFailedEventContext.forEach((callback) => callback(index, this));
      // TODO: show error on image
    } finally {
      this.lock = false;
    }
  }

  onFinished(eventId: string, callback: ResultCallback) {
    this.onFinishedEventContext.set(eventId, callback);
  }

  onFailed(eventId: string, callback: ResultCallback) {
    this.onFailedEventContext.set(eventId, callback);
  }

  retry() {
    if (this.stage !== FetchState.DONE) {
      this.node.changeStyle();
      this.stage = FetchState.URL;
    }
  }

  async fetchImage(): Promise<void> {
    this.tryTimes = 0;
    while (this.tryTimes < 3) {
      switch (this.stage) {
        case FetchState.FAILED:
        case FetchState.URL:
          let meta = await this.fetchOriginMeta();
          if (meta !== null) {
            this.originURL = meta.url;
            if (meta.title) {
              this.node.title = meta.title;
              if (this.node.imgElement) {
                this.node.imgElement.title = meta.title;
              }
            }
            this.stage = FetchState.DATA;
          } else {
            this.tryTimes++;
          }
          break;
        case FetchState.DATA:
          const ret = await this.fetchImageData();
          if (ret !== null) {
            [this.data, this.contentType] = ret;
            this.data = await this.settings.matcher.processData(this.data, this.contentType, this.originURL!);
            this.blobUrl = URL.createObjectURL(new Blob([this.data], { type: this.contentType }));
            this.node.onloaded(this.blobUrl, this.contentType, this.data.byteLength);
            if (this.rendered === 2) {
              this.node.render();
            }
            this.stage = FetchState.DONE;
          } else {
            this.stage = FetchState.URL;
            this.tryTimes++;
          }
          break;
        case FetchState.DONE:
          return;
      }
    }
    throw new Error(`Fetch image failed, reach max try times, current stage: ${this.stage}`);
  }

  async fetchOriginMeta(): Promise<OriginMeta | null> {
    try {
      const meta = await this.settings.matcher.fetchOriginMeta(this.node.href, this.tryTimes > 0);
      if (!meta) {
        evLog("Fetch URL failed, the URL is empty");
        return null;
      }
      return meta;
    } catch (error) {
      evLog(`Fetch URL error:`, error);
      return null;
    }
  }

  async fetchImageData(): Promise<[Uint8Array, string] | null> {
    try {
      const data = await this.fetchBigImage();
      if (data == null) {
        throw new Error(`Data is null, image url:${this.originURL}`);
      }
      return data.arrayBuffer().then((buffer) => [new Uint8Array(buffer), data.type]);
    } catch (error) {
      evLog(`Fetch image data error:`, error);
      return null;
    }
  }

  render() {
    switch (this.rendered) {
      case 0:
      case 1:
        this.node.render();
        this.rendered = 2;
        break;
      case 2:
        break;
    }
  }

  unrender() {
    if (this.rendered === 1 || this.rendered === 0) return;
    this.rendered = 1;
    this.node.unrender();
  }

  //立刻将当前元素的src赋值给大图元素
  setNow(index: number) {
    this.settings.setNow?.(index);
    if (this.stage === FetchState.DONE) {
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    }
  }


  async fetchBigImage(): Promise<Blob | null> {
    if (this.originURL?.startsWith("blob:")) {
      return await fetch(this.originURL).then(resp => resp.blob());
    }
    const imgFetcher = this;
    return new Promise(async (resolve, reject) => {
      xhrWapper(imgFetcher.originURL!, "blob", {
        onload: function(response) {
          let data = response.response;
          if (data.type === "text/html") {
            // TODO: check response type, e.g. status code
            console.error("warn: fetch big image data type is not blob: ", data);
          }
          try {
            imgFetcher.setDownloadState({ readyState: response.readyState });
          } catch (error) {
            evLog("warn: fetch big image data onload setDownloadState error:", error);
          }
          resolve(data);
        },
        onerror: function(response) {
          reject(`error:${response.error}, response:${response.response}`);
        },
        ontimeout: function() {
          reject("timeout");
        },
        onprogress: function(response) {
          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
        },
        onloadstart: function() {
          imgFetcher.setDownloadState(imgFetcher.downloadState);
        }
      });
    });
  }

}

