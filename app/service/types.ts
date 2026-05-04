import type { Context } from 'hono'
import type { AppContext, AppEnv } from '../infra/runtime'

export type ServiceContext = Pick<
  AppContext,
  'cache' | 'config' | 'db' | 'now' | 'runtime'
>

export type ServiceRequestContext = Context<AppEnv>
