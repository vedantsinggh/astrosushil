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
}
