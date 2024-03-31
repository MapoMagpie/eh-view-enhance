import { conf, saveConf } from "./config";
import { Downloader } from "./download/downloader";
import EBUS from "./event-bus";
import { IMGFetcherQueue } from "./fetcher-queue";
import { IdleLoader } from "./idle-loader";
import { PageFetcher } from "./page-fetcher";
import { adaptMatcher } from "./platform/adapt";
import { Matcher } from "./platform/platform";
import { initEvents } from "./ui/event";
import { FullViewGridManager } from "./ui/full-view-grid-manager";
import { createHTML, addEventListeners } from "./ui/html";
import { PageHelper } from "./ui/page-helper";
import { BigImageFrameManager } from "./ui/ultra-image-frame-manager";
import revertMonkeyPatch from "./utils/revert-monkey-patch";

type DestoryFunc = () => void;

function main(MATCHER: Matcher): DestoryFunc {
  const HTML = createHTML();
  [HTML.fullViewGrid, HTML.bigImageFrame].forEach(e => revertMonkeyPatch(e));
  const IFQ: IMGFetcherQueue = IMGFetcherQueue.newQueue();
  const IL: IdleLoader = new IdleLoader(IFQ);
  const BIFM: BigImageFrameManager = new BigImageFrameManager(HTML, IFQ);
  const FVGM: FullViewGridManager = new FullViewGridManager(HTML, IFQ);
  const PF: PageFetcher = new PageFetcher(IFQ, MATCHER);
  const DL: Downloader = new Downloader(HTML, IFQ, IL, PF, MATCHER);
  const PH: PageHelper = new PageHelper(HTML);

  const events = initEvents(HTML, BIFM, FVGM, IFQ, PF, IL, PH);
  addEventListeners(events, HTML, BIFM, IFQ, DL);

  EBUS.subscribe("downloader-canvas-on-click", (index) => {
    IFQ.currIndex = index;
    BIFM.show();
  });

  EBUS.subscribe("pf-on-appended", (total, _ifs, done) => {
    PH.setPageState({ total: `${total}${done ? "" : ".."}` });
    setTimeout(() => FVGM.renderCurrView(), 200);
  });

  EBUS.subscribe("imf-set-now", (index) => {
    if (!BIFM.visible) return;
    let scrollTo = IFQ[index].node.root!.offsetTop - window.screen.availHeight / 3;
    scrollTo = scrollTo <= 0 ? 0 : scrollTo >= HTML.fullViewGrid.scrollHeight ? HTML.fullViewGrid.scrollHeight : scrollTo;
    if (HTML.fullViewGrid.scrollTo.toString().includes("[native code]")) {
      HTML.fullViewGrid.scrollTo({ top: scrollTo, behavior: "smooth" });
    } else {
      HTML.fullViewGrid.scrollTop = scrollTo;
    }
  });

  PF.beforeInit = () => HTML.pageLoading.style.display = "flex";
  PF.afterInit = () => {
    HTML.pageLoading.style.display = "none";
    IL.lockVer++;
    IL.processingIndexList = [0];
    IL.start(IL.lockVer)
  };

  if (conf["first"]) {
    events.showGuideEvent();
    conf["first"] = false;
    saveConf(conf);
  }

  return () => {
    console.log("destory eh-view-enhance");
    HTML.root.remove();
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
