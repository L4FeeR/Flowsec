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
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt']);
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body = await req.json();
    const message = body.message;
    if (!message) return new Response(JSON.stringify({ error: 'missing message' }), { status: 400 });

    const appKey = Deno.env.get('SUPABASE_APP_KEY');
    if (!appKey) return new Response(JSON.stringify({ error: 'app key not configured' }), { status: 500 });

    const key = await importAppKey(appKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    return new Response(JSON.stringify({ ciphertext: arrayBufferToBase64(encrypted), iv: arrayBufferToBase64(iv.buffer) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
