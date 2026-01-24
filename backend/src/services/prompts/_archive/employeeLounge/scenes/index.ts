/**
 * Employee Lounge Scene Selector
 *
 * Routes to the appropriate scene builder based on message_type.
 * - opening: Staff start chatting when user enters the lounge
 * - continuing: Conversation continues between staff
 * - coach_message: Coach says something and staff respond
 */

import type { EmployeeLoungeBuildOptions } from '../../../types';
import buildOpeningScene from './opening';
import buildContinuingScene from './continuing';
import buildCoachInterjectionScene from './coachInterjection';

export function buildScene(options: EmployeeLoungeBuildOptions): string {
  // Default to coach_message for backward compatibility
  const messageType = options.message_type || 'coach_message';

  switch (messageType) {
    case 'opening':
      return buildOpeningScene(options);
    case 'continuing':
      return buildContinuingScene(options);
    case 'coach_message':
      return buildCoachInterjectionScene(options);
    default:
      throw new Error(`STRICT MODE: Unknown message_type: ${messageType}`);
  }
}

export default buildScene;
