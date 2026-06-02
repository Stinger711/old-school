import { send as ejsSend } from '@emailjs/browser';
import { EMAILJS, APP_URL }  from './config.js';

// ── Image compression (photos) ────────────────────────────────
export async function compressImage(file, maxPx = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
        if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg', quality
        );
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// ── PIN hashing (SHA-256 via Web Crypto) ──────────────────────
export async function hashPin(email, pin) {
  const raw  = email.toLowerCase().trim() + ':' + pin;
  const data = new TextEncoder().encode(raw);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Email notifications ───────────────────────────────────────
export async function notifyPeople(people, photoTitle, onProgress) {
  const results = [];
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    if (!person.email) continue;
    try {
      await ejsSend(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        { to_email: person.email, to_name: person.name || 'there',
          photo_title: photoTitle, app_url: APP_URL },
        EMAILJS.publicKey,
      );
      results.push({ ok: true, email: person.email });
    } catch {
      results.push({ ok: false, email: person.email });
    }
    if (onProgress) onProgress(i + 1, people.length);
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

// ── Date formatting ───────────────────────────────────────────
export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Touch device detection ────────────────────────────────────
export const isTouchDevice =
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;
