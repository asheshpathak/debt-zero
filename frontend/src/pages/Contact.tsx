import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { StaticDocPage } from "@/components/StaticDocPage";

const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || "support@debtzero.app";

export default function Contact() {
  return (
    <StaticDocPage label="// contact" title="Contact us">
      <p>
        We run Debt Zero as a small, automated product. We read every message and reply as soon as we can—typically
        within a few business days.
      </p>

      <div
        className="rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{
          background: "rgba(91,95,199,0.08)",
          border: "1px solid rgba(91,95,199,0.2)",
        }}
      >
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(91,95,199,0.15)" }}
        >
          <Mail className="w-5 h-5 text-[#8b8fce]" aria-hidden />
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#44475a] mb-1">Email</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-mono text-[15px] text-[#e2e4ec] hover:text-[#8b8fce] transition-colors break-all"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <section>
        <h2 className="font-sans text-[15px] font-semibold text-[#e2e4ec] mb-3">What to include</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>The Google email on your Debt Zero account</li>
          <li>For payment issues: date and amount, and whether access unlocked</li>
          <li>For bugs: what you expected, what happened, and your browser or device</li>
        </ul>
      </section>

      <p className="text-[13px] text-[#44475a]">
        For general product questions, see the{" "}
        <Link to="/faq" className="text-[#8b8fce] hover:underline">
          FAQ
        </Link>
        . For legal topics, see the{" "}
        <Link to="/terms" className="text-[#8b8fce] hover:underline">
          Terms of service
        </Link>{" "}
        (including our SEBI non-registration notice). For privacy, see the{" "}
        <Link to="/privacy" className="text-[#8b8fce] hover:underline">
          Privacy policy
        </Link>
        .
      </p>
    </StaticDocPage>
  );
}
