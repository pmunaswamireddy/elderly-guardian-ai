const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const protocol = window.location.protocol; // 'http:' or 'https:'

// Use VITE_API_URL from environment if available (production), else fallback to localhost/network IP
export const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL
    : (isLocalhost ? `${protocol}//127.0.0.1:8007` : `${protocol}//${window.location.hostname}:8007`);
