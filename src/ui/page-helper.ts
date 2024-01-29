import { conf } from "../config";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  constructor(html: Elements) {
    this.html = html;
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
        return;
    }
    if (ok) {
      this.html.pageHelper.classList.add("p-minify");
    } else {
      this.html.pageHelper.classList.remove("p-minify");
    }
  }
}
