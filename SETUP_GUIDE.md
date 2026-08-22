# KABISATNT WhatsApp Bot - Setup & Deployment Guide

## What You Need Before Deploying

1. **WhatsApp API Token** (from Meta for Developers)
2. **Anthropic API Key** (from console.anthropic.com - for the AI brain)
3. **A Railway account** (free at railway.app)
4. **A GitHub account** (free at github.com)

---

## Step 1: Get Your WhatsApp API Token

1. Go to https://developers.facebook.com/apps/1259944676299374/use_cases/
2. Click on "Connect on WhatsApp" → "API Setup"
3. Under "Temporary access token", click **Generate token**
4. Copy the token — you'll need it for deployment

> **Note:** Temporary tokens expire after 24 hours. For a permanent token, create a System User in Meta Business Suite → Settings → Business Settings → Users → System Users → Generate Token.

## Step 2: Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Go to **API Keys** and create a new key
4. Copy the key — starts with `sk-ant-...`

## Step 3: Push to GitHub

1. Create a new repository on GitHub (private recommended)
2. Push this code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/kabisatnt-whatsapp-bot.git
   git branch -M main
   git push -u origin main
   ```

## Step 4: Deploy to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `kabisatnt-whatsapp-bot` repository
4. Once deployed, go to **Variables** tab and add:
   - `WHATSAPP_TOKEN` = your WhatsApp API token
   - `WHATSAPP_PHONE_NUMBER_ID` = `1281591975035026`
   - `WEBHOOK_VERIFY_TOKEN` = `kabisatnt_verify_2024`
   - `ANTHROPIC_API_KEY` = your Anthropic API key
   - `PORT` = `3000`
5. Go to **Settings** → **Networking** → **Generate Domain** to get your public URL
6. Copy the URL (e.g., `https://your-app.up.railway.app`)

## Step 5: Connect Webhook to Meta

1. Go to https://developers.facebook.com/apps/1259944676299374/use_cases/
2. Click "Connect on WhatsApp" → "API Setup" (or Step 2: Production Setup → Configure Webhooks)
3. Click **Edit** on the webhook configuration
4. Set:
   - **Callback URL:** `https://your-railway-url.up.railway.app/webhook`
   - **Verify token:** `kabisatnt_verify_2024`
5. Click **Verify and Save**
6. Make sure **messages** webhook field is subscribed (toggled ON)

## Done! 🎉

Your bot is now live. Send a message to +1 (868) 772-0094 on WhatsApp and it will respond!

---

## Customizing

### Update Products
Edit `products.js` to update your product catalog with actual items and prices.

### Update Townhouse Info
Edit `townhouses.js` to update your townhouse project details, unit types, pricing, and features.

### Quick Commands
Customers can type these keywords for instant responses:
- **menu** / **catalog** - Full product list
- **beers** / **spirits** / **cigars** / **cigarettes** / **vapes** - Category view
- **townhouses** / **property** - Townhouse project info
- **help** - List of commands
- **hi** / **hello** - Welcome message

Any other message goes to Claude AI for intelligent conversation.
