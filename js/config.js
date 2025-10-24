// Supabase configuration - update to point at your Supabase project
// NOTE: These are public/anon values for the client; do NOT commit service_role key here.
const SUPABASE_URL = 'https://xqgaheblnueignmymdhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ2FoZWJsbnVlaWdubXltZGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjQxNjUsImV4cCI6MjA3NjkwMDE2NX0.eq4xr2d6D-H7TAuV4KVvCDnHb-3_UtW0WDKHo-gnI8I';

// VirusTotal API Configuration
const VIRUSTOTAL_API_KEY = '8a2a9809b18ab04dc168df26000af4490beeaf2d4a42e1b90f1989b23d2bb630';

// Application-level encryption key (Base64-encoded 32 bytes).
// WARNING: For production, do NOT store this in client-side code. Move to a secure server / environment.
const SUPABASE_APP_KEY = ''; // Generate using: openssl rand -base64 32