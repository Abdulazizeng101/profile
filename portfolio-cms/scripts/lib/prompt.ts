import { createInterface } from "node:readline";

/** Reads a line from the terminal. When `hidden` is set, typed characters are not echoed. */
export function ask(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.startsWith(question)) write.call(rl, s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

/**
 * Credentials come from the environment when set (useful for CI and hosted
 * consoles), otherwise from interactive prompts. They are never written to disk.
 */
export async function readCredentials(): Promise<{ email: string; password: string }> {
  const email = process.env.ADMIN_EMAIL ?? (await ask("Admin email: "));
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask("Password (min. 12 characters): ", { hidden: true });
    const confirm = await ask("Repeat password: ", { hidden: true });
    if (password !== confirm) throw new Error("The passwords don't match.");
  }
  return { email: email.trim().toLowerCase(), password };
}
