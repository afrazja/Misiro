/**
 * Generate OG image for social sharing (1200x630).
 * Run: node scripts/generate-og-image.js
 * Output: static/og-image.jpg
 */

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ── Background gradient ──
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#1a1a2e');
bg.addColorStop(0.55, '#16213e');
bg.addColorStop(1, '#0f3460');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// ── Decorative blobs ──
ctx.globalAlpha = 0.08;
ctx.beginPath(); ctx.arc(1050, 80, 200, 0, Math.PI * 2); ctx.fillStyle = '#e94560'; ctx.fill();
ctx.beginPath(); ctx.arc(150, 550, 160, 0, Math.PI * 2); ctx.fillStyle = '#3498db'; ctx.fill();
ctx.beginPath(); ctx.arc(600, 600, 120, 0, Math.PI * 2); ctx.fillStyle = '#2ecc71'; ctx.fill();
ctx.globalAlpha = 1;

// ── Accent gradient helper ──
function accentGrad(x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#e94560');
  g.addColorStop(1, '#ff6b6b');
  return g;
}

// ── Brand ──
ctx.font = '900 56px Arial';
ctx.fillStyle = accentGrad(100, 400);
ctx.fillText('Mirifer', 100, 200);

// ── Title ──
ctx.font = '800 52px Arial';
ctx.fillStyle = '#ffffff';
ctx.fillText('Learn German Online', 100, 300);

ctx.fillStyle = accentGrad(100, 700);
ctx.fillText('Through Real Conversations', 100, 365);

// ── Features line ──
ctx.font = '400 24px Arial';
ctx.fillStyle = '#a0a0a0';
ctx.fillText('Voice Practice  |  Spaced Repetition  |  90+ Daily Lessons', 100, 440);

// ── CTA pill ──
const bx = 100, by = 480, bw = 260, bh = 50, br = 25;
ctx.fillStyle = accentGrad(bx, bx + bw);
// Manual rounded rect (roundRect may not exist in all versions)
ctx.beginPath();
ctx.moveTo(bx + br, by);
ctx.lineTo(bx + bw - br, by);
ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
ctx.lineTo(bx + bw, by + bh - br);
ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
ctx.lineTo(bx + br, by + bh);
ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
ctx.lineTo(bx, by + br);
ctx.arcTo(bx, by, bx + br, by, br);
ctx.closePath();
ctx.fill();

ctx.font = '700 20px Arial';
ctx.fillStyle = '#ffffff';
ctx.fillText('Start Free Today', bx + 50, by + 33);

// ── Bottom bar ──
ctx.fillStyle = accentGrad(0, W);
ctx.fillRect(0, H - 8, W, 8);

// ── Save as JPEG ──
const out = path.join(__dirname, '..', 'static', 'og-image.jpg');
const buf = canvas.toBuffer('image/jpeg');
fs.writeFileSync(out, buf);
console.log(`OG image saved: ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
