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


## Self-hosting Sendra

The easiest way to self-host Sendra is to fork the project and run it in your AWS account.

A complete guide on how to deploy Sendra can be found in
the [documentation](docs/setup.md).

## Contributing

You are welcome to contribute to Sendra. You can find a guide on how to contribute in [CONTRIBUTING.md](CONTRIBUTING.md).
