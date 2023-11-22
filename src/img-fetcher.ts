import { conf } from "./config";
import { BIFM, DLC } from "./main";
import { regulars } from "./regulars";
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

type onFinishedEventCallback = (index: number, imgFetcher: IMGFetcher) => void;

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
  onFinishedEventContext: Map<string, onFinishedEventCallback>;
  fetchOriginal: boolean;
  downloadBar?: HTMLElement;
  timeoutId?: number;

  constructor(node: HTMLElement) {
    this.root = node;
    this.imgElement = node.firstChild as HTMLImageElement;
    this.pageUrl = this.imgElement.getAttribute("ahref")!;
    this.stage = FetchState.URL;
    this.tryTimes = 0;
    this.lock = false;
    this.rendered = false;
    // this.blobData = undefined;
    this.title = this.imgElement.getAttribute("title") || undefined;
    /**
     * 下载状态
     * total: 图片数据量
     * loaded: 已下载的数据量
     * readyState: 0未开始下载; 1-3下载中; 4下载完毕
     * rate:下载速率
     */
    this.downloadState = { total: 100, loaded: 0, readyState: 0, };
    /**
     * 当获取完成时的回调函数，从其他地方进行事件注册
     */
    this.onFinishedEventContext = new Map();
    this.fetchOriginal = false;
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
      const ok = await this.fetchImage();
      if (!ok) {
        throw new Error("图片获取器失败，中止获取！");
      }
      this.changeStyle(ChangeStyleAction.REMOVE, FetchStatus.SUCCESS);
      this.onFinishedEventContext.forEach((callback) => callback(index, this));
    } catch (error) {
      this.changeStyle(ChangeStyleAction.REMOVE, FetchStatus.FAILED);
      evLog(`图片获取器获取失败:`, error);
    } finally {
      this.lock = false;
    }
  }

  onFinished(eventId: string, callback: onFinishedEventCallback) {
    this.onFinishedEventContext.set(eventId, callback);
  }

  async fetchImage(): Promise<boolean> {
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
        case FetchState.DATA:
          let data = await this.fetchImageData();
          if (data !== null) {
            this.blobData = data;
            this.blobUrl = URL.createObjectURL(data);
            this.imgElement.src = this.blobUrl;
            this.rendered = true;
            this.stage = FetchState.DONE;
          } else {
            this.tryTimes++;
            this.stage = FetchState.URL;
          }
        case FetchState.DONE:
          return true;
      }
    }
    return false;
  }

  async fetchImageURL(): Promise<string | null> {
    try {
      const imageURL = await this.fetchBigImageUrl(false);
      if (!imageURL) {
        evLog("Fetch Image URL failed, the URL is empty");
        return null;
      }
      return imageURL;
    } catch (error) {
      evLog(`Fetch image url error:`, error);
      return null;
    }
  }

  async fetchImageData(): Promise<Blob | null> {
    try {
      const data = await this.fetchBigImage();
      if (data == null) {
        throw new Error(`Cannot fetch image data, image url:${this.bigImageUrl}`);
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

  /**
   *  获取大图地址
   * @param originChanged 是否为重新换源状态，为true时，不再进行新的换源动作，避免无限递归
   * @return boolean
   */
  async fetchBigImageUrl(originChanged: boolean): Promise<string | null> {
    let text = "";
    try {
      text = await window.fetch(this.pageUrl).then(resp => resp.text());
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      evLog("Fetch image src page error, expected [text]！", error);
      return null
    }

    // TODO: Your IP address has been temporarily banned for excessive pageloads which indicates that you are using automated mirroring/harvesting software. The ban expires in 2 days and 23 hours

    //抽取最佳质量的图片的地址
    if (conf.fetchOriginal || this.fetchOriginal) {
      const matchs = regulars.original.exec(text);
      if (matchs && matchs.length > 0) {
        return matchs[1].replace(/&amp;/g, "&");
      } else {
        const normalMatchs = regulars["normal"].exec(text);
        if (normalMatchs == null || normalMatchs.length == 0) {
          evLog("Cannot matching the image url，content: ", text);
          return null;
        } else {
          return normalMatchs[1];
        }
      }
    }
    //抽取正常的有压缩的大图地址
    if (this.tryTimes === 0 || originChanged) {
      return regulars.normal.exec(text)![1];
    } else { //如果是重试状态,则进行换源
      const nlValue = regulars.nlValue.exec(text)![1];
      this.pageUrl += ((this.pageUrl + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
      evLog(`获取到重试地址:${this.pageUrl}`);
      return await this.fetchBigImageUrl(true);
    }
  }

  async fetchBigImage(): Promise<Blob | null> {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      xhrWapper<"blob">(imgFetcher.bigImageUrl!, "blob", {
        onload: function(response) {
          let data = response.response;
          evLog("data:", typeof data);
          imgFetcher.setDownloadState({ readyState: response.readyState });
          resolve(data);
        },
        onerror: function(response) {
          evLog("fetch image error:", response.error, response.response);
          resolve(null);
        },
        ontimeout: function() {
          evLog("fetch image timeout:");
          resolve(null);
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
