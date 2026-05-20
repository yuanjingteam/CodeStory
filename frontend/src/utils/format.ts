/**
 * 日期格式化工具函数
 */

/**
 * 格式化 ISO 日期字符串为指定格式
 * @param dateStr - ISO 日期字符串 (如: 2026-05-15T02:37:48.989Z)
 * @param format - 输出格式，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  dateStr: string,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param dateStr - ISO 日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDateOnly(dateStr: string): string {
  return formatDate(dateStr, 'YYYY-MM-DD');
}

/**
 * 格式化日期为 HH:mm:ss 格式
 * @param dateStr - ISO 日期字符串
 * @returns 格式化后的时间字符串
 */
export function formatTimeOnly(dateStr: string): string {
  return formatDate(dateStr, 'HH:mm:ss');
}

/**
 * 格式化日期为相对时间（如：刚刚、5分钟前、1小时前等）
 * @param dateStr - ISO 日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}周前`;
  } else if (diffMonths < 12) {
    return `${diffMonths}个月前`;
  } else {
    return `${diffYears}年前`;
  }
}

/**
 * 格式化日期为中文格式（如：2026年5月15日 10:37:48）
 * @param dateStr - ISO 日期字符串
 * @returns 中文格式日期字符串
 */
export function formatDateChinese(dateStr: string): string {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return '无效日期';
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}
