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
    const id       = 'b1c99559-5abb-4537-9293-bb6db898227c'
    const password = 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n'
    const auth     = btoa(id + ':' + password)

    const response = await fetch('https://sandbox.belvo.com/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Basic ' + auth,
      },
      body: JSON.stringify({
        widget: {
          scopes:      'read_institutions,write_links,read_links',
          widget_type: 'fill_data',
        }
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    // ✅ Belvo devuelve data.access — el frontend espera access_token
    return new Response(
      JSON.stringify({ access_token: data.access }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
