import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class BakamhMatcher extends BaseMatcher<string> {

  name(): string {
    return "Bakamh";
  }

  workURL(): RegExp {
    return /bakamh.com\/manga\/[^\/]+\/$/;
  }

  async fetchChapters(): Promise<Chapter[]> {
    const elements = Array.from(document.querySelectorAll<HTMLAnchorElement>(".listing-chapters_wrap li a"));
    const chapters = elements.map((elem, i) => {
      const title = elem.textContent?.trim() ?? ("untitled-" + (i + 1));
      return new Chapter(i, title, elem.href);
    });
    if (chapters.length === 0) throw new Error("cannot find chapters by css selector: .listing-chapters_wrap li a");
    return chapters;
  }

  async *fetchPagesSource(ch: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(ch.source);
  }

  async parseImgNodes(source: string): Promise<ImageNode[]> {
    const raw = await window.fetch(source).then(resp => resp.text()).catch(Error);
    if (raw instanceof Error) throw raw;
    const queryImages = (docRaw: string) => {
      const doc = new DOMParser().parseFromString(docRaw, "text/html");
      return Array.from(doc.querySelectorAll<HTMLImageElement>(".read-container div > img"));
    }
    let images = queryImages(raw);
    if (images.length === 0) {
      const raw_key_raw = raw.match(/var raw_key\s?\=\s?\[([\d,]*)\];/)?.[1];
      if (!raw_key_raw) throw new Error("cannot find raw_key from chapter: " + source);
      const raw_key = raw_key_raw.split(",").map(s => parseInt(s));
      const encrypted = raw.match(/var encrypted\s?\=\s?"(\w+)";/)?.[1];
      if (!encrypted) throw new Error("cannot find encrypted from chapter: " + source);
      let tag: number[] | undefined = undefined;
      let iv_raw = raw.match(/var iv\s?\=\s?\[([\d,]*)\]/)?.[1];
      if (!iv_raw) {
        iv_raw = raw.match(/var iv\s?\=\s?new Uint8Array\(\[([\d,]+)\]\)/)?.[1];
        if (!iv_raw) throw new Error("cannot find iv from chapter: " + source);
        tag = raw.match(/var tag\s?\=\s?new Uint8Array\(\[([\d,]+)\]\)/)?.[1]?.split(",").map(s => parseInt(s));
      }
      const iv = iv_raw.split(",").map(s => parseInt(s));
      try {
        const docRaw = this.decrypt(raw_key, encrypted, iv, tag);
        images = queryImages(docRaw);
      } catch (error) {
        throw new Error("decrypt failed: " + error);
      }
    }
    if (images.length === 0) throw new Error("cannot find images from chapter: " + source);
    return images.map(image => new ImageNode("", source, `${image.id}.${image.src.split(".").pop() ?? "jpg"}`, undefined, image.src));
  }

  headers(): Record<string, string> {
    return {
      "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
      "Accept-Language": "en-US,en;q=0.7,zh-CN;q=0.3",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Referer": "https://bakamh.com/",
    };
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    let title = document.querySelector("#manga-title h1")?.textContent ?? document.title;
    title = title.replaceAll(/\s/g, "");
    const meta = new GalleryMeta(window.location.href, title);
    const items = Array.from(document.querySelectorAll<HTMLElement>(".post-content > .post-content_item"));
    items.forEach(item => {
      const cate = item.querySelector(".summary-heading")?.textContent?.trim();
      if (!cate) return;
      const author = item.querySelector(".summary-content > .author-content > a")?.textContent;
      if (author) meta.tags[cate] = [author];
      const genres = item.querySelector(".summary-content > .genres-content > a")?.textContent;
      if (genres) meta.tags[cate] = [genres];
      const tags = Array.from(item.querySelectorAll(".summary-content > .tags-content > a")).map(a => a.textContent).filter(Boolean) as string[];
      if (tags && tags.length > 0) meta.tags[cate] = tags;
    });
    this.meta = meta;
    return this.meta;
  }

  decrypt(raw_key: number[], encrypted: string, iv: number[], tag?: number[]): string {
    // @ts-ignore
    const fg = forge;
    const decipher = fg.cipher.createDecipher("AES-OFB", raw_key);
    if (tag) {
      decipher.start({ iv: new Uint8Array(iv), tags: new Uint8Array(tag) });
    } else {
      decipher.start({ iv: iv });
    }
    const u8Data = new Uint8Array(encrypted.match(/.{1,2}/g)!.map(m => parseInt(m, 16)));
    decipher.update(fg.util.createBuffer(u8Data))
    if (decipher.finish()) {
      return decipher.output.data;
    } else {
      throw new Error("decipher unfinished");
    }
  }

}
