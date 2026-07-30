import fs from "node:fs";
import path from "node:path";

const root = process.env.SITES_PROJECT_ROOT || process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
let source = fs.readFileSync(workspacePath, "utf8");

source = source
  .replaceAll('/signin-with-chatgpt?return_to=%2Fapp', '/auth/google?return_to=%2Fapp')
  .replaceAll('/signout-with-chatgpt?return_to=%2F', '/auth/logout')
  .replaceAll('ChatGPTアカウントから取得するため、このサービス内では変更できない。', 'Googleアカウントから取得するため、このサービス内では変更できない。');

if (source.includes("signin-with-chatgpt") || source.includes("signout-with-chatgpt")) {
  throw new Error("Sites authentication links remain in workspace.tsx");
}

fs.writeFileSync(workspacePath, source);
console.log("Applied Google authentication links.");
