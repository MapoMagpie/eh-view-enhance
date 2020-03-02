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
        this.fetchImg().then(src => { bigImageFrame.src = src });
    }

    set() {
        bigImageFrame.hidden = false;
        bigImageFrame.src = this.bigImageUrl || this.node.src;
        bigImageFrame.setAttribute("index", this.index);
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
        background-color: #ff71f01c;
        position: fixed;
        top: 0px;
        right: 0px;
        z-index: 1000;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
    }

    .fullViewPlane > img:not(.bigImageFrame) {
        margin: 10px 0px 0px 10px;
        width: 10%;
    }

    .bigImageFrame {
        top: 20px; 
        display: block; 
        position: absolute; 
        left: auto; 
        width: auto;
        height: 100%;
        z-index: 1001;
    }
`;

document.head.appendChild(styleSheel);

let fullViewPlane = document.createElement("div");
fullViewPlane.classList.add("fullViewPlane");

let bigImageFrame = document.createElement("img");
bigImageFrame.classList.add("bigImageFrame");
bigImageFrame.hidden = true;
fullViewPlane.appendChild(bigImageFrame);
bigImageFrame.addEventListener("wheel", (event) => {
    let start = parseInt(event.target.getAttribute("index"));
    imgPlusList.do(start, 5);
    if (event.deltaY > 0) {
        if (start > imgPlusList.length) return;
        imgPlusList[start + 1].set();
    } else {
        if (start - 1 < 0) return;
        imgPlusList[start - 1].set();
    }
})

let source = document.querySelector("#gdt");

let imgPlusList = new ImgPlusList();

[].slice.call(source.childNodes).forEach((node, index) => {
    if (node.nodeType === 1 && node.hasChildNodes()) {
        let aE = node.firstChild;
        let imgE = aE.firstChild.cloneNode(true);
        imgE.setAttribute("index", index);
        fullViewPlane.appendChild(imgE);
        imgPlusList.push(new ImgPlus(aE.getAttribute("href"), imgE, index));
        imgE.addEventListener("click", (event) => {
            let start = parseInt(event.target.getAttribute("index"));
            imgPlusList[start].retry();
            imgPlusList.do(start, 5);
        })
    }
});

document.body.appendChild(fullViewPlane);

