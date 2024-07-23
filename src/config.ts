import { GM_getValue, GM_setValue } from "$";
import { KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "./ui/event";
import { uuid } from "./utils/random";

export type Oriented = "prev" | "next";

export type SiteProfile = {
  disable: boolean,
  disableAutoOpen: boolean,
  workURLs: string[],
}

export type Config = {
  backgroundImage: string
  /** 每行显示的数量 */
  colCount: number,
  /** 滚动换页 */
  readMode: "pagination" | "continuous",
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
  autoPageSpeed: number
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
  siteProfiles: Record<string, SiteProfile>,
  /** Is video muted? */
  muted?: boolean,
  /** Video volume, min 0, max 100 */
  volume?: number,
  /** The feature of `multiple chapters` is enabled in a site */
  mcInSites: string[],
  /**  */
  paginationIMGCount: number,
  hitomiFormat: "auto" | "jxl" | "avif" | "webp",
  /** Automatically open after the page is loaded */
  autoOpen: boolean,
  /** Keep auto-loading after the tab loses focus */
  autoLoadInBackground: boolean,
  /** Reverse order for post with multiple images attatched */
  reverseMultipleImagesPost: boolean,
  /** Many galleries have both an English/Romanized title and a title in Japanese script. Which gallery name would you like as archive filename?  */
  ehentaiTitlePrefer: "english" | "japanese",
  /** Custom key scrolling speed */
  scrollingSpeed: number,
  id: string,
  /** modify some config items by patch */
  configPatchVersion: number,
};

function defaultConf(): Config {
  const screenWidth = window.screen.width;
  const colCount = screenWidth > 2500 ? 7 : screenWidth > 1900 ? 6 : 5;
  return {
    backgroundImage: `TBD`,
    colCount: colCount,
    readMode: "pagination",
    autoLoad: true,
    fetchOriginal: false,
    restartIdleLoader: 2000,
    threads: 3,
    downloadThreads: 4,
    timeout: 10,
    version: CONF_VERSION,
    debug: true,
    first: true,
    reversePages: false,
    pageHelperAbTop: "unset",
    pageHelperAbLeft: "20px",
    pageHelperAbBottom: "20px",
    pageHelperAbRight: "unset",
    imgScale: 100,
    stickyMouse: "disable",
    autoPageSpeed: 5, // pagination readmode = 5, continuous readmode = 1
    autoPlay: false,
    filenameTemplate: "{number}-{title}",
    preventScrollPageTime: 100,
    archiveVolumeSize: 1200,
    convertTo: "GIF",
    autoCollapsePanel: true,
    minifyPageHelper: "inBigMode",
    keyboards: { inBigImageMode: {}, inFullViewGrid: {}, inMain: {} },
    siteProfiles: {},
    muted: false,
    volume: 50,
    mcInSites: ["18comic"],
    paginationIMGCount: 1,
    hitomiFormat: "auto",
    autoOpen: false,
    autoLoadInBackground: true,
    reverseMultipleImagesPost: true,
    ehentaiTitlePrefer: "japanese",
    scrollingSpeed: 30,
    id: uuid(),
    configPatchVersion: 0,
  };
}

const CONF_VERSION = "4.4.0";
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
    if (cfg.version === CONF_VERSION) {
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
  const defaKeys = Object.keys(defa) as (keyof Config)[];
  defaKeys.forEach((key) => {
    if (cf[key] === undefined) {
      (cf[key] as any) = defa[key];
      changed = true;
    }
  });
  // delete invalid keys
  const cfKeys = Object.keys(cf) as (keyof Config)[];
  for (const k of cfKeys) {
    if (!defaKeys.includes(k)) {
      delete cf[k];
      changed = true;
    }
  }
  (["pageHelperAbTop", "pageHelperAbLeft", "pageHelperAbBottom", "pageHelperAbRight"] as (keyof Config)[]).forEach((key) => {
    if ((cf[key]) !== "unset") {
      let pos = parseInt(cf[key] as string);
      const screenLimit = key.endsWith("Right") || key.endsWith("Left") ? window.screen.width : window.screen.height;
      if (isNaN(pos) || pos < 5 || pos > screenLimit) {
        (cf[key] as any) = 5 + "px";
        changed = true;
      }
    }
  });
  // check enum
  if (!["pagination", "continuous"].includes(cf.readMode)) {
    cf.readMode = "pagination";
    changed = true;
  }
  const newCf = patchConfig(cf, PATCH_CONFIG);
  if (newCf) {
    cf = newCf;
    changed = true;
  }
  if (changed) {
    saveConf(cf);
  }
  return cf;
}

const PATCH_CONFIG: Partial<Config> = {
  autoOpen: false,
  siteProfiles: {},
}
const CONFIG_PATCH_VERSION = 5;
function patchConfig(cf: Config, patch: Partial<Config>): Config | null {
  if (cf.configPatchVersion === CONFIG_PATCH_VERSION) {
    return null;
  }
  cf.configPatchVersion = CONFIG_PATCH_VERSION;
  return { ...cf, ...patch };
}

export function saveConf(c: Config) {
  storage.setItem(CONFIG_KEY, JSON.stringify(c));
}

export type ConfigNumberType = "colCount" | "threads" | "downloadThreads" | "timeout" | "autoPageSpeed" | "preventScrollPageTime" | "paginationIMGCount" | "scrollingSpeed";
export type ConfigBooleanType = "fetchOriginal" | "autoLoad" | "reversePages" | "autoPlay" | "autoCollapsePanel" | "autoOpen" | "autoLoadInBackground" | "reverseMultipleImagesPost";
export type ConfigSelectType = "readMode" | "stickyMouse" | "minifyPageHelper" | "hitomiFormat" | "ehentaiTitlePrefer";
export const conf = getConf();

type OptionValue = {
  value: string;
  display: string;
}

export type ConfigItem = {
  key: ConfigNumberType | ConfigBooleanType | ConfigSelectType;
  typ: "boolean" | "number" | "select";
  i18nKey?: string;
  options?: OptionValue[];
  gridColumnRange?: [number, number];
  displayInSite?: RegExp;
}

export const ConfigItems: ConfigItem[] = [
  { key: "colCount", typ: "number" },
  { key: "threads", typ: "number" },
  { key: "downloadThreads", typ: "number" },
  { key: "paginationIMGCount", typ: "number" },
  { key: "timeout", typ: "number" },
  { key: "preventScrollPageTime", typ: "number" },
  { key: "autoPageSpeed", typ: "number" },
  { key: "scrollingSpeed", typ: "number" },
  { key: "fetchOriginal", typ: "boolean", gridColumnRange: [1, 6] },
  { key: "autoLoad", typ: "boolean", gridColumnRange: [6, 11] },
  { key: "reversePages", typ: "boolean", gridColumnRange: [1, 6] },
  { key: "autoPlay", typ: "boolean", gridColumnRange: [6, 11] },
  { key: "autoLoadInBackground", typ: "boolean", gridColumnRange: [1, 6] },
  { key: "autoOpen", typ: "boolean", gridColumnRange: [6, 11] },
  { key: "autoCollapsePanel", typ: "boolean", gridColumnRange: [1, 11] },
  {
    key: "readMode", typ: "select", options: [
      { value: "pagination", display: "Pagination" },
      { value: "continuous", display: "Continuous" },
    ]
  },
  {
    key: "stickyMouse", typ: "select", options: [
      { value: "enable", display: "Enable" },
      { value: "reverse", display: "Reverse" },
      { value: "disable", display: "Disable" },
    ]
  },
  {
    key: "minifyPageHelper", typ: "select", options: [
      { value: "always", display: "Always" },
      { value: "inBigMode", display: "InBigMode" },
      { value: "never", display: "Never" },
    ]
  },
  { key: "reverseMultipleImagesPost", typ: "boolean", gridColumnRange: [1, 11], displayInSite: /(x.com|twitter.com)\// },
  {
    key: "hitomiFormat", typ: "select", options: [
      { value: "auto", display: "Auto" },
      { value: "avif", display: "Avif" },
      { value: "webp", display: "Webp" },
      { value: "jxl", display: "Jxl" },
    ], displayInSite: /hitomi.la\//
  },
  {
    key: "ehentaiTitlePrefer", typ: "select", options: [
      { value: "english", display: "English" },
      { value: "japanese", display: "Japanese" },
    ], displayInSite: /e[-x]hentai(.*)?.(org|onion)\//
  },
];

