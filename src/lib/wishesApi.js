import { SAMPLE_WISHES } from '../data/sampleWishes.js'
import { supabase, supabaseConfigured } from './supabase.js'

export const WISH_MAX_LENGTH = 280
export { ACTIVE_WISH_COUNT } from './wishPool.js'

function mapRow(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    sample: false,
  }
}

export async function fetchApprovedWishes() {
  if (!supabase) {
    return { wishes: SAMPLE_WISHES, source: 'sample', error: null }
  }

  const { data, error } = await supabase
    .from('wishes')
    .select('id, text, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    return {
      wishes: SAMPLE_WISHES,
      source: 'sample',
      error: 'The wish lanterns could not be loaded right now.',
    }
  }

  const wishes = (data || []).map(mapRow)
  if (wishes.length === 0) {
    return { wishes: SAMPLE_WISHES, source: 'sample', error: null }
  }
  return { wishes, source: 'database', error: null }
}

export async function submitWish(rawText) {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim()
  if (!text) {
    return { ok: false, reason: 'empty' }
  }
  if (text.length > WISH_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' }
  }
  if (!supabaseConfigured || !supabase) {
    return { ok: false, reason: 'offline' }
  }

  const { data, error } = await supabase.functions.invoke('submit-wish', {
    body: { text },
  })

  const payload = data || (error ? await readFunctionError(error) : null)
  const reason = payload?.reason
  if (reason === 'moderation' || reason === 'unavailable' || reason === 'empty' || reason === 'too-long') {
    return { ok: false, reason }
  }
  if (error || !payload?.ok || !payload.wish) {
    return { ok: false, reason: 'submit-failed' }
  }

  return { ok: true, wish: mapRow(payload.wish) }
}

async function readFunctionError(error) {
  try {
    if (typeof error.context?.json === 'function') {
      return await error.context.json()
    }
    if (typeof error.context?.text === 'function') {
      return JSON.parse(await error.context.text())
    }
  } catch {
    return null
  }
  return null
}

export function subscribeToApprovedWishes(onWish) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('approved-wishes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wishes' },
      (payload) => {
        const row = payload.new
        if (row?.status === 'approved' && row.text) {
          onWish(mapRow(row))
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
