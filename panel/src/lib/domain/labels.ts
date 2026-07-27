import type {
  ApplicationStatus,
  ApplicationType,
  CouponTrigger,
  DiscountType,
  EventType,
  FormFieldScope,
  FormFieldType,
  NotificationAudience,
  NotificationChannel,
  NotificationStatus,
  RegistrationStatus,
  UserRole,
} from "./enums";

/** Rozet renk anahtarı — components/ui/badge.tsx içindeki tonlarla eşleşir. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: "Beklemede",
  APPROVED: "Onaylandı",
  REJECTED: "Elendi",
  FINALIST: "Finale Kaldı",
};

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  FINALIST: "accent",
};

export const APPLICATION_TYPE_LABEL: Record<ApplicationType, string> = {
  INDIVIDUAL: "Bireysel",
  GROUP: "Grup",
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  MEMBER: "Üye",
  ADMIN: "Admin",
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  WEBINAR: "Webinar",
  WORKSHOP: "Atölye",
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  REGISTERED: "Kayıtlı",
  WAITLIST: "Bekleme listesi",
  CANCELLED: "İptal",
  ATTENDED: "Katıldı",
};

export const REGISTRATION_STATUS_TONE: Record<RegistrationStatus, Tone> = {
  REGISTERED: "success",
  WAITLIST: "warning",
  CANCELLED: "neutral",
  ATTENDED: "info",
};

export const FORM_FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  TEXT: "Kısa metin",
  TEXTAREA: "Uzun metin",
  NUMBER: "Sayı",
  DATE: "Tarih",
  SELECT: "Seçim listesi",
  CHECKBOX: "Onay kutusu",
  FILE: "Dosya",
  URL: "Bağlantı",
};

export const FORM_FIELD_SCOPE_LABEL: Record<FormFieldScope, string> = {
  GROUP: "Grup geneli",
  MEMBER: "Her üye için",
};

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  PERCENT: "Yüzde",
  AMOUNT: "Tutar",
};

export const COUPON_TRIGGER_LABEL: Record<CouponTrigger, string> = {
  APPLICATION_SUBMITTED: "Başvuru yapıldığında",
  EVENT_REGISTERED: "Etkinliğe kayıt olduğunda",
  EVENT_ATTENDED: "Etkinliğe katıldığında",
  MANUAL: "Elle tanımlanır",
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  EMAIL: "E-posta",
  SMS: "SMS",
};

export const NOTIFICATION_AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  ALL_MEMBERS: "Tüm üyeler",
  APPLICATION_STATUS: "Başvuru durumuna göre",
  EVENT_REGISTRANTS: "Etkinlik katılımcıları",
  CUSTOM: "Elle seçim",
};

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  DRAFT: "Taslak",
  QUEUED: "Kuyrukta",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
};

export const NOTIFICATION_STATUS_TONE: Record<NotificationStatus, Tone> = {
  DRAFT: "neutral",
  QUEUED: "info",
  SENT: "success",
  FAILED: "danger",
};
