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
  String get noProfileExplanation =>
      'व्यक्तिगत ज्योतिषीय चार्ट की गणना के लिए एक जन्म प्रोफ़ाइल चुनें या बनाएं।';

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
  String get reportsTabCatalogue => 'रिपोर्ट कैटलॉग';

  @override
  String get reportsTabHistory => 'मेरी रिपोर्ट्स';

  @override
  String get reportCategoryComprehensive => 'विस्तृत जन्म कुंडली संग्रह';

  @override
  String get reportCategoryFocused => 'विशिष्ट विषय विश्लेषण';

  @override
  String get reportCategoryCompatibility => 'संबंध एवं कुंडली मिलान';

  @override
  String get reportCategoryUpcoming => 'आगामी अनुसंधान संस्करण';

  @override
  String get reportProHoroscopeTitle => 'प्रो कुंडली एवं षोडशवर्ग संग्रह';

  @override
  String get reportProHoroscopeDesc =>
      'षोडशवर्ग (D1-D12), षड्बल ग्रह सामर्थ्य, 12 भाव बल एवं शास्त्रीय वैदिक उपाय।';

  @override
  String get reportDetailTitle => 'रिपोर्ट विवरण';

  @override
  String get reportIncludedSections => 'शामिल ज्योतिषीय खंड व विवरण';

  @override
  String get reportPriceBreakdown => 'मूल्य एवं कर विवरण';

  @override
  String get reportGstIncluded => '18% जीएसटी सम्मिलित';

  @override
  String get reportPartnerProfileSelect => 'जीवनसाथी प्रोफाइल चुनें';

  @override
  String get reportPartnerProfileRequired => 'पार्टनर प्रोफाइल आवश्यक है';

  @override
  String get reportPartnerProfilePrompt =>
      'कुंडली मिलान हेतु दो अलग-अलग जन्म प्रोफाइल आवश्यक हैं। कृपया पार्टनर प्रोफाइल चुनें या जोड़ें।';

  @override
  String get reportHistoryEmptyTitle => 'अभी तक कोई रिपोर्ट नहीं बनी है';

  @override
  String get reportHistoryEmptySubtitle =>
      'आपकी तैयार की गई सभी व्यक्तिगत ज्योतिष रिपोर्ट्स और पीडीएफ यहाँ सुरक्षित रूप से उपलब्ध रहेंगी।';

  @override
  String get reportHistoryBrowseButton => 'रिपोर्ट कैटलॉग देखें';

  @override
  String get reportStatusQueued => 'कतार में';

  @override
  String get reportStatusCalculating => 'गणना जारी';

  @override
  String get reportStatusAnalyzing => 'विश्लेषण जारी';

  @override
  String get reportStatusRendering => 'प्रस्तुति जारी';

  @override
  String get reportStatusCompiling => 'पीडीएफ संकलन';

  @override
  String get reportStatusUploading => 'सुरक्षित संग्रहण';

  @override
  String get reportStatusCompleted => 'तैयार';

  @override
  String get reportStatusFailed => 'असफल';

  @override
  String get reportActionViewPdf => 'PDF देखें';

  @override
  String get reportActionShare => 'साझा करें';

  @override
  String get reportActionRetry => 'पुनः प्रयास करें';

  @override
  String get reportActionRegenerate => 'पुनः निर्माण';

  @override
  String get reportCompareTiersTitle => 'रिपोर्ट प्रकारों की तुलना करें';

  @override
  String get reportDeliveryInstant => 'तत्काल डिजिटल पीडीएफ प्रदाय';

  @override
  String get reportDeliveryTime => 'प्रदाय: तत्काल डिजिटल पीडीएफ';

  @override
  String reportRequiredProfiles(int count) {
    return 'आवश्यक: $count प्रोफ़ाइल';
  }

  @override
  String reportExistingCompletedNotice(String name) {
    return '$name के लिए पहले से रिपोर्ट तैयार है';
  }

  @override
  String get reportViewExisting => 'मौजूदा PDF देखें';

  @override
  String get reportGenerateNew => 'नवीन संस्करण बनाएं';

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
  String get explainHousesTitle => '12 भावों को समझना';

  @override
  String get explainHousesWhatIs =>
      'वैदिक ज्योतिष में 12 भाव जीवन के विभिन्न क्षेत्रों को दर्शाते हैं—व्यक्तित्व, धन और परिवार से लेकर आजीविका, साझेदारी और आध्यात्मिक मोक्ष तक।';

  @override
  String get explainHousesHowToRead =>
      'प्रथम भाव (तनू भाव) आपके व्यक्तित्व का प्रतीक है। जिन भावों में ग्रह स्थित होते हैं वे जीवन में विशेष महत्व रखते हैं, जबकि रिक्त भाव अपने राशि स्वामी द्वारा संचालित होते हैं।';

  @override
  String get explainNakshatraTitle => 'नक्षत्रों को समझना';

  @override
  String get explainNakshatraWhatIs =>
      'नक्षत्र 27 चंद्र नक्षत्र मंडल हैं जो आपकी मानसिक प्रवृत्ति, जन्मजात प्रतिभा और विंशोत्तरी दशा चक्र का गहरा विवरण देते हैं।';

  @override
  String get explainNakshatraHowToRead =>
      'जन्म नक्षत्र वह नक्षत्र है जिसमें जन्म के समय चंद्रमा स्थित था। इसका स्वामी ग्रह आपकी जीवन की प्रारंभिक दशा तय करता है, और पद (1–4) सूक्ष्म आंतरिक शक्ति को दर्शाता है।';

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
  String get explainDivisionalChartsTitle => 'वर्ग कुंडलियों को समझना';

  @override
  String get explainDivisionalChartsWhatIs =>
      'वर्ग कुंडलियां (षोडशवर्ग) 30° की राशियों को सूक्ष्म भागों में विभाजित करके विवाह (D9), आजीविका (D10) और भाग्य (D60) जैसे विशिष्ट क्षेत्रों का गहन विश्लेषण करती हैं।';

  @override
  String get explainDivisionalChartsHowToRead =>
      'D1 (लग्न) स्थूल रूप दर्शाता है, जबकि उच्च वर्ग सूक्ष्म कर्म क्षमता प्रकट करते हैं। D1 और D9 दोनों में बली ग्रह (वर्गोत्तम) दीर्घकालिक शुभ फल देता है।';

  @override
  String get explainBhavaBalaTitle => 'भाव बल को समझना';

  @override
  String get explainBhavaBalaWhatIs =>
      'भाव बल 12 भावों के समग्र सामर्थ्य का आकलन करता है, जिसमें भावेश बल, दिग बल, दृष्टि बल और भावस्थ ग्रह बल सम्मिलित हैं।';

  @override
  String get explainBhavaBalaHowToRead =>
      'उच्च रूपा (सामान्यतः 6.0+ या रैंक 1–4) वाले भाव जीवन के उन क्षेत्रों को दर्शाते हैं जो सहजता और सफलता प्रदान करते हैं।';

  @override
  String get explainYogasTitle => 'वैदिक योगों को समझना';

  @override
  String get explainYogasWhatIs =>
      'योग शास्त्रीय ग्रंथों में वर्णित विशेष ग्रह संयोग हैं जो असाधारण सामर्थ्य, धन, नेतृत्व अथवा आध्यात्मिक ज्ञान उत्पन्न करते हैं।';

  @override
  String get explainYogasHowToRead =>
      'सक्रिय योग तब बनते हैं जब ग्रह शास्त्रीय नियमों को पूर्णतः संतुष्ट करते हैं। योग का प्रभाव समझने हेतु संबंधित ग्रह, भाव और नियम शर्तें देखें।';

  @override
  String get explainJaiminiTitle => 'जैमिनी ज्योतिष को समझना';

  @override
  String get explainJaiminiWhatIs =>
      'जैमिनी सूत्र ग्रहों के अंशों के आधार पर निर्धारित चर कारकों और राशि दृष्टियों के माध्यम से आत्मा के उद्देश्य और भाग्य का विश्लेषण करते हैं।';

  @override
  String get explainJaiminiHowToRead =>
      'आत्मकारक (AK) आत्मा की यात्रा दर्शाता है, अमात्यकारक (AmK) आजीविका का प्रतीक है, और दाराकारक (DK) जीवनसाथी का कारक है। आरूढ़ लग्न (AL) सांसारिक प्रतिष्ठा दर्शाता है।';

  @override
  String get explainKpTitle => 'केपी ज्योतिष (कृष्णमूर्ति पद्धति) को समझना';

  @override
  String get explainKpWhatIs =>
      'केपी पद्धति प्लेसिडस भाव मध्य और 4-स्तरीय उप-स्वामी प्रणाली (राशि स्वामी, नक्षत्र स्वामी, उप-स्वामी, उप-उप-स्वामी) द्वारा सटीक फलादेश करती है।';

  @override
  String get explainKpHowToRead =>
      'केपी में फल का स्रोत नक्षत्र स्वामी तय करता है, जबकि अंतिम फल की पुष्टि उप-स्वामी (Sub Lord) द्वारा होती है।';

  @override
  String get explainGocharaTitle => 'गोचर (ग्रह भ्रमण) को समझना';

  @override
  String get explainGocharaWhatIs =>
      'गोचर वर्तमान समय में आकाश में भ्रमण कर रहे ग्रहों का आपकी जन्म राशि और अष्टकवर्ग के सापेक्ष प्रभाव दर्शाता है।';

  @override
  String get explainGocharaHowToRead =>
      'SAV में 28 से अधिक बिंदुओं वाले भावों में शुभ गोचर प्रगति लाते हैं, जबकि संवेदनशील गोचर (जैसे साढ़ेसाती) धैर्य और अनुशासन की मांग करते हैं।';

  @override
  String get explainSpecialPointsTitle => 'विशेष बिंदु एवं उपग्रहों को समझना';

  @override
  String get explainSpecialPointsWhatIs =>
      'वैदिक ज्योतिष अप्रत्यक्ष खगोलीय ऊर्जा केंद्रों का आकलन करता है जिसमें 5 अप्रकाश उपग्रह, गुलिक-मांदि, और विशेष लग्न (होरा, घटिका, इंदु) शामिल हैं।';

  @override
  String get explainSpecialPointsHowToRead =>
      'इंदु लग्न आर्थिक समृद्धि का सूचक है, होरा लग्न धन समय का, और 64वां नवांश संवेदनशील बिंदुओं को दर्शाता है।';

  @override
  String get explainVarshaphalaTitle => 'वर्षफल (ताजिक सौर चक्र) को समझना';

  @override
  String get explainVarshaphalaWhatIs =>
      'वर्षफल उस क्षण की वार्षिक कुंडली है जब गोचर सूर्य आपके जन्मकालीन सूर्य के सटीक अंशों पर पुनः प्रवेश करता है।';

  @override
  String get explainVarshaphalaHowToRead =>
      'वर्षेश और मुंथा वर्ष के मुख्य विषय को निर्धारित करते हैं, जबकि हर्ष बल वर्ष की मानसिक एवं भौतिक संतुष्टि को मापता है।';

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
  String get consultFilterAll => 'सभी';

  @override
  String get consultFilterVideo => 'वीडियो';

  @override
  String get consultFilterAudio => 'ऑडियो';

  @override
  String get consultFilterUrgent => 'तत्काल';

  @override
  String get consultFilterSpecialized => 'विशेषज्ञ';

  @override
  String get consultFilterInPerson => 'प्रत्यक्ष';

  @override
  String get consultFilterUpcoming => 'आगामी';

  @override
  String get consultFilterPending => 'प्रतीक्षित';

  @override
  String get consultFilterCompleted => 'पूर्ण';

  @override
  String get consultFilterCancelled => 'रद्द';

  @override
  String get consultTimeZoneNotice =>
      'सभी समय भारतीय मानक समय (IST / UTC+05:30) में हैं';

  @override
  String get consultPrivacyReassurance =>
      'आपके जन्म विवरण एवं जीवन से जुड़े प्रश्न पूर्णतः गोपनीय हैं और केवल एस्ट्रो सुशील जी के साथ साझा किए जाते हैं।';

  @override
  String get consultBasePrice => 'मूल परामर्श शुल्क';

  @override
  String get consultGstAmount => 'जीएसटी (18% सम्मिलित)';

  @override
  String get consultTotalAmount => 'कुल राशि';

  @override
  String get consultNextStepsTitle => 'आगे की प्रक्रिया';

  @override
  String get consultNextStepsDesc =>
      'आपकी नियुक्ति पुष्ट हो गई है। सत्र से 15 मिनट पहले मीटिंग लिंक सक्रिय हो जाएगा।';

  @override
  String get consultViewAppointments => 'मेरी नियुक्तियों में देखें';

  @override
  String get consultHowItWorksTitle => 'परामर्श प्रक्रिया';

  @override
  String get consultStep1 => '1. प्रारूप एवं तिथि चुनें';

  @override
  String get consultStep2 => '2. समय स्लॉट एवं प्रश्न जोड़ें';

  @override
  String get consultStep3 => '3. एस्ट्रो सुशील जी से परामर्श लें';

  @override
  String get consultLocationNotice =>
      'दिल्ली एनसीआर कार्यालय अथवा ग्राहक शहर हेतु शर्तें लागू';

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

  @override
  String get howCanWeGuideYou => 'आज हम आपका क्या मार्गदर्शन कर सकते हैं?';

  @override
  String get exploreHeroSubtitle =>
      'अपनी जन्म कुंडली देखें, सटीक भविष्यवाणियां पाएं और ज्योतिष सीखें।';

  @override
  String get myBirthProfile => 'मेरी जन्म प्रोफ़ाइल';

  @override
  String get viewChartButton => 'कुंडली देखें';

  @override
  String get transitsShort => 'गोचर';

  @override
  String get matchmakingShort => 'कुंडली मिलान';

  @override
  String get dashasShort => 'दशाएं';

  @override
  String get askSushilSirBannerTitle => 'सुशील सर से यह कुंडली समझें';

  @override
  String get askSushilSirBannerSubtitle =>
      'अपनी कुंडली का सरल और स्पष्ट वैदिक विश्लेषण प्राप्त करें';

  @override
  String get askSushilSirButton => 'सुशील सर से पूछें';

  @override
  String get coursesShortcutTitle => 'वैदिक ज्योतिष कोर्स';

  @override
  String get coursesShortcutSubtitle => 'अपनी गति से प्रामाणिक ज्योतिष सीखें';

  @override
  String get shopShortcutTitle => 'पूजा एवं ज्योतिष शॉप';

  @override
  String get shopShortcutSubtitle => 'प्रामाणिक पुस्तकें, रत्न और यंत्र';

  @override
  String get quickInsightsTitle => 'दैनिक सूक्ष्म अंतर्दृष्टि';

  @override
  String get seeAll => 'सभी देखें';

  @override
  String get viewAll => 'सभी देखें';

  @override
  String get viewFull => 'पूरा देखें';

  @override
  String get auspiciousTime => 'शुभ मुहूर्त';

  @override
  String get goodForNewWork => 'नए कार्यों के लिए अनुकूल';

  @override
  String get avoidRahuKaal => 'राहु काल से बचें';

  @override
  String get notSuitableForTasks => 'शुभ कार्यों के लिए वर्जित';

  @override
  String get emotionsStable => 'आज मानसिक शांति और स्थिरता';

  @override
  String get lagnaAscendant => 'लग्न';

  @override
  String get moonSign => 'चन्द्र राशि';

  @override
  String get currentDasha => 'सक्रिय दशा';

  @override
  String get spiritualShopTitle => 'आध्यात्मिक शॉप';

  @override
  String get spiritualShopSubtitle =>
      'अभिमंत्रित जड़ी-बूटी, पावन कला एवं डिजिटल वॉलपेपर';

  @override
  String get allOfferings => 'सभी उत्पाद';

  @override
  String get wallpapersCategory => 'वॉलपेपर';

  @override
  String get sacredArtCategory => 'पवित्र कला';

  @override
  String get kitsBundlesCategory => 'धन वर्षा किट';

  @override
  String get ayodhyaHerbCategory => 'दुर्लभ जड़ी-बूटी';

  @override
  String get searchShopHint => 'खोजें वॉलपेपर, कला या जड़ी-बूटी...';

  @override
  String get inclusiveGstBadge => '18% जीएसटी सम्मिलित';

  @override
  String get physicalProduct => 'भौतिक उत्पाद';

  @override
  String get instantDownload => 'तत्काल डिजिटल डाउनलोड';

  @override
  String get digitalBundle => 'डिजिटल बंडल';

  @override
  String get addToCart => 'कार्ट में जोड़ें';

  @override
  String get buyNow => 'अभी खरीदें';

  @override
  String get addedToCartSnackbar => 'कार्ट में जोड़ा गया';

  @override
  String get shoppingCartTitle => 'आपकी कार्ट';

  @override
  String get cartEmptyTitle => 'आपकी कार्ट खाली है';

  @override
  String get cartEmptySubtitle =>
      'हमारे पवित्र वॉलपेपर, कला और अभिमंत्रित उत्पादों को देखें।';

  @override
  String get proceedToCheckout => 'भुगतान हेतु आगे बढ़ें';

  @override
  String get orderSummary => 'आर्डर सारांश';

  @override
  String get basePrice => 'मूल मूल्य:';

  @override
  String get gstIncluded => 'जीएसटी (18% सम्मिलित):';

  @override
  String get shippingFee => 'शिपिंग शुल्क:';

  @override
  String get freeShippingBadge => 'मुफ़्त';

  @override
  String get totalAmount => 'कुल देय राशि:';

  @override
  String get deliveryAddress => 'डिलीवरी का पता';

  @override
  String get selectAddressPrompt => 'कृपया भौतिक उत्पाद हेतु शिपिंग पता चुनें';

  @override
  String get digitalDeliveryReassurance =>
      'भुगतान पश्चात तुरंत \'मेरी डिजिटल लाइब्रेरी\' से डाउनलोड करें।';

  @override
  String get myOrdersTitle => 'मेरे आर्डर्स एवं रसीदें';

  @override
  String get orderDetailsTitle => 'आर्डर विवरण';

  @override
  String get myDigitalLibraryTitle => 'मेरी डिजिटल लाइब्रेरी';

  @override
  String get digitalLibrarySubtitle =>
      'खरीदे गए डिजिटल उत्पादों हेतु सुरक्षित 15-मिनट डाउनलोड लिंक';

  @override
  String get downloadAsset => 'डाउनलोड करें';

  @override
  String get reDownload => 'नया लिंक बनाएं';

  @override
  String get linkCopied => 'डाउनलोड लिंक क्लिपबोर्ड पर कॉपी किया गया';

  @override
  String get trackingNumber => 'ट्रैकिंग नंबर:';

  @override
  String get courierPartner => 'कूरियर पार्टनर:';

  @override
  String get dispatchDate => 'डिस्पैच तिथि:';

  @override
  String get orderStatusProcessing => 'प्रक्रियाधीन';

  @override
  String get orderStatusDispatched => 'भेज दिया गया';

  @override
  String get orderStatusDelivered => 'डिलीवर हो गया';

  @override
  String get orderStatusCancelled => 'रद्द किया गया';

  @override
  String get orderStatusConfirmed => 'पुष्ट';

  @override
  String get shippingAddressManage => 'सुरक्षित डिलीवरी पते';

  @override
  String get addNewAddress => 'नया पता जोड़ें';

  @override
  String get saveAddress => 'पता सहेजें';

  @override
  String get onboardingSkip => 'छोड़ें (Skip)';

  @override
  String get onboardingNext => 'आगे बढ़ें';

  @override
  String get onboardingGetStarted => 'शुरू करें';

  @override
  String get onboardingTitle1Prefix => 'अपनी कुंडली';

  @override
  String get onboardingTitle1Highlight => 'जानिए';

  @override
  String get onboardingDesc1 =>
      'अपनी जन्म कुंडली, ग्रह एवं भावों का स्पष्ट एवं सुंदर वैदिक विश्लेषण देखें।';

  @override
  String get onboardingTitle2Prefix => 'सटीक जीवन';

  @override
  String get onboardingTitle2Highlight => 'दिशा पाएं';

  @override
  String get onboardingDesc2 =>
      'अपनी कुंडली के शुभ योगों, दशा चक्र एवं महत्वपूर्ण क्षेत्रों का मार्गदर्शन प्राप्त करें।';

  @override
  String get onboardingTitle3Prefix => 'गहन वैदिक';

  @override
  String get onboardingTitle3Highlight => 'अंतर्दृष्टि';

  @override
  String get onboardingDesc3 =>
      'जन्म विवरण पर आधारित प्रमाणित भविष्यवाणियां एवं विस्तृत रिपोर्ट्स प्राप्त करें।';

  @override
  String get onboardingWhyBirthDataTitle => 'जन्म विवरण क्यों आवश्यक है?';

  @override
  String get onboardingWhyBirthDataDesc =>
      'वैदिक ज्योतिष में सटीक ग्रह स्थिति एवं लग्न की गणना हेतु आपकी जन्म तिथि, समय एवं जन्म स्थान आवश्यक हैं। आपका विवरण पूर्णतः गोपनीय एवं सुरक्षित है।';

  @override
  String get welcomeBack => 'एस्ट्रो सुशील में आपका स्वागत है';

  @override
  String get loginPhoneSubtitle =>
      'सुरक्षित OTP प्राप्त करने हेतु अपना फोन नंबर दर्ज करें';

  @override
  String get loginEmailSubtitle => 'ईमेल एवं पासवर्ड द्वारा साइन इन करें';

  @override
  String get phoneNumberLabel => 'मोबाइल नंबर';

  @override
  String get phoneHint => '9876543210';

  @override
  String get sendOtp => 'ओटीपी भेजें (Send OTP)';

  @override
  String get continueWithGoogle => 'गूगल द्वारा जारी रखें';

  @override
  String get exploreAsGuest => 'अतिथि के रूप में देखें (Guest)';

  @override
  String get signInWithPassword => 'पासवर्ड द्वारा साइन इन करें';

  @override
  String get signInWithPhone => 'फोन OTP द्वारा साइन इन करें';

  @override
  String get emailAddressLabel => 'ईमेल पता';

  @override
  String get passwordLabel => 'पासवर्ड';

  @override
  String get loginWithEmail => 'ईमेल से लॉगिन करें';

  @override
  String get otpVerificationTitle => 'सत्यापन कोड दर्ज करें';

  @override
  String get otpSentToMessage => 'हमने 6-अंकीय सत्यापन कोड भेजा है:';

  @override
  String resendCodeIn(Object seconds) {
    return '$seconds सेकंड में पुनः भेजें';
  }

  @override
  String get resendOtp => 'पुनः OTP भेजें';

  @override
  String get verifyAndContinue => 'सत्यापित करें एवं जारी रखें';

  @override
  String get invalidOtpMessage => 'कृपया पूर्ण 6-अंकीय सत्यापन कोड दर्ज करें।';

  @override
  String get sessionExpiredTitle => 'सत्र समाप्त (Session Expired)';

  @override
  String get sessionExpiredMessage =>
      'सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।';

  @override
  String get birthProfileDetailsTitle => 'जन्म विवरण प्रोफाइल';

  @override
  String get birthDetailsSubtitle =>
      'सटीक वैदिक भविष्यवाणियों हेतु प्रामाणिक जन्म विवरण अनिवार्य है।';

  @override
  String get birthNameLabel => 'पूरा नाम';

  @override
  String get dateOfBirthLabel => 'जन्म तिथि';

  @override
  String get timeOfBirthLabel => 'जन्म समय';

  @override
  String get placeOfBirthLabel => 'जन्म स्थान';

  @override
  String get approximateTimeNote =>
      'यदि सटीक मिनट ज्ञात न हो, तो निकटतम अनुमानित समय दर्ज करें।';

  @override
  String get setAsActiveProfile => 'सक्रिय प्रोफाइल बनाएं';

  @override
  String get activeProfileBadge => 'सक्रिय प्रोफाइल';

  @override
  String get editBirthDetails => 'जन्म विवरण बदलें';

  @override
  String get deleteBirthProfile => 'प्रोफाइल हटाएं';

  @override
  String get deleteProfileConfirmTitle => 'जन्म प्रोफाइल हटाएं?';

  @override
  String get deleteProfileConfirmMessage =>
      'क्या आप निश्चित रूप से इस जन्म प्रोफाइल को हटाना चाहते हैं? इससे संबंधित कुंडली गणनाएं एवं सहेजी गई जानकारियां हट जाएंगी।';

  @override
  String get birthDataImpactNotice =>
      'जन्म तिथि, समय अथवा स्थान में परिवर्तन से आपका लग्न एवं ग्रह गणनाएं स्वतः अद्यतन हो जाएंगी।';

  @override
  String get newProfileButton => 'नई प्रोफाइल';

  @override
  String get notificationsTitle => 'सूचनाएं एवं पंचांग अलर्ट';

  @override
  String get notificationsSubtitle =>
      'ज्योतिषीय अलर्ट एवं अनुस्मारक व्यवस्थित करें';

  @override
  String get systemPermissionStatus => 'सिस्टम नोटिफिकेशन अनुमति:';

  @override
  String get permissionGranted => 'सक्रिय (Enabled)';

  @override
  String get permissionDenied => 'निष्क्रिय (Disabled)';

  @override
  String get dailyPanchangAlert => 'दैनिक पंचांग एवं शुभ मुहूर्त';

  @override
  String get dailyPanchangAlertSubtitle =>
      'दैनिक शुभ समय, तिथि एवं नक्षत्र सूचनाएं प्राप्त करें';

  @override
  String get transitAlert => 'ग्रह गोचर अलर्ट (Gochara)';

  @override
  String get transitAlertSubtitle =>
      'आपकी राशि को प्रभावित करने वाले महत्वपूर्ण ग्रह परिवर्तन';

  @override
  String get consultationAlert => 'परामर्श अनुस्मारक';

  @override
  String get consultationAlertSubtitle =>
      'परामर्श सत्र से 24 घंटे एवं 1 घंटा पूर्व अनुस्मारक';

  @override
  String get orderTrackingAlert => 'आर्डर एवं डिलीवरी अपडेट';

  @override
  String get orderTrackingAlertSubtitle =>
      'भौतिक एवं डिजिटल सामग्री प्रेषण की सूचनाएं';

  @override
  String get accountSecurityTitle => 'खाता सुरक्षा एवं साख';

  @override
  String get termsOfServiceTitle => 'सेवा की शर्तें (Terms of Service)';

  @override
  String get deleteAccountTitle => 'खाता एवं डेटा हटाएं';

  @override
  String get deleteAccountSubtitle =>
      'खाता क्रेडेंशियल्स हटाएं एवं सभी सत्र समाप्त करें।';

  @override
  String get deleteAccountConfirm =>
      'क्या आप निश्चित रूप से अपना खाता हटाना चाहते हैं? इससे सभी सक्रिय सत्र समाप्त हो जाएंगे। नियमों के अनुसार पूर्व आर्डर्स का रिकॉर्ड कर अनुपालन हेतु सुरक्षित रहेगा।';

  @override
  String get notificationsInbox => 'सूचनाएं एवं अलर्ट';

  @override
  String get markAllRead => 'सभी पढ़ा हुआ चिह्नित करें';

  @override
  String get allNotifications => 'सभी';

  @override
  String get panchangNotifications => 'पंचांग';

  @override
  String get transitNotifications => 'गोचर';

  @override
  String get orderNotifications => 'आर्डर्स';

  @override
  String get consultationNotifications => 'परामर्श';

  @override
  String get noNotificationsTitle => 'कोई नई सूचना नहीं है';

  @override
  String get noNotificationsDesc =>
      'आपके दैनिक पंचांग, गोचर अलर्ट एवं आर्डर से जुड़ी महत्वपूर्ण सूचनाएं यहां प्रदर्शित होंगी।';

  @override
  String get notificationDetailTitle => 'सूचना विवरण';

  @override
  String get notificationDismiss => 'हटाएं';

  @override
  String get notificationTakeAction => 'विवरण देखें';

  @override
  String get helpSupportHeader => 'हम आपकी क्या सहायता कर सकते हैं?';

  @override
  String get helpSupportSubtitleText =>
      'वैदिक ज्योतिष एवं सेवाओं से संबंधित सामान्य प्रश्नों के उत्तर प्राप्त करें अथवा हमारी सहायता टीम से सीधे संपर्क करें।';

  @override
  String get officialWhatsAppSupport => 'आधिकारिक व्हाट्सएप सपोर्ट';

  @override
  String get supportOfficeHours =>
      'सोमवार – शनिवार: प्रातः 10:00 से सायं 7:00 बजे (IST)';

  @override
  String get copiedToClipboard => 'क्लिपबोर्ड पर कॉपी किया गया';

  @override
  String get frequentlyAskedQuestions => 'अक्सर पूछे जाने वाले प्रश्न (FAQs)';

  @override
  String get sendFeedbackButton => 'प्रतिक्रिया अथवा सुझाव भेजें';

  @override
  String get feedbackPromptTitle => 'अपनी प्रतिक्रिया साझा करें';

  @override
  String get feedbackPromptSubtitle =>
      'बताएं कि हम आपके एस्ट्रो सुशील अनुभव को और बेहतर कैसे बना सकते हैं।';

  @override
  String get submitFeedback => 'प्रतिक्रिया भेजें';

  @override
  String get feedbackThankYou =>
      'आपकी प्रतिक्रिया हेतु धन्यवाद! हमारी टीम सभी सुझावों की समीक्षा करती है।';

  @override
  String get legalDocumentsHeader => 'विधिक दस्तावेज एवं नीतियां';

  @override
  String get privacyPolicyTab => 'गोपनीयता नीति';

  @override
  String get termsOfServiceTab => 'सेवा की शर्तें';

  @override
  String get refundPolicyTab => 'रिफंड नीति';

  @override
  String get shippingPolicyTab => 'शिपिंग नीति';

  @override
  String get astrologyDisclaimerTab => 'ज्योतिषीय अस्वीकरण';

  @override
  String get systemMaintenanceTitle => 'सिस्टम रखरखाव जारी है';

  @override
  String get systemMaintenanceDesc =>
      'एस्ट्रो सुशील प्रणालियों का नियमित तकनीकी रखरखाव चल रहा है। ज्योतिषीय गणना सेवाएं शीघ्र पुनः सक्रिय होंगी।';

  @override
  String get systemMaintenanceOfflineNotice =>
      'आपकी पूर्व सहेजी गई जन्म कुंडलियां एवं डाउनलोड किए गए दस्तावेज ऑफलाइन उपलब्ध हैं।';

  @override
  String get checkSystemStatus => 'स्थिति पुनः जांचें';

  @override
  String get pageNotFoundTitle => 'अंतरिक्ष में खोया हुआ मार्ग';

  @override
  String get pageNotFoundDesc =>
      'आप जिस ज्योतिषीय पृष्ठ अथवा निर्देशांक की तलाश कर रहे हैं, वह इस समय उपलब्ध नहीं है।';

  @override
  String get returnToHome => 'मुख्य पृष्ठ पर लौटें';

  @override
  String get welcomeSuccessTitle => 'एस्ट्रो सुशील में आपका स्वागत है!';

  @override
  String get welcomeSuccessSubtitle =>
      'आपका खाता सफलतापूर्वक निर्मित हो चुका है। प्रामाणिक वैदिक ज्योतिष, रिपोर्ट्स एवं परामर्श सेवाओं का अनुभव करें।';

  @override
  String get getStartedButton => 'शुरू करें';
}
