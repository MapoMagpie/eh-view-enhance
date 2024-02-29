import { conf } from "../config";
import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { NHMatcher } from "./nhentai";
import { Pixiv } from "./pixiv";
import { Matcher } from "./platform";
import { SteamMatcher } from "./steam";
import { YandeMatcher } from "./yande";

const matchers: Matcher[] = [
  new EHMatcher(),
  new NHMatcher(),
  new HitomiMather(),
  new YandeMatcher(),
  new Pixiv(),
  new SteamMatcher(),
];

export function adaptMatcher(url: string): Matcher | null {
  for (const regex of conf.excludeURLs) {
    if (new RegExp(regex).test(url)) {
      return null;
    }
  }
  return matchers.find(m => m.workURL().test(url)) || null;
}
