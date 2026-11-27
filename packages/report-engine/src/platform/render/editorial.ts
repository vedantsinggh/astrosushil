/**
 * Editorial pages shared by every report (provenance: `editorial`).
 *
 * Brand facts are taken from astrosushil.com (About page, Nov 2026).
 * The data statement describes the actual processing (see
 * docs/report-system/README.md §6 item 4) — no "zero data leakage" claims.
 */
import { ReportDefinition } from '../contracts';
import { tex } from './latex';

export interface CoverInfo {
  clientName: string;
  dateOfBirth: string;
  timeOfBirth?: string;
  placeName: string;
  generatedOn: string;
  /** Second native for two-person reports; shown as a second birth line. */
  partner?: { name: string; dateOfBirth: string; timeOfBirth?: string; placeName: string };
}

type EditorialLang = 'en' | 'hi';

const ASSET_BY_ID_OR_TYPE: Record<string, string> = {
  kundli: 'report-kundli',
  KUNDLI: 'report-kundli',
  'kundli-basic': 'report-kundli',
  KUNDLI_BASIC: 'report-kundli',
  'planetary-summary': 'report-kundli',
  PLANETARY_SUMMARY: 'report-kundli',
  career: 'report-career',
  CAREER: 'report-career',
  CAREER_PROSITY: 'report-career',
  'couple-matching': 'report-marriage',
  MARRIAGE_COMPATIBILITY: 'report-marriage',
  finance: 'report-finance',
  FINANCE: 'report-finance',
  love: 'report-love',
  LOVE: 'report-love',
  fortune: 'report-fortune',
  FORTUNE: 'report-fortune',
  'fortune-plus': 'report-fortune-plus',
  FORTUNE_PLUS: 'report-fortune-plus',
  'horoscope-annual': 'report-horoscope',
  HOROSCOPE: 'report-horoscope',
  saturn: 'report-saturn',
  SATURN: 'report-saturn',
  'jupiter-transit': 'report-jupiter-transit',
  JUPITER_TRANSIT: 'report-jupiter-transit',
  'rahu-ketu-transit': 'report-rahu-ketu-transit',
  RAHU_KETU_TRANSIT: 'report-rahu-ketu-transit',
  varshphal: 'report-varshphal',
  VARSHPHAL: 'report-varshphal',
  'baby-name': 'report-baby-name',
  BABY_NAME: 'report-baby-name',
};

/** Resolve the cover / spot-illustration asset stem for any report definition or alias. */
export function reportAssetKey(def: Pick<ReportDefinition, 'id' | 'reportType'> & { additionalReportTypes?: string[] }): string {
  if (ASSET_BY_ID_OR_TYPE[def.id]) return ASSET_BY_ID_OR_TYPE[def.id];
  const rt = def.reportType?.toUpperCase();
  if (rt && ASSET_BY_ID_OR_TYPE[rt]) return ASSET_BY_ID_OR_TYPE[rt];
  for (const alias of def.additionalReportTypes ?? []) {
    const key = ASSET_BY_ID_OR_TYPE[alias] ?? ASSET_BY_ID_OR_TYPE[alias.toUpperCase()];
    if (key) return key;
  }
  return 'report-kundli';
}

/**
 * Document-level set-up for Hindi: an ActualText layer so the extracted PDF
 * text matches the Devanagari source (search, copy, PDF QA), danda glyphs from
 * the Devanagari font (dandas join the Devanagari character class), and Hindi
 * labels for shared section/callout/takeaway Chrome.
 */
function hindiSetup(): string {
  return String.raw`\XeTeXgenerateactualtext=1
\XeTeXcharclass"0964=\XeTeXcharclass"0915 \XeTeXcharclass"0965=\XeTeXcharclass"0915
\renewcommand{\SectionWord}{खंड}
\renewcommand{\TakeawayWord}{सार}
\renewcommand{\InsightWord}{मुख्य बिंदु}
\renewcommand{\KeyTakeawaysWord}{प्रमुख बिंदु}
`;
}

export function coverPage(def: ReportDefinition, c: CoverInfo): string {
  if (def.language === 'hi') return hindiSetup() + coverPageHi(def, c);
  const assetKey = reportAssetKey(def);
  const line = (d: string, t: string | undefined, p: string) =>
    `${tex(d)}${t ? ` \\enspace\\textbar\\enspace ${tex(t)}` : ''} \\enspace\\textbar\\enspace ${tex(p)}`;
  const birth = c.partner
    ? `\\textbf{${tex(c.clientName.split(' & ')[0])}:} ${line(c.dateOfBirth, c.timeOfBirth, c.placeName)}\\\\[1mm]\\textbf{${tex(c.partner.name)}:} ${line(c.partner.dateOfBirth, c.partner.timeOfBirth, c.partner.placeName)}`
    : line(c.dateOfBirth, c.timeOfBirth, c.placeName);
  return String.raw`\thispagestyle{empty}
\begin{tikzpicture}[remember picture,overlay]
  \node[anchor=center,inner sep=0pt] at (current page.center) {\includegraphics[width=\paperwidth,height=\paperheight]{assets/covers/${assetKey}.jpg}};
  \node[anchor=south,inner sep=0pt] at ([yshift=3.5mm]current page.south) {
    \begin{tcolorbox}[enhanced,colback=CoverJewel,opacityback=0.94,colframe=CoverGold!85,boxrule=0.8pt,arc=2.2mm,width=158mm,left=6mm,right=6mm,top=4.2mm,bottom=4.2mm,borderline={0.35pt}{1.5pt}{CoverGold!40}]
      \centering
      \includegraphics[height=11mm,keepaspectratio]{assets/astrosushil_logo_gold.png}\par\vspace{1.5mm}
      {\sffamily\fontsize{7}{8.8}\selectfont\bfseries\color{CoverBrightGold}ASTRO SUSHIL\enspace\textbullet\enspace VEDIC \& NADI ASTROLOGY}\par\vspace{1.8mm}
      {\displayfont\fontsize{16.5}{20.5}\selectfont\color{CoverGoldTint}${tex(def.title)}\par}\vspace{1mm}
      {\fontsize{8.5}{11.5}\selectfont\itshape\color{CoverGoldTint!85}${tex(def.subtitle)}\par}\vspace{2.4mm}
      {\color{CoverGold!65}\rule{36mm}{0.5pt}}\par\vspace{2.4mm}
      {\sffamily\fontsize{6.8}{8.5}\selectfont\bfseries\color{CoverGold}PREPARED EXCLUSIVELY FOR}\par\vspace{1.2mm}
      {\displayfont\fontsize{16.5}{20}\selectfont\color{white}${tex(c.clientName)}\par}\vspace{1.4mm}
      {\sffamily\fontsize{8}{11}\selectfont\color{CoverGoldTint!92}${birth}\par}\vspace{2.6mm}
      {\sffamily\fontsize{6.8}{8.5}\selectfont\color{CoverBrightGold!85}PERSONAL \& CONFIDENTIAL\enspace\textbar\enspace ${tex(c.generatedOn)}\enspace\textbar\enspace astrosushil.com}\par
    \end{tcolorbox}};
\end{tikzpicture}
\null\clearpage
`;
}

export function authorNotePage(def: ReportDefinition): string {
  if (def.language === 'hi') return authorNotePageHi(def);
  return String.raw`\markboth{A Note from Astro Sushil}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}WELCOME}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}A Note from Astro Sushil\par}\vspace{1mm}
\SectionDivider
\begin{minipage}[t]{0.30\linewidth}\vspace{0pt}
  \begin{tcolorbox}[enhanced,colback=white,colframe=Primary,boxrule=0.8pt,arc=1.8mm,left=1.5mm,right=1.5mm,top=1.5mm,bottom=1.5mm,boxsep=0pt]
    \includegraphics[width=\linewidth]{assets/about_sushil.png}
  \end{tcolorbox}
  \begin{center}{\sffamily\fontsize{10}{12}\selectfont\bfseries\color{Primary}Astro Sushil\par}\vspace{0.8mm}
  {\sffamily\fontsize{7}{9}\selectfont\color{Muted}Vedic \& Nadi Astrologer\\ K.\,N.\,Rao tradition\par}\end{center}
\end{minipage}\hfill
\begin{minipage}[t]{0.65\linewidth}\vspace{0pt}
\fontsize{10}{14.5}\selectfont
Namaste,

Thank you for trusting me with something as personal as your birth chart. My own journey with the stars began when I was a child of six, and over the decades of study in the tradition of my revered teacher K.\,N.\,Rao, one conviction has only grown stronger: astrology is a lamp, not a verdict.

This ${tex(def.title)} has been prepared from your exact birth details. Every planetary position, house, period and date in it has been calculated by our own astronomical engine, and every interpretation you read is tied back to those calculated facts. Where the chart is silent, we have chosen to be silent too.

Read it slowly, with an open and calm mind. Return to it at different moments of your life; you will notice different things each time. Above all, remember that the chart describes tendencies and seasons, while the choices are always yours.

With blessings,\par\vspace{2mm}
{\displayfont\fontsize{13}{16}\selectfont\color{Primary}Astro Sushil\par}
\end{minipage}
\clearpage
`;
}

/**
 * The philosophy page. By the owner's decision (2026-11-24) a report does not mention how its text
 * was written or name any provider; `_llmProviderLabel` is accepted for compatibility and not printed
 * (the provider and model are recorded in the manifest).
 */
export function philosophyPage(_llmProviderLabel: string, language: EditorialLang = 'en'): string {
  if (language === 'hi') return philosophyPageHi();
  return String.raw`\markboth{Our Philosophy}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}BEFORE YOU BEGIN}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}Our Philosophy \& Your Freedom of Choice\par}\vspace{1mm}
\SectionDivider
\begin{asCard}\CardTitleStar{Astrology as cosmic weather, not fate}
{\fontsize{9.5}{13.5}\selectfont Jyotish, the science of light, maps the sky at the moment of your birth. It describes inclinations, strengths and seasons of life, much as a weather forecast describes conditions rather than commanding them. Your effort, values and choices remain the decisive factors.\par}\end{asCard}
\vspace{2mm}
\begin{asCaution}\CardTitle{We do not believe in doshas}
{\fontsize{9.5}{13.5}\selectfont Astro Sushil does not believe in doshas as curses, punishments or sources of fear. Configurations that are often sensationalised --- Manglik, Kaal Sarp, Pitra, Nadi, Kemadruma or Sade Sati --- are, in authentic analysis, developmental themes that call for awareness and maturity, never for panic. Where this report mentions such a configuration, it is explained calmly and constructively. No remedy in this report requires you to buy anything.\par}\end{asCaution}
\vspace{2mm}
\begin{asCard}\CardTitle{Not a substitute for professional advice}
{\fontsize{9.5}{13.5}\selectfont This report is for self-reflection and guidance. It is not medical, psychological, legal, financial or investment advice, and it does not promise any outcome. For decisions in those areas, please consult a qualified professional.\par}\end{asCard}
\vspace{2mm}
\begin{asCard}\CardTitle{How this report was calculated}
{\fontsize{9.5}{13.5}\selectfont All astronomical calculations (planetary positions, houses, divisional charts, periods and transit dates) are computed by Astro Sushil's own calculation engine (sidereal zodiac, Lahiri ayanamsa, whole-sign houses, mean lunar nodes). Every chart statement in this report was checked against the calculated chart before inclusion.\par}\end{asCard}
\clearpage
`;
}

export function howToReadPage(def: ReportDefinition): string {
  if (def.language === 'hi') return howToReadPageHi(def);
  return String.raw`\markboth{How to Read This Report}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}A GUIDE}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}How to Read This Report\par}\vspace{1mm}
\SectionDivider
{\fontsize{10}{14.5}\selectfont
\begin{asQuote}{\itshape\color{PrimaryDeep}${tex(def.description)}\par}\end{asQuote}
\vspace{2mm}
\begin{gemlist}
  \item \textbf{Start with your chart.} The first section shows the calculated facts this report is built on. Every interpretation later refers back to them.
  \item \textbf{Read section by section.} Each topic opens with a short lead, explains the relevant astrology in plain language, and closes with an “In Essence” summary.
  \item \textbf{Treat timing as seasons.} Dates mark supportive or demanding periods, not guaranteed events.
  \item \textbf{Return to it.} The same placement can mean something new to you at a different stage of life.
\end{gemlist}
\par}
\vspace{4mm}
\begin{asHighlight}\CardTitleStar{A few terms}
{\fontsize{9.3}{13}\selectfont \textbf{Lagna (Ascendant):} the sign rising at birth, the lens of the whole chart. \textbf{House (Bhava):} one of twelve areas of life. \textbf{Nakshatra:} one of 27 lunar mansions. \textbf{Dasha:} a planetary period in the Vimshottari system. \textbf{D9 (Navamsa):} the divisional chart of partnership and inner strength. \textbf{Transit (Gochar):} the present movement of planets through your chart.\par}\end{asHighlight}
\clearpage
`;
}

export function contentsPage(language: EditorialLang = 'en'): string {
  if (language === 'hi') return contentsPageHi();
  return String.raw`\markboth{Contents}{}
\vspace*{4mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}Contents\par}\vspace{1mm}
\SectionDivider
\makeatletter\@starttoc{toc}\makeatother
\clearpage
`;
}

export function closingPage(def: ReportDefinition): string {
  if (def.language === 'hi') return closingPageHi(def);
  return String.raw`\clearpage\markboth{Closing Words}{}
\vspace*{28mm}
\begin{center}
\includegraphics[height=22mm]{assets/astrosushil_logo.png}\par\vspace{7mm}
{\displayfont\fontsize{20}{25}\selectfont\color{Primary}The stars incline; you decide.\par}\vspace{2mm}
\SectionDivider
\begin{asQuote}
\begin{minipage}{125mm}\centering\fontsize{10}{14.5}\selectfont
Thank you for reading your ${tex(def.title)}. May it bring you clarity, patience and confidence in the choices ahead. If you would like to explore any part of it more deeply, a personal consultation is always available at astrosushil.com.
\end{minipage}
\end{asQuote}\par\vspace{8mm}
{\sffamily\fontsize{7.5}{9.5}\selectfont\color{Muted}Astro Sushil\enspace\textbar\enspace astrosushil.com\par}
\end{center}
`;
}

// ---------------------------------------------------------------------------
// Hindi editions (def.language === 'hi'). Same layout and the same statements
// as the English pages, written in Hindi; English pages above are unchanged.
// ---------------------------------------------------------------------------

function coverPageHi(def: ReportDefinition, c: CoverInfo): string {
  const assetKey = reportAssetKey(def);
  const line = (d: string, t: string | undefined, p: string) =>
    `${tex(d)}${t ? ` \\enspace\\textbar\\enspace ${tex(t)}` : ''} \\enspace\\textbar\\enspace ${tex(p)}`;
  // A two-person report shows both birth lines, as the English cover does.
  const birth = c.partner
    ? `\\textbf{${tex(c.clientName.split(' & ')[0])}:} ${line(c.dateOfBirth, c.timeOfBirth, c.placeName)}\\\\[1mm]\\textbf{${tex(c.partner.name)}:} ${line(c.partner.dateOfBirth, c.partner.timeOfBirth, c.partner.placeName)}`
    : line(c.dateOfBirth, c.timeOfBirth, c.placeName);
  return String.raw`\thispagestyle{empty}
\begin{tikzpicture}[remember picture,overlay]
  \node[anchor=center,inner sep=0pt] at (current page.center) {\includegraphics[width=\paperwidth,height=\paperheight]{assets/covers/${assetKey}.jpg}};
  \node[anchor=south,inner sep=0pt] at ([yshift=3.5mm]current page.south) {
    \begin{tcolorbox}[enhanced,colback=CoverJewel,opacityback=0.94,colframe=CoverGold!85,boxrule=0.8pt,arc=2.2mm,width=158mm,left=6mm,right=6mm,top=4.2mm,bottom=4.2mm,borderline={0.35pt}{1.5pt}{CoverGold!40}]
      \centering
      \includegraphics[height=11mm,keepaspectratio]{assets/astrosushil_logo_gold.png}\par\vspace{1.5mm}
      {\sffamily\fontsize{7.5}{9.5}\selectfont\bfseries\color{CoverBrightGold}ASTRO SUSHIL\enspace\textbullet\enspace वैदिक एवं नाड़ी ज्योतिष}\par\vspace{1.8mm}
      {\displayfont\fontsize{18}{24}\selectfont\color{CoverGoldTint}${tex(def.title)}\par}\vspace{1mm}
      {\fontsize{9}{13}\selectfont\color{CoverGoldTint!85}${tex(def.subtitle)}\par}\vspace{2.4mm}
      {\color{CoverGold!65}\rule{36mm}{0.5pt}}\par\vspace{2.4mm}
      {\sffamily\fontsize{7.5}{9.5}\selectfont\bfseries\color{CoverGold}विशेष रूप से आपके लिए तैयार}\par\vspace{1.2mm}
      {\displayfont\fontsize{16.5}{21}\selectfont\color{white}${tex(c.clientName)}\par}\vspace{1.4mm}
      {\sffamily\fontsize{8}{11}\selectfont\color{CoverGoldTint!92}${birth}\par}\vspace{2.6mm}
      {\sffamily\fontsize{7.2}{9}\selectfont\color{CoverBrightGold!85}व्यक्तिगत एवं गोपनीय\enspace\textbar\enspace ${tex(c.generatedOn)}\enspace\textbar\enspace astrosushil.com}\par
    \end{tcolorbox}};
\end{tikzpicture}
\null\clearpage
`;
}

function authorNotePageHi(def: ReportDefinition): string {
  return String.raw`\markboth{एस्ट्रो सुशील का संदेश}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}स्वागत}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}एस्ट्रो सुशील का संदेश\par}\vspace{1mm}
\SectionDivider
\begin{minipage}[t]{0.30\linewidth}\vspace{0pt}
  \begin{tcolorbox}[enhanced,colback=white,colframe=Primary,boxrule=0.8pt,arc=1.8mm,left=1.5mm,right=1.5mm,top=1.5mm,bottom=1.5mm,boxsep=0pt]
    \includegraphics[width=\linewidth]{assets/about_sushil.png}
  \end{tcolorbox}
  \begin{center}{\sffamily\fontsize{10}{12}\selectfont\bfseries\color{Primary}Astro Sushil\par}\vspace{0.8mm}
  {\sffamily\fontsize{7.5}{10}\selectfont\color{Muted}वैदिक एवं नाड़ी ज्योतिषी\\ के.\,एन.\,राव परंपरा\par}\end{center}
\end{minipage}\hfill
\begin{minipage}[t]{0.65\linewidth}\vspace{0pt}
\fontsize{10.3}{16}\selectfont
नमस्ते,

अपने जन्म विवरण जैसी निजी जानकारी के लिए मुझ पर विश्वास करने हेतु धन्यवाद। सितारों के साथ मेरी यात्रा छह वर्ष की आयु में शुरू हुई थी, और अपने पूज्य गुरु के.\,एन.\,राव जी की परंपरा में दशकों के अध्ययन के बाद मेरा एक विश्वास और दृढ़ हुआ है: ज्योतिष एक दीपक है, कोई अंतिम निर्णय नहीं।

यह ${tex(def.title)} आपके सटीक जन्म विवरण से तैयार की गई है। इसमें दिया गया हर अंक, अवधि और तिथि हमारे अपने गणना-इंजन से निकाली गई है, और हर व्याख्या उन्हीं गणना किए गए तथ्यों से जुड़ी है। जहाँ गणना मौन है, वहाँ हमने भी मौन रहना चुना है।

इसे धीरे-धीरे, खुले और शांत मन से पढ़ें। जीवन के अलग-अलग पड़ावों पर इसे फिर से पढ़ें; हर बार आपको कुछ नया दिखेगा। सबसे बढ़कर याद रखें कि अंक और ग्रह प्रवृत्तियों और समय के मौसमों का वर्णन करते हैं, जबकि चुनाव सदा आपके हाथ में रहता है।

शुभाशीष सहित,\par\vspace{2mm}
{\displayfont\fontsize{13}{16}\selectfont\color{Primary}Astro Sushil\par}
\end{minipage}
\clearpage
`;
}

function philosophyPageHi(): string {
  return String.raw`\markboth{हमारा दर्शन}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}आरंभ से पहले}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}हमारा दर्शन और आपकी चुनने की स्वतंत्रता\par}\vspace{1mm}
\SectionDivider
\begin{asCard}\CardTitleStar{ज्योतिष: भाग्य का आदेश नहीं, ब्रह्मांड का मौसम}
{\fontsize{9.8}{14.5}\selectfont ज्योतिष, अर्थात प्रकाश का विज्ञान, आपके जन्म के क्षण के आकाश का मानचित्र है, और अंकशास्त्र आपकी जन्म तिथि और नाम के अंकों को पढ़ता है। दोनों झुकावों, क्षमताओं और जीवन के मौसमों का वर्णन करते हैं, ठीक वैसे ही जैसे मौसम का पूर्वानुमान परिस्थितियाँ बताता है, आदेश नहीं देता। आपका प्रयास, मूल्य और चुनाव ही निर्णायक रहते हैं।\par}\end{asCard}
\vspace{2mm}
\begin{asCaution}\CardTitle{हम दोषों में विश्वास नहीं करते}
{\fontsize{9.8}{14.5}\selectfont एस्ट्रो सुशील दोषों को श्राप, दंड या भय का कारण नहीं मानते। मांगलिक, काल सर्प, पितृ, नाड़ी, केमद्रुम या साढ़े साती जैसी स्थितियाँ, जिन्हें अक्सर सनसनीखेज़ बना दिया जाता है, प्रामाणिक विश्लेषण में जागरूकता और परिपक्वता माँगने वाले विकास के विषय हैं, घबराहट के नहीं। जहाँ इस रिपोर्ट में ऐसी किसी स्थिति का उल्लेख है, उसे शांत और रचनात्मक ढंग से समझाया गया है। इस रिपोर्ट के किसी भी उपाय के लिए आपको कुछ भी खरीदने की आवश्यकता नहीं है।\par}\end{asCaution}
\vspace{2mm}
\begin{asCard}\CardTitle{पेशेवर सलाह का विकल्प नहीं}
{\fontsize{9.8}{14.5}\selectfont यह रिपोर्ट आत्म-चिंतन और मार्गदर्शन के लिए है। यह चिकित्सीय, मनोवैज्ञानिक, कानूनी, वित्तीय या निवेश संबंधी सलाह नहीं है, और किसी परिणाम का वादा नहीं करती। ऐसे निर्णयों के लिए कृपया किसी योग्य विशेषज्ञ से परामर्श लें।\par}\end{asCard}
\vspace{2mm}
\begin{asCard}\CardTitle{इस रिपोर्ट की गणना कैसे हुई}
{\fontsize{9.8}{14.5}\selectfont सभी गणनाएँ (अंकशास्त्रीय अंक, ग्रहों की स्थितियाँ, भाव, वर्ग-कुंडलियाँ, अवधियाँ और गोचर तिथियाँ) एस्ट्रो सुशील के अपने गणना-इंजन से की गई हैं (निरयण राशिचक्र, लाहिड़ी अयनांश, पूर्ण-राशि भाव, मध्यम राहु-केतु)। इस रिपोर्ट का हर ज्योतिषीय और अंकशास्त्रीय कथन शामिल करने से पहले गणना किए गए तथ्यों से जाँचा गया।\par}\end{asCard}
\clearpage
`;
}

function howToReadPageHi(def: ReportDefinition): string {
  return String.raw`\markboth{इस रिपोर्ट को कैसे पढ़ें}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}मार्गदर्शिका}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}इस रिपोर्ट को कैसे पढ़ें\par}\vspace{1mm}
\SectionDivider
{\fontsize{10.3}{16}\selectfont
\begin{asQuote}{\color{PrimaryDeep}${tex(def.description)}\par}\end{asQuote}
\vspace{2mm}
\begin{gemlist}
  \item \textbf{पहले अपने अंक देखें।} पहला खंड वे गणना किए गए तथ्य दिखाता है जिन पर यह रिपोर्ट आधारित है; आगे की हर व्याख्या उन्हीं से जुड़ी है।
  \item \textbf{खंड-दर-खंड पढ़ें।} हर विषय एक संक्षिप्त भूमिका से शुरू होता है, सरल भाषा में समझाता है, और “सार” के साथ समाप्त होता है।
  \item \textbf{समय को मौसम की तरह लें।} महीने और तिथियाँ सहायक या परिश्रम माँगने वाले समय दिखाते हैं, निश्चित घटनाएँ नहीं।
  \item \textbf{इसे फिर से पढ़ें।} जीवन के अलग पड़ाव पर वही बात नया अर्थ दे सकती है।
\end{gemlist}
\par}
\vspace{4mm}
\begin{asHighlight}\CardTitleStar{कुछ शब्द}
{\fontsize{9.6}{14}\selectfont \textbf{मूलांक:} जन्म दिन के अंकों का योग (1–9)। \textbf{भाग्यांक:} पूरी जन्म तिथि के अंकों का योग। \textbf{नामांक:} नाम के अक्षरों का कैल्डियन योग। \textbf{लो शू ग्रिड:} जन्म तिथि के अंकों से भरा 3×3 वर्ग। \textbf{कुआ नंबर:} सौर जन्म वर्ष और लिंग से निकली संख्या, जो शुभ दिशाएँ बताती है। \textbf{व्यक्तिगत वर्ष और माह:} हर वर्ष और हर महीने का अंक-चक्र।\par}\end{asHighlight}
\clearpage
`;
}

function contentsPageHi(): string {
  return String.raw`\markboth{विषय-सूची}{}
\vspace*{4mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}विषय-सूची\par}\vspace{1mm}
\SectionDivider
\makeatletter\@starttoc{toc}\makeatother
\clearpage
`;
}

function closingPageHi(def: ReportDefinition): string {
  return String.raw`\clearpage\markboth{अंतिम शब्द}{}
\vspace*{28mm}
\begin{center}
\includegraphics[height=22mm]{assets/astrosushil_logo.png}\par\vspace{7mm}
{\displayfont\fontsize{20}{27}\selectfont\color{Primary}सितारे झुकाव देते हैं; निर्णय आपका है।\par}\vspace{2mm}
\SectionDivider
\begin{asQuote}
\begin{minipage}{125mm}\centering\fontsize{10.3}{16}\selectfont
अपनी ${tex(def.title)} पढ़ने के लिए धन्यवाद। यह आपको आगे के चुनावों में स्पष्टता, धैर्य और आत्मविश्वास दे। यदि आप किसी भाग को और गहराई से समझना चाहें, तो astrosushil.com पर व्यक्तिगत परामर्श सदैव उपलब्ध है।
\end{minipage}
\end{asQuote}\par\vspace{8mm}
{\sffamily\fontsize{7.5}{9.5}\selectfont\color{Muted}Astro Sushil\enspace\textbar\enspace astrosushil.com\par}
\end{center}
`;
}
