import axios from 'axios';

// Same origin in development (Vite proxy) and in production (served by Express).
const axiosInstance = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Routes for which a 401 must NOT trigger a refresh attempt.
const NO_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh-token', '/auth/logout', '/auth/verify-email'];

let refreshPromise = null;

/** A single refresh request at a time: parallel 401s wait for the same rotation. */
const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = axiosInstance.post('/auth/refresh-token').finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const shouldRefresh =
            error.response?.status === 401 && original && !original._retry && !NO_REFRESH.some((url) => original.url?.startsWith(url));

        if (!shouldRefresh) return Promise.reject(error);

        original._retry = true;
        try {
            await refreshSession();
        } catch {
            return Promise.reject(error); // session really expired: the caller handles the 401
        }
        return axiosInstance(original);
    },
);

export default axiosInstance;
