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

/**
 * Language of the document being assembled. `coverPage` is always the first
 * editorial call of `assembleDocument`, so it records `def.language` here for
 * the pages whose signatures carry no definition (`philosophyPage`,
 * `contentsPage`). Both also accept an explicit language.
 */

/**
 * Document-level set-up for Hindi: an ActualText layer so the extracted PDF
 * text matches the Devanagari source (search, copy, PDF QA), danda glyphs from
 * the Devanagari font (dandas join the Devanagari character class), and a Hindi label for the "In Essence" box.
 */
function hindiSetup(): string {
  return String.raw`\XeTeXgenerateactualtext=1
\XeTeXcharclass"0964=\XeTeXcharclass"0915 \XeTeXcharclass"0965=\XeTeXcharclass"0915
\renewcommand{\Takeaway}[1]{\begin{asHighlight}\CardTitle{सार}{\fontsize{9.8}{13.5}\selectfont #1\par}\end{asHighlight}}
`;
}

export function coverPage(def: ReportDefinition, c: CoverInfo): string {
  if (def.language === 'hi') return hindiSetup() + coverPageHi(def, c);
  const line = (d: string, t: string | undefined, p: string) =>
    `${tex(d)}${t ? ` \\enspace\\textbar\\enspace ${tex(t)}` : ''} \\enspace\\textbar\\enspace ${tex(p)}`;
  const birth = c.partner
    ? `\\textbf{${tex(c.clientName.split(' & ')[0])}:} ${line(c.dateOfBirth, c.timeOfBirth, c.placeName)}\\\\[1mm]\\textbf{${tex(c.partner.name)}:} ${line(c.partner.dateOfBirth, c.partner.timeOfBirth, c.partner.placeName)}`
    : line(c.dateOfBirth, c.timeOfBirth, c.placeName);
  return String.raw`\thispagestyle{empty}
\begin{tikzpicture}[remember picture,overlay]
  \node[anchor=center,inner sep=0pt] at (current page.center) {\includegraphics[width=\paperwidth,height=\paperheight]{assets/celestial_cover.jpg}};
  \node[anchor=center,inner sep=0pt] at ([yshift=-40mm]current page.center) {
    \begin{minipage}{150mm}\centering
      \includegraphics[height=24mm,keepaspectratio]{assets/astrosushil_logo_gold.png}\par\vspace{4mm}
      {\sffamily\fontsize{8}{10}\selectfont\bfseries\color{CoverBrightGold}ASTRO SUSHIL\enspace\textbullet\enspace VEDIC \& NADI ASTROLOGY}\par\vspace{2mm}
      {\color{CoverGold!70}\rule{32mm}{0.6pt}}\par\vspace{6mm}
      {\displayfont\fontsize{27}{33}\selectfont\color{CoverGoldTint}${tex(def.title)}\par}\vspace{3mm}
      {\fontsize{10.5}{14}\selectfont\itshape\color{CoverGoldTint!85}${tex(def.subtitle)}\par}\vspace{9mm}
      \begin{tcolorbox}[enhanced,colback=CoverCard!92,colframe=CoverGold!50,boxrule=0.6pt,arc=1.5mm,width=130mm,left=5mm,right=5mm,top=4mm,bottom=4mm,center]
        \centering
        {\sffamily\fontsize{7}{9}\selectfont\bfseries\color{CoverGold}PREPARED EXCLUSIVELY FOR}\par\vspace{2mm}
        {\displayfont\fontsize{17}{21}\selectfont\color{white}${tex(c.clientName)}\par}\vspace{2mm}
        {\color{CoverGold!40}\rule{28mm}{0.4pt}}\par\vspace{2mm}
        {\sffamily\fontsize{8}{11}\selectfont\color{CoverGoldTint!90}${birth}\par}
      \end{tcolorbox}\par\vspace{6mm}
      {\sffamily\fontsize{7}{9}\selectfont\color{CoverGoldTint!70}PERSONAL \& CONFIDENTIAL\enspace\textbar\enspace ${tex(c.generatedOn)}}\par
    \end{minipage}};
\end{tikzpicture}
\null\clearpage
`;
}

export function authorNotePage(def: ReportDefinition): string {
  if (def.language === 'hi') return authorNotePageHi(def);
  return String.raw`\markboth{A Note from Astro Sushil}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}WELCOME}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}A Note from Astro Sushil\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{5mm}
\begin{minipage}[t]{0.30\linewidth}\vspace{0pt}
  \begin{tcolorbox}[enhanced,colback=white,colframe=Primary,boxrule=0.8pt,arc=1.5mm,left=1.5mm,right=1.5mm,top=1.5mm,bottom=1.5mm,boxsep=0pt]
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

export function philosophyPage(llmProviderLabel: string, language: EditorialLang = 'en'): string {
  if (language === 'hi') return philosophyPageHi(llmProviderLabel);
  return String.raw`\markboth{Our Philosophy}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}BEFORE YOU BEGIN}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}Our Philosophy \& Your Freedom of Choice\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{4mm}
\begin{asCard}\CardTitle{Astrology as cosmic weather, not fate}
{\fontsize{9.5}{13.5}\selectfont Jyotish, the science of light, maps the sky at the moment of your birth. It describes inclinations, strengths and seasons of life, much as a weather forecast describes conditions rather than commanding them. Your effort, values and choices remain the decisive factors.\par}\end{asCard}
\vspace{2mm}
\begin{asCaution}\CardTitle{We do not believe in doshas}
{\fontsize{9.5}{13.5}\selectfont Astro Sushil does not believe in doshas as curses, punishments or sources of fear. Configurations that are often sensationalised --- Manglik, Kaal Sarp, Pitra, Nadi, Kemadruma or Sade Sati --- are, in authentic analysis, developmental themes that call for awareness and maturity, never for panic. Where this report mentions such a configuration, it is explained calmly and constructively. No remedy in this report requires you to buy anything.\par}\end{asCaution}
\vspace{2mm}
\begin{asCard}\CardTitle{Not a substitute for professional advice}
{\fontsize{9.5}{13.5}\selectfont This report is for self-reflection and guidance. It is not medical, psychological, legal, financial or investment advice, and it does not promise any outcome. For decisions in those areas, please consult a qualified professional.\par}\end{asCard}
\vspace{2mm}
\begin{asCard}\CardTitle{How this report was made, and your data}
{\fontsize{9.5}{13.5}\selectfont All astronomical calculations (planetary positions, houses, divisional charts, periods and transit dates) are computed by Astro Sushil's own calculation engine (sidereal zodiac, Lahiri ayanamsa, whole-sign houses, mean lunar nodes). The personalised narrative was then written with the help of an AI language model operated by a third-party provider (${tex(llmProviderLabel)}). Only derived chart facts --- such as “Venus in the 7th house” --- were shared with that model; your name, date, time and place of birth were not. Every chart statement in the narrative was automatically checked against the calculated chart before inclusion.\par}\end{asCard}
\clearpage
`;
}

export function howToReadPage(def: ReportDefinition): string {
  if (def.language === 'hi') return howToReadPageHi(def);
  return String.raw`\markboth{How to Read This Report}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}A GUIDE}\par\vspace{2mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}How to Read This Report\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{4mm}
{\fontsize{10}{14.5}\selectfont
${tex(def.description)}

\begin{gemlist}
  \item \textbf{Start with your chart.} The first section shows the calculated facts this report is built on. Every interpretation later refers back to them.
  \item \textbf{Read section by section.} Each topic opens with a short lead, explains the relevant astrology in plain language, and closes with an “In Essence” summary.
  \item \textbf{Treat timing as seasons.} Dates mark supportive or demanding periods, not guaranteed events.
  \item \textbf{Return to it.} The same placement can mean something new to you at a different stage of life.
\end{gemlist}
\par}
\vspace{4mm}
\begin{asHighlight}\CardTitle{A few terms}
{\fontsize{9.3}{13}\selectfont \textbf{Lagna (Ascendant):} the sign rising at birth, the lens of the whole chart. \textbf{House (Bhava):} one of twelve areas of life. \textbf{Nakshatra:} one of 27 lunar mansions. \textbf{Dasha:} a planetary period in the Vimshottari system. \textbf{D9 (Navamsa):} the divisional chart of partnership and inner strength. \textbf{Transit (Gochar):} the present movement of planets through your chart.\par}\end{asHighlight}
\clearpage
`;
}

export function contentsPage(language: EditorialLang = 'en'): string {
  if (language === 'hi') return contentsPageHi();
  return String.raw`\markboth{Contents}{}
\vspace*{4mm}
{\displayfont\fontsize{22}{27}\selectfont\color{Primary}Contents\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{3mm}
\makeatletter\@starttoc{toc}\makeatother
\clearpage
`;
}

export function closingPage(def: ReportDefinition): string {
  if (def.language === 'hi') return closingPageHi(def);
  return String.raw`\clearpage\markboth{Closing Words}{}
\vspace*{30mm}
\begin{center}
\includegraphics[height=22mm]{assets/astrosushil_logo.png}\par\vspace{8mm}
{\displayfont\fontsize{20}{25}\selectfont\color{Primary}The stars incline; you decide.\par}\vspace{4mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{6mm}
\begin{minipage}{125mm}\centering\fontsize{10}{14.5}\selectfont
Thank you for reading your ${tex(def.title)}. May it bring you clarity, patience and confidence in the choices ahead. If you would like to explore any part of it more deeply, a personal consultation is always available at astrosushil.com.
\end{minipage}\par\vspace{10mm}
{\sffamily\fontsize{7.5}{9.5}\selectfont\color{Muted}Astro Sushil\enspace\textbar\enspace astrosushil.com\par}
\end{center}
`;
}

// ---------------------------------------------------------------------------
// Hindi editions (def.language === 'hi'). Same layout and the same statements
// as the English pages, written in Hindi; English pages above are unchanged.
// ---------------------------------------------------------------------------

function coverPageHi(def: ReportDefinition, c: CoverInfo): string {
  const birth = `${tex(c.dateOfBirth)}${c.timeOfBirth ? ` \\enspace\\textbar\\enspace ${tex(c.timeOfBirth)}` : ''} \\enspace\\textbar\\enspace ${tex(c.placeName)}`;
  return String.raw`\thispagestyle{empty}
\begin{tikzpicture}[remember picture,overlay]
  \node[anchor=center,inner sep=0pt] at (current page.center) {\includegraphics[width=\paperwidth,height=\paperheight]{assets/celestial_cover.jpg}};
  \node[anchor=center,inner sep=0pt] at ([yshift=-40mm]current page.center) {
    \begin{minipage}{150mm}\centering
      \includegraphics[height=24mm,keepaspectratio]{assets/astrosushil_logo_gold.png}\par\vspace{4mm}
      {\sffamily\fontsize{8.5}{11}\selectfont\bfseries\color{CoverBrightGold}ASTRO SUSHIL\enspace\textbullet\enspace वैदिक एवं नाड़ी ज्योतिष}\par\vspace{2mm}
      {\color{CoverGold!70}\rule{32mm}{0.6pt}}\par\vspace{6mm}
      {\displayfont\fontsize{29}{38}\selectfont\color{CoverGoldTint}${tex(def.title)}\par}\vspace{3mm}
      {\fontsize{11}{16}\selectfont\color{CoverGoldTint!85}${tex(def.subtitle)}\par}\vspace{9mm}
      \begin{tcolorbox}[enhanced,colback=CoverCard!92,colframe=CoverGold!50,boxrule=0.6pt,arc=1.5mm,width=130mm,left=5mm,right=5mm,top=4mm,bottom=4mm,center]
        \centering
        {\sffamily\fontsize{8}{10}\selectfont\bfseries\color{CoverGold}विशेष रूप से आपके लिए तैयार}\par\vspace{2mm}
        {\displayfont\fontsize{17}{21}\selectfont\color{white}${tex(c.clientName)}\par}\vspace{2mm}
        {\color{CoverGold!40}\rule{28mm}{0.4pt}}\par\vspace{2mm}
        {\sffamily\fontsize{8}{11}\selectfont\color{CoverGoldTint!90}${birth}\par}
      \end{tcolorbox}\par\vspace{6mm}
      {\sffamily\fontsize{7.5}{9.5}\selectfont\color{CoverGoldTint!70}व्यक्तिगत एवं गोपनीय\enspace\textbar\enspace ${tex(c.generatedOn)}}\par
    \end{minipage}};
\end{tikzpicture}
\null\clearpage
`;
}

function authorNotePageHi(def: ReportDefinition): string {
  return String.raw`\markboth{एस्ट्रो सुशील का संदेश}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}स्वागत}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}एस्ट्रो सुशील का संदेश\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{5mm}
\begin{minipage}[t]{0.30\linewidth}\vspace{0pt}
  \begin{tcolorbox}[enhanced,colback=white,colframe=Primary,boxrule=0.8pt,arc=1.5mm,left=1.5mm,right=1.5mm,top=1.5mm,bottom=1.5mm,boxsep=0pt]
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

function philosophyPageHi(llmProviderLabel: string): string {
  return String.raw`\markboth{हमारा दर्शन}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}आरंभ से पहले}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}हमारा दर्शन और आपकी चुनने की स्वतंत्रता\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{4mm}
\begin{asCard}\CardTitle{ज्योतिष: भाग्य का आदेश नहीं, ब्रह्मांड का मौसम}
{\fontsize{9.8}{14.5}\selectfont ज्योतिष, अर्थात प्रकाश का विज्ञान, आपके जन्म के क्षण के आकाश का मानचित्र है, और अंकशास्त्र आपकी जन्म तिथि और नाम के अंकों को पढ़ता है। दोनों झुकावों, क्षमताओं और जीवन के मौसमों का वर्णन करते हैं, ठीक वैसे ही जैसे मौसम का पूर्वानुमान परिस्थितियाँ बताता है, आदेश नहीं देता। आपका प्रयास, मूल्य और चुनाव ही निर्णायक रहते हैं।\par}\end{asCard}
\vspace{2mm}
\begin{asCaution}\CardTitle{हम दोषों में विश्वास नहीं करते}
{\fontsize{9.8}{14.5}\selectfont एस्ट्रो सुशील दोषों को श्राप, दंड या भय का कारण नहीं मानते। मांगलिक, काल सर्प, पितृ, नाड़ी, केमद्रुम या साढ़े साती जैसी स्थितियाँ, जिन्हें अक्सर सनसनीखेज़ बना दिया जाता है, प्रामाणिक विश्लेषण में जागरूकता और परिपक्वता माँगने वाले विकास के विषय हैं, घबराहट के नहीं। जहाँ इस रिपोर्ट में ऐसी किसी स्थिति का उल्लेख है, उसे शांत और रचनात्मक ढंग से समझाया गया है। इस रिपोर्ट के किसी भी उपाय के लिए आपको कुछ भी खरीदने की आवश्यकता नहीं है।\par}\end{asCaution}
\vspace{2mm}
\begin{asCard}\CardTitle{पेशेवर सलाह का विकल्प नहीं}
{\fontsize{9.8}{14.5}\selectfont यह रिपोर्ट आत्म-चिंतन और मार्गदर्शन के लिए है। यह चिकित्सीय, मनोवैज्ञानिक, कानूनी, वित्तीय या निवेश संबंधी सलाह नहीं है, और किसी परिणाम का वादा नहीं करती। ऐसे निर्णयों के लिए कृपया किसी योग्य विशेषज्ञ से परामर्श लें।\par}\end{asCard}
\vspace{2mm}
\begin{asCard}\CardTitle{यह रिपोर्ट कैसे बनी, और आपका डेटा}
{\fontsize{9.8}{14.5}\selectfont सभी गणनाएँ (अंकशास्त्रीय अंक, ग्रहों की स्थितियाँ, भाव, वर्ग-कुंडलियाँ, अवधियाँ और गोचर तिथियाँ) एस्ट्रो सुशील के अपने गणना-इंजन से की गई हैं (निरयण राशिचक्र, लाहिड़ी अयनांश, पूर्ण-राशि भाव, मध्यम राहु-केतु)। इसके बाद व्यक्तिगत विवरण एक तृतीय-पक्ष प्रदाता (${tex(llmProviderLabel)}) द्वारा संचालित AI भाषा मॉडल की सहायता से लिखा गया। उस मॉडल के साथ केवल गणना से प्राप्त तथ्य --- जैसे “मूलांक 1 है” --- साझा किए गए; आपका नाम, जन्म तिथि, समय और स्थान साझा नहीं किए गए। विवरण का हर ज्योतिषीय और अंकशास्त्रीय कथन रिपोर्ट में शामिल करने से पहले गणना किए गए तथ्यों से स्वचालित रूप से जाँचा गया।\par}\end{asCard}
\clearpage
`;
}

function howToReadPageHi(def: ReportDefinition): string {
  return String.raw`\markboth{इस रिपोर्ट को कैसे पढ़ें}{}
\vspace*{4mm}
{\sffamily\fontsize{8.5}{10}\selectfont\bfseries\color{Accent}मार्गदर्शिका}\par\vspace{2mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}इस रिपोर्ट को कैसे पढ़ें\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{4mm}
{\fontsize{10.3}{16}\selectfont
${tex(def.description)}

\begin{gemlist}
  \item \textbf{पहले अपने अंक देखें।} पहला खंड वे गणना किए गए तथ्य दिखाता है जिन पर यह रिपोर्ट आधारित है; आगे की हर व्याख्या उन्हीं से जुड़ी है।
  \item \textbf{खंड-दर-खंड पढ़ें।} हर विषय एक संक्षिप्त भूमिका से शुरू होता है, सरल भाषा में समझाता है, और “सार” के साथ समाप्त होता है।
  \item \textbf{समय को मौसम की तरह लें।} महीने और तिथियाँ सहायक या परिश्रम माँगने वाले समय दिखाते हैं, निश्चित घटनाएँ नहीं।
  \item \textbf{इसे फिर से पढ़ें।} जीवन के अलग पड़ाव पर वही बात नया अर्थ दे सकती है।
\end{gemlist}
\par}
\vspace{4mm}
\begin{asHighlight}\CardTitle{कुछ शब्द}
{\fontsize{9.6}{14}\selectfont \textbf{मूलांक:} जन्म दिन के अंकों का योग (1–9)। \textbf{भाग्यांक:} पूरी जन्म तिथि के अंकों का योग। \textbf{नामांक:} नाम के अक्षरों का कैल्डियन योग। \textbf{लो शू ग्रिड:} जन्म तिथि के अंकों से भरा 3×3 वर्ग। \textbf{कुआ नंबर:} सौर जन्म वर्ष और लिंग से निकली संख्या, जो शुभ दिशाएँ बताती है। \textbf{व्यक्तिगत वर्ष और माह:} हर वर्ष और हर महीने का अंक-चक्र।\par}\end{asHighlight}
\clearpage
`;
}

function contentsPageHi(): string {
  return String.raw`\markboth{विषय-सूची}{}
\vspace*{4mm}
{\displayfont\fontsize{22}{29}\selectfont\color{Primary}विषय-सूची\par}\vspace{1.5mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{3mm}
\makeatletter\@starttoc{toc}\makeatother
\clearpage
`;
}

function closingPageHi(def: ReportDefinition): string {
  return String.raw`\clearpage\markboth{अंतिम शब्द}{}
\vspace*{30mm}
\begin{center}
\includegraphics[height=22mm]{assets/astrosushil_logo.png}\par\vspace{8mm}
{\displayfont\fontsize{20}{27}\selectfont\color{Primary}सितारे झुकाव देते हैं; निर्णय आपका है।\par}\vspace{4mm}
{\color{Accent}\rule{38mm}{0.9pt}}\par\vspace{6mm}
\begin{minipage}{125mm}\centering\fontsize{10.3}{16}\selectfont
अपनी ${tex(def.title)} पढ़ने के लिए धन्यवाद। यह आपको आगे के चुनावों में स्पष्टता, धैर्य और आत्मविश्वास दे। यदि आप किसी भाग को और गहराई से समझना चाहें, तो astrosushil.com पर व्यक्तिगत परामर्श सदैव उपलब्ध है।
\end{minipage}\par\vspace{10mm}
{\sffamily\fontsize{7.5}{9.5}\selectfont\color{Muted}Astro Sushil\enspace\textbar\enspace astrosushil.com\par}
\end{center}
`;
}
