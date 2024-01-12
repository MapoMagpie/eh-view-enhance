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

  setPageState({ total, current, finished }: { total?: number, current?: number, finished?: number }) {
    if (total !== undefined) {
      this.html.totalPageElement.textContent = total.toString();
    }
    if (current !== undefined) {
      this.html.currPageElement.textContent = current.toString();
    }
    if (finished !== undefined) {
      this.html.finishedElement.textContent = finished.toString();
    }
  }
}
