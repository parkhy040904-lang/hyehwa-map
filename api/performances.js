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

// 대학로 공연장 코드 목록 가져오기
async function getDaehangnoVenueCodes() {
  const codes = [];
  const seen = new Set();
  for (let page = 1; page <= 10; page++) {
    try {
      // signgucode=11(서울), signgucodesub=11110(종로구), fcltychartr=4(민간대학로)
      const path = `prfplc?service=${KOPIS_KEY}&cpage=${page}&rows=20&signgucode=11&signgucodesub=11110&fcltychartr=4`;
      const xml = await fetchKopis(path);
      const items = parseXML(xml, 'db');
      if (!items.length) break;
      for (const item of items) {
        const code = getTagValue(item, 'mt10id');
        const name = getTagValue(item, 'fcltynm');
        const lat = parseFloat(getTagValue(item, 'la')) || null;
        const lng = parseFloat(getTagValue(item, 'lo')) || null;
        if (code && !seen.has(code)) {
          seen.add(code);
          codes.push({ code, name, lat, lng });
        }
      }
    } catch(e) { break; }
  }
  return codes;
}

let venueCache = null;
let venueCacheTime = 0;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);

    // 공연장 코드 목록 (1시간 캐시)
    if (!venueCache || Date.now() - venueCacheTime > 3600000) {
      venueCache = await getDaehangnoVenueCodes();
      venueCacheTime = Date.now();
    }
    const venues = venueCache;

    if (!venues.length) {
      return res.status(200).json({ success: false, error: '공연장 목록을 가져오지 못했어요', venueCount: 0, data: [] });
    }

    // 각 공연장별 공연 목록 병렬 조회
    const seenIds = new Set();
    const allPerfs = [];

    await Promise.all(venues.map(async (venue) => {
      if (!venue.lat || !venue.lng) return;
      try {
        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&prfplccd=${venue.code}&rows=50&cpage=1`;
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
            venueCode: venue.code,
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
      venueCount: venues.length,
      total: allPerfs.length,
      data: allPerfs
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
