// ==UserScript==
// @name         E-HENTAI-VIEW-ENHANCE
// @namespace    https://github.com/kamo2020/eh-view-enhance
// @version      0.9.3
// @description  强化E绅士看图体验
// @author       kamo2020
// @match        https://exhentai.org/*
// @icon         https://exhentai.org/favicon.ico
// ==/UserScript==

//=========================================创建样式表==================================================START
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
        flex-wrap: wrap;
        justify-content: flex-start;
        overflow: scroll;
        background-image: url(https://t.halu.lu/t/12);
    }

    .fullViewPlane > img:not(.bigImageFrame) {
        margin: 20px 0px 0px 22px;
        width: 10%;
        border: 3px white solid;
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
//=========================================创建样式表==================================================FIN


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================START
class IMGFetcher {
    constructor(node) {
        this.node = node;
        this.url = node.getAttribute("ahref");
        this.oldSrc = node.src;
        //当前处理阶段，0: 什么也没做 1: 获取到大图地址 2: 完整的获取到大图
        this.stage = 0;
        this.tryTime = 0;
    }

    async fetchImg(x) {
        switch (this.stage) {
            case 0://尝试获取大图地址
                try {
                    const response = await window.fetch(this.url);
                    const text = await response.text();
                    this.bigImageUrl = IMGFetcher.extractBigImgUrl.exec(text)[1];
                    this.stage = 1; this.node.style.border = "3px #2a5360 solid"; return/* 少写一个return，花了我4小时调试一个奇怪的bug */ this.fetchImg(x);
                } catch (error) {
                    this.stage = 0;
                    console.log("出现其他的异常 => ", error);
                    return false;
                }
            case 1://理论上获取到大图地址，尝试使用weirdFetch获取大图数据
                if (this.bigImageUrl) {
                    try {
                        const flag = await IMGFetcher.weirdFetch(this.node, this.bigImageUrl, this.oldSrc).then(result => result.flag);
                        if (flag) {
                            this.stage = 2; this.node.style.border = "3px #602a5c solid"; return this.fetchImg(x);
                        } else {
                            ++this.tryTime; this.stage = 0; this.node.style.border = "3px white solid";
                            if (this.tryTime > 2) { this.node.style.border = "3px red solid"; return false; }//重试2次后，直接失败，避免无限请求
                            return this.fetchImg(x);
                        }
                    } catch (error) {
                        this.stage = 1;
                        console.log("出现其他的异常 => ", error);
                        return false;
                    }
                } else {//大图地址还不存在，不应该发生这样的事情
                    this.stage = 0; return this.fetchImg(x);
                }
            case 2://大图已经加载完毕，已经走到这个IMGFetcher图片获取器的生命尽头，以后调用这个IMGFetcher图片获取器的时候，直接返回确认
                return true;
        }
    }

    set(isCurr, x) {
        this.fetchImg(x).then(flag => { if (flag && isCurr) { bigImageElement.style.border = "3px #602a5c solid"; bigImageElement.src = this.bigImageUrl; } })
    }

    //立刻将当前元素的src赋值给大图元素
    setNow() {
        if (bigImageFrame.style.display === "none") bigImageFrame.style.display = "flex";
        bigImageElement.src = this.oldSrc;
        // bigImageElement.src = this.node.src;
        bigImageElement.style.border = "3px white solid";
    }
}
IMGFetcher.extractBigImgUrl = /\<img\sid=\"img\"\ssrc=\"(.*)\"\sstyle/;

//奇怪的专门的图片请求器
IMGFetcher.weirdFetch = function (imgE, url, oldUrl) {
    return new Promise(function (resolve, reject) {
        imgE.setAttribute("importance", "high");//提高图片加载优先级
        imgE.onloadstart = function (event) { imgE.timeoutId = window.setTimeout(() => { imgE.onloadstart = null; imgE.onloadend = null; imgE.src = oldUrl; resolve({ flag: false }); }, 10000); };//10秒后直接请求失败，然后会重试2次
        imgE.onloadend = function (event) { window.clearTimeout(imgE.timeoutId); resolve({ flag: true }); };
        imgE.src = url;//将大图地址赋值给图片元素，如果图片加载完成后就会调用resolve函数，达到同步效果
    });
}

class IMGFetcherQueue extends Array {
    constructor() {
        super();
        //可执行队列
        this.executableQueue = [];
        //延迟器的id收集,用于清理不需要执行的延迟器
        this.tids = [];
        //当前的显示的大图的图片请求器所在的索引
        this.currIndex = 0;
    }

    do(start, step, oriented) {
        this[start].setNow(); this.currIndex = start;
        //清理上一次调用时还没有执行的延迟器setTimeout
        this.tids.forEach(id => window.clearTimeout(id)); this.tids = [];
        step = step || 1; oriented = oriented || "next";
        //把要执行获取器先放置到队列中，延迟执行
        this.executableQueue = [];
        for (let index = start; ((oriented === "next") && ((index < this.length) && (index < start + step)) || ((oriented === "prev") && ((index > -1) && (index > start - step)))); (oriented === "next") ? index++ : index--) {//丧心病狂
            this.executableQueue.push(index);
        }
        /* 100毫秒的延迟，在这100毫秒的时间里，可执行队列executableQueue可能随时都会变更，100毫秒过后，只执行最新的可执行队列executableQueue中的图片请求器
            在对大图元素使用滚轮事件的时候，由于速度非常快，大量的IMGFetcher图片请求器被添加到executableQueue队列中，如果调用这些图片请求器请求大图，可能会被认为是爬虫脚本
            因此会有一个时间上的延迟，在这段时间里，executableQueue中的IMGFetcher图片请求器会不断更替，100毫秒结束后，只调用最新的executableQueue中的IMGFetcher图片请求器。
        */
        let tid = window.setTimeout((queue, firstIndex) => { queue.forEach(imgFetcherIndex => this[imgFetcherIndex].set(firstIndex === imgFetcherIndex)) }, 300, this.executableQueue, start);
        this.tids.push(tid);//收集当前延迟器id,，如果本方法的下一次调用很快来临，而本次调用的延迟器还没有执行，则清理掉本次的延迟器
    }
}
//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//========================================创建一个全屏阅读元素============================================START
let fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");
fullViewPlane.style.display = "none";
document.body.appendChild(fullViewPlane);

//创建一个大图框架元素，追加到全屏阅读元素的第一个位置
let bigImageFrame = document.createElement("div");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.style.display = "none";
fullViewPlane.appendChild(bigImageFrame);
//大图框架图像容器，追加到大图框架里
let bigImageElement = document.createElement("img");
bigImageFrame.appendChild(bigImageElement);

//大图框架元素的滚轮事件
bigImageFrame.addEventListener("wheel", async (event) => {
    //确定导向
    let oriented = event.deltaY > 0 ? "next" : "prev", oldLength = IFQ.length, start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
    //是否达到最后一张或最前面的一张，如果是则判断是否还有上一页或者下一页需要加载，如果还有需要加载的页，则等待页加载完毕后再调用执行队列IFQ.do
    let flag = true;
    if (start < 0 || start > oldLength - 1) {//已经到达边界
        flag = await fetchStepPage(oriented);
        //如果IMGFetcherQueue扩容了，需要修复索引
        start = (oriented === "prev") ? (IFQ.length - oldLength) + start : start;
    }
    if (flag) IFQ.do(start, null, oriented);
})

//全屏阅读元素滚轮事件
fullViewPlane.addEventListener("wheel", (event) => {
    //对冒泡的处理
    if (event.target === bigImageFrame || event.target.parentElement === bigImageElement) return;
    //确定导向，向下滚动还是向上滚动
    let st = fullViewPlane.scrollTop, stm = fullViewPlane.scrollTopMax, oriented = (st === stm && st === 0) ? "prev.next" : (st === 0) ? "prev" : (st === stm) ? "next" : "stop";
    oriented.split(".").forEach(fetchStepPage);
});

//大图框架点击事件，点击后隐藏大图框架
bigImageFrame.addEventListener("click", (event) => { if (event.target.tagName === "IMG") return; bigImageFrame.style.display = "none"; })

//全屏阅览元素点击事件，点击空白处隐藏
fullViewPlane.addEventListener("click", (event) => { if (event.target === fullViewPlane) fullViewPlane.style.display = "none"; })
//========================================创建一个全屏阅读元素============================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//===============================================方法区=================================================START
//提取下一页或上一页的地址 > 获取该地址的文档对象模型 > 从文档对象模型中提取图片列表 > 将图片列表追加到全屏阅览元素以及图片获取器队列中

//图片获取器调用队列
const IFQ = new IMGFetcherQueue();

//通过地址请求该页的文档对象模型
const fetchSource = async function (href, oriented) {
    if (href === null || !oriented) return null;
    const response = await window.fetch(href);
    const text = await response.text();
    let ele = document.createElement("div"); ele.innerHTML = text;
    return stepPageSource[oriented] = ele;
}

//上一页，起始页，下一页的文档对象模型，上一页和下一页会随着滚动加载而变更
const stepPageSource = {
    "prev": document,
    "curr": document,
    "next": document
}

//线程锁，如果上一页或下一页正在获取中，则设置为false，即加锁。
const signal = {
    "prev": true,
    "next": true
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
    return stepE.firstElementChild.href;
}

//将该页的图片列表提取出来，然后追加到全屏阅读元素(fullViewPlane)上
const appendToFullViewPlane = function (source, oriented) {
    try {
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
            IFQ.do([].slice.call(fullViewPlane.childNodes).indexOf(event.target) - 1);
        }))
        return true;
    } catch (error) {
        console.log("从下一页或上一页中提取图片元素时出现了错误！");
        console.log(error);
        return false;
    }
}

//提取传入的文档对象模型的图片列表
const extractImageList = function (source) {
    return [].slice.call(source.querySelector("#gdt").childNodes)
        .filter(node => (node.nodeType === 1 && node.hasChildNodes()))
        .map(node => { let imgE = node.firstElementChild.firstElementChild.cloneNode(true); imgE.setAttribute("ahref", node.firstElementChild.href); return imgE; })
}

//整合函数区的方法，提取下一页或上一页的地址 > 获取该地址的文档对象模型 > 从文档对象模型中提取图片列表 > 将图片列表追加到全屏阅览元素以及图片获取器队列中
//   此方法，当全屏阅览元素滚动时会被调用，动态加载上一页或下一页
//   此方法，当大图被滚动到当前的第一张图或最后一张图时被调用，尝试获取上一页或下一页
const fetchStepPage = async function (oriented) {
    //如果本事件还没有完成，则停止执行其他事件
    if ((oriented === "stop") || !signal[oriented]) return false;
    //从当前已经存在的下一页或上一页文档中获取下下一页或上上一页的地址
    let _stepPageUrl = stepPageUrl(stepPageSource[oriented], oriented);
    //如果下下一页或上上一页的地址不存在，停止执行下去
    if (_stepPageUrl === null) return false;
    signal[oriented] = false;//加锁
    const source = await fetchSource(_stepPageUrl, oriented);//获取下下一页或上上一页的文档
    signal[oriented] = true;//解锁
    //如果没有获取到下下一页或上上一页的文档则停止继续执行
    if (source === null) return false;
    return appendToFullViewPlane(source, oriented);
}
//===============================================方法区=================================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//==================创建入口按钮，追加到tag面板的右侧=====================START
let showBTNRoot = document.querySelector("#gd5");
let tempContainer = document.createElement("div");
tempContainer.innerHTML = `<img src="https://t.halu.lu/t/12" style="width: 125px; height: 30px; border: 2px solid #481d4f;">`;
showBTNRoot.appendChild(tempContainer.firstElementChild);
showBTNRoot.lastElementChild.addEventListener("click", (event) => {
    fullViewPlane.style.display = "flex";
    appendToFullViewPlane(document, "next");
})
//======================================================================FIN