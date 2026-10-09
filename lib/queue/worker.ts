import { Worker, Job, Queue } from 'bullmq';
import redis from '../redis';
import { notifyGoogleIndexing } from '../google-indexing';
import { sendEmail, sendPasswordResetEmail, sendInvitationEmail } from '../email';
import { flushArticleViews } from '../article-views';

// Job concurrency per worker process. Scale horizontally with
// `docker compose up -d --scale xsypher-worker=N` rather than only raising
// this number — BullMQ distributes jobs across every connected worker.
const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

// Register the periodic view-counter flush and scheduled-article publisher.
// Job schedulers are deduplicated by BullMQ, so registering from every worker
// replica is safe; if all workers are down the schedule simply re-registers on
// the next start.
const schedulerQueue = new Queue('publishing', { connection: redis });
void schedulerQueue
  .upsertJobScheduler(
    'flush-article-views',
    { every: 60_000 },
    { name: 'flushArticleViews', data: {} },
  )
  .catch((error) => console.error('[worker] Failed to register view flush schedule:', error));

void schedulerQueue
  .upsertJobScheduler(
    'publish-scheduled-articles',
    { every: 60_000 },
    { name: 'publishScheduledArticles', data: {} },
  )
  .catch((error) => console.error('[worker] Failed to register scheduled publishing job:', error));

async function triggerScheduledPublishing(): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  const webUrl = (process.env.WEB_INTERNAL_URL || 'http://xsypher-web:3000').replace(/\/+$/, '');

  if (cronSecret) {
    try {
      const res = await fetch(`${webUrl}/api/cron/publish-scheduled`, {
        method: 'POST',
        headers: { 'x-cron-secret': cronSecret },
      });
      if (res.ok) return;
    } catch {
      // Fall back to direct execution when running outside Docker internal network.
    }
  }

  const { runScheduledPublications } = await import('../scheduler');
  await runScheduledPublications();
}

// Worker for Publishing related jobs (e.g. Google Indexing ping, view flush, scheduled publish)
export const publishingWorker = new Worker('publishing', async (job: Job) => {
  if (job.name === 'pingGoogleIndexing') {
    const { url, type } = job.data;
    await notifyGoogleIndexing(url, type);
  } else if (job.name === 'flushArticleViews') {
    const flushed = await flushArticleViews();
    if (flushed > 0) {
      console.log(`[worker] Flushed ${flushed} buffered article view(s) to Postgres`);
    }
  } else if (job.name === 'publishScheduledArticles') {
    await triggerScheduledPublishing();
  }
}, { connection: redis, concurrency });

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
    
    const senderMatch = typeof from === "string" ? from.match(/^(.*?)\s*<(.+?)>$/) : null;
    const senderName = senderMatch ? senderMatch[1].trim() : "xSypher Newsletter";
    const senderEmail = senderMatch ? senderMatch[2].trim() : (from || "newsletter@xsypher.com");

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
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
}, { connection: redis, concurrency });

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
