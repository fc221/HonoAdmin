import { useEffect, useState } from 'hono/jsx'

type LoadStatus = 'empty' | 'error' | 'loaded' | 'loading'

interface Props {
  alt: string
  fallbackClass?: string
  fallbackText: string
  imageClass?: string
  src?: null | string
}

export default function LazyAvatarImage({
  alt,
  fallbackClass = 'text-sm font-semibold text-white',
  fallbackText,
  imageClass = 'h-full w-full object-cover',
  src,
}: Props) {
  const normalizedSrc = src?.trim() ?? ''
  const [status, setStatus] = useState<LoadStatus>(
    normalizedSrc ? 'loading' : 'empty',
  )

  useEffect(() => {
    if (!normalizedSrc) {
      setStatus('empty')
      return
    }

    setStatus('loading')

    const completedImage = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        'img[data-lazy-avatar-image="true"]',
      ),
    ).find((image) =>
      image.dataset.lazyAvatarSrc === normalizedSrc && image.complete
    )

    if (completedImage) {
      setStatus(completedImage.naturalWidth > 0 ? 'loaded' : 'error')
    }
  }, [normalizedSrc])

  const shouldRenderImage = normalizedSrc && status !== 'error'
  const shouldShowFallback = !normalizedSrc || status !== 'loaded'

  return (
    <>
      {shouldRenderImage
        ? (
            <img
              alt={alt}
              class={`${imageClass} transition-opacity duration-150 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
              decoding="async"
              data-lazy-avatar-image="true"
              data-lazy-avatar-src={normalizedSrc}
              loading="lazy"
              src={normalizedSrc}
              onError={() => setStatus('error')}
              onLoad={() => setStatus('loaded')}
            />
          )
        : null}
      <span
        aria-hidden={shouldRenderImage ? 'true' : undefined}
        class={`absolute inset-0 flex items-center justify-center bg-primary/80 ${fallbackClass} transition-opacity duration-150 ${shouldShowFallback ? 'opacity-100' : 'opacity-0'}`}
      >
        {fallbackText}
      </span>
      {status === 'loading'
        ? (
            <span
              aria-label="头像加载中"
              class="absolute inset-0 flex items-center justify-center bg-base-100/55 text-primary"
            >
              <span class="loading loading-spinner loading-xs" />
            </span>
          )
        : null}
    </>
  )
}
