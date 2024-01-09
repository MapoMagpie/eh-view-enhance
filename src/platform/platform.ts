import { GalleryMeta } from "../download/gallery-meta";

export type PagesSource = {
  raw: string | Document
  typ: "doc" | "url" | "json"
}

export interface Matcher {
  matchImgURL(url: string, retry: boolean): Promise<string>;
  parseImgNodes(page: PagesSource, template: HTMLElement): Promise<HTMLElement[] | never>;
  fetchPagesSource(): AsyncGenerator<PagesSource>;
  parseGalleryMeta(doc: Document): GalleryMeta;
}

