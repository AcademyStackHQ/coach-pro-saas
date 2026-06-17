import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How CoachPro collects, uses, and protects the personal data of academies, coaches, students, and parents.",
  alternates: { canonical: "https://coachpro.in/privacy" },
}

const LAST_UPDATED = "16 June 2026"

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        <section>
          <p>
            CoachPro (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a cloud
            platform that helps academies and institutes manage students,
            schedules, fees, and communications. This policy explains what
            personal data we process and how we protect it. We comply with
            India&rsquo;s Digital Personal Data Protection Act, 2023 (DPDP Act).
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account data</strong> — institution name, your name,
              email, mobile number, and password (stored hashed).
            </li>
            <li>
              <strong>Operational data you enter</strong> — student profiles,
              guardian contacts, batch schedules, attendance, and fee records.
            </li>
            <li>
              <strong>Usage data</strong> — log data, device and browser
              information, and cookies needed to keep you signed in.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use your data</h2>
          <ul>
            <li>To provide, maintain, and improve the CoachPro service.</li>
            <li>
              To process payments and send transactional messages such as fee
              reminders and receipts.
            </li>
            <li>To respond to support requests and secure your account.</li>
          </ul>
          <p>We do not sell your personal data.</p>
        </section>

        <section>
          <h2>Data sharing</h2>
          <p>
            We share data only with service providers who help us run CoachPro
            (for example, hosting, payment, and messaging providers), and where
            required by law. Each academy&rsquo;s data is logically isolated from
            every other academy.
          </p>
        </section>

        <section>
          <h2>Data retention &amp; security</h2>
          <p>
            We retain your data for as long as your account is active and as
            needed to comply with legal obligations. We use industry-standard
            safeguards including encryption in transit and role-based access
            control.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            You may access, correct, or request deletion of your personal data,
            and withdraw consent at any time. To exercise these rights, contact
            us at{" "}
            <a
              href="mailto:vinothdevaraj14@gmail.com"
              className="text-primary hover:underline"
            >
              vinothdevaraj14@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy? Email{" "}
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
