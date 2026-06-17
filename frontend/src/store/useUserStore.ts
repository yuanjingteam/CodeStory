import { create } from 'zustand';
import type { LoginUserInfo, LoginResponse } from '@/types/auth';

interface UserState {
  token: string | null;
  accessExpiresAt: string | null;
  user: LoginUserInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

interface UserActions {
  addUser: (data: LoginResponse) => void;
  setAccessToken: (token: string, accessExpiresAt: string) => void;
  restoreSession: (
    token: string,
    accessExpiresAt: string,
    user: LoginUserInfo
  ) => void;
  clearUser: () => void;
  updateUserInfo: (info: Partial<LoginUserInfo>) => void;
  getRoleByToken: () => number;
}

type UserStore = UserState & UserActions;

const initialState: UserState = {
  token: null,
  accessExpiresAt: null,
  user: null,
  isLoading: true,
  isLoggedIn: false,
};

export const useUserStore = create<UserStore>((set, get) => ({
  ...initialState,

  addUser: (data) => {
    const accessToken = data.accessToken || data.token;
    if (!accessToken) {
      throw new Error('登录失败：Access Token 不存在');
    }

    set({
      token: accessToken,
      accessExpiresAt: data.accessExpiresAt,
      user: data.user,
      isLoggedIn: true,
      isLoading: false,
    });
  },

  setAccessToken: (token, accessExpiresAt) => {
    set({ token, accessExpiresAt });
  },

  restoreSession: (token, accessExpiresAt, user) => {
    set({
      token,
      accessExpiresAt,
      user,
      isLoggedIn: true,
      isLoading: false,
    });
  },

  clearUser: () => {
    set({
      ...initialState,
      isLoading: false,
    });
  },

  updateUserInfo: (info) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, ...info } });
  },

  getRoleByToken: () => get().user?.role || 0,
}));
