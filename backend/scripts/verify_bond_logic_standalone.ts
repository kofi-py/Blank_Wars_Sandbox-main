
// Standalone verification of Bond Tracking Logic
// Copies core logic from bondTrackingService.ts to verify math/modifiers

// ============================================================================
// LOGIC TO TEST (Copied from service)
// ============================================================================

function applyPersonalityModifier(
    base_change: number,
    activity_type: string,
    personality_traits: string[]
): number {
    if (!personality_traits || personality_traits.length === 0) {
        return base_change;
    }

    let modifier = 1.0;
    const traits_lower = personality_traits.map(t => t.toLowerCase());

    // Positive modifiers (bond more easily)
    if (traits_lower.includes('trusting') || traits_lower.includes('loyal')) {
        modifier += 0.2;  // +20% bond gains
    }

    if (traits_lower.includes('emotionally open') || traits_lower.includes('vulnerable')) {
        if (activity_type.includes('therapy') || activity_type.includes('personal_problems')) {
            modifier += 0.3;  // +30% for emotional activities
        }
    }

    // Negative modifiers (bond less easily)
    if (traits_lower.includes('distrustful') || traits_lower.includes('independent')) {
        modifier -= 0.2;  // -20% bond gains
    }

    if (traits_lower.includes('impulsive') || traits_lower.includes('rebellious')) {
        if (activity_type.includes('coaching') || activity_type.includes('advice')) {
            modifier -= 0.25;  // -25% for authority-based bonding
        }
    }

    // Apply modifier (minimum 0.25x, maximum 1.75x)
    modifier = Math.max(0.25, Math.min(1.75, modifier));

    return Math.round(base_change * modifier);
}

function applyDiminishingReturns(bond_change: number, current_bond: number): number {
    // Only apply to positive bond changes
    if (bond_change <= 0) {
        return bond_change;
    }

    // No diminishing returns below 60 bond
    if (current_bond < 60) {
        return bond_change;
    }

    // 60-79: 75% effectiveness
    if (current_bond < 80) {
        return Math.round(bond_change * 0.75);
    }

    // 80-89: 50% effectiveness
    if (current_bond < 90) {
        return Math.round(bond_change * 0.5);
    }

    // 90+: 25% effectiveness (very hard to max out)
    return Math.round(bond_change * 0.25);
}

// ============================================================================
// TESTS
// ============================================================================

function runTests() {
    console.log('🧪 Verifying Bond Logic...');
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, name: string) {
        if (condition) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name}`);
            failed++;
        }
    }

    // Test 1: Basic Personality Modifier
    // Base 5 + 'Trusting' (+20%) = 6
    const res1 = applyPersonalityModifier(5, 'therapy_breakthrough', ['Trusting']);
    assert(res1 === 6, `Trusting trait (+20%): Expected 6, got ${res1}`);

    // Test 2: Emotional Synergy
    // Base 5 + 'Vulnerable' (+30% for therapy) = 6.5 -> 7
    const res2 = applyPersonalityModifier(5, 'therapy_breakthrough', ['Vulnerable']);
    assert(res2 === 7, `Vulnerable in Therapy (+30%): Expected 7, got ${res2}`);

    // Test 3: Negative Synergy
    // Base 4 + 'Rebellious' in Coaching (-25%) = 3
    const res3 = applyPersonalityModifier(4, 'performance_coaching', ['Rebellious']);
    assert(res3 === 3, `Rebellious in Coaching (-25%): Expected 3, got ${res3}`);

    // Test 4: Diminishing Returns (Low Bond)
    // Bond 50, Change 5 -> 5 (No reduction)
    const res4 = applyDiminishingReturns(5, 50);
    assert(res4 === 5, `Diminishing Returns (<60): Expected 5, got ${res4}`);

    // Test 5: Diminishing Returns (High Bond)
    // Bond 85, Change 4 -> 50% -> 2
    const res5 = applyDiminishingReturns(4, 85);
    assert(res5 === 2, `Diminishing Returns (85): Expected 2, got ${res5}`);

    // Test 6: Diminishing Returns (Max Bond)
    // Bond 95, Change 4 -> 25% -> 1
    const res6 = applyDiminishingReturns(4, 95);
    assert(res6 === 1, `Diminishing Returns (95): Expected 1, got ${res6}`);

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

runTests();
