import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

describe("ExportMenu", () => {
  it("renders the trigger with the export-menu testid and opens on click", async () => {
    const { ExportMenu } = await import("../export-menu")
    const onExport = vi.fn()
    render(<ExportMenu disabled={false} onExport={onExport} />)
    expect(screen.getByTestId("export-menu")).toBeInTheDocument()
    expect(screen.getByText("Export")).toBeInTheDocument()
  })

  it("renders the trigger disabled with a tooltip when disabled is true", async () => {
    const { ExportMenu } = await import("../export-menu")
    const onExport = vi.fn()
    render(<ExportMenu disabled onExport={onExport} />)
    expect(screen.getByTestId("export-menu")).toBeDisabled()
    await userEvent.hover(screen.getByTestId("export-menu-trigger"))
    expect(
      await screen.findByText("Add cards before exporting")
    ).toBeInTheDocument()
  })

  it.each([
    ["export-csv", "csv"],
    ["export-json", "json"],
    ["export-markdown", "md"],
  ] as const)(
    "calls onExport with %s when the %s item is clicked",
    async (testid, format) => {
      const { ExportMenu } = await import("../export-menu")
      const onExport = vi.fn()
      render(<ExportMenu disabled={false} onExport={onExport} />)
      await userEvent.click(screen.getByTestId("export-menu"))
      await userEvent.click(await screen.findByTestId(testid))
      expect(onExport).toHaveBeenCalledWith(format)
    }
  )
})
