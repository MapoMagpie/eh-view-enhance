import { conf } from "../config";
import EBUS from "../event-bus";
import { FetchState } from "../img-fetcher";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  chapterIndex: number = -1;
  pageNumInChapter: Record<number, number> = {};
  lastStage: "bigImageFrame" | "fullViewGrid" | "exit" = "exit";
  chapters: () => Chapter[];
  downloading: () => boolean;
  constructor(html: Elements, chapters: () => Chapter[], downloading: () => boolean) {
    this.html = html;
    this.chapters = chapters;
    this.downloading = downloading;
    EBUS.subscribe("pf-change-chapter", (index) => {
      let current = 0;
      if (index >= 0) { // index = -1 means back to chapters selection, so record the last chapter number
        current = this.pageNumInChapter[index] || 0;
      }
      this.chapterIndex = index;
      const [total, finished] = (() => {
        const queue = this.chapters()[index]?.queue;
        if (!queue) return [0, 0];
        const finished = queue.filter(imf => imf.stage === FetchState.DONE).length;
        return [queue.length, finished];
      })();
      this.setPageState({ finished: finished.toString(), total: total.toString(), current: (current + 1).toString() });
      this.minify(this.lastStage);
    });
    EBUS.subscribe("bifm-on-show", () => this.minify("bigImageFrame"));
    EBUS.subscribe("bifm-on-hidden", () => this.minify("fullViewGrid"));
    EBUS.subscribe("ifq-do", (index, imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      const queue = this.chapters()[this.chapterIndex]?.queue;
      if (!queue) return;
      this.pageNumInChapter[this.chapterIndex] = index;
      this.setPageState({ current: (index + 1).toString() });
    });
    EBUS.subscribe("ifq-on-finished-report", (index, queue) => {
      if (queue.chapterIndex !== this.chapterIndex) return;
      this.setPageState({ finished: queue.finishedIndex.size.toString() });
      evLog("info", `No.${index + 1} Finished，Current index at No.${queue.currIndex + 1}`);
    });
    EBUS.subscribe("pf-on-appended", (total, _ifs, chapterIndex: number, done) => {
      if (this.chapterIndex > -1 && chapterIndex !== this.chapterIndex) return;
      this.setPageState({ total: `${total}${done ? "" : ".."}` });
    });
    html.currPageElement.addEventListener("click", (event) => {
      const ele = event.target as HTMLElement;
      const index = parseInt(ele.textContent || "1") - 1;
      if (this.chapterIndex >= 0) { // this.chapterIndex = -1 means now in chapters selection
        const queue = this.chapters()[this.chapterIndex]?.queue;
        if (!queue || !queue[index]) return;
        EBUS.emit("imf-on-click", queue[index]);
      }
    });
  }

  private setPageState({ total, current, finished }: { total?: string, current?: string, finished?: string }) {
    if (total !== undefined) {
      this.html.totalPageElement.textContent = total;
    }
    if (current !== undefined) {
      this.html.currPageElement.textContent = current;
    }
    if (finished !== undefined) {
      this.html.finishedElement.textContent = finished;
    }
  }

  // const arr = ["entry-btn", "auto-page-btn", "page-status", "fin-status", "chapters-panel-btn", "config-panel-btn", "downloader-panel-btn", "scale-bar", "read-mode-bar", "pagination-adjust-bar"];
  minify(stage: "fullViewGrid" | "bigImageFrame" | "exit", hover: boolean = false) {
    this.lastStage = stage;
    let level: [number, number] = [0, 0];
    if (stage === "exit") {
      level = [0, 0];
    } else {
      switch (stage) {
        case "fullViewGrid":
          if (conf.minifyPageHelper === "never" || conf.minifyPageHelper === "inBigMode") {
            level = [1, 1];
          } else {
            level = hover ? [1, 1] : [3, 1];
          }
          break;
        case "bigImageFrame":
          if (conf.minifyPageHelper === "never") {
            level = [2, 2];
          } else {
            level = hover ? [2, 2] : [3, 2];
          }
          break;
      }
    }
    function getPick(lvl: number, downloading: boolean = false) {
      switch (lvl) {
        case 0:
          // default
          return downloading ? ["entry-btn", "page-status", "fin-status"] : ["entry-btn"];
        case 1:
          // hover in fullViewGrid
          return ["page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn", "chapters-panel-btn", "entry-btn"];
        case 2:
          // hover in bigImageFrame
          return ["page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn", "entry-btn", "read-mode-bar", "pagination-adjust-bar", "scale-bar"];
        case 3:
          // minify
          return ["page-status", "auto-page-btn"];
      }
      return [];
    }
    const filter = (id: string) => {
      if (id === "chapters-panel-btn") return this.chapters().length > 1;
      if (id === "auto-page-btn" && level[0] === 3) return this.html.pageHelper.querySelector("#auto-page-btn")?.getAttribute("data-status") === "playing";
      if (id === "pagination-adjust-bar") return conf.readMode === "pagination";
      return true;
    }
    const pick = getPick(level[0], this.downloading()).filter(filter);
    const notHidden = getPick(level[1], this.downloading()).filter(filter);
    const items = Array.from(this.html.pageHelper.querySelectorAll<HTMLElement>(".b-main > .b-main-item"));
    for (const item of items) {
      const index = pick.indexOf(item.id);
      item.style.order = index === -1 ? "99" : index.toString();
      item.style.opacity = index === -1 ? "0" : "1";
      item.hidden = !notHidden.includes(item.id);
    }
    const entryBTN = this.html.pageHelper.querySelector<HTMLElement>("#entry-btn")!;
    const displayTexts = entryBTN.getAttribute("data-display-texts")!.split(",");
    entryBTN.textContent = stage === "exit" ? displayTexts[0] : displayTexts[1];
  }
}
