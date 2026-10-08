import { Worker, Job } from 'bullmq';
import redis from '../redis';
import { notifyGoogleIndexing } from '../google-indexing';
import { sendEmail, sendPasswordResetEmail, sendInvitationEmail } from '../email';

// Worker for Publishing related jobs (e.g. Google Indexing ping)
export const publishingWorker = new Worker('publishing', async (job: Job) => {
  if (job.name === 'pingGoogleIndexing') {
    const { url } = job.data;
    await notifyGoogleIndexing(url);
  }
}, { connection: redis });

publishingWorker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed for publishingQueue`);
});

publishingWorker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed for publishingQueue:`, err);
});

// Worker for Notification related jobs (e.g. Email sending)
export const notificationWorker = new Worker('notification', async (job: Job) => {
  if (job.name === 'sendEmail') {
    const { options } = job.data;
    await sendEmail(options);
  } else if (job.name === 'sendPasswordResetEmail') {
    await sendPasswordResetEmail(job.data);
  } else if (job.name === 'sendInvitationEmail') {
    await sendInvitationEmail(job.data);
  } else if (job.name === 'sendBrevoBroadcast') {
    const { subject, htmlWithFooter, messageVersions, from } = job.data;
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("Brevo API key is missing.");
    
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "xSypher", email: from },
        subject,
        htmlContent: htmlWithFooter,
        messageVersions
      })
    });
    
    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Brevo broadcast error: ${errData}`);
    }
  }
}, { connection: redis });

notificationWorker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed for notificationQueue`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed for notificationQueue:`, err);
});

// Startup banner: makes "is the worker even running?" answerable from
// `docker compose logs xsypher-worker` alone, instead of silent nothing.
console.log("[worker] started — listening on queues: publishing, notification");
if (!process.env.RESEND_API_KEY) {
  console.warn("[worker] RESEND_API_KEY is not set — email jobs will fail until it is configured");
}
