import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { StaticDocPage } from "@/components/StaticDocPage";

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "What is Debt Zero?",
    a: "Debt Zero is an automated planner that turns your loans, cards, income, and goals into a payoff order and month-by-month schedule—with optional strategies so you can compare approaches before you commit.",
  },
  {
    q: "Do you sell my data or pitch me loans?",
    a: "No. We do not sell your financial profile to lenders or brokers, and we do not use your intake to cold-call you. The flow is automated end-to-end.",
  },
  {
    q: "Is this financial or legal advice?",
    a: "No. Debt Zero is a planning and educational tool. Banks, rates, and your situation change; always verify terms with your lenders and consider speaking to a licensed professional for advice specific to you.",
  },
  {
    q: "What does the one-time fee include?",
    a: "After you pay, you unlock the full report: payoff sequence, schedule, strategy comparison where applicable, and a PDF you can download. Access is tied to the Google account you used at purchase.",
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Purchases are one-time and generally non-refundable because access is delivered immediately. See our{" "}
        <Link to="/refunds" className="text-[#8b8fce] hover:underline">
          Refund policy
        </Link>{" "}
        for details and statutory exceptions.
      </>
    ),
  },
  {
    q: "How do I sign in?",
    a: "We use Google sign-in only—no separate Debt Zero password. Use the same Google account when you return so your plan stays linked.",
  },
  {
    q: "Can I delete my data?",
    a: "Signed-in users can clear plan data from Settings where that option is available. For broader deletion requests, contact us via the Contact page.",
  },
];

export default function FAQ() {
  return (
    <StaticDocPage label="// faq" title="Frequently asked questions">
      <p className="text-[13px] text-[#44475a] -mt-2 mb-2">
        Quick answers about the product, privacy, and billing. Still stuck?{" "}
        <Link to="/contact" className="text-[#8b8fce] hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="space-y-2 -mx-1">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg overflow-hidden border border-white/[0.08] bg-[#0f0f18]/80"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-sans text-[14px] font-medium text-[#e2e4ec] select-none [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <ChevronDown
                className="w-4 h-4 shrink-0 text-[#44475a] transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="px-4 pb-4 pt-0 text-[13px] leading-[1.7] text-[#7b7f9a] border-t border-white/[0.06]">
              <p className="pt-3">{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </StaticDocPage>
  );
}
