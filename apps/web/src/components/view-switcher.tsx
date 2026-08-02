import { useSearchParams } from "react-router"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export function ViewSwitcher() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"

  return (
    <Tabs
      value={view}
      onValueChange={(next) => {
        setSearchParams({ view: String(next) }, { replace: true })
      }}
    >
      <TabsList>
        <TabsTrigger value="board" data-testid="view-switcher-board">
          Board
        </TabsTrigger>
        <TabsTrigger value="graph" data-testid="view-switcher-graph">
          Graph
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
