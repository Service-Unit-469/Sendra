let domain: undefined | { name: string } = undefined;
if ($app.stage === "production" && process.env.DOMAIN_NAME) {
  domain = {
    name: process.env.DOMAIN_NAME,
  };
}

export const router = new sst.aws.Router("SendraRouter", {
  domain,
  edge: {
    viewerRequest: {
      injection: `
if (event.request.uri === '/') {
  return {
    statusCode: 302,
    statusDescription: 'Found',
    headers: {
      location: { 
        value: '/dashboard' 
      }
    }
  };
}
`,
    },
  },
});
