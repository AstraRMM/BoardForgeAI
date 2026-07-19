import { redirect } from 'next/navigation'

/** Legacy inspection URL retained as a single-hop alias for the import workflow. */
export default function UploadKicadPage() {
  redirect('/import')
}
