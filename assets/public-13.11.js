/* SportSignal public app JS — v13.6. Extracted from the PUBLIC_PAGE
   template (UCL_BALL + all rendering logic). Edit THIS file; bump the
   filename version when it changes. */
// Complete IANA timezone list (the same set websites ship): Intl.supportedValuesOf
// returns every CLDR zone. Fallback list below covers legacy browsers. Labels
// carry the REAL GMT offset computed from the zone data itself, so fractional
// offsets (Tehran +3:30, Kathmandu +5:45, Chatham +12:45) are always exact.
// v12.19: labels are fully bilingual — Farsi regions/cities from the
// hand-transliterated dictionary below + «گرینویچ+۳:۳۰» in fa mode,
// "Asia/Tehran GMT+3:30" in en mode. Every fixed Etc/GMT±N offset is
// appended so ALL GMT times are pickable, and a ⭐ popular group pins
// Tehran at the very top (the user could not find +3:30 deep in Asia).
var TZ_ALL = [];
var TZ_ANCHOR = Date.UTC(2026, 0, 1);
var TZ_COMMON = ["UTC","Asia/Tehran","Asia/Dubai","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Los_Angeles"];
var FA_TZ_REGION = {africa:"آفریقا",america:"آمریکا",antarctica:"جنوبگان",arctic:"قطب شمال",asia:"آسیا",atlantic:"اقیانوس اطلس",australia:"استرالیا",europe:"اروپا",indian:"اقیانوس هند",pacific:"اقیانوس آرام",us:"آمریکا",etc:"ثابت",general:"عمومی"};
// Hand-transliterated Farsi names for every IANA zone city (key = the zone
// path after the region, lowercased). Multi-segment keys cover the
// Argentina/Indiana/Kentucky/North_Dakota subtrees; bare keys catch the
// legacy aliases of the same zones. Unknown zones fall back to Latin.
var FA_TZ = {
"abidjan":"آبیجان","accra":"آکرا","addis_ababa":"آدیس‌آبابا","algiers":"الجزیره","asmera":"اسمرا","bamako":"باماکو","bangui":"بانگی","banjul":"بانجول","bissau":"بیسائو","blantyre":"بلانتایر","brazzaville":"برازاویل","bujumbura":"بوجومبورا","cairo":"قاهره","casablanca":"کازابلانکا","ceuta":"سئوتا","conakry":"کوناکری","dakar":"داکار","dar_es_salaam":"دارالسلام","djibouti":"جیبوتی","douala":"دوالا","el_aaiun":"العیون","freetown":"فری‌تاون","gaborone":"گابورون","harare":"هراره","johannesburg":"ژوهانسبورگ","juba":"جوبا","kampala":"کامپالا","khartoum":"خارطوم","kigali":"کیگالی","kinshasa":"کینشاسا","lagos":"لاگوس","libreville":"لیبرویل","lome":"لومه","luanda":"لوآندا","lubumbashi":"لوبومباشی","lusaka":"لوزاکا","malabo":"مالابو","maputo":"ماپوتو","maseru":"ماسرو","mbabane":"امبابانه","mogadishu":"موگادیشو","monrovia":"مونروویا","nairobi":"نایروبی","ndjamena":"انجامنا","niamey":"نیامی","nouakchott":"نواکشوت","ouagadougou":"اوآگادوگو","porto-novo":"پورتو‌نووو","sao_tome":"سائوتومه","tripoli":"طرابلس","tunis":"تونس","windhoek":"ویندهوک",
"adak":"آدک","anchorage":"انکریج","anguilla":"آنگویلا","antigua":"آنتیگوا","araguaina":"آراگواینا","aruba":"آروبا","asuncion":"آسونسیون","bahia":"باهیا","bahia_banderas":"باهیا باندراس","barbados":"باربادوس","belem":"بلم","belize":"بلیز","blanc-sablon":"بلان‌سابلون","boa_vista":"بوآویستا","bogota":"بوگوتا","boise":"بوایسی","buenos_aires":"بوئنوس‌آیرس","cambridge_bay":"کمبریج‌بی","campo_grande":"کامپوگرانده","cancun":"کانکون","caracas":"کاراکاس","catamarca":"کاتامارکا","cayenne":"کاین","cayman":"کیمن","chicago":"شیکاگو","chihuahua":"چیواوا","ciudad_juarez":"سیودادخوارز","coral_harbour":"کورال‌هاربر","cordoba":"کوردوبا","costa_rica":"کاستاریکا","coyhaique":"کویایکه","creston":"کرستون","cuiaba":"کویابا","curacao":"کوراسائو","danmarkshavn":"دانمارکسهاون","dawson":"داوسون","dawson_creek":"داوسون‌کریک","denver":"دنور","detroit":"دیترویت","dominica":"دومینیکا","edmonton":"ادمونتون","eirunepe":"ایرونپه","el_salvador":"السالوادور","fort_nelson":"فورت‌نلسون","fortaleza":"فورتالزا","glace_bay":"گلیس‌بی","godthab":"گودهاب","goose_bay":"گوزبی","grand_turk":"گرندترک","grenada":"گرنادا","guadeloupe":"گوادلوپ","guatemala":"گواتمالا","guayaquil":"گوایاکیل","guyana":"گویان","halifax":"هالیفاکس","havana":"هاوانا","hermosillo":"ارمویو","indianapolis":"ایندیاناپلیس","inuvik":"اینوویک","iqaluit":"ایکالویت","jamaica":"جامائیکا","juneau":"ژونو","kralendijk":"کرالندیک","la_paz":"لاپاز","lima":"لیما","los_angeles":"لس‌آنجلس","louisville":"لوئیزویل","lower_princes":"لوئرپرینسز","maceio":"ماسئیو","managua":"ماناگوا","manaus":"مانائوس","marigot":"ماریگو","martinique":"مارتینیک","matamoros":"ماتاموروس","mazatlan":"مازاتلان","mendoza":"مندوزا","menominee":"منومینی","merida":"مریدا","metlakatla":"متلاکاتلا","mexico_city":"مکزیکوسیتی","miquelon":"میکلن","moncton":"مونکتون","monterrey":"مونتری","montevideo":"مونته‌ویدئو","montserrat":"مونتسرات","nassau":"ناسائو","new_york":"نیویورک","nome":"نوم","noronha":"نورونیا","ojinaga":"اوخیناگا","panama":"پاناما","paramaribo":"پاراماریبو","phoenix":"فینیکس","port-au-prince":"پورت‌اوپرنس","port_of_spain":"پورت‌آواسپین","porto_velho":"پورتولو","puerto_rico":"پورتوریکو","punta_arenas":"پونتا آرناس","rankin_inlet":"رنکین‌اینلت","recife":"رسیفی","regina":"رجینا","resolute":"رزولوت","rio_branco":"ریو برانکو","santarem":"سانتارم","santiago":"سانتیاگو","santo_domingo":"سانتو دومینگو","sao_paulo":"سائوپائولو","scoresbysund":"اسکورسبیسوند","sitka":"سیتکا","st_barthelemy":"سن‌بارتلمی","st_johns":"سنت‌جانز","st_kitts":"سنت‌کیتس","st_lucia":"سنت‌لوسیا","st_thomas":"سنت‌توماس","st_vincent":"سنت‌وینسنت","swift_current":"سوئیفت‌کارنت","tegucigalpa":"تگوسیگالپا","thule":"تول","tijuana":"تیخوانا","toronto":"تورنتو","tortola":"تورتولا","vancouver":"ونکوور","whitehorse":"وایتهارس","winnipeg":"وینیپگ","yakutat":"یاکوتات",
"argentina/la_rioja":"لا ریوخا","argentina/rio_gallegos":"ریو گالگوس","argentina/salta":"سالتا","argentina/san_juan":"سان‌خوان","argentina/san_luis":"سان‌لوئیس","argentina/tucuman":"توکومان","argentina/ushuaia":"اوشوایا","argentina/buenos_aires":"بوئنوس‌آیرس","argentina/catamarca":"کاتامارکا","argentina/cordoba":"کوردوبا","argentina/jujuy":"خوخوی","argentina/mendoza":"مندوزا","la_rioja":"لا ریوخا","rio_gallegos":"ریو گالگوس","salta":"سالتا","san_juan":"سان‌خوان","san_luis":"سان‌لوئیس","tucuman":"توکومان","ushuaia":"اوشوایا","jujuy":"خوخوی","catamarca":"کاتامارکا","cordoba":"کوردوبا","mendoza":"مندوزا","buenos_aires":"بوئنوس‌آیرس",
"indiana/knox":"ناکس","indiana/marengo":"مارنگو","indiana/petersburg":"پیترزبورگ","indiana/tell_city":"تل‌سیتی","indiana/vevay":"ویوی","indiana/vincennes":"وینسنس","indiana/winamac":"وینامک","kentucky/monticello":"مونتیچلو","north_dakota/beulah":"بیولا","north_dakota/center":"سنتر","north_dakota/new_salem":"نیوسالم",
"casey":"کیسی","davis":"دیویس","dumontdurville":"دومون‌دورویل","macquarie":"مکواری","mawson":"ماوسون","mcmurdo":"مک‌موردو","palmer":"پالمر","rothera":"روترا","syowa":"شیووا","troll":"ترول","vostok":"وستوک","longyearbyen":"لانگی‌یربین",
"aden":"عدن","almaty":"آلماتی","amman":"امان","anadyr":"آنادیر","aqtau":"آقتاو","aqtobe":"آقتوبه","ashgabat":"عشق‌آباد","atyrau":"آتیراو","baghdad":"بغداد","bahrain":"بحرین","baku":"باکو","bangkok":"بانکوک","barnaul":"بارنائول","beirut":"بیروت","bishkek":"بیشکک","brunei":"برونئی","calcutta":"کلکته","chita":"چیتا","colombo":"کلمبو","damascus":"دمشق","dhaka":"داکا","dili":"دیلی","dubai":"دبی","dushanbe":"دوشنبه","famagusta":"فاماگوستا","gaza":"غزه","hebron":"الخلیل","hong_kong":"هنگ‌کنگ","hovd":"خوود","irkutsk":"ایرکوتسک","jakarta":"جاکارتا","jayapura":"جایاپورا","jerusalem":"قدس","kabul":"کابل","kamchatka":"کامچاتکا","karachi":"کراچی","katmandu":"کاتماندو","khandyga":"خاندیگا","krasnoyarsk":"کراسنویارسک","kuala_lumpur":"کوالالامپور","kuching":"کوچینگ","kuwait":"کویت","macau":"ماکائو","magadan":"مگادان","makassar":"ماکاسار","manila":"مانیل","muscat":"مسقط","nicosia":"نیکوزیا","novokuznetsk":"نووکوزنتسک","novosibirsk":"نووسیبیرسک","omsk":"اومسک","oral":"اورال","phnom_penh":"پنوم‌پن","pontianak":"پونتیاناک","pyongyang":"پیونگ‌یانگ","qatar":"قطر","qostanay":"قوستانای","qyzylorda":"قیزیل‌اوردا","rangoon":"یانگون","riyadh":"ریاض","saigon":"سایگون","sakhalin":"ساخالین","samarkand":"سمرقند","seoul":"سئول","shanghai":"شانگهای","singapore":"سنگاپور","srednekolymsk":"سردنی‌کولیمسک","taipei":"تایپه","tashkent":"تاشکند","tbilisi":"تفلیس","tehran":"تهران","thimphu":"تیمفو","tokyo":"توکیو","tomsk":"تومسک","ulaanbaatar":"اولان‌باتور","urumqi":"ارومچی","ust-nera":"اوست‌نرا","vientiane":"وینتیان","vladivostok":"ولادی‌وستوک","yakutsk":"یاکوتسک","yekaterinburg":"یکاترینبورگ","yerevan":"ایروان",
"azores":"آزور","bermuda":"برمودا","canary":"قناری","cape_verde":"کیپ‌ورد","faeroe":"فارو","madeira":"مادیرا","reykjavik":"ریکیاویک","south_georgia":"جنوب جورجیا","st_helena":"سنت‌هلنا","stanley":"استنلی",
"adelaide":"آدلاید","brisbane":"بریزبن","broken_hill":"بروکن‌هیل","canberra":"کانبرا","darwin":"داروین","eucla":"یوکلا","hobart":"هوبارت","lindeman":"لیندمن","lord_howe":"لرد هاو","melbourne":"ملبورن","perth":"پرت","sydney":"سیدنی",
"amsterdam":"آمستردام","andorra":"آندورا","astrakhan":"آستراخان","athens":"آتن","belgrade":"بلگراد","berlin":"برلین","bratislava":"براتیسلاوا","brussels":"بروکسل","bucharest":"بخارست","budapest":"بوداپست","busingen":"بوزینگن","chisinau":"کیشیناو","copenhagen":"کپنهاگ","dublin":"دوبلین","gibraltar":"جبل‌الطارق","guernsey":"گرنزی","helsinki":"هلسینکی","isle_of_man":"جزیره‌مان","istanbul":"استانبول","jersey":"جرسی","kaliningrad":"کالینینگراد","kiev":"کیف","kirov":"کیروف","lisbon":"لیسبون","ljubljana":"لیوبلیانا","london":"لندن","luxembourg":"لوکزامبورگ","madrid":"مادرید","malta":"مالت","mariehamn":"ماری‌همن","minsk":"مینسک","moscow":"مسکو","monaco":"موناکو","oslo":"اسلو","paris":"پاریس","podgorica":"پودگوریتسا","prague":"پراگ","riga":"ریگا","rome":"رم","samara":"سامارا","san_marino":"سان‌مارینو","sarajevo":"سارایوو","saratov":"ساراتوف","simferopol":"سیمفروپل","skopje":"اسکوپیه","sofia":"صوفیه","stockholm":"استکهلم","tallinn":"تالین","tirane":"تیرانا","ulyanovsk":"اولیانوفسک","vaduz":"فادوتس","vatican":"واتیکان","vienna":"وین","vilnius":"ویلنیوس","volgograd":"ولگوگراد","warsaw":"ورشو","zagreb":"زاگرب","zurich":"زوریخ",
"antananarivo":"آنتاناناریوو","chagos":"چاگوس","christmas":"کریسمس","cocos":"کوکوس","comoro":"کامورو","kerguelen":"کرگولن","mahe":"ماهه","maldives":"مالدیو","mauritius":"موریس","mayotte":"مایوت","reunion":"ریونیون",
"apia":"آپیا","auckland":"اوکلند","bougainville":"بوگنویل","chatham":"چتم","easter":"ایستر","efate":"افاته","enderbury":"اندرتری","fakaofo":"فاکائوفو","fiji":"فیجی","funafuti":"فونافوتی","galapagos":"گالاپاگوس","gambier":"گامبیه","guadalcanal":"گوادالکانال","guam":"گوام","honolulu":"هونولولو","kiritimati":"کیریتیماتی","kosrae":"کوسرای","kwajalein":"کواجالین","majuro":"ماژورو","marquesas":"مارکیزاس","midway":"میدوی","nauru":"نائورو","niue":"نیوئه","norfolk":"نورفولک","noumea":"نومئا","pago_pago":"پاگو پاگو","palau":"پالائو","pitcairn":"پیتکرن","ponape":"پوناپه","port_moresby":"پورت مورسبی","rarotonga":"راروتونگا","saipan":"سایپن","tahiti":"تاهیتی","tarawa":"تاراوا","tongatapu":"تونگاتاپو","truk":"تروک","wake":"ویک","wallis":"والیس"
};
var TZ_INFO = {};
function tzOffsetMin(tz){
  try{
    var p = new Intl.DateTimeFormat("en-US",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(TZ_ANCHOR));
    var m = {};
    for(var i = 0; i < p.length; i++) m[p[i].type] = p[i].value;
    var asUTC = Date.UTC(+m.year, (+m.month) - 1, +m.day, (+m.hour) % 24, +m.minute, +m.second);
    return Math.round((asUTC - TZ_ANCHOR) / 6e4);
  }catch(e){ return null; }
}
function tzGmtLabel(min, lang){
  if(min === null || min !== min) return "";
  var sign = min < 0 ? "-" : "+", abs = Math.abs(min), h = Math.floor(abs / 60), mm = abs % 60;
  if(lang === "fa") return " گرینویچ" + sign + faNum(h) + (mm ? ":" + faNum(mm < 10 ? "0" + mm : "" + mm) : "");
  return " GMT" + sign + h + (mm ? ":" + (mm < 10 ? "0" + mm : "" + mm) : "");
}
function tzPathFa(rest){
  var k = rest.toLowerCase();
  if(FA_TZ[k]) return FA_TZ[k];
  var last = k.slice(k.lastIndexOf("/") + 1);
  if(FA_TZ[last]) return FA_TZ[last];
  return rest.replace(/_/g, " ");
}
function tzOptionLabel(tz, lang){
  if(tz === "UTC") return "UTC";
  if(tz.indexOf("Etc/") === 0){
    if(tz === "Etc/UTC") return lang === "fa" ? "UTC (ثابت)" : "UTC (fixed)";
    var eb = tzGmtLabel(tzOffsetMin(tz), lang).trim() || "GMT";
    return lang === "fa" ? eb + " (ثابت)" : eb + " (fixed)";
  }
  var parts = tz.split("/");
  if(lang === "fa") return (FA_TZ_REGION[parts[0].toLowerCase()] || parts[0]) + "/" + tzPathFa(parts.slice(1).join("/")) + tzGmtLabel(tzOffsetMin(tz), "fa");
  return tz.replace(/_/g, " ") + tzGmtLabel(tzOffsetMin(tz), "en");
}
function tzInfo(tz){
  if(!TZ_INFO[tz]) TZ_INFO[tz] = { value: tz.toLowerCase(), en: tzOptionLabel(tz, "en"), fa: tzOptionLabel(tz, "fa") };
  return TZ_INFO[tz];
}
function buildTzAll(){
  var out = [];
  try{ out = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; }catch(e){ out = []; }
  if(!out.length) out = ["UTC","Asia/Tehran","Europe/London","Europe/Berlin","Europe/Paris","Europe/Rome","Asia/Dubai","Europe/Istanbul","America/New_York","America/Los_Angeles","America/Toronto","Asia/Tokyo","Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Adelaide","Australia/Canberra","Australia/Perth"];
  var seen = {}, list = [];
  out.forEach(function(x){ var s = String(x); if(!seen[s]){ seen[s] = 1; list.push(s); } });
  // v12.19: the full fixed-offset ladder (IANA Etc sign is INVERTED —
  // Etc/GMT+5 is UTC-5) so every pure GMT time from -14 to +14 exists.
  var extra = ["UTC","Etc/UTC","Etc/GMT"];
  for(var u = 1; u <= 14; u++) extra.push("Etc/GMT-" + u);
  for(var w = 1; w <= 14; w++) extra.push("Etc/GMT+" + w);
  extra.forEach(function(x){ if(!seen[x]){ seen[x] = 1; list.push(x); } });
  return list.sort();
}
function curTz(){
  try{ var v = localStorage.getItem("ucl_tz"); if(v){ new Intl.DateTimeFormat("en",{timeZone:v}); return v; } }catch(e){}
  return PAGE_TZ;
}
var fmtDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      // Persian order: weekday، day month-name year (۳۰ مرداد ۱۴۰۵) — fa-IR
      // toLocaleString yields year-first (۱۴۰۵ مرداد ۳۰), which is wrong for Persian.
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",year:"numeric",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+"، "+g("day")+" "+g("month")+" "+g("year")+" ساعت "+g("hour")+":"+g("minute");
    }
    return d.toLocaleString("en-GB",{dateStyle:"full",timeStyle:"short",timeZone:curTz()});
  }
  catch(e){ return new Date(iso).toString(); }
};
// v12.32: the HERO's short date — weekday + day + month ONLY ("Sunday 22
// September"), the run that rides under the big time chip (.kickdate).
// No year, no clock: the chip above already owns the time, and the
// weekday+date answers "WHEN is that" at a glance.
var fmtHeroDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",weekday:"long",timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+" "+g("day")+" "+g("month");
    }
    return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:curTz()});
  }
  catch(e){ return ""; }
};
var faNum = function(n){ return String(n).replace(/[0-9]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹"[d];}); };
var fmtNum = function(n){ return curLang()==="en"?String(n):faNum(n); };
function compName(m){
  if(curLang()==="en") return (I18N.en.comps&&I18N.en.comps[m.competition.code])||m.competition.code;
  return m.competition.faName||m.competition.code;
}
function monogram(t){
  // Future-plan fix (club badges not loading): a failed or missing crest now
  // falls back to a clean two-letter club monogram instead of a bare ⚽.
  // NOTE: this lives inside a template literal — \s+ emits the s+ regex
  // (a single s would be cooked to a literal "s" and split on the letter!).
  var n = String((t && (t.faName || t.name)) || "");
  var w = n.split(/\s+/).filter(Boolean);
  if(!w.length) return "⚽";
  if(w.length === 1) return w[0].substring(0, 2);
  return w[0].substring(0, 1) + w[w.length - 1].substring(0, 1);
}
function logo(t){
  var el = document.createElement("span"); el.className = "logo";
  if(t.crest){
    var img = document.createElement("img");
    img.src = t.crest; img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.onerror = function(){ el.textContent = monogram(t); };
    el.appendChild(img);
  } else { el.textContent = monogram(t); }
  return el;
}
function shareText(m, finished){
  var en = curLang()==="en";
  var h = en ? m.homeTeam.name : (m.homeTeam.faName||m.homeTeam.name);
  var a = en ? m.awayTeam.name : (m.awayTeam.faName||m.awayTeam.name);
  var txt = h + " – " + a + " — " + compName(m);
  if((finished || m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") && m.score && m.score.home!==null) txt += " — " + fmtNum(m.score.home) + ":" + fmtNum(m.score.away);
  return txt + " — " + fmtDate(m.utcDate);
}
var S_ICONS = {
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  wa: '<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  tg: '<path fill="#2AABEE" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M3.5 6l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  check: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 2.5v4M16 2.5v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>',
  dots: '<circle cx="5" cy="12" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="12" r="2.1"/>'
};
function sBtn(tag, href, body, title){
  var el = document.createElement(tag);
  el.className = "sbtn";
  el.title = title; el.setAttribute("aria-label", title);
  if(tag === "a"){ el.href = href; el.target = "_blank"; el.rel = "noopener"; }
  else el.type = "button";
  el.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + body + '</svg>';
  return el;
}
function gcalDates(iso){
  var s = new Date(iso), e = new Date(s.getTime() + 2*60*60*1000);
  var z = function(n){ return n < 10 ? "0"+n : ""+n; };
  var f = function(d){ return "" + d.getUTCFullYear() + z(d.getUTCMonth()+1) + z(d.getUTCDate()) + "T" + z(d.getUTCHours()) + z(d.getUTCMinutes()) + "00Z"; };
  return f(s) + "/" + f(e);
}
function shareRow(m, finished){
  var t = encodeURIComponent(shareText(m, finished));
  var u = encodeURIComponent(location.origin + location.pathname);
  var row = document.createElement("div"); row.className = "share";
  row.appendChild(sBtn("a", "https://wa.me/?text=" + t, S_ICONS.wa, T("share") + " WhatsApp"));
  row.appendChild(sBtn("a", "https://t.me/share/url?url=" + u + "&text=" + t, S_ICONS.tg, T("share") + " Telegram"));
  row.appendChild(sBtn("a", "mailto:?subject=" + t + "&body=" + t, S_ICONS.mail, T("share") + " Email"));
  if(!finished){
    var calU = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + t + "&dates=" + gcalDates(m.utcDate) + "&details=" + t;
    row.appendChild(sBtn("a", calU, S_ICONS.cal, T("cal")));
  }
  var cb = sBtn("button", null, S_ICONS.copy, T("copy"));
  cb.onclick = function(){
    var raw = shareText(m, finished), ok = function(){
      cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.check + '</svg>'; cb.title = T("copied"); cb.setAttribute("aria-label", T("copied"));
      setTimeout(function(){ cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.copy + '</svg>'; cb.title = T("copy"); cb.setAttribute("aria-label", T("copy")); }, 1600);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(raw).then(ok, function(){ fallbackCopy(raw); ok(); });
    } else { fallbackCopy(raw); ok(); }
  };
  row.appendChild(cb);
  // v12.21 (the user's ask): the labeled «Share» pill on every row was visual
  // noise. The toggle is now a QUIET ghost ⋯ — icon-only, borderless, muted,
  // 44×44 hit area; the options unfold in a popover (outside click / Esc /
  // the next ⋯ close it — see closeShare and the document listeners below).
  // aria-expanded + tooltip stay.
  // v12.31: the ⋯ moved to the box's top inline-end corner (see the .sharewrap
  // CSS note) — the icon is 16px and CORNER-ANCHORED so it clears the round
  // crest that hugs that corner on PC (the crest's square corner is empty).
  var wrap = document.createElement("div"); wrap.className = "sharewrap";
  var tg = sBtn("button", null, S_ICONS.dots, T("share"));
  tg.className = "sharetoggle";
  tg.setAttribute("aria-expanded", "false");
  tg.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' + S_ICONS.dots + '</svg>';
  tg.onclick = function(){
    var open = wrap.classList.toggle("open");
    tg.setAttribute("aria-expanded", open ? "true" : "false");
  };
  wrap.appendChild(tg);
  wrap.appendChild(row);
  return wrap;
}
// v12.21: the share popover closes from ANYWHERE — an outside click, Esc, or
// another ⋯ opening — so at most one popover is ever on screen and the
// collapsed rows carry nothing but three quiet dots.
function closeShare(w){
  w.classList.remove("open");
  var t = w.querySelector(".sharetoggle");
  if(t) t.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", function(ev){
  var open = document.querySelectorAll(".sharewrap.open");
  for(var i = 0; i < open.length; i++) if(!open[i].contains(ev.target)) closeShare(open[i]);
});
document.addEventListener("keydown", function(ev){
  if(ev.key === "Escape"){
    var open = document.querySelectorAll(".sharewrap.open");
    for(var i = 0; i < open.length; i++) closeShare(open[i]);
  }
});
function fallbackCopy(text){
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){}
  document.body.removeChild(ta);
}
function countdown(iso){
  var ms = new Date(iso).getTime() - Date.now();
  if(ms <= 0) return T("soon");
  var h = Math.floor(ms/36e5), m = Math.floor(ms%36e5/6e4);
  if(h > 24) return fmt("inDays",fmtNum(Math.floor(h/24)));
  return "⏳ " + fmtNum(h) + ":" + fmtNum(m);
}
// Static local kickoff time — the bigbar is the ONE live countdown; everywhere
// else shows a stable time so the page stays quiet (no per-second reflow).
function fmtKick(iso){
  try{
    var t = new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    return "🕒 " + fmtNum(t);
  }catch(e){ return ""; }
}
function keyOf(m){ return (m.id||"")+"|"+((m.status||"")[0]||"")+(m.score?(m.score.home+"-"+m.score.away):"")+m.utcDate; }
function listSig(list){ var s=""; for(var i=0;i<(list||[]).length;i++) s+=keyOf(list[i])+";"; return s; }
// v12.27 (review item 6): the shared SCORE builder — the winning side's
// number renders as <b> (900 + glow, see .score b), the losing side dims
// (.score .lose); a draw keeps both plain. Used by render() (mrow rows) and
// spotItemNode() (the hero / big-matches / UCL / week boxes) — one anatomy.
function scoreNode(score){
  var vs = document.createElement("div"); vs.className = "score";
  var h = (score.home==null?0:score.home), a = (score.away==null?0:score.away);
  var hEl = document.createElement(h>a ? "b" : "span"); if(h<a) hEl.className = "lose"; hEl.textContent = fmtNum(score.home);
  var sep = document.createElement("span"); sep.className = "sep"; sep.textContent = " - ";
  var aEl = document.createElement(a>h ? "b" : "span"); if(a<h) aEl.className = "lose"; aEl.textContent = fmtNum(score.away);
  vs.appendChild(hEl); vs.appendChild(sep); vs.appendChild(aEl);
  return vs;
}
// v12.27 (review item 8): bidi isolation for Latin club names. Policy (one
// rule, consistently): names are PERSIAN-FIRST — the dict, the AI-learned
// cache and the stem fallback translate everything they can; whatever still
// has no Persian rendering falls back to the Latin provider name, and THAT
// run is wrapped in an isolated <bdi dir="ltr"> so dashes/punctuation next
// to embedded Latin text can never flip order inside the RTL paragraph.
// (In EN mode the page itself is LTR — no wrap needed.)
function nameInto(el, s){
  // v12.x-team-title-tooltip: set the title attribute so hovering a
  // truncated team name shows the full name as a tooltip. The hero
  // card's team names use white-space:nowrap + fluid clamp() font-size
  // (no truncation), but other boxes may truncate long names — the
  // tooltip gives users the full name on hover.
  el.title = s;
  if(curLang()!=="en" && /[A-Za-z]/.test(s) && !/[؀-ۿݐ-ݿﭐ-﷿]/.test(s)){
    el.textContent = "";
    var b = document.createElement("bdi"); b.setAttribute("dir","ltr"); b.textContent = s;
    el.appendChild(b);
  } else { el.textContent = s; }
  return el;
}
function render(list, el, finished){
  var sig0 = listSig(list)+"|"+(finished?1:0);
  if(el.dataset.sig===sig0) return;
  el.dataset.sig=sig0;
  if(el.childElementCount) el.classList.add("stable");
  el.innerHTML = "";
  if(!list || !list.length){ el.innerHTML = "<div class='empty'>"+T("noMatches")+"</div>"; return; }
  list.forEach(function(m, idx){
    var row = document.createElement("div"); row.className = "match";
    if(m.derby) row.className += " derby";
    // v13.35-favs: gold accent on results featuring starred teams.
    if(hasAnyFav(m)) row.className += " hasfav";
    row.style.setProperty("--i", idx);
    var h = logo(m.homeTeam), a = logo(m.awayTeam);
    var en = curLang()==="en";
    var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
    var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
    var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(h); hs.appendChild(hName); hs.appendChild(favStarBtn(m.homeTeam.name));
    var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(a); as.appendChild(favStarBtn(m.awayTeam.name));
    var live = !finished && (m.status==="LIVE"||m.status==="IN_PLAY"||m.status=="PAUSED");
    if((finished || live) && m.score && m.score.home !== null){
      var vs = scoreNode(m.score);
      row.appendChild(hs); row.appendChild(vs); row.appendChild(as);
    } else {
      // v12.25: every unplayed row's center slot carries its kickoff TIME —
      // the same x line the score takes on played rows (one aligned system).
      var kt = document.createElement("div"); kt.className = "kick";
      var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
      kt.appendChild(kc);
      row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
    }
    var info = document.createElement("div"); info.className = "info";
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition.emblem){
      var cimg = document.createElement("img"); cimg.className = "complogo"; cimg.src = m.competition.emblem; cimg.alt = ""; cimg.loading = "lazy"; cimg.decoding = "async";
      cimg.onerror = function(){ this.remove(); };
      c.appendChild(cimg);
    }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
    // v13.35-rounds: cup knockout rounds surface as a chip right after the
    // competition (cups only — league rows carry no round data anyway).
    var rc = roundChip(m);
    if(rc) info.appendChild(rc);
    if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
    if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "🏆 " + T("topBadge"); info.appendChild(tb); }
    info.appendChild(document.createTextNode(fmtDate(m.utcDate)));
    if(live){
      var chip = document.createElement("span"); chip.className = "livechip";
      var dot = document.createElement("span"); dot.className = "dot";
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(T("live")));
      info.appendChild(chip);
      if(m.minute != null){
        var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "ʹ";
        info.appendChild(lmin);
      }
    }
    // v12.25: no kickoff-time chip in the info line anymore — the time rides
    // the row's CENTER slot (.kick) between its own two teams.
    if(live && m.scorers && m.scorers.length){
      var sc = document.createElement("div"); sc.className = "scorers";
      m.scorers.forEach(function(s){
        var row = document.createElement("div"); row.className = "srow";
        var icon = s.type==="PENALTY" ? "🎯" : (s.type==="OWN_GOAL" ? "🥅" : "⚽");
        var lbl = s.type==="PENALTY" ? T("pen") : (s.type==="OWN_GOAL" ? T("own") : "");
        row.textContent = icon + " " + fmtNum(s.minute) + "ʹ ";
        // v12.27 (review item 8): player names are Latin provider strings —
        // the same isolated <bdi dir="ltr"> wrap the club names get.
        if(s.scorer){ var sb = document.createElement("bdi"); sb.setAttribute("dir","ltr"); sb.textContent = s.scorer; row.appendChild(sb); }
        if(lbl) row.appendChild(document.createTextNode(" (" + lbl + ")"));
        var t = scorerTeam(m, s.team);
        if(t) row.appendChild(document.createTextNode(" — " + t));
        sc.appendChild(row);
      });
      info.appendChild(sc);
    }
    if(m.venue){ var vn = document.createElement("span"); vn.className = "venue"; vn.textContent = "🏟️ " + m.venue; info.appendChild(vn); }
    // v12.23: the stray re-append of hs/vs/as that sat here is REMOVED — it
    // re-ordered the row's children after the fact on scored rows and
    // CRASHED the whole render on any unscored row (appendChild(undefined)),
    // dragging the page's data down with it through load()'s catch. The row
    // was already fully assembled at the score branch above.
    // v12.31: the share ⋯ no longer rides the info line (it pushed the
    // centered chips off-center) — it is the box's top inline-end corner.
    var sr = shareRow(m, finished);
    var wrap = document.createElement("div"); wrap.className = "mrow"; wrap.appendChild(row); wrap.appendChild(info); wrap.appendChild(sr);
    el.appendChild(wrap);
  });
}
// ===== v13.35-favs: star your teams =====
// Matches featuring a starred team get a gold accent + a one-tap
// «⭐ منتخب‌ها» filter across every list (big matches, live, week, results).
// Pure client feature: the set lives in localStorage (ss_favs), ZERO KV
// cost, works offline, and the stored keys are the ENGLISH provider names —
// stable across language switches (the FA display name is derived, not
// stored). The bar renders above the first card; with no stars it teaches
// the gesture instead of nagging.
var FAVS = (function(){ try{ var a = JSON.parse(localStorage.getItem("ss_favs") || "[]"); var s = new Set(); (Array.isArray(a)?a:[]).forEach(function(n){ s.add(String(n).toLowerCase()); }); return s; }catch(e){ return new Set(); } })();
var FAV_MODE = (function(){ try{ return localStorage.getItem("ss_favmode") === "1"; }catch(e){ return false; } })();
function favKey(n){ return String(n || "").toLowerCase().trim(); }
function isFavTeam(n){ return FAVS.has(favKey(n)); }
function hasAnyFav(m){ return isFavTeam(m.homeTeam && m.homeTeam.name) || isFavTeam(m.awayTeam && m.awayTeam.name); }
function saveFavs(){ try{ localStorage.setItem("ss_favs", JSON.stringify(Array.from(FAVS))); }catch(e){} }
function toggleFavTeam(name){
  var k = favKey(name);
  if(FAVS.has(k)){ FAVS.delete(k); if(!FAVS.size) setFavMode(false); }
  else FAVS.add(k);
  saveFavs();
  rerenderAll();
}
function setFavMode(on){
  FAV_MODE = !!on;
  try{ localStorage.setItem("ss_favmode", FAV_MODE ? "1" : "0"); }catch(e){}
  rerenderAll();
}
function favFilter(list){ return FAV_MODE && FAVS.size ? (list || []).filter(function(m){ return hasAnyFav(m); }) : (list || []); }
function ensureFavbar(){
  var bar = document.getElementById("favbar");
  if(bar) return bar;
  bar = document.createElement("div");
  bar.id = "favbar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", curLang()==="en" ? "Favorite teams filter" : "فیلتر تیم‌های منتخب");
  var anchor = document.getElementById("liveCard");
  if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
  else { var fc = document.getElementById("finishedCard"); if(fc && fc.parentNode) fc.parentNode.insertBefore(bar, fc); else return null; }
  return bar;
}
function renderFavbar(){
  var bar = ensureFavbar(); if(!bar) return;
  bar.innerHTML = "";
  var en = curLang()==="en";
  bar.classList.toggle("active", FAV_MODE && FAVS.size > 0);
  if(!FAVS.size){
    var hint = document.createElement("div"); hint.className = "favhint";
    hint.textContent = en ? "☆ Tap the star beside a team to pin its matches" : "☆ برای دنبال‌کردن تیم موردعلاقه، روی ستاره کنار نامش بزنید";
    bar.appendChild(hint);
    return;
  }
  var seg = document.createElement("div"); seg.className = "favseg";
  var bFav = document.createElement("button"); bFav.type = "button";
  bFav.className = "favchip fav" + (FAV_MODE ? " on" : "");
  bFav.setAttribute("aria-pressed", FAV_MODE ? "true" : "false");
  bFav.textContent = "⭐ " + (en ? "Favorites" : "منتخب‌ها") + " (" + fmtNum(FAVS.size) + ")";
  bFav.onclick = function(){ if(!FAV_MODE) setFavMode(true); };
  var bAll = document.createElement("button"); bAll.type = "button";
  bAll.className = "favchip all" + (!FAV_MODE ? " on" : "");
  bAll.setAttribute("aria-pressed", !FAV_MODE ? "true" : "false");
  bAll.textContent = en ? "All matches" : "همه بازی‌ها";
  bAll.onclick = function(){ if(FAV_MODE) setFavMode(false); };
  seg.appendChild(bFav); seg.appendChild(bAll);
  bar.appendChild(seg);
}
// v13.35-favs: the per-team star toggle. Sits at the OUTER end of each
// team side (flex order 99) so home/away mirror symmetrically in RTL+LTR.
function favStarBtn(name){
  var b = document.createElement("button");
  b.type = "button";
  var on = isFavTeam(name);
  b.className = "favstar" + (on ? " on" : "");
  b.textContent = on ? "★" : "☆";
  b.setAttribute("aria-pressed", on ? "true" : "false");
  b.setAttribute("aria-label", (curLang()==="en" ? "Favorite team: " : "تیم منتخب: ") + name);
  b.title = b.getAttribute("aria-label");
  b.onclick = function(ev){ ev.stopPropagation(); ev.preventDefault(); toggleFavTeam(name); };
  return b;
}
// v13.35-rounds: the cup-round chip («یک‌هشتم نهایی» / "Round of 16").
// Rendered only when a usable label exists for the CURRENT language —
// FA mode needs roundFa (untranslated Latin labels stay hidden in FA),
// EN mode shows any raw label.
function roundChip(m){
  if(!m) return null;
  var txt = curLang()==="en" ? m.round : (m.roundFa || null);
  if(!txt) return null;
  var el = document.createElement("span");
  el.className = "roundchip";
  el.textContent = txt;
  return el;
}
async function load(){
  // v12.56: show loading animation on all card content areas while fetching
  var loadingIds = ["topSpot","uclSpot","weekBox","standings","cups","finished","liveMatches","ucl"];
  if(!DATA.upcoming.length){ loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.add("card-loading"); addLoadingLottie(el); } }); }
  try{
    var r = await fetch("/api/public-matches");
    if(!r.ok) throw new Error("HTTP " + r.status);
    var d = await r.json();
    DATA = { upcoming: d.upcoming || [], finished: d.finished || [], nextBig: d.nextBig || null, topSpot: d.topSpot || null, thisWeek: d.thisWeek || [], nextWeek: d.nextWeek || [], standings: d.standings || null, cups: d.cups || null, ucl: d.ucl || null, cached: !!d.cached, cachedAt: d.cachedAt || null };
    SYNC_TS = d.fetchedAt ? new Date(d.fetchedAt).getTime() : (d.cachedAt ? new Date(d.cachedAt).getTime() : Date.now());
    applyView();
    updateBigBar();
    renderStandings(d.standings);
    renderCups(d.cups);
    renderUcl(d.ucl);
    renderUclSpot(d.ucl);
    renderTopSpot(d.topSpot);
    renderWeek(d.thisWeek, d.nextWeek);
    renderLive();
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }catch(e){
    ["ucl","standings","cups","finished","liveMatches"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>";
    });
    renderTopSpot(null);
    renderWeek(null);
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }
}
// v13.34-ux: skeleton loaders replace the old rotating-border spinner.
// Each content section gets a SHAPE-MATCHED skeleton (ghost match rows for
// lists, ghost table rows for standings, ghost cards for cups) so the page
// layout settles before data arrives instead of showing a lone spinner.
// Function names (addLoadingLottie/removeLoadingLottie) and the .card-loading
// class contract are preserved — callers are unchanged. The shimmer is a
// background-position animation, auto-disabled by the global
// prefers-reduced-motion rule (skeletons render as static placeholder blocks).
function skelBlock(cls, n){
  var w = document.createElement("div");
  w.className = "skelwrap" + (cls ? " " + cls : "");
  w.setAttribute("aria-hidden", "true");
  for (var i = 0; i < n; i++) w.appendChild(document.createElement("div")).className = "skel";
  return w;
}
function addLoadingLottie(el){
  if(!el || el.querySelector(".skelwrap")) return;
  var old = el.querySelector(".loading-spin"); if(old) old.remove();
  var id = el.id;
  var w;
  if (id === "standings" || id === "ucl") w = skelBlock("skel-tbl", 6);
  else if (id === "cups") w = skelBlock("skel-cards", 3);
  else if (id === "topSpot" || id === "uclSpot") w = skelBlock("skel-hero", 2);
  else w = skelBlock("skel-rows", 4); // upcoming / finished / liveMatches / weekBox
  el.appendChild(w);
}
function removeLoadingLottie(el){
  if(!el) return;
  var w = el.querySelector(".skelwrap"); if(w) w.remove();
  var p = el.querySelector(".loading-spin"); if(p) p.remove();
}
var DATA = { upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [], standings: null, cups: null, cached: false, cachedAt: null };
var FLAGS = { PL: "🏴", PD: "🇪🇸", SA: "🇮🇹", FL1: "🇫🇷", BL1: "🇩🇪", PGL: "🇮🇷" };
// v12.19 (the user's ask): the timezone controls no longer squat in the
// topbar — ONE settings-gear button next to the theme toggle opens this
// popover. Pick a zone (times re-render instantly), click the ✕, the gear
// again, outside, or press Esc to close.
function toggleTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(!p || !b) return;
  var open = !p.classList.contains("open");
  p.classList.toggle("open", open);
  b.setAttribute("aria-expanded", open ? "true" : "false");
  if(open){
    // v12.19: reopening always shows the FULL list — a stale search filter
    // from the previous visit would otherwise hide every other zone.
    var f = document.getElementById("tzfilter");
    if(f && f.value){ f.value = ""; if(f.oninput) f.oninput(); }
    if(f){ try{ f.focus(); }catch(e){} }
  }
}
function closeTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(p) p.classList.remove("open");
  if(b) b.setAttribute("aria-expanded", "false");
}
document.addEventListener("mousedown", function(ev){
  var p = document.getElementById("tzpanel");
  if(!p || !p.classList.contains("open")) return;
  var t = ev.target, inside = false;
  while(t){ if(t === p || t.id === "sbtn"){ inside = true; break; } t = t.parentNode; }
  if(!inside) closeTz();
});
document.addEventListener("keydown", function(ev){ if((ev.key || "") === "Escape") closeTz(); });
function tzGroupLabel(g){
  if(curLang() === "fa"){
    if(g === "Etc") return "⌚ آفست‌های ثابت GMT";
    if(g === "General") return "عمومی";
    return FA_TZ_REGION[g.toLowerCase()] || g;
  }
  if(g === "Etc") return "Fixed GMT offsets";
  if(g === "General") return "General";
  return g;
}
function initTz(){
  var sel = document.getElementById("tzsel");
  if(!sel) return;
  if(!TZ_ALL.length) TZ_ALL = buildTzAll();
  var filter = document.getElementById("tzfilter");
  var gear = document.getElementById("sbtn");
  if(gear){ gear.title = T("tzBtn"); gear.setAttribute("aria-label", T("tzBtn")); }
  var cb = document.getElementById("tzclose");
  if(cb){ cb.title = T("tzClose"); cb.setAttribute("aria-label", T("tzClose")); }
  if(filter) filter.setAttribute("aria-label", T("tzSearch"));
  sel.title = T("tzBtn");
  var render = function(){
    var l = curLang();
    var q = (filter && filter.value || "").trim().toLowerCase();
    sel.innerHTML = "";
    var addGroup = function(label, zones){
      var og = document.createElement("optgroup"); og.label = label;
      zones.forEach(function(tz){
        var inf = tzInfo(tz);
        var lbl = l === "fa" ? inf.fa : inf.en;
        if(q){
          // v12.19: the search matches BOTH scripts — «تهران», "tehran"
          // and "3:30" all find Asia/Tehran.
          var other = (l === "fa" ? inf.en : inf.fa).toLowerCase();
          if(lbl.toLowerCase().indexOf(q) < 0 && other.indexOf(q) < 0 && inf.value.indexOf(q) < 0) return;
        }
        var o = document.createElement("option"); o.value = tz; o.textContent = lbl;
        og.appendChild(o);
      });
      if(og.children.length) sel.appendChild(og);
    };
    // v12.19: the ⭐ popular group pins Tehran/Dubai/London... at the very
    // top — the user could not find Tehran +3:30 buried deep in Asia.
    addGroup(l === "fa" ? "⭐ پرکاربرد" : "⭐ Popular", TZ_COMMON.filter(function(tz){ return TZ_ALL.indexOf(tz) >= 0; }));
    var groups = {};
    TZ_ALL.forEach(function(tz){
      var g = tz.indexOf("/") > 0 ? tz.split("/")[0] : "General";
      (groups[g] = groups[g] || []).push(tz);
    });
    var keys = Object.keys(groups).sort().filter(function(g){ return g !== "Etc" && g !== "General"; });
    if(groups.General) keys.push("General");
    if(groups.Etc) keys.push("Etc");
    keys.forEach(function(g){ addGroup(tzGroupLabel(g), groups[g]); });
    try{ sel.value = curTz(); }catch(e){}
    // v12.x-tz-search-fix: when the filter narrows results, the <select>
    // defaults to a dropdown (size=1) which shows BLANK if curTz() isn't
    // in the filtered list (the user typed 'sydney' but the select shows
    // nothing — they have to click the arrow to see the 1 result). Fix:
    // (1) if the current selection is empty (curTz not in filtered list),
    //     default to the first option so the user immediately sees a result.
    // (2) switch the select to a LISTBOX (size>1) when filtered so ALL
    //     results are visible without clicking the dropdown arrow. When
    //     no filter, keep it a compact dropdown (size=1) so the full 458-
    //     option list doesn't dominate the panel. The listbox size scales
    //     with result count (min 1, max 8 rows).
    if(!sel.value && sel.options.length){ sel.value = sel.options[0].value; }
    var n = sel.options.length;
    sel.size = q ? Math.min(Math.max(n, 1), 8) : 1;
  };
  render();
  if(filter) filter.oninput = render;
  sel.onchange = function(){
    try{ localStorage.setItem("ucl_tz", sel.value); }catch(e){}
    rerenderAll();
    closeTz();
  };
}
function rerenderAll(){
  applyView();
  renderStandings(DATA.standings);
  renderCups(DATA.cups);
  renderUcl(DATA.ucl);
  renderUclSpot(DATA.ucl);
  renderTopSpot(DATA.topSpot);
  renderWeek(DATA.thisWeek, DATA.nextWeek);
  renderLive();
  renderHeroSpot();
  updateBigBar();
}
// v12.18: language switch re-renders the two cards whose dynamic titles/names
// trText() would otherwise clobber (the week card's «هفته بعد» header and the
// UCL table's language-dependent names). v12.19: it also rebuilds the timezone
// popover options — labels swap between «آسیا/تهران گرینویچ+۳:۳۰» and
// "Asia/Tehran GMT+3:30".
var onLang = function(){ renderWeek(DATA.thisWeek, DATA.nextWeek); renderUcl(DATA.ucl); renderHeroSpot(); renderTopSpot(DATA.topSpot); renderLive(); renderFinished(true); renderFavbar(); initTz(); };
// v12.12: catOf/renderSections (and the CAT_CUPS table) are retired — they
// fed the «📅 مسابقات پیش‌رو» sections list, which is gone together with the
// view toggle (the page is always big-only now; the hero + the topspot box
// + the UCL box ARE the presentation).
function matchKey(m){ return String(m.id||"") + "|" + m.utcDate; }
// v12.12: the view toggle is RETIRED — the page is permanently big-only
// («فقط بازی‌های بزرگ», the user's default). The «📅 مسابقات پیش‌رو» list
// card is retired with it: the hero card, the topspot box and the UCL box
// ARE the upcoming presentation. All that remains of the old per-view
// rendering is the finished card — the week's selected-team results.
// v12.32 (the user's ask): "for showing recent result, show the last 5, and
// add a 'more' button that shows the latest 20 match results (do it in pc
// as well)" — the finished card renders the latest FIVE by default with a
// pill expander under the rows; one tap → the latest TWENTY (the server
// cap, raised 12 → 20 this release), the pill flips to collapse. PC and
// phones share the behavior. force=true clears render()'s signature so a
// language switch rebuilds the rows + the pill in the new locale.
var FIN_EXPANDED = false;
var FIN_MIN = 5, FIN_MAX = 20;
// v12.42-livesection: renderLive — filters DATA.upcoming for live matches
// (LIVE/IN_PLAY/PAUSED) and renders them in the #liveCard. The card auto-hides
// (display:none) when no matches are live; shows up to 20 live matches.
// Matches stay here as long as the match status is live. Uses spotItemNode
// (same anatomy as every other match row on the page) with finished:true
// so live scores render in the center slot.
function renderLive(){
  var card = document.getElementById("liveCard"), el = document.getElementById("liveMatches");
  if(!card || !el) return;
  el.innerHTML = "";
  // v13.4-live-css: the h2 carries the breathing green dot (.live-breath CSS)
  // — the CSP-blocked CDN lottie never rendered; this restores the visible badge.
  // animation (a pulsing "LIVE" badge). The <dotlottie-player> is injected
  // once per renderLive call (removed if already present from a previous
  // call). The h2 text node keeps the "مسابقات زنده" heading (the 🔴 emoji
  // is stripped). The Lottie animation replaces the .live-breath CSS dot.
  var h2 = card.querySelector("h2");
  if(h2){
    var oldBreath = h2.querySelector(".live-breath");
    if(oldBreath) oldBreath.remove();
    var breath = document.createElement("span"); breath.className = "live-breath";
    breath.setAttribute("aria-hidden","true");
    h2.insertBefore(breath, h2.firstChild);
    // Strip the 🔴 emoji from the text node (the data-i="hLive" i18n string starts with 🔴)
    h2.childNodes.forEach(function(n){ if(n.nodeType === 3 && n.textContent.indexOf("🔴") !== -1) n.textContent = n.textContent.replace(/🔴s*/g, ""); });
  }
  var live = favFilter((DATA.upcoming || []).filter(function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; }));
  if(!live.length){ card.style.display = "none"; renderFavbar(); return; }
  card.style.display = "";
  live.sort(function(a, b){ return (a.minute||0) - (b.minute||0) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(); });
  live.slice(0, 20).forEach(function(m, idx){ el.appendChild(spotItemNode(m, idx, { finished: true, isLiveCard: true })); });
}
function renderFinished(force){
  var el = document.getElementById("finished"); if(!el) return;
  var list = favFilter(DATA.finished.filter(function(m){ return m.big || m.top || m.clash || m.sel; }));
  if(force) delete el.dataset.sig;
  render(list.slice(0, FIN_EXPANDED ? FIN_MAX : FIN_MIN), el, true);
  var old = el.querySelector(".finmore");
  if(old) old.remove();
  if(list.length > FIN_MIN){
    var b = document.createElement("button");
    b.className = "finmore"; b.type = "button";
    b.textContent = FIN_EXPANDED ? T("lessResults") : T("moreResults");
    b.setAttribute("aria-expanded", FIN_EXPANDED ? "true" : "false");
    b.onclick = function(){ FIN_EXPANDED = !FIN_EXPANDED; renderFinished(false); };
    el.appendChild(b);
  }
}
function applyView(){
  renderFinished(false);
  renderFavbar();
}
// v12.10: renderSpecial removed — the far nextBig fallback card now lives
// in the HERO CARD at the very top (stuck to its countdown bar), not at the
// head of the upcoming list.
function compOf(c){ if(!c) return ""; return curLang()==="en" ? c.name : (c.faName||c.name); }
function firstMatchOf(code){
  var best = null;
  if(!DATA || !DATA.upcoming) return best;
  DATA.upcoming.forEach(function(m){
    if(m.competition && m.competition.code === code && m.status !== "FINISHED" && (!best || m.utcDate < best.utcDate)) best = m;
  });
  return best;
}
function renderStandings(d){
  var el = document.getElementById("standings"); if(!el) return;
  el.innerHTML = "";
  if(!d) return;
  var grid = document.createElement("div"); grid.className = "grid4";
  // v12.5: PGL joins the grid — the Iran card's table moved here.
  // v12.12: A-League (AL) removed (the user's ask) — six boxes remain.
  ["PL","PD","SA","FL1","BL1","PGL"].forEach(function(code){
    var st = d[code], box = document.createElement("div"); box.className = "stbox";
    var h = document.createElement("div"); h.className = "stbox-head";
    // v12.36-enfix: the country-flag emoji prefix (FLAGS[code] + " ") is RETIRED
    // — the user's ask. In English mode the flag emoji rendered as "EN"/"ES"/
    // "IT"/"FR" grey text labels (font fallback) before the league emblem
    // image, which the user found noisy. The league emblem image alone is the
    // brand mark now, bumped ~25% (16px → 20px via .stbox-head img above).
    if(st && st.emblem){ var img = document.createElement("img"); img.src = st.emblem; img.alt = ""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
    h.appendChild(document.createTextNode(compOf(st) || code));
    if(st && st.started === false){
      var first = firstMatchOf(code);
      var ov = document.createElement("div"); ov.className = "stnot-overlay";
      var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
      ov.appendChild(l);
      if(first){
        var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
        trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
        trow.appendChild(document.createTextNode(fmtKick(first.utcDate)));
        ov.appendChild(trow);
      }
      box.appendChild(ov);
    }
    box.appendChild(h);
    if(st && st.teams && st.teams.length){
      // v12.27 (review item 4): the compact grid's Pts COLUMN HEADER — «امتیاز»
      // (T("thPts"), "Pts" in EN) rides its own header row over the numbers,
      // exactly like the full UCL table labels every column.
      var th = document.createElement("div"); th.className = "sthead";
      var thf = document.createElement("span"); thf.className = "sthead-fill";
      var thpl = document.createElement("span"); thpl.className = "stnum ucl-hidem sthead-num"; thpl.textContent = T("thP");
      var thp = document.createElement("span"); thp.className = "sthead-p"; thp.textContent = T("thPts");
      th.appendChild(thf); th.appendChild(thpl); th.appendChild(thp); box.appendChild(th);
      st.teams.forEach(function(t){
        var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
        var p = document.createElement("span"); p.className = "stpos" + (t.pos<=3 ? " top3" : ""); p.textContent = fmtNum(t.pos);
        var n = document.createElement("span"); n.className = "stname"; nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
        var pl = document.createElement("span"); pl.className = "stnum ucl-hidem"; pl.textContent = (t.played == null || isNaN(t.played)) ? "—" : fmtNum(t.played);
        var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
        r.appendChild(p); r.appendChild(n); r.appendChild(pl); r.appendChild(pt);
        box.appendChild(r);
      });
    } else {
      var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("stEmpty");
      box.appendChild(e);
    }
    grid.appendChild(box);
  });
  el.appendChild(grid);
}
function cupBox(c){
  var box = document.createElement("div"); box.className = "cupbox";
  var h = document.createElement("div"); h.className = "cupbox-head";
  if(c.emblem){ var img = document.createElement("img"); img.src = c.emblem; img.alt=""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
  h.appendChild(document.createTextNode(compOf(c) + (c.qualifying ? (curLang()==="en" ? " (Qualifying)" : " (مقدماتی)") : "")));
  var tierEm = c.tier === "gold" ? "🥇 " : c.tier === "silver" ? "🥈 " : c.tier === "bronze" ? "🥉 " : "";
  h.appendChild(document.createTextNode(tierEm));
  box.appendChild(h);
  if(c.next){
    var n = c.next, en = curLang()==="en";
    var m = document.createElement("div"); m.className = "cupmatch";
    var teams = document.createElement("div"); teams.className = "teams";
    var t1 = document.createElement("span"); nameInto(t1, en ? n.homeTeam.name : (n.homeTeam.faName||n.homeTeam.name)); teams.appendChild(t1);
    teams.appendChild(document.createTextNode(" – "));
    var t2 = document.createElement("span"); nameInto(t2, en ? n.awayTeam.name : (n.awayTeam.faName||n.awayTeam.name)); teams.appendChild(t2);
    m.appendChild(teams);
    // v13.35-rounds: the round label («یک‌هشتم نهایی» / "Round of 16") sits
    // between the pairing and the date — the visible half of the FA Cup /
    // EL tier-filtering backlog (the server already hides pre-Round-1 FA
    // noise; now the surviving round is NAMED).
    var rc = roundChip(n);
    if(rc) m.appendChild(rc);
    var live = n.status==="LIVE"||n.status==="IN_PLAY"||n.status==="PAUSED";
    var dt = document.createElement("div"); dt.className = "cupdate";
    if(live){ var sp = document.createElement("span"); sp.className = "live-tag"; sp.textContent = "🔴 "+T("live"); dt.appendChild(sp); }
    else dt.appendChild(document.createTextNode(fmtDate(n.utcDate)));
    m.appendChild(dt);
    box.appendChild(m);
  } else {
    var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("cupsNone");
    box.appendChild(e);
  }
  return box;
}
function renderCups(d){
  var el = document.getElementById("cups"); if(!el) return;
  el.innerHTML = "";
  if(!d || !d.length){ el.innerHTML = "<div class='empty'>"+T("cupsNone")+"</div>"; return; }
  // v12.x-cups-2col: merge ALL domestic cups into ONE shared grid so they
  // pair up in 2-column rows: [Spain][Italy] / [Germany][Iran] / [Eng FA][Eng EFL].
  // Previously each country created its own .cupgrid — single-cup countries
  // (Spain, Italy, Germany, Iran) rendered as full-width single boxes.
  var euro = [], intl = [], dom = {};
  d.forEach(function(c){
    if(c.code === "CL" || c.code === "EL" || c.code === "ECL") euro.push(c);
    else if(c.tier === "gold") intl.push(c);
    else { (dom[c.country||""] = dom[c.country||""] || []).push(c); }
  });
  var groups = [];
  if(euro.length) groups.push({ title: T("tierEurope"), items: euro });
  if(intl.length) groups.push({ title: T("intlCups"), items: intl });
  // Collect all domestic cups in country order (EN, ES, IT, DE, IR) — ONE grid
  var allDom = [];
  ["EN","ES","IT","DE","IR"].forEach(function(cc){ if(dom[cc]) allDom = allDom.concat(dom[cc]); });
  if(allDom.length) groups.push({ title: curLang()==="en" ? "Domestic Cups" : "جام‌های حذفی", items: allDom });
  var frag = document.createElement("div");
  groups.forEach(function(g){
    var t = document.createElement("div"); t.className = "cupgroup-title"; t.textContent = g.title;
    frag.appendChild(t);
    var grid = document.createElement("div"); grid.className = "cupgrid";
    g.items.forEach(function(c){ grid.appendChild(cupBox(c)); });
    frag.appendChild(grid);
  });
  el.appendChild(frag);
}
// Dedicated UCL box: upcoming CL fixtures + the FULL league table (36-team
// Swiss-model standings, not truncated). v12.16: the table is COMPLETE —
// every row carries matches played, wins, draws, losses and goal difference
// next to the points (the user's ask), with a sticky header row.
function renderUcl(d){
  var el = document.getElementById("ucl"); if(!el) return;
  el.innerHTML = "";
  if(!d){ el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>"; return; }
  // v12.35-uclfix: the matchday chip now lives INSIDE the h2.uclh2 (same row
  // as the title), not in a separate .ucl-head div below. The UCL emblem
  // image is retired (the starball SVG in the h2 is the UCL brand mark).
  // Append the matchday span to the existing h2 element (already in the
  // DOM with the starball + "UEFA Champions League" title). Remove any
  // previous matchday chip first (renderUcl runs on every language switch).
  // Use querySelector for robustness (previousElementSibling had a timing
  // issue on the initial page load).
  var h2ucl = document.querySelector("#uclCard h2.uclh2");
  if(h2ucl){
    var oldMd3 = h2ucl.querySelector(".ucl-md");
    if(oldMd3) oldMd3.remove();
    if(d.matchday){
      var md2 = document.createElement("span"); md2.className="ucl-md";
      md2.textContent = (curLang()==="en"?"Matchday ":"هفته ")+fmtNum(d.matchday);
      h2ucl.appendChild(md2);
    }
  }
  // v12.12: the all-fixtures list is GONE from this card (Sabah FK vs SK
  // Slavia Praha noise) — upcoming CL fixtures live in the uclspot box above
  // (≥1 selected club, up to 8). This card is standings-only now.
  var wrap = document.createElement("div"); wrap.className = "ucl-stand-wrap";
  var st = document.createElement("div"); st.className = "ucl-stand";
  if(d.started === false){
    var ov = document.createElement("div"); ov.className = "stnot-overlay";
    var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
    ov.appendChild(l);
    var firstDate = (d.matches && d.matches.length) ? d.matches[0].utcDate : (d.firstStart || null);
    if(firstDate){
      var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
      trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
      trow.appendChild(document.createTextNode(fmtKick(firstDate)));
      ov.appendChild(trow);
    }
    wrap.appendChild(ov);
  }
  if(d.teams && d.teams.length){
    // v12.16: header row — # | team | MP | W | D | L | GF | GA | GD | Pts in
    // the standard league-table order (the W/D/L/GF/GA middle columns fold
    // away on phones, leaving # | team | MP | GD | Pts). Missing stats render
    // as "—" until the standings cache rotates in the new shape.
    var hr = document.createElement("div"); hr.className = "strow uclhead";
    var hpos = document.createElement("span"); hpos.className = "stpos"; hpos.textContent = "#";
    var hname = document.createElement("span"); hname.className = "stname"; hname.textContent = curLang()==="en" ? "Team" : "تیم";
    var hmp = document.createElement("span"); hmp.className = "stnum"; hmp.textContent = T("thP");
    var hw = document.createElement("span"); hw.className = "stnum ucl-hidem"; hw.textContent = T("thW");
    var hd = document.createElement("span"); hd.className = "stnum ucl-hidem"; hd.textContent = T("thD");
    var hl = document.createElement("span"); hl.className = "stnum ucl-hidem"; hl.textContent = T("thL");
    var hgf = document.createElement("span"); hgf.className = "stnum ucl-hidem"; hgf.textContent = T("thGF");
    var hga = document.createElement("span"); hga.className = "stnum ucl-hidem"; hga.textContent = T("thGA");
    var hgd = document.createElement("span"); hgd.className = "stnum"; hgd.textContent = T("thGD");
    var hpt = document.createElement("span"); hpt.className = "stpts"; hpt.textContent = T("thPts");
    hr.appendChild(hpos); hr.appendChild(hname); hr.appendChild(hmp); hr.appendChild(hw); hr.appendChild(hd); hr.appendChild(hl); hr.appendChild(hgf); hr.appendChild(hga); hr.appendChild(hgd); hr.appendChild(hpt);
    st.appendChild(hr);
    var num = function(v){ return (v == null || isNaN(v)) ? "—" : fmtNum(v); };
    var gdTxt = function(t2){ if(t2.gd == null) return (t2.gf == null || t2.ga == null) ? "—" : fmtNum(t2.gf - t2.ga); return (t2.gd>0?"+":"")+fmtNum(t2.gd); };
    d.teams.forEach(function(t){
      var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
      var p = document.createElement("span"); p.className = "stpos" + (t.pos<=8 ? " top3" : ""); p.textContent = fmtNum(t.pos);
      // v12.18: round club crest before the name (the user's ask) — resolved
      // server-side against the clubs catalog; rows without one render
      // text-only, exactly as before.
      var n = document.createElement("span"); n.className = "stname" + (t.crest ? " haslogo" : "");
      if(t.crest){
        var lg = document.createElement("img"); lg.className = "stlogo"; lg.src = t.crest; lg.alt = ""; lg.loading = "lazy"; lg.decoding = "async"; lg.referrerPolicy = "no-referrer";
        lg.onerror = function(){ this.remove(); n.classList.remove("haslogo"); };
        n.appendChild(lg);
        var txt = document.createElement("span"); txt.className = "sttxt"; nameInto(txt, curLang()==="en" ? t.name : (t.faName||t.name));
        n.appendChild(txt);
      } else {
        nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
      }
      var mp = document.createElement("span"); mp.className = "stnum"; mp.textContent = num(t.played);
      var w = document.createElement("span"); w.className = "stnum ucl-hidem"; w.textContent = num(t.won);
      var dd = document.createElement("span"); dd.className = "stnum ucl-hidem"; dd.textContent = num(t.draw);
      var ll = document.createElement("span"); ll.className = "stnum ucl-hidem"; ll.textContent = num(t.lost);
      var gf = document.createElement("span"); gf.className = "stnum ucl-hidem"; gf.textContent = num(t.gf);
      var ga = document.createElement("span"); ga.className = "stnum ucl-hidem"; ga.textContent = num(t.ga);
      var gd = document.createElement("span"); gd.className = "stnum"; gd.textContent = gdTxt(t);
      var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
      r.appendChild(p); r.appendChild(n); r.appendChild(mp); r.appendChild(w); r.appendChild(dd); r.appendChild(ll); r.appendChild(gf); r.appendChild(ga); r.appendChild(gd); r.appendChild(pt);
      st.appendChild(r);
    });
  } else {
    var e2 = document.createElement("div"); e2.className = "stempty"; e2.textContent = T("stEmpty");
    st.appendChild(e2);
  }
  wrap.appendChild(st);
  el.appendChild(wrap);
}
// v12.12: the UCL box is GENERALIZED (the user's ask) — up to EIGHT upcoming
// CL fixtures in strict kickoff order (live first; "two important today, two
// important tomorrow"), and ONLY matches with ≥1 SELECTED club: the server
// filters (Sabah FK vs SK Slavia Praha is noise and never boxes). Same
// spotitem anatomy as the topspot box + hero, so the page stays uniform
// (v12.11). Pre-draw: the wait state counts to the projected first kickoff;
// otherwise the card hides when the box is empty.
// v12.21: the UCL pre-draw wait state carries the starball mark — the same
// inline SVG the headers use (white stars on the navy ball), injected from
// the worker-side const so page and brand stay in lockstep.
var UCL_BALL = "<svg viewBox=\"117 0 206 204\" aria-hidden=\"true\" focusable=\"false\"><circle cx=\"220\" cy=\"102\" r=\"103\" fill=\"#0e2058\"/><path fill=\"#ffffff\" d=\"m293.4 123.4c-0.2 0.5-0.7 0.8-1.3 0.9-12.6 1.5-26.0-0.3-31.2-1.1-8.6-8.6-18.0-18.2-24.9-26.6-0.7-0.9-0.7-2.1-0.1-3.0 9.8-13.7 18.8-24.6 22.6-28.9 10.9-2.4 21.7-4.5 29.0-4.8 0.6-0.0 1.1 0.2 1.4 0.7 9.4 13.1 16.2 25.7 18.4 30.3-4.3 11.6-9.5 23.4-14.0 32.5zm-12.0 22.2c-7.0 11.7-12.2 18.7-13.9 20.8-2.3 3.2-8.2 11.7-17.3 20.3-0.6 0.5-1.3 0.9-2.1 0.9-11.4 0.5-22.0-0.3-26.1-1.2-3.5-1.4-11.6-5.1-21.3-10.4-0.8-0.5-1.3-1.4-1.3-2.3 0.5-7.5 2.9-18.1 5.0-29.3 5.2-9.1 10.5-19.5 16.1-28.0 0.6-0.9 1.7-1.3 2.7-1.0 16.7 4.5 31.1 8 37.0 9.3 8.0 9.3 15.8 15.9 21.1 19.9 0.3 0.3 0.4 0.7 0.2 1.1zm-100.8 16.2c-0.8 0.5-1.9 0.5-2.7-0.1-7.3-5.1-15.9-11.7-23.1-18.4-4.3-7.3-7.5-16.6-9.8-24.5-0.1-0.5-0.0-1.1 0.3-1.5 8.1-9.9 17.8-17.8 21.9-20.8 9.2 3.9 19.7 7.4 28.9 10.5 0.9 0.3 1.6 1.2 1.7 2.1 1.3 16.4 4.3 29.6 5.1 34.6-3.4 3.7-12.4 12.0-22.1 18.0zm-40.3-64.3c-1.2-7.7-2.0-15.8-2.1-19.5-0.2-8.6 1.2-16.2 2.7-23.2 0.3-1.2 0.9-2.2 1.7-3.0 4.6-4.2 12.9-11.6 18.1-15.0 4.9-3.2 18.7-7.6 24.3-9.2 1.1-0.3 2.3 0.2 2.8 1.2 0.7 1.2 1.4 2.4 2.1 3.6 4.5 6.9 9.4 12.9 11.4 15.5-2.7 10.9-3.9 23.1-4.4 33.4-0.1 1.0-0.7 1.8-1.6 2.2-14.3 5.6-25.2 10.0-28.8 11.6-9.8 0.4-19.2 2.1-25.6 3.2-0.4 0.1-0.9-0.2-0.9-0.7zm72.3-74.8c0.4-0.6 1.0-1.0 1.8-1.1 14.7-1.9 28.2-2.2 33.4-2.1 9.4 6.3 18.6 14.5 26.0 22.4 0.5 0.6 0.6 1.4 0.2 2.0-5.2 8.2-12.9 16.1-16.2 19.5-12.4 2.9-25.6 7.2-36.3 10.7-1.0 0.3-2.2-0.0-2.8-0.9-8.1-11.8-13.3-21.9-15.3-25.7 2.2-9.8 5.3-18.6 9.3-24.9zm98.5 96.8c-0.3 0.1-0.6-0.1-0.6-0.4-0.6-12.1-1.7-23.9-2.3-28.2 0.0-10.5-1.7-21.3-3.4-29.3-0.1-0.3 0.2-0.5 0.5-0.5 9.9 2.0 13.1 5.7 13.1 5.7-5.2-11.7-12.8-20.6-21.0-27.3-7.0-14.7-15.1-21.5-15.1-21.5 0.7 3.2 0.2 6.9-1.0 10.7-0.1 0.2-0.3 0.4-0.6 0.2-13.4-6.6-27.3-9.6-32.7-10.3-8.0-3.9-16.8-6.5-23.9-8.4-0.2-0.1-0.2-0.3-0.1-0.4 9.5-7.8 18.2-9.8 18.2-9.8-15.4-0.6-28.7 2.2-39.7 6.4-16.6-1.3-27.1 1.6-27.1 1.6s4.6 5.5 6.4 8.5c0.2 0.4 0.1 0.8-0.2 1.1-10.4 7.2-17.9 15.1-20.8 18.4-3.3 0.4-9.0 1.2-13.9 2.5-0.2 0.0-0.4-0.1-0.3-0.3 5.0-11.8 10.4-18.4 10.4-18.4s-32.0 22.7-38.0 63.4c0 0 2.6-7.2 11.5-18.2 0.1-0.1 0.3-0.1 0.4 0.1 2.5 5.6 5.4 10.5 6.9 12.8-4.9 7.9-8.3 16.5-10.4 23.5-0.1 0.2-0.3 0.4-0.5 0.5-7.4 2.8-9.3 5.5-9.3 5.5 1.2 3.9 3.4 7.8 6.3 11.4 0.2 0.3 0.4 0.7 0.4 1.1-0.8 17.4 4.8 28.8 4.8 28.8 1.3-6.1 3.8-12.0 6.9-17.5 0.1-0.2 0.4-0.3 0.6-0.1 7.3 5.8 14.9 10.9 17.9 12.7 1.5 4.0 6.0 14.2 11.9 24.7 0.1 0.2 0.0 0.5-0.2 0.6-7.1 2.6-14.4 3.8-21.1 2.1 0 0 8.1 10.0 32.9 14.3 6.9 8.1 15.3 14.9 25.1 17.2 0 0-2.9-3.2-3.6-14.9-0.0-0.2 0.2-0.4 0.4-0.4 6.1 0.1 14.4 0.2 22.1-0.3 2.7 2.1 8.6 6.8 14.3 9.8 0.3 0.1 0.3 0.6 0.0 0.7-10.1 6.1-16.8 6.6-16.8 6.6 45.7 1.0 73.2-28.8 73.2-28.8-7.5 4.9-16.2 8.0-24.9 9.9-0.3 0.1-0.5-0.2-0.5-0.5 1.6-7.8 1.2-15.3 1.0-17.9 10.8-2.7 20.3-7.5 27.3-12.5 0.1-0.1 0.3-0.1 0.50 2.9 2.0 5.4 4.3 7.9 8.1 0 0 4.7-6.7 6.4-22.2 11.7-15.3 13.5-31.0 13.5-31.0-2.9 4.6-7.4 7.9-12.6 10.3zm-90.5 151.2c-19.6 0-37.4 8.8-48.3 21.7l3.4 4.2c9.9-12.2 26.6-20.7 44.8-20.7 18.2 0 35.0 8.4 44.8 20.7l3.4-4.2c-10.9-12.9-28.6-21.7-48.3-21.7zm-45.9 2.7c-1.3 1.0-2.8 1.6-4.1 1.4-1.7-0.2-2.7-0.9-4.4-2.9l-9.6-11.8-5.2 4.2 10.5 12.9c2.2 2.7 4.8 4.2 7.8 4.5 0.4 0.0 0.7 0.1 1.1 0.1 2.9 0.0 5.6-1.0 8.2-3.1 2.9-2.4 4.5-5.1 4.9-8.4 0.3-3.0-0.6-5.8-2.8-8.5l-10.5-12.9-5.2 4.2 9.6 11.8v0c1.7 2.0 2.1 3.2 2.0 4.9-0.1 1.3-0.9 2.7-2.2 3.7zm35.5-37.2-16.8 3.4c-0.8 0.2-1.4 0.5-1.8 1.1-0.4 0.6-0.5 1.3-0.3 2.0l3.3 16.5c0.5 2.7 1.7 4.6 3.6 5.7 1.2 0.7 2.7 1.1 4.3 1.1 0.90 1.8-0.1 2.7-0.3l10.5-2.1-1.3-6.2-10.2 2.1c-2.1 0.4-2.8 0.2-3.2-2.2l-0.4-1.8 11.8-2.4-1.2-6.1-11.8 2.4-0.9-4.4 12.9-2.6-1.3-6.2zm32.7 9.0 10.1 2.6 1.6-6.1-10.4-2.7c-5.7-1.5-9.6 0.7-10.9 6.0l-4.2 16.3c-0.2 0.8-0.1 1.5 0.2 2.1 0.3 0.6 0.9 1.0 1.7 1.2l3.8 1.0 2.7-10.5 11.7 3.0 1.6-6.1-11.7-3.0 0.5-1.7c0.6-2.3 1.3-2.5 3.4-2.0zm52.2 14.9 3.6-4.4c-1.8-1.8-3.6-3.5-5.5-5.1-19.9-17.1-45.6-26.6-72.5-26.6-26.9 0-52.6 9.4-72.5 26.6-1.9 1.6-3.8 3.4-5.5 5.1l3.6 4.4c1.8-1.8 3.7-3.6 5.6-5.3 18.9-16.3 43.3-25.2 68.9-25.2s50.0 8.9 68.9 25.2c2.0 1.7 3.8 3.4 5.6 5.3zm-27.1 21.7 1.2-4.0-5.0-3.7 4.0-2.9 2.3 1.7 2.6-8.8-15.2 9.8-6.2-3.5 23.9-15.4c0.9-0.6 2.2-1.1 3.8 0.1l1.0 0.8c1.6 1.2 1.4 2.7 1.1 3.6l-7.9 27.3-5.5-5.0zm-112.5 129.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm6.7-89.8 12.5 31.8h7.0l11.6-32.2 2.0 28.0-4.4 4.0v0.1h19.0v-0.1l-3.7-4.0-2.7-36.3 2.9-4.0v-0.1h-15.8l-10.7 29.8-11.6-29.8h-16.0v0.1l3.2 4.0-1.9 36.3-3.9 4.0v0.1h15.6v-0.1l-3.9-4.0 0.8-27.7zm-52.5 89.7h-15.3v-33.9l4.2-4.0v-0.1h-18.9v0.1l3.3 4.0v36.3l-3.3 3.9v0.2h35.5l1.7-14.0h-0.1l-7.0 7.5zm-34.2-58.1v0.1h18.0v-0.1l-3.3-4.0v-36.3l3.3-4.0v-0.1h-18.0v0.1l3.2 4.0v13.5h-16.0v-13.5l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1l-3.2-4.0v-15.7h16.0v15.7l-3.2 4.0zm280.9 58.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17.0l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm-161.9-11.3-5.3-17.7-6.2 17.7h11.5zm15.8 13.7 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5zm-183.2-66.2c-9.2 0-15.0-9.3-15.0-17.3 0-9.9 5.4-16.3 13.0-16.3 2.0 0 4.0 0.2 5.8 0.7l6.9 8.5h0.1l-0.5-14.1c-2.0-0.8-6.3-1.8-11.6-1.8-16.4 0-25.7 11.1-25.7 23.9 0 12.7 9.0 23.8 24.5 23.8 4.2 0 10.3-1.4 14.5-4.6l0.6-7.4h-0.1c-3.6 2.8-8.7 4.5-12.6 4.5zm256.9 5.8-3.2-4.0v-36.3l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1zm-39.5 43.7 4.4 4.0v8.4c-1.4 1.6-3.9 3.0-7.2 3.0-7.9 0-12.1-9.6-12.1-17.7 0-8.8 4.4-16.2 13.6-16.2 2.5 0 5.2 0.2 7.4 1.0l7.1 7.6h0.1l-0.4-12.2c-4.1-2.1-9.0-3.0-14.0-3.0-15.0 0-25.7 9.2-25.7 24.4 0 12.7 8.2 23.3 20.9 23.3 5.6 0 10.7-1.3 15.4-4.7l5.6 4.7h0.1v-18.4l3.5-4.0v-0.1h-18.8v0.1zm-11.7-65.3c1.4 0.4 3.0 0.6 4.7 0.6 6.2 0 8.9-3.4 8.9-8.4 0-5.9-3.5-8.7-9.9-8.7h-3.7v16.5zm-11.4 17.5v-36.3l-3.3-4.0v-0.1h21.2c12.8 0 18.7 5.8 18.7 14.7 0 9.2-7.0 14.9-16.5 14.9-3.1 0-6.3-0.2-8.6-0.8v11.6l4.7 4.0v0.1h-19.4v-0.1l3.3-4.0zm106.6-14.9c0-7.7-2.9-20.1-12.8-20.1-7.9 0-10.2 7.9-10.2 13.2 0 7.8 3.2 20.4 12.8 20.4 6.8 0 10.2-6.5 10.2-13.6zm-11.9 20.6c-14.0 0-23.0-11.5-23.0-24.5 0-13.4 10.4-23.2 23.3-23.2 14.3 0 23.5 11.2 23.5 24.0 0 14.6-11.1 23.7-23.8 23.7zm-14.9 18.5 3.7 4.0v25.4c0 7.3-3.6 9.1-9.5 9.1-5.9 0-9.5-1.7-9.5-9.1v-25.4l3.7-4.0v-0.1h-18.4v0.1l3.3 4.0v25.4c0 12.2 6.2 16.6 19.5 16.6 12.1 0 18.2-4.2 18.2-16.3v-25.8l3.2-4.0v-0.1h-14.2v0.1zm85.2 5.5c0-3.2-2.4-5.6-5.5-5.6-3.1 0-5.5 2.4-5.5 5.6 0 3.2 2.4 5.6 5.5 5.6 3.0 0 5.5-2.4 5.5-5.6zm1.4 0c0 3.9-3.1 6.7-6.8 6.7-3.7 0-6.8-2.8-6.8-6.7 0-3.8 3.1-6.7 6.8-6.7 3.7 0 6.8 2.8 6.8 6.7zm-6.8-0.5c1.0 0 1.9-0.1 1.9-1.2 0-1.0-0.9-1.1-1.7-1.1h-1.6v2.4h1.4zm1.1 0.9 2.2 3.4h-1.3l-2.0-3.4h-1.4v3.4h-1.2v-7.7h3.0c1.8 0 2.7 0.7 2.7 2.2 0 1.4-0.9 2.0-2.0 2.1zm-2.9-70.4 4.3 4.0v23.6l-18.1-27.8h-16.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h14.9v-0.1l-4.4-4.0v-29.6l22.6 33.7h8.5v-40.5l3.3-4.0v-0.1h-14.8v0.1zm45.5 17.0c-8.1-2.3-10.6-3.2-10.6-7.0 0-4.3 5.6-5.1 9.1-5.1 3.0 0 5.7 0.3 8.2 1.1l6.8 7.3h0.1l-0.6-12.6c-4.2-1.6-8.7-2.5-13.8-2.5-10.7 0-20.9 3.7-20.9 14.2 0 6.8 4.7 10.9 15.0 13.7 7.9 2.2 11.8 3.6 11.8 7.6 0 4.6-5.9 5.6-9.9 5.6-3.3 0-6.3-0.5-8.8-1.3l-6.8-8.4h-0.1l0.5 13.4c4.7 2.1 10.3 2.9 15.6 2.9 11.4 0 21.0-4.8 21.0-14.4 0-9.1-6.3-11.7-16.6-14.6zm-309.7 9.6h11.5l-5.3-17.7-6.2 17.7zm-1.3 17.8h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1z\"/></svg>";
function renderUclSpot(d){
  var card = document.getElementById("uclSpotCard"), el = document.getElementById("uclSpot");
  if(!el) return;
  el.innerHTML = "";
  var list = (d && d.matches && d.matches.length) ? d.matches.slice(0, 8) : [];
  if(!list.length){
    if(d && d.firstStart){
      if(card) card.style.display = "";
      var fw = document.createElement("div"); fw.className = "uclspot-wait";
      var fb = document.createElement("div"); fb.className = "uclspot-ball"; fb.setAttribute("aria-hidden", "true"); fb.innerHTML = UCL_BALL;
      fw.appendChild(fb);
      var fl = document.createElement("div"); fl.className = "stnot-ovl-label"; fl.textContent = T("stNot");
      fw.appendChild(fl);
      var ft = document.createElement("div"); ft.className = "stnot-ovl-timer";
      ft.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
      ft.appendChild(document.createTextNode(fmtKick(d.firstStart)));
      fw.appendChild(ft);
      el.appendChild(fw);
    } else if(card){
      card.style.display = "none";
    }
    return;
  }
  if(card) card.style.display = "";
  list.forEach(function(m, idx){
    // v12.26: noComp — the box is UCL-dedicated, the per-row league tag is
    // redundant there (the user's ask).
    el.appendChild(spotItemNode(m, idx, {noComp:true}));
  });
}
// v12.3/v12.4/v12.7/v12.8/v12.12 TOP BOX (league): the consolidated
// big-matches card — up to TEN entries + the hero's slot 1 (the user's ask;
// e.g. the Madrid derby and the Manchester derby in the SAME box). The
// server picks TRUE big matches only (A: two selected teams;
// B: both sides top-3 — صدر جدول; C: derby; fallback: a selected team vs a
// top-5 side of that league) and orders them STRICTLY by kickoff — live first
// (kickoff in the past), then the closest upcoming on top. v12.10: slot 1 —
// the countdown's own match — renders in the HERO CARD at the very top (the
// bar and its match stuck together); this box carries the REMAINING entries.
// v12.12: spotItemNode is the shared anatomy of the hero, the topspot box AND
// the generalized UCL box (live score + LIVE chip, BOTH tags — a fixture that
// is a derby AND a top-of-the-table clash shows both badges). The card hides
// when nothing qualifies; box fixtures are excluded from the upcoming list
// server-side — this box IS their presentation. Stale KV payloads (≤5 min)
// may still carry the old single-match shape {next:…} — accepted for rollout.
function spotItemNode(m, idx, opts){
  var item = document.createElement("div"); item.className = "spotitem";
  // v12.17: «در این هفته» passes opts.past for games whose kickoff already
  // ran out — the whole entry renders "turned off" (dimmed, see .spotitem.past)
  // and the time chip swaps to the «پایان‌یافته» (expired) state.
  if(opts && opts.past) item.className += " past";
  // v13.35-favs: matches featuring a starred team get the gold .hasfav accent.
  if(hasAnyFav(m)) item.className += " hasfav";
  var row = document.createElement("div"); row.className = "match";
  if(m.derby) row.className += " derby";
  row.style.setProperty("--i", idx);
  var en = curLang()==="en";
  var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
  var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
  var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(logo(m.homeTeam)); hs.appendChild(hName); hs.appendChild(favStarBtn(m.homeTeam.name));
  var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(logo(m.awayTeam)); as.appendChild(favStarBtn(m.awayTeam.name));
  var live = m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED";
  // v12.16: opts.finished (the «در این هفته» agenda) also shows final scores.
  // v12.25: unplayed rows carry the KICKOFF TIME in the center slot (.kick) —
  // "A [match info] B" on the user's sketch — same x line as the score; the
  // time belongs to ITS teams, inside ITS box, never to the row above/below.
  var done = !!(opts && opts.finished);
  // v12.32 (the user's ask): the HERO (opts.noDate) center slot is a COLUMN
  // now — the big time chip (or the live score) with the .kickdate run
  // ("weekday day month", fmtHeroDate) UNDER it: "time / date" as ONE
  // stack between the two clubs (the date moved out of the navy bar,
  // #bigbarDate retired). Every other box keeps the plain single-element
  // center slot; their weekday/date line stays in the info row.
  var hero = !!(opts && opts.noDate);
  var kd = null;
  // v12.44-livepolish: for LIVE matches the kickdate is HIDDEN — the date
  // is redundant when the match is playing (the score is what matters).
  // This also fixes the vertical alignment: the score sits centered in the
  // .kick column (no date below it pushing the score up), matching the team
  // name's vertical center.
  if(m.utcDate && !live && !done){ kd = document.createElement("div"); kd.className = "kickdate"; kd.textContent = fmtHeroDate(m.utcDate); }
  if((live || done) && m.score && m.score.home !== null){
    var vs = scoreNode(m.score);
    if(hero){ var kw = document.createElement("div"); kw.className = "kick"; kw.appendChild(vs); if(kd) kw.appendChild(kd); row.appendChild(hs); row.appendChild(kw); row.appendChild(as); }
    else { var kw2 = document.createElement("div"); kw2.className = "kick"; kw2.appendChild(vs); if(kd) kw2.appendChild(kd); row.appendChild(hs); row.appendChild(kw2); row.appendChild(as); }
  } else {
    var kt = document.createElement("div"); kt.className = "kick";
    var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
    kt.appendChild(kc);
    if(kd) kt.appendChild(kd);
    row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
  }
  item.appendChild(row);
  var info = document.createElement("div"); info.className = "uclspot-info";
  // v12.26 (the user's ask): "remove this tag from UCL box … because it's
  // redundant since that box is already UCL dedicated" — the competition
  // chip is skipped for the UCL box's rows (opts.noComp): its heading already
  // says لیگ قهرمانان اروپا. Every OTHER box (hero, big matches, week) keeps
  // the chip — there it distinguishes mixed competitions.
  if(!(opts && opts.noComp)){
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition && m.competition.emblem){ var cimg = document.createElement("img"); cimg.className="complogo"; cimg.src=m.competition.emblem; cimg.alt=""; cimg.loading="lazy"; cimg.decoding="async"; cimg.onerror=function(){this.remove();}; c.appendChild(cimg); }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
  }
  // v12.7 tag rule: a match can be BOTH a derby and a top-of-the-table
  // clash — each badge renders independently, never either/or.
  if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
  if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "🏆 " + T("topBadge"); info.appendChild(tb); }
  // v12.31→v12.32 (the user's ask): the HERO passes opts.noDate — its date
  // rides under the big time chip inside the kick column (.kickdate, see
  // the row assembly above), NOT in this info line. Every other box keeps
  // the full weekday/date/time run right here.
  // v12.40-datebelow: the redundant fmtDate text node is RETIRED — the date
  // now rides under the time chip in the kick column (.kickdate) for EVERY
  // spotitem, not just the hero. The info line carries only the competition
  // chip + badges + live/expired chips + venue. No date, no time.
  if(live){
    // v12.44-livepolish: the livechip "در حال برگزاری" is SKIPPED when the
    // spotitem is inside the #liveCard (the card itself is the live section —
    // the chip is redundant). The check uses opts.isLiveCard (passed from
    // renderLive) because item.closest() doesn't work at build time — the
    // element isn't in the DOM yet. For the hero + big-matches + week cards
    // the chip still renders (those cards mix live + upcoming, so the chip
    // distinguishes).
    var inLiveCard = !!(opts && opts.isLiveCard);
    if(!inLiveCard){
      var chip = document.createElement("span"); chip.className = "livechip";
      var dot = document.createElement("span"); dot.className = "dot";
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(T("live")));
      info.appendChild(chip);
    }
    if(m.minute != null){ var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "ʹ"; info.appendChild(lmin); }
  } else if(opts && opts.past){
    // v12.17/v12.25: kickoff passed, no final score yet — the expired marker
    // («⌛ پایان‌یافته») stays in the info line; the kickoff TIME itself now
    // rides the row's center slot (v12.25), dimmed with the box it belongs to.
    var cd = document.createElement("span");
    cd.className = "wkdone";
    cd.textContent = "⌛ " + T("wkDone");
    info.appendChild(cd);
  }
  if(m.venue){ var vn = document.createElement("span"); vn.className="venue"; vn.textContent="🏟️ " + m.venue; info.appendChild(vn); }
  // v12.21: the share control was a full-width row of its own under the
  // entry. v12.31: it left the info chip line (it pushed the centered
  // chips off-center) for the box's top inline-end corner.
  var sr = shareRow(m, false);
  item.appendChild(info);
  item.appendChild(sr);
  return item;
}
// v12.10/v12.11 HERO: renders the countdown's OWN match (barTarget — box
// top, live entries leading) stuck directly under the countdown bar inside
// the hero card — the card the bar belongs to. Same spotitem anatomy as the
// box entries so the headline and the box share one visual language.
// v12.11: always a plain "card bighero" — no golden topspot chrome; the
// countdown's match row looks exactly like every other match row.
// v12.31→v12.32: the hero's entry passes noDate — its weekday/date line rides
// under the big time chip INSIDE the kick column (not in the navy bar, not
// in the info row).
function renderHeroSpot(){
  var card = document.getElementById("bigHeroCard"), el = document.getElementById("heroSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  card.className = "card bighero";
  var m = barTarget().m;
  heroWm(card, m);
  // v12.32: #bigbarDate is gone — spotItemNode({noDate:true}) renders the
  // date itself, under the big time chip (.kickdate in the kick column).
  if(m) el.appendChild(spotItemNode(m, 0, {noDate:true}));
}
// v12.23 (the user's ask): the giant faded crests behind the hero stage —
// "the expanded logo of clubs in lower opacity on the background of the
// next big upcoming match". One watermark per club, anchored to its club's
// half; a missing crest hides that side, and the whole layer hides when
// neither club has one (monogram-only fallbacks stay clean, no broken imgs).
function heroWm(card, m){
  var wm = card.querySelector(".hero-wm"); if(!wm) return;
  var imgs = wm.querySelectorAll("img");
  var c0 = m && m.homeTeam && m.homeTeam.crest, c1 = m && m.awayTeam && m.awayTeam.crest;
  [c0, c1].forEach(function(c, i){
    if(c){ imgs[i].src = c; imgs[i].style.display = ""; }
    else { imgs[i].removeAttribute("src"); imgs[i].style.display = "none"; }
  });
  wm.style.display = (c0 || c1) ? "" : "none";
}
function renderTopSpot(d){
  var card = document.getElementById("topspotCard"), el = document.getElementById("topSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.12: capacity raised — the server sends up to ELEVEN big matches
  // (the user's ask: the box shows up to TEN after the hero takes slot 1).
  var list = d && d.matches && d.matches.length ? d.matches.slice(0, 11) : (d && d.next ? [d.next] : []);
  // v12.10: slot 1 — the closest upcoming big match, the countdown's own
  // match — lives in the HERO CARD above, stuck to the countdown bar; this
  // box presents the REMAINING big matches, separated from the headline.
  var rest = list.slice(1);
  // v13.35-favs: «⭐ منتخب‌ها» mode — only matches featuring starred teams.
  rest = favFilter(rest);
  if(!rest.length){ card.style.display = "none"; renderFavbar(); return; }
  card.style.display = "";
  rest.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx + 1));
  });
}
// v12.16: «در این هفته» — the current Iranian week's agenda (Saturday→
// Friday): every followed/top-3 game of THIS week, live first; already-played
// games show their final score. Same spotitem anatomy as every other box;
// the card hides when the week has no followed games.
// v12.17: games whose kickoff has PASSED (finished, or the clock ran out
// while no score arrived yet) are rendered "turned off" — dimmed rows + the
// «پایان‌یافته» chip instead of a fresh kickoff time — so users instantly
// see what's still ahead vs what's expired. Order: live → upcoming (soonest
// first) → past (most recent first at the bottom).
// v12.18 (the Friday problem, the user's ask): when the current week has
// NOTHING left ahead — late Friday, everything kicked off — a wall of dimmed
// past games is pointless. The card then switches to NEXT week's fixtures
// (header «📅 هفته بعد») so the box always answers "what's coming". Mid-week
// it stays "this week" with the dimmed past games below the upcoming ones.
function weekPast(m){
  if(m.status === "FINISHED") return true;
  if(m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") return false;
  if(!m.utcDate) return false;
  return new Date(m.utcDate).getTime() < Date.now() - 9e4;
}
function renderWeek(list, nextList){
  var card = document.getElementById("weekCard"), el = document.getElementById("weekBox"), title = document.getElementById("weekTitle");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.45-compact-live: remove LIVE matches from the week card — they have
  // their own dedicated #liveCard now. Only show upcoming not-yet-played
  // (or past-but-not-finished) matches. The week card is "what's ahead".
  var isLive = function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; };
  var upcomingThis = favFilter((list || []).filter(function(m){ return !weekPast(m) && !isLive(m); }));
  var mode = "this";
  if(!upcomingThis.length){
    // Nothing left THIS week → show next week's upcoming fixtures instead.
    mode = "next";
    list = favFilter((nextList || []).filter(function(m){ return !isLive(m); }));
  } else {
    list = upcomingThis;
  }
  if(title) title.textContent = mode === "next" ? T("hWeekNext") : T("hWeek");
  if(!list || !list.length){ card.style.display = "none"; return; }
  card.style.display = "";
  var sorted = list.slice().sort(function(a, b){
    var pa = weekPast(a), pb = weekPast(b);
    if(pa !== pb) return pa ? 1 : -1; // upcoming before past
    var ta = a.utcDate ? new Date(a.utcDate).getTime() : 0, tb = b.utcDate ? new Date(b.utcDate).getTime() : 0;
    return pa ? tb - ta : ta - tb; // past: recent first · upcoming: soonest first
  });
  sorted.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx, { finished: m.status === "FINISHED", past: mode === "this" && weekPast(m) }));
  });
}
// v12.5: renderIran/initIran/toggleIran removed — the Iran card is retired
// and the PGL table renders through renderStandings like every other league.
// v12.12: setView is retired with the view toggle — the page is always
// big-only (a stored ucl_view preference is ignored and never re-read).
function scorerTeam(m, teamName){
  if(!teamName) return "";
  var en = curLang()==="en";
  var norm = function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)/g," ").replace(/[^a-z0-9]/g,""); };
  var t = norm(teamName);
  if(t && t===norm(m.homeTeam.name)) return en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name);
  if(t && t===norm(m.awayTeam.name)) return en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name);
  return "";
}
function fmtCountdown(ms){
  ms = Math.max(0, ms|0);
  var en = curLang()==="en";
  var d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4), s = Math.floor(ms%6e4/1e3);
  if(ms <= 0) return T("soon");
  // v12.x-countdown-words (the user's ask): show the countdown in full
  // words instead of HH:MM:SS — e.g. '۱۴ ساعت و ۱۵ دقیقه و ۴۸ ثانیه'
  // (fa) / '14 hours 15 minutes 48 seconds' (en). Each non-zero unit is
  // shown with its full name + the Persian connector between units.
  // English uses a space-separated style. Zero units are skipped.
  var andWord = en ? " " : " و ";
  var parts = [];
  if(d) parts.push(fmtNum(d) + " " + T("uDay"));
  if(h) parts.push(fmtNum(h) + " " + T("uHour"));
  if(m) parts.push(fmtNum(m) + " " + T("uMin"));
  if(s) parts.push(fmtNum(s) + " " + T("uSec"));
  if(parts.length === 0) return T("soon");
  if(en){ return parts.join(" "); } else { return parts.join(andWord); }
}
// v12.10: the ONE pick the countdown bar AND the hero card agree on — box
// top (closest upcoming big match; live entries lead) → far nextBig →
// nearest big upcoming → plain upcoming[0]. renderHeroSpot renders exactly
// this match stuck under the bar, so the countdown can never point at a
// card rendered somewhere else on the page.
function barTarget(){
  var ts = DATA.topSpot || null;
  var boxTop = ts ? ((ts.matches && ts.matches.length ? ts.matches[0] : null) || ts.next) : null;
  var next = boxTop || DATA.nextBig || null, i;
  if(!next){ for(i=0;i<DATA.upcoming.length;i++){ if(DATA.upcoming[i].big){ next = DATA.upcoming[i]; break; } } }
  var isBig = !!next;
  if(!next) next = DATA.upcoming[0] || null;
  return { m: next, big: isBig };
}
function updateBigBar(){
  var card = document.getElementById("bigHeroCard"), fill = document.getElementById("bigbarFill"),
      lbl = document.getElementById("bigbarLabel"), clk = document.getElementById("bigbarClock"),
      pct = document.getElementById("bigbarPct"), tr = document.getElementById("bigbarTrack");
  if(!card||!fill||!lbl||!clk) return;
  // v12.8/v12.10: the countdown belongs to the match on TOP of the big
  // matches presentation — the hero card right under this bar (box top,
  // kickoff-sorted, so the closest upcoming big match; live entries lead,
  // kickoff in the past). Stale KV (≤3 min) may still carry the legacy
  // single-match shape {next:…}.
  var t = barTarget(), next = t.m;
  if(!next){
    lbl.textContent = ""; clk.textContent = "--:--:--";
    if(pct) pct.textContent = "";
    fill.className = "bigbar-fill idle";
    if(tr) tr.setAttribute("aria-valuenow", "0");
    card.style.display = ""; card.dataset.urgent = "far"; return;
  }
  var isBig = t.big;
  var kick = new Date(next.utcDate).getTime(), rem = kick - Date.now(),
      live = next.status==="LIVE"||next.status==="IN_PLAY"||next.status==="PAUSED"||rem<=0;
  // v12.22 (the user's ask): the hero ESCALATES as kickoff nears — far (calm
  // emerald breathing) → soon (≤24h: amber, faster heartbeat, amber embers)
  // → final (≤60min: red alarm heartbeat, pulsing label, red embers) → live
  // (the red stage around the live bar). One data-urgent attribute drives the
  // whole CSS intensity ladder; it only flips when the mode actually changes.
  var urgent = live ? "live" : (rem <= 36e5 ? "final" : (rem <= 864e5 ? "soon" : "far"));
  if(card.dataset.urgent !== urgent) card.dataset.urgent = urgent;
  // v12.27 (review item 1): the wrapper carries the same data-urgent — its
  // ::before owns the OUTER heartbeat aura now, so the escalation ladder's
  // color + speed keep driving both pseudo-elements.
  var hw = card.parentNode;
  if(hw && hw.classList && hw.classList.contains("herowrap") && hw.dataset.urgent !== urgent) hw.dataset.urgent = urgent;
  // v12.50: the label text is removed — the countdown is enough (the user's
  // ask: 'remove this text ⚽ ⚡ تا بازی بزرگ بعدی, the countdown is enough').
  // The bigbar-top now shows only the clock + percentage, no label.
  lbl.textContent = "";
  // v12.24: the percent chip speaks the bar's BASE — 100% at kickoff/live.
  var pctTxt = function(v){ return fmtNum(v) + (curLang()==="en" ? "%" : "٪"); };
  if(live){
    fill.className = "bigbar-fill live"; fill.style.width = "100%";
    clk.textContent = "-:--:--";
    var liveSuffix = curLang()==="en" ? "/24h" : "/۲۴";
    if(pct) pct.textContent = pctTxt(100) + liveSuffix;
    if(tr){ tr.setAttribute("aria-valuenow", "100"); if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase")); }
  }else{
    // v12.38-hero: Fix 1 — the progress bar + percentage now track the FINAL
    // 24 HOURS before kickoff (was 14 days). Both the fill and the countdown
    // clock now reference the same 24h window, so the fill level and the
    // remaining time always agree. Before 24h the bar reads 0% (idle); at
    // kickoff 100%. The percentage badge carries a visible "۲۴" / "24h"
    // suffix so the period is never ambiguous (an unlabeled percentage with
    // no visible total reads as broken even when the math is correct).
    var q = 1 - rem/(24*36e5);
    if(q<0) q=0; if(q>1) q=1;
    fill.className = "bigbar-fill";
    fill.style.width = Math.max(2, Math.round(q*100)) + "%";
    clk.textContent = fmtCountdown(rem);
    // v12.38-hero: the percentage now carries a visible period suffix
    // ("۹۴٪ / ۲۴" in fa, "94% / 24h" in en) so the total is always visible.
    var pctSuffix = curLang()==="en" ? "/24h" : "/۲۴";
    if(pct) pct.textContent = pctTxt(Math.round(q*100)) + pctSuffix;
    // v12.22: the clock POPS every second — a tiny scale + brightness tick,
    // re-triggered on each pass (tickBigBar runs every second; the reflow
    // between remove/add restarts the CSS animation).
    clk.classList.remove("tick"); void clk.offsetWidth; clk.classList.add("tick");
    if(tr){
      tr.setAttribute("aria-valuenow", Math.round(q*100));
      if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase"));
    }
  }
  card.style.display = "";
}
// v12.20: visible proof for the "auto-updated" claim — the payload's stamp.
// v12.26 (the user's ask): "instead of showing this: «آخرین به‌روزرسانی:
// همین حالا» show a truthful API call update like: «آخرین به روز رسانی:
// جمعه 21:30 شب»" — the sync line now prints the ABSOLUTE stamp of the
// last real API refresh (weekday + HH:MM + a Persian period word), in the
// user's selected timezone and Persian digits. The server side carries the
// upstream pool's true fetchedAt (see fetchPublicMatches), so a quiet
// window honestly shows the last sweep that actually changed anything
// instead of a fake "همین حالا".
var SYNC_TS = 0;
function fmtStamp(ts){
  try{
    var d = new Date(ts);
    var t = d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    if(curLang()==="en") return d.toLocaleDateString("en-GB",{weekday:"long",timeZone:curTz()}) + " " + t;
    var h = parseInt((t.split(":")[0] || "0"),10) || 0; if(h >= 24) h -= 24;
    var per = (h < 5 || h >= 19) ? "شب" : (h < 12 ? "صبح" : (h < 16 ? "ظهر" : "عصر"));
    return d.toLocaleDateString("fa-IR",{weekday:"long",timeZone:curTz()}) + " " + faNum(t) + " " + per;
  }catch(e){ return ""; }
}
function renderSync(){
  var el = document.getElementById("lastSync"); if(!el) return;
  if(!SYNC_TS){ el.textContent = ""; return; }
  // v12.x-resilience: when the API failed and we're serving the 7-day
  // snapshot, append a small "cached data" badge after the last-update
  // stamp so the user knows the data might be stale. Inline bilingual.
  var base = fmt("lastUpd", fmtStamp(SYNC_TS));
  if (DATA && DATA.cached) {
    var en = curLang() === "en";
    var mins = DATA.cachedAt ? Math.max(1, Math.round((Date.now() - new Date(DATA.cachedAt).getTime()) / 6e4)) : null;
    var cachedLabel = en ? "cached" : "ذخیره‌شده";
    if (mins != null) {
      var ageLabel = en ? (mins + "m ago") : (faNum(String(mins)) + " دقیقه پیش");
      base += " · " + cachedLabel + " (" + ageLabel + ")";
    } else {
      base += " · " + cachedLabel;
    }
  }
  el.textContent = base;
}
function tickBigBar(){ if(DATA && DATA.upcoming) updateBigBar(); renderSync(); }
// v12.19: this final onLang declaration is the one that WINS at runtime
// (JS var re-assignment) — language switch rebuilds the tz popover labels
// (fa/en) and re-fetches so every dynamic string swaps language. The
// renderWeek/renderUcl declaration above documents the v12.18 intent; the
// full load() re-render covers those cards too.
var onLang = function(){ initTz(); load(); };
setTheme(initTheme()); applyLang(true); initTz(); load();
// v12.27 (the user's ask: "the background video doesnt play it must be auto
// play"): the autoplay+muted+playsinline attribute trio already satisfies
// every modern autoplay policy, but some browsers still refuse (Safari Low
// Power Mode, iOS data saver, Firefox block-autoplay policies) and leave the
// stage frozen on its first frame. heroVideoKick() is the belt-and-braces
// driver: it calls play() (promise rejections swallowed) at boot, on every
// canplay/loadeddata, whenever the tab becomes visible again, on the FIRST
// user gesture (pointer/key/touch — a gesture unlocks autoplay in every
// browser), and on a quiet 5s retry ladder (6 tries) while the video sits
// paused.
// v12.28 (the user's report: "Video still doesnt play. (it's just a picture)
// - on chrome"): two changes. (1) The reduced-motion hard-pause is RETIRED —
// the user has now asked twice, unconditionally, that the video autoplay;
// the clip is a dim ambient stage (the CSS fx layers still honor the media
// query), and an OS "reduce motion" setting was freezing the stage on its
// first frame — exactly "just a picture". (2) muted is also set as a JS
// PROPERTY (hv.muted = true) in addition to the attribute — Safari's
// autoplay gate reads the property, and some engines reset the parsed
// attribute on re-insertion. The stage itself was also re-tuned in CSS
// (video .78 + a light scrim) so a PLAYING clip is visibly moving.
var heroVideoKick = function(){
  try{
    var hv = document.querySelector(".hero-video video");
    if(!hv) return;
    try{ hv.muted = true; }catch(e){}
    var kick = function(){
      if(hv.ended) return;
      try{ var p = hv.play(); if(p && p.catch) p.catch(function(){}); }catch(e){}
    };
    hv.addEventListener("canplay", kick);
    hv.addEventListener("loadeddata", kick);
    if(document.visibilityState === "visible" || document.visibilityState === "hidden"){
      document.addEventListener("visibilitychange", function(){ if(!document.hidden) kick(); });
    }
    ["pointerdown","keydown","touchstart"].forEach(function(ev){
      document.addEventListener(ev, kick, { once: true, passive: true });
    });
    kick();
    var tries = 0;
    var iv = setInterval(function(){
      if(!document.body.contains(hv)){ clearInterval(iv); return; }
      if(hv.paused){ kick(); if(++tries >= 6) clearInterval(iv); }
      else clearInterval(iv);
    }, 5000);
  }catch(e){}
};
heroVideoKick();
setInterval(load, 60000);
setInterval(tickBigBar, 1000);
// v13.34-ux: back-to-top FAB — mirrors the Telegram FAB (bottom-right) on the
// opposite corner. Hidden until 600px of scroll; smooth-scrolls except under
// prefers-reduced-motion (jump instantly instead).
(function(){
  var btn = document.getElementById("backTop"); if(!btn) return;
  var onScroll = function(){
    var show = (window.scrollY || document.documentElement.scrollTop || 0) > 600;
    btn.classList.toggle("show", show);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  btn.addEventListener("click", function(){
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });
})();
// v12.21 (the user's ask): PC-wide HIERARCHY — the auto-placed 2-column grid
// read as random (ragged shared-row offsets, holes under shorter cards, the
// results card alone at the bottom). setWide() regroups the section cards
// into a MAIN column (every match box) and a reference RAIL (the three table
// boxes) at ≥1440px, and restores the exact single-column DOM order below
// the breakpoint. Runs once at boot (before first paint — the script is
// synchronous at the end of body) and again on breakpoint change; the
// renderers only touch card CONTENT, so the columns survive every re-render.
var WIDE_MQ = window.matchMedia ? window.matchMedia("(min-width:1440px)") : null;
var WIDE_MAIN = ["topspotCard","uclSpotCard","weekCard","finishedCard"];
var WIDE_RAIL = ["liveCard","uclCard","standingsCard","cupsCard"];
// v12.45-compact-live: on mobile (<1440px, single column), the liveCard
// appears as the SECOND card after the hero (bigHeroCard, which is always
// first in the DOM). Since bigHeroCard is not in WIDE_ORDER, liveCard at
// index 0 puts it right after the hero, before topspotCard.
var WIDE_ORDER = ["liveCard","topspotCard","uclSpotCard","weekCard","uclCard","standingsCard","cupsCard","finishedCard"];
function setWide(on){
  var footer = document.querySelector("footer");
  if(!footer) return;
  if(on){
    if(document.getElementById("wideMain")) return;
    var main = document.createElement("div"); main.id = "wideMain";
    var side = document.createElement("div"); side.id = "wideSide";
    footer.parentNode.insertBefore(main, footer);
    footer.parentNode.insertBefore(side, footer);
    WIDE_MAIN.forEach(function(id){ var e = document.getElementById(id); if(e) main.appendChild(e); });
    WIDE_RAIL.forEach(function(id){ var e = document.getElementById(id); if(e) side.appendChild(e); });
  } else {
    if(!document.getElementById("wideMain") && !document.getElementById("wideSide")) return;
    WIDE_ORDER.forEach(function(id){ var e = document.getElementById(id); if(e) footer.parentNode.insertBefore(e, footer); });
    var main = document.getElementById("wideMain"), side = document.getElementById("wideSide");
    if(main && main.parentNode) main.parentNode.removeChild(main);
    if(side && side.parentNode) side.parentNode.removeChild(side);
  }
}
if(WIDE_MQ){
  setWide(WIDE_MQ.matches);
  var wideChange = function(e){ setWide(e.matches); };
  if(WIDE_MQ.addEventListener) WIDE_MQ.addEventListener("change", wideChange);
  else if(WIDE_MQ.addListener) WIDE_MQ.addListener(wideChange);
}
// v12.20 (the user's ask): sticky join CTA — visible only while the hero
// button is scrolled PAST (not merely below the fold); scrolling back up
// hides it again. body.joinsticky adds bottom clearance so the bar never
// covers content while shown.
// v12.25: once the FOOTER itself is in view the bar stands down — the
// footer carries its own Telegram link (and the phone «خانه درباره تماس»
// row), so a «درباره» anchor lands on clean content instead of under the
// floating bar (the bar's own CTA duty is done at page end).
(function(){
  var stick = document.getElementById("joinSticky");
  var foot = document.getElementById("about");
  if(!stick || !("IntersectionObserver" in window)) return;
  // v12.x-joinsticky-fix: the IntersectionObserver used to watch a.cta (the
  // header CTA button), but that button is now display:none on both mobile
  // AND desktop (retired in v12.x-tg-fab — the floating FAB replaced it on
  // desktop, and the mobile header icon replaced it on mobile). A
  // display:none element has no layout box, so the observer never fired and
  // the sticky bar never appeared on mobile. Fix: observe the hero card
  // (#bigHeroCard) instead — it's always visible. When it scrolls out of
  // view (past = true), show the sticky bar. When the footer comes into
  // view (footIn = true), hide it (the footer carries its own Telegram link).
  var anchor = document.getElementById("bigHeroCard") || document.querySelector(".card");
  if(!anchor) return;
  var past = false, footIn = false;
  var apply = function(){ var show = past && !footIn; stick.classList.toggle("show", show); document.body.classList.toggle("joinsticky", show); };
  var io = new IntersectionObserver(function(entries){
    var e = entries[entries.length - 1];
    past = !e.isIntersecting && e.boundingClientRect.top < 0;
    apply();
  }, { threshold: 0 });
  io.observe(anchor);
  if(foot){
    var fo = new IntersectionObserver(function(entries){
      footIn = entries[entries.length - 1].isIntersecting;
      apply();
    }, { threshold: 0 });
    fo.observe(foot);
  }
})();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}
// v12.x-fab-promo: the Telegram FAB shows a white promotional bubble every
// 60s to promote the bot. The bubble fades in for 5s, then fades out. The
// cycle repeats indefinitely. The bubble text comes from the data-promo
// attribute (bilingual: Persian in fa mode, English in en mode — set at
// render time + updated on language switch).
// v12.x-fab-scroll-hide: on PC, hide the FAB while the user is scrolling
// (avoids the floating button covering content during active scrolling).
// The FAB reappears 1s after scrolling stops. Mobile is unaffected (the
// FAB is already hidden on mobile via @media).
(function(){
  var fab = document.getElementById('tgFab');
  if(!fab) return;
  var show = function(){ fab.classList.add('promo-show'); setTimeout(function(){ fab.classList.remove('promo-show'); }, 5000); };
  setTimeout(show, 5000);
  setInterval(show, 60000);
  // Hide FAB while scrolling on PC (min-width:601px)
  var scrollTimer = null;
  window.addEventListener('scroll', function(){
    if(window.innerWidth < 601) return;
    fab.style.opacity = '0';
    fab.style.pointerEvents = 'none';
    if(scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function(){
      fab.style.opacity = '';
      fab.style.pointerEvents = '';
    }, 800);
  }, { passive: true });
})();

