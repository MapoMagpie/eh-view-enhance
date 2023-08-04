import { ConfigBooleanKeys, ConfigBooleanType, ConfigNumberKeys, ConfigNumberType, conf } from "./config";
import { Downloader, DownloaderCanvas } from "./downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { PageFetcher } from "./page-fetcher";
import { events } from "./ui/event";
import { createHTML } from "./ui/html";
import { BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import { Debouncer } from "./utils/debouncer";
import { dragElement } from "./utils/drag-element";

export type Oriented = "prev" | "next";

export const HTML = createHTML();
export const IFQ: IMGFetcherQueue = new IMGFetcherQueue();
export const IL: IdleLoader = new IdleLoader(IFQ);
export const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML.bigImageFrame, IFQ);
export const PF: PageFetcher = new PageFetcher(IFQ, IL);
export const DL: Downloader = new Downloader(IFQ, IL);
export const DLC: DownloaderCanvas = new DownloaderCanvas("downloaderCanvas", IFQ);

if (conf["first"]) {
  events.showGuideEvent();
  conf["first"] = false;
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
}

const signal = { first: true };
// 入口
export function main(collapse: boolean) {
  const pageHelperEle = document.querySelector("#pageHelper #main");
  if (pageHelperEle) {
    if (collapse) {
      pageHelperEle.classList.add("b-collapse");
      events.hiddenFullViewPlane();
      ["config", "downloader"].forEach(id => events.togglePlaneEvent(id, true));
    } else {
      pageHelperEle.classList.remove("b-collapse");
      events.showFullViewPlane();
      if (signal.first) {
        signal.first = false;
        // 入口
        PF.init().then(() => IL.start(IL.lockVer));
      }
    }
  }
}

HTML.bigImageFrame.addEventListener("click", events.hiddenBigImageEvent);
// bigImageFrame.addEventListener("wheel", bigImageWheelEvent);
HTML.bigImageFrame.addEventListener("contextmenu", (event) => event.preventDefault());

HTML.configPlaneBTN.addEventListener("click", () => events.togglePlaneEvent("config"));
HTML.configPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
HTML.downloaderPlaneBTN.addEventListener("click", () => {
  DL.check();
  events.togglePlaneEvent("downloader");
});
HTML.downloaderPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));

// modify config event
for (const key of ConfigNumberKeys) {
  HTML.fullViewPlane.querySelector(`#${key}MinusBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'minus'));
  HTML.fullViewPlane.querySelector(`#${key}AddBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'add'));
}
for (const key of ConfigBooleanKeys) {
  HTML.fullViewPlane.querySelector(`#${key}Checkbox`)!.addEventListener("input", () => events.modBooleanConfigEvent(key as ConfigBooleanType));
}

HTML.collapseBTN.addEventListener("click", () => main(true));
HTML.gate.addEventListener("click", () => main(false));

const debouncer = new Debouncer();
//全屏阅读元素滚动事件
HTML.fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 500));
HTML.fullViewPlane.addEventListener("click", events.hiddenFullViewPlaneEvent);

HTML.currPageElement.addEventListener("click", () => events.showBigImage(IFQ.currIndex));
HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event as WheelEvent));

// 按键导航
document.addEventListener("keyup", events.keyboardEvent);
// 箭头导航
HTML.imgLandLeft.addEventListener("click", (event) => {
  events.stepImageEvent(conf.reversePages ? "next" : "prev");
  event.stopPropagation();
});
HTML.imgLandRight.addEventListener("click", (event) => {
  events.stepImageEvent(conf.reversePages ? "prev" : "next");
  event.stopPropagation();
});
HTML.imgLandTop.addEventListener("click", (event) => {
  events.stepImageEvent("prev");
  event.stopPropagation();
});
HTML.imgLandBottom.addEventListener("click", (event) => {
  events.stepImageEvent("next");
  event.stopPropagation();
});

HTML.showGuideElement.addEventListener("click", events.showGuideEvent);

dragElement(HTML.pageHelper, HTML.pageHelper.querySelector<HTMLElement>("#dragHub") ?? undefined, events.modPageHelperPostion);
