import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FilePlus } from "lucide-react"
import { TemplateCard } from "../template-card"

describe("TemplateCard", () => {
  it("renders name, description, icon and the Use template button", () => {
    render(
      <TemplateCard
        icon={FilePlus}
        name="Blank board"
        description="Start from scratch with an empty board."
        onUseTemplate={() => {}}
      />
    )

    expect(screen.getByText("Blank board")).toBeInTheDocument()
    expect(
      screen.getByText("Start from scratch with an empty board.")
    ).toBeInTheDocument()
    expect(document.querySelector("svg")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use template" })).toBeEnabled()
  })

  it("fires onUseTemplate when the button is clicked", () => {
    const onUseTemplate = vi.fn()
    render(
      <TemplateCard
        icon={FilePlus}
        name="Blank board"
        description="Start from scratch with an empty board."
        onUseTemplate={onUseTemplate}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Use template" }))
    expect(onUseTemplate).toHaveBeenCalledTimes(1)
  })

  it("shows Creating… and disables the button while pending", () => {
    render(
      <TemplateCard
        icon={FilePlus}
        name="Blank board"
        description="Start from scratch with an empty board."
        onUseTemplate={() => {}}
        pending
      />
    )

    const button = screen.getByRole("button", { name: "Creating…" })
    expect(button).toBeDisabled()
  })
})
