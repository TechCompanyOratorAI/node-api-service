import db from "../models/index.js";
import { emitUserScopedEvent } from "../websocket/emitters.js";
import { saveForUser } from "./notificationService.js";

const {
  Class,
  Group,
  Notification,
  Presentation,
  Topic,
  TopicEnrollment,
} = db;

const REMINDER_EVENT = "topic:deadline-reminder";
const REMINDER_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REMINDER_SWEEP_INTERVAL_MINUTES = 15;
const REMINDER_INITIAL_DELAY_SECONDS = 30;
const REMINDER_WINDOWS = [
  { key: "24h", ms: 24 * 60 * 60 * 1000, label: "24 giờ" },
  { key: "1h", ms: 60 * 60 * 1000, label: "1 giờ" },
];

const buildDeadlineText = (deadline) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: REMINDER_TIME_ZONE,
  }).format(deadline);

const hasActiveSubmission = async ({ topic, enrollment }) => {
  const submittedStatuses = ["submitted", "processing", "done"];

  if (enrollment.groupId) {
    const group = await Group.findByPk(enrollment.groupId, {
      attributes: ["groupId", "groupName"],
    });

    if (group?.groupName) {
      const count = await Presentation.count({
        where: {
          topicId: topic.topicId,
          classId: topic.classId,
          groupCode: group.groupName,
          status: { [db.Sequelize.Op.in]: submittedStatuses },
        },
      });
      return count > 0;
    }
  }

  const count = await Presentation.count({
    where: {
      topicId: topic.topicId,
      studentId: enrollment.studentId,
      status: { [db.Sequelize.Op.in]: submittedStatuses },
    },
  });

  return count > 0;
};

const reminderAlreadySent = async (userId, dedupeKey) => {
  const existing = await Notification.findOne({
    where: {
      userId,
      type: REMINDER_EVENT,
      [db.Sequelize.Op.and]: db.sequelize.where(
        db.sequelize.fn(
          "JSON_UNQUOTE",
          db.sequelize.fn("JSON_EXTRACT", db.sequelize.col("data"), "$.dedupeKey"),
        ),
        dedupeKey,
      ),
    },
    attributes: ["notificationId"],
  });

  return !!existing;
};

const sendReminder = async ({ topic, classRecord, enrollment, window }) => {
  const deadline = new Date(topic.submissionDeadline || topic.dueDate);
  const dedupeKey = `${topic.topicId}:${enrollment.studentId}:${window.key}:${deadline.toISOString()}`;

  if (await reminderAlreadySent(enrollment.studentId, dedupeKey)) {
    return false;
  }

  if (await hasActiveSubmission({ topic, enrollment })) {
    return false;
  }

  const classLabel = classRecord?.classCode ? `lớp ${classRecord.classCode}` : "lớp học";
  const title = "Sắp tới hạn nộp bài";
  const message = `Topic "${topic.topicName}" của ${classLabel} sẽ hết hạn nộp trong ${window.label} (${buildDeadlineText(deadline)}).`;
  const payload = {
    topicId: topic.topicId,
    topicName: topic.topicName,
    classId: topic.classId,
    classCode: classRecord?.classCode || null,
    deadline: deadline.toISOString(),
    reminderWindow: window.key,
    dedupeKey,
    title,
    message,
  };

  emitUserScopedEvent(enrollment.studentId, REMINDER_EVENT, payload);
  await saveForUser(enrollment.studentId, REMINDER_EVENT, title, message, payload);
  return true;
};

export const runDeadlineReminderSweep = async () => {
  const now = new Date();
  const maxWindowMs = Math.max(...REMINDER_WINDOWS.map((window) => window.ms));
  const latestDeadline = new Date(now.getTime() + maxWindowMs);

  const topics = await Topic.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        {
          submissionDeadline: {
            [db.Sequelize.Op.gt]: now,
            [db.Sequelize.Op.lte]: latestDeadline,
          },
        },
        {
          submissionDeadline: null,
          dueDate: {
            [db.Sequelize.Op.gt]: now,
            [db.Sequelize.Op.lte]: latestDeadline,
          },
        },
      ],
    },
    include: [
      {
        model: Class,
        as: "class",
        attributes: ["classId", "classCode", "status"],
      },
      {
        model: TopicEnrollment,
        as: "enrollments",
        where: { status: "enrolled" },
        attributes: ["topicEnrollmentId", "studentId", "groupId"],
        required: true,
      },
    ],
  });

  let sent = 0;

  for (const topic of topics) {
    if (topic.class?.status && topic.class.status !== "active") continue;

    const deadline = new Date(topic.submissionDeadline || topic.dueDate);
    const remainingMs = deadline.getTime() - now.getTime();
    const dueWindows = REMINDER_WINDOWS
      .filter((window) => remainingMs > 0 && remainingMs <= window.ms)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 1);

    for (const window of dueWindows) {
      for (const enrollment of topic.enrollments || []) {
        if (await sendReminder({ topic, classRecord: topic.class, enrollment, window })) {
          sent += 1;
        }
      }
    }
  }

  if (sent > 0) {
    console.log(`[DeadlineReminder] Sent ${sent} reminder notification(s)`);
  }

  return sent;
};

export const startDeadlineReminderScheduler = () => {
  const run = () => {
    runDeadlineReminderSweep().catch((err) => {
      console.error(`[DeadlineReminder] Sweep failed: ${err.message}`);
    });
  };

  const initialTimer = setTimeout(run, REMINDER_INITIAL_DELAY_SECONDS * 1000);
  const intervalTimer = setInterval(
    run,
    REMINDER_SWEEP_INTERVAL_MINUTES * 60 * 1000,
  );

  initialTimer.unref?.();
  intervalTimer.unref?.();

  console.log(
    `[DeadlineReminder] Scheduler started: every ${REMINDER_SWEEP_INTERVAL_MINUTES} minute(s)`,
  );

  return { initialTimer, intervalTimer };
};
