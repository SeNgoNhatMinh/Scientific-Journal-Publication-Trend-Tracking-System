const Notification = require('../models/Notification');
const User = require('../models/User');
const createNotification = async ({
  userId,
  title,
  message,
  type,
  refId = null,
  refType = null,
}) => {
  return Notification.create({
    userId,
    title,
    message,
    type,
    refId,
    refType,
    sentAt: new Date(),
  });
};

const notifyUsers = async (userIds, payload) => {
  const unique = [...new Set(userIds.map(String))];
  if (!unique.length) return [];

  const docs = unique.map(userId => ({
    userId,
    ...payload,
    sentAt: new Date(),
  }));
  return Notification.insertMany(docs);
};

const notifyCorpusComplete = async run => {
  const users = await User.find({
    $or: [
      { 'trackedRuns.analysisRunId': run._id, 'trackedRuns.notifyEnabled': true },
      {
        follows: {
          $elemMatch: {
            targetType: 'analysisRun',
            targetId: run._id,
            notifyEnabled: true,
          },
        },
      },
    ],
  }).select('_id');

  const userIds = users.map(u => u._id);
  if (!userIds.length) return [];

  const title = `Corpus "${run.seedKeyword}" hoàn tất`;
  const message = `Phân tích ${run.startYear}-${run.endYear}: ${run.paperCount || 0} bài, trạng thái ${run.trendStatus || 'n/a'}.`;

  return notifyUsers(userIds, {
    title,
    message,
    type: 'syncComplete',
    refId: run._id,
    refType: 'analysisRun',
  });
};

const notifyTrendingIfEmerging = async (run, keywordId) => {
  if (!run.isEmerging) return [];

  const users = await User.find({
    $or: [
      { 'trackedRuns.analysisRunId': run._id, 'trackedRuns.notifyEnabled': true },
      ...(keywordId
        ? [
            {
              follows: {
                $elemMatch: {
                  targetType: 'keyword',
                  targetId: keywordId,
                  notifyEnabled: true,
                },
              },
            },
          ]
        : []),
    ],
  }).select('_id');

  const userIds = users.map(u => u._id);
  if (!userIds.length) return [];

  return notifyUsers(userIds, {
    title: `Từ khóa đang nổi: ${run.seedKeyword}`,
    message: `Xu hướng "${run.seedKeyword}" được đánh dấu emerging (score ${run.emergenceScore}).`,
    type: 'trendingKeyword',
    refId: keywordId || run.topicId,
    refType: 'keyword',
  });
};

module.exports = {
  createNotification,
  notifyUsers,
  notifyCorpusComplete,
  notifyTrendingIfEmerging,
};
