import { conf } from "../config";
import { Comic18Matcher } from "./18comic";
import { ArcaMatcher } from "./arca";
import { DanbooruDonmaiMatcher, E621Matcher, GelBooruMatcher, KonachanMatcher, Rule34Matcher, YandereMatcher } from "./danbooru";
import { EHMatcher } from "./ehentai";
import { HentaiNexusMatcher } from "./hentainexus";
import { HitomiMather } from "./hitomi";
import { IMHentaiMatcher } from "./im-hentai";
import { KoharuMatcher } from "./koharo";
import { MangaCopyMatcher } from "./mangacopy";
import { MHGMatcher } from "./manhuagui";
import { NHMatcher } from "./nhentai";
import { PixivMatcher } from "./pixiv";
import { Matcher } from "./platform";
import { RokuHentaiMatcher } from "./rokuhentai";
import { SteamMatcher } from "./steam";
import { TwitterMatcher } from "./twitter";
import { WnacgMatcher } from "./wnacg";

export function getMatchers(): Matcher[] {
  return [
    new EHMatcher(),
    new NHMatcher(),
    new HitomiMather(),
    new PixivMatcher(),
    new SteamMatcher(),
    new RokuHentaiMatcher(),
    new Comic18Matcher(),
    new DanbooruDonmaiMatcher(),
    new Rule34Matcher(),
    new YandereMatcher(),
    new KonachanMatcher(),
    new GelBooruMatcher(),
    new IMHentaiMatcher(),
    new TwitterMatcher(),
    new WnacgMatcher(),
    new HentaiNexusMatcher(),
    new KoharuMatcher(),
    new MHGMatcher(),
    new MangaCopyMatcher(),
    new E621Matcher(),
    new ArcaMatcher(),
  ];
}

export function adaptMatcher(url: string): [Matcher | null, boolean] {
  const matchers = getMatchers();
  const matcher = matchers
    .filter(matcher => !conf.siteProfiles[matcher.name()]?.disable)
    .find(matcher => {
      let workURLs = matcher.workURLs();
      if (conf.siteProfiles[matcher.name()] && conf.siteProfiles[matcher.name()].workURLs.length > 0) {
        workURLs = conf.siteProfiles[matcher.name()].workURLs.map(regex => new RegExp(regex));
      }
      return workURLs.find(regex => regex.test(url));
    });

  if (!matcher) return [null, false];
  return [matcher, !conf.siteProfiles[matcher.name()]?.disableAutoOpen];
}
