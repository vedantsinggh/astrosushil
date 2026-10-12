import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi')
  ];

  /// Application Title
  ///
  /// In en, this message translates to:
  /// **'Astro Sushil'**
  String get appName;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @navConsult.
  ///
  /// In en, this message translates to:
  /// **'Consult'**
  String get navConsult;

  /// No description provided for @navAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get navAccount;

  /// No description provided for @welcomeGuest.
  ///
  /// In en, this message translates to:
  /// **'Namaste'**
  String get welcomeGuest;

  /// No description provided for @welcomeUser.
  ///
  /// In en, this message translates to:
  /// **'Namaste, {name}'**
  String welcomeUser(String name);

  /// No description provided for @blessingSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Vedic guidance and cosmic clarity for your life journey.'**
  String get blessingSubtitle;

  /// No description provided for @activeProfile.
  ///
  /// In en, this message translates to:
  /// **'Active Profile'**
  String get activeProfile;

  /// No description provided for @changeProfile.
  ///
  /// In en, this message translates to:
  /// **'Change Profile'**
  String get changeProfile;

  /// No description provided for @addBirthProfile.
  ///
  /// In en, this message translates to:
  /// **'Add New Profile'**
  String get addBirthProfile;

  /// No description provided for @noProfileSelected.
  ///
  /// In en, this message translates to:
  /// **'No profile selected'**
  String get noProfileSelected;

  /// No description provided for @createProfilePrompt.
  ///
  /// In en, this message translates to:
  /// **'Create a birth profile to calculate your Janma Kundli.'**
  String get createProfilePrompt;

  /// No description provided for @createProfileButton.
  ///
  /// In en, this message translates to:
  /// **'Create Profile'**
  String get createProfileButton;

  /// No description provided for @switchProfile.
  ///
  /// In en, this message translates to:
  /// **'Switch Profile'**
  String get switchProfile;

  /// No description provided for @sectionToday.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Cosmic Insights'**
  String get sectionToday;

  /// No description provided for @sectionKeyFeatures.
  ///
  /// In en, this message translates to:
  /// **'Essential Astrology'**
  String get sectionKeyFeatures;

  /// No description provided for @sectionExploreTools.
  ///
  /// In en, this message translates to:
  /// **'Explore Astrology'**
  String get sectionExploreTools;

  /// No description provided for @exploreAllTools.
  ///
  /// In en, this message translates to:
  /// **'All Vedic Astrology Tools'**
  String get exploreAllTools;

  /// No description provided for @exploreAllToolsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Explore Vargas, Ashtakavarga, Shadbala, KP, Jaimini, Transits & Vastu.'**
  String get exploreAllToolsSubtitle;

  /// No description provided for @toolBirthChart.
  ///
  /// In en, this message translates to:
  /// **'Birth Chart'**
  String get toolBirthChart;

  /// No description provided for @toolBirthChartDesc.
  ///
  /// In en, this message translates to:
  /// **'Lagna Kundli & planetary houses'**
  String get toolBirthChartDesc;

  /// No description provided for @toolPlanets.
  ///
  /// In en, this message translates to:
  /// **'Planetary Positions'**
  String get toolPlanets;

  /// No description provided for @toolPlanetsDesc.
  ///
  /// In en, this message translates to:
  /// **'Degrees, signs, nakshatras & aspects'**
  String get toolPlanetsDesc;

  /// No description provided for @toolDasha.
  ///
  /// In en, this message translates to:
  /// **'Dasha Timeline'**
  String get toolDasha;

  /// No description provided for @toolDashaDesc.
  ///
  /// In en, this message translates to:
  /// **'Vimshottari planetary periods'**
  String get toolDashaDesc;

  /// No description provided for @toolMatchmaking.
  ///
  /// In en, this message translates to:
  /// **'Kundli Matching'**
  String get toolMatchmaking;

  /// No description provided for @toolMatchmakingDesc.
  ///
  /// In en, this message translates to:
  /// **'36 Gunas Ashtakoota compatibility'**
  String get toolMatchmakingDesc;

  /// No description provided for @toolPanchanga.
  ///
  /// In en, this message translates to:
  /// **'Panchang & Muhurta'**
  String get toolPanchanga;

  /// No description provided for @toolPanchangaDesc.
  ///
  /// In en, this message translates to:
  /// **'Tithi, Nakshatra, Rahu Kaal & Choghadiya'**
  String get toolPanchangaDesc;

  /// No description provided for @toolTransits.
  ///
  /// In en, this message translates to:
  /// **'Gochara Transits'**
  String get toolTransits;

  /// No description provided for @toolTransitsDesc.
  ///
  /// In en, this message translates to:
  /// **'Current planetary movements'**
  String get toolTransitsDesc;

  /// No description provided for @toolRashiBhavishya.
  ///
  /// In en, this message translates to:
  /// **'Rashi Bhavishya'**
  String get toolRashiBhavishya;

  /// No description provided for @toolRashiBhavishyaDesc.
  ///
  /// In en, this message translates to:
  /// **'Daily horoscope by Moon sign'**
  String get toolRashiBhavishyaDesc;

  /// No description provided for @toolVastu.
  ///
  /// In en, this message translates to:
  /// **'Vastu Shastra'**
  String get toolVastu;

  /// No description provided for @toolVastuDesc.
  ///
  /// In en, this message translates to:
  /// **'Directional balance & home remedies'**
  String get toolVastuDesc;

  /// No description provided for @toolGuptaNadi.
  ///
  /// In en, this message translates to:
  /// **'Gupta Nadi Analysis'**
  String get toolGuptaNadi;

  /// No description provided for @toolGuptaNadiDesc.
  ///
  /// In en, this message translates to:
  /// **'Brihaspati Nandi Nadi (BNN) principles'**
  String get toolGuptaNadiDesc;

  /// No description provided for @quickPanchang.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Panchang'**
  String get quickPanchang;

  /// No description provided for @tithi.
  ///
  /// In en, this message translates to:
  /// **'Tithi'**
  String get tithi;

  /// No description provided for @nakshatra.
  ///
  /// In en, this message translates to:
  /// **'Nakshatra'**
  String get nakshatra;

  /// No description provided for @rahuKaal.
  ///
  /// In en, this message translates to:
  /// **'Rahu Kaal'**
  String get rahuKaal;

  /// No description provided for @sunrise.
  ///
  /// In en, this message translates to:
  /// **'Sunrise'**
  String get sunrise;

  /// No description provided for @viewFullPanchang.
  ///
  /// In en, this message translates to:
  /// **'View Complete Panchang'**
  String get viewFullPanchang;

  /// No description provided for @activeDashaBanner.
  ///
  /// In en, this message translates to:
  /// **'Running Planetary Period'**
  String get activeDashaBanner;

  /// No description provided for @currentMahaDasha.
  ///
  /// In en, this message translates to:
  /// **'{planet} Mahadasha'**
  String currentMahaDasha(String planet);

  /// No description provided for @viewDashaDetails.
  ///
  /// In en, this message translates to:
  /// **'View Dasha Tree'**
  String get viewDashaDetails;

  /// No description provided for @reportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Personalized Reports'**
  String get reportsTitle;

  /// No description provided for @reportsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'In-depth astrological documents compiled with deterministic precision.'**
  String get reportsSubtitle;

  /// No description provided for @availableReports.
  ///
  /// In en, this message translates to:
  /// **'Available Reports'**
  String get availableReports;

  /// No description provided for @careerReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Career & Professional Life'**
  String get careerReportTitle;

  /// No description provided for @careerReportSubtitle.
  ///
  /// In en, this message translates to:
  /// **'10th House analysis, vocation & professional timing'**
  String get careerReportSubtitle;

  /// No description provided for @careerReportDesc.
  ///
  /// In en, this message translates to:
  /// **'A deeper look at your career patterns, leadership opportunities, and professional strengths.'**
  String get careerReportDesc;

  /// No description provided for @kundliReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Birth Chart & Kundli Dossier'**
  String get kundliReportTitle;

  /// No description provided for @kundliReportSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Comprehensive cosmic blueprint (Basic & Pro)'**
  String get kundliReportSubtitle;

  /// No description provided for @marriageReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Marriage Compatibility Dossier'**
  String get marriageReportTitle;

  /// No description provided for @marriageReportSubtitle.
  ///
  /// In en, this message translates to:
  /// **'36-Guna matching, dosha cancellation & remedies'**
  String get marriageReportSubtitle;

  /// No description provided for @miniHoroscopeTitle.
  ///
  /// In en, this message translates to:
  /// **'Mini Horoscope 6-Month Transit'**
  String get miniHoroscopeTitle;

  /// No description provided for @miniHoroscopeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Upcoming planetary shifts and favorable windows'**
  String get miniHoroscopeSubtitle;

  /// No description provided for @generateReport.
  ///
  /// In en, this message translates to:
  /// **'Generate Report'**
  String get generateReport;

  /// No description provided for @viewReport.
  ///
  /// In en, this message translates to:
  /// **'View Report'**
  String get viewReport;

  /// No description provided for @downloadPdf.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get downloadPdf;

  /// No description provided for @reportInProgress.
  ///
  /// In en, this message translates to:
  /// **'Generating ({progress}%)'**
  String reportInProgress(int progress);

  /// No description provided for @deterministicEngineBadge.
  ///
  /// In en, this message translates to:
  /// **'100% Deterministic Engine'**
  String get deterministicEngineBadge;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming Soon'**
  String get comingSoon;

  /// No description provided for @consultTitle.
  ///
  /// In en, this message translates to:
  /// **'Consult Sushil Sir'**
  String get consultTitle;

  /// No description provided for @consultSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Personalized 1-on-1 astrological guidance with Astro Sushil Kumar Singh.'**
  String get consultSubtitle;

  /// No description provided for @consultNoticeTitle.
  ///
  /// In en, this message translates to:
  /// **'App Scheduling Notice'**
  String get consultNoticeTitle;

  /// No description provided for @consultNoticeBody.
  ///
  /// In en, this message translates to:
  /// **'In-app automated calendar slot booking is currently being integrated for an upcoming release. Direct consultations are actively scheduled through Sushil Sir\'s official office support.'**
  String get consultNoticeBody;

  /// No description provided for @consultFormatsTitle.
  ///
  /// In en, this message translates to:
  /// **'Consultation Formats Offered'**
  String get consultFormatsTitle;

  /// No description provided for @consultVoice.
  ///
  /// In en, this message translates to:
  /// **'Voice Call Consultation'**
  String get consultVoice;

  /// No description provided for @consultVoiceDesc.
  ///
  /// In en, this message translates to:
  /// **'30-minute private audio session for your most pressing questions.'**
  String get consultVoiceDesc;

  /// No description provided for @consultVideo.
  ///
  /// In en, this message translates to:
  /// **'Video Call Consultation'**
  String get consultVideo;

  /// No description provided for @consultVideoDesc.
  ///
  /// In en, this message translates to:
  /// **'In-depth 1-on-1 video reading analyzing your chart and hand signatures.'**
  String get consultVideoDesc;

  /// No description provided for @consultInPerson.
  ///
  /// In en, this message translates to:
  /// **'In-Person Consultation'**
  String get consultInPerson;

  /// No description provided for @consultInPersonDesc.
  ///
  /// In en, this message translates to:
  /// **'Exclusive face-to-face sessions in Delhi/NCR or client city.'**
  String get consultInPersonDesc;

  /// No description provided for @consultPrepareTitle.
  ///
  /// In en, this message translates to:
  /// **'What to Keep Ready'**
  String get consultPrepareTitle;

  /// No description provided for @consultPrepare1.
  ///
  /// In en, this message translates to:
  /// **'Exact Date, Time, and City of Birth for all parties involved.'**
  String get consultPrepare1;

  /// No description provided for @consultPrepare2.
  ///
  /// In en, this message translates to:
  /// **'Specific areas of concern (Career, Marriage, Health, Financial stability).'**
  String get consultPrepare2;

  /// No description provided for @consultInquireWhatsApp.
  ///
  /// In en, this message translates to:
  /// **'Inquire via WhatsApp'**
  String get consultInquireWhatsApp;

  /// No description provided for @consultContactOffice.
  ///
  /// In en, this message translates to:
  /// **'Contact Office Support'**
  String get consultContactOffice;

  /// No description provided for @consultOfficeDetails.
  ///
  /// In en, this message translates to:
  /// **'Office: Cleo County, Sector-121, Noida, UP\nPhone: +91 9621127233 / +91 6393551359\nEmail: connect@astrosushil.com'**
  String get consultOfficeDetails;

  /// No description provided for @accountTitle.
  ///
  /// In en, this message translates to:
  /// **'My Account'**
  String get accountTitle;

  /// No description provided for @accountSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your profile, family charts, language, and settings.'**
  String get accountSubtitle;

  /// No description provided for @guestModeTitle.
  ///
  /// In en, this message translates to:
  /// **'Guest Mode Active'**
  String get guestModeTitle;

  /// No description provided for @guestModeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your profiles are saved locally on this device. Create an account to sync across devices.'**
  String get guestModeSubtitle;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get createAccount;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get signIn;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @signOutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign out of your account?'**
  String get signOutConfirmTitle;

  /// No description provided for @signOutConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out? Your cloud data remains safe.'**
  String get signOutConfirmMessage;

  /// No description provided for @exitGuestModeConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Exit Guest Mode?'**
  String get exitGuestModeConfirmTitle;

  /// No description provided for @exitGuestModeConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'You will return to the sign-in screen.'**
  String get exitGuestModeConfirmMessage;

  /// No description provided for @languageSetting.
  ///
  /// In en, this message translates to:
  /// **'App Language / भाषा'**
  String get languageSetting;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageHindi.
  ///
  /// In en, this message translates to:
  /// **'हिन्दी (Hindi)'**
  String get languageHindi;

  /// No description provided for @selectLanguage.
  ///
  /// In en, this message translates to:
  /// **'Select App Language'**
  String get selectLanguage;

  /// No description provided for @savedProfilesTitle.
  ///
  /// In en, this message translates to:
  /// **'My Saved Birth Profiles'**
  String get savedProfilesTitle;

  /// No description provided for @savedProfilesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'View, edit, or add family members and friends.'**
  String get savedProfilesSubtitle;

  /// No description provided for @appSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings & Preferences'**
  String get appSettingsTitle;

  /// No description provided for @helpSupportTitle.
  ///
  /// In en, this message translates to:
  /// **'Help & WhatsApp Support'**
  String get helpSupportTitle;

  /// No description provided for @helpSupportSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Direct assistance from the Astro Sushil support team.'**
  String get helpSupportSubtitle;

  /// No description provided for @privacyPolicyTitle.
  ///
  /// In en, this message translates to:
  /// **'Privacy & Data Protection'**
  String get privacyPolicyTitle;

  /// No description provided for @privacyPolicySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your birth details are kept strictly private and secure.'**
  String get privacyPolicySubtitle;

  /// No description provided for @deleteCacheTitle.
  ///
  /// In en, this message translates to:
  /// **'Clear Local Report Cache'**
  String get deleteCacheTitle;

  /// No description provided for @deleteCacheSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Remove downloaded report PDFs to free up storage space.'**
  String get deleteCacheSubtitle;

  /// No description provided for @deleteCacheConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete locally stored report files?'**
  String get deleteCacheConfirm;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @errorOccurred.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorOccurred;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Please check your internet connection.'**
  String get networkError;

  /// No description provided for @emptyStateMessage.
  ///
  /// In en, this message translates to:
  /// **'No information available right now.'**
  String get emptyStateMessage;

  /// No description provided for @accessibilityClose.
  ///
  /// In en, this message translates to:
  /// **'Close dialog'**
  String get accessibilityClose;

  /// No description provided for @accessibilityBack.
  ///
  /// In en, this message translates to:
  /// **'Go back'**
  String get accessibilityBack;

  /// No description provided for @accessibilityMenu.
  ///
  /// In en, this message translates to:
  /// **'Navigation menu'**
  String get accessibilityMenu;

  /// No description provided for @explainWhatDoesThisMean.
  ///
  /// In en, this message translates to:
  /// **'What does this mean?'**
  String get explainWhatDoesThisMean;

  /// No description provided for @explainHowToRead.
  ///
  /// In en, this message translates to:
  /// **'How to read this'**
  String get explainHowToRead;

  /// No description provided for @explainLimitations.
  ///
  /// In en, this message translates to:
  /// **'Limitations & Guidance'**
  String get explainLimitations;

  /// No description provided for @explainDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'Vedic astrology provides guidance and self-reflection; it does not replace medical, legal, or financial professional advice.'**
  String get explainDisclaimer;

  /// No description provided for @explainBirthChartTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Your Kundli'**
  String get explainBirthChartTitle;

  /// No description provided for @explainBirthChartWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Your Kundli is a snapshot of the celestial sky at the exact moment and location of your birth, mapped across 12 zodiac houses (Bhavas) and signs (Rashis).'**
  String get explainBirthChartWhatIs;

  /// No description provided for @explainBirthChartHowToRead.
  ///
  /// In en, this message translates to:
  /// **'House 1 (top central diamond) represents your Ascendant (Lagna) and core personality. The numbers 1–12 indicate zodiac signs, and abbreviations like \'Su\' or \'Mo\' show planetary placements.'**
  String get explainBirthChartHowToRead;

  /// No description provided for @explainPlanetsTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Planetary Placements'**
  String get explainPlanetsTitle;

  /// No description provided for @explainPlanetsWhatIs.
  ///
  /// In en, this message translates to:
  /// **'In Vedic astrology, each of the nine grahas (Sun to Ketu) governs specific life themes and drives distinct psychological energies.'**
  String get explainPlanetsWhatIs;

  /// No description provided for @explainPlanetsHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Look at the sign and house position for each planet. A planet marked \'(R)\' is retrograde, meaning its energy is reflective, unconventional, and karmically potent.'**
  String get explainPlanetsHowToRead;

  /// No description provided for @explainDashaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Vimshottari Dasha'**
  String get explainDashaTitle;

  /// No description provided for @explainDashaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Vimshottari Dasha is a 120-year planetary timeline that reveals which celestial energy currently influences your life events and consciousness.'**
  String get explainDashaWhatIs;

  /// No description provided for @explainDashaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'The active Mahadasha (major period) sets the broader theme, while the Antardasha (sub-period) highlights daily focus. Check the start and end dates to understand active cycles.'**
  String get explainDashaHowToRead;

  /// No description provided for @explainPanchangaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Daily Panchanga'**
  String get explainPanchangaTitle;

  /// No description provided for @explainPanchangaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Panchanga represents the five limbs of time: Tithi (lunar phase), Vara (weekday), Nakshatra (constellation), Yoga (luni-solar angle), and Karana (half-tithi).'**
  String get explainPanchangaWhatIs;

  /// No description provided for @explainPanchangaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Check Tithi and Nakshatra for general auspiciousness, and observe Rahu Kaal to avoid starting critical new ventures during that window.'**
  String get explainPanchangaHowToRead;

  /// No description provided for @explainMatchmakingTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Kundli Matchmaking'**
  String get explainMatchmakingTitle;

  /// No description provided for @explainMatchmakingWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Ashtakoota Milan evaluates compatibility across eight psychological and physiological dimensions, totaling a maximum of 36 points (Gunas).'**
  String get explainMatchmakingWhatIs;

  /// No description provided for @explainMatchmakingHowToRead.
  ///
  /// In en, this message translates to:
  /// **'A score of 18 or higher is traditionally considered acceptable. Higher scores indicate greater natural alignment in temperament, emotional bonding (Bhakoot), and genetic vitality (Nadi).'**
  String get explainMatchmakingHowToRead;

  /// No description provided for @explainShadbalaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Shadbala Strengths'**
  String get explainShadbalaTitle;

  /// No description provided for @explainShadbalaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Shadbala evaluates six distinct sources of astronomical strength: Sthana (positional), Dig (directional), Kala (temporal), Cheshta (motional), Naisargika (natural), and Drik (aspectual).'**
  String get explainShadbalaWhatIs;

  /// No description provided for @explainShadbalaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Each planet has a minimum required strength measured in Virupas and Rupas. Planets with a ratio of 1.0 or greater possess sufficient strength to manifest their positive significations.'**
  String get explainShadbalaHowToRead;

  /// No description provided for @explainAshtakavargaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Ashtakavarga'**
  String get explainAshtakavargaTitle;

  /// No description provided for @explainAshtakavargaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Ashtakavarga maps the distribution of benefic points (bindus) contributed by eight references across the 12 signs of the zodiac.'**
  String get explainAshtakavargaWhatIs;

  /// No description provided for @explainAshtakavargaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'In Sarvashtakavarga (SAV), houses with 28 or more bindus represent strong, supportive life areas, while houses below 25 require patience and mindful effort.'**
  String get explainAshtakavargaHowToRead;

  /// No description provided for @matchmakingSameProfileWarning.
  ///
  /// In en, this message translates to:
  /// **'Please select two different birth profiles to evaluate compatibility.'**
  String get matchmakingSameProfileWarning;

  /// No description provided for @dataNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Data not available'**
  String get dataNotAvailable;

  /// No description provided for @calculationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Calculation unavailable'**
  String get calculationUnavailable;

  /// No description provided for @consultTabsBook.
  ///
  /// In en, this message translates to:
  /// **'Book Consultation'**
  String get consultTabsBook;

  /// No description provided for @consultTabsMyAppointments.
  ///
  /// In en, this message translates to:
  /// **'My Appointments'**
  String get consultTabsMyAppointments;

  /// No description provided for @consultSelectSlot.
  ///
  /// In en, this message translates to:
  /// **'Select Time Slot'**
  String get consultSelectSlot;

  /// No description provided for @consultSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date'**
  String get consultSelectDate;

  /// No description provided for @consultNoSlots.
  ///
  /// In en, this message translates to:
  /// **'No time slots available for this date. Please pick another date.'**
  String get consultNoSlots;

  /// No description provided for @consultNoticePrefix.
  ///
  /// In en, this message translates to:
  /// **'Notice required:'**
  String get consultNoticePrefix;

  /// No description provided for @consultDaysNotice.
  ///
  /// In en, this message translates to:
  /// **'{days} days notice'**
  String consultDaysNotice(int days);

  /// No description provided for @consultDurationMin.
  ///
  /// In en, this message translates to:
  /// **'{minutes} mins'**
  String consultDurationMin(int minutes);

  /// No description provided for @consultInclusiveGST.
  ///
  /// In en, this message translates to:
  /// **'18% GST Included'**
  String get consultInclusiveGST;

  /// No description provided for @consultBookNow.
  ///
  /// In en, this message translates to:
  /// **'Book Now'**
  String get consultBookNow;

  /// No description provided for @consultBookingTitle.
  ///
  /// In en, this message translates to:
  /// **'Book Appointment'**
  String get consultBookingTitle;

  /// No description provided for @consultSelectProfile.
  ///
  /// In en, this message translates to:
  /// **'Select Birth Profile'**
  String get consultSelectProfile;

  /// No description provided for @consultNoProfile.
  ///
  /// In en, this message translates to:
  /// **'Proceed as Self'**
  String get consultNoProfile;

  /// No description provided for @consultQueryHint.
  ///
  /// In en, this message translates to:
  /// **'Your specific question or topic of concern (optional)'**
  String get consultQueryHint;

  /// No description provided for @consultPayAndConfirm.
  ///
  /// In en, this message translates to:
  /// **'Proceed to Pay ₹{amount}'**
  String consultPayAndConfirm(String amount);

  /// No description provided for @consultBookingSuccess.
  ///
  /// In en, this message translates to:
  /// **'Appointment Confirmed!'**
  String get consultBookingSuccess;

  /// No description provided for @consultBookingReference.
  ///
  /// In en, this message translates to:
  /// **'Booking ID: {ref}'**
  String consultBookingReference(String ref);

  /// No description provided for @consultJoinSession.
  ///
  /// In en, this message translates to:
  /// **'Join Live Session'**
  String get consultJoinSession;

  /// No description provided for @consultReschedule.
  ///
  /// In en, this message translates to:
  /// **'Reschedule'**
  String get consultReschedule;

  /// No description provided for @consultCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel Appointment'**
  String get consultCancel;

  /// No description provided for @consultStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get consultStatusConfirmed;

  /// No description provided for @consultStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending Payment'**
  String get consultStatusPending;

  /// No description provided for @consultStatusRescheduled.
  ///
  /// In en, this message translates to:
  /// **'Rescheduled'**
  String get consultStatusRescheduled;

  /// No description provided for @consultStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get consultStatusCancelled;

  /// No description provided for @consultStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get consultStatusCompleted;

  /// No description provided for @consultNoAppointments.
  ///
  /// In en, this message translates to:
  /// **'No consultation appointments found.'**
  String get consultNoAppointments;

  /// No description provided for @consultReschedulePolicy.
  ///
  /// In en, this message translates to:
  /// **'Rescheduling allowed up to 24 hours prior to scheduled start time.'**
  String get consultReschedulePolicy;

  /// No description provided for @consultCancellationPolicy.
  ///
  /// In en, this message translates to:
  /// **'Cancellation releases slot capacity in accordance with policy.'**
  String get consultCancellationPolicy;

  /// No description provided for @coursesNavTitle.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get coursesNavTitle;

  /// No description provided for @coursesScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Vedic Courses & Masterclasses'**
  String get coursesScreenTitle;

  /// No description provided for @coursesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Learn authentic Gupta Nadi & predictive astrology from Astro Sushil'**
  String get coursesSubtitle;

  /// No description provided for @exploreCoursesTab.
  ///
  /// In en, this message translates to:
  /// **'All Courses'**
  String get exploreCoursesTab;

  /// No description provided for @myLearningTab.
  ///
  /// In en, this message translates to:
  /// **'My Learning'**
  String get myLearningTab;

  /// No description provided for @searchCoursesHint.
  ///
  /// In en, this message translates to:
  /// **'Search courses, topics, methods...'**
  String get searchCoursesHint;

  /// No description provided for @allLevels.
  ///
  /// In en, this message translates to:
  /// **'All Levels'**
  String get allLevels;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @courseEnrollNow.
  ///
  /// In en, this message translates to:
  /// **'Enroll Now'**
  String get courseEnrollNow;

  /// No description provided for @courseEnrolledBadge.
  ///
  /// In en, this message translates to:
  /// **'Enrolled'**
  String get courseEnrolledBadge;

  /// No description provided for @courseContinueLearning.
  ///
  /// In en, this message translates to:
  /// **'Continue Learning'**
  String get courseContinueLearning;

  /// No description provided for @courseSyllabus.
  ///
  /// In en, this message translates to:
  /// **'Curriculum & Syllabus'**
  String get courseSyllabus;

  /// No description provided for @courseOverview.
  ///
  /// In en, this message translates to:
  /// **'Course Overview'**
  String get courseOverview;

  /// No description provided for @courseFreePreview.
  ///
  /// In en, this message translates to:
  /// **'Free Preview'**
  String get courseFreePreview;

  /// No description provided for @courseLockedLesson.
  ///
  /// In en, this message translates to:
  /// **'Premium Lesson'**
  String get courseLockedLesson;

  /// No description provided for @courseLessonCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get courseLessonCompleted;

  /// No description provided for @courseMarkComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as Completed'**
  String get courseMarkComplete;

  /// No description provided for @coursePreviousLesson.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get coursePreviousLesson;

  /// No description provided for @courseNextLesson.
  ///
  /// In en, this message translates to:
  /// **'Next Lesson'**
  String get courseNextLesson;

  /// No description provided for @courseNoCoursesFound.
  ///
  /// In en, this message translates to:
  /// **'No courses found matching your criteria.'**
  String get courseNoCoursesFound;

  /// No description provided for @courseNoMyLearning.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t enrolled in any courses yet. Explore our authentic masterclasses!'**
  String get courseNoMyLearning;

  /// No description provided for @courseBrowseCourses.
  ///
  /// In en, this message translates to:
  /// **'Explore Course Catalog'**
  String get courseBrowseCourses;

  /// No description provided for @courseSecureNotice.
  ///
  /// In en, this message translates to:
  /// **'Official Masterclass Portal'**
  String get courseSecureNotice;

  /// No description provided for @courseOpenWebPortal.
  ///
  /// In en, this message translates to:
  /// **'Open Official Learning Portal'**
  String get courseOpenWebPortal;

  /// No description provided for @courseIncludesGst.
  ///
  /// In en, this message translates to:
  /// **'Inclusive of all taxes (18% GST)'**
  String get courseIncludesGst;

  /// No description provided for @courseTotalDuration.
  ///
  /// In en, this message translates to:
  /// **'{hours} hrs {mins} mins'**
  String courseTotalDuration(String hours, String mins);

  /// No description provided for @courseLessonCount.
  ///
  /// In en, this message translates to:
  /// **'{count} Lessons'**
  String courseLessonCount(String count);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
