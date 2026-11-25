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

It can be considered as an open source, cloud-hosted alternative to services
like [SendGrid](https://sendgrid.com/), [Resend](https://resend.com) or [Mailgun](https://www.mailgun.com/).

Sendra is a fork of [Plunk](https://useplunk.com/) with a focus on a lighter footprint and costs. It uses AWS Lambda and DynamoDB to ensure ensure you're only paying for what you use.

## Features

- **Transactional Emails**: Send emails straight from your API
- **Automations**: Create automations based on user actions
- **Broadcasts**: Send newsletters and product updates to big audiences


## Documentation

Comprehensive documentation is available to help you get started with Sendra:

- **[Deployment Guide](https://service-unit-469.github.io/Sendra/setup.html)** - Step-by-step instructions for deploying Sendra to AWS
- **[Entities Reference](https://service-unit-469.github.io/Sendra/entities.html)** - Understanding Sendra's data model and key entities
- **[API Documentation](https://service-unit-469.github.io/Sendra/api.html)** - Complete guide to the Sendra API with examples
- **[User Guide](https://service-unit-469.github.io/Sendra/user-guide.html)** - How to use the Sendra application

## Self-hosting Sendra

Sendra can be deployed from this repository or from an end-user SST project that installs the `@service-unit-469/sendra` package from GitHub Packages. Neither route requires a fork. See the [deployment guide](https://service-unit-469.github.io/Sendra/setup.html) for both options.

### Quick Start

1. **Prerequisites**: Node.js 24+, AWS CLI configured, AWS account
2. **Install**: `pnpm install`
3. **Configure**: Set up environment variables (see [deployment guide](https://service-unit-469.github.io/Sendra/setup.html))
4. **Deploy**: `pnpm run deploy`

A complete guide on how to deploy Sendra can be found in the [deployment documentation](https://service-unit-469.github.io/Sendra/setup.html).

You can also deploy Sendra from your own SST project by installing `@service-unit-469/sendra` and importing `deploySendra` from `@service-unit-469/sendra/sst` in your `sst.config.ts`. This lets you own the deployment configuration while consuming versioned Sendra releases.

## Contributing

You are welcome to contribute to Sendra. You can find a guide on how to contribute in [CONTRIBUTING.md](CONTRIBUTING.md).
