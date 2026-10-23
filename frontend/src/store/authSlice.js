import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';

const getErrorMessage = (error) => error.response?.data?.message ?? 'Network error, please try again.';

const normaliseEmail = (email) => email.trim().toLowerCase();

const thunk = (type, request) =>
    createAsyncThunk(type, async (arg, { rejectWithValue }) => {
        try {
            const response = await request(arg);
            return response.data;
        } catch (error) {
            return rejectWithValue({ message: getErrorMessage(error), code: error.response?.data?.code });
        }
    });

export const signUp = thunk('auth/signUp', ({ username, email, password }) =>
    axiosInstance.post('/auth/signup', { username, email, password }),
);
export const verifyEmail = thunk('auth/verifyEmail', ({ email, code }) => axiosInstance.post('/auth/verify-email', { email, code }));
export const resendVerification = thunk('auth/resendVerification', ({ email }) =>
    axiosInstance.post('/auth/resend-verification', { email }),
);
export const login = thunk('auth/login', ({ email, password }) => axiosInstance.post('/auth/login', { email, password }));
export const logout = thunk('auth/logout', () => axiosInstance.post('/auth/logout'));
export const checkAuth = thunk('auth/checkAuth', () => axiosInstance.get('/auth/check-auth'));
export const forgotPassword = thunk('auth/forgotPassword', ({ email }) => axiosInstance.post('/auth/forgot-password', { email }));
export const resetPassword = thunk('auth/resetPassword', ({ token, password }) =>
    axiosInstance.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password }),
);

const pending = (state) => {
    state.isLoading = true;
    state.error = null;
    state.message = null;
};
const rejected = (state, { payload }) => {
    state.isLoading = false;
    state.error = payload?.message ?? 'Something went wrong.';
};
const done = (state, { payload }) => {
    state.isLoading = false;
    state.message = payload?.message ?? null;
};

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        pendingEmail: null, // address waiting for its verification code
        error: null,
        message: null,
        isLoading: false,
        isCheckingAuth: true,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
            state.message = null;
        },
        clearLoading: (state) => {
            state.isLoading = false;
        },
        setPendingEmail: (state, { payload }) => {
            state.pendingEmail = payload ? normaliseEmail(payload) : null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(signUp.pending, pending)
            .addCase(signUp.fulfilled, (state, action) => {
                done(state, action);
                state.pendingEmail = normaliseEmail(action.meta.arg.email);
            })
            .addCase(signUp.rejected, rejected)

            .addCase(verifyEmail.pending, pending)
            .addCase(verifyEmail.fulfilled, (state, action) => {
                done(state, action);
                state.pendingEmail = null;
            })
            .addCase(verifyEmail.rejected, rejected)

            .addCase(resendVerification.pending, pending)
            .addCase(resendVerification.fulfilled, done)
            .addCase(resendVerification.rejected, rejected)

            .addCase(checkAuth.pending, (state) => {
                state.isCheckingAuth = true;
            })
            .addCase(checkAuth.fulfilled, (state, { payload }) => {
                state.user = payload.user;
                state.isAuthenticated = true;
                state.isCheckingAuth = false;
            })
            .addCase(checkAuth.rejected, (state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.isCheckingAuth = false;
            })

            .addCase(login.pending, pending)
            .addCase(login.fulfilled, (state, action) => {
                done(state, action);
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.pendingEmail = null;
            })
            .addCase(login.rejected, (state, action) => {
                rejected(state, action);
                if (action.payload?.code === 'EMAIL_NOT_VERIFIED') {
                    state.pendingEmail = normaliseEmail(action.meta.arg.email);
                }
            })

            .addCase(logout.pending, pending)
            .addCase(logout.fulfilled, (state) => {
                state.isLoading = false;
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(logout.rejected, (state) => {
                // The cookies are httpOnly: even if the request fails, forget the user locally.
                state.isLoading = false;
                state.user = null;
                state.isAuthenticated = false;
            })

            .addCase(forgotPassword.pending, pending)
            .addCase(forgotPassword.fulfilled, done)
            .addCase(forgotPassword.rejected, rejected)

            .addCase(resetPassword.pending, pending)
            .addCase(resetPassword.fulfilled, done)
            .addCase(resetPassword.rejected, rejected);
    },
});

export const { clearError, clearLoading, setPendingEmail } = authSlice.actions;

export default authSlice.reducer;
