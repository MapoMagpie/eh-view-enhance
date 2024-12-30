import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

const EXTRACT_C_DATA = /var C_DATA='(.*?)'/;
const CDATA_KEY = "KcmiZ8owmiBoPRMf";

function decrypt(key: string, raw: string): string {
  // @ts-ignore
  const cryptoJS = CryptoJS;
  if (!cryptoJS) throw new Error("cryptoJS undefined");
  var keyenc = cryptoJS.enc.Utf8.parse(key);
  var ret = cryptoJS.AES.decrypt(raw, keyenc, {
    mode: cryptoJS.mode.ECB,
    padding: cryptoJS.pad.Pkcs7
  });
  return cryptoJS.enc.Utf8.stringify(ret).toString();
};

function parseBase64ToUtf8(raw: string): string {
  // console.log(raw);
  const decodedBytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(decodedBytes);
}

function initColaMangaKeyMap(): Promise<Record<number, string>> {
  return new Promise((resolve, reject) => {
    const keymapRaw = window.localStorage.getItem("colamanga-key-map");
    if (keymapRaw) {
      try {
        const keymap = JSON.parse(keymapRaw) as Record<number, string>;
        resolve(keymap);
        return;
      } catch (_) { }
    }
    const readerJSURL = "https://www.colamanga.com/js/manga.read.js";
    const elem = document.createElement("script");
    elem.addEventListener("load", async () => {
      try {
        const text = await window.fetch(readerJSURL).then(res => res.text());
        // const fn = text.match(/^function (\w+)/)?.[1]!;
        const matches = text.matchAll(/if\(_0x\w+==0x(\w+)\)return _0x5cdd4f\(0x(\w+)\);/gm);
        const keymap: Record<number, string> = {};
        let isEmpty = true;
        for (const m of matches) {
          const key = m[1];
          const index = m[2];
          // @ts-ignore
          const val = _0x79eb(parseInt("0x" + index));
          keymap[parseInt("0x" + key)] = val;
          isEmpty = false;
        }
        if (isEmpty) throw new Error("cannot init key map from " + readerJSURL);
        window.localStorage.setItem("colamanga-key-map", JSON.stringify(keymap));
        resolve(keymap);
      } catch (reason) {
        reject(reason);
      }
    });
    elem.src = readerJSURL;
    elem.type = "text/javascript";
    document.querySelector("head")!.append(elem);
  });
}

export class ColaMangaMatcher extends BaseMatcher<string> {
  infoMap: Record<string, Info> = {};
  keymap?: Record<number, string>;
  name(): string {
    return "colamanga";
  }
  async fetchChapters(): Promise<Chapter[]> {
    this.keymap = await initColaMangaKeyMap();
    const thumbimg = document.querySelector("dt.fed-part-rows > a")?.getAttribute("data-original") || undefined;
    const list = Array.from(document.querySelectorAll<HTMLAnchorElement>(".fed-part-rows > li > a"));
    return list.map<Chapter>((a, index) => {
      return {
        id: index,
        title: a.title,
        source: a.href,
        queue: [],
        thumbimg,
      };
    });
  }
  async *fetchPagesSource(source: Chapter): AsyncGenerator<string> {
    yield source.source;
  }
  async parseImgNodes(page: string, _chapterID?: number): Promise<ImageNode[]> {
    const raw = await window.fetch(page).then(res => res.text());
    const cdata = raw.match(EXTRACT_C_DATA)?.[1];
    if (!cdata) throw new Error("cannot find C_DATA from page: " + page);
    let infoRaw = decrypt(CDATA_KEY, parseBase64ToUtf8(cdata));
    // console.log("colamanga info: ", info);
    infoRaw = infoRaw.replace("};", "},");
    infoRaw = infoRaw.replaceAll("info=", "info:");
    infoRaw = "{" + infoRaw + "}";
    infoRaw = infoRaw.replaceAll(/(\w+):/g, "\"$1\":");
    const info = JSON.parse(infoRaw) as Info;
    const [count, path] = decryptInfo(info.mh_info.enc_code1, info.mh_info.enc_code2, info.mh_info.mhid);
    const nodes = [];
    const href = window.location.origin + info.mh_info.webPath + info.mh_info.pageurl;
    this.infoMap[href] = info;
    for (let start = info.mh_info.startimg; start <= parseInt(count); start++) {
      const [name, url] = getImageURL(start, path, info);
      // console.log("colamanga image url: ", url);
      nodes.push(new ImageNode("", href, name, undefined, url));
    }
    return nodes;
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  async processData(data: Uint8Array, _contentType: string, node: ImageNode): Promise<[Uint8Array, string]> {
    const info = this.infoMap[node.href];
    if (!info) throw new Error("cannot found info from " + node.href);
    if (info.image_info.imgKey) {
      const decoded = decodeImageData(data, info.image_info.keyType, info.image_info.imgKey, this.keymap!);
      return [decoded, _contentType];
    } else {
      return [data, _contentType];
    }
  }
  workURL(): RegExp {
    return /colamanga.com\/manga-.*\/?$/;
  }
  headers(): Record<string, string> {
    return {
      "Referer": window.location.href,
      "Origin": window.location.origin,
    }
  }
}

type Info = {
  mh_info: {
    startimg: number,
    enc_code1: string,
    mhid: string,
    enc_code2: string,
    mhname: string,
    pageid: number,
    pagename: string,
    pageurl: string,
    readmode: number,
    maxpreload: number,
    defaultminline: number,
    domain: string,
    manga_size: string,
    default_price: number,
    price: number,
    use_server: string,
    webPath: string,
  },
  image_info: {
    img_type: string,
    urls__direct: string,
    line_id: number,
    local_watch_url: string,
    keyType: string,
    imgKey: string,
  }
}

function convertUint8ArrayToWordArray(data: Uint8Array) {
  let words = [];
  let i = 0;
  let len = data.length;
  while (i < len) {
    words.push(
      (data[i++] << 24) |
      (data[i++] << 16) |
      (data[i++] << 8) |
      (data[i++])
    );
  }
  return {
    sigBytes: words.length * 4,
    words: words
  };
}

type WordArray = ReturnType<typeof convertUint8ArrayToWordArray>;

function convertWordArrayToUint8Array(data: WordArray): Uint8Array {
  const len = data.words.length;
  const u8_array = new Uint8Array(len << 2);
  let offset = 0;
  let word;
  for (let i = 0; i < len; i++) {
    word = data.words[i];
    u8_array[offset++] = word >> 24;
    u8_array[offset++] = (word >> 16) & 0xff;
    u8_array[offset++] = (word >> 8) & 0xff;
    u8_array[offset++] = word & 0xff;
  }
  return u8_array;
}

function decodeImageData(data: Uint8Array, keyType: string, imgKey: string, keymap: Record<number, string>) {
  let kRaw;
  if (keyType !== "" && keyType !== "0") {
    kRaw = keymap[parseInt(keyType)];
  } else {
    try {
      kRaw = decrypt("KcmiZ8owmiBoPRMf", imgKey) || decrypt("ZIJ0EF9Twsfq8JOY", imgKey);
    } catch (_) {
      kRaw = decrypt("ZIJ0EF9Twsfq8JOY", imgKey);
    }
  }
  const start = performance.now();
  const wordArray = convertUint8ArrayToWordArray(data);
  const encArray = { ciphertext: wordArray };
  // @ts-ignore
  const cryptoJS = CryptoJS;
  const key = cryptoJS.enc.Utf8.parse(kRaw);
  const de = cryptoJS.AES.decrypt(encArray, key, {
    iv: cryptoJS.enc.Utf8.parse("0000000000000000"),
    mode: cryptoJS.mode.CBC,
    padding: cryptoJS.pad.Pkcs7
  });
  const ret = convertWordArrayToUint8Array(de);
  const end = performance.now();
  console.log("colamanga decode image data: ", end - start);
  return ret;
}

function decryptInfo(countEncCode: string, pathEncCode: string, mhid: string) {
  let count;
  try {
    count = decrypt("dDeIieDgQpwVQZsJ", parseBase64ToUtf8(countEncCode));
    if (count == "" || isNaN(parseInt(count))) {
      count = decrypt("ahCeZc7ZXoiX7Ljq", parseBase64ToUtf8(countEncCode));
    }
  } catch (_error) {
    count = decrypt("ahCeZc7ZXoiX7Ljq", parseBase64ToUtf8(countEncCode));
  }
  let path;
  try {
    path = decrypt("i8XLTfT8Mvu1Fcv2", parseBase64ToUtf8(pathEncCode));
    if (path == "" || !path.startsWith(mhid + "/")) {
      path = decrypt("BGfhxlJUxlWCgdLZ", parseBase64ToUtf8(pathEncCode));
    }
  } catch (_error) {
    path = decrypt("BGfhxlJUxlWCgdLZ", parseBase64ToUtf8(pathEncCode));
  }
  return [count, path];
}

function getImageURL(index: number, path: string, info: Info) {
  const start = (info.mh_info.startimg + index - 1).toString().padStart(4, "0");
  let imgName = start + ".jpg";
  if (info.image_info.imgKey != undefined && info.image_info.imgKey != "") {
    imgName = start + ".enc.webp";
  }
  const host = window.location.host.replace("www.", "");
  const url = "https://img" + info.mh_info.use_server + "." + host + "/comic/" + encodeURI(path) + imgName;
  return [imgName, url];
}

