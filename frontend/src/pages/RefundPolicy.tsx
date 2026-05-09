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

export default function RefundPolicy() {
  return (
    <StaticDocPage label="// refund_policy" title="Refund policy">
      <p className="text-[13px] text-[#44475a] font-mono">Last updated: 9 May 2026</p>

      <Section title="One-time purchase">
        <p>
          Unlocking your full Debt Zero report is a <span className="text-[#e2e4ec] font-medium">one-time payment</span>
          , not a subscription. Once payment is confirmed, you receive ongoing access to the purchased report for that
          account, subject to our{" "}
          <Link to="/terms" className="text-[#8b8fce] hover:underline">
            terms of service
          </Link>{" "}
          and account status.
        </p>
      </Section>

      <Section title="No refunds">
        <p>
          Because the product is delivered instantly as digital access and generated analysis,{" "}
          <span className="text-[#e2e4ec] font-medium">all sales are final</span> and we do not offer refunds,
          credits, or chargebacks except where we are legally required to provide a remedy.
        </p>
        <p>
          Please review the free preview and product description before paying. If something fails on our side (for
          example payment succeeded but access did not unlock), contact us and we will work to fix access first.
        </p>
      </Section>

      <Section title="Statutory rights">
        <p>
          Nothing in this policy limits any non-waivable rights you may have under applicable consumer or payment
          network rules. If a mandatory cooling-off or dispute process applies in your jurisdiction, that law
          prevails to the extent required.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For billing or access issues, reach out through the details on our Contact page and include the email on
          your account and approximate time of purchase.
        </p>
      </Section>
    </StaticDocPage>
  );
}
