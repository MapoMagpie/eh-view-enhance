import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://exhentai.org/favicon.ico',
        namespace: 'https://github.com/MapoMagpie/eh-view-enhance',
        updateURL: 'https://raw.githubusercontent.com/MapoMagpie/eh-view-enhance/master/dist/eh-view-enhance.user.js',
        exclude: [
          'https://nhentai.net/g/*/*/',
          'https://yande.re/post/show/*'
        ],
        match: [
          'https://exhentai.org/g/*',
          'https://e-hentai.org/g/*',
          'https://nhentai.net/g/*',
          'https://steamcommunity.com/id/*/screenshots*',
          'https://hitomi.la/*/*',
          'https://www.pixiv.net/*',
          'https://yande.re/post*'
        ],
        name: { "": "Cosmos Manga View", "zh-CN": "宇宙漫画视图" },
        version: '4.2.1',
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
