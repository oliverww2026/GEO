import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/env';

export interface UserInfo {
  userId: number;
  enterpriseId: number;
  username: string;
  displayName: string;
  role: string;
}

export interface EnterpriseInfo {
  id: number;
  name: string;
  brandName: string;
  brandPosition: string;
  serviceCity: string;
  apiKey: string;
  apiBaseUrl: string;
  apiModel: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  enterprise: EnterpriseInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (inviteCode: string, username: string, password: string, displayName: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'geo_auth_token';
const USER_KEY = 'geo_auth_user';
const ENTERPRISE_KEY = 'geo_auth_enterprise';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    enterprise: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 从 localStorage 恢复会话
  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      const enterpriseStr = localStorage.getItem(ENTERPRISE_KEY);

      if (token && userStr) {
        const user = JSON.parse(userStr);
        const enterprise = enterpriseStr ? JSON.parse(enterpriseStr) : null;
        setState({
          token,
          user,
          enterprise,
          isAuthenticated: true,
          isLoading: false,
        });

        // 后台验证 token 有效性
        fetch(`${API_BASE_URL}/auth/verify`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // token 过期，清除
          clearAuth();
          setState({ token: null, user: null, enterprise: null, isAuthenticated: false, isLoading: false });
        });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      clearAuth();
      setState({ token: null, user: null, enterprise: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, message: result.message || '登录失败' };
      }

      const { token, user, enterprise } = result.data;

      // 存储到 localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (enterprise) {
        localStorage.setItem(ENTERPRISE_KEY, JSON.stringify(enterprise));
      }

      setState({
        token,
        user,
        enterprise,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true, message: '登录成功' };
    } catch (error) {
      return { success: false, message: '网络错误，请检查后端服务是否启动' };
    }
  }, []);

  const register = useCallback(async (inviteCode: string, username: string, password: string, displayName: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, username, password, displayName }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, message: result.message || '注册失败' };
      }

      return { success: true, message: result.message };
    } catch (error) {
      return { success: false, message: '网络错误，请检查后端服务是否启动' };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setState({
      token: null,
      user: null,
      enterprise: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!state.token) return {};
    return { Authorization: `Bearer ${state.token}` };
  }, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ENTERPRISE_KEY);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}

export default AuthContext;