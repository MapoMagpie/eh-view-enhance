import { conf, saveConf } from "./config";
import { Downloader } from "./download/downloader";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { FetchState } from "./img-fetcher";
import { PageFetcher } from "./page-fetcher";
import { adaptMatcher } from "./platform/adapt";
import { DownloaderCanvas } from "./ui/downloader-canvas";
import { initEvents } from "./ui/event";
import { createHTML, addEventListeners } from "./ui/html";
import { PageHelper } from "./ui/page-helper";
import { BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import { evLog } from "./utils/ev-log";

const MATCHER = adaptMatcher();
type DestoryFunc = () => void;

function main(): DestoryFunc {
  const HTML = createHTML();
  const IFQ: IMGFetcherQueue = new IMGFetcherQueue();
  const IL: IdleLoader = new IdleLoader(IFQ);
  const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML, IFQ);
  const DLC: DownloaderCanvas = new DownloaderCanvas("downloaderCanvas", IFQ, (index) => {
    IFQ.currIndex = index;
    BIFM.show();
  });
  const PF: PageFetcher = new PageFetcher(HTML.fullViewPlane, IFQ, MATCHER, {
    matcher: MATCHER,
    downloadStateReporter: () => DLC.drawDebouce(),
    setNow: (index) => BIFM.setNow(index),
    onClick: (event) => BIFM.show(event),
  });
  const DL: Downloader = new Downloader(HTML, IFQ, IL, MATCHER, () => PF.done);
  const PH: PageHelper = new PageHelper(HTML);
  IFQ.subscribeOnFinishedReport(1, (index, queue) => {
    PH.setPageState({ finished: queue.finishedIndex.length });
    evLog(`第${index + 1}张完成，大图所在第${queue.currIndex + 1}张`);
    if (queue[queue.currIndex].stage === FetchState.DONE) {
      PH.setFetchState("fetched");
    }
    return false;
  });
  // scroll to current image that is in view
  IFQ.subscribeOnFinishedReport(2, (index, queue) => {
    if (index !== queue.currIndex) {
      return false;
    }
    const imgFetcher = queue[index];
    let scrollTo = imgFetcher.root.offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= HTML.fullViewPlane.scrollHeight ? HTML.fullViewPlane.scrollHeight : scrollTo;
    HTML.fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" });
    return false;
  });

  IFQ.subscribeOnDo(1, (index, queue) => {
    PH.setPageState({ current: index + 1 });
    const imf = queue[index];
    if (imf.stage !== FetchState.DONE) {
      PH.setFetchState("fetching");
    }
    return false;
  });
  PF.setOnAppended((total) => {
    PH.setPageState({ total });
    setTimeout(() => PF.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight), 200);
  });

  const events = initEvents(HTML, BIFM, IFQ, PF, IL);
  addEventListeners(events, HTML, BIFM, IFQ, DL);
  if (conf["first"]) {
    events.showGuideEvent();
    conf["first"] = false;
    saveConf(conf);
  }
  return () => {
    console.log("destory eh-view-enhance");
    HTML.fullViewPlane.remove();
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
window.addEventListener("locationchange", (event) => {
  console.log("locationchange", event);
  if (MATCHER.work(window.location.href)) {
    destoryFunc = main();
  } else {
    destoryFunc();
  }
});

if (MATCHER.work(window.location.href)) {
  destoryFunc = main();
}
