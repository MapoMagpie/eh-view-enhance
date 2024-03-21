import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { parseImagePositions, splitImagesFromUrl } from "../utils/sprite-split";
import { BaseMatcher, OriginMeta, } from "./platform";

// EHMatcher
const regulars = {
  /** 有压缩的大图地址 */
  normal: /\<img\sid=\"img\"\ssrc=\"(.*?)\"\sstyle/,
  /** 原图地址 */
  original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai\.org\/fullimg?[^"\\]*)\"\>/,
  /** 大图重载地址 */
  nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/,
  /** 是否开启自动多页查看器 */
  isMPV: /https?:\/\/e[-x]hentai.org\/mpv\/\w+\/\w+\/#page\w/,
  /** 多页查看器图片列表提取 */
  mpvImageList: /\{"n":"(.*?)","k":"(\w+)","t":"(.*?)".*?\}/g,
  /** 精灵图地址提取 */
  sprite: /url\((.*?)\)/,
}

export class EHMatcher extends BaseMatcher {

  workURL(): RegExp {
    return /e[-x]hentai.org\/g\/\w+/;
  }

  public parseGalleryMeta(doc: Document): GalleryMeta {
    const titleList = doc.querySelectorAll<HTMLElement>("#gd2 h1");
    let title: string | undefined;
    let originTitle: string | undefined;
    if (titleList && titleList.length > 0) {
      title = titleList[0].textContent || undefined;
      if (titleList.length > 1) {
        originTitle = titleList[1].textContent || undefined;
      }
    }
    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    meta.originTitle = originTitle;
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
    meta.tags = tags;
    return meta;
  }

  public async fetchOriginMeta(href: string, retry: boolean): Promise<OriginMeta> {
    return { url: await this.fetchImgURL(href, retry) };
  }

  public async parseImgNodes(page: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    let doc = await (async (): Promise<Document | null> => {
      if (page instanceof Document) {
        return page;
      } else {
        const raw = await window.fetch(page as string).then((response) => response.text());
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
      for (let i = 0; i < nodes.length; i += 20) {
        const niStyles = nodes[i].style;
        const url = niStyles.background.match(regulars.sprite)?.[1]?.replaceAll("\"", "");
        if (url) {
          const range = nodes.slice(i, i + 20);
          const resolvers: ((str: string | PromiseLike<string>) => void)[] = [];
          const rejects: ((reason?: any) => void)[] = [];
          for (let j = 0; j < range.length; j++) {
            urls.push("");
            delayURLs.push(new Promise<string>((resolve, reject) => {
              resolvers.push(resolve);
              rejects.push(reject);
            }));
          }
          splitImagesFromUrl(url, parseImagePositions(range.map(n => n.style))).then((ret) => {
            for (let k = 0; k < ret.length; k++) {
              resolvers[k](ret[k]);
            }
          }).catch((err) => {
            rejects.forEach(r => r(err));
          })
        } else {
          break;
        }
      }
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

  public async *fetchPagesSource(chapter: Chapter): AsyncGenerator<PagesSource> {
    const doc = chapter.source as Document;
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
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    // TODO: Your IP address has been temporarily banned for excessive pageloads which indicates that you are using automated mirroring/harvesting software. The ban expires in 2 days and 23 hours
    if (conf.fetchOriginal) {
      const matchs = regulars.original.exec(text);
      if (matchs && matchs.length > 0) {
        return matchs[1].replace(/&amp;/g, "&");
      } else {
        const normalMatchs = regulars["normal"].exec(text);
        if (normalMatchs == null || normalMatchs.length == 0) {
          throw new Error(`Cannot matching the image url, content: ${text}`);
        } else {
          return normalMatchs[1];
        }
      }
    }
    if (originChanged) {
      // EH change the url
      const nlValue = regulars.nlValue.exec(text)![1];
      const newUrl = url + ((url + "").indexOf("?") > -1 ? "&" : "?") + "nl=" + nlValue;
      evLog("info", `IMG-FETCHER retry url:${newUrl}`);
      return await this.fetchImgURL(newUrl, false);
    } else {
      return regulars.normal.exec(text)![1];
    }
  }
}

