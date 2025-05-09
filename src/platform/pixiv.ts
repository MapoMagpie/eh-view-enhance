import { GalleryMeta } from "../download/gallery-meta";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta, Result } from "./platform";
import { FFmpegConvertor } from "../utils/ffmpeg";
import ImageNode from "../img-node";
import { conf } from "../config";
import * as zip_js from "@zip.js/zip.js";
import { batchFetch } from "../utils/query";
import { Chapter } from "../page-fetcher";
import EBUS from "../event-bus";

type AuthorPIDs = {
  id?: string,
  pids: string[],
}

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

interface PixivAPI {
  fetchChapters(): Promise<Chapter[]>;
  next(source: Chapter): AsyncGenerator<Result<AuthorPIDs[]>>;
  title(): string;
}
type PixivTop = {
  page: {
    follow: number[]
    recommend: { ids: string[] },
    recommendByTag: { tag: string, ids: string[] }[],
  },
  thumbnails: {
    illust: { id: string, url: string, userId: string }[],
  },
};

class PixivHomeAPI implements PixivAPI {
  homeData?: PixivTop;
  thumbnails: Record<string, PixivTop["thumbnails"]["illust"][0]> = {};
  pids: Record<string, string[]> = {};
  async fetchChapters(): Promise<Chapter[]> {
    const { error, body } = (await window.fetch("https://www.pixiv.net/ajax/top/illust?mode=all&lang=en")
      .then(res => res.json())) as { error: boolean, message: string, body: PixivTop };
    if (error) throw new Error("fetch your home data error, check you have already logged in");
    this.homeData = body;
    this.thumbnails = body.thumbnails.illust.reduce<PixivHomeAPI["thumbnails"]>((prev, curr) => {
      prev[curr.id] = curr;
      return prev;
    }, {});
    const chapters: Chapter[] = [];
    const byTag = body.page.recommendByTag.reduce<Record<string, string[]>>((prev, curr) => {
      prev[curr.tag] = curr.ids;
      return prev;
    }, {})
    this.pids = { "follow": body.page.follow.map(id => id.toString()), "for you": body.page.recommend.ids, ...byTag };
    let id = 0;
    for (const [t, pids] of Object.entries(this.pids)) {
      chapters.push({
        id: id,
        title: t === "follow" ? "Your Following" : "Recommend " + t,
        source: t,
        thumbimg: this.thumbnails[pids[0] ?? ""]?.url,
        queue: []
      });
      id++;
    };
    return chapters;
  }
  async *next(chapter: Chapter): AsyncGenerator<Result<AuthorPIDs[]>> {
    const pidList = this.pids[chapter.source];
    if (pidList.length === 0) {
      yield Result.ok([]);
      return;
    };
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 20);
      const grouped = pids.reduce<Record<string, string[]>>((prev, curr) => {
        const userId = this.thumbnails[curr]?.userId ?? "unk";
        if (!prev[userId]) prev[userId] = [];
        prev[userId].push(curr);
        return prev;
      }, {});
      const ret = Object.entries(grouped).map(([userID, pids]) => ({ id: userID === "unk" ? undefined : userID, pids }));
      yield Result.ok(ret);
    }
  }
  title(): string {
    return "home"
  }

}

class PixivArtistWorksAPI implements PixivAPI {
  first?: string;
  author?: string;
  title(): string {
    return this.author ?? "author";
  }
  async fetchChapters(): Promise<Chapter[]> {
    return [{
      id: 1,
      title: "Default",
      source: window.location.href,
      queue: [],
    }];
  }
  async *next(_ch: Chapter): AsyncGenerator<Result<AuthorPIDs[]>> {
    this.author = findAuthorID();
    if (!this.author) throw new Error("Cannot find author id!");
    this.first = window.location.href.match(/artworks\/(\d+)$/)?.[1];
    if (this.first) {
      yield Result.ok([{ id: this.author, pids: [this.first] }]);
      while (conf.pixivJustCurrPage) {
        yield Result.ok([]);
      }
    }
    // request all illusts from https://www.pixiv.net/ajax/user/{author}/profile/all
    const res = await window.fetch(`https://www.pixiv.net/ajax/user/${this.author}/profile/all`).then(resp => resp.json());
    if (res.error) throw new Error(`Fetch illust list error: ${res.message}`);
    let pidList = [...Object.keys(res.body.illusts), ...Object.keys(res.body.manga)];
    if (conf.pixivAscendWorks) {
      pidList = pidList.sort((a, b) => parseInt(a) - parseInt(b));
    } else {
      pidList = pidList.sort((a, b) => parseInt(b) - parseInt(a));
    }
    // remove this.first from pidList
    if (this.first) {
      const index = pidList.indexOf(this.first);
      if (index > -1) pidList.splice(index, 1);
    }
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 20);
      yield Result.ok([{ id: this.author, pids }]);
    }
  }
}

const PID_EXTRACT = /\/(\d+)_([a-z]+)\d*\.\w*$/;
export class PixivMatcher extends BaseMatcher<AuthorPIDs[]> {
  name(): string {
    return "Pixiv"
  }

  api: PixivAPI;
  meta: GalleryMeta;
  pageCount: number = 0;
  works: Record<string, Work> = {};
  ugoiraMetas: Record<string, UgoiraMeta> = {};
  convertor?: FFmpegConvertor;

  constructor() {
    super();
    this.meta = new GalleryMeta(window.location.href, "UNTITLE");
    if (/pixiv.net(\/en\/)?$/.test(window.location.href)) {
      this.api = new PixivHomeAPI();
    } else {
      this.api = new PixivArtistWorksAPI();
    }
  }

  async processData(data: Uint8Array, contentType: string, node: ImageNode): Promise<[Uint8Array, string]> {
    const meta = this.ugoiraMetas[node.originSrc!];
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
    return /pixiv.net\/(en\/)?(artworks\/.*|users\/.*|$)/;
  }

  galleryMeta(): GalleryMeta {
    this.meta.title = `pixiv_${this.api.title()}_w${Object.keys(this.works).length}_p${this.pageCount}` || "UNTITLE";
    this.meta.tags = Object.entries(this.works).reduce<Record<string, string[]>>((tags, work) => {
      tags[work[0]] = work[1].tags;
      return tags;
    }, {});
    return this.meta;
  }


  private async fetchTagsByPids(authorID: string, pids: string[]): Promise<void> {
    try {
      const raw = await window.fetch(`https://www.pixiv.net/ajax/user/${authorID}/profile/illusts?ids[]=${pids.join("&ids[]=")}&work_category=illustManga&is_first_page=0&lang=en`).then(resp => resp.json());
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


  fetchChapters(): Promise<Chapter[]> {
    return this.api.fetchChapters();
  }

  fetchPagesSource(chapter: Chapter): AsyncGenerator<Result<AuthorPIDs[]>> {
    return this.api.next(chapter);
  }

  async parseImgNodes(aps: AuthorPIDs[]): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    if (aps.length === 0) return list;
    // async function but no await, it will fetch tags in background
    const pids = [];
    for (const ap of aps) {
      if (ap.id) {
        this.fetchTagsByPids(ap.id, ap.pids);
      }
      pids.push(...ap.pids);
    }
    if (pids.length === 0) return list;
    if (conf.pixivAscendWorks) {
      pids.sort((a, b) => parseInt(a) - parseInt(b));
    } else {
      pids.sort((a, b) => parseInt(b) - parseInt(a));
    }
    type PageData = { error: boolean, message: string, body: Page[] };
    const pageListData = await batchFetch<PageData>(pids.map(p => `https://www.pixiv.net/ajax/illust/${p}/pages?lang=en`), 5, "json");
    for (let i = 0; i < pids.length; i++) {
      const pid = pids[i];
      const data = pageListData[i];
      if (data instanceof Error || data.error) {
        const reason = `pid:[${pid}], ${data.message}`;
        evLog("error", reason);
        EBUS.emit("notify-message", "error", reason, 8000);
        continue;
      }
      this.pageCount += data.body.length;
      const digits = data.body.length.toString().length;
      let j = -1;
      for (const p of data.body) {
        let title = p.urls.original.split("/").pop() || `${pid}_p${j.toString().padStart(digits)}.jpg`
        const matches = p.urls.original.match(PID_EXTRACT);
        if (matches && matches.length > 2 && matches[2] && matches[2] === "ugoira") {
          title = title.replace(/\.\w+$/, ".gif");
        }
        j++;
        const node = new ImageNode(p.urls.small, `${window.location.origin}/artworks/${pid}`, title, undefined, p.urls.original, { w: p.width, h: p.height });
        list.push(node);
      }
    }
    return list;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    const matches = node.originSrc!.match(PID_EXTRACT);
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
}

function findAuthorID(): string | undefined {
  // find author eg. https://www.pixiv.net/en/users/xxx
  const u =
    document.querySelector<HTMLAnchorElement>("a[data-gtm-value][href*='/users/']")?.href
    || document.querySelector<HTMLAnchorElement>("a.user-details-icon[href*='/users/']")?.href
    || window.location.href;
  const author = /users\/(\d+)/.exec(u)?.[1];
  return author;
}

