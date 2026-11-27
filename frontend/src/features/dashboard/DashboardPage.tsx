import { useCurrentUser } from '@/auth/AuthContext'

import { AdminDashboard } from './AdminDashboard'
import { JudgeDashboard } from './JudgeDashboard'
import { LawyerDashboard } from './LawyerDashboard'
import { RegistryDashboard } from './RegistryDashboard'

/**
 * Each role has its own home: a system console for administrators, a registry desk built around
 * the filing queue, the judge's board for the day, and counsel's practice overview.
 */
export default function DashboardPage() {
  const user = useCurrentUser()
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />
    case 'STAFF':
      return <RegistryDashboard />
    case 'JUDGE':
      return <JudgeDashboard />
    case 'LAWYER':
      return <LawyerDashboard />
  }
}
