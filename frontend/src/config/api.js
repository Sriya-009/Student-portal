const LOCAL_API_BASE_URL = 'http://localhost:5000';
const EC2_API_BASE_URL = 'http://35.172.183.64:5000';

const isLocalHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
);

export const BASE_URL = process.env.REACT_APP_API_BASE_URL || (
  isLocalHost ? LOCAL_API_BASE_URL : EC2_API_BASE_URL
);
