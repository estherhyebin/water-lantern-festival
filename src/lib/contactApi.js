const endpoint = import.meta.env.VITE_CONTACT_FORM_URL

export const contactFormConfigured = Boolean(endpoint)

export async function submitContact(message) {
  if (!endpoint) {
    return { ok: false, reason: 'unconfigured' }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
    if (!response.ok) {
      return { ok: false, reason: 'failed' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
