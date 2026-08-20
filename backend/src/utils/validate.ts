export interface ValidateResult {
  isValid: boolean;
  message: string;
}

export function validateEmail(email: string): ValidateResult {
  if (!email) {
    return { isValid: false, message: '请输入邮箱地址' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: '请输入有效的邮箱地址' };
  }
  
  return { isValid: true, message: '' };
}

export function validatePassword(password: string): ValidateResult {
  if (!password) {
    return { isValid: false, message: '请输入密码' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: '密码长度至少为6位' };
  }
  
  if (password.length > 50) {
    return { isValid: false, message: '密码长度不能超过50位' };
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: '密码需包含字母和数字' };
  }
  
  return { isValid: true, message: '' };
}

export function validateNickname(nickname: string): ValidateResult {
  if (!nickname) {
    return { isValid: false, message: '请输入昵称' };
  }
  
  if (nickname.length < 2) {
    return { isValid: false, message: '昵称长度至少为2位' };
  }
  
  if (nickname.length > 20) {
    return { isValid: false, message: '昵称长度不能超过20位' };
  }
  
  const nicknameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
  if (!nicknameRegex.test(nickname)) {
    return { isValid: false, message: '昵称只能包含中文、英文、数字和下划线' };
  }
  
  return { isValid: true, message: '' };
}

export function validateCode(code: string): ValidateResult {
  if (!code) {
    return { isValid: false, message: '请输入验证码' };
  }
  
  const codeRegex = /^[a-zA-Z0-9_]{4,6}$/;
  if (!codeRegex.test(code)) {
    return { isValid: false, message: '请输入4-6位验证码' };
  }
  
  return { isValid: true, message: '' };
}

export function validateImageCaptcha(code: string): ValidateResult {
  if (!code) {
    return { isValid: false, message: '请输入图片验证码' };
  }

  if (!/^[a-zA-Z0-9]{4}$/.test(code)) {
    return { isValid: false, message: '请输入4位字母或数字验证码' };
  }

  return { isValid: true, message: '' };
}

export function validateEmailCode(code: string): ValidateResult {
  if (!code) {
    return { isValid: false, message: '请输入邮箱验证码' };
  }

  if (!/^\d{6}$/.test(code)) {
    return { isValid: false, message: '请输入6位数字邮箱验证码' };
  }

  return { isValid: true, message: '' };
}

export function validatePhone(phone: string): ValidateResult {
  if (!phone) {
    return { isValid: false, message: '请输入手机号' };
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: '请输入有效的手机号' };
  }
  
  return { isValid: true, message: '' };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidateResult {
  if (!confirmPassword) {
    return { isValid: false, message: '请再次输入密码' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: '两次输入的密码不一致' };
  }
  
  return { isValid: true, message: '' };
}


