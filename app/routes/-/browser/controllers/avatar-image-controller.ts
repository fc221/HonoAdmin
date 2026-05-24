import { Controller } from '@hotwired/stimulus'

export default class AvatarImageController extends Controller<HTMLElement> {
  static targets = ['fallback', 'image', 'loading']

  declare readonly fallbackTarget: HTMLElement
  declare readonly hasImageTarget: boolean
  declare readonly hasLoadingTarget: boolean
  declare readonly imageTarget: HTMLImageElement
  declare readonly loadingTarget: HTMLElement

  connect() {
    this.sync()
  }

  loaded() {
    this.showImage()
  }

  error() {
    this.showFallback()
  }

  sync() {
    if (!this.hasImageTarget || !this.imageTarget.getAttribute('src')) {
      this.showFallback()
      return
    }

    if (this.imageTarget.complete) {
      if (this.imageTarget.naturalWidth > 0) {
        this.showImage()
      } else {
        this.showFallback()
      }
      return
    }

    this.imageTarget.classList.add('opacity-0')
    this.imageTarget.classList.remove('opacity-100')
    this.fallbackTarget.classList.add('opacity-100')
    this.fallbackTarget.classList.remove('opacity-0')
    this.setLoadingVisible(true)
  }

  private showImage() {
    if (this.hasImageTarget) {
      this.imageTarget.classList.add('opacity-100')
      this.imageTarget.classList.remove('opacity-0')
    }

    this.fallbackTarget.classList.add('opacity-0')
    this.fallbackTarget.classList.remove('opacity-100')
    this.setLoadingVisible(false)
  }

  private showFallback() {
    if (this.hasImageTarget) {
      this.imageTarget.classList.add('opacity-0')
      this.imageTarget.classList.remove('opacity-100')
    }

    this.fallbackTarget.classList.add('opacity-100')
    this.fallbackTarget.classList.remove('opacity-0')
    this.setLoadingVisible(false)
  }

  private setLoadingVisible(visible: boolean) {
    if (!this.hasLoadingTarget) {
      return
    }

    this.loadingTarget.hidden = !visible
  }
}
