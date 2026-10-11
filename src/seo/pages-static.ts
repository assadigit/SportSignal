// SportSignal — static trust pages (Phase 3, P-21..P-25): /about,
// /methodology, /contact, /privacy, /terms, /data (F-13/G-10 docs),
// the human /sitemap page (P-20) and the custom 404 (R-11).
// All content is factual: what the site really does, what data it really
// uses. The owner's own Persian texts (from the existing homepage about box)
// are reused verbatim. Legal text is accurate + flagged for owner review.

import { SEO, absUrl } from "./config";
import { esc } from "./utils";
import type { SeoCtx } from "./data";
import { teamsIndex, compsIndex, upcomingBig } from "./data";
import * as JL from "./jsonld";
import { buildHead, pageShell } from "./page-shell";
import { toFaDigits } from "../utils";

function staticPage(path: string, title: string, desc: string, h1: string, mainHtml: string, ctx: SeoCtx, opts?: { jsonld?: any[] }): string {
  const trail = [{ name: "خانه", href: "/" }, { name: h1 }];
  return pageShell({
    head: buildHead({
      path, title, description: desc, indexable: true,
      jsonldNodes: [...JL.siteNodes(), ...(opts && opts.jsonld || []), JL.breadcrumbNode(trail)]
    }),
    h1,
    crumbHtml: "",
    mainHtml,
    updatedHtml: M_lastUpdated(ctx)
  });
}
function M_lastUpdated(ctx: SeoCtx): string {
  if (!ctx.fetchedAt) return "";
  return "آخرین به‌روزرسانی داده‌ها: <time datetime=\"" + esc(ctx.fetchedAt) + "\">" + esc(ctx.fetchedAt.slice(0, 10)) + "</time> · <a href=\"/methodology\" class=\"srcline\">منبع داده: " + SEO.DATA_SOURCE_NAME + "</a>";
}

// ---- /about (P-21) — the owner's own story text, verbatim from the site ----
export function buildAboutPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">اسپورت‌سیگنال (SportSignal) یک سایت و ربات تلگرام فارسی است که بازی‌های مهم فوتبال را پیدا می‌کند و تاریخ و ساعت دقیق آن‌ها را به وقت تهران نشان می‌دهد.</div>
<div class="card prose">
<h2>چرا SportSignal ساخته شد؟</h2>
<p>قرار نیست هر مسابقه‌ای را ببینی؛ فقط نباید بازی مهم را از دست بدهی.</p>
<p>من همیشه فوتبال را دوست داشتم، اما نه آن‌قدر که تک‌تک مسابقات را دنبال کنم یا هر هفته بازی‌های لیگ داخلی را ببینم. چیزی که همیشه برایم مهم بود، پیدا کردن بازی‌های بزرگ بود؛ ال‌کلاسیکو، دربی‌های حساس لیگ برتر انگلیس، شب‌های بزرگ لیگ قهرمانان اروپا و هر مسابقه‌ای که ارزش وقت گذاشتن داشته باشد.</p>
<p>مشکل این بود که راه ساده‌ای برای پیدا کردن این بازی‌ها وجود نداشت. یا باید اپلیکیشن‌هایی نصب می‌کردم که پر از اعلان، خبر و حاشیه بودند، یا ساعت‌ها در سایت‌های ورزشی می‌گشتم تا بفهمم بازی مهم بعدی کی و کجاست.</p>
<p>SportSignal از همین‌جا شروع شد.</p>
<p>یک پلتفرم ساده و منتخب برای پیدا کردن مسابقات مهم؛ بدون غرق شدن در اخبار و حاشیه‌ها. فقط بازی‌هایی که واقعاً ارزش دیدن دارند.</p>
<p>چون بازی‌های بزرگ فوتبال فقط ۹۰ دقیقه مسابقه نیستند؛ لحظه‌هایی هستند که میلیون‌ها نفر را، فارغ از اینکه کجا زندگی می‌کنند، به هم وصل می‌کنند.</p>
<p>فرقی نمی‌کند از ایران باشی، استرالیا یا ژاپن. وقتی رئال مادرید و بارسلونا به مصاف هم می‌روند، همه می‌دانیم که یک بازی مهم در راه است.</p>
<p>SportSignal ساخته شد تا کمک کند آن لحظه‌ها را از دست ندهی.</p>
<h2>چطور کار می‌کند؟</h2>
<p>داده‌های مسابقات به‌صورت خودکار و هر چند دقیقه یک‌بار از منابع رسمی داده فوتبال دریافت و به‌روزرسانی می‌شود. ساعت همه بازی‌ها به وقت تهران (و همچنین زمان جهانی) نمایش داده می‌شود و هر بازی صفحه اختصاصی خودش را دارد.</p>
<p>ربات تلگرام SportSignal هم همین اطلاعات را قبل از بازی‌های بزرگ برای اعضا ارسال می‌کند: <a href="https://t.me/SportSignalAlertsBot" rel="noopener">@SportSignalAlertsBot</a></p>
</div>`;
  return staticPage("/about", "درباره SportSignal | چه کسی و چرا این سایت را ساخته", "اسپورت‌سیگنال چه هست، چه کسی آن را می‌سازد، هر چند وقت یک‌بار به‌روزرسانی می‌شود و چطور با ما در تماس باشید.", "درباره SportSignal", main, ctx);
}

// ---- /methodology (P-22, G-08) — the REAL rules from the code ----
export function buildMethodologyPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">در SportSignal هر بازی «بزرگ» نیست. این صفحه به زبان ساده توضیح می‌دهد یک بازی دقیقاً چه زمانی وارد سایت می‌شود، داده‌ها از کجا می‌آیند و اگر اشتباهی دیدید چطور گزارشش کنید.</div>
<div class="card prose">
<h2>یک بازی چه زمانی «بزرگ» محسوب می‌شود؟</h2>
<p>قاعده سایت ساده است و همان چیزی است که در کد برنامه هم نوشته شده:</p>
<h3>۱. لیگ‌های داخلی</h3>
<p>از لیگ برتر انگلیس، لالیگای اسپانیا، سری‌آی ایتالیا، بوندسلیگای آلمان و لیگ یک فرانسه، فقط بازی‌هایی دنبال می‌شوند که حداقل یکی از دو تیمش جزو تیم‌های منتخب همین سایت باشد؛ تیم‌هایی مثل آرسنال، چلسی، منچستریونایتد، منچسترسیتی، لیورپول، بارسلونا، رئال مادرید، اتلتیکومادرید، اینتر، آث میلان، پاری‌سن‌ژرمن، بایرن مونیخ و بروسیا دورتموند.</p>
<h3>۲. لیگ قهرمانان اروپا و جام‌های حذفی</h3>
<p>در لیگ قهرمانان اروپا، لیگ اروپا، لیگ کنفرانس و جام‌های حذفی (جام حذفی انگلیس، کارابائوکاپ، کوپادل‌ری، کوپایتالیا و جام حذفی آلمان)، بازی دنبال می‌شود اگر حداقل یکی از تیم‌ها از همان فهرست تیم‌های منتخب باشد، یا بازی به مرحله یک‌چهارم نهایی یا بعد از آن رسیده باشد.</p>
<h3>۳. بازی‌هایی که در صفحه اول برجسته می‌شوند</h3>
<p>در بالای صفحه اصلی، بازی‌هایی بزرگ‌تر نمایش داده می‌شوند: دربی‌های معروف (مثل ال‌کلاسیکو، دربی منچستر، دربی مادرید، دربی میلان، کلاسیکر آلمان و…)، دیدارهای دو تیم صدر جدول، و بازی‌های دو تیم منتخب. همچنین جدول خلیج فارس ایران هم برای دنبال‌کردن هواداران فوتبال ایران نمایش داده می‌شود.</p>
<h2>داده‌ها از کجا می‌آید؟</h2>
<p>داده‌های مسابقات از سرویس‌های داده فوتبال <a href="${SEO.DATA_SOURCE_URL}" rel="noopener">${SEO.DATA_SOURCE_NAME}</a> (منبع اصلی)، به‌همراه منابع پشتیبان دریافت می‌شود. هیچ داده‌ای دستی یا حدسی وارد سایت نمی‌شود؛ فقط چیزی نمایش داده می‌شود که منبع داده واقعاً ارائه کرده باشد.</p>
<h2>داده‌ها هر چند وقت به‌روز می‌شوند؟</h2>
<p>برنامه‌های بازی به‌صورت خودکار و مکرر بررسی و به‌روزرسانی می‌شوند و نتیجه بازی‌های در جریان تقریباً هر ۱۰ دقیقه یک‌بار تازه می‌شود. زمان «آخرین به‌روزرسانی» در بالای صفحات نمایش داده می‌شود.</p>
<h2>اگر اشتباهی دیدید</h2>
<p>هیچ سیستمی بی‌خطا نیست. اگر تاریخ، ساعت یا نتیجه‌ای اشتباه است، از <a href="/contact">صفحه تماس</a> خبر دهید تا پس از بررسی و تطبیق با منبع داده، اصلاح شود. خطاهای داده با اولویت اصلاح می‌شوند و سیاست ما شفاف‌گویی درباره‌ی خطاست، نه پنهان‌کردن آن.</p>
<h2>ساعت‌ها به چه منطقه زمانی هستند؟</h2>
<p>ساعت همه بازی‌ها به وقت تهران (به‌علاوه زمان جهانی) نمایش داده می‌شود. تاریخ‌ها هم میلادی و هم شمسی نشان داده می‌شوند.</p>
</div>`;
  return staticPage("/methodology", "روش کار — چطور بازی بزرگ انتخاب می‌شود | SportSignal", "معیار دقیق انتخاب بازی‌های بزرگ در SportSignal، منبع داده‌ها، دوره به‌روزرسانی و سیاست اصلاح خطاها.", "روش کار SportSignal", main, ctx);
}

// ---- /contact (P-23) ----
export function buildContactPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">سریع‌ترین راه ارتباط با SportSignal، ربات تلگرام است. پیشنهادها، انتقادها و گزارش خطاها همگی خوشآمدند.</div>
<div class="card prose">
<h2>ربات تلگرام</h2>
<p><a href="https://t.me/SportSignalAlertsBot" rel="noopener">@SportSignalAlertsBot</a> — عضو شوید، بازی‌های بزرگ را قبل از شروع دریافت کنید و از همین طریق پیام بدهید.</p>
<h2>گزارش خطا در داده‌ها</h2>
<p>اگر تاریخ، ساعت یا نتیجه بازی‌ای اشتباه است، از ربات خبر دهید؛ جزئیات در <a href="/methodology">روش کار</a> آمده است.</p>
</div>`;
  return staticPage("/contact", "تماس با SportSignal | گزارش خطا و بازخورد", "راه‌های ارتباط با SportSignal: ربات تلگرام و گزارش خطاهای داده از طریق تماس.", "تماس با ما", main, ctx);
}

// ---- /privacy (P-24) — accurate to what the site really does ----
export function buildPrivacyPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">این سایت کوکی ردیابی، ابزار آمارگیر شخص ثالث یا اسکریپت ردیابی ندارد. تنها چیزی که شمارش می‌شود، یک شمارنده ساده و بدون کوکی برای بازدید صفحات است. آخرین به‌روزرسانی این متن: اکتبر ۲۰۲۶.</div>
<div class="card prose">
<h2>شمارنده بازدید (بدون کوکی)</h2>
<p>در پابرگ هر صفحه یک شمارنده کوچک نشان داده می‌شود: «بازدید امروز» و «بازدید کل». این شمارنده به این شکل کار می‌کند: هر بار که یک صفحه در یک مرورگر واقعی بارگذاری می‌شود، یک درخواست کوچک (beacon) به همان نشانی سایت ارسال می‌شود و یک عدد کلی برای آن روز (به وقت تهران) یکی افزایش می‌یابد. <strong>هیچ کوکی، نشانی IP، اثر انگشت مرورگر یا هر داده شخصی دیگری استفاده یا ذخیره نمی‌شود</strong> — فقط مجموع اعداد نگهداری می‌شود.</p>
<p>روبات‌های موتور جستجو (Googlebot، bingbot، GPTBot، ClaudeBot و موارد مشابه) به‌صورت خودکار شناسایی و شمارش نمی‌شوند تا اعداد واقعی بازدید انسانی را نشان دهند. شمارش در پس‌زمینه و بدون تأثیر بر سرعت بارگذاری صفحه انجام می‌شود.</p>
<h2>چه داده‌ای ذخیره نمی‌شود؟</h2>
<p>صفحات عمومی SportSignal برای بازدیدکننده‌ها هیچ داده شخصی ذخیره نمی‌کنند؛ نه کوکی تبلیغاتی، نه ردیاب، نه نشانی IP، نه اثر انگشت، نه پروفایل کاربر. سرویس زیرساخت سایت (کلادفلر) به‌صورت استاندارد و مانند همه سایت‌ها برخی اطلاعات فنی درخواست را برای ارائه سرویس و مقابله با حملات ثبت می‌کند که در کنترل این سایت نیست و برای شمارنده بازدید استفاده نمی‌شود.</p>
<h2>اعضای ربات تلگرام</h2>
<p>برای کسانی که در ربات تلگرام عضو می‌شوند، فقط شناسه تلگرام و تنظیمات اعلان (تیم‌های موردعلاقه و زبان) نگهداری می‌شود تا همان اعلان‌ها ارسال شود. این داده‌ها با هیچ شخص ثالثی به اشتراک گذاشته نمی‌شود و هر زمان با حذف ربات، عضویت قطع می‌شود.</p>
<h2>داده‌های مسابقات</h2>
<p>اطلاعات بازی‌ها از منابع عمومی داده فوتبال دریافت می‌شود و ماهیت شخصی ندارد.</p>
<h2>پنل مدیریت</h2>
<p>ورود به بخش مدیریت با رمز عبور محافظت می‌شود و برای عموم در دسترس نیست. آمار بازدید در پنل مدیریت به‌صورت مجموع روزانه نمایش داده می‌شود.</p>
</div>`;
  return staticPage("/privacy", "حریم خصوصی | SportSignal", "سیاست حریم خصوصی SportSignal: شمارنده ساده و بدون کوکی بازدید صفحات، بدون نشانی IP، بدون اثر انگشت، بدون داده شخصی.", "حریم خصوصی", main, ctx);
}

// ---- /terms (P-24) ----
export function buildTermsPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">خلاصه ساده: اطلاعات این سایت «همین‌طور که هست» ارائه می‌شود؛ قبل از تصمیم‌های مهم (مثل خرید بلیت یا تنظیم یادآور) ساعت را از منبع رسمی مسابقات هم چک کنید.</div>
<div class="card prose">
<h2>استفاده از سایت</h2>
<p>محتوای SportSignal برای استفاده شخصی آزاد است. مسئولیت تصمیم‌هایی که بر اساس اطلاعات این سایت گرفته می‌شود با کاربر است.</p>
<h2>دقت داده‌ها</h2>
<p>داده‌ها از منابع رسمی داده فوتبال دریافت و خودکار به‌روزرسانی می‌شوند، اما هیچ سیستمی بی‌خطا نیست. تاریخ، ساعت و نتیجه بازی‌ها می‌تواند موقتاً نادرست یا قدیمی باشد. برای موارد حیاتی، منبع رسمی مسابقات را نیز بررسی کنید.</p>
<h2>نشان‌ها و لوگوها</h2>
<p>نشان باشگاه‌ها و لیگ‌ها متعلق به مالکان آن‌هاست و در این سایت فقط در قالبی که منبع داده ارائه کرده نمایش داده می‌شود.</p>
<h2>تغییرات</h2>
<p>این شرایط ممکن است به‌روزرسانی شود؛ تاریخ آخرین تغییر در بالای همین صفحه آمده است.</p>
</div>`;
  return staticPage("/terms", "شرایط استفاده | SportSignal", "شرایط استفاده از SportSignal: ارائه اطلاعات «همان‌طور که هست» و توصیه به بررسی منبع رسمی برای موارد حیاتی.", "شرایط استفاده", main, ctx);
}

// ---- /data (F-13/G-10) — documents the machine endpoints ----
export function buildDataPage(ctx: SeoCtx): string {
  const main = `
<div class="answercard">داده‌های بازی‌های بزرگ SportSignal به‌صورت ماشین‌خوان هم در دسترس است: تقویم، فید و JSON — همه با ساعت جهانی (ISO 8601).</div>
<div class="card prose">
<h2>فایل‌های ماشین‌خوان</h2>
<ul>
<li><a href="/calendar.ics">/calendar.ics</a> — تقویم iCalendar بازی‌های بزرگ پیش‌رو (ساعت‌ها UTC؛ مخصوص تقویم گوگل/اپل).</li>
<li><a href="/feed.xml">/feed.xml</a> — فید Atom تازه‌ترین تغییرات.</li>
<li><a href="/api/matches.json">/api/matches.json</a> — داده JSON بازی‌های بزرگ پیش‌رو و نتایج اخیر (عمومی، فقط-خواندنی، CORS باز).</li>
<li><a href="/llms.txt">/llms.txt</a> — معرفی کوتاه سایت برای دستیارهای هوش مصنوعی.</li>
</ul>
<h2>قواعد استفاده</h2>
<p>استفاده از داده‌ها با ذکر منبع (SportSignal) مجاز است. داده‌های پایه از ${SEO.DATA_SOURCE_NAME} و منابع پشتیبان دریافت می‌شود؛ شرایط استفاده منبع اصلی داده نیز در مورد داده‌های خام اعمال می‌شود. لطفاً بیش از یک درخواست در ثانیه نفرستید.</p>
<h2>فیلدهای JSON</h2>
<p>هر بازی شامل: شناسه، تیم میزبان و میهمان (نام انگلیسی و فارسی)، زمان شروع UTC (ISO 8601)، کد رقابت، مرحله، وضعیت (scheduled / live / finished)، ورزشگاه (در صورت وجود) و نتیجه (پس از پایان).</p>
</div>`;
  return staticPage("/data", "داده‌های باز و ماشین‌خوان | SportSignal", "تقویم iCal، فید Atom و JSON عمومی بازی‌های بزرگ فوتبال در SportSignal — همراه شرایط استفاده و ذکر منبع.", "داده‌های ماشین‌خوان", main, ctx);
}

// ---- /sitemap human page (P-20) ----
export function buildHumanSitemapPage(ctx: SeoCtx): string {
  const teams = teamsIndex(ctx).slice(0, 60);
  const comps = compsIndex(ctx);
  const upcomingCount = upcomingBig(ctx).length;
  let main = `
<div class="answercard">نقشه کامل صفحات SportSignal — همه صفحه‌ها از همین‌جا در دسترس‌اند.</div>
<div class="card prose">
<h2>صفحه‌های اصلی</h2>
<ul class="hubgrid">
<li><a class="hubtile" href="/"><span class="t">خانه</span><span class="d">بازی بزرگ بعدی و شمارش معکوس</span></a></li>
<li><a class="hubtile" href="/matches"><span class="t">بازی‌ها</span><span class="d">${toFaDigits(String(upcomingCount))} بازی بزرگ پیش‌رو</span></a></li>
<li><a class="hubtile" href="/matches/today"><span class="t">امروز</span><span class="d">بازی‌های بزرگ امروز</span></a></li>
<li><a class="hubtile" href="/matches/tomorrow"><span class="t">فردا</span><span class="d">بازی‌های بزرگ فردا</span></a></li>
<li><a class="hubtile" href="/matches/this-week"><span class="t">این هفته</span><span class="d">برنامه ۷ روز آینده</span></a></li>
<li><a class="hubtile" href="/matches/this-weekend"><span class="t">آخر هفته</span><span class="d">بازی‌های شنبه و یکشنبه</span></a></li>
</ul>
<h2>درباره سایت</h2>
<ul>
<li><a href="/about">درباره SportSignal</a></li>
<li><a href="/methodology">روش انتخاب بازی‌ها</a></li>
<li><a href="/contact">تماس</a></li>
<li><a href="/data">داده‌های ماشین‌خوان</a></li>
<li><a href="/privacy">حریم خصوصی</a></li>
<li><a href="/terms">شرایط استفاده</a></li>
</ul>
<h2>تیم‌ها</h2>
<ul>
${teams.map((t) => '<li><a href="/teams/' + t.slug + '">' + esc(t.faName || t.name) + "</a></li>").join("")}
</ul>
<h2>رقابت‌ها</h2>
<ul>
${comps.map((c) => '<li><a href="/competitions/' + c.slug + '">' + esc(c.next && c.next.s.competition.faName || c.code) + "</a></li>").join("")}
</ul>
</div>`;
  return staticPage("/sitemap", "نقشه سایت | همه صفحه‌های SportSignal", "فهرست همه صفحه‌های SportSignal: بازی‌ها، تیم‌ها، رقابت‌ها و صفحه‌های اطلاعاتی.", "نقشه سایت", main, ctx);
}

// ---- 404 (R-11) ----
export function build404Page(ctx: SeoCtx): string {
  const main = `
<div class="pagenotfound card">
<h1>صفحه پیدا نشد</h1>
<p class="prose">نشانی‌ای که باز کردید در SportSignal وجود ندارد یا حذف شده است. شاید بازی موردنظرتان در برنامه فعلی نیست.</p>
<ul class="prose">
<li>🏠 <a href="/">صفحه اصلی — بازی بزرگ بعدی</a></li>
<li>📅 <a href="/matches/today">بازی‌های امروز</a></li>
<li>⚽ <a href="/matches">همه بازی‌های بزرگ</a></li>
<li>🔍 <a href="/sitemap">نقشه کامل سایت</a></li>
</ul>
</div>`;
  const trail = [{ name: "خانه", href: "/" }, { name: "صفحه پیدا نشد" }];
  return pageShell({
    head: buildHead({
      path: "/404",
      title: "صفحه پیدا نشد | SportSignal",
      description: "این صفحه در SportSignal وجود ندارد.",
      indexable: false,
      jsonldNodes: [...JL.siteNodes()]
    }),
    h1: "صفحه پیدا نشد",
    crumbHtml: "",
    mainHtml: main,
    updatedHtml: ""
  });
}
