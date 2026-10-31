// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Astro Sushil';

  @override
  String get navHome => 'Home';

  @override
  String get navReports => 'Reports';

  @override
  String get navConsult => 'Consult';

  @override
  String get navAccount => 'Account';

  @override
  String get welcomeGuest => 'Namaste';

  @override
  String welcomeUser(String name) {
    return 'Namaste, $name';
  }

  @override
  String get blessingSubtitle =>
      'Vedic guidance and cosmic clarity for your life journey.';

  @override
  String get activeProfile => 'Active Profile';

  @override
  String get changeProfile => 'Change Profile';

  @override
  String get addBirthProfile => 'Add New Profile';

  @override
  String get noProfileSelected => 'No profile selected';

  @override
  String get noProfileExplanation =>
      'Select or create a birth profile to calculate personalized astrological charts.';

  @override
  String get createProfilePrompt =>
      'Create a birth profile to calculate your Janma Kundli.';

  @override
  String get createProfileButton => 'Create Profile';

  @override
  String get switchProfile => 'Switch Profile';

  @override
  String get sectionToday => 'Today\'s Cosmic Insights';

  @override
  String get sectionKeyFeatures => 'Essential Astrology';

  @override
  String get sectionExploreTools => 'Explore Astrology';

  @override
  String get exploreAllTools => 'All Vedic Astrology Tools';

  @override
  String get exploreAllToolsSubtitle =>
      'Explore Vargas, Ashtakavarga, Shadbala, KP, Jaimini, Transits & Vastu.';

  @override
  String get toolBirthChart => 'Birth Chart';

  @override
  String get toolBirthChartDesc => 'Lagna Kundli & planetary houses';

  @override
  String get toolPlanets => 'Planetary Positions';

  @override
  String get toolPlanetsDesc => 'Degrees, signs, nakshatras & aspects';

  @override
  String get toolDasha => 'Dasha Timeline';

  @override
  String get toolDashaDesc => 'Vimshottari planetary periods';

  @override
  String get toolMatchmaking => 'Kundli Matching';

  @override
  String get toolMatchmakingDesc => '36 Gunas Ashtakoota compatibility';

  @override
  String get toolPanchanga => 'Panchang & Muhurta';

  @override
  String get toolPanchangaDesc => 'Tithi, Nakshatra, Rahu Kaal & Choghadiya';

  @override
  String get toolTransits => 'Gochara Transits';

  @override
  String get toolTransitsDesc => 'Current planetary movements';

  @override
  String get toolRashiBhavishya => 'Rashi Bhavishya';

  @override
  String get toolRashiBhavishyaDesc => 'Daily horoscope by Moon sign';

  @override
  String get toolVastu => 'Vastu Shastra';

  @override
  String get toolVastuDesc => 'Directional balance & home remedies';

  @override
  String get toolGuptaNadi => 'Gupta Nadi Analysis';

  @override
  String get toolGuptaNadiDesc => 'Brihaspati Nandi Nadi (BNN) principles';

  @override
  String get quickPanchang => 'Today\'s Panchang';

  @override
  String get tithi => 'Tithi';

  @override
  String get nakshatra => 'Nakshatra';

  @override
  String get rahuKaal => 'Rahu Kaal';

  @override
  String get sunrise => 'Sunrise';

  @override
  String get viewFullPanchang => 'View Complete Panchang';

  @override
  String get activeDashaBanner => 'Running Planetary Period';

  @override
  String currentMahaDasha(String planet) {
    return '$planet Mahadasha';
  }

  @override
  String get viewDashaDetails => 'View Dasha Tree';

  @override
  String get reportsTitle => 'Personalized Reports';

  @override
  String get reportsSubtitle =>
      'In-depth astrological documents compiled with deterministic precision.';

  @override
  String get availableReports => 'Available Reports';

  @override
  String get careerReportTitle => 'Career & Professional Life';

  @override
  String get careerReportSubtitle =>
      '10th House analysis, vocation & professional timing';

  @override
  String get careerReportDesc =>
      'A deeper look at your career patterns, leadership opportunities, and professional strengths.';

  @override
  String get kundliReportTitle => 'Birth Chart & Kundli Dossier';

  @override
  String get kundliReportSubtitle =>
      'Comprehensive cosmic blueprint (Basic & Pro)';

  @override
  String get marriageReportTitle => 'Marriage Compatibility Dossier';

  @override
  String get marriageReportSubtitle =>
      '36-Guna matching, dosha cancellation & remedies';

  @override
  String get miniHoroscopeTitle => 'Mini Horoscope 6-Month Transit';

  @override
  String get miniHoroscopeSubtitle =>
      'Upcoming planetary shifts and favorable windows';

  @override
  String get generateReport => 'Generate Report';

  @override
  String get viewReport => 'View Report';

  @override
  String get downloadPdf => 'Download PDF';

  @override
  String reportInProgress(int progress) {
    return 'Generating ($progress%)';
  }

  @override
  String get deterministicEngineBadge => '100% Deterministic Engine';

  @override
  String get comingSoon => 'Coming Soon';

  @override
  String get reportsTabCatalogue => 'Browse Reports';

  @override
  String get reportsTabHistory => 'My Reports';

  @override
  String get reportCategoryComprehensive => 'Comprehensive Life Dossiers';

  @override
  String get reportCategoryFocused => 'Focused Astrological Analyses';

  @override
  String get reportCategoryCompatibility => 'Relationship & Compatibility';

  @override
  String get reportCategoryUpcoming => 'Upcoming Research Editions';

  @override
  String get reportProHoroscopeTitle => 'Pro Horoscope & Divisional Charts';

  @override
  String get reportProHoroscopeDesc =>
      'Multi-divisional analysis, 6-fold planetary Shadbala, 12 Bhava Bala rank analysis, and classical remedial measures.';

  @override
  String get reportDetailTitle => 'Report Details';

  @override
  String get reportIncludedSections => 'Included Astrological Sections';

  @override
  String get reportPriceBreakdown => 'Price & Tax Breakdown';

  @override
  String get reportGstIncluded => '18% GST Included';

  @override
  String get reportPartnerProfileSelect => 'Select Partner Profile';

  @override
  String get reportPartnerProfileRequired => 'Partner Profile Required';

  @override
  String get reportPartnerProfilePrompt =>
      'Kundli Milan requires two distinct birth profiles. Please select or add a partner birth profile.';

  @override
  String get reportHistoryEmptyTitle => 'No Reports Generated Yet';

  @override
  String get reportHistoryEmptySubtitle =>
      'Your generated personalized astrology reports and vector PDF dossiers will be saved here permanently.';

  @override
  String get reportHistoryBrowseButton => 'Browse Report Catalogue';

  @override
  String get reportStatusQueued => 'In Queue';

  @override
  String get reportStatusCalculating => 'Calculating';

  @override
  String get reportStatusAnalyzing => 'Analyzing';

  @override
  String get reportStatusRendering => 'Rendering';

  @override
  String get reportStatusCompiling => 'Compiling PDF';

  @override
  String get reportStatusUploading => 'Securing PDF';

  @override
  String get reportStatusCompleted => 'Ready';

  @override
  String get reportStatusFailed => 'Failed';

  @override
  String get reportActionViewPdf => 'Open PDF';

  @override
  String get reportActionShare => 'Share';

  @override
  String get reportActionRetry => 'Retry';

  @override
  String get reportActionRegenerate => 'Regenerate';

  @override
  String get reportCompareTiersTitle => 'Compare Report Tiers';

  @override
  String get reportDeliveryInstant => 'Instant Digital PDF Delivery';

  @override
  String get reportDeliveryTime => 'Delivery: Instant Vector PDF';

  @override
  String reportRequiredProfiles(int count) {
    return 'Required: $count Profile';
  }

  @override
  String reportExistingCompletedNotice(String name) {
    return 'You already have a completed report for $name';
  }

  @override
  String get reportViewExisting => 'View Existing PDF';

  @override
  String get reportGenerateNew => 'Generate Fresh Version';

  @override
  String get consultTitle => 'Consult Sushil Sir';

  @override
  String get consultSubtitle =>
      'Personalized 1-on-1 astrological guidance with Astro Sushil Kumar Singh.';

  @override
  String get consultNoticeTitle => 'App Scheduling Notice';

  @override
  String get consultNoticeBody =>
      'In-app automated calendar slot booking is currently being integrated for an upcoming release. Direct consultations are actively scheduled through Sushil Sir\'s official office support.';

  @override
  String get consultFormatsTitle => 'Consultation Formats Offered';

  @override
  String get consultVoice => 'Voice Call Consultation';

  @override
  String get consultVoiceDesc =>
      '30-minute private audio session for your most pressing questions.';

  @override
  String get consultVideo => 'Video Call Consultation';

  @override
  String get consultVideoDesc =>
      'In-depth 1-on-1 video reading analyzing your chart and hand signatures.';

  @override
  String get consultInPerson => 'In-Person Consultation';

  @override
  String get consultInPersonDesc =>
      'Exclusive face-to-face sessions in Delhi/NCR or client city.';

  @override
  String get consultPrepareTitle => 'What to Keep Ready';

  @override
  String get consultPrepare1 =>
      'Exact Date, Time, and City of Birth for all parties involved.';

  @override
  String get consultPrepare2 =>
      'Specific areas of concern (Career, Marriage, Health, Financial stability).';

  @override
  String get consultInquireWhatsApp => 'Inquire via WhatsApp';

  @override
  String get consultContactOffice => 'Contact Office Support';

  @override
  String get consultOfficeDetails =>
      'Office: Cleo County, Sector-121, Noida, UP\nPhone: +91 9621127233 / +91 6393551359\nEmail: connect@astrosushil.com';

  @override
  String get accountTitle => 'My Account';

  @override
  String get accountSubtitle =>
      'Manage your profile, family charts, language, and settings.';

  @override
  String get guestModeTitle => 'Guest Mode Active';

  @override
  String get guestModeSubtitle =>
      'Your profiles are saved locally on this device. Create an account to sync across devices.';

  @override
  String get createAccount => 'Create Account';

  @override
  String get signIn => 'Sign In';

  @override
  String get signOut => 'Sign Out';

  @override
  String get signOutConfirmTitle => 'Sign out of your account?';

  @override
  String get signOutConfirmMessage =>
      'Are you sure you want to sign out? Your cloud data remains safe.';

  @override
  String get exitGuestModeConfirmTitle => 'Exit Guest Mode?';

  @override
  String get exitGuestModeConfirmMessage =>
      'You will return to the sign-in screen.';

  @override
  String get languageSetting => 'App Language / भाषा';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageHindi => 'हिन्दी (Hindi)';

  @override
  String get selectLanguage => 'Select App Language';

  @override
  String get savedProfilesTitle => 'My Saved Birth Profiles';

  @override
  String get savedProfilesSubtitle =>
      'View, edit, or add family members and friends.';

  @override
  String get appSettingsTitle => 'Settings & Preferences';

  @override
  String get helpSupportTitle => 'Help & WhatsApp Support';

  @override
  String get helpSupportSubtitle =>
      'Direct assistance from the Astro Sushil support team.';

  @override
  String get privacyPolicyTitle => 'Privacy & Data Protection';

  @override
  String get privacyPolicySubtitle =>
      'Your birth details are kept strictly private and secure.';

  @override
  String get deleteCacheTitle => 'Clear Local Report Cache';

  @override
  String get deleteCacheSubtitle =>
      'Remove downloaded report PDFs to free up storage space.';

  @override
  String get deleteCacheConfirm =>
      'Are you sure you want to delete locally stored report files?';

  @override
  String get retry => 'Try Again';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirm => 'Confirm';

  @override
  String get close => 'Close';

  @override
  String get save => 'Save';

  @override
  String get errorOccurred => 'Something went wrong';

  @override
  String get networkError => 'Please check your internet connection.';

  @override
  String get emptyStateMessage => 'No information available right now.';

  @override
  String get accessibilityClose => 'Close dialog';

  @override
  String get accessibilityBack => 'Go back';

  @override
  String get accessibilityMenu => 'Navigation menu';

  @override
  String get explainWhatDoesThisMean => 'What does this mean?';

  @override
  String get explainHowToRead => 'How to read this';

  @override
  String get explainLimitations => 'Limitations & Guidance';

  @override
  String get explainDisclaimer =>
      'Vedic astrology provides guidance and self-reflection; it does not replace medical, legal, or financial professional advice.';

  @override
  String get explainBirthChartTitle => 'Understanding Your Kundli';

  @override
  String get explainBirthChartWhatIs =>
      'Your Kundli is a snapshot of the celestial sky at the exact moment and location of your birth, mapped across 12 zodiac houses (Bhavas) and signs (Rashis).';

  @override
  String get explainBirthChartHowToRead =>
      'House 1 (top central diamond) represents your Ascendant (Lagna) and core personality. The numbers 1–12 indicate zodiac signs, and abbreviations like \'Su\' or \'Mo\' show planetary placements.';

  @override
  String get explainPlanetsTitle => 'Understanding Planetary Placements';

  @override
  String get explainPlanetsWhatIs =>
      'In Vedic astrology, each of the nine grahas (Sun to Ketu) governs specific life themes and drives distinct psychological energies.';

  @override
  String get explainPlanetsHowToRead =>
      'Look at the sign and house position for each planet. A planet marked \'(R)\' is retrograde, meaning its energy is reflective, unconventional, and karmically potent.';

  @override
  String get explainDashaTitle => 'Understanding Vimshottari Dasha';

  @override
  String get explainDashaWhatIs =>
      'Vimshottari Dasha is a 120-year planetary timeline that reveals which celestial energy currently influences your life events and consciousness.';

  @override
  String get explainDashaHowToRead =>
      'The active Mahadasha (major period) sets the broader theme, while the Antardasha (sub-period) highlights daily focus. Check the start and end dates to understand active cycles.';

  @override
  String get explainHousesTitle => 'Understanding the 12 Houses (Bhavas)';

  @override
  String get explainHousesWhatIs =>
      'In Vedic astrology, the 12 houses divide your life into distinct spheres of experience, from self, wealth, and family to career, partnerships, and spiritual liberation.';

  @override
  String get explainHousesHowToRead =>
      'House 1 (Tanu Bhava) represents your physical self and character. Houses with occupying planets emphasize those themes in your life, while unoccupied houses are guided by their ruling sign lord.';

  @override
  String get explainNakshatraTitle =>
      'Understanding Nakshatras (Lunar Mansions)';

  @override
  String get explainNakshatraWhatIs =>
      'Nakshatras are 27 lunar constellations that provide deeper psychological insight into your temperament, natural talents, and Vimshottari timing cycles.';

  @override
  String get explainNakshatraHowToRead =>
      'Your Janma Nakshatra is where the Moon was positioned at birth. Its ruling planet sets your starting life dasha, and the Pada (quarter 1–4) indicates subtle inner strengths.';

  @override
  String get explainPanchangaTitle => 'Understanding Daily Panchanga';

  @override
  String get explainPanchangaWhatIs =>
      'Panchanga represents the five limbs of time: Tithi (lunar phase), Vara (weekday), Nakshatra (constellation), Yoga (luni-solar angle), and Karana (half-tithi).';

  @override
  String get explainPanchangaHowToRead =>
      'Check Tithi and Nakshatra for general auspiciousness, and observe Rahu Kaal to avoid starting critical new ventures during that window.';

  @override
  String get explainMatchmakingTitle => 'Understanding Kundli Matchmaking';

  @override
  String get explainMatchmakingWhatIs =>
      'Ashtakoota Milan evaluates compatibility across eight psychological and physiological dimensions, totaling a maximum of 36 points (Gunas).';

  @override
  String get explainMatchmakingHowToRead =>
      'A score of 18 or higher is traditionally considered acceptable. Higher scores indicate greater natural alignment in temperament, emotional bonding (Bhakoot), and genetic vitality (Nadi).';

  @override
  String get explainShadbalaTitle => 'Understanding Shadbala Strengths';

  @override
  String get explainShadbalaWhatIs =>
      'Shadbala evaluates six distinct sources of astronomical strength: Sthana (positional), Dig (directional), Kala (temporal), Cheshta (motional), Naisargika (natural), and Drik (aspectual).';

  @override
  String get explainShadbalaHowToRead =>
      'Each planet has a minimum required strength measured in Virupas and Rupas. Planets with a ratio of 1.0 or greater possess sufficient strength to manifest their positive significations.';

  @override
  String get explainAshtakavargaTitle => 'Understanding Ashtakavarga';

  @override
  String get explainAshtakavargaWhatIs =>
      'Ashtakavarga maps the distribution of benefic points (bindus) contributed by eight references across the 12 signs of the zodiac.';

  @override
  String get explainAshtakavargaHowToRead =>
      'In Sarvashtakavarga (SAV), houses with 28 or more bindus represent strong, supportive life areas, while houses below 25 require patience and mindful effort.';

  @override
  String get explainDivisionalChartsTitle =>
      'Understanding Divisional Charts (Vargas)';

  @override
  String get explainDivisionalChartsWhatIs =>
      'Divisional charts (Shodashvarga) divide the 30° zodiac signs into microscopic harmonic segments to examine specialized life domains like marriage (D9), career (D10), and destiny (D60).';

  @override
  String get explainDivisionalChartsHowToRead =>
      'D1 (Rashi) shows the physical manifestation, while higher vargas reveal specific karmic potentials. A strong planet in D1 that is also exalted or in its own sign in D9 (Vargottama) brings enduring favorable outcomes.';

  @override
  String get explainBhavaBalaTitle =>
      'Understanding Bhava Bala (House Potency)';

  @override
  String get explainBhavaBalaWhatIs =>
      'Bhava Bala evaluates the comprehensive strength of each of the 12 astrological houses based on Lord strength, directional cusp potency, aspects, and resident planets.';

  @override
  String get explainBhavaBalaHowToRead =>
      'Houses with higher Rupas (typically 6.0+ or ranked 1–4) indicate areas of life that flourish with ease and resilience, while lower-ranked houses need conscious nurturing.';

  @override
  String get explainYogasTitle => 'Understanding Vedic Yogas';

  @override
  String get explainYogasWhatIs =>
      'Yogas are special planetary combinations described in classical scriptures (Brihat Parashara Hora Shastra) that generate extraordinary strengths, wealth, leadership, or spiritual wisdom.';

  @override
  String get explainYogasHowToRead =>
      'Active yogas are formed when planetary relationships meet exact scriptural conditions. Check the involved planets, house alignments, and condition checklist to understand how the yoga functions.';

  @override
  String get explainJaiminiTitle => 'Understanding Jaimini Astrology';

  @override
  String get explainJaiminiWhatIs =>
      'Jaimini Sutras use seven or eight Chara Karakas (variable planetary significators determined by degrees) and sign-based aspects (Rashi Drishti) to reveal soul purpose and destiny.';

  @override
  String get explainJaiminiHowToRead =>
      'Atmakaraka (AK) represents your soul\'s journey, Amatyakaraka (AmK) indicates career and advisors, and Darakaraka (DK) signifies partnerships and spouse. Arudha Lagna (AL) reflects your external societal image.';

  @override
  String get explainKpTitle => 'Understanding KP Astrology (Krishnamurti)';

  @override
  String get explainKpWhatIs =>
      'Krishnamurti Padhdhati (KP) uses Placidus house cusps and a 4-tier sub-lord system (Sign Lord, Star Lord, Sub Lord, Sub-Sub Lord) to time events with pinpoint precision.';

  @override
  String get explainKpHowToRead =>
      'In KP, a planet or cusp\'s primary outcome is determined by its Star Lord, while the final fruitful manifestation is governed by its Sub Lord. Examine the sub-lord connections for accurate event timing.';

  @override
  String get explainGocharaTitle => 'Understanding Gochara (Transits)';

  @override
  String get explainGocharaWhatIs =>
      'Gochara evaluates current planetary movements in the sidereal sky relative to your natal Moon sign, Ascendant, and Ashtakavarga energy matrix.';

  @override
  String get explainGocharaHowToRead =>
      'Benefic transits over houses with 28+ SAV bindus unlock opportunities, while challenging transits (like Saturn over 12th, 1st, or 2nd house during Sade Sati) require disciplined focus and caution.';

  @override
  String get explainSpecialPointsTitle =>
      'Understanding Special Points & Upagrahas';

  @override
  String get explainSpecialPointsWhatIs =>
      'Vedic astrology calculates subtle non-luminous energy centers including 5 shadow Upagrahas (Dhooma to Upaketu), time-based Gulika/Mandi, and Special Lagnas (Hora, Ghatika, Indu).';

  @override
  String get explainSpecialPointsHowToRead =>
      'Indu Lagna reveals financial prosperity, Hora Lagna evaluates wealth timing, and 64th Navamsha / 22nd Drekkana highlight sensitive vulnerability degrees requiring spiritual remedies.';

  @override
  String get explainVarshaphalaTitle =>
      'Understanding Varshaphala (Solar Return)';

  @override
  String get explainVarshaphalaWhatIs =>
      'Varshaphala (Tajika system) calculates an annual horoscope for the precise moment the transiting Sun returns to its exact natal birth longitude.';

  @override
  String get explainVarshaphalaHowToRead =>
      'The Year Lord (Varshesha) and the moving focus point (Muntha) set the primary annual theme, while Harsha Bala measures the year\'s psychological and material contentment.';

  @override
  String get matchmakingSameProfileWarning =>
      'Please select two different birth profiles to evaluate compatibility.';

  @override
  String get dataNotAvailable => 'Data not available';

  @override
  String get calculationUnavailable => 'Calculation unavailable';

  @override
  String get consultTabsBook => 'Book Consultation';

  @override
  String get consultTabsMyAppointments => 'My Appointments';

  @override
  String get consultSelectSlot => 'Select Time Slot';

  @override
  String get consultSelectDate => 'Select Date';

  @override
  String get consultNoSlots =>
      'No time slots available for this date. Please pick another date.';

  @override
  String get consultNoticePrefix => 'Notice required:';

  @override
  String consultDaysNotice(int days) {
    return '$days days notice';
  }

  @override
  String consultDurationMin(int minutes) {
    return '$minutes mins';
  }

  @override
  String get consultInclusiveGST => '18% GST Included';

  @override
  String get consultBookNow => 'Book Now';

  @override
  String get consultBookingTitle => 'Book Appointment';

  @override
  String get consultSelectProfile => 'Select Birth Profile';

  @override
  String get consultNoProfile => 'Proceed as Self';

  @override
  String get consultQueryHint =>
      'Your specific question or topic of concern (optional)';

  @override
  String consultPayAndConfirm(String amount) {
    return 'Proceed to Pay ₹$amount';
  }

  @override
  String get consultBookingSuccess => 'Appointment Confirmed!';

  @override
  String consultBookingReference(String ref) {
    return 'Booking ID: $ref';
  }

  @override
  String get consultJoinSession => 'Join Live Session';

  @override
  String get consultReschedule => 'Reschedule';

  @override
  String get consultCancel => 'Cancel Appointment';

  @override
  String get consultStatusConfirmed => 'Confirmed';

  @override
  String get consultStatusPending => 'Pending Payment';

  @override
  String get consultStatusRescheduled => 'Rescheduled';

  @override
  String get consultStatusCancelled => 'Cancelled';

  @override
  String get consultStatusCompleted => 'Completed';

  @override
  String get consultNoAppointments => 'No consultation appointments found.';

  @override
  String get consultReschedulePolicy =>
      'Rescheduling allowed up to 24 hours prior to scheduled start time.';

  @override
  String get consultCancellationPolicy =>
      'Cancellation releases slot capacity in accordance with policy.';

  @override
  String get consultFilterAll => 'All';

  @override
  String get consultFilterVideo => 'Video';

  @override
  String get consultFilterAudio => 'Voice';

  @override
  String get consultFilterUrgent => 'Urgent';

  @override
  String get consultFilterSpecialized => 'Specialized';

  @override
  String get consultFilterInPerson => 'In-Person';

  @override
  String get consultFilterUpcoming => 'Upcoming';

  @override
  String get consultFilterPending => 'Pending';

  @override
  String get consultFilterCompleted => 'Completed';

  @override
  String get consultFilterCancelled => 'Cancelled';

  @override
  String get consultTimeZoneNotice =>
      'All times are in Indian Standard Time (IST / UTC+05:30)';

  @override
  String get consultPrivacyReassurance =>
      'Your birth details and life questions are strictly confidential, shared only with Astro Sushil.';

  @override
  String get consultBasePrice => 'Base Consultation Fee';

  @override
  String get consultGstAmount => 'GST (18% Included)';

  @override
  String get consultTotalAmount => 'Total Amount';

  @override
  String get consultNextStepsTitle => 'What Happens Next';

  @override
  String get consultNextStepsDesc =>
      'Your appointment is confirmed. Live meeting room links will become active 15 minutes before the session.';

  @override
  String get consultViewAppointments => 'View in My Appointments';

  @override
  String get consultHowItWorksTitle => 'How Consultation Works';

  @override
  String get consultStep1 => '1. Select Format & Date';

  @override
  String get consultStep2 => '2. Confirm Slot & Queries';

  @override
  String get consultStep3 => '3. Meet Astro Sushil';

  @override
  String get consultLocationNotice =>
      'Delhi / NCR office or client city location restrictions apply';

  @override
  String get coursesNavTitle => 'Courses';

  @override
  String get coursesScreenTitle => 'Vedic Courses & Masterclasses';

  @override
  String get coursesSubtitle =>
      'Learn authentic Gupta Nadi & predictive astrology from Astro Sushil';

  @override
  String get exploreCoursesTab => 'All Courses';

  @override
  String get myLearningTab => 'My Learning';

  @override
  String get searchCoursesHint => 'Search courses, topics, methods...';

  @override
  String get allLevels => 'All Levels';

  @override
  String get filterAll => 'All';

  @override
  String get courseEnrollNow => 'Enroll Now';

  @override
  String get courseEnrolledBadge => 'Enrolled';

  @override
  String get courseContinueLearning => 'Continue Learning';

  @override
  String get courseSyllabus => 'Curriculum & Syllabus';

  @override
  String get courseOverview => 'Course Overview';

  @override
  String get courseFreePreview => 'Free Preview';

  @override
  String get courseLockedLesson => 'Premium Lesson';

  @override
  String get courseLessonCompleted => 'Completed';

  @override
  String get courseMarkComplete => 'Mark as Completed';

  @override
  String get coursePreviousLesson => 'Previous';

  @override
  String get courseNextLesson => 'Next Lesson';

  @override
  String get courseNoCoursesFound => 'No courses found matching your criteria.';

  @override
  String get courseNoMyLearning =>
      'You haven\'t enrolled in any courses yet. Explore our authentic masterclasses!';

  @override
  String get courseBrowseCourses => 'Explore Course Catalog';

  @override
  String get courseSecureNotice => 'Official Masterclass Portal';

  @override
  String get courseOpenWebPortal => 'Open Official Learning Portal';

  @override
  String get courseIncludesGst => 'Inclusive of all taxes (18% GST)';

  @override
  String courseTotalDuration(String hours, String mins) {
    return '$hours hrs $mins mins';
  }

  @override
  String courseLessonCount(String count) {
    return '$count Lessons';
  }

  @override
  String get howCanWeGuideYou => 'How can we guide you today?';

  @override
  String get exploreHeroSubtitle =>
      'Explore your birth chart, get insights, learn astrology and more.';

  @override
  String get myBirthProfile => 'My Birth Profile';

  @override
  String get viewChartButton => 'View Chart';

  @override
  String get transitsShort => 'Transits';

  @override
  String get matchmakingShort => 'Match Making';

  @override
  String get dashasShort => 'Dashas';

  @override
  String get askSushilSirBannerTitle => 'Let Sushil Sir explain this chart';

  @override
  String get askSushilSirBannerSubtitle =>
      'Get simple, clear explanations of your astrology';

  @override
  String get askSushilSirButton => 'Ask Sushil Sir';

  @override
  String get coursesShortcutTitle => 'Astrology Courses';

  @override
  String get coursesShortcutSubtitle => 'Learn at your own pace';

  @override
  String get shopShortcutTitle => 'Shop';

  @override
  String get shopShortcutSubtitle => 'Books, gemstones, & more';

  @override
  String get quickInsightsTitle => 'Quick Insights';

  @override
  String get seeAll => 'See All';

  @override
  String get viewAll => 'View All';

  @override
  String get viewFull => 'View Full';

  @override
  String get auspiciousTime => 'Auspicious Time';

  @override
  String get goodForNewWork => 'Good for new work';

  @override
  String get avoidRahuKaal => 'Avoid Rahu Kaal';

  @override
  String get notSuitableForTasks => 'Not suitable for important tasks';

  @override
  String get emotionsStable => 'Emotions are stable today';

  @override
  String get lagnaAscendant => 'Lagna';

  @override
  String get moonSign => 'Moon Sign';

  @override
  String get currentDasha => 'Active Dasha';

  @override
  String get spiritualShopTitle => 'Spiritual Shop';

  @override
  String get spiritualShopSubtitle =>
      'Consecrated spiritual remedies, sacred art, and digital wallpapers';

  @override
  String get allOfferings => 'All Offerings';

  @override
  String get wallpapersCategory => 'Wallpapers';

  @override
  String get sacredArtCategory => 'Sacred Art';

  @override
  String get kitsBundlesCategory => 'Kits & Bundles';

  @override
  String get ayodhyaHerbCategory => 'Ayodhya Herb';

  @override
  String get searchShopHint => 'Search wallpapers, sacred art, or herbs...';

  @override
  String get inclusiveGstBadge => '18% GST Included';

  @override
  String get physicalProduct => 'Physical Product';

  @override
  String get instantDownload => 'Instant Download';

  @override
  String get digitalBundle => 'Digital Bundle';

  @override
  String get addToCart => 'Add to Cart';

  @override
  String get buyNow => 'Buy Now';

  @override
  String get addedToCartSnackbar => 'Added to cart';

  @override
  String get shoppingCartTitle => 'Shopping Cart';

  @override
  String get cartEmptyTitle => 'Your cart is empty';

  @override
  String get cartEmptySubtitle =>
      'Explore our consecrated wallpapers, sacred art, and spiritual remedies.';

  @override
  String get proceedToCheckout => 'Proceed to Checkout';

  @override
  String get orderSummary => 'Order Summary';

  @override
  String get basePrice => 'Base Price:';

  @override
  String get gstIncluded => 'GST (18% Included):';

  @override
  String get shippingFee => 'Shipping Fee:';

  @override
  String get freeShippingBadge => 'FREE';

  @override
  String get totalAmount => 'Total Amount:';

  @override
  String get deliveryAddress => 'Delivery Address';

  @override
  String get selectAddressPrompt =>
      'Please select a delivery address for physical items';

  @override
  String get digitalDeliveryReassurance =>
      'Instant Digital Access in My Library immediately after payment.';

  @override
  String get myOrdersTitle => 'My Orders & Purchases';

  @override
  String get orderDetailsTitle => 'Order Details';

  @override
  String get myDigitalLibraryTitle => 'My Digital Library';

  @override
  String get digitalLibrarySubtitle =>
      'Secure 15-minute expiring downloads for your purchased digital products';

  @override
  String get downloadAsset => 'Download';

  @override
  String get reDownload => 'Re-generate Link';

  @override
  String get linkCopied => 'Download link copied to clipboard';

  @override
  String get trackingNumber => 'Tracking Number:';

  @override
  String get courierPartner => 'Courier Partner:';

  @override
  String get dispatchDate => 'Dispatch Date:';

  @override
  String get orderStatusProcessing => 'Processing';

  @override
  String get orderStatusDispatched => 'Dispatched';

  @override
  String get orderStatusDelivered => 'Delivered';

  @override
  String get orderStatusCancelled => 'Cancelled';

  @override
  String get orderStatusConfirmed => 'Confirmed';

  @override
  String get shippingAddressManage => 'Delivery Addresses';

  @override
  String get addNewAddress => 'Add New Address';

  @override
  String get saveAddress => 'Save Address';

  @override
  String get onboardingSkip => 'Skip';

  @override
  String get onboardingNext => 'Next';

  @override
  String get onboardingGetStarted => 'Get Started';

  @override
  String get onboardingTitle1Prefix => 'Know Your';

  @override
  String get onboardingTitle1Highlight => 'Chart';

  @override
  String get onboardingDesc1 =>
      'Explore your birth chart, planets and houses in one clear, beautiful view.';

  @override
  String get onboardingTitle2Prefix => 'Find Your';

  @override
  String get onboardingTitle2Highlight => 'Direction';

  @override
  String get onboardingDesc2 =>
      'Understand the patterns in your chart and explore the areas of life that matter to you.';

  @override
  String get onboardingTitle3Prefix => 'Go Beyond';

  @override
  String get onboardingTitle3Highlight => 'the Basics';

  @override
  String get onboardingDesc3 =>
      'Unlock deeper insights and personalized reports built around your birth details.';

  @override
  String get onboardingWhyBirthDataTitle => 'Why We Ask For Birth Details';

  @override
  String get onboardingWhyBirthDataDesc =>
      'Authentic Vedic astrology requires your precise birth date, time, and birthplace to calculate the exact planetary degrees and your Ascendant (Lagna). Your personal details remain strictly private and secure.';

  @override
  String get welcomeBack => 'Welcome to Astro Sushil';

  @override
  String get loginPhoneSubtitle =>
      'Enter your phone number to receive a secure OTP';

  @override
  String get loginEmailSubtitle => 'Sign in with your email and password';

  @override
  String get phoneNumberLabel => 'Phone Number';

  @override
  String get phoneHint => '9876543210';

  @override
  String get sendOtp => 'Send OTP';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get exploreAsGuest => 'Explore as Guest';

  @override
  String get signInWithPassword => 'Sign in with Password';

  @override
  String get signInWithPhone => 'Sign in with Phone OTP';

  @override
  String get emailAddressLabel => 'Email Address';

  @override
  String get passwordLabel => 'Password';

  @override
  String get loginWithEmail => 'Login with Email';

  @override
  String get otpVerificationTitle => 'Enter Verification Code';

  @override
  String get otpSentToMessage => 'We\'ve sent a 6-digit verification code to';

  @override
  String resendCodeIn(Object seconds) {
    return 'Resend code in ${seconds}s';
  }

  @override
  String get resendOtp => 'Resend OTP';

  @override
  String get verifyAndContinue => 'Verify & Continue';

  @override
  String get invalidOtpMessage =>
      'Please enter the full 6-digit verification code.';

  @override
  String get sessionExpiredTitle => 'Session Expired';

  @override
  String get sessionExpiredMessage => 'Session expired. Please sign in again.';

  @override
  String get birthProfileDetailsTitle => 'Birth Profile Details';

  @override
  String get birthDetailsSubtitle =>
      'Accurate birth details are essential for authentic Vedic calculations.';

  @override
  String get birthNameLabel => 'Full Name';

  @override
  String get dateOfBirthLabel => 'Date of Birth';

  @override
  String get timeOfBirthLabel => 'Time of Birth';

  @override
  String get placeOfBirthLabel => 'Place of Birth';

  @override
  String get approximateTimeNote =>
      'If exact minute is unknown, enter your closest approximate time.';

  @override
  String get setAsActiveProfile => 'Set as Active Profile';

  @override
  String get activeProfileBadge => 'Active Profile';

  @override
  String get editBirthDetails => 'Edit Birth Details';

  @override
  String get deleteBirthProfile => 'Delete Profile';

  @override
  String get deleteProfileConfirmTitle => 'Delete Birth Profile?';

  @override
  String get deleteProfileConfirmMessage =>
      'Are you sure you want to delete this birth profile? Associated Kundli calculations and personalized insights will be removed.';

  @override
  String get birthDataImpactNotice =>
      'Changes to birth date, time, or coordinates will automatically update your Ascendant and planetary calculations.';

  @override
  String get newProfileButton => 'New Profile';

  @override
  String get notificationsTitle => 'Notifications & Daily Alerts';

  @override
  String get notificationsSubtitle =>
      'Configure astrological alerts and reminders';

  @override
  String get systemPermissionStatus => 'System Notification Permission:';

  @override
  String get permissionGranted => 'Enabled';

  @override
  String get permissionDenied => 'Disabled';

  @override
  String get dailyPanchangAlert => 'Daily Panchang & Muhurta';

  @override
  String get dailyPanchangAlertSubtitle =>
      'Receive auspicious timings, Tithi, and Nakshatra updates';

  @override
  String get transitAlert => 'Planetary Transit (Gochara)';

  @override
  String get transitAlertSubtitle =>
      'Alerts on major planet shifts affecting your Moon sign';

  @override
  String get consultationAlert => 'Consultation Reminders';

  @override
  String get consultationAlertSubtitle =>
      'Appointment reminders 24h and 1h before your session';

  @override
  String get orderTrackingAlert => 'Order & Delivery Updates';

  @override
  String get orderTrackingAlertSubtitle =>
      'Status updates for physical and digital shop orders';

  @override
  String get accountSecurityTitle => 'Account Security & Credentials';

  @override
  String get termsOfServiceTitle => 'Terms of Service';

  @override
  String get deleteAccountTitle => 'Delete Account & Data';

  @override
  String get deleteAccountSubtitle =>
      'Permanently delete account credentials and revoke active sessions.';

  @override
  String get deleteAccountConfirm =>
      'Are you sure you want to delete your account? This action will revoke all active sessions. In accordance with safety rules, existing past orders remain archived for tax compliance.';

  @override
  String get notificationsInbox => 'Notifications Inbox';

  @override
  String get markAllRead => 'Mark All as Read';

  @override
  String get allNotifications => 'All';

  @override
  String get panchangNotifications => 'Panchang';

  @override
  String get transitNotifications => 'Transits';

  @override
  String get orderNotifications => 'Orders';

  @override
  String get consultationNotifications => 'Consultations';

  @override
  String get noNotificationsTitle => 'No Notifications Yet';

  @override
  String get noNotificationsDesc =>
      'Your daily panchang, planetary transit updates, and order milestones will appear here.';

  @override
  String get notificationDetailTitle => 'Notification Details';

  @override
  String get notificationDismiss => 'Dismiss';

  @override
  String get notificationTakeAction => 'Open Details';

  @override
  String get helpSupportHeader => 'How can we assist you?';

  @override
  String get helpSupportSubtitleText =>
      'Get answers to common Vedic astrology questions or connect directly with our support team.';

  @override
  String get officialWhatsAppSupport => 'Official WhatsApp Support';

  @override
  String get supportOfficeHours => 'Monday – Saturday: 10:00 AM – 7:00 PM IST';

  @override
  String get copiedToClipboard => 'Copied to clipboard';

  @override
  String get frequentlyAskedQuestions => 'Frequently Asked Questions';

  @override
  String get sendFeedbackButton => 'Send Feedback or Question';

  @override
  String get feedbackPromptTitle => 'Share Your Feedback';

  @override
  String get feedbackPromptSubtitle =>
      'Tell us how we can improve your Astro Sushil experience.';

  @override
  String get submitFeedback => 'Submit Feedback';

  @override
  String get feedbackThankYou =>
      'Thank you for your feedback! Our team reviews all suggestions.';

  @override
  String get legalDocumentsHeader => 'Legal & Compliance';

  @override
  String get privacyPolicyTab => 'Privacy Policy';

  @override
  String get termsOfServiceTab => 'Terms of Service';

  @override
  String get refundPolicyTab => 'Refund Policy';

  @override
  String get shippingPolicyTab => 'Shipping Policy';

  @override
  String get astrologyDisclaimerTab => 'Astrology Disclaimer';

  @override
  String get systemMaintenanceTitle => 'System Maintenance';

  @override
  String get systemMaintenanceDesc =>
      'Astro Sushil systems are undergoing scheduled maintenance. Astrological calculations will resume shortly.';

  @override
  String get systemMaintenanceOfflineNotice =>
      'Your saved birth charts and library downloads remain fully accessible offline.';

  @override
  String get checkSystemStatus => 'Refresh Status';

  @override
  String get pageNotFoundTitle => 'Lost in the Cosmos';

  @override
  String get pageNotFoundDesc =>
      'The planetary coordinates or screen you are searching for does not exist or has moved.';

  @override
  String get returnToHome => 'Return to Home';

  @override
  String get welcomeSuccessTitle => 'Welcome to Astro Sushil!';

  @override
  String get welcomeSuccessSubtitle =>
      'Your account has been created successfully. Explore authentic Vedic astrology, reports, and consultations.';

  @override
  String get getStartedButton => 'Get Started';
}
