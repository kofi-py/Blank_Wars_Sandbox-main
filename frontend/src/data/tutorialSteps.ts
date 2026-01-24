import { TutorialStep } from '../hooks/useTutorial';

export const teamHeadquartersTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'HOSTMASTER v8.72 - INITIALIZATION COMPLETE',
    content: 'Greetings, Coach! I am HOSTMASTER v8.72, your AI guide to the Blank Wars tournament. Legendary fighters from across spacetime have been recruited to compete under your guidance. Your mission: train these diverse warriors, manage their team dynamics, and lead them to victory in battle.',
    position: 'center',
    action_required: 'none',
    next_button_text: 'ACKNOWLEDGED'
  },
  {
    id: 'team-dashboard',
    title: 'TEAM ANALYTICS: Fighter Status',
    content: 'Analyzing your team\'s psychological states... WARNING: Stress levels at 94.3% due to overcrowded living conditions. Unhappy fighters have reduced morale and perform poorly in battles. As their coach, immediate intervention is recommended.',
    target_selector: '[data-tutorial="team-dashboard"]',
    highlight_elements: ['[data-tutorial="team-dashboard"]'],
    position: 'bottom',
    action_required: 'none',
    next_button_text: 'UNDERSTOOD'
  },
  {
    id: 'character-pool',
    title: 'TEAM ROSTER: Available Fighters',
    content: 'Accessing your fighter roster... You can relocate team members between quarters to minimize personality conflicts and optimize team chemistry. Note: The documentary crew captures all interactions for the show.',
    target_selector: '[data-tutorial="character-pool-button"]',
    highlight_elements: ['[data-tutorial="character-pool-button"]'],
    position: 'bottom',
    action_required: 'click',
    next_button_text: 'PROCEED'
  },
  {
    id: 'drag-character',
    title: 'DRAMA OPTIMIZATION: Manual Override',
    content: 'Initiating drag-and-drop interface... Relocate fighters strategically - some personality combinations work better than others for team performance. Use × function to return fighters to the available pool. The cameras capture everything.',
    target_selector: '[data-tutorial="room-grid"]',
    highlight_elements: ['[data-tutorial="room-grid"]'],
    position: 'top',
    action_required: 'drag',
    next_button_text: 'EXECUTING'
  },
  {
    id: 'character-happiness',
    title: 'EMOTIONAL STATE TRACKER: Real-time Monitoring',
    content: 'Reading team morale... Each fighter displays their current mood via emoji indicators (😫😒😐😊🤩). Happy fighters perform 34% better in combat and create stronger team bonds. Hover for detailed psychological analysis.',
    target_selector: '[data-tutorial="character-avatar"]:first-child',
    highlight_elements: ['[data-tutorial="character-avatar"]'],
    position: 'right',
    action_required: 'none',
    next_button_text: 'LOGGED'
  },
  {
    id: 'kitchen-chat',
    title: 'KITCHEN TABLE: Team Bonding',
    content: 'Accessing team common area... This is where your fighters bond, argue, and build relationships that affect their battle performance. Watch them interact naturally - these moments often reveal team dynamics that impact combat effectiveness.',
    target_selector: '[data-tutorial="kitchen-chat-tab"]',
    highlight_elements: ['[data-tutorial="kitchen-chat-tab"]'],
    position: 'bottom',
    action_required: 'click',
    next_button_text: 'ACCESSING'
  },
  {
    id: 'upgrade-shop',
    title: 'FACILITIES: Training Equipment',
    content: 'Processing tournament earnings... Combat victories generate prize money for facility upgrades. Enhanced quarters increase fighter satisfaction by 23-47% and provide training bonuses. Better facilities improve team performance and morale.',
    target_selector: '[data-tutorial="upgrade-tab"]',
    highlight_elements: ['[data-tutorial="upgrade-tab"]'],
    position: 'bottom',
    action_required: 'none',
    next_button_text: 'TUTORIAL COMPLETE'
  }
];

export const getTutorialStepsForComponent = (componentName: string): TutorialStep[] => {
  switch (componentName) {
    case 'team-headquarters':
      return teamHeadquartersTutorialSteps;
    default:
      return [];
  }
};