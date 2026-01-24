// Node 18+
// Usage: node backend/scripts/find-template-bugs.js backend/src/services/localAGIService.ts
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node find-template-bugs.js <path-to-file.ts>');
  process.exit(1);
}
const src = fs.readFileSync(file, 'utf8');

let line = 1, col = 0;
let i = 0;

// State
let inLineComment = false;
let inBlockComment = false;
let inSingle = false;
let inDouble = false;
let inRegex = false;

// Each template frame tracks { openLine, openCol, exprDepth }
const tmpl = [];

const at = (j) => src.charCodeAt(j);
const peek = (off=1) => src[i+off];
const isEscaped = (j) => {
  // count preceding backslashes
  let k = j - 1, n = 0;
  while (k >= 0 && src[k] === '\\') { n++; k--; }
  return (n % 2) === 1;
};

const pushTmpl = () => tmpl.push({ openLine: line, openCol: col, exprDepth: 0 });
const popTmpl  = () => tmpl.pop();

const panic = (msg) => {
  console.error(`\n⚠️  ${msg} @ ${line}:${col}`);
};

while (i < src.length) {
  const ch = src[i];

  // track line/col
  if (ch === '\n') { line++; col = 0; inLineComment = false; i++; continue; }
  col++;

  // comments
  if (!inSingle && !inDouble && tmpl.length === 0 && !inRegex) {
    if (!inBlockComment && ch === '/' && peek() === '/') { inLineComment = true; i += 2; col++; continue; }
    if (!inLineComment && ch === '/' && peek() === '*') { inBlockComment = true; i += 2; col++; continue; }
  }
  if (inBlockComment && ch === '*' && peek() === '/') { inBlockComment = false; i += 2; col++; continue; }
  if (inLineComment) { i++; continue; }
  if (inBlockComment) { i++; continue; }

  // strings (single/double)
  if (!inDouble && !inRegex && tmpl.length === 0 && ch === "'" && !isEscaped(i)) { inSingle = !inSingle; i++; continue; }
  if (!inSingle && !inRegex && tmpl.length === 0 && ch === '"' && !isEscaped(i)) { inDouble = !inDouble; i++; continue; }
  if (inSingle || inDouble) { i++; continue; }

  // regex (very rough; only outside templates)
  if (tmpl.length === 0 && !inRegex && ch === '/' && !isEscaped(i)) {
    // crude heuristic: previous non-space char
    let k = i - 1; while (k >= 0 && /\s/.test(src[k])) k--;
    if (k < 0 || /[=(:,;\[{!&|?]/.test(src[k])) { inRegex = true; i++; continue; }
  }
  if (inRegex && ch === '/' && !isEscaped(i)) { inRegex = false; i++; continue; }
  if (inRegex) { i++; continue; }

  // template literals
  if (ch === '`' && !isEscaped(i)) {
    if (tmpl.length === 0) {
      pushTmpl(); // open outer template
    } else {
      // if currently inside an expression (exprDepth > 0), this starts a nested template
      if (tmpl[tmpl.length - 1].exprDepth > 0) {
        pushTmpl();
      } else {
        popTmpl(); // closes current template
      }
    }
    i++;
    continue;
  }

  // inside a template literal?
  if (tmpl.length > 0) {
    const top = tmpl[tmpl.length - 1];

    // handle ${ ... } expression nesting
    if (ch === '$' && peek() === '{' && !isEscaped(i)) {
      top.exprDepth++;
      i += 2; col++;
      continue;
    }
    if (ch === '}' && !isEscaped(i)) {
      if (top.exprDepth > 0) top.exprDepth--;
      i++;
      continue;
    }
  }

  i++;
}

// report problems
if (tmpl.length > 0) {
  for (const t of tmpl) {
    panic(`Unclosed template literal started`);
    console.error(`   → opened at ${t.openLine}:${t.openCol}, exprDepth=${t.exprDepth}`);
  }
  process.exit(2);
} else {
  console.log('✅ No unclosed template literals detected.');
}