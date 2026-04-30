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

const VENUE_NAME_COORDS = [
  { keys: ['아르코'],        lat: 37.5824, lng: 127.0018 },
  { keys: ['대학로예술'],    lat: 37.5820, lng: 127.0025 },
  { keys: ['혜화동1번지'],   lat: 37.5836, lng: 127.0013 },
  { keys: ['동숭아트'],      lat: 37.5815, lng: 127.0030 },
  { keys: ['학전'],          lat: 37.5830, lng: 127.0008 },
  { keys: ['예술공간 혜화'], lat: 37.5845, lng: 127.0022 },
  { keys: ['선돌'],          lat: 37.5808, lng: 127.0040 },
  { keys: ['스튜디오76'],    lat: 37.5810, lng: 127.0015 },
  { keys: ['홍익'],          lat: 37.5840, lng: 127.0035 },
  { keys: ['마로니에'],      lat: 37.5826, lng: 127.0020 },
  { keys: ['씨어터'],        lat: 37.5818, lng: 127.0028 },
  { keys: ['산울림'],        lat: 37.5822, lng: 127.0016 },
  { keys: ['게릴라'],        lat: 37.5812, lng: 127.0032 },
  { keys: ['연우'],          lat: 37.5828, lng: 127.0019 },
  { keys: ['알과핵'],        lat: 37.5814, lng: 127.0027 },
  { keys: ['수현재'],        lat: 37.5832, lng: 127.0011 },
  { keys: ['쁘띠'],          lat: 37.5821, lng: 127.0033 },
];

const venueCache = {};

async function getVenueCoords(venueCode, venueName) {
  if (venueCache[venueCode]) return venueCache[venueCode];

  if (venueName) {
    for (const v of VENUE_NAME_COORDS) {
      if (v.keys.some(k => venueName.includes(k))) return { lat: v.lat, lng: v.lng };
    }
  }

  if (venueCode) {
    try {
      const xml = await fetchKopis(`prfplc/${venueCode}?service=${KOPIS_KEY}`);
      const item = parseXML(xml, 'db')[0] || '';
      const lat = parseFloat(getTagValue(item, 'la'));
      const lng = parseFloat(getTagValue(item, 'lo'));
      if (lat && lng) {
        venueCache[venueCode] = { lat, lng };
        return { lat, lng };
      }
    } catch (e) {}
  }

  return {
    lat: 37.5825 + (Math.random() - 0.5) * 0.005,
    lng: 127.0020 + (Math.random() - 0.5) * 0.005,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);
    const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&signgucode=11110&rows=50&cpage=1`;
    const xml = await fetchKopis(path);
    const items = parseXML(xml, 'db');

    if (!items.length) return res.status(200).json({ success: true, data: [] });

    const perfs = items.map(item => ({
      id: getTagValue(item, 'mt20id'),
      name: getTagValue(item, 'prfnm'),
      startDate: getTagValue(item, 'prfpdfrom'),
      endDate: getTagValue(item, 'prfpdto'),
      venue: getTagValue(item, 'fcltynm'),
      venueCode: getTagValue(item, 'mt10id'),
      genre: getTagValue(item, 'genrenm'),
      status: getTagValue(item, 'prfstate'),
      poster: getTagValue(item, 'poster'),
    }));

    const withCoords = await Promise.all(
      perfs.map(async p => {
        const coords = await getVenueCoords(p.venueCode, p.venue);
        return { ...p, ...coords };
      })
    );

    res.status(200).json({ success: true, data: withCoords });
  } catch (e) {
    console.error('API Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};
