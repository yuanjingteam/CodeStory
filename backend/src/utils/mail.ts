// import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   service: 'qq',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export async function sendMail(to: string, code: string) {
//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to,
//     subject: '验证码',
//     html: `
//       <h1>您的验证码：</h1>
//       <h2>${code}</h2>
//       <p>5分钟内有效</p>
//     `,
//   });
// }
