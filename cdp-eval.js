
const fs = require('fs');
const http = require('http');
function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
async function main() {
  const exprFile = process.argv[2];
  const outFile = process.argv[3];
  const expression = fs.readFileSync(exprFile, 'utf8');
  const page = (await getTargets()).find(t => t.type === 'page');
  if (!page) { console.log('NO PAGE'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const res = await new Promise(resolve => {
    const myId = ++id; pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
  });
  const val = res.result && res.result.result ? res.result.result.value : (res.result && res.result.result && res.result.result.description) || JSON.stringify(res);
  if (outFile) { fs.writeFileSync(outFile, typeof val === 'string' ? val : JSON.stringify(val, null, 2)); console.log('saved ' + outFile); }
  else { console.log(typeof val === 'string' ? val : JSON.stringify(val, null, 2)); }
  ws.close(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
