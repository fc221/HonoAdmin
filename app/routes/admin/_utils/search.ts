type SearchValue = boolean | null | number | string | undefined

export function getKeyword(value: string | undefined): string {
  return value?.trim() ?? ''
}

export function matchesKeyword(
  keyword: string,
  values: SearchValue[],
): boolean {
  const normalizedKeyword = keyword.toLowerCase()

  if (!normalizedKeyword) {
    return true
  }

  return values.some((value) => {
    if (value === null || value === undefined) {
      return false
    }

    return String(value).toLowerCase().includes(normalizedKeyword)
  })
}
