// Supabase Edge Function to proxy VirusTotal API requests
// This bypasses CORS restrictions by making requests from the server-side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY')!
const VIRUSTOTAL_BASE_URL = 'https://www.virustotal.com/api/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/virustotal-scan', '')

    // Route 1: POST /scan - Upload file for scanning
    if (path === '/scan' && req.method === 'POST') {
      const formData = await req.formData()
      
      // Forward the file to VirusTotal
      const response = await fetch(`${VIRUSTOTAL_BASE_URL}/files`, {
        method: 'POST',
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
        body: formData,
      })

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: response.status
        }
      )
    }

    // Route 2: GET /analysis/:id - Get scan results
    if (path.startsWith('/analysis/') && req.method === 'GET') {
      const analysisId = path.replace('/analysis/', '')
      
      const response = await fetch(`${VIRUSTOTAL_BASE_URL}/analyses/${analysisId}`, {
        method: 'GET',
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
      })

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: response.status
        }
      )
    }

    // Route 3: GET /file/:hash - Get file report by hash
    if (path.startsWith('/file/') && req.method === 'GET') {
      const fileHash = path.replace('/file/', '')
      
      const response = await fetch(`${VIRUSTOTAL_BASE_URL}/files/${fileHash}`, {
        method: 'GET',
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
      })

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: response.status
        }
      )
    }

    // Invalid route
    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    )

  } catch (error) {
    console.error('VirusTotal proxy error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
