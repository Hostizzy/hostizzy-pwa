# VAPID Setup Checklist

Use this checklist to track your push notification setup progress.

## Setup Steps

### 1. Generate VAPID Keys ⬜
- [ ] Visit https://web-push-codelab.glitch.me/
- [ ] Click "Generate VAPID Keys"
- [ ] Copy PUBLIC key
- [ ] Copy PRIVATE key
- [ ] Save both in secure location

### 2. Add Keys to Supabase Vault ⬜
- [ ] Open Supabase Dashboard
- [ ] Go to Settings → Vault
- [ ] Add secret: `VAPID_PUBLIC_KEY` = [your public key]
- [ ] Add secret: `VAPID_PRIVATE_KEY` = [your private key]
- [ ] Add secret: `VAPID_SUBJECT` = mailto:support@hostizzy.com

### 3. Update Frontend Code ⬜
- [ ] Open `index.html` in GitHub
- [ ] Find line ~14116: `const VAPID_PUBLIC_KEY`
- [ ] Replace `YOUR_VAPID_PUBLIC_KEY_HERE` with actual public key
- [ ] Commit changes

### 4. Run Database Migration ⬜
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of `/supabase-migrations/push_subscriptions.sql`
- [ ] Paste in SQL Editor
- [ ] Click "Run"
- [ ] Verify "Success" message

### 5. Deploy Edge Function ⬜
- [ ] Open Supabase Dashboard → Edge Functions
- [ ] Click "Deploy new function"
- [ ] Name: `send-push`
- [ ] Copy contents of `/supabase/functions/send-push/index.ts`
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete

### 6. Test in Browser ⬜
- [ ] Open https://resiq.hostizzy.com
- [ ] Open browser console (F12)
- [ ] Run: `await subscribeToPush()`
- [ ] Allow notifications when prompted
- [ ] Run: `await getPushSubscriptionStatus()`
- [ ] Verify `subscribed: true`

### 7. Test Notification Trigger ⬜
- [ ] Create a new booking, OR
- [ ] Record a payment, OR
- [ ] Approve a KYC document
- [ ] Verify you received a push notification
- [ ] Click notification → should open app

### 8. Verify in Database ⬜
- [ ] Open Supabase Dashboard → Table Editor
- [ ] Open `push_subscriptions` table
- [ ] Verify your subscription exists
- [ ] Open `notification_logs` table
- [ ] Verify test notification was logged

## Troubleshooting

### No notification received?
- Check browser console for errors
- Verify VAPID key is correct in `index.html`
- Check notification permission: `console.log(Notification.permission)`
- Verify Edge Function deployed: Supabase Dashboard → Edge Functions

### "VAPID key not configured" error?
- Public key not replaced in `index.html`
- Redeploy app after updating key

### "Failed to save subscription" error?
- Database migration not run
- Check Supabase Dashboard → Logs

### Edge Function errors?
- Check Supabase Dashboard → Edge Functions → Logs
- Verify secrets are in Vault
- Redeploy function after adding secrets

## Next Steps After Setup

- [ ] Add more team members and test notifications
- [ ] Monitor `notification_logs` for delivery success rate
- [ ] Consider OneSignal for production scale (see PUSH_NOTIFICATIONS_SETUP.md)
- [ ] Add scheduled notifications (check-in reminders, overdue payments)
- [ ] Create user settings UI for notification preferences
