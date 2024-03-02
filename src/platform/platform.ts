import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";

export type PagesSource = {
  raw: string | Document
  typ: "doc" | "url" | "json"
}

export type OriginMeta = {
  url: string,
  title?: string,
}

export interface Matcher {
  fetchOriginMeta(href: string, retry: boolean): Promise<OriginMeta>;
  parseImgNodes(page: PagesSource): Promise<ImageNode[] | never>;
  fetchPagesSource(): AsyncGenerator<PagesSource>;
  parseGalleryMeta(doc: Document): GalleryMeta;
  workURL(): RegExp;
  processData(data: Uint8Array, contentType: string, url: string): Promise<Uint8Array>;
}

