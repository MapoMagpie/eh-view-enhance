import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";


export type OriginMeta = {
  url: string,
  title?: string,
  href?: string,
}

export class Result<T> {
  value?: T;
  error?: Error;
  static ok<T>(value: T): Result<T> {
    return {
      value,
    }
  }
  static err<T>(error: Error): Result<T> {
    return {
      error,
    }
  }
};

export interface Matcher<P> {
  name(): string;
  /**
   * step 0: in some site, the gallery is divided into chapters
   */
  fetchChapters(): Promise<Chapter[]>;
  /**
   * step 1: fetch page source
   */
  fetchPagesSource(chapter: Chapter): AsyncGenerator<Result<P>>;
  /**
   * step 2: parse img nodes from page source
   */
  parseImgNodes(pageSource: P, chapterID?: number): Promise<ImageNode[] | never>;
  /**
   * step 3: fetch origin img url from every single image node's href
   */
  fetchOriginMeta(node: ImageNode, retry: boolean, chapterID?: number): Promise<OriginMeta>;

  galleryMeta(chapter: Chapter): GalleryMeta;
  title(chapter: Chapter[]): string;
  workURLs(): RegExp[];
  processData(data: Uint8Array, contentType: string, node: ImageNode): Promise<[Uint8Array, string]>;
  headers(): Record<string, string>;
  appendNewChapters(url: string, old: Chapter[]): Promise<Chapter[]>;
}

export abstract class BaseMatcher<P> implements Matcher<P> {

  async fetchChapters(): Promise<Chapter[]> {
    return [{
      id: 0,
      title: "Default",
      source: window.location.href,
      queue: [],
    }];
  }

  abstract name(): string;
  abstract fetchPagesSource(source: Chapter): AsyncGenerator<Result<P>>;
  abstract parseImgNodes(pageSource: P, chapterID?: number): Promise<ImageNode[]>;
  abstract fetchOriginMeta(node: ImageNode, retry: boolean, chapterID?: number): Promise<OriginMeta>;

  title(chapter: Chapter[]): string {
    const meta = this.galleryMeta(chapter[0]);
    return meta.originTitle || meta.title || "unknown";
  }

  galleryMeta(_chapter: Chapter): GalleryMeta {
    return new GalleryMeta(window.location.href, document.title || "unknown");
  }

  abstract workURL(): RegExp;

  workURLs(): RegExp[] {
    return [this.workURL()];
  }

  async processData(data: Uint8Array, contentType: string, _node: ImageNode): Promise<[Uint8Array, string]> {
    return [data, contentType];
  }

  headers(): Record<string, string> {
    return {};
  }

  appendNewChapters(_url: string, _old: Chapter[]): Promise<Chapter[]> {
    throw new Error("this site does not support add new chapters yet");
  }

}
