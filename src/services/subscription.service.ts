import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { config } from '../config';
import { ApiError } from '../middlewares/error.middleware';

// Subscription plan types
export enum SubscriptionPlan {
  MONTHLY = 'monthly_subscription',
  YEARLY = 'yearly_subscription',
  LIFETIME = 'lifetime_subscription',
}

// Subscription status interface
export interface SubscriptionStatus {
  isActive: boolean;
  plan: SubscriptionPlan | null;
  expiryDate: Date | null;
  isLifetime: boolean;
  isTrialActive: boolean;
  trialEndDate: Date | null;
}

/**
 * Get subscription status for a user
 */
export const getSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  try {
    // Get subscription from database
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching subscription:', error);
      throw new ApiError(500, 'Failed to fetch subscription status');
    }

    if (!data) {
      // Return default status if no subscription found
      return {
        isActive: false,
        plan: null,
        expiryDate: null,
        isLifetime: false,
        isTrialActive: false,
        trialEndDate: null,
      };
    }

    // Check if subscription is active
    const now = new Date();
    const expiryDate = data.expiry_date ? new Date(data.expiry_date) : null;
    const isActive = data.is_lifetime || (expiryDate !== null && expiryDate > now);
    
    // Check if trial is active
    const trialEndDate = data.trial_end_date ? new Date(data.trial_end_date) : null;
    const isTrialActive = trialEndDate !== null && trialEndDate > now;

    return {
      isActive,
      plan: data.plan as SubscriptionPlan,
      expiryDate: expiryDate,
      isLifetime: data.is_lifetime || false,
      isTrialActive,
      trialEndDate,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting subscription status:', error);
    throw new ApiError(500, 'Failed to get subscription status');
  }
};

/**
 * Validate receipt with app store and update subscription
 */
export const validateReceipt = async (
  userId: string,
  receipt: string,
  productId: string,
  platform: 'ios' | 'android'
): Promise<SubscriptionStatus> => {
  try {
    // Determine subscription plan from product ID
    let plan: SubscriptionPlan | null = null;
    let isLifetime = false;

    // Map product ID to subscription plan
    if (productId === config.subscriptionPlans.monthly) {
      plan = SubscriptionPlan.MONTHLY;
    } else if (productId === config.subscriptionPlans.yearly) {
      plan = SubscriptionPlan.YEARLY;
    } else if (productId === config.subscriptionPlans.lifetime) {
      plan = SubscriptionPlan.LIFETIME;
      isLifetime = true;
    }

    if (!plan) {
      throw new ApiError(400, 'Invalid product ID');
    }

    // Calculate expiry date based on plan
    let expiryDate: Date | null = null;
    if (!isLifetime) {
      const now = new Date();
      if (plan === SubscriptionPlan.MONTHLY) {
        expiryDate = new Date(now.setMonth(now.getMonth() + 1));
      } else if (plan === SubscriptionPlan.YEARLY) {
        expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      }
    }

    // In a real implementation, you would validate the receipt with Apple/Google
    // This is a simplified version for demonstration
    
    // For iOS:
    // const validationResult = await validateWithApple(receipt);
    
    // For Android:
    // const validationResult = await validateWithGoogle(receipt);

    // Save subscription to database
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan,
        product_id: productId,
        receipt,
        platform,
        purchase_date: new Date().toISOString(),
        expiry_date: expiryDate?.toISOString(),
        is_lifetime: isLifetime,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving subscription:', error);
      throw new ApiError(500, 'Failed to save subscription');
    }

    // Return updated subscription status
    return await getSubscriptionStatus(userId);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error validating receipt:', error);
    throw new ApiError(500, 'Failed to validate receipt');
  }
};

/**
 * Sync subscription status with app store
 */
export const syncSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  try {
    // Get user's subscription from database
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching subscription for sync:', error);
      throw new ApiError(500, 'Failed to fetch subscription for sync');
    }

    if (!data) {
      // No subscription to sync
      return {
        isActive: false,
        plan: null,
        expiryDate: null,
        isLifetime: false,
        isTrialActive: false,
        trialEndDate: null,
      };
    }

    // In a real implementation, you would verify the subscription status with Apple/Google
    // This is a simplified version for demonstration
    
    // For iOS:
    // const verificationResult = await verifyWithApple(data.receipt);
    
    // For Android:
    // const verificationResult = await verifyWithGoogle(data.receipt);

    // Return current subscription status
    return await getSubscriptionStatus(userId);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error syncing subscription status:', error);
    throw new ApiError(500, 'Failed to sync subscription status');
  }
};

/**
 * Handle subscription purchased or renewed webhook
 */
export const handleSubscriptionPurchased = async (notification: any): Promise<void> => {
  try {
    // Extract data from notification
    const userId = notification.userId || notification.user_id;
    const productId = notification.productId || notification.product_id;
    const transactionId = notification.transactionId || notification.transaction_id;
    
    if (!userId || !productId) {
      logger.error('Missing required fields in subscription notification');
      return;
    }
    
    // Update subscription in database
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        product_id: productId,
        transaction_id: transactionId,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      
    logger.info(`Subscription purchased/renewed for user ${userId}`);
  } catch (error) {
    logger.error('Error handling subscription purchase:', error);
  }
};

/**
 * Handle subscription expired or canceled webhook
 */
export const handleSubscriptionExpired = async (notification: any): Promise<void> => {
  try {
    // Extract data from notification
    const userId = notification.userId || notification.user_id;
    const productId = notification.productId || notification.product_id;
    
    if (!userId) {
      logger.error('Missing user ID in subscription notification');
      return;
    }
    
    // Update subscription in database
    await supabase
      .from('subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('product_id', productId);
      
    logger.info(`Subscription expired/canceled for user ${userId}`);
  } catch (error) {
    logger.error('Error handling subscription expiration:', error);
  }
};

/**
 * Handle subscription refunded or revoked webhook
 */
export const handleSubscriptionRefunded = async (notification: any): Promise<void> => {
  try {
    // Extract data from notification
    const userId = notification.userId || notification.user_id;
    const productId = notification.productId || notification.product_id;
    const originalTransactionId = notification.originalTransactionId || 
                                 notification.original_transaction_id;
    
    if (!userId) {
      logger.error('Missing user ID in subscription refund notification');
      return;
    }
    
    // Update subscription in database
    const { error } = await supabase
      .from('subscriptions')
      .update({
        is_active: false,
        refunded: true,
        refund_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq(originalTransactionId ? 'transaction_id' : 'product_id', 
          originalTransactionId || productId);
    
    if (error) {
      logger.error('Error updating subscription for refund:', error);
      return;
    }
      
    // Log the refund event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'refund',
        product_id: productId,
        transaction_id: originalTransactionId,
        created_at: new Date().toISOString(),
        metadata: notification
      });
      
    logger.info(`Subscription refunded for user ${userId}`);
  } catch (error) {
    logger.error('Error handling subscription refund:', error);
  }
};
