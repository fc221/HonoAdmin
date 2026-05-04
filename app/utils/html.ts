export function sanitizeRichTextHtml(value: string): string {
  return removeTagBlock(removeTagBlock(value, 'script'), 'style')
    .replace(/<\/?(iframe|object|embed|meta|link)\b[^>]*>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"')
    .trim()
}

function removeTagBlock(value: string, tagName: string): string {
  const openTagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'i')
  let nextValue = value
  let match = openTagPattern.exec(nextValue)

  while (match) {
    const start = match.index
    const closeTag = `</${tagName}>`
    const closeStart = nextValue.toLowerCase().indexOf(
      closeTag,
      start + match[0].length,
    )
    const end = closeStart === -1
      ? start + match[0].length
      : closeStart + closeTag.length

    nextValue = `${nextValue.slice(0, start)}${nextValue.slice(end)}`
    match = openTagPattern.exec(nextValue)
  }

  return nextValue
}
