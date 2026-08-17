import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationCode(email: string, code: string) {
  await transporter.sendMail({
    from: `"Verytech Case Management" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Doğrulama Kodu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5; text-align: center;">Verytech Case Management</h2>
        <p style="color: #333; font-size: 16px;">E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Bu kod 5 dakika süreyle geçerlidir.</p>
        <p style="color: #6b7280; font-size: 14px;">Bu isteği siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.</p>
      </div>
    `,
  });
}
