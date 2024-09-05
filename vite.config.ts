import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

const VERSION = '4.8.4';
// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  let downloadURL: string | undefined;
  let updateURL: string | undefined;
  let outDir: string | undefined;
  let emptyOutDir = true;
  if (command === 'build') {
    downloadURL = 'https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js';
    updateURL = 'https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.meta.js';
    outDir = '';
    emptyOutDir = false;
  }
  return {
    define: {
      _VERSION_: `"${VERSION}"`,
    },
    build: {
      target: 'esnext',
      outDir,
      emptyOutDir,
    },
    server: {
      host: '0.0.0.0',
    },
    plugins: [
      monkey({
        entry: 'src/main.ts',
        userscript: {
          version: VERSION,
          icon: 'https://exhentai.org/favicon.ico',
          namespace: 'https://github.com/MapoMagpie/eh-view-enhance',
          supportURL: 'https://github.com/MapoMagpie/eh-view-enhance/issues',
          downloadURL,
          updateURL,
          match: [
            'https://exhentai.org/*',
            'https://e-hentai.org/*',
            "http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*",
            'https://nhentai.net/*',
            'https://nhentai.xxx/*',
            'https://steamcommunity.com/id/*/screenshots*',
            'https://hitomi.la/*',
            'https://*.pixiv.net/*',
            'https://yande.re/*',
            'https://konachan.com/*',
            'https://rokuhentai.com/*',
            'https://18comic.org/*',
            'https://18comic.vip/*',
            'https://rule34.xxx/*',
            'https://imhentai.xxx/*',
            'https://danbooru.donmai.us/*',
            'https://gelbooru.com/*',
            'https://twitter.com/*',
            'https://x.com/*',
            'https://*.wnacg.com/*',
            'https://*.wn**.cc/*',
            'https://hentainexus.com/*',
            'https://koharu.to/*',
            'https://*.manhuagui.com/*',
            'https://*.mangacopy.com/*',
            'https://*.copymanga.tv/*',
            'https://e621.net/*',
            'https://arca.live/*',
          ],
          name: {
            "": "ComicLooms",
            "zh-CN": "漫画织机",
            "zh-TW": "漫畫織機",
            "ja": "コミック織機",
            "ko": "만화 베틀",
            "ru": "Комические ткацкие станки",
          },
          license: 'MIT',
          author: 'MapoMagpie',
          description: {
            "": "Manga Viewer + Downloader, Focus on experience and low load on the site. Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live",
            "zh-CN": "漫画阅读 + 下载器，注重体验和对站点的负载控制。支持：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live",
            "zh-TW": "漫畫閱讀 + 下載器，注重體驗和對站點的負載控制。支持：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live",
            "ja": "サイトのエクスペリエンスと負荷制御に重点を置いたコミック閲覧 + ダウンローダー。サポート：Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live",
            "ko": "만화 읽기 + 다운로더, 유저 경험 및 낮은 사이트 부하에 중점을 둡니다. 지원: Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com | twitter.com | wnacg.com | manhuagui.com | mangacopy.com | yande.re | hentainexus.com | koharu.to | arca.live",
            "ru": "Manga Viewer + Downloader, Focus on experience and low load on the site. Support: e-hentai | exhentai | pixiv | 18comic | nhentai | hitomi | rule34 | danbooru | gelbooru | twitter | x | wnacg | manhuagui | mangacopy | yande | hentainexus | koharu | arca",
          },
          connect: [
            'exhentai.org',
            'e-hentai.org',
            'hath.network',
            "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion",
            'nhentai.net',
            'nhentaimg.com',
            'hitomi.la',
            'akamaihd.net',
            'i.pximg.net',
            'ehgt.org',
            'yande.re',
            'konachan.com',
            '18comic.org',
            '18comic.vip',
            '18-comicfreedom.xyz',
            'rule34.xxx',
            'imhentai.xxx',
            'donmai.us',
            'gelbooru.com',
            'twimg.com',
            'qy0.ru',
            'wnimg.ru',
            'hentainexus.com',
            'koharu.to',
            'kisakisexo.xyz',
            'koharusexo.xyz',
            'aronasexo.xyz',
            'hamreus.com',
            'mangafuna.xyz',
            'e621.net',
            'namu.la',
            '*',
          ],
          grant: [
            'GM_xmlhttpRequest',
            'GM_setValue',
            'GM_getValue',
          ],
        },
        build: {
          fileName: 'eh-view-enhance.user.js',
          metaFileName: 'eh-view-enhance.meta.js',
          externalGlobals: {
            "@zip.js/zip.js": cdn.jsdelivr("zip", "dist/zip-full.min.js"),
            "file-saver": cdn.jsdelivr("saveAs", "dist/FileSaver.min.js"),
            "pica": cdn.jsdelivr("pica", "dist/pica.min.js"),
          },
          autoGrant: true,
        },
        server: { mountGmApi: false },
      }),
    ],
  };
});
