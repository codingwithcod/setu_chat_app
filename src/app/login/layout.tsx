import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to Setu | Secure Chat Login",
  description:
    "Log in to your Setu chat account. Access real-time messaging, group chats, and more. Setu - a modern chat application built by Abhishek Patel (TheAbhiPatel).",
  openGraph: {
    title: "Sign In to Setu | Secure Chat Login",
    description:
      "Log in to your Setu chat account for real-time messaging, group chats, and developer API access.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
