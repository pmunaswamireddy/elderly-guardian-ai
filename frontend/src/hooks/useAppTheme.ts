
import { useEffect } from 'react';

export function useTheme(theme: 'light' | 'dark' | undefined, scale: number | undefined, highContrast: boolean | undefined) {
    useEffect(() => {
        if (theme) {
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        if (scale) {
            document.documentElement.style.setProperty('--app-font-scale', String(scale));
        }
        if (highContrast !== undefined) {
            document.documentElement.classList.toggle('high-contrast', highContrast);
        }
    }, [theme, scale, highContrast]);
}
