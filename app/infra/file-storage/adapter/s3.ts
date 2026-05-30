import type {
  FileStorageAccess,
  FileStoragePutInput,
  S3FileStorageConfig,
} from '../types'
import { toHex } from '../../../utils/crypto'

const algorithm = 'AWS4-HMAC-SHA256'
const serviceName = 's3'
const emptyPayloadHash
  = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

export class S3FileStorageAdapter {
  readonly kind = 's3' as const

  constructor(private readonly config: S3FileStorageConfig) {}

  async put(input: FileStoragePutInput): Promise<void> {
    const bodyHash = await sha256Hex(input.body)
    const signed = await this.signHeaderRequest('PUT', input.storageKey, bodyHash)
    const response = await fetch(signed.url, {
      body: input.body,
      headers: {
        ...signed.headers,
        'Content-Type': input.contentType,
      },
      method: 'PUT',
    })

    await assertS3Response(response, '上传文件到 S3 失败。')
  }

  async delete(storageKey: string): Promise<void> {
    const signed = await this.signHeaderRequest(
      'DELETE',
      storageKey,
      emptyPayloadHash,
    )
    const response = await fetch(signed.url, {
      headers: signed.headers,
      method: 'DELETE',
    })

    await assertS3Response(response, '删除 S3 文件失败。')
  }

  async getAccess(input: { storageKey: string }): Promise<FileStorageAccess> {
    if (this.config.publicBaseUrl) {
      return {
        cacheControl: 'no-store',
        kind: 'redirect',
        status: 302,
        url: this.createPublicObjectUrl(input.storageKey),
      }
    }

    return {
      cacheControl: 'no-store',
      kind: 'redirect',
      status: 302,
      url: await this.createPresignedGetUrl(input.storageKey),
    }
  }

  private async createPresignedGetUrl(storageKey: string): Promise<string> {
    const url = this.createObjectUrl(storageKey)
    const time = createAmzTime()
    const scope = createCredentialScope(time.date, this.config.region)
    const signedHeaders = 'host'
    const query: Record<string, string> = {
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${this.config.accessKeyId}/${scope}`,
      'X-Amz-Date': time.amzDate,
      'X-Amz-Expires': String(this.config.signedUrlTtlSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    }
    const canonicalQuery = createCanonicalQuery(query)
    const canonicalRequest = [
      'GET',
      url.pathname,
      canonicalQuery,
      `host:${url.host}\n`,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')
    const stringToSign = [
      algorithm,
      time.amzDate,
      scope,
      await sha256Hex(canonicalRequest),
    ].join('\n')
    const signature = await createSignature(
      this.config.secretAccessKey,
      time.date,
      this.config.region,
      stringToSign,
    )

    url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`
    return url.toString()
  }

  private async signHeaderRequest(
    method: 'DELETE' | 'PUT',
    storageKey: string,
    payloadHash: string,
  ): Promise<{ headers: Record<string, string>, url: string }> {
    const url = this.createObjectUrl(storageKey)
    const time = createAmzTime()
    const scope = createCredentialScope(time.date, this.config.region)
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const canonicalHeaders = [
      `host:${url.host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${time.amzDate}`,
      '',
    ].join('\n')
    const canonicalRequest = [
      method,
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')
    const stringToSign = [
      algorithm,
      time.amzDate,
      scope,
      await sha256Hex(canonicalRequest),
    ].join('\n')
    const signature = await createSignature(
      this.config.secretAccessKey,
      time.date,
      this.config.region,
      stringToSign,
    )

    return {
      headers: {
        'Authorization': [
          `${algorithm} Credential=${this.config.accessKeyId}/${scope}`,
          `SignedHeaders=${signedHeaders}`,
          `Signature=${signature}`,
        ].join(', '),
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': time.amzDate,
      },
      url: url.toString(),
    }
  }

  private createObjectUrl(storageKey: string): URL {
    const endpoint = this.config.endpoint.replace(/\/+$/, '')
    const encodedPath = [this.config.bucket, ...storageKey.split('/')]
      .map(encodePathSegment)
      .join('/')

    return new URL(`${endpoint}/${encodedPath}`)
  }

  private createPublicObjectUrl(storageKey: string): string {
    const publicBaseUrl = this.config.publicBaseUrl?.replace(/\/+$/, '') ?? ''
    const encodedPath = storageKey.split('/').map(encodePathSegment).join('/')

    return new URL(`${publicBaseUrl}/${encodedPath}`).toString()
  }
}

async function assertS3Response(
  response: Response,
  message: string,
): Promise<void> {
  if (response.ok || response.status === 404) {
    return
  }

  throw new Error(`${message} HTTP ${response.status}: ${await response.text()}`)
}

function createAmzTime(date = new Date()): { amzDate: string, date: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return {
    amzDate: iso,
    date: iso.slice(0, 8),
  }
}

function createCredentialScope(date: string, region: string): string {
  return `${date}/${region}/${serviceName}/aws4_request`
}

async function createSignature(
  secretAccessKey: string,
  date: string,
  region: string,
  stringToSign: string,
): Promise<string> {
  const dateKey = await hmac(`AWS4${secretAccessKey}`, date)
  const regionKey = await hmac(dateKey, region)
  const serviceKey = await hmac(regionKey, serviceName)
  const signingKey = await hmac(serviceKey, 'aws4_request')
  return toHex(new Uint8Array(await hmac(signingKey, stringToSign)))
}

async function hmac(
  key: string | ArrayBuffer,
  value: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? encodeUtf8(key) : key,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )

  return crypto.subtle.sign('HMAC', cryptoKey, encodeUtf8(value))
}

async function sha256Hex(value: ArrayBuffer | string): Promise<string> {
  const body = typeof value === 'string' ? encodeUtf8(value) : value
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', body)))
}

function createCanonicalQuery(values: Record<string, string>): string {
  return Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`)
    .join('&')
}

function encodePathSegment(value: string): string {
  return awsEncode(value)
}

function awsEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeUtf8(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value)
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}
