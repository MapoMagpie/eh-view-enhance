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
  autoCollapsePanels: boolean,
  /** 最小化控制栏 */
  minifyPageHelper: "always" | "inBigMode" | "never",
  /** 键盘自定义 */
  keyboards: {
    inBigImageMode: { [key in KeyboardInBigImageModeId]?: string[] },
    inFullViewGrid: { [key in KeyboardInFullViewGridId]?: string[] },
    inMain: { [key in KeyboardInMainId]?: string[] },
  }
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
    restartIdleLoader: 5000,
    threads: 3,
    downloadThreads: 3,
    timeout: 40,
    version: "4.1.10",
    debug: true,
    first: true,
    reversePages: false,
    pageHelperAbTop: "unset",
    pageHelperAbLeft: "20px",
    pageHelperAbBottom: "20px",
    pageHelperAbRight: "unset",
    imgScale: 0,
    stickyMouse: "enable",
    autoPageInterval: 10000,
    autoPlay: false,
    filenameTemplate: "{number}-{title}",
    preventScrollPageTime: 200,
    archiveVolumeSize: 1500,
    convertTo: "GIF",
    autoCollapsePanels: true,
    minifyPageHelper: "inBigMode",
    keyboards: { inBigImageMode: {}, inFullViewGrid: {}, inMain: {} }
  };
}

export const VERSION = "4.1.10";
export const signal = { first: true };

const CONFIG_KEY = "ehvh_cfg_";
function getConf(): Config {
  let cfgStr = GM_getValue<string>(CONFIG_KEY);
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

function confHealthCheck($conf: Config): Config {
  let changed = false;
  // check postions
  if ($conf.pageHelperAbTop !== "unset") {
    $conf.pageHelperAbTop = Math.max(parseInt($conf.pageHelperAbTop), 500) + "px";
    changed = true;
  }
  if ($conf.pageHelperAbBottom !== "unset") {
    $conf.pageHelperAbBottom = Math.max(parseInt($conf.pageHelperAbBottom), 5) + "px";
    changed = true;
  }
  if ($conf.pageHelperAbLeft !== "unset") {
    $conf.pageHelperAbLeft = Math.max(parseInt($conf.pageHelperAbLeft), 5) + "px";
    changed = true;
  }
  if ($conf.pageHelperAbRight !== "unset") {
    $conf.pageHelperAbRight = Math.max(parseInt($conf.pageHelperAbRight), 5) + "px";
    changed = true;
  }
  if ($conf.archiveVolumeSize === undefined) {
    $conf.archiveVolumeSize = 1500;
    changed = true;
  }
  if ($conf.convertTo === undefined) {
    $conf.convertTo = "GIF";
    changed = true;
  }
  if ($conf.autoCollapsePanels === undefined) {
    $conf.autoCollapsePanels = true;
    changed = true;
  }
  if ($conf.minifyPageHelper === undefined) {
    $conf.minifyPageHelper = "inBigMode";
    changed = true;
  }
  if ($conf.restartIdleLoader === 8000) {
    $conf.restartIdleLoader = 5000;
    changed = true;
  }
  if ($conf.keyboards === undefined) {
    $conf.keyboards = { inBigImageMode: {}, inFullViewGrid: {}, inMain: {} };
    changed = true;
  }
  if (changed) {
    saveConf($conf);
  }
  return $conf;
}

export function saveConf(c: Config) {
  GM_setValue(CONFIG_KEY, JSON.stringify(c));
}
export type ConfigNumberType = "colCount" | "threads" | "downloadThreads" | "timeout" | "autoPageInterval" | "preventScrollPageTime";
export const ConfigNumberKeys: (keyof Config)[] = ["colCount", "threads", "downloadThreads", "timeout", "autoPageInterval", "preventScrollPageTime"];
export type ConfigBooleanType = "fetchOriginal" | "autoLoad" | "reversePages" | "autoPlay" | "autoCollapsePanels";
export const ConfigBooleanKeys: (keyof Config)[] = ["fetchOriginal", "autoLoad", "reversePages", "autoPlay", "autoCollapsePanels"];
export type ConfigSelectType = "readMode" | "stickyMouse" | "minifyPageHelper";
export const ConfigSelectKeys: (keyof Config)[] = ["readMode", "stickyMouse", "minifyPageHelper"];
export const conf = getConf();
