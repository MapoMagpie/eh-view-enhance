import { ConfigBooleanKeys, ConfigBooleanType, ConfigNumberKeys, ConfigNumberType, ConfigSelectKeys, ConfigSelectType, conf, saveConf } from "./config";
import { Downloader } from "./downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { PageFetcher } from "./page-fetcher";
import { adaptMatcher } from "./platform/platform";
import { DownloaderCanvas } from "./ui/downloader-canvas";
import { events } from "./ui/event";
import { createHTML } from "./ui/html";
import { AutoPage, BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import { Debouncer } from "./utils/debouncer";
import { dragElement } from "./utils/drag-element";

export type Oriented = "prev" | "next";

export const HTML = createHTML();
export const IFQ: IMGFetcherQueue = new IMGFetcherQueue();
export const IL: IdleLoader = new IdleLoader(IFQ);
export const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML.bigImageFrame, IFQ, HTML.imgScaleBar);
const matcher = adaptMatcher();
export const PF: PageFetcher = new PageFetcher(IFQ, IL, matcher);
export const DL: Downloader = new Downloader(IFQ, IL, matcher);
export const DLC: DownloaderCanvas = new DownloaderCanvas("downloaderCanvas", IFQ);
export const AP: AutoPage = new AutoPage(BIFM, HTML.autoPageBTN);

if (conf["first"]) {
  events.showGuideEvent();
  conf["first"] = false;
  saveConf(conf);
}

const signal = { first: true };
// 入口
export function main(collapse: boolean) {
  const pageHelperEle = document.querySelector("#pageHelper");
  if (pageHelperEle) {
    if (collapse) {
      pageHelperEle.classList.remove("pageHelperExtend");
      events.hiddenFullViewPlane();
      ["config", "downloader"].forEach(id => events.togglePlaneEvent(id, true));
    } else {
      pageHelperEle.classList.add("pageHelperExtend");
      events.showFullViewPlane();
      if (signal.first) {
        signal.first = false;
        // 入口
        PF.init().then(() => IL.start(IL.lockVer));
      }
    }
  }
}


HTML.configPlaneBTN.addEventListener("click", () => events.togglePlaneEvent("config"));
HTML.configPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
HTML.configPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
HTML.downloaderPlaneBTN.addEventListener("click", () => {
  DL.check();
  events.togglePlaneEvent("downloader");
});
HTML.downloaderPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
HTML.downloaderPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));

// modify config event
for (const key of ConfigNumberKeys) {
  HTML.fullViewPlane.querySelector<HTMLButtonElement>(`#${key}MinusBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'minus'));
  HTML.fullViewPlane.querySelector<HTMLButtonElement>(`#${key}AddBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'add'));
  HTML.fullViewPlane.querySelector<HTMLInputElement>(`#${key}Input`)!.addEventListener("wheel", (event: WheelEvent) => {
    if (event.deltaY < 0) {
      events.modNumberConfigEvent(key as ConfigNumberType, 'add');
    } else if (event.deltaY > 0) {
      events.modNumberConfigEvent(key as ConfigNumberType, 'minus');
    }
  });
}
for (const key of ConfigBooleanKeys) {
  HTML.fullViewPlane.querySelector(`#${key}Checkbox`)!.addEventListener("input", () => events.modBooleanConfigEvent(key as ConfigBooleanType));
}
for (const key of ConfigSelectKeys) {
  HTML.fullViewPlane.querySelector(`#${key}Select`)!.addEventListener("change", () => events.modSelectConfigEvent(key as ConfigSelectType));
}

HTML.collapseBTN.addEventListener("click", () => main(true));
HTML.gate.addEventListener("click", () => main(false));

const debouncer = new Debouncer();
//全屏阅读元素滚动事件
HTML.fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 500));
HTML.fullViewPlane.addEventListener("click", events.hiddenFullViewPlaneEvent);

HTML.currPageElement.addEventListener("click", () => events.showBigImage(IFQ.currIndex));
HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event as WheelEvent));

// Shortcut
document.addEventListener("keydown", (event) => events.keyboardEvent(event));
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
