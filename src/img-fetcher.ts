import { conf, transient } from "./config";
import EBUS from "./event-bus";
import ImageNode, { VisualNode } from "./img-node";
import { Matcher, OriginMeta } from "./platform/platform";
import { Debouncer } from "./utils/debouncer";
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

export enum FetchState {
  FAILED = 0,
  URL = 1,
  DATA = 2,
  DONE = 3,
}

export class IMGFetcher implements VisualNode {
  index: number;
  node: ImageNode;
  stage: FetchState = FetchState.URL;
  tryTimes: number = 0;
  lock: boolean = false;
  rendered: boolean = false;
  data?: Uint8Array;
  contentType?: string;
  downloadState: DownloadState;
  timeoutId?: number;
  matcher: Matcher;
  chapterIndex: number;
  randomID: string;
  failedReason?: string;

  constructor(index: number, root: ImageNode, matcher: Matcher, chapterIndex: number) {
    this.index = index;
    this.node = root;
    this.node.onclick = (event) => {
      if (event.ctrlKey) {
        EBUS.emit("add-cherry-pick-range", this.chapterIndex, this.index, true, event.shiftKey);
      } else if (event.altKey) {
        EBUS.emit("add-cherry-pick-range", this.chapterIndex, this.index, false, event.shiftKey);
      } else {
        EBUS.emit("imf-on-click", this);
      }
    };
    this.downloadState = { total: 100, loaded: 0, readyState: 0, };
    this.matcher = matcher;
    this.chapterIndex = chapterIndex;
    this.randomID = chapterIndex + Math.random().toString(16).slice(2) + this.node.href;
  }

  create(): HTMLElement {
    return this.node.create();
  }

  // 刷新下载状态
  setDownloadState(newState: Partial<DownloadState>) {
    this.downloadState = { ...this.downloadState, ...newState };
    this.node.progress(this.downloadState);
    EBUS.emit("imf-download-state-change", this);
  }

  async start(index: number) {
    if (this.lock) return;
    this.lock = true;
    try {
      this.node.changeStyle("fetching");
      await this.fetchImage();
      this.node.changeStyle("fetched");
      EBUS.emit("imf-on-finished", index, true, this);
      this.failedReason = undefined;
    } catch (error) {
      this.failedReason = (error as Error).toString();
      this.node.changeStyle("failed", this.failedReason);
      evLog("error", `IMG-FETCHER ERROR:`, error);
      this.stage = FetchState.FAILED;
      EBUS.emit("imf-on-finished", index, false, this);
      // TODO: show error on image
    } finally {
      this.lock = false;
    }
  }

  resetStage() {
    this.node.changeStyle("init");
    this.stage = FetchState.URL;
  }

  async fetchImage(): Promise<void> {
    const fetchMachine: () => Promise<Error | null> = async () => {
      try {
        switch (this.stage) {
          case FetchState.FAILED:
          case FetchState.URL:
            const meta = await this.fetchOriginMeta();
            this.node.originSrc = meta.url;
            if (meta.title) {
              this.node.title = meta.title;
              if (this.node.imgElement) {
                this.node.imgElement.title = meta.title;
              }
            }
            this.node.href = meta.href || this.node.href;
            this.stage = FetchState.DATA;
            return fetchMachine();
          case FetchState.DATA:
            const ret = await this.fetchImageData();
            [this.data, this.contentType] = ret;
            [this.data, this.contentType] = await this.matcher.processData(this.data, this.contentType, this.node.originSrc!);
            if (this.contentType.startsWith("text")) {
              // if (this.data.byteLength < 100000) { // less then 100kb
              const str = new TextDecoder().decode(this.data);
              evLog("error", "unexpect content:\n", str);
              throw new Error(`expect image data, fetched wrong type: ${this.contentType}, the content is showing up in console(F12 open it).`);
              // }
            }
            this.node.blobSrc = transient.imgSrcCSP ? this.node.originSrc : URL.createObjectURL(new Blob([this.data], { type: this.contentType }));
            this.node.mimeType = this.contentType;
            this.node.render((reason) => {
              evLog("error", "render image failed, " + reason);
              this.rendered = false;
            });
            this.stage = FetchState.DONE;
          case FetchState.DONE:
            return null;
        }
      } catch (error) {
        this.stage = FetchState.FAILED;
        return error as Error;
      }
    }
    this.tryTimes = 0;
    let err: Error | null;
    while (this.tryTimes < 3) {
      err = await fetchMachine();
      if (err === null) return;
      this.tryTimes++;
      evLog("error", `fetch image error, try times: ${this.tryTimes}, error:`, err);
    }
    throw err!;
  }

  async fetchOriginMeta(): Promise<OriginMeta> {
    return await this.matcher.fetchOriginMeta(this.node, this.tryTimes > 0 || this.stage === FetchState.FAILED, this.chapterIndex);
  }

  async fetchImageData(): Promise<[Uint8Array, string]> {
    const data = await this.fetchBigImage();
    if (data == null) {
      throw new Error(`fetch image data is empty, image url:${this.node.originSrc}`);
    }
    return data.arrayBuffer().then((buffer) => [new Uint8Array(buffer), data.type]);
  }

  render() {
    const picked = EBUS.emit("imf-check-picked", this.chapterIndex, this.index) ?? this.node.picked;
    const shouldChangeStyle = picked !== this.node.picked;
    this.node.picked = picked;
    if (!this.rendered) {
      // evLog("info", `img node [${this.index}] rendered`);
      this.rendered = true;
      this.node.render((reason) => {
        evLog("error", "render image failed, " + reason);
        this.rendered = false;
      });
      this.node.changeStyle(this.stage === FetchState.DONE ? "fetched" : undefined, this.failedReason);
    } else if (shouldChangeStyle) {
      let status: "fetching" | "fetched" | "failed" | "init" | undefined;
      switch (this.stage) {
        case FetchState.FAILED:
          status = "failed"
          break;
        case FetchState.URL:
          status = "init"
          break;
        case FetchState.DATA:
          status = "fetching"
          break;
        case FetchState.DONE:
          status = "fetched"
          break;
      }
      this.node.changeStyle(status, this.failedReason);
    }
  }

  isRender(): boolean {
    return this.rendered;
  }

  unrender() {
    if (!this.rendered) return;
    this.rendered = false;
    this.node.unrender();
    this.node.changeStyle("init");
  }

  async fetchBigImage(): Promise<Blob | null> {
    if (this.node.originSrc?.startsWith("blob:")) {
      return await fetch(this.node.originSrc).then(resp => resp.blob());
    }
    const imgFetcher = this;
    return new Promise(async (resolve, reject) => {
      const debouncer = new Debouncer();
      let abort: () => void;
      const timeout = () => {
        debouncer.addEvent("XHR_TIMEOUT", () => {
          reject(new Error("timeout"));
          abort();
        }, conf.timeout * 1000);
      };
      abort = xhrWapper(imgFetcher.node.originSrc!, "blob", {
        onload: function(response) {
          let data = response.response;
          try {
            imgFetcher.setDownloadState({ readyState: response.readyState });
          } catch (error) {
            evLog("error", "warn: fetch big image data onload setDownloadState error:", error);
          }
          resolve(data);
        },
        onerror: function(response) {
          reject(new Error(`response status:${response.status}, error:${response.error}, response:${response.response}`));
        },
        onprogress: function(response) {
          imgFetcher.setDownloadState({ total: response.total, loaded: response.loaded, readyState: response.readyState });
          timeout();
        },
        onloadstart: function() {
          imgFetcher.setDownloadState(imgFetcher.downloadState);
        }
      }, this.matcher.headers());
      timeout();
    });
  }

}

