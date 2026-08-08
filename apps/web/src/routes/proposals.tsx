import { useMemo, useState } from "react"
import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAiGenerate, useAiClarify } from "@/hooks/use-ai"
import { useProposals } from "@/hooks/use-proposals"
import { useProject } from "@/hooks/use-projects"
import { useCards } from "@/hooks/use-cards"
import { useProjectEvents } from "@/hooks/use-project-events"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { useChatMessages, useAddChatMessage } from "@/hooks/use-chat"
import { LiveIndicator } from "@/components/live-indicator"
import { ProjectTabs } from "@/components/project-tabs"
import { ChatThread } from "@/components/chat-thread"
import { ProposalReview } from "@/components/proposal-review"

export function ProposalsPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const generate = useAiGenerate(slug ?? "")
  const clarify = useAiClarify(slug ?? "")
  const { data: proposals } = useProposals(slug)
  const { data: projectDetail } = useProject(slug)
  const { data: cards } = useCards(slug)
  const orgId = projectDetail?.project.orgId
  const events = useProjectEvents(slug, {})
  const usage = useUsage(orgId)
  const aiActionsLimited = usage.isAtLimit("aiActions")
  const { data: chatMessages = [] } = useChatMessages(slug)
  const addMessage = useAddChatMessage(slug ?? "")
  const [prompt, setPrompt] = useState("")
  const [pending, setPending] = useState(false)
  const [priorAnswers, setPriorAnswers] = useState("")
  const restoredPriorAnswers = useMemo(() => {
    const persisted = chatMessages.filter(
      (m) =>
        m.role === "user" &&
        m.kind === "prompt" &&
        m.content.startsWith("Answers:")
    )
    if (persisted.length === 0) return ""
    const last = persisted[persisted.length - 1]
    return last.content.replace(/^Answers:\n/, "")
  }, [chatMessages])

  const pendingCount =
    proposals?.filter((p) => p.status === "pending").length ?? 0

  async function persistPair(
    userText: string,
    aiReply: {
      kind: "board" | "clarifying" | "error"
      content?: string
      questions?: { question: string; options?: string[] }[]
      proposalId?: string
    }
  ) {
    if (!slug) return
    await addMessage.mutateAsync({
      role: "user",
      kind: "prompt",
      content: userText,
    })
    await addMessage.mutateAsync({
      role: "ai",
      kind: aiReply.kind,
      content: aiReply.content ?? "",
      questions: aiReply.questions ?? null,
      proposalId: aiReply.proposalId ?? null,
    })
  }

  async function onGenerate() {
    if (!prompt.trim() || pending) return
    const userPrompt = prompt
    setPrompt("")
    setPending(true)
    try {
      const result = await generate.mutateAsync({ prompt: userPrompt })
      if (result.kind === "clarifying") {
        await persistPair(userPrompt, {
          kind: "clarifying",
          questions: result.questions,
        })
      } else {
        await persistPair(userPrompt, {
          kind: "board",
          content: `Generated ${result.proposal.changeCount} story cards.`,
          proposalId: result.proposal.proposalId,
        })
      }
    } catch (e) {
      if (handleLimitError(e, orgId ?? "", queryClient)) return
      await persistPair(userPrompt, {
        kind: "error",
        content: (e as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  async function onClarifyAnswer(index: number, answers: string[]) {
    const message = chatMessages[index]
    const qs = message?.questions ?? []
    if (qs.length === 0) return
    const summary = qs
      .map((q, qi) => `${q.question} → ${answers[qi] ?? ""}`)
      .join("\n")
    const currentPrior = priorAnswers || restoredPriorAnswers
    const newPrior = currentPrior ? `${currentPrior}\n${summary}` : summary
    setPriorAnswers(newPrior)
    await addMessage.mutateAsync({
      role: "user",
      kind: "prompt",
      content: `Answers:\n${summary}`,
    })
    setPending(true)
    try {
      const result = await clarify.mutateAsync({
        question: qs.map((q) => q.question).join(" | "),
        answer: answers.join(" | "),
        priorAnswers: newPrior,
        prompt:
          chatMessages
            .filter((m) => m.kind === "prompt")
            .map((m) => m.content)
            .join(" ") || "",
      })
      if (result.kind === "clarifying") {
        await addMessage.mutateAsync({
          role: "ai",
          kind: "clarifying",
          questions: result.questions,
        })
      } else {
        await addMessage.mutateAsync({
          role: "ai",
          kind: "board",
          content: `Generated ${result.proposal.changeCount} story cards.`,
          proposalId: result.proposal.proposalId,
        })
      }
    } catch (e) {
      if (handleLimitError(e, orgId ?? "", queryClient)) return
      await addMessage.mutateAsync({
        role: "ai",
        kind: "error",
        content: (e as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  const generateButton = (
    <Button
      onClick={onGenerate}
      disabled={generate.isPending || pending || aiActionsLimited}
    >
      {pending ? "Generating..." : "Run"}
    </Button>
  )

  return (
    <div className="space-y-4">
      <ProjectTabs slug={slug ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {projectDetail?.project.name}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cards?.length ?? 0} cards ·{" "}
            {cards?.filter((c) => c.isClosed).length ?? 0} frozen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-3 py-2.5">
        <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold tracking-wide text-primary">
          <Sparkles className="size-4" />
          AI Instruction
        </span>
        <input
          aria-label="AI instruction"
          placeholder="Ask the engine to draft, split, or evolve a requirement…"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onGenerate()
          }}
          disabled={generate.isPending || pending || aiActionsLimited}
        />
        {aiActionsLimited ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex" data-testid="limit-tooltip" />
              }
            >
              {generateButton}
            </TooltipTrigger>
            <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
          </Tooltip>
        ) : (
          generateButton
        )}
      </div>

      {pendingCount > 0 && (
        <div
          data-testid="proposal-banner"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5"
        >
          <span className="font-mono text-[13px] font-bold text-warn">
            {pendingCount}
          </span>
          <span className="text-[13px] text-foreground/80">
            AI proposals awaiting your review.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Describe the product you want to build. Storyteller will
                generate a board of stories you can review and approve.
              </p>
            ) : (
              <ChatThread
                messages={chatMessages}
                projectSlug={slug ?? ""}
                onClarifyAnswer={(i, answers) => onClarifyAnswer(i, answers)}
              />
            )}
          </div>
        </div>

        {slug && <ProposalReview projectSlug={slug} />}
      </div>
    </div>
  )
}
