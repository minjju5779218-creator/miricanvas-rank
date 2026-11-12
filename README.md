# 미리캔버스 스톡 노출 순위 리서치

미리캔버스 에디터 **요소** 검색에서 키워드별로 보이는 노출 순서를 기록한 개인 리서치용 웹앱이에요.

- 키워드 100개 (인쇄물에 자주 쓰는 소재 중심), 프리미엄 상위 30위 · 무료 상위 15~30위
- 지난주 대비 순위 변화(▲▼/NEW), 전체 요약, 5장 세트 프롬프트, ChatGPT용 비슷한 느낌 프롬프트
- 썸네일은 저장소에 저장하지 않고 미리캔버스에서 바로 불러와요.
- 순위는 미리캔버스가 보여주는 노출 순서이며 판매량이 아니에요.

## 업데이트
매주 월요일 Claude 예약 작업이 에디터에서 다시 수집해 `index.html`과 `data/current.json`을 갱신해요.

```
python3 build/build.py build/template.html DATA.json THUMBS.json data/current.json YYYY.MM.DD OUT --pages
```
