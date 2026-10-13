const FOREX_TIMEFRAMES = [
  { interval: '5min', label: '5m' },
  { interval: '15min', label: '15m' },
  { interval: '30min', label: '30m' },
  { interval: '1h', label: '1h' },
  { interval: '4h', label: '4h' },
];
// These are reference-market symbols only. Twelve Data does not provide Olymp Trade's OTC feed.
const BINARY_REFERENCE_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'NZD/USD', 'USD/CAD'];
const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'public, max-age=120', 'access-control-allow-origin':'*' }});
function ema(values, period) { if(values.length<period)return null;const k=2/(period+1);let v=values.slice(0,period).reduce((a,b)=>a+b,0)/period;for(let i=period;i<values.length;i++)v=values[i]*k+v*(1-k);return v; }
function rsi(values, period=14) { if(values.length<=period)return null;let gains=0,losses=0;for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>0)gains+=d;else losses-=d;}let ag=gains/period,al=losses/period;for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];ag=(ag*(period-1)+Math.max(0,d))/period;al=(al*(period-1)+Math.max(0,-d))/period;}return al===0?100:100-(100/(1+ag/al)); }
function macd(values){if(values.length<35)return null;const line=[];for(let i=25;i<values.length;i++)line.push(ema(values.slice(0,i+1),12)-ema(values.slice(0,i+1),26));const signal=ema(line,9);return {line:line[line.length-1],signal};}
function analyze(symbol, values, time, market, timeframe) {const e9=ema(values,9),e21=ema(values,21),r=rsi(values),m=macd(values);if(e9===null||e21===null||r===null||!m)return null;const up=e9>e21,down=e9<e21,macdUp=m.line>m.signal,macdDown=m.line<m.signal;const buy=up&&macdUp&&r>=50&&r<=68;const sell=down&&macdDown&&r>=32&&r<=50;if(!buy&&!sell)return null;const direction=buy?'BUY':'SELL';const price=values[values.length-1];const decimals=symbol.includes('JPY')?3:(symbol==='XAU/USD'?2:5);const fmt=n=>Number(n).toFixed(decimals);return {symbol,market,direction,timeframe,price:fmt(price),rsi:r.toFixed(1),trend:up?'Bullish':'Bearish',score:3,updated:time,note:market==='Forex'?'Gold only · EMA + MACD + RSI aligned':'Reference-market direction only; not matched to Olymp Trade OTC prices',entry:market==='Forex'?fmt(price):null,sl:market==='Forex'?fmt(price*(buy?0.998:1.002)):null,tp:market==='Forex'?fmt(price*(buy?1.004:0.996)):null};}
async function candles(symbol, interval, env) {const url=new URL('https://api.twelvedata.com/time_series');url.searchParams.set('symbol',symbol);url.searchParams.set('interval',interval);url.searchParams.set('outputsize','100');url.searchParams.set('apikey',env.TWELVEDATA_API_KEY);const res=await fetch(url.toString());const body=await res.json();if(!res.ok||body.status==='error'||!Array.isArray(body.values))throw new Error(body.message||`No data for ${symbol} (${interval})`);return body.values.slice().reverse().map(x=>Number(x.close)).filter(Number.isFinite);}
export async function onRequest({request, env}) {
 if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'content-type'}});
 if(!env.TWELVEDATA_API_KEY)return json({error:'Twelve Data API key is not configured. Add TWELVEDATA_API_KEY in Pages environment variables.'},503);
 try {
  const now=new Date().toISOString();const signals=[];const errors=[];
  // Forex section: XAU/USD (gold) only, across the requested timeframes.
  const goldRows=await Promise.all(FOREX_TIMEFRAMES.map(async tf=>{try{return {tf,closes:await candles('XAU/USD',tf.interval,env)};}catch(e){return {tf,error:e.message};}}));
  for(const row of goldRows){if(row.error){errors.push(row.error);continue;}const s=analyze('XAU/USD',row.closes,now,'Forex',row.tf.label);if(s)signals.push(s);}
  // Binary section: broad reference-market CALL/PUT setups. These are NOT broker OTC prices.
  const binaryRows=await Promise.all(BINARY_REFERENCE_SYMBOLS.map(async symbol=>{try{return {symbol,closes:await candles(symbol,'5min',env)};}catch(e){return {symbol,error:e.message};}}));
  for(const row of binaryRows){if(row.error){errors.push(row.error);continue;}const s=analyze(row.symbol,row.closes,now,'Binary OTC (reference feed)','5m expiry');if(s)signals.push({...s,direction:s.direction==='BUY'?'CALL':'PUT',sl:null,tp:null,entry:null});}
  return json({signals,updatedAt:now,warning:errors.length?errors.join('; '):null,otcNotice:'Binary signals use standard reference-market data, not Olymp Trade OTC feed. Confirm the OTC chart before any trade.'});
 } catch(e){return json({error:'Market data request failed. Try again later.'},502);}
}
