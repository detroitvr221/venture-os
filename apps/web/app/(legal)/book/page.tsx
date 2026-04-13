import type { Metadata } from "next";
import BookClient from "./BookClient";

export const metadata: Metadata = {
  title: "Book a Free Consultation",
  description:
    "Schedule a free consultation with Northbridge Digital. Discuss your website, SEO, and digital growth goals with our team.",
  robots: { index: true, follow: true },
};

export default function BookingPage() {
  return <BookClient />;
}
