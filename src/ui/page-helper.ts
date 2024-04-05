import { conf } from "../config";
import EBUS from "../event-bus";
import { FetchState } from "../img-fetcher";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  constructor(html: Elements) {
    this.html = html;
    EBUS.subscribe("bifm-on-show", () => this.minify(true, "bigImageFrame"));
    EBUS.subscribe("bifm-on-hidden", () => this.minify(false, "bigImageFrame"));
    EBUS.subscribe("ifq-on-do", (chapterIndex, currIndex, queue) => {
      if (chapterIndex !== queue.chapterIndex) return;
      this.setPageState({ current: (currIndex + 1).toString() });
      const imf = queue[currIndex];
      if (imf.stage !== FetchState.DONE) {
        this.setFetchState("fetching");
      }
    });
    EBUS.subscribe("ifq-on-finished-report", (chapterIndex, index, queue) => {
      if (chapterIndex !== queue.chapterIndex) return;
      this.setPageState({ finished: queue.finishedIndex.size.toString() });
      evLog("info", `No.${index + 1} Finished，Current index at No.${queue.currIndex + 1}`);
      if (queue[queue.currIndex].stage === FetchState.DONE) {
        this.setFetchState("fetched");
      }
    });
  }
  setFetchState(state: "fetching" | "fetched") {
    if (state === "fetching") {
      this.html.pageHelper.classList.add("p-helper-fetching");
    } else {
      this.html.pageHelper.classList.remove("p-helper-fetching");
    }
  }

  setPageState({ total, current, finished }: { total?: string, current?: string, finished?: string }) {
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

  minify(ok: boolean, level: "fullViewGrid" | "bigImageFrame") {
    switch (conf.minifyPageHelper) {
      case "inBigMode":
        if (level === "fullViewGrid") {
          return;
        }
        break;
      case "always":
        if (level === "bigImageFrame") {
          return;
        }
        break;
      case "never":
        this.html.pageHelper.classList.remove("p-minify");
        return;
    }
    if (ok) {
      this.html.pageHelper.classList.add("p-minify");
    } else {
      this.html.pageHelper.classList.remove("p-minify");
    }
  }
}
