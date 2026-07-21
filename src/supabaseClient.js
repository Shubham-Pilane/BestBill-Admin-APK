import { createClient } from '@supabase/supabase-js';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vejvxpjswlmcsbfiqywp.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlanZ4cGpzd2xtY3NiZmlxeXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzI3NTMsImV4cCI6MjEwMDEwODc1M30.oliBQIW9k8TL_d5q73bza7tt-CSK34yY-prJrYTfcBI';

// Clear legacy cached bad URL if present in mobile localStorage
const storedUrl = localStorage.getItem('bb_supabase_url');
if (storedUrl && storedUrl.includes('vcjexpj')) {
  localStorage.removeItem('bb_supabase_url');
  localStorage.removeItem('bb_supabase_key');
}

const activeUrl = localStorage.getItem('bb_supabase_url') || defaultUrl;
const activeKey = localStorage.getItem('bb_supabase_key') || defaultKey;

export let supabase = (activeUrl && activeKey) 
  ? createClient(activeUrl, activeKey) 
  : null;

export function initSupabase(url = activeUrl, key = activeKey) {
  if (!url || !key) return null;
  localStorage.setItem('bb_supabase_url', url.trim());
  localStorage.setItem('bb_supabase_key', key.trim());
  supabase = createClient(url.trim(), key.trim());
  return supabase;
}

export function clearSupabaseSession() {
  localStorage.removeItem('bb_supabase_url');
  localStorage.removeItem('bb_supabase_key');
  localStorage.removeItem('bb_user_email');
  supabase = (defaultUrl && defaultKey) ? createClient(defaultUrl, defaultKey) : null;
}
