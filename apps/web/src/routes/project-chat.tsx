import { useState } from "react"
import { useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { useAiGenerate, useAiClarify } from "@/hooks/use-ai"
import { useProposals } from "@/hooks/use-proposals"

type ThreadItem =
  | { role: "user"; text: string }
  | {
      role: "ai"
      kind: "clarifying"
      questions: { question: string; options?: string[] }[]
    }
  | { role: "ai"; kind: "board"; changeCount: number }
  | { role: "ai"; kind: "error"; text: string }

export function ProjectChatPage() {
  const { slug } = useParams<{ slug: string }>()
  const generate = useAiGenerate(slug ?? "")
  const clarify = useAiClarify(slug ?? "")
  const { data: proposals } = useProposals(slug)
  const [thread, setThread] = useState<ThreadItem[]>([])
  const [prompt, setPrompt] = useState("")
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<number, string>>(
    {}
  )
  const [pendingQuestions, setPendingQuestions] = useState<
    { question: string; options?: string[] }[] | null
  >(null)
  const [priorAnswers, setPriorAnswers] = useState("")

  async function onGenerate() {
    if (!prompt.trim()) return
    const userPrompt = prompt
    setThread((t) => [...t, { role: "user", text: userPrompt }])
    setPrompt("")
    try {
      const result = await generate.mutateAsync({ prompt: userPrompt })
      if (result.kind === "clarifying") {
        setPendingQuestions(result.questions)
        setThread((t) => [
          ...t,
          { role: "ai", kind: "clarifying", questions: result.questions },
        ])
      } else {
        setThread((t) => [
          ...t,
          {
            role: "ai",
            kind: "board",
            changeCount: result.proposal.changeCount,
          },
        ])
      }
    } catch (e) {
      setThread((t) => [
        ...t,
        { role: "ai", kind: "error", text: (e as Error).message },
      ])
    }
  }

  async function onClarify() {
    if (!pendingQuestions) return
    const answers = pendingQuestions.map((q, i) => ({
      question: q.question,
      answer: clarifyAnswers[i] ?? "",
    }))
    const summary = answers.map((a) => `${a.question} → ${a.answer}`).join("\n")
    const newPrior = priorAnswers ? `${priorAnswers}\n${summary}` : summary
    setPriorAnswers(newPrior)
    try {
      const result = await clarify.mutateAsync({
        question: pendingQuestions.map((q) => q.question).join(" | "),
        answer: answers.map((a) => a.answer).join(" | "),
        priorAnswers: newPrior,
        prompt: thread.find((t) => t.role === "user")?.text ?? "",
      })
      if (result.kind === "clarifying") {
        setPendingQuestions(result.questions)
        setClarifyAnswers({})
        setThread((t) => [
          ...t,
          { role: "ai", kind: "clarifying", questions: result.questions },
        ])
      } else {
        setPendingQuestions(null)
        setThread((t) => [
          ...t,
          {
            role: "ai",
            kind: "board",
            changeCount: result.proposal.changeCount,
          },
        ])
      }
    } catch (e) {
      setThread((t) => [
        ...t,
        { role: "ai", kind: "error", text: (e as Error).message },
      ])
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <span className="text-xs text-muted-foreground">
          {proposals?.length ?? 0} proposals
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-lg border p-4">
        {thread.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Describe the product you want to build. Storyteller will generate a
            board of stories you can review and approve.
          </p>
        )}
        {thread.map((item, i) => (
          <div
            key={i}
            className={
              item.role === "user"
                ? "self-end rounded-lg bg-primary/10 px-3 py-2 text-sm"
                : "self-start rounded-lg border px-3 py-2 text-sm"
            }
          >
            {item.role === "user" && <p>{item.text}</p>}
            {item.role === "ai" && item.kind === "clarifying" && (
              <div className="space-y-2">
                <p className="font-medium">
                  A few questions to clarify the board:
                </p>
                {item.questions.map((q, qi) => (
                  <div key={qi}>
                    <p>{q.question}</p>
                    {q.options && (
                      <p className="text-xs text-muted-foreground">
                        Options: {q.options.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {item.role === "ai" && item.kind === "board" && (
              <p>
                Generated {item.changeCount} story cards. Review them in the
                board's proposal queue.
              </p>
            )}
            {item.role === "ai" && item.kind === "error" && (
              <p className="text-destructive">{item.text}</p>
            )}
          </div>
        ))}
      </div>

      {pendingQuestions && (
        <div className="space-y-2 rounded-lg border p-4">
          {pendingQuestions.map((q, i) => (
            <div key={i} className="space-y-1">
              <label className="text-sm">{q.question}</label>
              <input
                data-testid="clarify-answer"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={clarifyAnswers[i] ?? ""}
                onChange={(e) =>
                  setClarifyAnswers((a) => ({ ...a, [i]: e.target.value }))
                }
              />
            </div>
          ))}
          <Button onClick={onClarify} disabled={clarify.isPending}>
            {clarify.isPending ? "Generating..." : "Submit answers"}
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          data-testid="prompt-input"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          rows={3}
          placeholder="Describe your product idea..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generate.isPending || !!pendingQuestions}
        />
        <Button
          onClick={onGenerate}
          disabled={generate.isPending || !!pendingQuestions}
        >
          {generate.isPending ? "Generating..." : "Generate"}
        </Button>
      </div>
    </div>
  )
}
