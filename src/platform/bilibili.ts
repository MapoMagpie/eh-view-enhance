import ImageNode from "../img-node";
import { batchFetch } from "../utils/query";
import { transactionId } from "../utils/random";
import { BaseMatcher, OriginMeta, Result } from "./platform"

export class BilibiliMatcher extends BaseMatcher<BiliBiliOpusItem[]> {

  name(): string {
    return "Bilibili";
  }

  workURL(): RegExp {
    return /space.bilibili.com\/\d+\/upload\/opus$/;
  }

  async *fetchPagesSource(): AsyncGenerator<Result<BiliBiliOpusItem[]>> {
    const host_mid = window.location.href.match(/space.bilibili.com\/(\d+)\//)?.[1];
    if (!host_mid) throw new Error("cannot find host_mid from " + window.location.href);
    const webid = document.querySelector<HTMLScriptElement>("script#__RENDER_DATA__")?.textContent?.match(/%3A%22([\w\.\-_]*)%22/)?.[1];
    if (!webid) throw new Error("cannot find webid");
    let offset = "";
    let page = 1;
    // const rid = "169844d7f3716b92c5daea77221b4960";
    while (true) {
      const rid = transactionId();
      const wts = Date.now().toString();
      const data = await fetch(`https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/feed/space?host_mid=${host_mid}&page=${page}&offset=${offset}&type=all&web_location=333.1387&w_webid=${webid}&w_rid=${rid}&wts=${wts}`, {
        "credentials": "include",
        "headers": {
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        "referrer": window.location.href,
        "method": "GET",
        "mode": "cors"
      }).then(resp => resp.json()) as BilibiliOPUSResponse;
      if (data.code !== 0) {
        yield Result.err(new Error("fetch opus error: " + data.message));
      }
      if (data.data.items.length === 0) {
        yield Result.err(new Error("fetch opus zero"));
      }
      if (data.data.has_more) {
        offset = data.data.offset;
        page = page + 1;
        const items = [...data.data.items];
        while (items.length > 0) {
          yield Result.ok(items.splice(0, 1));
        }
      } else {
        return;
      }
    }
  }

  async parseImgNodes(items: BiliBiliOpusItem[]): Promise<ImageNode[]> {
    const requestInfos = items.map<RequestInfo>((item, i) => {
      return new Request(`https://api.bilibili.com//x/polymer/web-dynamic/v1/opus/detail?id=${item.opus_id}&timezone_offset=${Date.now() - i}`, {
        "credentials": "include",
        "headers": {
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        "referrer": item.jump_url,
        "method": "GET",
        "mode": "cors"
      });
    });
    const details = await batchFetch<BilibiliOPUSDetailResponse>(requestInfos, 1, "json");
    const error = details.find(d => d instanceof Error);
    if (error) throw error;
    if (requestInfos.length !== details.length) throw new Error(`fetch opus detail error, opus count: ${requestInfos.length}, detail count: ${details.length}`);
    return items.map((item, i) => {
      const detail = details[i] as BilibiliOPUSDetailResponse;
      const content = detail.data?.item.modules.find(modu => modu.module_type === "MODULE_TYPE_CONTENT");
      if (!content) throw new Error("cannot find opus content: " + item.jump_url + " " + detail.message);
      const pictures = content.module_content.paragraphs.filter(para => para.pic).map(para => para.pic!.pics).flat();
      const digits = pictures.length.toString().length;
      return pictures.map((pic, j) => {
        const title = item.opus_id + "-" + (j + 1).toString().padStart(digits, "0");
        return new ImageNode(j === 0 ? item.cover.url : "", item.jump_url, title, undefined, pic.url, { w: pic.width, h: pic.height });
      });
    }).flat();
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    // const data = await fetch(`https://api.bilibili.com//x/polymer/web-dynamic/v1/opus/detail?id=${node.originSrc}&timezone_offset=${Date.now()}`, {
    //   "credentials": "include",
    //   "headers": {
    //     "Sec-Fetch-Dest": "empty",
    //     "Sec-Fetch-Mode": "cors",
    //     "Sec-Fetch-Site": "same-site",
    //   },
    //   "referrer": node.href,
    //   "method": "GET",
    //   "mode": "cors"
    // }).then(resp => resp.json());
    // console.log(data);
    const ext = node.originSrc?.split(".").pop() ?? "jpg";
    return { url: node.originSrc!, title: node.title + "." + ext };
  }

}

type BiliBiliOpusItem = {
  content: string,
  jump_url: string,
  opus_id: string,
  stat: {
    like: number,
  },
  cover: {
    height: number,
    width: number,
    url: string,
  }
}

type BilibiliOPUSResponse = {
  code: number,
  message: string,
  ttl: number,
  data: {
    has_more: boolean,
    offset: string,
    update_num: number,
    items: BiliBiliOpusItem[],
  }
}

type BilibiliOPUSDetailResponse = {
  code: number,
  message: string,
  ttl: number,
  data: {
    item: {
      id_str: string,
      modules: {
        module_type: string, // MODULE_TYPE_CONTENT
        module_content: {
          paragraphs: {
            align: number,
            para_type: number,
            pic?: {
              style: number,
              pics: {
                height: number,
                size: number,
                url: string,
                live_url?: string,
                width: number,
              }[],
            }
          }[],
        }
      }[]
    }
  }
}
