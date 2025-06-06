import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import * as subscriptionService from '../services/subscription.service';
import { verifyWebhookSignature, parseWebhookEventType, extractSubscriptionDetails } from '../utils/webhook.utils';

/**
 * Get current subscription status for a user
 */
export const getSubscriptionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const status = await subscriptionService.getSubscriptionStatus(userId);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * Validate receipt and update subscription status
 */
export const validateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { receipt, productId, platform } = req.body;
    
    if (!receipt || !productId || !platform) {
      throw new ApiError(400, 'Receipt, productId, and platform are required');
    }

    const result = await subscriptionService.validateReceipt(
      userId,
      receipt,
      productId,
      platform
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error validating subscription:', error);
    next(error);
  }
};

/**
 * Sync subscription status with store
 */
export const syncSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const result = await subscriptionService.syncSubscriptionStatus(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle webhook notifications from app stores
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, headers } = req;
    const rawBody = req.rawBody as string || JSON.stringify(body);
    
    // Determine provider based on headers or payload structure
    const provider = determineProvider(headers, body);
    if (!provider) {
      logger.warn('Unknown webhook provider');
      return res.status(200).json({ status: 'error', message: 'Unknown provider' });
    }
    
    // Get the appropriate secret for the provider
    const webhookSecret = getWebhookSecret(provider);
    if (!webhookSecret) {
      logger.error(`Webhook secret not configured for provider: ${provider}`);
      return res.status(200).json({ status: 'error', message: 'Configuration error' });
    }
    
    // Get signature from headers based on provider
    const signature = getSignatureFromHeaders(headers, provider);
    if (!signature) {
      logger.warn('Missing webhook signature');
      return res.status(200).json({ status: 'error', message: 'Missing signature' });
    }
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(200).json({ status: 'error', message: 'Invalid signature' });
    }
    
    // Parse event type from the payload
    const eventType = parseWebhookEventType(body, provider);
    logger.info(`Processing ${provider} webhook: ${eventType}`);
    
    // Extract subscription details
    const subscriptionDetails = extractSubscriptionDetails(body, provider);
    
    // Process notification based on event type
    switch (eventType) {
      case 'INITIAL_BUY':
      case 'DID_RENEW':
      case 'RENEWAL':
      case 'INTERACTIVE_RENEWAL':
      case 'SUBSCRIPTION_PURCHASED':
      case 'SUBSCRIPTION_RENEWED':
        await subscriptionService.handleSubscriptionPurchased({
          ...body,
          provider,
          ...subscriptionDetails
        });
        break;
        
      case 'EXPIRED':
      case 'DID_FAIL_TO_RENEW':
      case 'GRACE_PERIOD':
      case 'SUBSCRIPTION_EXPIRED':
      case 'SUBSCRIPTION_CANCELED':
        await subscriptionService.handleSubscriptionExpired({
          ...body,
          provider,
          ...subscriptionDetails
        });
        break;
        
      case 'REFUND':
      case 'REVOKE':
        await subscriptionService.handleSubscriptionRefunded({
          ...body,
          provider,
          ...subscriptionDetails
        });
        break;
        
      default:
        logger.info(`Unhandled notification type: ${eventType}`);
    }
    
    // Return success to acknowledge receipt
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    // Always return 200 to prevent retries
    res.status(200).json({ status: 'error', message: 'Error processing webhook' });
  }
};

/**
 * Determine the provider (apple, google) based on headers and payload
 */
const determineProvider = (headers: any, body: any): 'apple' | 'google' | null => {
  // Check Apple-specific headers
  if (headers['x-apple-verification-id'] || 
      (body.notificationType && body.data && body.signedPayload)) {
    return 'apple';
  }
  
  // Check Google-specific headers or payload structure
  if (headers['x-goog-signature'] || 
      body.subscriptionNotification || 
      body.oneTimeProductNotification) {
    return 'google';
  }
  
  return null;
};

/**
 * Get the appropriate webhook secret for the provider
 */
const getWebhookSecret = (provider: 'apple' | 'google'): string => {
  switch (provider) {
    case 'apple':
      return process.env.APPLE_WEBHOOK_SECRET || '';
    case 'google':
      return process.env.GOOGLE_WEBHOOK_SECRET || '';
    default:
      return '';
  }
};

/**
 * Extract signature from headers based on provider
 */
const getSignatureFromHeaders = (headers: any, provider: 'apple' | 'google'): string => {
  switch (provider) {
    case 'apple':
      return headers['x-apple-signature'] || '';
    case 'google':
      return headers['x-goog-signature'] || '';
    default:
      return '';
  }
};
