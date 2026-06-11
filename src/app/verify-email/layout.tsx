import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | Setu Chat Application",
  description:
    "Verify your email address to activate your Setu chat account and start messaging.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
