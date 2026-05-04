import { z } from 'zod'

export const defaultPageSize = 10
export const maxPageSize = 100

export const paginationSchema = z.object({
  page: z.preprocess(
    (value) => normalizePositiveInteger(value, 1),
    z.number().int().positive(),
  ).default(1),
  pageSize: z.preprocess(
    (value) => normalizePositiveInteger(value, defaultPageSize, maxPageSize),
    z.number().int().positive().max(maxPageSize),
  ).default(defaultPageSize),
})

export const paginationResultSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(maxPageSize),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function resolvePagination(
  input: PaginationInput,
  total: number,
): PaginationInput {
  const totalPages = getTotalPages(total, input.pageSize)

  return {
    page: Math.min(input.page, totalPages),
    pageSize: input.pageSize,
  }
}

export function getPaginationOffset(input: PaginationInput): number {
  return (input.page - 1) * input.pageSize
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: PaginationInput,
): PaginatedResult<T> {
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: getTotalPages(total, pagination.pageSize),
  }
}

function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  max?: number,
): number {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) {
    return fallback
  }

  return max ? Math.min(number, max) : number
}
