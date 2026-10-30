import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return Response.json({ data, error: null }, { status });
}

export function fail(status: number, code: string, message: string) {
  return Response.json({ data: null, error: { code, message } }, { status });
}

/**
 * Wraps a Route Handler so unexpected errors return a clean 500 envelope
 * instead of leaking a stack trace, while Zod and "not found" errors still
 * map to their proper status codes.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(422, "VALIDATION_ERROR", error.issues.map((i) => i.message).join("; "));
      }
      if (error instanceof NotFoundError) {
        return fail(404, "NOT_FOUND", error.message);
      }
      console.error(error);
      return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}

export class NotFoundError extends Error {}
