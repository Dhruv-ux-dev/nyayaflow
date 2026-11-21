import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'

import { RequireAuth, RequireRole } from '@/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import { SkeletonRows } from '@/components/ui/feedback'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage } from '@/features/errors/ErrorPages'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const CaseListPage = lazy(() => import('@/features/cases/CaseListPage'))
const CaseFormPage = lazy(() => import('@/features/cases/CaseFormPage'))
const CaseDetailPage = lazy(() => import('@/features/cases/CaseDetailPage'))
const HearingsPage = lazy(() => import('@/features/hearings/HearingsPage'))
const CalendarPage = lazy(() => import('@/features/hearings/CalendarPage'))
const DeadlinesPage = lazy(() => import('@/features/deadlines/DeadlinesPage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const UsersPage = lazy(() => import('@/features/admin/UsersPage'))
const CourtsPage = lazy(() => import('@/features/admin/CourtsPage'))
const AuditPage = lazy(() => import('@/features/admin/AuditPage'))

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SkeletonRows rows={6} />}>{children}</Suspense>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Page><DashboardPage /></Page>} />
        <Route path="cases" element={<Page><CaseListPage /></Page>} />
        <Route
          path="cases/new"
          element={
            <RequireRole roles={['STAFF', 'ADMIN']}>
              <Page><CaseFormPage /></Page>
            </RequireRole>
          }
        />
        <Route path="cases/:caseId" element={<Page><CaseDetailPage /></Page>} />
        <Route
          path="cases/:caseId/edit"
          element={
            <RequireRole roles={['STAFF', 'ADMIN']}>
              <Page><CaseFormPage /></Page>
            </RequireRole>
          }
        />
        <Route path="hearings" element={<Page><HearingsPage /></Page>} />
        <Route path="calendar" element={<Page><CalendarPage /></Page>} />
        <Route path="deadlines" element={<Page><DeadlinesPage /></Page>} />
        <Route path="documents" element={<Page><DocumentsPage /></Page>} />
        <Route path="orders" element={<Page><OrdersPage /></Page>} />
        <Route path="notifications" element={<Page><NotificationsPage /></Page>} />
        <Route path="profile" element={<Page><ProfilePage /></Page>} />
        <Route
          path="admin/users"
          element={
            <RequireRole roles={['ADMIN']}>
              <Page><UsersPage /></Page>
            </RequireRole>
          }
        />
        <Route
          path="admin/courts"
          element={
            <RequireRole roles={['ADMIN']}>
              <Page><CourtsPage /></Page>
            </RequireRole>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RequireRole roles={['ADMIN']}>
              <Page><AuditPage /></Page>
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
