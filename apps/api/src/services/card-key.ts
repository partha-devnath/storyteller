import { eq, max } from "drizzle-orm"
import { db } from "@workspace/db"
import { card } from "@workspace/schemas"

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function nextCardKeyNo(
  executor: Executor,
  projectId: string
): Promise<number> {
  const [row] = await executor
    .select({ maxKeyNo: max(card.keyNo) })
    .from(card)
    .where(eq(card.projectId, projectId))
    .limit(1)
  return (row?.maxKeyNo ?? 0) + 1
}
