import { conf } from "../config";
import { GalleryMeta } from "../downloader";
import { evLog } from "../utils/ev-log";

export interface Matcher {
  matchImgURL(url: string): Promise<string>;
  parseImgNodes(url: string, template: HTMLElement): Promise<HTMLElement[]>;
  parsePageURLs(): Iterable<string>;
  parseGalleryMeta(doc: Document): GalleryMeta;
}

export function adaptMatcher(): Matcher {
  const host = window.location.host;
  if (host === "nhentai.net") {
    return new NHMatcher();
  }
  return new EHMatcher();
}

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
}

export class EHMatcher implements Matcher {

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
        tags[cat] = list;
      }
    });
    meta.tags = tags;
    return meta;
  }

  public async matchImgURL(url: string): Promise<string> {
    return await this.fetchImgURL(url, false);
  }

  public async parseImgNodes(url: string, template: HTMLElement): Promise<HTMLElement[]> {
    const list: HTMLElement[] = [];
    const raw = await window.fetch(url).then((response) => response.text());
    if (!raw) return list;

    const domParser = new DOMParser();
    const doc = domParser.parseFromString(raw, "text/html");
    const aNodes = doc.querySelectorAll("#gdt a");
    if (!aNodes || aNodes.length == 0) {
      evLog("wried to get a nodes from document, but failed!");
      return list;
    }
    const aNode = aNodes[0];

    // MPV
    const href = aNode.getAttribute("href")!;
    if (regulars.isMPV.test(href)) {
      const mpvDoc = await window.fetch(href).then((response) => response.text());
      const matchs = mpvDoc.matchAll(regulars.mpvImageList);
      const gid = location.pathname.split("/")[2];
      let i = 0;
      for (const match of matchs) {
        i++;
        const newImgNode = template.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("title", match[1]);
        newImg.setAttribute(
          "ahref",
          `${location.origin}/s/${match[2]}/${gid}-${i}`
        );
        newImg.setAttribute("asrc", match[3].replaceAll("\\", ""));
        list.push(newImgNode);
      }
    } else { // normal
      for (const aNode of Array.from(aNodes)) {
        const imgNode = aNode.querySelector("img");
        if (!imgNode) {
          throw new Error("Cannot find Image");
        }
        const newImgNode = template.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("ahref", aNode.getAttribute("href")!);
        newImg.setAttribute("asrc", imgNode.src);
        newImg.setAttribute("title", imgNode.getAttribute("title") || "");
        list.push(newImgNode);
      }
    }
    return list;
  }

  public parsePageURLs(): Iterable<string> {
    const pager = document.querySelector(".gtb");
    if (!pager) {
      throw new Error("未获取到分页元素！");
    }
    const tds = Array.from(pager.querySelectorAll("td"));
    if (!tds || tds.length == 0) {
      throw new Error("未获取到有效的分页元素！");
    }
    const ptds = tds.filter((p) => p.className.indexOf("ptds") != -1);
    if (!ptds || ptds.length == 0) {
      throw new Error("未获取到有效的分页元素！");
    }
    const firstPage =
      tds[1].firstElementChild?.getAttribute("href") || undefined;
    if (!firstPage) {
      throw new Error("未获取到有效的分页地址！");
    }
    const lastPage = this.findPageNum(
      tds[tds.length - 2].firstElementChild?.getAttribute("href") || undefined
    );
    const pageURLs: string[] = [firstPage];
    for (let i = 1; i <= lastPage; i++) {
      pageURLs.push(`${firstPage}?p=${i}`);
    }
    return pageURLs;
    // let index = -1;
    // return {
    //   [Symbol.iterator]() {
    //     return {
    //       next() {
    //         if (index < pageURLs.length) {
    //           return { done: false, value: pageURLs[index++] };
    //         } else {
    //           return { done: true, value: "DONE" };
    //         }
    //       }
    //     }
    //   }
    // }
  }

  private findPageNum(pageURL?: string): number {
    if (pageURL) {
      const arr = pageURL.split("?");
      if (arr && arr.length > 1) {
        let matchs = /p=(\d*)/.exec(arr[1]);
        if (matchs && matchs.length > 1) {
          return parseInt(matchs.pop()!);
        }
      }
    }
    return 0;
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
      return await this.fetchImgURL(url, false);
    } else {
      return regulars.normal.exec(text)![1];
    }
  }
}

const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
export class NHMatcher implements Matcher {

  public parseGalleryMeta(doc: Document): GalleryMeta {
    let title: string | undefined;
    let originTitle: string | undefined;
    doc.querySelectorAll("#info .title").forEach(ele => {
      if (!title) {
        title = ele.textContent || undefined;
      } else {
        originTitle = ele.textContent || undefined;
      }
    });
    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    meta.originTitle = originTitle;
    const tagTrList = doc.querySelectorAll<HTMLElement>(".tag-container");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const cat = tr.firstChild?.textContent?.trim().replace(":", "");
      if (cat) {
        const list: string[] = [];
        tr.querySelectorAll(".tag .name").forEach(tag => {
          const t = tag.textContent?.trim();
          if (t) {
            list.push(t);
          }
        })
        if (list.length > 0) {
          tags[cat] = list;
        }
      }
    });
    meta.tags = tags;
    return meta;
  }

  public async matchImgURL(url: string): Promise<string> {
    let text = "";
    try {
      text = await window.fetch(url).then(resp => resp.text());
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    return NH_IMG_URL_REGEX.exec(text)![1];
  }

  public async parseImgNodes(_: string, template: HTMLElement): Promise<HTMLElement[]> {
    const list: HTMLElement[] = [];
    const aNodes = document.querySelectorAll<HTMLElement>(".thumb-container > .gallerythumb");
    if (!aNodes || aNodes.length == 0) {
      evLog("wried to get a nodes from document, but failed!");
      return list;
    }

    for (const aNode of Array.from(aNodes)) {
      const imgNode = aNode.querySelector("img");
      if (!imgNode) {
        throw new Error("Cannot find Image");
      }
      const newImgNode = template.cloneNode(true) as HTMLDivElement;
      const newImg = newImgNode.firstElementChild as HTMLImageElement;
      newImg.setAttribute("ahref", location.origin + aNode.getAttribute("href")!);
      newImg.setAttribute("asrc", imgNode.getAttribute("data-src")!);
      newImg.setAttribute("title", imgNode.getAttribute("title") || "");
      list.push(newImgNode);
    }

    return list;
  }

  public parsePageURLs(): Iterable<string> {
    return [window.location.href];
  }

}
