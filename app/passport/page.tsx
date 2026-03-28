import { Suspense } from "react"

import PassportScreen from "@/components/passport/passport-screen"

export default function PassportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7]" />}>
      <PassportScreen />
    </Suspense>
  )
}
