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
    if (cbs) {
      cbs.forEach((cb) => (cb as any)(...args));
    }
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
}


export interface Events {
  "downloader-canvas-on-click": (index: number) => void;
  "bifm-on-show": () => void;
  "bifm-on-hidden": () => void;
  "page-fetcher-on-appended": (total: number, nodes: VisualNode[], done?: boolean) => void;
  "page-fetcher-change-chapter": () => void;
  "imf-set-now": (index: number, imf: IMGFetcher) => void;
  "imf-on-finished": (index: number, success: boolean, imf: IMGFetcher) => void;
  "imf-on-click": (event: MouseEvent) => void;
  "imf-download-state-change": () => void;
  "ifq-on-do": (currIndex: number, queue: IMGFetcherQueue, downloading: boolean) => void;
  "ifq-on-finished-report": (index: number, queue: IMGFetcherQueue) => void;
  "fvgm-want-extend": () => void;
}

export type EventID = keyof Events;

const EBUS = new EventManager();
export default EBUS;

