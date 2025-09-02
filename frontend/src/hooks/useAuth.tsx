import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi } from '../lib/auth';

// 临时内联类型定义（解决模块导入问题）
interface User {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
} | null>(null);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 初始化认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 开始认证检查...');
      setIsLoading(true);
      
      const { valid, user } = await authApi.validateToken();
      console.log('🔍 认证结果:', { valid, user });
      
      if (valid && user) {
        console.log('✅ 认证成功，设置用户信息');
        setUser({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || '',
          updated_at: user.updated_at || '',
        });
        
        // 这里可以从后端获取用户Profile
        // const profileResponse = await api.get(`/profiles/${user.id}`);
        // setProfile(profileResponse.data);
      } else {
        console.log('❌ 认证失败，清除用户信息');
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ 认证检查失败:', error);
      setUser(null);
      setProfile(null);
    } finally {
      console.log('✅ 认证检查完成，设置 isLoading = false');
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await authApi.signIn(email, password);
      if (error) throw new Error(error.message);
      
      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          created_at: data.user.created_at || '',
          updated_at: data.user.updated_at || '',
        });
        
        // Token已经在authApi.signIn中存储了
        // 可以在这里获取用户Profile
        // const profileResponse = await api.get(`/profiles/${data.user.id}`);
        // setProfile(profileResponse.data);
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await authApi.signUp(email, password);
      if (error) throw new Error(error.message);
      
      // 注册成功后的处理逻辑
      console.log('注册成功:', data);
      
      // 可以选择自动登录或要求用户手动登录
      // 这里我们要求用户手动登录以保持简单
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authApi.signOut();
      setUser(null);
      setProfile(null);
      // authApi.signOut已经处理了localStorage清理
    } catch (error) {
      console.error('登出失败:', error);
      // 即使出错也要清理本地状态
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
