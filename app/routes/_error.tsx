import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../utils/errors'
import ErrorPage from './_components/_error-page'

const handler: ErrorHandler = (e, c) => {
  const status = getErrorStatus(e)

  if (status >= 500) {
    console.error(e)
  }

  c.status(status)
  return c.render(
    <ErrorPage
      message={getErrorMessage(e, status)}
      path={c.req.path}
      status={status}
      title={getErrorTitle(status)}
    />,
  )
}

export default handler

function getErrorStatus(error: Error): ContentfulStatusCode {
  if (error instanceof AppError) {
    return error.status as ContentfulStatusCode
  }

  if (
    'status' in error
    && typeof error.status === 'number'
    && error.status >= 400
    && error.status < 600
  ) {
    return error.status as ContentfulStatusCode
  }

  return 500
}

function getErrorTitle(status: number) {
  if (status === 401) {
    return '需要登录'
  }

  if (status === 403) {
    return '没有权限'
  }

  if (status === 404) {
    return '页面不存在'
  }

  return '服务暂时不可用'
}

function getErrorMessage(error: Error, status: number) {
  if (error instanceof AppError) {
    return error.message
  }

  if (status < 500 && error.message) {
    return error.message
  }

  return '服务处理请求时遇到异常，请稍后重试，或把当前路径发给管理员排查。'
}
