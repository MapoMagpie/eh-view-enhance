import { GM_xmlhttpRequest, GmXhrRequest } from "$";

type RespType = keyof {
  text: string;
  json: any;
  arraybuffer: ArrayBuffer;
  blob: Blob;
  document: Document;
  stream: ReadableStream<Uint8Array>;
};

type EventListener<T extends RespType> = Pick<GmXhrRequest<unknown, T>, "onload" | "onprogress" | "onerror" | "ontimeout" | "onloadstart">;

const HOST_REGEX = /\/\/([^\/]*)\//;
export function xhrWapper<T extends RespType>(url: string, respType: T, cb: EventListener<T>, timeout?: number) {
  return GM_xmlhttpRequest<unknown, T>({
    method: "GET",
    url,
    timeout: timeout || 600000,
    responseType: respType,
    nocache: false,
    revalidate: false,
    // fetch: false,
    headers: {
      "Host": HOST_REGEX.exec(url)?.[1] || window.location.host,
      // "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
      "Accept": "image/avif,image/webp,*/*",
      // "Accept-Language": "en-US,en;q=0.5",
      // "Accept-Encoding": "gzip, deflate, br",
      // "Connection": "keep-alive",
      "Referer": window.location.href,
      "X-Alt-Referer": window.location.href,
      // "Sec-Fetch-Dest": "image",
      // "Sec-Fetch-Mode": "no-cors",
      // "Sec-Fetch-Site": "cross-site",
      "Cache-Control": "public, max-age=2592000, immutable",
    },
    ...cb,
  }).abort;
}

export function fetchImage(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    xhrWapper(url, "blob", {
      onload: (response) => resolve(response.response),
      onerror: (error) => reject(error)
    }, 10 * 1000);
  });
}
