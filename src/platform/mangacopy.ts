import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

export class MangaCopyMatcher extends BaseMatcher {
  name(): string {
    return "拷贝漫画";
  }
  update_date?: string;
  chapterCount: number = 0;
  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    let title = document.querySelector(".comicParticulars-title-right > ul > li > h6")?.textContent ?? document.title;
    document.querySelectorAll(".comicParticulars-title-right > ul > li > span.comicParticulars-right-txt").forEach(ele => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(ele.textContent?.trim() || "")) {
        this.update_date = ele.textContent?.trim();
      }
    });
    title += "-c" + this.chapterCount + (this.update_date ? "-" + this.update_date : "")
    this.meta = new GalleryMeta(window.location.href, title);
    return this.meta;
  }
  async *fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource> {
    yield source.source;
  }
  async parseImgNodes(page: PagesSource): Promise<ImageNode[]> {
    const raw = await window.fetch(page as string).then(resp => resp.text());
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const contentKey = doc.querySelector(".imageData[contentKey]")?.getAttribute("contentKey");
    if (!contentKey) throw new Error("cannot find content key");
    try {
      const decryption = decrypt(contentKey);
      const images = JSON.parse(decryption) as { url: string }[];
      const digits = images.length.toString().length;
      return images.map((img, i) => {
        return new ImageNode("", page as string, (i + 1).toString().padStart(digits, "0") + ".webp", undefined, img.url);
      })
    } catch (error) {
      throw new Error("cannot decrypt contentKey: " + (error as any).toString() + "\n" + contentKey);
    }
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  workURL(): RegExp {
    return /(mangacopy|copymanga).*?\/comic\/[^\/]*\/?$/;
  }
  async fetchChapters(): Promise<Chapter[]> {
    const thumbimg = document.querySelector<HTMLImageElement>(".comicParticulars-left-img > img[data-src]")?.getAttribute("data-src") || undefined;
    const pathWord = window.location.href.match(PATH_WORD_REGEX)?.[1];
    if (!pathWord) throw new Error("cannot match comic id");
    const url = `${window.location.origin}/comicdetail/${pathWord}/chapters`;
    const data = await window.fetch(url).then<{ code: number, message: string, results: string }>(res => res.json()).catch(reason => new Error(reason.toString()));
    if (data instanceof Error) throw new Error("fetch chapter detail error: " + data.toString());
    if (data.code !== 200) throw new Error("fetch chater detail error: " + data.message);
    let details: MCChapterDetails;
    try {
      const decryption = decrypt(data.results);
      details = JSON.parse(decryption);
    } catch (error) {
      throw new Error("parse chapter details error: " + (error as any).toString());
    }
    const origin = window.location.origin;
    return [...details.groups.default.chapters, ...(details.groups.tankobon?.chapters ?? [])].map((ch, i) => {
      this.chapterCount++;
      return {
        id: i + 1,
        title: ch.name,
        source: `${origin}/comic/${pathWord}/chapter/${ch.id}`,
        queue: [],
        thumbimg,
      }
    });
  }
}

const PATH_WORD_REGEX = /\/comic\/(\w*)/;

function initCypto(): any {
  let c: { exports: any, i: number, l: boolean }[] = [];
  function r(i: number) {
    if (c[i]) return c[i].exports;
    c[i] = {
      i: i,
      l: false,
      exports: {}
    };
    let e = c[i];
    // @ts-ignore
    const wj = webpackJsonp;
    return wj[0][1][i].call(e.exports, e, e.exports, r), e.l = true, e.exports;
  }
  return r(6);
}

function decrypt(raw: string): string {
  let dio = "xxxmanga.woo.key";
  let cypto: any = initCypto();
  let str = raw;
  let header = str.substring(0x0, 0x10);
  let body = str.substring(0x10, str.length);
  let dioEn = cypto.enc.Utf8["parse"](dio);
  let headerEn = cypto.enc.Utf8["parse"](header);
  let bodyDe = (function(b: string) {
    let bHex = cypto.enc.Hex.parse(b);
    let b64 = cypto.enc.Base64.stringify(bHex);
    return cypto.AES.decrypt(b64, dioEn, {
      iv: headerEn,
      mode: cypto.mode["CBC"],
      padding: cypto.pad.Pkcs7,
    }).toString(cypto["enc"].Utf8).toString();
  })(body);
  return bodyDe;
}

type MCGroupInfo = {
  path_word: string,
  count: number,
  name: string,
  chapters: MCChapter[],
  last_chapter: MCLastChapter,
}

type MCChapter = {
  type: number,
  name: string,
  id: string
}

type MCLastChapter = {
  index: number,
  uuid: string,
  count: number,
  ordered: number,
  size: number,
  name: string,
  comic_id: string,
  comic_path_word: string,
  group_id?: string,
  group_path_word: string,
  type: number,
  img_type: number,
  news: string,
  datetime_created: string,
  prev?: string,
  next?: string,
}

type MCChapterDetails = {
  build: {
    path_word: string,
    type: { id: number, name: string }[]
  },
  groups: {
    default: MCGroupInfo,
    tankobon: MCGroupInfo,
  }
}

// const a = {
//   "build": {
//     "path_word": "eldenringhuangjinshuzhilu",
//     "type": [
//       { "id": 1, "name": "\\u8a71" },
//       { "id": 2, "name": "\\u5377" },
//       { "id": 3, "name": "\\u756a\\u5916\\u7bc7" }]
//   },
//   "groups": {
//     "default": {
//       "path_word": "default",
//       "count": 48,
//       "name": "\\u9ed8\\u8a8d",
//       "chapters": [
//         { "type": 1, "name": "\\u7b2c01\\u8bdd", "id": "abbab208 - 2c32- 11ed - ac9b-024352452ce0" },
//         { "type": 1, "name": "\\u7b2c02\\u8bdd", "id": "af0ba516-2c32 - 11ed - ac9b-024352452ce0" },
//       ],
//       "last_chapter": {
//         "index": 47,
//         "uuid": "c984abfa - 39c7 - 11ef - 96d1 - 3f487b7d9a9a",
//         "count": 48,
//         "ordered": 460,
//         "size": 20,
//         "name": "\\u7b2c46\\u8bdd",
//         "comic_id": "a2c8545c - 2c32 - 11ed - ac9b-024352452ce0",
//         "comic_path_word": "eldenringhuangjinshuzhilu",
//         "group_id": null,
//         "group_path_word": "default ",
//         "type": 1,
//         "img_type": 1,
//         "news": "success",
//         "datetime_created": "2024-07-04",
//         "prev": "271634bc - 2df9 - 11ef - 9302 - 3f487b7d9a9a",
//         "next": null
//       }
//     },
//     "tankobon": {
//       "path_word": "tankobon",
//       "count": 4,
//       "name": "\\u5355\\u884c\\u672c",
//       "chapters": [
//         { "type": 2, "name": "\\u7b2c01\\u5377", "id": "b85b2186 - d55b - 11ee- bdc6 - 55b00c27fb36" },
//         { "type": 2, "name": "\\u7b2c02\\u5377", "id": "c319160a - d55b - 11ee - bdc6 - 55b00c27fb36" },
//         { "type": 2, "name": "\\u7b2c03\\u5377", "id": "c56dfdf4 - 24ec - 11ef - 8eac - 3f487b7d9a9a" },
//         { "type": 2, "name": "\\u7b2c04\\u5377", "id": "e89cb286 - 4b2d - 11ef - 9fe0 - 3f487b7d9a9a" }
//       ],
//       "last_chapter": {
//         "index": 3,
//         "uuid": "e89cb286 - 4b2d - 11ef - 9fe0 - 3f487b7d9a9a",
//         "count": 4,
//         "ordered": 40,
//         "size": 168,
//         "name": "\\u7b2c04\\u5377",
//         "comic_id": "a2c8545c - 2c32 - 11ed - ac9b-024352452ce0",
//         "comic_path_word": "eldenringhuangjinshuzhilu",
//         "group_id": "556d186c - c54a - 11e8 - 878d-024352452ce0",
//         "group_path_word": "tankobon",
//         "type": 2,
//         "img_type": 1,
//         "news": "success",
//         "datetime_created": "2024-07 - 26",
//         "prev": "c56dfdf4 - 24ec - 11ef - 8eac - 3f487b7d9a9a",
//         "next": null
//       }
//     }
//   }
// }
