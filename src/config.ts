import { GM_getValue, GM_setValue } from "$";
import { KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "./ui/event";

export type Oriented = "prev" | "next";

export type Config = {
  backgroundImage: string
  /** 每行显示的数量 */
  colCount: number,
  /** 滚动换页 */
  readMode: "singlePage" | "consecutively",
  /** 是否启用空闲加载器 */
  autoLoad: boolean,
  /** 是否获取最佳质量的图片 */
  fetchOriginal: boolean,
  /** 中止空闲加载器后的重新启动时间 */
  restartIdleLoader: number,
  /** 同时加载的图片数量 */
  threads: number,
  /** 同时下载的图片数量 */
  downloadThreads: number,
  /** 超时时间(秒)，默认16秒 */
  timeout: number,
  /** 配置版本 */
  version: string,
  /** 是否打印控制台日志 */
  debug: boolean,
  /** 是否初次使用脚本 */
  first: boolean,
  /** 逆转左右翻页，无论使用那种翻页方式，上下侧都代表上下 */
  reversePages: boolean
  /** 页码指示器位置 */
  pageHelperAbTop: string
  /** 页码指示器位置 */
  pageHelperAbLeft: string
  /** 页码指示器位置 */
  pageHelperAbBottom: string
  /** 页码指示器位置 */
  pageHelperAbRight: string
  /** 图片缩放比例 eg: 80, means 80% */
  imgScale: number
  /** 图片缩放比例 */
  stickyMouse: "enable" | "disable" | "reverse"
  /** 自动翻页间隔 */
  autoPageInterval: number
  /** 自动开始 */
  autoPlay: boolean
  /** 图片名模板 */
  filenameTemplate: string
  /** 阻止滚动翻页时间 */
  preventScrollPageTime: number
  /** 下载文件分卷大小，单位Mib */
  archiveVolumeSize: number
  /** 动图转换为 */
  convertTo: "GIF" | "MP4"
  /** 自动收起控制面板 */
  autoCollapsePanel: boolean,
  /** 最小化控制栏 */
  minifyPageHelper: "always" | "inBigMode" | "never",
  /** 键盘自定义 */
  keyboards: {
    inBigImageMode: { [key in KeyboardInBigImageModeId]?: string[] },
    inFullViewGrid: { [key in KeyboardInFullViewGridId]?: string[] },
    inMain: { [key in KeyboardInMainId]?: string[] },
  },
  excludeURLs: string[]
  /** is video muted? */
  muted?: boolean,
  /** video volume, min 0, max 100 */
  volume?: number,
  /** disable css animation */
  disableCssAnimation: boolean,
  /** the feature of `multiple chapters` is enabled in a site */
  mcInSites: string[],
  /** keep the small thumbnail in full view grid, do not change src to original, it will improve the performance */
  // keepSmallThumbnail: boolean
};

function defaultConf(): Config {
  const screenWidth = window.screen.width;
  const colCount = screenWidth > 2500 ? 7 : screenWidth > 1900 ? 6 : 5;
  return {
    backgroundImage: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAfElEQVR42mP8z/CfCgIwDEgwAIAL0Fq3MDD5iQcn0/BgDpDAn0/AvywA4kUEZ7gUkXBoAM5gUQUaJ6eClOyBjALcAAAAASUVORK5CYII=`,
    colCount: colCount,
    readMode: "singlePage",
    autoLoad: true,
    fetchOriginal: false,
    restartIdleLoader: 2000,
    threads: 3,
    downloadThreads: 4,
    timeout: 10,
    version: VERSION,
    debug: true,
    first: true,
    reversePages: false,
    pageHelperAbTop: "unset",
    pageHelperAbLeft: "20px",
    pageHelperAbBottom: "20px",
    pageHelperAbRight: "unset",
    imgScale: 0,
    stickyMouse: "disable",
    autoPageInterval: 5000,
    autoPlay: false,
    filenameTemplate: "{number}-{title}",
    preventScrollPageTime: 100,
    archiveVolumeSize: 1200,
    convertTo: "GIF",
    autoCollapsePanel: true,
    minifyPageHelper: "inBigMode",
    keyboards: { inBigImageMode: {}, inFullViewGrid: {}, inMain: {} },
    excludeURLs: [],
    muted: false,
    volume: 50,
    disableCssAnimation: true,
    mcInSites: ["18comic"],
    // keepSmallThumbnail: true,
  };
}

export const VERSION = "4.4.0";
export const signal = { first: true };

const CONFIG_KEY = "ehvh_cfg_";

function getStorageMethod() {
  if (typeof GM_getValue === 'function' && typeof GM_setValue === 'function') {
    // Greasemonkey or Tampermonkey API
    return {
      setItem: (key: string, value: string) => GM_setValue(key, value),
      getItem: (key: string): string | null => GM_getValue<string>(key),
    };
  } else if (typeof localStorage !== 'undefined') {
    // Web Storage API
    return {
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      getItem: (key: string): string | null => localStorage.getItem(key),
    };
  } else {
    // No supported API
    throw new Error('No supported storage method found');
  }
}

const storage = getStorageMethod();

function getConf(): Config {
  let cfgStr = storage.getItem(CONFIG_KEY);
  if (cfgStr) {
    let cfg: Config = JSON.parse(cfgStr);
    if (cfg.version === VERSION) {
      return confHealthCheck(cfg);
    }
  }
  let cfg = defaultConf();
  saveConf(cfg);
  return cfg;
}

function confHealthCheck(cf: Config): Config {
  let changed = false;
  // check config keys and values undefined
  const defa = defaultConf();
  const keys = Object.keys(defa) as (keyof Config)[];
  keys.forEach((key) => {
    if (cf[key] === undefined) {
      (cf[key] as any) = defa[key];
      changed = true;
    }
  });
  (["pageHelperAbTop", "pageHelperAbLeft", "pageHelperAbBottom", "pageHelperAbRight"] as (keyof Config)[]).forEach((key) => {
    if ((cf[key]) !== "unset") {
      let pos = parseInt(cf[key] as string);
      const screenLimit = key.endsWith("Right") || key.endsWith("Left") ? window.screen.width : window.screen.height;
      if (isNaN(pos) || pos < 5 || pos > screenLimit) {
        (cf[key] as any) = 5 + "px";
        changed = true;
      }
    }
  })
  if (changed) {
    saveConf(cf);
  }
  return cf;
}

export function saveConf(c: Config) {
  storage.setItem(CONFIG_KEY, JSON.stringify(c));
}
export type ConfigNumberType = "colCount" | "threads" | "downloadThreads" | "timeout" | "autoPageInterval" | "preventScrollPageTime";
export const ConfigNumberKeys: (keyof Config)[] = ["colCount", "threads", "downloadThreads", "timeout", "autoPageInterval", "preventScrollPageTime"];
export type ConfigBooleanType = "fetchOriginal" | "autoLoad" | "reversePages" | "autoPlay" | "autoCollapsePanel" | "disableCssAnimation"; /*| "keepSmallThumbnail" */;
export const ConfigBooleanKeys: (keyof Config)[] = ["fetchOriginal", "autoLoad", "reversePages", "autoPlay", "autoCollapsePanel", "disableCssAnimation", /*"keepSmallThumbnail" */];
export type ConfigSelectType = "readMode" | "stickyMouse" | "minifyPageHelper";
export const ConfigSelectKeys: (keyof Config)[] = ["readMode", "stickyMouse", "minifyPageHelper"];
export const conf = getConf();
