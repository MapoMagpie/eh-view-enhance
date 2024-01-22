import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { NHMatcher } from "./nhentai";
import { Pixiv } from "./pixiv";
import { Matcher } from "./platform";
import { SteamMatcher } from "./steam";
import { YandeMatcher } from "./yande";

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
  if (host === "yande.re") {
    return new YandeMatcher();
  }
  return new EHMatcher();
}
