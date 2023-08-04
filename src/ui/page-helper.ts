import { DLC, HTML } from "../main";

export type PageState = "fetching" | "fetched" | "updateTotal" | "updateCurrPage" | "updateFinished";
//页码指示器通用修改事件
export const updatePageHelper = function(state: PageState, data?: string) {
  switch (state) {
    case "fetching":
      HTML.pageHelper.classList.add("pageHelperFetching");
      break;
    case "fetched":
      HTML.pageHelper.classList.remove("pageHelperFetching");
      break;
    case "updateTotal":
      if (!data) {
        throw new Error("updateTotal data is undefined");
      }
      HTML.totalPageElement.textContent = data;
      DLC.drawDebouce();
      break;
    case "updateCurrPage":
      if (!data) {
        throw new Error("updateCurrPage data is undefined");
      }
      HTML.currPageElement.textContent = data;
      DLC.drawDebouce();
      break;
    case "updateFinished":
      if (!data) {
        throw new Error("updateFinished data is undefined");
      }
      HTML.finishedElement.textContent = data;
      DLC.drawDebouce();
      break;
  }
};

