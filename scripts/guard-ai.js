const {execSync} = require("child_process");

try {
  // Check for banned direct AI API references in frontend
  const frontendOut = execSync(`find frontend/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n -E "(api\\.openai\\.com|@anthropic-ai/sdk|new OpenAI|anthropic\\.)" 2>/dev/null || true`, {stdio:"pipe"}).toString();
  
  if (frontendOut.trim()) {
    console.error("❌ Banned direct AI references in frontend:\n" + frontendOut);
    process.exit(1);
  }

  // Check for direct openai/anthropic imports in frontend  
  const importOut = execSync(`find frontend/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n -E "(from.*['\\"']openai['\\"']|from.*['\\"']@anthropic-ai/sdk['\\"']|import.*openai|import.*anthropic)" 2>/dev/null || true`, {stdio:"pipe"}).toString();
  
  if (importOut.trim()) {
    console.error("❌ Banned AI SDK imports in frontend:\n" + importOut);
    process.exit(1);
  }

  console.log("✅ No banned AI API references found in frontend");
} catch (error) {
  if (error.status === 1) {
    // Exit code 1 means we found violations (handled above)
    return;
  }
  console.error("❌ Error running AI guard:", error.message);
  process.exit(1);
}