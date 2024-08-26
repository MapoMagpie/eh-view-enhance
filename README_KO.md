# 코스모스 만화 뷰어

**이 유저 스크립트는 [특정 사이트들](#multi-site-support)에서 갤러리 또는 작가의 홈페이지를 빠르고 편리하게 탐색할 수 있도록 하며, 일괄 다운로드 기능을 지원합니다. 브라우징 경험과 낮은 사이트 부하에 중점을 둡니다.**

## 목차

- [기능](#features)
- [여러 사이트 지원](#multi-site-support)
- [설치](#installation)
- [작동 방법](#operates)
- [피드백](#feedback)

미리보기 (이미지가 보이지 않는다면 [여기](/.assets/preview.md)를 클릭하세요):
![미리보기](.assets/eh-view-enhance-showcase3.avif '미리보기')

## <a name="features">기능</a>

- **`원활한 브라우징`**
  - 스크립트는 갤러리의 모든 이미지를 자동으로 불러와 썸네일로 그리드에 표시하며, 사이트에 낮은 부하로 전체 갤러리를 빠르게 탐색할 수 있게 합니다.
- **`이미지 크게 보기`**
  - 썸네일을 클릭하면 해당 지점에서 브라우징을 시작할 수 있으며, 페이지 넘김, 연속 보기, 확대 등 여러 보기 모드를 지원합니다.
- **`갤러리 다운로드`**
  - 원본 이미지와 갤러리 정보를 모두 저장하여 나중에 쉽게 관리할 수 있습니다. 브라우저의 블롭(blob) 제한을 우회하기 위해 분할 다운로드를 지원합니다.
- **`키보드 조작`**
  - `CONF` 패널에서 `keyboard`를 클릭하여 관련 키보드 조작을 학습하고 설정할 수 있습니다.
- **`모바일 적용`**
  - Firefox Android, Kiwi Browser 등의 스크립트 관리 확장 프로그램을 지원하는 브라우저가 필요합니다.

## <a name="multi-site-support">다중 사이트 지원</a>

현재 지원하는 사이트:

- [e-hentai.org](https://e-hentai.org) | [exhentai.org](https://exhentai.org) | [onion](http://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion)
- [pixiv.net](https://pixiv.net) (작가의 일러스트, 만화, Ugoria to GIF)
- [18comic.vip](https://18comic.vip) | [18comic.org](https://18comic.org) (다중 챕터 선택 지원, 썸네일 없음)
- [nhentai.net](https://nhentai.net)
- [hitomi.la](https://hitomi.la)
- [rule34.xxx](https://rule34.xxx)
- [imhentai.xxx](https://imhentai.xxx)
- [danbooru.donmai.us](https://danbooru.donmai.us)
- [gelbooru.com](https://gelbooru.com)
- [yande.re](https://yande.re)
- [konachan.com](https://konachan.com)
- [Steam 스크린샷](https://steamcommunity.com/id/some/screenshots)
- [Twitter 사용자 미디어](https://twitter.com/NASA/media) | [X 사용자 미디어](https://x.com/NASA/media)
- [wnacg.com](https://www.wnacg.com)
- [hentainexus.com](https://hentainexus.com)
- [koharu.to](https://koharu.to)
- [manhuagui.com](https://www.manhuagui.com/comic/7580)
- [mangacopy.com](https://www.mangacopy.com)
- [copymanga.tv](https://www.copymanga.tv)
- [e621.net](https://e621.net)
- [arca.live](https://arca.live)

사이트 지원 요청: [https://github.com/MapoMagpie/eh-view-enhance/issues](https://github.com/MapoMagpie/eh-view-enhance/issues)

기여하기: [기여 가이드](https://github.com/MapoMagpie/eh-view-enhance/blob/master/CONTRIBUTING.md)

## <a name="installation">설치</a>

1. **`필수 조건`**: 신식 브라우저 (Firefox\Chrome\Edge...)
1. **`필수 조건`**: 확장 프로그램 설치 [`TamperMonkey`](https://www.tampermonkey.net/) | [`Violentmonkey`](https://violentmonkey.github.io/)
1. **`필수 조건`**: 스크립트가 제대로 작동하는지 확인하려면 [jsdelivr.net](https://cdn.jsdelivr.net)에 접속할 수 있는지 확인하세요.
1. **`설치 링크 1`**: [OpenUserJS](https://openuserjs.org/scripts/zsyjklive.cn/E_HENTAI_VIEW_ENHANCE)
1. **`설치 링크 2`**: [GreasyFork](https://greasyfork.org/en/scripts/397848-e-hentai-view-enhance), 로그인 필요
1. **`설치 링크 3`**: [SleazyFork](https://sleazyfork.org/en/scripts/397848-e-hentai-view-enhance), 로그인 필요 없음
1. **`설치 링크 4`**: [여기](https://github.com/MapoMagpie/eh-view-enhance/raw/master/eh-view-enhance.user.js)에서 직접 설치

## <a name="operates">작동 방법</a>

1. 갤러리 또는 작가 홈페이지에서 왼쪽 하단의 `<🎑>`를 클릭하여 브라우징을 시작하세요. 이 버튼은 CONF 패널에서 원하는 위치로 드래그할 수 있습니다.
2. 잠시 후 썸네일이 페이지에 그리드로 표시됩니다. 썸네일을 클릭하여 큰 이미지 보기 모드로 들어갈 수 있습니다.

## <a name="feedback">피드백</a>

> 피드백 제출: https://github.com/MapoMagpie/eh-view-enhance/issues

이 스크립트를 좋아하신다면, `star`를 눌러주세요.