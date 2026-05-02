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

const venueCoordCache = {};

async function getVenueCoords(venueCode) {
  if (!venueCode) return null;
  if (venueCoordCache[venueCode] !== undefined) return venueCoordCache[venueCode];
  try {
    const xml = await fetchKopis(`prfplc/${venueCode}?service=${KOPIS_KEY}`);
    const item = parseXML(xml, 'db')[0] || '';
    const lat = parseFloat(getTagValue(item, 'la'));
    const lng = parseFloat(getTagValue(item, 'lo'));
    if (lat && lng) {
      venueCoordCache[venueCode] = { lat, lng };
      return { lat, lng };
    }
  } catch (e) {}
  venueCoordCache[venueCode] = null;
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

    // 현재 공연중 + 예정 전체 (지역 필터 없음, 페이지 5개)
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

    // 각 공연 좌표 병렬 조회
    const allPerfs = (await Promise.all(rawItems.map(async (item) => {
      const venueCode = getTagValue(item, 'mt10id');
      const coords = await getVenueCoords(venueCode);
      if (!coords) return null;
      return {
        id: getTagValue(item, 'mt20id'),
        name: getTagValue(item, 'prfnm'),
        startDate: getTagValue(item, 'prfpdfrom'),
        endDate: getTagValue(item, 'prfpdto'),
        venue: getTagValue(item, 'fcltynm'),
        venueCode,
        genre: getTagValue(item, 'genrenm'),
        status: getTagValue(item, 'prfstate'),
        poster: getTagValue(item, 'poster'),
        lat: coords.lat,
        lng: coords.lng,
      };
    }))).filter(Boolean);

    res.status(200).json({ success: true, total: allPerfs.length, data: allPerfs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
