import { ConfigBooleanKeys, ConfigNumberKeys, ConfigSelectKeys, conf, saveConf, ConfigNumberType, ConfigBooleanType, ConfigSelectType } from "./config";
import { Downloader } from "./download/downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { FetchState } from "./img-fetcher";
import { PageFetcher } from "./page-fetcher";
import { adaptMatcher } from "./platform/adapt";
import { DownloaderCanvas } from "./ui/downloader-canvas";
import { initEvents } from "./ui/event";
import { HTML } from "./ui/html";
import pageHelper from "./ui/page-helper";
import { BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import { Debouncer } from "./utils/debouncer";
import { dragElement } from "./utils/drag-element";
import { evLog } from "./utils/ev-log";

const MATCHER = adaptMatcher();

export const IFQ: IMGFetcherQueue = new IMGFetcherQueue();
export const IL: IdleLoader = new IdleLoader(IFQ);
export const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML.bigImageFrame, IFQ, HTML.imgScaleBar);
export const DLC: DownloaderCanvas = new DownloaderCanvas("downloaderCanvas", IFQ, (index) => {
  IFQ.currIndex = index;
  BIFM.show();
});

export const PF: PageFetcher = new PageFetcher(IFQ, MATCHER, {
  matcher: MATCHER,
  downloadStateReporter: () => DLC.drawDebouce(),
  setNow: (index) => BIFM.setNow(index),
  onClick: (event) => BIFM.show(event),
});

const DL: Downloader = new Downloader(IFQ, IL, MATCHER, () => PF.done);

const events = initEvents(BIFM, IFQ, PF, IL);

IFQ.subscribeOnFinishedReport(1, (index, queue) => {
  pageHelper.setPageState({ finished: queue.finishedIndex.length });
  evLog(`第${index + 1}张完成，大图所在第${queue.currIndex + 1}张`);
  if (queue[queue.currIndex].stage === FetchState.DONE) {
    pageHelper.setFetchState("fetched");
  }
  return false;
});

IFQ.subscribeOnDo(1, (index, queue) => {
  pageHelper.setPageState({ current: index + 1 });
  const imf = queue[index];
  if (imf.stage !== FetchState.DONE) {
    pageHelper.setFetchState("fetching");
  }
  return false;
});

PF.setOnAppended((total) => {
  pageHelper.setPageState({ total });
});

if (conf["first"]) {
  events.showGuideEvent();
  conf["first"] = false;
  saveConf(conf);
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

// entry 入口
HTML.collapseBTN.addEventListener("click", () => events.main(false));
HTML.gate.addEventListener("click", () => events.main(true));

const debouncer = new Debouncer();

//全屏阅读元素滚动事件
HTML.fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 500));
HTML.fullViewPlane.addEventListener("click", events.hiddenFullViewPlaneEvent);

HTML.currPageElement.addEventListener("click", () => BIFM.show());
HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event as WheelEvent));

// Shortcut
document.addEventListener("keydown", (event) => events.keyboardEvent(event));
// 箭头导航
HTML.imgLandLeft.addEventListener("click", (event) => {
  IFQ.stepImageEvent(conf.reversePages ? "next" : "prev");
  event.stopPropagation();
});
HTML.imgLandRight.addEventListener("click", (event) => {
  IFQ.stepImageEvent(conf.reversePages ? "prev" : "next");
  event.stopPropagation();
});
HTML.imgLandTop.addEventListener("click", (event) => {
  IFQ.stepImageEvent("prev");
  event.stopPropagation();
});
HTML.imgLandBottom.addEventListener("click", (event) => {
  IFQ.stepImageEvent("next");
  event.stopPropagation();
});

HTML.showGuideElement.addEventListener("click", events.showGuideEvent);

dragElement(HTML.pageHelper, HTML.pageHelper.querySelector<HTMLElement>("#dragHub") ?? undefined, events.modPageHelperPostion);
