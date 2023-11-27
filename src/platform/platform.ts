import { GalleryMeta } from "../downloader";
import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { NHMatcher } from "./nhentai";
import { SteamMatcher } from "./steam";

export type PagesSource = {
  raw: string | Document
  typ: "doc" | "url"
}

export interface Matcher {
  matchImgURL(url: string, retry: boolean): Promise<string>;
  parseImgNodes(page: PagesSource, template: HTMLElement): Promise<HTMLElement[] | never>;
  fetchPagesSource(): AsyncGenerator<PagesSource>;
  parseGalleryMeta(doc: Document): GalleryMeta;
}

export function adaptMatcher(): Matcher {
  const host = window.location.host;
  if (host === "nhentai.net") {
    return new NHMatcher();
  }
  if (host === "steamcommunity.com") {
    return new SteamMatcher();
  }
  if (host === "hitomi.la") {
    return new HitomiMather();
  }
  return new EHMatcher();
}
