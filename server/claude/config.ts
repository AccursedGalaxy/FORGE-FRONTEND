import { writeFile } from "node:fs/promises";
import { getSettingValue } from "../db/index.ts";

/**
 * Writes a per-session Claude hooks config to /tmp, pointing inbound
 * PreToolUse and Stop hooks at the card's hook endpoint for observability.
 * Returns the path to the written file.
 */
export async function writeHooksConfig(cardId: string): Promise<string> {
  const filePath = `/tmp/kairos-${cardId}-hooks.json`;
  const serverUrl = getSettingValue("claude_hooks_url", "http://localhost:3001");
  const endpoint = `${serverUrl}/api/cards/${cardId}/claude/hook`;

  const config = {
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `curl -s -X POST "${endpoint}" -H "Content-Type: application/json" -d @-`,
            },
          ],
        },
      ],
      Stop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `curl -s -X POST "${endpoint}" -H "Content-Type: application/json" -d '{"event":"Stop"}'`,
            },
          ],
        },
      ],
    },
  };

  await writeFile(filePath, JSON.stringify(config, null, 2));
  return filePath;
}
