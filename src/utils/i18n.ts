import { KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "../ui/event";

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
type KeyboardCustom = {
  inMain: Record<KeyboardInMainId, I18nValue>;
  inFullViewGrid: Record<KeyboardInFullViewGridId, I18nValue>;
  inBigImageMode: Record<KeyboardInBigImageModeId, I18nValue>;
}
const keyboardCustom: KeyboardCustom = {
  inMain: {
    "open-full-view-grid": new I18nValue("Enter Read Mode", "进入阅读模式"),
  },
  inBigImageMode: {
    "step-image-prev": new I18nValue("Go Prev Image", "切换到上一张图片"),
    "step-image-next": new I18nValue("Go Next Image", "切换到下一张图片"),
    "exit-big-image-mode": new I18nValue("Exit Big Image Mode", "退出大图模式"),
    "step-to-first-image": new I18nValue("Go First Image", "跳转到第一张图片"),
    "step-to-last-image": new I18nValue("Go Last Image", "跳转到最后一张图片"),
    "scale-image-increase": new I18nValue("Increase Image Scale", "放大图片"),
    "scale-image-decrease": new I18nValue("Decrease Image Scale", "缩小图片"),
    "scroll-image-up": new I18nValue("Scroll Image Up", "向上滚动图片"),
    "scroll-image-down": new I18nValue("Scroll Image Down", "向下滚动图片"),
  },
  inFullViewGrid: {
    "open-big-image-mode": new I18nValue("Enter Big Image Mode", "进入大图阅读模式"),
    "pause-auto-load-temporarily": new I18nValue("Pause Auto Load Temporarily", "临时停止自动加载"),
    "exit-full-view-grid": new I18nValue("Exit Read Mode", "退出阅读模式"),
    "columns-increase": new I18nValue("Increase Columns ", "增加每行数量"),
    "columns-decrease": new I18nValue("Decrease Columns ", "减少每行数量")
  },
}
export const i18n = {
  imageScale: new I18nValue("SCALE", "缩放"),
  download: new I18nValue("DL", "下载"),
  config: new I18nValue("CONF", "配置"),
  autoPagePlay: new I18nValue("PLAY", "播放"),
  autoPagePause: new I18nValue("PAUSE", "暂停"),
  autoPlay: new I18nValue("Auto Page", "自动翻页"),
  autoPlayTooltip: new I18nValue("Auto Page when entering the big image readmode.", "当阅读大图时，开启自动播放模式。"),
  preventScrollPageTime: new I18nValue("Flip Page Time", "滚动翻页时间"),
  preventScrollPageTimeTooltip: new I18nValue("In Read Mode:Single Page, when scrolling through the content, prevent immediate page flipping when reaching the bottom, improve the reading experience. Set to 0 to disable this feature, measured in milliseconds.", "在单页阅读模式下，滚动浏览时，阻止滚动到底部时立即翻页，提升阅读体验。设置为0时则为禁用此功能，单位为毫秒。"),
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
  bestQuality: new I18nValue("Raw Image", "最佳质量"),
  autoLoad: new I18nValue("Auto Load", "自动加载"),
  autoLoadTooltip: new I18nValue("", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"),
  bestQualityTooltip: new I18nValue("enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"),
  forceDownload: new I18nValue("Take Loaded", "强制下载已加载的"),
  downloadStart: new I18nValue("Start Download", "开始下载"),
  downloading: new I18nValue("Downloading...", "下载中..."),
  downloadFailed: new I18nValue("Failed(Retry)", "下载失败(重试)"),
  downloaded: new I18nValue("Downloaded", "下载完成"),
  packaging: new I18nValue("Packaging...", "打包中..."),
  reversePages: new I18nValue("Reverse Pages", "反向翻页"),
  reversePagesTooltip: new I18nValue("Clicking on the side navigation, if enable then reverse paging, which is a reading style similar to Japanese manga where pages are read from right to left.", "点击侧边导航时，是否反向翻页，反向翻页类似日本漫画那样的从右到左的阅读方式。"),
  autoCollapsePanels: new I18nValue("Auto Flod Control Panels", "自动收起控制面板"),
  autoCollapsePanelsTooltip: new I18nValue("When the mouse is moved out of the control panel, the control panel will automatically fold. If disabled, the display of the control panel can only be toggled through the button on the control bar.", "当鼠标移出控制面板时，自动收起控制面板。禁用此选项后，只能通过控制栏上的按钮切换控制面板的显示。"),
  stickyMouse: new I18nValue("Sticky Mouse", "黏糊糊鼠标"),
  stickyMouseTooltip: new I18nValue("In non-continuous reading mode, scroll a single image automatically by moving the mouse.", "非连续阅读模式下，通过鼠标移动来自动滚动单张图片。"),
  minifyPageHelper: new I18nValue("Minify Control Bar", "最小化控制栏"),
  minifyPageHelperTooltip: new I18nValue("Minify Control Bar", "最小化控制栏"),
  dragToMove: new I18nValue("Drag to Move", "拖动移动"),
  originalCheck: new I18nValue("<a class='clickable' style='color:gray;'>Enable RawImage Transient</a>", "未启用最佳质量图片，点击此处<a class='clickable' style='color:gray;'>临时开启最佳质量</a>"),
  help: new I18nValue(`
    <h1>GUIDE:</h1>
    <ol>
      <li>If you are browsing E-Hentai, please click <a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">Here</a> to switch to Lager thumbnail mode for clearer thumbnails. (need login e-hentai)</li>
      <li>Click <span style="background-color: gray;">&lessdot;📖&gtdot;</span> from left-bottom corner, entry reading.</li>
      <li>Just a monment, all thumbnail will exhibited in grid, <strong style="color: red;">click</strong> one of thumbnails into big image mode.</li>
      <li><strong style="color: orange">Image quality:</strong>For e-hentai，you can enable control-bar > CONF > Image Raw, which will directly download the uploaded original uncompressed images, but it will consume more quotas. Generally, the compressed files provided by E-Hentai are already clear enough.</li>
      <li><strong style="color: orange">Big image:</strong>click thumbnail image, into big image mode, use mouse wheel switch to next or prev</li>
      <li><strong style="color: orange">Keyboard:</strong>
        <table>
          <tr><td>Scale Image</td><td>mouse right + wheel or -/=</td></tr>
          <tr><td>Open  Image(In thumbnails)</td><td>Enter</td></tr>
          <tr><td>Exit  Image(In big mode)</td><td>Enter/Esc</td></tr>
          <tr><td>Open Specific Page(In thumbnails)</td><td>Input number(no echo) + Enter</td></tr>
          <tr><td>Switch Page</td><td>→/←</td></tr>
          <tr><td>Scroll Image</td><td>↑/↓/Space</td></tr>
          <tr><td>Toggle Auto Load</td><td>p</td></tr>
        </table>
      </li>
      <li><strong style="color: orange">Download:</strong>You can click on the download button in the download panel to quickly load all the images. You can still continue browsing the images. Downloading and viewing large images are integrated, and you can click on Download Loaded in the download panel to save the images at any time.</li>
      <li><strong style="color: orange">Feedback:</strong>
        Click 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance/issues" target="_blank" alt="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        to provide feedback on issues, Give me a star if you like this script.
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank" alt="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `, `
    <h1>操作说明:</h1>
    <ol>
      <li>如果你正在浏览E绅士，请点击<a style="color: red" id="renamelink" href="${window.location.href}?inline_set=ts_l">此处</a>切换到Lager缩略图模式，以获取更清晰的缩略图。</li>
      <li>点击左下角 <span style="background-color: gray;">&lessdot;📖&gtdot;</span> 展开，进入阅读模式。</li>
      <li>稍等片刻后，缩略图会全屏陈列在页面上，<strong style="color: red;">点击</strong>某一缩略图进入大图浏览模式。</li>
      <li><strong style="color: orange">图片质量:</strong>图片质量: 对于E绅士，你可以在控制栏>配置，启用原图模式，这将直接下载上传原档未压缩的图片，但会消耗更多的配额。一般来说E绅士默认提供的压缩档已经足够清晰。</li>
      <li><strong style="color: orange">大图展示:</strong>点击缩略图，可以展开大图，在大图上滚动切换上一张下一张图片</li>
      <li><strong style="color: orange">键盘操作:</strong>
        <table>
          <tr><td>图片缩放</td><td>鼠标右键+滚轮 或 -/=</td></tr>
          <tr><td>打开大图(缩略图模式下)</td><td>回车</td></tr>
          <tr><td>退出大图(大图模式下)</td><td>回车/Esc</td></tr>
          <tr><td>打开指定图片(缩略图模式下)</td><td>直接输入数字(不回显) + 回车</td></tr>
          <tr><td>切换图片</td><td>→/←</td></tr>
          <tr><td>滚动图片</td><td>↑/↓</td></tr>
          <tr><td>开关自动加载</td><td>p</td></tr>
        </table>
      </li>
      <li><strong style="color: orange">下载功能:</strong>你可以在下载面板中点击下载，这将快速加载所有的图片，你依旧可以继续浏览图片。下载与大图浏览是一体的，你随时可以在下载面板点击<strong style="color: orange">下载已加载的</strong>保存图片。</li>
      <li><strong style="color: orange">问题反馈:</strong>
        点击 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance/issues" target="_blank" alt="Issue MapoMagpie/eh-view-enhance on GitHub">Issue</a>
        </span>
        反馈你的问题或建议，如果你喜欢这个脚本，给我一个star吧。 
        <span>
        <a style="color: #ff6961;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank" alt="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
        </span>
      </li>
    </ol>
  `),
  keyboardCustom: keyboardCustom,
};
