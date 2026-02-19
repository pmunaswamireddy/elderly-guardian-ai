const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocalhost ? 'http://127.0.0.1:8007' : `http://${window.location.hostname}:8007`;
