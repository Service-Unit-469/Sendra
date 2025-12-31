---
title: User Guide
layout: page
---

#  User Guide

This guide covers how to use the Sendra dashboard to manage your email infrastructure, create campaigns, set up automations, and track analytics.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)

## Topic Pages

- [Actions & Events](./user-guide/actions-events.html)
- [Analytics](./user-guide/analytics.html)
- [Assets](./user-guide/assets.html)
- [Campaigns](./user-guide/campaigns.html)
- [Contacts & Groups](./user-guide/contacts-groups.html)
- [Project Settings](./user-guide/project-settings.html)
- [Quick Emails](./user-guide/quick-emails.html)
- [SMS](./user-guide/sms.html)
- [Templates](./user-guide/templates.html)

## Getting Started

### Accessing the Dashboard

Navigate to your deployed Sendra dashboard URL (e.g., `https://your-cloudfront-url.cloudfront.net`).

### Creating Your Account

1. Click **"Sign Up"** on the login page
2. Enter your email address and secure password
3. Click **"Create Account"**
4. Check your email for a verification code
5. Enter the verification code to activate your account
6. Log in with your credentials

![Login Page](./images/login-page.png)

![Signup Page](./images/signup-page.png)

### Creating Your First Project

After logging in for the first time:

1. You'll be prompted to create a new project
2. Enter your **Project Name** (e.g., "My Application")
3. Enter your **Website URL** (e.g., "https://myapp.com")
4. Click **"Create Project"**

## Dashboard Overview

![Dashboard Home](./images/dashboard-home.png)

The main dashboard provides quick access to:

### Quick Actions

- **Verify Your Domain**: Configure AWS SES identity (required before sending)
- **Send a Campaign**: Create and send email broadcasts
- **Analytics**: View email performance metrics
- **Documentation**: Access help resources

### Activity Feed

The activity feed shows recent:
- Emails sent
- Campaigns delivered
- Events tracked
- Actions triggered

### Navigation Menu

- **Dashboard**: Home page with overview
- **Contacts**: Manage your email recipients
- **Groups**: Organize contacts into segments
- **Templates**: Create reusable email templates
- **Assets**: Upload and manage images and files
- **Actions**: Set up email automations
- **Campaigns**: Create and send broadcasts
- **Events**: Track user behaviors
- **Analytics**: View performance metrics
- **Settings**: Configure project and account

## Password Reset

If you forget your password:

1. Go to login page
2. Click **"Forgot Password?"**
3. Enter your email address
4. Check email for reset code
5. Enter code and new password
6. Log in with new password

![Forgot Password Page](./images/forgot-password-page.png)

## Getting Help

### Support Resources

- **Documentation**: This guide and other docs
- **API Documentation**: [API Guide](./api.html)
- **Entity Reference**: [Entities Guide](./entities.html)
- **Setup Guide**: [Setup Guide](./setup.html)

### Community Support

- **GitHub Issues**: [Report bugs](https://github.com/Service-Unit-469/Sendra/issues)
- **Contributing**: See [CONTRIBUTING.html](../CONTRIBUTING.html)

### AWS SES Support

For issues with AWS SES:
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS Support](https://console.aws.amazon.com/support)
- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)

## Next Steps

Now that you know how to use Sendra:

1. **Set up your identity** (Settings → Identity)
2. **Create your first template**
3. **Add some contacts** (manually or via API)
4. **Set up a welcome email action**
5. **Track events from your application**
6. **Monitor analytics and iterate**

Happy sending! 📧

