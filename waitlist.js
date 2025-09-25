// waitlist.js - handles waitlist form submission to Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const form = document.getElementById('waitlist-form');
const emailInput = document.getElementById('waitlist-email');
const statusEl = document.getElementById('waitlist-status');

function setStatus(msg, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = type === 'error' ? '#c91d2d' : '#0a3a82';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDotEnv(text) {
  const out = {};
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '');
    out[key] = val;
  });
  return out;
}

async function getConfig() {
  const cfg = { ...(window.ENV || {}) };
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    try {
      const resp = await fetch('.env', { cache: 'no-store' });
      if (resp.ok) {
        const txt = await resp.text();
        const env = parseDotEnv(txt);
        cfg.SUPABASE_URL = cfg.SUPABASE_URL || env.SUPABASE_URL;
        cfg.SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
        cfg.SUPABASE_TABLE = cfg.SUPABASE_TABLE || env.SUPABASE_TABLE || 'waitlist';
      }
    } catch (_) {
      // ignore
    }
  }
  cfg.SUPABASE_TABLE = cfg.SUPABASE_TABLE || 'waitlist';
  return cfg;
}

if (form && emailInput) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (emailInput.value || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      setStatus('Enter a valid email.');
      emailInput.focus();
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setStatus('Adding to waitlist...');

    const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_TABLE } = await getConfig();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus('Supabase is not configured.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from(SUPABASE_TABLE).insert([
      {
        email,
        source: 'website',
        user_agent: navigator.userAgent
      }
    ]);

    if (error) {
      if (error.code === '23505') {
        setStatus('You are already on the waitlist.');
      } else {
        console.error('Supabase insert error', error);
        setStatus('Failed to join waitlist. Try again.', 'error');
      }
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    setStatus('Added to waitlist. Check your inbox for updates soon!');
    form.reset();
    if (submitBtn) submitBtn.disabled = false;
  });
} else {
  console.warn('Waitlist form elements not found on page.');
}