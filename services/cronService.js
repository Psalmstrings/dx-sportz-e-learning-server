const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const emailService = require('./emailService');

const runExpirationCheck = async () => {
  try {
    const now = new Date();

    // 1. Mark expired enrollments
    const expiredEnrollments = await Enrollment.find({
      status: 'active',
      accessExpiryDate: { $lt: now }
    }).populate('student program');

    for (const enrollment of expiredEnrollments) {
      enrollment.status = 'expired';
      await enrollment.save();

      // Create notification
      if (enrollment.student && enrollment.program) {
        await Notification.create({
          recipient: enrollment.student._id,
          title: 'Course Access Expired',
          message: `Your 30-day course access period for ${enrollment.program.title} has ended. Your certificate and account remain active.`,
          type: 'warning',
          link: '/academy/dashboard'
        });
      }
    }

    if (expiredEnrollments.length > 0) {
      console.log(`[CronService] Processed ${expiredEnrollments.length} expired enrollment(s).`);
    }

    // 2. Upcoming expiry warnings (3 days before)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await Enrollment.find({
      status: 'active',
      accessExpiryDate: { $gt: now, $lte: threeDaysFromNow }
    }).populate('student program');

    for (const enrollment of expiringSoon) {
      // Check if already notified in last 24h
      const existing = await Notification.findOne({
        recipient: enrollment.student._id,
        title: 'Course Access Expiring Soon',
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!existing && enrollment.student && enrollment.program) {
        await Notification.create({
          recipient: enrollment.student._id,
          title: 'Course Access Expiring Soon',
          message: `Your course access for ${enrollment.program.title} will expire in less than 3 days. Please ensure you complete any remaining modules.`,
          type: 'warning',
          link: `/academy/learn/${enrollment.program.slug}`
        });
      }
    }
  } catch (error) {
    console.error('[CronService] Error in runExpirationCheck:', error.message);
  }
};

// Start background recurring job (every 4 hours)
const initCronJobs = () => {
  console.log('[CronService] Expiration and reminder background jobs initialized.');
  // Run on startup
  setTimeout(runExpirationCheck, 5000);
  // Recurring check every 4 hours
  setInterval(runExpirationCheck, 4 * 60 * 60 * 1000);
};

module.exports = {
  initCronJobs,
  runExpirationCheck
};
