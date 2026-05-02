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
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
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

function isHyehwa(lat, lng) {
  return lat >= 37.576 && lat <= 37.592 && lng >= 126.995 && lng <= 127.012;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const from = parseInt((req.query || {}).from || 1000);
  const to = parseInt((req.query || {}).to || 1200);

  const codes = [];
  for (let i = from; i <= to; i++) {
    codes.push(`FC${String(i).padStart(6, '0')}`);
  }

  // 50개씩 배치로 처리
  const BATCH = 50;
  const venues = [];
  for (let i = 0; i < codes.length; i += BATCH) {
    const batch = codes.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (code) => {
      try {
        const xml = await fetchKopis(`prfplc/${code}?service=${KOPIS_KEY}`);
        const item = parseXML(xml, 'db')[0] || '';
        if (!item) return null;
        const lat = parseFloat(getTagValue(item, 'la'));
        const lng = parseFloat(getTagValue(item, 'lo'));
        if (!isHyehwa(lat, lng)) return null;
        return { code, name: getTagValue(item, 'fcltynm'), lat, lng };
      } catch(e) { return null; }
    }));
    venues.push(...results.filter(Boolean));
  }

  res.status(200).json({ success: true, range: `${from}~${to}`, found: venues.length, venues });
};
