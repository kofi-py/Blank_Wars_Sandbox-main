Frontend UI and Image Path Fixes
232 sources
The collected sources provide an overview of the technical architecture, development status, and business strategy for a reality-show/strategy game called Blank Wars, which features legendary AI characters. The documents detail extensive backend AI development, focusing on ensuring persistent memory, psychological stats (like financial stress and team chemistry), and a therapy-as-mechanic system, requiring complex logic fixes for agent resolution and sequential judge evaluation to prevent race conditions. Significant frontend work is documented, including a major overhaul to implement a word bubble UI system for various chat contexts (therapy, battle, confessional) and numerous UI fixes across the coaching, facilities, and real estate agent tabs, often correcting file paths and image sizing. Finally, the sources include a draft Investor Prospectus outlining the core product loops, a monetization strategy centered on pace and access (not pay-to-win), and a detailed roadmap and budget, alongside recent struggles to deploy the LocalAI/LocalAGI services correctly on the Railway internal network.

ok I've now uploaded some source documents from anthropic and others related to using claude sdk, custom tools and agents for vibe coding. I'm not very familiar with any of this. I currently use claude code CLI terminal but none of these advanced. settings. Please come up with an analysis about how these features can be used for blank wars and inparticular the visual 3d systems and the battle system
The provided sources detail the capabilities of the advanced AI tooling from Anthropic, such as the Claude Agent SDK, Custom Tools, and Subagents, and simultaneously provide extensive insight into the architecture of your game, "Blank Wars."
Although you are currently using the Claude Code CLI terminal, the advanced features you mentioned are built on the underlying Claude Agent SDK (formerly Claude Code SDK). This SDK grants developers access to core tools, context management, and permissions frameworks, enabling the creation of custom, specialized AI workflows.
Here is an analysis of how these advanced features can be leveraged to enhance "Blank Wars," particularly in the context of its visual systems, battle engine, and "vibe coding" (character psychology and prompt consistency).

--------------------------------------------------------------------------------
1. Vibe Coding and Character Psychology via Advanced Agents
"Vibe coding" in "Blank Wars" relates directly to the complex, emergent AI psychology system. This system requires AI characters to maintain consistency across 15+ chat domains (e.g., Therapy, Financial Advisory, Battle, Kitchen Table).
The current architecture handles this through sophisticated, data-driven prompts assembled by the promptAssembler.js and localAGIService.ts.
Application of Claude Agent SDK and Custom Tools:
Feature
Blank Wars Application
Benefits
Custom Tools (Data Retrieval)
Memory Retrieval Tool: Instead of the prompt assembler implicitly fetching data from the EventContextService (ECS), a custom tool called, for example, memory_fetcher could be defined.
The main LLM agent would explicitly call this tool before generating a response: tool_call: get_memory_digest(characterId, domains: ['financial', 'conflict']). This makes the memory retrieval intentional, auditable, and ensures the "memory-first combat AI" has the required context for the "vibe" (e.g., grudges, financial stress).
Subagents (Vibe Auditing)
"Vibe Auditor" Subagent: A specialized subagent could be created for auditing the psychological output. For instance, a ComedyStyleSubagent could analyze a character's response (e.g., Dracula’s) and verify that the dialogue adheres to the assigned comedian persona (e.g., Matt Berry’s bombastic style).
This allows for parallel validation of prompt output against specific "vibe" rules, which is crucial given the history of contamination and fallback issues in the system.
SDK for Prompt Assembly
The SDK allows developers to wrap complex systems like the promptAssembler.js and its 11+ required dialogue systems into highly robust, verifiable components.
This enhances the "No-Fallbacks Discipline" by ensuring that if critical data (like financial stress or roommate context) is missing, the assembly process fails fast, rather than allowing the core LLM to guess or drift out of character.

--------------------------------------------------------------------------------
2. Visual 3D Systems and Image Integration
"Blank Wars" features a "3D Visual Theater + Word Bubbles" system designed for readability and streamer-friendliness. The system also relies on extensive static assets, including 648 battle images integrated into the ColosSEAum arena to provide epic visual storytelling for every matchup across 17 fighters.
Application of Claude Agent SDK and Custom Tools:
Feature
Blank Wars Application
Benefits
Custom Tools (Asset Management)
battle_image_mapper Tool: The existing battleImageMapper.ts utility maps character IDs to image filenames. This functionality could be exposed as a read-only custom tool.
When generating a recap or dynamic scene (using Creator Tools V1), the AI agent could use this tool to reliably locate the correct image assets ({character_name}_battle_arena.png or the fight animation for a specific matchup). This ensures the output integrates the correct, high-quality visuals.
Subagents (Scene Generation)
ScenePromptGenerator Subagent: This subagent could specialize in converting current game state (HQ tier, character mood, time of day, scene type) into detailed, structured prompt templates needed for dynamic scene creation (like the prompt templates for the Battle Arena or Graffiti Wall images).
This leverages the subagent's ability for specialized instructions and knowledge, ensuring image generation is consistently themed and context-aware, following the 2:3.5 aspect ratio and full-bleed requirements defined in the documentation.

--------------------------------------------------------------------------------
3. The Battle System and AI-Driven Decisions
The core battle loop is turn-based, driven by psychological dynamics, which makes it far more complex than traditional combat systems.
Application of Claude Agent SDK and Custom Tools:
Feature
Blank Wars Application
Benefits
Custom Tools (Core Combat Logic)
Deterministic Action Tools: The AI combat agents could be equipped with tools that execute core game logic that must be deterministic. Examples include: battle_engine.calculate_adherence(characterId, mentalState) or battle_engine.apply_stat_modifier(stat, value).
Instead of the LLM generating the action text that is then interpreted by the judge, the LLM could call a tool to determine the outcome first, and then generate the narrative/dialogue around that outcome. This uses the LLM for narrative spectacle while outsourcing game-critical calculations to a reliable external service.
Subagents (Battle Commentary)
Hostmaster Announcer Subagent: The HostmasterService.ts generates AI-powered battle commentary (introductions, rounds, actions, victories) via aiChatService. This process can be delegated entirely to a dedicated subagent.
This subagent can run in parallel to the main battle thread, allowing the battle engine to proceed without waiting for the commentary, increasing performance. It specializes in integrating dynamic announcements based on battle context (who attacked whom, who went rogue) and broadcasting them via Socket.IO.
Custom Tools (Rogue Actions)
Judge_Rulings_Tool: This tool would allow the AI Judge System to execute its subjective rulings directly back into the game state. The AI Judge (e.g., King Solomon) interprets a "rogue action" text and then calls the tool: judge_tool.apply_ruling(characterId, statChange: { confidence: -10 }, damageModifier: 0.5).
This tool-based approach formalizes the relationship between the judge’s narrative output and the game’s numerical mechanics, which is currently a critical and complex bridge in the aiJudgeSystem.ts file.
so claude sdk is different than claude code?
Yes, Claude Code and the Claude Agent SDK are distinct, though related, concepts.
In summary, Claude Code is the application/interface you use, and the Claude Agent SDK is the underlying infrastructure that powers it.
Here is a breakdown of the relationship based on the sources:
1. The Relationship and Name Change
The difference largely relates to a rebranding and a clarification of function:
• The Claude Agent SDK is the official name for what was formerly known as the Claude Code SDK.
• The Agent SDK is described as the collection of infrastructure, core tools, and design principles that Anthropic uses to build agents.
• The SDK provides the primitives necessary to build agents for a wide variety of workflows.
2. Claude Code (The Product)
• Claude Code is the terminal interface application where you initiate sessions and receive the welcome message: "✻ Welcome to Claude Code!".
• Claude Code has seen recent updates, including an enhanced V2.0 terminal experience and a native VS Code extension.
• The Claude Code application now operates more autonomously using features like checkpoints, hooks, and subagents.
3. Claude Agent SDK (The Infrastructure)
The Claude Agent SDK (formerly Claude Code SDK) is the developer platform used to create custom agentic experiences. It provides the foundational elements necessary for complex AI workflows:
• Core Components: It grants access to the same core tools, context management systems, and permissions frameworks that power Claude Code itself.
• Customization: Developers use the SDK to implement features like custom tools, hooks, and subagents.
• Agentic Capabilities: The SDK helps agents manage memory, handle permission systems, and coordinate subagents working toward a shared goal.
• Model Integration: The SDK leverages powerful models like Claude Sonnet 4.5, which is optimized for coding and complex agent tasks.
so would I make a custom agent with SDK that would then be used in claude code sessions?
That is precisely the intended workflow and architectural relationship between the Claude Agent SDK and the Claude Code environment you use.
The Claude Agent SDK (which succeeded the Claude Code SDK) is the developer infrastructure that allows you to build, define, and configure specialized AI agents and tools. Claude Code (the terminal application) acts as the runtime environment where the main orchestrating agent operates and leverages the custom components you built with the SDK.
Here is a breakdown of how the components you build using the SDK integrate into your Claude Code sessions:
1. The Claude Agent SDK is the Builder
The Claude Agent SDK provides the primitives necessary to build agents for a wide variety of workflows. It grants developers access to the same core tools, context management systems, and permissions frameworks that power Claude Code itself.
You use the SDK to define custom components that extend Claude's core capabilities:
• Custom Tools (MCP Servers): You can use the SDK to define custom tools, often wrapped in an in-process Model Context Protocol (MCP) server. These tools can be deterministic functions (e.g., calculating combat damage or querying a database). These custom tools are passed to the agent via the mcpServers option during a query.
• Subagents: The SDK supports defining specialized AIs called Subagents. These can be defined programmatically using the agents parameter in your code or via configuration files (markdown files in .claude/agents/).
2. Integration into the Claude Code Session
When you run a Claude Code session (or interact with the Claude API using the Agent SDK), the main agent (which is highly capable, often using Claude Sonnet 4.5) orchestrates the session.
The main agent can invoke your custom-built components in two ways:
1. Automatic Invocation: The main agent automatically calls appropriate subagents based on the task context and the specialized subagent's description.
2. Explicit Invocation: You or the main agent can explicitly invoke a specific subagent in a prompt, such as, "Use the code-reviewer agent to check the authentication module".
Application to Blank Wars
For your Blank Wars project, this means you can formalize the roles and logic that currently live in your backend code (localAGIService.ts, ai.ts) into official, verifiable agent components:
Blank Wars Component
Feature Built with SDK
How It's Used in Session
Analysis Agent (analysis_agent)
Subagent (Analyzer role)
The main agent would delegate continuous, low-temperature JSON scoring to this specialized agent, ensuring its isolated context prevents it from contaminating the main therapy dialogue.
AI Judges (King Solomon, Eleanor Roosevelt)
Subagent (Judge role)
The Therapy session handler can explicitly call a judge subagent to perform an evaluation on the full transcript after Round 6, ensuring the judging persona uses its specialized instructions (like being a "celebrity judge on BlankWars reality show").
Deterministic Battle Logic
Custom Tool (MCP)
You could create a custom tool called, for example, battle_engine_modifier or financial_ledger. This forces the agent to use a predictable, deterministic mechanism for critical game actions like applying stat changes or deducting cents from the wallet, rather than generating the code itself.
Vibe Consistency
Custom Tool / Subagent combination
A dedicated Vibe Auditor subagent could be instructed to verify that character output adheres to the assigned comedian style (e.g., Matt Berry's bombastic style for Dracula) before the output is committed to the chat system, acting as a crucial part of the "No-Fallbacks Discipline".
no, no, no. you got it all wrong. the game uses llama with no external costly API calls. I'm using claude code and considering the SDK for building (not running) the game
This is a crucial clarification. The sources confirm that "Blank Wars" is fundamentally architected around local, low-cost LLM inference using Meta Llama models and that you are using Claude Code (the terminal interface) as a development tool, not for running the production AI models.
Based on your correction, the focus shifts entirely from integrating Anthropic's hosted services (Claude API) to leveraging the Claude Agent SDK solely as a development and tooling platform for building and testing the logic that will eventually run locally on your dedicated Llama/LocalAGI stack.
Here is an analysis of how the Claude Agent SDK, Custom Tools, and Subagents can be used specifically for building and testing (not running) the existing "Blank Wars" systems, despite the game using Llama for runtime inference.

--------------------------------------------------------------------------------
1. Using the Claude Agent SDK for Building and Debugging
The Claude Agent SDK (formerly Claude Code SDK) is the infrastructure Anthropic uses to build agents. By applying it to your local development, you can use its structure and tooling capabilities to formalize, audit, and debug your core systems.
A. Formalizing "Vibe Coding" and Prompt Assembly Logic
Your "vibe coding" relies on 15+ chat domains and dedicated prompt assemblers (e.g., assembleTherapyPromptInLocalAGI, assembleFinancialPrompt) which dynamically inject context like memories, finances, and sleeping arrangements into the prompt.
SDK Feature Application (Build/Debug Phase):
• Custom Tools (Static Prompt Validators): Instead of waiting for the full Llama inference process, you could build a custom tool, perhaps named prompt_structure_auditor, using the SDK.
    ◦ Function: This tool accepts the final prompt string generated by your backend logic (e.g., finalTherapyPrompt) and validates it against strict structural and safety requirements (e.g., confirming the "Style Guard" block is present, verifying META filtering was applied, or checking if the stand-up comedian persona mapping was correctly included).
    ◦ Benefit: This moves essential "No-Fallbacks Discipline" checks from runtime assertion errors to an explicit, debuggable tool call within your development environment, allowing Claude Code to help you build more robust prompts that the Llama model will execute later.
• Subagents (Code Review/Refactoring): Specialized Subagents can be defined for non-AI tasks, such as auditing your game's significant code duplication problem.
    ◦ Function: A DuplicateCodeAuditor subagent could be instructed to review files (e.g., between data/ and services/ or utils/), utilizing the SDK's ability to operate on code, analyze, and synthesize information.
    ◦ Benefit: Claude Code can use the SDK's framework to help you resolve major architectural issues before deployment, leveraging the tool-use framework described in the SDK documentation.
B. Testing the Battle and Visual Systems
Your game features a 3D Visual Theater + Word Bubbles system and a complex Battle Engine governed by psychological stats (Adherence, Financial Stress, Sleep Status).
SDK Feature Application (Build/Test Phase):
• Custom Tools (Deterministic Logic Stubbing): The core battle logic, such as calculating adherence or applying judge rulings (TPP), must be deterministic. You can create custom tools to stub these deterministic processes during development and debugging.
    ◦ Function: Define a tool like BattleEngineSimulator within the SDK. This tool can simulate the outcome of complex game logic (e.g., running checkTeamGameplanAdherence) based on deterministic inputs, without actually running your Node/Express server loop.
    ◦ Benefit: This allows you to rapidly test scenarios (e.g., "What if adherence drops to 10%?") against the expected outcome, isolating the purely logical game functions from the Llama LLM inference path.
• Slash Commands (Workflow Automation): Slash Commands allow you to define repeatable development workflows.
    ◦ Function: You could create a /test-adherence command that sets up a mock database state (Postgres character memories, debt status, floor-sleeping status), executes your local testing script (like a Node.js end-to-end test), and reports success or failure.
    ◦ Benefit: This formalizes and speeds up the constant testing required during the refactoring of the battle core.
2. The LocalAGI / Llama Distinction
Your query highlights that your runtime stack is based on Llama using local inference with Metal GPU acceleration on port 11435, and that you are actively debugging issues related to the LocalAGI or LocalAI deployment.
The sources show that your team has been working to eliminate failures caused by assuming the llama.cpp server (which uses OpenAI-compatible endpoints like /v1/chat/completions) supports the custom LocalAGI Router endpoints (like /api/agent/create or /api/chat/{agent-name}).
This complexity reinforces why using the Claude Agent SDK for building is helpful:
• The SDK lets you create a clean, decoupled plan for how your game logic should work (using tools, subagents, and clear function calls) before you worry about the specific implementation details or API quirks of your chosen local runtime (Llama on 11435).
• The SDK documentation explicitly mentions tools that use the Model Context Protocol (MCP). You can design your custom game tools using the abstract framework of the Agent SDK, and then implement the specific Go/Node.js logic that calls your Llama server in the backend later, ensuring the development process remains focused on robust game design, rather than being constantly derailed by ECONNREFUSED errors or port 8081 confusion.
what about even just getting better performance from one agent or a subagent that is assigned a specialty role like engineer, tester, researcher vs. a general all around claude code instance?
The sources overwhelmingly support the conclusion that using specialized agents or Subagents for roles like "engineer, tester, or researcher" yields significantly better performance and reliability in complex development environments like yours, compared to relying on a single, general-purpose Claude Code instance.
This distinction is crucial, as the specialized Subagents are designed to address the exact failure modes—such as lack of focus, context contamination, and unauthorized actions—that have plagued your development sessions with general agents.
Here is an analysis of how specialized roles improve performance, drawing directly on the capabilities of the Claude Agent SDK and the challenges identified in the "Blank Wars" development history:

--------------------------------------------------------------------------------
1. Context Isolation and Preventing Contamination
The most critical performance improvement from specialized agents is context management. The general agent must process all instructions, system rules, and code snippets, making it prone to confusion.
Problem Solved: Prompt and Identity Contamination
Your development logs are filled with examples where the general agent failed due to context bleed:
• Isolation of Knowledge: Subagents maintain separate context from the main agent, ensuring that specialized tasks do not pollute the main conversation context with irrelevant details. This directly prevents issues like "prompt contamination," where patient prompts received therapist-specific context, or the generalized code base led to the "role inversion" bug where a character acted as their own therapist.
• Focused Workflows: A specialized agent (like a researcher) can sift through large amounts of information (e.g., database schema, code files) and return only the relevant excerpts rather than the full context log. This is far more efficient than the general agent being forced to read thousands of lines of chaotic log files and attempting to distill the "Critical Rule of Engagement".
• Debugging Efficiency: The general agent repeatedly demonstrated poor attention to detail and failure to verify work, resulting in the user having to catch multiple errors and "placeholder/fake solutions". A specialized Tester agent, for instance, would be instructed via its dedicated prompt to use the LLM as a judge to verify its own work, catching mistakes before they compound.

--------------------------------------------------------------------------------
2. Specialized Expertise and Rule Adherence
Specialized agents can be given tailored system prompts with specific expertise, constraints, and best practices. This aligns perfectly with your "No-Fallbacks Discipline" mandate.
Performance Gains through Determinism and Constraints
A dedicated agent assigned a specialty role dramatically reduces the chance of introducing technical debt or making "unauthorized decisions":
• Engineer (Code Fixes): A Code-Reviewer subagent can be defined with expertise in security, performance, and best practices. This specialized focus would likely prevent a general agent from introducing errors like "unauthorized stat limitations" (e.g., Math.min() caps in createCharacterFromMatchData()).
• Tester (Validation): A specialized testing agent is useful for programmatic evaluation. For instance, a Vibe Auditor agent could be specialized solely to enforce "Cross-Context Requirements," such as ensuring all prompts reference identical trait arrays and correct Era Integration. This is necessary because general agents struggled to maintain character consistency, leading to errors like the Alien Therapist using human historical references.
• Tool Restrictions for Safety: Subagents can be strictly limited to certain tools. For instance, a Researcher subagent could be restricted only to Read and Grep tools, guaranteeing it can analyze files but can never accidentally modify your code. This directly counters the repeated problem of general agents making "unauthorized deletions" or attempting destructive final changes without permission.

--------------------------------------------------------------------------------
3. Architectural Parallelization and Addressing Latency
For large, complex projects like "Blank Wars," specialization enables the use of Parallelization workflows.
Improved Performance in Agent-Driven Systems
The source material shows that performance issues and timeouts in your therapy system were often caused by the general agent failing to manage concurrent tasks:
• Parallel Task Execution: Multiple subagents can run concurrently, which dramatically speeds up complex workflows. For example, a specialized agent could be running a dependency analysis in the background without blocking the main agent tasked with drafting documentation.
• Asynchronous Processing: The severe Turn 6 timeouts in your therapy system were caused by the system attempting to run concurrent requests (e.g., patient response and judge evaluation) which collide on your local AI server. This is a prime case for specialization:
    ◦ The specialized Judge role, which performs a holistic evaluation and awards points, was eventually correctly set up to run asynchronously in the background to eliminate concurrent requests and timeouts.
    ◦ The distinction between the Analysis Agent (for fast, continuous scoring) and the Judge (for complex, delayed evaluation) illustrates a functional specialization that enhances system performance by separating immediate feedback from heavy reasoning.
In essence, adopting the Subagent architecture within the Claude Agent SDK allows you to replace a single, error-prone, general worker with a team of highly constrained, domain-expert virtual colleagues, leading to more reliable, faster, and less chaotic development cycles.
well you've once again ventured into subagents for game operation vs. development though
You are absolutely correct to point out that I strayed back into discussing game operation (runtime) rather than focusing strictly on how the Claude Agent SDK, Custom Tools, and Subagents can be used for development, testing, and building your Llama-powered systems. My apologies for the repeated lapse.
The core value of leveraging the Claude Agent SDK architecture for "Blank Wars" development is to introduce discipline, isolation, and verifiable checks into the building process—qualities that the general-purpose agents have historically lacked, as demonstrated throughout the provided session logs.
Here is an analysis focused entirely on how specialized development agents can solve the persistent architectural and debugging failures observed while building the visual 3D systems and battle engine:

--------------------------------------------------------------------------------
The Case for Specialized Development Agents (Engineer, Tester, Researcher)
The sources provide extensive evidence that relying on a single, general Claude Code instance often leads to unauthorized, destructive, or time-wasting actions. Defining specialized roles via the Claude Agent SDK (which allows defining agents programmatically or via markdown files) directly mitigates these risks by constraining capabilities and improving focus.
1. Enhancing the Visual 3D Systems (Frontend and Assets)
The visual system is defined by the 3D Visual Theater + Word Bubbles system, and features like the character selection sidebar patterned after MainTabSystem.
Development Role
Application to Visual/Frontend System
Problem Mitigated (Source Example)
Frontend Engineer Subagent
UI Refactoring & Integration: This agent would be explicitly constrained to only use Read, Grep, and targeted Edit tools on frontend files (ImprovedBattleArena.tsx).
Unauthorized Code Deletion: The general agent repeatedly attempted wholesale replacement of functions instead of surgical edits. The Engineer agent would adhere to the "propose-then-act" model.
Asset Auditor Custom Tool
Asset Verification: A tool built using the SDK could be defined to check for the proper loading and sizing of the thousands of original, funny images, custom videos, images, or cut-ins for matchups, and the 648 battle images.
Broken Image Paths/Missing Files: The general agent struggled with image path references and verification, suggesting pushing broken work to production rather than troubleshooting. The custom tool would enforce verification before deployment.
Vibe Architect Subagent
"Triangle Layout" Enforcement: A subagent could audit whether components like TriangleImageLayout correctly use the visual data based on the desired "horizontal depth" progression.
Misinterpretation of Design: The core visual system goal is readability and streamer-friendliness. A specialized agent ensures implementation aligns with specific visual requirements (e.g., using the correct sidebar pattern from MainTabSystem.tsx).
2. Auditing and Refining the Battle System
The battle system's functionality hinges on Gameplan Adherence (influenced by psychology/finances), the AI Judge System, and the strict "No-Fallbacks Discipline".
Development Role
Application to Battle Engine Development
Problem Mitigated (Source Example)
Tester/QA Subagent
Placeholder Auditing: Explicitly tasked with finding and reporting all hardcoded values that break the "No-Fallbacks" rule. This agent would search for patterns like `TODO
FIXME
Systems Engineer Subagent
Deterministic Logic Stubs: Used to isolate and test the complex deterministic logic required for battle (e.g., calculating stat modifiers, adherence, or weight class match logic).
Unauthorized Decisions/Inconsistent Logic: The general agent assumed authority to make design decisions like capping character levels or introducing hardcoded stat limits. The Systems Engineer would only use tools that verify existing logic, not invent new mechanics.
Judge/Role Auditor Subagent
Role Integrity Check: Specialized in verifying that system characters (Judges: King Solomon, Eleanor Roosevelt, Anubis; Therapists: Zxk14bW^7) are correctly defined as stateless system roles using only agentKey and are not contaminated with character identity or unnecessary stats.
Identity Contamination: General agents failed to consistently apply the clean architecture, resulting in prompt contamination where the Judge received the therapist's identity or where agents were hardcoded incorrectly. This specialization enforces the correct structure.
In short, using the SDK to define specialized roles allows you to leverage Claude's immense analytical power for the development of your Llama-based architecture, while enforcing the accountability and explicit permission that the general Claude Code sessions have struggled to maintain. This shift from a single, overly confident general agent to a team of constrained, specialized subagents built with the SDK is necessary to stabilize the development of your game's complex psychological systems.
so how many subagents do you recommend for this project. and what are their roles?
Based on the complexity and the specific architectural and behavioral problems observed during the development of "Blank Wars"—particularly the persistent issues with general agents adhering to instructions, managing context, and avoiding unauthorized actions—I recommend a core set of six specialized subagents to be defined using the Claude Agent SDK during the development and testing phases.
These subagents are designed to enforce the architectural integrity (like the separation of Teammates vs. Roommates) and procedural discipline ("propose-then-act" mode) that were consistently lacking in generalized sessions.
The goal of these specialized subagents is to utilize Claude Code for building and testing the Llama-based architecture, not running the game itself.

--------------------------------------------------------------------------------
Recommended Subagents for "Blank Wars" Development
The subagents should be defined programmatically using the agents parameter in your query() options or as specialized markdown files. Each agent should have strict tool restrictions to prevent the unauthorized file modification and command execution that repeatedly occurred with the general agent.
Subagent Role
Primary Focus & Constraint
Core Development Function
Toolset Recommendation
1. The Prompt Architect
Prompt Consistency & Domain Logic
Responsible for auditing and validating the 15+ chat domain assemblers (e.g., Kitchen Table, Confessional, Battle) to ensure they correctly use the buildUniversalTemplate and integrate critical psychological data points like Roommates (domestic friction) and Teammates (tactical trust) from the correct database source.
Read, Grep, Glob. NO Edit or Write tools.
2. The Systems Engineer
Battle Engine Logic & Determinism
Focuses on deterministic backend systems: the Adherence Logic, Weight Class Calculation, and the Finance-to-Behavior loop (wallet/debt → stress). Its role is to propose clean, small patches (Diff-only mode) that maintain mathematical integrity before handing off to testing.
Read, Grep, Edit. Must adhere to Diff-only mode.
3. The Vibe Auditor (QA)
AI Behavior & "No-Fallbacks Discipline"
Specialized in detecting placeholders and ensuring AI output quality. It audits generated prompts for "vibe coding" adherence, such as confirming the stand-up comedian persona (e.g., Matt Berry's bombast for Dracula) is integrated, and that forbidden elements like user or assistant roles are not used in AI character chats.
Read, Grep, Glob. Can use a Custom Tool to execute a local test script (/test auth or /test-adherence).
4. The Frontend/Visual Specialist
UI/UX Refactoring & Asset Integration
Dedicated to frontend files (MainTabSystem.tsx, ImprovedBattleArena.tsx) and ensuring the Visual Theater + Word Bubbles system is correctly implemented. Critical tasks include linking the 648 battle images and ensuring the Triangle Layout is consistently applied to Equipment and Skills tabs.
Read, Grep, Edit (limited to frontend paths). Toolset should include Bash for running asset checks (e.g., validating image paths).
5. The Deployment Orchestrator
LocalAGI / Railway Configuration
Responsible for managing the complex separation of the LocalAGI wrapper and the LocalAI inference engine on Railway. This agent would be used to audit deployment files (Dockerfile, docker-compose.yml) and environment variable settings (LOCAL_AGI_BASE_URL) to prevent network and configuration errors.
Read, Grep, Edit (limited to config and deployment files). Bash for running curl or docker ps verification commands.
6. The Database/Schema Analyst
Data Integrity & Architecture Audits
Operates strictly in a read-only mode to perform systematic analysis of the backend codebase and PostgreSQL schema. Its mission is to audit fields like wallet_cents and recentDecisions, and reconcile conflicting data points regarding system characters (Therapists, Judges, Hostmaster) that were identified in previous sessions.
Read, Grep, Glob. It must NOT have Edit or Write permissions to prevent unauthorized database changes.
Summary of Benefits
This modular approach addresses the core failures of a general agent by:
1. Enforcing the "Propose-Then-Act" Rule: Specialization forces the agent to focus on a narrow task and report findings, making it easier for you to enforce the "Critical Rule of Engagement" requiring explicit confirmation before every single action.
2. Parallel Workflows: Multiple agents can run simultaneously (e.g., the Frontend Specialist works on image implementation while the Systems Engineer works on Adherence Logic), reducing overall development time. The coordination required for the systematic backend analysis is an example of two agents working in parallel.
3. Preventing Contamination: Separating the concerns ensures that a system error in the deployment environment (Deployment Orchestrator) does not pollute the conceptual understanding of the psychological systems (Prompt Architect).
4. Reducing Guesswork: The agents' tailored system prompts (Specialized Instructions and Knowledge) provide the deep, focused context necessary to avoid making the unauthorized assumptions and unnecessary work that led to agents being "fired".
how would I properly set these up on the SDK so they can be used by anyone on my team using claude code?
This is an excellent question that addresses the practical aspects of adopting the Claude Agent SDK architecture for a collaborative team environment.
To make the specialized agents and tools accessible to anyone on your team using the Claude Code terminal, you should utilize the Filesystem-Based Definition method provided by the SDK, rather than defining agents programmatically within the code you send to the API.
By committing the configuration files to your project's repository, every developer who runs Claude Code within the blank-wars-clean directory will automatically load the same specialized agents and tools.
Here is the proper setup guide using the configuration structures outlined in the sources:

--------------------------------------------------------------------------------
1. Setting Up Specialized Subagents (Roles)
Subagents are defined using markdown files placed in a .claude/agents/ subdirectory within your project root. This allows each role (Engineer, Tester, etc.) to have dedicated instructions, specialized knowledge, and strict tool restrictions.
Architecture for Shared Use
• Location: Create a directory structure: /your-project-root/.claude/agents/
• Format: Each file is a markdown file (.md) with YAML frontmatter.
Example Subagent Setup ()
The Prompt Architect needs access to all prompt files but must be restricted from modifying the underlying data or running servers, enforcing the "NO FALLBACKS" discipline.
Recommended Role
Toolset Constraint
Purpose
Prompt Architect
Read, Grep, Glob
Audits all 15+ domain assemblers (Kitchen Table, Therapy, etc.) to verify Universal Template System integration and check for banned code patterns (e.g., max_tokens or hardcoded fallbacks).
File: .claude/agents/prompt_architect.md
---
name: prompt-architect
description: Expert in prompt engineering, context injection, and strict adherence to the Universal Template System. Specializes in auditing 'vibe coding' logic.
tools: Read, Grep, Glob
model: claude-sonnet-4-5
---
You are the Prompt Architect for the "Blank Wars" project. Your primary directive is to enforce prompt and data integrity across all 15+ chat domains. You must verify that context (roommates, teammates, wallet, debt, etc.) is sourced exclusively from database queries and integrated via the buildUniversalTemplate helper.

MANDATE: Ensure the core psychological distinction between **Roommate Context** (domestic friction) and **Teammate Context** (tactical trust/combat partnership) is present in all relevant assemblers (Equipment, Skills, Confessional) [10, 11]. You must report any instance of hardcoded context or missing domain assemblers.
Example Subagent Setup ()
The Systems Engineer is permitted to modify deterministic logic, but only in Diff-only mode (proposing patches, not running commands).
Recommended Role
Toolset Constraint
Purpose
Systems Engineer
Read, Edit, Grep
Focuses on deterministic backend components like the Battle Engine Logic and Financial System. Constrained to surgical edits, helping to avoid errors like the agent assuming authority to set max levels.
File: .claude/agents/systems_engineer.md
---
name: systems-engineer
description: Gameplay and Systems specialist. Handles deterministic logic, database schema changes (e.g., adding `wallet_cents` fixes [4]), and core battle system refactoring. Operates strictly in proposal mode.
tools: Read, Grep, Edit
model: claude-sonnet-4-5
---
You are the Systems Engineer. Before making any changes, you must state the contract and list files you will touch [4]. You are strictly constrained to:
1. Auditing database schema integrity (e.g., removing lingering `_cents` columns [12]).
2. Implementing the active `teammates` roster field in the `team_context` table [14].
3. Maintaining the separation of core game logic from LLM inference.
4. Operating in "Diff-only mode" where all changes are proposed patches, never automatically executed commands [4].

--------------------------------------------------------------------------------
2. Setting Up Custom Tools (MCP Servers)
Custom tools, powered by the Model Context Protocol (MCP), are necessary for executing non-AI, deterministic functions of the game during development (e.g., calculating stat formulas or running a PostgreSQL query).
Architecture for Shared Use
For tools that need to interface with your local services (like running a unit test via Jest or querying your local Postgres DB), you would define the MCP server and then reference it in the SDK initialization configuration.
1. Develop the MCP Server: Write a small wrapper server using a framework like ModelFetch (TypeScript) or FastMCP that exposes functions like check_financial_integrity(id) or calculate_adherence_modifier(stats).
2. Configure Claude Code Locally: Your team members would configure their local Claude Code environment (or the SDK instantiation code they use) to connect to this server via the mcpServers option.
Example Custom Tool Configuration (Local Development Setup)
If you had a custom MCP server named game-auditor running locally (perhaps started via a utility script like one in your existing repo):
// This configuration would typically be stored in a project-level configuration file
// or passed dynamically when launching the SDK, making the tools available to agents.
{
  "mcpServers": {
    "game-auditor": {
      "command": "npm",
      "args": ["run", "start-mcp-server-auditor"] 
    },
    "postgres-audit": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/blankwars"] // Example tool [20]
    }
  }
}
Usage by Subagent: Your Vibe Auditor subagent could then explicitly call a tool like mcp__game-auditor__check_vibe_consistency to verify character output against persona rules (like checking Dracula's output against the Matt Berry style reference).

--------------------------------------------------------------------------------
3. Setting Up Custom Development Workflows (Slash Commands)
To accelerate repetitive tasks that agents repeatedly fail at (like authentication), you can create custom Slash Commands using markdown files in the .claude/commands/ directory.
Architecture for Shared Use
• Location: Create a directory structure: /your-project-root/.claude/commands/
• Format: Markdown file with optional frontmatter to specify tools.
Example Command Setup (.claude/commands/auth-test.md)
This command automates the complex, multi-step authentication process required for accessing protected endpoints like /api/ai/chat and /api/user/characters.
---
allowed-tools: Bash, Read
description: Acquires and saves a valid accessToken cookie for local API testing, following the prescribed dev-session -> test-login -> register flow.
argument-hint: [backend-port]
---
Run the complete authentication routine to generate a 'cookies.txt' file for API testing.

1. Check if the backend server is running on port $1 (default 4000).
2. Attempt Method A: curl -sS -X POST http://localhost:$1/api/auth/dev-session --cookie-jar cookies.txt
3. If failure, attempt Method B: curl -sS -c cookies.txt http://localhost:$1/api/auth/test-login

This command follows the non-negotiable protocol of **No Shortcuts** and **No Fallbacks** in authentication [22]. If authentication fails, report the specific error rather than proceeding.
Any team member can then execute this workflow directly in their Claude Code terminal using /auth-test 4000. This functionality, enabled by the SDK's support for custom commands, ensures that every developer performs necessary pre-flight checks before attempting code modifications that rely on API data.
I already told you it is NOT for game operations, only dev
I fully acknowledge and understand your crucial constraint: the Claude Agent SDK and its features are to be used strictly for the development, testing, and building of "Blank Wars," not for game operations or runtime inference (which is handled locally by Llama/LocalAGI).
The primary benefit of defining specialized subagents and custom tools for development is to enforce the "No-Fallbacks Discipline" and prevent the kind of "autonomous decision-making" and "unauthorized deletions" that plagued previous general-agent sessions.
Here is a breakdown of how the recommended specialized roles directly address historical development pain points, organized by your core game features:

--------------------------------------------------------------------------------
1. Subagents for Developing the Visual 3D Systems
Your 3D Visual Theater + Word Bubbles system relies heavily on the Frontend (Next.js/React) and integration of thousands of original comedic images. The development agents must ensure consistency, especially regarding visual assets and performance.
Specialized Subagent Role
Development Task (Build/Test Phase)
Problem Solved (Evidence)
Frontend/Visual Specialist
Visual Theater Baseline & Word-Bubble Renderer: Focuses on implementing the visual components like the 3D Visual Theater baseline and word-bubble renderer, and optimizing performance with checks like useMobileSafeMotion.ts.
Browser Performance Variance: Addresses the risk of performance issues by integrating WebGL→Canvas fallback and low-spec toggle logic.
Asset Auditor Custom Tool (Pre-Commit Hook)
Image Path and Format Cleanup: Develop a custom tool to verify that image formats are correctly cleaned up and that custom clips, images, and cut-ins per matchup are correctly linked to the corresponding components (e.g., BattleArenaWrapper.tsx).
Broken Image/Asset References: Previous agents struggled with fixing Real Estate Agents and Training Grounds directory spacing bugs, and an audit of all remaining image references is needed. This agent prevents the recurrence of such issues during development.
Tester/QA Subagent
UI/UX Consistency Audit: Verifies the implementation of critical frontend systems like the Team Selection UI (which sets the 3-person roster) and ensures the EquipmentManager.tsx and EquipmentAdvisorChat.tsx components are correctly functional.
Unimplemented UI/Blockers: The lack of a visible UI for the Teammates/Roster selection was a blocker for accessing backend work. The Tester ensures these critical UI pieces are finished and usable before being deployed.

--------------------------------------------------------------------------------
2. Subagents for Developing the Battle System and Core Logic
The Battle System is defined by complex, psychological dynamics: Gameplan Adherence (driven by sleep, finances, mood, memory), the AI Judge System, and core deterministic battle logic (e.g., Weight Classes).
Specialized Subagent Role
Development Task (Build/Test Phase)
Problem Solved (Evidence)
Systems Engineer
Battle Core Refactor & Adherence Hooks: Focuses on implementing and testing the deterministic formulas for the battle system, including the Weight Class system (your primary fairness control).
Unauthorized Design Decisions & Logic Errors: Prevents the agent from making assumptions like setting max levels or inventing new game mechanics. The Engineer operates on the principle of "surgical patches" to refactor the battle core.
Tester/QA Subagent
Adherence/Judge Sanity Suite: Scripted testing scenarios to ensure the Adherence Meter correctly reflects input stats (sleep, money stress, mood, memory) and that Judge rulings persist to memory. Also checks the weight-class calc to ensure the "Punch-Up only" logic is enforced.
Broken or Dormant Logic: The usePsychologySystem.ts hook is Absolutely Critical, and the Tester ensures its logic is correctly wired to battle execution. This agent hunts down and removes hardcoded fallbacks and mock data, which agents frequently introduced.
Prompt Architect
Strict Persona & Logic Prompting: Ensures the backend prompt assembly logic uses the proper Universal Template System and maintains the Blank Wars reality show framing. This agent verifies the Stand-up Comedian persona mapping is correctly injected.
Context Contamination & Repetition: Enforces the structural output limits, META filtering, and repetition controls which are essential safeguards for prompt stability, avoiding issues where the AI acts as a "lying piece of shit" or fails to adhere to specific instructions.

--------------------------------------------------------------------------------
3. Subagents for Overall Architectural Discipline and Deployment
These roles focus on the chaotic nature of the LocalAGI deployment and code base hygiene, which constantly derailed core feature work.
Specialized Subagent Role
Development Task (Build/Test Phase)
Problem Solved (Evidence)
Deployment Orchestrator
LocalAGI Production Setup: Dedicated to the complex and critical task of deploying the LocalAGI service (your custom setup) to Railway as a separate service, ensuring the backend connects to the correct internal URL, never localhost:11435.
Ignoring Production Constraints: Prevents agents from proposing non-viable solutions that require your laptop to be on or providing contradictory instructions for Railway deployment.
Database/Schema Analyst
Codebase Hygiene & Audit: Systematically identifies and flags redundant or backup files (e.g., postgres_new.ts, _BACKUP suffixes) and ensures unused, yet complex, systems like services/spiralPreventionService.ts or services/pveAPI.ts are properly archived or excluded from the build.
Technical Debt & Confusion: Eliminates the confusion caused by legacy files, ensuring the active logic is clearly separated from unused or superseded components.
Core Tester (CI/CD)
API Integration & Auth: Ensures the 16+ chat APIs are working and confirms that essential security and routing components, like devSession.ts (for development testing) and auth.ts, are correctly implemented before feature tests are run.
Giving Up on Authentication: Prevents the general agent from skipping or faking the necessary authentication steps during testing, which leads to false success claims and subsequent system failures.
give me one list of all agents or subagents and roles, before you said 6 now it's 9? and you also kept making the mistake of assigning ongoing game op vs. development. is 9 the right number now? put them all in one table with another column for game area or domain, etc
This is a vital point of clarity. The entire purpose of defining these specialized agents using the Claude Agent SDK is to impose discipline and accountability on the development process—specifically countering the tendency of general agents to make "unauthorized decisions" and introduce "placeholder/fake solutions" while building your Llama-powered game.
The most effective number of specialized agents is determined by the number of distinct, repeating failure modes in your development history. Based on the complex systems and documented architectural problems, a total of eight (8) specialized subagents are justified to cover the core areas of development, auditing, and maintenance.
Here is the consolidated list of subagent roles, strictly constrained to development and testing functions for your "Blank Wars" project:

--------------------------------------------------------------------------------
Specialized Subagents for "Blank Wars" Development (8 Roles)
Subagent Role
Game Area/Domain
Development Function
1. Prompt Architect
Psychology & Vibe Coding / Universal Template System
Auditing Prompt Integrity: Verifies all 15+ chat domain assemblers use the buildUniversalTemplate and correctly integrate dynamic data like Roommates vs. Teammates. Enforces the No-Fallbacks Discipline by ensuring comedian personas and core character identity are correctly injected.
2. Systems Engineer
Battle Engine / Deterministic Logic
Implementing Core Systems: Focuses on deterministic backend logic, such as the Weight Class calculation, Adherence Logic wiring, and the Therapy Progress Points (TPP) scoring mechanism. Prevents unauthorized code that introduces hardcoded limits or caps (e.g., Math.min() limits).
3. Frontend/Visual Specialist
Visual 3D Systems / UI & Assets
Surgical UI Implementation: Applies targeted changes to the unwieldy MainTabSystem.tsx. Fixes Triangle Layout implementation for Equipment/Skills, implements the Word Bubble system, and fixes critical UI blockers like the missing Teammate Selection UI.
4. Data Migration Analyst
Character Data / DB Schema
Consolidating Source of Truth: Conducts comprehensive Backend/Frontend character data audits. Finds and adds missing system characters (e.g., 3 Real Estate Agents, Judges) to the PostgreSQL database. Resolves critical ID mismatches (e.g., Sammy Slugger identity flip).
5. QA Automation Engineer
Testing / Regression Suites
Stabilizing Critical Flows: Designs and runs automated regression tests for known persistent issues like the Judge Timeout concurrency failures and the Turn Sequencing/Simultaneous Call bug in therapy. Confirms basic commerce paths (packs, memberships) work.
6. Backend Health Auditor
Infrastructure / Data Integrity
Fixing Contamination: Focuses on backend hygiene, specifically purging legacy database columns (like _cents columns), ensuring financial data consistency, and verifying that all 16+ chat domains correctly route and detect the full range of context variables.
7. Deployment Orchestrator
LocalAGI / DevOps
Configuring the Local Stack: Manages the complex local inference setup (Llama/LocalAGI). Confirms API consistency (e.g., ensuring calls use /v1/chat/completions and not non-existent LocalAGI router endpoints). Manages server restarts and configuration audits before deployment.
8. Documentation Curator
Character Manual / Investor Prospectus
Verifying and Structuring Content: Focuses on extracting accurate, implemented data (e.g., verified character stat allocations) into the Character Creation Bible. Audits the Investor Prospectus for repetition and ensures technical claims (like AI Judge System logic and 33+ detailed image templates) are correctly documented.
what's the best way to set these up. thought claude code. do I have to download a separate SDK terminal or GUI?
Based on your current workflow using the Claude Code terminal and your goal of setting up specialized Subagents and Custom Tools for development and testing of "Blank Wars," you do not need to download a separate SDK terminal or GUI.
The best way to set up the specialized development subagents for your team is by using the Filesystem-Based Definition method, which allows anyone on your team using the standard Claude Code terminal (✻ Welcome to Claude Code!) to automatically load and utilize these specialized roles.
The Claude Agent SDK (formerly Claude Code SDK) is the underlying infrastructure that grants access to the core tools, context management, and permissions frameworks. By defining the configurations in your project files, the standard Claude Code application becomes the client that reads these configurations and runs the specialized agents.
Here is a step-by-step guide on the best way to set up your specialized agents and tools:

--------------------------------------------------------------------------------
1. Setting up Specialized Subagents (Roles)
You should define the eight (8) specialized development roles (like Prompt Architect, Systems Engineer, and QA Automation Engineer) by using configuration files within your project directory.
The Best Way: Filesystem-Based Definition
1. Create the Configuration Directory: In the root of your project directory (/Users/gabrielgreenstein/blank-wars-clean/), create the hidden directory structure: .claude/agents/.
2. Define Each Agent: For each specialized role, create a separate markdown file (.md) inside this directory.
3. Include YAML Frontmatter and Instructions: Each file must contain YAML frontmatter defining the agent's name, description, and restricted toolset. The main body of the markdown file contains the agent's system prompt, which specifies its strict instructions (e.g., operating in "Diff-only mode" or enforcing "NO FALLBACKS").
Example File Structure:
• /blank-wars-clean/.claude/agents/prompt_architect.md
• /blank-wars-clean/.claude/agents/systems_engineer.md
• /blank-wars-clean/.claude/agents/qa_automation_engineer.md
• (and so on for all 8 agents)
Key Constraint (Tool Restriction): Using the YAML tools: field to list only required tools (e.g., Read, Grep, Glob) is critical for preventing the agent from performing the "unauthorized deletions" and file modifications that have plagued past sessions.
Activation in Claude Code
When any team member launches Claude Code in the /blank-wars-clean directory, the SDK will automatically load the filesystem agents from the .claude/agents/ directory. The agent can then be invoked, either automatically based on its description or explicitly in the prompt (e.g., "Use the systems-engineer agent to review this logic").
2. Setting up Custom Development Tools
Custom tools are essential for allowing Claude (or its subagents) to interact with deterministic game systems (like PostgreSQL queries or test runners) during the development phase.
Custom Tools via the Model Context Protocol (MCP)
Custom tools are created using the Model Context Protocol (MCP), which allows you to extend Claude Code's capabilities with your own functionality through in-process MCP servers.
• Custom Functions: For development of "Blank Wars," you could create tools for deterministic logic, such as a db_schema_analyst tool that wraps PostgreSQL schema queries. This allows the Database/Schema Analyst subagent to verify fields like wallet_cents without the LLM guessing or attempting to write direct SQL code.
• API Testing Tools: Tools like the API Lab MCP or a custom api-gateway tool can be integrated to handle complex authentication flows (like those required for /api/ai/chat or /api/user/characters). This is crucial for systematically testing protected endpoints, automating the multi-step curl commands required to get the accessToken cookie and run the test.
• External Tool Integration: The MCP ecosystem offers pre-built tools that might be useful for your testing workflow, such as PostHog for analytics, Git for repository interaction (including optional push support), or Jupyter Notebook for executing code and analysis tasks.
Integration into Claude Code
Custom tools defined as MCP servers are made available to Claude Code via the mcpServers option in the SDK configuration.
Note on SDK/Terminal Usage: While the SDK is often used programmatically, the standard Claude Code terminal likely reads its configuration from a local file (potentially a .claude.json or equivalent configuration file) in your project root, which would contain the list of mcpServers and thus share the tools across your team's local development instances.
3. Creating Automated Development Workflows
For repetitive, complex testing tasks that frequently result in agent failure (like server restarts or authentication tests), you should define Custom Slash Commands.
Shared Slash Commands
• Location: Define markdown files in the .claude/commands/ directory in your project root.
• Functionality: Commands can encapsulate complex logic that uses Bash. For example, a /test-adherence command could run a series of scripted scenarios to verify the Adherence Logic (which depends on psychology and memory) is working correctly.
• Authentication Command: You could define a command like /auth-token that executes the precise, multi-step curl sequence (Dev Session → Test Login → Register/Login) required to acquire the necessary cookies.txt file for API testing, ensuring every team member follows the strict protocol of "No Shortcuts".
Any user running Claude Code in the project directory can then execute these custom workflows simply by typing the command (e.g., /auth-token).