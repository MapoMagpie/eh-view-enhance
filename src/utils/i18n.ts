import { KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "../ui/event";

const lang = navigator.language;
const i18nIndex = lang.startsWith("zh") ? 1 : 0;
export class I18nValue extends Array<string> {
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
    "scroll-image-up": new I18nValue("Scroll Image Up (Please Keep Default Keys)", "向上滚动图片 (请保留默认按键)"),
    "scroll-image-down": new I18nValue("Scroll Image Down (Please Keep Default Keys)", "向下滚动图片 (请保留默认按键)"),
    "toggle-auto-play": new I18nValue("Toggle Auto Play", "切换自动播放"),
  },
  inFullViewGrid: {
    "open-big-image-mode": new I18nValue("Enter Big Image Mode", "进入大图阅读模式"),
    "pause-auto-load-temporarily": new I18nValue("Pause Auto Load Temporarily", "临时停止自动加载"),
    "exit-full-view-grid": new I18nValue("Exit Read Mode", "退出阅读模式"),
    "columns-increase": new I18nValue("Increase Columns ", "增加每行数量"),
    "columns-decrease": new I18nValue("Decrease Columns ", "减少每行数量"),
    "back-chapters-selection": new I18nValue("Back to Chapters Selection", "返回章节选择"),
    "toggle-auto-play": new I18nValue("Toggle Auto Play", "切换自动播放"),
  },
}
export const i18n = {
  // page-helper
  imageScale: new I18nValue("SCALE", "缩放"),
  config: new I18nValue("CONF", "配置"),
  chapters: new I18nValue("CHAPTERS", "章节"),
  autoPagePlay: new I18nValue("PLAY", "播放"),
  autoPagePause: new I18nValue("PAUSE", "暂停"),
  collapse: new I18nValue("FOLD", "收起"),
  // config panel number option
  colCount: new I18nValue("Columns", "每行数量"),
  threads: new I18nValue("Preload Threads", "最大同时加载"),
  threadsTooltip: new I18nValue("Max Preload Threads", "大图浏览时，每次滚动到下一张时，预加载的图片数量，大于1时体现为越看加载的图片越多，将提升浏览体验。"),
  downloadThreads: new I18nValue("Download Threads", "最大同时下载"),
  downloadThreadsTooltip: new I18nValue("Max Download Threads, suggest: <5", "下载模式下，同时加载的图片数量，建议小于等于5"),
  paginationIMGCount: new I18nValue("Images Per Page", "每页图片数量"),
  paginationIMGCountTooltip: new I18nValue("In Pagination Read mode, the number of images displayed on each page", "当阅读模式为翻页模式时，每页展示的图片数量"),
  timeout: new I18nValue("Timeout(second)", "超时时间(秒)"),
  preventScrollPageTime: new I18nValue("Min Paging Time", "最小翻页时间"),
  preventScrollPageTimeTooltip: new I18nValue("In Pagination read mode, prevent immediate page flipping when scrolling to the bottom/top to improve the reading experience.<br>Set to 0 to disable this feature,<br>If set to less than 0, page-flipping via scrolling is always disabled, except for the spacebar.<br>measured in milliseconds.", "当阅读模式为翻页模式时，滚动浏览时，阻止滚动到底部时立即翻页，提升阅读体验。<br>设置为0时则禁用此功能，单位为毫秒。<br>设置小于0时则永远禁止通过滚动的方式翻页。空格键除外。"),
  autoPageSpeed: new I18nValue("Auto Paging Speed", "自动翻页速度"),
  autoPageSpeedTooltip: new I18nValue("In Pagination read mode, Auto Page Speed means how many seconds it takes to flip the page automatically.<br>In Continuous read mode, Auto Page Speed means the scrolling speed.", "当阅读模式为翻页模式时，自动翻页速度表示为多少秒后翻页。<br>当阅读模式为连续模式时，自动翻页速度表示为滚动速度。"),
  scrollingSpeed: new I18nValue("Scrolling Speed", "按键滚动速度"),
  scrollingSpeedTooltip: new I18nValue("The scrolling Speed for Custom KeyBoard Keys for scrolling, not Auto Paging|Scrolling Speed", "自定义按键的滚动速度，并不是连续阅读模式下的自动翻页的滚动速度。"),
  // config panel boolean option
  fetchOriginal: new I18nValue("Raw Image", "最佳质量"),
  fetchOriginalTooltip: new I18nValue("enable will download the original source, cost more traffic and quotas", "启用后，将加载未经过压缩的原档文件，下载打包后的体积也与画廊所标体积一致。<br>注意：这将消耗更多的流量与配额，请酌情启用。"),
  autoLoad: new I18nValue("Auto Load", "自动加载"),
  autoLoadTooltip: new I18nValue("", "进入本脚本的浏览模式后，即使不浏览也会一张接一张的加载图片。直至所有图片加载完毕。"),
  reversePages: new I18nValue("Reverse Pages", "反向翻页"),
  reversePagesTooltip: new I18nValue("Clicking on the side navigation, if enable then reverse paging, which is a reading style similar to Japanese manga where pages are read from right to left.", "点击侧边导航时，是否反向翻页，反向翻页类似日本漫画那样的从右到左的阅读方式。"),
  autoPlay: new I18nValue("Auto Page", "自动翻页"),
  autoPlayTooltip: new I18nValue("Auto Page when entering the big image readmode.", "当阅读大图时，开启自动播放模式。"),
  autoLoadInBackground: new I18nValue("Keep Loading", "后台加载"),
  autoLoadInBackgroundTooltip: new I18nValue("Keep Auto-Loading after the tab loses focus", "当标签页失去焦点后保持自动加载。"),
  autoOpen: new I18nValue("Auto Open", "自动展开"),
  autoOpenTooltip: new I18nValue("Automatically open after the gallery page is loaded", "进入画廊页面后，自动展开阅读视图。"),
  autoCollapsePanel: new I18nValue("Auto Fold Control Panel", "自动收起控制面板"),
  autoCollapsePanelTooltip: new I18nValue("When the mouse is moved out of the control panel, the control panel will automatically fold. If disabled, the display of the control panel can only be toggled through the button on the control bar.", "当鼠标移出控制面板时，自动收起控制面板。禁用此选项后，只能通过控制栏上的按钮切换控制面板的显示。"),
  magnifier: new I18nValue("Magnifier", "放大镜"),
  magnifierTooltip: new I18nValue("In the pagination reading mode, you can temporarily zoom in on an image by dragging it with the mouse click, and the image will follow the movement of the cursor.", "在翻页阅读模式下，你可以通过鼠标左键拖动图片临时放大图片以及图片跟随指针移动。"),
  autoEnterBig: new I18nValue("Auto Big", "自动大图"),
  autoEnterBigTooltip: new I18nValue("Directly enter the Big image view when the script's entry is clicked or auto-opened", "点击脚本入口或自动打开脚本后直接进入大图阅读视图。"),
  // config panel select option
  readMode: new I18nValue("Read Mode", "阅读模式"),
  readModeTooltip: new I18nValue("Switch to the next picture when scrolling, otherwise read continuously", "滚动时切换到下一张图片，否则连续阅读"),
  stickyMouse: new I18nValue("Sticky Mouse", "黏糊糊鼠标"),
  stickyMouseTooltip: new I18nValue("In non-continuous reading mode, scroll a single image automatically by moving the mouse.", "非连续阅读模式下，通过鼠标移动来自动滚动单张图片。"),
  minifyPageHelper: new I18nValue("Minify Control Bar", "最小化控制栏"),
  minifyPageHelperTooltip: new I18nValue("Minify Control Bar", "最小化控制栏"),
  hitomiFormat: new I18nValue("Hitomi Image Format", "Hitomi 图片格式"),
  hitomiFormatTooltip: new I18nValue("In Hitomi, Fetch images by the format.<br>if Auto then try Avif > Jxl > Webp, Requires Refresh", "在Hitomi中的源图格式。<br>如果是Auto，则优先获取Avif > Jxl > Webp，修改后需要刷新生效。"),
  ehentaiTitlePrefer: new I18nValue("EHentai Prefer Title", "EHentai标题语言"),
  ehentaiTitlePreferTooltip: new I18nValue("Many galleries have both an English/Romanized title and a title in Japanese script. <br>Which one do you want to use as the archive filename?", "许多图库都同时拥有英文/罗马音标题和日文标题，<br>您希望下载时哪个作为文件名？"),
  reverseMultipleImagesPost: new I18nValue("Descending Images In Post", "反转推文图片顺序"),
  reverseMultipleImagesPostTooltip: new I18nValue("Reverse order for post with multiple images attatched", "反转推文图片顺序"),

  dragToMove: new I18nValue("Drag to Move", "拖动移动"),
  resetDownloaded: new I18nValue("Reset Downloaded Images", "重置已下载的图片"),
  resetDownloadedConfirm: new I18nValue("You will reset Downloaded Images!", "已下载的图片将会被重置为未下载！"),
  resetFailed: new I18nValue("Reset Failed Images", "重置下载错误的图片"),
  showHelp: new I18nValue("Help", "帮助"),
  showKeyboard: new I18nValue("Keyboard", "快捷键"),
  showSiteProfiles: new I18nValue("Site Profiles", "站点配置"),
  showStyleCustom: new I18nValue("Style", "样式"),
  controlBarStyleTooltip: new I18nValue("Click on an item to modify its display text, such as emoji or personalized text. Changes will take effect after restarting.", "点击某项后修改其显示文本，比如emoji或个性文字，也许svg，重启后生效。"),
  letUsStar: new I18nValue("Let's Star", "点星"),

  // download panel
  download: new I18nValue("DL", "下载"),
  forceDownload: new I18nValue("Take Loaded", "获取已下载的"),
  downloadStart: new I18nValue("Start Download", "开始下载"),
  downloading: new I18nValue("Downloading...", "下载中..."),
  downloadFailed: new I18nValue("Failed(Retry)", "下载失败(重试)"),
  downloaded: new I18nValue("Downloaded", "下载完成"),
  packaging: new I18nValue("Packaging...", "打包中..."),
  status: new I18nValue("Status", "状态"),
  selectChapters: new I18nValue("Select Chapters", "章节选择"),
  cherryPick: new I18nValue("Cherry Pick", "范围选择"),

  enable: new I18nValue("Enable", "启用"),
  enableTooltips: new I18nValue("Enable the script on this site.", "在此站点上启用本脚本的功能。"),
  enableAutoOpen: new I18nValue("Auto Open", "自动打开"),
  enableAutoOpenTooltips: new I18nValue("Automatically open the interface of this script when entering the corresponding page.", "当进入对应的生效页面后，自动打开本脚本界面。"),
  addRegexp: new I18nValue("Add Work URL Regexp", "添加生效地址规则"),

  help: new I18nValue(`
<h2>[How to Use? Where is the Entry?]</h2>
<p>The script typically activates on gallery homepages or artist homepages. For example, on E-Hentai, it activates on the gallery detail page, or on Twitter, it activates on the user&#39;s homepage or tweets.</p>
<p>When active, a <strong>&lt;🎑&gt;</strong> icon will appear at the bottom left of the page. Click it to enter the script&#39;s reading interface.</p>
<h2>[Can the Script&#39;s Entry Point or Control Bar be Relocated?]</h2>
<p>Yes! At the bottom of the configuration panel, there&#39;s a <strong>Drag to Move</strong> option. Drag the icon to reposition the control bar anywhere on the page.</p>
<h2>[Can the Script Auto-Open When Navigating to the Corresponding Page?]</h2>
<p>Yes! There is an <strong>Auto Open</strong> option in the configuration panel. Enable it to activate this feature.</p>
<h2>[How to Zoom Images?]</h2>
<p>There are several ways to zoom images in big image reading mode:</p>
<ul>
<li>Right-click + mouse wheel</li>
<li>Keyboard shortcuts</li>
<li>Zoom controls on the control bar: click the -/+ buttons, scroll the mouse wheel over the numbers, or drag the numbers left or right.</li>
</ul>
<h2>[How to Open Images from a Specific Page?]</h2>
<p>In the thumbnail list interface, simply type the desired page number on your keyboard (without any prompt) and press Enter or your custom shortcuts.</p>
<h2>[About the Thumbnail List]</h2>
<p>The thumbnail list interface is the script&#39;s most important feature, allowing you to quickly get an overview of the entire gallery.</p>
<p>Thumbnails are also lazy-loaded, typically loading about 20 images, which is comparable to or even fewer requests than normal browsing.</p>
<p>Pagination is also lazy-loaded, meaning not all gallery pages load at once. Only when you scroll near the bottom does the next page load.</p>
<p>Don&#39;t worry about generating a lot of requests by quickly scrolling through the thumbnail list; the script is designed to handle this efficiently.</p>
<h2>[About Auto-Loading and Pre-Loading]</h2>
<p>By default, the script automatically and slowly loads large images one by one.</p>
<p>You can still click any thumbnail to start loading and reading from that point, at which time auto-loading will stop and pre-load 3 images from the reading position.</p>
<p>Just like the thumbnail list, you don&#39;t need to worry about generating a lot of loading requests by fast scrolling.</p>
<h2>[About Downloading]</h2>
<p>Downloading is integrated with large image loading. When you finish browsing a gallery and want to save and download the images, you can click <strong>Start Download</strong> in the download panel. don&#39;t worry about re-downloading already loaded images.</p>
<p>You can also directly click <strong>Start Download</strong> in the download panel without reading.</p>
<p>Alternatively, click the <strong>Take Loaded</strong> button in the download panel if some images consistently fail to load. This will save the images that have already been loaded.</p>
<p>The download panel&#39;s status indicators provide a clear view of image loading progress.</p>
<p><strong>Note:</strong> When the download file size exceeds 1.2GB, split compression will be automatically enabled. If you encounter errors while extracting the files, please update your extraction software or use 7-Zip.</p>
<h2>[Can I Select the Download Range?]</h2>
<p>Yes, the download panel has an option to select the download range(Cherry Pick), which applies to downloading, auto-loading, and pre-loading.</p>
<p>Even if an image is excluded from the download range, you can still click its thumbnail to view it, which will load the corresponding large image.</p>
<h2>[How to Select Images on Some Illustration Sites?]</h2>
<p>In the thumbnail list, you can use some hotkeys to select images:</p>
<ul>
<li><strong>Ctrl + Left Click:</strong> Selects the image. The first selection will exclude all other images.</li>
<li><strong>Ctrl + Shift + Left Click:</strong> Selects the range of images between this image and the last selected image.</li>
<li><strong>Alt + Left Click:</strong> Excludes the image. The first exclusion will select all other images.</li>
<li><strong>Alt + Shift + Left Click:</strong> Excludes the range of images between this image and the last excluded image.</li>
</ul>
<p>In addition, there are several other methods:</p>
<ul>
<li>Middle-click on a thumbnail to open the original image url, then right-click to save the image.</li>
<li>Set the download range to 1 in the download panel. This excludes all images except the first one. Then, click on thumbnails of interest in the list, which will load the corresponding large images. After selecting, clear the download range and click <strong>Take Loaded</strong> to package and download your selected images.</li>
<li>Turn off auto-loading and set pre-loading to 1 in the configuration panel, then proceed as described above.</li>
</ul>
<h2>[Can I Operate the Script via Keyboard?]</h2>
<p>Yes! There&#39;s a <strong>Keyboard</strong> button at the bottom of the configuration panel. Click it to view or configure keyboard operations.</p>
<p>You can even configure it for one-handed full keyboard operation, freeing up your other hand!</p>
<h2>[How to Disable Auto-Open on Certain Sites?]</h2>
<p>There&#39;s a <strong>Site Profiles</strong> button at the bottom of the configuration panel. Click it to exclude certain sites from auto-opening. For example, Twitter or Booru-type sites.</p>
<h2>[How to Disable This Script on Certain Sites?]</h2>
<p>There&#39;s a <strong>Site Profiles</strong> button at the bottom of the configuration panel to exclude specific sites. Once excluded, the script will no longer activate on those sites.</p>
<p>To re-enable a site, you need to do so from a site that hasn&#39;t been excluded.</p>
<h2>[How to Feed the Author]</h2>
<p>Give me a star on <a target="_blank" href="https://github.com/MapoMagpie/eh-view-enhance">Github</a> or a good review on <a target="_blank" href="https://greasyfork.org/scripts/397848-e-hentai-view-enhance">Greasyfork</a>.</p>
<p>Please do not review on Greasyfork, as its notification system cannot track subsequent feedback. Many people leave an issue and never back.
Report issues here: <a target="_blank" href="https://github.com/MapoMagpie/eh-view-enhance/issues">issue</a></p>
<h2>[How to Reopen the Guide?]</h2>
<p>Click the <strong>Help</strong> button at the bottom of the configuration panel.</p>
<h2>[Some Unresolved Issues]</h2>
<ul>
<li>When using Firefox to open Twitter&#39;s homepage in a new tab, then navigating to the user&#39;s homepage, the script doesn&#39;t activate and requires page refresh.</li>
<li>Still Firefox, Download function not working on twitter.com, firefox will not redirect twitter.com to x.com when open in new tab, you should use x.com instead twitter.com.</li>
</ul>
`, `
<h2>[如何使用？入口在哪里？]</h2>
<p>脚本一般生效于画廊详情页或画家的主页或作品页。比如在E-Hentai上，生效于画廊详情页，或者在Twitter上，生效于推主的主页或推文。</p>
<p>生效时，在页面的左下方会有一个<strong>&lt;🎑&gt;</strong>图标，点击后即可进入脚本的阅读界面。</p>
<h2>[脚本的入口或控制栏可以更改位置吗？]</h2>
<p>可以！在配置面板的下方，有一个<strong>拖拽移动</strong>的选项，对着图标进行拖动，你可以将控制栏移动到页面上的任意位置。</p>
<h2>[进入对应的页面的，可以自动打开脚本吗？]</h2>
<p>可以！在配置面板中，有一个<strong>自动打开</strong>的选项，启用即可。</p>
<h2>[如何缩放图片？]</h2>
<p>有几种方式可以在大图阅读模式中缩放图片：</p>
<ul>
<li>鼠标右键+滚轮</li>
<li>键盘快捷键</li>
<li>控制栏上的缩放控制，点击-/+按钮，或者在数字上滚动滚轮，或者左右拖动数字。</li>
</ul>
<h2>[如何打开指定页数的图片？]</h2>
<p>在缩略图列表界面中，直接在键盘上输入数字(没有提示)，然后按下回车或自定义的快捷键。</p>
<h2>[关于缩略图列表。]</h2>
<p>缩略图列表是脚本最重要的特性，可以让你快速地了解整个画廊的情况。</p>
<p>并且缩略图也是延迟加载的，通常会加载20张左右，与正常浏览所发出的请求相当，甚至更低。</p>
<p>并且分页也是延迟加载的，并不会一次性加载画廊的所有分页，只有滚动到接近底部时，才会加载下一页。</p>
<p>不用担心因为在缩略图列表中快速滚动而导致发出大量的请求，脚本充分考虑到了这一点。</p>
<h2>[关于自动加载和预加载。]</h2>
<p>默认配置下，脚本会自动且缓慢地一张接一张地加载大图。</p>
<p>你仍然可以点击任意位置的缩略图，并从该处开始加载并阅读，此时会自动加载会停止并从阅读的位置预加载3张图片。</p>
<p>同缩略图列表一样，无需担心因为快速滚动而导致发出大量的加载请求。</p>
<h2>[关于下载。]</h2>
<p>下载与大图加载是一体的，当你浏览完画廊时，突然想起来要保存下载，此时你可以在下载面板中点击<strong>开始下载</strong>，不必担心会重复下载已经加载过的图片。</p>
<p>当然你也可以不浏览，直接在下载面板中点击<strong>开始下载</strong>。</p>
<p>或者点击下载面板中的<strong>获取已下载的</strong>按钮，当一些图片总是加载失败的时候，你可以使用此功能来保存已经加载过的图片。</p>
<p>通过下载面板中的状态可以直观地看到图片加载的情况。</p>
<p><strong>注意：</strong>当下载文件大小超过1.2G后，会自动启用分卷压缩。当使用解压软件解压出错时，请更新解压软件或使用7-Zip。</p>
<h2>[可以选择下载范围吗？]</h2>
<p>可以，在下载面板中有选择下载范围的功能，该功能对下载、自动加载、预加载都生效。</p>
<p>另外，如果一张图片被排除在下载范围之外，你仍然可以点击该图片的缩略图进行浏览，这会加载对应的大图。</p>
<h2>[如何在一些插画网站上挑选图片？]</h2>
<p>在缩略图列表中使用一些快捷键可以进行图片的挑选。</p>
<ul>
<li><strong>Ctrl+鼠标左键：</strong> 选中该图片，当第一次选中时，其他的图片都会被排除。</li>
<li><strong>Ctrl+Shift+鼠标左键：</strong> 选中该图片与上一张选中的图片之间的范围。</li>
<li><strong>Alt+鼠标左键：</strong> 排除该图片，当第一次排除时，其他的图片都会被选中。</li>
<li><strong>Alt+Shift+鼠标左键：</strong> 排除该图片与上一张排除的图片之间的范围。</li>
</ul>
<p>除此之外还有几种方式：</p>
<ul>
<li>在缩略图上按下鼠标中键，即可打开图片的原始地址，之后你可以右键保存图片。</li>
<li>在下载面板中设置下载范围为1，这样会排除第一张图片以外的所有图片，之后在缩略图列表上点击你感兴趣的图片，对应的大图会被加载，最终挑选完毕后，删除掉下载范围并点击<strong>获取已下载的</strong>，这样你挑选的图片会被打包下载。</li>
<li>在配置面板中关闭自动加载，并设置预加载数量为1，之后与上面的方法类似。</li>
</ul>
<h2>[可以通过键盘来操作吗？]</h2>
<p>可以！在配置面板的下方，有一个<strong>快捷键</strong>按钮，点击后可以查看键盘操作，或进行配置。</p>
<p>甚至可以配置为单手全键盘操作，解放另一只手！</p>
<h2>[不想在某些网站启用自动打开功能？]</h2>
<p>在配置面板的下方，有一个<strong>站点配置</strong>按钮，点击后可以对一些不适合自动打开的网站进行排除。比如Twitter或Booru类的网站。</p>
<h2>[不想在某些网站使用这个脚本？]</h2>
<p>在配置面板的下方，有一个<strong>站点配置</strong>的按钮，可对一些站点进行排除，排除后脚本不会再生效。</p>
<p>如果想重新启用该站点，需要在其他未排除的站点中启用被禁用的站点。</p>
<h2>[如何Feed作者。]</h2>
<p>给我<a target="_blank" href="https://github.com/MapoMagpie/eh-view-enhance">Github</a>星星，或者<a target="_blank" href="https://greasyfork.org/scripts/397848-e-hentai-view-enhance">Greasyfork</a>上好评。</p>
<p>请勿在Greasyfork上反馈问题，因为该站点的通知系统无法跟踪后续的反馈。很多人只是留下一个问题，再也没有回来过。
请在此反馈问题: <a target="_blank" href="https://github.com/MapoMagpie/eh-view-enhance/issues">issue</a></p>
<h2>[如何再次打开指南？]</h2>
<p>在配置面板的下方，点击<strong>帮助</strong>按钮。</p>
<h2>[一些未能解决的问题。]</h2>
<ul>
<li>使用Firefox通过新标签页打开Twitter的首页后，然后跳转到推主的主页，脚本无法生效，需要刷新页面。</li>
<li>使用Firefox打开twitter.com这个域名，下载功能会失效，这可能和Firefox不能自动跳转到x.com有关，你需要停止使用twitter.com这个域名。</li>
</ul>
`),
  keyboardCustom: keyboardCustom,
};
