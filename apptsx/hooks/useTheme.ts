
import { useEffect } from 'react';

export function useTheme(theme:'light'|'dark', scale:number) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme==='dark');
    document.documentElement.style.setProperty('--font-scale', String(scale));
  }, [theme, scale]);
}
