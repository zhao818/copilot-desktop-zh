// GitHub Copilot 桌面端中文汉化注入器 v7 (WebView2 CDP)
const fs = require('fs');
const path = require('path');
const http = require('http');
const DICT_PATH = path.join(__dirname, 'dictionary.json');

function buildPayload() {
  const DICT = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  return "(() => {" +
    "const DICT = " + JSON.stringify(DICT) + ";" +
    "const textRes = (DICT.textPatterns || []).map(([p, r, f]) => [new RegExp(p, f), r]);" +
    "const attrRes = (DICT.attrPatterns || []).map(([p, r, f]) => [new RegExp(p, f), r]);" +
    "const wholeEls = DICT.wholeElements || {};" +
    "const SAMPLE_RE = /^(.+)\\. Creates a sample project\\.$/;" +
    "const CHAT_RE = /^Chat: (.+)$/" + ";" +
    "const apply = () => {" +
    "  try {" +
    "    let replaced = 0;" +
    "    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);" +
    "    let n;" +
    "    while (n = walker.nextNode()) {" +
    "      const parent = n.parentElement;" +
    "      if (!parent || parent.closest('pre, code, script, style, textarea, [contenteditable=\"true\"]')) continue;" +
    "      const t = n.textContent.trim();" +
    "      if (!t || t.length > 400 || t.length < 2) continue;" +
    "      if (DICT.texts[t] !== undefined) {" +
    "        if (n.nodeValue.trim() !== DICT.texts[t]) { n.nodeValue = DICT.texts[t]; replaced++; }" +
    "        continue;" +
    "      }" +
    "      let tcount = 0, s = parent.firstChild;" +
    "      while (s) { if (s.nodeType === 3 && s.textContent.trim()) tcount++; s = s.nextSibling; }" +
    "      if (tcount > 1) continue;" +
    "      for (let i = 0; i < textRes.length; i++) {" +
    "        if (textRes[i][0].test(t)) {" +
    "          const v = t.replace(textRes[i][0], textRes[i][1]);" +
    "          if (n.nodeValue !== v) { n.nodeValue = v; replaced++; }" +
    "          break;" +
    "        }" +
    "      }" +
    "    }" +
    "    document.querySelectorAll('body *').forEach(el => {" +
    "      if (el.children.length > 0) return;" +
    "      const tn = [...el.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim());" +
    "      if (tn.length < 2) return;" +
    "      const full = el.textContent.trim();" +
    "      if (wholeEls[full] !== undefined && el.textContent !== wholeEls[full]) { el.textContent = wholeEls[full]; replaced++; return; }" +
    "      const cm = CHAT_RE.exec(full);" +
    "      if (cm) { const title = DICT.texts[cm[1]] !== undefined ? DICT.texts[cm[1]] : cm[1]; const target = '聊天: ' + title; if (el.textContent !== target) { el.textContent = target; replaced++; } return; }" +
    "    });" +
    "    document.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(el => {" +
    "      ['placeholder','aria-label','title','alt'].forEach(a => {" +
    "        const v = el.getAttribute(a);" +
    "        if (!v) return;" +
    "        if (DICT.attrs[v] !== undefined) { el.setAttribute(a, DICT.attrs[v]); return; }" +
    "        const sm = SAMPLE_RE.exec(v);" +
    "        if (sm && DICT.texts[sm[1]] !== undefined) { el.setAttribute(a, DICT.texts[sm[1]] + '。创建示例项目。'); return; }" +
    "        for (let i = 0; i < attrRes.length; i++) { if (attrRes[i][0].test(v)) { el.setAttribute(a, v.replace(attrRes[i][0], attrRes[i][1])); break; } }" +
    "      });" +
    "    });" +
    "    if (document.title === 'GitHub Copilot') document.title = 'GitHub Copilot 中文版';" +
    "    return 'replaced:' + replaced;" +
    "  } catch (e) { return 'ERR:' + e.message; }" +
    "};" +
    "const res = apply();" +
    "if (!window.__copilotZhInstalled) {" +
    "  if (window.__copilotZhObs) { try { window.__copilotZhObs.disconnect(); } catch (e) {} }" +
    "  if (window.__copilotZhTimer) { clearInterval(window.__copilotZhTimer); }" +
    "  const mo = new MutationObserver(() => { clearTimeout(window.__copilotZhDbt); window.__copilotZhDbt = setTimeout(apply, 200); });" +
    "  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label','placeholder','title','alt'] });" +
    "  window.__copilotZhObs = mo;" +
    "  window.__copilotZhTimer = setInterval(apply, 1200);" +
    "  window.__copilotZhInstalled = true;" +
    "}" +
    "return res;" +
    "})()";
}

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

function injectOnce(wsUrl, payload) {
  return new Promise((resolve) => {
    let ws;
    try { ws = new WebSocket(wsUrl); } catch (e) { resolve('wserr'); return; }
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} resolve('timeout'); }, 8000);
    ws.onopen = () => { ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: payload, returnByValue: true } })); };
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.id === 1) {
          const v = m.result && m.result.result && m.result.result.value;
          clearTimeout(timer); ws.close();
          resolve(v || 'no-return');
        }
      } catch (err) { }
    };
    ws.onerror = () => { clearTimeout(timer); try { ws.close(); } catch (e) {} resolve('wserror'); };
    ws.onclose = () => { clearTimeout(timer); resolve('wsclosed'); };
  });
}

async function loop() {
  let lastLog = 0;
  while (true) {
    const payload = buildPayload();
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page');
    if (page && page.webSocketDebuggerUrl) {
      const r = await injectOnce(page.webSocketDebuggerUrl, payload);
      const now = Date.now();
      if (now - lastLog > 10000) { console.log('[copilot-zh] ' + new Date().toLocaleTimeString() + ' apply: ' + r); lastLog = now; }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}
console.log('[copilot-zh] 汉化注入器 v7 已启动');
loop().catch(e => { console.error(e); process.exit(1); });