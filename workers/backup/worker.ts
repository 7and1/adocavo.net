export interface Env {
  DB: D1Database;
  R2_BACKUPS: R2Bucket;
  BACKUP_PREFIX?: string;
  BACKUP_RETENTION_DAYS?: string;
  BACKUP_WEBHOOK_TOKEN?: string;
}

const DEFAULT_PREFIX = "d1-backups";
const DEFAULT_RETENTION_DAYS = 30;

async function runBackup(env: Env) {
  const prefix = env.BACKUP_PREFIX || DEFAULT_PREFIX;
  const retentionDays =
    Number(env.BACKUP_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${prefix}/adocavo-db-${timestamp}.sqlite`;

  const dump = await env.DB.dump();
  const body = dump instanceof ArrayBuffer ? dump : new Uint8Array(dump as any);

  await env.R2_BACKUPS.put(key, body, {
    httpMetadata: {
      contentType: "application/octet-stream",
    },
    customMetadata: {
      createdAt: new Date().toISOString(),
      source: "d1",
    },
  });

  await pruneOldBackups(env, prefix, retentionDays);

  return { key };
}

async function pruneOldBackups(
  env: Env,
  prefix: string,
  retentionDays: number,
) {
  if (retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let cursor: string | undefined;
  const toDelete: string[] = [];

  do {
    const list = await env.R2_BACKUPS.list({ prefix, cursor });
    list.objects.forEach((object) => {
      if (object.uploaded && object.uploaded.getTime() < cutoff) {
        toDelete.push(object.key);
      }
    });
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  if (toDelete.length > 0) {
    await env.R2_BACKUPS.delete(toDelete);
  }
}

async function authorize(request: Request, env: Env) {
  const token = env.BACKUP_WEBHOOK_TOKEN;
  if (!token) return false;
  const header = request.headers.get("x-backup-token");
  return header === token;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runBackup(env).catch((error) => {
        console.error(
          JSON.stringify({
            message: "Scheduled backup failed",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }),
    );
  },
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/backup") {
      const isAuthed = await authorize(request, env);
      if (!isAuthed) {
        return new Response("Unauthorized", { status: 401 });
      }

      const result = await runBackup(env);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
