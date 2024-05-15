import { conf } from "../config";
import EBUS from "../event-bus";
import { FetchState } from "../img-fetcher";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { i18n } from "../utils/i18n";
import icons from "../utils/icons";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  chapterIndex: number = -1;
  lastPageNumber: number = 0;
  lastStage: "bigImageFrame" | "fullViewGrid" | "exit" = "exit";
  chapters: () => Chapter[];
  constructor(html: Elements, chapters: () => Chapter[]) {
    this.html = html;
    this.chapters = chapters;
    EBUS.subscribe("pf-change-chapter", (index) => {
      let current = 0;
      if (index === -1) { // index = -1 means back to chapters selection, so record the last chapter number
        this.lastPageNumber = this.chapterIndex;
        current = this.lastPageNumber;
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
      this.setPageState({ current: (index + 1).toString() });
      if (imf.stage !== FetchState.DONE) {
        this.setFetchState("fetching");
      }
    });
    EBUS.subscribe("ifq-on-finished-report", (index, queue) => {
      if (queue.chapterIndex !== this.chapterIndex) return;
      this.setPageState({ finished: queue.finishedIndex.size.toString() });
      evLog("info", `No.${index + 1} Finished，Current index at No.${queue.currIndex + 1}`);
      if (queue[queue.currIndex].stage === FetchState.DONE) {
        this.setFetchState("fetched");
      }
    });
    EBUS.subscribe("pf-on-appended", (total, _ifs, done) => {
      this.setPageState({ total: `${total}${done ? "" : ".."}` });
    });
    html.currPageElement.addEventListener("click", (event) => {
      const ele = event.target as HTMLElement;
      const index = parseInt(ele.textContent || "1") - 1;
      if (this.chapterIndex === -1) { // this.chapterIndex = -1 means now in chapters selection
        this.chapters()[this.lastPageNumber]?.onclick?.(this.lastPageNumber);
      } else {
        const queue = this.chapters()[this.chapterIndex]?.queue;
        if (!queue || !queue[index]) return;
        EBUS.emit("imf-on-click", queue[index]);
      }
    });
  }
  private setFetchState(state: "fetching" | "fetched") {
    if (state === "fetching") {
      this.html.pageHelper.classList.add("p-helper-fetching");
    } else {
      this.html.pageHelper.classList.remove("p-helper-fetching");
    }
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

  // ["entry-btn", "auto-page-btn", "page-status", "fin-status", "chapters-btn", "config-panel-btn", "downloader-panel-btn", "scale-bar", "read-mode-bar", "pagination-adjust-bar"]
  minify(stage: "fullViewGrid" | "bigImageFrame" | "exit", hover: boolean = false) {
    const items = Array.from(this.html.pageHelper.querySelectorAll<HTMLElement>(".b-main > .b-main-item"));
    let pick: string[] = [];
    this.lastStage = stage;
    if (stage !== "exit") {
      if (conf.minifyPageHelper === "always") {
        stage = "bigImageFrame";
      }
      if (conf.minifyPageHelper === "never") {
        hover = true;
      }
    }
    switch (stage) {
      case "fullViewGrid":
        pick = ["page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn"];
        if (this.chapters().length > 1 && this.chapterIndex > -1) {
          pick.push("chapters-btn");
        }
        if (hover) {
          pick.push("entry-btn");
        }
        break;
      case "bigImageFrame":
        if (hover) {
          pick = ["page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn", "entry-btn", "read-mode-bar"];
          if (conf.readMode === "pagination") {
            pick.push("pagination-adjust-bar");
          }
          pick.push("scale-bar");
        } else {
          pick = ["page-status"];
          if (this.html.pageHelper.querySelector("#auto-page-btn")?.getAttribute("data-status") === "playing") {
            pick.push("auto-page-btn");
          }
        }
        break;
      case "exit":
        pick = ["entry-btn"];
        break;
    }
    for (const item of items) {
      const index = pick.indexOf(item.id);
      item.style.order = index === -1 ? "99" : index.toString();
      item.style.opacity = index === -1 ? "0" : "1";
      item.hidden = !hover && stage === "exit" && index === -1;
    }
    this.html.pageHelper.querySelector<HTMLElement>("#entry-btn")!.textContent = stage === "exit" ? icons.bookIcon : i18n.collapse.get();
  }
}
