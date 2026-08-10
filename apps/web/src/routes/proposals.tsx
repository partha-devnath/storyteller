import { useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowDown, Sparkles, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAiGenerate, useAiClarify } from "@/hooks/use-ai"
import { useProposals } from "@/hooks/use-proposals"
import { useProject } from "@/hooks/use-projects"
import { useCards } from "@/hooks/use-cards"
import { useOrgMembers } from "@/hooks/use-orgs"
import { useProjectEvents } from "@/hooks/use-project-events"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { useChatMessages, useAddChatMessage } from "@/hooks/use-chat"
import { useChatScroll } from "@/lib/use-chat-scroll"
import {
  useChatSessions,
  useCreateChatSession,
  useRenameChatSession,
  useDeleteChatSession,
} from "@/hooks/use-chat-sessions"
import { LiveIndicator } from "@/components/live-indicator"
import { ProjectTabs } from "@/components/project-tabs"
import { ChatThread } from "@/components/chat-thread"
import { ChatSessionSidebar } from "@/components/chat-session-sidebar"
import { MentionMenu, type MentionOption } from "@/components/mention-menu"
import { useMentionPicker } from "@/lib/mention-picker"
import type { MentionItem } from "@/hooks/use-chat"
import { toast } from "@/stores/toast-store"

const STARTER_PROMPTS = [
  "Draft a mobile app onboarding flow with signup, verification, and first-run setup",
  "Split the largest card on the board into smaller reviewable stories",
  "Add acceptance criteria for the cards currently in review",
]

export function ProposalsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const highlightProposalId = searchParams.get("proposal")
  const queryClient = useQueryClient()
  const generate = useAiGenerate(slug ?? "")
  const clarify = useAiClarify(slug ?? "")
  const { data: proposals } = useProposals(slug)
  const { data: projectDetail } = useProject(slug)
  const { data: cards } = useCards(slug)
  const orgId = projectDetail?.project.orgId
  const { data: orgMembers } = useOrgMembers(orgId ?? "", {
    enabled: Boolean(orgId),
  })
  const events = useProjectEvents(slug, {})
  const usage = useUsage(orgId)
  const aiActionsLimited = usage.isAtLimit("aiActions")

  const { data: sessions = [] } = useChatSessions(slug)
  const createSession = useCreateChatSession(slug ?? "")
  const renameSession = useRenameChatSession(slug ?? "")
  const deleteSession = useDeleteChatSession(slug ?? "")

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const resolvedSessionId = activeSessionId ?? sessions[0]?.id ?? null

  const { data: chatMessages = [] } = useChatMessages(slug, resolvedSessionId)
  const addMessage = useAddChatMessage(slug ?? "", resolvedSessionId)

  const [prompt, setPrompt] = useState("")
  const [mentions, setMentions] = useState<MentionItem[]>([])
  const [pending, setPending] = useState(false)
  const [localHighlight, setLocalHighlight] = useState<string | null>(null)
  const [pendingPrompt, setPendingPrompt] = useState<{
    text: string
    mentions: MentionItem[]
  } | null>(null)
  const { containerRef, showJump, handleScroll, jumpToBottom } = useChatScroll([
    chatMessages,
    pendingPrompt,
    resolvedSessionId,
  ])
  const [priorAnswers, setPriorAnswers] = useState("")
  const promptRef = useRef<HTMLInputElement | null>(null)
  const { mentionQuery, mentionCaret, mentionEnd, handleInput, stopMention } =
    useMentionPicker()

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

  const mentionOptions: MentionOption[] = useMemo(() => {
    const cardOptions: MentionOption[] = (cards ?? []).map((c) => ({
      type: "card",
      id: c.id,
      label: c.title,
    }))
    const memberOptions: MentionOption[] = (orgMembers ?? []).map((m) => ({
      type: "member",
      id: m.userId,
      label: m.name,
    }))
    return [...cardOptions, ...memberOptions]
  }, [cards, orgMembers])

  function applyMention(option: MentionOption) {
    setMentions((prev) => [
      ...prev.filter((m) => !(m.type === option.type && m.id === option.id)),
      option,
    ])
    const before = prompt.slice(0, mentionCaret)
    const after = prompt.slice(mentionEnd)
    setPrompt(`${before}${after}`)
    stopMention()
    requestAnimationFrame(() => promptRef.current?.focus())
  }

  async function ensureSession(): Promise<string | null> {
    if (resolvedSessionId) return resolvedSessionId
    try {
      const s = await createSession.mutateAsync({ title: "New session" })
      setActiveSessionId(s.id)
      return s.id
    } catch {
      toast.error("Could not create a session")
      return null
    }
  }

  async function persistPair(
    userText: string,
    aiReply: {
      kind: "board" | "clarifying" | "error"
      content?: string
      questions?: { question: string; options?: string[] }[]
      proposalId?: string
    },
    userMentions: MentionItem[]
  ) {
    if (!slug) return
    await addMessage.mutateAsync({
      role: "user",
      kind: "prompt",
      content: userText,
      mentions: userMentions,
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
    const userMentions = mentions
    setPrompt("")
    setMentions([])
    stopMention()
    setPending(true)
    setPendingPrompt({ text: userPrompt, mentions: userMentions })
    const sessionId = await ensureSession()
    if (!sessionId) {
      setPending(false)
      setPendingPrompt(null)
      return
    }
    try {
      const result = await generate.mutateAsync({ prompt: userPrompt })
      if (result.kind === "clarifying") {
        await persistPair(
          userPrompt,
          { kind: "clarifying", questions: result.questions },
          userMentions
        )
      } else {
        setLocalHighlight(result.proposal.proposalId)
        await persistPair(
          userPrompt,
          {
            kind: "board",
            content: result.summaryText,
            proposalId: result.proposal.proposalId,
          },
          userMentions
        )
      }
    } catch (e) {
      if (handleLimitError(e, orgId ?? "", queryClient)) return
      await persistPair(
        userPrompt,
        { kind: "error", content: (e as Error).message },
        userMentions
      )
    } finally {
      setPending(false)
      setPendingPrompt(null)
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
          chatMessages.find(
            (m) => m.kind === "prompt" && !m.content.startsWith("Answers:")
          )?.content ||
          chatMessages
            .filter((m) => m.kind === "prompt")
            .map((m) => m.content)
            .join(" ") ||
          "",
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
          content: result.summaryText,
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
            {cards?.filter((c) => c.isClosed).length ?? 0} closed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
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
          <Button
            size="sm"
            variant="outline"
            data-testid="review-proposals"
            onClick={() => {
              const latestPending = proposals?.find(
                (p) => p.status === "pending"
              )
              if (latestPending) setLocalHighlight(latestPending.id)
              jumpToBottom()
            }}
          >
            Review now
          </Button>
        </div>
      )}

      <div className="flex min-w-0 gap-4">
        <ChatSessionSidebar
          sessions={sessions}
          activeId={resolvedSessionId}
          onSelect={setActiveSessionId}
          onCreate={() =>
            createSession.mutateAsync({ title: "New session" }).then((s) => {
              setActiveSessionId(s.id)
            })
          }
          onRename={(id, title) => renameSession.mutate({ id, title })}
          onDelete={(id) => {
            deleteSession.mutate(id)
            if (id === resolvedSessionId) setActiveSessionId(null)
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative">
            <div
              ref={containerRef}
              onScroll={handleScroll}
              data-testid="chat-scroll"
              className="max-h-[calc(100vh-24rem)] flex-1 overflow-y-auto rounded-xl border border-border/60 bg-card p-4 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
            >
              {chatMessages.length === 0 && !pendingPrompt ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Describe the product you want to build. Storyteller will
                    generate a board of stories you can review and approve.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STARTER_PROMPTS.map((s) => (
                      <button
                        key={s}
                        data-testid={`starter-prompt-${STARTER_PROMPTS.indexOf(s)}`}
                        onClick={() => {
                          setPrompt(s)
                          promptRef.current?.focus()
                        }}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ChatThread
                  messages={chatMessages}
                  projectSlug={slug ?? ""}
                  pendingPrompt={pendingPrompt}
                  highlightProposalId={localHighlight ?? highlightProposalId}
                  aiPending={pending}
                  onClarifyAnswer={(i, answers) => onClarifyAnswer(i, answers)}
                />
              )}
            </div>

            {showJump && (
              <button
                data-testid="chat-jump-bottom"
                onClick={jumpToBottom}
                aria-label="Scroll to bottom"
                className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-input bg-card text-muted-foreground shadow-lg transition-colors hover:text-foreground"
              >
                <ArrowDown className="size-4" />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-3 py-2.5">
              <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold tracking-wide text-primary">
                <Sparkles className="size-4" />
                AI Instruction
              </span>
              <div className="min-w-0 flex-1">
                {mentions.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {mentions.map((m) => (
                      <span
                        key={`${m.type}-${m.id}`}
                        data-testid={`mention-chip-${m.type}-${m.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
                      >
                        @{m.label}
                        <button
                          aria-label={`Remove ${m.label}`}
                          onClick={() =>
                            setMentions((prev) =>
                              prev.filter(
                                (x) => !(x.type === m.type && x.id === m.id)
                              )
                            )
                          }
                          className="text-primary/70 hover:text-primary"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  ref={promptRef}
                  aria-label="AI instruction"
                  placeholder="Ask the engine to draft, split, or evolve a requirement… (@ to mention a card or member)"
                  className="h-auto w-full border-0 bg-transparent px-0 text-[13px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value)
                    handleInput(
                      e.target.value,
                      e.target.selectionStart ?? e.target.value.length
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onGenerate()
                    if (e.key === "Escape") stopMention()
                  }}
                  disabled={generate.isPending || pending || aiActionsLimited}
                />
              </div>
              {aiActionsLimited ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        className="inline-flex"
                        data-testid="limit-tooltip"
                      />
                    }
                  >
                    {generateButton}
                  </TooltipTrigger>
                  <TooltipContent>
                    Limit reached — upgrade to Pro
                  </TooltipContent>
                </Tooltip>
              ) : (
                generateButton
              )}
            </div>

            {mentionQuery !== null && (
              <div className="absolute right-0 bottom-full left-0 z-50 mb-2">
                <MentionMenu
                  query={mentionQuery}
                  options={mentionOptions}
                  onSelect={applyMention}
                  onClose={stopMention}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
