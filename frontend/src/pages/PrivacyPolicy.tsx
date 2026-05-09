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

export default function PrivacyPolicy() {
  return (
    <StaticDocPage label="// privacy_policy" title="Privacy policy">
      <p className="text-[13px] text-[#44475a] font-mono">Last updated: 9 May 2026</p>

      <Section title="Who we are">
        <p>
          Debt Zero (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an automated debt payoff planning tool. This
          policy describes how we handle information when you use our website and services.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <span className="text-[#e2e4ec] font-medium">Account data.</span> If you sign in with Google, we receive
          the identifiers and profile details that Google shares with us (for example, email address and name) to
          create and secure your account.
        </p>
        <p>
          <span className="text-[#e2e4ec] font-medium">Financial inputs.</span> Information you enter in the planner
          (debts, income, expenses, goals, and related fields) is stored with your account so we can generate your
          report and show it when you return.
        </p>
        <p>
          <span className="text-[#e2e4ec] font-medium">Technical data.</span> We may collect standard server and
          security logs (such as IP address, device type, and timestamps) to operate the service and prevent abuse.
        </p>
      </Section>

      <Section title="How we use data">
        <p>
          We use your information only to run the product: authenticate you, store your submissions, generate
          analysis and PDFs, process payments where applicable, and respond if you contact us. We do not sell your
          personal or financial data and we do not use it to market third-party credit products to you.
        </p>
      </Section>

      <Section title="Service providers">
        <p>
          We rely on vendors that help us host the app, authenticate users, store data, and take payments (for
          example cloud infrastructure, identity providers, and payment gateways). They process data on our
          instructions and under contractual obligations appropriate to their role.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          We keep account and submission data for as long as your account exists or as needed to provide the service
          and meet legal obligations. You may request deletion of your account data where applicable; some records may
          be retained where the law requires (for example tax or payment records).
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard measures to protect data in transit and at rest. No method of transmission over the
          internet is completely secure; we encourage you to use a strong, unique password on your Google account and
          to sign out on shared devices.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can review and update much of your information by using the app while signed in. For other requests
          (access, correction, or deletion), contact us using the details on the Contact page. Where local law gives
          you additional rights, we will honour those to the extent they apply to our processing.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top will change when
          we do; continued use of the service after changes means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about privacy: see our{" "}
          <Link to="/contact" className="text-[#8b8fce] hover:underline">
            Contact
          </Link>{" "}
          page.
        </p>
      </Section>
    </StaticDocPage>
  );
}
