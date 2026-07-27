// SQLite enum desteklemediği için durum alanları veritabanında String.
// Tek doğruluk kaynağı burası: hem tip daraltma hem de arayüz etiketleri
// bu sabitlerden türüyor.

export const USER_ROLES = ["MEMBER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPLICATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FINALIST",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_TYPES = ["INDIVIDUAL", "GROUP"] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

export const EVENT_TYPES = ["WEBINAR", "WORKSHOP"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const REGISTRATION_STATUSES = [
  "REGISTERED",
  "WAITLIST",
  "CANCELLED",
  "ATTENDED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const FORM_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "CHECKBOX",
  "FILE",
  "URL",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_SCOPES = ["GROUP", "MEMBER"] as const;
export type FormFieldScope = (typeof FORM_FIELD_SCOPES)[number];

export const DISCOUNT_TYPES = ["PERCENT", "AMOUNT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const COUPON_TRIGGERS = [
  "APPLICATION_SUBMITTED",
  "EVENT_REGISTERED",
  "EVENT_ATTENDED",
  "MANUAL",
] as const;
export type CouponTrigger = (typeof COUPON_TRIGGERS)[number];

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_AUDIENCES = [
  "ALL_MEMBERS",
  "APPLICATION_STATUS",
  "EVENT_REGISTRANTS",
  "CUSTOM",
] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_STATUSES = [
  "DRAFT",
  "QUEUED",
  "SENT",
  "FAILED",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
