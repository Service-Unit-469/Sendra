export const defaultTemplate = `<mjml>
  <mj-head>
    <mj-title>{{email.subject}}</mj-title>
    <mj-attributes>
      <mj-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#374151" />
      <mj-section padding="20px 0" />
    </mj-attributes>
    <mj-style inline="inline">
      .link { color: #2563eb; text-decoration: underline; }
      .link:hover { color: #1d4ed8; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    
    <!-- Header Section -->
    <mj-section background-color="#ffffff" padding="30px 25px">
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" color="#111827" align="center">
          {{project.name}}
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Hero Section -->
    <mj-section background-color="#2563eb" padding="40px 25px">
      <mj-column>
        <mj-text font-size="32px" font-weight="bold" color="#ffffff" align="center" line-height="1.2">
          Welcome to {{project.name}}!
        </mj-text>
        <mj-text font-size="16px" color="#dbeafe" align="center" padding-top="10px">
          We're excited to have you on board
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Main Content Section - Campaign content will be injected here -->
    <mj-section background-color="#ffffff" padding="40px 25px">
      <mj-column>
        {{body}}
      </mj-column>
    </mj-section>

    <!-- Footer Section -->
    <mj-section background-color="#f9fafb" padding="30px 25px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#6b7280" line-height="1.7">
          You received this email because you signed up for updates from {{project.name}}.
        </mj-text>
        <mj-text align="center" font-size="12px" color="#6b7280" line-height="1.7" padding-top="10px">
          If you no longer wish to receive these emails, you can <a 
            class="link"
            style="color: #2563eb; text-decoration: underline;"
            href="https://{{APP_URI}}/subscription/?email={{contact.email}}" 
            target="_blank">update your preferences</a> or unsubscribe at any time.
        </mj-text>
        <mj-text align="center" font-size="12px" color="#9ca3af" padding-top="15px">
          © {{project.name}}. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>`;
