import api from './api';

// 认证API - 通过后端FastAPI进行认证
export const authApi = {
  // 注册
  signUp: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
      });
      return { data: response.data, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: { 
          message: error.response?.data?.detail || '注册失败' 
        } 
      };
    }
  },

  // 登录
  signIn: async (email: string, password: string) => {
    try {
      console.log('📡 发送登录请求到后端...');
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      console.log('📡 后端响应:', response.data);
      
      const { access_token, user } = response.data;
      
      // 存储token
      if (access_token) {
        localStorage.setItem('access_token', access_token);
        console.log('💾 Token已存储到localStorage');
      }
      
      return { 
        data: { 
          user,
          session: { access_token } 
        }, 
        error: null 
      };
    } catch (error: any) {
      console.error('📡 登录API调用失败:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      return { 
        data: null, 
        error: { 
          message: error.response?.data?.detail || '登录失败' 
        } 
      };
    }
  },

  // 登出
  signOut: async () => {
    try {
      // 可选：调用后端登出API
      await api.post('/auth/logout');
      
      // 清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      return { error: null };
    } catch (error: any) {
      // 即使后端失败也要清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      return { 
        error: { 
          message: error.response?.data?.detail || '登出失败' 
        } 
      };
    }
  },

  // 获取当前用户
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { user: response.data, error: null };
    } catch (error: any) {
      return { 
        user: null, 
        error: { 
          message: error.response?.data?.detail || '获取用户信息失败' 
        } 
      };
    }
  },

  // 验证token是否有效
  validateToken: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { valid: false, user: null };
    }

    try {
      const response = await api.get('/auth/me');
      return { valid: true, user: response.data };
    } catch (error) {
      // Token无效，清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return { valid: false, user: null };
    }
  }
};
