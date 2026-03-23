/**
 * Manual type definitions for Deno globals used in Supabase Edge Functions.
 * These definitions help resolve "Cannot find name 'Deno'" errors in Node-based projects.
 */

declare namespace Deno {
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  /**
   * Serves HTTP requests with the given handler.
   */
  export function serve(
    handler: (request: Request) => Response | Promise<Response> | void | Promise<void>,
    options?: ServeOptions
  ): { finished: Promise<void> };

  /**
   * Provides access to environment variables.
   */
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  };

  /**
   * Standard error objects.
   */
  export class Error extends globalThis.Error {
    constructor(message?: string);
  }
}

/**
 * Global Request type refinement for Deno.
 */
interface Request {
  json(): Promise<any>;
}
