import { conf } from "../config";
import ImageNode from "../img-node";
import { isImage, isVideo } from "../utils/media_helper";
import { batchFetch } from "../utils/query";
import { BaseMatcher, OriginMeta, Result } from "./platform"

interface KemonoList {
  next(): AsyncGenerator<Result<KemonoResult[]>>;
}

// type KemonoProps = {
//   count: number; // 264
//   limit: number; // 50
//   artist: {
//     id: string,
//     name: string,
//     service: string, // patreon
//   }
// }
type KemonoResult = {
  id: string,
  user: string,
  service: string,
  title: string,
  substring: string,
  file?: KemonoFile,
  attachments: KemonoFile[],
}

type KemonoFile = {
  name?: string,
  path?: string,
  server?: string,
  type: "thumbnail",
}

abstract class KemonoListAbstract implements KemonoList {

  async *next(): AsyncGenerator<Result<KemonoResult[]>> {
    const url = new URL(window.location.href);
    let page = parseInt(url.searchParams.get("o") ?? "0");
    page = isNaN(page) ? 0 : page;
    const query = url.searchParams.get("q");
    while (true) {
      const ret = await window.fetch(this.getURL(page, query)).then(res => res.json());
      if (ret.error) {
        yield Result.err(new Error(ret.error));
      }
      const results = this.getPosts(ret);
      if (!results || results.length === 0) break;
      page += results.length;
      const infoMap = kemonoInfoPathMap(this.getList(ret));
      if (infoMap.size > 0) {
        results.forEach(r => {
          if (r.file?.path) {
            const info = infoMap.get(r.file.path);
            r.file.name = info?.name;
            r.file.server = info?.server;
          }
          if (r.attachments && r.attachments.length > 0) {
            r.attachments.forEach(a => {
              if (a.path) {
                const info = infoMap.get(a.path);
                a.name = info?.name;
                a.server = info?.server;
              }
            })
          }
        })
      }
      yield Result.ok(results);
      // offset not multiple of 150 or too large
      if (results.length < 50) break;
    }
  }

  abstract getURL(pages: number, query: string | null): string;
  abstract getList(res: any): any[];
  abstract getPosts(res: any): KemonoResult[];

}

class KemonoListArtist extends KemonoListAbstract {
  getURL(pages: number, query: string | null): string {
    const url = new URL(window.location.href);
    const u = new URL(`${url.origin}/api/v1/${url.pathname}/posts-legacy`);
    if (pages > 0) {
      u.searchParams.set("o", pages.toString());
    }
    if (query) {
      u.searchParams.set("q", query);
    }
    return u.href;
  }
  getList(response: any): any[] {
    const list = [...(response.result_previews ?? []), ...(response.result_attachments ?? [])];
    return list.flat(1);

  }
  getPosts(res: any): KemonoResult[] {
    return res.results;
  }
}
class KemonoListPosts extends KemonoListAbstract {
  getPosts(res: any): KemonoResult[] {
    return res.posts;
  }
  getURL(pages: number, query: string | null): string {
    const url = new URL(window.location.href);
    const u = new URL(`${url.origin}/api/v1/${url.pathname}`);
    if (pages > 0) {
      u.searchParams.set("o", pages.toString());
    }
    if (query) {
      u.searchParams.set("q", query);
    }
    return u.href;
  }
  getList(): any[] {
    return [];
  }
}

class KemonoListSinglePost extends KemonoListAbstract {
  getPosts(res: any): KemonoResult[] {
    if (res?.post) return [res.post];
    return [];
  }
  getURL(): string {
    return `${window.location.origin}/api/v1/${window.location.pathname}`;
  }
  getList(response: any): any[] {
    return [...(response.previews ?? []), ...(response.attachments ?? [])];
  }
}

export class KemonoMatcher extends BaseMatcher<KemonoResult[]> {
  list?: KemonoList;
  constructor() {
    super();
    if (window.location.href.includes("/posts")) {
      this.list = new KemonoListPosts();
    } else if (/user\/\w+/.test(window.location.href)) {
      if (/post\/\w+/.test(window.location.href)) {
        this.list = new KemonoListSinglePost();
      } else {
        this.list = new KemonoListArtist();
      }
    }
  }
  name(): string {
    return "Kemono";
  }
  fetchPagesSource(): AsyncGenerator<Result<KemonoResult[]>> {
    if (!this.list) {
      throw new Error("Current path is not supported");
    }
    return this.list.next();
  }
  async parseImgNodes(results: KemonoResult[]): Promise<ImageNode[]> {
    const nodes = [];
    const newImageNode = (id: string, user: string, service: string, path: string, name: string, server: string) => {
      const thumb = `https://img.kemono.su/thumbnail/data/${path}`;
      const href = `https://kemono.su/${service}/user/${user}/post/${id}`;
      let src = server ? `${server}/data/${path}?f=${name}` : undefined;
      const node = new ImageNode(thumb, href, name, undefined, src);
      if (path.indexOf(".mp4") > 1) {
        node.mimeType = "video/mp4";
        node.thumbnailSrc = "";
      }
      // if attachment is not media file, just skip;
      const ext = path.split(".").pop() ?? "";
      if (!isImage(ext)) {
        if (conf.excludeVideo || !isVideo(ext)) {
          return undefined;
        }
      }
      return node;
    }
    const chunks: { res: KemonoResult, list: KemonoFile[], needFetchPost: boolean }[] = [];
    for (const res of results) {
      const list = [];
      if (res.file?.path) list.push(res.file);
      list.push(...(res.attachments ?? []));
      chunks.push({ res, list, needFetchPost: !list[0]?.server && list.length > 0 });
    }
    await this.batchFetchPathServerMap(chunks);
    for (const chunk of chunks) {
      for (const file of chunk.list) {
        if (!file.path) continue;
        if (!file.name || !file.server) throw new Error("cannot find image or video name and server");
        const node = newImageNode(chunk.res.id, chunk.res.user, chunk.res.service, file.path, file.name, file.server);
        if (node) nodes.push(node);
      }
    }
    return nodes;
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    if (!node.originSrc) throw new Error("cannot find kemono image file: " + node.href);
    return { url: node.originSrc };
  }
  workURL(): RegExp {
    return /kemono.su\/(\w+\/user\/\w+(\/post\/\w+)?|posts)(\?\w=.*)?$/;
  }

  async batchFetchPathServerMap(chunks: { res: KemonoResult; list: KemonoFile[]; needFetchPost: boolean; }[]) {
    const urls = chunks.filter(chunk => chunk.needFetchPost).map(chunk =>
      `${window.location.origin}/api/v1/${chunk.res.service}/user/${chunk.res.user}/post/${chunk.res.id}`
    );
    const infos = await batchFetch<any>(urls, 10, "json");
    const list = infos.reduce((list, info) => {
      return [...list, ...[...(info.previews ?? []), ...(info.attachments ?? [])]];
    }, []);
    const map = kemonoInfoPathMap(list);
    chunks.filter(chunk => chunk.needFetchPost).forEach(chunk => chunk.list.forEach(file => {
      if (file.path) {
        const info = map.get(file.path);
        file.name = info?.name;
        file.server = info?.server;
      }
    }));
  }

}

function kemonoInfoPathMap(list: any[]): Map<string, { name: string, server: string }> {
  const map = new Map();
  for (const info of (list ?? [])) {
    if (info.path && info.server) {
      map.set(info.path, { server: info.server, name: info.name });
    }
  }
  return map;
}
