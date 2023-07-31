import { GM_xmlhttpRequest, XhrRequest } from "$";
import { conf } from "../config";

export type ResponseType = XhrRequest["responseType"];

export type Callback = {
  onload?: XhrRequest["onload"],
  onprogress?: XhrRequest["onprogress"],
  onerror?: XhrRequest["onerror"],
  ontimeout?: XhrRequest["ontimeout"],
}

// { onprogress, onload, onerror, ontimeout }
export function xhrWapper(url: string, responseType: ResponseType, cb: Callback) {
  let request: XhrRequest = {
    method: "GET",
    url,
    responseType,
    timeout: conf.timeout * 1000,
    headers: {
      // "Host": url.replace("https://", "").split("/").shift()!,
      // "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
      // "Accept": "image/avif,image/webp,*/*",
      // "Accept-Language": "en-US,en;q=0.5",
      // "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      // "Referer": window.location.href.replace("/g/", "/mpv/"),
      "Sec-Fetch-Dest": "image",
      // "Sec-Fetch-Mode": "no-cors",
      // "Sec-Fetch-Site": "cross-site",
      "Cache-Control": "public,max-age=3600,immutable",
    },
    ...cb,
  };
  GM_xmlhttpRequest(request);
}
