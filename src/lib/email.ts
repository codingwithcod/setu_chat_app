import nodemailer from "nodemailer";
import { setuLogoAttachment, SETU_LOGO_CID } from "./email-assets";

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
    subject: "Verify your Setu account ✨",
    attachments: [setuLogoAttachment],
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify your email</title>
        <!--[if mso]>
        <style type="text/css">
          table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
          a, span, td, th {mso-line-height-rule: exactly;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <!-- Main background with a subtle radial glow effect at the top -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #09090b; background-image: radial-gradient(circle at top center, rgba(232, 41, 98, 0.15) 0%, transparent 500px);">
          <tr>
            <td align="center" style="padding: 80px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 480px; margin: 0 auto;">
                
                <!-- Logo & Brand Pill -->
                <tr>
                  <td align="center" style="padding-bottom: 48px;">
                    <div style="display: inline-block; background: #ffffff; padding: 4px; border-radius: 100px; box-shadow: 0 8px 30px rgba(232, 41, 98, 0.2);">
                       <table cellpadding="0" cellspacing="0" role="presentation">
                         <tr>
                           <td style="background: linear-gradient(135deg, #e82962, #f46b32); width: 40px; height: 40px; border-radius: 100px; text-align: center; vertical-align: middle;">
                             <img src="cid:${SETU_LOGO_CID}" alt="Setu logo" width="24" height="24" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;" />
                           </td>
                           <td style="padding: 0 20px 0 12px;">
                             <span style="font-size: 20px; font-weight: 800; color: #09090b; letter-spacing: -0.5px;">Setu</span>
                           </td>
                         </tr>
                       </table>
                    </div>
                  </td>
                </tr>

                <!-- Bold Hero Headline -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 42px; font-weight: 800; letter-spacing: -1.5px; color: #ffffff; line-height: 1.1;">
                      Let's get started.
                    </h1>
                  </td>
                </tr>

                <!-- Subtext -->
                <tr>
                  <td align="center" style="padding-bottom: 48px;">
                    <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #a1a1aa; max-width: 400px;">
                      Hey <strong style="color: #ffffff;">${firstName}</strong>! Verify your email to activate your account and join the conversation.
                    </p>
                  </td>
                </tr>

                <!-- Giant Action Button -->
                <tr>
                  <td align="center" style="padding-bottom: 64px;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 22px 56px; background: linear-gradient(135deg, #e82962, #f46b32); border-radius: 100px; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; box-shadow: 0 16px 40px rgba(232, 41, 98, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);">
                      <!--[if mso]><i style="mso-font-width:400%;mso-text-raise:40" hidden>&emsp;</i><![endif]-->
                      <span style="color: #ffffff;">Verify Email Address</span>
                      <!--[if mso]><i style="mso-font-width:400%" hidden>&emsp;&#8203;</i><![endif]-->
                    </a>
                  </td>
                </tr>

                <!-- Ultra-Light Fallback Link (Guaranteed Visibility) -->
                <tr>
                  <td align="center" style="padding-bottom: 64px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border-radius: 20px; border: 1px solid #e4e4e7; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
                      <tr>
                        <td align="center" style="padding: 28px;">
                          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px;">
                            Or use this direct link
                          </p>
                          <a href="${verificationUrl}" style="color: #2563eb !important; font-size: 15px; text-decoration: underline; font-weight: 600; word-break: break-all; line-height: 1.5;">
                            ${verificationUrl}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Minimalist Footer -->
                <tr>
                  <td align="center" style="padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <span style="display: inline-block; padding: 8px 16px; background: rgba(232, 41, 98, 0.1); border-radius: 100px; color: #f17495; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                            ⏰ Expires in 10 minutes
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; line-height: 1.5;">
                            If you didn't request this email, there's nothing to worry about — you can safely ignore it.
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #52525b;">
                            &copy; ${new Date().getFullYear()} Setu Chat. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your Setu password 🔐",
    attachments: [setuLogoAttachment],
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your password</title>
        <!--[if mso]>
        <style type="text/css">
          table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
          a, span, td, th {mso-line-height-rule: exactly;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #09090b; background-image: radial-gradient(circle at top center, rgba(232, 41, 98, 0.15) 0%, transparent 500px);">
          <tr>
            <td align="center" style="padding: 80px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 480px; margin: 0 auto;">
                
                <!-- Logo & Brand Pill -->
                <tr>
                  <td align="center" style="padding-bottom: 48px;">
                    <div style="display: inline-block; background: #ffffff; padding: 4px; border-radius: 100px; box-shadow: 0 8px 30px rgba(232, 41, 98, 0.2);">
                       <table cellpadding="0" cellspacing="0" role="presentation">
                         <tr>
                           <td style="background: linear-gradient(135deg, #e82962, #f46b32); width: 40px; height: 40px; border-radius: 100px; text-align: center; vertical-align: middle;">
                             <img src="cid:${SETU_LOGO_CID}" alt="Setu logo" width="24" height="24" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;" />
                           </td>
                           <td style="padding: 0 20px 0 12px;">
                             <span style="font-size: 20px; font-weight: 800; color: #09090b; letter-spacing: -0.5px;">Setu</span>
                           </td>
                         </tr>
                       </table>
                    </div>
                  </td>
                </tr>

                <!-- Bold Hero Headline -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 42px; font-weight: 800; letter-spacing: -1.5px; color: #ffffff; line-height: 1.1;">
                      Reset your password.
                    </h1>
                  </td>
                </tr>

                <!-- Subtext -->
                <tr>
                  <td align="center" style="padding-bottom: 48px;">
                    <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #a1a1aa; max-width: 400px;">
                      Hey <strong style="color: #ffffff;">${firstName}</strong>! We received a request to reset your password. Click below to choose a new one.
                    </p>
                  </td>
                </tr>

                <!-- Giant Action Button -->
                <tr>
                  <td align="center" style="padding-bottom: 64px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 22px 56px; background: linear-gradient(135deg, #e82962, #f46b32); border-radius: 100px; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; box-shadow: 0 16px 40px rgba(232, 41, 98, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);">
                      <!--[if mso]><i style="mso-font-width:400%;mso-text-raise:40" hidden>&emsp;</i><![endif]-->
                      <span style="color: #ffffff;">Set New Password</span>
                      <!--[if mso]><i style="mso-font-width:400%" hidden>&emsp;&#8203;</i><![endif]-->
                    </a>
                  </td>
                </tr>

                <!-- Ultra-Light Fallback Link -->
                <tr>
                  <td align="center" style="padding-bottom: 64px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border-radius: 20px; border: 1px solid #e4e4e7; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
                      <tr>
                        <td align="center" style="padding: 28px;">
                          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px;">
                            Or use this direct link
                          </p>
                          <a href="${resetUrl}" style="color: #2563eb !important; font-size: 15px; text-decoration: underline; font-weight: 600; word-break: break-all; line-height: 1.5;">
                            ${resetUrl}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Minimalist Footer -->
                <tr>
                  <td align="center" style="padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <span style="display: inline-block; padding: 8px 16px; background: rgba(232, 41, 98, 0.1); border-radius: 100px; color: #f17495; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                            ⏰ Expires in 10 minutes
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; line-height: 1.5;">
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #52525b;">
                            &copy; ${new Date().getFullYear()} Setu Chat. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

