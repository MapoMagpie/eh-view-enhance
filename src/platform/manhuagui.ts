import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

export class MHGMatcher extends BaseMatcher {
  srcMap: Map<string, string> = new Map();
  name(): string {
    return "漫画柜";
  }
  async *fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource> {
    yield source.source;
  }
  async parseImgNodes(page: PagesSource, _chapterID?: number | undefined): Promise<ImageNode[]> {
    const docRaw = await window.fetch(page as string).then(res => res.text());
    const matches = docRaw.match(IMG_DATA_PARAM_REGEX);
    if (!matches || matches.length < 5) throw new Error("cannot match image data");
    let data: MHGImgData;
    try {
      data = parseImgData(matches[1], parseInt(matches[2]), parseInt(matches[3]), matches[4]);
    } catch (error) {
      throw new Error("cannot parse image data: " + (error as any).toString());
    }
    const server = getServer();
    const createHref = (i: number, f: string) => {
      const src = `${server}/${data.path}/${f}?e=${data.sl.e}&m=${data.sl.m}}`;
      const href = `https://www.manhuagui.com/comic/${data.bid}/${data.cid}.html#p=${i + 1}`;
      this.srcMap.set(href, src);
      return href;
    }
    return data.files.map((f, i) => new ImageNode("", createHref(i, f), f));
  }
  async fetchOriginMeta(href: string): Promise<OriginMeta> {
    const url = this.srcMap.get(href);
    if (!url) throw new Error("cannot find original src by href: " + href);
    return { url };
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
      element.querySelectorAll("ul").forEach((ul, i) => {
        const ret = Array.from(ul.querySelectorAll<HTMLAnchorElement>("li > a")).reverse().map((element, j) => {
          return {
            id: (i + 1) * (j + 1),
            title: prefix + element.title ?? `${i + 1}-${j + 1}`,
            source: element.href,
            queue: [],
            thumbimg,
          };
        });
        chapters.push(...ret);
      })
    });
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

const IMG_DATA_PARAM_REGEX = /\('\w+\.\w+\((.*?)\).*?,(\d+),(\d+),'(.*?)'\[/;
function decompressFromBase64(input: string): string {
  // @ts-ignore
  return LZString.decompressFromBase64(input);
}

function parseImgData(tamplate: string, a: number, c: number, raw: string): MHGImgData {
  const keys = decompressFromBase64(raw).split("|");
  const d: Record<string, string> = {};
  function e(n: number): string {
    let aa = n < a ? "" : e(Math.floor(n / a)).toString();
    let bb = (n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36);
    return aa + bb;
  };
  while (c--) {
    d[e(c)] = keys[c] || e(c);
  }
  const dataStr = tamplate.replace(new RegExp("\\b\\w+\\b", "g"), (key) => d[key]);
  return JSON.parse(dataStr);
}
