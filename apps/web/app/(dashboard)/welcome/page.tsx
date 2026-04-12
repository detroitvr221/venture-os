"use client";

import { useState } from "react";
import Link from "next/link";
import { Rocket, FileText, Phone, LayoutDashboard, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Rocket,
    title: "Welcome to Northbridge Digital",
    description:
      "We're excited to have you onboard. Let's get your account set up in a few simple steps so we can start building your digital presence.",
    color: "#4FC3F7",
  },
  {
    icon: FileText,
    title: "Complete Your Intake Form",
    description:
      "Tell us about your business, goals, and current digital presence so we can tailor our approach.",
    href: "/intake",
    cta: "Go to Intake Form",
    color: "#F5C542",
  },
  {
    icon: Phone,
    title: "Book Your Strategy Call",
    description:
      "Schedule a free consultation with our team to discuss your goals and create a custom plan.",
    href: "/book",
    cta: "Book a Call",
    color: "#22c55e",
  },
  {
    icon: LayoutDashboard,
    title: "Explore Your Dashboard",
    description:
      "Check out your client portal where you can track projects, view proposals, communicate with our team, and more.",
    href: "/overview",
    cta: "Go to Dashboard",
    color: "#f59e0b",
  },
];

export default function WelcomePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentStep
                  ? "w-8 bg-[#4FC3F7]"
                  : i < currentStep
                    ? "w-2 bg-[#22c55e]"
                    : "w-2 bg-[#333]"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${step.color}20` }}
          >
            <Icon className="h-8 w-8" style={{ color: step.color }} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-white">{step.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#888]">
            {step.description}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            {step.href ? (
              <Link
                href={step.href}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {step.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="text-sm text-[#666] transition hover:text-white"
              >
                {currentStep === 0 ? "Skip intro" : "Skip this step"}
              </button>
            ) : (
              <Link
                href="/overview"
                className="text-sm text-[#666] transition hover:text-white"
              >
                Skip to dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Step checklist */}
        <div className="mt-6 space-y-2">
          {steps.slice(1).map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm ${
                i + 1 <= currentStep ? "text-[#22c55e]" : "text-[#555]"
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  i + 1 <= currentStep ? "text-[#22c55e]" : "text-[#333]"
                }`}
              />
              {s.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
