import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { simpleFetch } from "../utils/query";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class MangaCopyMatcher extends BaseMatcher<string> {
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
  async *fetchPagesSource(source: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(source.source);
  }
  async parseImgNodes(source: string): Promise<ImageNode[]> {
    const raw = await simpleFetch(source, "text", { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36" });
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const jojoKey = raw.match(/var (jojo|ccy)\s?=\s?'(.*?)';/)?.[2];
    if (!jojoKey) throw new Error("cannot find jojoKey for decrypt :(");
    const contentKey = doc.querySelector(".imageData[contentKey]")?.getAttribute("contentKey");
    if (!contentKey) throw new Error("cannot find content key");
    try {
      const decryption = await decrypt(contentKey, jojoKey);
      const images = JSON.parse(decryption) as { url: string }[];
      const digits = images.length.toString().length;
      return images.map((img, i) => {
        return new ImageNode("", source as string, (i + 1).toString().padStart(digits, "0") + ".webp", undefined, img.url);
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
    const comicInfoURL = `https://api.mangacopy.com/api/v3/comic2/${pathWord}?platform=1&_update=true`;
    const comicInfo = await window.fetch(comicInfoURL).then<{ code: number, message: string, results: MCAPIComicDetail }>(res => res.json()).catch(reason => new Error(reason.toString()));
    if (comicInfo instanceof Error || !comicInfo.results.groups) throw new Error("fetch comic detail error: " + comicInfo.toString());
    if (comicInfo.code !== 200) throw new Error("fetch comic detail error: " + comicInfo.message);

    const chapters: Chapter[] = [];
    // fetch all chapters by group
    const groups = comicInfo.results.groups;
    let chapterCount = 0;
    for (const group in groups) {
      let offset = 0;
      while (true) {
        const chaptersURL = `https://api.mangacopy.com/api/v3/comic/${pathWord}/group/${groups[group].path_word}/chapters?limit=100&offset=${offset}&_update=true`;
        const data = await window.fetch(chaptersURL).then<{ code: number, message: string, results: MCAPIChapterResult }>(res => res.json()).catch(reason => new Error(reason.toString()));
        if (data instanceof Error) throw new Error("fetch chapters error: " + data.toString());
        if (data.code !== 200) throw new Error("fetch chaters error: " + data.message);
        const result = data.results;
        offset += result.list.length;
        for (const ch of result.list) {
          chapters.push(new Chapter(
            chapterCount++,
            group === "default" ? ch.name : `${groups[group].name}-${ch.name}`,
            // source: `https://api.mangacopy.com/api/v3/comic/${pathWord}/chapter2/${ch.uuid}?platform=1&_update=true`,
            `${window.location.origin}/comic/${pathWord}/chapter/${ch.uuid}`,
            thumbimg,
          ));
        }
        if (offset >= result.total) break;
      }
    }
    return chapters;

    // let details: MCChapterDetails;
    // try {
    //   const decryption = await decrypt(data.results);
    //   details = JSON.parse(decryption);
    // } catch (error) {
    //   throw new Error("parse chapter details error: " + (error as any).toString());
    // }
  }
}

const PATH_WORD_REGEX = /\/comic\/(\w*)/;

async function decrypt(raw: string, jojoKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  // Key and IV
  // const dioKey = encoder.encode("xxxmanga.woo.key");
  const jojo = encoder.encode(jojoKey);
  const header = raw.substring(0, 16); // First 16 characters as IV
  const body = raw.substring(16); // Rest is the encrypted data
  const iv = encoder.encode(header);
  // Decode body from Hex to Uint8Array
  const bodyBytes = new Uint8Array(
    body.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  // Import the AES key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    jojo,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  // Decrypt
  const decryptedBytes = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv, },
    cryptoKey,
    bodyBytes
  );
  // Convert decrypted data to string
  return decoder.decode(decryptedBytes);
}

// function decrypt(raw: string): string {
//   const dio = "xxxmanga.woo.key";
//   const cypto: any = initCypto();
//   const str = raw;
//   const header = str.substring(0x0, 0x10);
//   const body = str.substring(0x10, str.length);
//   const dioEn = cypto.enc.Utf8["parse"](dio);
//   const headerEn = cypto.enc.Utf8["parse"](header);
//   const bodyDe = (function(b: string) {
//     const bHex = cypto.enc.Hex.parse(b);
//     const b64 = cypto.enc.Base64.stringify(bHex);
//     return cypto.AES.decrypt(b64, dioEn, {
//       iv: headerEn,
//       mode: cypto.mode["CBC"],
//       padding: cypto.pad.Pkcs7,
//     }).toString(cypto["enc"].Utf8).toString();
//   })(body);
//   return bodyDe;
// }
// 
// function initCypto(): any {
//   const c: { exports: any, i: number, l: boolean }[] = [];
//   function r(i: number) {
//     if (c[i]) return c[i].exports;
//     c[i] = {
//       i: i,
//       l: false,
//       exports: {}
//     };
//     const e = c[i];
//     // @ts-ignore
//     const wj = webpackJsonp;
//     return wj[0][1][i].call(e.exports, e, e.exports, r), e.l = true, e.exports;
//   }
//   return r(6);
// }

type MCAPIChapter = {
  index: number,
  uuid: string,
  count: number,
  ordered: number,
  size: number,
  name: string,
  comic_id: string,
  comic_path_word: string,
  group_id: string,
  group_path_word: string,
  type: number,
  img_type: number,
  news: string,
  datetime_created: string,
  prev?: string,
  next?: string,
}

type MCAPIChapterResult = {
  total: number,
  limit: number,
  offset: number,
  list: MCAPIChapter[],
}

type MCAPIComicDetail = {
  is_banned: boolean,
  is_lock: boolean,
  is_login: boolean,
  is_mobile_bind: boolean,
  is_vip: boolean,
  comic: {
    uuid: string,
    ban: string,
    name: string,
    alias: string,
    path_word: string,
    free_type: {
      display: string,
      value: number,
    },
    brief: string, // description
    cover: string, // thumbnail image
    last_chapter: {
      uuid: string,
      name: string,
    }
  },
  groups: Record<string, MCGroupInfo>,
}

type MCGroupInfo = {
  path_word: string,
  count: number,
  name: string,
}
