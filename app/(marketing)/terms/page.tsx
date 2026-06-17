import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the CoachPro academy management platform.",
  alternates: { canonical: "https://coachpro.in/terms" },
}

const LAST_UPDATED = "16 June 2026"

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        <section>
          <p>
            These Terms govern your access to and use of CoachPro
            (&ldquo;the Service&rdquo;). By creating an account you agree to these
            Terms. If you are accepting on behalf of an institution, you confirm
            you are authorised to do so.
          </p>
        </section>

        <section>
          <h2>Accounts</h2>
          <p>
            You are responsible for keeping your login credentials secure and
            for all activity under your account. You must provide accurate
            information and keep it up to date.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <ul>
            <li>Do not use the Service for any unlawful purpose.</li>
            <li>
              Do not attempt to disrupt, reverse engineer, or gain unauthorised
              access to the Service or other academies&rsquo; data.
            </li>
            <li>
              You are responsible for obtaining any consents required to store
              the student and guardian data you upload.
            </li>
          </ul>
        </section>

        <section>
          <h2>Plans &amp; payment</h2>
          <p>
            Paid plans are billed in advance on a monthly or annual basis. Fees
            are stated in Indian Rupees and are exclusive of applicable taxes
            unless stated otherwise. Refunds are handled under our{" "}
            <a href="/refund" className="text-primary hover:underline">
              Refund Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Your data</h2>
          <p>
            You retain ownership of the data you enter. We process it as
            described in our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            . You may export or request deletion of your data at any time.
          </p>
        </section>

        <section>
          <h2>Availability &amp; liability</h2>
          <p>
            We work to keep the Service available but do not guarantee
            uninterrupted access. To the extent permitted by law, CoachPro is not
            liable for indirect or consequential damages, and our total liability
            is limited to the fees you paid in the preceding twelve months.
          </p>
        </section>

        <section>
          <h2>Termination</h2>
          <p>
            You may cancel at any time. We may suspend or terminate accounts that
            breach these Terms. On termination, your right to use the Service
            ends and we may delete your data after a reasonable retention period.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:vinothdevaraj14@gmail.com"
              className="text-primary hover:underline"
            >
              vinothdevaraj14@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  )
}
