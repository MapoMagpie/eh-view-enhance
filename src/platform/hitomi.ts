import { GalleryMeta } from "../downloader";
import { Matcher, PagesSource } from "./platform";


class HitomiGG {
  base: string = "a"
  ext: string = "webp"
  b: string
  m: Function;
  constructor(b: string, m: string) {
    this.b = b;
    this.m = new Function("g", m);
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

  url(hash: string): string {
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

const HASH_REGEX = /#(\d*)$/;
const GG_M_REGEX = /m:\sfunction\(g\)\s{(.*?return.*?;)/gms;
const GG_B_REGEX = /b:\s'(\d*\/)'/;
export class HitomiMather implements Matcher {
  gg?: HitomiGG
  meta?: GalleryMeta
  info?: GalleryInfo

  public async matchImgURL(hash: string, _: boolean): Promise<string> {
    const url = this.gg!.url(hash);
    console.log("hitomi image url: " + url);
    return url;
  }

  public async parseImgNodes(page: PagesSource, template: HTMLElement): Promise<HTMLElement[]> {
    if (!this.info) {
      throw new Error("warn: hitomi gallery info is null!")
    }
    const list: HTMLElement[] = [];
    const doc = page.raw as Document;
    const nodes = doc.querySelectorAll<HTMLAnchorElement>(".simplePagerContainer .thumbnail-container a");
    if (!nodes || nodes.length == 0) {
      throw new Error("warn: failed query image nodes!")
    }
    for (const node of Array.from(nodes)) {
      const sceneIndex = Number(HASH_REGEX.exec(node.href)![1]) - 1;
      const img = node.querySelector<HTMLImageElement>("img");
      if (!img) {
        throw new Error("warn: failed query image node!")
      }
      const src = img.src;
      if (!src) {
        throw new Error(`warn: failed get Image Src`);
      }
      const badge = (() => {
        const badge = node.querySelector(".badge");
        return badge ? Number(badge.textContent) : 1;
      })();

      for (let i = 0; i < badge; i++) {
        const newImgNode = template.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("ahref", this.info.files[i + sceneIndex].hash);
        newImg.setAttribute("asrc", src);
        newImg.setAttribute("title", this.info.files[i + sceneIndex].name);
        list.push(newImgNode);
      }
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    // fetch gg.js
    const ggRaw = await window.fetch("https://ltn.hitomi.la/gg.js").then(resp => resp.text());
    this.gg = new HitomiGG(GG_B_REGEX.exec(ggRaw)![1], GG_M_REGEX.exec(ggRaw)![1]);

    // query gallery id
    const galleryID = document.querySelector<HTMLAnchorElement>("#gallery-brand a")?.href?.split("/").pop()?.replace(".html", "");
    if (!galleryID) {
      throw new Error("cannot query hitomi gallery id");
    }
    const infoRaw = await window.fetch(`https://ltn.hitomi.la/galleries/${galleryID}.js`).then(resp => resp.text()).then(text => text.replace("var galleryinfo = ", ""));

    if (!infoRaw) {
      throw new Error("cannot query hitomi gallery info");
    }

    const info = JSON.parse(infoRaw);
    this.setGalleryMeta(info, galleryID);
    this.info = {
      files: info.files,
      scene_indexes: info.scene_indexes
    }
    yield { raw: document, typ: "doc" };
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
