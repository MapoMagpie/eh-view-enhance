import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, } from "../page-fetcher";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class MHGMatcher extends BaseMatcher<string> {
  name(): string {
    return "漫画柜";
  }
  meta?: GalleryMeta;
  chapterCount: number = 0;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    let title = document.querySelector(".book-title > h1")?.textContent ?? document.title;
    title += "-c" + this.chapterCount;
    const matches = document.querySelector(".detail-list .status")?.textContent?.match(STATUS_REGEX);
    const date = matches?.[1];
    title += date ? "-" + date : "";
    const last = matches?.[2];
    title += last ? "-" + last.trim() : "";
    this.meta = new GalleryMeta(window.location.href, title);
    return this.meta;
  }
  async *fetchPagesSource(source: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(source.source);
  }
  async parseImgNodes(source: string): Promise<ImageNode[]> {
    const docRaw = await window.fetch(source).then(res => res.text());
    const matches = docRaw.match(IMG_DATA_PARAM_REGEX);
    if (!matches || matches.length < 5) throw new Error("cannot match image data");
    let data: MHGImgData;
    try {
      data = parseImgData(matches[1], parseInt(matches[2]), parseInt(matches[3]), matches[4]);
    } catch (error) {
      throw new Error("cannot parse image data: " + (error as any).toString());
    }
    const server = getServer();
    return data.files.map((f, i) => {
      const src = `${server}/${data.path}/${f}?e=${data.sl.e}&m=${data.sl.m}}`;
      const href = `https://www.manhuagui.com/comic/${data.bid}/${data.cid}.html#p=${i + 1}`;
      return new ImageNode("", href, f, undefined, src);
    });
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  workURL(): RegExp {
    return /manhuagui.com\/comic\/\d+\/?$/;
  }
  async fetchChapters(): Promise<Chapter[]> {
    const thumbimg = document.querySelector<HTMLImageElement>(".book-cover img")?.src;
    const chapters: Chapter[] = [];
    document.querySelectorAll<HTMLElement>(".chapter-list").forEach(element => {
      let prefix = findSibling(element, "prev", (e) => e.tagName.toLowerCase() === "h4")?.firstElementChild?.textContent ?? undefined;
      prefix = prefix ? prefix + "-" : "";
      element.querySelectorAll("ul").forEach((ul) => {
        const ret = Array.from(ul.querySelectorAll<HTMLAnchorElement>("li > a")).reverse().map((element) => {
          return {
            id: 0,
            title: prefix + element.title,
            source: element.href,
            queue: [],
            thumbimg,
          };
        });
        chapters.push(...ret);
      })
    });
    chapters.forEach((ch, i) => ch.id = i + 1);
    return chapters;
  }

}

function findSibling(element: HTMLElement, dir: "prev" | "next", eq: (element: HTMLElement) => boolean): HTMLElement | null {
  const sibling = (e: HTMLElement): HTMLElement => (dir === "prev" ? e.previousElementSibling : e.nextElementSibling) as HTMLElement;
  let e: HTMLElement = element;
  while (e = sibling(e)) {
    if (eq(e)) return e;
  }
  return null;
}

type MHGImgData = {
  bid: number,
  block_cc: "",
  bpic: string,
  cid: number,
  files: string[],
  finihsed: boolean,
  len: number,
  nextId: number,
  path: string,
  prevId: number,
  sl: {
    e: number,
    m: string,
  },
  status: number,
}

const MHG_SERVERS = [
  {
    name: '自动',
    hosts: [
      {
        h: 'i',
        w: 0.1
      },
      {
        h: 'eu',
        w: 5
      },
      {
        h: 'eu1',
        w: 5
      },
      {
        h: 'us',
        w: 1
      },
      {
        h: 'us1',
        w: 1
      },
      {
        h: 'us2',
        w: 1
      },
      {
        h: 'us3',
        w: 1
      }
    ]
  },
  {
    name: '电信',
    hosts: [
      {
        h: 'eu',
        w: 1
      },
      {
        h: 'eu1',
        w: 1
      }
    ]
  },
  {
    name: '联通',
    hosts: [
      {
        h: 'us',
        w: 1
      },
      {
        h: 'us1',
        w: 1
      },
      {
        h: 'us2',
        w: 1
      },
      {
        h: 'us3',
        w: 1
      }
    ]
  }
];

function getServer(): string {
  const serv = parseInt(window.localStorage.getItem("") ?? "0");
  const host = parseInt(window.localStorage.getItem("") ?? "0");
  const prefix = MHG_SERVERS[serv]?.hosts[host]?.h ?? "us1";
  return `https://${prefix}.hamreus.com`;
}

const STATUS_REGEX = /\[(\d{4}-\d{2}-\d{2})\].*?\[(.*?)\]/;
const IMG_DATA_PARAM_REGEX = /\('\w+\.\w+\((.*?)\).*?,(\d+),(\d+),'(.*?)'\[/;
function decompressFromBase64(input: string): string {
  // @ts-ignore
  return LZString.decompressFromBase64(input);
}

function parseImgData(tamplate: string, a: number, c: number, raw: string): MHGImgData {
  const keys = decompressFromBase64(raw).split("|");
  const d: Record<string, string> = {};
  function e(n: number): string {
    const aa = n < a ? "" : e(Math.floor(n / a)).toString();
    const bb = (n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36);
    return aa + bb;
  }
  while (c--) {
    d[e(c)] = keys[c] || e(c);
  }
  const dataStr = tamplate.replace(new RegExp("\\b\\w+\\b", "g"), (key) => d[key]);
  return JSON.parse(dataStr);
}
