import nodemailer from 'nodemailer';



interface SendEmailOptions {
  to: string; 
  subject: string; 
  text?: string; 
  html?: string; 
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  try {
     await transporter.sendMail({
       from: `"CodeStory" <${process.env.EMAIL_USER}>`,
       to: options.to,
       subject: options.subject,
       text: options.text,
       html: options.html,
     });
     console.log('✅ 邮件发送成功:', options.to);
     return true;
   } catch (error) {
     console.error('❌ 邮件发送失败:', error);
     return false;
   }
}
