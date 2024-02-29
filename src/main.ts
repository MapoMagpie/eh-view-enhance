import { conf, saveConf } from "./config";
import { Downloader } from "./download/downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { FetchState } from "./img-fetcher";
import { PageFetcher } from "./page-fetcher";
import { adaptMatcher } from "./platform/adapt";
import { Matcher } from "./platform/platform";
import { DownloaderCanvas } from "./ui/downloader-canvas";
import { initEvents } from "./ui/event";
import { createHTML, addEventListeners } from "./ui/html";
import { PageHelper } from "./ui/page-helper";
import { BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import { Debouncer } from "./utils/debouncer";
import { evLog } from "./utils/ev-log";
import revertMonkeyPatch from "./utils/revert-monkey-patch";

type DestoryFunc = () => void;

function main(MATCHER: Matcher): DestoryFunc {
  const HTML = createHTML();
  [HTML.fullViewGrid, HTML.bigImageFrame].forEach(e => revertMonkeyPatch(e));
  const IFQ: IMGFetcherQueue = new IMGFetcherQueue();
  const IL: IdleLoader = new IdleLoader(IFQ);
  const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML, IFQ);
  const DLC: DownloaderCanvas = new DownloaderCanvas("downloader-canvas", IFQ, (index) => {
    IFQ.currIndex = index;
    BIFM.show();
  });
  const PF: PageFetcher = new PageFetcher(HTML.fullViewGrid, IFQ, MATCHER, {
    matcher: MATCHER,
    downloadStateReporter: () => DLC.drawDebouce(),
    setNow: (index) => BIFM.setNow(index),
    onClick: (event) => BIFM.show(event),
  });
  PF.beforeInit = () => {
    HTML.pageLoading.style.display = "flex";
  };
  PF.afterInit = () => {
    HTML.pageLoading.style.display = "none";
  };
  const DL: Downloader = new Downloader(HTML, IFQ, IL, MATCHER, () => PF.done);
  const PH: PageHelper = new PageHelper(HTML);
  IFQ.subscribeOnFinishedReport(1, (index, queue) => {
    PH.setPageState({ finished: queue.finishedIndex.size.toString() });
    evLog(`第${index + 1}张完成，大图所在第${queue.currIndex + 1}张`);
    if (queue[queue.currIndex].stage === FetchState.DONE) {
      PH.setFetchState("fetched");
    }
    return false;
  });
  // scroll to current image that is in view
  IFQ.subscribeOnFinishedReport(2, (index, queue) => {
    if (index !== queue.currIndex || !BIFM.visible) {
      return false;
    }
    const imgFetcher = queue[index];
    let scrollTo = imgFetcher.node.root!.offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= HTML.fullViewGrid.scrollHeight ? HTML.fullViewGrid.scrollHeight : scrollTo;
    HTML.fullViewGrid.scrollTo({ top: scrollTo, behavior: "smooth" });
    return false;
  });
  BIFM.onShow(1, () => PH.minify(true, "bigImageFrame"));
  BIFM.onHidden(1, () => PH.minify(false, "bigImageFrame"));
  // one image finished, call PageFetcher.appendNextPages try to append next page
  const debouncer = new Debouncer();
  IFQ.subscribeOnFinishedReport(3, (index) => {
    debouncer.addEvent("APPEND-NEXT-PAGES", () => PF.appendNextPages(index), 5);
    return false;
  });
  IFQ.subscribeOnDo(0, (index, queue) => {
    PH.setPageState({ current: (index + 1).toString() });
    const imf = queue[index];
    if (imf.stage !== FetchState.DONE) {
      PH.setFetchState("fetching");
    }
    return false;
  });
  PF.setOnAppended((total, done) => {
    PH.setPageState({ total: `${total}${done ? "" : ".."}` });
    setTimeout(() => PF.renderCurrView(), 200);
  });

  const events = initEvents(HTML, BIFM, IFQ, PF, IL, PH);
  addEventListeners(events, HTML, BIFM, IFQ, DL);
  if (conf["first"]) {
    events.showGuideEvent();
    conf["first"] = false;
    saveConf(conf);
  }
  return () => {
    console.log("destory eh-view-enhance");
    HTML.fullViewGrid.remove();
    PF.abort();
    IL.abort(0);
    IFQ.length = 0;
  }
}

// https://stackoverflow.com/questions/6390341/how-to-detect-if-url-has-changed-after-hash-in-javascript
(() => {
  let oldPushState = history.pushState;
  history.pushState = function pushState(...args: any) {
    let ret = oldPushState.apply(this, args);
    window.dispatchEvent(new Event('pushstate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };

  let oldReplaceState = history.replaceState;
  history.replaceState = function replaceState(...args: any) {
    let ret = oldReplaceState.apply(this, args);
    window.dispatchEvent(new Event('replacestate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };

  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('locationchange'));
  });
})();

let destoryFunc: () => void;
window.addEventListener("locationchange", () => {
  destoryFunc?.();
  const matcher = adaptMatcher(window.location.href);
  if (matcher !== null) {
    destoryFunc = main(matcher);
  }
});

const matcher = adaptMatcher(window.location.href);
if (matcher !== null) {
  destoryFunc = main(matcher);
}
