import { spawn } from "child_process";
import path from "path";

const BIN = process.env.BWKV_ENHANCER_BIN ||
  path.resolve(__dirname, "../../bin/bwkv_enhancer");

type Msg = { role: string; content: string };
type SendOptions = { chat_id?: string; [k: string]: any };

export async function applyDigestAndLog(
  agent_name: string,
  message: Msg,
  options?: SendOptions
): Promise<{ agent_name: string; message: Msg; options?: SendOptions }> {
  const sid = options?.chat_id ?? `bw:auto:${Date.now()}`;

  // If binary missing, passthrough (keeps you moving)
  try {
    const child = spawn(BIN, [], { stdio: ["pipe", "pipe", "inherit"] });
    const payload = JSON.stringify({ sid, agent: agent_name, message, options });
    child.stdin.write(payload);
    child.stdin.end();

    const chunks: Buffer[] = [];
    for await (const c of child.stdout) chunks.push(Buffer.from(c));
    const out = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    // Sanity: keep original message/options if CLI returns nothing special
    return {
      agent_name,
      message: out?.message ?? message,
      options: out?.options ?? options,
    };
  } catch {
    // Passthrough on any error; Go logs (if any) still appear in its own stdout
    // Add temporary logging to prove the bridge is reached
    console.log(`[BWKV-BRIDGE] passthrough sid=${sid} agent=${agent_name} reason=binary_missing`);
    return { agent_name, message, options };
  }
}