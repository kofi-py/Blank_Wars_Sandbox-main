// Quick test to verify agent key resolution
const testCases = [
  { name: "Sherlock Holmes", expected: "holmes" },
  { name: "sherlock holmes", expected: "holmes" },
  { name: "Robin Hood", expected: "robin_hood" },
  { name: "Frankenstein's Monster", expected: "frankenstein_monster" },
  { name: "Frankensteins Monster", expected: "frankenstein_monster" },
  { name: "Unknown Character", expected: null },
];

// Simulate the NAME_MAP
const NAME_MAP = {
  "frankenstein's monster": "frankenstein_monster",
  "frankensteins monster": "frankenstein_monster",
  "robin hood": "robin_hood",
  "sherlock holmes": "holmes",
  "joan of arc": "joan",
  // ... rest
};

function nameToAgentKey(name) {
  if (!name) return null;
  return NAME_MAP[name.toLowerCase()] || null;
}

console.log("Testing agent key resolution (no archetype fallback):\n");
testCases.forEach(test => {
  const result = nameToAgentKey(test.name);
  const pass = result === test.expected;
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} "${test.name}" → ${result || 'null'} (expected: ${test.expected})`);
});

console.log("\n✅ = Correct resolution or proper null (no archetype fallback)");
console.log("❌ = Unexpected result");