import { useMemo, useState } from "react"
import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAiGenerate, useAiClarify } from "@/hooks/use-ai"
import { useProposals } from "@/hooks/use-proposals"
import { useProject } from "@/hooks/use-projects"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { useChatMessages, useAddChatMessage } from "@/hooks/use-chat"
import { ProjectTabs } from "@/components/project-tabs"
import { ChatThread } from "@/components/chat-thread"

export function ProjectChatPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const generate = useAiGenerate(slug ?? "")
  const clarify = useAiClarify(slug ?? "")
  const { data: proposals } = useProposals(slug)
  const { data: projectDetail } = useProject(slug)
  const orgId = projectDetail?.project.orgId
  const usage = useUsage(orgId)
  const aiActionsLimited = usage.isAtLimit("aiActions")
  const { data: chatMessages = [] } = useChatMessages(slug)
  const addMessage = useAddChatMessage(slug ?? "")
  const [prompt, setPrompt] = useState("")
  const [pending, setPending] = useState(false)
  const [answerPrompts, setAnswerPrompts] = useState<{
    index: number
    questions: { question: string; options?: string[] }[]
    answers: string[]
  } | null>(null)
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
    if (!answerPrompts) return
    const message = chatMessages[index]
    const qs = message?.questions ?? []
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
      setAnswerPrompts(null)
      setPending(false)
    }
  }

  const generateButton = (
    <Button
      onClick={onGenerate}
      disabled={generate.isPending || pending || aiActionsLimited}
    >
      {pending ? "Generating..." : "Generate"}
    </Button>
  )

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ProjectTabs slug={slug ?? ""} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <span className="text-xs text-muted-foreground">
          {proposals?.length ?? 0} proposals
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        {chatMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Describe the product you want to build. Storyteller will generate a
            board of stories you can review and approve.
          </p>
        ) : (
          <ChatThread
            messages={chatMessages}
            projectSlug={slug ?? ""}
            onClarifyAnswer={(i) => {
              const m = chatMessages[i]
              if (!m?.questions) return
              setAnswerPrompts({
                index: i,
                questions: m.questions,
                answers: m.questions.map(() => ""),
              })
            }}
          />
        )}

        {answerPrompts && (
          <div className="space-y-2 rounded-lg border p-4">
            {answerPrompts.questions.map((q, qi) => (
              <div key={qi} className="space-y-1">
                <label className="text-sm">{q.question}</label>
                <input
                  data-testid="clarify-answer"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={answerPrompts.answers[qi] ?? ""}
                  onChange={(e) =>
                    setAnswerPrompts((prev) =>
                      prev
                        ? {
                            ...prev,
                            answers: prev.answers.map((a, i) =>
                              i === qi ? e.target.value : a
                            ),
                          }
                        : prev
                    )
                  }
                />
              </div>
            ))}
            <Button
              onClick={() =>
                onClarifyAnswer(answerPrompts.index, answerPrompts.answers)
              }
              disabled={clarify.isPending || pending}
            >
              {pending ? "Generating..." : "Submit answers"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          data-testid="prompt-input"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          rows={3}
          placeholder="Describe your product idea..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
    </div>
  )
}
