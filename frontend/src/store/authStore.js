import { create } from 'zustand'
import axios from 'axios'

const API_URL = "http://localhost:3000/api/auth"

axios.defaults.withCredentials = true

export const useAuthStore = create((set) => ({
    user:null,
    isAuthenticated:false,
    error:null,
    isLoading:false,
    isCheckingAuth:true,

    signUp: async( email, password, name ) => {
        set({ isLoading:true, error:null })

        try {
           const response = await axios.post(`${API_URL}/signup`, { email, password, name })
           set({ user:response.data.user, isAuthenticated:true, isLoading:false })
        } catch (error) {
            set({ error:error.response.data.message || "Error while Signing Up!"})
            throw new error;
        }

    },

    verifyEmail: async(code) => {
        set({ isLoading:true, error:null })
        try {
            const response = await axios.post(`${API_URL}/verify-email`, { code })
            set({ user:response.data.user, isAuthenticated:true, isLoading:false })
            return response.data
        } catch (error) {
            set({ error:error.response.data.message || "Error Verification email", isLoading: false })
            throw new error; 
        }
    }
}))