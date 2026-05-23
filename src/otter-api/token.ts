async function generateToken(): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('meanc')),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(Date.now())),
  )
  const combined = new Uint8Array(12 + enc.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(enc), 12)
  return btoa(String.fromCharCode(...combined))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function getToken(): Promise<string> {
  return generateToken()
}
