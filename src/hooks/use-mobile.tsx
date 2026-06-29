import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    // Check if window is defined (so it only runs on the client)
    if (typeof window === 'undefined') {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(mql.matches)
    }

    // Set initial value
    onChange();

    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
