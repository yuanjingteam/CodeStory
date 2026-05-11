import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// 比较密码
export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
