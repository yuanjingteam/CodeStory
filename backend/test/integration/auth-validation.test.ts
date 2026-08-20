import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import {
  validateEmailCode,
  validateImageCaptcha,
} from '../../src/utils/validate';

describe('认证验证码校验契约', () => {
  it('图片验证码固定为4位字母或数字且不限制大小写', () => {
    expect(validateImageCaptcha('aB19').isValid).toBe(true);
    expect(validateImageCaptcha('AB_9').isValid).toBe(false);
    expect(validateImageCaptcha('ABC').isValid).toBe(false);
    expect(validateImageCaptcha('ABC12').isValid).toBe(false);
  });

  it('邮箱验证码固定为6位数字', () => {
    expect(validateEmailCode('012345').isValid).toBe(true);
    expect(validateEmailCode('12345').isValid).toBe(false);
    expect(validateEmailCode('12A456').isValid).toBe(false);
  });

  it('登录接口返回稳定的图片验证码错误码', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'learner@example.com',
      password: 'pass123',
      captchaId: 'captcha-id',
      captchaCode: 'AB_9',
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('AUTH_INVALID_IMAGE_CAPTCHA');
  });

  it('注册接口返回领域错误而不是响应辅助函数异常', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid-email',
      password: 'pass123',
      nickname: '学习者',
      emailCode: '123456',
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('AUTH_INVALID_EMAIL');
    expect(response.body.message).toBe('请输入有效的邮箱地址');
  });

  it('注册与忘记密码接口拒绝非6位数字邮箱验证码', async () => {
    const [registerResponse, resetResponse] = await Promise.all([
      request(app).post('/api/v1/auth/register').send({
        email: 'learner@example.com',
        password: 'pass123',
        nickname: '学习者',
        emailCode: '12_456',
      }),
      request(app).post('/api/v1/auth/forget-password').send({
        email: 'learner@example.com',
        password: 'pass123',
        emailCode: '12_456',
      }),
    ]);

    expect(registerResponse.status).toBe(400);
    expect(registerResponse.body.errorCode).toBe('AUTH_INVALID_EMAIL_CODE');
    expect(resetResponse.status).toBe(400);
    expect(resetResponse.body.errorCode).toBe('AUTH_INVALID_EMAIL_CODE');
  });

  it('发送邮箱验证码前先校验邮箱格式', async () => {
    const response = await request(app)
      .post('/api/v1/auth/email-captcha')
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('AUTH_INVALID_EMAIL');
  });
});
