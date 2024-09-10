import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

const REGEXP_EXTRACT_GALLERY_ID = /koharu.to\/\w+\/(\d+\/\w+)/;

type BookDataDetail = {
  id?: string, public_key?: string, size: number,
}

type BookData = {
  base: string,
  entries: BookItem[],
}

type BookItem = {
  path: string,
  dimensions: [number, number],
}

type BookTag = {
  name: string,
  count: number,
  namespace?: number,
}

type BookDetail = {
  id: number,
  public_key: string,
  title: string,
  data: Record<string, BookDataDetail>,
  thumbnails: BookData,
  tags: BookTag[],
  created_at: number,
  updated_at: number,
}

const NAMESPACE_MAP: Record<number, string> = {
  0: "misc",
  1: "artist",
  2: "circle",
  7: "uploader",
  8: "male",
  9: "female",
  10: "mixed",
  11: "language",
};

export class KoharuMatcher extends BaseMatcher {
  name(): string {
    return "Koharu";
  }

  meta?: GalleryMeta;

  galleryMeta(): GalleryMeta {
    return this.meta || new GalleryMeta(window.location.href, "koharu-unknows");
  }

  async *fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource, any, unknown> {
    yield source.source;
  }

  createMeta(detail: BookDetail) {
    const tags: Record<string, any[]> = detail.tags.reduce<Record<string, any[]>>((map, tag) => {
      const category = NAMESPACE_MAP[tag.namespace || 0] || "misc";
      if (!map[category]) map[category] = [];
      map[category].push(tag.name);
      return map;
    }, {});
    this.meta = new GalleryMeta(window.location.href, detail.title);
    this.meta.tags = tags;
  }

  async parseImgNodes(page: PagesSource): Promise<ImageNode[]> {
    const matches = (page as string).match(REGEXP_EXTRACT_GALLERY_ID)
    if (!matches || matches.length < 2) {
      throw new Error("invaild url: " + page);
    }
    const galleryID = matches[1];
    const detailAPI = `https://api.koharu.to/books/detail/${galleryID}`;
    const detail = await window.fetch(detailAPI).then(res => res.json()).then(j => j as BookDetail).catch(reason => new Error(reason.toString()));
    if (detail instanceof Error) {
      throw detail;
    }
    this.createMeta(detail);
    const [w, data] = Object.entries(detail.data).sort((a, b) => b[1].size - a[1].size).find(([_, v]) => v.id !== undefined && v.public_key !== undefined) ?? [undefined, undefined];
    if (w === undefined && data === undefined) throw new Error("cannot find resolution from gallery detail");
    const dataAPI = `https://api.koharu.to/books/data/${galleryID}/${data.id}/${data.public_key}?v=${detail.updated_at ?? detail.created_at}&w=${w}`;
    const items = await window.fetch(dataAPI).then(res => res.json()).then(j => j as BookData).catch(reason => new Error(reason.toString()));
    if (items instanceof Error) {
      throw new Error(`koharu updated their api, ${items.toString()}`);
    }
    if (items.entries.length !== detail.thumbnails.entries.length) {
      throw new Error("thumbnails length not match");
    }

    const thumbs = detail.thumbnails.entries;
    const thumbBase = detail.thumbnails.base;
    const itemBase = items.base;
    const pad = items.entries.length.toString().length;
    return items.entries.map((item, i) => {
      const href = `${window.location.origin}/reader/${galleryID}/${i + 1}`;
      const title = (i + 1).toString().padStart(pad, "0") + "." + item.path.split(".").pop();
      const src = itemBase + item.path + "?w=" + w;
      return new ImageNode(thumbBase + thumbs[i].path, href, title, undefined, src);
    });
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  workURL(): RegExp {
    return /koharu.to\/(g|reader)\/\d+\/\w+/;
  }

  headers(): Record<string, string> {
    return {
      "Referer": "https://koharu.to/",
      "Origin": window.location.origin,
      // "TE": "trailers",
    }
  }

}
