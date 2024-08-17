import { conf, transient } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";


abstract class DanbooruMatcher extends BaseMatcher {
  tags: Record<string, string[]> = {};
  blacklistTags: string[] = [];
  count: number = 0;

  name(): string {
    return this.site();
  }

  abstract nextPage(doc: Document): string | null;

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let doc = document;
    this.blacklistTags = this.getBlacklist(doc);
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
  abstract getBlacklist(doc: Document): string[];

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let cached = this.cachedOriginMeta(node.href);
    if (cached) return cached;
    let url: string | null = null;
    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
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
    const id = this.extractIDFromHref(node.href);
    if (ext && id) {
      title = `${id}.${ext}`;
    }
    return { url, title };
  }

  cachedOriginMeta(_href: string): OriginMeta | null {
    return null;
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
        const tagList = tags.trim().replaceAll(": ", ":").split(" ").map(v => v.trim()).filter(v => v !== "");
        if (this.blacklistTags.findIndex(t => tagList.includes(t)) >= 0) return;
        this.tags[imgNode.title.split(".")[0]] = tagList;
      }
      list.push(imgNode);
    });
    return list;
  }

  abstract site(): string;

  galleryMeta(): GalleryMeta {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags")?.trim();
    const meta = new GalleryMeta(window.location.href, `${this.site().toLowerCase().replace(" ", "-")}_${tags}_${this.count}`);
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
    return Array.from(doc.querySelectorAll(".posts-container > article"));
  }
  getBlacklist(doc: Document): string[] {
    return doc.querySelector("meta[name='blacklisted-tags']")?.getAttribute("content")?.split(",") || [];
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
  getBlacklist(doc: Document): string[] {
    return doc.querySelector("meta[name='blacklisted-tags']")?.getAttribute("content")?.split(",") || [];
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
    const element = doc.querySelector<HTMLElement>("#image,#gelcomVideoPlayer > source");
    return element?.getAttribute("src") || element?.getAttribute("data-cfsrc") || null;
  }
  extractIDFromHref(href: string): string | undefined {
    return href.match(/id=(\d+)/)?.[1];
  }
}

const POST_INFO_REGEX = /Post\.register\((.*)\)/g;
type YandereKonachanPostInfo = {
  id: number,
  md5: string,
  file_ext?: string,
  file_url: string,
  preview_url: string,
  sample_url: string,
  jpeg_url: string,
}
export class YandereMatcher extends BaseMatcher {
  name(): string {
    return "yande.re";
  }

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

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let id = node.href.split("/").pop();
    if (!id) {
      throw new Error(`cannot find id from ${node.href}`);
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
    const meta = new GalleryMeta(window.location.href, `yande_${tags || "post"}_${this.count}`);
    (meta as any)["infos"] = this.infos;
    return meta;
  }
}

export class KonachanMatcher extends BaseMatcher {
  name(): string {
    return "konachan";
  }

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
        const ext = info.file_ext || info.file_url.split(".").pop();
        ret.push(new ImageNode(info.preview_url, `${window.location.origin}/post/show/${info.id}`, `${info.id}.${ext}`));
      } catch (error) {
        evLog("error", "parse post info failed", error);
        continue;
      }
    }
    return ret;
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let id = node.href.split("/").pop();
    if (!id) {
      throw new Error(`cannot find id from ${node.href}`);
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
    let href = doc.querySelector<HTMLAnchorElement>("#paginator a[alt=next]")?.href;
    if (href) return href;
    return doc.querySelector<HTMLAnchorElement>("#paginator b + a")?.href || null;
  }
  queryList(doc: Document): HTMLElement[] {
    return Array.from(doc.querySelectorAll(".thumbnail-container > article.thumbnail-preview:not(.blacklisted-image) > a"));
  }
  getBlacklist(doc: Document): string[] {
    return doc.querySelector("meta[name='blacklisted-tags']")?.getAttribute("content")?.split(",") || [];
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

export class E621Matcher extends DanbooruMatcher {
  cache: Map<string, { normal: string, original: string, id: string, fileExt?: string }> = new Map();
  nextPage(doc: Document): string | null {
    return doc.querySelector<HTMLAnchorElement>(".paginator #paginator-next")?.href ?? null;
  }
  getOriginalURL(): string | null {
    throw new Error("Method not implemented.");
  }
  getNormalURL(): string | null {
    throw new Error("Method not implemented.");
  }
  extractIDFromHref(): string | undefined {
    throw new Error("Method not implemented.");
  }
  getBlacklist(doc: Document): string[] {
    let content = doc.querySelector("meta[name='blacklisted-tags']")?.getAttribute("content");
    if (!content) return [];
    return content.slice(1, -1).split(",").map(s => s.slice(1, -1))
  }
  queryList(doc: Document): HTMLElement[] {
    transient.imgSrcCSP = true;
    return Array.from(doc.querySelectorAll<HTMLElement>("#posts-container > article"));
  }
  toImgNode(ele: HTMLElement): [ImageNode | null, string] {
    let src = ele.getAttribute("data-preview-url");
    if (!src) return [null, ""];
    const href = `${window.location.origin}/posts/${ele.getAttribute("data-id")}`;
    const tags = ele.getAttribute("data-tags");
    const id = ele.getAttribute("data-id");
    const normal = ele.getAttribute("data-large-url");
    const original = ele.getAttribute("data-file-url");
    const fileExt = ele.getAttribute("data-file-ext") || undefined;
    if (!normal || !original || !id) return [null, ""];
    this.cache.set(href, { normal, original, id, fileExt });
    return [new ImageNode(src, href, `${id}.jpg`), tags || ""];
  }
  cachedOriginMeta(href: string): OriginMeta | null {
    const cached = this.cache.get(href);
    if (!cached) throw new Error("miss origin meta: " + href);
    if (["webm", "webp", "mp4"].includes(cached.fileExt ?? "bbb") || conf.fetchOriginal) {
      return { url: cached.original, title: `${cached.id}.${cached.fileExt}` };
    }
    return { url: cached.normal, title: `${cached.id}.${cached.normal.split(".").pop()}` };
  }
  site(): string {
    return "e621";
  }
  workURL(): RegExp {
    return /e621.net\/(posts(?!\/)|$)/;
  }

}
