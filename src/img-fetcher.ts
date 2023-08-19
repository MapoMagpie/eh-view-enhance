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
  // rate: number;
}

type onFinishedEventCallback = (index: number, imgFetcher: IMGFetcher) => void;

export enum FetchState {
  /** 获取大图地址 */
  URL = 1,
  /** 获取大图数据 */
  DATA = 2,
  /** 加载完成 */
  DONE = 3,
}

export class IMGFetcher {
  root: HTMLElement;
  imgElement: HTMLImageElement;
  pageUrl: string;
  bigImageUrl?: string;
  /** 1:获取大图地址 2:获取大图数据 3:加载完成 */
  stage: FetchState;
  tryTime: number;
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
    this.tryTime = 0;
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
      <progress style="position: absolute; width: 100%; height: 10px;" value="0" max="100" />
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
      const ok = await this.fetchImg();
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

  async fetchImg(): Promise<boolean> {
    switch (this.stage) {
      case FetchState.URL:
        return await this.stage1FetchUrl();
      case FetchState.DATA:
        return await this.stage2FetchImg();
      case FetchState.DONE:
        return this.stage3Done();
    }
  }

  // 阶段一：获取大图的地址
  async stage1FetchUrl(): Promise<boolean> {
    try {
      this.changeStyle(ChangeStyleAction.ADD);
      const ok = await this.fetchBigImageUrl(false);
      if (!ok) {
        evLog("获取大图地址失败");
        return false;
      }
      //成功获取到大图的地址后，将本图片获取器的状态修改为1，表示大图地址已经成功获取到
      if (!this.bigImageUrl) {
        evLog("大图地址不存在！");
        return false;
      }
      this.stage = FetchState.DATA;
      return this.fetchImg();
    } catch (error) {
      evLog(`获取大图地址时出现了异常:`, error);
      return false;
    }
  }
  // 阶段二：获取大图数据
  async stage2FetchImg(): Promise<boolean> {
    this.setDownloadState(this.downloadState);
    try {
      let ok = false;
      if (conf.disableDownload) {
        ok = await this.fetchBigImageWeird();
      } else {
        ok = await this.fetchBigImage();
      }
      if (!ok) {
        throw new Error(`获取大图数据失败,大图地址:${this.bigImageUrl}`);
      }
      this.stage = FetchState.DONE;
      return this.fetchImg();
    } catch (error) {
      evLog(`获取大图数据时出现了异常:`, error);
      //如果失败了，则进行重试，重试会进行2次
      ++this.tryTime;
      this.stage = FetchState.URL;
      // 重试2次后，直接失败，避免无限请求
      evLog(`当前重试第${this.tryTime}次`);
      if (this.tryTime > 2) {
        return false;
      }
      return this.fetchImg();
    }
  }
  // 阶段三：获取器结束
  stage3Done() {
    return true;
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
  async fetchBigImageUrl(originChanged: boolean): Promise<boolean> {
    let text = "";
    try {
      text = await window.fetch(this.pageUrl).then(resp => resp.text());
    } catch (error) {
      evLog("获取大图页面内容失败！", error);
    }
    if (!text) return false;
    // todo Your IP address has been temporarily banned for excessive pageloads which indicates that you are using automated mirroring/harvesting software. The ban expires in 2 days and 23 hours
    //抽取最佳质量的图片的地址
    if (conf.fetchOriginal || this.fetchOriginal) {
      const matchs = regulars.original.exec(text);
      if (matchs && matchs.length > 0) {
        this.bigImageUrl = matchs[1].replace(/&amp;/g, "&");
      } else {
        const normalMatchs = regulars["normal"].exec(text);
        if (normalMatchs == null || normalMatchs.length == 0) {
          evLog("获取大图地址失败，内容为: ", text);
          return false;
        } else {
          this.bigImageUrl = normalMatchs[1];
        }
      }
      return true;
    }
    //抽取正常的有压缩的大图地址
    if (this.tryTime === 0 || originChanged) {
      this.bigImageUrl = regulars.normal.exec(text)![1];
      return true;
    } else { //如果是重试状态,则进行换源
      const nlValue = regulars.nlValue.exec(text)![1];
      this.pageUrl += ((this.pageUrl + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
      evLog(`获取到重试地址:${this.pageUrl}`);
      return await this.fetchBigImageUrl(true);
    }
  }

  async fetchBigImageWeird(): Promise<boolean> {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      imgFetcher.imgElement.onload = () => {
        window.clearTimeout(imgFetcher.timeoutId);
        imgFetcher.setDownloadState({ total: 1, loaded: 1, readyState: 4 });
        resolve(true);
      };
      imgFetcher.imgElement.onloadstart = () => {
        imgFetcher.timeoutId = window.setTimeout(() => {
          imgFetcher.imgElement.onloadstart = null;
          imgFetcher.imgElement.onload = null;
          const src = this.imgElement.getAttribute("asrc");
          if (src) {
            imgFetcher.imgElement.src = src;
          }
          resolve(false);
        }, conf.timeout * 1000);
      };
      imgFetcher.blobUrl = imgFetcher.bigImageUrl;
      imgFetcher.imgElement.src = imgFetcher.blobUrl!;
      imgFetcher.rendered = true;
    });
  }

  async fetchBigImage(): Promise<boolean> {
    const imgFetcher = this;
    return new Promise(async (resolve) => {
      xhrWapper(imgFetcher.bigImageUrl!, "blob", {
        onload: function(response) {
          let data = response.response;
          if (!(data instanceof Blob)) throw new Error("未下载到有效的数据！");
          imgFetcher.blobData = data;
          imgFetcher.blobUrl = URL.createObjectURL(data);
          imgFetcher.imgElement.src = imgFetcher.blobUrl;
          imgFetcher.rendered = true;
          imgFetcher.setDownloadState({ readyState: response.readyState });
          resolve(true);
        },
        onerror: function(response) {
          evLog("加载大图失败:", response);
          resolve(false);
        },
        ontimeout: function() {
          evLog("加载大图超时:");
          resolve(false);
        },
        onprogress: function(response) {
          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
        },
      });
    });
  }

  changeStyle(action: ChangeStyleAction, fetchStatus?: FetchStatus) {
    switch (action) {
      case ChangeStyleAction.ADD:
        // 当获取到内容，或者获取失败，则移除本缩略图的边框效果
        this.imgElement.classList.add("fetching");
        break;
      case ChangeStyleAction.REMOVE:
        // 给当前缩略图元素添加一个获取中的边框样式
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
