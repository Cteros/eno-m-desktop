export function formatFileName(format: string, meta: { singer?: string; song?: string; album?: string; aid?: string; index?: number }): string {
  let name = format || '{singer} - {song}'
  name = name.replace(/{singer}/g, meta.singer || 'Unknown')
  name = name.replace(/{song}/g, meta.song || 'Unknown')
  name = name.replace(/{album}/g, meta.album || '')
  name = name.replace(/{aid}/g, meta.aid || '')
  if (meta.index !== undefined) {
    name = name.replace(/{index}/g, meta.index.toString())
  }

  // Sanitize filename
  return name.replace(/[/\\?*:|"<>]/g, '_')
}
