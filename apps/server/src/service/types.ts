import type { AppContext, AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'

export type ServiceContext = Pick<
  AppContext,
  'cache' | 'config' | 'db' | 'now' | 'runtime'
>

export type ServiceRequestContext = Context<AppEnv>
