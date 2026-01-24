# Table of Contents: promptAssemblyService.ts

This document provides a detailed breakdown of the `promptAssemblyService.ts` file, which is responsible for generating various prompts for AI agents in the BlankWars application.

## 1. Core Components

### 1.1. Imports

(Lines 1-8)

### 1.2. Error Classes

-   `DigestUnavailableError` (Line 22)

### 1.3. Helper Functions

-   `redact(o)` (Line 16): Redacts sensitive information (e.g., authorization headers) from an object.
-   `calculateSimilarity(str1, str2)` (Line 36): Calculates the Jaccard similarity between two strings to detect duplicate content.
-   `addPatientDuplicateDetection(character_name, session_key)` (Line 89): Adds instructions to patient prompts to avoid repetitive responses.

## 2. Standalone Prompt Builders (Legacy)

These functions build specific prompts for individual characters and roles.

### 2.1. Patient Therapy Prompts

-   `buildHolmesPatientPrompt(...)` (Line 165): Builds a therapy prompt for the Sherlock Holmes character.
-   `buildMerlinPatientPrompt(...)` (Line 242): Builds a therapy prompt for the Merlin character.
-   `buildAchillesPatientPrompt(...)` (Line 321): Builds a therapy prompt for the Achilles character.

### 2.2. Therapist Prompts

-   `buildCarlJungTherapistPrompt(...)` (Line 400): Builds a therapy prompt for the Carl Jung therapist character.
-   `buildZxk14bw7Prompt(...)` (Line 486): Builds a therapy prompt for the alien therapist Zxk14bW^7.
-   `buildSeraphinaTherapistPrompt(...)` (Line 654): Builds a therapy prompt for the Fairy Godmother therapist, Seraphina.

### 2.3. Real Estate Agent Prompts

-   `buildBarryTheCloserPrompt()` (Line 581): Builds a prompt for the high-pressure real estate agent, Barry "The Closer".
-   `buildLMB3000Prompt()` (Line 604): Builds a prompt for the robotic Lady Macbeth real estate agent, LMB-3000.
-   `buildZyxthalaPrompt()` (Line 627): Builds a prompt for the reptilian alien real estate agent, Zyxthala.

## 3. Unified Prompt Assembly System (Universal)

This is the modern, template-based system for assembling prompts dynamically. It is designed to be more maintainable and scalable.

### 3.1. Core Universal Helper

-   `buildUniversalTemplate(...)` (Line 2577): A crucial helper function that fetches and assembles a wide range of contextual data from the database, including character core info, HQ tier, roommate/teammate dynamics, time of day, sleeping arrangements, and relationship data. This forms the foundation for most universal prompts.

### 3.2. Therapy System

-   `assembleTherapyPromptUniversal(...)` (Line 880): Assembles a prompt for a 1-on-1 therapy session (patient, therapist, or judge).
-   `assembleGroupTherapyPromptUniversal(...)` (Line 953): Assembles a prompt for a group therapy session.
-   **Helpers**:
    -   `buildPatientTherapyContext(...)` (Line 741)
    -   `buildTherapistTherapyContext(...)` (Line 764)
    -   `buildJudgeTherapyContext(...)` (Line 795)
    -   `extractTherapyConversationalContext(...)` (Line 837)

### 3.3. Confessional & Hostmaster System

-   `assembleHostmasterPromptUniversal(...)` (Line 1054): Assembles a prompt for the hostmaster to generate interview questions.
-   `assembleConfessionalPromptUniversal(...)` (Line 1181): Assembles a prompt for a character's response in a confessional interview.
-   **Helpers**:
    -   `buildHostmasterContext(...)` (Line 1143)
    -   `buildConfessionalContext(...)` (Line 1246)

### 3.4. Financial Coaching System

-   `assembleFinancialPromptUniversal(...)` (Line 1272): Assembles a prompt for a financial coaching session with a character.

### 3.5. Performance & Personal Development

-   `assemblePerformancePromptUniversal(...)` (Line 1419): Assembles a prompt for a performance coaching session.
-   `assemblePersonalProblemsPromptUniversal(...)` (Line 1506): Assembles a prompt for a session focused on a specific personal problem.
-   `assembleProgressionPromptUniversal(...)` (Line 3402): Assembles a prompt for coaching on the character's overall journey and progression.

### 3.6. Group & Social Activities

-   `assembleGroupActivitiesPromptUniversal(...)` (Line 1580): Assembles a prompt for a character participating in a group activity.
-   `assembleKitchenTablePromptUniversal(...)` (Line 2066): Assembles a prompt for a "kitchen table" conversational scene.
-   `assembleSocialLoungePromptUniversal(...)` (Line 2370): Assembles a prompt for interactions in the social lounge.
-   `assembleMessageBoardPromptUniversal(...)` (Line 2474): Assembles a prompt for a character posting on the community message board.
-   **Helper**:
    -   `getKitchenTableCharacterContext(...)` (Line 1929): Provides specific behavioral patterns for characters in a kitchen table setting.

### 3.7. Training & Equipment

-   `assembleTrainingPromptUniversal(...)` (Line 2260): Assembles a prompt for a character in a training session.
-   `assembleGroupTrainingPromptUniversal(...)` (Line 3036): Assembles a prompt for a group training session (trainee or trainer role).
-   `assembleEquipmentPromptUniversal(...)` (Line 1739): Assembles a prompt for an equipment consultation session.
-   **Helpers**:
    -   `buildTraineeContext(...)` (Line 3135)
    -   `buildTrainerContext(...)` (Line 3147)

### 3.8. Skills, Powers, & Abilities

-   `assembleSkillsPromptUniversal(...)` (Line 1852): Assembles a prompt for a skills development session.
-   `assemblePowersPromptUniversal(...)` (Line 3177): Assembles a prompt for coaching on innate character powers.
-   `assembleSpellsPromptUniversal(...)` (Line 3286): Assembles a prompt for coaching on magical spells.
-   `assembleAttributesPromptUniversal(...)` (Line 3631): Assembles a prompt for coaching on core character attributes.
-   `assembleAbilitiesPromptUniversal(...)` (Line 3746): A unified prompt for coaching on both powers and spells.

### 3.9. Other Universal Systems

-   `assembleRealEstatePromptUniversal(...)` (Line 2160): Assembles a prompt for a real estate agent pitching to a coach.
-   `assembleBattlePromptUniversal(...)` (Line 2937): Assembles a prompt for battle-related tactical advice.
-   `assembleDramaBoardPromptUniversal(...)` (Line 2987): Assembles a prompt for engaging with house drama.