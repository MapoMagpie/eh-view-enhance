import { conf, saveConf } from "../config";
import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { NHMatcher } from "./nhentai";
import { Pixiv } from "./pixiv";
import { Matcher } from "./platform";
import { RokuHentaiMatcher } from "./rokuhentai";
import { SteamMatcher } from "./steam";
import { YandeMatcher } from "./yande";

export const matchers: Matcher[] = [
  new EHMatcher(),
  new NHMatcher(),
  new HitomiMather(),
  new YandeMatcher(),
  new Pixiv(),
  new SteamMatcher(),
  new RokuHentaiMatcher(),
];

export function adaptMatcher(url: string): Matcher | null {
  const workURLs = matchers.map(m => m.workURL().source);
  // check excludeURLs health, remove invalid RegExp
  const newExcludeURLs = conf.excludeURLs.filter(source => {
    return workURLs.indexOf(source) > -1;
  });
  if (newExcludeURLs.length !== conf.excludeURLs.length) {
    conf.excludeURLs = newExcludeURLs;
    saveConf(conf);
  }
  // if all sites are excluded, don't exclude any
  if (conf.excludeURLs.length < matchers.length) {
    for (const regex of conf.excludeURLs) {
      if (new RegExp(regex).test(url)) {
        return null;
      }
    }
  }
  return matchers.find(m => m.workURL().test(url)) || null;
}
