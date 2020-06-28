// ==UserScript==
// @name         E-HENTAI-VIEW-ENHANCE
// @namespace    https://github.com/kamo2020/eh-view-enhance
// @version      1.3.0
// @description  强化E绅士看图体验
// @author       kamo2020
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @icon         https://exhentai.org/favicon.ico
// @grant        GM.xmlHttpRequest
// ==/UserScript==

//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================START
class IMGFetcher {
    constructor(node) {
        this.node = node;
        this.pageUrl = node.getAttribute("ahref");
        this.smallImageUrl = node.src;
        //当前处理阶段，0: 什么也没做 1: 获取到大图地址 2: 完整的获取到大图
        this.stage = 0;
        this.tryTime = 0;
        this.lock = false;
    }

    async fetchImg(x) {
        switch (this.stage) {
            case 0://尝试获取大图地址
                try {
                    this.changeStyle("add");
                    await this.fetchBigImageUrl();
                    //成功获取到大图的地址后，将本图片获取器的状态修改为1，表示大图地址已经成功获取到
                    if (this.bigImageUrl) {
                        this.stage = 1;
                        return this.fetchImg(x);/* 少写一个return，花了我4小时调试一个奇怪的bug */
                    } else {
                        throw new Error("大图地址不存在！");
                    }
                } catch (error) {
                    this.stage = 0;//如果失败后，则将图片获取器的状态修改为0，表示从0开始
                    console.log("获取大图地址的时候出现了异常 => ", error);
                    return false;
                }
            case 1://理论上获取到大图地址，尝试使用weirdFetch获取大图数据
                try {
                    //使用奇怪的图片获取器来获取大图的数据
                    //如果成功获取到图片的内容，则将本图片获取器的状态修改为2，表示图片获取器的整体成功
                    if (await this.weirdFetch().then(fetchDone => fetchDone.flag)) {
                        this.stage = 2;
                        this.changeStyle("remove", "success");
                        return this.fetchImg(x);
                    } else {//如果失败了，则进行重试，重试会进行2次
                        ++this.tryTime; this.stage = 0;
                        if (this.tryTime > 2) {
                            this.changeStyle("remove", "failed");
                            return false;
                        }//重试2次后，直接失败，避免无限请求
                        this.changeStyle("remove", "retry");
                        return this.fetchImg(x);
                    }
                } catch (error) {
                    this.stage = 1;
                    console.log("在获取大图数据的时候出现了错误，一般来说不会出现这样的错误 => ", error);
                    return false;
                }
            case 2://大图已经加载完毕，已经走到这个IMGFetcher图片获取器的生命尽头，以后调用这个IMGFetcher图片获取器的时候，直接返回确认
                return true;
        }
    }

    set(index, x) {
        if (this.lock) return;
        this.lock = true;
        this.fetchImg(x).then(flag => {
            if (flag) {
                IFQ.report(index, this.blobUrl, this.node.offsetTop);
            } else {
                console.log("没有获取到图片，这期间一定发生了什么异常的事情！")
            }
            this.lock = false;
        })
    }

    //立刻将当前元素的src赋值给大图元素
    setNow(index) {
        if (this.stage === 2) {
            IFQ.report(index, this.blobUrl, this.node.offsetTop);
        } else {
            bigImageElement.src = this.smallImageUrl;
            bigImageElement.classList.add("fetching")
        }
        pageHelperHandler(1, index + 1);
    }
    //获取大图地址
    async fetchBigImageUrl() {
        //使用fetch获取该缩略图所指向的大图页面
        let text = await window.fetch(this.pageUrl).then(response => response.text());
        if (conf["fetchOriginal"]) {//抽取最佳质量的图片的地址
            this.bigImageUrl = IMGFetcher.extractUrl["original"].exec(text)[1].replace(/&amp;/g, "&");
        } else if (this.tryTime === 0) {//抽取正常的有压缩的大图地址
            this.bigImageUrl = IMGFetcher.extractUrl["normal"].exec(text)[1];
        } else {//如果是重试状态,则进行换源 todo 异常处理
            let nlValue = IMGFetcher.extractUrl["nlValue"].exec(text)[1];
            this.pageUrl += ((this.pageUrl + '').indexOf('?') > -1 ? '&' : '?') + 'nl=' + nlValue;
            text = await window.fetch(this.pageUrl).then(response => response.text());
            //从大图页面中提取大图的地址
            this.bigImageUrl = IMGFetcher.extractUrl["normal"].exec(text)[1];
        }
    }

    changeStyle(action, success) {
        if (action === "remove") {
            //当获取到内容，或者获取失败，则移除本缩略图的边框效果
            this.node.classList.remove("fetching");
        } else if (action === "add") {
            //给当前缩略图元素添加一个获取中的边框样式
            this.node.classList.add("fetching");
        }
        if (success === "success") {
            this.node.style.border = "3px #602a5c solid";
        } else if (success === "failed") {
            this.node.style.border = "3px red solid";
        } else if (success === "retry") {
            this.node.style.border = "3px white solid";
        }
    }

    weirdFetch() {
        const imgFetcher = this;
        return new Promise(function (resolve, reject) {
            imgFetcher.xhr = GM.xmlHttpRequest({
                method: "GET",
                url: imgFetcher.bigImageUrl,
                responseType: "blob",
                timeout: conf["timeout"],
                headers: { 'Referer': imgFetcher.pageUrl, 'X-Alt-Referer': imgFetcher.pageUrl },
                onprogress: function (response) {
                    // console.log("onprogress", response);
                    //todo 速度展示
                },
                onload: function (response) {
                    // console.log("onload", response);//打印会造成性能低下
                    let data = response.response;
                    if (!(data instanceof Blob)) throw new Error("未下载到有效的数据！");

                    imgFetcher.blobData = data;
                    imgFetcher.blobUrl = URL.createObjectURL(data);
                    imgFetcher.node.src = imgFetcher.blobUrl;

                    resolve({ flag: true });
                },
                onerror: function (response) {
                    // console.log("onerror", response);
                    resolve({ flag: false });
                }
            })
        });
    }
}

IMGFetcher.extractUrl = {
    normal: /\<img\sid=\"img\"\ssrc=\"(.*)\"\sstyle/,
    original: /\<a\shref=\"(http[s]?:\/\/e[x-]?hentai\.org\/fullimg\.php\?[^"\\]*)\"\>/,
    nlValue: /\<a\shref=\"\#\"\sid=\"loadfail\"\sonclick=\"return\snl\(\'(.*)\'\)\"\>/
};

class IMGFetcherQueue extends Array {
    constructor() {
        super();
        //可执行队列
        this.executableQueue = [];
        //延迟器的id收集,用于清理不需要执行的延迟器
        this.tids = [];
        //当前的显示的大图的图片请求器所在的索引
        this.currIndex = 0;
        //触发边界后的加载锁
        this.edgeLock = false;
        //扩容后需要修复索引
        this.neexFixIndex = false;
        //旧长度记录
        this.oldLength = this.length;
    }

    do(start, oriented) {
        oriented = oriented || "next";
        this.currIndex = this.fixIndex(start, oriented);

        //立即中止空闲加载器
        idleLoader.abort(this.currIndex);

        this[this.currIndex].setNow(this.currIndex);

        //从当前索引开始往后,放入指定数量的图片获取器,如果该图片获取器已经获取完成则向后延伸.
        //如果最后放入的数量为0,说明已经没有可以继续执行的图片获取器,可能意味着后面所有的图片都已经加载完毕,也可能意味着中间出现了什么错误
        if (!this.pushExecQueue(oriented)) return;

        /* 100毫秒的延迟，在这100毫秒的时间里，可执行队列executableQueue可能随时都会变更，100毫秒过后，只执行最新的可执行队列executableQueue中的图片请求器
            在对大图元素使用滚轮事件的时候，由于速度非常快，大量的IMGFetcher图片请求器被添加到executableQueue队列中，如果调用这些图片请求器请求大图，可能会被认为是爬虫脚本
            因此会有一个时间上的延迟，在这段时间里，executableQueue中的IMGFetcher图片请求器会不断更替，100毫秒结束后，只调用最新的executableQueue中的IMGFetcher图片请求器。
        */
        let tid = window.setTimeout(() => { this.executableQueue.forEach(imgFetcherIndex => this[imgFetcherIndex].set(imgFetcherIndex)) }, 300);
        this.tids.push(tid);//收集当前延迟器id,，如果本方法的下一次调用很快来临，而本次调用的延迟器还没有执行，则清理掉本次的延迟器

        //是否达到最后一张或最前面的一张，如果是则判断是否还有上一页或者下一页需要加载
        this.needExpansion(this.executableQueue[this.executableQueue.length - 1], oriented);
    }

    //等待图片获取器执行成功后的上报，如果该图片获取器上报自身所在的索引和执行队列的currIndex一致，则改变大图
    report(index, imgSrc, offsetTop) {
        if (index !== this.currIndex) return;
        if (!conf.keepScale) {//是否保留缩放
            bigImageElement.style.height = "100%";
            bigImageElement.style.top = "0px";
        }
        bigImageElement.classList.remove("fetching");
        bigImageElement.src = imgSrc;
        let scrollTo = offsetTop - (window.screen.availHeight / 3);
        scrollTo = scrollTo <= 0 ? 0 : scrollTo >= fullViewPlane.scrollHeight ? fullViewPlane.scrollHeight : scrollTo;
        fullViewPlane.scrollTo({ top: scrollTo, behavior: "smooth" })
    }

    //是否达到最后一张或最前面的一张，如果是则判断是否还有上一页或者下一页需要加载
    needExpansion(last, oriented) {
        if (this.edgeLock) return;
        last = oriented === "next" ? last + 1 : oriented === "prev" ? last - 1 : 0;
        if (last < 0 || last > this.length - 1) {
            this.edgeLock = true;
            this.oldLength = this.length;
            fetchStepPage(oriented).then(done => {
                if (done) {
                    this.edgeLock = false;
                    this.neexFixIndex = true;
                } else {
                    window.setTimeout(() => { this.edgeLock = false }, 2000);
                }
            });
        }
    }
    //修正索引
    fixIndex(start, oriented) {
        //如果开始的索引小于0,则修正索引为0,如果开始的索引超过队列的长度,则修正索引为队列的最后一位
        start = start < 0 ? 0 : start > this.length - 1 ? this.length - 1 : start;
        //是否需要修正索引,当队列被拓展后neexFixIndex被启用,此时需要根据导向和拓展的数量来修正到正确的下一张图的索引
        if (this.neexFixIndex) {
            start = oriented === "prev" ? this.length - this.oldLength + start : start;
            this.neexFixIndex = false;
        }
        return start;
    }

    pushExecQueue(oriented) {
        //清理上一次调用时还没有执行的延迟器setTimeout
        this.tids.forEach(id => window.clearTimeout(id)); this.tids = [];

        //把要执行获取器先放置到队列中，延迟执行
        this.executableQueue = [];
        for (let count = 0, index = this.currIndex; this.pushExecQueueSlave(index, oriented, count); (oriented === "next") ? ++index : --index) {
            if (this[index].stage === 2) continue;
            this.executableQueue.push(index);
            count++;
        }
        return this.executableQueue.length > 0;
    }

    pushExecQueueSlave(index, oriented, count) {
        return (
            (
                ((oriented === "next") && (index < this.length))
                ||
                ((oriented === "prev") && (index > -1))
            )
            &&
            (
                count < conf["threads"]
            )
        );//丧心病
    }

    findIndex(node) {
        for (let index = 0; index < this.length; index++) {
            if (this[index] instanceof IMGFetcher && this[index].node === node) {
                return index;
            }
        }
        return 0;
    }
}

//空闲自加载
class IdleLoader {
    constructor(IFQ, PF) {
        //图片获取器队列
        this.queue = IFQ;
        //页获取器
        this.PF = PF;
        //当前处理
        this.currIndex = 0;
        //是否终止
        this.abort_ = false;
        //已完成
        this.finishedIF = [];
        //递归次数，防止无限递归
        this.recuTimes = 0;
        //中止后的用于重新启动的延迟器的id
        this.restartId;
    }
    async start(index) {
        index && (this.currIndex = index);
        //如果被中止了，则停止
        if (this.abort_ || !conf["autoLoad"]) return;

        //如果所有的图片都加载完毕，则停止
        if (this.finishedIF.length === this.queue.length) return (this.abort_ = true);

        //如果该当前索引的图片获取器已经存在于已完成列表里则直接递归到下一个索引
        if (this.finishedIF.indexOf(this.currIndex) > -1) return this.start(++this.currIndex);

        //如果索引到达了队列最后，则检测是否还有下一页
        if (this.currIndex > this.queue.length - 1) {
            let fetchDone = await this.PF.appendStepPage("next");
            fetchDone || (this.currIndex = 0);
        }
        //如果索引是0，则检测是否还有上一页
        if (this.currIndex === 0) {
            let fetchDone = await this.PF.appendStepPage("prev");
            fetchDone && (this.currIndex = 0);
        }
        //通过当前的索引获取队列中的图片获取器IMGFetcher,然后调用器获取图片的方法,在获取的过程中进行加锁
        let imgFetcher = this.queue[this.currIndex];
        if (!imgFetcher.lock && (imgFetcher.lock = true)) {
            const flag = await imgFetcher.fetchImg().then(flag => (imgFetcher.lock = false) || flag);
            (flag && imgFetcher.stage === 2) && this.finishedIF.push(this.currIndex);

        }
        //当前要处理的图片获取器被锁住了，可能正在获取图片中，则停止自动获取，5s后再次执行
        else if (imgFetcher.lock || this.recuTimes > 1000) {
            this.recuTimes = 0;
            return window.setTimeout(() => this.start(this.currIndex), 5000);
        }

        this.recuTimes++;
        this.timeOut().then(() => this.start(++this.currIndex));
    }

    async timeOut() {
        return new Promise(function (resolve, reject) {
            const time = Math.floor((Math.random() * 1500) + 500);
            window.setTimeout(() => resolve(), time);
        });
    }

    abort(newStart) {
        if (!conf.autoLoad) return;
        this.abort_ = true;
        window.clearTimeout(this.restartId);
        //8s后重新开启，todo 但这里可能会出现小概率的双线程危机
        this.restartId = window.setTimeout(() => { this.abort_ = false; this.start(newStart); }, conf["restartIdleLoader"]);
    }
}

//页获取器，可获取下一个列表页，以及下一个图片页
class PageFetcher {
    constructor(IFQ) {
        this.queue = IFQ;
        //文档对象模型的引用，当前页的文档对象、下一个、上一个列表页的文档对象模型。
        this.stepSource = { "prev": document, "next": document };
        //是否正在获取上一页或者下一页中
        this.fetching = { "prev": false, "next": false };
        //第一页或者最后一页是否获取完毕
        this.fetched = { "prev": false, "next": false };
        //上一页或下一页的地址
        this.stepUrl = { "prev": null, "next": null };
        //每页的图片获取器列表，用于实现懒加载
        this.imgAppends = { "prev": [], "next": [] };
    }

    //加载当前页的图片元素到全屏阅览元素和图片获取器队列中
    appendDefaultPage() {
        let imageList = this.extractImageList(document);
        let IFs = imageList.map(img => new IMGFetcher(img));
        fullViewPlane.firstElementChild.nextElementSibling.after(...imageList);
        imageList.forEach(e => e.addEventListener("click", showBigImageEvent));
        this.queue.push(...IFs);

        if (conf["autoLoadPage"]) {//自动加载所有页
            ["prev", "next"].forEach(oriented => window.setTimeout(() => this.autoLoadPage(oriented), 0));
        }
    }

    //加载上一页或下一页
    async appendStepPage(oriented) {
        //弹出该方向的第一个元素，该元素是一个函数，用来将图片列表追加到全屏阅览元素中
        let excutor = this.imgAppends[oriented].shift();

        if (excutor) { excutor(); return true; }

        if (this.fetched[oriented]) return true;

        let fetchDone = await this.fetchStepPage(oriented);

        if (fetchDone) return this.appendStepPage(oriented);

        return false;
    }

    //通过该页的内容获取下一页或上一页的地址 oriented : prev/next
    stepPageUrl(oriented) {
        let e1 = this.stepSource[oriented].querySelector("table.ptb td.ptds"), e2;

        if (!e1) throw new Error("无法获取页码指示器元素！");

        switch (oriented) {
            case "prev": e2 = e1.previousElementSibling;
                if (!e2 || e2.textContent === "<") {
                    this.fetched[oriented] = true;
                    pageHelperHandler(0, "O");
                    return null;
                };
                break;
            case "next": e2 = e1.nextElementSibling;
                if (!e2 || e2.textContent === ">") {
                    this.fetched[oriented] = true;
                    pageHelperHandler(3, "O");
                    return null;
                };
                break;
        }
        //上一页或下一页的地址
        return this.stepUrl[oriented] = e2.firstElementChild.href;
    }

    //将该页的图片列表提取出来，然后追加到全屏阅读元素(fullViewPlane)上
    appendImgList(oriented) {
        try {
            //从该页的文档中将图片列表提取出来
            let imageList = this.extractImageList(this.stepSource[oriented]);
            //每一个图片生成一个对应的图片获取器
            let IFs = imageList.map(img => new IMGFetcher(img));

            switch (oriented) {
                case "prev":
                    this.imgAppends["prev"]
                        .push(() => {
                            fullViewPlane.firstElementChild.nextElementSibling.after(...imageList);
                            imageList.forEach(e => e.addEventListener("click", showBigImageEvent));
                        });

                    this.queue.unshift(...IFs);
                    this.queue.neexFixIndex = true;
                    break;
                case "next":
                    this.imgAppends["next"]
                        .push(() => {
                            fullViewPlane.lastElementChild.after(...imageList);
                            imageList.forEach(e => e.addEventListener("click", showBigImageEvent));
                        });
                    this.queue.push(...IFs);
                    this.queue.neexFixIndex = true;
                    break;
            }

            pageHelperHandler(2, this.queue.length);
            return true;
        } catch (error) {
            console.log("从下一页或上一页中提取图片元素时出现了错误！");
            console.log(error);
            return false;
        }
    }

    //提取传入的文档对象模型的图片列表
    extractImageList(source) {
        return [].slice.call(source.querySelector("#gdt").childNodes)
            .filter(node => (node.nodeType === 1 && node.hasChildNodes()))
            .map(node => {
                let imgE = node.firstElementChild.firstElementChild.cloneNode(true);
                imgE.loading = "lazy";
                imgE.setAttribute("ahref", node.firstElementChild.href);
                return imgE;
            })
    }

    //通过地址请求该页的文档对象模型
    async fetchSource(oriented) {
        if (!this.stepUrl[oriented]) throw new Error("无效的方向或无效的下一页或上一页地址");

        const text = await window.fetch(this.stepUrl[oriented]).then(response => response.text());

        let ele = document.createElement("div"); ele.innerHTML = text;

        this.stepSource[oriented] = ele;
    }

    //提取下一页或上一页的地址 > 获取该地址的文档对象模型 > 从文档对象模型中提取图片列表 > 将图片列表追加到全屏阅览元素以及图片获取器队列中
    async fetchStepPage(oriented) {
        //如果该方向的图片列表页全部加载完毕，则直接返回false
        //如果本事件还没有完成，则停止执行接下来的事件
        if (this.fetched[oriented] || this.fetching[oriented]) return false;

        //从当前已经存在的下一页或上一页文档中获取下下一页或上上一页的地址
        if (!this.stepPageUrl(oriented)) return false;

        //获取下一页或上上一页的文档
        this.fetching[oriented] = true;//加锁
        await this.fetchSource(oriented);
        this.fetching[oriented] = false;//解锁

        return this.appendImgList(oriented);
    }

    //自动加载该方向的所有页
    async autoLoadPage(oriented) {
        let flag = await this.fetchStepPage(oriented);
        if (flag) return this.autoLoadPage(oriented);
    }
}
//==================面向对象，图片获取器IMGFetcher，图片获取器调用队列IMGFetcherQueue=====================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//===============================================配置管理器=================================================START
const signal = { "first": true };

let conf = JSON.parse(window.localStorage.getItem("cfg_"));
//获取宽度
const screenWidth = window.screen.availWidth;

if (!conf || conf.version !== "1.3.0") {//如果配置不存在则初始化一个
    let rowCount = screenWidth > 2500 ? 9 : screenWidth > 1900 ? 7 : 5;
    conf = {
        backgroundImage: `data:image/png;base64,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`,
        gateBackgroundImage: `https://tvax3.sinaimg.cn/mw690/6762c771gy1gcv2eydei3g20f00l7e87.gif`,
        rowCount: rowCount,//每行显示的数量
        followMouse: true,//大图是否跟随鼠标
        keepScale: false,//是否保留缩放
        autoLoad: true,//是否启用空闲加载器
        fetchOriginal: false,//是否获取最佳质量的图片
        restartIdleLoader: 8000,//中止空闲加载器后的重新启动时间
        threads: 3,//同时加载的图片数量
        autoLoadPage: true,//是否自动加载所有页
        timeout: 8000,//超时时间，默认8秒
        version: "1.3.0",
        first: true
    }
    window.localStorage.setItem("cfg_", JSON.stringify(conf));
}

const modCFG = function (k, v) {
    conf[k] = v;
    window.localStorage.setItem("cfg_", JSON.stringify(conf));
    updateEvent(k, v);
}

const updateEvent = function (k, v) {
    switch (k) {
        case "backgroundImage": {
            let css_ = [].slice.call(styleSheel.sheet.rules).filter(rule => rule.selectorText === ".fullViewPlane")[0];
            css_.style.backgroundImage = `url(${v})`;
            break;
        }
        case "rowCount": {
            let percent = (100 - (((v * 22) / window.screen.availWidth) * 100)) / v;
            percent = Math.floor(percent * 10) / 10;
            let css_ = [].slice.call(styleSheel.sheet.rules).filter(rule => rule.selectorText === ".fullViewPlane > img:not(.bigImageFrame)")[0];
            // css_.style.flexBasis = percent + "%";
            css_.style.width = percent + "%";
            break;
        }
        case "followMouse": {
            if (v) {
                bigImageFrame.addEventListener("mousemove", followMouseEvent);
            } else {
                bigImageFrame.removeEventListener("mousemove", followMouseEvent);
            }
            break;
        }
        case "pageHelper": {
            pageHelperHandler(0, "edge", "class");
            pageHelperHandler(1, "currPage", "class");
            pageHelperHandler(2, "totalPage", "class");
            pageHelperHandler(3, "edge", "class");
            pageHelperHandler(1, IFQ.currIndex + 1);
            pageHelperHandler(2, IFQ.length);
            break;
        }
        case "showGuide": {
            if (conf.first) {
                showGuideEvent();
                modCFG("first", false);
            }
            break;
        }
    }
}
//===============================================配置管理器=================================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//===============================================方法区=================================================START
//图片获取器调用队列
const IFQ = new IMGFetcherQueue();
//页加载器
const PF = new PageFetcher(IFQ);
//空闲自加载器
const idleLoader = new IdleLoader(IFQ, PF);

//向配置面板增加配置项
const createChild = function (type, parent, innerHTML) {
    let childElement = document.createElement(type);
    parent.appendChild(childElement);
    childElement.innerHTML = innerHTML;
    return childElement;
}
//===============================================方法区=================================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//========================================事件库============================================START
//点击入口按钮事件
const gateEvent = function (event) {
    fullViewPlane.classList.remove("retract_full_view");
    if (signal["first"]) {
        PF.appendDefaultPage();

        idleLoader.start(0);

        signal["first"] = false;
    }
}
//全屏阅览元素的滚轮事件
const wheelEvent = function (event) {
    //对冒泡的处理
    if (event.target === bigImageFrame || event.target === bigImageElement || [].slice.call(bigImageFrame.childNodes).indexOf(event.target) > 0) return;
    //确定导向，向下滚动还是向上滚动
    let st = Math.ceil(fullViewPlane.scrollTop),
        stm = fullViewPlane.scrollHeight - fullViewPlane.offsetHeight,
        oriented = (st === stm && st === 0) ? "prev.next" : (st === 0) ? "prev" : (st >= stm) ? "next" : "stop";
    if (oriented === "stop") return;
    oriented.split(".").forEach(orie => PF.appendStepPage(orie));
}
//大图框架点击事件，点击后隐藏大图框架
const hiddenBigImageEvent = function (event) {
    if (event.target.tagName === "SPAN") return;
    bigImageFrame.classList.add("retract");
    window.setTimeout(() => {
        // fragment.appendChild(bigImageFrame.firstElementChild);
        bigImageElement.hidden = true;
        pageHelper.hidden = true;
    }, 700);
}

//大图框架元素的滚轮事件/按下鼠标右键滚动则是缩放/直接滚动则是切换到下一张或上一张
const bigImageWheelEvent = function (event) {
    if (event.buttons === 2) {
        scaleImageEvent(event);
    } else {
        stepImageEvent(event);
    }
}
//大图框架添加鼠标移动事件，该事件会将让大图跟随鼠标左右移动
const followMouseEvent = function (event) {
    if (bigImageFrame.moveEventLock) return;
    bigImageFrame.moveEventLock = true;
    window.setTimeout(() => { bigImageFrame.moveEventLock = false; }, 20)
    bigImageElement.style.left = `${event.clientX - (window.screen.availWidth / 2)}px`;
}
//点击缩略图后展示大图元素的事件
const showBigImageEvent = function (event) {
    //展开大图阅览元素
    bigImageFrame.classList.remove("retract");
    // bigImageFrame.appendChild(fragment.firstElementChild);
    bigImageElement.hidden = false;
    pageHelper.hidden = false;
    //获取该元素所在的索引，并执行该索引位置的图片获取器，来获取大图
    IFQ.do(IFQ.findIndex(event.target));
}
//修正图片top位置
const fixImageTop = function (mouseY, isScale) {
    //垂直轴中心锚点，用来计算鼠标距离垂直中心点的距离，值是一个正负数
    const vertAnchor = bigImageFrame.offsetHeight >> 1;
    //大图和父元素的高度差，用来修正图片的top值，让图片即使放大后也垂直居中在父元素上
    const diffHeight = bigImageElement.offsetHeight - bigImageFrame.offsetHeight - 3;
    //如果高度差为0，说明图片没缩放，不做处理
    if (diffHeight === 0 && !isScale) return;
    // 鼠标距离垂直中心的距离，正负值
    const dist = mouseY - vertAnchor;
    /* 移动比率，根据这个来决定imgE的top位置
     1.6是一个比率放大因子，
        比如鼠标向上移动时，移动到一定的距离就能看到图片的底部了，
                          而不是鼠标移动到浏览器的顶部才能看到图片底部 */
    const rate = Math.round((dist / vertAnchor * 1.6) * 100) / 100;
    //如果移动比率到达1或者-1，说明图片到低或到顶，停止继续移动
    if ((rate > 1 || rate < -1) && !isScale) return;
    //根据移动比率和高度差的1/2来计算需要移动的距离
    const topMove = Math.round((diffHeight >> 1) * rate);
    /* -(diffHeight >> 1) 修正图片位置基准，让放大的图片也垂直居中在父元素上 */
    bigImageElement.style.top = -(diffHeight >> 1) + topMove + "px";
}
//缩放图片事件
const scaleImageEvent = function (event) {
    //获取图片的高度, 值是百分比
    let height = bigImageElement.style.height || "100%";
    if (event.deltaY < 0) {//放大
        height = parseInt(height) + 15 + "%";
    } else {//缩小
        height = parseInt(height) - 15 + "%";
    }
    if (parseInt(height) < 100 || parseInt(height) > 200) return;
    bigImageElement.style.height = height;
    //最后对图片top进行修正
    fixImageTop(event.clientY, true);
}

//滚动加载上一张或下一张事件
const stepImageEvent = function (event) {
    //确定导向
    const oriented = event.deltaY > 0 ? "next" : "prev";
    //下一张索引
    const start = oriented === "next" ? IFQ.currIndex + 1 : oriented === "prev" ? IFQ.currIndex - 1 : 0;
    //是否达到最后一张或最前面的一张，如果是则判断是否还有上一页或者下一页需要加载，如果还有需要加载的页，则等待页加载完毕后再调用执行队列IFQ.do
    IFQ.do(start, oriented);
}
//点击配置面板两侧的箭头滚动内容
const scrollToArrow = function (event) {
    let direction = event.target.getAttribute("direction");
    if (!direction) return;
    switch (direction) {
        case "left":
            configPlane.scrollTo({
                left: configPlane.scrollLeft - (screenWidth / 2),
                behavior: "smooth"
            });
            break;
        case "rigth":
            configPlane.scrollTo({
                left: configPlane.scrollLeft + (screenWidth / 2),
                behavior: "smooth"
            });
            break;
    }
}
//修改配置时的布尔值类型的事件
const boolElementEvent = function (event) {
    event.target.blur();//让该输入框元素立即失去焦点
    let val = event.target.value;
    if (val === "✓") {
        event.target.value = "X";
        modCFG(event.target.getAttribute("confKey"), false);
    } else {
        event.target.value = "✓";
        modCFG(event.target.getAttribute("confKey"), true);
    }
}
//修改配置时的输入型类型事件
const inputElementEvent = function (event) {
    let val = event.target.previousElementSibling.value;
    if (val) {
        modCFG(event.target.previousElementSibling.getAttribute("confKey"), val);
    } else {
        alert("请输入有效的网络图片地址！");
    }
}
//页码指示器通用修改事件
const pageHelperHandler = function (index, value, type) {
    const node = [].filter.call(pageHelper.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE)[index];
    if (type === "class") {
        node.classList.add(value);
    } else {
        node.textContent = value;
    }
}
//修改每行数量事件的添加
const modRowEvent = function () {
    [].slice.call(modRowCount.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE).forEach((node, index) => {
        switch (index) {
            case 1:
            case 3: {
                node.addEventListener("click", (event) => {
                    if (event.target.textContent === "-") {
                        let val = event.target.nextElementSibling.value;
                        event.target.nextElementSibling.value = parseInt(val) - 1;
                        modCFG("rowCount", parseInt(val) - 1);
                    }
                    if (event.target.textContent === "+") {
                        let val = event.target.previousElementSibling.value;
                        event.target.previousElementSibling.value = parseInt(val) + 1;
                        modCFG("rowCount", parseInt(val) + 1);
                    }
                });
                break;
            }
            case 2: {
                node.addEventListener("input", (event) => {
                    let val = event.target.value || "7";
                    modCFG("rowCount", parseInt(val))
                });
                break;
            }
        }
    })
}
//显示简易指南事件
const showGuideEvent = function (event) {
    let guideFull = document.createElement("div");
    document.body.appendChild(guideFull);
    guideFull.innerHTML = `<img src="https://tvax3.sinaimg.cn/mw690/6762c771gy1gd1wqc5j1vj20r70eytcd.jpg" style="margin-top: 200px;border: 10px #4e72b7 solid;">`;
    guideFull.style = `position: absolute;width: 100%;height: 100%;background-color: #363c3c78;z-index: 2004;top: 0;`;
    guideFull.addEventListener("click", () => guideFull.remove());
}
//========================================事件库============================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//==================创建入口按钮，追加到tag面板的右侧=====================START
let showBTNRoot = document.querySelector("#gd5");
let tempContainer = document.createElement("div");

//判断是否是Large模式，这样缩略图也算能看
if (document.querySelector("div.ths:nth-child(2)") === null) {
    tempContainer.innerHTML = `<p class="g2"><img src="https://exhentai.org/img/mr.gif"> <a id="renamelink" href="${window.location.href}?inline_set=ts_l">请切换至Large模式</a></p>`;
    showBTNRoot.appendChild(tempContainer.firstElementChild);
} else {
    tempContainer.innerHTML = `<img src="${conf.gateBackgroundImage}" referrerpolicy="no-referrer" style="width: 125px; height: 30px;">`;
    showBTNRoot.appendChild(tempContainer.firstElementChild);
    showBTNRoot.lastElementChild.addEventListener("click", gateEvent)
}
//==================创建入口按钮，追加到tag面板的右侧=====================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//========================================创建一个全屏阅读元素============================================START
let fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");
fullViewPlane.classList.add("retract_full_view");
document.body.appendChild(fullViewPlane);

//创建一个配置面板，追加到全屏阅读元素的第一个位置
let configPlane = document.createElement("div");
configPlane.classList.add("configPlane");
fullViewPlane.appendChild(configPlane);

//向前滚动
let scrollToLeft = document.createElement("div");
configPlane.appendChild(scrollToLeft);
scrollToLeft.classList.add("scrollArrow");
scrollToLeft.classList.add("l");
scrollToLeft.addEventListener("click", scrollToArrow)
scrollToLeft.setAttribute("direction", "left");

//向前滚动
let scrollToRigth = document.createElement("div");
configPlane.appendChild(scrollToRigth);
scrollToRigth.classList.add("scrollArrow");
scrollToRigth.classList.add("r");
scrollToRigth.addEventListener("click", scrollToArrow)
scrollToRigth.setAttribute("direction", "rigth");

//修改背景图片
let modBGElement = createChild("div", configPlane, `<span>修改背景图 : </span><input type="text" placeholder="网络图片" style="width: 200px;" confKey="backgroundImage"><button>确认</button>`);
modBGElement.lastElementChild.addEventListener("click", inputElementEvent);

//修改入口图片
let modGateBGElement = createChild("div", configPlane, `<span>修改入口图 : </span><input type="text" placeholder="网络图片" style="width: 200px;" confKey="gateBackgroundImage"><button>确认</button>`);
modGateBGElement.lastElementChild.addEventListener("click", inputElementEvent);

//每行显示数量
let modRowCount = createChild("div", configPlane, `<span>每行数量 : </span><button>-</button><input type="text" style="width: 20px;" value="${conf.rowCount}"><button>+</button>`);
modRowEvent();

//获取最佳质量图片
let fetchOriginal = createChild("div", configPlane, `<span>最佳质量图片 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="fetchOriginal"  value="${conf.fetchOriginal ? "✓" : "X"}" type="text"><button style="cursor: not-allowed;">装饰</button>`);
fetchOriginal.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//大图是否跟随鼠标
let modfollowMouse = createChild("div", configPlane, `<span>大图跟随鼠标 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="followMouse"  value="${conf.followMouse ? "✓" : "X"}" type="text"><button style="cursor: not-allowed;">装饰</button>`);
modfollowMouse.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//下一张是否保留图片放大
let keepImageScale = createChild("div", configPlane, `<span>保留缩放 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="keepScale" value="${conf.keepScale ? "✓" : "X"}" type="text"><button style="cursor: not-allowed;">装饰</button>`);
keepImageScale.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//是否自动加载
let autoLoad = createChild("div", configPlane, `<span>自动加载 : </span><input style="width: 10px; cursor: pointer; font-weight: bold; padding-left: 3px;" confKey="autoLoad"  value="${conf.autoLoad ? "✓" : "X"}" type="text"><button style="cursor: not-allowed;">装饰</button>`);;
autoLoad.lastElementChild.previousElementSibling.addEventListener("click", boolElementEvent);

//显示指南
let showGuide = createChild("div", configPlane, `<span>指南 : </span><button>打开</button>`);
showGuide.style = "margin-right: 40px;"
showGuide.lastElementChild.addEventListener("click", showGuideEvent);

//创建一个大图框架元素，追加到全屏阅读元素的第二个位置
let bigImageFrame = document.createElement("div");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.classList.add("retract");
fullViewPlane.appendChild(bigImageFrame);

//大图框架图像容器，追加到大图框架里
let fragment = document.createDocumentFragment();
let bigImageElement = document.createElement("img");
let pageHelper = document.createElement("div");
bigImageFrame.appendChild(bigImageElement);
bigImageFrame.appendChild(pageHelper);

pageHelper.classList.add("pageHelper");
pageHelper.innerHTML = `<span>...</span><span>${IFQ.currIndex}</span>/<span>${IFQ.length}</span><span>...</span>`;
pageHelper.hidden = true;
bigImageElement.hidden = true;


//全屏阅读元素滚轮事件
fullViewPlane.addEventListener("wheel", wheelEvent);

//全屏阅览元素点击事件，点击空白处隐藏
fullViewPlane.addEventListener("click", (event) => { if (event.target === fullViewPlane) { fullViewPlane.classList.add("retract_full_view"); }; });

//取消在大图框架元素上的右键事件
bigImageFrame.addEventListener("contextmenu", (event) => { event.preventDefault(); });

//大图框架点击事件，点击后隐藏大图框架
bigImageFrame.addEventListener("click", hiddenBigImageEvent);

//大图框架元素的滚轮事件
bigImageFrame.addEventListener("wheel", bigImageWheelEvent);

//大图放大后鼠标移动事件
bigImageFrame.addEventListener("mousemove", (event) => { fixImageTop(event.clientY, false); })

//========================================创建一个全屏阅读元素============================================FIN



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//=========================================创建样式表==================================================START
let styleSheel = document.createElement("style");
styleSheel.textContent =
    `.fullViewPlane{width:100%;height:100%;background-color:#000;position:fixed;top:0;right:0;z-index:1000;overflow:hidden scroll;transition:height .4s;display:flex;flex-wrap:wrap;scrollbar-width:thin!important}.fullViewPlane>img:not(.bigImageFrame){margin:20px 0 0 20px;border:3px white solid;box-sizing:border-box;align-self:start}.retract_full_view{height:0;transition:height .4s}.configPlane{height:30px;width:100%;background-color:#1e1c1c;margin:20px 20px 0;overflow:scroll hidden;white-space:nowrap;scrollbar-width:none!important;padding:0 35px}.configPlane>div:not(.scrollArrow){display:inline-block;background-color:#00ffff3d;border:1px solid black;margin:0 5px;box-sizing:border-box;height:30px;padding:0 5px}.configPlane>div>span{line-height:20px;color:black;font-size:15px;font-weight:bolder}.configPlane>div>input{border:2px solid black;border-radius:0;margin-top:0!important;vertical-align:bottom}.configPlane>div>button{height:25px;border:2px solid black;background-color:#383940;margin-top:1px;box-sizing:border-box;color:white}.bigImageFrame{position:fixed;width:100%;height:100%;right:0;z-index:1001;background-color:#000000d6;justify-content:center;transition:width .4s}.bigImageFrame>img{height:100%;border:3px #602a5c solid;position:relative}.bigImageFrame>.pageHelper{position:absolute;right:100px;bottom:40px;background-color:#1e1c1c;z-index:1003;font-size:22px}.bigImageFrame>.pageHelper>.edge{background-color:#00ffff3d}.bigImageFrame>.pageHelper>.edgeFIN{background-color:green}.bigImageFrame>.pageHelper>.totalPage{font-size:17px}.bigImageFrame>.pageHelper>.currPage{color:orange}.fetching{padding:2px;border:none!important;animation:1s linear infinite cco;-webkit-animation:1s linear infinite cco}@keyframes cco{0%{background-color:#f00}50%{background-color:#48ff00}100%{background-color:#ae00ff}}.retract{width:0;transition:width .7s}.closeBTN{width:100%;height:100%;background-color:#0000;color:#f45b8d;font-size:30px;font-weight:bold;border:4px #f45b8d solid;border-bottom-left-radius:60px}.closeBTN>span{position:fixed;right:11px;top:0}.scrollArrow{width:30px;height:30px;position:absolute;display:inline-block;z-index:1000;background-size:contain;background-color:#214e4e}.scrollArrow.l{left:20px;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAFRUlEQVR4nO3dT4hVZRjH8W8E4Xi7iUwugjLGhYs2RYtBCvKUg/sWFQRSLYJyVZuibdCuP2Q1o45CEEQk1cKglkowbWJqjITILEWDRIKgBtpYi5MR1ztzR+4593nP+34/8Nvf8/B7eOZ6nbkgSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZKk/9wK7AR2AbPADNALfUVSkB3AM8BBYAX4e51cBk4CbwOPRLxYaRK2AvuBJdZfiFH5E3gXqCb54qU2vQisMt5iDMs3wL4JPofUqPuA72h+MQazQv2+ReqEKeAA7S/GYOYn8XDSOO4HfmLyy3E1S8CW1p9Suk5TwFvELcb/8wNwZ7uPK21c9NUYljPAdJsPLY0yRf35xBXiF2JYlvHDRgXZDZwlfglG5eO2BiAN0wPeId2rMSxPtDIJaUAFnCe+8Neb34Hbmh+HVOtRf8bQpasxmA8an4pEd6/GYK4AdzU7GpUsh6sxmGONTkjFqsjjagy7Irc3NyaVpgcskNfVGMxLjU1LRanI82oM5seG5qVClHA1BrOjkckpexVlXI3BPNbA7JSxHvXvg0cXNSqvjj9C5WoPcI74kkbms7GnqOz0gEPElzOFfD3mLJWZijLfa6yVC2NNU9noA4eJL2SKUeEqvBouiK7h1XBBtIY54CLx5etCVJA+sEh86boUFcKr4YJoCK+GC6I1eDVcEA3RB44QX64cosx4NVwQDdEHjhJfqNyiDHg1XBAN4dVwQbSGWer/bRpdoNyjDtoH/EV8eUqIOuY14ktTUtQRNwIfEl+Y0qKOOEZ8WUqMOuB54otSapS4XcSXpOQoYTdRfxNrdElKjhL2CvEFKT1K1Azx5TBK1jzx5TBK0jb8pDyVKEHPEV8M44Ik6wTxxTAuSJKmKetLalKPEvMw8aUwLkiyXia+FMYFSdanxJfCuCDJOkV8KYwLkqyzxJfCuCDJukR8KYwLkqxfiC+FcUGSdZr4UhgXJFlLxJfCuCDJep/4UhgXJFkvEF8K44Ikay/xpTAuSLI24++CpBQl6HPii2FckGQ9S3wxjAuSrK3AKvHlMErWm8SXwyhZ24kvh1HSXie+IKVHCesDvxFfkpKjxD1OfElKjjrAH7VcEI1wnPiylBh1xCbgJPGFKS3qkM3Al8SXpqSoYzYBB/CvL7ogWtce4ALxBco96rA+cJT4EuUcZWAOuEh8mXKMMuE1cUG0AV4TF0Qj9IEjxJcrhyhjXhMXRCN4TVwQbYDXxAXRCH1gkfjSdSkqkNfEBdEIXhMXRBvgNXFBNMIt+C9dLohGmgPOE1/KVHJpvHEqRz3gMPHlTCHfjzlLZewh4BzxJY3M0thTVNZ6wCHiixqVxfFHqBJUlPne5OkGZqdClHhN7m5kcipKRRnX5FfghmZGptKUcE3eaGxaKlZFvtdktrkxqWR9YIH4QjeZ5UYnJJHXNdnd7GikWg84SLf/6uPxxqciDajo5jX5A7ij+XFI1+pRvzfp0jV5qpVJSOt4EPiZ+PKPyictPb80UurXZPnf1yiFqkjvvckZYLrFZ5auy82k87nJaXxTrkRVxF6TL4AtbT+kNI6r700mvRzzk3g4qSn3ACdofzFWgHsn80hS8/YCX9H8YnwLPDm5x5Da9QDwEeMtxSrwHvV3OUpZ2g7sp/6bXadYfyEuU3+P/ALwKPW3AUvF2QbsBHZR/87GDH7IJ0mSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSUvQPR50xzznuVTwAAAAASUVORK5CYII=")}.scrollArrow.r{right:20px;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAFmElEQVR4nO3dTaiUZRjG8T8ZRX5AgVGbCl2IbaJNB+FQWUnQqmUFES76ggoKImjRqlZtClPP8YuMEqFF4DIXIUoQEZUYRBCKB4UIEwpUXKQtxpjy65lzzsxcz7zP/wfX2nnf+3q4mePMOyBJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJklSh5cAqYApYB6wBVkZfkRSyFHgamAEOAqeAi9fJj8BW4HngnsDrlcZiA7AHOMv1D0Qph4CXgBXjffnSaGwEjrC4Q3G1/AW8Or7LkIZrCjjM8A/G5Tl86d+SJsYORn8wLs8m4JZxXJy0ULcB3zD+w/FvjgHTI79KaQFWA0fJHY7/5iPcJqrIHcBx8gfDbaLqrGA0f6UaRi4Am3GbKGg/+YNQylHg4VHdAOlaXiNf/vlsky3AspHcCekyq4Fz5Is/38wB64d/O6T/+5J82RezTbbiNtGITJEvudtE1fqKfLndJqrSWvKldpuoWh+QL/Mot8kMbhMt0A3A7+SL7DZRlabJl9dtomq9Qb64bhNVay/5wqYyi9tEBeP4hmDNOQ48tui7qM6aI1/SGrINt4mu4k/y5awlvjfRFdKlrDHb8RFEuiRdxlrjNhGQL2LtcZs0Ll3ASchJek+RVIPS5Zuk7MBt0px06SYtbpPGpAs3qXGbNCJdtEmO26QB6ZJ1ITtxm3RWulxdiduko9LF6lp24TbplHShuhi3SYeky9TluE06IF2irucE8MDA01B10gVqIeeBpwYdiOqSLk9LeX/Amagi6dK0lt30HrWkCZEuTIv5bKDJqArpsrSaFwcZjvLSRWk154D7BpiPwtJFaTlHgCXlESkpXZLW81Z5REpKF6T1nANuL05JMemCGHivOCXFpMth4DT+7nu10uUwvTxbGpQy0sUwvXxeGpQy0sUwvZwBbirMSgHpYph+1hVmpYB0KUw/LxdmpYB0KUw/s4VZKSBdCtPP/sKsFJAuhenn+8KsFJAuhelnrjArBaRLYfo5WZiVAtKlMP38VJiVAtKlMP0cLMxKAelSmH4+KcxKAelSmH5eL8xKAelSmH4eKsxKAelSmF7O4ocVq5Quhunli9KglJEuhunludKglJEuhvErt1VLl8PAu8UpKSZdjtZzBlhZnJJi0gVpPe+UR6SkdEFazhxwc3lESkqXpOU8McB8FJYuSat5e5DhKC9dlBbz8UCTURXSZWkt+/AnDyZKujAtZR9w42BjUS3SpWkhf9N7grubYwKly9P1nAAeHHgaqk66QF3OLmDF4KNQjdIl6mJOAhvmMwTVK12mrsWt0THpQnUlbo2OSherC9mJW6Oz0uWa5Lg1GpAu2aRmB26NJqSLNmlxazQmXbhJilujQenSTULcGg1Ll6/2bMet0bR0AWvNHLB+4bdVXZEuYo2Zwa2hS06RL2QtcWvoCr+SL2YN2QYsW+S9VAd9S76cyRwHHl30XVRn7SZf0lRmcWuo4BXyRR13fK+hgU2RL+y4coHeX6jcGhrYEuAP8uV1a6has+QL7NZQtR4hX2S3hqr2C/lCDzMzwPKh3iE17UnypXZrqGpfky/4QnMB2IrvNTRCa4Hz5Mvu1lC13iRf+PlsjS24NTRmB8iXv5Sj+MxbhdxKvZ/yvQBsxt8VV9jdwG/kD8R/cwyYHuVFS/NxL73H96cPxkXgQ9waqtCdwA+4NaRrWgp8yvgPxybcGpog08DPjP5gHADuH88lScO3ETjC8A/Gd8Dj47sMabQ2AHtY/MHYi/+noQ5bCjxD73slh4DTXP9AHKb3uakXgLsCr1eKWw6soveV3nXAGmBl9BVJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiTV5B8KUjFl4mWmRgAAAABJRU5ErkJggg==")}::-webkit-scrollbar{display:none!important}`;
document.head.appendChild(styleSheel);

updateEvent("backgroundImage", conf.backgroundImage);
updateEvent("rowCount", conf.rowCount);
updateEvent("followMouse", conf.followMouse);
updateEvent("pageHelper", null);
updateEvent("showGuide", null);
//=========================================创建样式表==================================================FIN
