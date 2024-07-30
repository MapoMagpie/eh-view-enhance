import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { transactionId, uuid } from "../utils/random";
import { BaseMatcher, OriginMeta } from "./platform";

type Size = {
  h: number,
  w: number,
}
type VideoInfo = {
  variants: [
    {
      bitrate?: number,
      content_type: string,
      url: string,
    },
  ]
}
type Legacy = {
  entities: {
    media: [
      {
        id_str: string,
        expanded_url: string,// href
        media_url_https: string, //img base
        type: "photo" | "video" | "animated_gif",
        sizes: {
          large: Size,
          medium: Size,
          small: Size,
          thumb: Size,
        },
        video_info?: VideoInfo,
      },
    ],
  },
  possibly_sensitive: boolean,
  possibly_sensitive_editable: boolean,
}
type Item = {
  item: {
    itemContent: {
      tweet_results: {
        result: {
          legacy?: Legacy,
          tweet?: {
            legacy: Legacy,
          },
        }
      },
    }
  }
}
type TimelineAddToModule = {
  type: "TimelineAddToModule",
  moduleItems: Item[],
}
type TimelineTimelineModule = {
  entryType: "TimelineTimelineModule"
  items: Item[],
}
type TimelineTimelineCursor = {
  entryType: "TimelineTimelineCursor"
  value: string,
  cursorType: "Bottom" | "Top",
}
type TimelineAddEntries = {
  type: "TimelineAddEntries",
  entries: [
    { entryId: string, content: TimelineTimelineCursor | TimelineTimelineModule }
  ]
}
type Instructions = [TimelineAddToModule, TimelineAddEntries];

export class TwitterMatcher extends BaseMatcher {
  name(): string {
    return "Twitter | X";
  }
  mediaPages: Map<string, Item[]> = new Map();
  uuid = uuid();
  postCount: number = 0;
  mediaCount: number = 0;
  userID?: string;

  private async fetchUserMedia(cursor?: string): Promise<[Item[], string | undefined]> {
    if (!this.userID) {
      this.userID = getUserID();
    }
    if (!this.userID) throw new Error("Cannot obatained User ID");
    const variables = `{"userId":"${this.userID}","count":20,${cursor ? "\"cursor\":\"" + cursor + "\"," : ""}"includePromotedContent":false,"withClientEventToken":false,"withBirdwatchNotes":false,"withVoice":true,"withV2Timeline":true}`
    const features = "&features=%7B%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_media_interstitial_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticlePlainText%22%3Afalse%7D";
    const url = `${window.location.origin}/i/api/graphql/aQQLnkexAl5z9ec_UgbEIA/UserMedia?variables=${encodeURIComponent(variables)}${features}`;
    const headers = new Headers();

    headers.set("authorization", "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA");
    headers.set("Pragma", "no-cache");
    headers.set("Cache-Control", "no-cache");
    headers.set("content-type", "application/json");
    headers.set("x-client-uuid", this.uuid);
    headers.set("x-twitter-auth-type", "OAuth2Session");
    headers.set("x-twitter-client-language", "en");
    headers.set("x-twitter-active-user", "yes");
    headers.set("x-client-transaction-id", transactionId());
    headers.set("Sec-Fetch-Dest", "empty");
    headers.set("Sec-Fetch-Mode", "cors");
    headers.set("Sec-Fetch-Site", "same-origin");
    // get cookie for authorization
    const csrfToken = document.cookie.match(/ct0=(\w+)/)?.[1];
    if (!csrfToken) throw new Error("Not found csrfToken");
    headers.set("x-csrf-token", csrfToken);

    const res = await window.fetch(url, { headers, });
    try {
      const json = await res.json();
      const instructions = json.data.user.result.timeline_v2.timeline.instructions as Instructions;
      let items: Item[] | undefined;
      const addToModule = instructions.find(ins => ins.type === "TimelineAddToModule") as TimelineAddToModule | undefined;
      const addEntries = instructions.find(ins => ins.type === "TimelineAddEntries") as TimelineAddEntries | undefined;
      if (!addEntries) {
        throw new Error("Not found TimelineAddEntries");
      }
      if (addToModule) {
        items = addToModule.moduleItems;
      }
      if (!items) {
        const timelineModule = addEntries.entries.find(entry => entry.content.entryType === "TimelineTimelineModule")?.content as TimelineTimelineModule | undefined;
        items = timelineModule?.items;
      }
      if (!items) {
        return [[], undefined]
      }
      const timelineCursor = addEntries.entries.find(entry => entry.content.entryType === "TimelineTimelineCursor" && entry.entryId.startsWith("cursor-bottom"))?.content as TimelineTimelineCursor | undefined;
      return [items, timelineCursor?.value];
    } catch (error) {
      throw new Error(`fetchUserMedia error: ${error}`);
    }
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let cursor: string | undefined;
    while (true) {
      const [mediaPage, nextCursor] = await this.fetchUserMedia(cursor);
      cursor = nextCursor || "last";
      if (!mediaPage || mediaPage.length === 0) break;
      this.mediaPages.set(cursor, mediaPage);
      yield cursor;
      if (!nextCursor) break;
    }
  }

  async parseImgNodes(cursor: PagesSource): Promise<ImageNode[]> {
    const items = this.mediaPages.get(cursor as string);
    if (!items) throw new Error("warn: cannot find items");
    const list: ImageNode[] = [];
    for (const item of items) {
      let mediaList = item?.item?.itemContent?.tweet_results?.result?.legacy?.entities?.media || item?.item?.itemContent?.tweet_results?.result?.tweet?.legacy?.entities?.media;
      if (mediaList === undefined) {
        evLog("error", "Not found mediaList: ", item);
        continue;
      }
      this.postCount++;
      if (conf.reverseMultipleImagesPost) {
        mediaList.reverse();
      }
      for (let i = 0; i < mediaList.length; i++) {
        const media = mediaList[i];
        if (media.type !== "video" && media.type !== "photo" && media.type !== "animated_gif") {
          evLog("error", `Not supported media type: ${media.type}`);
          continue;
        }
        const ext = media.media_url_https.split(".").pop();
        const baseSrc = media.media_url_https.replace(`.${ext}`, "");
        const src = `${baseSrc}?format=${ext}&name=${media.sizes.small ? "small" : "thumb"}`;
        let href = media.expanded_url.replace(/\/(photo|video)\/\d+/, "");
        href = `${href}/${media.type === "video" ? "video" : "photo"}/${i + 1}`
        let largeSrc = `${baseSrc}?format=${ext}&name=${media.sizes.large ? "large" : media.sizes.medium ? "medium" : "small"}`
        const title = `${media.id_str}-${baseSrc.split("/").pop()}.${ext}`
        const node = new ImageNode(src, href, title, undefined, largeSrc);
        if (media.video_info) {
          let bitrate = 0;
          for (const variant of media.video_info.variants) {
            if (variant.bitrate !== undefined && variant.bitrate >= bitrate) {
              bitrate = variant.bitrate;
              node.originSrc = largeSrc;
              node.mimeType = variant.content_type;
              node.title = node.title.replace(/\.\w+$/, `.${variant.content_type.split("/")[1]}`);
            }
          }
        }
        list.push(node);
        this.mediaCount++;
      }
    }
    return list;
  }

  async fetchOriginMeta(): Promise<OriginMeta> {
    throw new Error("the image src already exists in the ImageNode");
  }

  workURL(): RegExp {
    return /(\/x|twitter).com\/(?!(home|explore|notifications|messages)$|i\/|search\?)\w+/
  }

  galleryMeta(doc: Document): GalleryMeta {
    const userName = window.location.href.match(/(twitter|x).com\/(\w+)\/?/)?.[2];
    return new GalleryMeta(window.location.href, `twitter-${userName || doc.title}-${this.postCount}-${this.mediaCount}`);
  }

}

function getUserID(): string | undefined {
  const userName = window.location.href.match(/(twitter|x).com\/(\w+)\/?/)?.[2] || "lililjiliijili";
  const followBTNs = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-testid][aria-label]"));
  if (followBTNs.length === 0) return undefined;
  const theBTN = followBTNs.find(btn => (btn.getAttribute("aria-label") ?? "").toLowerCase().includes(`@${userName.toLowerCase()}`)) || followBTNs[0];
  return theBTN.getAttribute("data-testid")!.match(/(\d+)/)?.[1];
}
