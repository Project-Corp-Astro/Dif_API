import { verifyWebhookSignature, parseWebhookEventType, extractSubscriptionDetails } from '../../utils/webhook.utils';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

describe('Webhook Utilities', () => {
  // Mock environment variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.APPLE_WEBHOOK_SECRET = 'test-apple-secret';
    process.env.GOOGLE_WEBHOOK_SECRET = 'test-google-secret';
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('verifyWebhookSignature', () => {
    test('should verify Apple webhook signature correctly', () => {
      // Create a test payload and signature
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-apple-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
      
      const result = verifyWebhookSignature(payload, signature, 'apple');
      expect(result).toBe(true);
    });
    
    test('should reject invalid Apple webhook signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-signature';
      
      const result = verifyWebhookSignature(payload, invalidSignature, 'apple');
      expect(result).toBe(false);
    });
    
    test('should verify Google webhook signature correctly', () => {
      // For Google, we need to mock the JWT verification
      const mockVerify = jest.spyOn(jwt, 'verify').mockImplementation(() => ({ test: 'data' }));
      
      const payload = JSON.stringify({ test: 'data' });
      const signature = 'valid-jwt-token';
      
      const result = verifyWebhookSignature(payload, signature, 'google');
      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith(signature, 'test-google-secret', expect.any(Object));
      
      mockVerify.mockRestore();
    });
    
    test('should reject invalid Google webhook signature', () => {
      // Mock JWT verification to throw an error
      const mockVerify = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      const payload = JSON.stringify({ test: 'data' });
      const signature = 'invalid-jwt-token';
      
      const result = verifyWebhookSignature(payload, signature, 'google');
      expect(result).toBe(false);
      
      mockVerify.mockRestore();
    });
    
    test('should return false for unknown provider', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = 'some-signature';
      
      // @ts-ignore - Testing with invalid provider
      const result = verifyWebhookSignature(payload, signature, 'unknown');
      expect(result).toBe(false);
    });
  });
  
  describe('parseWebhookEventType', () => {
    test('should parse Apple purchase notification event type', () => {
      const payload = {
        notificationType: 'CONSUMPTION_REQUEST',
        subtype: 'PURCHASE',
        data: {
          signedTransactionInfo: 'test-transaction'
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'apple');
      expect(eventType).toBe('purchased');
    });
    
    test('should parse Apple renewal notification event type', () => {
      const payload = {
        notificationType: 'DID_RENEW',
        subtype: 'AUTO_RENEW',
        data: {
          signedTransactionInfo: 'test-transaction'
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'apple');
      expect(eventType).toBe('renewed');
    });
    
    test('should parse Apple expiration notification event type', () => {
      const payload = {
        notificationType: 'DID_FAIL_TO_RENEW',
        subtype: 'AUTO_RENEW_DISABLED',
        data: {
          signedTransactionInfo: 'test-transaction'
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'apple');
      expect(eventType).toBe('expired');
    });
    
    test('should parse Apple refund notification event type', () => {
      const payload = {
        notificationType: 'REFUND',
        subtype: 'REVOKE',
        data: {
          signedTransactionInfo: 'test-transaction'
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'apple');
      expect(eventType).toBe('refunded');
    });
    
    test('should parse Google purchase notification event type', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_PURCHASED',
        data: {
          subscriptionNotification: {
            purchaseToken: 'test-token'
          }
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'google');
      expect(eventType).toBe('purchased');
    });
    
    test('should parse Google renewal notification event type', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_RENEWED',
        data: {
          subscriptionNotification: {
            purchaseToken: 'test-token'
          }
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'google');
      expect(eventType).toBe('renewed');
    });
    
    test('should parse Google expiration notification event type', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_EXPIRED',
        data: {
          subscriptionNotification: {
            purchaseToken: 'test-token'
          }
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'google');
      expect(eventType).toBe('expired');
    });
    
    test('should parse Google refund notification event type', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_REVOKED',
        data: {
          subscriptionNotification: {
            purchaseToken: 'test-token'
          }
        }
      };
      
      const eventType = parseWebhookEventType(payload, 'google');
      expect(eventType).toBe('refunded');
    });
    
    test('should return unknown for unrecognized event type', () => {
      const payload = {
        notificationType: 'UNKNOWN_TYPE',
        data: {}
      };
      
      const eventType = parseWebhookEventType(payload, 'apple');
      expect(eventType).toBe('unknown');
    });
    
    test('should return unknown for unknown provider', () => {
      const payload = { test: 'data' };
      
      // @ts-ignore - Testing with invalid provider
      const eventType = parseWebhookEventType(payload, 'unknown');
      expect(eventType).toBe('unknown');
    });
  });
  
  describe('extractSubscriptionDetails', () => {
    test('should extract Apple subscription details', () => {
      const payload = {
        notificationType: 'CONSUMPTION_REQUEST',
        subtype: 'PURCHASE',
        data: {
          signedTransactionInfo: 'test-transaction',
          signedRenewalInfo: 'test-renewal',
          transactionInfo: {
            originalTransactionId: '123456',
            productId: 'com.corpastroapps.monthly',
            transactionId: '789012',
            webOrderLineItemId: 'web123'
          }
        }
      };
      
      const details = extractSubscriptionDetails(payload, 'apple');
      expect(details).toEqual({
        originalTransactionId: '123456',
        productId: 'com.corpastroapps.monthly',
        transactionId: '789012',
        webOrderLineItemId: 'web123',
        receipt: 'test-transaction'
      });
    });
    
    test('should extract Google subscription details', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_PURCHASED',
        data: {
          subscriptionNotification: {
            purchaseToken: 'test-token',
            subscriptionId: 'com.corpastroapps.monthly',
            orderId: '789012'
          }
        }
      };
      
      const details = extractSubscriptionDetails(payload, 'google');
      expect(details).toEqual({
        originalTransactionId: '789012',
        productId: 'com.corpastroapps.monthly',
        transactionId: '789012',
        purchaseToken: 'test-token',
        receipt: 'test-token'
      });
    });
    
    test('should return empty object for unknown provider', () => {
      const payload = { test: 'data' };
      
      // @ts-ignore - Testing with invalid provider
      const details = extractSubscriptionDetails(payload, 'unknown');
      expect(details).toEqual({});
    });
    
    test('should handle missing data in Apple payload', () => {
      const payload = {
        notificationType: 'CONSUMPTION_REQUEST',
        subtype: 'PURCHASE',
        // Missing data object
      };
      
      const details = extractSubscriptionDetails(payload, 'apple');
      expect(details).toEqual({});
    });
    
    test('should handle missing data in Google payload', () => {
      const payload = {
        messageType: 'SUBSCRIPTION_PURCHASED',
        // Missing data object
      };
      
      const details = extractSubscriptionDetails(payload, 'google');
      expect(details).toEqual({});
    });
  });
});
