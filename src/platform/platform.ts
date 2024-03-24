import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";


export type OriginMeta = {
  url: string,
  title?: string,
}

export interface Matcher {
  /**
   * step 0: in some site, the gallery is divided into chapters
   */
  fetchChapters(): Promise<Chapter[]>;
  /**
   * step 1: fetch page source
   */
  fetchPagesSource(chapter: Chapter): AsyncGenerator<PagesSource>;
  /**
   * step 2: parse img nodes from page source
   */
  parseImgNodes(page: PagesSource): Promise<ImageNode[] | never>;
  /**
   * step 3: fetch origin img url from every single image node's href
   */
  fetchOriginMeta(href: string, retry: boolean): Promise<OriginMeta>;

  parseGalleryMeta(doc: Document): GalleryMeta;
  workURL(): RegExp;
  processData(data: Uint8Array, contentType: string, url: string): Promise<Uint8Array>;
}

export abstract class BaseMatcher implements Matcher {

  async fetchChapters(): Promise<Chapter[]> {
    return [{
      id: "default",
      title: "default",
      source: document,
    }];
  }

  abstract fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource>;
  abstract parseImgNodes(page: PagesSource): Promise<ImageNode[]>;
  abstract fetchOriginMeta(href: string, retry: boolean): Promise<OriginMeta>;

  parseGalleryMeta(doc: Document): GalleryMeta {
    return new GalleryMeta(window.location.href, doc.title || "unknown");
  }
  abstract workURL(): RegExp;
  async processData(data: Uint8Array, _1: string, _2: string): Promise<Uint8Array> {
    return data;
  }

}
