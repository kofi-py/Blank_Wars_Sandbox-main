import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/postgres';

// Mail message interface matching frontend structure
export interface InternalMailMessage {
  id: string;
  recipient_user_id: string;
  sender_user_id?: string; // null for system messages
  sender_username?: string;
  subject: string;
  content: string;
  message_type: 'coach_mail' | 'system_mail';
  category: 'system' | 'notification' | 'reward' | 'achievement' | 'coach_message' | 'team';
  priority: 'low' | 'normal' | 'high';
  sender_signature?: string;
  reply_to_mail_id?: string;
  has_attachment: boolean;
  attachment_data?: any;
  attachment_claimed?: boolean;
  is_read: boolean;
  read_at?: Date;
  is_deleted: boolean;
  created_at: Date;
  expires_at?: Date;
}

export class InternalMailService {

  private async convertRowToMessage(row: InternalMailMessage): Promise<InternalMailMessage> {
    return {
      id: row.id,
      recipient_user_id: row.recipient_user_id,
      sender_user_id: row.sender_user_id,
      sender_username: row.sender_username,
      subject: row.subject,
      content: row.content,
      message_type: row.message_type,
      category: row.category,
      priority: row.priority,
      sender_signature: row.sender_signature,
      reply_to_mail_id: row.reply_to_mail_id,
      has_attachment: row.has_attachment,
      attachment_data: row.attachment_data,
      attachment_claimed: row.attachment_claimed,
      is_read: row.is_read,
      read_at: row.read_at ? new Date(row.read_at) : undefined,
      is_deleted: row.is_deleted,
      created_at: new Date(row.created_at),
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined
    };
  }
  
  private validateUserId(user_id: string): void {
    if (!user_id || typeof user_id !== 'string' || user_id.trim().length === 0) {
      throw new Error('Invalid user ID provided');
    }
  }
  
  private validateMessageContent(subject: string, content: string): void {
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new Error('Subject is required');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Content is required');
    }
    if (subject.length > 255) {
      throw new Error('Subject too long (max 255 characters)');
    }
    if (content.length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }
  }
  
  /**
   * Send a system message to a user
   */
  async sendSystemMail(
    recipient_user_id: string, 
    options: {
      subject: string;
      content: string;
      category: 'system' | 'notification' | 'reward' | 'achievement';
      priority?: 'low' | 'normal' | 'high';
      attachment_data?: any;
    }
  ): Promise<InternalMailMessage> {
    this.validateUserId(recipient_user_id);
    this.validateMessageContent(options.subject, options.content);

    if (!options.category) {
      throw new Error('Category is required for system messages');
    }

    const message_id = uuidv4();

    const result = await query(`
      INSERT INTO internal_mail_messages
      (id, recipient_user_id, sender_user_id, sender_username, subject, content,
       message_type, category, priority, has_attachment, attachment_data,
       attachment_claimed, is_read, is_deleted, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *
    `, [
      message_id,
      recipient_user_id,
      null, // System message has no sender_user_id
      'System',
      options.subject.trim(),
      options.content.trim(),
      'system_mail',
      options.category,
      options.priority || 'normal',
      !!options.attachment_data,
      options.attachment_data ? JSON.stringify(options.attachment_data) : null,
      false,
      false,
      false
    ]);

    return this.convertRowToMessage(result.rows[0]);
  }

  /**
   * Send a user-to-user message
   */
  async sendUserMail(
    sender_user_id: string,
    sender_username: string,
    recipient_user_id: string,
    options: {
      subject: string;
      content: string;
      signature?: string;
      reply_to_mail_id?: string;
    }
  ): Promise<InternalMailMessage> {
    this.validateUserId(sender_user_id);
    this.validateUserId(recipient_user_id);
    this.validateMessageContent(options.subject, options.content);
    
    if (!sender_username || typeof sender_username !== 'string' || sender_username.trim().length === 0) {
      throw new Error('Valid sender username is required');
    }
    
    if (sender_user_id === recipient_user_id) {
      throw new Error('Cannot send message to yourself');
    }

    const message_id = uuidv4();

    const result = await query(`
      INSERT INTO internal_mail_messages
      (id, recipient_user_id, sender_user_id, sender_username, subject, content,
       message_type, category, priority, sender_signature, reply_to_mail_id,
       has_attachment, attachment_claimed, is_read, is_deleted, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `, [
      message_id,
      recipient_user_id,
      sender_user_id,
      sender_username.trim(),
      options.subject.trim(),
      options.content.trim(),
      'coach_mail',
      'coach_message',
      'normal',
      options.signature?.trim() || null,
      options.reply_to_mail_id || null,
      false,
      false,
      false,
      false
    ]);

    return this.convertRowToMessage(result.rows[0]);
  }

  /**
   * Get mail for a user with filtering
   */
  async getUserMail(
    user_id: string,
    filters?: {
      category?: string;
      unread_only?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ messages: InternalMailMessage[]; total: number; unread_count: number }> {
    this.validateUserId(user_id);

    // Build dynamic WHERE conditions
    const where_conditions = ['recipient_user_id = $1', 'is_deleted = false'];
    const query_params: any[] = [user_id];
    let param_count = 1;

    if (filters?.category && filters.category !== 'all') {
      param_count++;
      where_conditions.push(`category = $${param_count}`);
      query_params.push(filters.category);
    }

    if (filters?.unread_only) {
      where_conditions.push('is_read = false');
    }

    const where_clause = where_conditions.join(' AND ');

    // Get total count
    const count_result = await query(`
      SELECT COUNT(*) as total
      FROM internal_mail_messages
      WHERE ${where_clause}
    `, query_params);
    const total = parseInt(count_result.rows[0].total);

    // Get unread count
    const unread_result = await query(`
      SELECT COUNT(*) as unread_count
      FROM internal_mail_messages
      WHERE recipient_user_id = $1 AND is_deleted = false AND is_read = false
    `, [user_id]);
    const unread_count = parseInt(unread_result.rows[0].unread_count);

    // Get messages with pagination
    const offset = Math.max(0, filters?.offset || 0);
    const limit = Math.min(100, Math.max(1, filters?.limit || 50));

    const messages_result = await query(`
      SELECT * FROM internal_mail_messages
      WHERE ${where_clause}
      ORDER BY created_at DESC
      LIMIT $${param_count + 1} OFFSET $${param_count + 2}
    `, [...query_params, limit, offset]);

    const messages = await Promise.all(
      (messages_result.rows as InternalMailMessage[]).map(row => this.convertRowToMessage(row))
    );

    return { messages, total, unread_count };
  }

  /**
   * Mark a message as read
   */
  async markAsRead(message_id: string, user_id: string): Promise<boolean> {
    this.validateUserId(user_id);

    if (!message_id || typeof message_id !== 'string') {
      throw new Error('Valid message ID is required');
    }

    const result = await query(`
      UPDATE internal_mail_messages
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND recipient_user_id = $2 AND is_deleted = false
    `, [message_id, user_id]);

    return result.row_count > 0;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(message_id: string, user_id: string): Promise<boolean> {
    this.validateUserId(user_id);

    if (!message_id || typeof message_id !== 'string') {
      throw new Error('Valid message ID is required');
    }

    const result = await query(`
      UPDATE internal_mail_messages
      SET is_deleted = true
      WHERE id = $1 AND recipient_user_id = $2 AND is_deleted = false
    `, [message_id, user_id]);

    return result.row_count > 0;
  }

  /**
   * Claim attachment from a message
   */
  async claimAttachment(message_id: string, user_id: string): Promise<{ success: boolean; rewards?: any }> {
    this.validateUserId(user_id);

    if (!message_id || typeof message_id !== 'string') {
      throw new Error('Valid message ID is required');
    }

    // First check if message exists and can be claimed
    const check_result = await query(`
      SELECT attachment_data FROM internal_mail_messages
      WHERE id = $1 AND recipient_user_id = $2 AND is_deleted = false
        AND has_attachment = true AND attachment_claimed = false
    `, [message_id, user_id]);

    if (check_result.rows.length === 0) {
      return { success: false };
    }

    // Mark attachment as claimed
    const update_result = await query(`
      UPDATE internal_mail_messages
      SET attachment_claimed = true
      WHERE id = $1 AND recipient_user_id = $2 AND is_deleted = false
        AND has_attachment = true AND attachment_claimed = false
    `, [message_id, user_id]);

    if (update_result.row_count === 0) {
      return { success: false };
    }

    // Here we would actually give the user the rewards
    // For now, just return what was attached
    return {
      success: true,
      rewards: check_result.rows[0].attachment_data
    };
  }

  /**
   * Send welcome message to new user
   */
  async sendWelcomeMail(user_id: string): Promise<InternalMailMessage> {
    return this.sendSystemMail(user_id, {
      subject: 'Welcome to Blank Wars!',
      content: 'Your coaching journey begins now. Check out the tutorial and start building your legendary team. Your starter characters are waiting in your roster!',
      category: 'system',
      priority: 'normal'
    });
  }

  /**
   * Send achievement notification
   */
  async sendAchievementMail(
    user_id: string, 
    achievement_name: string, 
    description: string,
    rewards?: any
  ): Promise<InternalMailMessage> {
    return this.sendSystemMail(user_id, {
      subject: `Achievement Unlocked: ${achievement_name}`,
      content: `Congratulations! ${description}`,
      category: 'achievement',
      priority: 'high',
      attachment_data: rewards
    });
  }

  /**
   * Send level up notification
   */
  async sendLevelUpMail(
    user_id: string,
    character_name: string,
    new_level: number,
    rewards?: any
  ): Promise<InternalMailMessage> {
    return this.sendSystemMail(user_id, {
      subject: `Character Level Up: ${character_name}`,
      content: `${character_name} has reached Level ${new_level}! New abilities may be available in the Skills tab.`,
      category: 'notification',
      priority: 'normal',
      attachment_data: rewards
    });
  }

  /**
   * Send daily login reward notification
   * Note: Tickets are handled separately by ticketService (auto-refreshed)
   */
  async sendDailyLogin_rewardMail(
    user_id: string,
    day_streak: number,
    rewards: {
      coins?: number;
      items?: Array<{ name: string; quantity: number }>;
    }
  ): Promise<InternalMailMessage> {
    const rewards_list: string[] = [];
    if (rewards.coins) rewards_list.push(`${rewards.coins} coins`);
    if (rewards.items) {
      rewards.items.forEach(item => {
        rewards_list.push(`${item.quantity}x ${item.name}`);
      });
    }

    const streak_bonus = day_streak >= 7 ? ' 🔥 7-day streak bonus!' :
                       day_streak >= 3 ? ' 🎯 3-day streak!' : '';

    return this.sendSystemMail(user_id, {
      subject: `📅 Daily Login Reward - Day ${day_streak}${streak_bonus}`,
      content: `Welcome back, Coach! You've logged in for ${day_streak} consecutive ${day_streak === 1 ? 'day' : 'days'}!\n\n` +
               `Today's rewards:\n${rewards_list.map(r => `• ${r}`).join('\n')}\n\n` +
               `Keep your streak going to unlock better rewards!`,
      category: 'reward',
      priority: day_streak >= 7 ? 'high' : 'normal',
      attachment_data: rewards
    });
  }

  /**
   * Send pack opening results notification
   */
  async sendPackOpeningMail(
    user_id: string,
    pack_type: string,
    characters: Array<{
      name: string;
      rarity: string;
    }>
  ): Promise<InternalMailMessage> {
    const rarity_emojis: Record<string, string> = {
      'common': '⚪',
      'uncommon': '🟢',
      'rare': '🔵',
      'epic': '🟣',
      'legendary': '🟡',
      'mythic': '🔴'
    };

    const characters_list = characters.map(char =>
      `${rarity_emojis[char.rarity] || '⚪'} ${char.name} (${char.rarity})`
    ).join('\n');

    const has_legendary = characters.some(c => c.rarity === 'legendary' || c.rarity === 'mythic');
    const priority = has_legendary ? 'high' : 'normal';

    return this.sendSystemMail(user_id, {
      subject: `🎁 Pack Opened: ${pack_type}`,
      content: `You've opened a ${pack_type} pack!\n\n` +
               `New characters:\n${characters_list}\n\n` +
               `Check your roster to see your new team members!`,
      category: 'reward',
      priority,
      attachment_data: { pack_type, characters }
    });
  }

  /**
   * Send coach level up notification
   */
  async sendCoachLevelUpMail(
    user_id: string,
    new_level: number,
    new_title: string,
    skill_pointsGained: number,
    bonuses?: {
      battle_xpmultiplier?: number;
      psychology_bonus?: number;
      character_dev_multiplier?: number;
    }
  ): Promise<InternalMailMessage> {
    let bonus_text = '';
    if (bonuses) {
      const bonus_list: string[] = [];
      if (bonuses.battle_xpmultiplier && bonuses.battle_xpmultiplier > 1) {
        bonus_list.push(`${Math.round((bonuses.battle_xpmultiplier - 1) * 100)}% Battle XP bonus`);
      }
      if (bonuses.psychology_bonus) {
        bonus_list.push(`+${bonuses.psychology_bonus}% Psychology effectiveness`);
      }
      if (bonuses.character_dev_multiplier && bonuses.character_dev_multiplier > 1) {
        bonus_list.push(`${Math.round((bonuses.character_dev_multiplier - 1) * 100)}% Character development bonus`);
      }
      if (bonus_list.length > 0) {
        bonus_text = `\n\n_new bonuses:\n${bonus_list.map(b => `• ${b}`).join('\n')}`;
      }
    }

    const milestone_text = new_level % 25 === 0 ? `\n\n🎉 MILESTONE: You've reached a major coaching tier!` : '';

    return this.sendSystemMail(user_id, {
      subject: `⭐ Coach Level Up: Level ${new_level}!`,
      content: `Congratulations! You've leveled up to ${new_title}!\n\n` +
               `• New Level: ${new_level}\n` +
               `• Title: ${new_title}\n` +
               `• Skill Points: +${skill_pointsGained}${bonus_text}${milestone_text}\n\n` +
               `Visit your Coach Profile to allocate your skill points!`,
      category: 'achievement',
      priority: new_level % 25 === 0 ? 'high' : 'normal',
      attachment_data: { new_level, new_title, skill_pointsGained, bonuses }
    });
  }

  /**
   * Initialize with some demo data for testing
   */
  async initializeDemoData(user_id: string): Promise<void> {
    this.validateUserId(user_id);

    // Clear any existing demo data for this user
    await query(`
      DELETE FROM internal_mail_messages
      WHERE recipient_user_id = $1
    `, [user_id]);

    // Add some demo messages
    await this.sendWelcomeMail(user_id);

    await this.sendLevelUpMail(user_id, 'Achilles', 18);

    await this.sendSystemMail(user_id, {
      subject: 'Daily Login Reward',
      content: 'You\'ve received 500 coins and a health potion for logging in today!',
      category: 'reward',
      attachment_data: { coins: 500, items: [{ name: 'Health Potion', quantity: 1 }] }
    });

    await this.sendAchievementMail(
      user_id,
      'Strategist',
      'You\'ve unlocked the Strategist achievement for winning 10 battles using tactical planning.',
      { title: 'Strategist', coins: 1000 }
    );

    // Add an older message and make it read
    const old_message = await this.sendSystemMail(user_id, {
      subject: 'Team Performance Report',
      content: 'Your team won 3 out of 5 battles this week. Sun Wukong performed exceptionally well.',
      category: 'notification'
    });

    // Make it older and read
    await query(`
      UPDATE internal_mail_messages
      SET created_at = NOW() - INTERVAL '1 day', is_read = true, read_at = NOW()
      WHERE id = $1
    `, [old_message.id]);
  }
}