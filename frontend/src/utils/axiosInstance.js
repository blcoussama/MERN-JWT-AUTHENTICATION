import axios from 'axios';

export const API_URL = import.meta.env.MODE === "development" 
    ? "http://localhost:3000/api/auth" 
    : "/api/auth";

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Attempt to refresh token
                await axios.post(`${API_URL}/refresh-token`, {}, { 
                    withCredentials: true 
                });
                
                // Retry original request
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Refresh token failed:', refreshError);
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;
