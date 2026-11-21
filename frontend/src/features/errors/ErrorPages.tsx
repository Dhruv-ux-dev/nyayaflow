import { FileQuestion, ShieldX } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { useDocumentTitle } from '@/lib/hooks'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <EmptyState
      icon={FileQuestion}
      title="This page does not exist"
      description="The link may be mistyped, or the page may have moved."
      action={
        <Button asChild variant="primary">
          <Link to="/">Go to dashboard</Link>
        </Button>
      }
      className="py-24"
    />
  )
}

export function ForbiddenPage() {
  useDocumentTitle('No access')
  return (
    <EmptyState
      icon={ShieldX}
      title="You do not have access to this page"
      description="Your role does not include this area of NyayaFlow. Ask an administrator if you need access."
      action={
        <Button asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
      }
      className="py-24"
    />
  )
}
