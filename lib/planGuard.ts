import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_PLAN_LIMITS } from '@/lib/constants'

export class PlanLimitError extends Error {
  constructor(
    public readonly resource: 'student' | 'coach' | 'batch',
    public readonly limit: number
  ) {
    super(
      `Free plan limit reached: you can have up to ${limit} ${resource}(s). Upgrade to add more.`
    )
    this.name = 'PlanLimitError'
  }
}

/**
 * Throws PlanLimitError if the free-plan quota for `resource` is exhausted.
 * Must be called server-side before inserting a new coach, student, or batch.
 * No-op for pro/enterprise institutions.
 */
export async function planGuard(
  supabase: SupabaseClient,
  institutionId: string,
  resource: 'student' | 'coach' | 'batch'
): Promise<void> {
  const { data: inst } = await supabase
    .from('institutions')
    .select('plan')
    .eq('id', institutionId)
    .single()

  // Pro and enterprise have no enforced limits.
  if (!inst || inst.plan !== 'free') return

  const limit = FREE_PLAN_LIMITS[resource]

  // Batch table is introduced in Module 5; guard wired up then.
  if (resource === 'batch') return

  // Students are academy-owned records (the `students` table), NOT
  // institution_members — count them there so the Free limit actually fires.
  if (resource === 'student') {
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('status', 'active')

    if ((count ?? 0) >= limit) throw new PlanLimitError('student', limit)
    return
  }

  // Coaches are members with role='coach'.
  const { count } = await supabase
    .from('institution_members')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('role', 'coach')
    .eq('status', 'active')

  if ((count ?? 0) >= limit) throw new PlanLimitError(resource, limit)
}
