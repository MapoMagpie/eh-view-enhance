import { conf } from "../config";

export function loadStyleSheel() {
  const style = document.createElement('style');
  const css = `
.fullViewPlane {
  width: 100vw;
  height: 100vh;
  background-color: rgb(0, 0, 0);
  position: fixed;
  top: 0px;
  right: 0px;
  z-index: 1000;
  overflow: hidden scroll;
  transition: height 0.4s ease 0s;
  display: grid;
  align-content: start;
  grid-gap: 10px;
  grid-template-columns: repeat(${conf.colCount}, 1fr);
}
.fullViewPlane input, .fullViewPlane select {
  color: #f1f1f1;
  background-color: #34353b !important;
  outline: none;
  border: 1px solid #000000;
  border-radius: 4px;
  margin: 0px;
  padding: 0px;
  text-align: center;
  position: unset !important;
  top: unset !important;
}
.p-label {
  // position: relative;
  cursor: pointer;
}
.fullViewPlane .img-node {
  position: relative;
}
.fullViewPlane .img-node img {
  width: 100%;
  border: 2px solid white;
  box-sizing: border-box;
}
.collapse_full_view {
  height: 0;
  transition: height 0.4s;
}
.bigImageFrame::-webkit-scrollbar {
  display: none;
}
.bigImageFrame {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  right: 0;
  overflow: hidden scroll;
  z-index: 1001;
  background-color: #000000d6;
  transition: width 0.4s;
  scrollbar-width: none;
}
.bigImageFrame > img {
  object-fit: contain;
  // border-bottom: 1px solid #ffffff;
  display: block;
  margin: 0 auto;
}
.pageHelper {
  position: fixed;
  display: flex !important;
  justify-content: space-between;
  line-height: 25px;
  top: ${conf.pageHelperAbTop};
  left: ${conf.pageHelperAbLeft};
  bottom: ${conf.pageHelperAbBottom};
  right: ${conf.pageHelperAbRight};
  background-color: #4a4a4ae6;
  z-index: 2011 !important;
  box-sizing: border-box;
  font-weight: bold;
  color: #fff;
  font-size: 11pt;
  // cursor: pointer;
  transition: min-width 0.4s ease;
  min-width: 0px;
}
.pageHelper.pageHelperExtend {
  min-width: 367px;
  transition: min-width 0.4s ease;
}
.pageHelper:hover {
  background-color: #3a3a3ae6;
}
.pageHelper .clickable {
  text-decoration-line: underline;
  z-index: 1111;
  user-select: none;
  text-align: center;
}
.b-main .main-btn {
  height: 25px;
  background-color: #a1a1a1aa;
}
.main-btn:hover {
  background-color: #7e917eaa;
}
.clickable:hover {
  color: #90ea90 !important;
}
.pageHelper .plane {
  z-index: 1010 !important;
  background-color: rgba(38, 20, 25, 0.8);
  box-sizing: border-box;
  position: absolute;
  bottom: 26px;
  color: rgb(200, 222, 200);
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.2);
  overflow: hidden;
  width: 367px;
  transition: width 0.4s ease 0s, height 0.4s ease 0s;
}
.pageHelper .p-img-scale {
  // bottom: 30px;
  display: flex;
}
.p-img-scale .scale-btn {
  width: 30px;
  text-align: center;
  user-select: none;
}
.p-img-scale .scale-btn:hover {
  color: white;
  background-color: rgb(255, 200, 200);
}
.p-img-scale .scale-status {
  width: 40px;
  white-space: nowrap;
  overflow: hidden;
  text-align: center;
}
.p-img-scale .scale-progress {
  flex-grow: 1;
  display: flex;
  align-items: center;
}
.scale-progress .scale-progress-inner {
  height: 50%;
  background-color: #ffffffa0;
}
.p-collapse {
  height: 0px !important;
  transition: height 0.4s;
}
.pageHelper .b-main {
  width: 0px;
  overflow: hidden !important;
  display: flex;
  justify-content: space-between;
  white-space: nowrap !important;
  transition: flex-grow 0.6s ease;
}
.pageHelperExtend .b-main {
  flex-grow: 1;
  transition: flex-grow 0.6s ease;
}
.pageHelper .p-config {
  height: 387px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  align-content: start;
  grid-gap: 10px 0px;
}
.pageHelper .p-config label {
  display: flex;
  justify-content: space-between;
  padding-right: 10px;
}
.pageHelper .p-config input {
  cursor: ns-resize;
}
.pageHelper .p-downloader {
  height: 310px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.p-downloader canvas {
  /* border: 1px solid greenyellow; */
}
.p-downloader .download-notice {
  font-size: small;
  text-align: center;
  width: 100%;
}
.p-downloader .downloader-btn-group {
  align-items: center;
  text-align: right;
  width: 100%;
}
.pageHelper .p-btn {
  color: rgb(255, 255, 255);
  cursor: pointer;
  border: 1px solid #000000;
  border-radius: 4px;
  height: 24px;
  font-weight: 900;
  background: rgb(81, 81, 81);
  width: 24px;
}
.fetched {
  border: 2px solid #602a5c !important;
}
.fetch-failed {
  border: 2px solid red !important;
}
.fetching {
  padding: 2px;
  border: none !important;
  animation: 1s linear infinite cco;
  -webkit-animation: 1s linear infinite cco;
}
.pageHelperFetching {
  border: none !important;
  animation: 1s linear infinite cco;
  -webkit-animation: 1s linear infinite cco;
}
@keyframes cco {
  0% {
    background-color: #f00;
  }
  50% {
    background-color: #48ff00;
  }
  100% {
    background-color: #ae00ff;
  }
}
@keyframes main-progress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}
.b-f-collapse {
  width: 0px !important;
  transition: width 0.4s;
}
.downloadBar {
  background-color: rgba(100, 100, 100, 0.8);
  height: 10px;
  width: 100%;
  position: absolute;
  bottom: 0;
}

.imgLandLeft, .imgLandRight {
  width: 20%;
  height: 100%;
  position: fixed;
  z-index: 1004;
}
.imgLandLeft {
  left: 0;
  top: 0;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.imgLandRight {
  right: 0;
  top: 0;
  cursor: url("https://exhentai.org/img/n.png"), auto;
}
.imgLandTop, .imgLandBottom {
  left: 0px;
  width: 100%;
  height: 20%;
  position: fixed;
  z-index: 1005;
}
.imgLandTop {
  top: 0;
  z-index: 1005;
  cursor: url("https://exhentai.org/img/p.png"), auto;
}
.imgLandBottom {
  bottom: 0;
  z-index: 1005;
  cursor: url("https://exhentai.org/img/b.png"), auto;
}
.p-tooltip {
  border-bottom: 1px dotted black;
}
.p-tooltip .p-tooltiptext {
  visibility: hidden;
  width: 367px;
  top: 0px;
  right: 0px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  font-size: small;
  white-space: normal;
}
.p-tooltip:hover .p-tooltiptext {
  visibility: visible;
}
.p-minify:not(:hover) {
  min-width: 0px !important;
}
.p-minify:not(:hover) .b-m-page {
  position: absolute;
  ${conf.pageHelperAbRight === "unset" ? "left" : "right"}: 47px;
  height: 27px;
  background-color: rgba(74, 74, 74, 0.9);
}
.p-minify:not(:hover) .p-img-scale .scale-btn, .p-minify:not(:hover) .p-img-scale .scale-progress {
  display: none;
}
.p-minify:not(:hover) .p-img-scale {
  width: 90px;
  ${conf.pageHelperAbRight === "unset" ? "" : "right: -48px;"}
  transition: width 0.4s ease 0s;
}
`
  style.textContent = css;
  document.head.appendChild(style);
  /*`<!-- Place this tag in your head or just before your close body tag. -->
<script async defer src="https://buttons.github.io/buttons.js"></script>` */
  const githubButtonScript = document.createElement('script');
  githubButtonScript.src = 'https://buttons.github.io/buttons.js';
  githubButtonScript.async = true;
  githubButtonScript.defer = true;
  document.head.appendChild(githubButtonScript);
  return style;
}
