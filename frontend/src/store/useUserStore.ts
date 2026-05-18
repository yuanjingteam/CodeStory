import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LoginUserInfo, LoginResponse } from 'shared/types/auth';

interface UserState {
  token: string | null;
  user: LoginUserInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

interface UserActions {
  addUser: (data: LoginResponse) => void;
  clearUser: () => void;
  updateUserInfo: (info: Partial<LoginUserInfo>) => void;
  initUser: () => void;
}

type UserStore = UserState & UserActions;

const initialState: UserState = {
  token: null,
  user: null,
  isLoading: true,
  isLoggedIn: false,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      addUser: (data: LoginResponse) => {
        if (!data?.token) {
          throw new Error('登录失败：token 不存在');
        }
        set({
          token: data.token,
          user: data.user ?? null,
          isLoggedIn: true,
          isLoading: false,
        });
      },

      clearUser: () => {
        set({
          ...initialState,
          isLoading: false,
        });
        useUserStore.persist.clearStorage();
      },

      updateUserInfo: (info: Partial<LoginUserInfo>) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...info } });
      },

      initUser: () => {
        const { token, user } = get();
        if (token && user) {
          set({
            isLoggedIn: true,
            isLoading: false,
          });
          return;
        }
        set({
          token: null,
          user: null,
          isLoggedIn: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'user-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),

      migrate: (persistedState) => {
        return persistedState as UserStore;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.initUser();
      },
    }
  )
);
