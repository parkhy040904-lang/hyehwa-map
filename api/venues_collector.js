const http = require('http');
const KOPIS_KEY = '541d34303da04a91bbe6919b7f130bbc';

function fetchKopis(path) {
  return new Promise((resolve, reject) => {
    const reqUrl = `http://www.kopis.or.kr/openApi/restful/${path}`;
    const req = http.get(reqUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function getTagValue(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return (m[1] || m[2] || '').trim();
}

function parseXML(xml, tag) {
  const results = [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let match;
  while ((match = regex.exec(xml)) !== null) results.push(match[1]);
  return results;
}

// 대학로 공연장 이름 목록 (엑셀에서 추출)
const VENUE_NAMES = [
  'NOL 씨어터 대학로','유니플렉스','링크아트센터드림','예스24 스테이지',
  '링크아트센터','JTN 아트홀','홍익대 대학로 아트센터','예스24아트원',
  'NOL 서경스퀘어','한예극장','동양예술극장','티오엠씨어터','민송아트홀',
  '링크더스페이스','동덕여대공연예술센터','한성아트홀','미마지아트센터',
  '명작극장','대학로 판타스틱전용관','대학로스타시티','아트포레스트 아트홀',
  '라이브 썸데이즈홀','대학로 스카이씨어터','굿씨어터','플러스씨어터',
  '올웨이즈 씨어터','나인진홀','파랑새극장','하마씨어터','상명아트홀',
  '문화공간 엘림홀','VERY','세우아트센터','SH아트홀','큐씨어터','틴틴홀',
  '봄날아트홀','대학로 자유극장','도토리씨어터','대학로 극장가게',
  '순위아트홀','대학로 두레홀','D:BASE','아트하우스','대학로 A아트홀',
  '올림아트센터','라온아트홀','제나아트홀','스타스테이지','브릭스씨어터',
  '예그린씨어터','해피씨어터','스콘뮤직홀','비유아트홀','JS아트홀',
  '씨어터 벙커','콘텐츠박스','극장 온','에이치씨어터','라이프 씨어터',
  '스튜디오 블루','졸탄극장','내유외강씨어터','지인시어터','JCC 아트센터',
  '올래홀','공간아울','보라 아트홀','마루아트홀','후암스튜디오',
  '윈씨어터','대학로 무하아트센터','연극플레이스 혜화','초록씨어터',
  '파랑씨어터','타이니앨리스','바탕골소극장','JH아트홀','업스테이지',
  '서연아트홀','열린극장','동숭무대소극장','루미나아트홀','룸어씨어터',
  '익스트림씨어터','삼형제극장','선돌극장','R&J씨어터','드림시어터',
  '한양레퍼토리씨어터','대학로 위로홀','코델아트홀','SJA HALL',
  '컬쳐씨어터','예술공간 서울','정극장','예술공간 유비누리','후암스테이지',
  '우리소극장','씨어터 쿰','예술공간 혜화','청운예술극장','다케이씨어터',
  '달밤엔씨어터','나온씨어터','소극장 혜화당','소극장 축제','예술공간 오르다',
  '탑아트홀','씨어터조이','후암씨어터','소극장 다르게놀자','성균소극장',
  '대학로 마로니에소극장','연우소극장','아름다운극장','단막극장','대학로 달달씨어터',
  '스폿라이트','나인 씨어터','우리네 극장','호은아트홀','제이원 씨어터',
  '정보소극장','아루또소극장','더 씨어터','달빛극장','샤봉디씨어터',
  '아스가르드 씨어터','공공그라운드','피카소소극장','지즐소극장','댕로홀',
  '극장 동국','스튜디오SK','노을소극장','한얼소극장','소극장 무극',
  '소극장 공유','소극장 꿈꾸는 공작소','오마이갓 전용관','소극장 플랫폼74',
  '연극실험실 혜화동1번지','진건아트홀','미래아트홀','안똔체홉극장',
  '해바라기소극장','동화소극장','물빛극장','대학로 김대범소극장',
  '홍해성 소극장','예술공간 라푸푸','북극곰소극장','NC문화재단 홀',
  '허수아비소극장','소극장 선물','명륜아트홀','혜화아트센터'
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const results = [];
    
    // 각 공연장 이름으로 KOPIS 검색
    await Promise.all(VENUE_NAMES.map(async (name) => {
      try {
        const encoded = encodeURIComponent(name.slice(0, 10)); // 앞 10자만 검색
        const path = `prfplc?service=${KOPIS_KEY}&cpage=1&rows=5&shprfnmfct=${encoded}`;
        const xml = await fetchKopis(path);
        const items = parseXML(xml, 'db');
        
        for (const item of items) {
          const foundName = getTagValue(item, 'fcltynm');
          const code = getTagValue(item, 'mt10id');
          const lat = parseFloat(getTagValue(item, 'la'));
          const lng = parseFloat(getTagValue(item, 'lo'));
          const chartr = getTagValue(item, 'fcltychartr');
          
          // 대학로 공연장이고 이름이 비슷하면 추가
          if (chartr.includes('대학로') && lat && lng && code) {
            results.push({ name: foundName, code, lat, lng });
            break;
          }
        }
      } catch(e) {}
    }));

    // 중복 제거
    const unique = [...new Map(results.map(r => [r.code, r])).values()];
    
    res.status(200).json({
      success: true,
      total: unique.length,
      venues: unique
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
