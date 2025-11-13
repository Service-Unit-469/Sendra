---
title: API Spec
layout: minimal
---

<style>
    .main {
        max-width: 1200px;
    }
</style>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
<div id="spec"></div>
<!-- Initialize the Scalar API Reference -->
<script>
    Scalar.createApiReference('#spec', {
        url: './openapi.json',
    "defaultOpenAllTags": true,
  "layout": "classic",
  "hideDarkModeToggle": true,
  "hideSearch": true,
  "theme": "default",
  "hideClientButton": false,
  "showSidebar": false,
  "showToolbar": false,
  "operationTitleSource": "summary",
  "persistAuth": false,
  "telemetry": false,
  "isEditable": false,
  "isLoading": false,
  "hideModels": false,
  "documentDownloadType": "both",
  "hideTestRequestButton": false,
  "showOperationId": false,
  "withDefaultFonts": false,
  "expandAllModelSections": false,
  "expandAllResponses": false,
  "orderSchemaPropertiesBy": "alpha",
  "orderRequiredPropertiesFirst": true,
  "default": false,
  "title": "Sendra API"
})
</script>