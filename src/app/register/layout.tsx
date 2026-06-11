import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Join Setu Chat Application",
  description:
    "Sign up for Setu - the modern real-time chat app by Abhishek Patel (TheAbhiPatel). Free account with private messaging, groups, API access, and more.",
  openGraph: {
    title: "Create Account | Join Setu Chat Application",
    description:
      "Sign up for free and start chatting. Private messaging, group chats, developer API, and MCP server access.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
