import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  constructor(html: Elements) {
    this.html = html;
  }
  setFetchState(state: "fetching" | "fetched") {
    if (state === "fetching") {
      this.html.pageHelper.classList.add("pageHelperFetching");
    } else {
      this.html.pageHelper.classList.remove("pageHelperFetching");
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
}
