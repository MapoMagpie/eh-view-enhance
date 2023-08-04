export type Config = {
  backgroundImage: string
  /** 每行显示的数量 */
  colCount: number,
  /** 滚动换页 */
  consecutiveMode: boolean,
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
  /** 禁用下载功能 */
  disableDownload: boolean,
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
};

function defaultConf(): Config {
  const screenWidth = window.screen.width;
  const colCount = screenWidth > 2500 ? 8 : screenWidth > 1900 ? 7 : 5;
  return {
    backgroundImage: `data:image/png;base64,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`,
    colCount: colCount,
    consecutiveMode: false,
    autoLoad: true,
    fetchOriginal: false,
    restartIdleLoader: 8000,
    threads: 3,
    downloadThreads: 3,
    timeout: 16,
    version: "4.0.1",
    debug: true,
    first: true,
    disableDownload: false,
    reversePages: false,
    pageHelperAbTop: "unset",
    pageHelperAbLeft: "unset",
    pageHelperAbBottom: "50px",
    pageHelperAbRight: "50px",
  };
}

export const VERSION = "4.0.1";
export const signal = { first: true };

function getConf(): Config {
  let confStr = window.localStorage.getItem("cfg_");
  if (confStr) {
    let conf: Config = JSON.parse(confStr);
    if (conf.version === VERSION) {
      return conf;
    }
  }
  let conf = defaultConf();
  window.localStorage.setItem("cfg_", JSON.stringify(conf));
  return conf;
}
export type ConfigNumberType = "colCount" | "threads" | "downloadThreads" | "timeout";
export const ConfigNumberKeys: (keyof Config)[] = ["colCount", "threads", "downloadThreads", "timeout"];
export type ConfigBooleanType = "fetchOriginal" | "autoLoad" | "consecutiveMode" | "reversePages";
export const ConfigBooleanKeys: (keyof Config)[] = ["fetchOriginal", "autoLoad", "consecutiveMode", "reversePages"];
export const conf = getConf();
