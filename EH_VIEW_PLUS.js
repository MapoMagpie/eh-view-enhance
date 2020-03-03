class ImgPlus {
    constructor(imgUrl, node, index) {
        this.url = imgUrl;
        this.node = node;
        this.finsh = false;
        this.index = index;
    }

    async fetchImg() {
        if (this.finsh) return;
        this.finsh = true;
        const response = await window.fetch(this.url);
        const text = await response.text();
        this.bigImageUrl = this.node.src = ImgPlus.extractBigImgUrl.exec(text)[1];
        return this.bigImageUrl;
    }

    retry() {
        this.finsh = false;
        this.set();
        this.fetchImg().then(src => { bigImageElement.src = src });
    }

    set() {
        bigImageFrame.style.display = "flex";
        bigImageElement.src = this.bigImageUrl || this.node.src;
        bigImageElement.setAttribute("index", this.index);
    }
}

class ImgPlusList extends Array {
    constructor() {
        super();
    }

    do(start, step) {
        step = step || 5;
        for (let index = start + 1; (index < step + start) && (index < this.length); index++) { this[index].fetchImg() }
    }
}

ImgPlus.extractBigImgUrl = /\<img\sid=\"img\"\ssrc=\"(.*)\"\sstyle/;

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
        border: 5px
        gray solid;
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

let fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");

let bigImageFrame = document.createElement("div");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.style.display = "none";
fullViewPlane.appendChild(bigImageFrame);
let bigImageElement = document.createElement("img");
bigImageFrame.appendChild(bigImageElement);
bigImageElement.addEventListener("wheel", (event) => {
    let start = parseInt(event.target.getAttribute("index"));
    imgPlusList.do(start, 5);
    if (event.deltaY > 0) {
        if (start > imgPlusList.length - 2) return;
        imgPlusList[start + 1].set();
    } else {
        if (start - 1 < 0) return;
        imgPlusList[start - 1].set();
    }
    event.stopPropagation();
});

bigImageFrame.addEventListener("click", (event) => { if (event.target.tagName === "IMG") return; bigImageFrame.style.display = "none"; })

document.body.appendChild(fullViewPlane);
let imgPlusList = new ImgPlusList();

let putImgPlus = function (imgEleList, imgPlusList, fullViewPlane) {
    [].slice.call(imgEleList.childNodes).forEach((node) => {
        if (node.nodeType === 1 && node.hasChildNodes()) {
            let aE = node.firstChild;
            let imgE = aE.firstChild.cloneNode(true);
            fullViewPlane.appendChild(imgE);
            let index = imgPlusList.push(new ImgPlus(aE.getAttribute("href"), imgE, imgPlusList.length)) - 1;
            imgE.setAttribute("index", index);
            imgE.addEventListener("click", (event) => {
                let start = parseInt(event.target.getAttribute("index"));
                imgPlusList[start].retry();
                imgPlusList.do(start, 5);
            });
        }
    });
}


let fetchSource = async function (href) {
    const response = await window.fetch(href);
    const text = await response.text();
    let ele = document.createElement("div");
    ele.innerHTML = text;
    return ele;
}

let nextPage = async function (source) {
    let e1 = source.querySelector("table.ptb td.ptds");
    if (!e1) return null;
    let e2 = e1.nextElementSibling;
    if (!e2 || e2.textContent === ">") return null;
    return e2.firstElementChild.href;
}

let processCurrPage = async function (href) {
    const source = await fetchSource(href);
    putImgPlus(source.querySelector("#gdt"), imgPlusList, fullViewPlane);
    const nextHref = await nextPage(source);
    return nextHref ? processCurrPage(nextHref) : true;
}

processCurrPage(document.querySelectorAll("table.ptb tr > td")[1].firstElementChild.href);
/* let currPage = 0;
let hrefs = [].slice.call(document.querySelectorAll("table.ptb tr > td"), 1).map((node, index) => { if (node.className === "ptds") currPage = index; return node.firstElementChild.href }); hrefs.pop();
hrefs.forEach((href, index) => {
     if (currPage === index) {
        putImgPlus(document.querySelector("#gdt"), imgPlusList, fullViewPlane)
    } else {
        fetchSource(href).then(source => { putImgPlus(source, imgPlusList, fullViewPlane); });
    }
    fetchSource(href).then(source => { putImgPlus(source, imgPlusList, fullViewPlane); });
}) */

/* document.body.appendChild(fullViewPlane); */

