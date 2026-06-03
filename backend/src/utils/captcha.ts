import svgCaptcha from 'svg-captcha';

export function createCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 3,
    color: true,
    background: '#f4f4f4',
  });

  return captcha;
}
