
## 여기서는 src 디렉토리 아래의 소스 파일에 대한 간략한 설명을 제공합니다:

```
./src
 |-main.ts                       // 진입점으로, 각 모듈의 코드를 조직합니다.
 |-page-fetcher.ts               // 페이지 페처, 각 페이지에서 이미지 정보를 추출하고, 이를 기반으로 이미지 페처를 생성합니다.
 |-img-fetcher.ts                // 이미지 페처.
 |-idle-loader.ts                // 유휴 로더, "자동 로드" 옵션이 활성화된 경우, 자동으로 한 장씩 느리게 로드합니다.
 |-fetcher-queue.ts              // 이미지 페처 큐로, 이미지 페처의 요청을 관리하고 동시에 몇 개의 이미지를 로드할지 제어합니다.
 |-img-node.ts                   // 이미지 정보로, 이미지 페처에 포장되어 있습니다.
 |-event-bus.ts                  // 이벤트 버스로, 각 모듈은 전역 변수 EBUS를 통해 이벤트를 송수신합니다.
 |-config.ts                     // 설정 항목.
 |-download/                     //
 | |-downloader.ts               // 다운로더, 다운로드 시 자동 로드를 비활성화하고, 유휴 로더를 사용해 다운로드를 진행합니다.
 |-platform/                     //
 | |-platform.ts                 // 사이트 플랫폼 어댑터로, 특정 사이트에서 다음 페이지를 어떻게 가져오고, 페이지에서 이미지 정보를 어떻게 추출하며, 메타데이터를 어떻게 얻는지 설명합니다.
 | |-adapt.ts                    // 사이트 주소를 기반으로 플랫폼 어댑터를 반환합니다.
 | |                             // 아래에 몇 가지 어댑터를 나열하고, 그들이 정보를 가져오는 방식을 간략히 설명합니다.
 | |-hitomi.ts                   // hitomi.la 어댑터로, API를 직접 요청하고 내용을 디코딩하여 이미지의 썸네일과 원본 이미지 정보를 가져옵니다.
 | |-nhentai.ts                  // nhentai.net 어댑터로, 페이지 내 특정 script 태그에서 모든 이미지 정보를 추출합니다.
 | |-pixiv.ts                    // pixiv.net 어댑터로, 페이지에서 작가 ID를 가져오고, API를 통해 해당 작가의 모든 작품 정보를 요청한 후, 이 정보를 바탕으로 이미지 세부 정보를 추가로 요청합니다.
 | |-danbooru.ts                 // 일부 booru 계열 사이트 어댑터로, 페이지에서 이미지 요소를 조회한 후, 다음 페이지를 요청하는 방식으로 작동합니다. 
 | |                                이미지 페처는 원본 이미지를 요청할 때 각 이미지의 상세 페이지(href)를 요청하며, 이 페이지에서 원본 이미지 주소를 추출합니다.
 | |-ehentai.ts                  // e-hentai.org/exhentai.org 어댑터로, 페이지에서 이미지 요소를 조회한 후, 다음 페이지를 요청하는 방식으로 작동합니다.
 | |                                이미지 페처는 원본 이미지를 요청할 때 각 이미지의 읽기 페이지를 요청하며, 이 페이지에서 원본 이미지 주소를 추출합니다.
 | |-twitter.ts                  // twitter 어댑터로, 사용자 ID를 통해 API에서 해당 사용자의 미디어 정보를 요청합니다. API 요청에는 페이지 매김이 있습니다.
 |-ui/                           //
 | |-html.ts                     // 스크립트의 UI.
 | |-style.ts                    // 스크립트 UI 스타일.
 | |-full-view-grid-manager.ts   // 썸네일 그리드 UI.
 | |-big-image-frame-manager.ts  // 고화질 이미지 뷰어 UI.
 | |-config-panel.ts             // 설정 패널.
 | |-event.ts                    // 일부 스크립트 UI 요소의 이벤트. 키보드 이벤트 포함.
 |-utils/                        //
```

## 새로운 사이트 지원 추가

사이트 어댑터 관련 코드는 모두 src/platform 디렉토리에 있습니다. [src/platform/platform.ts](/src/platform/platform.ts)에서 사이트 어댑터의 추상 클래스가 정의되어 있으며, 이를 통해 이 프로그램이 특정 사이트에서 페이지 및 이미지 정보를 어떻게 가져올지 설명합니다.
향후 독립형 애플리케이션으로 변환할 수 있도록 사이트 어댑터는 원본 페이지에서 실행된 자바스크립트의 결과에 의존하지 않도록 설계되었습니다.
즉, 원본 페이지에서 정보를 분석해 직접 API를 호출하거나 DOMParser를 사용해 원본 문서를 파싱한 후 해당 이미지 요소를 조회하는 방식입니다.
따라서 원본 페이지가 로드될 때까지 기다리거나 자바스크립트가 완료될 때까지 대기하거나, 정보가 나타날 때까지 타임아웃을 설정할 필요가 없습니다.

[src/platform/platform.ts](/src/platform/platform.ts)에서는 Matcher와 BaseMatcher라는 두 개의 추상 클래스가 정의되어 있으며, Matcher는 사이트 어댑터를 완전히 나타내는 상위 추상 클래스입니다.
BaseMatcher는 Matcher의 일부 메서드를 구현하여 Matcher의 일부 동작을 기본 선택 사항으로 만들어 필요한 구현 메서드의 수를 줄여줍니다.
따라서 새로운 사이트를 지원하려면 BaseMatcher를 상속받기만 하면 됩니다.
```typescript
export class ExampleMatcher extends BaseMatcher {}
```

Typescript의 LSP를 통해 BaseMatcher 메서드를 자동으로 구현할 수 있지만, 여전히 일부 수정을 해야 하며 메서드에 `async`라는 키워드 문법을 추가해야 합니다.
```typescript
class ExampleMatcher extends BaseMatcher {
  fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource, any, unknown> {
    throw new Error("Method not implemented.");
  }
  parseImgNodes(page: PagesSource, chapterID?: number | undefined): Promise<ImageNode[]> {
    throw new Error("Method not implemented.");
  }
  fetchOriginMeta(node: ImageNode, retry: boolean, chapterID?: number | undefined): Promise<OriginMeta> {
    throw new Error("Method not implemented.");
  }
  name(): string {
    throw new Error("Method not implemented.");
  }
  workURL(): RegExp {
    throw new Error("Method not implemented.");
  }
}
```
위 코드에 기반해, 각 메서드가 수행해야 할 작업을 간단히 설명합니다.
이 예제에서는 e-hentai와 같은 전통적인 사이트의 정보 추출 과정을 설명합니다. 갤러리 페이지에서는 이미지의 썸네일 주소와 읽기 주소, 다음 페이지 주소를 얻을 수 있으며, 이미지의 원본 주소는 읽기 주소를 요청한 후에야 얻을 수 있습니다.

```typescript
class ExampleMatcher extends BaseMatcher {
  name(): string {
    return "example site";
  }
  // 첫 번째 단계: 페이지 내용을 가져옵니다. 페이지 내용이 반환되면 두 번째 단계에서 페이지 내용에서 이미지 정보를 가져옵니다.
  // async를 추가하고 메서드 앞에 *을 붙여 이 메서드가 제너레이터임을 표시한 후, yield 키워드를 사용해 반환할 수 있습니다.
  // @param _source: 챕터 정보로, 대부분의 사이트에는 챕터 개념이 없으므로 이 매개변수는 무시하거나 제거할 수 있습니다.
  async *fetchPagesSource(_source: Chapter): AsyncGenerator<PagesSource> {
    // 일반적으로 첫 번째 단계에서는 현재 페이지의 문서 객체를 직접 반환합니다.
    yield document;
    // 프로그램이 다음 페이지를 가져와야 할 때
    while (true) {
      // 다음 페이지 주소를 가져옵니다.
      let nextPage = getNextPage();
      // 다음 페이지를 가져올 수 없으면 반복을 종료하여 모든 페이지를 가져왔음을 알립니다.
      if (nextPage === undefined || nextPage === "") break;
      // 다음 페이지를 요청하고 이를 문서 객체로 파싱합니다.
      const doc = await window.fetch(nextPage).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      yield doc;
    }
  }
  // 두 번째 단계: 매개변수 page는 첫 번째 단계에서 반환된 페이지 내용입니다. 이는 Document일 수도 있고, string일 수도 있습니다. 반환 값에 따라 구체적인 타입이 결정됩니다.
  // @param _chapterID: 챕터 정보로, 무시할 수 있습니다.
  async parseImgNodes(page: PagesSource, _chapterID?: number | undefined): Promise<ImageNode[]> {
    // 첫 번째 단계에서 반환된 것이 Document이므로, page를 Document로 확정할 수 있습니다.
    const doc = page as Document;
    // Document에서 해당 이미지 요소를 조회합니다.
    const elements = Array.from(doc.querySelectorAll("some img or a"));
    let nodes: ImageNode[] = [];
    for (const ele of elements) {
      // title: 이미지 제목을 가져오거나 다른 방식으로 제목을 설정합니다.
      // thumbnailSrc: 썸네일 주소를 가져옵니다.
      // href: 이미지의 읽기 주소인 href를 가져옵니다. 이는 원본 페이지에서 썸네일을 클릭하면 이동하는 읽기 주소입니다.
      nodes.push(new ImageNode(thumbnailSrc, href, title, 선택적 매개변수: 지연된 thumbnailSrc, 선택적 매개변수: 원본 이미지 주소 설정));
      // 선택적 매개변수: 지연된 thumbnailSrc, e-hentai는 썸네일 주소를 직접 제공하지 않고, 20장의 이미지가 하나의 스프라이트 시트를 공유합니다. 썸네일 주소를 얻을 수 없는 경우, 스프라이트 시트를 요청한 후 이를 분할하여 분할된 이미지 blob 주소를 반환합니다.
      // 선택적 매개변수: 원본 이미지 주소 설정. 일부 사이트는 매우 관대하게도 페이지에 원본 이미지 주소 정보를 직접 포함시키므로 세 번째 단계에서 원본 주소를 요청하는 비동기 작업을 생략할 수 있습니다.
    }
    return nodes;
  }
  // 세 번째 단계: 이미지의 원본 주소를 가져옵니다.
  // @param _retry: 이미지 원본 주소에서 이미지를 가져올 수 없을 때, _retry가 true로 설정되며, 이때 이미지 원본 주소를 변경할 수 있습니다. 하지만 대부분의 사이트에서 이미지 원본 주소는 변경되지 않으므로 이 매개변수는 생략할 수 있습니다.
  // @param _chapterID: 마찬가지로 무시할 수 있는 챕터 정보입니다.
  async fetchOriginMeta(node: ImageNode, _retry: boolean, _chapterID?: number | undefined): Promise<OriginMeta> {
    // 두 번째 단계에서 이미지 원본 주소가 명확히 설정된 경우, 이를 바로 반환합니다.
    // return {url: node.originSrc!};
    // 두 번째 단계에서 이미지 원본 주소를 얻을 수 없는 경우, 이미지의 읽기 주소(href)를 요청하고, 반환된 HTML에서 이미지 원본 주소를 추출합니다.
    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const originSrc = doc.querySelector("some img")?.src;
    return {url: originSrc};
    // 반환 값인 OriginMeta는 두 개의 선택적 속성 title과 href를 가질 수 있습니다. 이들은 이미지 정보의 title과 href를 업데이트하는 데 사용됩니다.
    // 예를 들어, 두 번째 단계에서 title을 01.jpg로 설정했지만, 이 단계에서 원본 이미지가 png 형식임을 발견했다면 title에서 .jpg를 .png로 업데이트할 수 있습니다.
  }
  // 사이트에서 유효하며, 해당 사이트의 갤러리 페이지에 유효한 정규식을 반환합니다.
  workURL(): RegExp {
    return /example.com/갤러리 id 정규식$/;
  }
}
```
또한 로딩 지연, 난독화, 이미지 잘림, API 요청의 복잡한 구성, API가 반환하는 콘텐츠의 암호화 등 이미지 정보를 얻는 방법이 더 복잡한 사이트가 많습니다.
이러한 복잡한 상황이 발생할 경우, 이미 구현된 사이트 어댑터의 코드를 참조하십시오.
예를 들어, hitomi 페이지에서는 암호화된 이미지 목록 및 썸네일과 원본 이미지 정보가 직접 제공되며, 난독화된 복호화 함수도 포함되어 있습니다.
예를 들어, twitter에서는 복잡한 API 요청 구성이 존재합니다.
예를 들어, 18comic에서는 난독화된 이미지 복구 함수와 더불어 뒤섞인 이미지가 반환됩니다.

## 스크립트에 새 기능을 추가하거나 버그를 수정하려면

스크립트가 실행된 후의 과정을 설명합니다.
TODO
