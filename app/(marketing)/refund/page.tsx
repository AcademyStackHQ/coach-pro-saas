import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "CoachPro's cancellation and refund policy for monthly and annual subscriptions.",
  alternates: { canonical: "https://coachpro.in/refund" },
}

const LAST_UPDATED = "16 June 2026"

export default function RefundPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Refund Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        <section>
          <p>
            We want you to be happy with CoachPro. This policy explains how
            cancellations and refunds work for paid plans.
          </p>
        </section>

        <section>
          <h2>Free plan</h2>
          <p>
            The Free plan costs nothing and can be used for as long as you like.
            No payment, no refund needed.
          </p>
        </section>

        <section>
          <h2>Cancellation</h2>
          <p>
            You can cancel a paid plan at any time from your account settings.
            Your plan stays active until the end of the current billing period,
            after which it will not renew.
          </p>
        </section>

        <section>
          <h2>Refunds</h2>
          <ul>
            <li>
              <strong>Monthly plans</strong> — monthly charges are
              non-refundable once the billing period has begun, but you will not
              be charged again after you cancel.
            </li>
            <li>
              <strong>Annual plans</strong> — if you cancel within 7 days of the
              first annual payment and have not made substantial use of paid
              features, you may request a full refund. After 7 days, annual plans
              are non-refundable.
            </li>
            <li>
              <strong>Billing errors</strong> — if you were charged in error or
              charged twice, we will refund the incorrect amount in full.
            </li>
          </ul>
        </section>

        <section>
          <h2>How to request a refund</h2>
          <p>
            Email{" "}
            <a
              href="mailto:vinothdevaraj14@gmail.com"
              className="text-primary hover:underline"
            >
              vinothdevaraj14@gmail.com
            </a>{" "}
            from your account email with your institution name and the payment
            details. Approved refunds are processed to the original payment
            method within 5&ndash;10 business days.
          </p>
        </section>
      </div>
    </article>
  )
}
