/**
 * PaperDesk — Firebase Cloud Function
 * Function: submitPaper
 *
 * What it does:
 *   1. Receives submission metadata as JSON (file is already in Firebase Storage,
 *      uploaded directly by the browser using the Firebase Storage SDK)
 *   2. Validates required fields
 *   3. Returns { success: true, fileUrl } so the frontend can pass it to Firestore
 *
 * Optional server-side actions you can add later (marked FUTURE):
 *   - Send a confirmation email via SendGrid / Nodemailer
 *   - Notify admin via Slack webhook
 *   - Assign a reviewer automatically
 *
 * Deploy with:
 *   firebase deploy --only functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const cors = require('cors');

// Set region close to your users. Options: us-central1, europe-west1, asia-east1, etc.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// Allow requests from any origin during development.
// FUTURE: Lock this down to your actual domain before going live:
//   corsHandler = cors({ origin: 'https://yourconference.com' });
const corsHandler = cors({ origin: true });

/**
 * submitPaper — HTTP Cloud Function (v2)
 *
 * Expects a JSON POST body with:
 *   title, track, type, abstract, keyphrases,
 *   keywords (array), authors (array), submissionNum,
 *   submittedAt (ISO string), filePath, fileUrl
 *
 * Returns:
 *   { success: true, fileUrl: string }
 */
exports.submitPaper = onRequest(
  {
    // 50 MB — matches the frontend file size limit
    // v2 functions need this set explicitly for large payloads
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  (req, res) => {
    // Wrap everything in the CORS handler so preflight OPTIONS requests are handled
    corsHandler(req, res, async () => {

      // Only accept POST
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
      }

      try {
        const {
          title,
          track,
          type,
          abstract,
          keyphrases,
          keywords,
          authors,
          submissionNum,
          submittedAt,
          filePath,
          fileUrl
        } = req.body;

        // ── Basic server-side validation ─────────────────────────────────────
        // The frontend validates too, but always validate on the server as well.
        if (!title || !track || !type || !abstract) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: title, track, type, abstract'
          });
        }
        if (!fileUrl || !filePath) {
          return res.status(400).json({
            success: false,
            message: 'Missing fileUrl or filePath — file must be uploaded to Storage first'
          });
        }
        if (!Array.isArray(authors) || authors.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one author is required'
          });
        }

        // ── Log the submission (visible in Firebase Console → Functions → Logs) ─
        console.log(`[submitPaper] New submission #${submissionNum}: "${title}" by ${authors[0]?.lastName || 'Unknown'}`);
        console.log(`[submitPaper] File stored at: ${filePath}`);

        // ── FUTURE: Send confirmation email ────────────────────────────────────
        // const correspondingAuthor = authors.find(a => a.corresponding) || authors[0];
        // await sendConfirmationEmail(correspondingAuthor.email, { title, submissionNum });

        // ── FUTURE: Notify admin via Slack/webhook ─────────────────────────────
        // await notifyAdmin({ title, submissionNum, track });

        // ── FUTURE: Trigger reviewer assignment ────────────────────────────────
        // await assignReviewer({ submissionNum, track, keywords });

        // Return success with the fileUrl (frontend passes this to Firestore)
        return res.status(200).json({
          success: true,
          fileUrl,            // Firebase Storage download URL, echoed back
          submissionNum,      // Echoed back for confirmation display
          message: 'Submission received successfully'
        });

      } catch (err) {
        console.error('[submitPaper] Error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error. Please try again.'
        });
      }
    });
  }
);
