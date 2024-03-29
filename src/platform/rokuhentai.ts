import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { ImagePosition, splitImagesFromUrl } from "../utils/sprite-split";
import { Matcher, OriginMeta, PagesSource } from "./platform";

export class RokuHentaiMatcher implements Matcher {
  sprites: ({ src: string, pos: ImagePosition } | undefined)[] = [];
  fetchedThumbnail: (string | undefined)[] = [];
  galleryId: string = "";
  imgCount: number = 0;

  async processData(data: Uint8Array, _1: string, _2: string): Promise<Uint8Array> {
    return data;
  }

  workURL(): RegExp {
    return /rokuhentai.com\/\w+$/;
  }

  public parseGalleryMeta(doc: Document): GalleryMeta {
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

  public async fetchOriginMeta(url: string, _: boolean): Promise<OriginMeta> {
    return { url };
  }

  public async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const range = (source.raw as string).split("-").map(Number);
    const list: ImageNode[] = [];
    const digits = this.imgCount.toString().length;
    for (let i = range[0]; i < range[1]; i++) {
      let thumbnail = `https://rokuhentai.com/_images/page-thumbnails/${this.galleryId}/${i}.jpg`;
      if (this.sprites[i]) {
        thumbnail = await this.fetchThumbnail(i);
      }
      const newNode = new ImageNode(
        thumbnail,
        `https://rokuhentai.com/_images/pages/${this.galleryId}/${i}.jpg`,
        i.toString().padStart(digits, "0") + ".jpg",
      );
      list.push(newNode);
    }
    return list;
  }

  public async * fetchPagesSource(): AsyncGenerator<PagesSource> {
    const imgCount = parseInt(document.querySelector(".mdc-typography--caption")?.textContent || "");
    if (isNaN(imgCount)) {
      throw new Error("error: failed query image count!")
    }
    this.imgCount = imgCount;
    this.galleryId = window.location.href.split("/").pop()!;
    // check sprite thumbnails
    const images = Array.from(document.querySelectorAll<HTMLElement>(".mdc-layout-grid__cell .site-page-card__media"));
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
      yield { raw: `${i}-${Math.min(i + 20, this.imgCount)}`, typ: "json" }
    }
  }

  private async fetchThumbnail(index: number): Promise<string> {
    if (this.fetchedThumbnail[index]) {
      return this.fetchedThumbnail[index]!;
    } else {
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
  }
}
