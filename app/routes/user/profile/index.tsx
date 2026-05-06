import { createRoute } from 'honox/factory'
import {
  getCurrentUserProfilePageData,
  listUserProfileOperateLogSchema,
} from '../../../service'
import { UnauthorizedError } from '../../../utils'
import Layout from '../../_components/_layout/$index'
import { getPageAlert } from '../../_utils/form'
import { getUserLayoutData } from '../../admin/_utils/layout'
import { handleProfileAction } from './_actions'
import ProfilePanel from './_components/_profile-panel'

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
    const [profileData, layout] = await Promise.all([
      getCurrentUserProfilePageData(c, logInput),
      getUserLayoutData(c),
    ])

    return c.render(
      <Layout
        canSwitchRole={layout.canSwitchRole}
        currentMenuName="user.profile"
        menus={layout.menus}
        user={layout.user}
      >
        <title>个人中心 - HonoAdmin</title>
        <ProfilePanel
          activeTab={activeTab}
          alert={getPageAlert(c)}
          logKeyword={logInput.keyword}
          logType={logInput.logType}
          logs={profileData.logs}
          user={profileData.user}
          timezone={c.config.timezone}
        />
      </Layout>,
    )
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return c.redirect('/user/login', 302)
    }

    throw error
  }
})
