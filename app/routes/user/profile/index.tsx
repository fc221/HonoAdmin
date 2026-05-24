import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../-/utils/form'
import { getCurrentUserProfilePageData } from '../../../service/user/profile'
import { listUserProfileOperateLogSchema } from '../../../service/user/profile/dto'
import { UnauthorizedError } from '../../../utils/errors'
import { handleProfileAction } from './-actions'
import ProfilePanel from './-components/profile-panel'

export const POST = createRoute(handleProfileAction)

export default createRoute(async (c) => {
  const requestedTab = c.req.query('tab')
  const activeTab = requestedTab === 'logs' || requestedTab === 'password'
    ? requestedTab
    : 'profile'
  const logInput = listUserProfileOperateLogSchema.parse({
    keyword: c.req.query('keyword'),
    logType: c.req.query('logType'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  try {
    const profileData = await getCurrentUserProfilePageData(c, logInput)

    return c.render(
      <ProfilePanel
        activeTab={activeTab}
        alert={getPageAlert(c)}
        logKeyword={logInput.keyword}
        logType={logInput.logType}
        logs={profileData.logs}
        user={profileData.user}
        timezone={c.config.timezone}
      />,
      {
        currentMenuName: 'user.profile',
        pageTitle: '个人中心',
      },
    )
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return c.redirect('/user/login', 302)
    }

    throw error
  }
})
