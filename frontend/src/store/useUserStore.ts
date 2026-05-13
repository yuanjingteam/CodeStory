import { create } from 'zustand';
import { getStorage, setStorage, removeStorage } from '@/utils/storage';
import type { UserInfo, LoginResponse } from 'shared/types/auth';
import { logout } from '@/api/auth/auth';

const STORAGE_KEYS = {
  USER_TOKEN: 'code-story-token',
  USER_INFO: 'code-story-user',
};

interface UserState {
  token: string | null;
  user: UserInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

interface UserActions {
  addUser: (data: LoginResponse) => void;
  clearUser: () => Promise<void>;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  initUser: () => void;
}

export const useUserStore = create<UserState & UserActions>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  isLoggedIn: false,

  addUser: (data: LoginResponse) => {
    if (!data.data) {
      throw new Error('登录失败：缺少用户数据');
    }

    setStorage(STORAGE_KEYS.USER_TOKEN, data.data.token);
    setStorage(STORAGE_KEYS.USER_INFO, data.data.user);
    set({
      token: data.data.token,
      user: data.data.user,
      isLoggedIn: true,
      isLoading: false,
    });
  },

  clearUser: async () => {
    const currentToken = getStorage<string>(STORAGE_KEYS.USER_TOKEN);
    if (currentToken) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }
    removeStorage(STORAGE_KEYS.USER_TOKEN);
    removeStorage(STORAGE_KEYS.USER_INFO);
    set({
      token: null,
      user: null,
      isLoggedIn: false,
      isLoading: false,
    });
  },

  updateUserInfo: (info: Partial<UserInfo>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...info };
      if (state.token) {
        setStorage(STORAGE_KEYS.USER_TOKEN, state.token);
        setStorage(STORAGE_KEYS.USER_INFO, updatedUser);
      }
      return { user: updatedUser };
    });
  },

  initUser: () => {
    const token = getStorage<string>(STORAGE_KEYS.USER_TOKEN);
    const user = getStorage<UserInfo>(STORAGE_KEYS.USER_INFO);
    set({
      token,
      user,
      isLoggedIn: !!token,
      isLoading: false,
    });
  },
}));
