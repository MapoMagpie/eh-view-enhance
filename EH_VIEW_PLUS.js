class IMGFetcher {
    constructor(node) {
        this.node = node;
        this.url = node.getAttribute("ahref");
        //当前处理阶段，0: 什么也没做 1: 获取到大图地址 2: 完整的获取到大图
        this.stage = 0;
    }

    async fetchImg(x) {
        switch (this.stage) {
            case 0://尝试获取大图地址
                try {
                    const response = await window.fetch(this.url);
                    const text = await response.text();
                    this.bigImageUrl = IMGFetcher.extractBigImgUrl.exec(text)[1];
                    this.stage = 1; this.fetchImg();
                } catch (error) {
                    this.stage = 0;
                    if (error.name === "AbortError") {
                        console.log("请求被中止，可能的原因是超时");
                        if (x) return false; this.fetchImg();
                    } else {
                        console.log("出现其他的异常 => ", error);
                    }
                }
            case 1://理论上获取到大图地址，尝试使用fetch获取大图数据
                if (this.bigImageUrl) {
                    try {
                        const response = await window.fetch(this.bigImageUrl);
                        this.imgBlob = await response.blob();
                        this.bigImageUrl = URL.createObjectURL(this.imgBlob);
                        this.stage = 2; this.fetchImg();
                    } catch (error) {
                        this.stage = 1;
                        if (error.name === "AbortError") {
                            console.log("请求被中止，可能的原因是超时");
                            if (x) return false; this.fetchImg();
                        } else {
                            console.log("出现其他的异常 => ", error);
                        }
                    }
                } else {//大图地址还不存在，不应该发生这样的事情
                    this.stage = 0; this.fetchImg();
                }
                break;
            case 2://已经完整的获取到大图，不再执行
                this.node.src = this.bigImageUrl;
                return true;
        }
    }

    set(x) {
        bigImageFrame.style.display = "flex"; bigImageElement.src = this.node.src;
        this.fetchImg(x).then(flag => { flag && (bigImageElement.scr = this.node.scr) })
    }
}
IMGFetcher.extractBigImgUrl = /\<img\sid=\"img\"\ssrc=\"(.*)\"\sstyle/;

class IMGFetcherQueue extends Array {
    constructor() {
        super();
    }

    do(start, step) {
        step = step || 3;
        for (let index = start + 1; (index < step + start) && (index < this.length); index++) { this[index].fetchImg() }
    }
}

let styleSheel = document.createElement("style");
styleSheel.textContent =
    `
    .fullViewPlane {
        width: 100%;
        height: 100%;
        background-color: #000;
        position: fixed;
        top: 0px;
        right: 0px;
        z-index: 1000;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        overflow: scroll;
    }

    .fullViewPlane > img:not(.bigImageFrame) {
        margin: 20px 0px 0px 22px;
        width: 10%;
        border: 5px gray solid;
        box-sizing: border-box;
        height: max-content;
    }

    .bigImageFrame {
        position: fixed;
        width: 100%;
        z-index: 1001;
        background-color: #000000d6;
        justify-content: center;
        height: 100%;
    }

    .bigImageFrame > img {
        height: 100%;
    }
`;

document.head.appendChild(styleSheel);

//创建一个全屏阅读元素
let fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");
//创建一个大图框架元素，追加到全屏阅读元素的第一个位置
let bigImageFrame = document.createElement("div");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.style.display = "none";
fullViewPlane.appendChild(bigImageFrame);
let bigImageElement = document.createElement("img");
bigImageFrame.appendChild(bigImageElement);
//todo 大图框架元素的滚轮事件

bigImageFrame.addEventListener("click", (event) => { if (event.target.tagName === "IMG") return; bigImageFrame.style.display = "none"; })

document.body.appendChild(fullViewPlane);
let IFQ = new IMGFetcherQueue();

//通过地址请求该页的内容
const fetchSource = async function (href, oriented) {
    const response = await window.fetch(href);
    const text = await response.text();
    let ele = document.createElement("div"); ele.innerHTML = text;
    return stepPageSource[oriented] = ele;
}

const stepPageSource = {
    "prev": null,
    "curr": document,
    "next": null
}

//通过该页的内容获取下一页或上一页的地址 oriented : prev/next
const stepPageUrl = function (source, oriented) {
    let e1 = source.querySelector("table.ptb td.ptds"), stepE; if (!e1) return null;
    switch (oriented) {
        case "prev":
            stepE = e1.previousElementSibling;
            if (!stepE || stepE.textContent === "<") return null;
            break;
        case "next":
            stepE = e1.nextElementSibling;
            if (!stepE || stepE.textContent === ">") return null;
            break;
    }
    return e2.firstElementChild.href;
}

//将该页的图片列表提取出来，然后追加到全屏阅读元素(fullViewPlane)上
const appendToFullViewPlane = function (source, oriented) {
    //从该页的文档中将图片列表提取出来
    let imageList = extractImageList(source);
    //每一个图片生成一个对应的大图处理器
    let IFs = imageList.map(img => new IMGFetcher(img));
    if (oriented === "prev") {//如果行动导向是上一页
        fullViewPlane.firstElementChild.after(...imageList);//则已全屏阅读元素的第一个元素为锚点，追加所有元素
        IFQ.unshift(...IFs);//则将所有的大图处理器添加到大图处理器数组的前部
    } else if (oriented === "next") {//如果行动导向是下一页
        fullViewPlane.lastElementChild.after(...imageList);
        IFQ.push(...IFs);
    }
    imageList.forEach(e => e.addEventListener("click", (event) => {
        //获取该元素所在的索引
        let index = [].slice.call(fullViewPlane.childNodes).indexOf(event.target) - 1;
        IFQ[index].set();
    }))
}

//提取当前页文档的图片列表
const extractImageList = function (source) {
    return [].slice.call(source.querySelector("#gdt").childNodes)
        .filter(node => (node.nodeType === 1 && node.hasChildNodes()))
        .map(node => { let imgE = node.firstElementChild.firstElementChild.cloneNode(true); imgE.setAttribute("ahref", node.firstElementChild.href); return imgE; })
}

const processCurrPage = async function (href) {
    const source = await fetchSource(href);
    putImgPlus(source.querySelector("#gdt"), imgPlusList, fullViewPlane);
    const nextHref = await nextPage(source);
    return nextHref ? processCurrPage(nextHref) : true;
}


appendToFullViewPlane(document, "next");
