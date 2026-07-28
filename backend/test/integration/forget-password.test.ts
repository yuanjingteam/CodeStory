import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import { comparePassword, hashPassword } from '../../src/utils/bcrypt';
import { deleteCache, setCache } from '../../src/utils/cache';

const MARKER = `forget_password_${Date.now()}`;
const KNOWN_EMAIL = `${MARKER}_known@example.com`;
const UNKNOWN_EMAIL = `${MARKER}_unknown@example.com`;
const EMAIL_CODE = '123456';
const NEW_PASSWORD = 'newPass123';
const SUCCESS_MESSAGE = '如果该邮箱已注册，密码已重置';

beforeAll(async () => {
  await prisma.users.create({
    data: {
      email: KNOWN_EMAIL,
      password: await hashPassword('oldPass123'),
      role: 0,
    },
  });
});

afterAll(async () => {
  await Promise.all([
    prisma.users.deleteMany({ where: { email: KNOWN_EMAIL } }),
    deleteCache(`email-code:${KNOWN_EMAIL}`),
    deleteCache(`email-code:${UNKNOWN_EMAIL}`),
  ]);
  await prisma.$disconnect();
});

describe('忘记密码账号枚举保护', () => {
  it('已注册与未注册邮箱返回相同成功响应，且不创建未知账号', async () => {
    await setCache(`email-code:${KNOWN_EMAIL}`, EMAIL_CODE, 60);
    const knownResponse = await request(app)
      .post('/api/v1/auth/forget-password')
      .send({
        email: KNOWN_EMAIL,
        emailCode: EMAIL_CODE,
        password: NEW_PASSWORD,
      });

    await setCache(`email-code:${UNKNOWN_EMAIL}`, EMAIL_CODE, 60);
    const unknownResponse = await request(app)
      .post('/api/v1/auth/forget-password')
      .send({
        email: UNKNOWN_EMAIL,
        emailCode: EMAIL_CODE,
        password: NEW_PASSWORD,
      });

    expect(knownResponse.status).toBe(200);
    expect(unknownResponse.status).toBe(200);
    expect(knownResponse.body.message).toBe(SUCCESS_MESSAGE);
    expect(unknownResponse.body.message).toBe(SUCCESS_MESSAGE);

    const [knownUser, unknownUser] = await Promise.all([
      prisma.users.findUniqueOrThrow({ where: { email: KNOWN_EMAIL } }),
      prisma.users.findUnique({ where: { email: UNKNOWN_EMAIL } }),
    ]);
    expect(await comparePassword(NEW_PASSWORD, knownUser.password)).toBe(true);
    expect(unknownUser).toBeNull();
  });
});
