import { HealingService } from './healingService';
import { ResurrectionService } from './resurrectionService';

export class HealingScheduler {
  private static instance: HealingScheduler;
  private interval_id: NodeJS.Timeout | null = null;
  private is_running = false;

  private constructor() {}

  static get_instance(): HealingScheduler {
    if (!HealingScheduler.instance) {
      HealingScheduler.instance = new HealingScheduler();
    }
    return HealingScheduler.instance;
  }

  /**
   * Start the healing scheduler to process completed sessions
   */
  start(interval_minutes: number = 5): void {
    if (this.is_running) {
      console.log('⚕️ Healing scheduler is already running');
      return;
    }

    console.log(`⚕️ Starting healing scheduler (checking every ${interval_minutes} minutes)`);
    
    this.interval_id = setInterval(async () => {
      try {
        await this.processHealingTasks();
      } catch (error) {
        console.error('❌ Error in healing scheduler:', error);
      }
    }, interval_minutes * 60 * 1000);

    this.is_running = true;

    // Run once immediately
    this.processHealingTasks().catch(error => {
      console.error('❌ Error in initial healing task processing:', error);
    });
  }

  /**
   * Stop the healing scheduler
   */
  stop(): void {
    if (this.interval_id) {
      clearInterval(this.interval_id);
      this.interval_id = null;
    }
    this.is_running = false;
    console.log('⚕️ Healing scheduler stopped');
  }

  /**
   * Process all healing-related tasks
   */
  private async processHealingTasks(): Promise<void> {
    const start_time = Date.now();
    
    try {
      console.log('🔄 Processing healing tasks...');
      
      // Process completed healing sessions
      await HealingService.processCompletedHealingSessions();
      
      // Check for characters eligible for natural resurrection
      await ResurrectionService.processNaturalResurrections();
      
      const processing_time = Date.now() - start_time;
      console.log(`✅ Healing task processing completed in ${processing_time}ms`);
      
    } catch (error) {
      console.error('❌ Error processing healing tasks:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { is_running: boolean; interval_id: boolean } {
    return {
      is_running: this.is_running,
      interval_id: this.interval_id !== null
    };
  }

  /**
   * Force process healing tasks (for manual triggering)
   */
  async forceProcess(): Promise<void> {
    console.log('🔧 Manually triggering healing task processing...');
    await this.processHealingTasks();
  }
}

// Export singleton instance
export const healing_scheduler = HealingScheduler.get_instance();