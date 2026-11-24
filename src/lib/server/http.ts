export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: JSON in/out, consistent error envelope for web + native clients. */
export function handle<P = Record<string, string>>(fn: (req: Request, params: P) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const params = ctx?.params ? await ctx.params : ({} as P);
      const data = await fn(req, params);
      if (data instanceof Response) return data;
      return Response.json(data ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof ApiError) {
        return Response.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
      }
      console.error(e);
      return Response.json({ error: { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." } }, { status: 500 });
    }
  };
}

export async function body<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "BAD_JSON", "Request body must be JSON.");
  }
}
