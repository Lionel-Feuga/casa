import { json, readJson, withDevice, withProfile } from "@/lib/auth/server";
import { createTask, listTasks } from "@/lib/tasks/server";
import { TaskCreate } from "@/lib/tasks/validation";

export const dynamic = "force-dynamic";

export const GET = withDevice(async () => json({ tasks: await listTasks() }));

export const POST = withProfile(async (req, _ctx, profile) => {
  const body = TaskCreate.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const { id, ...input } = body.data;
  return json({ task: await createTask(input, profile, id) }, 201);
});
