# Plastic Extension - Automated Deployment Setup

## Extension Details
- **Extension ID**: `jmgohdfjidehbaggidpjikmccilopgpk`
- **Chrome Web Store**: https://chrome.google.com/webstore/detail/jmgohdfjidehbaggidpjikmccilopgpk

## GitHub Actions CI/CD Setup

### 1. Google API Credentials Setup

You need to obtain Google API credentials to enable automated publishing:

#### Step 1: Enable Chrome Web Store API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Chrome Web Store API" and enable it

#### Step 2: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Desktop application** as application type
4. Name it "Plastic Extension CI/CD"
5. Save the `Client ID` and `Client Secret`

#### Step 3: Get Refresh Token
Run this process to authorize and get refresh token:

```bash
# Replace YOUR_CLIENT_ID with actual client ID
curl "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

1. Visit the URL in browser
2. Authorize the application
3. Copy the authorization code
4. Exchange for refresh token:

```bash
curl "https://accounts.google.com/o/oauth2/token" -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=AUTHORIZATION_CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

5. Save the `refresh_token` from the response

### 2. GitHub Repository Secrets

Add these secrets in your GitHub repository:

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CHROME_CLIENT_ID` | Your OAuth Client ID | From Google Console |
| `CHROME_CLIENT_SECRET` | Your OAuth Client Secret | From Google Console |  
| `CHROME_REFRESH_TOKEN` | Your OAuth refresh token | From authorization flow |

**Note**: Extension ID is already configured in the workflow as `jmgohdfjidehbaggidpjikmccilopgpk`

### 3. Publishing Workflow

#### Automatic Publishing
Create and push a version tag to trigger deployment:

```bash
# Update version and create release
git add -A
git commit -m "Add pixelization and sharing features"
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

#### Manual Publishing
You can also trigger the workflow manually:

1. Go to your repo → **Actions** tab
2. Select "Publish Chrome Extension" workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

### 4. What the Workflow Does

1. **Version Management**: Automatically updates `manifest.json` version from git tag
2. **Package Creation**: Creates optimized extension zip file
3. **Chrome Web Store Upload**: Uploads to store (staged for manual review)
4. **GitHub Release**: Creates release with downloadable assets

### 5. Publishing Process

The workflow uploads to Chrome Web Store but **does not auto-publish**. You still need to:

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Find your extension
3. Review the uploaded version
4. Click **Submit for review**

### 6. Troubleshooting

#### Common Issues:
- **Invalid credentials**: Double-check all three secret values
- **Scope errors**: Ensure Chrome Web Store API is enabled
- **Upload fails**: Verify extension ID matches your published extension

#### Testing Locally:
```bash
# Test the extension locally first
# 1. Make changes to code
# 2. Go to chrome://extensions/
# 3. Click "Reload" on Plastic extension
# 4. Test functionality on r/place or wplace.live
```

### 7. Release Notes Template

When creating releases, use this template:

```markdown
## Plastic v1.1.0 - Enhanced Pixelization

### 🎨 New Features
- **Unlimited scaling** up to 1000% for detailed work
- **Fine pixelization** down to 1px for precision control  
- **Configuration sharing** system for team coordination
- **Drag anywhere** on overlay (not just handle)

### 🎯 Perfect for r/place & wplace
- Share overlay configs with teammates via copy/paste codes
- Coordinate large pixel art projects with identical setups
- Enhanced pixelization for better reference matching

### 📦 Installation
- **Chrome Web Store**: [Install Here](https://chrome.google.com/webstore/detail/jmgohdfjidehbaggidpjikmccilopgpk)
- **Manual Install**: Download `plastic-extension.zip` from this release
```

## Quick Start Commands

```bash
# Make changes to extension
git add -A
git commit -m "Your changes"

# Create and push version tag (triggers deployment)
git tag v1.1.0
git push origin main
git push origin v1.1.0

# Workflow will automatically:
# 1. Update manifest.json version
# 2. Create extension zip  
# 3. Upload to Chrome Web Store
# 4. Create GitHub release
```

Your extension will be staged in the Chrome Web Store for manual review and publishing!