"use client"

import { useEffect } from "react"

export function useLockBodyScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehaviorY

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehaviorY = "none"

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehaviorY = previousOverscroll
    }
  }, [enabled])
}
