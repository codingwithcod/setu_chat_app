import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Setu Chat Application",
  description:
    "Forgot your Setu password? Enter your email to receive a secure password reset link. Setu - real-time chat by Abhishek Patel (TheAbhiPatel).",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
