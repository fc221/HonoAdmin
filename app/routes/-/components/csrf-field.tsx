import { contextStorage } from 'honox/server/context-storage'
import {
  csrfFieldName,
  getPreparedCsrfToken,
} from '../../../service/security/csrf'

export default function CsrfField() {
  const c = contextStorage.getStore()
  const token = c ? getPreparedCsrfToken(c) : ''

  return token
    ? <input name={csrfFieldName} type="hidden" value={token} />
    : null
}
