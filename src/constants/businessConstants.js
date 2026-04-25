"use strict";

const ROLES = Object.freeze({
  ADMIN: "Admin",
  ACADEMIC_COORDINATOR: "AcademicCoordinator",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
});

const ACADEMIC_TERMS = Object.freeze({
  SPRING: "SPRING",
  SUMMER: "SUMMER",
  FALL: "FALL",
});

const ACADEMIC_HALVES = Object.freeze({
  H1: "H1",
  H2: "H2",
});

const ACADEMIC_BLOCK_TYPES = Object.freeze({
  NORMAL: "NORMAL",
  BLOCK3: "BLOCK3",
});

const COMPETENCY_LEVELS = Object.freeze({
  AWARENESS: 1,
  BASIC: 2,
  TEACHING_READY: 3,
  ADVANCED: 4,
  EXPERT: 5,
});

const ASSIGNMENT_STATUSES = Object.freeze({
  ASSIGNED: "assigned",
  JOINED: "joined",
  DROPPED: "dropped",
  BLOCKED: "blocked",
  TRANSFERRED: "transferred",
});

const AUDIT_ACTIONS = Object.freeze({
  ROLE_ASSIGNED: "role.assigned",
  ROLE_REMOVED: "role.removed",
  ROLE_UPDATED: "role.updated",
  CLASS_INSTRUCTOR_ASSIGNED: "class.instructor_assigned",
  CLASS_INSTRUCTOR_REMOVED: "class.instructor_removed",
  ENROLL_KEY_CREATED: "enroll_key.created",
  ENROLL_KEY_ROTATED: "enroll_key.rotated",
  ENROLL_KEY_REVOKED: "enroll_key.revoked",
  CLASS_JOINED: "class.joined",
  GROUP_LEADER_CHANGED: "group.leader_changed",
  DEADLINE_UPDATED: "deadline.updated",
});

const AUDIT_STATUSES = Object.freeze({
  SUCCESS: "success",
  FAILURE: "failure",
});

module.exports = {
  ROLES,
  ROLE_VALUES: Object.values(ROLES),
  ACADEMIC_TERMS,
  ACADEMIC_TERM_VALUES: Object.values(ACADEMIC_TERMS),
  ACADEMIC_HALVES,
  ACADEMIC_HALF_VALUES: Object.values(ACADEMIC_HALVES),
  ACADEMIC_BLOCK_TYPES,
  ACADEMIC_BLOCK_TYPE_VALUES: Object.values(ACADEMIC_BLOCK_TYPES),
  COMPETENCY_LEVELS,
  COMPETENCY_LEVEL_VALUES: Object.values(COMPETENCY_LEVELS),
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_VALUES: Object.values(ASSIGNMENT_STATUSES),
  AUDIT_ACTIONS,
  AUDIT_STATUSES,
  AUDIT_STATUS_VALUES: Object.values(AUDIT_STATUSES),
};
