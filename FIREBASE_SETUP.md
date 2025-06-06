# Firebase Setup for FCM Testing

This guide explains how to set up Firebase for testing FCM notifications in the Corp Astro application.

## Prerequisites

1. A Firebase project with FCM enabled
2. Admin access to the Firebase console

## Step 1: Create a Firebase Service Account

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) > Service accounts
4. Click "Generate new private key"
5. Save the downloaded JSON file securely

## Step 2: Configure the Backend

1. Rename the downloaded JSON file to `firebase-service-account.json`
2. Place it in the root directory of the `corp-astro-api` project
3. Make sure the file is included in your `.gitignore` to avoid committing sensitive credentials

Alternatively, you can set the path to your service account file using an environment variable:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/service-account.json
```

## Step 3: Test FCM Integration

Run the FCM test script to verify your setup:

```bash
# Send to all users with FCM tokens
npm run test-fcm

# Send to a specific user
npm run test-fcm -- --userId=<user_id>

# Send to a topic
npm run test-fcm -- --topic=daily-horoscope
```

## Step 4: Migrate Existing Users

Once you've verified that FCM is working correctly, run the migration script to transition existing users from Expo Push Tokens to FCM:

```bash
npm run migrate-fcm
```

## Security Considerations

- Never commit your Firebase service account credentials to version control
- In production, use environment variables or a secure secret management system
- Rotate your service account keys periodically
- Set up proper Firebase Security Rules to restrict access to your FCM functions

## Troubleshooting

If you encounter issues with FCM:

1. Check that your service account has the necessary permissions
2. Verify that FCM is enabled in your Firebase project
3. Ensure the device has a valid FCM token
4. Check the backend logs for any errors during notification sending
