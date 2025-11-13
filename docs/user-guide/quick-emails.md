---
title: Quick Emails
parent: User Guide
layout: page
---

## Quick Emails

Quick emails allow you to send campaigns using a simple rich text editor instead of the full editor. This is perfect for sending quick updates, announcements, or messages where you want to maintain a consistent design without rebuilding the entire email layout each time.

### How It Works

1. **Create a Quick Email Template** - A reusable email design that includes a special token where your content will be inserted
2. **Create a Campaign** - Select your quick email template and write your message using the rich text editor
3. **Send** - Your formatted message gets automatically inserted into the template

### Creating a Quick Email Template

1. Go to **Templates** → **"New"**
2. Add the token `{{quickBody}}` or `{{{quickBody}}}` where you want the campaign content to appear
3. Check the **"Quick Email Template"** checkbox
4. Click **"Create Template"**

#### Token Options

- `{{quickBody}}` - Escapes HTML in the campaign body (safer for plain text)
- `{{{quickBody}}}` - Does NOT escape HTML (use if you want to include HTML formatting in your campaign)


### Creating a Quick Email Campaign

1. Go to **Campaigns** → **"New"**
2. Enter a subject line
3. Select a quick email template from the dropdown
4. Click **"Create Campaign"**
5. Add recipients (contacts or groups)
6. Write your message using the rich text editor with formatting options:
   - **Bold**, *Italic*
   - Bullet lists and numbered lists
   - Block quotes
   - Links
7. Click **"Send Test"** to preview (sends to all project members)
8. Click **"Send"** to deliver to recipients

### Regular vs Quick Email Templates

| Feature | Regular Template | Quick Email Template |
|---------|-----------------|---------------------|
| Editor | Full  editor | Simple rich text editor |
| Formatting | Full HTML control | Basic formatting (bold, lists, links, etc.) |
| Use Case | Complex designs, one-time campaigns | Consistent design, frequent updates |
| Setup Time | Longer (design each time) | Faster (just write content) |
| Flexibility | Full control per campaign | Consistent layout with formatted content |

### Template Variables

Quick email templates support all standard template variables:

```
{{contact.email}}           - Contact's email address
{{contact.data.firstName}}  - Custom contact data
{{project.name}}            - Project name
{{project.id}}              - Project ID
```

These can be used anywhere in the template, including the body content you write in the campaign editor.

