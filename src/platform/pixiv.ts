import JSZip from "jszip";
import { GalleryMeta } from "../download/gallery-meta";
import { evLog } from "../utils/ev-log";
import { Matcher, PagesSource } from "./platform";
import { FFmpegConvertor } from "../utils/ffmpeg";

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

type UgoiraMeat = {
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

const PATH_REGEX = /pixiv\.net\/(\w*\/)?(artworks|users)\/.*/;
const PID_EXTRACT = /\/(\d+)_([a-z]+)\d*\.\w*$/;
export class Pixiv implements Matcher {

  authorID: string | undefined;
  meta: GalleryMeta;
  pidList: string[] = [];
  pageCount: number = 0;
  works: Record<string, Work> = {};
  pageSize: Record<string, [number, number]> = {};
  convertor?: FFmpegConvertor;

  constructor() {
    this.meta = new GalleryMeta(window.location.href, "UNTITLE");
  }

  work(url: string): boolean {
    return PATH_REGEX.test(url);
  }

  public parseGalleryMeta(_: Document): GalleryMeta {
    this.meta.title = `PIXIV_${this.authorID}_w${this.pidList.length}_p${this.pageCount}` || "UNTITLE";
    let tags = Object.values(this.works).map(w => w.tags).flat();
    this.meta.tags = { "author": [this.authorID || "UNTITLE"], "all": [...new Set(tags)], "pids": this.pidList, "works": Object.values(this.works) };
    return this.meta;
  }

  public async matchImgURL(url: string, _: boolean): Promise<string> {
    const matches = url.match(PID_EXTRACT);
    if (!matches || matches.length < 2) {
      return url;
    }
    const pid = matches[1];
    const p = matches[2];
    if (this.works[pid]?.illustType !== 2 || p !== "ugoira") {
      return url;
    }
    const meta = await window.fetch(`https://www.pixiv.net/ajax/illust/${pid}/ugoira_meta?lang=en`).then(resp => resp.json()) as UgoiraMeat;
    const data = await window.fetch(meta.body.originalSrc).then(resp => resp.blob());
    const zip = await new JSZip().loadAsync(data);
    if (!this.convertor) {
      this.convertor = await new FFmpegConvertor().init();
    }
    const files = await Promise.all(
      meta.body.frames.map(async (f) => {
        try {
          const img = await zip.file(f.file)!.async("uint8array");
          return { name: f.file, data: img };
        } catch (error) {
          evLog("unpack ugoira file error: ", error);
          throw error;
        }
      })
    );
    if (files.length !== meta.body.frames.length) {
      throw new Error("unpack ugoira file error: file count not equal to meta");
    }
    const blob = await this.convertor.convertToGif(files, meta.body.frames);
    return URL.createObjectURL(blob);

  }

  async fetchTagsByPids(pids: string[]): Promise<void> {
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
        evLog("WARN: fetch tags by pids error: ", data.message);
      }
      // console.log("fetch tags by pids: ", data);
    } catch (error) {
      evLog("ERROR: fetch tags by pids error: ", error);
    }
  }

  public async parseImgNodes(raw: PagesSource, template: HTMLElement): Promise<HTMLElement[]> {
    const list: HTMLElement[] = [];
    const pidList = JSON.parse(raw.raw as string) as string[];
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
        const newImgNode = template.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("ahref", p.urls.original);
        newImg.setAttribute("asrc", p.urls.small);
        newImg.setAttribute("title", title);
        list.push(newImgNode);
      }
    }

    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    // find author eg. https://www.pixiv.net/en/users/xxx
    let u = document.querySelector<HTMLAnchorElement>("a[data-gtm-value][href*='/users/']")?.href || window.location.href;
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
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 20);
      yield { raw: JSON.stringify(pids), typ: "json" }
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

