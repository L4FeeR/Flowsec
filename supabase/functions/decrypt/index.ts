import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function importAppKey(base64Key) {
  const raw = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body = await req.json();
    const ciphertext = body.ciphertext;
    const ivBase64 = body.iv;
    if (!ciphertext || !ivBase64) return new Response(JSON.stringify({ error: 'missing ciphertext or iv' }), { status: 400 });

    const appKey = Deno.env.get('SUPABASE_APP_KEY');
    if (!appKey) return new Response(JSON.stringify({ error: 'app key not configured' }), { status: 500 });

    const key = await importAppKey(appKey);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const encrypted = base64ToArrayBuffer(ciphertext);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    const plaintext = new TextDecoder().decode(decrypted);

    return new Response(JSON.stringify({ plaintext }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
