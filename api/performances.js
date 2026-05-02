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

// 대학로 주요 공연장 코드 + 좌표 (하드코딩 fallback)
const KNOWN_VENUES = {
  'FC001528': { lat: 37.5816, lng: 127.0025, name: '링크아트센터드림' },
  'FC003244': { lat: 37.5835, lng: 127.0011, name: '링크아트센터' },
  'FC001446': { lat: 37.5813, lng: 127.0022, name: 'YES24스테이지' },
  'FC001247': { lat: 37.5824, lng: 127.0018, name: '아르코예술극장' },
  'FC001248': { lat: 37.5820, lng: 127.0025, name: '대학로예술극장' },
  'FC000615': { lat: 37.5815, lng: 127.0030, name: '동숭아트센터' },
  'FC001360': { lat: 37.5836, lng: 127.0013, name: '혜화동1번지' },
  'FC001076': { lat: 37.5830, lng: 127.0008, name: '학전블루' },
  'FC001453': { lat: 37.5808, lng: 127.0040, name: '선돌극장' },
  'FC000990': { lat: 37.5812, lng: 127.0032, name: '게릴라극장' },
  'FC001227': { lat: 37.5822, lng: 127.0016, name: '산울림소극장' },
  'FC000992': { lat: 37.5819, lng: 127.0024, name: '드림시어터' },
  'FC001350': { lat: 37.5823, lng: 127.0017, name: '나온씨어터' },
  'FC001570': { lat: 37.5832, lng: 127.0011, name: '수현재씨어터' },
  'FC000408': { lat: 37.5811, lng: 127.0031, name: '자유소극장' },
  'FC001107': { lat: 37.5829, lng: 127.0010, name: '눈빛극장' },
  'FC001249': { lat: 37.5818, lng: 127.0028, name: '씨어터씨' },
  'FC003400': { lat: 37.5814, lng: 127.0026, name: '플러스씨어터' },
  'FC001540': { lat: 37.5845, lng: 127.0022, name: '예술공간혜화' },
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);
    const seenIds = new Set();
    const allPerfs = [];

    // 1. 공연장 코드로 직접 검색 (병렬)
    await Promise.all(Object.entries(KNOWN_VENUES).map(async ([code, venue]) => {
      try {
        const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&prfplccd=${code}&rows=100&cpage=1`;
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
              venue: venue.name || getTagValue(item, 'fcltynm'),
              venueCode: code,
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

    // 2. 키워드 검색으로 보완 (대학로, 혜화, 동숭)
    const keywords = [
      '%EB%8C%80%ED%95%99%EB%A1%9C',
      '%ED%98%9C%ED%99%94',
      '%EB%8F%99%EC%88%AD',
    ];
    for (const kw of keywords) {
      try {
        for (let page = 1; page <= 3; page++) {
          const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&shprfnmfct=${kw}&rows=100&cpage=${page}`;
          const xml = await fetchKopis(path);
          const items = parseXML(xml, 'db');
          if (!items.length) break;
          for (const item of items) {
            const id = getTagValue(item, 'mt20id');
            if (seenIds.has(id)) continue;
            const venueCode = getTagValue(item, 'mt10id');
            // 알려진 공연장이면 좌표 바로 사용
            let lat, lng;
            if (KNOWN_VENUES[venueCode]) {
              lat = KNOWN_VENUES[venueCode].lat;
              lng = KNOWN_VENUES[venueCode].lng;
            } else {
              const coords = await getVenueCoords(venueCode);
              if (!coords) continue;
              lat = coords.lat;
              lng = coords.lng;
            }
            seenIds.add(id);
            allPerfs.push({
              id,
              name: getTagValue(item, 'prfnm'),
              startDate: getTagValue(item, 'prfpdfrom'),
              endDate: getTagValue(item, 'prfpdto'),
              venue: getTagValue(item, 'fcltynm'),
              venueCode,
              genre: getTagValue(item, 'genrenm'),
              status: getTagValue(item, 'prfstate'),
              poster: getTagValue(item, 'poster'),
              lat,
              lng,
            });
          }
        }
      } catch(e) {}
    }

    res.status(200).json({
      success: true,
      total: allPerfs.length,
      data: allPerfs
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
