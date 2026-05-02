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

// 공연장 이름 → 좌표 매핑
const VENUE_COORDS = [
  { keys: ['링크아트센터드림', '드림아트센터'], lat: 37.5816, lng: 127.0025 },
  { keys: ['링크아트센터'], lat: 37.5835, lng: 127.0011 },
  { keys: ['YES24스테이지', 'yes24스테이지'], lat: 37.5813, lng: 127.0022 },
  { keys: ['아르코예술극장'], lat: 37.5824, lng: 127.0018 },
  { keys: ['대학로예술극장'], lat: 37.5820, lng: 127.0025 },
  { keys: ['동숭아트센터'], lat: 37.5815, lng: 127.0030 },
  { keys: ['혜화동1번지'], lat: 37.5836, lng: 127.0013 },
  { keys: ['학전'], lat: 37.5830, lng: 127.0008 },
  { keys: ['선돌극장'], lat: 37.5808, lng: 127.0040 },
  { keys: ['게릴라극장'], lat: 37.5812, lng: 127.0032 },
  { keys: ['산울림'], lat: 37.5822, lng: 127.0016 },
  { keys: ['드림시어터'], lat: 37.5819, lng: 127.0024 },
  { keys: ['나온씨어터', '나온시어터'], lat: 37.5823, lng: 127.0017 },
  { keys: ['수현재'], lat: 37.5832, lng: 127.0011 },
  { keys: ['자유소극장', '자유극장'], lat: 37.5811, lng: 127.0031 },
  { keys: ['눈빛극장'], lat: 37.5829, lng: 127.0010 },
  { keys: ['씨어터씨'], lat: 37.5818, lng: 127.0028 },
  { keys: ['플러스씨어터', '플러스시어터'], lat: 37.5814, lng: 127.0026 },
  { keys: ['예술공간 혜화', '예술공간혜화'], lat: 37.5845, lng: 127.0022 },
  { keys: ['대학로스타', '스타릿홀'], lat: 37.5817, lng: 127.0023 },
  { keys: ['JTN', 'jtn'], lat: 37.5821, lng: 127.0023 },
  { keys: ['NOL', 'nol'], lat: 37.5818, lng: 127.0028 },
  { keys: ['서울문화재단 대학로극장', '대학로극장 쿼드'], lat: 37.5820, lng: 127.0022 },
  { keys: ['마로니에공원'], lat: 37.5826, lng: 127.0020 },
  { keys: ['연우소극장', '연우무대'], lat: 37.5828, lng: 127.0019 },
  { keys: ['알과핵소극장'], lat: 37.5814, lng: 127.0027 },
  { keys: ['이음센터', '이음아트홀'], lat: 37.5820, lng: 127.0025 },
  { keys: ['단막극장', '단막극'], lat: 37.5813, lng: 127.0029 },
  { keys: ['해나루소극장'], lat: 37.5819, lng: 127.0021 },
  { keys: ['동숭홀'], lat: 37.5815, lng: 127.0030 },
  { keys: ['혜화'], lat: 37.5825, lng: 127.0020 },
  { keys: ['대학로'], lat: 37.5820, lng: 127.0022 },
  { keys: ['동숭'], lat: 37.5817, lng: 127.0026 },
];

function getCoordsByVenueName(venueName) {
  if (!venueName) return null;
  const name = venueName.toLowerCase();
  for (const v of VENUE_COORDS) {
    if (v.keys.some(k => name.includes(k.toLowerCase()))) {
      return { lat: v.lat, lng: v.lng };
    }
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);
    const seenIds = new Set();
    const rawItems = [];

    // 지역 필터 없이 전체 공연 가져오기
    for (let page = 1; page <= 5; page++) {
      try {
        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&rows=100&cpage=${page}`;
        const xml = await fetchKopis(path);
        const items = parseXML(xml, 'db');
        if (!items.length) break;
        for (const item of items) {
          const id = getTagValue(item, 'mt20id');
          if (!seenIds.has(id)) { seenIds.add(id); rawItems.push(item); }
        }
      } catch(e) { break; }
    }

    // 좌표는 공연장 이름으로만 매칭 (API 추가 호출 없음 → 빠름!)
    const allPerfs = rawItems.map(item => {
      const venueName = getTagValue(item, 'fcltynm');
      const coords = getCoordsByVenueName(venueName);
      // 좌표 없으면 서울 중심 랜덤 배치
      const lat = coords ? coords.lat : 37.5665 + (Math.random() - 0.5) * 0.1;
      const lng = coords ? coords.lng : 126.9780 + (Math.random() - 0.5) * 0.1;
      return {
        id: getTagValue(item, 'mt20id'),
        name: getTagValue(item, 'prfnm'),
        startDate: getTagValue(item, 'prfpdfrom'),
        endDate: getTagValue(item, 'prfpdto'),
        venue: venueName,
        venueCode: getTagValue(item, 'mt10id'),
        genre: getTagValue(item, 'genrenm'),
        status: getTagValue(item, 'prfstate'),
        poster: getTagValue(item, 'poster'),
        lat,
        lng,
        knownVenue: !!coords,
      };
    });

    res.status(200).json({ success: true, total: allPerfs.length, data: allPerfs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
