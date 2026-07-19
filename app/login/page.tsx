import { AuthExperience } from '../../apps/web/src/components/auth/AuthExperience'
import { getAuthEnvironment } from '../../apps/web/src/lib/auth'

export default function LoginPage() {
  const auth = getAuthEnvironment()
  return <AuthExperience mode="login" ready={auth.ready} missing={auth.missing} />
}
