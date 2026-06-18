import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { StudentDetail, type StudentDetailData } from './StudentDetail'

export const metadata = { title: 'Student — CoachPro' }

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin')

  const { id } = await params
  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value

  const supabase = await createClient()

  const [{ data: student }, { data: institution }, { data: enrolments }] =
    await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .eq('institution_id', institutionId)
        .maybeSingle(),

      supabase
        .from('institutions')
        .select('programs')
        .eq('id', institutionId)
        .single(),

      supabase
        .from('batch_students')
        .select('id, status, batches(id, name, program)')
        .eq('student_id', id)
        .neq('status', 'dropped')
        .order('enrolled_at', { ascending: true }),
    ])

  if (!student) notFound()

  const batches: StudentDetailData['batches'] = (enrolments ?? [])
    .filter((e) => e.batches)
    .map((e) => ({
      id: e.batches!.id,
      name: e.batches!.name,
      program: e.batches!.program,
      status: e.status as 'active' | 'waitlisted',
    }))

  const data: StudentDetailData = {
    id: student.id,
    status: student.status === 'inactive' ? 'inactive' : 'active',
    full_name: student.full_name,
    calling_name: student.calling_name,
    dob: student.dob,
    gender: student.gender,
    student_code: student.student_code,
    user_id: student.user_id,
    enrolment_date: student.enrolment_date,
    programs: student.programs ?? [],
    parent_name: student.parent_name,
    parent_mobile: student.parent_mobile,
    parent_email: student.parent_email,
    sms_opt_in: student.sms_opt_in ?? true,
    uniform_size: student.uniform_size,
    uniform_number: student.uniform_number,
    uniform_name: student.uniform_name,
    monthly_fee: student.monthly_fee,
    deposit_amount: student.deposit_amount,
    institutionPrograms: institution?.programs ?? [],
    batches,
  }

  return <StudentDetail data={data} />
}
