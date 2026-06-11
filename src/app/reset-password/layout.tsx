import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password | Setu Chat Application",
  description:
    "Set a new password for your Setu chat account. Secure password reset with strong validation requirements.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
