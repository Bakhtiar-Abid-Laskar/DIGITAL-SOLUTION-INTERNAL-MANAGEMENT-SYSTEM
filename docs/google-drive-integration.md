# Google Drive Integration

This app integrates with Google Drive to store large backup reports, generated attendance reports, and photos.

Because we are uploading to a personal, free Google Drive account, **we must use the OAuth 2.0 (Refresh Token) method**. Google strictly limits "Service Accounts" to 0 bytes of storage on free personal accounts, preventing them from uploading files directly.

By using OAuth 2.0, the backend authorizes itself as *you*, utilizing your personal 15GB of free storage.

## Step 1: Create Google Cloud Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. In the search bar, search for **APIs & Services**.
4. Click **Enable APIs and Services**, search for **Google Drive API**, and click **Enable**.
5. On the left sidebar, go to **OAuth consent screen**.
   - Choose **External** (if you don't have a Workspace account).
   - Fill in the required fields (App name, support email, developer contact).
   - Click **Save and Continue** through the Scopes page (no need to add scopes here).
   - Add your own email under **Test users** and click **Save**.
6. On the left sidebar, go to **Credentials**.
7. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
8. Select **Web application**.
9. Under **Authorized redirect URIs**, add exactly: `http://localhost:3000/oauth2callback`.
10. Click **Create**.
11. You will be shown a **Client ID** and **Client Secret**. Keep this window open or copy them down.

## Step 2: Generate the Refresh Token

To allow the Edge Functions to upload in the background, we need a permanent "Refresh Token". I have created a script to make this extremely easy.

1. Open your terminal in the `RepairShop` project root folder.
2. Run the script:
   ```bash
   node scripts/get-google-refresh-token.mjs
   ```
3. Paste your **Client ID** and press Enter.
4. Paste your **Client Secret** and press Enter.
5. Your browser will automatically open to a Google Login page.
6. Log in with your personal Google account (the same one you added as a Test User). 
   *(Note: You may see a warning saying "Google hasn't verified this app". Click **Advanced** and then **Go to [App Name] (unsafe)**)*.
7. Click **Continue** to grant the app access to your Google Drive.
8. The browser will say "Authorization successful", and your terminal will print out the Supabase commands to run!

## Step 3: Set Secrets in Supabase

Run the commands output by the script in your terminal to securely store the tokens in Supabase:

```bash
npx supabase secrets set GOOGLE_CLIENT_ID="your_client_id"
npx supabase secrets set GOOGLE_CLIENT_SECRET="your_client_secret"
npx supabase secrets set GOOGLE_REFRESH_TOKEN="your_refresh_token"
```

Then, deploy your functions so they pick up the new variables:

```bash
npx supabase functions deploy
```

---

## Folder Structure

Once configured, the Edge Functions will automatically structure your Drive like this:

- **REPORTS / YYYY / MM**
  - `Monthly_Data_MMYY.xlsx` (Jobs, Sales, Inventory)
- **ATTENDANCE REPORTS / YYYY / MM**
  - `StaffName_MMYY.xlsx`
- **STAFF_ATTENDCE_IMG / YYYY / MM**
  - `StaffName_DDMMYY.jpg`
- **JOBS BILL / YYYY / MM**
  - `Invoice_JobID.pdf`
- **SALE BILL / YYYY / MM**
  - `Invoice_SaleID.pdf`
- **ONSITE_VISIT_IMG / YYYY / MM**
  - `JobID_A.jpg` (Arrival)
  - `JobID_D.jpg` (Departure)
  - `JobID_DEVICE_IMG.jpg` (Device)

## Manual Removal

Because photos are backed up to Drive *instead* of Supabase Storage, deleting a job or attendance record from the Supabase Database will **not** automatically delete the photo from Google Drive. To save space, you must delete old photos manually from Drive.
