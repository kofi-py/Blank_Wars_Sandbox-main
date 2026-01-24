const fs = require('fs');
const { Client } = require('pg');

async function auditAllCharacters() {
  console.log('🔍 COMPREHENSIVE CHARACTER AUDIT');
  console.log('==================================\n');

  // 1. Get Backend Characters
  const client = new Client({
    connectionString: 'postgresql://localhost:5432/blankwars'
  });
  
  await client.connect();
  
  const backendResult = await client.query(`
    SELECT id, name, title, personality_traits, conversation_style, comedian_name, comedy_style 
    FROM characters 
    ORDER BY id
  `);
  
  const backendChars = {};
  backendResult.rows.forEach(row => {
    backendChars[row.id] = {
      name: row.name,
      title: row.title,
      personality_traits: row.personality_traits,
      conversation_style: row.conversation_style,
      comedian_name: row.comedian_name,
      comedy_style: row.comedy_style
    };
  });

  await client.end();

  // 2. Get Frontend Characters
  const frontendContent = fs.readFileSync('frontend/src/data/characters.ts', 'utf8');
  const frontendChars = {};
  
  // Extract character definitions
  const lines = frontendContent.split('\n');
  let currentChar = null;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start of character definition
    const charMatch = line.match(/^([a-z_]+):\s*\{/);
    if (charMatch && !['branches', 'requirements', 'rewards', 'position', 'financials', 'customization', 'personality', 'equipped', 'cooldowns', 'abilities', 'skills', 'combat', 'survival', 'mental', 'social', 'spiritual', 'experience', 'warrior', 'mage', 'assassin', 'tank', 'support', 'beast', 'trickster', 'mystic', 'elementalist', 'berserker', 'scholar', 'dragon', 'relationships', 'loki'].includes(charMatch[1])) {
      currentChar = charMatch[1];
      frontendChars[currentChar] = { id: currentChar };
      braceCount = 1;
      continue;
    }
    
    if (currentChar && braceCount > 0) {
      // Count braces to track nesting
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      // Extract fields
      const nameMatch = line.match(/name:\s*['""]([^'""]*)['""],?/);
      const titleMatch = line.match(/title:\s*['""]([^'""]*)['""],?/);
      const backgroundMatch = line.match(/background:\s*['""]([^'""]*)['""],?/);
      const descMatch = line.match(/description:\s*['""]([^'""]*)['""],?/);
      
      if (nameMatch) frontendChars[currentChar].name = nameMatch[1];
      if (titleMatch) frontendChars[currentChar].title = titleMatch[1];
      if (backgroundMatch) frontendChars[currentChar].background = backgroundMatch[1];
      if (descMatch) frontendChars[currentChar].description = descMatch[1];
      
      // End of character definition
      if (braceCount === 0) {
        currentChar = null;
      }
    }
  }

  // 3. Compare Characters
  console.log('BACKEND CHARACTERS:');
  console.log('==================');
  Object.keys(backendChars).forEach(id => {
    const be = backendChars[id];
    console.log(`${id}: ${be.name} - ${be.title}`);
  });
  
  console.log(`\nBackend Total: ${Object.keys(backendChars).length}\n`);
  
  console.log('FRONTEND CHARACTERS:');
  console.log('===================');
  Object.keys(frontendChars).forEach(id => {
    const fe = frontendChars[id];
    console.log(`${id}: ${fe.name || 'NO_NAME'} - ${fe.title || 'NO_TITLE'}`);
  });
  
  console.log(`\nFrontend Total: ${Object.keys(frontendChars).length}\n`);

  // 4. Find Differences
  console.log('CHARACTER COMPARISON:');
  console.log('====================');
  
  const allIds = new Set([...Object.keys(backendChars), ...Object.keys(frontendChars)]);
  const mismatches = [];
  
  allIds.forEach(id => {
    const be = backendChars[id];
    const fe = frontendChars[id];
    
    if (!be && fe) {
      console.log(`❌ MISSING FROM BACKEND: ${id} (${fe.name} - ${fe.title})`);
      mismatches.push({ id, issue: 'missing_from_backend', frontend: fe });
    } else if (be && !fe) {
      console.log(`❌ MISSING FROM FRONTEND: ${id} (${be.name} - ${be.title})`);
      mismatches.push({ id, issue: 'missing_from_frontend', backend: be });
    } else if (be && fe) {
      let issues = [];
      
      if (be.name !== fe.name) {
        issues.push(`name: BE="${be.name}" vs FE="${fe.name}"`);
      }
      
      if (be.title !== fe.title) {
        issues.push(`title: BE="${be.title}" vs FE="${fe.title}"`);
      }
      
      if (issues.length > 0) {
        console.log(`⚠️  MISMATCH: ${id}`);
        issues.forEach(issue => console.log(`   ${issue}`));
        mismatches.push({ id, issue: 'data_mismatch', issues, backend: be, frontend: fe });
      } else {
        console.log(`✅ MATCH: ${id} (${be.name} - ${be.title})`);
      }
    }
  });
  
  console.log(`\nSUMMARY:`);
  console.log(`========`);
  console.log(`Total Characters: ${allIds.size}`);
  console.log(`Mismatches Found: ${mismatches.length}`);
  
  if (mismatches.length > 0) {
    console.log(`\nREQUIRED ACTIONS:`);
    console.log(`================`);
    mismatches.forEach(mismatch => {
      console.log(`${mismatch.id}: ${mismatch.issue}`);
    });
  }
}

auditAllCharacters().catch(console.error);