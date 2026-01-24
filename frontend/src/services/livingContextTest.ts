// Test script to verify living context system is working properly
// This tests the flow: ConflictDatabaseService -> ConflictContextService -> Chat Components

import ConflictContextService from './conflictContextService';
import ConflictDatabaseService from './ConflictDatabaseService';

export class LivingContextTest {
  private conflictService = ConflictContextService.getInstance();
  private conflictDB = ConflictDatabaseService.getInstance();

  async runFullTest(): Promise<{
    success: boolean;
    results: any;
    errors: string[];
  }> {
    const results = {
      conflict_dbtest: null as any,
      context_service_test: null as any,
      living_context_generation: null as any,
      context_structure: null as any
    };
    const errors: string[] = [];

    console.log('🧪 Starting Living Context System Test...');

    try {
      // Test 1: ConflictDatabaseService basic functionality
      console.log('1️⃣ Testing ConflictDatabaseService...');
      const testCharacterId = 'achilles';
      const therapyContext = await this.conflictDB.getTherapyContextForCharacter(testCharacterId);
      
      results.conflict_dbtest = {
        character_found: !!therapyContext.character,
        has_roommates: therapyContext.roommates.length > 0,
        has_active_conflicts: therapyContext.active_conflicts.length > 0,
        housing_tier: therapyContext.housing_tier,
        occupancy: `${therapyContext.current_occupancy}/${therapyContext.room_capacity}`,
        team_chemistry: therapyContext.team_chemistry
      };

      if (!therapyContext.character) {
        errors.push('ConflictDatabaseService: Character not found');
      }

      // Test 2: ConflictContextService transformation
      console.log('2️⃣ Testing ConflictContextService transformation...');
      const livingContext = await this.conflictService.generateLivingContext(testCharacterId);
      
      results.context_service_test = {
        has_living_context: !!livingContext,
        housing_tier: livingContext.housing_tier,
        occupancy: `${livingContext.current_occupancy}/${livingContext.room_capacity}`,
        roommate_count: livingContext.roommates.length,
        conflict_count: livingContext.active_conflicts.length,
        has_recent_events: livingContext.recent_events && livingContext.recent_events.length > 0
      };

      // Test 3: Living context structure validation
      console.log('3️⃣ Validating living context structure...');
      const structureValid = this.validateLivingContextStructure(livingContext);
      
      results.context_structure = {
        is_valid: structureValid,
        has_required_fields: this.checkRequiredFields(livingContext),
        roommate_structure: livingContext.roommates.map(r => ({
          has_id: !!r.id,
          has_name: !!r.name,
          has_relationship: !!r.relationship
        })),
        conflict_structure: livingContext.active_conflicts.map(c => ({
          has_category: !!c.category,
          has_severity: !!c.severity,
          has_description: !!c.description,
          has_involved_characters: !!c.involved_characters
        }))
      };

      // Test 4: Generate sample context for different characters
      console.log('4️⃣ Testing multiple character contexts...');
      const testCharacters = ['achilles', 'joan', 'holmes'];
      const characterContexts = {};
      
      for (const charId of testCharacters) {
        try {
          const context = await this.conflictService.generateLivingContext(charId);
          characterContexts[charId] = {
            success: true,
            conflict_count: context.active_conflicts.length,
            roommate_count: context.roommates.length,
            team_chemistry: context.team_chemistry
          };
        } catch (error) {
          characterContexts[charId] = {
            success: false,
            error: error.message
          };
          errors.push(`Character ${charId}: ${error.message}`);
        }
      }

      results.living_context_generation = characterContexts;

      console.log('✅ Living Context System Test Complete');
      return {
        success: errors.length === 0,
        results,
        errors
      };

    } catch (error) {
      console.error('❌ Living Context System Test Failed:', error);
      errors.push(`Critical error: ${error.message}`);
      return {
        success: false,
        results,
        errors
      };
    }
  }

  private validateLivingContextStructure(context: any): boolean {
    const required_fields = [
      'housing_tier',
      'current_occupancy',
      'roomCapacity',
      'roommates',
      'team_chemistry',
      'leagueRanking',
      'active_conflicts'
    ];

    return required_fields.every(field => context.hasOwnProperty(field));
  }

  private checkRequiredFields(context: any): Record<string, boolean> {
    return {
      housing_tier: typeof context.housing_tier === 'string',
      current_occupancy: typeof context.current_occupancy === 'number',
      room_capacity: typeof context.room_capacity === 'number',
      roommates: Array.isArray(context.roommates),
      team_chemistry: typeof context.team_chemistry === 'number',
      league_ranking: typeof context.league_ranking === 'number',
      active_conflicts: Array.isArray(context.active_conflicts)
    };
  }

  // Test method for use in browser console
  async quickTest(character_id: string = 'achilles'): Promise<void> {
    console.log(`🔍 Quick test for character: ${character_id}`);
    
    try {
      const livingContext = await this.conflictService.generateLivingContext(character_id);
      
      console.log('🏠 Living Context Generated:');
      console.log('Housing:', `${livingContext.housing_tier} (${livingContext.current_occupancy}/${livingContext.room_capacity})`);
      console.log('Team Chemistry:', `${livingContext.team_chemistry}%`);
      console.log('Roommates:', livingContext.roommates.map(r => `${r.name} (${r.relationship})`));
      console.log('Active Conflicts:', livingContext.active_conflicts.length);
      
      if (livingContext.active_conflicts.length > 0) {
        console.log('Conflict Details:');
        livingContext.active_conflicts.forEach((conflict, i) => {
          console.log(`  ${i + 1}. ${conflict.category} (${conflict.severity}): ${conflict.description}`);
        });
      }

      console.log('✅ Living context working properly!');
    } catch (error) {
      console.error('❌ Living context test failed:', error);
    }
  }

  // Test integration with chat components
  async testChatIntegration(): Promise<{
    performance_chat: boolean;
    equipment_chat: boolean;
    skill_chat: boolean;
    errors: string[];
  }> {
    const testResults = {
      performance_chat: false,
      equipment_chat: false,
      skill_chat: false,
      errors: [] as string[]
    };

    console.log('🎯 Testing chat component integration...');

    try {
      // Test if living context can be generated for chat components
      const testCharacterId = 'achilles';
      const livingContext = await this.conflictService.generateLivingContext(testCharacterId);
      
      // Simulate what each chat component does
      const performanceContext = {
        ...livingContext,
        chat_type: 'performance'
      };
      
      const equipmentContext = {
        ...livingContext,
        chat_type: 'equipment'
      };
      
      const skillContext = {
        ...livingContext,
        chat_type: 'skills'
      };

      testResults.performance_chat = !!performanceContext && !!performanceContext.active_conflicts;
      testResults.equipment_chat = !!equipmentContext && !!equipmentContext.roommates;
      testResults.skill_chat = !!skillContext && typeof skillContext.team_chemistry === 'number';

      console.log('✅ Chat integration test complete');
      
    } catch (error) {
      testResults.errors.push(`Chat integration error: ${error.message}`);
      console.error('❌ Chat integration test failed:', error);
    }

    return testResults;
  }
}

// Export for easy testing
export const livingContextTest = new LivingContextTest();

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).livingContextTest = livingContextTest;
}