import type { PageAlertState } from '../../../-/components/page-alert'
import type {
  OperateLogRecord,
} from '../../../../service/admin/system/operate-log/dto'
import type {
  OperateLogType,
} from '../../../../service/admin/system/operate-log/enum'
import type { UserRecord } from '../../../../service/admin/system/user/dto'
import type { PaginatedResult } from '../../../../service/common/pagination'
import CsrfField from '../../../-/components/csrf-field'
import LazyAvatarImage from '../../../-/components/lazy-avatar-image'
import PageAlert from '../../../-/components/page-alert'
import Pagination from '../../../-/components/pagination'
import RadioTabs from '../../../-/components/radio-tabs'
import {
  ListTurboFrame,
  topLevelFormTurboAttrs,
} from '../../../-/components/turbo-frame'
import { selectedOptionAttrs } from '../../../-/utils/form'
import {
  operateLogTypeLabels,
  operateLogTypeOptions,
} from '../../../../service/admin/system/operate-log/enum'
import {
  userGenderOptions,
  UserGenderUtils,
  UserStatusUtils,
} from '../../../../service/admin/system/user/enum'
import { getAvatarText } from '../../../../utils/avatar'
import { formatDateTime } from '../../../../utils/datetime'
import AvatarUploadField from './avatar-upload-field'

type ProfileTab = 'logs' | 'password' | 'profile'

interface Props {
  activeTab?: ProfileTab
  alert?: PageAlertState
  logKeyword: string
  logs: PaginatedResult<OperateLogRecord>
  logType: OperateLogType | ''
  timezone: string
  user: UserRecord
}

export default function ProfilePanel({
  activeTab = 'profile',
  alert,
  logKeyword,
  logs,
  logType,
  timezone,
  user,
}: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <div class="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ProfileInfoCard timezone={timezone} user={user} />
        <section class="min-w-0">
          <div class="overflow-x-auto">
            <RadioTabs
              activeValue={activeTab}
              name="profile_panel_tabs"
              tabs={[
                { label: '信息编辑', value: 'profile' },
                { label: '密码修改', value: 'password' },
                { label: '操作日志', value: 'logs' },
              ]}
            >
              <>
                <ProfileEditForm user={user} />
              </>
              <>
                <PasswordChangeForm />
              </>
              <>
                <ListTurboFrame>
                  <OperateLogTable
                    keyword={logKeyword}
                    logs={logs}
                    logType={logType}
                    timezone={timezone}
                  />
                </ListTurboFrame>
              </>
            </RadioTabs>
          </div>
        </section>
      </div>
    </div>
  )
}

function ProfileInfoCard({
  timezone,
  user,
}: {
  timezone: string
  user: UserRecord
}) {
  return (
    <aside class="rounded-box border border-base-300 bg-base-100 p-5 lg:sticky lg:top-4 lg:self-start">
      <div class="flex flex-col items-center text-center">
        <div class="avatar">
          <div class="relative h-20 w-20 overflow-hidden rounded-full bg-primary/80 ring ring-base-300 ring-offset-2 ring-offset-base-100">
            <LazyAvatarImage
              alt="用户头像"
              fallbackClass="text-2xl font-bold text-white"
              fallbackText={getAvatarText(user)}
              src={user.avatar}
            />
          </div>
        </div>
        <h1 class="mt-4 max-w-full truncate text-xl font-bold">
          {user.nickname || user.username}
        </h1>
        <p class="mt-1 max-w-full truncate font-mono text-sm text-base-content/50">
          @
          {user.username}
        </p>
        <div class="mt-3 flex flex-wrap justify-center gap-2">
          <span
            class={`badge badge-soft ${UserStatusUtils.getBadgeClass(user.status)}`}
          >
            {UserStatusUtils.getLabel(user.status)}
          </span>
          <span
            class={`badge badge-soft ${user.isRoot ? 'badge-error' : 'badge-info'}`}
          >
            {user.isRoot ? 'Root 管理员' : '普通用户'}
          </span>
        </div>
      </div>

      <div class="divider my-5" />

      <dl class="space-y-3">
        <ProfileInfoItem
          icon="icon-[ri--user-heart-line]"
          label="性别"
          value={user.gender ? UserGenderUtils.getLabel(user.gender) : '-'}
        />
        <ProfileInfoItem
          icon="icon-[ri--mail-line]"
          label="邮箱"
          value={user.mail || '-'}
        />
        <ProfileInfoItem
          icon="icon-[ri--phone-line]"
          label="手机"
          value={user.phone || '-'}
        />
        <ProfileInfoItem
          icon="icon-[ri--shield-user-line]"
          label="角色"
          value={user.roleId ? `#${user.roleId}` : '-'}
        />
        <ProfileInfoItem
          icon="icon-[ri--time-line]"
          label="创建时间"
          value={formatDateTime(user.createdAt, timezone)}
        />
        <ProfileInfoItem
          icon="icon-[ri--refresh-line]"
          label="更新时间"
          value={formatDateTime(user.updatedAt, timezone)}
        />
      </dl>

      {user.bio
        ? (
            <div class="mt-5 rounded-box bg-base-200 p-3 text-sm leading-6 text-base-content/70">
              {user.bio}
            </div>
          )
        : null}
    </aside>
  )
}

function ProfileInfoItem({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div class="flex items-start gap-3 text-sm">
      <i class={`${icon} mt-0.5 shrink-0 text-base-content/45`} />
      <div class="min-w-0 flex-1">
        <dt class="text-xs text-base-content/50">{label}</dt>
        <dd class="mt-0.5 break-all font-medium">{value}</dd>
      </div>
    </div>
  )
}

function ProfileEditForm({ user }: { user: UserRecord }) {
  return (
    <form
      class="max-w-2xl space-y-4"
      data-validate-trigger="blur"
      method="post"
      {...topLevelFormTurboAttrs}
    >
      <CsrfField />
      <input name="intent" type="hidden" value="profile" />
      <AvatarUploadField user={user} />

      <fieldset class="fieldset" data-form-field="nickname">
        <legend class="fieldset-legend">昵称</legend>
        <input
          placeholder="用户昵称"
          class="input w-full"
          maxlength={80}
          name="nickname"
          value={user.nickname ?? ''}
        />
      </fieldset>

      <fieldset class="fieldset" data-form-field="username">
        <legend class="fieldset-legend">用户名</legend>
        <input
          class="input w-full"
          maxlength={40}
          minlength={3}
          name="username"
          pattern="^[A-Za-z0-9_.\-]+$"
          value={user.username}
          placeholder="请输入用户名"
          required
        />
      </fieldset>

      <fieldset class="fieldset" data-form-field="gender">
        <legend class="fieldset-legend">性别</legend>
        <select class="select w-full" name="gender" value={user.gender ?? ''}>
          <option selected={!user.gender} value="">
            保密
          </option>
          {userGenderOptions.map((option) => (
            <option
              key={option.value}
              selected={user.gender === option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset class="fieldset" data-form-field="bio">
        <legend class="fieldset-legend">简介</legend>
        <textarea
          class="textarea min-h-28 w-full"
          maxlength={500}
          name="bio"
          placeholder="介绍一下自己"
        >
          {user.bio ?? ''}
        </textarea>
      </fieldset>

      <div class="flex justify-start mt-2">
        <button class="btn btn-primary btn-sm" type="submit">
          保存资料
        </button>
      </div>
    </form>
  )
}

function PasswordChangeForm() {
  return (
    <form
      class="max-w-2xl space-y-4"
      data-validate-trigger="blur"
      method="post"
      {...topLevelFormTurboAttrs}
    >
      <CsrfField />
      <input name="intent" type="hidden" value="password" />

      <fieldset class="fieldset" data-form-field="oldPassword">
        <legend class="fieldset-legend">旧密码</legend>
        <input
          placeholder="请输入旧密码"
          autocomplete="current-password"
          class="input w-full"
          name="oldPassword"
          required
          type="password"
        />
      </fieldset>

      <fieldset class="fieldset" data-form-field="password">
        <legend class="fieldset-legend">新密码</legend>
        <input
          placeholder="请输入新密码"
          autocomplete="new-password"
          class="input w-full"
          maxlength={128}
          minlength={6}
          name="password"
          required
          type="password"
        />
      </fieldset>

      <fieldset class="fieldset" data-form-field="confirmPassword">
        <legend class="fieldset-legend">确认新密码</legend>
        <input
          placeholder="请确认新密码"
          autocomplete="new-password"
          class="input w-full"
          maxlength={128}
          minlength={6}
          name="confirmPassword"
          required
          type="password"
        />
      </fieldset>

      <div class="flex justify-start mt-2">
        <button class="btn btn-primary btn-sm" type="submit">
          修改密码
        </button>
      </div>
    </form>
  )
}

function OperateLogTable({
  keyword,
  logs,
  logType,
  timezone,
}: {
  keyword: string
  logs: PaginatedResult<OperateLogRecord>
  logType: OperateLogType | ''
  timezone: string
}) {
  return (
    <div class="space-y-5">
      <OperateLogFilterForm
        keyword={keyword}
        logType={logType}
        pageSize={logs.pageSize}
      />
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>状态</th>
              <th>信息</th>
              <th>请求</th>
              <th>IP</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.logType ? operateLogTypeLabels[log.logType] : '-'}</td>
                <td>{log.status}</td>
                <td class="min-w-64 whitespace-pre-wrap">
                  {log.logMsg ?? log.errorMsg ?? '-'}
                </td>
                <td>
                  <div class="flex min-w-40 flex-col gap-1">
                    <span>{log.requestMethod ?? '-'}</span>
                    <span class="text-xs text-base-content/50">
                      {log.method ?? '-'}
                    </span>
                  </div>
                </td>
                <td>{log.clientIp ?? '-'}</td>
                <td>{formatDateTime(log.createdAt, timezone)}</td>
              </tr>
            ))}
            {logs.items.length === 0
              ? (
                  <tr>
                    <td class="text-base-content/60" colspan={7}>
                      暂无日志。
                    </td>
                  </tr>
                )
              : null}
          </tbody>
        </table>
      </div>
      <Pagination
        action="/user/profile"
        pagination={logs}
        query={{ keyword, logType, pageSize: logs.pageSize, tab: 'logs' }}
      />
    </div>
  )
}

function OperateLogFilterForm({
  keyword,
  logType,
  pageSize,
}: {
  keyword: string
  logType: OperateLogType | ''
  pageSize: number
}) {
  return (
    <form
      action="/user/profile"
      class="flex w-full flex-wrap items-center justify-end gap-2"
      data-turbo="true"
      data-turbo-action="replace"
      data-turbo-frame="admin-list-frame"
      method="get"
    >
      <input name="tab" type="hidden" value="logs" />
      <input name="pageSize" type="hidden" value={pageSize} />
      <select
        class="select select-bordered select-sm w-full sm:w-36"
        name="logType"
      >
        <option
          value=""
          {...selectedOptionAttrs(logType === '')}
        >
          全部类型
        </option>
        {operateLogTypeOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            {...selectedOptionAttrs(logType === option.value)}
          >
            {option.label}
          </option>
        ))}
      </select>
      <label class="input input-bordered input-sm flex w-full max-w-xs items-center gap-2 sm:w-64">
        <i class="icon-[ri--search-line] text-base-content/45"></i>
        <input
          class="grow"
          name="keyword"
          placeholder="搜索日志"
          type="search"
          value={keyword}
        />
      </label>
      <button class="btn btn-primary btn-sm" type="submit">
        搜索
      </button>
    </form>
  )
}
