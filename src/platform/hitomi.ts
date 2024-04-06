import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";


class HitomiGG {
  base: string = "a"
  ext: string = "webp"
  b: string
  m: Function;
  constructor(b: string, m: string) {
    this.b = b;
    this.m = new Function("g", m);
  }
  real_full_path_from_hash(hash: string) {
    return hash.replace(/^.*(..)(.)$/, '$2/$1/' + hash);
  }
  s(h: string) {
    const m = /(..)(.)$/.exec(h)!;
    return parseInt(m[2] + m[1], 16).toString(10);
  }
  subdomain_from_url(url: string, base: string) {
    var retval = 'b';
    if (base) {
      retval = base;
    }
    var b = 16;
    var r = /\/[0-9a-f]{61}([0-9a-f]{2})([0-9a-f])/;
    var m = r.exec(url);
    if (!m) {
      return 'a';
    }
    let g = parseInt(m[2] + m[1], b);
    if (!isNaN(g)) {
      retval = String.fromCharCode(97 + this.m(g)) + retval;
    }
    return retval;
  }

  thumbURL(hash: string): string {
    hash = hash.replace(/^.*(..)(.)$/, '$2/$1/' + hash);
    let url = 'https://a.hitomi.la/' + 'webpsmalltn' + '/' + hash + '.' + 'webp';
    return url.replace(/\/\/..?\.hitomi\.la\//, '//' + this.subdomain_from_url(url, 'tn') + '.hitomi.la/');
  }

  originURL(hash: string): string {
    let url = 'https://a.hitomi.la/' + this.ext + '/' + this.b + this.s(hash) + '/' + hash + '.' + this.ext;
    url = url.replace(/\/\/..?\.hitomi\.la\//, '//' + this.subdomain_from_url(url, this.base) + '.hitomi.la/');
    return url;
  }
}

type GalleryInfo = {
  scene_indexes: number[]
  files: {
    name: string,
    hasavif: 1 | 0,
    hasjxl: 1 | 0,
    hash: string,
    haswebp: 1 | 0,
    height: number,
    width: number
  }[]
}

// const HASH_REGEX = /#(\d*)$/;
const GG_M_REGEX = /m:\sfunction\(g\)\s{(.*?return.*?;)/gms;
const GG_B_REGEX = /b:\s'(\d*\/)'/;
export class HitomiMather extends BaseMatcher {

  gg?: HitomiGG;
  meta?: GalleryMeta;
  infoRecord: Record<number, GalleryInfo> = {};

  workURL(): RegExp {
    return /hitomi.la\/(?!reader)\w+\/.*\d+\.html/;
  }

  public async fetchChapters(): Promise<Chapter[]> {
    // fetch gg.js
    const ggRaw = await window.fetch("https://ltn.hitomi.la/gg.js").then(resp => resp.text());
    this.gg = new HitomiGG(GG_B_REGEX.exec(ggRaw)![1], GG_M_REGEX.exec(ggRaw)![1]);
    const ret: Chapter[] = [];
    ret.push({
      id: 0,
      title: document.querySelector("#gallery-brand")?.textContent || "default",
      source: window.location.href,
      queue: [],
      thumbimg: document.querySelector<HTMLImageElement>(".content > .cover-column > .cover img")?.src
    });
    document.querySelectorAll("#related-content > div").forEach((element, i) => {
      const a = element.querySelector<HTMLAnchorElement>("h1.lillie > a");
      if (a) {
        ret.push({
          id: i,
          title: a.textContent || "default-" + i,
          source: a.href,
          queue: [],
          thumbimg: element.querySelector<HTMLImageElement>("img")?.src
        });
      }
    });
    return ret;
  }

  public async *fetchPagesSource(chapter: Chapter): AsyncGenerator<PagesSource> {
    const url = chapter.source as string;

    const galleryID = url.match(/([0-9]+)(?:\.html)/)?.[1];
    if (!galleryID) {
      throw new Error("cannot query hitomi gallery id");
    }
    const infoRaw = await window.fetch(`https://ltn.hitomi.la/galleries/${galleryID}.js`).then(resp => resp.text()).then(text => text.replace("var galleryinfo = ", ""));

    if (!infoRaw) {
      throw new Error("cannot query hitomi gallery info");
    }

    const info = JSON.parse(infoRaw);
    this.setGalleryMeta(info, galleryID);
    this.infoRecord[chapter.id] = {
      files: info.files,
      scene_indexes: info.scene_indexes
    }
    const doc = await window.fetch(url).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html"));
    yield doc;
  }

  public async parseImgNodes(_page: PagesSource, chapterID: number): Promise<ImageNode[]> {
    if (!this.infoRecord[chapterID]) {
      throw new Error("warn: hitomi gallery info is null!")
    }
    const files = this.infoRecord[chapterID].files;
    // const sceneIndexes = this.infoRecord[chapterID].scene_indexes;
    // let nextSceneIndex = 0;
    const list: ImageNode[] = [];
    for (let i = 0; i < files.length; i++) {
      const node = new ImageNode(
        this.gg!.thumbURL(files[i].hash),
        files[i].hash,
        files[i].name,
      );
      list.push(node);
    }
    return list;
  }

  public async fetchOriginMeta(hash: string, _: boolean): Promise<OriginMeta> {
    const url = this.gg!.originURL(hash);
    return { url };
  }

  private setGalleryMeta(info: any, galleryID: string) {
    this.meta = new GalleryMeta(window.location.href, info["title"] as string || "hitomi-" + galleryID);
    this.meta.originTitle = info["japanese_title"] as string;
    const excludes = ["scene_indexes", "files"];
    for (const key in info) {
      if (excludes.indexOf(key) > -1) {
        continue;
      }
      this.meta.tags[key] = info[key];
    }
  }

  public parseGalleryMeta(_: Document): GalleryMeta {
    return this.meta || new GalleryMeta(window.location.href, "hitomi");
  }

}
