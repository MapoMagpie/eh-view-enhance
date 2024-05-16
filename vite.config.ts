import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

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
          version: '4.5.3',
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
            'https://steamcommunity.com/id/*/screenshots*',
            'https://hitomi.la/*',
            'https://www.pixiv.net/*',
            'https://yande.re/*',
            'https://rokuhentai.com/*',
            'https://18comic.org/*',
            'https://18comic.vip/*',
            'https://18-comicfreedom.xyz/*',
            'https://rule34.xxx/*',
            'https://imhentai.xxx/*',
            'https://danbooru.donmai.us/*',
            'https://gelbooru.com/*',
            'https://twitter.com/*',
          ],
          name: { "": "E HENTAI VIEW ENHANCE", "zh-CN": "E绅士阅读强化" },
          license: 'MIT',
          author: 'MapoMagpie',
          description: {
            "": "Manga Viewer + Downloader, Focus on experience and low load on the site. Support: e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com",
            "zh-CN": "漫画阅读 + 下载器，注重体验和对站点的负载控制。支持：e-hentai.org | exhentai.org | pixiv.net | 18comic.vip | nhentai.net | hitomi.la | rule34.xxx | danbooru.donmai.us | gelbooru.com"
          },
          connect: [
            'exhentai.org',
            'e-hentai.org',
            'hath.network',
            "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion",
            'nhentai.net',
            'hitomi.la',
            'akamaihd.net',
            'i.pximg.net',
            'ehgt.org',
            'yande.re',
            '18comic.org',
            '18comic.vip',
            '18-comicfreedom.xyz',
            'rule34.xxx',
            'imhentai.xxx',
            'donmai.us',
            'gelbooru.com',
            'twimg.com',
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
            "hammerjs": cdn.jsdelivr("Hammer", "hammer.min.js"),
            "pica": cdn.jsdelivr("pica", "dist/pica.min.js"),
          },
          autoGrant: true,
        },
        server: { mountGmApi: false },
      }),
    ],
  };
});
