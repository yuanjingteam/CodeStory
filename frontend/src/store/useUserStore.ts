import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserInfo, LoginResponse } from 'shared/types/auth';
import { logout } from '@/api/auth/auth';

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

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: true,
      isLoggedIn: false,

      addUser: (data: LoginResponse) => {
        if (!data.token) {
          throw new Error('登录失败：用户数据');
        }
        set({
          token: data.token,
          user: data.user || null,
          isLoggedIn: true,
          isLoading: false,
        });
      },

      clearUser: async () => {
        const { token } = get();
        if (token) {
          try {
            await logout();
          } catch (error) {
            console.error('Logout API failed:', error);
          }
        }
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
          return { user: { ...state.user, ...info } };
        });
      },

      initUser: () => {
       const state = get();
       if (state.token) {
         set({ isLoading: false });
       } else {
         set({ isLoading: false });
       }
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
