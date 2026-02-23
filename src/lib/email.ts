import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your Setu account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #0f0f23; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 500px; margin: 40px auto; padding: 40px; background: linear-gradient(135deg, #1a1a3e 0%, #16213e 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2); }
            .logo { text-align: center; font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #818cf8, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
            h1 { font-size: 22px; margin-bottom: 16px; color: #f1f5f9; }
            p { color: #94a3b8; line-height: 1.7; font-size: 15px; }
            .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #818cf8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 24px 0; }
            .footer { margin-top: 32px; font-size: 13px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Setu</div>
            <h1>Welcome, ${firstName}! 👋</h1>
            <p>Thank you for joining Setu. Please verify your email address to get started.</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, copy and paste this link:<br/>
              <span style="color: #818cf8; word-break: break-all;">${verificationUrl}</span>
            </p>
            <div class="footer">
              This link expires in 24 hours.<br/>
              If you didn't create this account, please ignore this email.
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
