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

  /// No description provided for @noProfileExplanation.
  ///
  /// In en, this message translates to:
  /// **'Select or create a birth profile to calculate personalized astrological charts.'**
  String get noProfileExplanation;

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

  /// No description provided for @reportsTabCatalogue.
  ///
  /// In en, this message translates to:
  /// **'Browse Reports'**
  String get reportsTabCatalogue;

  /// No description provided for @reportsTabHistory.
  ///
  /// In en, this message translates to:
  /// **'My Reports'**
  String get reportsTabHistory;

  /// No description provided for @reportCategoryComprehensive.
  ///
  /// In en, this message translates to:
  /// **'Comprehensive Life Dossiers'**
  String get reportCategoryComprehensive;

  /// No description provided for @reportCategoryFocused.
  ///
  /// In en, this message translates to:
  /// **'Focused Astrological Analyses'**
  String get reportCategoryFocused;

  /// No description provided for @reportCategoryCompatibility.
  ///
  /// In en, this message translates to:
  /// **'Relationship & Compatibility'**
  String get reportCategoryCompatibility;

  /// No description provided for @reportCategoryUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming Research Editions'**
  String get reportCategoryUpcoming;

  /// No description provided for @reportProHoroscopeTitle.
  ///
  /// In en, this message translates to:
  /// **'Pro Horoscope & Divisional Charts'**
  String get reportProHoroscopeTitle;

  /// No description provided for @reportProHoroscopeDesc.
  ///
  /// In en, this message translates to:
  /// **'Multi-divisional analysis, 6-fold planetary Shadbala, 12 Bhava Bala rank analysis, and classical remedial measures.'**
  String get reportProHoroscopeDesc;

  /// No description provided for @reportDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Report Details'**
  String get reportDetailTitle;

  /// No description provided for @reportIncludedSections.
  ///
  /// In en, this message translates to:
  /// **'Included Astrological Sections'**
  String get reportIncludedSections;

  /// No description provided for @reportPriceBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Price & Tax Breakdown'**
  String get reportPriceBreakdown;

  /// No description provided for @reportGstIncluded.
  ///
  /// In en, this message translates to:
  /// **'18% GST Included'**
  String get reportGstIncluded;

  /// No description provided for @reportPartnerProfileSelect.
  ///
  /// In en, this message translates to:
  /// **'Select Partner Profile'**
  String get reportPartnerProfileSelect;

  /// No description provided for @reportPartnerProfileRequired.
  ///
  /// In en, this message translates to:
  /// **'Partner Profile Required'**
  String get reportPartnerProfileRequired;

  /// No description provided for @reportPartnerProfilePrompt.
  ///
  /// In en, this message translates to:
  /// **'Kundli Milan requires two distinct birth profiles. Please select or add a partner birth profile.'**
  String get reportPartnerProfilePrompt;

  /// No description provided for @reportHistoryEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No Reports Generated Yet'**
  String get reportHistoryEmptyTitle;

  /// No description provided for @reportHistoryEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your generated personalized astrology reports and vector PDF dossiers will be saved here permanently.'**
  String get reportHistoryEmptySubtitle;

  /// No description provided for @reportHistoryBrowseButton.
  ///
  /// In en, this message translates to:
  /// **'Browse Report Catalogue'**
  String get reportHistoryBrowseButton;

  /// No description provided for @reportStatusQueued.
  ///
  /// In en, this message translates to:
  /// **'In Queue'**
  String get reportStatusQueued;

  /// No description provided for @reportStatusCalculating.
  ///
  /// In en, this message translates to:
  /// **'Calculating'**
  String get reportStatusCalculating;

  /// No description provided for @reportStatusAnalyzing.
  ///
  /// In en, this message translates to:
  /// **'Analyzing'**
  String get reportStatusAnalyzing;

  /// No description provided for @reportStatusRendering.
  ///
  /// In en, this message translates to:
  /// **'Rendering'**
  String get reportStatusRendering;

  /// No description provided for @reportStatusCompiling.
  ///
  /// In en, this message translates to:
  /// **'Compiling PDF'**
  String get reportStatusCompiling;

  /// No description provided for @reportStatusUploading.
  ///
  /// In en, this message translates to:
  /// **'Securing PDF'**
  String get reportStatusUploading;

  /// No description provided for @reportStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get reportStatusCompleted;

  /// No description provided for @reportStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get reportStatusFailed;

  /// No description provided for @reportActionViewPdf.
  ///
  /// In en, this message translates to:
  /// **'Open PDF'**
  String get reportActionViewPdf;

  /// No description provided for @reportActionShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get reportActionShare;

  /// No description provided for @reportActionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get reportActionRetry;

  /// No description provided for @reportActionRegenerate.
  ///
  /// In en, this message translates to:
  /// **'Regenerate'**
  String get reportActionRegenerate;

  /// No description provided for @reportCompareTiersTitle.
  ///
  /// In en, this message translates to:
  /// **'Compare Report Tiers'**
  String get reportCompareTiersTitle;

  /// No description provided for @reportDeliveryInstant.
  ///
  /// In en, this message translates to:
  /// **'Instant Digital PDF Delivery'**
  String get reportDeliveryInstant;

  /// No description provided for @reportDeliveryTime.
  ///
  /// In en, this message translates to:
  /// **'Delivery: Instant Vector PDF'**
  String get reportDeliveryTime;

  /// No description provided for @reportRequiredProfiles.
  ///
  /// In en, this message translates to:
  /// **'Required: {count} Profile'**
  String reportRequiredProfiles(int count);

  /// No description provided for @reportExistingCompletedNotice.
  ///
  /// In en, this message translates to:
  /// **'You already have a completed report for {name}'**
  String reportExistingCompletedNotice(String name);

  /// No description provided for @reportViewExisting.
  ///
  /// In en, this message translates to:
  /// **'View Existing PDF'**
  String get reportViewExisting;

  /// No description provided for @reportGenerateNew.
  ///
  /// In en, this message translates to:
  /// **'Generate Fresh Version'**
  String get reportGenerateNew;

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

  /// No description provided for @explainHousesTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding the 12 Houses (Bhavas)'**
  String get explainHousesTitle;

  /// No description provided for @explainHousesWhatIs.
  ///
  /// In en, this message translates to:
  /// **'In Vedic astrology, the 12 houses divide your life into distinct spheres of experience, from self, wealth, and family to career, partnerships, and spiritual liberation.'**
  String get explainHousesWhatIs;

  /// No description provided for @explainHousesHowToRead.
  ///
  /// In en, this message translates to:
  /// **'House 1 (Tanu Bhava) represents your physical self and character. Houses with occupying planets emphasize those themes in your life, while unoccupied houses are guided by their ruling sign lord.'**
  String get explainHousesHowToRead;

  /// No description provided for @explainNakshatraTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Nakshatras (Lunar Mansions)'**
  String get explainNakshatraTitle;

  /// No description provided for @explainNakshatraWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Nakshatras are 27 lunar constellations that provide deeper psychological insight into your temperament, natural talents, and Vimshottari timing cycles.'**
  String get explainNakshatraWhatIs;

  /// No description provided for @explainNakshatraHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Your Janma Nakshatra is where the Moon was positioned at birth. Its ruling planet sets your starting life dasha, and the Pada (quarter 1–4) indicates subtle inner strengths.'**
  String get explainNakshatraHowToRead;

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

  /// No description provided for @explainDivisionalChartsTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Divisional Charts (Vargas)'**
  String get explainDivisionalChartsTitle;

  /// No description provided for @explainDivisionalChartsWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Divisional charts (Shodashvarga) divide the 30° zodiac signs into microscopic harmonic segments to examine specialized life domains like marriage (D9), career (D10), and destiny (D60).'**
  String get explainDivisionalChartsWhatIs;

  /// No description provided for @explainDivisionalChartsHowToRead.
  ///
  /// In en, this message translates to:
  /// **'D1 (Rashi) shows the physical manifestation, while higher vargas reveal specific karmic potentials. A strong planet in D1 that is also exalted or in its own sign in D9 (Vargottama) brings enduring favorable outcomes.'**
  String get explainDivisionalChartsHowToRead;

  /// No description provided for @explainBhavaBalaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Bhava Bala (House Potency)'**
  String get explainBhavaBalaTitle;

  /// No description provided for @explainBhavaBalaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Bhava Bala evaluates the comprehensive strength of each of the 12 astrological houses based on Lord strength, directional cusp potency, aspects, and resident planets.'**
  String get explainBhavaBalaWhatIs;

  /// No description provided for @explainBhavaBalaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Houses with higher Rupas (typically 6.0+ or ranked 1–4) indicate areas of life that flourish with ease and resilience, while lower-ranked houses need conscious nurturing.'**
  String get explainBhavaBalaHowToRead;

  /// No description provided for @explainYogasTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Vedic Yogas'**
  String get explainYogasTitle;

  /// No description provided for @explainYogasWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Yogas are special planetary combinations described in classical scriptures (Brihat Parashara Hora Shastra) that generate extraordinary strengths, wealth, leadership, or spiritual wisdom.'**
  String get explainYogasWhatIs;

  /// No description provided for @explainYogasHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Active yogas are formed when planetary relationships meet exact scriptural conditions. Check the involved planets, house alignments, and condition checklist to understand how the yoga functions.'**
  String get explainYogasHowToRead;

  /// No description provided for @explainJaiminiTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Jaimini Astrology'**
  String get explainJaiminiTitle;

  /// No description provided for @explainJaiminiWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Jaimini Sutras use seven or eight Chara Karakas (variable planetary significators determined by degrees) and sign-based aspects (Rashi Drishti) to reveal soul purpose and destiny.'**
  String get explainJaiminiWhatIs;

  /// No description provided for @explainJaiminiHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Atmakaraka (AK) represents your soul\'s journey, Amatyakaraka (AmK) indicates career and advisors, and Darakaraka (DK) signifies partnerships and spouse. Arudha Lagna (AL) reflects your external societal image.'**
  String get explainJaiminiHowToRead;

  /// No description provided for @explainKpTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding KP Astrology (Krishnamurti)'**
  String get explainKpTitle;

  /// No description provided for @explainKpWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Krishnamurti Padhdhati (KP) uses Placidus house cusps and a 4-tier sub-lord system (Sign Lord, Star Lord, Sub Lord, Sub-Sub Lord) to time events with pinpoint precision.'**
  String get explainKpWhatIs;

  /// No description provided for @explainKpHowToRead.
  ///
  /// In en, this message translates to:
  /// **'In KP, a planet or cusp\'s primary outcome is determined by its Star Lord, while the final fruitful manifestation is governed by its Sub Lord. Examine the sub-lord connections for accurate event timing.'**
  String get explainKpHowToRead;

  /// No description provided for @explainGocharaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Gochara (Transits)'**
  String get explainGocharaTitle;

  /// No description provided for @explainGocharaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Gochara evaluates current planetary movements in the sidereal sky relative to your natal Moon sign, Ascendant, and Ashtakavarga energy matrix.'**
  String get explainGocharaWhatIs;

  /// No description provided for @explainGocharaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Benefic transits over houses with 28+ SAV bindus unlock opportunities, while challenging transits (like Saturn over 12th, 1st, or 2nd house during Sade Sati) require disciplined focus and caution.'**
  String get explainGocharaHowToRead;

  /// No description provided for @explainSpecialPointsTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Special Points & Upagrahas'**
  String get explainSpecialPointsTitle;

  /// No description provided for @explainSpecialPointsWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Vedic astrology calculates subtle non-luminous energy centers including 5 shadow Upagrahas (Dhooma to Upaketu), time-based Gulika/Mandi, and Special Lagnas (Hora, Ghatika, Indu).'**
  String get explainSpecialPointsWhatIs;

  /// No description provided for @explainSpecialPointsHowToRead.
  ///
  /// In en, this message translates to:
  /// **'Indu Lagna reveals financial prosperity, Hora Lagna evaluates wealth timing, and 64th Navamsha / 22nd Drekkana highlight sensitive vulnerability degrees requiring spiritual remedies.'**
  String get explainSpecialPointsHowToRead;

  /// No description provided for @explainVarshaphalaTitle.
  ///
  /// In en, this message translates to:
  /// **'Understanding Varshaphala (Solar Return)'**
  String get explainVarshaphalaTitle;

  /// No description provided for @explainVarshaphalaWhatIs.
  ///
  /// In en, this message translates to:
  /// **'Varshaphala (Tajika system) calculates an annual horoscope for the precise moment the transiting Sun returns to its exact natal birth longitude.'**
  String get explainVarshaphalaWhatIs;

  /// No description provided for @explainVarshaphalaHowToRead.
  ///
  /// In en, this message translates to:
  /// **'The Year Lord (Varshesha) and the moving focus point (Muntha) set the primary annual theme, while Harsha Bala measures the year\'s psychological and material contentment.'**
  String get explainVarshaphalaHowToRead;

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

  /// No description provided for @consultFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get consultFilterAll;

  /// No description provided for @consultFilterVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get consultFilterVideo;

  /// No description provided for @consultFilterAudio.
  ///
  /// In en, this message translates to:
  /// **'Voice'**
  String get consultFilterAudio;

  /// No description provided for @consultFilterUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get consultFilterUrgent;

  /// No description provided for @consultFilterSpecialized.
  ///
  /// In en, this message translates to:
  /// **'Specialized'**
  String get consultFilterSpecialized;

  /// No description provided for @consultFilterInPerson.
  ///
  /// In en, this message translates to:
  /// **'In-Person'**
  String get consultFilterInPerson;

  /// No description provided for @consultFilterUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get consultFilterUpcoming;

  /// No description provided for @consultFilterPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get consultFilterPending;

  /// No description provided for @consultFilterCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get consultFilterCompleted;

  /// No description provided for @consultFilterCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get consultFilterCancelled;

  /// No description provided for @consultTimeZoneNotice.
  ///
  /// In en, this message translates to:
  /// **'All times are in Indian Standard Time (IST / UTC+05:30)'**
  String get consultTimeZoneNotice;

  /// No description provided for @consultPrivacyReassurance.
  ///
  /// In en, this message translates to:
  /// **'Your birth details and life questions are strictly confidential, shared only with Astro Sushil.'**
  String get consultPrivacyReassurance;

  /// No description provided for @consultBasePrice.
  ///
  /// In en, this message translates to:
  /// **'Base Consultation Fee'**
  String get consultBasePrice;

  /// No description provided for @consultGstAmount.
  ///
  /// In en, this message translates to:
  /// **'GST (18% Included)'**
  String get consultGstAmount;

  /// No description provided for @consultTotalAmount.
  ///
  /// In en, this message translates to:
  /// **'Total Amount'**
  String get consultTotalAmount;

  /// No description provided for @consultNextStepsTitle.
  ///
  /// In en, this message translates to:
  /// **'What Happens Next'**
  String get consultNextStepsTitle;

  /// No description provided for @consultNextStepsDesc.
  ///
  /// In en, this message translates to:
  /// **'Your appointment is confirmed. Live meeting room links will become active 15 minutes before the session.'**
  String get consultNextStepsDesc;

  /// No description provided for @consultViewAppointments.
  ///
  /// In en, this message translates to:
  /// **'View in My Appointments'**
  String get consultViewAppointments;

  /// No description provided for @consultHowItWorksTitle.
  ///
  /// In en, this message translates to:
  /// **'How Consultation Works'**
  String get consultHowItWorksTitle;

  /// No description provided for @consultStep1.
  ///
  /// In en, this message translates to:
  /// **'1. Select Format & Date'**
  String get consultStep1;

  /// No description provided for @consultStep2.
  ///
  /// In en, this message translates to:
  /// **'2. Confirm Slot & Queries'**
  String get consultStep2;

  /// No description provided for @consultStep3.
  ///
  /// In en, this message translates to:
  /// **'3. Meet Astro Sushil'**
  String get consultStep3;

  /// No description provided for @consultLocationNotice.
  ///
  /// In en, this message translates to:
  /// **'Delhi / NCR office or client city location restrictions apply'**
  String get consultLocationNotice;

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

  /// No description provided for @howCanWeGuideYou.
  ///
  /// In en, this message translates to:
  /// **'How can we guide you today?'**
  String get howCanWeGuideYou;

  /// No description provided for @exploreHeroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Explore your birth chart, get insights, learn astrology and more.'**
  String get exploreHeroSubtitle;

  /// No description provided for @myBirthProfile.
  ///
  /// In en, this message translates to:
  /// **'My Birth Profile'**
  String get myBirthProfile;

  /// No description provided for @viewChartButton.
  ///
  /// In en, this message translates to:
  /// **'View Chart'**
  String get viewChartButton;

  /// No description provided for @transitsShort.
  ///
  /// In en, this message translates to:
  /// **'Transits'**
  String get transitsShort;

  /// No description provided for @matchmakingShort.
  ///
  /// In en, this message translates to:
  /// **'Match Making'**
  String get matchmakingShort;

  /// No description provided for @dashasShort.
  ///
  /// In en, this message translates to:
  /// **'Dashas'**
  String get dashasShort;

  /// No description provided for @askSushilSirBannerTitle.
  ///
  /// In en, this message translates to:
  /// **'Let Sushil Sir explain this chart'**
  String get askSushilSirBannerTitle;

  /// No description provided for @askSushilSirBannerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Get simple, clear explanations of your astrology'**
  String get askSushilSirBannerSubtitle;

  /// No description provided for @askSushilSirButton.
  ///
  /// In en, this message translates to:
  /// **'Ask Sushil Sir'**
  String get askSushilSirButton;

  /// No description provided for @coursesShortcutTitle.
  ///
  /// In en, this message translates to:
  /// **'Astrology Courses'**
  String get coursesShortcutTitle;

  /// No description provided for @coursesShortcutSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Learn at your own pace'**
  String get coursesShortcutSubtitle;

  /// No description provided for @shopShortcutTitle.
  ///
  /// In en, this message translates to:
  /// **'Shop'**
  String get shopShortcutTitle;

  /// No description provided for @shopShortcutSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Books, gemstones, & more'**
  String get shopShortcutSubtitle;

  /// No description provided for @quickInsightsTitle.
  ///
  /// In en, this message translates to:
  /// **'Quick Insights'**
  String get quickInsightsTitle;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See All'**
  String get seeAll;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View All'**
  String get viewAll;

  /// No description provided for @viewFull.
  ///
  /// In en, this message translates to:
  /// **'View Full'**
  String get viewFull;

  /// No description provided for @auspiciousTime.
  ///
  /// In en, this message translates to:
  /// **'Auspicious Time'**
  String get auspiciousTime;

  /// No description provided for @goodForNewWork.
  ///
  /// In en, this message translates to:
  /// **'Good for new work'**
  String get goodForNewWork;

  /// No description provided for @avoidRahuKaal.
  ///
  /// In en, this message translates to:
  /// **'Avoid Rahu Kaal'**
  String get avoidRahuKaal;

  /// No description provided for @notSuitableForTasks.
  ///
  /// In en, this message translates to:
  /// **'Not suitable for important tasks'**
  String get notSuitableForTasks;

  /// No description provided for @emotionsStable.
  ///
  /// In en, this message translates to:
  /// **'Emotions are stable today'**
  String get emotionsStable;

  /// No description provided for @lagnaAscendant.
  ///
  /// In en, this message translates to:
  /// **'Lagna'**
  String get lagnaAscendant;

  /// No description provided for @moonSign.
  ///
  /// In en, this message translates to:
  /// **'Moon Sign'**
  String get moonSign;

  /// No description provided for @currentDasha.
  ///
  /// In en, this message translates to:
  /// **'Active Dasha'**
  String get currentDasha;

  /// No description provided for @spiritualShopTitle.
  ///
  /// In en, this message translates to:
  /// **'Spiritual Shop'**
  String get spiritualShopTitle;

  /// No description provided for @spiritualShopSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Consecrated spiritual remedies, sacred art, and digital wallpapers'**
  String get spiritualShopSubtitle;

  /// No description provided for @allOfferings.
  ///
  /// In en, this message translates to:
  /// **'All Offerings'**
  String get allOfferings;

  /// No description provided for @wallpapersCategory.
  ///
  /// In en, this message translates to:
  /// **'Wallpapers'**
  String get wallpapersCategory;

  /// No description provided for @sacredArtCategory.
  ///
  /// In en, this message translates to:
  /// **'Sacred Art'**
  String get sacredArtCategory;

  /// No description provided for @kitsBundlesCategory.
  ///
  /// In en, this message translates to:
  /// **'Kits & Bundles'**
  String get kitsBundlesCategory;

  /// No description provided for @ayodhyaHerbCategory.
  ///
  /// In en, this message translates to:
  /// **'Ayodhya Herb'**
  String get ayodhyaHerbCategory;

  /// No description provided for @searchShopHint.
  ///
  /// In en, this message translates to:
  /// **'Search wallpapers, sacred art, or herbs...'**
  String get searchShopHint;

  /// No description provided for @inclusiveGstBadge.
  ///
  /// In en, this message translates to:
  /// **'18% GST Included'**
  String get inclusiveGstBadge;

  /// No description provided for @physicalProduct.
  ///
  /// In en, this message translates to:
  /// **'Physical Product'**
  String get physicalProduct;

  /// No description provided for @instantDownload.
  ///
  /// In en, this message translates to:
  /// **'Instant Download'**
  String get instantDownload;

  /// No description provided for @digitalBundle.
  ///
  /// In en, this message translates to:
  /// **'Digital Bundle'**
  String get digitalBundle;

  /// No description provided for @addToCart.
  ///
  /// In en, this message translates to:
  /// **'Add to Cart'**
  String get addToCart;

  /// No description provided for @buyNow.
  ///
  /// In en, this message translates to:
  /// **'Buy Now'**
  String get buyNow;

  /// No description provided for @addedToCartSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Added to cart'**
  String get addedToCartSnackbar;

  /// No description provided for @shoppingCartTitle.
  ///
  /// In en, this message translates to:
  /// **'Shopping Cart'**
  String get shoppingCartTitle;

  /// No description provided for @cartEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty'**
  String get cartEmptyTitle;

  /// No description provided for @cartEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Explore our consecrated wallpapers, sacred art, and spiritual remedies.'**
  String get cartEmptySubtitle;

  /// No description provided for @proceedToCheckout.
  ///
  /// In en, this message translates to:
  /// **'Proceed to Checkout'**
  String get proceedToCheckout;

  /// No description provided for @orderSummary.
  ///
  /// In en, this message translates to:
  /// **'Order Summary'**
  String get orderSummary;

  /// No description provided for @basePrice.
  ///
  /// In en, this message translates to:
  /// **'Base Price:'**
  String get basePrice;

  /// No description provided for @gstIncluded.
  ///
  /// In en, this message translates to:
  /// **'GST (18% Included):'**
  String get gstIncluded;

  /// No description provided for @shippingFee.
  ///
  /// In en, this message translates to:
  /// **'Shipping Fee:'**
  String get shippingFee;

  /// No description provided for @freeShippingBadge.
  ///
  /// In en, this message translates to:
  /// **'FREE'**
  String get freeShippingBadge;

  /// No description provided for @totalAmount.
  ///
  /// In en, this message translates to:
  /// **'Total Amount:'**
  String get totalAmount;

  /// No description provided for @deliveryAddress.
  ///
  /// In en, this message translates to:
  /// **'Delivery Address'**
  String get deliveryAddress;

  /// No description provided for @selectAddressPrompt.
  ///
  /// In en, this message translates to:
  /// **'Please select a delivery address for physical items'**
  String get selectAddressPrompt;

  /// No description provided for @digitalDeliveryReassurance.
  ///
  /// In en, this message translates to:
  /// **'Instant Digital Access in My Library immediately after payment.'**
  String get digitalDeliveryReassurance;

  /// No description provided for @myOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'My Orders & Purchases'**
  String get myOrdersTitle;

  /// No description provided for @orderDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Order Details'**
  String get orderDetailsTitle;

  /// No description provided for @myDigitalLibraryTitle.
  ///
  /// In en, this message translates to:
  /// **'My Digital Library'**
  String get myDigitalLibraryTitle;

  /// No description provided for @digitalLibrarySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Secure 15-minute expiring downloads for your purchased digital products'**
  String get digitalLibrarySubtitle;

  /// No description provided for @downloadAsset.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get downloadAsset;

  /// No description provided for @reDownload.
  ///
  /// In en, this message translates to:
  /// **'Re-generate Link'**
  String get reDownload;

  /// No description provided for @linkCopied.
  ///
  /// In en, this message translates to:
  /// **'Download link copied to clipboard'**
  String get linkCopied;

  /// No description provided for @trackingNumber.
  ///
  /// In en, this message translates to:
  /// **'Tracking Number:'**
  String get trackingNumber;

  /// No description provided for @courierPartner.
  ///
  /// In en, this message translates to:
  /// **'Courier Partner:'**
  String get courierPartner;

  /// No description provided for @dispatchDate.
  ///
  /// In en, this message translates to:
  /// **'Dispatch Date:'**
  String get dispatchDate;

  /// No description provided for @orderStatusProcessing.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get orderStatusProcessing;

  /// No description provided for @orderStatusDispatched.
  ///
  /// In en, this message translates to:
  /// **'Dispatched'**
  String get orderStatusDispatched;

  /// No description provided for @orderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatusCancelled;

  /// No description provided for @orderStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get orderStatusConfirmed;

  /// No description provided for @shippingAddressManage.
  ///
  /// In en, this message translates to:
  /// **'Delivery Addresses'**
  String get shippingAddressManage;

  /// No description provided for @addNewAddress.
  ///
  /// In en, this message translates to:
  /// **'Add New Address'**
  String get addNewAddress;

  /// No description provided for @saveAddress.
  ///
  /// In en, this message translates to:
  /// **'Save Address'**
  String get saveAddress;

  /// No description provided for @onboardingSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get onboardingSkip;

  /// No description provided for @onboardingNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get onboardingNext;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get onboardingGetStarted;

  /// No description provided for @onboardingTitle1Prefix.
  ///
  /// In en, this message translates to:
  /// **'Know Your'**
  String get onboardingTitle1Prefix;

  /// No description provided for @onboardingTitle1Highlight.
  ///
  /// In en, this message translates to:
  /// **'Chart'**
  String get onboardingTitle1Highlight;

  /// No description provided for @onboardingDesc1.
  ///
  /// In en, this message translates to:
  /// **'Explore your birth chart, planets and houses in one clear, beautiful view.'**
  String get onboardingDesc1;

  /// No description provided for @onboardingTitle2Prefix.
  ///
  /// In en, this message translates to:
  /// **'Find Your'**
  String get onboardingTitle2Prefix;

  /// No description provided for @onboardingTitle2Highlight.
  ///
  /// In en, this message translates to:
  /// **'Direction'**
  String get onboardingTitle2Highlight;

  /// No description provided for @onboardingDesc2.
  ///
  /// In en, this message translates to:
  /// **'Understand the patterns in your chart and explore the areas of life that matter to you.'**
  String get onboardingDesc2;

  /// No description provided for @onboardingTitle3Prefix.
  ///
  /// In en, this message translates to:
  /// **'Go Beyond'**
  String get onboardingTitle3Prefix;

  /// No description provided for @onboardingTitle3Highlight.
  ///
  /// In en, this message translates to:
  /// **'the Basics'**
  String get onboardingTitle3Highlight;

  /// No description provided for @onboardingDesc3.
  ///
  /// In en, this message translates to:
  /// **'Unlock deeper insights and personalized reports built around your birth details.'**
  String get onboardingDesc3;

  /// No description provided for @onboardingWhyBirthDataTitle.
  ///
  /// In en, this message translates to:
  /// **'Why We Ask For Birth Details'**
  String get onboardingWhyBirthDataTitle;

  /// No description provided for @onboardingWhyBirthDataDesc.
  ///
  /// In en, this message translates to:
  /// **'Authentic Vedic astrology requires your precise birth date, time, and birthplace to calculate the exact planetary degrees and your Ascendant (Lagna). Your personal details remain strictly private and secure.'**
  String get onboardingWhyBirthDataDesc;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Astro Sushil'**
  String get welcomeBack;

  /// No description provided for @loginPhoneSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your phone number to receive a secure OTP'**
  String get loginPhoneSubtitle;

  /// No description provided for @loginEmailSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your email and password'**
  String get loginEmailSubtitle;

  /// No description provided for @phoneNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone Number'**
  String get phoneNumberLabel;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'9876543210'**
  String get phoneHint;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send OTP'**
  String get sendOtp;

  /// No description provided for @continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueWithGoogle;

  /// No description provided for @exploreAsGuest.
  ///
  /// In en, this message translates to:
  /// **'Explore as Guest'**
  String get exploreAsGuest;

  /// No description provided for @signInWithPassword.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Password'**
  String get signInWithPassword;

  /// No description provided for @signInWithPhone.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Phone OTP'**
  String get signInWithPhone;

  /// No description provided for @emailAddressLabel.
  ///
  /// In en, this message translates to:
  /// **'Email Address'**
  String get emailAddressLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @loginWithEmail.
  ///
  /// In en, this message translates to:
  /// **'Login with Email'**
  String get loginWithEmail;

  /// No description provided for @otpVerificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter Verification Code'**
  String get otpVerificationTitle;

  /// No description provided for @otpSentToMessage.
  ///
  /// In en, this message translates to:
  /// **'We\'ve sent a 6-digit verification code to'**
  String get otpSentToMessage;

  /// No description provided for @resendCodeIn.
  ///
  /// In en, this message translates to:
  /// **'Resend code in {seconds}s'**
  String resendCodeIn(Object seconds);

  /// No description provided for @resendOtp.
  ///
  /// In en, this message translates to:
  /// **'Resend OTP'**
  String get resendOtp;

  /// No description provided for @verifyAndContinue.
  ///
  /// In en, this message translates to:
  /// **'Verify & Continue'**
  String get verifyAndContinue;

  /// No description provided for @invalidOtpMessage.
  ///
  /// In en, this message translates to:
  /// **'Please enter the full 6-digit verification code.'**
  String get invalidOtpMessage;

  /// No description provided for @sessionExpiredTitle.
  ///
  /// In en, this message translates to:
  /// **'Session Expired'**
  String get sessionExpiredTitle;

  /// No description provided for @sessionExpiredMessage.
  ///
  /// In en, this message translates to:
  /// **'Session expired. Please sign in again.'**
  String get sessionExpiredMessage;

  /// No description provided for @birthProfileDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Birth Profile Details'**
  String get birthProfileDetailsTitle;

  /// No description provided for @birthDetailsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Accurate birth details are essential for authentic Vedic calculations.'**
  String get birthDetailsSubtitle;

  /// No description provided for @birthNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Full Name'**
  String get birthNameLabel;

  /// No description provided for @dateOfBirthLabel.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth'**
  String get dateOfBirthLabel;

  /// No description provided for @timeOfBirthLabel.
  ///
  /// In en, this message translates to:
  /// **'Time of Birth'**
  String get timeOfBirthLabel;

  /// No description provided for @placeOfBirthLabel.
  ///
  /// In en, this message translates to:
  /// **'Place of Birth'**
  String get placeOfBirthLabel;

  /// No description provided for @approximateTimeNote.
  ///
  /// In en, this message translates to:
  /// **'If exact minute is unknown, enter your closest approximate time.'**
  String get approximateTimeNote;

  /// No description provided for @setAsActiveProfile.
  ///
  /// In en, this message translates to:
  /// **'Set as Active Profile'**
  String get setAsActiveProfile;

  /// No description provided for @activeProfileBadge.
  ///
  /// In en, this message translates to:
  /// **'Active Profile'**
  String get activeProfileBadge;

  /// No description provided for @editBirthDetails.
  ///
  /// In en, this message translates to:
  /// **'Edit Birth Details'**
  String get editBirthDetails;

  /// No description provided for @deleteBirthProfile.
  ///
  /// In en, this message translates to:
  /// **'Delete Profile'**
  String get deleteBirthProfile;

  /// No description provided for @deleteProfileConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Birth Profile?'**
  String get deleteProfileConfirmTitle;

  /// No description provided for @deleteProfileConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this birth profile? Associated Kundli calculations and personalized insights will be removed.'**
  String get deleteProfileConfirmMessage;

  /// No description provided for @birthDataImpactNotice.
  ///
  /// In en, this message translates to:
  /// **'Changes to birth date, time, or coordinates will automatically update your Ascendant and planetary calculations.'**
  String get birthDataImpactNotice;

  /// No description provided for @newProfileButton.
  ///
  /// In en, this message translates to:
  /// **'New Profile'**
  String get newProfileButton;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications & Daily Alerts'**
  String get notificationsTitle;

  /// No description provided for @notificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Configure astrological alerts and reminders'**
  String get notificationsSubtitle;

  /// No description provided for @systemPermissionStatus.
  ///
  /// In en, this message translates to:
  /// **'System Notification Permission:'**
  String get systemPermissionStatus;

  /// No description provided for @permissionGranted.
  ///
  /// In en, this message translates to:
  /// **'Enabled'**
  String get permissionGranted;

  /// No description provided for @permissionDenied.
  ///
  /// In en, this message translates to:
  /// **'Disabled'**
  String get permissionDenied;

  /// No description provided for @dailyPanchangAlert.
  ///
  /// In en, this message translates to:
  /// **'Daily Panchang & Muhurta'**
  String get dailyPanchangAlert;

  /// No description provided for @dailyPanchangAlertSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Receive auspicious timings, Tithi, and Nakshatra updates'**
  String get dailyPanchangAlertSubtitle;

  /// No description provided for @transitAlert.
  ///
  /// In en, this message translates to:
  /// **'Planetary Transit (Gochara)'**
  String get transitAlert;

  /// No description provided for @transitAlertSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Alerts on major planet shifts affecting your Moon sign'**
  String get transitAlertSubtitle;

  /// No description provided for @consultationAlert.
  ///
  /// In en, this message translates to:
  /// **'Consultation Reminders'**
  String get consultationAlert;

  /// No description provided for @consultationAlertSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Appointment reminders 24h and 1h before your session'**
  String get consultationAlertSubtitle;

  /// No description provided for @orderTrackingAlert.
  ///
  /// In en, this message translates to:
  /// **'Order & Delivery Updates'**
  String get orderTrackingAlert;

  /// No description provided for @orderTrackingAlertSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Status updates for physical and digital shop orders'**
  String get orderTrackingAlertSubtitle;

  /// No description provided for @accountSecurityTitle.
  ///
  /// In en, this message translates to:
  /// **'Account Security & Credentials'**
  String get accountSecurityTitle;

  /// No description provided for @termsOfServiceTitle.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get termsOfServiceTitle;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Account & Data'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Permanently delete account credentials and revoke active sessions.'**
  String get deleteAccountSubtitle;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete your account? This action will revoke all active sessions. In accordance with safety rules, existing past orders remain archived for tax compliance.'**
  String get deleteAccountConfirm;

  /// No description provided for @notificationsInbox.
  ///
  /// In en, this message translates to:
  /// **'Notifications Inbox'**
  String get notificationsInbox;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark All as Read'**
  String get markAllRead;

  /// No description provided for @allNotifications.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allNotifications;

  /// No description provided for @panchangNotifications.
  ///
  /// In en, this message translates to:
  /// **'Panchang'**
  String get panchangNotifications;

  /// No description provided for @transitNotifications.
  ///
  /// In en, this message translates to:
  /// **'Transits'**
  String get transitNotifications;

  /// No description provided for @orderNotifications.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get orderNotifications;

  /// No description provided for @consultationNotifications.
  ///
  /// In en, this message translates to:
  /// **'Consultations'**
  String get consultationNotifications;

  /// No description provided for @noNotificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'No Notifications Yet'**
  String get noNotificationsTitle;

  /// No description provided for @noNotificationsDesc.
  ///
  /// In en, this message translates to:
  /// **'Your daily panchang, planetary transit updates, and order milestones will appear here.'**
  String get noNotificationsDesc;

  /// No description provided for @notificationDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Notification Details'**
  String get notificationDetailTitle;

  /// No description provided for @notificationDismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get notificationDismiss;

  /// No description provided for @notificationTakeAction.
  ///
  /// In en, this message translates to:
  /// **'Open Details'**
  String get notificationTakeAction;

  /// No description provided for @helpSupportHeader.
  ///
  /// In en, this message translates to:
  /// **'How can we assist you?'**
  String get helpSupportHeader;

  /// No description provided for @helpSupportSubtitleText.
  ///
  /// In en, this message translates to:
  /// **'Get answers to common Vedic astrology questions or connect directly with our support team.'**
  String get helpSupportSubtitleText;

  /// No description provided for @officialWhatsAppSupport.
  ///
  /// In en, this message translates to:
  /// **'Official WhatsApp Support'**
  String get officialWhatsAppSupport;

  /// No description provided for @supportOfficeHours.
  ///
  /// In en, this message translates to:
  /// **'Monday – Saturday: 10:00 AM – 7:00 PM IST'**
  String get supportOfficeHours;

  /// No description provided for @copiedToClipboard.
  ///
  /// In en, this message translates to:
  /// **'Copied to clipboard'**
  String get copiedToClipboard;

  /// No description provided for @frequentlyAskedQuestions.
  ///
  /// In en, this message translates to:
  /// **'Frequently Asked Questions'**
  String get frequentlyAskedQuestions;

  /// No description provided for @sendFeedbackButton.
  ///
  /// In en, this message translates to:
  /// **'Send Feedback or Question'**
  String get sendFeedbackButton;

  /// No description provided for @feedbackPromptTitle.
  ///
  /// In en, this message translates to:
  /// **'Share Your Feedback'**
  String get feedbackPromptTitle;

  /// No description provided for @feedbackPromptSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tell us how we can improve your Astro Sushil experience.'**
  String get feedbackPromptSubtitle;

  /// No description provided for @submitFeedback.
  ///
  /// In en, this message translates to:
  /// **'Submit Feedback'**
  String get submitFeedback;

  /// No description provided for @feedbackThankYou.
  ///
  /// In en, this message translates to:
  /// **'Thank you for your feedback! Our team reviews all suggestions.'**
  String get feedbackThankYou;

  /// No description provided for @legalDocumentsHeader.
  ///
  /// In en, this message translates to:
  /// **'Legal & Compliance'**
  String get legalDocumentsHeader;

  /// No description provided for @privacyPolicyTab.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicyTab;

  /// No description provided for @termsOfServiceTab.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get termsOfServiceTab;

  /// No description provided for @refundPolicyTab.
  ///
  /// In en, this message translates to:
  /// **'Refund Policy'**
  String get refundPolicyTab;

  /// No description provided for @shippingPolicyTab.
  ///
  /// In en, this message translates to:
  /// **'Shipping Policy'**
  String get shippingPolicyTab;

  /// No description provided for @astrologyDisclaimerTab.
  ///
  /// In en, this message translates to:
  /// **'Astrology Disclaimer'**
  String get astrologyDisclaimerTab;

  /// No description provided for @systemMaintenanceTitle.
  ///
  /// In en, this message translates to:
  /// **'System Maintenance'**
  String get systemMaintenanceTitle;

  /// No description provided for @systemMaintenanceDesc.
  ///
  /// In en, this message translates to:
  /// **'Astro Sushil systems are undergoing scheduled maintenance. Astrological calculations will resume shortly.'**
  String get systemMaintenanceDesc;

  /// No description provided for @systemMaintenanceOfflineNotice.
  ///
  /// In en, this message translates to:
  /// **'Your saved birth charts and library downloads remain fully accessible offline.'**
  String get systemMaintenanceOfflineNotice;

  /// No description provided for @checkSystemStatus.
  ///
  /// In en, this message translates to:
  /// **'Refresh Status'**
  String get checkSystemStatus;

  /// No description provided for @pageNotFoundTitle.
  ///
  /// In en, this message translates to:
  /// **'Lost in the Cosmos'**
  String get pageNotFoundTitle;

  /// No description provided for @pageNotFoundDesc.
  ///
  /// In en, this message translates to:
  /// **'The planetary coordinates or screen you are searching for does not exist or has moved.'**
  String get pageNotFoundDesc;

  /// No description provided for @returnToHome.
  ///
  /// In en, this message translates to:
  /// **'Return to Home'**
  String get returnToHome;

  /// No description provided for @welcomeSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Astro Sushil!'**
  String get welcomeSuccessTitle;

  /// No description provided for @welcomeSuccessSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your account has been created successfully. Explore authentic Vedic astrology, reports, and consultations.'**
  String get welcomeSuccessSubtitle;

  /// No description provided for @getStartedButton.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get getStartedButton;
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
