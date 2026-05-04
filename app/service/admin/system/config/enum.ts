export const configTypes = ['site', 'system', 'file'] as const

export type ConfigType = (typeof configTypes)[number]
