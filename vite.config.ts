import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://exhentai.org/favicon.ico',
        namespace: 'https://github.com/MapoMagpie/eh-view-enhance',
        exclude: [
          'https://nhentai.net/g/*/*/',
        ],
        match: [
          'https://exhentai.org/g/*',
          'https://e-hentai.org/g/*',
          'https://nhentai.net/g/*',
          'https://steamcommunity.com/id/*/screenshots*',
          'https://hitomi.la/*/*'
        ],
        name: { "": "E HENTAI VIEW ENHANCE", "zh-CN": "E绅士阅读强化" },
        version: '4.1.11',
        license: 'MIT',
        author: 'MapoMagpie',
        description: {
          "": "e-hentai.org better viewer, All of thumbnail images exhibited in grid, and show the best quality image.",
          "zh-CN": "E绅士阅读强化，一目了然的缩略图网格陈列，漫画形式的大图阅读。"
        },
        connect: [
          'exhentai.org',
          'e-hentai.org',
          'hath.network',
          'nhentai.net',
          'hitomi.la',
          'akamaihd.net',
        ],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue'],
        require: [
          'https://cdn.jsdelivr.net/npm/jszip@3.1.5/dist/jszip.min.js',
          'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js',
          'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
        ],
        // 'description:zh-CN': 'e-hentai.org 更好的浏览器，所有的缩略图都会被展示在网格中，并且显示最高质量的图片。',
      },
      build: {
        fileName: 'eh-view-enhance.user.js',
        externalGlobals: {
          "jszip": "JSZip",
          "file-saver": "saveAs",
          "hammerjs": "Hammer",
        }
      },
      server: { mountGmApi: false },
    }),
  ],
});
