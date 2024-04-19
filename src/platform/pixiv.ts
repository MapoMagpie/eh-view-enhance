import JSZip from "jszip";
import { GalleryMeta } from "../download/gallery-meta";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";
import { FFmpegConvertor } from "../utils/ffmpeg";
import ImageNode from "../img-node";
import { conf } from "../config";
import { PagesSource } from "../page-fetcher";

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
export class Pixiv extends BaseMatcher {

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
    const zip = await new JSZip().loadAsync(data);
    const start = performance.now();
    if (!this.convertor) this.convertor = await new FFmpegConvertor().init();
    const initConvertorEnd = performance.now();
    const files = await Promise.all(
      meta.body.frames.map(async (f) => {
        try {
          const img = await zip.file(f.file)!.async("uint8array");
          return { name: f.file, data: img };
        } catch (error) {
          evLog("error", "unpack ugoira file error: ", error);
          throw error;
        }
      })
    );
    const unpackUgoira = performance.now();
    if (files.length !== meta.body.frames.length) {
      throw new Error("unpack ugoira file error: file count not equal to meta");
    }
    // record cost time
    const blob = await this.convertor.convertTo(files, conf.convertTo, meta.body.frames);
    const convertEnd = performance.now();
    evLog("debug", `convert ugoira to ${conf.convertTo}
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
    this.meta.title = `PIXIV_${this.authorID}_w${this.pidList.length}_p${this.pageCount}` || "UNTITLE";
    let tags = Object.values(this.works).map(w => w.tags).flat();
    this.meta.tags = { "author": [this.authorID || "UNTITLE"], "all": [...new Set(tags)], "pids": this.pidList, "works": Object.values(this.works) };
    return this.meta;
  }

  async fetchOriginMeta(url: string): Promise<OriginMeta> {
    const matches = url.match(PID_EXTRACT);
    if (!matches || matches.length < 2) {
      return { url };
    }
    const pid = matches[1];
    const p = matches[2];
    if (this.works[pid]?.illustType !== 2 || p !== "ugoira") {
      return { url };
    }
    const meta = await window.fetch(`https://www.pixiv.net/ajax/illust/${pid}/ugoira_meta?lang=en`).then(resp => resp.json()) as UgoiraMeta;
    this.ugoiraMetas[meta.body.src] = meta;
    return { url: meta.body.src }
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
    const pidList = JSON.parse(source as string) as string[];
    // async function but no await, it will fetch tags in background
    this.fetchTagsByPids(pidList);

    const pageListData = await fetchUrls(pidList.map(p => `https://www.pixiv.net/ajax/illust/${p}/pages?lang=en`), 5);
    for (let i = 0; i < pidList.length; i++) {
      const pid = pidList[i];
      const data = JSON.parse(pageListData[i]) as { error: boolean, message: string, body: Page[] };
      if (data.error) {
        throw new Error(`Fetch page list error: ${data.message}`);
      }
      this.pageCount += data.body.length;
      let digits = data.body.length.toString().length;
      let j = -1;
      for (const p of data.body) {
        this.pageSize[p.urls.original] = [p.width, p.height];
        let title = p.urls.original.split("/").pop() || `${pid}_p${j.toString().padStart(digits)}.jpg`
        const matches = p.urls.original.match(PID_EXTRACT);
        if (matches && matches.length > 2 && matches[2] && matches[2] === "ugoira") {
          title = title.replace(/\.\w+$/, ".gif");
        }
        j++;
        const node = new ImageNode(
          p.urls.small,
          p.urls.original,
          title,
        );
        list.push(node);
      }
    }

    return list;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    // find author eg. https://www.pixiv.net/en/users/xxx
    let u = document.querySelector<HTMLAnchorElement>("a[data-gtm-value][href*='/users/']")?.href || document.querySelector<HTMLAnchorElement>("a.user-details-icon[href*='/users/']")?.href || window.location.href;
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
    // try to get current pid from href
    this.first = window.location.href.match(/artworks\/(\d+)$/)?.[1];
    if (this.first) {
      // remove this.first from pidList
      const index = pidList.indexOf(this.first);
      if (index > -1) {
        pidList.splice(index, 1);
      }
      pidList.unshift(this.first);
    }
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 20);
      yield JSON.stringify(pids);
    }

  }
}

async function fetchUrls(urls: string[], concurrency: number): Promise<string[]> {
  const results = new Array(urls.length);
  let i = 0;
  while (i < urls.length) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map((url, index) =>
      window.fetch(url).then((resp) => {
        if (resp.ok) {
          return resp.text();
        }
        throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
      }).then(raw => results[index + i] = raw)
    );

    await Promise.all(batchPromises);
    i += concurrency;
  }
  return results;
}

