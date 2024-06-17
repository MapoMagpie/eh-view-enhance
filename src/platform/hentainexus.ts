import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

type HNImageInfo = {
  image: string,
  label: string, // "1"
  type: "image",
  url_label: string,
}
const REGEXP_EXTRACT_INIT_ARGUMENTS = /initReader\("(.*?)\",\s?"(.*?)",\s?"(.*?)"\)/;
const REGEXP_EXTRACT_HASH = /read\/\d+\/(\d+)$/;
export class HentaiNexusMatcher extends BaseMatcher {

  meta?: GalleryMeta;
  baseURL?: string;
  readerData?: HNImageInfo[];
  readDirection?: string;

  async *fetchPagesSource(): AsyncGenerator<PagesSource, any, unknown> {
    this.meta = this.pasrseGalleryMeta(document);
    yield document
  }

  async parseImgNodes(page: PagesSource): Promise<ImageNode[]> {
    const doc = page as Document;
    const result: ImageNode[] = [];
    const list = Array.from(doc.querySelectorAll<HTMLAnchorElement>(".section .container + .container > .box > .columns > .column a"));
    list.forEach((li, i) => {
      const img = li.querySelector<HTMLImageElement>("img");
      if (!img) return;
      const num = li.href.split("/").pop() || i.toString();
      const ext = img.src.split(".").pop();
      const title = num + "." + ext;
      result.push(new ImageNode(img.src, li.href, title));
    });
    return result;
  }

  async fetchOriginMeta(href: string): Promise<OriginMeta> {
    if (!this.readerData) {
      const doc = await window.fetch(href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      const args = doc.querySelector("body > script")?.textContent?.match(REGEXP_EXTRACT_INIT_ARGUMENTS)?.slice(1);
      if (!args || args.length !== 3) throw new Error("cannot find reader data");
      try {
        this.initReader(args[0], args[1], args[2]);
      } catch (_error) {
        throw new Error("hentainexus updated decryption function");
      }
    }
    if (!this.readerData) throw new Error("cannot find reader data");
    const hash = href.match(REGEXP_EXTRACT_HASH)?.[1] || "001";
    const url = this.readerData.find(d => d.url_label === hash)?.image;
    if (!url) throw new Error("cannot find image url");
    const ext = url.split(".").pop();
    return { url, title: hash + "." + ext };
  }

  workURL(): RegExp {
    return /hentainexus.com\/view\/\d+/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    return this.meta || super.galleryMeta(doc);
  }

  private pasrseGalleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector("h1.title")?.textContent || "UNTITLED"
    const meta = new GalleryMeta(this.baseURL || window.location.href, title);
    doc.querySelectorAll(".view-page-details tr").forEach(tr => {
      const category = tr.querySelector(".viewcolumn")?.textContent?.trim();
      if (!category) return;
      let values = Array.from(tr.querySelector(".viewcolumn + td")?.childNodes || []).map(c => c?.textContent?.trim()).filter(Boolean) as string[];
      if (values.length === 0) return;
      if (category === "Tags") {
        values = values.map(v => v.replace(/\s?\([0-9,]*\)$/, ""));
      }
      meta.tags[category] = values;
    });
    return meta;
  }

  private initReader(data: string, originTitle: string, readDirection: string) {
    if (this.meta) {
      this.meta.originTitle = originTitle.replace(/::\s?HentaiNexus/, "");
    }
    this.readDirection = readDirection;

    const hostname = window.location.hostname.split("");
    const hostnameLen = Math.min(hostname.length, 64);
    const rawSplits = window.atob(data).split("");
    for (let i = 0; i < hostnameLen; i++) {
      rawSplits[i] = String.fromCharCode(
        rawSplits[i].charCodeAt(0) ^ hostname[i].charCodeAt(0)
      );
    }
    const decoded = rawSplits.join("");

    let poses: boolean[] = [];
    let list: number[] = [];
    for (let step = 2; list.length < 16; ++step) {
      if (!poses[step]) {
        list.push(step);
        for (let j = step << 1; j <= 256; j += step) {
          poses[j] = !![];
        }
      }
    }
    let a = 0;
    for (let step = 0; step < 64; step++) {
      a = a ^ decoded.charCodeAt(step);
      for (let i = 0; i < 8; i++) {
        a = a & 1 ? a >>> 1 ^ 12 : a >>> 1;
      }
    }
    a = a & 7;
    let step = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      step[i] = i;
    }
    let raw = '';
    let c = 0;
    for (let i = 0, b = 0; i < 256; i++) {
      b = (b + step[i] + decoded.charCodeAt(i % 64)) % 256;
      c = step[i];
      step[i] = step[b];
      step[b] = c;
    }

    for (let d = list[a], e = 0, f = 0, j = 0, k = 0, i = 0;
      i + 64 < decoded.length;
      i++
    ) {
      j = (j + d) % 256;
      k = (f + step[(k + step[j]) % 256]) % 256;
      f = (f + j + step[j]) % 256;
      c = step[j];
      step[j] = step[k];
      step[k] = c;
      e = step[(k + step[(j + step[(e + f) % 256]) % 256]) % 256];
      raw += String.fromCharCode(decoded.charCodeAt(i + 64) ^ e);
    }
    this.readerData = JSON.parse(raw) as HNImageInfo[];
  }
}
