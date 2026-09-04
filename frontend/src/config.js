// Centralized API URL.
// Locally, this falls back to your local backend (localhost:5000).
// On Vercel, set the VITE_API_URL environment variable to your
// live Render backend URL, and this will use that instead.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';