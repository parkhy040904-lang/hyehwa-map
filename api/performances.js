const http = require('http');
const KOPIS_KEY = '541d34303da04a91bbe6919b7f130bbc';

function getDateStr(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

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

// 대학로 주요 공연장 코드 (직접 확인된 것들)
const KNOWN_VENUE_CODES = [
  'FC001528', // 링크아트센터드림
  'FC003244', // 링크아트센터
  'FC001446', // 예스24스테이지
  'FC001247', // 아르코예술극장
  'FC001248', // 대학로예술극장
  'FC000615', // 동숭아트센터
  'FC001360', // 혜화동1번지
  'FC001453', // 선돌극장
  'FC000990', // 게릴라극장
  'FC001227', // 산울림소극장
  'FC001107', // 눈빛극장(미마지아트센터)
  'FC001249', // 씨어터씨
  'FC003400', // 플러스씨어터
  'FC001540', // 예술공간혜화
  'FC001076', // 학전
  'FC000992', // 드림시어터
  'FC001350', // 나온씨어터
  'FC001570', // 수현재씨어터
  'FC000408', // 자유소극장
  'FC001154', // 유니플렉스
  'FC001399', // JTN아트홀
  'FC001537', // NOL씨어터대학로
  'FC002430', // 홍익대대학로아트센터
  'FC001445', // 예스24아트원
  'FC001597', // NOL서경스퀘어
];

const venueInfoCache = {};

async function getVenueInfo(code) {
  if (venueInfoCache[code]) return venueInfoCache[code];
  try {
    const xml = await fetchKopis(`prfplc/${code}?service=${KOPIS_KEY}`);
    const item = parseXML(xml, 'db')[0] || '';
    const lat = parseFloat(getTagValue(item, 'la'));
    const lng = parseFloat(getTagValue(item, 'lo'));
    const name = getTagValue(item, 'fcltynm');
    if (lat && lng) {
      venueInfoCache[code] = { lat, lng, name };
      return { lat, lng, name };
    }
  } catch(e) {}
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);

    // 1단계: 공연장 정보(좌표) 가져오기
    const venueInfos = {};
    await Promise.all(KNOWN_VENUE_CODES.map(async (code) => {
      const info = await getVenueInfo(code);
      if (info) venueInfos[code] = info;
    }));

    // 2단계: 각 공연장별 공연 목록 가져오기
    const seenIds = new Set();
    const allPerfs = [];

    await Promise.all(Object.entries(venueInfos).map(async ([code, venue]) => {
      try {
        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&prfplccd=${code}&rows=50&cpage=1`;
        const xml = await fetchKopis(path);
        const items = parseXML(xml, 'db');
        for (const item of items) {
          const id = getTagValue(item, 'mt20id');
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          allPerfs.push({
            id,
            name: getTagValue(item, 'prfnm'),
            startDate: getTagValue(item, 'prfpdfrom'),
            endDate: getTagValue(item, 'prfpdto'),
            venue: venue.name,
            venueCode: code,
            genre: getTagValue(item, 'genrenm'),
            status: getTagValue(item, 'prfstate'),
            poster: getTagValue(item, 'poster'),
            lat: venue.lat,
            lng: venue.lng,
          });
        }
      } catch(e) {}
    }));

    res.status(200).json({
      success: true,
      venueCount: Object.keys(venueInfos).length,
      total: allPerfs.length,
      data: allPerfs
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
