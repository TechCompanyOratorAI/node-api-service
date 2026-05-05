"use strict";

const db = require("../models");
const { Notification, Presentation, GroupStudent, Enrollment, ClassInstructor } = db;

/**
 * Save a notification for a single user.
 */
const saveForUser = async (userId, type, title, message, data = null) => {
  try {
    await Notification.create({ userId, type, title, message, data });
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForUser failed: ${err.message}`);
  }
};

/**
 * Save a notification for the student who owns the presentation.
 */
const saveForPresentation = async (presentationId, type, title, message, data = null) => {
  try {
    const presentation = await Presentation.findByPk(presentationId, { attributes: ["studentId"] });
    if (!presentation) return;
    await saveForUser(presentation.studentId, type, title, message, data);
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForPresentation failed: ${err.message}`);
  }
};

/**
 * Save a notification for all students in a group.
 */
const saveForGroup = async (groupId, type, title, message, data = null) => {
  try {
    const members = await GroupStudent.findAll({ where: { groupId }, attributes: ["studentId"] });
    await Promise.all(members.map((m) => saveForUser(m.studentId, type, title, message, data)));
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForGroup failed: ${err.message}`);
  }
};

/**
 * Save a notification for all enrolled students in a class.
 */
const saveForClass = async (classId, type, title, message, data = null) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { classId, status: "enrolled" },
      attributes: ["studentId"],
    });
    await Promise.all(enrollments.map((e) => saveForUser(e.studentId, type, title, message, data)));
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForClass failed: ${err.message}`);
  }
};

/**
 * Save a notification for all instructors assigned to a class.
 */
const saveForClassInstructors = async (classId, type, title, message, data = null) => {
  try {
    const instructors = await ClassInstructor.findAll({
      where: { classId },
      attributes: ["instructorId"],
    });
    await Promise.all(
      instructors.map((record) =>
        saveForUser(record.instructorId, type, title, message, data),
      ),
    );
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForClassInstructors failed: ${err.message}`);
  }
};

/**
 * Save a notification for all instructors of the presentation's class.
 */
const saveForPresentationInstructors = async (
  presentationId,
  type,
  title,
  message,
  data = null,
) => {
  try {
    const presentation = await Presentation.findByPk(presentationId, {
      attributes: ["classId"],
    });
    if (!presentation?.classId) return;
    await saveForClassInstructors(
      presentation.classId,
      type,
      title,
      message,
      data,
    );
  } catch (err) {
    console.error(`[NotificationService] ❌ saveForPresentationInstructors failed: ${err.message}`);
  }
};

module.exports = {
  saveForUser,
  saveForPresentation,
  saveForGroup,
  saveForClass,
  saveForClassInstructors,
  saveForPresentationInstructors,
};
