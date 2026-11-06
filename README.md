# Statement Scanner

Upload a photo or screenshot of a bank statement or receipt. AI reads it, sorts the spending into categories, and suggests where to save.

## Project layout

```
statement-scanner/
  index.html     the whole front end (no build step)
  api/scan.js    serverless function that calls the Gemini API
  README.md
```

## Deploy on Vercel (about 10 minutes)

1. **Get a free API key** at aistudio.google.com. Do not link a billing account, so it can never charge you. Judges who try your demo use your free quota, and if it runs out they see a "try again in a minute" message.
2. **Put the folder on GitHub**, or use the Vercel CLI (`npm i -g vercel`, then run `vercel` inside the folder).
3. On vercel.com choose **Add New, Project**, import the repo, and keep the default settings.
4. Before deploying, open **Settings, Environment Variables** and add:
   - Name: `GEMINI_API_KEY`
   - Value: your key (never paste it into code, screenshots or your README)
5. Deploy, then open the link in a **private window** to confirm it works with no sign-in.

If Vercel turns on "Deployment Protection" for your project, switch it off for production so judges are not asked to log in.

## Test it locally (optional)

```
npm i -g vercel
vercel dev
```
Create a file called `.env` containing `GEMINI_API_KEY=your-key` (do not commit it).

## Notes

- The model defaults to `gemini-2.5-flash`. To change it without editing code, add an environment variable `GEMINI_MODEL` in Vercel.
- Images are resized in the browser to 1600px before upload, which keeps scans fast and cheap.
- The "Try with sample data" button shows the full result screen without uploading anything, useful for judges who would rather not upload a real statement.

## Ideas for bonus superpowers (add one at a time, after this works)

- **Actions:** send the categorized transactions to a Google Sheet.
- **Knowledge:** let people upload several months and ask questions about their spending.
- **Texting:** text a photo of a receipt to a number and get the breakdown back.

## Draft README for the submission form

```
# Statement Scanner

[Two sentences on what it does.]

## Try it
- Working demo: [link]
- Demo video: [link]

## How to test it
1. Open the demo link and tap "Try with sample data" to see a result instantly.
2. Or upload a photo of any receipt or statement and tap "Scan it". You should see a total, spending by category, insights and savings tips.

## Track
Finance

## How it works
Photo upload -> Gemini reads the image and returns structured JSON -> categorized spending, insights and tips.

## Superpowers / Integrations
- Vision: Gemini reads the uploaded statement image.

## Why it matters to me
[Your real reason. Write this yourself.]

## Built with
HTML/JS, Vercel serverless function, Gemini API, Claude (to help write the code)

## Built by
Archit
```
