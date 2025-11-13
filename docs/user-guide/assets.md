---
title: Assets
parent: User Guide
layout: page
---


## Assets

Assets allow you to upload and manage files like images and attachments for use in your email templates.

### Understanding Assets

Assets are files stored in your project that can be referenced in email templates. There are two types of assets:

- **IMAGE**: Images (PNG, JPG, GIF, etc.) that can be embedded in email templates
- **ATTACHMENT**: Files that can be attached to emails or linked in templates

Assets are stored securely in AWS S3 and are only accessible to your project.

### Viewing Assets

Navigate to **Assets** from the main menu to see:
- List of all uploaded assets
- Asset names and file sizes
- Upload date
- Asset type (IMAGE or ATTACHMENT)
- Preview thumbnails (for images)

### Uploading Assets

1. Go to **Assets**
2. Click **"Upload"** or the upload button
3. Select one or more files from your computer
4. Files will upload automatically
5. Once uploaded, you'll see a success message

**Supported Formats:**
- **Images**: PNG, JPG, JPEG, GIF, WebP, SVG
- **Attachments**: PDF, DOC, DOCX, TXT, CSV, and other common formats

**File Size Limits:**
- Individual file size: Check with your deployment configuration
- Consider email size limits when embedding large images

### Using Assets in Templates and Campaigns

When creating or editing a template or campaign using the block editor:

1. Drag an Image component from the component list to the email
3. Select an asset from your project's assets

The image picker shows only IMAGE type assets from your project.

In addition, you can also reference external assets via their full URL.

### Managing Assets

#### Deleting Assets

1. Go to **Assets**
2. Find the asset you want to delete
3. Click the delete icon or action
4. Confirm deletion

**Important:** Deleting an asset will break any templates that reference it. Make sure to update your templates before deleting assets that are in use.

---

**Next Steps:**
- Learn about using assets in [Templates](./templates.html)
- Check the [API Documentation](../api.html#assets) for programmatic access
- See [Quick Emails](./quick-emails.html) for using images in simple campaigns

