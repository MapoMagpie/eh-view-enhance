import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";


abstract class DanbooruMatcher extends BaseMatcher {
  tags: Record<string, string[]> = {};
  count: number = 0;

  abstract nextPage(doc: Document): string | null;

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let doc = document;
    yield doc;
    // find next page
    let tryTimes = 0;
    while (true) {
      const url = this.nextPage(doc);
      if (!url) break;
      try {
        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      } catch (e) {
        tryTimes++;
        if (tryTimes > 3) throw new Error(`fetch next page failed, ${e}`);
        continue;
      }
      tryTimes = 0;
      yield doc;
    }
  }

  abstract getOriginalURL(doc: Document): string | null;
  abstract getNormalURL(doc: Document): string | null;
  abstract extractIDFromHref(href: string): string | undefined;

  async fetchOriginMeta(href: string): Promise<OriginMeta> {
    let url: string | null = null;
    const doc = await window.fetch(href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    if (conf.fetchOriginal) {
      url = this.getOriginalURL(doc);
    }
    if (!url) {
      url = this.getNormalURL(doc);
    }
    if (!url) throw new Error("Cannot find origin image or video url");
    let title: string | undefined;
    // extract ext from url
    const ext = url.split(".").pop()?.match(/^\w+/)?.[0];
    // extract id from href
    const id = this.extractIDFromHref(href);
    if (ext && id) {
      title = `${id}.${ext}`;
    }
    return { url, title };
  }

  abstract queryList(doc: Document): HTMLElement[];
  abstract toImgNode(ele: HTMLElement): [ImageNode | null, string];

  async parseImgNodes(source: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    const doc = source as Document;
    this.queryList(doc).forEach(ele => {
      const [imgNode, tags] = this.toImgNode(ele);
      if (!imgNode) return;
      this.count++;
      if (tags !== "") {
        this.tags[imgNode.title.split(".")[0]] = tags.trim()
          .replaceAll(": ", ":")
          .split(" ")
          .map(v => v.trim())
          .filter(v => v !== "");
      }
      list.push(imgNode);
    });
    return list;
  }

  abstract site(): string;

  galleryMeta(): GalleryMeta {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags")?.trim();
    const meta = new GalleryMeta(window.location.href, `${this.site()}_${tags}_${this.count}`);
    meta.tags = this.tags;
    return meta;
  }
}

export class DanbooruDonmaiMatcher extends DanbooruMatcher {
  site(): string {
    return "danbooru";
  }
  workURL(): RegExp {
    return /danbooru.donmai.us\/(posts(?!\/)|$)/;
  }
  nextPage(doc: Document): string | null {
    return doc.querySelector<HTMLAnchorElement>(".paginator a.paginator-next")?.href || null;
  }
  queryList(doc: Document): HTMLElement[] {
    // .post-preview.blacklisted-active, .image-container.blacklisted-active, #c-comments .post.blacklisted-active
    return Array.from(doc.querySelectorAll(".posts-container > article:not(.blacklisted-active)"));
  }
  toImgNode(ele: HTMLElement): [ImageNode | null, string] {
    const anchor = ele.querySelector<HTMLAnchorElement>("a");
    if (!anchor) {
      evLog("error", "warn: cannot find anchor element", anchor);
      return [null, ""];
    }
    const img = anchor.querySelector<HTMLImageElement>("img");
    if (!img) {
      evLog("error", "warn: cannot find img element", img);
      return [null, ""];
    }
    const href = anchor.getAttribute("href");
    if (!href) {
      evLog("error", "warn: cannot find href", anchor);
      return [null, ""];
    }
    return [new ImageNode(img.src, href, `${ele.getAttribute("data-id") || ele.id}.jpg`), ele.getAttribute("data-tags") || ""];
  }
  getOriginalURL(doc: Document): string | null {
    return doc.querySelector<HTMLAnchorElement>("#image-resize-notice > a")?.href || null;
  }
  getNormalURL(doc: Document): string | null {
    return doc.querySelector<HTMLElement>("#image")?.getAttribute("src") || null;
  }
  extractIDFromHref(href: string): string | undefined {
    return href.match(/posts\/(\d+)/)?.[1];
  }
}

export class Rule34Matcher extends DanbooruMatcher {
  site(): string {
    return "rule34";
  }
  workURL(): RegExp {
    return /rule34.xxx\/index.php\?page=post&s=list/;
  }
  nextPage(doc: Document): string | null {
    return doc.querySelector<HTMLAnchorElement>(".pagination a[alt=next]")?.href || null;
  }
  queryList(doc: Document): HTMLElement[] {
    return Array.from(doc.querySelectorAll(".image-list > .thumb:not(.blacklisted-image) > a"));
  }
  toImgNode(ele: HTMLElement): [ImageNode | null, string] {
    const img = ele.querySelector<HTMLImageElement>("img");
    if (!img) {
      evLog("error", "warn: cannot find img element", img);
      return [null, ""];
    }
    const href = ele.getAttribute("href");
    if (!href) {
      evLog("error", "warn: cannot find href", ele);
      return [null, ""];
    }
    return [new ImageNode(img.src, href, `${ele.id}.jpg`), img.getAttribute("alt") || ""];
  }
  getOriginalURL(doc: Document): string | null {
    // image = {'domain':'https://wimg.rule34.xxx/', 'width':1700, 'height':2300,'dir':3347, 'img':'xxx.jpeg', 'base_dir':'images', 'sample_dir':'samples', 'sample_width':'850', 'sample_height':'1150'};	
    const raw = doc.querySelector("#note-container + script")?.textContent?.trim().replace("image = ", "").replace(";", "").replaceAll("'", "\"");
    try {
      if (raw) {
        const info = JSON.parse(raw) as { domain: string, base_dir: string, dir: number, img: string };
        return `${info.domain}/${info.base_dir}/${info.dir}/${info.img}`;
      }
    } catch (error) {
      evLog("error", "get original url failed", error);
    }
    return null;
  }
  getNormalURL(doc: Document): string | null {
    return doc.querySelector<HTMLElement>("#image,#gelcomVideoPlayer > source")?.getAttribute("src") || null;
  }
  extractIDFromHref(href: string): string | undefined {
    return href.match(/id=(\d+)/)?.[1];
  }
}

const POST_INFO_REGEX = /Post\.register\((.*)\)/g;
type YandereKonachanPostInfo = {
  id: number,
  md5: string,
  file_ext: string,
  file_url: string,
  preview_url: string,
  sample_url: string,
  jpeg_url: string,
}
export class YandereMatcher extends BaseMatcher {

  infos: Record<string, YandereKonachanPostInfo> = {};
  count: number = 0;

  workURL(): RegExp {
    return /yande.re\/post(?!\/show\/.*)/;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource, any, unknown> {
    let doc = document;
    yield doc;
    // find next page
    let tryTimes = 0;
    while (true) {
      const url = doc.querySelector<HTMLAnchorElement>("#paginator a.next_page")?.href;
      if (!url) break;
      try {
        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      } catch (e) {
        tryTimes++;
        if (tryTimes > 3) throw new Error(`fetch next page failed, ${e}`);
        continue;
      }
      tryTimes = 0;
      yield doc;
    }
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const doc = source as Document;
    const raw = doc.querySelector("body > form + script")?.textContent;
    if (!raw) throw new Error("cannot find post list from script");
    const matches = raw.matchAll(POST_INFO_REGEX);
    const ret = [];
    for (const match of matches) {
      if (!match || match.length < 2) continue;
      try {
        const info = JSON.parse(match[1]) as YandereKonachanPostInfo;
        this.infos[info.id.toString()] = info;
        this.count++;
        ret.push(new ImageNode(info.preview_url, `${window.location.origin}/post/show/${info.id}`, `${info.id}.${info.file_ext}`));
      } catch (error) {
        evLog("error", "parse post info failed", error);
        continue;
      }
    }
    return ret;
  }

  async fetchOriginMeta(href: string): Promise<OriginMeta> {
    let id = href.split("/").pop();
    if (!id) {
      throw new Error(`cannot find id from ${href}`);
    }
    let url: string | undefined;
    if (conf.fetchOriginal) {
      url = this.infos[id]?.file_url;
    } else {
      url = this.infos[id]?.sample_url;
    }
    if (!url) {
      throw new Error(`cannot find url for id ${id}`);
    }
    return { url };
  }

  galleryMeta(): GalleryMeta {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags")?.trim();
    const meta = new GalleryMeta(window.location.href, `yande_${tags}_${this.count}`);
    (meta as any)["infos"] = this.infos;
    return meta;
  }
}

export class KonachanMatcher extends BaseMatcher {

  infos: Record<string, YandereKonachanPostInfo> = {};
  count: number = 0;

  workURL(): RegExp {
    return /konachan.com\/post(?!\/show\/.*)/;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource, any, unknown> {
    let doc = document;
    yield doc;
    // find next page
    let tryTimes = 0;
    while (true) {
      const url = doc.querySelector<HTMLAnchorElement>("#paginator a.next_page")?.href;
      if (!url) break;
      try {
        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      } catch (e) {
        tryTimes++;
        if (tryTimes > 3) throw new Error(`fetch next page failed, ${e}`);
        continue;
      }
      tryTimes = 0;
      yield doc;
    }
  }
  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const doc = source as Document;
    const raw = doc.querySelector("body > script + script")?.textContent;
    if (!raw) throw new Error("cannot find post list from script");
    const matches = raw.matchAll(POST_INFO_REGEX);
    const ret = [];
    for (const match of matches) {
      if (!match || match.length < 2) continue;
      try {
        const info = JSON.parse(match[1]) as YandereKonachanPostInfo;
        this.infos[info.id.toString()] = info;
        this.count++;
        ret.push(new ImageNode(info.preview_url, `${window.location.origin}/post/show/${info.id}`, `${info.id}.${info.file_ext}`));
      } catch (error) {
        evLog("error", "parse post info failed", error);
        continue;
      }
    }
    return ret;
  }
  async fetchOriginMeta(href: string): Promise<OriginMeta> {
    let id = href.split("/").pop();
    if (!id) {
      throw new Error(`cannot find id from ${href}`);
    }
    let url: string | undefined;
    if (conf.fetchOriginal) {
      url = this.infos[id]?.file_url;
    } else {
      url = this.infos[id]?.sample_url;
    }
    if (!url) {
      throw new Error(`cannot find url for id ${id}`);
    }

    return { url };
  }

  galleryMeta(): GalleryMeta {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags")?.trim();
    const meta = new GalleryMeta(window.location.href, `konachan_${tags}_${this.count}`);
    (meta as any)["infos"] = this.infos;
    return meta;
  }
}

export class GelBooruMatcher extends DanbooruMatcher {
  site(): string {
    return "gelbooru";
  }
  workURL(): RegExp {
    return /gelbooru.com\/index.php\?page=post&s=list/;
  }
  nextPage(doc: Document): string | null {
    return doc.querySelector<HTMLAnchorElement>("#paginator a[alt=next]")?.href || null;
  }
  queryList(doc: Document): HTMLElement[] {
    return Array.from(doc.querySelectorAll(".thumbnail-container > article.thumbnail-preview:not(.blacklisted-image) > a"));
  }
  toImgNode(ele: HTMLElement): [ImageNode | null, string] {
    const img = ele.querySelector<HTMLImageElement>("img");
    if (!img) {
      evLog("error", "warn: cannot find img element", img);
      return [null, ""];
    }
    const href = ele.getAttribute("href");
    if (!href) {
      evLog("error", "warn: cannot find href", ele);
      return [null, ""];
    }
    return [new ImageNode(img.src, href, `${ele.id}.jpg`), img.getAttribute("alt") || ""];
  }
  getOriginalURL(doc: Document): string | null {
    return doc.querySelector("head > meta[property='og:image']")?.getAttribute("content") || null;
  }
  getNormalURL(doc: Document): string | null {
    const img = doc.querySelector<HTMLImageElement>("#image");
    if (img?.src) return img.src;
    const vidSources = Array.from(doc.querySelectorAll<HTMLSourceElement>("#gelcomVideoPlayer > source"));
    if (vidSources.length === 0) return null;
    return vidSources.find(s => s.type.endsWith("mp4"))?.src || vidSources[0].src;
  }
  extractIDFromHref(href: string): string | undefined {
    return href.match(/id=(\d+)/)?.[1];
  }
}
