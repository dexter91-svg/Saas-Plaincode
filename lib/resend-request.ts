import https from "https";

/**
 * POST to Resend's API using Node's raw https module instead of fetch/undici.
 * Exists because, on at least one real dev machine, Node's fetch() sent requests
 * that Resend rejected with "API key is invalid" (401) using a key that worked
 * correctly via curl, PowerShell, and this project's own sandbox — every other
 * client succeeded, only Node's fetch failed. Root cause not fully isolated;
 * this sidesteps it entirely by not going through undici for this call.
 */
export function postToResend(
  path: string,
  apiKey: string,
  body: unknown
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.resend.com",
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let json: unknown = {};
          try {
            json = data ? JSON.parse(data) : {};
          } catch {
            /* leave json as {} */
          }
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 300, status, json });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Resend request timed out")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
