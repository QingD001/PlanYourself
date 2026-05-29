import { redirect } from "next/navigation"
import { format } from "date-fns"

export default function DailyRedirectPage() {
  redirect(`/daily/${format(new Date(), "yyyy-MM-dd")}`)
}
