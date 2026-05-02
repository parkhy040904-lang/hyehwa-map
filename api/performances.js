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

let venueListCache = null;
let venueListCacheTime = 0;
const venueCoordCache = {};

// 종로구 공연시설 전체 가져오기
async function getJongnoVenues() {
  if (venueListCache && Date.now() - venueListCacheTime < 3600000) return venueListCache;

  const venues = [];
  // signgucode=11(서울), signgucodesub=11110(종로구)
  for (let page = 1; page <= 5; page++) {
    try {
      const path = `prfplc?service=${KOPIS_KEY}&signgucode=11&signgucodesub=11110&rows=100&cpage=${page}`;
      const xml = await fetchKopis(path);
      const items = parseXML(xml, 'db');
      if (!items.length) break;
      for (const item of items) {
        venues.push({
          code: getTagValue(item, 'mt10id'),
          name: getTagValue(item, 'fcltynm'),
        });
      }
    } catch(e) { break; }
  }

  venueListCache = venues;
  venueListCacheTime = Date.now();
  return venues;
}

async function getVenueCoords(venueCode) {
  if (venueCoordCache[venueCode]) return venueCoordCache[venueCode];
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
  return null;
}

// 혜화/대학로 좌표 범위 (위도 37.578~37.587, 경도 126.998~127.007)
function isHyehwa(lat, lng) {
  return lat >= 37.578 && lat <= 37.588 && lng >= 126.998 && lng <= 127.008;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);

    const venues = await getJongnoVenues();
    const seenIds = new Set();
    const allPerfs = [];

    await Promise.all(venues.map(async (venue) => {
      try {
        const coords = await getVenueCoords(venue.code);
        if (!coords) return;
        // 혜화/대학로 범위 밖이면 스킵
        if (!isHyehwa(coords.lat, coords.lng)) return;

        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&prfplccd=${venue.code}&rows=50&cpage=1`;
        const xml = await fetchKopis(path);
        const items = parseXML(xml, 'db');
        if (!items.length) return;

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
              lat: coords.lat,
              lng: coords.lng,
            });
          }
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
