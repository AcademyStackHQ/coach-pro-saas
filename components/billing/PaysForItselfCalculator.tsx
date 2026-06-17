"use client"

import { useState } from "react"
import {
  FREE_PLAN_LIMITS,
  PER_STUDENT_MONTHLY,
  PER_STUDENT_ANNUAL,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

const FREE_STUDENTS = FREE_PLAN_LIMITS.student

/**
 * Admin-only ROI tool for the billing section. Shows an academy how a small
 * per-student tech fee covers (and can outgrow) their CoachPro bill.
 *
 * NOTE: This is intentionally NOT used on the public marketing site — the
 * "you keep extra" framing is for the academy owner, not parents/students.
 */
export function PaysForItselfCalculator({
  annual = false,
  initialStudents = 50,
}: {
  annual?: boolean
  initialStudents?: number
}) {
  const [students, setStudents] = useState(initialStudents)
  const [surcharge, setSurcharge] = useState(25)

  const rate = annual ? PER_STUDENT_ANNUAL : PER_STUDENT_MONTHLY
  const billable = Math.max(0, students - FREE_STUDENTS)
  const softwareCost = billable * rate
  const collected = students * surcharge
  const net = collected - softwareCost

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
          See how it pays for itself
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a small tech fee to each student&apos;s monthly fee — CoachPro costs you nothing.
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-foreground">
            Active students
            <span className="text-base font-bold text-primary">{students}</span>
          </label>
          <input
            type="range"
            min={1}
            max={500}
            value={students}
            onChange={(e) => setStudents(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-foreground">
            Tech fee per student
            <span className="text-base font-bold text-primary">₹{surcharge}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={surcharge}
            onChange={(e) => setSurcharge(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">You pay CoachPro</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            ₹{softwareCost.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {billable} billable · {Math.min(students, FREE_STUDENTS)} free
          </p>
        </div>
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">You collect from students</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            ₹{collected.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {students} × ₹{surcharge}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4 text-center",
            net >= 0 ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"
          )}
        >
          <p className="text-xs text-muted-foreground">
            {net >= 0 ? "You keep" : "Out of pocket"}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              net >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
            )}
          >
            ₹{Math.abs(net).toLocaleString("en-IN")}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">after software cost</p>
        </div>
      </div>

      {net >= 0 && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          A ₹{surcharge} tech fee covers CoachPro and leaves you{" "}
          <span className="font-semibold text-foreground">
            ₹{net.toLocaleString("en-IN")}/mo
          </span>{" "}
          ahead. It literally pays for itself.
        </p>
      )}
    </div>
  )
}
