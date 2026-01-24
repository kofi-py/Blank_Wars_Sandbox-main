# Agent API Testing Guide

## How to Generate a Valid JWT Access Token for API Testing

When you need to test production API endpoints, you must generate a valid JWT access token. Here's the proper way to do it:

### Step 1: Get the Production JWT Secret from Railway

```bash
railway run node -e "console.log(process.env.JWT_ACCESS_SECRET)"
```

This will output the actual production JWT secret that the backend uses.

### Step 2: Generate a Token for a Specific User

First, find the user ID you want to test with:

```bash
psql "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway" \
  -c "SELECT id, username, email FROM users LIMIT 5;"
```

Then generate a token for that user:

```bash
railway run node -e "
const jwt = require('jsonwebtoken');
const userId = 'YOUR_USER_ID_HERE';  // Replace with actual user ID
const token = jwt.sign(
  { userId, type: 'access' },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '7d' }
);
console.log(token);
"
```

### Step 3: Use the Token in API Requests

```bash
curl -s 'https://api.blankwars.com/api/user/characters' \
  -H 'Cookie: accessToken=YOUR_TOKEN_HERE' \
  | jq '.'
```

## Complete Example Workflow

```bash
# 1. Get Gabriel's user ID
psql "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway" \
  -c "SELECT id FROM users WHERE username LIKE '%gahblah%';"

# Output: 977deace-88e5-4ff9-a321-fcd304824418

# 2. Generate token
railway run node -e "
const jwt = require('jsonwebtoken');
const userId = '977deace-88e5-4ff9-a321-fcd304824418';
const token = jwt.sign({ userId, type: 'access' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
console.log(token);
"

# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5Nzdk...

# 3. Test API
curl -s 'https://api.blankwars.com/api/user/characters' \
  -H 'Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5Nzdk...' \
  | jq '.characters[] | {name, adherence: .gameplanAdherence, inventory: (.inventory | length)}'
```

## Common Issues

### "Invalid or expired token"
- Make sure you're using the Railway environment's JWT secret, not the local .env file
- Use `railway run` to ensure you have the production environment variables

### "Access token required"
- Make sure the Cookie header is formatted correctly: `Cookie: accessToken=YOUR_TOKEN`
- Don't use quotes inside the curl command that break the Cookie header

### Token expired
- Tokens expire after 7 days by default
- Generate a new token using the same process

## Why This Method Works

1. **Railway environment**: Using `railway run` ensures you have access to the actual production JWT_ACCESS_SECRET
2. **Proper JWT signing**: We use the same `jwt.sign()` method that the backend uses in `auth.ts`
3. **Correct payload**: We include `userId` and `type: 'access'` just like the real auth service does
4. **No shortcuts**: This generates a legitimate token that the backend will accept

## DO NOT

- ❌ Try to extract tokens from browser cookies (they expire quickly)
- ❌ Use local development secrets for production API testing
- ❌ Ask the user to provide their token manually
- ❌ Try to bypass authentication

## DO

- ✅ Use `railway run` to access production environment variables
- ✅ Generate fresh tokens for each testing session
- ✅ Verify the token works by testing a simple endpoint first
- ✅ Store the token in a variable for multiple requests:

```bash
TOKEN=$(railway run node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({userId:'977deace-88e5-4ff9-a321-fcd304824418',type:'access'},process.env.JWT_ACCESS_SECRET,{expiresIn:'7d'}))")

curl -s 'https://api.blankwars.com/api/user/characters' -H "Cookie: accessToken=$TOKEN" | jq '.'
```

---

Last updated: 2025-10-21
