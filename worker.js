const SYMBOLS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];
const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"public, max-age=300", "access-control-allow-origin":"*" }});
function ema(values, period) { if (values.length < period) return null; const k=2/(period+1); let v=values.slice(0,period).reduce((a,b)=>a+b,0)/period; for(let i=period;i<values.length;i++) v=values[i]*k+v*(1-k); return v; }
function rsi(values, period=14) { if(values.length<=period)return null;let gains=0,losses=0;for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>0)gains+=d;else losses-=d;}let ag=gains/period,al=losses/period;for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];ag=((ag*(period-1))+Math.max(0,d))/period;al=((al*(period-1))+Math.max(0,-d))/period;}return al===0?100:100-(100/(1+ag/al));}
function macd(values){if(values.length<35)return null;const line=[];for(let i=25;i<values.length;i++)line.push(ema(values.slice(0,i+1),12)-ema(values.slice(0,i+1),26));const signal=ema(line,9);return {line:line[line.length-1],signal};}
function analyze(symbol, values, time){const e9=ema(values,9),e21=ema(values,21),r=rsi(values),m=macd(values);if(e9===null||e21===null||r===null||!m)return null;const up=e9>e21,down=e9<e21,macdUp=m.line>m.signal,macdDown=m.line<m.signal;const buy=up&&macdUp&&r>=50&&r<=68;const sell=down&&macdDown&&r>=32&&r<=50;if(!buy&&!sell)return null;const direction=buy?'BUY':'SELL';return {symbol,market:'Forex',direction,timeframe:'5m',price:values[values.length-1].toFixed(symbol.includes('JPY')?3:5),rsi:r.toFixed(1),trend:up?'Bullish':'Bearish',score:3,updated:time,note:'EMA + MACD + RSI aligned',entry:values[values.length-1].toFixed(symbol.includes('JPY')?3:5),sl:(values[values.length-1]*(buy?0.998:1.002)).toFixed(symbol.includes('JPY')?3:5),tp:(values[values.length-1]*(buy?1.004:0.996)).toFixed(symbol.includes('JPY')?3:5)};}
export async function onRequest({request, env}) {
  if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'content-type'}});
  if(!env.TWELVEDATA_API_KEY)return json({error:'Twelve Data API key is not configured. Add TWELVEDATA_API_KEY in Pages environment variables.'},503);
  const cacheKey=new Request(new URL('/api/signals-cached',request.url).toString());
  try {
    if(typeof caches!=='undefined'&&caches.default){const hit=await caches.default.match(cacheKey);if(hit)return hit;}
    const results=await Promise.all(SYMBOLS.map(async symbol=>{
      const url=new URL('https://api.twelvedata.com/time_series');url.searchParams.set('symbol',symbol);url.searchParams.set('interval','5min');url.searchParams.set('outputsize','100');url.searchParams.set('apikey',env.TWELVEDATA_API_KEY);
      const res=await fetch(url.toString());const body=await res.json();if(!res.ok||body.status==='error'||!Array.isArray(body.values))return {error:body.message||`No data for ${symbol}`};
      const candles=body.values.slice().reverse();const closes=candles.map(x=>Number(x.close)).filter(Number.isFinite);return {symbol,closes};
    }));
    const now=new Date().toISOString();const signals=[];const errors=[];
    for(const row of results){if(row.error){errors.push(row.error);continue;}const s=analyze(row.symbol,row.closes,now);if(s){signals.push(s);signals.push({...s,market:'Binary',direction:s.direction==='BUY'?'CALL':'PUT',timeframe:'5m expiry',sl:null,tp:null,note:'Directional setup only; binary result not guaranteed'});}}
    const response=json({signals,updatedAt:now,warning:errors.length?errors.join('; '):null});
    if(typeof caches!=='undefined'&&caches.default){const cached=new Response(response.body,{status:response.status,headers:response.headers});await caches.default.put(cacheKey,cached.clone());return cached;}
    return response;
  } catch(e){return json({error:'Market data request failed. Try again later.'},502);}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/signals") {
      return onRequest({ request, env });
    }
    return env.ASSETS.fetch(request);
  },
};
