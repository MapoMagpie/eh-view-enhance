import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { evLog } from "../utils/ev-log";
import { splitImagesFromUrl } from "../utils/sprite-split";
import { Matcher, PagesSource } from "./platform";

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

export class EHMatcher implements Matcher {

  work(_: string): boolean {
    return true;
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

  public async matchImgURL(url: string, retry: boolean): Promise<string> {
    return await this.fetchImgURL(url, retry);
  }

  public async parseImgNodes(page: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    let doc = await (async (): Promise<Document | null> => {
      if (page.raw instanceof Document) {
        return page.raw;
      } else {
        const raw = await window.fetch(page.raw as string).then((response) => response.text());
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

    // sprite thumbnails
    if (isSprite) {
      for (let i = 0; i < nodes.length; i += 20) {
        const niStyles = nodes[i].style;
        const url = niStyles.background.match(regulars.sprite)?.[1]?.replaceAll("\"", "");
        if (url) {
          const splits = await splitImagesFromUrl(url, nodes.slice(i, i + 20));
          urls.push(...splits);
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
        nodes[i].querySelector("img")!.getAttribute("title")?.replace(/Page\s\d+[:_]\s*/, "") || "untitle.jpg"
      );
      list.push(node);
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let fristHref = document.querySelector("#gdt a")?.getAttribute("href");
    if (fristHref && regulars.isMPV.test(fristHref)) {
      yield { raw: window.location.href, typ: "url" };
      return;
    }
    const ps = Array.from(document.querySelectorAll(".gtb td a"));
    if (ps.length === 0) {
      throw new Error("未获取到分页元素！");
    }
    const lastP = ps[ps.length - 2];
    if (!lastP) {
      throw new Error("未获取到分页元素！x2");
    }
    const u = new URL(lastP.getAttribute("href")!);
    const total = Number(u.searchParams.get("p")) + 1;
    u.searchParams.delete("p");
    yield { raw: u.href, typ: "url" };
    for (let p = 1; p < total; p++) {
      u.searchParams.set("p", p.toString());
      yield { raw: u.href, typ: "url" };
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
      evLog(`IMG-FETCHER retry url:${newUrl}`);
      return await this.fetchImgURL(newUrl, false);
    } else {
      return regulars.normal.exec(text)![1];
    }
  }
}

