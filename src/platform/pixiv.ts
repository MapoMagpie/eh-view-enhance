import { GalleryMeta } from "../download/gallery-meta";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";
import { FFmpegConvertor } from "../utils/ffmpeg";
import ImageNode from "../img-node";
import { conf } from "../config";
import { PagesSource } from "../page-fetcher";
import * as zip_js from "@zip.js/zip.js";
import { batchFetch } from "../utils/query";

type Page = {
  urls: {
    thumb_mini: string,
    small: string,
    regular: string,
    original: string,
  },
  width: number,
  height: number
}

type Work = {
  id: string,
  title: string,
  alt: string,
  // 0: illustration, 1: manga, 2: ugoira
  illustType: 0 | 1 | 2,
  description: "",
  tags: string[],
  pageCount: number,
}

type UgoiraMeta = {
  error: boolean,
  message: string,
  body: {
    // mime_type: "image\/jpeg",
    src: string,
    originalSrc: string,
    mime_type: string,
    frames: { file: string, delay: number }[]
  }
}

const PID_EXTRACT = /\/(\d+)_([a-z]+)\d*\.\w*$/;
export class PixivMatcher extends BaseMatcher {
  name(): string {
    return "Pixiv"
  }

  authorID: string | undefined;
  meta: GalleryMeta;
  pidList: string[] = [];
  pageCount: number = 0;
  works: Record<string, Work> = {};
  ugoiraMetas: Record<string, UgoiraMeta> = {};
  pageSize: Record<string, [number, number]> = {};
  convertor?: FFmpegConvertor;
  first?: string;

  constructor() {
    super()
    this.meta = new GalleryMeta(window.location.href, "UNTITLE");
  }

  async processData(data: Uint8Array, contentType: string, url: string): Promise<[Uint8Array, string]> {
    const meta = this.ugoiraMetas[url];
    if (!meta) return [data, contentType];
    const zipReader = new zip_js.ZipReader(new zip_js.Uint8ArrayReader(data));
    const start = performance.now();
    if (!this.convertor) this.convertor = await new FFmpegConvertor().init();
    const initConvertorEnd = performance.now();
    const promises = await zipReader.getEntries()
      .then(
        entries =>
          entries.map(e => e.getData?.(new zip_js.Uint8ArrayWriter())
            .then(data => ({ name: e.filename, data }))
          )
      );
    const files = await Promise.all(promises).then((entries => entries.filter(f => f && f.data.length > 0).map(f => f!)));
    const unpackUgoira = performance.now();
    if (files.length !== meta.body.frames.length) {
      throw new Error("unpack ugoira file error: file count not equal to meta");
    }
    const blob = await this.convertor.convertTo(files, conf.pixivConvertTo, meta.body.frames);
    const convertEnd = performance.now();
    evLog("debug", `convert ugoira to ${conf.pixivConvertTo}
init convertor cost: ${(initConvertorEnd - start)}ms
unpack ugoira  cost: ${(unpackUgoira - initConvertorEnd)}ms
ffmpeg convert cost: ${(convertEnd - unpackUgoira)}ms
total cost: ${(convertEnd - start) / 1000}s
size: ${blob.size / 1000} KB, original size: ${data.byteLength / 1000} KB
before contentType: ${contentType}, after contentType: ${blob.type}
`);
    return blob.arrayBuffer().then((buffer) => [new Uint8Array(buffer), blob.type]);
  }

  workURL(): RegExp {
    return /pixiv.net\/(\w*\/)?(artworks|users)\/.*/;
  }

  galleryMeta(): GalleryMeta {
    this.meta.title = `pixiv_${this.authorID ?? this.first}_w${this.pidList.length}_p${this.pageCount}` || "UNTITLE";
    if (this.first) { // current page at artwork page
      const title = document.querySelector("meta[property='twitter:title']")?.getAttribute("content");
      if (title) {
        this.meta.title = `pixiv_${title}`
      }
    }
    const tags = Object.values(this.works).map(w => w.tags).flat();
    this.meta.tags = { "author": [this.authorID || "UNTITLE"], "all": [...new Set(tags)], "pids": this.pidList, "works": Object.values(this.works) };
    return this.meta;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    const matches = node.href.match(PID_EXTRACT);
    if (!matches || matches.length < 2) {
      return { url: node.originSrc! }; // cannot extract pid, should throw an error
    }
    const pid = matches[1];
    const p = matches[2];
    if (this.works[pid]?.illustType === 2 || p === "ugoira") {
      const meta = await window.fetch(`https://www.pixiv.net/ajax/illust/${pid}/ugoira_meta?lang=en`).then(resp => resp.json()) as UgoiraMeta;
      this.ugoiraMetas[meta.body.src] = meta;
      return { url: meta.body.src }
    } else {
      return { url: node.originSrc! };
    }
  }

  private async fetchTagsByPids(pids: string[]): Promise<void> {
    try {
      const raw = await window.fetch(`https://www.pixiv.net/ajax/user/${this.authorID}/profile/illusts?ids[]=${pids.join("&ids[]=")}&work_category=illustManga&is_first_page=0&lang=en`).then(resp => resp.json());
      const data = raw as { error: boolean, message: string, body: { works: Record<string, Work> } }
      if (!data.error) {
        // just pick up the fields we need
        const works: Record<string, Work> = {};
        Object.entries(data.body.works).forEach(([k, w]) => {
          works[k] = {
            id: w.id,
            title: w.title,
            alt: w.alt,
            illustType: w.illustType,
            description: w.description,
            tags: w.tags,
            pageCount: w.pageCount
          };
        })
        this.works = { ...this.works, ...works };
      } else {
        evLog("error", "WARN: fetch tags by pids error: ", data.message);
      }
      // console.log("fetch tags by pids: ", data);
    } catch (error) {
      evLog("error", "ERROR: fetch tags by pids error: ", error);
    }
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    if (source === "") return list;
    const pidList = JSON.parse(source as string) as string[];
    // async function but no await, it will fetch tags in background
    this.fetchTagsByPids(pidList);
    type PageData = { error: boolean, message: string, body: Page[] };
    const pageListData = await batchFetch<PageData>(pidList.map(p => `https://www.pixiv.net/ajax/illust/${p}/pages?lang=en`), 5, "json");
    for (let i = 0; i < pidList.length; i++) {
      const pid = pidList[i];
      const data = pageListData[i];
      if (data.error) {
        throw new Error(`Fetch page list error: ${data.message}`);
      }
      this.pageCount += data.body.length;
      const digits = data.body.length.toString().length;
      let j = -1;
      for (const p of data.body) {
        this.pageSize[p.urls.original] = [p.width, p.height];
        let title = p.urls.original.split("/").pop() || `${pid}_p${j.toString().padStart(digits)}.jpg`
        const matches = p.urls.original.match(PID_EXTRACT);
        if (matches && matches.length > 2 && matches[2] && matches[2] === "ugoira") {
          title = title.replace(/\.\w+$/, ".gif");
        }
        j++;
        const node = new ImageNode(p.urls.small, p.urls.original, title, undefined, p.urls.original, { w: p.width, h: p.height });
        list.push(node);
      }
    }

    return list;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    this.first = window.location.href.match(/artworks\/(\d+)$/)?.[1];
    if (this.first) {
      // TODO:
      yield JSON.stringify([this.first]);
      while (conf.pixivJustCurrPage) {
        yield "";
      }
    }
    // find author eg. https://www.pixiv.net/en/users/xxx
    const u = document.querySelector<HTMLAnchorElement>("a[data-gtm-value][href*='/users/']")?.href
      || document.querySelector<HTMLAnchorElement>("a.user-details-icon[href*='/users/']")?.href
      || window.location.href;
    const author = /users\/(\d+)/.exec(u)?.[1];
    if (!author) {
      throw new Error("Cannot find author id!");
    }
    this.authorID = author;
    // request all illusts from https://www.pixiv.net/ajax/user/{author}/profile/all
    const res = await window.fetch(`https://www.pixiv.net/ajax/user/${author}/profile/all`).then(resp => resp.json());
    if (res.error) {
      throw new Error(`Fetch illust list error: ${res.message}`);
    }
    let pidList = [...Object.keys(res.body.illusts), ...Object.keys(res.body.manga)];
    this.pidList = [...pidList];
    pidList = pidList.sort((a, b) => parseInt(b) - parseInt(a));
    // remove this.first from pidList
    if (this.first) {
      const index = pidList.indexOf(this.first);
      if (index > -1) pidList.splice(index, 1);
    }
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 20);
      yield JSON.stringify(pids);
    }
  }
}


