import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/card"

describe("Card", () => {
  it("renders card with subcomponents", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
    expect(screen.getByText("Footer")).toBeInTheDocument()
  })

  it("card has data-slot attributes", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>
    )

    const card = screen.getByText("Title").closest("[data-slot='card']")
    expect(card).toBeInTheDocument()
  })

  it("accepts size=sm", () => {
    render(
      <Card size="sm">
        <CardContent>Small</CardContent>
      </Card>
    )
    const card = screen.getByText("Small").closest("[data-slot='card']")
    expect(card).toHaveAttribute("data-size", "sm")
  })
})
