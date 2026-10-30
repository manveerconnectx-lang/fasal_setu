const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'outputs');

const markets = [
  { id: 'azadpur', name: 'Azadpur Mandi', distanceKm: 18, prices: { wheat: 2140, rice: 2780, mustard: 5950, sugarcane: 365, maize: 2110, potato: 1320, cotton: 6720, tomato: 1850 }, transportCost: 320 },
  { id: 'narela', name: 'Narela Mandi', distanceKm: 26, prices: { wheat: 2180, rice: 2720, mustard: 6010, sugarcane: 372, maize: 2150, potato: 1380, cotton: 6800, tomato: 1920 }, transportCost: 560 },
  { id: 'sonipat', name: 'Sonipat Mandi', distanceKm: 35, prices: { wheat: 2205, rice: 2810, mustard: 5880, sugarcane: 358, maize: 2080, potato: 1290, cotton: 6650, tomato: 1790 }, transportCost: 760 }
];

const transportTrips = [
  { id: 'azadpur-1530', marketId: 'azadpur', departure: 'Today, 3:30 PM', capacityTons: 100, vehicle: 'DL 1L 4728', pricePerQuintal: 80, capacityQuintals: 1000, bookedQuintals: 580, farmers: 3 },
  { id: 'azadpur-1630', marketId: 'azadpur', departure: 'Today, 4:30 PM', capacityTons: 200, vehicle: 'DL 1M 8391', pricePerQuintal: 80, capacityQuintals: 2000, bookedQuintals: 1140, farmers: 5 },
  { id: 'azadpur-1730', marketId: 'azadpur', departure: 'Today, 5:30 PM', capacityTons: 300, vehicle: 'DL 1N 6520', pricePerQuintal: 80, capacityQuintals: 3000, bookedQuintals: 1620, farmers: 8 }
];

function send(res, status, data, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(contentType.startsWith('application/json') ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body')); } });
    req.on('error', reject);
  });
}

function getCrop(url) { return (url.searchParams.get('crop') || 'wheat').toLowerCase(); }
function marketResult(market, crop, quantity) {
  const price = market.prices[crop];
  if (!price) return null;
  return { id: market.id, name: market.name, distanceKm: market.distanceKm, pricePerQuintal: price, transportCost: market.transportCost, grossPayout: price * quantity, netPayout: price * quantity - market.transportCost };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const { phone, password } = await readBody(req);
      if (!/^\d{10}$/.test(String(phone || ''))) return send(res, 400, { error: 'Enter a valid 10-digit mobile number' });
      if (!String(password || '').trim()) return send(res, 400, { error: 'Enter your password' });
      return send(res, 200, { user: { name: 'Ramesh Kumar', phone: String(phone), village: 'Bawana, Delhi' }, token: 'demo-session-fasalsetu' });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok', service: 'FasalSetu API' });

  if (req.method === 'GET' && url.pathname === '/api/markets') {
    const crop = getCrop(url); const quantity = Math.max(1, Number(url.searchParams.get('quantity')) || 40);
    const result = markets.map(m => marketResult(m, crop, quantity)).filter(Boolean).sort((a, b) => b.netPayout - a.netPayout);
    if (!result.length) return send(res, 400, { error: `No price data for crop: ${crop}` });
    return send(res, 200, { crop, quantityQuintals: quantity, updatedAt: new Date().toISOString(), markets: result, bestMarketId: result[0].id });
  }

  if (req.method === 'POST' && url.pathname === '/api/profit-estimate') {
    try {
      const { crop = 'wheat', quantityQuintals = 40, marketId } = await readBody(req);
      const market = markets.find(m => m.id === marketId) || markets[0];
      const estimate = marketResult(market, String(crop).toLowerCase(), Number(quantityQuintals));
      if (!estimate) return send(res, 400, { error: 'Unsupported crop' });
      return send(res, 200, { crop, quantityQuintals, ...estimate, message: 'Net payout includes the estimated transport cost.' });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/transport') {
    return send(res, 200, { trips: transportTrips.map(trip => ({ ...trip, availableQuintals: trip.capacityQuintals - trip.bookedQuintals, market: markets.find(m => m.id === trip.marketId)?.name })) });
  }

  const leaveMatch = url.pathname.match(/^\/api\/transport\/([^/]+)\/leave$/);
  if (req.method === 'POST' && leaveMatch) {
    try {
      const trip = transportTrips.find(t => t.id === leaveMatch[1]);
      if (!trip) return send(res, 404, { error: 'Pickup not found' });
      const { quantityQuintals = 1 } = await readBody(req);
      const quantity = Number(quantityQuintals);
      if (!Number.isFinite(quantity) || quantity <= 0) return send(res, 400, { error: 'Quantity must be greater than zero' });
      trip.bookedQuintals = Math.max(0, trip.bookedQuintals - quantity); trip.farmers = Math.max(0, trip.farmers - 1);
      return send(res, 200, { message: 'Pickup reservation cancelled', trip });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  const joinMatch = url.pathname.match(/^\/api\/transport\/([^/]+)\/join$/);
  if (req.method === 'POST' && joinMatch) {
    try {
      const trip = transportTrips.find(t => t.id === joinMatch[1]);
      if (!trip) return send(res, 404, { error: 'Pickup not found' });
      const { quantityQuintals = 1, farmerName = 'Farmer' } = await readBody(req);
      const quantity = Number(quantityQuintals);
      if (!Number.isFinite(quantity) || quantity <= 0) return send(res, 400, { error: 'Quantity must be greater than zero' });
      if (trip.bookedQuintals + quantity > trip.capacityQuintals) return send(res, 409, { error: 'Not enough space on this pickup' });
      trip.bookedQuintals += quantity; trip.farmers += 1;
      return send(res, 201, { message: `Pickup reserved for ${farmerName}`, reservation: { tripId: trip.id, quantityQuintals: quantity, transportCost: quantity * trip.pricePerQuintal }, trip });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/login')) {
    const fileName = url.pathname === '/login' ? 'login.html' : 'index.html';
    return fs.readFile(path.join(publicDir, fileName), (error, file) => error ? send(res, 404, { error: 'Frontend not found' }) : send(res, 200, file, 'text/html; charset=utf-8'));
  }
  return send(res, 404, { error: 'Route not found' });
});

server.listen(PORT, () => console.log(`FasalSetu running at http://localhost:${PORT}`));





