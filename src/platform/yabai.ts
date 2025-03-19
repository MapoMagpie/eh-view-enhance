import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { transactionId } from "../utils/random";
import { BaseMatcher, Result, OriginMeta } from "./platform";

export class YabaiMatcher extends BaseMatcher<YabaiList> {
  meta?: GalleryMeta;
  name(): string {
    return "Yabai.si"
  }
  workURL(): RegExp {
    return /yabai.si\/g\/\w+\/?$/;
  }
  title(): string {
    return this.meta?.title ?? document.title;
  }
  galleryMeta(): GalleryMeta {
    return this.meta!;
  }

  async *fetchPagesSource(): AsyncGenerator<Result<YabaiList>> {
    const data = await this.query(window.location.href + "/read", `{"page":1}`);
    if (data.props?.pages?.data?.list) {
      const list = data.props?.pages?.data as YabaiList;
      yield Result.ok(list);
    } else {
      throw new Error("cannot fetch pages");
    }
  }

  async parseImgNodes(raw: YabaiList): Promise<ImageNode[]> {
    const items = this.buildList(raw);
    if (items.length === 0) throw new Error("cannot build list from gallery data")
    const page = Math.ceil(raw.count / 20);
    const data = await this.query(window.location.href, `{"page":${page}}`);
    const thumbnails = data.props?.post?.data?.page_list as string[];
    if (!thumbnails) {
      throw new Error("cannot fetch thumbnails");
    }
    const meta = data.props?.post?.data as YabaiMeta;
    if (meta) this.meta = this.buildGalleryMeta(meta);
    const ret: ImageNode[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const thumb = thumbnails[i];
      ret.push(new ImageNode(thumb, item.url, `${item.name}.${item.ext}`, undefined, item.url));
    }
    return ret;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  buildGalleryMeta(data: YabaiMeta): GalleryMeta {
    const meta = new GalleryMeta(data.url, data.name);
    meta.originTitle = data.alt_name;
    meta.tags = {
      flag: [data.flag],
      category: [data.category],
      date: [data.date],
      ...data.tags,
    }
    return meta;
  }

  // buildList in app.js
  buildList(data: YabaiList): { url: string, name: string, ext: string }[] {
    const list = data.list;
    const urls = [];
    for (let r = 0; r < data.count; r++) {
      const index = parseInt(list.head[r]) - 1;
      const name = list.head[r].padStart(4, '0');
      const url = ''.concat(list.root, '/')
        .concat(list.code.toString(), '/')
        .concat(name, '-')
        .concat(list.hash[r], '-')
        .concat(list.rand[r], '.')
        .concat(list.type[r]);
      urls[index] = { url, name, ext: list.type[r] };
    }
    return urls;
  }

  async query(url: string, body?: string) {
    const csrf = document.cookie.match(/XSRF-TOKEN=(.*)?;?/)?.[1];
    if (!csrf) throw new Error("cannot get csrf token form cookie");
    const res = await window.fetch(url, {
      "headers": {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-Inertia": "true",
        "X-Inertia-Version": transactionId(),
        "X-XSRF-TOKEN": decodeURIComponent(csrf),
      },
      "body": body,
      "method": "POST",
    });
    return await res.json();
  }

}

type YabaiList = {
  list: {
    root: string,
    code: number,
    head: string[],
    hash: string[],
    rand: string[],
    type: string[],
  },
  count: number,
  current: number,
}

type YabaiMeta = {
  "name": string,
  "alt_name"?: string,
  "cover": string,
  "slug": string, // gallery id
  "url": string,
  "flag": { // maybe language
    "id": number,
    "name": string,
    "code": string,
  },
  "category": {
    "id": number,
    "name": string,
  },
  "date": {
    "default": string,
    "human": string,
    "diff": string
  },
  "tags": Record<string, any>,
}

