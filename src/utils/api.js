let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configuration
const PROD_BACKEND = 'smcc-backend.onrender.com';
const CONNECT_TO_PROD = import.meta.env.VITE_CONNECT_TO_PROD === 'true';

// Strip all existing protocols and clean URL
if (API_URL.includes('://')) {
    const parts = API_URL.split('://');
    API_URL = parts[parts.length - 1];
}
API_URL = API_URL.replace(/\/+$/, '');

// Environment detection
const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isProduction = typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('onrender.com'));

// Failsafe & Direct Override
// 1. If we are in production but API is still localhost -> use Prod
// 2. If we explicitly want to connect to Prod even while local -> use Prod
if ((isProduction || CONNECT_TO_PROD) && (API_URL.includes('localhost') || API_URL.includes('127.0.0.1'))) {
    API_URL = PROD_BACKEND;
}

// Enforce protocol
if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
    API_URL = 'http://' + API_URL;
} else {
    API_URL = 'https://' + API_URL;
}

// Setup global Axios interceptor for Token Expiry and Response Unwrapping
import axios from 'axios';

axios.interceptors.response.use(
    (response) => {
        // Automatically unwrap the unified response format { success, message, data }
        if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('success')) {
            const originalData = response.data;
            const unwrappedData = originalData.data;

            // Maintain 'msg' compatibility for toast notifications in components
            if (unwrappedData && typeof unwrappedData === 'object' && !Array.isArray(unwrappedData)) {
                unwrappedData.msg = originalData.message;
            } else if (originalData.message && (unwrappedData === null || unwrappedData === undefined)) {
                // If data is null, return an object with msg so .then() chain doesn't break
                return { ...response, data: { msg: originalData.message, success: originalData.success } };
            }

            return { ...response, data: unwrappedData };
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.data && error.response.data.message) {
            // Map 'message' to 'msg' for compatibility with existing component error handling
            error.response.data.msg = error.response.data.message;
        }

        if (error.response && error.response.status === 401) {
            const token = localStorage.getItem('token');
            if (token) {
                // Token has expired or is invalid
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = '/login?expired=true';
            }
        }
        return Promise.reject(error);
    }
);

console.log(`SMCC API initialized at: ${API_URL} (${CONNECT_TO_PROD ? 'PRODUCTION OVERRIDE' : 'STANDARD'})`);

export default API_URL;

