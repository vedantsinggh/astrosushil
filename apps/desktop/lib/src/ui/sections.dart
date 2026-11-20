import 'package:flutter/material.dart';

/// Sidebar groups (in display order).
enum SectionGroup {
  chart('Chart'),
  time('Time and periods'),
  strength('Strength'),
  systems('Systems'),
  moreSystems('More systems'),
  tables('Tables and ephemeris'),
  tools('Tools');

  const SectionGroup(this.label);
  final String label;
}

/// Workspace sections for an open chart. `about` is kept for compatibility but shown as a dialog.
enum Section {
  chart('Chart', Icons.grid_view_rounded, SectionGroup.chart, 'Rasi and Navamsa charts, planetary positions, houses and birth summary'),
  vargas('Vargas', Icons.dashboard_customize_outlined, SectionGroup.chart, 'All 16 divisional charts (Shodashavarga)'),
  bhavaChalit('Bhava Chalit', Icons.view_quilt_outlined, SectionGroup.chart, 'Sripati Bhava Chalit: bhava madhya and sandhi, planets by bhava'),
  special('Special points', Icons.blur_circular, SectionGroup.chart, 'Sudarshana Chakra, Avakhada, upagrahas and sensitive points'),
  wheel('Wheel chart', Icons.radio_button_unchecked_rounded, SectionGroup.chart, 'Circular Rasi chart with planets at their longitudes'),
  vargasExtra('Extra vargas', Icons.grid_on_rounded, SectionGroup.chart, 'D5–D150, Pushkara Navamsha/Bhaga and Bhrigu Bindu (provisional)'),
  relationships('Relationships', Icons.handshake_outlined, SectionGroup.chart, 'Natural, temporary and compound planetary relationships'),
  notes('Notes', Icons.sticky_note_2_outlined, SectionGroup.chart, 'Your notes for this chart, saved in the chart file'),
  dashas('Dashas', Icons.view_timeline_outlined, SectionGroup.time, 'Dasha periods as a timeline and a tree, in 13 systems'),
  dashasExtra('Extra dashas', Icons.segment_rounded, SectionGroup.time, 'Sudasa, Drig, Shoola, Mandooka, Trikona, Kendradi, Tribhagi, Shastihayani, Tara, Patyayini (provisional)'),
  dashaPravesh('Dasha Pravesh', Icons.flag_outlined, SectionGroup.time, 'Chart at the start of a chosen dasha period'),
  transits('Transits', Icons.public, SectionGroup.time, 'Planets at a chosen moment against the natal chart'),
  timeline('Transit timeline', Icons.timeline, SectionGroup.time, 'Sign and nakshatra ingresses and stations over a period'),
  transitTables('Transit tables', Icons.table_rows_outlined, SectionGroup.time, 'Ingress, nakshatra/pada and station tables for a year, with CSV/PDF'),
  sadeSati('Sade Sati', Icons.timelapse_rounded, SectionGroup.time, 'Saturn over the 12th, 1st and 2nd from the Moon: periods only'),
  combustion('Combustion', Icons.wb_sunny_outlined, SectionGroup.time, 'When each planet enters and leaves combustion (provisional orbs)'),
  panchang('Panchang', Icons.wb_twilight, SectionGroup.time, 'Tithi, nakshatra, yoga, karana, hora and choghadiya'),
  varshaphala('Varshaphala', Icons.event_repeat, SectionGroup.time, 'Annual (Tajika) chart for a chosen year'),
  tajika('Tajika', Icons.join_inner_rounded, SectionGroup.time, '16 Tajika yogas, Pancha-vargiya Bala and Tithi Pravesha (provisional)'),
  ashtakavarga('Ashtakavarga', Icons.table_chart_outlined, SectionGroup.strength, 'BAV, SAV, prastara, shodhana and pinda'),
  strength('Strength', Icons.bar_chart_rounded, SectionGroup.strength, 'Shadbala, Bhava Bala, Ishta/Kashta and Vimshopaka'),
  strengthGraphs('Strength graphs', Icons.stacked_bar_chart_rounded, SectionGroup.strength, 'Shadbala and Bhava Bala as bar graphs'),
  yogas('Yogas', Icons.auto_awesome_outlined, SectionGroup.systems, 'Classical yogas found by the engine, with evidence'),
  kp('KP', Icons.account_tree_outlined, SectionGroup.systems, 'KP cusps, star/sub lords and significators'),
  jaimini('Jaimini', Icons.hub_outlined, SectionGroup.systems, 'Chara karakas, arudhas, rashi drishti and derived charts'),
  chakras('Chakras', Icons.apps_rounded, SectionGroup.moreSystems, 'Sarvatobhadra, Kota and Tripataki chakras (provisional)'),
  lalKitab('Lal Kitab', Icons.menu_book_outlined, SectionGroup.moreSystems, 'Lal Kitab chart and 120-year Varshphal, calculation only (provisional)'),
  ephemeris('Ephemeris', Icons.view_list_outlined, SectionGroup.tables, 'Daily/monthly ephemeris tables, positions at any moment, CSV/PDF'),
  lagnaRising('Lagna rising', Icons.wb_twilight_outlined, SectionGroup.tables, 'Rising time of each sign for a date and place'),
  muhurtaWindows('Muhurta windows', Icons.hourglass_bottom_rounded, SectionGroup.tables, 'Durmuhurta, Varjyam, Amrit Kalam, Gandmool and Panchaka (provisional)'),
  panchangMonth('Monthly panchang', Icons.calendar_month_outlined, SectionGroup.tables, 'Printable panchang calendar for a month'),
  matching('Matching', Icons.people_outline, SectionGroup.tools, 'Ashtakoota (36 guna), Porutham and Dashakoota matching with a partner chart'),
  prashna('Prashna', Icons.help_outline, SectionGroup.tools, 'Horary chart for a question moment'),
  eclipses('Eclipses', Icons.brightness_3_outlined, SectionGroup.tools, 'Solar and lunar eclipses by year'),
  rectification('Birth-time sensitivity', Icons.tune_outlined, SectionGroup.tools, 'How close the birth time is to a change of Lagna, vargas or Moon pada'),
  horoscopePdf('Horoscope PDF', Icons.picture_as_pdf_outlined, SectionGroup.tools, 'Multi-page A4 horoscope: charts, tables, panchanga, dashas'),
  about('About', Icons.info_outline, SectionGroup.tools, 'About this app');

  const Section(this.label, this.icon, this.group, this.description);
  final String label;
  final IconData icon;
  final SectionGroup group;
  final String description;

  /// Sections shown in the sidebar (About lives in the Help menu).
  static List<Section> get navigable => values.where((s) => s != Section.about).toList();

  static Section? byName(String? name) => values.where((s) => s.name == name).firstOrNull;
}

/// Pages that do not belong to a single chart.
enum GlobalPage {
  home('Home', Icons.home_outlined, 'Recent charts and quick start'),
  library('Chart database', Icons.folder_copy_outlined, 'Search and filter your saved charts');

  const GlobalPage(this.label, this.icon, this.description);
  final String label;
  final IconData icon;
  final String description;
}
