import { useState } from "react"
import { useParams } from "react-router"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  useOrgMembers,
  useInviteMember,
  useChangeMemberRole,
} from "@/hooks/use-orgs"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { toast } from "@/stores/toast-store"

type InviteForm = { email: string; role: "member" | "admin" | "viewer" }

const roleOptions: Array<"member" | "admin" | "owner" | "viewer"> = [
  "owner",
  "admin",
  "member",
  "viewer",
]

export function OrgMembersPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const queryClient = useQueryClient()
  const { data: members, isLoading } = useOrgMembers(orgId ?? "")
  const invite = useInviteMember(orgId ?? "")
  const changeRole = useChangeMemberRole(orgId ?? "")
  const usage = useUsage(orgId)
  const membersLimited = usage.isAtLimit("members")
  const [showInvite, setShowInvite] = useState(false)
  const { register, handleSubmit, reset } = useForm<InviteForm>({
    defaultValues: { email: "", role: "member" },
  })

  async function onInvite(data: InviteForm) {
    try {
      await invite.mutateAsync({ email: data.email, role: data.role })
      reset()
      setShowInvite(false)
    } catch (error) {
      if (!handleLimitError(error, orgId ?? "", queryClient)) {
        toast.error(
          (error as Error).message ?? "Something went wrong. Try again."
        )
      }
    }
  }

  const inviteButton = (
    <Button onClick={() => setShowInvite((s) => !s)} disabled={membersLimited}>
      {showInvite ? "Cancel" : "Invite"}
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        {membersLimited ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex" data-testid="limit-tooltip" />
              }
            >
              {inviteButton}
            </TooltipTrigger>
            <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
          </Tooltip>
        ) : (
          inviteButton
        )}
      </div>

      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onInvite)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  {...register("role")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Sending..." : "Send invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading members...</p>
      ) : members && members.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-3">{m.name}</td>
                    <td className="p-3 text-muted-foreground">{m.email}</td>
                    <td className="p-3">
                      <select
                        value={m.role}
                        disabled={m.role === "owner"}
                        onChange={(e) =>
                          changeRole.mutate({
                            userId: m.userId,
                            role: e.target.value as
                              | "member"
                              | "admin"
                              | "viewer",
                          })
                        }
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      )}
    </div>
  )
}
