# Homebase

A private household assistant that runs on your home PC and searches your Synology NAS. You and your wife each sign in and chat with it from your phones. It can:

* **Find files on the NAS.** Searches file names, folder names and the text inside PDFs, Word docs, Excel sheets and text files. You get a tap to open link.
* **Read and add to your calendars.** "What's on this weekend?", "Put the dentist on Tuesday at 3", "When are we both free next week?"
* **Track bills from email.** Scans both Gmail inboxes for bills, pulls out who, how much and when it's due, and keeps one shared list you can tick off.

## How it fits together

```
Phones (over Tailscale)
   ↓
PC: Homebase app + Ollama (the AI model)
   ↓
NAS shared folders (read only), Google Calendar + Gmail (each person's own account)
```

Everything runs on the PC. The NAS just shares its folders over your home network, like it already does. Nothing leaves your house except calls to Google for your own calendar and email.

**The PC needs to be on and awake** for Homebase to work. These steps are written for Windows. Mac notes are at the end.

---

## Setup

Plan on about an hour the first time. Do the steps in order.

### Step 1: Check the PC can open your NAS folders

1. On the PC, open File Explorer and type `\\DS418` in the address bar (or `\\` followed by the NAS's IP address, like `\\192.168.1.20`).
2. You should see your shared folders (Documents, Photos and so on). If it asks for a login, use your NAS account and tick **Remember my credentials**.
3. Note down the full paths of the folders you want searchable, e.g. `\\DS418\Documents`.

Homebase only ever *reads* files. It never changes, moves or deletes anything.

### Step 2: Ollama (the AI model)

1. Install Ollama from https://ollama.com/download
2. Pick a model based on your graphics card's memory (VRAM). These all handle tool calling well:

   | Your GPU | Model to pull |
   | :--- | :--- |
   | 8GB | `qwen2.5:7b` |
   | 12 to 16GB | `qwen2.5:14b` |
   | 24GB or more | `qwen2.5:32b` |

   Not sure? Press Ctrl+Shift+Esc, go to Performance > GPU, and look at "Dedicated GPU memory".

3. Open Command Prompt and run, for example:

   ```
   ollama pull qwen2.5:7b
   ```

   Bigger models give noticeably better answers, so go as big as your card handles.

### Step 3: Python

1. Download **Python 3.12** from https://www.python.org/downloads/windows/ ("Windows installer (64-bit)").
2. Run it, and on the first screen **tick "Add python.exe to PATH"** before clicking Install Now.

### Step 4: Tailscale (to reach it from your phones)

1. Make a free account at https://tailscale.com
2. Install Tailscale on the **PC** and sign in.
3. Install the Tailscale app on **both phones** and sign in to the same account (or invite your wife to your tailnet).
4. In the Tailscale admin console (https://login.tailscale.com/admin/dns), turn on **MagicDNS** and **HTTPS Certificates**.
5. Find your PC's address on the Machines page. It looks like `gaming-pc.tail1234.ts.net`. Your Homebase link will be `https://gaming-pc.tail1234.ts.net`.

### Step 5: Google project (for Calendar and Gmail)

This is the fiddliest step, but you only do it once.

1. Go to https://console.cloud.google.com and create a project called "Homebase".
2. **APIs & Services > Library:** enable **Gmail API** and **Google Calendar API**.
3. **OAuth consent screen** (may be called "Google Auth Platform"):
   * User type: **External**. App name: Homebase. Your email for the contact fields.
   * **Audience / Test users:** add your Gmail and your wife's Gmail.
   * **Data access / Scopes:** add `gmail.readonly`, `calendar`, `userinfo.email` and `openid`.
4. **Clients (or Credentials) > Create OAuth client ID:**
   * Application type: **Web application**
   * Authorized redirect URI: `https://gaming-pc.tail1234.ts.net/auth/google/callback` (your address from Step 4)
   * Create, then **Download JSON**. Rename the file to `google_client_secret.json`.
5. **Important:** go back to the **Audience** page and click **Publish app** (move it to "In production"). If you leave it in "Testing", Google signs you out every 7 days. You'll see a "Google hasn't verified this app" warning when you connect. That's expected for a private app: click **Advanced**, then **Go to Homebase**.

### Step 6: Put Homebase on the PC

1. Copy this `homebase` folder to the PC, for example to `C:\Homebase`. Keep it on the PC's own drive, not on the NAS.
2. Inside it, create a folder called `data`, and put `google_client_secret.json` in it.
3. Copy `example.env` and name the copy `settings.env`. Open it in Notepad and fill in:
   * `NAS_ROOTS`: your folders from Step 1, separated by commas
   * `TIMEZONE`: e.g. `Australia/Sydney` or `Europe/London`
   * `BASE_URL`: your Tailscale address from Step 4
   * `OLLAMA_MODEL`: the model you pulled in Step 2

   Tip: Windows hides file extensions by default, so make sure it's really `settings.env` and not `settings.env.txt`. In File Explorer: View > Show > File name extensions.

### Step 7: Start it

1. Double click **`start.bat`**. The first time, it spends a few minutes installing what it needs. When you see `Homebase is starting`, it's running.
2. On the PC, open http://localhost:8080 in a browser. You should see the Homebase sign in page.
3. Leave that window open for now (closing it stops Homebase). Step 9 makes it run in the background.

### Step 8: Turn on HTTPS through Tailscale

Open a new Command Prompt and run:

```
tailscale serve --bg 8080
```

Now open `https://gaming-pc.tail1234.ts.net` on your phone, with Tailscale switched on. You only need to do this once; it remembers.

### Step 9: Make your accounts

1. Open your Homebase link. The first visit shows **Create account**. Make yours.
2. Go to **Settings > Connect Google** and sign in with your Google account.
3. Have your wife open the same link on her phone, tap **Create an account instead**, make hers and connect her Google.
4. After two accounts, sign up closes automatically (change `MAX_USERS` in `settings.env` if you ever need more).

**Add it to your home screen:**
* **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
* **Android:** open the link in Chrome, tap the three dots, then **Add to Home screen** or **Install app**.

### Step 10: Start automatically, hidden in the background

So you don't have to double click `start.bat` every time:

1. Close the `start.bat` window.
2. Open **Task Scheduler** (search for it in the Start menu) and click **Create Task** (not "Basic Task").
3. **General** tab: name it `Homebase`. Leave "Run only when user is logged on" selected (that's what lets it reach the NAS with your saved login).
4. **Triggers** tab: New > Begin the task: **At log on** > OK.
5. **Actions** tab: New:
   * Program: `C:\Homebase\.venv\Scripts\pythonw.exe`
   * Add arguments: `run.py`
   * Start in: `C:\Homebase`
6. **Settings** tab: untick **Stop the task if it runs longer than 3 days**.
7. OK. Right click the task > **Run** to start it now.

It now starts quietly every time you log in. Its log is at `C:\Homebase\data\homebase.log`.

### Step 11: Stop the PC from sleeping

Settings > System > Power > set **Sleep** to **Never** (at least when plugged in). The screen can still turn off; that's fine.

---

## Using it

Things to try:

* "Find the warranty for the dishwasher"
* "Where's our 2023 tax return?"
* "What bills are due in the next two weeks?"
* "Check my email for new bills"
* "Mark the electricity bill as paid"
* "What's on our calendar this weekend?"
* "Find a free evening next week when we're both free, and book date night"
* "Add the kids' swimming lesson Saturday at 10am to the Family calendar"

The **Bills** tab shows the shared list. Bills found in either inbox show up for both of you, labelled with whose email they came from. Email searches and reading full emails only ever use your own inbox.

## What runs automatically

* **File index:** every 6 hours. The first run can take a while if you have years of files, since it reads them over the network. After that only new or changed files get read. Settings shows progress, or tap **Re-index now**.
* **Bill scan:** every 12 hours, for everyone who's connected Google.

Change these in `settings.env`, then restart Homebase (Task Scheduler > right click Homebase > End, then Run).

## Troubleshooting

* **"AI offline" in the header:** Ollama isn't running. Open it from the Start menu.
* **Settings shows the model in red:** run `ollama pull <model name>` in Command Prompt.
* **"Can't open \\DS418\..." in Settings:** the PC can't reach the NAS. Open the folder in File Explorer to check, and make sure you ticked Remember my credentials.
* **Files aren't found:** check Settings > NAS file index shows a file count above 0.
* **Scanned PDFs (photos of paper) aren't searchable by content:** they have no text inside. They're still searchable by file name, so naming scans well helps a lot.
* **Google error "redirect_uri_mismatch":** the redirect URI in Google Cloud must exactly match `BASE_URL` plus `/auth/google/callback`.
* **Google signs you out after a week:** the Google project is still in Testing. Publish it (Step 5.5).
* **Phone can't open the link:** make sure Tailscale is switched on in the phone's app, and the PC is awake.
* **Anything else:** look in `C:\Homebase\data\homebase.log`.

## Backups

Everything Homebase knows lives in `C:\Homebase\data` (accounts, Google sign ins, bills list, chat history). Copy that folder to the NAS now and then, or add it to your backup tool. The search index rebuilds itself if lost.

## Updating

Stop Homebase, copy the new files over the old ones (don't touch `data` or `settings.env`), then start it again. Any new requirements install automatically on the next `start.bat`.

## On a Mac instead

* Connect to the NAS in Finder (Go > Connect to Server > `smb://DS418`). Shares then live under `/Volumes`, so use e.g. `NAS_ROOTS=/Volumes/Documents`.
* Install Python 3.12 from python.org, then run `./start.sh` in Terminal from the Homebase folder.
* Tailscale: `tailscale serve --bg 8080` works the same (the Tailscale menu bar app includes the command line tool).
* To start at login, the simplest way is to leave a Terminal window running `start.sh`, or ask and I'll write a launchd file for you.
* System Settings > Energy: stop the Mac sleeping when plugged in.
