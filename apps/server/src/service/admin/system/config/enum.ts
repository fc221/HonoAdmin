export const configTypes = ['site', 'system', 'file', 'security'] as const

export type ConfigType = (typeof configTypes)[number]
