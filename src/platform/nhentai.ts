import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { sleep } from "../utils/sleep";
import { BaseMatcher, OriginMeta } from "./platform";

const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
export class NHMatcher extends BaseMatcher {
  meta?: GalleryMeta;
  name(): string {
    return "nhentai";
  }

  workURL(): RegExp {
    return /nhentai.net\/g\/\d+\/?$/;
  }

  parseMeta() {
    let title: string | undefined;
    let originTitle: string | undefined;
    document.querySelectorAll("#info .title").forEach(ele => {
      if (!title) {
        title = ele.textContent || undefined;
      } else {
        originTitle = ele.textContent || undefined;
      }
    });
    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    meta.originTitle = originTitle;
    const tagTrList = document.querySelectorAll<HTMLElement>(".tag-container");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const cat = tr.firstChild?.textContent?.trim().replace(":", "");
      if (cat) {
        const list: string[] = [];
        tr.querySelectorAll(".tag .name").forEach(tag => {
          const t = tag.textContent?.trim();
          if (t) {
            list.push(t);
          }
        })
        if (list.length > 0) {
          tags[cat] = list;
        }
      }
    });
    meta.tags = tags;
    this.meta = meta;
  }

  galleryMeta(): GalleryMeta {
    return this.meta!;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let text = "";
    try {
      text = await window.fetch(node.href).then(resp => resp.text());
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    return { url: NH_IMG_URL_REGEX.exec(text)![1] };
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];

    const nodes = (source as Document).querySelectorAll<HTMLElement>(".thumb-container > .gallerythumb");
    if (!nodes || nodes.length == 0) {
      throw new Error("warn: failed query image nodes!")
    }

    let i = 0;
    for (const node of Array.from(nodes)) {
      i++;
      const imgNode = node.querySelector("img");
      if (!imgNode) {
        throw new Error("Cannot find Image");
      }
      const newNode = new ImageNode(
        imgNode.getAttribute("data-src")!,
        location.origin + node.getAttribute("href")!,
        imgNode.getAttribute("title") || `${i}.jpg`,
      );
      list.push(newNode);
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    this.parseMeta();
    yield document;
  }

}

export class NHxxxMatcher extends BaseMatcher {
  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    return this.meta!;
  }
  name(): string {
    return "nhentai.xxx";
  }
  parseMeta() {
    const title = document.querySelector(".info h1")?.textContent;
    const originTItle = document.querySelector(".info h2")?.textContent;
    const meta = new GalleryMeta(window.location.href, title ?? document.title);
    meta.originTitle = originTItle ?? undefined;
    Array.from(document.querySelectorAll(".info > ul > li.tags")).forEach(ele => {
      let cat = ele.querySelector("span.text")?.textContent ?? "misc";
      cat = cat.trim().replace(":", "");
      const tags = Array.from(ele.querySelectorAll("a.tag_btn > .tag_name")).map(t => t.textContent?.trim()).filter(Boolean) as string[];
      meta.tags[cat] = tags;
    });
    this.meta = meta;
  }
  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    this.parseMeta();
    yield document;
  }
  async parseImgNodes(page: PagesSource): Promise<ImageNode[]> {
    const doc = page as Document;
    await sleep(200);
    const [files, thumbs] = this.parseInfo(doc);
    if (files.length !== thumbs.length) throw new Error("thumbs length not eq images length");
    const cover = doc.querySelector<HTMLImageElement>(".cover img")?.src;
    if (!cover) throw new Error("cannot find cover src");
    const base = cover.slice(0, cover.lastIndexOf("/") + 1);
    const ret = [];
    const digits = files.length.toString().length;
    let href = window.location.href;
    if (href.endsWith("/")) href = href.slice(0, -1);
    for (let i = 0; i < files.length; i++) {
      const title = (i + 1).toString().padStart(digits, "0");
      const thumb = thumbs[i];
      const thumbSrc = base + thumb[0] + "." + this.parseExt(thumb[1]);
      const file = files[i];
      const originSrc = base + file[0] + "." + this.parseExt(file[1]);
      ret.push(new ImageNode(thumbSrc, href + "/" + (i + 1), title + "." + this.parseExt(file[1]), undefined, originSrc));
    }
    return ret;
  }
  parseInfo(doc: Document) {
    const matches = Array.from(doc.querySelectorAll("script[type]"))
      .find(ele => ele.textContent?.trimStart().startsWith("var g_th"))
      ?.textContent?.match(/\('(.*)'\);/);
    if (!matches || matches.length !== 2) throw new Error("cannot find images info from script");
    const info = JSON.parse(matches[1]) as { fl: Record<string, string>, th: Record<string, string> };
    const files = Object.entries(info.fl);
    const thumbs = Object.entries(info.th);
    return [files, thumbs];
  }
  parseExt(str: string): string {
    switch (str.slice(0, 1)) {
      case "j": return "jpg";
      case "g": return "gif";
      case "p": return "png";
      default: throw new Error("cannot parse image extension from info: " + str);
    }
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  workURL(): RegExp {
    return /nhentai.xxx\/g\/\d+\/?$/;
  }

}
