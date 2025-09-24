// env.js - runtime config for Supabase
// Fill with your Supabase project details
window.ENV = window.ENV || {};
window.ENV.SUPABASE_URL = window.ENV.SUPABASE_URL || '';
window.ENV.SUPABASE_ANON_KEY = window.ENV.SUPABASE_ANON_KEY || '';

if (!window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
  console.warn('Supabase ENV not configured. Set window.ENV.SUPABASE_URL and SUPABASE_ANON_KEY in env.js');
}