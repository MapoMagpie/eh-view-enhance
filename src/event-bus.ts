import { Oriented } from "./config";
import { CherryPick } from "./download/downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IMGFetcher } from "./img-fetcher";
import { VisualNode } from "./img-node";
import { evLog } from "./utils/ev-log";

export class EventManager {
  private events: Map<EventID, Events[EventID][]>;
  constructor() {
    this.events = new Map();
  }
  emit<ID extends EventID>(id: ID, ...args: Parameters<Events[ID]>) {
    // evLog("event bus emitted: ", id, ", args: ", ...args);
    if (!["imf-download-state-change"].includes(id)) {
      evLog("debug", "event bus emitted: ", id);
    }
    const cbs = this.events.get(id);
    let ret: ReturnType<Events[ID]> | undefined;
    if (cbs) {
      cbs.forEach((cb) => ret = (cb as any)(...args));
    }
    return ret;
  }
  subscribe<ID extends EventID>(id: ID, cb: Events[ID]) {
    evLog("info", "event bus subscribed: ", id);
    const cbs = this.events.get(id);
    if (cbs) {
      cbs.push(cb);
    } else {
      this.events.set(id, [cb]);
    }
  }
  reset() {
    this.events = new Map();
  }
}

export interface Events {
  "downloader-canvas-on-click": (index: number) => void;
  "bifm-on-show": () => void;
  "bifm-on-hidden": () => void;
  "pf-on-appended": (total: number, nodes: VisualNode[], chapterIndex: number, done?: boolean) => void;
  "pf-change-chapter": (index: number) => void;
  "imf-on-finished": (index: number, success: boolean, imf: IMGFetcher) => void;
  "imf-on-click": (imf: IMGFetcher) => void;
  "imf-download-state-change": (imf: IMGFetcher) => void;
  "ifq-do": (index: number, imf: IMGFetcher, oriented: Oriented) => void;
  "ifq-on-do": (index: number, queue: IMGFetcherQueue, downloading: boolean) => void;
  "ifq-on-finished-report": (index: number, queue: IMGFetcherQueue) => void;
  "pf-try-extend": () => void;
  "downloader-canvas-resize": () => void;
  "notify-message": (level: "error" | "info", message: string) => void;
  "cherry-pick-changed": (chapaterIndex: number, cherryPick: CherryPick) => void;
  "imf-check-picked": (chapterIndex: number, index: number) => boolean;
}

export type EventID = keyof Events;

const EBUS = new EventManager();
export default EBUS;

