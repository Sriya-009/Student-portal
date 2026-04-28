// Prefer explicit environment variables (Vite or CRA), fall back to localhost
const DEFAULT_API_BASE_URL =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:5000';

export const BASE_URL = DEFAULT_API_BASE_URL;
