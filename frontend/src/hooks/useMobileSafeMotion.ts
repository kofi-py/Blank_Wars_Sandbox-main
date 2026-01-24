import { useState, useEffect } from 'react';

// Initial mobile detection function
const detectMobile = () => {
  if (typeof window === 'undefined') return false;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileDevice || (isTouchDevice && isSmallScreen);
};

export function useMobileSafeMotion() {
  const [isMobile, setIsMobile] = useState(() => detectMobile());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(detectMobile());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Return mobile-safe motion props
  return {
    isMobile,
    get_safe_motion_props: (desktopProps: any) => {
      if (isMobile) {
        // Return static props for mobile (no animations)
        return {
          class_name: desktopProps.class_name
        };
      }
      // Return full animation props for desktop
      return desktopProps;
    }
  };
}