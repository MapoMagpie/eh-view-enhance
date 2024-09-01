// ==UserScript==
// @name               ComicLooms
// @name:zh-CN         漫画织机
// @name:zh-TW         漫畫織機
// @name:ja            コミック織機
// @name:ko            만화 베틀
// @name:ru            Комические ткацкие станки
// @namespace          https://github.com/MapoMagpie/eh-view-enhance
// @version            4.8.1
// @author             MapoMagpie
// @description        Manga Viewer + Downloader, Focus on experience and low load on the site. Support: Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @description:zh-CN  漫画阅读 + 下载器，注重体验和对站点的负载控制。支持：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @description:zh-TW  漫畫閱讀 + 下載器，注重體驗和對站點的負載控制。支持：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @description:ja     サイトのエクスペリエンスと負荷制御に重点を置いたコミック閲覧 + ダウンローダー。サポート：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @description:ko     만화 읽기 + 다운로더, 유저 경험 및 낮은 사이트 부하에 중점을 둡니다. 지원: Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @description:ru     Manga Viewer + Downloader, Focus on experience and low load on the site. Support: Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live
// @license            MIT
// @icon               https://exhentai.org/favicon.ico
// @supportURL         https://github.com/MapoMagpie/eh-view-enhance/issues
// @downloadURL        https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js
// @updateURL          https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.meta.js
// @match              https://exhentai.org/*
// @match              https://e-hentai.org/*
// @match              http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @match              https://nhentai.net/*
// @match              https://steamcommunity.com/id/*/screenshots*
// @match              https://hitomi.la/*
// @match              https://*.pixiv.net/*
// @match              https://yande.re/*
// @match              https://konachan.com/*
// @match              https://rokuhentai.com/*
// @match              https://18comic.org/*
// @match              https://18comic.vip/*
// @match              https://rule34.xxx/*
// @match              https://imhentai.xxx/*
// @match              https://danbooru.donmai.us/*
// @match              https://gelbooru.com/*
// @match              https://twitter.com/*
// @match              https://x.com/*
// @match              https://*.wnacg.com/*
// @match              https://*.wn01.cc/*
// @match              https://*.wn02.cc/*
// @match              https://hentainexus.com/*
// @match              https://koharu.to/*
// @match              https://*.manhuagui.com/*
// @match              https://*.mangacopy.com/*
// @match              https://*.copymanga.tv/*
// @match              https://e621.net/*
// @match              https://arca.live/*
// @require            https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.44/dist/zip-full.min.js
// @require            https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// @require            https://cdn.jsdelivr.net/npm/pica@9.0.1/dist/pica.min.js
// @connect            exhentai.org
// @connect            e-hentai.org
// @connect            hath.network
// @connect            exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion
// @connect            nhentai.net
// @connect            hitomi.la
// @connect            akamaihd.net
// @connect            i.pximg.net
// @connect            ehgt.org
// @connect            yande.re
// @connect            konachan.com
// @connect            18comic.org
// @connect            18comic.vip
// @connect            18-comicfreedom.xyz
// @connect            rule34.xxx
// @connect            imhentai.xxx
// @connect            donmai.us
// @connect            gelbooru.com
// @connect            twimg.com
// @connect            qy0.ru
// @connect            wnimg.ru
// @connect            hentainexus.com
// @connect            koharu.to
// @connect            kisakisexo.xyz
// @connect            koharusexo.xyz
// @connect            aronasexo.xyz
// @connect            hamreus.com
// @connect            mangafuna.xyz
// @connect            e621.net
// @connect            namu.la
// @connect            *
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// ==/UserScript==