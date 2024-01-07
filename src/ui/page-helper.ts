import { HTML } from "./html";

function setFetchState(state: "fetching" | "fetched") {
  if (state === "fetching") {
    HTML.pageHelper.classList.add("pageHelperFetching");
  } else {
    HTML.pageHelper.classList.remove("pageHelperFetching");
  }
}

function setPageState({ total, current, finished }: { total?: number, current?: number, finished?: number }) {
  if (total !== undefined) {
    HTML.totalPageElement.textContent = total.toString();
  }
  if (current !== undefined) {
    HTML.currPageElement.textContent = current.toString();
  }
  if (finished !== undefined) {
    HTML.finishedElement.textContent = finished.toString();
  }
}
const pageHelper = {
  setFetchState,
  setPageState,
}
export default pageHelper;
