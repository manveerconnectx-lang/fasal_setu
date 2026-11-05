const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'docs');

const markets = [
  { id: 'azadpur', name: 'Azadpur Mandi', distanceKm: 18, prices: { wheat: 2140, rice: 2780, mustard: 5950, sugarcane: 365, maize: 2110, potato: 1320, cotton: 6720, tomato: 1850 } },
  { id: 'narela', name: 'Narela Mandi', distanceKm: 26, prices: { wheat: 2180, rice: 2720, mustard: 6010, sugarcane: 372, maize: 2150, potato: 1380, cotton: 6800, tomato: 1920 } },
  { id: 'sonipat', name: 'Sonipat Mandi', distanceKm: 35, prices: { wheat: 2205, rice: 2810, mustard: 5880, sugarcane: 358, maize: 2080, potato: 1290, cotton: 6650, tomato: 1790 } }
];
const vehicles = [
  { id: 'tuktuk', label: 'Tuk-tuk / Auto', capacityKg: 500, baseFee: 45, perKm: 9, eta: '35–50 min', ideal: 'Small pesticide orders', icon: '🛺' },
  { id: 'mini-truck', label: 'Mini truck', capacityKg: 1500, baseFee: 90, perKm: 14, eta: '60–90 min', ideal: 'Up to 1.5 tonnes', icon: '🚚' },
  { id: 'truck', label: 'Full truck', capacityKg: 6000, baseFee: 180, perKm: 22, eta: '2–3 hours', ideal: 'Bulk farm supplies', icon: '🚛' }
];
const pesticides = [
  { id: 'neem', name: 'Neem Guard Bio-pesticide', category: 'Organic', price: 320, unit: '1 L', badge: 'Low toxicity' }, { id: 'fungi', name: 'CropShield Fungicide', category: 'Fungicide', price: 540, unit: '500 g', badge: 'Best seller' }, { id: 'insect', name: 'Kisan Insect Control', category: 'Insecticide', price: 460, unit: '1 L', badge: 'For sucking pests' }, { id: 'weed', name: 'FieldClear Weed Control', category: 'Herbicide', price: 690, unit: '1 L', badge: 'Post-emergence' }, { id: 'micro', name: 'Micro Nutrient Mix', category: 'Plant health', price: 385, unit: '1 kg', badge: 'Crop booster' }, { id: 'trap', name: 'Pheromone Trap Pack', category: 'Organic', price: 275, unit: '10 traps', badge: 'Chemical-free' }
];
function send(res, status, data, type = 'application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }); res.end(type.includes('json') ? JSON.stringify(data) : data); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
const fee = (v, km) => v.baseFee + v.perKm * Math.max(1, Number(km) || 1);
function result(m, crop, qty) { const price = m.prices[crop]; if (!price) return null; const transportCost = fee(vehicles[1], m.distanceKm); return { id: m.id, name: m.name, distanceKm: m.distanceKm, pricePerQuintal: price, transportCost, grossPayout: price * qty, netPayout: price * qty - transportCost }; }

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/markets') { const crop = (url.searchParams.get('crop') || 'wheat').toLowerCase(); const qty = Math.max(.1, Number(url.searchParams.get('quantity')) || 40); const list = markets.map(m => result(m, crop, qty)).filter(Boolean).map(m => ({ ...m, liveChange: Math.floor(Math.random() * 41) - 15 })).sort((a, b) => b.netPayout - a.netPayout); return list.length ? send(res, 200, { updatedAt: new Date().toISOString(), markets: list }) : send(res, 400, { error: 'Crop not available yet' }); }
  if (req.method === 'POST' && url.pathname === '/api/profit-estimate') { try { const d = await body(req), r = result(markets.find(m => m.id === d.marketId) || markets[0], String(d.crop || 'wheat').toLowerCase(), Number(d.quantityQuintals) || 1); if (!r) return send(res, 400, { error: 'Crop not available' }); const growingCost = Number(d.growingCost) || 0, profit = r.netPayout - growingCost; return send(res, 200, { ...r, growingCost, profit, marginPercent: Math.round(profit / r.grossPayout * 1000) / 10 }); } catch (e) { return send(res, 400, { error: e.message }); } }
  if (req.method === 'GET' && url.pathname === '/api/vehicles') { const km = Number(url.searchParams.get('distanceKm')) || 8, kg = Number(url.searchParams.get('weightKg')) || 1; return send(res, 200, { vehicles: vehicles.filter(v => kg <= v.capacityKg).map(v => ({ ...v, price: fee(v, km) })) }); }
  if (req.method === 'GET' && url.pathname === '/api/pesticides') return send(res, 200, { pesticides });
  if (req.method === 'POST' && url.pathname === '/api/deliveries') { try { const d = await body(req), p = pesticides.find(x => x.id === d.pesticideId), v = vehicles.find(x => x.id === d.vehicleId); if (!p || !v) return send(res, 400, { error: 'Choose a pesticide and vehicle' }); const deliveryFee = fee(v, d.distanceKm), total = deliveryFee + p.price * Math.max(1, Number(d.quantity) || 1); return send(res, 201, { bookingId: `FS-${Date.now().toString(36).toUpperCase()}`, pesticide: p, vehicle: v.label, deliveryFee, total, eta: v.eta }); } catch (e) { return send(res, 400, { error: e.message }); } }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return fs.readFile(path.join(publicDir, 'index.html'), (e, file) => e ? send(res, 404, { error: 'Frontend not found' }) : send(res, 200, file, 'text/html; charset=utf-8'));
  return send(res, 404, { error: 'Route not found' });
}).listen(PORT, () => console.log(`FasalSetu running at http://localhost:${PORT}`));
