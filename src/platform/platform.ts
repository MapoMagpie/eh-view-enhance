import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";

export type PagesSource = {
  raw: string | Document
  typ: "doc" | "url" | "json"
}

export interface Matcher {
  matchImgURL(url: string, retry: boolean): Promise<string>;
  parseImgNodes(page: PagesSource): Promise<ImageNode[] | never>;
  fetchPagesSource(): AsyncGenerator<PagesSource>;
  parseGalleryMeta(doc: Document): GalleryMeta;
  workURL(): RegExp;
}

