[Docs](../index.md) > [User Guide](../user-guide.md) > Templates

## Templates

Templates are reusable email designs.

### Creating a Template

1. Go to **Templates** → **"New"**
2. Enter template details:
   - **Subject**: Email subject line (max 70 characters)
   - **Body**: Email content (HTML supported)
   - **From Name**: Sender name (optional override)
   - **From Email**: Sender email (optional override)
   - **Template Type**: MARKETING or TRANSACTIONAL
3. Use variables with the {{handlebars}}
4. Click **"Create Template"**

### Template Variables

Templates use [Handlebars](https://handlebarsjs.com/) for variable injection. The following variables are available in your templates:

```
action: 
    name: string
contact: 
    email: string,
    data: {...},
    subscribed: boolean
project: 
    name: string,
    id: string
```

So for example to get the city from my contact's data I would use `{{contact.data.city}}` or to add the project name: `{{project.name}}`

### MJML in Templates

The templates are created using [MJML](https://mjml.io/). You can use the visual editor or open up source mode to make detailed edits.

### Template Types

Templates come in two types:

**TRANSACTIONAL:** 
- Order confirmations
- Password resets
- Account notifications
- System emails

**MARKETING:**
- Newsletters
- Product announcements
- Promotional offers
- Campaigns
