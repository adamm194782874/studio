# Homebase

A private household assistant that runs on your iMac and searches your Synology NAS. You (and your wife, if she wants) sign in and chat with it from your phones. It can:

* **Find files on the NAS.** Searches file names, folder names and the text inside PDFs, Word docs, Excel sheets and text files. You get a tap to open link.
* **Read and add to your calendars.** "What's on this weekend?", "Put the dentist on Tuesday at 3", "When are we both free next week?"
* **Track bills from email.** Scans Gmail for bills, pulls out who, how much and when it's due, and keeps one shared list you can tick off.

## How it fits together

```
Phones (over Tailscale)
   ↓
iMac: Homebase app + Ollama (the AI model)
   ↓
NAS shared folders (read only), Google Calendar + Gmail
```

Everything runs on the iMac. The NAS just shares its folders over your home network, like it already does. Nothing leaves your house except calls to Google for your own calendar and email.

**The iMac needs to be on and awake** for Homebase to work.

### A heads up about speed

Your iMac has an Intel chip, so the AI runs on the processor alone (no graphics card help). Expect answers to take **somewhere around 20 seconds to a couple of minutes**, longer for questions that need several steps like "find a free night and book it". The very first question after a while is the slowest, because the model has to load. The app shows a note while it's working so you know it hasn't frozen.

File search, the bills list and the calendar are all quick. Only the AI's thinking is slow. If you ever get a Mac with an Apple chip, just change one line in `settings.env` and it'll fly.

---

## Setup

Plan on about an hour the first time. Do the steps in order.

### Step 0: Check your Mac

Apple menu > **About This Mac**. Note the **Memory** and the **macOS** version.

* You need **macOS 12 (Monterey) or newer** for Ollama.
* With **8GB** of memory, stick with the small `qwen2.5:3b` model. With **16GB or more**, you can try `qwen2.5:7b`, which is smarter but slower.

### Step 1: Connect the NAS folders

1. In Finder, press **Cmd+K** (Go > Connect to Server), type `smb://DS418` (or `smb://` followed by the NAS's IP, like `smb://192.168.1.20`) and click Connect.
2. Sign in with your NAS account and tick **Remember this password in my keychain**.
3. Pick the shared folders you want searchable (e.g. Documents, Scans). Each one shows up in Finder's sidebar and lives at `/Volumes/<name>`, e.g. `/Volumes/Documents`.
4. **Make them reconnect after a restart:** System Settings > General > **Login Items** > click **+** under "Open at Login", then choose each NAS folder (it's listed under your NAS in the sidebar).

Homebase only ever *reads* files. It never changes, moves or deletes anything.

### Step 2: Ollama (the AI model)

1. Download Ollama from https://ollama.com/download, open the file and drag Ollama into Applications. Open it once.
2. Open **Terminal** (Cmd+Space, type Terminal) and run:

   ```
   ollama pull qwen2.5:3b
   ```

   It's about a 2GB download.
3. Quick test, still in Terminal:

   ```
   ollama run qwen2.5:3b "Say hi in five words"
   ```

   This shows you roughly how fast it'll be. Type `/bye` to exit if it stays open.

### Step 3: Python

Download **Python 3.12** for macOS from https://www.python.org/downloads/macos/ and install it. (The Python that comes with macOS is too old.)

### Step 4: Tailscale (to reach it from your phones)

1. Make a free account at https://tailscale.com
2. Install **Tailscale on the iMac** (from tailscale.com/download or the Mac App Store) and sign in.
3. Install the Tailscale app on **your phone** (and your wife's, if she's joining) and sign in to the same account.
4. In the Tailscale admin console (https://login.tailscale.com/admin/dns), turn on **MagicDNS** and **HTTPS Certificates**.
5. Find the iMac's address on the Machines page. It looks like `adams-imac.tail1234.ts.net`. Your Homebase link will be `https://adams-imac.tail1234.ts.net`.

### Step 5: Google project (for Calendar and Gmail)

This is the fiddliest step, but you only do it once.

1. Go to https://console.cloud.google.com and create a project called "Homebase".
2. **APIs & Services > Library:** enable **Gmail API** and **Google Calendar API**.
3. **OAuth consent screen** (may be called "Google Auth Platform"):
   * User type: **External**. App name: Homebase. Your email for the contact fields.
   * **Audience / Test users:** add your Gmail (and your wife's, so she can connect later).
   * **Data access / Scopes:** add `gmail.readonly`, `calendar`, `userinfo.email` and `openid`.
4. **Clients (or Credentials) > Create OAuth client ID:**
   * Application type: **Web application**
   * Authorized redirect URI: `https://adams-imac.tail1234.ts.net/auth/google/callback` (your address from Step 4)
   * Create, then **Download JSON**. Rename the file to `google_client_secret.json`.
5. **Important:** go back to the **Audience** page and click **Publish app** (move it to "In production"). If you leave it in "Testing", Google signs you out every 7 days. You'll see a "Google hasn't verified this app" warning when you connect. That's expected for a private app: click **Advanced**, then **Go to Homebase**.

### Step 6: Put Homebase on the iMac

1. Download the zip (link in the chat), unzip it, and move the `homebase` folder into your home folder, so it's at `/Users/<you>/homebase`. Keep it on the iMac, not on the NAS.
2. Inside it, create a folder called `data`, and put `google_client_secret.json` in it.
3. Copy `example.env` and name the copy `settings.env`. Open it with TextEdit and fill in:
   * `NAS_ROOTS`: your folders from Step 1, e.g. `/Volumes/Documents,/Volumes/Scans`
   * `TIMEZONE`: e.g. `Australia/Sydney` or `Europe/London`
   * `BASE_URL`: your Tailscale address from Step 4
   * `OLLAMA_MODEL`: the model you pulled in Step 2

   Tips: Finder hides files starting with a dot, but `example.env` and `settings.env` are normal files, so you'll see them. In TextEdit, use Format > **Make Plain Text** before saving, and if it asks, choose "Use .env" rather than adding ".txt".

### Step 7: Start it

In Terminal:

```
cd ~/homebase
sh start.sh
```

The first time, it spends a few minutes installing what it needs. When you see `Homebase is starting`, it's running. Open http://localhost:8080 in Safari on the iMac and you should see the Homebase sign in page.

If macOS asks whether Python can access files on a network volume, click **Allow**.

### Step 8: Turn on HTTPS through Tailscale

Open a **new** Terminal window and run:

```
tailscale serve --bg 8080
```

If it says `command not found`, use the full path instead:

```
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 8080
```

Now open your Tailscale link on your phone, with Tailscale switched on. You only do this once; it remembers.

### Step 9: Make your account

1. Open your Homebase link. The first visit shows **Create account**. Make yours.
2. Go to **Settings > Connect Google** and sign in with your Google account.
3. **Add it to your home screen:** iPhone: open the link in Safari, tap Share, then **Add to Home Screen**. Android: Chrome, three dots, **Add to Home screen**.

Whenever your wife wants in, she opens the same link, taps **Create an account instead**, and connects her Google. Her spot stays open until she does.

### Step 10: Start automatically

Go back to the Terminal window running `start.sh`, press **Ctrl+C** to stop it, then run:

```
sh mac-autostart.sh
```

Homebase now starts by itself whenever you log in, and restarts if it ever crashes. To turn that off: `sh mac-autostart.sh remove`.

Also make sure Ollama starts at login: it adds itself to Login Items by default, but check it's listed in System Settings > General > Login Items.

### Step 11: Stop the iMac from sleeping

System Settings > **Energy Saver** (or Battery > Options on newer macOS): turn on **Prevent automatic sleeping when the display is off**. The screen can still turn off; that's fine.

---

## Using it

Things to try:

* "Find the warranty for the dishwasher"
* "Where's our 2023 tax return?"
* "What bills are due in the next two weeks?"
* "Check my email for new bills"
* "Mark the electricity bill as paid"
* "What's on our calendar this weekend?"
* "Find a free evening next week and book date night"

**Tips for a faster, smarter small model:**
* Ask one thing at a time. "Find the car insurance" then "when does it renew?" works better than both at once.
* Clear the chat (Settings > Clear chat history) when you change topic. Less history means faster answers.
* For bills, the **Bills tab** is instant. You don't need to ask the AI.

The **Bills** tab shows the shared list. "Check email" runs in the background (it can take a while on the iMac) and shows progress; new bills appear as they're found.

## What runs automatically

* **File index:** every 6 hours. The first run can take a while if you have years of files, since it reads them over the network. After that only new or changed files get read. Settings shows progress, or tap **Re-index now**.
* **Bill scan:** every 12 hours, for everyone who's connected Google.

Change these in `settings.env`, then restart Homebase: `sh mac-autostart.sh` again restarts it with the new settings.

## Troubleshooting

* **"AI offline" in the header:** Ollama isn't running. Open it from Applications.
* **Settings shows the model in red:** run `ollama pull <model name>` in Terminal.
* **Answers time out or are very slow:** switch to a smaller model, lower `OLLAMA_NUM_CTX` to `4096`, or set `HISTORY_TURNS=4`.
* **"Can't open /Volumes/..." in Settings:** the NAS folder isn't connected. Reconnect it in Finder (Step 1). If it's connected but still fails, go to System Settings > Privacy & Security > **Files and Folders** (or Full Disk Access) and allow Python to use network volumes.
* **Files aren't found:** check Settings > NAS file index shows a file count above 0.
* **Scanned PDFs (photos of paper) aren't searchable by content:** they have no text inside. They're still searchable by file name, so naming scans well helps a lot.
* **Google error "redirect_uri_mismatch":** the redirect URI in Google Cloud must exactly match `BASE_URL` plus `/auth/google/callback`.
* **Google signs you out after a week:** the Google project is still in Testing. Publish it (Step 5.5).
* **Phone can't open the link:** make sure Tailscale is switched on in the phone's app, and the iMac is awake.
* **Anything else:** look in `~/homebase/data/homebase.log`.

## Backups

Everything Homebase knows lives in `~/homebase/data` (accounts, Google sign ins, bills list, chat history). If you use Time Machine, it's already covered. The search index rebuilds itself if lost.

## Updating

Copy the new files over the old ones (don't touch `data` or `settings.env`), then run `sh mac-autostart.sh` again to restart.

## Running on Windows instead

Same steps, with these differences: use network paths like `\\DS418\Documents` in `NAS_ROOTS`, double click `start.bat` instead of `start.sh`, tick "Add python.exe to PATH" when installing Python, and use Task Scheduler (At log on, program `homebase\.venv\Scripts\pythonw.exe`, argument `run.py`) to start it automatically.
