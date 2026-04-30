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
    http.get(reqUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function getTagValue(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}>([\\s\\S]*?)<\/${tag}>`));
  if (!m) return '';
  return (m[1] || m[2] || '').trim();
}

function parseXML(xml, tag) {
  const results = [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, 'g');
  let match;
  while ((match = regex.exec(xml)) !== null) results.push(match[1]);
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const stdate = getDateStr(0);
    const eddate = getDateStr(2);
    // 종로구(11110) = 대학로/혜화 포함
    const path = `pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&signgucode=11110&rows=100&cpage=1`;
    const xml = await fetchKopis(path);
    const items = parseXML(xml, 'db');

    const perfs = items.map(item => ({
      id: getTagValue(item, 'mt20id'),
      name: getTagValue(item, 'prfnm'),
      startDate: getTagValue(item, 'prfpdfrom'),
      endDate: getTagValue(item, 'prfpdto'),
      venue: getTagValue(item, 'fcltynm'),
      genre: getTagValue(item, 'genrenm'),
      status: getTagValue(item, 'prfstate'),
      poster: getTagValue(item, 'poster'),
      area: getTagValue(item, 'area'),
    }));

    // 공연장 좌표 병렬 조회 (상위 30개만, 속도 위해)
    const top = perfs.slice(0, 30);
    const rest = perfs.slice(30);

    const withCoords = await Promise.all(top.map(async (p) => {
      try {
        const detailXml = await fetchKopis(`pblprfr/${p.id}?service=${KOPIS_KEY}`);
        const detailItem = parseXML(detailXml, 'db')[0] || '';
        const venueCode = getTagValue(detailItem, 'mt10id');
        if (!venueCode) return p;
        const venueXml = await fetchKopis(`prfplc/${venueCode}?service=${KOPIS_KEY}`);
        const venueItem = parseXML(venueXml, 'db')[0] || '';
        const lat = parseFloat(getTagValue(venueItem, 'la')) || null;
        const lng = parseFloat(getTagValue(venueItem, 'lo')) || null;
        return { ...p, lat, lng };
      } catch { return p; }
    }));

    res.status(200).json({ success: true, data: [...withCoords, ...rest] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
