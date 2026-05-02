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

// 알려진 코드 범위를 배치로 조회
async function scanVenueCodes(start, end, batchSize = 20) {
  const results = [];
  const codes = [];
  for (let i = start; i <= end; i++) {
    codes.push(`FC${String(i).padStart(6, '0')}`);
  }

  // 배치로 병렬 조회
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (code) => {
      try {
        const xml = await fetchKopis(`prfplc/${code}?service=${KOPIS_KEY}`);
        const item = parseXML(xml, 'db')[0] || '';
        if (!item) return null;
        const chartr = getTagValue(item, 'fcltychartr');
        if (!chartr.includes('대학로')) return null;
        const lat = parseFloat(getTagValue(item, 'la'));
        const lng = parseFloat(getTagValue(item, 'lo'));
        if (!lat || !lng) return null;
        return {
          code,
          name: getTagValue(item, 'fcltynm'),
          lat, lng, chartr
        };
      } catch(e) { return null; }
    }));
    results.push(...batchResults.filter(Boolean));
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const { from = 1000, to = 1600 } = req.query || {};

  try {
    const venues = await scanVenueCodes(parseInt(from), parseInt(to));
    res.status(200).json({
      success: true,
      scanned: parseInt(to) - parseInt(from) + 1,
      found: venues.length,
      venues
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
