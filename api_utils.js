// frontend/src/utils/api.js

import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token might be expired, try to refresh
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        // Refresh failed, redirect to login
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: (token) => api.get('/users/profile', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  updateProfile: (data, token) => api.put('/users/profile', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Models API
export const modelsAPI = {
  getModels: (params) => api.get('/models', { params }),
  getModel: (id) => api.get(`/models/${id}`),
  toggleFavorite: (id) => api.post(`/models/${id}/favorite`),
  getFavorites: (params) => api.get('/models/favorites/my', { params }),
  getPopular: (params) => api.get('/models/popular/trending', { params }),
  getRecent: (params) => api.get('/models/recent/latest', { params }),
  getTags: () => api.get('/models/tags/all'),
};

// Print Requests API
export const printRequestsAPI = {
  createRequest: (data) => api.post('/print-requests', data),
  getRequests: (params) => api.get('/print-requests', { params }),
  getRequest: (id) => api.get(`/print-requests/${id}`),
  updateStatus: (id, data) => api.put(`/print-requests/${id}/status`, data),
  deleteRequest: (id) => api.delete(`/print-requests/${id}`),
  getMakerQueue: (params) => api.get('/print-requests/maker/queue', { params }),
  getStats: () => api.get('/print-requests/stats/overview'),
};

// Users API
export const usersAPI = {
  getMakers: (params) => api.get('/users/makers', { params }),
  getMaker: (id) => api.get(`/users/makers/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  
  // Admin endpoints
  getAllUsers: (params) => api.get('/users/admin/all', { params }),
  updateUser: (id, data) => api.put(`/users/admin/${id}`, data),
  deleteUser: (id) => api.delete(`/users/admin/${id}`),
  getUserStats: () => api.get('/users/admin/stats'),
};

// Messages API
export const messagesAPI = {
  sendMessage: (data) => api.post('/messages', data),
  getConversations: () => api.get('/messages/conversations'),
  getThread: (partnerId, params) => api.get(`/messages/thread/${partnerId}`, { params }),
  getMessages: (params) => api.get('/messages', { params }),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  markThreadAsRead: (partnerId) => api.put(`/messages/thread/${partnerId}/read-all`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  getUnreadCount: () => api.get('/messages/unread/count'),
  
  // Admin endpoints
  getAllMessages: (params) => api.get('/messages/admin/all', { params }),
};

// Announcements API
export const announcementsAPI = {
  getAnnouncements: () => api.get('/announcements'),
  getAnnouncement: (id) => api.get(`/announcements/${id}`),
  
  // Admin endpoints
  getAllAnnouncements: (params) => api.get('/announcements/admin/all', { params }),
  createAnnouncement: (data) => api.post('/announcements/admin', data),
  updateAnnouncement: (id, data) => api.put(`/announcements/admin/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/announcements/admin/${id}`),
  toggleAnnouncement: (id) => api.put(`/announcements/admin/${id}/toggle`),
};

export default api;