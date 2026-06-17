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

  const [{ data: student }, { data: institution }] = await Promise.all([
    supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institutionId)
      .maybeSingle(),

    supabase
      .from('institutions')
      .select('sports')
      .eq('id', institutionId)
      .single(),
  ])

  if (!student) notFound()

  const data: StudentDetailData = {
    id: student.id,
    status: student.status === 'inactive' ? 'inactive' : 'active',
    full_name: student.full_name,
    calling_name: student.calling_name,
    dob: student.dob,
    gender: student.gender,
    student_code: student.student_code,
    enrolment_date: student.enrolment_date,
    sports: student.sports ?? [],
    guardian_name: student.guardian_name,
    guardian_mobile: student.guardian_mobile,
    guardian_email: student.guardian_email,
    sms_opt_in: student.sms_opt_in ?? true,
    jersey_size: student.jersey_size,
    jersey_number: student.jersey_number,
    jersey_name: student.jersey_name,
    monthly_fee: student.monthly_fee,
    deposit_amount: student.deposit_amount,
    institutionSports: institution?.sports ?? [],
  }

  return <StudentDetail data={data} />
}
