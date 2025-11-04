/**
 * Fake data sources for customer support demo
 */

export const PRODUCT_DOCS = `
# SmartHome Hub Pro - Product Documentation

## Getting Started

### Unboxing Your SmartHome Hub Pro
Your SmartHome Hub Pro package includes: the main hub unit, power adapter, ethernet cable, quick start guide, and mounting hardware.

### Initial Setup
1. Connect the hub to your router using the included ethernet cable
2. Plug in the power adapter
3. Download the SmartHome app from the App Store or Google Play
4. Open the app and tap "Add New Hub"
5. Follow the on-screen pairing instructions

The LED on the front will turn solid blue when setup is complete.

## Device Pairing

### Adding Smart Lights
1. Open the SmartHome app and navigate to Devices
2. Tap the + button and select "Smart Light"
3. Put your light in pairing mode (usually by turning it on/off 3 times)
4. The hub will automatically discover and connect to the light
5. Give your light a name and assign it to a room

### Adding Smart Sensors
Motion sensors, door sensors, and temperature sensors all follow the same pairing process:
1. Remove the battery tab from the sensor
2. In the app, tap + and select the sensor type
3. Press the pairing button on the sensor (small button on the back)
4. Wait for confirmation in the app

### Adding Smart Locks
IMPORTANT: Always keep your physical keys as backup before installing a smart lock.
1. Install the smart lock hardware according to the manufacturer's instructions
2. In the app, select Add Device > Smart Lock
3. Follow the calibration process to set the locked/unlocked positions
4. Create access codes for family members

## Troubleshooting

### Hub Won't Connect to WiFi
- Ensure your router is 2.4GHz compatible (5GHz is not supported)
- Check that your internet connection is active
- Try moving the hub closer to your router
- Restart both the hub and router

### Device Disconnected or Offline
- Check if the device has power/batteries
- Move the device closer to the hub (max range is 50 feet)
- Remove and re-add the device
- Update the hub firmware in the app settings

### Factory Reset
Press and hold the reset button on the back of the hub for 10 seconds. The LED will flash red, then return to blue. This will erase all settings and paired devices.

## Advanced Features

### Automation Rules
Create custom automation rules based on time, device state, or sensor triggers. For example:
- Turn on porch lights at sunset
- Lock doors at 11 PM
- Send notification if motion detected while away

### Voice Control
The hub integrates with Amazon Alexa, Google Assistant, and Apple HomeKit. Link your account in the respective smart home app.

### Energy Monitoring
View real-time and historical energy usage for connected smart plugs and lights in the Energy tab.
`;

export const FAQ_DATA = `
# Frequently Asked Questions

## Account & Billing

**Q: How do I update my credit card information?**
A: Log into your account, go to Settings > Payment Methods, and click "Add Payment Method" or "Edit" next to your existing card.

**Q: Can I pause my subscription?**
A: Yes, you can pause your Premium subscription for up to 3 months. Go to Settings > Subscription > Pause Subscription.

**Q: What's included in the Premium subscription?**
A: Premium includes unlimited device connections, advanced automation rules, extended warranty coverage, 24/7 priority support, and cloud video storage for cameras.

**Q: How do I cancel my subscription?**
A: You can cancel anytime in Settings > Subscription > Cancel. You'll retain access until the end of your billing period.

## Technical Questions

**Q: What's the maximum number of devices I can connect?**
A: Free accounts support up to 10 devices. Premium accounts have unlimited device connections.

**Q: Is my data secure?**
A: Yes, all communications are encrypted with AES-256. We never sell your data to third parties. See our Privacy Policy for details.

**Q: Can I control devices when away from home?**
A: Yes, as long as your hub is connected to the internet, you can control devices from anywhere using the mobile app.

**Q: Does the hub work during internet outages?**
A: Local automations and manual control via the app (on the same network) will continue to work. Cloud features and remote access require internet.

## Product Questions

**Q: What devices are compatible?**
A: We support Zigbee and Z-Wave devices from most major brands. Check our compatibility list at smarthomehub.com/compatible

**Q: Can I use multiple hubs in one home?**
A: Yes, you can add multiple hubs to extend coverage in large homes. They'll work together seamlessly.

**Q: What's the warranty period?**
A: Standard warranty is 1 year from purchase. Premium subscribers get extended 3-year warranty coverage.

**Q: How do I get a replacement for a defective product?**
A: Contact support with your order number. Defective products within warranty are replaced free of charge.

## Returns & Exchanges

**Q: What's your return policy?**
A: 30-day money-back guarantee for all products. Items must be in original packaging with all accessories.

**Q: How long do refunds take?**
A: Refunds are processed within 5-7 business days after we receive your return. Allow 3-5 additional days for your bank to post the credit.

**Q: Can I exchange for a different product?**
A: Yes, exchanges are free within 30 days. Contact support to initiate an exchange.
`;

export const BILLING_KB = `
# Billing Knowledge Base

## Payment Processing

### Payment Methods Accepted
We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and Apple Pay. Cryptocurrency payments are not currently supported.

### Billing Cycles
- Monthly subscriptions: Billed on the same date each month
- Annual subscriptions: Billed yearly, save 20% compared to monthly
- One-time purchases: Charged immediately upon order

### Failed Payment Recovery
If a payment fails:
1. You'll receive an email notification
2. We'll retry the payment in 3 days
3. If still unsuccessful, we'll retry again at 7 days
4. After 10 days, your account will be suspended
5. Update payment info to restore access

### Payment Disputes and Chargebacks
If you dispute a charge with your bank:
- Your account will be temporarily suspended
- Contact our billing team to resolve
- Provide documentation for disputed transactions
- Resolution typically takes 5-10 business days

## Subscription Management

### Upgrading from Free to Premium
Premium benefits activate immediately upon upgrade. You'll be charged a prorated amount for the remainder of your billing cycle.

### Downgrading from Premium to Free
Downgrades take effect at the end of your current billing period. You'll retain Premium features until then. No refunds for unused time.

### Subscription Pausing
Premium subscribers can pause for up to 3 months per year:
- No charges during pause period
- Access is suspended but data is retained
- Resume anytime in Settings

### Auto-Renewal
All subscriptions auto-renew by default. Disable auto-renewal in Settings > Subscription at least 24 hours before renewal date.

## Refunds and Credits

### Refund Eligibility
- Products: 30 days from delivery date
- Subscriptions: Pro-rated refund if canceled within 14 days
- Premium features: No refund if used more than 7 days

### Processing Refunds
1. Submit refund request through Support
2. Return products (if applicable) within 14 days
3. Refund issued to original payment method
4. Allow 5-7 business days for processing

### Account Credits
Credits are applied automatically to future purchases:
- Issued for service outages (prorated)
- Promotional credits expire in 90 days
- Cannot be transferred or redeemed for cash

## Invoices and Receipts

### Accessing Invoices
View and download invoices at Account > Billing History. Invoices are generated for all transactions and emailed to your account email.

### Tax Information
Sales tax is calculated based on your shipping address. Tax-exempt organizations should submit exemption certificates to billing@smarthomehub.com.

### Updating Billing Information
Update your billing address, company name, or VAT number in Account Settings. Changes apply to future invoices only.

## Common Billing Issues

### Duplicate Charges
Duplicate charges are typically authorization holds. If not resolved within 48 hours, contact billing support with transaction details.

### Incorrect Amount
Verify the charge includes:
- Base subscription fee
- Any add-ons or upgrades
- Applicable taxes
- Prorated charges for mid-cycle changes

### Missing Refund
Refunds can take 7-10 business days to appear. Check with your bank if you don't see it after 10 days. We can provide a refund reference number.

### Currency Conversion
Charges appear in USD. Your bank may apply currency conversion fees. We don't control these fees.
`;

export const RETURNS_POLICY = `
# Returns and Refunds Policy

## 30-Day Money-Back Guarantee

We stand behind our products with a 30-day money-back guarantee. If you're not satisfied with your purchase, you can return it within 30 days of delivery for a full refund.

### Return Eligibility Requirements
- Product must be in original, unused condition
- All accessories, cables, and manuals must be included
- Original packaging required (or suitable alternative)
- No physical damage or modifications
- Return initiated within 30 days of delivery

### Non-Returnable Items
The following items cannot be returned:
- Downloadable software or digital products
- Opened security seals or tamper-evident packaging
- Custom-configured products
- Gift cards or promotional items
- Products marked as "Final Sale"

## Return Process

### Step 1: Initiate Return
1. Log into your account and go to Orders
2. Select the order containing the item(s) to return
3. Click "Request Return" and select reason
4. Submit the return request

You'll receive a confirmation email with return instructions and RMA (Return Merchandise Authorization) number within 24 hours.

### Step 2: Prepare Package
- Pack items securely in original or suitable packaging
- Include all accessories and documentation
- Print and attach the return label (emailed to you)
- Write RMA number clearly on outside of package

### Step 3: Ship Return
- Drop off at any authorized shipping location
- Free return shipping for defective items
- Customer pays return shipping for non-defective returns (typically $8-15)
- Keep tracking number for your records

### Step 4: Receive Refund
- Refund processed within 5-7 business days of receiving return
- Original payment method receives credit
- Shipping charges are non-refundable (except defective items)
- Email confirmation sent when refund is processed

## Exchanges

### Exchange for Same Product
If your product is defective or damaged:
- Free replacement shipped immediately
- Keep or dispose of defective item (no return needed)
- Contact support with photos of damage

### Exchange for Different Product
1. Return original item following normal return process
2. Place new order for desired product
3. Price difference will be charged or refunded
4. Exchange shipping is free within 30 days

## Warranty Returns

### Products Under Warranty (1 Year Standard)
Defective products covered under warranty:
- Free replacement or repair
- No return shipping charges
- Extended to 3 years for Premium subscribers
- Proof of purchase required

### Products Out of Warranty
Out-of-warranty products can still be returned within 30 days of purchase for refund. After 30 days, consider:
- Paid repair service (contact support for quote)
- Trade-in program for 20% credit toward new purchase
- Responsible recycling program

## Special Situations

### Damaged During Shipping
If product arrived damaged:
- Report within 48 hours of delivery
- Provide photos of package and product damage
- Replacement shipped immediately at no charge
- No need to return damaged item

### Wrong Item Received
If we shipped the wrong product:
- Contact support immediately
- Correct item shipped at no charge
- Return label provided for wrong item
- No restocking fee applied

### Missing Items or Parts
If your order is incomplete:
- Contact support within 7 days
- Missing items shipped free of charge
- May require photo proof of package contents

## Restocking Fees

### No Restocking Fee For:
- Defective or damaged products
- Wrong item shipped by us
- Returns within 14 days
- Premium subscribers

### 15% Restocking Fee Applies To:
- Returns after 14 days (but within 30 days)
- Opened items (if returnable)
- Items missing accessories
- Products without original packaging

## International Returns

### Returns from Outside US
- Same 30-day return policy applies
- Customer responsible for return shipping costs
- Customs fees are non-refundable
- Consider local warranty service centers as alternative

### Refund Currency
Refunds issued in original purchase currency. Exchange rate fluctuations may result in amount difference.

## Refund Timeline

| Situation | Refund Processing Time |
|-----------|----------------------|
| Standard return | 5-7 business days after receipt |
| Defective item | 3-5 business days (replacement shipped first) |
| Wrong item shipped | Immediate (no return required) |
| Subscription cancellation | Pro-rated within 7 business days |

## Contact Support

For return questions or issues:
- Email: returns@smarthomehub.com
- Phone: 1-800-SMART-HUB (1-800-762-7848)
- Chat: Available in app or website
- Hours: Monday-Friday 9 AM - 6 PM EST

Please have your order number ready when contacting support.
`;
