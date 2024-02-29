import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
    outDir: '',
    emptyOutDir: false,
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://exhentai.org/favicon.ico',
        namespace: 'https://github.com/MapoMagpie/eh-view-enhance',
        downloadURL: 'https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js',
        updateURL: 'https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.meta.js',
        match: [
          'https://exhentai.org/*',
          'https://e-hentai.org/*',
          'https://nhentai.net/*',
          'https://steamcommunity.com/id/*/screenshots*',
          'https://hitomi.la/*',
          'https://www.pixiv.net/*',
          'https://yande.re/*'
        ],
        name: { "": "E HENTAI VIEW ENHANCE", "zh-CN": "E绅士阅读强化" },
        version: '4.3.4',
        license: 'MIT',
        author: 'MapoMagpie',
        description: {
          "": "Improve the comic reading experience by displaying all thumbnails, Auto loading large images, Downloading as archive, and keeping the site’s load low.",
          "zh-CN": "提升漫画阅读体验，陈列所有缩略图，自动加载大图，打包下载，同时保持对站点的低负载。"
        },
        connect: [
          'exhentai.org',
          'e-hentai.org',
          'hath.network',
          'nhentai.net',
          'hitomi.la',
          'akamaihd.net',
          'i.pximg.net',
          'ehgt.org',
          'files.yande.re'
        ],
        // resource: {
        //   "ffmpeg-core.wasm": "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm"
        // },
        grant: [
          'GM_xmlhttpRequest',
          'GM_setValue',
          'GM_getValue',
          // 'GM_getResourceURL'
        ],
        require: [
          'https://cdn.jsdelivr.net/npm/jszip@3.1.5/dist/jszip.min.js',
          'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js',
          'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
        ],
      },
      build: {
        fileName: 'eh-view-enhance.user.js',
        metaFileName: 'eh-view-enhance.meta.js',
        externalGlobals: {
          "jszip": "JSZip",
          "file-saver": "saveAs",
          "hammerjs": "Hammer",
        },
        // externalResource: {
        //   "ffmpeg-core.wasm": "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm"
        // }
      },
      server: { mountGmApi: false },
    }),
  ],
});
