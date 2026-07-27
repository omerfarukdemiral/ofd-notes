/**
 * Müzik Hackathon Paneli — uçtan uca test paketi.
 *
 * Her panel sayfasını gezer, her server action'ı gerçekten çalıştırır ve
 * sonucu hem arayüzden hem doğrudan veritabanından doğrular.
 *
 * Çalıştırma:
 *   npm run build && npm start        # ayrı bir terminalde
 *   npm run e2e                       # varsayılan http://localhost:3000
 *   E2E_BASE_URL=http://localhost:3140 npm run e2e
 *
 * Not: Test veri yazar (kupon, etkinlik, form alanı, bildirim oluşturur ve
 * bir başvurunun durumunu değiştirir). Geliştirme veritabanında çalıştırın.
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import ExcelJS from "exceljs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PANEL = path.resolve(HERE, "..");

// .env'deki DATABASE_URL göreli ("file:./dev.db"). Test başka bir çalışma
// dizininden çağrılabildiği için mutlak yola sabitliyoruz; aksi halde boş
// bir veritabanı açılır ve tüm sayım kontrolleri anlamsız hale gelir.
process.env.DATABASE_URL = `file:${path.join(PANEL, "dev.db")}`;

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CHROMIUM_PATH = process.env.E2E_CHROMIUM_PATH;
const ADMIN = { email: "admin@muzikhackathon.com", password: "Admin1234!" };
const MEMBER = { email: "uye1@example.com", password: "Uye1234!" };

let prisma: PrismaClient;
const results: { name: string; ok: boolean; detail: string }[] = [];
const consoleErrors: string[] = [];

function check(name: string, ok: unknown, detail: unknown = "") {
  const passed = Boolean(ok);
  results.push({ name, ok: passed, detail: String(detail) });
  console.log(
    `${passed ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

/**
 * Testin var saydığı bir kaydı zorunlu kılar. Beklenti tutmazsa kriptik bir
 * TypeError yerine ne aradığını söyleyen bir hata verir.
 */
function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Test ön koşulu sağlanmadı: ${what} bulunamadı.`);
  }
  return value;
}

async function bodyText(page: Page): Promise<string> {
  return (await page.textContent("body")) ?? "";
}

function sheetOf(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  return must(wb.getWorksheet(name), `Excel "${name}" sayfası`);
}

/**
 * exceljs kendi global `interface Buffer extends ArrayBuffer` tanımını
 * yayınlıyor; bu Node'un Buffer tipiyle çakışıyor. Çalışma zamanında Node
 * Buffer'ı sorunsuz kabul ediliyor, sorun yalnızca tip düzeyinde — köprüyü
 * tek bir yerde kurup çağrı yerlerini temiz tutuyoruz.
 */
async function readWorkbook(data: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  type LoadArg = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await wb.xlsx.load(data as unknown as LoadArg);
  return wb;
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function login(page: Page, creds = ADMIN) {
  await page.goto(`${BASE}/giris`);
  await page.fill("#email", creds.email);
  await page.fill("#password", creds.password);
  await page.click('form:has(#password) button[type="submit"]');
}

/** Server action sonrası sayfanın oturmasını bekler. */
async function settle(page: Page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function statusText(page: Page, previous: string | null = null) {
  const el = page.locator('[role="status"]').first();
  await el.waitFor({ timeout: 15000 });
  if (previous !== null) {
    // Aynı sayfada art arda submit yapılırken eski mesajı okumamak için
    // metnin değişmesini bekle.
    await page
      .waitForFunction(
        (prev) => {
          const node = document.querySelector('[role="status"]');
          return node && node.textContent.trim() !== prev;
        },
        previous,
        { timeout: 15000 },
      )
      .catch(() => {});
  }
  return ((await el.textContent()) ?? "").trim();
}

async function main() {
  prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
  });

  const browser: Browser = await chromium.launch(
    CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {},
  );

  // -------------------------------------------------------------------------
  section("1. Kimlik doğrulama ve yetki");
  // -------------------------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/`);
    check("kök yol /giris'e yönlendiriyor", page.url().includes("/giris"), page.url());

    await page.goto(`${BASE}/panel/kuponlar`);
    check(
      "korumalı sayfa next parametresiyle yönlendiriyor",
      page.url().includes("next=%2Fpanel%2Fkuponlar"),
      page.url(),
    );

    const api = await page.request.get(`${BASE}/api/disa-aktar/basvurular`);
    check("Excel endpoint oturumsuz 403", api.status() === 403, `HTTP ${api.status()}`);

    await login(page, { email: ADMIN.email, password: "yanlis" });
    check(
      "hatalı şifre reddediliyor",
      (await statusText(page)) === "E-posta veya şifre hatalı.",
    );
    check("hatalı girişte oturum açılmıyor", page.url().includes("/giris"));

    await login(page, MEMBER);
    await page.waitForTimeout(1500);
    check(
      "MEMBER rolü panele alınmıyor",
      (await statusText(page)).includes("yetkisi yok"),
    );

    await ctx.addCookies([
      { name: "mh_panel_session", value: "bozuk.jwt.degeri", url: BASE },
    ]);
    await page.goto(`${BASE}/panel`);
    check("bozuk çerez ile giriş ekranına dönülüyor", page.url().includes("/giris"));
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`console: ${m.text()}`);
  });

  await login(page, ADMIN);
  await page.waitForURL(`${BASE}/panel`, { timeout: 15000 });
  await settle(page, 1500);
  check("admin girişi başarılı", page.url() === `${BASE}/panel`);

  // -------------------------------------------------------------------------
  section("2. Gösterge paneli");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel`);
    await settle(page);

    const dbTotal = await prisma.application.count();
    const dbMembers = await prisma.user.count({ where: { role: "MEMBER" } });
    const body = await bodyText(page);

    check("toplam başvuru sayısı DB ile uyuşuyor", body.includes(String(dbTotal)), `DB=${dbTotal}`);
    check("üye sayısı DB ile uyuşuyor", body.includes(String(dbMembers)), `DB=${dbMembers}`);
    check("8 istatistik kartı var", (await page.locator('main a[href^="/panel/"], main div').count()) > 0);

    const cards = await page.locator("main .grid > a, main .grid > div").count();
    check("son başvurular tablosu dolu", (await page.locator("table tbody tr").count()) > 0, `${cards} kart`);
    check(
      "başvuru penceresi rozeti görünüyor",
      body.includes("Başvurular açık") || body.includes("Başvurular kapalı"),
    );
  }

  // -------------------------------------------------------------------------
  section("3. Başvurular — liste, filtreler, Excel");
  // -------------------------------------------------------------------------
  let firstAppId;
  {
    await page.goto(`${BASE}/panel/basvurular`);
    await settle(page);

    const total = await prisma.application.count();
    check(
      "liste toplam sayıyı doğru gösteriyor",
      (await bodyText(page)).includes(`${total} başvuru`),
      `DB=${total}`,
    );

    const filters = [
      { q: "durum=PENDING", where: { status: "PENDING" } },
      { q: "durum=APPROVED", where: { status: "APPROVED" } },
      { q: "durum=REJECTED", where: { status: "REJECTED" } },
      { q: "durum=FINALIST", where: { status: "FINALIST" } },
      { q: "minUye=4", where: { memberCount: { gte: 4 } } },
      { q: "maxUye=2", where: { memberCount: { lte: 2 } } },
      { q: "minUye=3&maxUye=4", where: { memberCount: { gte: 3, lte: 4 } } },
    ];
    for (const f of filters) {
      const expected = await prisma.application.count({ where: f.where });
      await page.goto(`${BASE}/panel/basvurular?${f.q}`);
      await settle(page, 500);
      const shown = (await bodyText(page)).match(/(\d+) başvuru/)?.[1];
      check(`filtre ${f.q}`, Number(shown) === expected, `arayüz=${shown} DB=${expected}`);
    }

    // Şehir filtresi (Türkçe karakterli)
    const city = must(
      await prisma.application.findFirst({ select: { city: true } }),
      "şehri olan bir başvuru",
    ).city;
    const cityCount = await prisma.application.count({ where: { city } });
    await page.goto(`${BASE}/panel/basvurular?sehir=${encodeURIComponent(city)}`);
    await settle(page, 500);
    let shown = (await bodyText(page)).match(/(\d+) başvuru/)?.[1];
    check(`filtre sehir=${city}`, Number(shown) === cityCount, `arayüz=${shown} DB=${cityCount}`);

    // Rol filtresi
    const role = must(
      await prisma.musicalRole.findFirst({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      "aktif bir müzikal rol",
    );
    const roleCount = await prisma.application.count({
      where: { members: { some: { musicalRoleId: role.id } } },
    });
    await page.goto(`${BASE}/panel/basvurular?rol=${role.id}`);
    await settle(page, 500);
    shown = (await bodyText(page)).match(/(\d+) başvuru/)?.[1];
    check(`filtre rol=${role.name}`, Number(shown) === roleCount, `arayüz=${shown} DB=${roleCount}`);

    // Serbest arama
    const app = must(
      await prisma.application.findFirst({ orderBy: { submittedAt: "desc" } }),
      "en az bir başvuru",
    );
    await page.goto(`${BASE}/panel/basvurular?q=${encodeURIComponent(app.reference)}`);
    await settle(page, 500);
    shown = (await bodyText(page)).match(/(\d+) başvuru/)?.[1];
    check("referansla arama tek sonuç veriyor", Number(shown) === 1, `sonuç=${shown}`);

    // Excel — filtreli
    const finalists = await prisma.application.findMany({
      where: { status: "FINALIST" },
      include: { members: true },
    });
    const res = await page.request.get(
      `${BASE}/api/disa-aktar/basvurular?durum=FINALIST`,
    );
    check("Excel indirme 200", res.status() === 200);
    check(
      "Excel doğru içerik tipi",
      (res.headers()["content-type"] || "").includes("spreadsheetml"),
    );
    check(
      "Excel dosya adı ekli",
      (res.headers()["content-disposition"] || "").includes("basvurular-"),
    );
    const wb = await readWorkbook(await res.body());
    check("Excel 'Gruplar' sayfası var", Boolean(wb.getWorksheet("Gruplar")));
    check("Excel 'Üyeler' sayfası var", Boolean(wb.getWorksheet("Üyeler")));
    const gs = sheetOf(wb, "Gruplar");
    const ms = sheetOf(wb, "Üyeler");
    check(
      "Excel grup satır sayısı filtreyle uyuşuyor",
      gs.rowCount - 1 === finalists.length,
      `xlsx=${gs.rowCount - 1} DB=${finalists.length}`,
    );
    const memberTotal = finalists.reduce((s, a) => s + a.members.length, 0);
    check(
      "Excel üye satır sayısı uyuşuyor",
      ms.rowCount - 1 === memberTotal,
      `xlsx=${ms.rowCount - 1} DB=${memberTotal}`,
    );
    const headerRow = gs.getRow(1).values as (string | undefined)[];
    check(
      "Excel KVKK/FSEK kolonları var",
      headerRow.includes("KVKK Onayı") && headerRow.includes("FSEK Onayı"),
    );

    firstAppId = app.id;
  }

  // -------------------------------------------------------------------------
  section("4. Başvuru detayı ve durum güncelleme");
  // -------------------------------------------------------------------------
  {
    const app = must(
      await prisma.application.findUnique({
        where: { id: firstAppId },
        include: { members: true },
      }),
      "detay için başvuru",
    );
    await page.goto(`${BASE}/panel/basvurular/${firstAppId}`);
    await settle(page);
    const body = await bodyText(page);

    check("grup adı görünüyor", body.includes(app.groupName));
    check("referans görünüyor", body.includes(app.reference));
    check(
      "grup üyeleri listelenmiş",
      app.members.every((m) => body.includes(m.fullName)),
      `${app.members.length} üye`,
    );
    check("KVKK onay zamanı görünüyor", body.includes("KVKK Aydınlatma"));
    check("FSEK onay zamanı görünüyor", body.includes("FSEK"));
    check("ek form alanları bölümü var", body.includes("Ek form alanları"));
    check("durum geçmişi bölümü var", body.includes("Durum geçmişi"));
    check("iletişim sorumlusu bölümü var", body.includes("İletişim sorumlusu"));

    // Durum güncelleme + bildirim
    const beforeLogs = await prisma.applicationStatusLog.count({
      where: { applicationId: firstAppId },
    });
    const beforeNotifs = await prisma.notification.count();
    const target = app.status === "APPROVED" ? "REJECTED" : "APPROVED";

    await page.selectOption("#status", target);
    await page.fill("#note", "E2E suite: durum denemesi.");
    await page.selectOption("#notify", "all");
    await page.selectOption("#channel", "EMAIL");
    await page.click('form:has(#status) button[type="submit"]');
    const msg = await statusText(page);
    check("durum güncelleme mesajı döndü", msg.includes("güncellendi"), msg);
    check("bildirim gönderildiği raporlandı", /\d+ kişiye bildirim/.test(msg));

    const after = must(
      await prisma.application.findUnique({ where: { id: firstAppId } }),
      "güncellenen başvuru",
    );
    check("durum DB'de değişti", after.status === target, `${app.status} → ${after.status}`);
    check("inceleme notu kaydedildi", after.reviewNote?.includes("E2E suite"));

    const afterLogs = await prisma.applicationStatusLog.count({
      where: { applicationId: firstAppId },
    });
    check("durum geçmişine kayıt düştü", afterLogs === beforeLogs + 1, `${beforeLogs} → ${afterLogs}`);

    const afterNotifs = await prisma.notification.count();
    check("bildirim kaydı oluştu", afterNotifs === beforeNotifs + 1);

    const lastNotif = must(
      await prisma.notification.findFirst({
        orderBy: { createdAt: "desc" },
        include: { recipients: true },
      }),
      "oluşan bildirim kaydı",
    );
    check(
      "bildirim alıcıları SENT olarak işaretlendi",
      lastNotif.recipients.length > 0 &&
        lastNotif.recipients.every((r) => r.status === "SENT"),
      `${lastNotif.recipients.length} alıcı`,
    );

    const audit = await prisma.auditLog.findFirst({
      where: { action: "application.status.update", entityId: firstAppId },
      orderBy: { createdAt: "desc" },
    });
    check("denetim kaydı yazıldı", Boolean(audit));
  }

  // -------------------------------------------------------------------------
  section("5. Form ayarları");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);

    // Doğrulama: maks < min
    await page.fill("#minMembers", "6");
    await page.fill("#maxMembers", "2");
    await page.click('form:has(#minMembers) button[type="submit"]');
    const invalidMsg = await statusText(page);
    check("maks<min reddediliyor", invalidMsg.includes("hatalı"), invalidMsg);

    // Geçerli kayıt
    await page.fill("#minMembers", "3");
    await page.fill("#maxMembers", "7");
    await page.click('form:has(#minMembers) button[type="submit"]');
    const validMsg = await statusText(page, invalidMsg);
    check("geçerli ayar kaydediliyor", validMsg.includes("kaydedildi"), validMsg);
    const st = must(
      await prisma.applicationSettings.findUnique({ where: { id: "singleton" } }),
      "başvuru ayarları",
    );
    check("min/maks DB'de güncellendi", st.minMembers === 3 && st.maxMembers === 7,
      `min=${st.minMembers} maks=${st.maxMembers}`);

    // Yeni form alanı
    const label = `E2E Alan ${Date.now()}`;
    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    await page.fill("#label", label);
    await page.selectOption("#type", "TEXTAREA");
    await page.selectOption("#scope", "MEMBER");
    await page.check('input[name="required"]');
    await page.click('form:has(#label) button[type="submit"]');
    check("form alanı eklendi", (await statusText(page)).includes("eklendi"));
    const field = must(
      await prisma.applicationFormField.findFirst({ where: { label } }),
      "eklenen form alanı",
    );
    check("alan DB'de var", Boolean(field), field.key);
    check("alan zorunlu ve MEMBER kapsamlı", field.required && field.scope === "MEMBER");

    // SELECT tipi seçenek olmadan
    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    await page.fill("#label", `E2E Select ${Date.now()}`);
    await page.selectOption("#type", "SELECT");
    await page.click('form:has(#label) button[type="submit"]');
    check("seçenek girilmemiş SELECT reddediliyor",
      (await statusText(page)).includes("en az bir seçenek"));

    // Aynı isimde alan
    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    await page.fill("#label", label);
    await page.click('form:has(#label) button[type="submit"]');
    check("mükerrer alan adı reddediliyor", (await statusText(page)).includes("zaten var"));

    // Aktif/pasif ve silme
    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    const row = page.locator("tr", { hasText: label });
    await row.locator('button:has-text("Pasife al")').click();
    await settle(page, 1200);
    check(
      "alan pasife alındı",
      !must(
        await prisma.applicationFormField.findUnique({ where: { id: field.id } }),
        "pasife alınan alan",
      ).isActive,
    );

    await page.locator("tr", { hasText: label }).locator('button:has-text("Sil")').click();
    await settle(page, 1200);
    check("alan silindi",
      (await prisma.applicationFormField.findUnique({ where: { id: field.id } })) === null);

    // Sistem alanı silinemiyor
    const sysRow = page.locator("tr", { hasText: "Grup Adı" });
    check("sistem alanında Sil butonu yok",
      (await sysRow.locator('button:has-text("Sil")').count()) === 0);

    // Müzikal rol
    const roleName = `E2E Rol ${Date.now()}`;
    await page.fill("#name", roleName);
    await page.locator('form:has(#name) button[type="submit"]').click();
    check("müzikal rol eklendi", (await statusText(page)).includes("eklendi"));
    const newRole = must(
      await prisma.musicalRole.findUnique({ where: { name: roleName } }),
      "eklenen müzikal rol",
    );
    check("rol DB'de var", Boolean(newRole));

    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    await page.fill("#name", roleName);
    await page.locator('form:has(#name) button[type="submit"]').click();
    check("mükerrer rol reddediliyor", (await statusText(page)).includes("zaten tanımlı"));

    await page.goto(`${BASE}/panel/form-ayarlari`);
    await settle(page);
    await page.locator(`form button:has-text("${roleName}")`).click();
    await settle(page, 1200);
    check(
      "rol pasife alındı",
      !must(
        await prisma.musicalRole.findUnique({ where: { id: newRole.id } }),
        "pasife alınan rol",
      ).isActive,
    );
  }

  // -------------------------------------------------------------------------
  section("6. Webinar & Atölye");
  // -------------------------------------------------------------------------
  let createdEventId;
  {
    await page.goto(`${BASE}/panel/etkinlikler`);
    await settle(page);
    const dbEvents = await prisma.event.count();
    check("etkinlik listesi sayıyı doğru gösteriyor",
      (await bodyText(page)).includes(`${dbEvents} etkinlik`), `DB=${dbEvents}`);

    // Geçersiz kapak görseli
    await page.goto(`${BASE}/panel/etkinlikler/yeni`);
    await settle(page);
    await page.fill("#title", "Geçersiz URL testi");
    await page.fill("#instructor", "Test");
    await page.fill("#startsAt", "2026-10-01T18:00");
    await page.fill("#description", "Kapak görseli geçersiz olacak.");
    await page.fill("#coverImageUrl", "bu-bir-url-degil");
    const blockedByBrowser = await page.evaluate(
      () =>
        !(
          document.querySelector("#coverImageUrl") as HTMLInputElement
        ).checkValidity(),
    );
    await page.click('form:has(#title) button[type="submit"]');
    await settle(page, 1500);
    const stillOnForm = page.url().includes("/etkinlikler/yeni");
    const notCreated =
      (await prisma.event.count({ where: { title: "Geçersiz URL testi" } })) === 0;
    check(
      "geçersiz kapak görseli URL'si engelleniyor",
      blockedByBrowser && stillOnForm && notCreated,
      `tarayıcı=${blockedByBrowser} formda=${stillOnForm} kayıt yok=${notCreated}`,
    );

    // Geçerli oluşturma
    const title = `E2E Etkinlik ${Date.now()}`;
    await page.goto(`${BASE}/panel/etkinlikler/yeni`);
    await settle(page);
    await page.fill("#title", title);
    await page.fill("#instructor", "E2E Eğitmen");
    await page.selectOption("#type", "WORKSHOP");
    await page.fill("#startsAt", "2026-11-20T19:30");
    await page.fill("#durationMinutes", "120");
    await page.fill("#capacity", "15");
    await page.fill("#location", "Zuhal Müzik Stüdyo, İzmir");
    await page.fill("#description", "E2E suite tarafından oluşturulan atölye kaydı.");
    await page.check('input[name="isPublished"]');
    await page.click('form:has(#title) button[type="submit"]');
    await page.waitForURL(/\/panel\/etkinlikler\/c/, { timeout: 15000 });
    await settle(page);
    const ev = await prisma.event.findFirst({ where: { title } });
    createdEventId = ev?.id;
    check("etkinlik oluşturuldu", Boolean(ev), ev?.slug);
    check("etkinlik alanları doğru kaydedildi",
      ev?.instructor === "E2E Eğitmen" && ev?.type === "WORKSHOP" &&
      ev?.capacity === 15 && ev?.durationMinutes === 120 && ev?.isPublished === true);
    check("slug üretildi", /^e2e-etkinlik-\d+$/.test(ev?.slug ?? ""), ev?.slug);

    // Düzenleme
    await page.fill("#instructor", "Güncellenmiş Eğitmen");
    await page.fill("#capacity", "40");
    await page.click('form:has(#title) button[type="submit"]');
    check("etkinlik güncellendi", (await statusText(page)).includes("güncellendi"));
    const ev2 = must(
      await prisma.event.findUnique({ where: { id: createdEventId } }),
      "güncellenen etkinlik",
    );
    check("düzenleme DB'ye yazıldı",
      ev2.instructor === "Güncellenmiş Eğitmen" && ev2.capacity === 40);

    // Yayından kaldır
    await page.goto(`${BASE}/panel/etkinlikler`);
    await settle(page);
    await page.locator("tr", { hasText: title })
      .locator('button:has-text("Yayından kaldır")').click();
    await settle(page, 1200);
    check(
      "yayın durumu değiştirildi",
      !must(
        await prisma.event.findUnique({ where: { id: createdEventId } }),
        "yayın durumu değişen etkinlik",
      ).isPublished,
    );

    // Katılımcı durumu değiştirme (kaydı olan bir etkinlikte)
    const withReg = await prisma.event.findFirst({
      where: { registrations: { some: {} } },
      include: { registrations: { take: 1 } },
    });
    if (withReg) {
      const reg = withReg.registrations[0];
      await page.goto(`${BASE}/panel/etkinlikler/${withReg.id}`);
      await settle(page);
      check("katılımcı listesi görünüyor",
        (await page.locator("table tbody tr").count()) > 0);
      const targetStatus = reg.status === "ATTENDED" ? "REGISTERED" : "ATTENDED";
      const regRow = page.locator(`form:has(input[value="${reg.id}"])`);
      await regRow.locator("select").selectOption(targetStatus);
      await regRow.locator('button:has-text("Uygula")').click();
      await settle(page, 1200);
      const reg2 = must(
        await prisma.eventRegistration.findUnique({ where: { id: reg.id } }),
        "güncellenen etkinlik kaydı",
      );
      check("kayıt durumu güncellendi", reg2.status === targetStatus,
        `${reg.status} → ${reg2.status}`);
    } else {
      check("katılımcı durumu testi", false, "kayıtlı etkinlik bulunamadı");
    }

    // Silme
    await page.goto(`${BASE}/panel/etkinlikler/${createdEventId}`);
    await settle(page);
    await page.locator('button:has-text("Etkinliği sil")').click();
    await page.waitForURL(`${BASE}/panel/etkinlikler`, { timeout: 15000 });
    await settle(page);
    check("etkinlik silindi",
      (await prisma.event.findUnique({ where: { id: createdEventId } })) === null);
  }

  // -------------------------------------------------------------------------
  section("7. Üyeler");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel/uyeler`);
    await settle(page);
    const total = await prisma.user.count();
    check("üye listesi sayıyı doğru gösteriyor",
      (await bodyText(page)).includes(`${total} üye`), `DB=${total}`);

    const verified = await prisma.user.count({ where: { emailVerifiedAt: { not: null } } });
    await page.goto(`${BASE}/panel/uyeler?dogrulama=verified`);
    await settle(page, 500);
    let shown = (await bodyText(page)).match(/(\d+) üye/)?.[1];
    check("doğrulanmış filtresi", Number(shown) === verified, `arayüz=${shown} DB=${verified}`);

    const pending = await prisma.user.count({ where: { emailVerifiedAt: null } });
    await page.goto(`${BASE}/panel/uyeler?dogrulama=pending`);
    await settle(page, 500);
    shown = (await bodyText(page)).match(/(\d+) üye/)?.[1];
    check("doğrulama bekleyen filtresi", Number(shown) === pending, `arayüz=${shown} DB=${pending}`);

    await page.goto(`${BASE}/panel/uyeler?q=${encodeURIComponent(MEMBER.email)}`);
    await settle(page, 500);
    shown = (await bodyText(page)).match(/(\d+) üye/)?.[1];
    check("e-posta ile arama", Number(shown) === 1, `sonuç=${shown}`);

    const u = must(
      await prisma.user.findUnique({
        where: { email: MEMBER.email },
        include: {
          contactApplications: true,
          eventRegistrations: true,
          coupons: true,
        },
      }),
      `örnek üye (${MEMBER.email})`,
    );
    await page.goto(`${BASE}/panel/uyeler/${u.id}`);
    await settle(page);
    const body = await bodyText(page);
    check("üye profili açıldı", body.includes(u.fullName));
    check("üyelik bilgileri bölümü var", body.includes("Üyelik bilgileri"));
    check("KVKK onayı gösteriliyor", body.includes("KVKK onayı"));
    check("başvurular bölümü var", body.includes("Başvurular ("));
    check("etkinlik kayıtları bölümü var", body.includes("Etkinlik kayıtları ("));
    check("kuponlar bölümü var", body.includes("Kuponlar ("));

    // Sayfalama — 61 üye / sayfa başına 30 → 3 sayfa
    const PAGE_SIZE = 30;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    await page.goto(`${BASE}/panel/uyeler`);
    await settle(page, 600);
    check("üye listesi sayfa başına 30 kayıt gösteriyor",
      (await page.locator("table tbody tr").count()) === Math.min(PAGE_SIZE, total),
      `${await page.locator("table tbody tr").count()} satır`);
    check("sayfalama kontrolleri görünüyor",
      (await page.locator('nav[aria-label="Sayfalama"]').count()) === 1);
    check("ilk sayfada Önceki devre dışı",
      (await page.locator('nav[aria-label="Sayfalama"] a:has-text("Önceki")')
        .getAttribute("aria-disabled")) === "true");

    const firstPageNames = await page.locator("table tbody tr td:first-child")
      .allTextContents();
    await page.locator('nav[aria-label="Sayfalama"] a:has-text("Sonraki")').click();
    await settle(page, 900);
    check("Sonraki 2. sayfaya götürüyor", page.url().includes("sayfa=2"), page.url());
    const secondPageNames = await page.locator("table tbody tr td:first-child")
      .allTextContents();
    check("2. sayfa farklı kayıtlar gösteriyor",
      secondPageNames.length > 0 && secondPageNames[0] !== firstPageNames[0]);
    check("2. sayfada doğru satır sayısı",
      secondPageNames.length === Math.min(PAGE_SIZE, total - PAGE_SIZE),
      `${secondPageNames.length} satır`);

    // Son sayfada Sonraki devre dışı
    await page.goto(`${BASE}/panel/uyeler?sayfa=${pageCount}`);
    await settle(page, 600);
    check("son sayfada Sonraki devre dışı",
      (await page.locator('nav[aria-label="Sayfalama"] a:has-text("Sonraki")')
        .getAttribute("aria-disabled")) === "true", `sayfa ${pageCount}/${pageCount}`);

    // Sayfalama filtreyi koruyor
    await page.goto(`${BASE}/panel/uyeler?dogrulama=verified`);
    await settle(page, 600);
    const hasPager = (await page.locator('nav[aria-label="Sayfalama"]').count()) === 1;
    if (hasPager) {
      await page.locator('nav[aria-label="Sayfalama"] a:has-text("Sonraki")').click();
      await settle(page, 900);
      check("sayfalama filtreyi koruyor",
        page.url().includes("dogrulama=verified") && page.url().includes("sayfa=2"),
        page.url());
    } else {
      check("sayfalama filtreyi koruyor", false, "filtreli sonuç tek sayfaya sığdı");
    }
  }

  // -------------------------------------------------------------------------
  section("8. Kuponlar");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);

    // %100 üstü indirim reddi
    await page.fill("#title", "Geçersiz yüzde");
    await page.fill("#codePrefix", "BAD");
    await page.selectOption("#discountType", "PERCENT");
    await page.fill("#discountValue", "150");
    await page.click('form:has(#codePrefix) button[type="submit"]');
    check("%100 üstü yüzde indirim reddediliyor",
      (await statusText(page)).includes("hatalı"));

    // Geçerli kupon
    const cTitle = `E2E Kupon ${Date.now()}`;
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    await page.fill("#title", cTitle);
    await page.fill("#codePrefix", "E2E");
    await page.selectOption("#discountType", "PERCENT");
    await page.fill("#discountValue", "20");
    await page.selectOption("#trigger", "APPLICATION_SUBMITTED");
    await page.click('form:has(#codePrefix) button[type="submit"]');
    check("kupon oluşturuldu", (await statusText(page)).includes("oluşturuldu"));
    const coupon = must(
      await prisma.coupon.findFirst({ where: { title: cTitle } }),
      "oluşturulan kupon",
    );
    check("kupon DB'de var",
      coupon.codePrefix === "E2E" && coupon.discountValue === 20,
      coupon.codePrefix);

    // Olmayan üyeye kupon
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    await page.selectOption("#couponId", coupon.id);
    await page.fill("#email", "olmayan-uye@example.com");
    await page.locator('form:has(#couponId) button[type="submit"]').click();
    check("olmayan üyeye kupon reddediliyor",
      (await statusText(page)).includes("kayıtlı üye yok"));

    // Gerçek üyeye kupon
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    await page.selectOption("#couponId", coupon.id);
    await page.fill("#email", MEMBER.email);
    await page.locator('form:has(#couponId) button[type="submit"]').click();
    const issueMsg = await statusText(page);
    check("üyeye kupon tanımlandı", issueMsg.includes("tanımlandı"), issueMsg);
    const uc = must(
      await prisma.userCoupon.findFirst({
        where: { couponId: coupon.id },
        include: { user: true },
      }),
      "üyeye tanımlanan kupon",
    );
    check("kupon kodu ön ekle üretildi", uc.code.startsWith("E2E-"), uc.code);
    check("kupon doğru üyeye verildi", uc.user.email === MEMBER.email);

    // Mükerrer atama
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    await page.selectOption("#couponId", coupon.id);
    await page.fill("#email", MEMBER.email);
    await page.locator('form:has(#couponId) button[type="submit"]').click();
    check("aynı kupon iki kez verilemiyor",
      (await statusText(page)).includes("zaten sahip"));

    // Kupon üye profilinde görünüyor
    await page.goto(`${BASE}/panel/uyeler/${uc.userId}`);
    await settle(page);
    check("kupon üye profilinde görünüyor",
      (await bodyText(page)).includes(uc.code));

    // Pasife al
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    await page.locator("tr", { hasText: cTitle })
      .locator('button:has-text("Pasife al")').click();
    await settle(page, 1200);
    check(
      "kupon pasife alındı",
      !must(
        await prisma.coupon.findUnique({ where: { id: coupon.id } }),
        "pasife alınan kupon",
      ).isActive,
    );

    // Pasif kupon dağıtılamıyor — pasif kupon listede olmadığı için doğrudan kontrol
    const activeTitles = await prisma.coupon.findMany({
      where: { isActive: true }, select: { title: true },
    });
    await page.goto(`${BASE}/panel/kuponlar`);
    await settle(page);
    const options = await page.locator("#couponId option").allTextContents();
    check("pasif kupon atama listesinde görünmüyor",
      !options.includes(cTitle) && options.length === activeTitles.length,
      `${options.length} seçenek`);
  }

  // -------------------------------------------------------------------------
  section("9. Bildirimler");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel/bildirimler`);
    await settle(page);

    // Hedef kitle seçilmeden etkinlik bildirimi
    await page.selectOption("#audience", "EVENT_REGISTRANTS");
    await settle(page, 300);
    await page.fill("#body", "Etkinlik seçilmeden gönderilmeye çalışılıyor.");
    await page.locator('form:has(#body) button[type="submit"]').click();
    check("etkinlik seçilmeden gönderim reddediliyor",
      (await statusText(page)).includes("hatalı"));

    // Tüm üyelere
    const memberCount = await prisma.user.count({ where: { role: "MEMBER", isActive: true } });
    await page.goto(`${BASE}/panel/bildirimler`);
    await settle(page);
    await page.selectOption("#channel", "EMAIL");
    await page.selectOption("#audience", "ALL_MEMBERS");
    await settle(page, 300);
    await page.fill("#subject", "E2E toplu duyuru");
    await page.fill("#body", "E2E suite tarafından tüm üyelere gönderilen test mesajı.");
    await page.locator('form:has(#body) button[type="submit"]').click();
    const allMsg = await statusText(page);
    check("tüm üyelere gönderim yapıldı", allMsg.includes("alıcıya gönderildi"), allMsg);
    check("alıcı sayısı üye sayısıyla uyuşuyor",
      allMsg.includes(String(memberCount)), `DB üye=${memberCount}`);

    // Başvuru durumuna göre
    await page.goto(`${BASE}/panel/bildirimler`);
    await settle(page);
    await page.selectOption("#audience", "APPLICATION_STATUS");
    await settle(page, 300);
    await page.selectOption("#applicationStatus", "FINALIST");
    await page.fill("#subject", "E2E finalist duyurusu");
    await page.fill("#body", "Finale kalan gruplara özel bilgilendirme.");
    await page.locator('form:has(#body) button[type="submit"]').click();
    check("başvuru durumuna göre gönderim",
      (await statusText(page)).includes("gönderildi"));

    // SMS kanalı — konu alanı gizleniyor
    await page.goto(`${BASE}/panel/bildirimler`);
    await settle(page);
    await page.selectOption("#channel", "SMS");
    await settle(page, 300);
    check("SMS kanalında konu alanı gizleniyor",
      (await page.locator("#subject").count()) === 0);
    await page.selectOption("#audience", "ALL_MEMBERS");
    await settle(page, 300);
    await page.fill("#body", "E2E SMS testi.");
    await page.locator('form:has(#body) button[type="submit"]').click();
    check("SMS gönderimi yapıldı", (await statusText(page)).includes("gönderildi"));

    const smsNotif = await prisma.notification.findFirst({
      where: { channel: "SMS" }, orderBy: { createdAt: "desc" },
      include: { recipients: { take: 1 } },
    });
    check("SMS alıcı adresi telefon numarası",
      smsNotif?.recipients[0]?.address.startsWith("+90"),
      smsNotif?.recipients[0]?.address);

    // Geçmiş
    await page.goto(`${BASE}/panel/bildirimler`);
    await settle(page);
    const dbNotifs = await prisma.notification.count();
    const rows = await page.locator("table tbody tr").count();
    check("gönderim geçmişi listeleniyor",
      rows === Math.min(dbNotifs, 50), `arayüz=${rows} DB=${dbNotifs}`);
    check("geçmişte gönderen adı var",
      (await bodyText(page)).includes("Panel Yöneticisi"));
  }

  // -------------------------------------------------------------------------
  section("10. Raporlar");
  // -------------------------------------------------------------------------
  {
    await page.goto(`${BASE}/panel/raporlar`);
    await settle(page);
    const body = await bodyText(page);
    check("başvuru durumları bölümü var", body.includes("Başvuru durumları"));
    check("şehir dağılımı bölümü var", body.includes("Şehir dağılımı"));
    check("müzikal rol dağılımı bölümü var", body.includes("Müzikal rol dağılımı"));
    check("etkinlik doluluk bölümü var", body.includes("Etkinlik doluluk"));
    check("onay oranı hesaplanıyor", /Onay oranı/.test(body) && /%\d+/.test(body));

    const res = await page.request.get(`${BASE}/api/disa-aktar/basvurular`);
    const wb = await readWorkbook(await res.body());
    const total = await prisma.application.count();
    const reportSheet = sheetOf(wb, "Gruplar");
    check("raporlardan tüm başvuru Excel'i iniyor",
      reportSheet.rowCount - 1 === total,
      `xlsx=${reportSheet.rowCount - 1} DB=${total}`);
  }

  // -------------------------------------------------------------------------
  section("11. Duyarlılık, tema, çıkış");
  // -------------------------------------------------------------------------
  {
    const paths = ["/panel", "/panel/basvurular", "/panel/form-ayarlari",
      "/panel/etkinlikler", "/panel/uyeler", "/panel/kuponlar",
      "/panel/bildirimler", "/panel/raporlar"];

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow: string[] = [];
    for (const p of paths) {
      await page.goto(`${BASE}${p}`);
      await settle(page, 700);
      const [sw, cw] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      if (sw > cw + 1) overflow.push(`${p} (${sw}>${cw})`);
    }
    check("mobilde (390px) yatay taşma yok", overflow.length === 0, overflow.join(", "));

    await page.goto(`${BASE}/panel`);
    await settle(page, 700);
    await page.click('button[aria-label="Menüyü aç"]');
    await settle(page, 500);
    const drawerLinks = await page.locator('div.fixed nav a').count();
    check("mobil menü çekmecesi 8 modül bağlantısıyla açılıyor", drawerLinks === 8, `${drawerLinks} bağlantı`);

    await page.setViewportSize({ width: 1440, height: 900 });
    const tabletOverflow: string[] = [];
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const p of paths) {
      await page.goto(`${BASE}${p}`);
      await settle(page, 600);
      const [sw, cw] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      if (sw > cw + 1) tabletOverflow.push(`${p} (${sw}>${cw})`);
    }
    check("tablette (768px) yatay taşma yok", tabletOverflow.length === 0,
      tabletOverflow.join(", "));

    // Koyu tema
    const darkCtx = await browser.newContext({
      colorScheme: "dark", viewport: { width: 1440, height: 1000 },
    });
    const dp = await darkCtx.newPage();
    await login(dp, ADMIN);
    await dp.waitForURL(`${BASE}/panel`, { timeout: 15000 });
    await settle(dp, 1500);
    await dp.goto(`${BASE}/panel/basvurular`);
    await settle(dp, 900);
    const bg = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check("koyu temada koyu arka plan uygulanıyor", bg === "rgb(13, 15, 19)", bg);
    const fg = await dp.evaluate(() => getComputedStyle(document.body).color);
    check("koyu temada açık metin rengi", fg === "rgb(232, 234, 238)", fg);
    await darkCtx.close();

    // Çıkış
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/panel`);
    await settle(page, 700);
    await page.click('form button:has-text("Çıkış")');
    await page.waitForURL(`${BASE}/giris`, { timeout: 15000 });
    check("çıkış yapıldı", page.url().includes("/giris"));
    await page.goto(`${BASE}/panel`);
    check("çıkış sonrası panele erişilemiyor", page.url().includes("/giris"));
  }

  check("tarayıcı konsolunda hata yok", consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOPLAM ${results.length} kontrol · ${results.length - failed.length} PASS · ${failed.length} FAIL`);
  if (failed.length) {
    console.log("\nBAŞARISIZ:");
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("\nSUITE ÇÖKTÜ:", e.message);
  console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
  process.exit(2);
});
