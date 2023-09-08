const lang = navigator.language;
const i18nIndex = lang === "zh-CN" ? 1 : 0;
class I18nValue extends Array<string> {
  constructor(...value: string[]) {
    super(...value);
  }
  get() {
    return this[i18nIndex];
  }
}
export const i18n = {
  imageScale: new I18nValue("SCALE", "缩放"),
  download: new I18nValue("DL", "下载"),
  config: new I18nValue("CONF", "配置"),
  autoPagePlay: new I18nValue("PLAY", "播放"),
  autoPagePause: new I18nValue("PAUSE", "暂停"),
  autoPlay: new I18nValue("Auto Page", "自动翻页"),
  autoPlayTooltip: new I18nValue("Auto Page when entering the big image readmode.", "当阅读大图时，开启自动播放模式。"),
  collapse: new I18nValue("FOLD", "收起"),
  columns: new I18nValue("Columns", "每行数量"),
  readMode: new I18nValue("Read Mode", "阅读模式"),
  autoPageInterval: new I18nValue("Auto Page Interval", "自动翻页间隔"),
  autoPageIntervalTooltip: new I18nValue("Use the mouse wheel on Input box to adjust the interval time.", "在输入框上使用鼠标滚轮快速修改间隔时间"),
  readModeTooltip: new I18nValue("Switch to the next picture when scrolling, otherwise read continuously", "滚动时切换到下一张图片，否则连续阅读"),
  maxPreloadThreads: new I18nValue("PreloadThreads", "最大同时加载"),
  maxPreloadThreadsTooltip: new I18nValue("Max Preload Threads", "大图浏览时，每次滚动到下一张时，预加载的图片数量，大于1时体现为越看加载的图片越多，将提升浏览体验。"),
  maxDownloadThreads: new I18nValue("DonloadThreads", "最大同时下载"),
  maxDownloadThreadsTooltip: new I18nValue("Max Download Threads, suggest: <5", "下载模式下，同时加载的图片数量，建议小于等于5"),
  timeout: new I18nValue("Timeout(second)", "超时时间(秒)"),
  bestQuality: new I18nValue("RawImage", "最佳质量"),
  autoLoad: new I18nValue("AutoLoad", "自动加载"),
  autoLoadTooltip: new I18nValue("", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"),
  bestQualityTooltip: new I18nValue("enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"),
  forceDownload: new I18nValue("Take Loaded", "强制下载已加载的"),
  startDownload: new I18nValue("Start Download", "开始下载"),
  downloading: new I18nValue("Downloading...", "下载中..."),
  downloaded: new I18nValue("Downloaded", "下载完成"),
  reversePages: new I18nValue("Reverse Pages", "反向翻页"),
  reversePagesTooltip: new I18nValue("Clicking on the side navigation, if enable then reverse paging, which is a reading style similar to Japanese manga where pages are read from right to left.", "点击侧边导航时，是否反向翻页，反向翻页类似日本漫画那样的从右到左的阅读方式。"),
  stickyMouse: new I18nValue("Sticky Mouse", "黏糊糊鼠标"),
  stickyMouseTooltip: new I18nValue("In non-continuous reading mode, scroll a single image automatically by moving the mouse.", "非连续阅读模式下，通过鼠标移动来自动滚动单张图片。"),
  dragToMove: new I18nValue("Drag to Move", "拖动移动"),
  originalCheck: new I18nValue("<a class='clickable' style='color:gray;'>Enable RawImage Transient</a>", "未启用最佳质量图片，点击此处<a class='clickable' style='color:gray;'>临时开启最佳质量</a>"),
  help: new I18nValue(`
    <h1>GUIDE:</h1>
    <ol>
      <li>Before use this script，make sure gallery switch to <a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Large</a> mode</li>
      <li>Click bottom right corner<span style="background-color: gray;">&lessdot;📖&gtdot;</span>，enter into viewer mode</li>
      <li>Just a moment，All of thumbnail images exhibited in grid，<strong style="color: red;">click</strong> one of thumbnail images, into big image mode</li>
      <li><strong style="color: orange">Image quality:</strong>level 1、thumbnail； level 2、compressed image； level 3、original image；<br>
        In default config，auto load compressed image，with low traffic consumption with good clarity。also you can enable best quality in config plane, This increases the consumption of traffic and browsing quotas。
      </li>
      <li><strong style="color: orange">Big image:</strong>click thumbnail image, into big image mode, use mouse wheel switch to next or prev</li>
      <li><strong style="color: orange">Keyboard:</strong>
      <table>
      <tr><td>Scale Image</td><td>mouse right + wheel or -/=</td></tr>
      <tr><td>Open  Image(In thumbnails)</td><td>Enter</td></tr>
      <tr><td>Exit  Image(In big mode)</td><td>Enter/Esc</td></tr>
      <tr><td>Open Specific Page(In thumbnails)</td><td>Input number(no echo) + Enter</td></tr>
      <tr><td>Switch Page</td><td>→/←</td></tr>
      <tr><td>Scroll Image</td><td>↑/↓/Space</td></tr>
      </table>
      </li>
      <li><strong style="color: orange">Download:</strong>click download button，popup download plane，the loading status of all images is indicated by small squares.</li>
      <li><strong style="color: orange">Feedback:</strong>
        Click 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance/issues" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-issue-opened" aria-label="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        to provide feedback on issues, Give me a star if you like this script.
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `, `
    <h1>操作说明:</h1>
    <ol>
      <li>在使用本脚本浏览前，请务必切换为<a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Large|大图</a>模式</li>
      <li>点击右下角<span style="background-color: gray;">&lessdot;📖&gtdot;</span>展开，进入阅读模式</li>
      <li>稍等片刻后，缩略图会全屏陈列在页面上，<strong style="color: red;">点击</strong>某一缩略图进入大图浏览模式</li>
      <li><strong style="color: orange">图片质量:</strong>图片质量有三档，1、原始的缩略图(最模糊)；2、E绅士的压缩图；3、原图；<br>
        默认配置下，脚本会自动加载压缩图，这也是E绅士默认的浏览行为，具有较小的流量消耗与良好的清晰度。也可以在配置中启用最佳质量，脚本会加载原图，这会增加流量与浏览配额的消耗。
      </li>
      <li><strong style="color: orange">大图展示:</strong>点击缩略图，可以展开大图，在大图上滚动切换上一张下一张图片</li>
      <li><strong style="color: orange">键盘操作:</strong>
      <table>
      <tr><td>图片缩放</td><td>鼠标右键+滚轮 或 -/=</td></tr>
      <tr><td>打开大图(缩略图模式下)</td><td>回车</td></tr>
      <tr><td>退出大图(大图模式下)</td><td>回车/Esc</td></tr>
      <tr><td>打开指定图片(缩略图模式下)</td><td>直接输入数字(不回显) + 回车</td></tr>
      <tr><td>切换图片</td><td>→/←</td></tr>
      <tr><td>滚动图片</td><td>↑/↓</td></tr>
      </table>
      </li>
      <li><strong style="color: orange">下载功能:</strong>右下角点击下载按钮，弹出下载面板，内部通过小方块展示了所有图片的加载状态，点击开始下载按钮后，会加快图片加载效率并在所有图片加载完成后进行下载。 </li>
      <li><strong style="color: orange">问题反馈:</strong>
        点击 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance/issues" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-issue-opened" aria-label="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        反馈你的问题或建议，如果你喜欢这个脚本，给我一个star吧。 
        <span>
        <a style="color: black;" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `)
};
