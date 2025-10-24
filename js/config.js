// Supabase configuration - update to point at your project
// NOTE: These are the public/anon values for the client. Do NOT put the service_role key here.
// Service role key must remain server-side and should be rotated if it was exposed.
const SUPABASE_URL = 'https://jdvvwysqnqkricaxeptj.supabase.co';
// ANON PUBLIC KEY (safe for client-side):
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdnZ3eXNxbnFrcmljYXhlcHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjAwNzIsImV4cCI6MjA3Njg5NjA3Mn0.I0ApfpHy2eG29nm6Ee-kt-_HUolVyqgjJLrB4P-eVpM';

// Application-level encryption key (Base64-encoded 32 bytes).
// WARNING: For production, do NOT store this in client-side code. Move to a secure server / environment.
const SUPABASE_APP_KEY = 'REPLACE_WITH_BASE64_32_BYTE_KEY==';

// If you accidentally committed a service_role key, rotate it now in the Supabase dashboard.