import { z } from 'zod'

export const aliasPattern = /^[\w-]+$/

export function createAliasSchema(label: string): z.ZodString {
  return z.string()
    .trim()
    .min(1, `请输入${label}。`)
    .max(255, `${label}不能超过 255 个字符。`)
    .regex(aliasPattern, `${label}只能包含英文字母、数字、下划线和横线。`)
}
