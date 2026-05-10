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
    subject: "Verify your Setu account ✨",
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
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f4f4f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="max-width: 460px; width: 100%;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background: linear-gradient(135deg, #e82962, #f46b32); border-radius: 14px; padding: 10px 14px; display: inline-block; box-shadow: 0 4px 15px rgba(232, 41, 98, 0.3);">
                            <span style="font-size: 18px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">💬</span>
                          </td>
                          <td style="padding-left: 12px;">
                            <span style="font-size: 28px; font-weight: 800; color: #f17495; letter-spacing: -1px;">Setu</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Card -->
                  <tr>
                    <td style="background: linear-gradient(145deg, #18181b 0%, #0f0f13 50%, #18181b 100%); border-radius: 20px; border: 1px solid rgba(232, 41, 98, 0.15); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(232, 41, 98, 0.08);">
                      
                      <!-- Gradient accent bar -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="height: 4px; background: linear-gradient(90deg, #e82962, #f46b32, #f17495); border-radius: 20px 20px 0 0;"></td>
                        </tr>
                      </table>

                      <!-- Content -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 44px 40px 40px;">
                        <tr>
                          <td>
                            <!-- Greeting -->
                            <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                              Hey ${firstName}! 👋
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
                              Welcome to <strong style="color: #f17495;">Setu</strong> — your new home for seamless conversations. Just one quick step to get started.
                            </p>

                            <!-- Divider -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                              <tr>
                                <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(232, 41, 98, 0.3), transparent);"></td>
                              </tr>
                            </table>

                            <!-- Icon + Message -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                              <tr>
                                <td align="center">
                                  <div style="width: 64px; height: 64px; background: rgba(232, 41, 98, 0.1); border-radius: 50%; border: 2px solid rgba(232, 41, 98, 0.2); line-height: 64px; text-align: center; font-size: 28px; margin: 0 auto 16px;">
                                    ✉️
                                  </div>
                                  <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                                    Click the button below to verify your email address
                                  </p>
                                </td>
                              </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                              <tr>
                                <td align="center">
                                  <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e82962 0%, #f46b32 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 20px rgba(232, 41, 98, 0.4), 0 0 0 1px rgba(241, 116, 149, 0.2); mso-padding-alt: 0;">
                                    <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:30" hidden>&emsp;</i><![endif]-->
                                    <span style="color: #ffffff;">Verify My Email</span>
                                    <!--[if mso]><i style="mso-font-width:300%" hidden>&emsp;&#8203;</i><![endif]-->
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <!-- Divider -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                              <tr>
                                <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(232, 41, 98, 0.2), transparent);"></td>
                              </tr>
                            </table>

                            <!-- Fallback Link -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px 18px;">
                                  <p style="margin: 0 0 8px; font-size: 12px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                                    Or copy this link
                                  </p>
                                  <p style="margin: 0; font-size: 14px; line-height: 1.6; word-break: break-all;">
                                    <a href="${verificationUrl}" style="color: #2563eb !important; text-decoration: underline; font-weight: 500;">
                                      ${verificationUrl}
                                    </a>
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 28px 20px 0; text-align: center;">
                      <p style="margin: 0 0 6px; font-size: 12px; color: #a1a1aa;">
                        ⏰ This link expires in <strong style="color: #f17495;">10 minutes</strong>
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #71717a;">
                        Didn't create a Setu account? You can safely ignore this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Brand footer -->
                  <tr>
                    <td style="padding: 32px 20px 0; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #71717a;">
                        Made with <span style="color: #e82962;">❤️</span> by the Setu team
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    \`,
  });
}

