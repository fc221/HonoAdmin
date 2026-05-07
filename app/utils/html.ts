const allowedTags = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'u',
  'ul',
])
const voidTags = new Set(['br', 'hr', 'img'])
const rawTextTags = ['script', 'style', 'textarea', 'title']

export function sanitizeRichTextHtml(value: string): string {
  const withoutRawText = rawTextTags.reduce(
    (html, tagName) => removeTagBlock(html, tagName),
    value,
  )
  let result = ''
  let cursor = 0

  for (const match of withoutRawText.matchAll(/<[^>]*>/g)) {
    result += escapeHtml(withoutRawText.slice(cursor, match.index))
    result += sanitizeTag(match[0])
    cursor = (match.index ?? 0) + match[0].length
  }

  result += escapeHtml(withoutRawText.slice(cursor))
  return result.trim()
}

function sanitizeTag(tag: string): string {
  if ((/^<!--[\s\S]*-->$/).test(tag) || (/^<!/).test(tag)) {
    return ''
  }

  const parsed = parseTag(tag)
  if (!parsed) {
    return escapeHtml(tag)
  }

  const tagName = parsed.tagName.toLowerCase()
  if (!allowedTags.has(tagName)) {
    return ''
  }

  if (parsed.closing) {
    return voidTags.has(tagName) ? '' : `</${tagName}>`
  }

  const attributes = sanitizeAttributes(tagName, parsed.rawAttributes)
  const attributeText = attributes.length ? ` ${attributes.join(' ')}` : ''
  return `<${tagName}${attributeText}>`
}

interface ParsedTag {
  closing: boolean
  rawAttributes: string
  tagName: string
}

function parseTag(tag: string): ParsedTag | null {
  if (!tag.startsWith('<') || !tag.endsWith('>')) {
    return null
  }

  let body = tag.slice(1, -1).trim()
  if (!body) {
    return null
  }

  const closing = body.startsWith('/')
  if (closing) {
    body = body.slice(1).trimStart()
  }

  if (body.endsWith('/')) {
    body = body.slice(0, -1).trimEnd()
  }

  let tagNameEnd = 0
  while (tagNameEnd < body.length && isTagNameChar(body[tagNameEnd], tagNameEnd)) {
    tagNameEnd += 1
  }

  if (tagNameEnd === 0) {
    return null
  }

  return {
    closing,
    tagName: body.slice(0, tagNameEnd),
    rawAttributes: body.slice(tagNameEnd).trim(),
  }
}

function isTagNameChar(value: string | undefined, index: number): boolean {
  if (!value) {
    return false
  }

  const code = value.charCodeAt(0)
  const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
  if (index === 0) {
    return isLetter
  }

  return (
    isLetter
    || (code >= 48 && code <= 57)
    || value === '_'
    || value === '-'
    || value === ':'
  )
}

function sanitizeAttributes(tagName: string, rawAttributes: string): string[] {
  const attributes: string[] = []

  for (const match of rawAttributes.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g,
  )) {
    const name = match[1]?.toLowerCase() ?? ''
    const rawValue = match[2] ?? ''
    const value = decodeHtmlEntities(stripAttributeQuotes(rawValue)).trim()

    if (!name || name.startsWith('on') || name.includes(':')) {
      continue
    }

    if (tagName === 'a' && name === 'href' && isSafeLinkUrl(value)) {
      attributes.push(`href="${escapeAttribute(value)}"`)
      attributes.push('rel="nofollow noopener noreferrer"')
      continue
    }

    if (tagName === 'a' && name === 'target' && value === '_blank') {
      attributes.push('target="_blank"')
      continue
    }

    if (tagName === 'img' && name === 'src' && isSafeImageUrl(value)) {
      attributes.push(`src="${escapeAttribute(value)}"`)
      continue
    }

    if (
      (name === 'alt' || name === 'title')
      && value
      && (tagName === 'a' || tagName === 'img')
    ) {
      attributes.push(`${name}="${escapeAttribute(value.slice(0, 300))}"`)
    }
  }

  return uniqueAttributes(attributes)
}

function isSafeLinkUrl(value: string): boolean {
  const compact = removeUrlControlChars(value).toLowerCase()
  return (
    (compact.startsWith('/') && !compact.startsWith('//'))
    || compact.startsWith('#')
    || compact.startsWith('http://')
    || compact.startsWith('https://')
    || compact.startsWith('mailto:')
    || compact.startsWith('tel:')
  )
}

function isSafeImageUrl(value: string): boolean {
  const compact = removeUrlControlChars(value).toLowerCase()
  return (
    (compact.startsWith('/uploads/') && !compact.startsWith('//'))
    || compact.startsWith('http://')
    || compact.startsWith('https://')
  )
}

function removeUrlControlChars(value: string): string {
  return [...value]
    .filter((char) => {
      const codePoint = char.codePointAt(0) ?? 0
      return codePoint > 0x1F && codePoint !== 0x7F && !isUrlWhitespace(char)
    })
    .join('')
}

function isUrlWhitespace(value: string): boolean {
  return (
    value === ' '
    || value === '\n'
    || value === '\r'
    || value === '\t'
    || value === '\v'
    || value === '\f'
  )
}

function stripAttributeQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function uniqueAttributes(attributes: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const attribute of attributes) {
    const name = attribute.split('=')[0] ?? attribute
    if (seen.has(name)) {
      continue
    }

    seen.add(name)
    unique.push(attribute)
  }

  return unique
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (entity, body: string) => {
      const normalizedBody = body.toLowerCase()
      if (normalizedBody === 'amp') {
        return '&'
      }
      if (normalizedBody === 'lt') {
        return '<'
      }
      if (normalizedBody === 'gt') {
        return '>'
      }
      if (normalizedBody === 'quot') {
        return '"'
      }
      if (normalizedBody === 'apos') {
        return '\''
      }

      const codePoint = normalizedBody.startsWith('#x')
        ? Number.parseInt(normalizedBody.slice(2), 16)
        : Number.parseInt(normalizedBody.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
    },
  )
}

function removeTagBlock(value: string, tagName: string): string {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>|<${tagName}\\b[^>]*>`,
    'gi',
  )
  return value.replace(pattern, '')
}

function escapeHtml(value: string | undefined): string {
  return escapeAttribute(value ?? '')
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}
