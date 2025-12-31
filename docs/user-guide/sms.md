---
title: SMS
parent: User Guide
layout: page
---

## SMS

Sendra includes simple SMS support that allows you to send text messages to your contacts using your device's native SMS application. This feature is perfect for quick communications and leverages your device's built-in messaging capabilities.

{: .note }
SMS support uses your device's native SMS app. You'll need a mobile device or desktop application that supports SMS messaging to use this feature.

### How It Works

SMS in Sendra works by:
1. **Configuring SMS settings** - Enable SMS and select which contact field contains phone numbers
2. **Selecting recipients** - Choose contacts or groups to message
3. **Writing your message** - Compose the text message
4. **Preparing messages** - Groups contacts based on your configured group size
5. **Sending** - Opens your device's native SMS app with pre-filled recipients and message

### Setting Up SMS

Before you can send SMS messages, you need to configure SMS settings:

1. Navigate to **Settings** → **SMS**
2. **Enable SMS** - Toggle the "Enabled" switch to activate SMS functionality
3. **Select Phone Field** - Choose which contact data field contains phone numbers
   - The system will automatically suggest fields containing "phone" in the name
   - Select the field that stores phone numbers for your contacts
4. **Set Group Size** - Configure how many contacts to include per SMS group (default: 20)
   - This helps manage large recipient lists by splitting them into manageable groups
5. Click **"Save"** to apply your settings

### Sending SMS Messages

Once SMS is configured and enabled:

1. Navigate to **SMS** in the main navigation
2. **Select Recipients** - Choose contacts or groups to message
   - Use the contact selector to pick individual contacts
   - Or select entire groups of contacts
3. **Write Your Message** - Enter the text message you want to send
   - Messages are plain text
   - Keep in mind SMS character limits (typically 160 characters per message)
4. **Prepare Messages** - Click **"Prepare messages"** to group your recipients
   - Contacts are automatically grouped based on your configured group size
   - Each group will be sent as a separate SMS conversation
5. **Send Messages** - Click the send button for each group
   - This opens your device's native SMS app
   - Phone numbers and message are pre-filled
   - Review and send from your SMS app

### Group Management

When preparing messages, contacts are automatically organized into groups:

- **Group Size**: Determined by your SMS settings (default: 20 contacts per group)
- **Group Buttons**: Each group shows the number of contacts included
- **Status Tracking**: Groups turn white with a checkmark after being clicked
- **Multiple Groups**: Large recipient lists are split across multiple groups

