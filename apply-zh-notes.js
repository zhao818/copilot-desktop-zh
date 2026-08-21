#!/usr/bin/env node
// 一键把 skills-zh-notes.json 里的中文使用说明重放到本机技能目录(.agents/skills + .claude/skills)
// 用法: node apply-zh-notes.js   (幂等,已存在的说明块不会重复插入)
const fs = require('fs');
const path = require('path');
const MANIFEST = path.join(__dirname, 'skills-zh-notes.json');
const MARKER = '中文使用说明（速览）';
const DIRS = [
  path.join(process.env.USERPROFILE || '', '.agents', 'skills'),
  path.join(process.env.USERPROFILE || '', '.claude', 'skills')
];
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let total = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const [name, note] of Object.entries(manifest)) {
    const f = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes(MARKER)) continue;
    const block = '\n---\n\n> **📌 中文使用说明（速览）**\n>\n> **这个技能做什么**：' + note.what + '\n>\n> **怎么用**：' + note.how + '\n';
    const endIdx = c.indexOf('\n---', c.indexOf('---') + 3);
    if (endIdx < 0) continue;
    fs.writeFileSync(f, c.slice(0, endIdx + 4) + block + c.slice(endIdx + 4), 'utf8');
    total++;
    console.log('已添加: ' + name + ' (' + path.basename(dir) + ')');
  }
}
console.log('完成,新增 ' + total + ' 个说明块');