[Docs](./index.md) > Entities

# Sendra Entities

This guide describes all the key entities in Sendra, their properties, relationships, and how they work together to power the email platform.

## Table of Contents

- [Entity Overview](#entity-overview)
- [Core Entities](#core-entities)
  - [User](#user)
  - [Project](#project)
  - [Membership](#membership)
- [Email Management](#email-management)
  - [Contact](#contact)
  - [Group](#group)
  - [Template](#template)
  - [Campaign](#campaign)
- [Automation](#automation)
  - [Event](#event)
  - [Action](#action)
- [Communication](#communication)
  - [Email](#email)
  - [Subscriber](#subscriber)
- [System Entities](#system-entities)
  - [Task](#task)
  - [Delivery Event](#delivery-event)
- [Entity Relationships](#entity-relationships)

## Entity Overview

Sendra's data model is organized around **Projects**, which serve as the primary organizational unit. Each project contains contacts, templates, campaigns, and automations.

## Core Entities

### User

**Purpose**: Represents a user account that can access the Sendra dashboard and manage projects.

Each user has a unique email address and must verify their email before full access. Users can be members of multiple projects, and passwords are stored hashed using secure algorithms.

**Relationships**:
- One user can have many memberships (many-to-many with Projects via Memberships)

---

### Project

**Purpose**: The primary organizational unit that contains all email-related resources (contacts, templates, campaigns, etc.).

Each project has unique API keys (public and secret) that are used for programmatic access. Projects can configure custom event types for tracking and can verify email identities or domains with AWS SES.

**Relationships**:
- One project has many contacts
- One project has many templates
- One project has many campaigns
- One project has many actions
- One project has many events
- One project has many groups
- One project has many memberships (users)

---

### Membership

**Purpose**: Represents the relationship between a User and a Project, defining access and permissions.

**Roles**:
- **ADMIN**: Full control over the project (can invite/remove members, delete project, access all features)
- **MEMBER**: Can use project features but cannot manage team members or delete project

Membership implements project-level access control, allowing a user to have different roles across different projects. The creator of a project automatically becomes an admin.

**Relationships**:
- Many-to-many relationship between Users and Projects

## Email Management

### Contact

**Purpose**: Represents an email recipient in your project's audience.

Each contact is unique per project by email address. The `data` field stores custom attributes (name, company, preferences, etc.), and the `subscribed` status must be respected for compliance. Contacts can be added via API or dashboard.

**Relationships**:
- Belongs to one project
- Can be in multiple groups
- Associated with multiple events
- Can receive emails from campaigns and actions

**Example Data**:
```json
{
  "id": "abc123",
  "project": "proj456",
  "email": "user@example.com",
  "subscribed": true,
  "data": {
    "name": "John Doe",
    "company": "Acme Corp",
    "plan": "premium",
    "signupDate": "2024-01-15"
  }
}
```

---

### Group

**Purpose**: Organizes contacts into collections for targeted email campaigns.

Groups are collections of contacts where a contact can belong to multiple groups. Groups can be used to target specific audiences in campaigns and are managed manually or via API.

**Relationships**:
- Belongs to one project
- Contains many contacts

**Example**:
```json
{
  "id": "grp789",
  "project": "proj456",
  "name": "Premium Users",
  "contacts": ["contact1", "contact2", "contact3"]
}
```

---

### Template

**Purpose**: Reusable email templates for transactional emails and automations.

**Template Types**:
- **MARKETING**: For campaigns and promotional content
- **TRANSACTIONAL**: For system emails (receipts, notifications, etc.)

Templates support variable interpolation using Handlebars syntax and are authored in a block-based editor for rich formatting. 

**Relationships**:
- Belongs to one project
- Can be used by multiple actions
- Can be sent directly via API

---

### Campaign

**Purpose**: One-time email broadcasts sent to a targeted audience.

**Campaign Status**:
- **DRAFT**: Campaign is being prepared, not yet sent
- **DELIVERED**: Campaign has been sent to recipients

Campaigns can target specific contacts or entire groups. They support delayed sending for scheduled campaigns.

**Relationships**:
- Belongs to one project
- Targets multiple contacts and/or groups
- Creates events when sent

**Sending a Campaign**:
```typescript
{
  id: "campaign123",
  live: true,           // Set to true to actually send
  delay: 0              // Delay in seconds before sending
}
```

## Automation

### Event

**Purpose**: Tracks user actions and behaviors that can trigger automated responses.

Events are immutable records of actions where custom event types can be defined per project. Events can trigger automated actions, and event data is flexible for storing context.

**Built-in Event Types**:
- Email sent
- Email delivered
- Email opened
- Email clicked
- Email bounced
- Custom events (defined by your application)

**Relationships**:
- Belongs to one project
- Associated with one contact
- Can trigger multiple actions
- Can relate to emails, campaigns, or actions

**Example Custom Event**:
```json
{
  "eventType": "purchase-completed",
  "contact": "contact123",
  "data": {
    "orderId": "ORD-123",
    "amount": 99.99,
    "product": "Premium Plan"
  }
}
```

---

### Action

**Purpose**: Automated email workflows triggered by specific events.

Actions create email automation workflows that can be triggered by one or more event types and can be prevented by certain events (negative conditions). The `runOnce` flag ensures contacts only receive the email once, and actions support delayed execution for drip campaigns.

**Relationships**:
- Belongs to one project
- Uses one template
- Triggered by multiple event types
- Sends emails to contacts

**Example Action Logic**:
```
IF contact triggers "signup-completed" event
AND has NOT triggered "onboarding-completed" event
THEN send "welcome-email" template after 0 seconds delay
(Only send once per contact)
```

**Example Configuration**:
```json
{
  "name": "Welcome Series - Email 1",
  "template": "welcome-template-1",
  "events": ["signup-completed"],
  "notevents": ["account-cancelled"],
  "runOnce": true,
  "delay": 0
}
```

## Communication

### Email

**Purpose**: Represents an actual email message sent through the system.

Each email is an immutable record of sent emails that tracks delivery status via AWS SES, links to the contact who received it, and stores the actual content sent.

**Relationships**:
- Belongs to one project
- Sent to one contact
- Can be related to campaigns or actions
- Has associated delivery events

---


## System Entities

### Task

**Purpose**: Background jobs for processing emails and automations.

**Task Types**:
- **EMAIL**: Send an email message
- **ACTION**: Process an automation action

Tasks are processed asynchronously, with failed tasks being retried automatically. They support scheduled/delayed execution and track processing attempts and status.

**Relationships**:
- Belongs to one project
- Processes emails and actions

---

### Delivery Event

**Purpose**: Tracks email delivery status and engagement from AWS SES.

**Event Types**:
- **SEND**: Email was sent to SES
- **DELIVERY**: Email was delivered to recipient
- **OPEN**: Recipient opened the email
- **CLICK**: Recipient clicked a link
- **BOUNCE**: Email bounced (hard or soft)
- **COMPLAINT**: Recipient marked as spam

Delivery events are populated by AWS SES notifications and are used for tracking and analytics. They help maintain sender reputation and enable engagement metrics.

**Relationships**:
- Related to one email message
- Linked via SES message ID

## Entity Relationships

### Relationship Diagram

```
User ←→ Membership ←→ Project
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
  Contact ←→ Group   Template        Campaign
        ↓               ↑               ↓
     Event   →      Action          Email
                                        ↓
                                DeliveryEvent
```

## Next Steps

- Learn how to use these entities via the [API Documentation](./api.md)
- See how to manage them in the [User Guide](./user-guide.md)
- Review [Deployment Setup](./setup.md) for infrastructure details

