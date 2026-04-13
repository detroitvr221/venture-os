import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join Northbridge Digital. Get started with websites, SEO, social media, and digital growth packages from $199/mo.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupClient />;
}
