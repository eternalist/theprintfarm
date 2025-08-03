// frontend/src/contexts/AuthContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session) {
          await handleAuthSuccess(session);
        } else {
          setUser(null);
          setSession(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleAuthSuccess(session);
      }
    } catch (error) {
      console.error('Error getting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (session) => {
    try {
      setSession(session);
      
      // Get user profile from our backend
      const response = await authAPI.getProfile(session.access_token);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // If profile fetch fails, sign out
      await signOut();
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const response = await authAPI.login({ email, password });
      
      if (response.data.session) {
        setSession(response.data.session);
        setUser(response.data.user);
        
        // Set session in Supabase client
        await supabase.auth.setSession(response.data.session);
        
        toast.success('Welcome back!');
        return { success: true };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData) => {
    try {
      setLoading(true);
      
      const response = await authAPI.register(userData);
      
      if (response.data.session) {
        setSession(response.data.session);
        setUser(response.data.user);
        
        // Set session in Supabase client
        await supabase.auth.setSession(response.data.session);
        
        toast.success('Account created successfully!');
        return { success: true };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from backend
      await authAPI.logout();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if backend signout fails, clear local state
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData, session.access_token);
      setUser(response.data);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await authAPI.resetPassword({ email });
      toast.success('Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      const message = error.response?.data?.error || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'CUSTOMER',
    isMaker: user?.role === 'MAKER',
    isAdmin: user?.role === 'ADMIN'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};