const CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const SCRIPT_ATTR = "data-debt-zero-razorpay";

function findCheckoutScript(): HTMLScriptElement | null {
  return (
    document.querySelector<HTMLScriptElement>(`script[${SCRIPT_ATTR}]`) ??
    document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_URL}"]`) ??
    document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]')
  );
}

/** Load Razorpay checkout only when starting a card payment (avoids chunk storm on teaser/dashboard idle). */
export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (typeof window.Razorpay === "function") return Promise.resolve();

  const existing = findCheckoutScript();
  if (existing) {
    return new Promise((resolve, reject) => {
      if (typeof window.Razorpay === "function") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_URL;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "1");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed"));
    document.body.appendChild(script);
  });
}

/** Remove checkout bootstrap script after payment navigation so the dashboard does not keep Razorpay activity. */
export function removeRazorpayCheckoutScript(): void {
  document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach((el) => el.remove());
  try {
    delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  } catch {
    /* ignore */
  }
}
