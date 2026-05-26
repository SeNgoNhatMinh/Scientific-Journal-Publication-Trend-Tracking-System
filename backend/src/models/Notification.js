const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['newPaper', 'trendingKeyword', 'syncComplete', 'system'],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    refType: {
      type: String,
      enum: ['paper', 'keyword', 'journal', 'analysisRun', null],
      default: null,
    },
    isRead: { type: Boolean, default: false, index: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, sentAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ sentAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
