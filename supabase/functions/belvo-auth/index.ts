import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const BELVO_ID  = 'b1c99559-5abb-4537-9293-bb6db898227c'
    const BELVO_PWD = 'qmn7GAxM0_bEZJ*2TiHIsPWQZWZ7_@xW*7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n'

    // Belvo requiere Basic Auth en el header Y id+password en el body
    const auth = btoa(BELVO_ID + ':' + BELVO_PWD)

    const requestBody = {
      id:              BELVO_ID,
      password:        BELVO_PWD,
      scopes:          'read_institutions,write_links,read_consents',
      fetch_resources: ['ACCOUNTS', 'TRANSACTIONS', 'OWNERS'],
    }

    console.log('Calling Belvo /api/token/ with body keys:', Object.keys(requestBody))

    const response = await fetch('https://sandbox.belvo.com/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Basic ' + auth,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    console.log('Belvo response status:', response.status)
    console.log('Belvo response keys:', Object.keys(data))

    if (!response.ok) {
      console.error('Belvo error detail:', JSON.stringify(data))
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    // Belvo devuelve data.access — el frontend espera access_token
    return new Response(
      JSON.stringify({ access_token: data.access }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Edge Function exception:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
