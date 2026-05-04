import type { Context } from 'hono'
import {
  createRequestOperateLog,
  getAdminSessionUser,
  runDatabaseMigrations,
} from '../../../../service'
import { ForbiddenError, ValidationError } from '../../../../utils'
import {
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/update'

export async function handleUpdateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'migrate') {
      const user = await getAdminSessionUser(c)
      if (!user?.isRoot) {
        throw new ForbiddenError('只有 root 管理员可以执行数据库迁移。')
      }

      const migration = await runDatabaseMigrations(c)
      await createRequestOperateLog(c, {
        logData: migration,
        logMsg: `执行数据库迁移 ${migration.appliedCount}/${migration.latestCodeMigrationId ?? '-'}`,
        logType: 'updateOne',
        method: 'handleUpdateAction',
        userId: user.id,
      })

      return respondWithActionAlert(c, pagePath, {
        message: migration.isComplete
          ? '数据库迁移已完成。'
          : '数据库仍有待执行迁移。',
        type: migration.isComplete ? 'success' : 'error',
      })
    }

    throw new ValidationError('未知的迁移操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}
