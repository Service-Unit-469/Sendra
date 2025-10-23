[Docs](../index.md) > [User Guide](../user-guide.md) > Project Settings

## Project Settings

### Switching Projects

If you're a member of multiple projects:

1. Click the project dropdown (top left)
2. Select the project you want to work with
3. Dashboard updates to show selected project data

### Creating Additional Projects

1. Click project dropdown → **"New Project"**
2. Enter project name and URL
3. Click **"Create"**
4. Save your new API keys

### Project Settings

Access via **Project Settingst**

**Configurable Options:**
- Project name
- Website URL

**To Update Project:**
1. Modify the fields you want to change
2. Click **"Save Changes"**

### API Access

Access via **Project Settings** → **API Access**

**View Your API Information:**
- **API Endpoint**: the base URL for the API
- **Project ID**: the ID of the current project
- **Public Key**: Safe for client-side use (limited access)
- **Secret Key**: Full access (keep secure!)

### Verified Identity

To use Sendra, each project must have a verified identity. Verified identities can either be an Email Address or a Domain. Depending on your Sendra configuration, projects may be able to share identities or require unique identities.

When configuring an identity for the first time, you will need to specify a number of DNS records to verify access. Once the records are verified, the domain will appear as verified and you can start sending emails.


### Member Management

Access via **Project Settings** → **Members**

- See all project members
- View their roles

**Invite Members:**
1. Click **"Invite Member"**
2. Enter email address
3. Select role (ADMIN or MEMBER)
4. Click **"Send Invite"**
5. They receive invitation email

**Remove Members:**
1. Click on member
2. Click **"Kick"**
3. Confirm removal

**Roles:**
- **ADMIN**: Full project access, can manage team
- **MEMBER**: Can use project features, cannot manage team

### Deleting a Project

Access via **Project Settings** → **Danger Zone**

**Warning:** This action:
- Permanently deletes all project data
- Cannot be undone
- Removes all contacts, campaigns, templates, and events
- Requires admin role