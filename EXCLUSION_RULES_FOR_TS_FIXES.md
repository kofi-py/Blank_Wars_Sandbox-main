# Exclusion Rules for Safe Batch Processing

## RULE 1: NEVER replace className on native HTML/React elements
**Error Pattern**: `className` → `class_name` on `<div>`, `<span>`, `<h1>`, etc.
**Impact**: 55 errors (59% of total)

### Elements to EXCLUDE from className replacement:
- Native HTML: `<div>`, `<span>`, `<button>`, `<input>`, `<h1-h6>`, `<p>`, `<a>`, etc.
- Framer Motion: `<motion.div>`, `<motion.span>`, etc. (6 errors)
- Lucide Icons: Any component from `lucide-react` (17 errors)
- **ANY** element that starts with lowercase letter (native HTML)

### Safe to replace:
- ONLY custom component props: `<MyComponent class_name={...} />`
- Check: Component name starts with UPPERCASE letter

---

## RULE 2: Verify property exists before renaming
**Error Pattern**: Renamed property that doesn't exist in type
**Impact**: 4 errors

### Cases:
1. `chatResult` doesn't exist on `ChatFeedbackData` (should be `chat_result`)
2. `penaltyApplied` doesn't exist (should be `penalty_applied`)  
3. `coach_trust` doesn't exist on `Character` type
4. Properties renamed without checking source interface

### Fix:
- ALWAYS read the interface definition BEFORE renaming
- Check if property exists in snake_case OR camelCase form
- If doesn't exist in either, DON'T rename - it's a real error

---

## RULE 3: Update BOTH sides of prop passing
**Error Pattern**: Renamed prop in component but not in caller (or vice versa)
**Impact**: 5 errors

### Example:
```tsx
// Component interface
interface MyProps {
  feedback_data: Data;  // ✅ Renamed
}

// But callers still use old name
<MyComponent feedbackData={data} />  // ❌ Not updated
```

### Fix:
- When renaming component prop, must also rename ALL call sites
- Use `grep` to find all usages before renaming

---

## RULE 4: Don't rename function parameters without body changes
**Error Pattern**: Renamed destructured param but not usage inside function

### Example:
```tsx
// BAD:
const { class_name } = props;
// But inside we use: <div className={className}>  ❌

// GOOD: Either rename consistently OR don't rename
```

---

## IMPLEMENTATION: Smart Replace Algorithm

```python
def safe_replace_className(file_content, file_path):
    """
    Only replace className → class_name on CUSTOM components
    """
    lines = file_content.split('\n')
    
    for i, line in enumerate(lines):
        # Skip if line contains native HTML/React elements
        if re.search(r'<(div|span|button|input|h\d|p|a|li|ul|ol|table|tr|td|th|form|label|select|textarea|img|video|audio|canvas|svg)\s', line):
            continue  # DON'T touch this line
            
        # Skip framer-motion
        if 'motion.' in line:
            continue
            
        # Skip lucide icons (uppercase component from lucide-react)
        if re.search(r'<[A-Z]\w+.*className=.*/>.*// lucide', line):
            continue
            
        # NOW safe to replace className → class_name
        # (only if it's a custom component prop)
        if re.search(r'<[A-Z]', line):  # Custom component (starts with uppercase)
            line = line.replace('className=', 'class_name=')
    
    return '\n'.join(lines)
```

---

## Summary: The 4 Rules

1. ✅ **ONLY** replace `className` on CUSTOM components (uppercase)
2. ✅ **ALWAYS** verify property exists in interface before renaming
3. ✅ **UPDATE** both definition AND all call sites
4. ✅ **TEST** after each file (not batch-batch-batch-then-test)

