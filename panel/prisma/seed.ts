/**
 * Geliştirme verisi. `npm run db:seed` ile çalışır ve idempotenttir —
 * tekrar çalıştırıldığında mevcut kayıtları günceller, kopya üretmez.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const CITIES = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya",
  "Eskişehir", "Adana", "Trabzon", "Gaziantep", "Konya",
];

const ROLES = [
  "Vokal", "Gitar", "Bas Gitar", "Davul", "Klavye",
  "Prodüktör", "Söz Yazarı", "DJ",
];

const GROUP_NAMES = [
  "Gece Yarısı Ekspresi", "Asfalt Çiçekleri", "Mavi Nota", "Kuzey Rüzgârı",
  "Son Vagon", "Yankı Odası", "Beton Bahçe", "Ters Akort",
  "Deniz Feneri", "Gündüz Düşleri", "Kırık Plak", "Uzak Şehir",
];

const FIRST_NAMES = [
  "Deniz", "Elif", "Kaan", "Zeynep", "Mert", "Ada", "Barış", "Selin",
  "Emre", "Naz", "Cem", "İpek", "Onur", "Ceren", "Berk", "Melis",
];

const LAST_NAMES = [
  "Yılmaz", "Demir", "Kaya", "Şahin", "Çelik", "Aydın", "Arslan",
  "Doğan", "Kılıç", "Aslan", "Öztürk", "Koç",
];

/** Sabit tohumlu üreteç — her seed çalıştırmasında aynı veri üretilir. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

const random = makeRandom(20260727);

function pick<T>(items: readonly T[]) {
  return items[Math.floor(random() * items.length)]!;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function birthDate(minAge: number, maxAge: number) {
  const age = minAge + Math.floor(random() * (maxAge - minAge));
  return new Date(
    new Date().getFullYear() - age,
    Math.floor(random() * 12),
    1 + Math.floor(random() * 28),
  );
}

async function main() {
  console.log("Seed başlıyor…");

  // -------------------------------------------------------------------------
  // Admin + ayarlar
  // -------------------------------------------------------------------------
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@muzikhackathon.com" },
    update: { passwordHash: adminHash, role: "ADMIN" },
    create: {
      fullName: "Panel Yöneticisi",
      email: "admin@muzikhackathon.com",
      phone: "+905550000000",
      passwordHash: adminHash,
      birthDate: new Date(1990, 4, 12),
      city: "İstanbul",
      role: "ADMIN",
      kvkkAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.applicationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      isOpen: true,
      opensAt: daysAgo(20),
      closesAt: daysFromNow(25),
      minMembers: 2,
      maxMembers: 6,
      demoRequired: true,
    },
  });

  // -------------------------------------------------------------------------
  // Roller ve form alanları
  // -------------------------------------------------------------------------
  for (const [index, name] of ROLES.entries()) {
    await prisma.musicalRole.upsert({
      where: { name },
      update: { order: index },
      create: { name, order: index },
    });
  }
  const roles = await prisma.musicalRole.findMany({ orderBy: { order: "asc" } });

  const systemFields = [
    {
      key: "grup-adi", label: "Grup Adı", type: "TEXT",
      scope: "GROUP", required: true, isSystem: true, order: 1,
    },
    {
      key: "sehir", label: "Şehir", type: "TEXT",
      scope: "GROUP", required: true, isSystem: true, order: 2,
    },
    {
      key: "demo", label: "Demo Şarkı", type: "FILE",
      scope: "GROUP", required: true, isSystem: true, order: 3,
    },
    {
      key: "muzik-turu", label: "Müzik Türü", type: "SELECT",
      scope: "GROUP", required: false, isSystem: false, order: 4,
      optionsJson: JSON.stringify(["Rock", "Pop", "Hip-Hop", "Elektronik", "Caz", "Halk Müziği"]),
    },
    {
      key: "sahne-deneyimi", label: "Sahne Deneyimi", type: "TEXTAREA",
      scope: "GROUP", required: false, isSystem: false, order: 5,
      helpText: "Daha önce sahne aldıysanız kısaca anlatın.",
    },
    {
      key: "enstruman", label: "Kullandığı Enstrüman", type: "TEXT",
      scope: "MEMBER", required: false, isSystem: false, order: 1,
    },
  ];

  for (const field of systemFields) {
    await prisma.applicationFormField.upsert({
      where: { key: field.key },
      update: {},
      create: field,
    });
  }

  // -------------------------------------------------------------------------
  // Üyeler
  // -------------------------------------------------------------------------
  const memberCount = 60;
  const members = [];

  for (let index = 0; index < memberCount; index += 1) {
    const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const email = `uye${index + 1}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        fullName,
        email,
        phone: `+9053${String(10_000_000 + index).slice(0, 8)}`,
        passwordHash: await bcrypt.hash("Uye1234!", 10),
        birthDate: birthDate(17, 34),
        city: pick(CITIES),
        kvkkAcceptedAt: daysAgo(30 - (index % 30)),
        // Her 5 üyeden biri doğrulamayı tamamlamamış olsun.
        emailVerifiedAt: index % 5 === 0 ? null : daysAgo(29 - (index % 29)),
        phoneVerifiedAt: index % 7 === 0 ? null : daysAgo(29 - (index % 29)),
        createdAt: daysAgo(30 - (index % 30)),
      },
    });
    members.push(user);
  }

  // -------------------------------------------------------------------------
  // Başvurular
  // -------------------------------------------------------------------------
  const statuses = ["PENDING", "APPROVED", "REJECTED", "FINALIST"] as const;
  let memberCursor = 0;

  for (const [index, groupName] of GROUP_NAMES.entries()) {
    const reference = `MH-2026-${String(index + 1).padStart(4, "0")}`;
    const existing = await prisma.application.findUnique({ where: { reference } });
    if (existing) continue;

    const size = 2 + Math.floor(random() * 4);
    const groupMembers = [];
    for (let i = 0; i < size; i += 1) {
      groupMembers.push(members[memberCursor % members.length]!);
      memberCursor += 1;
    }

    const contact = groupMembers[0]!;
    const status = statuses[index % statuses.length]!;
    const submittedAt = daysAgo(18 - index);

    const application = await prisma.application.create({
      data: {
        reference,
        groupName,
        type: size === 1 ? "INDIVIDUAL" : "GROUP",
        city: contact.city,
        status,
        memberCount: size,
        contactUserId: contact.id,
        demoFileName: `${groupName.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}-demo.mp3`,
        demoLinkUrl:
          index % 3 === 0 ? "https://soundcloud.com/ornek/demo" : null,
        extraFieldsJson: JSON.stringify({
          "Müzik Türü": pick(["Rock", "Pop", "Hip-Hop", "Elektronik", "Caz"]),
          "Sahne Deneyimi":
            index % 2 === 0
              ? "Yerel festivallerde 3 sahne aldık."
              : "İlk kez sahne alacağız.",
        }),
        kvkkAcceptedAt: submittedAt,
        fsekAcceptedAt: submittedAt,
        submittedAt,
        members: {
          create: groupMembers.map((member, memberIndex) => ({
            userId: member.id,
            fullName: member.fullName,
            birthDate: member.birthDate,
            city: member.city,
            email: member.email,
            phone: member.phone,
            musicalRoleId: roles[(index + memberIndex) % roles.length]!.id,
            isContact: memberIndex === 0,
          })),
        },
      },
    });

    if (status !== "PENDING") {
      await prisma.applicationStatusLog.create({
        data: {
          applicationId: application.id,
          fromStatus: "PENDING",
          toStatus: status,
          changedById: admin.id,
          createdAt: daysAgo(10 - (index % 10)),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Etkinlikler
  // -------------------------------------------------------------------------
  const events = [
    {
      slug: "studyoda-kayit-teknikleri",
      title: "Stüdyoda Kayıt Teknikleri",
      instructor: "Zuhal Müzik — Serkan Aydın",
      type: "WORKSHOP",
      description:
        "Mikrofon seçimi, oda akustiği ve ilk kayıt oturumunda yapılan yaygın hatalar.",
      startsAt: daysFromNow(6),
      durationMinutes: 120,
      capacity: 30,
      isPublished: true,
      location: "Zuhal Müzik Stüdyo, İstanbul",
    },
    {
      slug: "sarki-yazarligi-101",
      title: "Şarkı Yazarlığı 101",
      instructor: "Melis Kara",
      type: "WEBINAR",
      description:
        "Nakarat kurma, söz-melodi ilişkisi ve blokajı aşmak için pratik yöntemler.",
      startsAt: daysFromNow(11),
      durationMinutes: 90,
      capacity: 200,
      isPublished: true,
      location: "https://meet.example.com/sarki-yazarligi",
    },
    {
      slug: "mix-mastering-atolyesi",
      title: "Mix & Mastering Atölyesi",
      instructor: "Onur Devrim",
      type: "WORKSHOP",
      description:
        "Demo kaydınızı yayına hazır hale getirme: EQ, kompresyon ve loudness.",
      startsAt: daysFromNow(19),
      durationMinutes: 150,
      capacity: 20,
      isPublished: true,
      location: "Zuhal Müzik Stüdyo, Ankara",
    },
    {
      slug: "dijital-platformlarda-yayinlanmak",
      title: "Dijital Platformlarda Yayınlanmak",
      instructor: "Ada Yücel",
      type: "WEBINAR",
      description:
        "Distribütör seçimi, metadata, çalma listelerine girme ve telif takibi.",
      startsAt: daysFromNow(27),
      durationMinutes: 60,
      capacity: null,
      isPublished: false,
      location: null,
    },
  ];

  for (const event of events) {
    const created = await prisma.event.upsert({
      where: { slug: event.slug },
      update: {},
      create: event,
    });

    const existingRegistrations = await prisma.eventRegistration.count({
      where: { eventId: created.id },
    });
    if (existingRegistrations > 0) continue;

    const attendeeCount = Math.min(
      created.capacity ?? 25,
      8 + Math.floor(random() * 12),
    );

    for (let index = 0; index < attendeeCount; index += 1) {
      const user = members[(index * 3 + attendeeCount) % members.length]!;
      await prisma.eventRegistration.upsert({
        where: { eventId_userId: { eventId: created.id, userId: user.id } },
        update: {},
        create: {
          eventId: created.id,
          userId: user.id,
          status: index % 9 === 0 ? "WAITLIST" : "REGISTERED",
          registeredAt: daysAgo(12 - (index % 12)),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Kuponlar
  // -------------------------------------------------------------------------
  const couponDefs = [
    {
      title: "Zuhal Müzik %15 İndirim",
      codePrefix: "ZM15",
      discountType: "PERCENT",
      discountValue: 15,
      trigger: "APPLICATION_SUBMITTED",
      description: "Başvurusunu tamamlayan her gruba tanımlanır.",
    },
    {
      title: "Atölye Katılımcısı 250 TL",
      codePrefix: "ATOLYE",
      discountType: "AMOUNT",
      discountValue: 250,
      trigger: "EVENT_ATTENDED",
      description: "Atölyeye katılan üyelere verilir.",
    },
  ];

  for (const def of couponDefs) {
    const existing = await prisma.coupon.findFirst({ where: { title: def.title } });
    if (existing) continue;

    const coupon = await prisma.coupon.create({
      data: { ...def, validUntil: daysFromNow(120) },
    });

    for (let index = 0; index < 12; index += 1) {
      const user = members[(index * 5) % members.length]!;
      await prisma.userCoupon.create({
        data: {
          couponId: coupon.id,
          userId: user.id,
          code: `${coupon.codePrefix}-${String(1000 + index)}`,
          usedAt: index % 4 === 0 ? daysAgo(3) : null,
          sourceType: "MANUAL",
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // SSS ve arşiv
  // -------------------------------------------------------------------------
  const faqs = [
    {
      question: "Hackathon kaç saat sürüyor?",
      answer: "42 saat kesintisiz. Cuma akşamı başlıyor, pazar öğleden sonra final gecesiyle bitiyor.",
    },
    {
      question: "Grup olarak mı başvurmam gerekiyor?",
      answer: "Grup başvurusu esas. Grup üye sayısı sınırları başvuru formunda belirtiliyor.",
    },
    {
      question: "Enstrümanımı getirmem gerekiyor mu?",
      answer: "Stüdyo temel ekipmanı sağlıyor; kendi enstrümanınızı getirmeniz tavsiye edilir.",
    },
    {
      question: "Atölyelere katılmak ücretli mi?",
      answer: "Hayır. Atölyeler üyelere ücretsiz, yalnızca kontenjan sınırı var.",
    },
  ];

  for (const [index, faq] of faqs.entries()) {
    const existing = await prisma.faqItem.findFirst({
      where: { question: faq.question },
    });
    if (!existing) {
      await prisma.faqItem.create({ data: { ...faq, order: index } });
    }
  }

  for (const year of [2023, 2024, 2025]) {
    const existing = await prisma.archiveEntry.count({ where: { year } });
    if (existing > 0) continue;

    for (let rank = 1; rank <= 3; rank += 1) {
      await prisma.archiveEntry.create({
        data: {
          year,
          groupName: `${pick(GROUP_NAMES)} (${year})`,
          rank,
          songTitle: `Final Şarkısı ${year}-${rank}`,
          order: rank,
        },
      });
    }
  }

  await prisma.siteSetting.upsert({
    where: { key: "countdown_target" },
    update: {},
    create: {
      key: "countdown_target",
      value: daysFromNow(45).toISOString(),
    },
  });

  console.log("Seed tamam.");
  console.log(`  Admin girişi: admin@muzikhackathon.com / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
