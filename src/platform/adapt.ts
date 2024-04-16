import { conf, saveConf } from "../config";
import { Comic18Matcher } from "./18comic";
import { DanbooruDonmaiMatcher, Rule34Matcher, YandereMatcher } from "./danbooru";
import { EHMatcher } from "./ehentai";
import { HitomiMather } from "./hitomi";
import { IMHentaiMatcher } from "./im-hentai";
import { NHMatcher } from "./nhentai";
import { Pixiv } from "./pixiv";
import { Matcher } from "./platform";
import { RokuHentaiMatcher } from "./rokuhentai";
import { SteamMatcher } from "./steam";

export const matchers: Matcher[] = [
  new EHMatcher(),
  new NHMatcher(),
  new HitomiMather(),
  new Pixiv(),
  new SteamMatcher(),
  new RokuHentaiMatcher(),
  new Comic18Matcher(),
  new DanbooruDonmaiMatcher(),
  new Rule34Matcher(),
  new YandereMatcher(),
  new IMHentaiMatcher(),
];

export function adaptMatcher(url: string): Matcher | null {
  const workURLs = matchers.flatMap(m => m.workURLs()).map(r => r.source);
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
  return matchers.find(m => m.workURLs().find(r => r.test(url))) || null;
}
