import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta } from "./platform";

export class InstagramMatcher extends BaseMatcher<EdgeNode[]> {
  config?: InstagramConfig;
  name(): string {
    return "Instagram";
  }
  async *fetchPagesSource(): AsyncGenerator<EdgeNode[]> {
    this.config = parseConfig();
    let cursor: string | null = null;
    while (true) {
      const [nodes, pageInfo] = await this.fetchPosts(cursor);
      cursor = pageInfo.end_cursor;
      yield nodes;
      if (!pageInfo.has_next_page) break;
    }
  }
  async parseImgNodes(nodes: EdgeNode[]): Promise<ImageNode[]> {
    const ret: ImageNode[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const videos = node.video_versions;
      const images = !videos && node.carousel_media && node.carousel_media.length > 0 ? node.carousel_media.map(n => n.image_versions2) : [node.image_versions2];
      const digits = images.length.toString().length;
      for (let j = 0; j < images.length; j++) {
        const img = images[j];
        const title = images.length > 1 ? `${node.pk}-${(j + 1).toString().padStart(digits, "0")}` : node.pk;
        const ext = videos ? "mp4" : "jpeg";
        const [thumb, origin] = this.getThumbAndOrigin(img.candidates, videos);
        ret.push(new ImageNode(thumb?.url ?? "", `${window.location.origin}/p/${node.code}`, `${title}.${ext}`, undefined, origin.url, { w: thumb.width, h: thumb.height }));
      }
    }
    return ret;
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
  workURL(): RegExp {
    return /instagram.com\/(?!(home|explore|direct|reels|stories))\w+/;
  }

  async fetchPosts(cursor: string | null): Promise<[EdgeNode[], PageInfo]> {
    if (!this.config) throw new Error("instagram config null");
    const config = this.config!;
    const headers = new Headers();
    headers.append("x-fb-friendly-name", config.apiName);
    headers.append("x-bloks-version-id", config.bloksVersionID);
    headers.append("x-csrftoken", config.csrfToken);
    headers.append("x-ig-app-id", config.appID);
    headers.append("x-fb-lsd", config.lsd);
    headers.append("x-asbd-id", "129477");
    let variables: Record<string, any> = {
      "username": config.username,
      "__relay_internal__pv__PolarisIsLoggedInrelayprovider": true,
      "__relay_internal__pv__PolarisFeedShareMenurelayprovider": true,
      "data": { "count": 12, "include_relationship_info": true, "latest_besties_reel_media": true, "latest_reel_media": true },
    };
    if (cursor) {
      variables.after = cursor;
      variables.before = null;
      variables.first = 12;
      variables.last = null;
    }
    const body = new URLSearchParams();
    body.append("av", config.userID);
    body.append("__d", "www");
    body.append("__user", "0");
    body.append("__a", "1");
    body.append("__req", "x");
    body.append("__hs", config.hasteSession);
    body.append("dpr", "1");
    body.append("__ccg", "UNKNOWN");
    body.append("__rev", config.clientVersion);
    body.append("__hsi", config.hsi);
    body.append("__dyn", config.dyn);
    body.append("__comet_req", "7");
    body.append("fb_dtsg", config.dtsg);
    body.append("lsd", config.lsd);
    body.append("__spin_r", config.spinR);
    body.append("__spin_b", config.spinB);
    body.append("__spin_t", config.spinT);
    body.append("fb_api_caller_class", "RelayModern");
    body.append("fb_api_req_friendly_name", config.apiName);
    body.append("variables", JSON.stringify(variables));
    body.append("server_timestamps", "true");
    body.append("doc_id", config.docID);

    const res = await window.fetch("https://www.instagram.com/graphql/query", { headers, body, method: "POST" }).then(res => res.json());
    const data = res?.data?.xdt_api__v1__feed__user_timeline_graphql_connection as { edges: Edges, page_info: PageInfo } | undefined;
    if (!data) throw new Error("failed fetch user's posts by API");
    return [data.edges.map(e => e.node), data.page_info];
  }

  getThumbAndOrigin(candidates: MediaInfo[], videos: MediaInfo[] | null): [MediaInfo, MediaInfo] {
    const origin = videos?.[0] ?? candidates[0];
    let lastThumb: MediaInfo | undefined = undefined;
    for (const ca of candidates) {
      if (!lastThumb) {
        lastThumb = ca
        continue;
      };
      // lastThumb.width < ca.width means ca is square; ca.width <= 240 means lastThumb width >= 320, we pick lastThumb as thumb
      if (lastThumb.width < ca.width || ca.width <= 240) {
        break;
      }
      lastThumb = ca;
    }
    return [lastThumb!, origin];
  }
}

// body.append("__s", "g3804m%3Asucc9e%3Art7ums");
// body.append("__csr", "hc6A4QJMFkhbEW2vPi9l8yQHlV2WGJ58qy4GCAaFXKBIDyVqBJXKpCnj--VUyYzVelCaRh_zp6F8yihr-Q_x6mAirCh8WmmECA69qQUC6qCyXVK4FKHVUCGyogz4HxCijAxCt3V8O8hHw04YAwmi2U0Lu2Z0tQ3umjwd1xS0QUpg5qhS7aQ8w0H2zpQ9q82212Iwet0Gwk9k7EggjS8BwD4Dh9qFa08ug5384if6J2h8bUcUAE5EU6eq7ryo3_g4u683kwXx4qR23Cw3OCEZxf800xjE1ko09pU");
// body.append("jazoest", "26353");
type InstagramConfig = {
  csrfToken: string,
  lsd: string,
  bloksVersionID: string,
  appID: string,
  userID: string,
  hasteSession: string,
  clientVersion: string,
  hsi: string,
  spinR: string,
  spinB: string,
  spinT: string,
  dtsg: string,
  docID: string,
  apiName: string,
  dyn: string,
  username: string,
}

function parseConfig(): InstagramConfig {
  const err = new Error("cannot find instagram config from script[data-sjs]");
  const raw = Array.from(document.querySelectorAll<HTMLScriptElement>("script[data-sjs]"))
    .find(s => s.textContent?.trimStart().startsWith(`{"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"define":`))?.textContent;
  if (!raw) throw err;
  const data = JSON.parse(raw);
  const arr = data.require?.[0]?.[3]?.[0]?.__bbox?.define as [string, any, any, number][];
  const map = arr.reduce<Record<string, any>>((prev, curr) => {
    prev[curr[0]] = curr[2];
    return prev;
  }, {});
  if (!map) throw err;
  let csrfToken = map["InstagramSecurityConfig"]?.csrf_token;
  let lsd = map["LSD"]?.token;
  let bloksVersionID = map["WebBloksVersioningID"]?.versioningID;
  let appID = map["CurrentUserInitialData"]?.APP_ID;
  let userID = map["CurrentUserInitialData"]?.NON_FACEBOOK_USER_ID;
  let hasteSession = map["SiteData"]?.haste_session;
  let clientVersion = map["SiteData"]?.client_revision;
  let hsi = map["SiteData"]?.hsi;
  let spinR = map["SiteData"]?.__spin_r;
  let spinB = map["SiteData"]?.__spin_b;
  let spinT = map["SiteData"]?.__spin_t;
  let dtsg = map["DTSGInitData"]?.token;
  const username = window.location.pathname.split("/")?.[1];
  if (!csrfToken
    || !lsd
    || !bloksVersionID
    || !appID
    || !userID
    || !hasteSession
    || !clientVersion
    || !hsi
    || !spinR
    || !spinB
    || !spinT
    || !dtsg
    || !username
  ) throw err;
  const docID = "8363144743749214";
  const apiName = "PolarisProfilePostsTabContentQuery_connection";
  const dyn = "7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJxS0k24o0B-q1ew65xO0FE2awgo9oO0n24oaEnxO1ywOwv89k2C1Fwc60D87u3ifK0EUjwGzEaE2iwNwmE2eUlwhEe87q7U1mVEbUGdG1QwTU9UaQ0Lo6-3u2WE5B08-269wr86C1mwPwUQp1yUb9UK6V8aUuwm9EO6UaU4W";
  return {
    csrfToken,
    lsd,
    bloksVersionID,
    appID,
    userID,
    hasteSession,
    clientVersion,
    hsi,
    spinR,
    spinB,
    spinT,
    dtsg,
    docID,
    apiName,
    dyn,
    username,
  };
}
// xdt_api__v1__feed__user_timeline_graphql_connection

type Edges = { node: EdgeNode }[];
type EdgeNode = {
  id: string,
  pk: string,
  code: string, // href
  caption: {
    created_at: number,
    pk: string,
    text: string,
  }
  carousel_media_count: number | null,
  carousel_media: {
    image_versions2: {
      candidates: MediaInfo[],
    }
  }[] | null,
  image_versions2: {
    candidates: MediaInfo[],
  }
  video_versions: MediaInfo[] | null,
}
type MediaInfo = {
  url: string,
  type?: number,
  height: number,
  width: number,
}
type PageInfo = {
  end_cursor: string | null,
  has_next_page: boolean,
  has_previous_page: boolean,
  start_cursor: string | null,
}

// function p() {
//   const i = 36, j = 6, k = Math.pow(i, j);
//   const n = Math.floor(Math.random() * k);
//   const a = n.toString(i);
//   return "0".repeat(j - a.length) + a
// }
