// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appName => 'एस्ट्रो सुशील';

  @override
  String get navHome => 'मुख्य';

  @override
  String get navReports => 'रिपोर्ट्स';

  @override
  String get navConsult => 'परामर्श';

  @override
  String get navAccount => 'खाता';

  @override
  String get welcomeGuest => 'नमस्ते';

  @override
  String welcomeUser(String name) {
    return 'नमस्ते, $name';
  }

  @override
  String get blessingSubtitle =>
      'वैदिक ज्योतिष एवं ग्रह मार्गदर्शन आपके जीवन पथ के लिए।';

  @override
  String get activeProfile => 'सक्रिय प्रोफ़ाइल';

  @override
  String get changeProfile => 'प्रोफ़ाइल बदलें';

  @override
  String get addBirthProfile => 'नई प्रोफ़ाइल जोड़ें';

  @override
  String get noProfileSelected => 'कोई प्रोफ़ाइल चयनित नहीं है';

  @override
  String get createProfilePrompt =>
      'अपनी जन्म कुंडली देखने के लिए जन्म विवरण दर्ज करें।';

  @override
  String get createProfileButton => 'प्रोफ़ाइल बनाएं';

  @override
  String get switchProfile => 'प्रोफ़ाइल चुनें';

  @override
  String get sectionToday => 'आज का पंचांग व ग्रह प्रभाव';

  @override
  String get sectionKeyFeatures => 'मुख्य ज्योतिष सेवाएं';

  @override
  String get sectionExploreTools => 'सम्पूर्ण वैदिक ज्योतिष';

  @override
  String get exploreAllTools => 'सभी वैदिक ज्योतिष साधन';

  @override
  String get exploreAllToolsSubtitle =>
      'वर्ग कुंडलियां, अष्टकवर्ग, षड्बल, केपी, जैमिनी, गोचर एवं वास्तु।';

  @override
  String get toolBirthChart => 'जन्म कुंडली';

  @override
  String get toolBirthChartDesc => 'लग्न कुंडली एवं 12 भावों का विवरण';

  @override
  String get toolPlanets => 'ग्रह स्थितियां';

  @override
  String get toolPlanetsDesc => 'अंश, राशियां, नक्षत्र एवं दृष्टि सम्बंध';

  @override
  String get toolDasha => 'विंशोत्तरी दशा';

  @override
  String get toolDashaDesc => 'वर्तमान एवं आगामी ग्रह दशा काल';

  @override
  String get toolMatchmaking => 'कुंडली मिलान';

  @override
  String get toolMatchmakingDesc => '36 गुण अष्टकूट मिलान एवं मांगलिक विचार';

  @override
  String get toolPanchanga => 'पंचांग व मुहूर्त';

  @override
  String get toolPanchangaDesc => 'तिथि, नक्षत्र, राहुकाल एवं चौघड़िया';

  @override
  String get toolTransits => 'गोचर फल';

  @override
  String get toolTransitsDesc => 'वर्तमान ग्रहों का राशि परिवर्तन व प्रभाव';

  @override
  String get toolRashiBhavishya => 'राशि भविष्य';

  @override
  String get toolRashiBhavishyaDesc => 'चंद्र राशि आधारित दैनिक राशिफल';

  @override
  String get toolVastu => 'वास्तु शास्त्र';

  @override
  String get toolVastuDesc => 'दिशात्मक ऊर्जा एवं घर-कार्यालय उपाय';

  @override
  String get toolGuptaNadi => 'गुप्त नाड़ी विश्लेषण';

  @override
  String get toolGuptaNadiDesc => 'बृहस्पति नंदी नाड़ी (BNN) सिद्ध नियम';

  @override
  String get quickPanchang => 'आज का पंचांग';

  @override
  String get tithi => 'तिथि';

  @override
  String get nakshatra => 'नक्षत्र';

  @override
  String get rahuKaal => 'राहुकाल';

  @override
  String get sunrise => 'सूर्योदय';

  @override
  String get viewFullPanchang => 'सम्पूर्ण पंचांग देखें';

  @override
  String get activeDashaBanner => 'वर्तमान सक्रिय महादशा';

  @override
  String currentMahaDasha(String planet) {
    return '$planet महादशा';
  }

  @override
  String get viewDashaDetails => 'दशा विवरण देखें';

  @override
  String get reportsTitle => 'ज्योतिष रिपोर्ट';

  @override
  String get reportsSubtitle =>
      'सटीक गणितीय गणना पर आधारित विस्तृत व्यक्तिगत रिपोर्ट।';

  @override
  String get availableReports => 'उपलब्ध रिपोर्ट्स';

  @override
  String get careerReportTitle => 'करियर व आजीविका रिपोर्ट';

  @override
  String get careerReportSubtitle => 'दशम भाव, कार्यक्षेत्र व पदोन्नति समय';

  @override
  String get careerReportDesc =>
      'आपके पेशेवर सामर्थ्य, व्यापार, नौकरी एवं उन्नति के शुभ समय का संपूर्ण विश्लेषण।';

  @override
  String get kundliReportTitle => 'जन्म कुंडली महाग्रंथ';

  @override
  String get kundliReportSubtitle =>
      'सम्पूर्ण जीवन चक्र व ग्रह योग (मूल व विस्तृत)';

  @override
  String get marriageReportTitle => 'विवाह अनुकूलता रिपोर्ट';

  @override
  String get marriageReportSubtitle => '36 गुण, मांगलिक दोष निवारण व उपाय';

  @override
  String get miniHoroscopeTitle => 'लघु राशिफल (6 माह गोचर)';

  @override
  String get miniHoroscopeSubtitle =>
      'आगामी 6 महीनों के ग्रह परिवर्तन व शुभ समय';

  @override
  String get generateReport => 'रिपोर्ट बनाएं';

  @override
  String get viewReport => 'रिपोर्ट देखें';

  @override
  String get downloadPdf => 'PDF डाउनलोड करें';

  @override
  String reportInProgress(int progress) {
    return 'तैयार हो रही है ($progress%)';
  }

  @override
  String get deterministicEngineBadge => '100% प्रामाणिक वैदिक गणना';

  @override
  String get comingSoon => 'शीघ्र उपलब्ध';

  @override
  String get consultTitle => 'सुशील जी से परामर्श';

  @override
  String get consultSubtitle =>
      'आदरणीय ज्योतिषाचार्य सुशील कुमार सिंह जी से व्यक्तिगत 1-on-1 परामर्श।';

  @override
  String get consultNoticeTitle => 'परामर्श सूचना';

  @override
  String get consultNoticeBody =>
      'ऐप के माध्यम से स्वचालित कैलेंडर स्लॉट बुकिंग का कार्य प्रगति पर है। वर्तमान में सीधे परामर्श सुशील जी के मुख्य कार्यालय के माध्यम से निर्धारित किए जाते हैं।';

  @override
  String get consultFormatsTitle => 'उपलब्ध परामर्श माध्यम';

  @override
  String get consultVoice => 'ऑडियो कॉल परामर्श';

  @override
  String get consultVoiceDesc =>
      '30 मिनट का व्यक्तिगत ऑडियो सत्र आपके प्रमुख प्रश्नों के लिए।';

  @override
  String get consultVideo => 'वीडियो कॉल परामर्श';

  @override
  String get consultVideoDesc =>
      'विस्तृत वीडियो सत्र जिसमें कुंडली व हस्ताक्षर का गहन विश्लेषण किया जाता है।';

  @override
  String get consultInPerson => 'प्रत्यक्ष भेंट (फेस-टू-फेस)';

  @override
  String get consultInPersonDesc =>
      'दिल्ली/एनसीआर कार्यालय अथवा अन्य शहरों में प्रत्यक्ष व्यक्तिगत परामर्श।';

  @override
  String get consultPrepareTitle => 'परामर्श से पूर्व क्या तैयार रखें';

  @override
  String get consultPrepare1 =>
      'सभी संबंधित व्यक्तियों की सही जन्म तिथि, जन्म समय व जन्म स्थान।';

  @override
  String get consultPrepare2 =>
      'आपके मुख्य विषय अथवा प्रश्न (करियर, विवाह, स्वास्थ्य, आर्थिक स्थिति)।';

  @override
  String get consultInquireWhatsApp => 'व्हाट्सएप पर संपर्क करें';

  @override
  String get consultContactOffice => 'कार्यालय से संपर्क करें';

  @override
  String get consultOfficeDetails =>
      'कार्यालय: क्लियो काउंटी, सेक्टर-121, नोएडा, उत्तर प्रदेश\nफोन: +91 9621127233 / +91 6393551359\nईमेल: connect@astrosushil.com';

  @override
  String get accountTitle => 'मेरा खाता';

  @override
  String get accountSubtitle =>
      'अपनी प्रोफ़ाइल, परिवार की कुंडलियां, भाषा एवं सेटिंग्स प्रबंधित करें।';

  @override
  String get guestModeTitle => 'अतिथि (गेस्ट) मोड सक्रिय';

  @override
  String get guestModeSubtitle =>
      'आपकी कुंडलियां केवल इसी फोन में सुरक्षित हैं। अन्य फोन में उपयोग हेतु खाता बनाएं।';

  @override
  String get createAccount => 'खाता बनाएं';

  @override
  String get signIn => 'साइन इन करें';

  @override
  String get signOut => 'साइन आउट';

  @override
  String get signOutConfirmTitle => 'क्या आप साइन आउट करना चाहते हैं?';

  @override
  String get signOutConfirmMessage =>
      'आपका डेटा सुरक्षित रहेगा। क्या आप बाहर निकलना चाहते हैं?';

  @override
  String get exitGuestModeConfirmTitle => 'अतिथि मोड से बाहर निकलें?';

  @override
  String get exitGuestModeConfirmMessage =>
      'आप पुनः लॉगिन स्क्रीन पर पहुंच जाएंगे।';

  @override
  String get languageSetting => 'ऐप भाषा / Language';

  @override
  String get languageEnglish => 'English (अंग्रेज़ी)';

  @override
  String get languageHindi => 'हिन्दी';

  @override
  String get selectLanguage => 'भाषा चुनें';

  @override
  String get savedProfilesTitle => 'सुरक्षित जन्म कुंडलियां';

  @override
  String get savedProfilesSubtitle =>
      'परिवार एवं मित्रों की कुंडलियां देखें या जोड़ें।';

  @override
  String get appSettingsTitle => 'सेटिंग्स व प्राथमिकताएं';

  @override
  String get helpSupportTitle => 'सहायता एवं व्हाट्सएप सपोर्ट';

  @override
  String get helpSupportSubtitle =>
      'एस्ट्रो सुशील सहायता केंद्र से सीधा संपर्क।';

  @override
  String get privacyPolicyTitle => 'गोपनीयता एवं सुरक्षा';

  @override
  String get privacyPolicySubtitle =>
      'आपकी जन्म जानकारी पूर्णतः गोपनीय रखी जाती है।';

  @override
  String get deleteCacheTitle => 'लोकल रिपोर्ट मेमोरी साफ करें';

  @override
  String get deleteCacheSubtitle =>
      'फोन का स्टोरेज खाली करने हेतु डाउनलोड की गई PDF हटाएं।';

  @override
  String get deleteCacheConfirm =>
      'क्या आप डाउनलोड की गई रिपोर्ट फाइलों को हटाना चाहते हैं?';

  @override
  String get retry => 'पुनः प्रयास करें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get confirm => 'स्वीकार करें';

  @override
  String get close => 'बंद करें';

  @override
  String get save => 'सुरक्षित करें';

  @override
  String get errorOccurred => 'कोई समस्या आई';

  @override
  String get networkError => 'कृपया अपना इंटरनेट कनेक्शन जांचें।';

  @override
  String get emptyStateMessage => 'वर्तमान में कोई जानकारी उपलब्ध नहीं है।';

  @override
  String get accessibilityClose => 'संवाद बंद करें';

  @override
  String get accessibilityBack => 'पीछे जाएं';

  @override
  String get accessibilityMenu => 'नेविगेशन मेनू';

  @override
  String get explainWhatDoesThisMean => 'इसका क्या अर्थ है?';

  @override
  String get explainHowToRead => 'इसे कैसे समझें';

  @override
  String get explainLimitations => 'सीमाएं एवं मार्गदर्शन';

  @override
  String get explainDisclaimer =>
      'वैदिक ज्योतिष आत्म-बोध एवं जीवन मार्गदर्शन के लिए है; यह किसी चिकित्सीय, कानूनी या वित्तीय विशेषज्ञ सलाह का विकल्प नहीं है।';

  @override
  String get explainBirthChartTitle => 'जन्म कुंडली को समझना';

  @override
  String get explainBirthChartWhatIs =>
      'आपकी जन्म कुंडली आपके जन्म के समय और स्थान पर आकाश में स्थित 12 राशियों एवं 12 भावों का आकाशीय मानचित्र है।';

  @override
  String get explainBirthChartHowToRead =>
      'प्रथम भाव (शीर्ष केंद्र का चतुर्भुज) आपका लग्न और मूल व्यक्तित्व दर्शाता है। 1 से 12 तक के अंक राशियां बताते हैं और \'सू\' या \'चं\' जैसे संक्षिप्त नाम ग्रह स्थितियां दर्शाते हैं।';

  @override
  String get explainPlanetsTitle => 'ग्रह स्थितियों को समझना';

  @override
  String get explainPlanetsWhatIs =>
      'वैदिक ज्योतिष में सूर्य से केतु तक नवग्रह जीवन के विभिन्न क्षेत्रों और मनोवैज्ञानिक ऊर्जाओं का संचालन करते हैं।';

  @override
  String get explainPlanetsHowToRead =>
      'प्रत्येक ग्रह की राशि और भाव स्थिति देखें। \'(व)\' या \'(R)\' का अर्थ वक्री ग्रह है, जिसकी ऊर्जा अंतर्मुखी, असाधारण एवं कर्म प्रधान होती है।';

  @override
  String get explainDashaTitle => 'विंशोत्तरी दशा को समझना';

  @override
  String get explainDashaWhatIs =>
      'विंशोत्तरी दशा 120 वर्षों का ग्रह कालचक्र है जो यह बताता है कि इस समय आपके जीवन पर किस ग्रह की ऊर्जा सक्रिय रूप से प्रभावी है।';

  @override
  String get explainDashaHowToRead =>
      'महादशा मुख्य जीवन प्रवाह निर्धारित करती है, जबकि अंतर्दशा दैनिक अनुभवों पर प्रभाव डालती है। सक्रिय काल जानने हेतु आरंभ व समाप्ति तिथियां देखें।';

  @override
  String get explainPanchangaTitle => 'दैनिक पंचांग को समझना';

  @override
  String get explainPanchangaWhatIs =>
      'पंचांग काल के पांच अंगों का प्रतिनिधित्व करता है: तिथि, वार, नक्षत्र, योग और करण।';

  @override
  String get explainPanchangaHowToRead =>
      'शुभता के लिए तिथि व नक्षत्र देखें, और राहुकाल के दौरान महत्वपूर्ण नए कार्यों के प्रारंभ से बचें।';

  @override
  String get explainMatchmakingTitle => 'कुंडली मिलान को समझना';

  @override
  String get explainMatchmakingWhatIs =>
      'अष्टकूट मिलान आठ मानसिक एवं शारीरिक पैमानों पर अनुकूलता का मूल्यांकन करता है, जिसमें कुल 36 गुण होते हैं।';

  @override
  String get explainMatchmakingHowToRead =>
      'पारंपरिक रूप से 18 या अधिक गुण अनुकूल माने जाते हैं। उच्च अंक स्वभाव, भावनात्मक तालमेल (भकूट) और स्वास्थ्य जीवन (नाड़ी) में बेहतर सामंजस्य दर्शाते हैं।';

  @override
  String get explainShadbalaTitle => 'षड्बल ग्रह बल को समझना';

  @override
  String get explainShadbalaWhatIs =>
      'षड्बल छह प्रकार के खगोलीय बलों का आकलन करता है: स्थान बल, दिग बल, काल बल, चेष्टा बल, नैसर्गिक बल और दृग बल।';

  @override
  String get explainShadbalaHowToRead =>
      'प्रत्येक ग्रह का निश्चित न्यूनतम बल विरुपा एवं रूपा में निर्धारित होता है। 1.0 या उससे अधिक अनुपात वाले ग्रह अपने शुभ फल देने में पूर्ण सक्षम होते हैं।';

  @override
  String get explainAshtakavargaTitle => 'अष्टकवर्ग को समझना';

  @override
  String get explainAshtakavargaWhatIs =>
      'अष्टकवर्ग 12 राशियों में आठ संदर्भों द्वारा दिए गए शुभ बिंदुओं (रेखाओं) के वितरण को दर्शाता है।';

  @override
  String get explainAshtakavargaHowToRead =>
      'सर्वाष्टकवर्ग (SAV) में 28 या अधिक बिंदु वाले भाव जीवन में सुदृढ़ एवं सहायक होते हैं, जबकि 25 से कम बिंदु वाले भाव धैर्य और प्रयास की मांग करते हैं।';

  @override
  String get matchmakingSameProfileWarning =>
      'अनुकूलता मिलान हेतु कृपया दो अलग-अलग प्रोफ़ाइल चुनें।';

  @override
  String get dataNotAvailable => 'डेटा उपलब्ध नहीं है';

  @override
  String get calculationUnavailable => 'गणना अनुपलब्ध है';

  @override
  String get consultTabsBook => 'परामर्श बुक करें';

  @override
  String get consultTabsMyAppointments => 'मेरी नियुक्तियाँ';

  @override
  String get consultSelectSlot => 'समय स्लॉट चुनें';

  @override
  String get consultSelectDate => 'तारीख चुनें';

  @override
  String get consultNoSlots =>
      'इस तिथि के लिए कोई समय स्लॉट उपलब्ध नहीं है। कृपया दूसरी तिथि चुनें।';

  @override
  String get consultNoticePrefix => 'आवश्यक न्यूनतम सूचना अवधि:';

  @override
  String consultDaysNotice(int days) {
    return '$days दिन की सूचना';
  }

  @override
  String consultDurationMin(int minutes) {
    return '$minutes मिनट';
  }

  @override
  String get consultInclusiveGST => '18% जीएसटी शामिल';

  @override
  String get consultBookNow => 'अभी बुक करें';

  @override
  String get consultBookingTitle => 'नियुक्ति बुक करें';

  @override
  String get consultSelectProfile => 'जन्म कुंडली प्रोफाइल चुनें';

  @override
  String get consultNoProfile => 'स्वयं के रूप में आगे बढ़ें';

  @override
  String get consultQueryHint =>
      'आपका विशिष्ट प्रश्न या चिंता का विषय (वैकल्पिक)';

  @override
  String consultPayAndConfirm(String amount) {
    return 'भुगतान करें ₹$amount';
  }

  @override
  String get consultBookingSuccess => 'नियुक्ति की पुष्टि हो गई!';

  @override
  String consultBookingReference(String ref) {
    return 'बुकिंग आईडी: $ref';
  }

  @override
  String get consultJoinSession => 'लाइव सत्र में शामिल हों';

  @override
  String get consultReschedule => 'पुनर्निर्धारित करें';

  @override
  String get consultCancel => 'नियुक्ति रद्द करें';

  @override
  String get consultStatusConfirmed => 'पुष्ट';

  @override
  String get consultStatusPending => 'भुगतान प्रतीक्षित';

  @override
  String get consultStatusRescheduled => 'पुनर्निर्धारित';

  @override
  String get consultStatusCancelled => 'रद्द';

  @override
  String get consultStatusCompleted => 'पूर्ण';

  @override
  String get consultNoAppointments => 'कोई परामर्श नियुक्ति नहीं मिली।';

  @override
  String get consultReschedulePolicy =>
      'सत्र शुरू होने से 24 घंटे पहले तक पुनर्निर्धारण की अनुमति है।';

  @override
  String get consultCancellationPolicy =>
      'रद्द करने पर स्लॉट क्षमता नीति के अनुसार मुक्त हो जाती है।';

  @override
  String get coursesNavTitle => 'पाठ्यक्रम';

  @override
  String get coursesScreenTitle => 'वैदिक पाठ्यक्रम एवं मास्टरक्लास';

  @override
  String get coursesSubtitle =>
      'एस्ट्रो सुशील कुमार सिंह से सीखें प्रामाणिक गुप्त नाड़ी एवं फलित ज्योतिष';

  @override
  String get exploreCoursesTab => 'सभी पाठ्यक्रम';

  @override
  String get myLearningTab => 'मेरा अध्ययन';

  @override
  String get searchCoursesHint => 'पाठ्यक्रम, विषय, फलित पद्धति खोजें...';

  @override
  String get allLevels => 'सभी स्तर';

  @override
  String get filterAll => 'सभी';

  @override
  String get courseEnrollNow => 'अभी प्रवेश लें';

  @override
  String get courseEnrolledBadge => 'नामांकित';

  @override
  String get courseContinueLearning => 'अध्ययन जारी रखें';

  @override
  String get courseSyllabus => 'पाठ्यक्रम रूपरेखा';

  @override
  String get courseOverview => 'पाठ्यक्रम परिचय';

  @override
  String get courseFreePreview => 'निःशुल्क पूर्वावलोकन';

  @override
  String get courseLockedLesson => 'प्रीमियम पाठ';

  @override
  String get courseLessonCompleted => 'पूर्ण';

  @override
  String get courseMarkComplete => 'पूर्ण चिह्नित करें';

  @override
  String get coursePreviousLesson => 'पिछला';

  @override
  String get courseNextLesson => 'अगला पाठ';

  @override
  String get courseNoCoursesFound =>
      'आपके चयन के अनुसार कोई पाठ्यक्रम नहीं मिला।';

  @override
  String get courseNoMyLearning =>
      'आप अभी किसी भी पाठ्यक्रम में नामांकित नहीं हैं। हमारे प्रामाणिक पाठ्यक्रमों को देखें!';

  @override
  String get courseBrowseCourses => 'पाठ्यक्रम सूची देखें';

  @override
  String get courseSecureNotice => 'आधिकारिक मास्टरक्लास पोर्टल';

  @override
  String get courseOpenWebPortal => 'लर्निंग पोर्टल में खोलें';

  @override
  String get courseIncludesGst => 'सभी कर (18% जीएसटी) सहित';

  @override
  String courseTotalDuration(String hours, String mins) {
    return '$hours घंटे $mins मिनट';
  }

  @override
  String courseLessonCount(String count) {
    return '$count पाठ';
  }
}
