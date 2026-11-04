# Homebase

A private household assistant that runs on a Synology NAS. You and your wife each sign in and chat with it from your phones. It can:

* **Find files on the NAS.** Searches file names, folder names and the text inside PDFs, Word docs, Excel sheets and text files. Gives you a tap to open link.
* **Read and add to your calendars.** "What's on this weekend?", "Put the dentist on Tuesday at 3", "When are we both free next week?"
* **Track bills from email.** Scans both Gmail inboxes for bills, pulls out who, how much and when it's due, and keeps one shared list you can tick off.

## How it fits together

```
Phones (over Tailscale)
   ↓
NAS: Homebase container  →  PC: Ollama (the AI model)
   ↓
NAS folders (read only), Google Calendar + Gmail (each person's own account)
```

The DS418 only has 2GB of RAM, so it can't run an AI model. It runs the app, the search index and the bill tracker. The thinking happens on your PC through Ollama. Nothing leaves your house except the calls to Google for your own calendar and email.

The PC has to be on for chat and bill scanning to work. File indexing keeps running on the NAS either way.

---

## Setup

Plan on about an hour the first time. Do the steps in order.

### Step 1: Ollama on your PC

1. Install Ollama from https://ollama.com/download
2. Pick a model based on your graphics card's memory (VRAM). These all handle tool calling well:

   | Your GPU | Model to pull |
   | :--- | :--- |
   | 8GB, or a Mac with 16GB | `qwen2.5:7b` |
   | 12 to 16GB, or a Mac with 32GB | `qwen2.5:14b` |
   | 24GB or more | `qwen2.5:32b` |

   Open a terminal (Command Prompt on Windows) and run, for example:

   ```
   ollama pull qwen2.5:7b
   ```

   Bigger models give noticeably better answers, so go as big as your card handles.

3. **Let the NAS talk to Ollama.** By default Ollama only listens to the PC itself.
   * **Windows:** Start menu, search "environment variables", then "Edit environment variables for your account". Add a new one: name `OLLAMA_HOST`, value `0.0.0.0`. Quit Ollama from the system tray and start it again. If Windows Firewall asks, allow it on private networks.
   * **Mac:** run `launchctl setenv OLLAMA_HOST "0.0.0.0"` in Terminal, then quit and reopen Ollama.
4. **Give the PC a fixed IP address** in your router's settings (often called "DHCP reservation"). Write it down, e.g. `192.168.1.50`.
5. Check it works from another device on your WiFi: open `http://192.168.1.50:11434` in a browser. It should say "Ollama is running".

### Step 2: Tailscale (for phone access, and HTTPS for Google)

1. Make a free account at https://tailscale.com
2. On the NAS: Package Center, search "Tailscale", install, open it and sign in.
3. On both phones: install the Tailscale app and sign in to the **same** account (or invite your wife to your tailnet).
4. In the Tailscale admin console (https://login.tailscale.com/admin/dns): turn on **MagicDNS** and **HTTPS Certificates**.
5. Find your NAS's address on the Machines page. It looks like `ds418.tail1234.ts.net`. That's your app address: `https://ds418.tail1234.ts.net`.

You'll finish the Tailscale part in Step 6, after the app is running.

### Step 3: Google project (for Calendar and Gmail)

This is the fiddliest step, but you only do it once.

1. Go to https://console.cloud.google.com and create a project called "Homebase".
2. **APIs & Services > Library:** enable **Gmail API** and **Google Calendar API**.
3. **APIs & Services > OAuth consent screen** (may be called "Google Auth Platform"):
   * User type: **External**. App name: Homebase. Your email for the contact fields.
   * **Audience / Test users:** add your Gmail and your wife's Gmail.
   * **Data access / Scopes:** add `gmail.readonly`, `calendar`, `userinfo.email` and `openid`.
4. **Clients (or Credentials) > Create OAuth client ID:**
   * Application type: **Web application**
   * Authorized redirect URI: `https://ds418.tail1234.ts.net/auth/google/callback` (your address from Step 2)
   * Create, then **Download JSON**. Rename the file to `google_client_secret.json`.
5. **Important:** go back to the **Audience** page and click **Publish app** (move it to "In production"). If you leave it in "Testing", Google logs you out every 7 days. Since nobody's verified it, Google will show a "Google hasn't verified this app" warning when you connect. That's expected for a private app: click **Advanced**, then **Go to Homebase**.

### Step 4: Copy Homebase to the NAS

1. In File Station, create the folder `docker/homebase` (so it lives at `/volume1/docker/homebase`).
2. Upload everything from this `homebase` folder into it.
3. Inside it, create a folder named `data` and upload `google_client_secret.json` into `data`.
4. Make a copy of `example.env`, name it `settings.env`, and edit it (right click > Open with Text Editor, or edit on your PC first):
   * `TZ`: your timezone, e.g. `America/Chicago`
   * `BASE_URL`: your Tailscale address from Step 2
   * `OLLAMA_URL`: your PC's IP, e.g. `http://192.168.1.50:11434`
   * `OLLAMA_MODEL`: the model you pulled in Step 1
5. Edit `docker-compose.yml` and change the folder lines under `volumes` to your real shared folders. Left side is the NAS path, right side starts with `/nas/`:

   ```yaml
   - /volume1/Documents:/nas/Documents:ro
   - /volume1/Scans:/nas/Scans:ro
   ```

   The `:ro` means read only. Homebase can never change or delete your files.

### Step 5: Start it in Container Manager

1. Package Center: install **Container Manager** if you haven't.
2. Container Manager > **Project** > **Create**.
   * Project name: `homebase`
   * Path: `/docker/homebase`
   * Source: **Use existing docker-compose.yml**
3. Click through and let it build. The first build takes several minutes on the DS418.
4. Test on your home WiFi: open `http://<your NAS IP>:8080`. You should see the Homebase sign in page.

### Step 6: Finish Tailscale HTTPS

Google sign in needs the https address, so point Tailscale at the app.

1. Control Panel > Terminal & SNMP > tick **Enable SSH service**.
2. From your PC, open a terminal and run `ssh youradminuser@<your NAS IP>`.
3. Run:

   ```
   sudo tailscale serve --bg 8080
   ```

4. Open `https://ds418.tail1234.ts.net` on your phone (with Tailscale on). You can turn SSH back off afterwards.

### Step 7: Make your accounts

1. Open the app. The first visit shows **Create account**. Make yours.
2. Go to **Settings > Connect Google** and sign in with your Google account.
3. Have your wife open the same address on her phone, tap **Create an account instead**, make hers and connect her Google.
4. After two accounts, sign up closes automatically (change `MAX_USERS` in `settings.env` if you ever need more).

**Add it to your home screen** so it feels like an app: Safari share button > Add to Home Screen, or Chrome menu > Add to Home Screen.

---

## Using it

Things to try:

* "Find the warranty for the dishwasher"
* "Where's our 2023 tax return?"
* "What bills are due in the next two weeks?"
* "Check my email for new bills"
* "Mark the Comcast bill as paid"
* "What's on our calendar this weekend?"
* "Find a free evening next week when we're both free, and book date night"
* "Add Emma's soccer game Saturday at 10am to the Family calendar"

The **Bills** tab shows the shared list. Bills found in either inbox show up for both of you, with a note saying who it came from. Email searches and reading full emails only ever use your own inbox.

## What runs automatically

* **File index:** every 6 hours. The first run can take a while if you have years of files. Only new or changed files get read after that. Settings shows progress, or tap **Re-index now**.
* **Bill scan:** every 12 hours, for everyone who's connected Google. If the PC is off, it tries again in 30 minutes.

Change these in `settings.env`. After editing, go to Container Manager > Project > homebase > **Action > Build** to restart with the new settings.

## Troubleshooting

* **"Can't reach Ollama":** the PC is off, asleep, or Ollama isn't listening on the network (Step 1.3). Check `http://<PC IP>:11434` from your phone on WiFi.
* **Settings shows the model in red:** run `ollama pull <model name>` on the PC.
* **Files aren't found:** check Settings > NAS file index shows a file count above 0. If it's 0, the volume lines in `docker-compose.yml` are probably wrong.
* **Scanned PDFs (photos of paper) aren't searchable by content:** they have no text inside. They're still searchable by file name, so naming scans well helps a lot.
* **Google error "redirect_uri_mismatch":** the redirect URI in Google Cloud must exactly match `BASE_URL` plus `/auth/google/callback`.
* **Google logs you out after a week:** the Google project is still in Testing. Publish it (Step 3.5).
* **Logs:** Container Manager > Container > homebase > Log.

## Backups

Everything Homebase knows lives in `/volume1/docker/homebase/data` (accounts, Google sign ins, bills list, chat history). Include that folder in Hyper Backup. The search index rebuilds itself if lost.

## Updating

Upload the new files over the old ones (don't touch `data` or `settings.env`), then Container Manager > Project > homebase > **Action > Build**.
