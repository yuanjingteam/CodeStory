import {
  deleteAuthSession,
  getAuthSession,
} from '@/services/auth/session';
import {
  matchesRefreshTokenHash,
  verifyRefreshTokenIgnoringExpiration,
} from '@/utils/auth-token';

class LogoutService {
  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) return;

    let payload;
    try {
      payload = verifyRefreshTokenIgnoringExpiration(refreshToken);
    } catch {
      // Logout is idempotent: invalid or expired client state is treated as logged out.
      return;
    }

    const session = await getAuthSession(payload.sessionId);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.currentTokenId !== payload.tokenId ||
      !matchesRefreshTokenHash(refreshToken, session.refreshTokenHash)
    ) {
      return;
    }

    await deleteAuthSession(session.sessionId);
  }
}

export const logoutService = new LogoutService();
