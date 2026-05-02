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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
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

// 혜화/대학로 주요 공연장 코드 + 좌표
const VENUES = [
  { code: 'FC001247', name: '아르코예술극장',       lat: 37.5824, lng: 127.0018 },
  { code: 'FC001248', name: '대학로예술극장',       lat: 37.5820, lng: 127.0025 },
  { code: 'FC001528', name: '링크아트센터드림',     lat: 37.5822, lng: 127.0030 },
  { code: 'FC003244', name: '링크아트센터',         lat: 37.5835, lng: 127.0013 },
  { code: 'FC001446', name: 'YES24스테이지',        lat: 37.5818, lng: 127.0027 },
  { code: 'FC000615', name: '동숭아트센터',         lat: 37.5815, lng: 127.0030 },
  { code: 'FC001360', name: '혜화동1번지',          lat: 37.5836, lng: 127.0013 },
  { code: 'FC001076', name: '학전블루',             lat: 37.5830, lng: 127.0008 },
  { code: 'FC001540', name: '예술공간 혜화',        lat: 37.5845, lng: 127.0022 },
  { code: 'FC001453', name: '선돌극장',             lat: 37.5808, lng: 127.0040 },
  { code: 'FC000990', name: '게릴라극장',           lat: 37.5812, lng: 127.0032 },
  { code: 'FC001227', name: '산울림소극장',         lat: 37.5822, lng: 127.0016 },
  { code: 'FC000992', name: '드림시어터',           lat: 37.5819, lng: 127.0024 },
  { code: 'FC001350', name: '나온씨어터',           lat: 37.5823, lng: 127.0017 },
  { code: 'FC001570', name: '수현재씨어터',         lat: 37.5832, lng: 127.0011 },
  { code: 'FC000408', name: '자유소극장',           lat: 37.5811, lng: 127.0031 },
  { code: 'FC001107', name: '눈빛극장',             lat: 37.5829, lng: 127.0010 },
  { code: 'FC001249', name: '씨어터씨',             lat: 37.5818, lng: 127.0028 },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);
    const seenIds = new Set();
    const allPerfs = [];

    // 각 공연장 코드별로 공연 검색
    await Promise.all(VENUES.map(async (venue) => {
      try {
        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&prfplccd=${venue.code}&rows=50&cpage=1`;
        const xml = await fetchKopis(path);
        const items = parseXML(xml, 'db');
        for (const item of items) {
          const id = getTagValue(item, 'mt20id');
          if (!seenIds.has(id)) {
            seenIds.add(id);
            allPerfs.push({
              id,
              name: getTagValue(item, 'prfnm'),
              startDate: getTagValue(item, 'prfpdfrom'),
              endDate: getTagValue(item, 'prfpdto'),
              venue: getTagValue(item, 'fcltynm'),
              venueCode: venue.code,
              genre: getTagValue(item, 'genrenm'),
              status: getTagValue(item, 'prfstate'),
              poster: getTagValue(item, 'poster'),
              lat: venue.lat,
              lng: venue.lng,
            });
          }
        }
      } catch(e) {}
    }));

    res.status(200).json({ success: true, total: allPerfs.length, data: allPerfs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
