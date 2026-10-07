import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function moderate(text: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'omni-moderation-latest',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error('moderation-unavailable')
  }

  const payload = await response.json()
  return Boolean(payload?.results?.[0]?.flagged)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ ok: false, reason: 'unavailable' }, 405)
  }

  let text = ''
  try {
    const body = await request.json()
    text = String(body?.text || '').replace(/\s+/g, ' ').trim()
  } catch {
    return json({ ok: false, reason: 'unavailable' })
  }

  if (!text) {
    return json({ ok: false, reason: 'empty' })
  }
  if (text.length > 280) {
    return json({ ok: false, reason: 'too-long' })
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    return json({ ok: false, reason: 'unavailable' })
  }

  try {
    const flagged = await moderate(text, openaiKey)
    if (flagged) {
      return json({ ok: false, reason: 'moderation' })
    }
  } catch {
    return json({ ok: false, reason: 'unavailable' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, reason: 'unavailable' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase
    .from('wishes')
    .insert({ text, status: 'approved' })
    .select('id, text, created_at, status')
    .single()

  if (error || !data) {
    return json({ ok: false, reason: 'submit-failed' })
  }

  return json({ ok: true, wish: data })
})
