import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { parseImagePositions, splitImagesFromUrl } from "../utils/sprite-split";
import { BaseMatcher, OriginMeta, } from "./platform";

// EHMatcher
const regulars = {
  /** 有压缩的大图地址 */
  normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
  /** 原图地址 */
  original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai(55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad)?\.(org|onion)\/fullimg?[^"\\]*)\"\>/,
  /** 大图重载地址 */
  nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
  /** 是否开启自动多页查看器 */
  isMPV: /https?:\/\/e[-x]hentai(55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad)?\.(org|onion)\/mpv\/\w+\/\w+\/#page\w/,
  /** 多页查看器图片列表提取 */
  mpvImageList: /\{"n":"(.*?)","k":"(\w+)","t":"(.*?)".*?\}/g,
  /** 精灵图地址提取 */
  sprite: /url\((.*?)\)/,
}

export class EHMatcher extends BaseMatcher {
  meta?: GalleryMeta;
  // "http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*",
  workURL(): RegExp {
    return /e[-x]hentai(.*)?.(org|onion)\/g\/\w+/;
  }

  title(doc: Document): string {
    const meta = this.meta || this.galleryMeta(doc);
    if (conf.ehentaiTitlePrefer === "japanese") {
      return meta.originTitle || meta.title || "UNTITLE";
    } else {
      return meta.title || meta.originTitle || "UNTITLE";
    }
  }

  galleryMeta(doc: Document): GalleryMeta {
    if (this.meta) return this.meta;
    const titleList = doc.querySelectorAll<HTMLElement>("#gd2 h1");
    let title: string | undefined;
    let originTitle: string | undefined;
    if (titleList && titleList.length > 0) {
      title = titleList[0].textContent || undefined;
      if (titleList.length > 1) {
        originTitle = titleList[1].textContent || undefined;
      }
    }
    this.meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    this.meta.originTitle = originTitle;
    const tagTrList = doc.querySelectorAll<HTMLElement>("#taglist tr");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const tds = tr.childNodes;
      const cat = tds[0].textContent;
      if (cat) {
        const list: string[] = [];
        tds[1].childNodes.forEach((ele) => {
          if (ele.textContent) list.push(ele.textContent);
        });
        tags[cat.replace(":", "")] = list;
      }
    });
    this.meta.tags = tags;
    return this.meta;
  }

  async fetchOriginMeta(href: string, retry: boolean): Promise<OriginMeta> {
    return { url: await this.fetchImgURL(href, retry) };
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    let doc = await (async (): Promise<Document | null> => {
      if (source instanceof Document) {
        return source;
      } else {
        const raw = await window.fetch(source as string).then((response) => response.text());
        if (!raw) return null;
        const domParser = new DOMParser();
        return domParser.parseFromString(raw, "text/html");
      }
    })();

    if (!doc) {
      throw new Error("warn: eh matcher failed to get document from source page!")
    }

    let isSprite = true;
    let query = doc.querySelectorAll<HTMLDivElement>("#gdt .gdtm > div");
    if (!query || query.length == 0) {
      isSprite = false;
      query = doc.querySelectorAll<HTMLDivElement>("#gdt .gdtl");
    }
    if (!query || query.length == 0) {
      throw new Error("warn: failed query image nodes!")
    }
    const nodes = Array.from(query);

    // Multi-page viewer
    const n0 = nodes[0].firstElementChild as HTMLAnchorElement;
    if (regulars.isMPV.test(n0.href)) {
      const mpvDoc = await window.fetch(n0.href).then((response) => response.text());
      const matchs = mpvDoc.matchAll(regulars.mpvImageList);
      const gid = location.pathname.split("/")[2];
      let i = 0;
      for (const match of matchs) {
        i++;
        const node = new ImageNode(
          match[3].replaceAll("\\", ""),
          `${location.origin}/s/${match[2]}/${gid}-${i}`,
          match[1].replace(/Page\s\d+[:_]\s*/, "")
        );
        list.push(node);
      }
      return list;
    }

    let urls: string[] = [];
    let delayURLs: (Promise<string> | undefined)[] = [];

    // sprite thumbnails
    if (isSprite) {
      let spriteURLs: { url: string, range: { index: number, style: CSSStyleDeclaration }[] }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const nodeStyles = nodes[i].style;
        const url = nodeStyles.background.match(regulars.sprite)?.[1]?.replaceAll("\"", "");
        if (!url) break;
        if (spriteURLs.length === 0 || spriteURLs[spriteURLs.length - 1].url !== url) {
          spriteURLs.push({ url, range: [{ index: i, style: nodeStyles }] });
        } else {
          spriteURLs[spriteURLs.length - 1].range.push({ index: i, style: nodeStyles });
        }
      }
      spriteURLs.forEach(({ url, range }) => {
        const resolvers: ((str: string | PromiseLike<string>) => void)[] = [];
        const rejects: ((reason?: any) => void)[] = [];
        for (let i = 0; i < range.length; i++) {
          urls.push("");
          delayURLs.push(new Promise<string>((resolve, reject) => {
            resolvers.push(resolve);
            rejects.push(reject);
          }));
        }
        // check url has host prefix
        if (!url.startsWith("http")) {
          url = window.location.origin + url;
        }
        splitImagesFromUrl(url, parseImagePositions(range.map(n => n.style))).then((ret) => {
          for (let k = 0; k < ret.length; k++) {
            resolvers[k](ret[k]);
          }
        }).catch((err) => {
          rejects.forEach(r => r(err));
        })
      });
    }
    // large thumbnails
    else {
      if (urls.length == 0) {
        urls = nodes.map(n => (n.firstElementChild!.firstElementChild as HTMLImageElement).src);
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = new ImageNode(
        urls[i],
        nodes[i].querySelector("a")!.href,
        nodes[i].querySelector("img")!.getAttribute("title")?.replace(/Page\s\d+[:_]\s*/, "") || "untitle.jpg",
        delayURLs[i]
      );
      list.push(node);
    }
    return list;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    // const doc = await window.fetch(chapter.source).then((resp) => resp.text()).then(raw => new DOMParser().parseFromString(raw, "text/html"));
    const doc = document;
    let fristImageHref = doc.querySelector("#gdt a")?.getAttribute("href");
    // MPV
    if (fristImageHref && regulars.isMPV.test(fristImageHref)) {
      yield window.location.href;
      return;
    }
    // Normal
    let pages = Array.from(doc.querySelectorAll(".gtb td a")).filter(a => a.getAttribute("href")).map(a => a.getAttribute("href")!);
    if (pages.length === 0) {
      throw new Error("未获取到分页元素！");
    }
    let lastPage = 0;
    let url: URL | undefined;
    for (const page of pages) {
      const u = new URL(page);
      const num = parseInt(u.searchParams.get("p") || "0");
      if (num >= lastPage) {
        lastPage = num;
        url = u;
      }
    }
    if (!url) {
      throw new Error("未获取到分页元素！x2");
    }
    url.searchParams.delete("p");
    yield url.href;
    for (let p = 1; p < lastPage + 1; p++) {
      url.searchParams.set("p", p.toString());
      yield url.href;
    }
  }

  private async fetchImgURL(url: string, originChanged: boolean): Promise<string> {
    let text = "";
    try {
      text = await window.fetch(url).then(resp => resp.text());
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    if (!text) throw new Error("[text] is empty");

    // TODO: Your IP address has been temporarily banned for excessive pageloads which indicates that you are using automated mirroring/harvesting software. The ban expires in 2 days and 23 hours
    if (conf.fetchOriginal) {
      const matchs = regulars.original.exec(text);
      if (matchs && matchs.length > 0) {
        return matchs[1].replace(/&amp;/g, "&");
      }
    }
    let src: string | undefined;
    // EH change the url
    if (originChanged) {
      const nlValue = regulars.nlValue.exec(text)?.[1];
      if (nlValue) {
        const newUrl = url + ((url + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
        evLog("info", `IMG-FETCHER retry url:${newUrl}`);
        src = await this.fetchImgURL(newUrl, false);
      } else {
        evLog("error", `Cannot matching the nlValue, content: ${text}`);
      }
    }
    if (!src) {
      // normal
      src = regulars.normal.exec(text)?.[1];
    }
    if (!src) throw new Error(`Cannot matching the image url, content: ${text}`);
    // check src has host prefix
    if (!src.startsWith("http")) {
      src = window.location.origin + src;
    }
    return src;
  }
}

