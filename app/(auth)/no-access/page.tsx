import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { signOut } from "@/app/(auth)/login/actions"

export default function NoAccessPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <ShieldX className="mb-2 size-12 text-muted-foreground" />
        <CardTitle>No institution access</CardTitle>
        <CardDescription className="max-w-xs">
          Your account isn&apos;t linked to any institution yet. Contact your
          institution admin to get added, then sign in again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Are you setting up a new institution?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register here
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
