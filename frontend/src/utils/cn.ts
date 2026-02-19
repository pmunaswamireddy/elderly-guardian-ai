import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Minimal className helper used across the app
export function cn(...inputs: Parameters<typeof clsx>) {
	return twMerge(clsx(...inputs));
}
