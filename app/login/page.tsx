import { AuthExperience } from '../../apps/web/src/components/auth/AuthExperience'
import { getAuthEnvironment } from '../../apps/web/src/lib/auth'

// Auth configuration belongs to the deployment runtime. Rendering dynamically
// avoids shipping a stale "missing env" page after a Vercel env update.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const auth = getAuthEnvironment()
  return <AuthExperience mode="login" ready={auth.ready} missing={auth.missing} />
}
