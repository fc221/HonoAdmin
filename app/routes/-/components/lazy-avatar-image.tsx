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

  return (
    <span class="contents" data-controller="avatar-image">
      <img
        alt={alt}
        class={`${imageClass} transition-opacity duration-150 opacity-0`}
        decoding="async"
        data-action="load->avatar-image#loaded error->avatar-image#error"
        data-avatar-image-target="image"
        data-lazy-avatar-image="true"
        data-lazy-avatar-src={normalizedSrc}
        loading="lazy"
        src={normalizedSrc || undefined}
      />
      <span
        aria-hidden={normalizedSrc ? 'true' : undefined}
        class={`absolute inset-0 flex items-center justify-center bg-primary/80 ${fallbackClass} transition-opacity duration-150 opacity-100`}
        data-avatar-image-target="fallback"
      >
        {fallbackText}
      </span>
      <span
        aria-label="头像加载中"
        class="absolute inset-0 flex items-center justify-center bg-base-100/55 text-primary"
        data-avatar-image-target="loading"
        hidden={!normalizedSrc}
      >
        <span class="loading loading-spinner loading-xs" />
      </span>
    </span>
  )
}
