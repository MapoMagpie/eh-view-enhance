import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { ImagePosition, splitImagesFromUrl } from "../utils/sprite-split";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class RokuHentaiMatcher extends BaseMatcher<[number, number]> {
  name(): string {
    return "rokuhentai";
  }
  sprites: ({ src: string, pos: ImagePosition } | undefined)[] = [];
  fetchedThumbnail: (string | undefined)[] = [];
  galleryId: string = "";
  imgCount: number = 0;

  workURL(): RegExp {
    return /rokuhentai.com\/\w+$/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector(".site-manga-info__title-text")?.textContent || "UNTITLE";
    const meta = new GalleryMeta(window.location.href, title);
    meta.originTitle = title;
    const tagTrList = doc.querySelectorAll<HTMLElement>("div.mdc-chip .site-tag-count");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const splits = tr.getAttribute("data-tag")?.trim().split(":");
      if (splits === undefined || splits.length === 0) return;
      const cat = splits[0];
      if (tags[cat] === undefined) tags[cat] = [];
      tags[cat].push(splits[1].replaceAll("\"", ""));
    });
    meta.tags = tags;
    return meta;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  async parseImgNodes(range: [number, number]): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    const digits = this.imgCount.toString().length;
    for (let i = range[0]; i < range[1]; i++) {
      let thumbnail = "";
      let thumbnailAsync = undefined;
      if (this.sprites[i]) {
        thumbnailAsync = this.fetchThumbnail(i);
      } else {
        thumbnail = `https://rokuhentai.com/_images/page-thumbnails/${this.galleryId}/${i}.jpg`;
      }
      const src = `https://rokuhentai.com/_images/pages/${this.galleryId}/${i}.jpg`;
      list.push(new ImageNode(thumbnail, src, i.toString().padStart(digits, "0") + ".jpg", thumbnailAsync, src));
    }
    return list;
  }

  async *fetchPagesSource(): AsyncGenerator<Result<[number, number]>> {
    const doc = document;
    const imgCount = parseInt(doc.querySelector(".mdc-typography--caption")?.textContent || "");
    if (isNaN(imgCount)) {
      throw new Error("error: failed query image count!")
    }
    this.imgCount = imgCount;
    this.galleryId = window.location.href.split("/").pop()!; // TODO: maybe extract galleryId from doc;
    // check sprite thumbnails
    const images = Array.from(doc.querySelectorAll<HTMLElement>(".mdc-layout-grid__cell .site-page-card__media"));
    for (const img of images) {
      this.fetchedThumbnail.push(undefined);
      const x = parseInt(img.getAttribute("data-offset-x") || "");
      const y = parseInt(img.getAttribute("data-offset-y") || "");
      const width = parseInt(img.getAttribute("data-width") || "");
      const height = parseInt(img.getAttribute("data-height") || "");
      if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        this.sprites.push(undefined);
        continue;
      }
      const src = img.getAttribute("data-src")!;
      this.sprites.push({ src, pos: { x, y, width, height } });
    }
    // split to range by 20 from image count
    for (let i = 0; i < this.imgCount; i += 20) {
      yield Result.ok([i, Math.min(i + 20, this.imgCount)]);
    }
  }

  private async fetchThumbnail(index: number): Promise<string> {
    if (this.fetchedThumbnail[index]) {
      return this.fetchedThumbnail[index]!;
    }
    const src = this.sprites[index]!.src;
    const positions = [];
    for (let i = index; i < this.imgCount; i++) {
      if (src === this.sprites[i]?.src) {
        positions.push(this.sprites[i]!.pos);
      } else {
        break;
      }
    }
    const urls = await splitImagesFromUrl(src, positions);
    for (let i = index; i < index + urls.length; i++) {
      this.fetchedThumbnail[i] = urls[i - index];
    }
    return this.fetchedThumbnail[index]!;
  }
  async processData(data: Uint8Array): Promise<[Uint8Array, string]> {
    // rokuhentai response no content-type, just set image/jpeg
    return [data, "image/jpeg"];
  }
}
