import { AuthExperience } from '../../apps/web/src/components/auth/AuthExperience'
import { getAuthEnvironment } from '../../apps/web/src/lib/auth'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const auth = getAuthEnvironment()
  return <AuthExperience mode="signup" ready={auth.ready} missing={auth.missing} />
}
