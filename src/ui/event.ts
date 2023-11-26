import { ConfigBooleanType, ConfigNumberType, ConfigSelectType, conf, saveConf } from "../config";
import { HTML, BIFM, IFQ, Oriented, PF, main } from "../main";
import { i18n } from "../utils/i18n";

function modPageHelperPostion() {
  const style = HTML.pageHelper.style;
  conf.pageHelperAbTop = style.top;
  conf.pageHelperAbLeft = style.left;
  conf.pageHelperAbBottom = style.bottom;
  conf.pageHelperAbRight = style.right;
  saveConf(conf);
}

// modify config
function modNumberConfigEvent(key: ConfigNumberType, data?: "add" | "minus") {
  const range = {
    colCount: [1, 12],
    threads: [1, 10],
    downloadThreads: [1, 10],
    timeout: [8, 40],
    autoPageInterval: [500, 90000],
  };
  let mod = key === "autoPageInterval" ? 100 : 1;
  if (data === "add") {
    if (conf[key] < range[key][1]) {
      conf[key] += mod;
    }
  } else if (data === "minus") {
    if (conf[key] > range[key][0]) {
      conf[key] -= mod;
    }
  }
  const inputElement = document.querySelector<HTMLInputElement>(`#${key}Input`);
  if (inputElement) {
    inputElement.value = conf[key].toString();
  }
  if (key === "colCount") {
    const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules || []);
    for (const cssRule of cssRules) {
      if (cssRule instanceof CSSStyleRule) {
        if (cssRule.selectorText === ".fullViewPlane") {
          cssRule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
          break;
        }
      }
    }
  }
  saveConf(conf);
}

// modify config
function modBooleanConfigEvent(key: ConfigBooleanType) {
  const inputElement = document.querySelector<HTMLInputElement>(`#${key}Checkbox`);
  conf[key] = inputElement?.checked || false;
  saveConf(conf);
}

// modify config
function modSelectConfigEvent(key: ConfigSelectType) {
  const inputElement = document.querySelector<HTMLSelectElement>(`#${key}Select`);
  const value = inputElement?.value;
  if (value) {
    (conf[key] as any) = value;
    saveConf(conf);
  }
  if (key === "readMode" && conf.readMode === "singlePage") {
    BIFM.init(IFQ.currIndex);
  }
}

function mouseleavePlaneEvent(target: HTMLElement) {
  // fixme; in firefox, mouseleave event will be triggered when mouse move to child element, like <option>
  target.classList.add("p-collapse");
}

function togglePlaneEvent(id: string, collapse?: boolean) {
  setTimeout(() => {
    let element = document.querySelector<HTMLElement>(`#${id}Plane`);
    if (element) {
      if (collapse === false) {
        element.classList.remove("p-collapse");
      } else if (collapse === true) {
        mouseleavePlaneEvent(element);
      } else {
        element.classList.toggle("p-collapse");
        ["config", "downloader"].filter(k => k !== id).forEach(k => togglePlaneEvent(k, true));
      }
    }
  }, 10);
}

function showFullViewPlane() {
  HTML.fullViewPlane.scroll(0, 0); //否则加载会触发滚动事件
  HTML.fullViewPlane.classList.remove("collapse_full_view");
  document.body.style.display = "none";
  // for (const node of Array.from(document.body.children)) {
  //   if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("fullViewPlane")) {
  //     (node as HTMLElement).style.display = "none";
  //   }
  // }
};

function hiddenFullViewPlaneEvent(event: Event) {
  if (event.target === HTML.fullViewPlane) {
    main(true);
  }
};

function hiddenFullViewPlane() {
  hiddenBigImageEvent();
  HTML.fullViewPlane.classList.add("collapse_full_view");
  document.body.style.display = "";
  // for (const node of Array.from(document.body.children)) {
  //   if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("fullViewPlane")) {
  //     (node as HTMLElement).style.display = "";
  //   }
  // }
};

//全屏阅览元素的滚动事件
function scrollEvent() {
  //对冒泡的处理
  if (HTML.fullViewPlane.classList.contains("collapse_full_view")) return;
  //根据currTop获取当前滚动高度对应的未渲染缩略图的图片元素
  PF.renderCurrView(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
};

//大图框架点击事件，点击后隐藏大图框架
function hiddenBigImageEvent(event?: MouseEvent) {
  if (event && event.target && (event.target as HTMLElement).tagName === "SPAN") return;
  BIFM.hidden();
  HTML.pageHelper.classList.remove("p-minify");
};

//大图框架元素的滚轮事件/按下鼠标右键滚动则是缩放/直接滚动则是切换到下一张或上一张
function bigImageWheelEvent(event: WheelEvent) {
  stepImageEvent(event.deltaY > 0 ? "next" : "prev");
};

//按键事件
let numberRecord: number[] | null = null;
function keyboardEvent(event: KeyboardEvent) {
  if (!HTML.bigImageFrame.classList.contains("b-f-collapse")) { // in big image mode
    const b = HTML.bigImageFrame;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        stepImageEvent(conf.reversePages ? "next" : "prev");
        break;
      case "ArrowRight":
        event.preventDefault();
        stepImageEvent(conf.reversePages ? "prev" : "next");
        break;
      case "Escape":
      case "Enter":
        event.preventDefault();
        hiddenBigImageEvent();
        break;
      case " ":
      case "ArrowUp":
      case "ArrowDown": {
        event.preventDefault();
        let deltaY = HTML.fullViewPlane.clientHeight / (event.key === " " ? 1 : 2);
        if (event.key === "ArrowUp" || event.shiftKey) {
          deltaY = -deltaY;
        }
        const stepImage = () => {
          if (conf.readMode !== "singlePage") {
            return false;
          }
          if (event.key === "ArrowUp" || (event.key === " " && event.shiftKey)) {
            if (b.scrollTop <= 0) {
              return true;
            }
          }
          if (event.key === "ArrowDown" || (event.key === " " && !event.shiftKey)) {
            if (b.scrollTop >= b.scrollHeight - b.offsetHeight) {
              return true;
            }
          }
          return false;
        }
        if (stepImage()) {
          b.dispatchEvent(new WheelEvent("wheel", { deltaY }));
        } else {
          b.scrollBy({ top: deltaY, behavior: "smooth" });
          if (conf.readMode === "consecutively") {
            b.dispatchEvent(new WheelEvent("wheel", { deltaY }));
          }
        }
        break;
      }
      case "-":
        BIFM.scaleBigImages(-1, 5);
        break;
      case "=":
        BIFM.scaleBigImages(1, 5);
        break;
    }
  } else if (!HTML.fullViewPlane.classList.contains("collapse_full_view")) { // in thumbnails mode
    switch (event.key) {
      case "Enter": {
        let start = IFQ.currIndex;
        if (numberRecord && numberRecord.length > 0) {
          start = Number(numberRecord.join("")) - 1;
          numberRecord = null;
          if (start < 0 || start >= IFQ.length) {
            break;
          }
        }
        IFQ[start].imgElement.dispatchEvent(new MouseEvent("click"));
        break;
      }
      case "Escape":
        hiddenFullViewPlane();
        break;
      case "Space":
      case " ": {
        if (event.shiftKey) {
          HTML.fullViewPlane.scrollBy({ top: -HTML.fullViewPlane.clientHeight, behavior: "smooth" });
        } else {
          HTML.fullViewPlane.scrollBy({ top: HTML.fullViewPlane.clientHeight, behavior: "smooth" });
        }
        break;
      }
      case "ArrowUp": {
        const [top, _] = PF.findOutsideRoundViewNode(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
        top.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "ArrowDown": {
        const [_, bot] = PF.findOutsideRoundViewNode(HTML.fullViewPlane.scrollTop, HTML.fullViewPlane.clientHeight);
        bot.scrollIntoView({ behavior: "smooth", block: "end" });
        break;
      }
      default: {
        // if event.key is number, then record it
        if (event.key.length === 1 && event.key >= "0" && event.key <= "9") {
          numberRecord = numberRecord ? [...numberRecord, Number(event.key)] : [Number(event.key)];
        }
      }
    }
  }
};

//点击缩略图后展示大图元素的事件
function showBigImageEvent(event: Event) {
  showBigImage(IFQ.findImgIndex(event.target as HTMLElement));
};

function showBigImage(start: number) {
  //展开大图阅览元素
  BIFM.show();
  HTML.pageHelper.classList.add("p-minify")
  //获取该元素所在的索引，并执行该索引位置的图片获取器，来获取大图
  IFQ.do(start);
};

//加载上一张或下一张事件
function stepImageEvent(oriented: Oriented) {
  const start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
  IFQ.do(start, oriented);
};

//显示简易指南事件
function showGuideEvent() {
  const guideElement = document.createElement("div");
  document.body.after(guideElement);
  guideElement.innerHTML = `
  <div style="width: 50vw; min-height: 300px; border: 1px solid black; background-color: rgba(255, 255, 255, 0.8); font-weight: bold; line-height: 30px">${i18n.help.get()}</div>
  `;
  guideElement.setAttribute("style",
    `
position: absolute;
width: 100%;
height: 100%;
background-color: #363c3c78;
z-index: 2004;
top: 0;
display: flex;
justify-content: center;
align-items: center;
color: black;
text-align: left;
`);
  guideElement.addEventListener("click", () => guideElement.remove());
};

export const events = {
  modNumberConfigEvent,
  modBooleanConfigEvent,
  modSelectConfigEvent,
  modPageHelperPostion,
  togglePlaneEvent,
  showFullViewPlane,
  hiddenFullViewPlaneEvent,
  hiddenFullViewPlane,
  scrollEvent,
  hiddenBigImageEvent,
  bigImageWheelEvent,
  keyboardEvent,
  showBigImageEvent,
  showBigImage,
  stepImageEvent,
  showGuideEvent,
  mouseleavePlaneEvent,
}
