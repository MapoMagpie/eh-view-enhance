import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { NHMatcher } from "./nhentai";
import { Pixiv } from "./pixiv";
import { Matcher } from "./platform";
import { SteamMatcher } from "./steam";

export function adaptMatcher(): Matcher {
  const host = window.location.host;
  if (host === "nhentai.net") {
    return new NHMatcher();
  }
  if (host === "steamcommunity.com") {
    return new SteamMatcher();
  }
  if (host === "hitomi.la") {
    return new HitomiMather();
  }
  if (host.endsWith("pixiv.net")) {
    return new Pixiv();
  }
  return new EHMatcher();
}
