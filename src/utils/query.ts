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

export function xhrWapper<T extends RespType>(url: string, respType: T, cb: EventListener<T>, headers: Record<string, string>, timeout?: number): (() => void) | undefined {
  return GM_xmlhttpRequest<unknown, T>({
    method: "GET",
    url,
    timeout: timeout || 600000,
    responseType: respType,
    nocache: false,
    revalidate: false,
    // fetch: false,
    headers: {
      "Referer": window.location.href,
      "Cache-Control": "public, max-age=2592000, immutable",
      ...headers,
    },
    ...cb,
  })?.abort;
}
// const HOST_REGEX = /\/\/([^\/]*)\//;
// "Origin": window.location.origin,
// "X-Alt-Referer": window.location.href,
// "Host": HOST_REGEX.exec(url)?.[1] || window.location.host,
// "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
// "Accept": "*/*",
// "Connection": "keep-alive",
// "Accept-Language": "en-US,en;q=0.5",
// "Accept-Encoding": "gzip, deflate, br, zstd",
// "Sec-Fetch-Dest": "empty",
// "Sec-Fetch-Mode": "cors",
// "Sec-Fetch-Site": "cross-site",

export function fetchImage(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    xhrWapper(url, "blob", {
      onload: (response) => resolve(response.response),
      onerror: (error) => reject(error)
    }, {}, 10 * 1000);
  });
}
export async function batchFetch<T>(urls: string[], concurrency: number, respType: "text" | "json" | "arraybuffer" = "text"): Promise<T[]> {
  const results = new Array(urls.length);
  let i = 0;
  while (i < urls.length) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map((url, index) =>
      window.fetch(url).then((resp) => {
        if (resp.ok) {
          switch (respType) {
            case "text":
              return resp.text();
            case "json":
              return resp.json();
            case "arraybuffer":
              return resp.arrayBuffer();
          }
        }
        throw new Error(`failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
      }).then(raw => results[index + i] = raw)
    );
    await Promise.all(batchPromises);
    i += concurrency;
  }
  return results;
}
