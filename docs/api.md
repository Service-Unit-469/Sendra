[Docs](./index.md) > API

# Sendra API Documentation

This guide covers how to integrate with the Sendra API for sending emails, managing contacts, tracking events, and automating your email workflows.

## Table of Contents

- [Introduction](#introduction)
- [OpenAPI Specification](#openapi-specification)
- [API Patterns](#api-patterns)
- [Authentication](#authentication)

## Introduction

The Sendra API is a RESTful API that allows you to programmatically manage your email infrastructure. 

## OpenAPI Specification

The API is fully documented with OpenAPI 3.0 specification. You can access the API documentation at:

```
https://your-api-url.amazonaws.com/doc
```


## API Patterns

The API is accessed as sub-resources to a project in plural form, for example:

`GET /projects/:projectId/contacts` - will return a list of contacts

### Embedding

Resources can be embedded in other resources by requesting the parent resource with `?embed={{embedtype}}`, for example:

```
GET /project/:projectId/contacts/:contactId?embed=events
{
  id: "contact_123",
  email: "user@example.com", 
  subscribed: true,
  data: {
    name: "John Smith",
    company: "Acme Inc",
    signupDate: "2024-01-15"
  },
  _embed: {
    events: [
      {
        id: "evt_456",
        type: "EMAIL_OPENED",
        timestamp: "2024-01-16T10:30:00Z",
        data: {
          emailId: "email_789",
          campaign: "welcome_series"
        }
      },
      {
        id: "evt_457", 
        type: "PURCHASE",
        timestamp: "2024-01-17T15:45:00Z",
        data: {
          orderId: "order_123",
          amount: 99.99
        }
      }
    ]
  }
}
```

Listing endpoints also support embedding, however this should be used with caution as it can incur significant read costs.

### Listing

The API supports two listing forms:

#### Paginated Listing

Paginated lists allow you to retrieve items in in pages. The paginated endpoint supports the following query parameters

`limit`: number (max 100) - the number of items to return
`cursor`: string - the starting point to read the next page of items
`filter`: string - a property by which to filter the returned items
`value`: string - the value for the property by which to filter the items
`embed`: string or multiple query parameter strings - the subresources to embed

The returned object has the following keys:

`count`: number - the number of items returned
`hasMore`: boolean - true if there are more items, false otherwise
`cursor`: string - the cursor to access the next page of items
`items`: array - the array of items

```
GET /project/:projectId/contacts?limit=2&cursor=<somecursor>
{
  count: 2,
  cursor: <next-cursor>,
  hasMore: true,
  items: [
    {
      id: "contact_123",
      email: "user@example.com", 
      subscribed: true,
      data: {
        name: "John Smith",
        company: "Acme Inc",
        signupDate: "2024-01-15"
      },
    },
    {
      id: "contact_234",
      email: "user2@example.com", 
      subscribed: true,
      data: {
        name: "Jack Smith",
        company: "Acme Inc",
        signupDate: "2024-01-15"
      },
    }
  ]
}
```

#### All Listing

If you want to get all of the items, you can add the `/all` suffix to a list call. This will return an array of all of the items, for example


```
GET /project/:projectId/contacts/all
[
  {
    id: "contact_123",
    email: "user@example.com", 
    subscribed: true,
    data: {
      name: "John Smith",
      company: "Acme Inc",
      signupDate: "2024-01-15"
    },
  },
  {
    id: "contact_234",
    email: "user2@example.com", 
    subscribed: true,
    data: {
      name: "Jack Smith",
      company: "Acme Inc",
      signupDate: "2024-01-15"
    },
  }
]

```

As with embedding, take care here as an all listing can incur significant read costs.

### HTTP Standards

Entities are accessed and updated via standard HTTP methods:

 - `GET` - Gets the resource requested
 - `POST` - Creates a new resource or performs an action on a resource
 - `PUT` - Updates the resource requested
 - `DELETE` - Deletes the resource requested

In addition, the API returns standard status codes:

- `200 OK`: Request successful
- `201 Created`: Resource created
- `202 Accepted`: Request accepted
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

### Error Response Format

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "The requested contact could not be found",
  "instance": "/projects/proj-123/contacts/contact-456"
}
```

## Authentication

Sendra uses Bearer Tokens for authorization. Each token is associated to a single project and can be one of two types:

- **Secret Key** (`s:...`): Full access to all project operations. Keep this secure!
- **Public Key** (`p:...`): Limited access for client-side operations

### API Key Authentication

For programmatic access, use your project's API keys. The project API keys can be retrieved from Project Settings > API Keys.

```bash
# Using secret key for full access
curl -X POST https://your-api-url.amazonaws.com/{{project.id}}/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer s:_your-secret-key" \
  -d '{
    "email": "customer@example.com",
    "event": "purchase-completed"
  }'
```

**Security Best Practices:**
- Never expose secret keys in client-side code
- Rotate keys if compromised


## Next Steps

- Learn about the [Entities](./entities.md) that power the API
- Review the [User Guide](./user-guide.md) for app usage
- Check the [Deployment Guide](./setup.md) for infrastructure setup

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Service-Unit-469/Sendra/issues)
- **Discussions**: Ask questions in GitHub Discussions
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

