// backend/src/services/PaymentService.ts

import Stripe from 'stripe';
import { query } from '../database/index';
import { PackService } from './packService';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for purchase ID

const pack_service = new PackService();

interface Purchase {
  user_id: string;
  product_type: string;
  product_id: string;
  quantity: number;
  amount_usd: number;
  currency: string;
  payment_method: string;
  payment_id: string;
  status: string;
}

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil', // Use the API version expected by the project
    });
  }

  public async createCheckoutSession(
    user_id: string,
    pack_type: string,
    quantity: number = 1
  ): Promise<{ session_id: string; url: string } | undefined> {
    try {
      const pack_details = await pack_service.get_pack_details(pack_type);
      if (!pack_details) {
        throw new Error(`Pack type ${pack_type} not found.`);
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: pack_details.pack_name,
                description: `Digital card pack: ${pack_details.pack_name}`,
              },
              unit_amount: Math.round(pack_details.price_usd * 100), // Amount in cents
            },
            quantity: quantity,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          user_id: user_id,
          pack_type: pack_type,
          quantity: quantity,
        },
      });

      return { session_id: session.id, url: session.url! };
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  }

  public async handleWebhook(raw_body: Buffer, signature: string): Promise<void> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        raw_body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await this.fulfillOrder(session);
        break;
      // Handle other event types as needed (e.g., 'invoice.payment_succeeded', 'customer.subscription.deleted')
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async fulfillOrder(session: Stripe.Checkout.Session): Promise<void> {
    const { user_id, pack_type, quantity } = session.metadata as {
      user_id: string;
      pack_type: string;
      quantity: string;
    };

    if (!user_id || !pack_type || !quantity) {
      console.error('Missing metadata in checkout session:', session.metadata);
      return;
    }

    try {
      // Record the purchase in our database
      await query(
        `INSERT INTO purchases (id, user_id, product_type, product_id, quantity, amount_usd, currency, payment_method, payment_id, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          user_id,
          'pack',
          pack_type,
          parseInt(quantity),
          session.amount_total! / 100, // Convert cents to dollars
          session.currency?.toUpperCase() || 'USD',
          'stripe',
          session.id,
          'completed',
        ]
      );

      // Mint digital cards for the user
      const minted_cards = await pack_service.mint_digital_cards(user_id, pack_type);
      console.log(`Minted ${minted_cards.length} cards for user ${user_id} from pack ${pack_type}.`);

      // Optionally, update user's currency if packs can be bought with gems
      // For now, assuming USD purchase.
    } catch (error) {
      console.error('Error fulfilling order:', error);
      // Implement robust error handling, e.g., refund, retry mechanism
    }
  }
}

export const payment_service = new PaymentService();