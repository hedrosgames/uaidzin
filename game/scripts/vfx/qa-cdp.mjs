import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export function createCdpQa(binary, cdp) {
  const command = async (...args) => {
    const { stdout } = await exec(binary, ["--cdp", cdp, "--json", ...args], {
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
    }).catch((error) => {
      throw new Error(
        error.stdout ? JSON.parse(error.stdout).error : error.message.split("\n")[0],
      );
    });
    const response = JSON.parse(stdout);
    if (!response.success) throw new Error(response.error);
    return response.data;
  };
  const evaluate = async (code) =>
    (await command("eval", "-b", Buffer.from(code).toString("base64"))).result;
  return { command, evaluate };
}
