import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { StaticDocPage } from "@/components/StaticDocPage";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-sans text-[15px] font-semibold text-[#e2e4ec] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <StaticDocPage label="// terms_of_service" title="Terms of service">
      <p className="text-[13px] text-[#44475a] font-mono">Last updated: 9 May 2026</p>

      <div
        className="rounded-lg px-4 py-3 mb-6"
        style={{
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
        }}
        role="note"
      >
        <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-[#fcd34d] mb-2">
          Regulatory notice (India)
        </p>
        <p className="text-[14px] text-[#e2e4ec] leading-relaxed font-medium">
          Debt Zero is <strong>not</strong> registered with the Securities and Exchange Board of India (&ldquo;SEBI&rdquo;)
          in any capacity—including as an investment adviser, research analyst, portfolio manager, or stock broker.
          Nothing on this website, in our software output, or in any downloadable report constitutes SEBI-regulated
          investment advice, a research report, or a recommendation to buy, sell, or hold any security or investment
          product.
        </p>
      </div>

      <Section title="Nature of the service">
        <p>
          Debt Zero provides an <span className="text-[#e2e4ec] font-medium">automated debt payoff planning tool</span>{" "}
          that uses the information you supply (such as debts, income, and expenses) to generate illustrative schedules,
          comparisons, and narrative summaries. Outputs are for your personal, non-commercial planning and education. They
          are not a substitute for advice from qualified professionals such as SEBI-registered investment advisers,
          chartered accountants, credit counsellors, or lawyers, where those apply to your situation.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          We strive for accuracy and clarity, but we do not warrant that any output is complete, error-free, or
          suitable for your circumstances. You use the service at your own risk. Past or simulated results are not
          indicative of future outcomes.
        </p>
      </Section>

      <Section title="Account and acceptable use">
        <p>
          You are responsible for activity under your account. You agree not to misuse the service, attempt to access
          data you are not entitled to, or use outputs in a way that violates applicable law. We may suspend or terminate
          access where reasonably necessary to protect the service or other users.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Paid features are described at checkout. For refund rules, see our{" "}
          <Link to="/refunds" className="text-[#8b8fce] hover:underline">
            Refund policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Privacy">
        <p>
          Our{" "}
          <Link to="/privacy" className="text-[#8b8fce] hover:underline">
            Privacy policy
          </Link>{" "}
          describes how we handle personal and financial information you provide.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms from time to time. The &ldquo;Last updated&rdquo; date will change when we do;
          continued use after changes constitutes acceptance of the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms: see our{" "}
          <Link to="/contact" className="text-[#8b8fce] hover:underline">
            Contact
          </Link>{" "}
          page.
        </p>
      </Section>
    </StaticDocPage>
  );
}
