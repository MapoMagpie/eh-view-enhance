import { conf } from "../config";
import { Matcher } from "./platform";
import { EHMatcher } from "./ehentai";
import { Comic18Matcher } from "./18comic";
import { AkumaMatcher } from "./akuma";
import { ArcaMatcher } from "./arca";
import { ArtStationMatcher } from "./artstation";
import { ColaMangaMatcher } from "./colamanga";
import { DanbooruDonmaiMatcher, E621Matcher, GelBooruMatcher, KonachanMatcher, Rule34Matcher, YandereMatcher } from "./danbooru";
import { Hanime1Matcher } from "./hanime1";
import { HentaiNexusMatcher } from "./hentainexus";
import { HentaiZapMatcher } from "./hentaizap";
import { HitomiMather } from "./hitomi";
import { IMHentaiMatcher } from "./im-hentai";
import { InstagramMatcher } from "./instagram";
import { KemonoMatcher } from "./kemono";
import { KoharuMatcher } from "./koharo";
import { MangaCopyMatcher } from "./mangacopy";
import { MHGMatcher } from "./manhuagui";
import { MiniServeMatcher } from "./miniserve";
import { MyComicMatcher } from "./mycomic";
import { NHMatcher, NHxxxMatcher } from "./nhentai";
import { PixivMatcher } from "./pixiv";
import { RokuHentaiMatcher } from "./rokuhentai";
import { SteamMatcher } from "./steam";
import { TwitterMatcher } from "./twitter";
import { WnacgMatcher } from "./wnacg";
import { YabaiMatcher } from "./yabai";
import { MangaParkMatcher } from "./mangapark";
import { Hentai3Matcher } from "./3hentai";
import { BilibiliMatcher } from "./bilibili";
import { AsmHentaiMatcher } from "./asmhentai";
import { EahentaiMatcher } from "./eahentai";
import { BatotoMatcher } from "./mangatoto";

export function getMatchers(): Matcher<any>[] {
  return [
    new EHMatcher(),
    new NHMatcher(),
    new NHxxxMatcher(),
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
    new ArtStationMatcher(),
    new AkumaMatcher(),
    new InstagramMatcher(),
    new ColaMangaMatcher(),
    new YabaiMatcher(),
    new Hanime1Matcher(),
    new MyComicMatcher(),
    new KemonoMatcher(),
    new HentaiZapMatcher(),
    new MiniServeMatcher(),
    new MangaParkMatcher(),
    new Hentai3Matcher(),
    new BilibiliMatcher(),
    new AsmHentaiMatcher(),
    new EahentaiMatcher(),
    new BatotoMatcher(),
  ];
}

export function adaptMatcher(url: string): [Matcher<any> | null, boolean, boolean] {
  const matchers = getMatchers();
  const matcher = matchers
    .filter(matcher => conf.siteProfiles[matcher.name()]?.enable ?? true)
    .find(matcher => {
      let workURLs = matcher.workURLs();
      if (conf.siteProfiles[matcher.name()] && (conf.siteProfiles[matcher.name()].workURLs.length) > 0) {
        workURLs = conf.siteProfiles[matcher.name()].workURLs.map(regex => new RegExp(regex));
      }
      return workURLs.find(regex => regex.test(url));
    });

  if (!matcher) return [null, false, false];
  return [
    matcher,
    conf.siteProfiles[matcher.name()]?.enableAutoOpen ?? true,
    conf.siteProfiles[matcher.name()]?.enableFlowVision ?? true,
  ];
}
