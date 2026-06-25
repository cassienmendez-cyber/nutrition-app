// Generate a VAPID key pair for Web Push. Run: `npm run vapid`
// Paste the output into your server's environment (.env or host config).
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('# Add these to your server environment:')
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log('VAPID_SUBJECT=mailto:you@example.com')
