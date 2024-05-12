import { conf } from "../config";
import EBUS from "../event-bus";
import { FetchState } from "../img-fetcher";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  chapterIndex: number = 0;
  lastStage: "bigImageFrame" | "fullViewGrid" | "exit" = "exit";
  constructor(html: Elements, getChapter: (index: number) => Chapter) {
    this.html = html;
    EBUS.subscribe("pf-change-chapter", (index) => {
      this.chapterIndex = index;
      const [total, finished] = (() => {
        const queue = getChapter(index)?.queue;
        if (!queue) return [0, 0];
        const finished = queue.filter(imf => imf.stage === FetchState.DONE).length;
        return [finished, queue.length];
      })();
      this.setPageState({ finished: finished.toString(), total: total.toString(), current: "1" });
    });
    EBUS.subscribe("bifm-on-show", () => this.minify("bigImageFrame"));
    EBUS.subscribe("bifm-on-hidden", () => this.minify("fullViewGrid"));
    EBUS.subscribe("ifq-do", (index, imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      const queue = getChapter(this.chapterIndex)?.queue;
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
      const queue = getChapter(this.chapterIndex)?.queue;
      if (!queue || !queue[index]) return;
      EBUS.emit("imf-on-click", queue[index]);
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

  // ["entry-btn", "auto-page-btn", "page-status", "fin-status", "chapters-btn", "config-panel-btn", "downloader-panel-btn"]
  minify(stage: "fullViewGrid" | "bigImageFrame" | "exit", hover: boolean = false) {
    const items = Array.from(this.html.pageHelper.querySelectorAll<HTMLElement>(".b-main > .b-main-item"));
    let pick: string[] = [];
    this.lastStage = stage;
    if (stage !== "exit" && conf.minifyPageHelper === "always") {
      stage = "bigImageFrame";
    }
    switch (stage) {
      case "fullViewGrid":
        // "chapters-btn",
        if (hover) {
          pick = ["entry-btn", "page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn"];
        } else {
          pick = ["page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn"];
        }
        break;
      case "bigImageFrame":
        if (hover) {
          pick = ["entry-btn", "page-status", "fin-status", "auto-page-btn", "config-panel-btn", "downloader-panel-btn"];
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
    this.html.pageHelper.querySelector<HTMLElement>("#entry-btn")!.textContent = stage === "exit" ? "OPEN" : "EXIT";
  }
}
