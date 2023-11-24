import { BIFM, DLC } from "./main";
import { DifferentialMatcher } from "./platform/platform";
import { updatePageHelper } from "./ui/page-helper";
import { evLog } from "./utils/ev-log";
import { xhrWapper } from "./utils/query";

type DownloadState = {
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

type OnFinishedEvent = (index: number, imgFetcher: IMGFetcher) => void;

export enum FetchState {
  URL = 1,
  DATA = 2,
  DONE = 3,
}

export class IMGFetcher {
  root: HTMLElement;
  imgElement: HTMLImageElement;
  pageUrl: string;
  bigImageUrl?: string;
  stage: FetchState;
  tryTimes: number;
  lock: boolean;
  rendered: boolean;
  blobData?: Blob;
  blobUrl?: string;
  title?: string;
  downloadState: DownloadState;
  onFinishedEventContext: Map<string, OnFinishedEvent>;
  downloadBar?: HTMLElement;
  timeoutId?: number;
  matcher: DifferentialMatcher;

  constructor(node: HTMLElement, matcher: DifferentialMatcher) {
    this.root = node;
    this.imgElement = node.firstChild as HTMLImageElement;
    this.pageUrl = this.imgElement.getAttribute("ahref")!;
    this.stage = FetchState.URL;
    this.tryTimes = 0;
    this.lock = false;
    this.rendered = false;
    // this.blobData = undefined;
    this.title = this.imgElement.getAttribute("title") || undefined;
    this.downloadState = { total: 100, loaded: 0, readyState: 0, };
    /**
     * 当获取完成时的回调函数，从其他地方进行事件注册
     */
    this.onFinishedEventContext = new Map();
    this.matcher = matcher;
  }

  // 刷新下载状态
  setDownloadState(newState: Partial<DownloadState>) {
    this.downloadState = { ...this.downloadState, ...newState };
    if (this.downloadState.readyState === 4) {
      if (this.downloadBar) {
        this.downloadBar.remove();
      }
      return;
    }
    if (!this.downloadBar) {
      const downloadBar = document.createElement("div");
      downloadBar.classList.add("downloadBar");
      downloadBar.innerHTML = `
      <progress style="position: absolute; width: 100%; height: 7px; left: 0; bottom: 0; border: none;" value="0" max="100" />
      `;
      this.downloadBar = downloadBar;
      this.root.appendChild(this.downloadBar);
    }
    if (this.downloadBar) {
      this.downloadBar.querySelector("progress")!.setAttribute("value", (this.downloadState.loaded / this.downloadState.total) * 100 + "");
    }
    DLC.drawDebouce();
  }

  async start(index: number) {
    if (this.lock) return;
    this.lock = true;
    try {
      this.changeStyle(ChangeStyleAction.ADD);
      await this.fetchImage();
      this.changeStyle(ChangeStyleAction.REMOVE, FetchStatus.SUCCESS);
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } catch (error) {
      this.changeStyle(ChangeStyleAction.REMOVE, FetchStatus.FAILED);
      evLog(`IMG-FETCHER ERROR:`, error);
      // TODO: show error on image
    } finally {
      this.lock = false;
    }
  }

  onFinished(eventId: string, callback: OnFinishedEvent) {
    this.onFinishedEventContext.set(eventId, callback);
  }

  async fetchImage(): Promise<void> {
    this.tryTimes = 0;
    while (this.tryTimes < 3) {
      switch (this.stage) {
        case FetchState.URL:
          let url = await this.fetchImageURL();
          if (url !== null) {
            this.bigImageUrl = url;
            this.stage = FetchState.DATA;
          } else {
            this.tryTimes++;
          }
          break;
        case FetchState.DATA:
          let data = await this.fetchImageData();
          if (data !== null) {
            this.blobData = data;
            this.blobUrl = URL.createObjectURL(data);
            this.imgElement.src = this.blobUrl;
            this.rendered = true;
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

  async fetchImageURL(): Promise<string | null> {
    try {
      const imageURL = await this.matcher.matchImgURL(this.pageUrl);
      if (!imageURL) {
        evLog("Fetch URL failed, the URL is empty");
        return null;
      }
      return imageURL;
    } catch (error) {
      evLog(`Fetch URL error:`, error);
      return null;
    }
  }

  async fetchImageData(): Promise<Blob | null> {
    try {
      const data = await this.fetchBigImage();
      if (data == null) {
        throw new Error(`Data is null, image url:${this.bigImageUrl}`);
      }
      return data;
    } catch (error) {
      evLog(`Fetch image data error:`, error);
      return null;
    }
  }

  render() {
    if (this.rendered) return;
    // this.imgElement.style.height = "auto";
    const src = this.imgElement.getAttribute("asrc");
    if (src) {
      this.imgElement.src = src;
      this.rendered = true;
    } else {
      evLog("渲染缩略图失败，未获取到asrc属性");
    }
  }

  //立刻将当前元素的src赋值给大图元素
  setNow(index: number) {
    BIFM.setNow(index);
    if (this.stage === FetchState.DONE) {
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } else {
      updatePageHelper("fetching");
    }
    updatePageHelper("updateCurrPage", (index + 1).toString());
  }


  async fetchBigImage(): Promise<Blob | null> {
    const imgFetcher = this;
    return new Promise(async (resolve, reject) => {
      xhrWapper<"blob">(imgFetcher.bigImageUrl!, "blob", {
        onload: function(response) {
          let data = response.response;
          imgFetcher.setDownloadState({ readyState: response.readyState });
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

  changeStyle(action: ChangeStyleAction, fetchStatus?: FetchStatus) {
    switch (action) {
      case ChangeStyleAction.ADD:
        this.imgElement.classList.add("fetching");
        break;
      case ChangeStyleAction.REMOVE:
        this.imgElement.classList.remove("fetching");
        break;
    }
    switch (fetchStatus) {
      case FetchStatus.SUCCESS:
        this.imgElement.classList.add("fetched");
        this.imgElement.classList.remove("fetch-failed");
        break;
      case FetchStatus.FAILED:
        this.imgElement.classList.add("fetch-failed");
        this.imgElement.classList.remove("fetched");
        break;
    }
  }
}

enum ChangeStyleAction {
  ADD,
  REMOVE,
}
enum FetchStatus {
  SUCCESS,
  FAILED,
}
