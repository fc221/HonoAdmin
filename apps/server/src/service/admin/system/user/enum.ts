import { wrapEnum } from '../../../../utils/enum'

export enum UserStatus {
  NORMAL = 'normal',
  DISABLED = 'disabled',
}

export const userStatuses = [UserStatus.NORMAL, UserStatus.DISABLED] as const

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export const userGenders = [
  UserGender.MALE,
  UserGender.FEMALE,
  UserGender.OTHER,
] as const

export const UserStatusUtils = wrapEnum(UserStatus, {
  [UserStatus.NORMAL]: '正常',
  [UserStatus.DISABLED]: '禁用',
}, {
  [UserStatus.NORMAL]: 'success',
  [UserStatus.DISABLED]: 'error',
})

export const UserGenderUtils = wrapEnum(UserGender, {
  [UserGender.FEMALE]: '女',
  [UserGender.MALE]: '男',
  [UserGender.OTHER]: '其他',
})

export const userStatusOptions = UserStatusUtils.getOptions()
export const userGenderOptions = UserGenderUtils.getOptions()
