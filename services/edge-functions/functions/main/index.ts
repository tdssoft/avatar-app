import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

console.log("edge-functions main started");

const JWT_SECRET = Deno.env.get("JWT_SECRET") ?? "";
const VERIFY_JWT = Deno.env.get("VERIFY_JWT") === "true";

function getAuthToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Missing authorization header");
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer") throw new Error("Auth header is not 'Bearer {token}'");
  return token;
}

async function verifyJWT(jwt: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(JWT_SECRET);
  try {
    await jose.jwtVerify(jwt, secretKey);
  } catch (err) {
    console.error(err);
    return false;
  }
  return true;
}

serve(async (req: Request) => {
  if (req.method !== "OPTIONS" && VERIFY_JWT) {
    try {
      const token = getAuthToken(req);
      const ok = await verifyJWT(token);
      if (!ok) {
        return new Response(JSON.stringify({ msg: "Invalid JWT" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ msg: String(e) }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const serviceName = pathParts[1];

  if (!serviceName) {
    return new Response(JSON.stringify({ msg: "missing function name in request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const servicePath = `/home/deno/functions/${serviceName}`;
  const memoryLimitMb = 256;
  const workerTimeoutMs = 60_000;
  const noModuleCache = false;
  const importMapPath = null;

  const envObj = Deno.env.toObject();
  const envVars = Object.keys(envObj).map((k) => [k, envObj[k]]);

  try {
    // Provided by the Edge Runtime host process.
    // deno-lint-ignore no-explicit-any
    const edgeRuntimeAny = (globalThis as any).EdgeRuntime;
    const worker = await edgeRuntimeAny.userWorkers.create({
      servicePath,
      memoryLimitMb,
      workerTimeoutMs,
      noModuleCache,
      importMapPath,
      envVars,
    });
    return await worker.fetch(req);
  } catch (e) {
    return new Response(JSON.stringify({ msg: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

