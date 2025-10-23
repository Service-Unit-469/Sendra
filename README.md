<h1 align="center">Sendra</h1>

<p align="center">
    The Open-Source, Serverless Email Platform
</p>

<p align="center">
    <img src="https://img.shields.io/github/contributors/Service-Unit-469/Sendra"/>
    <img src="https://img.shields.io/github/license/Service-Unit-469/Sendra"/>
</p>

## Introduction

Sendra is an open-source email platform built on top of AWS and [sst](https://sst.dev/) It allows you to easily send emails from applications or via campaigns.

It can be considered as a self-hosted alternative to services
like [SendGrid](https://sendgrid.com/), [Resend](https://resend.com) or [Mailgun](https://www.mailgun.com/).

Sendra is a fork of [Plunk](https://useplunk.com/) with a focus on a lighter footprint and costs. It uses AWS Lambda and DynamoDB to ensure ensure you're only paying for what you use.

## Features

- **Transactional Emails**: Send emails straight from your API
- **Automations**: Create automations based on user actions
- **Broadcasts**: Send newsletters and product updates to big audiences


## Documentation

Comprehensive documentation is available to help you get started with Sendra:

- **[Deployment Guide](docs/setup.md)** - Step-by-step instructions for deploying Sendra to AWS
- **[Entities Reference](docs/entities.md)** - Understanding Sendra's data model and key entities
- **[API Documentation](docs/api.md)** - Complete guide to the Sendra API with examples
- **[User Guide](docs/user-guide.md)** - How to use the Sendra application

## Self-hosting Sendra

The easiest way to self-host Sendra is to fork the project and run it in your AWS account.

### Quick Start

1. **Prerequisites**: Node.js 20+, AWS CLI configured, AWS account
2. **Install**: `npm install`
3. **Configure**: Set up environment variables (see [deployment guide](docs/setup.md))
4. **Deploy**: `npm run deploy`

A complete guide on how to deploy Sendra can be found in the [deployment documentation](docs/setup.md).

## Contributing

You are welcome to contribute to Sendra. You can find a guide on how to contribute in [CONTRIBUTING.md](CONTRIBUTING.md).
