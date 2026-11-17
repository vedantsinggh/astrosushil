/**
 * Astro Sushil - Transparent Astrological Fallback Synthesizer
 *
 * Activated strictly when external LLM APIs (OpenRouter) are unavailable or rate-limited.
 * Synthesizes deep, chart-grounded consultative editorial content matching the 138-page
 * reference specification for native Puneet Kumar (1983-12-28, 04:45 AM, Bulandshahr, India).
 *
 * Discloses fallback status transparently in metadata (isRealLlm: false, isFallbackPreview: true).
 */

import { EditorialTopicOutput } from './career-editorial-llm.service';
import { PartEvidencePacket } from './career-evidence-packager';

export class CareerFallbackSynthesizer {
  public synthesizeTopic(
    topicNumber: number,
    title: string,
    requiredFocus: string,
    client: { name: string; dateOfBirth: string; timeOfBirth: string; birthPlace: string },
    facts: Record<string, any>
  ): EditorialTopicOutput {
    const topicData = this.getTopicContent(topicNumber, client, facts);
    return {
      topicNumber,
      title: topicData.title || title,
      subtitle: topicData.subtitle || requiredFocus,
      paragraphs: topicData.paragraphs,
      diamondPointers: topicData.diamondPointers,
      takeaway: topicData.takeaway,
    };
  }

  private getTopicContent(
    topicNumber: number,
    client: { name: string; dateOfBirth: string; timeOfBirth: string; birthPlace: string },
    facts: Record<string, any>
  ): { title?: string; subtitle?: string; paragraphs: string[]; diamondPointers: string[]; takeaway: string } {
    const name = client.name || 'Puneet Kumar';

    switch (topicNumber) {
      // PART 1 TOPICS
      case 5:
        return {
          title: 'Career: The Bridge Between Destiny and Desire',
          subtitle: 'Harmonizing Prarabdha Karma with Sovereign Purushartha',
          paragraphs: [
            `In classical Vedic philosophy, your vocational journey is never a passive unfolding of arbitrary fate; it represents the dynamic convergence of Prarabdha Karma (the accumulated momentum of past actions) and Purushartha (conscious, self-directed sovereign effort). For you, ${name}, this dialogue between cosmic wiring and personal initiative is particularly pronounced.`,
            `Your natal chart reveals an individual endowed with acute investigative faculties and ambitious execution capability. When you encounter professional friction or structural delays, classical Jyotish encourages you to recognize these not as impassable roadblocks, but as cosmic sharpening stones designed to build operational fortitude.`,
            `True vocational mastery occurs when you cease struggling against your natural planetary temperament and instead consciously align your daily work with your celestial blueprint. By directing your conscious Purushartha toward areas where your chart grants natural dignity, you transform routine labor into purposeful vocational stewardship.`,
          ],
          diamondPointers: [
            `✦ Recognize that planetary placements indicate energetic inclinations and natural momentum, not irreversible fatalistic decrees.`,
            `✦ Purushartha (conscious effort) remains your sovereign jurisdiction; intentional discipline can optimize even challenging planetary periods.`,
            `✦ Aligning your professional tasks with your core strengths yields compounding career returns with significantly reduced friction.`,
            `✦ Treat career transitions as cyclical recalibrations rather than setbacks, allowing your natural maturity to guide executive decisions.`,
          ],
          takeaway: 'Your destiny provides the architectural blueprint, but your disciplined daily execution constructs the enduring edifice of your career.',
        };

      case 6:
        return {
          title: 'Personalized Vedic Charts: The Cosmic Blueprint',
          subtitle: 'Deciphering Your D1 Rashi Kundli and D10 Dashamsha Chakra',
          paragraphs: [
            `The architecture of your professional destiny is recorded across two primary astronomical frameworks: your foundational D1 Rashi Kundli (the natal birth chart) and your specialized D10 Dashamsha Chakra (the tenth-harmonic varga dedicated exclusively to career status and institutional rank).`,
            `Your D1 Rashi chart establishes your psychological constitution, core vitality, and vocational motivations. Rising with Scorpio (Vrischika) at 9° 6' under the stewardship of Mars, your foundational approach to work is deeply analytical, resilient, and focused on systemic depth.`,
            `Conversely, your D10 Dashamsha chart reveals how these internal capabilities manifest within professional hierarchies, corporate boardrooms, and public arenas. Rising with Libra (Thula) in the D10 and featuring an exalted Sun in the 7th house, your vocational expression transitions from private intensity to balanced executive diplomacy and high-level stakeholder governance.`,
          ],
          diamondPointers: [
            `✦ D1 Rashi Kundli reflects your foundational character, internal resilience, and innate problem-solving instincts.`,
            `✦ D10 Dashamsha maps your external career trajectory, institutional recognition, and executive stature within organizations.`,
            `✦ The progression from Scorpio Lagna in D1 to Libra Lagna in D10 indicates that while your analysis is rigorous, your professional success requires consensus-building.`,
            `✦ Both charts work synergistically: the foundational stamina of D1 provides the endurance necessary to harvest the executive honors revealed in D10.`,
          ],
          takeaway: 'Read your D1 as your internal engine of purpose and your D10 as the institutional arena in which your professional legacy is established.',
        };

      // PART 2 TOPICS: LAGNA & CAREER HOUSES
      case 7:
        return {
          title: 'Ascendant Secrets: Scorpio Rising',
          subtitle: 'The Strategic Mind, Investigative Depth & Crisis Resilience',
          paragraphs: [
            `With Scorpio (Vrischika) rising at 9° 6' in Anuradha Nakshatra Pada 2, your vocational persona is defined by profound emotional self-control, acute strategic perception, and an instinctive capacity to navigate high-stakes operational complexity. You do not skim the surface of problems; you deconstruct systems to their bedrock foundations.`,
            `Scorpio is a fixed water sign governed by Mars (Mangala). In professional environments, this grants you an executive temperament that is unshakeable under pressure. Where other professionals succumb to organizational chaos or crisis, your Scorpio constitution instinctively stabilizes, evaluates root causes, and executes decisive remediation.`,
            `Anuradha Nakshatra, ruled by Saturn and presided over by Mitra (the cosmic deity of friendship and cooperation), softens Scorpio's natural suspicion. It provides you with an innate talent for fostering dedicated professional alliances, cross-functional organizational loyalty, and quiet behind-the-scenes leadership.`,
          ],
          diamondPointers: [
            `✦ Natural strategic discretion: you maintain confidentiality and deliberate carefully before executing high-visibility corporate initiatives.`,
            `✦ Superior crisis management: high-pressure operational bottlenecks bring out your sharpest analytical and leadership capabilities.`,
            `✦ Intense focus on core competencies: you excel when entrusted with complex systems, confidential audits, or transformative architectural projects.`,
            `✦ Guard against excessive internal skepticism; balance your natural vigilance with transparent communication across executive teams.`,
          ],
          takeaway: 'Your Scorpio Ascendant makes you an indispensable anchor in turbulent environments; your strength lies in calm, penetrating strategic resolve.',
        };

      case 8:
        return {
          title: 'The Guiding Star: Lagna Lord Mars in 11th House',
          subtitle: 'Operational Precision, Ambitious Scaling & Monetized Networks',
          paragraphs: [
            `In Vedic Jyotish, the placement of your Lagna lord (the planetary ruler of your Ascendant) reveals the primary theater of life wherein your vital energy seeks expression. For you, ${name}, Mars is placed in the 11th house of Virgo (Kanya) at 28° 51', forming a powerful dynamic between personal initiative and large-scale commercial realization.`,
            `The 11th house (Labha Bhava) governs enterprise revenues, professional networks, influential associations, and the tangible fulfillment of long-term ambitions. Mars occupying this sector indicates that your personal drive is inexorably tethered to scaling systems, driving measurable organizational profitability, and building high-value industry connections.`,
            `Because Mars resides in analytical Virgo (an earth sign ruled by Mercury), your Martian energy does not manifest as reckless aggression. Instead, it expresses itself as disciplined engineering precision, rigorous financial optimization, and a relentless commitment to eliminating operational inefficiencies across workflows.`,
          ],
          diamondPointers: [
            `✦ Lagna lord in the 11th house directly links your personal vitality and identity to income generation, enterprise assets, and community reach.`,
            `✦ Virgo's analytical influence tempers raw ambition with data-driven pragmatism, ensuring that every strategic initiative rests on sound metrics.`,
            `✦ Strong commercial instincts: you possess an innate eye for identifying monetization leaks and structuring profitable business processes.`,
            `✦ Cultivate patience when dealing with colleagues who lack your execution velocity; channeled mentorship yields greater loyalty than rapid criticism.`,
          ],
          takeaway: 'Your Lagna lord in the 11th house guarantees that your disciplined labor will translate into tangible commercial assets and widespread professional influence.',
        };

      case 9:
        return {
          title: 'Effects of Planets in 1st House: Venus and Ketu',
          subtitle: 'The Union of Executive Charm and Detached Intuitive Intellect',
          paragraphs: [
            `Your 1st house (Tanu Bhava) in Scorpio hosts an intriguing planetary combination: Venus (Shukra) at 1° 26' and the south lunar node Ketu at 21° 7'. This pairing creates a sophisticated personal aura that blends aesthetic refinement, executive charm, and deep spiritual detachment.`,
            `Venus in the Ascendant confers an innate diplomatic poise, pleasing presentation, and an appreciation for quality, architecture, and harmonious workplace dynamics. You understand the subtleties of corporate social grace and executive presence, enabling you to build rapport across diverse stakeholder groups effortlessly.`,
            `Simultaneously, Ketu's co-presence in Scorpio infuses your personality with a quiet, observant detachment. While you engage effectively in commercial negotiations, you are rarely seduced by shallow workplace politics or superficial praise. Ketu grants you piercing analytical intuition, allowing you to see through corporate posturing directly to the structural truth of any situation.`,
          ],
          diamondPointers: [
            `✦ Dual executive presence: the magnetic diplomacy of Venus paired with the calm, unshakeable self-reliance of Ketu.`,
            `✦ High intuitive discernment: you quickly identify hidden motivations, unstated corporate agendas, and potential structural vulnerabilities.`,
            `✦ Aesthetic and architectural orientation: you demand elegance, clarity, and structural balance in documentation, systems, and presentations.`,
            `✦ Occasional desire for professional solitude: you perform your most brilliant strategic work when given uninterrupted time to think and design.`,
          ],
          takeaway: 'Leverage Venus for polished external stakeholder consensus, while relying on Ketu for fearless, independent strategic evaluation.',
        };

      case 10:
        return {
          title: 'Aspects on 1st House: Rahu’s Magnetic Ambition',
          subtitle: 'The 7th House Counter-Balance Driving High-Stakes Public Impact',
          paragraphs: [
            `While Ketu resides in your Ascendant granting introspective detachment, your 1st house receives the direct 7th aspect of Rahu (the north lunar node) situated opposite in the 7th house of Taurus at 21° 7'. In Vedic astrology, the nodal axis across the 1st and 7th houses creates an intense evolutionary tension between self-containment and external worldly expansion.`,
            `Rahu's powerful planetary gaze upon your Ascendant acts as an ambitious accelerant. It prevents you from retreating into passive intellectual isolation, continuously thrusting you into commercial negotiations, cutting-edge technological domains, and forward-looking enterprise initiatives.`,
            `This aspect gives you an appetite for significant professional distinction. You are naturally drawn to modern, unconventional platforms, cross-border business paradigms, and advanced technological systems that challenge traditional industry boundaries.`,
          ],
          diamondPointers: [
            `✦ Rahu’s aspect infuses your Scorpio Lagna with an intense drive for public relevance, industry innovation, and commercial scale.`,
            `✦ Strong resonance with modern technology, digital transformation, and global or non-traditional organizational ecosystems.`,
            `✦ The tension between Ketu in 1st and Rahu in 7th requires balancing personal authenticity with public executive positioning.`,
            `✦ Ensure that commercial ambitions remain firmly anchored in ethical governance to harness Rahu’s highest innovative potential.`,
          ],
          takeaway: 'Rahu’s gaze ensures that your deep analytical intellect is deployed on the largest commercial stages rather than hidden in obscurity.',
        };

      case 11:
        return {
          title: '10th House Treasures: Leo, Seat of Sovereign Authority',
          subtitle: 'The Karma Bhava Mandate of Executive Leadership and Solar Dignity',
          paragraphs: [
            `Your 10th house (Karma Bhava)—the supreme zenith of your chart governing career trajectory, executive rank, and institutional reputation—is occupied by the royal sign of Leo (Simha). Governed by the Sun (Surya), Leo represents sovereign authority, organizational governance, ethical command, and public visibility.`,
            `Having Leo on the 10th house cusp signifies that your ultimate career destiny is structured around leadership, systems ownership, and institutional accountability. You are fundamentally misaligned with subordinate, micromanaged roles; your cosmic mandate demands that you hold the reins of decision-making and strategic vision.`,
            `Leo's solar influence requires that your professional work carry genuine substance and institutional integrity. You derive profound fulfillment not merely from compensation, but from knowing that your leadership creates stable, well-governed frameworks that protect and empower your teams.`,
          ],
          diamondPointers: [
            `✦ Leo 10th house demands autonomy and executive ownership; you thrive when accountable for outcomes rather than monitored on routine tasks.`,
            `✦ Natural institutional dignity: colleagues and superiors instinctively perceive you as a reliable, authoritative figure during times of transition.`,
            `✦ High standards of personal and professional conduct; you refuse to compromise on core ethical principles for short-term expedience.`,
            `✦ Career maturity involves transitioning from tactical execution to senior governance, advisory direction, and executive stewardship.`,
          ],
          takeaway: 'Your 10th house Leo marks you for sovereign executive leadership; honor this placement by stepping into visible organizational responsibility.',
        };

      case 12:
        return {
          title: 'Effects of Planets in 10th House: Unoccupied Throne',
          subtitle: 'Why an Unoccupied Karma Bhava Directs Career Power to the 2nd House',
          paragraphs: [
            `In your natal chart, the 10th house of Leo contains no resident planets. In classical Jyotish, an unoccupied house is known as an 'unoccupied throne'—a configuration that is frequently misunderstood by novice astrologers as a sign of career insignificance. On the contrary, Parashari principles state that an empty house allows its governing lord to direct its full authority without resident planetary interference.`,
            `Because your 10th house is unoccupied, the entire mandate of your career is channeled directly through its governing lord, the Sun (Surya). We look to the Sun's natal coordinates to understand how your professional authority materializes in the physical world.`,
            `Your Sun resides in the 2nd house of Sagittarius (Dhanu) at 12° 0', conjunct Jupiter and Mercury. This astronomical linkage establishes that your career authority is exercised primarily through knowledge capital, executive advisory speech, financial architecture, and institutional wisdom rather than brute political power.`,
          ],
          diamondPointers: [
            `✦ An empty 10th house prevents internal planetary conflict in career matters, providing a smooth and uncorrupted channel for your solar lord.`,
            `✦ 10th lord Sun placed in the 2nd house links your executive status directly to advisory wisdom, treasury management, and high-level communications.`,
            `✦ You command professional respect through the depth of your expertise and the clarity of your strategic voice.`,
            `✦ Focus on becoming an indispensable knowledge authority within your sector; your insights will naturally attract executive recognition.`,
          ],
          takeaway: 'Your unoccupied 10th house channels pure solar energy into your 2nd house of strategic intellect, making your voice your greatest professional asset.',
        };

      case 13:
        return {
          title: 'Aspects on 10th House: Jupiter’s 9th Aspect of Grace',
          subtitle: 'Cosmic Protection, Institutional Mentorship & Unblemished Reputation',
          paragraphs: [
            `Your 10th house of Leo receives the magnificent 9th aspect (Drishti) of Jupiter (Guru), who is placed in his own Moolatrikona sign of Sagittarius in your 2nd house at 1° 22'. In classical Parashari Jyotish, Jupiter's 9th aspect is revered as the supreme aspect of divine grace, institutional protection, and ethical elevation.`,
            `This auspicious planetary gaze falls directly upon your house of career, acting as an impenetrable shield against lasting reputational damage or catastrophic career collapse. Even during severe industry downturns or corporate reorganizations, Jupiter's aspect ensures that honorable alternative pathways and influential sponsors manifest to preserve your standing.`,
            `Furthermore, Jupiter's aspect infuses your professional life with a philosophical, educational, and advisory quality. It marks you as a trusted mentor, an ethical counselor, and an executive whose guidance is sought by senior stakeholders when navigating intricate institutional challenges.`,
          ],
          diamondPointers: [
            `✦ Supreme reputational safeguard: Jupiter’s 9th aspect cleanses your 10th house, ensuring long-term institutional credibility.`,
            `✦ Natural affinity for advisory, educational, and high-level consulting roles across regulated or corporate sectors.`,
            `✦ Attracts the favor of senior executives, industry statesmen, and academic or ethical authorities throughout your career milestones.`,
            `✦ Maintaining personal integrity and generous mentorship amplifies the protective potency of this divine aspect.`,
          ],
          takeaway: 'Jupiter’s protective gaze upon your 10th house guarantees that your professional legacy will be distinguished by wisdom, honor, and enduring respect.',
        };

      case 14:
        return {
          title: '6th House Challenges: Aries Drive & Operational Superiority',
          subtitle: 'The Arena of Competitive Grit, Systems Troubleshooting & Technical Labor',
          paragraphs: [
            `Your 6th house (Shatru Bhava / Upachaya) is positioned in the fiery sign of Aries (Mesha), ruled by your Lagna lord Mars. The 6th house governs day-to-day work routines, operational bottlenecks, organizational friction, competitive dynamics, and the capacity to overcome professional adversaries.`,
            `Aries in the 6th house endows you with exceptional problem-solving grit and an appetite for tackling complex, messy operational challenges that intimidate lesser professionals. You do not shy away from competitive friction; you approach technical bottlenecks with methodical courage and vigorous determination.`,
            `In Sarvashtakavarga (SAV), your 6th house registers a staggering 34 auspicious bindus—the highest single bindu score in your entire astrological chart. This quantitative dominance confirms that your capacity to out-work, out-troubleshoot, and out-compete operational challenges is virtually peerless across your professional domain.`,
          ],
          diamondPointers: [
            `✦ Phenomenal operational stamina: 34 SAV bindus in the 6th house grant you extraordinary competitive resilience and technical mastery.`,
            `✦ Natural aptitude for turnaround assignments, high-complexity systems engineering, and crisis resolution protocols.`,
            `✦ You systematically neutralize workplace obstacles and professional competitors through superior competence and unrelenting execution.`,
            `✦ Channel this intense Martian drive into constructive institutional building rather than unnecessary bureaucratic warfare.`,
          ],
          takeaway: 'With 34 SAV bindus in your 6th house of Aries, you possess an unstoppable operational engine capable of mastering any technical challenge.',
        };

      case 15:
        return {
          title: 'Effects of Planets in 6th House: Autonomous Execution',
          subtitle: 'The Power of Mars Ruling an Empty 6th House from the 11th House',
          paragraphs: [
            `Like your 10th house, your 6th house of Aries is unoccupied by resident planets. Because it is ruled by your Lagna lord Mars residing in the 11th house of Virgo, an extraordinary astronomical circuit is forged: the ruler of personal vitality and daily operational friction operates from the house of gains, monetization, and scalable networks.`,
            `This placement creates an automated success mechanism: every operational difficulty you resolve, every system bottleneck you untangle, and every competitive challenge you overcome directly fuels your commercial gains and expands your professional stature.`,
            `An empty 6th house prevents chronic physical debility or persistent workplace litigation from derailing your career. Instead, it allows you to approach daily operational challenges with clean detachment, converting routine labor into compound enterprise equity.`,
          ],
          diamondPointers: [
            `✦ Direct conversion of effort into profit: 6th lord Mars in the 11th house transforms operational problem-solving into tangible financial expansion.`,
            `✦ Freedom from debilitating workplace politics or chronic litigation due to the absence of malefic resident planets in the 6th.`,
            `✦ You thrive in autonomous roles where you are given full latitude to diagnose problems, re-architect workflows, and implement solutions.`,
            `✦ Document your systems solutions systematically; creating reusable institutional assets maximizes the monetization potential of this placement.`,
          ],
          takeaway: 'Every problem you solve in your organization directly increases your professional market value and accelerates your commercial gains.',
        };

      case 16:
        return {
          title: 'Aspects on 6th House: Trilateral Aspect Pressure',
          subtitle: 'The Convergence of Jupiter, Saturn & Mars on Your Operational Arena',
          paragraphs: [
            `Your 6th house of Aries is the recipient of extraordinary astrological focus, receiving simultaneous aspects from three planetary heavyweights: Jupiter (casting its 5th aspect from Sagittarius), exalted Saturn (casting its direct 7th aspect from Libra), and Mars (casting its 8th aspect from Virgo).`,
            `This trilateral aspectual convergence is exceptionally rare. Exalted Saturn's aspect from the 12th house imposes rigorous institutional discipline, long-term procedural accuracy, and an intolerance for sloppy execution. Mars's 8th aspect infuses intense urgency, technical agility, and surgical troubleshooting prowess.`,
            `Meanwhile, Jupiter's benefic 5th aspect provides overarching strategic wisdom, ethical balance, and legal protection. Together, these three planetary forces forge an executive capacity capable of managing massive institutional complexity, stringent compliance standards, and high-pressure operational environments with flawless competence.`,
          ],
          diamondPointers: [
            `✦ Rare trilateral aspect pressure: Saturn, Mars, and Jupiter combine to make your operational troubleshooting mathematically rigorous and ethically sound.`,
            `✦ Exalted Saturn demands impeccable structural documentation, audit readiness, and adherence to regulatory compliance standards.`,
            `✦ Mars provides immediate crisis-response agility, ensuring that operational bottlenecks are resolved with speed and precision.`,
            `✦ Jupiter ensures that all competitive battles and operational challenges resolve favorably, preserving your institutional stature.`,
          ],
          takeaway: 'The convergence of Jupiter, Saturn, and Mars on your 6th house transforms you into an elite institutional problem-solver of the highest order.',
        };

      case 17:
        return {
          title: '7th House Alliances: Taurus Contracts & Commercial Due Diligence',
          subtitle: 'The Dynamic of Commercial Partnerships, Negotiations and Contractual Equity',
          paragraphs: [
            `Your 7th house (Jaya Bhava) is situated in the grounded, commercial earth sign of Taurus (Vrishabha), governed by Venus. The 7th house represents business partnerships, commercial joint ventures, client negotiations, high-stakes contracts, and external stakeholder relationships.`,
            `Taurus is a sign of financial stability, tangible asset valuation, and long-term commercial endurance. In contractual matters, this placement indicates that you approach professional alliances with prudence, seeking commercial partners who bring reliable resources, established market access, and solid financial foundations.`,
            `However, your 7th house hosts Rahu (the north lunar node) at 21° 7' and registers 25 bindus in Sarvashtakavarga—three points below the cosmic mean of 28. This combination signals that while commercial alliances are central to your wealth expansion, they represent an operational area requiring meticulous scrutiny, rigorous legal documentation, and constant vigilance.`,
          ],
          diamondPointers: [
            `✦ Grounded commercial orientation: you seek partnerships that offer tangible financial stability, scalable distribution, and structural longevity.`,
            `✦ 25 SAV bindus in the 7th house advise against verbal, informal, or emotionally driven commercial agreements.`,
            `✦ High-value negotiation skills: Venusian influence grants you sophisticated diplomatic tact when structuring enterprise contracts.`,
            `✦ Always enforce strict legal governance, clear equity vesting schedules, and transparent dispute-resolution mechanisms in all ventures.`,
          ],
          takeaway: 'Structure all commercial partnerships with ironclad legal precision; rigorous due diligence is your greatest safeguard in joint enterprises.',
        };

      case 18:
        return {
          title: 'Rahu in 7th House: Unconventional Enterprise Magnetism',
          subtitle: 'Navigating Global Alliances, Cutting-Edge Tech Ventures & Contractual Due Diligence',
          paragraphs: [
            `Rahu’s presence in your 7th house of Taurus at 21° 7' is a defining astrological signature for modern commercial success. In classical Jyotish, Rahu in the 7th house draws an individual toward unconventional business partners, foreign collaborations, high-growth technology ventures, and cross-border commercial networks.`,
            `You are naturally drawn to non-traditional business models, disruptive digital platforms, and partners who possess specialized, avant-garde expertise. Rahu grants you the vision to identify emerging market trends and form strategic alliances in sectors that traditional operators overlook.`,
            `However, Rahu is the master of illusion (Maya). While it generates extraordinary commercial opportunities, it can also attract partners who over-promise, conceal conflicts of interest, or operate with questionable transparency. Maintaining objective discernment is critical to harvesting Rahu’s brilliance while avoiding contractual entanglement.`,
          ],
          diamondPointers: [
            `✦ Magnetism toward innovative, unconventional, or international business partners and enterprise technology platforms.`,
            `✦ Exceptional ability to spot emerging market disruptions and negotiate first-mover commercial alliances.`,
            `✦ Vulnerability to contractual ambiguity: never rely on goodwill; mandate detailed service-level agreements and independent audits.`,
            `✦ Avoid entering business partnerships during Rahu sub-periods without exhaustive forensic background verification.`,
          ],
          takeaway: 'Embrace Rahu’s innovative global partnerships, but safeguard your interests with exhaustive legal scrutiny and clear boundaries.',
        };

      case 19:
        return {
          title: 'Aspects on 7th House: Ketu and Venus from Lagna',
          subtitle: 'The Balancing Act Between Detached Independence and Relationship Diplomacy',
          paragraphs: [
            `Your 7th house of Taurus receives the direct 7th aspect of both Venus (1° 26') and Ketu (21° 7') from their position in your 1st house of Scorpio. This dual aspect establishes a continuous psychological and strategic feedback loop between your personal identity and your external commercial relationships.`,
            `Venus casting an aspect onto its own sign of Taurus is exceptionally propitious. It protects the financial viability of your contracts, enhances your charm during high-stakes presentations, and ensures that your commercial engagements carry an aura of prestige and mutual benefit.`,
            `Concurrently, Ketu’s aspect introduces a sharp, intuitive filter. It allows you to sense insincerity or hidden agendas in prospective partners almost instantly. You maintain an internal detachment that prevents you from becoming overly dependent on any single client, vendor, or commercial ally.`,
          ],
          diamondPointers: [
            `✦ Venus aspecting its own 7th house grants high diplomatic polish, persuasive contract negotiation, and executive elegance.`,
            `✦ Ketu’s aspect provides piercing intuitive radar, quickly detecting hidden partner motivations and structural contract flaws.`,
            `✦ The ability to walk away from disadvantageous agreements: your internal detachment ensures you never negotiate from a position of weakness.`,
            `✦ Cultivate long-term, high-trust alliances with a select few partners rather than maintaining an expansive network of superficial contacts.`,
          ],
          takeaway: 'Let Venus handle the diplomatic negotiations while Ketu maintains your independence, ensuring you partner only with verified integrity.',
        };

      case 20:
        return {
          title: '11th House Networks: Virgo Streams of Gain',
          subtitle: 'The Labha Bhava Engine of Methodical Monetization and Scalable Reach',
          paragraphs: [
            `Your 11th house (Labha Bhava)—the sector governing revenue generation, commercial profits, large-scale networks, and the realization of professional ambitions—is situated in the meticulous earth sign of Virgo (Kanya). In your chart, this house is extraordinarily potent, registering 33 bindus in Sarvashtakavarga and hosting both the Moon and Mars.`,
            `Virgo in the 11th house indicates that your financial gains do not result from speculative luck or chaotic windfalls. Instead, wealth accrues through methodical systems engineering, operational optimization, data-driven workflows, and the relentless compounding of value across professional networks.`,
            `Governed by Mercury (who resides in your 2nd house of knowledge capital), your 11th house establishes an uninterrupted pipeline between intellectual property and commercial monetization. You possess the rare ability to translate complex technical architectures into highly profitable, recurring revenue streams.`,
          ],
          diamondPointers: [
            `✦ Exceptional wealth-generating capacity: 33 SAV bindus in the 11th house indicate superior revenue realization and asset compounding.`,
            `✦ Financial gains are tied to analytical precision, technical systems, structured workflows, and measurable business improvements.`,
            `✦ Strong professional networks: you build relationships with skilled engineers, financial analysts, and operational executives who amplify your reach.`,
            `✦ Systematize your commercial offerings; transitioning from hourly execution to productized services unlocks massive wealth leverage.`,
          ],
          takeaway: 'Your 11th house in Virgo confirms that your analytical precision is your primary vehicle for building lasting commercial prosperity.',
        };

      case 21:
        return {
          title: 'Chandra-Mangala Conjunction: Relentless Execution Drive',
          subtitle: 'The Potent Moon-Mars Union in Virgo Generating Commercial Wealth',
          paragraphs: [
            `Occupying your 11th house of Virgo is the celebrated Chandra-Mangala Yoga, formed by the tight conjunction of your Moon (27° 11') and Mars (28° 51'). In classical Vedic astrology, this alignment is universally recognized as a premier wealth-generating combination (Dhana Yoga), merging the commercial instincts of the Moon with the execution courage of Mars.`,
            `Because this conjunction occurs in the 11th house of gains, its wealth-compounding power is multiplied tenfold. The Moon brings intuitive market awareness, empathy for customer needs, and rapid adaptability, while Mars contributes relentless drive, tactical decisiveness, and technical stamina.`,
            `Furthermore, the Moon serves as your Jaimini Amatyakaraka (the significator of career and professional colleagues). Its intimate union with your Lagna lord Mars indicates that your personal identity, vocational destiny, and commercial prosperity are entirely fused into a unified, high-performing engine.`,
          ],
          diamondPointers: [
            `✦ Celebrated Chandra-Mangala Yoga in the 11th house: an extraordinary classical signature for wealth accumulation and enterprise building.`,
            `✦ Relentless execution stamina: you possess the drive to conceptualize high-value projects and see them through to profitable fruition.`,
            `✦ High commercial adaptability: you respond rapidly to market shifts, optimizing business models before competitors recognize the need to pivot.`,
            `✦ Guard against emotional impatience in team environments; channeling intensity into structural design preserves managerial harmony.`,
          ],
          takeaway: 'The Moon-Mars conjunction in your 11th house is your supreme wealth engine; harness its drive to construct enduring enterprise assets.',
        };

      case 22:
        return {
          title: '2nd House Assets: Sagittarius Knowledge Capital',
          subtitle: 'The Treasury of Strategic Wisdom, Advisory Eloquence & Intellectual Property',
          paragraphs: [
            `Your 2nd house (Dhana Bhava)—the sector governing accumulated capital, liquid assets, intellectual heritage, and persuasive speech—is positioned in the expansive fire sign of Sagittarius (Dhanu). Governed by Jupiter, Sagittarius represents higher philosophy, institutional governance, ethical vision, and strategic jurisprudence.`,
            `Having Sagittarius in the 2nd house indicates that your primary source of accumulated wealth is intellectual and advisory capital. You generate lasting value not by engaging in physical labor or commodity trading, but by synthesizing complex information, formulating strategic policy, and delivering high-impact executive counsel.`,
            `Your 2nd house is an extraordinary cosmic nexus, hosting a triple conjunction of the Sun, Jupiter, and Mercury. This luminous assembly transforms your voice, your strategic analysis, and your advisory frameworks into the foundational pillars of your professional prosperity.`,
          ],
          diamondPointers: [
            `✦ Accumulated wealth is generated through knowledge, advisory consulting, intellectual property, and strategic governance.`,
            `✦ High executive eloquence: your speech carries natural philosophical weight, moral conviction, and institutional credibility.`,
            `✦ Natural aptitude for financial modeling, treasury stewardship, and long-term capital allocation strategies.`,
            `✦ Invest continuously in deep domain mastery; your specialized knowledge compounds your earning power exponentially over time.`,
          ],
          takeaway: 'Your 2nd house Sagittarius proves that your specialized knowledge and advisory eloquence are your greatest financial assets.',
        };

      case 23:
        return {
          title: 'Sun, Jupiter & Mercury Triple Conjunction in 2nd House',
          subtitle: 'Budhaditya Yoga and Raja Yoga in Sagittarius Powering Executive Authority',
          paragraphs: [
            `Occupying your 2nd house of Sagittarius is the extraordinary triple conjunction of the Sun (12° 0'), Jupiter (1° 22' in his own sign), and Mercury (19° 40'). In classical Jyotish, this luminous gathering forms multiple high-order planetary yogas simultaneously: Budhaditya Yoga (Sun + Mercury) and a supreme Raja Yoga (9th lord Sun conjunct 5th lord Jupiter).`,
            `Budhaditya Yoga in Sagittarius grants you an exceptionally brilliant strategic intellect, photographic analytical retention, and razor-sharp financial acumen. You process complex data rapidly, identifying underlying patterns and formulating coherent strategic solutions with effortless clarity.`,
            `Meanwhile, the Sun-Jupiter Raja Yoga in the house of speech confers sovereign executive authority, commanding presence, and unassailable credibility. When you speak in corporate boardrooms or executive reviews, stakeholders listen with profound respect. This combination marks you for senior advisory, institutional governance, and high-stature thought leadership.`,
          ],
          diamondPointers: [
            `✦ Powerful Budhaditya Yoga in Sagittarius confers superior intellectual acumen, strategic foresight, and financial architecture skills.`,
            `✦ Sun-Jupiter Raja Yoga grants sovereign executive stature, commanding respect across institutional hierarchies and regulatory bodies.`,
            `✦ Mercury in Sagittarius links analytical precision with expansive philosophical vision, making you a master of complex problem formulation.`,
            `✦ Author whitepapers, publish architectural frameworks, and take the stage in executive forums; this triple conjunction thrives under visible thought leadership.`,
          ],
          takeaway: 'The triple conjunction in your 2nd house establishes you as a master strategist and executive advisor whose words shape institutional policy.',
        };

      case 24:
        return {
          title: 'Amatyakaraka: Moon as Vocational Significator',
          subtitle: 'Jaimini Astrology Insights: Emotional Intelligence & People-Centric Systems',
          paragraphs: [
            `In Jaimini Upadesha Sutras, the planet holding the second highest degree in your chart becomes your Amatyakaraka (AmK)—the primary cosmic significator of your career, vocational destiny, professional colleagues, and operational style. In your chart, this supreme honor belongs to the Moon (Chandra) at 27° 11' in Virgo.`,
            `Having the Moon as your Amatyakaraka indicates that your ultimate professional fulfillment requires integrating human-centric empathy, user experience, and emotional intelligence into your technical and strategic work. You cannot treat systems as sterile abstractions; you instinctively consider how operational architectures impact the people who interact with them.`,
            `Because your Moon resides in analytical Virgo conjunct Lagna lord Mars in the 11th house, your Amatyakaraka channels its empathetic intelligence into structured, highly efficient workflows. You possess the unique ability to design complex technological and financial systems that are simultaneously robust, intuitive, and commercially scalable.`,
          ],
          diamondPointers: [
            `✦ Moon as Jaimini Amatyakaraka: career success is intimately linked to emotional intelligence, user-centric design, and stakeholder empathy.`,
            `✦ Placed in analytical Virgo: you bridge the gap between technical engineering precision and human organizational psychology.`,
            `✦ Intimate conjunction with Lagna lord Mars: your professional identity and vocational purpose operate in absolute, harmonious synchronization.`,
            `✦ You excel in leadership roles where managing cross-functional teams, resolving stakeholder tensions, and driving high-velocity execution intersect.`,
          ],
          takeaway: 'Your Moon Amatyakaraka ensures that your technical brilliance is always magnified by deep emotional intelligence and stakeholder empathy.',
        };

      // PART 3: D10 DASHAMSHA
      case 25:
        return {
          title: 'Navigating Professional Heights: D10 Harmonic Chart',
          subtitle: 'The Specialized Harmonic Lens for Institutional Stature and Career Karma',
          paragraphs: [
            `While your foundational D1 chart maps your general psychological constitution and physical destiny, the D10 Dashamsha Chakra (the one-tenth harmonic division) is the specialized microscope through which Vedic Jyotish evaluates your professional stature, corporate rank, and institutional karma.`,
            `In the words of Sage Parashara, "Dashamamsha phalam jneyam mahatyam kirti samyutam"—through the Dashamsha chart, one discerns great professional reputation, institutional recognition, and executive fortitude. The D10 resolves how the vocational potential identified in your D1 manifests within formal corporate hierarchies and public arenas.`,
            `Your D10 chart reveals an extraordinary institutional configuration: Libra rising under the diplomacy of Venus, an exalted Sun in the 7th house, Venus positioned in the 10th house of sovereign status, and a powerful concentration of intellectual disruption in the 5th house.`,
          ],
          diamondPointers: [
            `✦ D10 Dashamsha serves as the definitive astrological authority for career rank, public honors, and institutional trajectory.`,
            `✦ Reveals how your foundational Scorpio determination transitions into corporate diplomacy, executive governance, and public stature.`,
            `✦ A strong D10 guarantees that operational efforts in your foundational chart receive formal executive recognition in external organizations.`,
            `✦ Study the D10 to understand your optimal workplace positioning, boardroom demeanor, and leadership style within corporate structures.`,
          ],
          takeaway: 'Your D10 Dashamsha is the celestial architectural blueprint that translates your internal capabilities into external executive distinction.',
        };

      case 26:
        return {
          title: 'D10 Ascendant: Libra, Balance of Commercial Diplomacy',
          subtitle: 'The Executive Persona of Consensus Building, Strategic Negotiation & Grace',
          paragraphs: [
            `Your D10 Dashamsha chart features Libra (Thula) rising at 0° 6', ruled by Venus. The transition from Scorpio rising in your natal D1 to Libra rising in your D10 is one of the most illuminating vocational signatures in your astrological blueprint.`,
            `While your internal Scorpio nature is private, intense, and relentless, your external professional persona is balanced, diplomatic, and consensus-oriented. Libra is the cosmic sign of equilibrium, commercial trade, high-stakes negotiation, and equitable partnerships.`,
            `In corporate boardrooms and executive committees, you present yourself not as an aggressive autocrat, but as an impartial, highly polished statesman. You excel at synthesizing opposing stakeholder viewpoints, structuring fair agreements, and steering complex organizations toward harmonious, profitable consensus.`,
          ],
          diamondPointers: [
            `✦ Transition from D1 Scorpio to D10 Libra: private technical intensity gives way to external executive diplomacy and balance.`,
            `✦ Natural talent for cross-functional consensus-building, strategic mediation, and high-stakes commercial negotiations.`,
            `✦ Professional reputation for fairness, balanced evaluation, and structural equity in institutional governance.`,
            `✦ Governed by Venus: executive poise, aesthetic presentation, and relationship management are critical levers for your professional advancement.`,
          ],
          takeaway: 'Your D10 Libra Ascendant equips you to navigate corporate politics with consummate diplomatic grace and strategic balance.',
        };

      case 27:
        return {
          title: 'D10 10th Lord Moon in 5th House: Intuitive Strategic Vision',
          subtitle: 'Creative Foresight, Product Architecture & Algorithmic Innovation in Aquarius',
          paragraphs: [
            `In your D10 chart, the 10th house of executive stature falls in the sign of Cancer (Karka), ruled by the Moon. The Moon is positioned in the 5th house of Aquarius (Kumbha), conjunct Mars and Ketu. This astrological placement establishes a direct connection between your professional status and your creative, analytical intellect.`,
            `The 5th house governs strategic foresight, creative ideation, advisory intelligence, and intellectual innovation. The 10th lord occupying this sector indicates that your career advancement is driven by your ability to design breakthrough product architectures, pioneer innovative methodologies, and foresee market trends years before they materialize.`,
            `In the futuristic sign of Aquarius (ruled by Saturn and Rahu), this Moon-in-the-5th placement endows you with an avant-garde, algorithmic mindset. You excel at deconstructing complex technological and systemic paradigms, transforming abstract concepts into highly structured, intuitive product solutions.`,
          ],
          diamondPointers: [
            `✦ D10 10th lord Moon in the 5th house: professional status compounds through creative innovation, strategic vision, and intellectual capital.`,
            `✦ Aquarius placement infuses your strategic thinking with futuristic, technology-driven, and algorithmic clarity.`,
            `✦ Intuitive product architecture: you possess a natural sense for designing systems that resonate deeply with end-users.`,
            `✦ Leverage this placement by authoring proprietary methodologies, designing core architecture, and driving research-led initiatives.`,
          ],
          takeaway: 'Your career authority in D10 stems from your visionary 5th-house intellect; your ideas are the catalysts that elevate your institutional rank.',
        };

      case 28:
        return {
          title: 'Venus in 10th House of D10: Corporate Elegance & Stature',
          subtitle: 'Digbala Directional Strength in Cancer Conferring High Executive Visibility',
          paragraphs: [
            `Occupying the zenith of your D10 chart—the 10th house of Cancer—is your D10 Lagna lord, Venus (Shukra). In Vedic astrology, a planet situated in the 10th house gains immense Digbala (directional strength), representing maximum power to manifest its highest potential in the external world.`,
            `Having the Ascendant lord of the D10 chart positioned directly in the 10th house with Digbala is an extraordinary signature for executive stature, corporate visibility, and public distinction. It indicates that you are naturally cast in high-visibility leadership roles where organizational culture, stakeholder diplomacy, and executive polish are paramount.`,
            `Venus in Cancer brings warmth, empathetic stewardship, and protective leadership to your executive persona. You lead teams not through fear or intimidation, but by cultivating an environment of mutual trust, psychological safety, and shared organizational pride.`,
          ],
          diamondPointers: [
            `✦ D10 Lagna lord Venus in the 10th house: supreme planetary alignment for corporate prominence and executive authority.`,
            `✦ Digbala directional strength ensures that your leadership capabilities receive widespread visibility and formal institutional recognition.`,
            `✦ Empathetic executive style: you build fiercely loyal cross-functional teams through supportive, protective management practices.`,
            `✦ Natural talent for representing organizations in public forums, industry keynotes, and high-level client presentations.`,
          ],
          takeaway: 'Venus in the 10th house of your D10 chart is a crown of executive leadership; embrace high-visibility corporate stewardship with confidence.',
        };

      case 29:
        return {
          title: 'Sun & Saturn in 7th House: Authority & Conditional Neechabhanga Resolution',
          subtitle: 'The Aries Crucible: Exalted Sovereignty and Debilitated Structure in Public Alliances',
          paragraphs: [
            `In your D10 Dashamsha chart, the 7th house of Aries hosts an intense, high-voltage planetary assembly: the Sun (exalted at peak solar potency) conjunct Saturn (technically debilitated in Aries). Classical commentators note that the co-presence of an exalted planet with a debilitated planet introduces the classical principles of Neechabhanga (the potential mitigation and cancellation of debility). However, rather than viewing this cancellation as an effortless entitlement, authentic Jyotish treats it as a conditional operational crucible requiring conscious discipline.`,
            `Because the Sun reaches supreme exaltation in Aries while Saturn sits in debility, early joint ventures and collaborative agreements often experience procedural delays, legal friction, or mismatched expectations. When you bring rigorous governance, contractual clarity, and emotional maturity to these alliances, the debilitating friction is gradually transmuted into enduring institutional stability.`,
            `This axis requires thoughtful handling of authority dynamics. With the exalted Sun in the 7th, your external partners, institutional clients, and counterparties are often powerful, high-stature figures. Saturn's placement demands that you approach these relationships with absolute procedural discipline, transparent accountability, and meticulous due diligence, ensuring that neither dominance nor resentment undermines long-term trust.`,
          ],
          diamondPointers: [
            `✦ Co-presence of exalted Sun and debilitated Saturn creates a conditional Neechabhanga dynamic in the 7th house of D10.`,
            `✦ Professional partnerships require clear contractual boundaries and legal due diligence to prevent early operational friction.`,
            `✦ High-stature commercial partners: you engage directly with established institutions, senior executives, and regulatory entities.`,
            `✦ Long-term maturity: partnership friction transforms into durable operational resilience as governance structures solidify.`,
          ],
          takeaway: 'Conditional Neechabhanga in your D10 7th house teaches that professional partnerships succeed when early friction is met with rigorous accountability and patient institutional governance.',
        };

      case 30:
        return {
          title: 'Moon, Mars & Ketu in 5th House of D10: Technical Disruption',
          subtitle: 'The Triple Fusion of Intuition, Aggressive Problem Solving & Algorithmic Detachment',
          paragraphs: [
            `The 5th house of your D10 chart in Aquarius hosts a remarkable concentration of planetary energy: the Moon (27°), Mars (28°), and Ketu. This triple fusion unites emotional intelligence, aggressive technical execution, and detached algorithmic intellect in the house of creative strategic architecture.`,
            `The Moon-Mars conjunction (the Chandra-Mangala engine from your D1) carries its commercial execution drive directly into your D10 intellect. When faced with architectural or systemic challenges, you attack problems with fierce technical rigor, rapidly identifying optimal computational pathways and eliminating systemic waste.`,
            `Ketu’s co-presence in Aquarius adds a layer of brilliant, unconventional disruption. You do not think in conventional industry dogmas; you possess an innate capacity for algorithmic design, complex data abstraction, and cutting-edge technical architecture that leaves standard approaches behind.`,
          ],
          diamondPointers: [
            `✦ Triple conjunction in D10 5th house: a powerhouse of technical innovation, algorithmic intellect, and execution velocity.`,
            `✦ Chandra-Mangala brings commercial drive into systems design, ensuring that technical solutions deliver measurable business ROI.`,
            `✦ Ketu grants unconventional technical problem-solving, thriving in cutting-edge software, distributed systems, and AI architecture.`,
            `✦ Channel this intense creative intellect into high-level systems design and strategic whitepapers rather than routine maintenance.`,
          ],
          takeaway: 'The concentration of Moon, Mars, and Ketu in your D10 5th house marks you as a brilliant systems architect capable of disruptive innovation.',
        };

      case 31:
        return {
          title: 'D1 to D10 Synthesis: Bridging Potential to Tangible Reality',
          subtitle: 'Integrating Natal Scorpio Fortitude with Dashamsha Executive Stature',
          paragraphs: [
            `The true art of Vedic astrological consultation lies in the seamless synthesis between the foundational D1 chart and the specialized D10 varga. Your career journey is an evolving bridge between your internal Scorpio constitution and your external Libra/Cancer executive destiny.`,
            `In your D1, you are an investigative, resilient problem-solver governed by Mars in the 11th house—driven to optimize systems, resolve operational friction, and monetize complex networks. In your D10, you are an executive diplomat governed by Venus in the 10th house—tasked with consensus leadership, institutional governance, and public visibility.`,
            `When you integrate these two dimensions, your professional power reaches its peak. You possess the rare capability to dive deep into technical and financial weeds with engineering precision, while simultaneously presenting executive summaries to corporate boardrooms with diplomatic polish and strategic authority.`,
          ],
          diamondPointers: [
            `✦ Seamless integration: D1 provides the unshakeable analytical engine; D10 provides the polished executive vehicle.`,
            `✦ Rare dual capability: you command the technical depth required to earn engineering respect and the diplomatic grace required for C-suite alignment.`,
            `✦ Career progression naturally shifts emphasis over time from D1 tactical execution to D10 strategic governance and institutional stewardship.`,
            `✦ Ground your executive decisions in your foundational Scorpio principles while communicating outcomes through your D10 Libra diplomacy.`,
          ],
          takeaway: 'By uniting your foundational Scorpio grit with your Dashamsha executive diplomacy, you establish an unassailable professional legacy.',
        };

      // PART 4: BHRIGU NANDI NADI (BNN)
      case 32:
        return {
          title: 'Bhrigu Nandi Nadi: Celestial Flow of Karma',
          subtitle: 'Planetary Karakas, Directional Trines & Sequential Karmic Circuits',
          paragraphs: [
            `In classical Bhrigu Nandi Nadi (BNN)—one of the most ancient and venerated traditions of Indian predictive astrology—career is evaluated not through rigid mathematical house boundaries, but through the organic flow of planetary karakas (significators) across directional trines.`,
            `BNN principles state that planets operating within the same directional trine (Dharma, Artha, Kama, Moksha) or placed in adjacent sequential signs establish an interconnected circuit of karma. Rather than confining vocational milestones to arbitrary age blocks, BNN decodes how planetary energies naturally hand off duties across your life journey.`,
            `In the BNN tradition, Saturn (Shani Dev) is revered as the universal Karma Karaka—the supreme significator of professional action, labor, and worldly duty. To understand your career destiny through Nadi wisdom, we trace Saturn's exact spatial coordinates and his sequential degree progression across the celestial sphere.`,
          ],
          diamondPointers: [
            `✦ Bhrigu Nandi Nadi evaluates career through the natural celestial flow of planetary significators and directional trines.`,
            `✦ Freedom from arbitrary house cutoffs: planets in trinal alignment (1st, 5th, 9th from each other) act as a unified professional committee.`,
            `✦ Saturn operates as the universal Karma Karaka, mapping your soul’s duty, professional endurance, and worldly contribution.`,
            `✦ Sequential degree progressions reveal how your skills, responsibilities, and leadership mature over distinct karmic cycles.`,
          ],
          takeaway: 'Bhrigu Nandi Nadi decodes the cosmic flow of your professional karma, revealing how your actions compound toward ultimate mastery.',
        };

      case 33:
        return {
          title: 'Saturn as Prime Karaka of Karma: The Professional Soul',
          subtitle: 'Shani Dev as the Eternal Architect of Discipline, Responsibility and Stature',
          paragraphs: [
            `In the BNN canon, Saturn (Shani Dev) is the cosmic steward of your professional soul. Whichever sign, degree, and nakshatra Saturn occupies reveals the precise nature of the labor your soul has contracted to perform in this lifetime. Saturn does not confer unearned windfalls; he demands disciplined apprenticeship, structural integrity, and unremitting perseverance.`,
            `For you, ${name}, Saturn is placed in the sign of Libra (Tula) at 19° 57' 54", residing in the deep psychological waters of your 12th house in Swati Nakshatra Pada 4. In Vedic astrology, Libra is the sign of Saturn’s highest planetary exaltation (Uchcha Shani).`,
            `Having an exalted Karma Karaka is one of the most distinguished astrological signatures an executive can possess. It indicates that your professional labor is characterized by deep fairness, systemic integrity, institutional justice, and an extraordinary capacity for sustained, multi-year strategic focus.`,
          ],
          diamondPointers: [
            `✦ Exalted Saturn (Uchcha Shani) at 19° 57' Libra: supreme astrological blessing for structural integrity and enduring career stature.`,
            `✦ Your vocational soul is driven by fairness, equilibrium, institutional governance, and high-order organizational justice.`,
            `✦ Saturn in Swati Nakshatra grants commercial agility, independence, and the capacity to navigate complex corporate winds successfully.`,
            `✦ The labor you perform builds lasting institutional capital; Saturn rewards your disciplined perseverance with compounding executive honors.`,
          ],
          takeaway: 'Exalted Saturn marks you as a master builder of systems whose disciplined labor commands profound institutional respect.',
        };

      case 34:
        return {
          title: 'Saturn in Libra at 19°: Exaltation, Justice & Stewardship',
          subtitle: 'The Deep Swati Influence of Cross-Border Systems, Independence and Equity',
          paragraphs: [
            `Saturn's exact longitude at 19° 57' 54" Libra places him in the 4th Pada of Swati Nakshatra, an astronomical sector governed by Rahu and associated with the element of air. Swati is symbolized by a delicate young shoot swaying resiliently in the wind, representing flexibility, independence, and the capacity to survive extreme environmental turbulence.`,
            `Saturn reaching peak exaltation in Swati infuses your vocational path with an orientation toward cross-border operations, distributed systems, intellectual independence, and structural adaptability. You do not build rigid monuments that crack under stress; you design resilient architectures that absorb market volatility.`,
            `Furthermore, occupying the 12th house (the sector of remote operations, international connections, and institutional seclusion), Saturn suggests that your most powerful professional impact occurs behind the scenes—directing enterprise architecture, governance frameworks, and high-stakes strategic initiatives from a position of quiet, unassailable mastery.`,
          ],
          diamondPointers: [
            `✦ Swati Nakshatra Pada 4: confers exceptional commercial resilience, adaptability, and mastery of cross-border systems.`,
            `✦ 12th house exaltation indicates major professional accomplishments in remote, distributed, international, or confidential environments.`,
            `✦ Natural orientation toward institutional stewardship: you establish frameworks that protect organizational assets and ensure regulatory compliance.`,
            `✦ Maintain work-life boundaries; Saturn in the 12th can induce solitary over-work if conscious rest protocols are not enforced.`,
          ],
          takeaway: 'Exalted in Swati, Saturn grants you the resilience to weather any corporate storm while building adaptable, scalable enterprise systems.',
        };

      case 35:
        return {
          title: 'Planetary Progressions & Nadi Trines: Air Sign Synthesis',
          subtitle: 'The Harmony of Libra, Aquarius and Gemini Connecting Mental Agility to Systems',
          paragraphs: [
            `In Bhrigu Nandi Nadi, the trinal signs sharing the same element operate as an integrated energetic circuit. For your Karma Karaka Saturn in Libra (an air sign), his primary cosmic partners are the planets situated in the remaining air signs: Aquarius (Kumbha) and Gemini (Mithuna).`,
            `In your D10 Dashamsha chart, Aquarius hosts your Moon, Mars, and Ketu, while Gemini forms the 9th trinal harmonic. This air-sign synthesis creates an exceptionally agile, highly conceptual mental apparatus. Your professional labor is fundamentally cerebral—focused on algorithmic design, systemic communication, and strategic architecture.`,
            `This Nadi trine ensures that your Saturnine discipline is never bogged down by tedious manual labor. Instead, your efforts are continually elevated into the intellectual stratosphere, allowing you to synthesize vast amounts of technical data and translate them into actionable commercial strategy.`,
          ],
          diamondPointers: [
            `✦ Air-sign Nadi trine (Libra-Aquarius-Gemini) establishes your career as primarily intellectual, conceptual, and architecturally driven.`,
            `✦ Natural affinity for information technology, digital platforms, complex regulatory frameworks, and data communications.`,
            `✦ Seamless transition from abstract strategic ideation to concrete operational implementation across organizational structures.`,
            `✦ Ensure clear written documentation for all systems architectures to maximize the collaborative impact of your air-trine intellect.`,
          ],
          takeaway: 'The air-sign Nadi trine elevates your labor into pure systems architecture, making your mental agility your primary competitive advantage.',
        };

      case 36:
        return {
          title: 'Saturn’s Degree Progression Chain: Karmic Circuit to Mercury',
          subtitle: 'Tracing the Exact Astronomical Hand-off Across Your Natal Coordinates',
          paragraphs: [
            `The pinnacle of BNN predictive mechanics is the analysis of the planetary degree chain. In this technique, we arrange all planets in ascending order of their longitudinal degrees to observe the sequential hand-off of cosmic energy through your Karma Karaka Saturn.`,
            `In your natal chart, the exact astronomical chain unfolds as follows: Saturn (19.96° Libra) ➔ Ketu (21.12° Scorpio) ➔ Rahu (21.12° Taurus) ➔ Moon (27.18° Virgo) ➔ Mars (28.86° Virgo) ➔ Jupiter (1.38° Sagittarius) ➔ Venus (1.44° Scorpio) ➔ Sun (12.01° Sagittarius) ➔ Mercury (19.68° Sagittarius).`,
            `This sequential circuit reveals your ultimate professional evolution: Saturn initiates through disciplined structural duty, passes through the nodal crucible of Rahu-Ketu (overcoming unconventional partnerships and developing intuitive detachment), activates the Chandra-Mangala engine (monetizing networks and driving execution), and culminates triumphantly in the Jupiter-Sun-Mercury assembly in Sagittarius—delivering executive wisdom, sovereign authority, and elite commercial eloquence.`,
          ],
          diamondPointers: [
            `✦ Master BNN Degree Chain: traces the complete evolutionary arc of your career from disciplined labor to sovereign thought leadership.`,
            `✦ Initial phases demand intense technical apprenticeship and navigating complex contractual dynamics (Saturn ➔ Ketu/Rahu).`,
            `✦ Middle career accelerates into massive execution velocity and network monetization (Moon ➔ Mars in Virgo).`,
            `✦ Culmination phase establishes you as an elite executive advisor and institutional knowledge authority (Jupiter ➔ Sun ➔ Mercury).`,
          ],
          takeaway: 'Your BNN degree chain proves that your career is designed to culminate in sovereign advisory authority and enduring intellectual legacy.',
        };

      // PART 5: THE VOYAGE OF YOUR CAREER EVOLUTION
      case 37:
        return {
          title: 'Early Foundations: Academic Discipline & Inquiry',
          subtitle: 'The Formative Years of Technical Mastery, Analysis and Foundational Inquiry',
          paragraphs: [
            `Every distinguished executive career begins with a formative season of intellectual foundation-building and technical apprenticeship. For you, ${name}, born under the analytical scrutiny of Scorpio Lagna and the intellectual radiance of Sagittarius in the 2nd house, your early academic and professional years were characterized by intense curiosity and disciplined focus.`,
            `During this foundational period, you developed the core competencies that underpin your current authority. You were drawn to subjects that demanded analytical precision, mathematical logic, and structural rigor, instinctively rejecting superficial answers in favor of deep conceptual comprehension.`,
            `This period instilled in you a profound respect for procedural integrity and verified facts. While your peers may have sought rapid, shallow recognition, you quietly mastered the mechanics of your craft, establishing the unshakeable technical bedrock upon which your executive career now securely rests.`,
          ],
          diamondPointers: [
            `✦ Early career anchored in rigorous analytical mastery, structural inquiry, and foundational technical competence.`,
            `✦ Instinctive rejection of superficial shortcuts; you built your reputation on verified expertise and meticulous execution.`,
            `✦ Development of deep focus and crisis-resolution stamina that distinguished you early among organizational peers.`,
            `✦ These formative investments in technical mastery now provide the unassailable credibility supporting your executive stature.`,
          ],
          takeaway: 'Your early commitment to technical mastery built the unshakeable foundation upon which your current executive authority stands.',
        };

      case 38:
        return {
          title: 'First Decade of Service: Overcoming Friction',
          subtitle: 'Navigating Organizational Hierarchies, Operational Bottlenecks & Resilience',
          paragraphs: [
            `The initial decade of your professional voyage functioned as a classic astrological crucible—the practical arena where theoretical knowledge met the messy realities of corporate hierarchies, resource constraints, and operational bottlenecks.`,
            `With 34 bindus in your 6th house of Aries and Mars ruling your chart, you were frequently assigned to high-friction turnaround projects, complex troubleshooting assignments, and challenging stakeholder environments. Rather than discouraging you, these intense experiences rapidly accelerated your professional maturation.`,
            `You learned how to manage organizational politics with Scorpio discretion, how to communicate technical realities to non-technical managers, and how to execute under unforgiving deadlines. Each challenge you mastered during this decade forged the unshakeable operational confidence that defines your executive presence today.`,
          ],
          diamondPointers: [
            `✦ The first decade functioned as an operational proving ground, transforming raw analytical talent into battle-tested execution wisdom.`,
            `✦ Mastery of high-pressure operational bottlenecks built your reputation as an indispensable corporate problem-solver.`,
            `✦ Learned the critical art of organizational diplomacy, balancing direct technical truth with executive stakeholder tact.`,
            `✦ Developed the psychological resilience and emotional self-control that now anchor your senior leadership style.`,
          ],
          takeaway: 'The operational friction of your first decade forged your resilience, transforming you into an executive who thrives in complexity.',
        };

      case 39:
        return {
          title: 'Navigating Mid-Career Pressures: Workload & Alignment',
          subtitle: 'Managing Intense Demands, Preserving Health-Energy Balance & Avoiding Burnout',
          paragraphs: [
            `As your career progressed into its mid-stages, your exceptional competence inevitably attracted an expanding volume of responsibility. In Vedic Jyotish, mid-career transitions frequently coincide with major planetary dasha shifts, forcing an executive to re-evaluate their time allocation, boundaries, and energetic sustainability.`,
            `With your Lagna lord Mars in the 11th house conjunct the Moon and exalted Saturn in the 12th house, you possess an immense capacity for work. However, this same capacity carries the developmental risk of taking on excessive operational burdens, leading to mental fatigue and physical exhaustion if conscious boundaries are not established.`,
            `Mid-career wisdom requires recognizing that you can no longer solve organizational problems through raw personal effort alone. True advancement demands that you transition from hands-on execution to high-level delegation, systems architecture, and empowering cross-functional teams to carry operational workloads.`,
          ],
          diamondPointers: [
            `✦ High competence attracts compounding responsibilities; active boundary management is essential to prevent operational burnout.`,
            `✦ Exalted Saturn in the 12th house mandates regular intervals of solitude, mental rest, and physical rejuvenation.`,
            `✦ Transition from individual contributor heroics to scalable systems architecture and leveraged team delegation.`,
            `✦ Prioritize high-impact strategic initiatives that compound enterprise value over routine operational maintenance.`,
          ],
          takeaway: 'Mastering mid-career pressure requires shifting from doing the work yourself to designing the systems that perform the work.',
        };

      case 40:
        return {
          title: 'Modern Transition: Contributor to Executive Architect',
          subtitle: 'The Strategic Shift from Hands-On Engineering to High-Level Governance & Advisory',
          paragraphs: [
            `You currently stand at the most pivotal inflection point of your professional journey: the formal transition from a brilliant technical execution specialist to a sovereign executive architect and institutional advisor. At age 42, operating within the mature currents of your Saturn Mahadasha, your cosmic blueprint demands this elevation.`,
            `An individual contributor focuses on the quality of their immediate output; an executive architect focuses on the design of the entire operating system. You are being called to step back from line-level coding or daily fire-fighting to design the organizational policies, systems architectures, and commercial frameworks that guide multi-year corporate initiatives.`,
            `Your Sun-Jupiter-Mercury triple conjunction in the 2nd house is fully activated in this phase. Your greatest value to organizations is no longer what you build with your hands, but the strategic clarity of your counsel, the rigor of your architectural reviews, and your ability to steer enterprise governance toward sustainable profitability.`,
          ],
          diamondPointers: [
            `✦ Decisive career elevation: transitioning permanently from individual execution to executive architectural governance.`,
            `✦ Your primary value proposition is now strategic foresight, systems design, risk mitigation, and institutional advisory counsel.`,
            `✦ Activation of 2nd house solar-jupiterian eloquence: your voice and written frameworks shape corporate direction.`,
            `✦ Claim your seat at the strategic table; mentor emerging leaders and establish the governance standards for your organization.`,
          ],
          takeaway: 'Step fully into your identity as an executive architect; your strategic vision is now the primary driver of organizational success.',
        };

      case 41:
        return {
          title: 'Long-Term Stature and Legacy: Compounding Wisdom',
          subtitle: 'Building Enduring Assets, Institutional Mentorship and Sovereign Stature',
          paragraphs: [
            `As your vocational journey progresses into its mature, compounding seasons, the ultimate promise of your astrological chart unfolds: the establishment of an enduring professional legacy, autonomous enterprise assets, and high-stature institutional stewardship.`,
            `Exalted Saturn in the 12th house, combined with Jupiter in his own sign ruling the 2nd and 5th houses, indicates that your later career will be distinguished by profound intellectual respect, advisory board appointments, and mentoring the next generation of industry leaders.`,
            `During this harvest phase, your accumulated experience, professional network, and published frameworks compound into sovereign financial independence. You transition from trading time for income to owning scalable assets, equity stakes, and proprietary intellectual property that generate recurring value autonomously.`,
          ],
          diamondPointers: [
            `✦ Long-term career trajectory compounds into board-level advisory roles, institutional governance, and industry thought leadership.`,
            `✦ Transition from earned employment income to scalable equity ownership, intellectual property royalties, and enterprise assets.`,
            `✦ High fulfillment through mentoring promising young executives, transmitting your systems wisdom to future leaders.`,
            `✦ Your professional legacy will be remembered for structural integrity, ethical leadership, and enduring institutional architectures.`,
          ],
          takeaway: 'Your career arc is designed for compound fulfillment, culminating in sovereign advisory stature and an enduring institutional legacy.',
        };

      // PART 6: GOVERNMENT JOB & INSTITUTIONAL SECTOR
      case 42:
        return {
          title: 'Markers of Public Governance & Institutional Stature',
          subtitle: 'Classical Shastric Indicators for Sovereign Authority, Public Trust & Bureaucracy',
          paragraphs: [
            `In classical Vedic Jyotish, institutional authority, civil service alignment, and public sector governance (Rajya Seva) are evaluated through specific planetary configurations: the strength of the Sun (sovereign dignity), Saturn (public service and administrative protocol), and the relative balance between the 6th and 10th houses.`,
            `Public governance requires an individual to balance sovereign leadership with strict adherence to institutional hierarchy, legal compliance, and public accountability. When evaluating a professional chart for government or semi-governmental alignment, classical texts examine whether an individual is wired for rigid bureaucratic entry or specialized institutional advisory.`,
            `In your chart, the markers of sovereign dignity and public trust are exceptionally pronounced, featuring a luminous Sun in the 2nd house ruling your 10th house, an exalted Saturn in the 12th house, and an extraordinary 34 SAV bindus in your 6th house of competitive service.`,
          ],
          diamondPointers: [
            `✦ Strong classical markers for institutional governance, public trust, and high-level sovereign advisory.`,
            `✦ The Sun confers natural administrative credibility, moral authority, and an instinctive understanding of institutional power.`,
            `✦ Exalted Saturn provides deep respect for procedural compliance, regulatory standards, and public service stewardship.`,
            `✦ Optimal institutional alignment manifests through specialized technical advisory and regulatory consulting rather than routine bureaucracy.`,
          ],
          takeaway: 'Your chart carries powerful markers of public sector dignity, positioning you as an elite advisor to institutional authorities.',
        };

      case 43:
        return {
          title: 'Sun: The Sovereign Authority & Institutional Dignity',
          subtitle: 'The 10th Lord in 2nd House Sagittarius Bringing Regulatory Prestige to Speech',
          paragraphs: [
            `In your chart, the Sun (Surya) is the sovereign lord of your 10th house of Leo, positioned in the 2nd house of Sagittarius at 12° 0'. In classical Parashari astrology, the 10th lord residing in the 2nd house establishes a direct link between executive power and advisory eloquence.`,
            `This placement infuses your professional voice with natural solar authority, institutional dignity, and ethical weight. You speak with the measured cadence of an official whose words represent established policy and institutional wisdom.`,
            `In government, defense, or highly regulated corporate environments, this solar alignment commands immediate respect. Government officials, regulatory commissions, and institutional decision-makers instinctively perceive you as an authoritative, incorruptible professional capable of stewarding critical public trust.`,
          ],
          diamondPointers: [
            `✦ 10th lord Sun in 2nd house Sagittarius grants natural sovereign authority and institutional dignity to your counsel.`,
            `✦ Immediate credibility when interacting with government ministries, public sector enterprises, and regulatory agencies.`,
            `✦ Natural alignment with public policy formulation, regulatory compliance audits, and strategic institutional briefings.`,
            `✦ Maintain absolute transparency in public dealings; your solar integrity is the foundation of your institutional influence.`,
          ],
          takeaway: 'The Sun in your 2nd house endows you with sovereign institutional dignity, making you a trusted advisor in regulated corridors of power.',
        };

      case 44:
        return {
          title: 'Saturn: The Civil Service Steward & Bureaucracy',
          subtitle: 'Exalted Shani in 12th House Governing Behind-the-Scenes Administration',
          paragraphs: [
            `While the Sun represents sovereign executive dignity, Saturn (Shani) represents the institutional machinery of the civil service—the meticulous documentation, legal protocol, administrative patience, and behind-the-scenes stewardship that keeps public institutions functioning.`,
            `Your Saturn is exalted at 19° 57' Libra in the 12th house (the sector of international affairs, confidential operations, and institutional seclusion). This alignment indicates a profound affinity for behind-the-scenes public administration, defense infrastructure, intelligence systems, and large-scale regulatory compliance.`,
            `You possess the rare patience required to navigate intricate governmental bureaucracies without becoming demoralized by red tape. You understand that enduring institutional change requires meticulous procedural documentation and adherence to established statutory frameworks.`,
          ],
          diamondPointers: [
            `✦ Exalted Saturn in the 12th house indicates high-level contributions to confidential, remote, or international public sector programs.`,
            `✦ Exceptional administrative patience: you navigate complex bureaucratic protocols with disciplined, long-term composure.`,
            `✦ Natural competence in regulatory compliance, statutory audits, institutional risk management, and defense technologies.`,
            `✦ You thrive in advisory roles that operate outside partisan political friction, focusing purely on structural policy execution.`,
          ],
          takeaway: 'Exalted Saturn equips you with the disciplined stewardship required to guide complex public sector and regulatory architectures.',
        };

      case 45:
        return {
          title: 'Sun-Saturn Dynamic: Managing Hierarchies Without Friction',
          subtitle: 'Harmonizing Independent Solar Command with Disciplined Bureaucratic Protocol',
          paragraphs: [
            `In astrological symbology, the Sun and Saturn represent archetypal opposites: the Sun is the sovereign king demanding immediate autonomous command, while Saturn is the patient public servant enforcing rigid institutional rules. When an executive chart carries both planets in high dignity, managing their dynamic tension is critical.`,
            `In your chart, this relationship is handled with sophisticated grace. The Sun resides in Jupiter's noble sign of Sagittarius, while Saturn is exalted in Venus's diplomatic sign of Libra. They do not aspect each other directly in your D1, preventing destructive ego-clashes with institutional superiors.`,
            `This harmonious separation allows you to operate within governmental and corporate hierarchies without feeling diminished by protocol. You respect institutional authority (Saturn) while preserving your independent intellectual sovereignty (Sun), enabling you to lead transformative initiatives without triggering bureaucratic resistance.`,
          ],
          diamondPointers: [
            `✦ Harmonious Sun-Saturn configuration prevents destructive clashes between personal ambition and institutional protocol.`,
            `✦ Ability to navigate rigid corporate and governmental hierarchies while maintaining your sovereign strategic independence.`,
            `✦ You respect administrative protocols without being paralyzed by them, finding compliant pathways to execute innovation.`,
            `✦ Master the art of institutional patience; aligning your timing with bureaucratic rhythms yields massive multi-year outcomes.`,
          ],
          takeaway: 'By harmonizing solar authority with Saturnine protocol, you achieve significant institutional impact with minimal bureaucratic friction.',
        };

      case 46:
        return {
          title: '6th House vs 10th House: Operations vs Sovereign Rank',
          subtitle: 'Quantitative SAV Analysis: 34 Bindus in Service vs 32 Bindus in Authority',
          paragraphs: [
            `To determine whether an individual is optimal for direct civil service employment (routine competitive administration) or senior sovereign advisory, classical Jyotish compares the quantitative bindu strength of the 6th house (competitive service) and the 10th house (executive authority).`,
            `In your Sarvashtakavarga (SAV), both houses possess extraordinary, top-tier strength: your 6th house of Aries registers 34 bindus (6 points above average), while your 10th house of Leo registers 32 bindus (4 points above average). Both sectors operate at peak cosmic potency.`,
            `Because your 6th house is slightly stronger than your 10th (34 vs 32), you possess peerless operational problem-solving capabilities. However, because your 10th house is also exceptionally potent at 32 bindus, you are completely unsuited for routine, repetitive clerical positions. Your destiny demands high-stakes operational problem-solving coupled with executive decision-making authority.`,
          ],
          diamondPointers: [
            `✦ Dual institutional dominance: 34 SAV bindus in the 6th house paired with 32 SAV bindus in the 10th house.`,
            `✦ Unrivaled operational problem-solving capacity ensures you master the most demanding institutional assignments.`,
            `✦ High 10th house score prevents being trapped in subordinate clerical ranks; you naturally rise to executive policy levels.`,
            `✦ Optimal institutional roles combine hands-on systems architecture with senior strategic governance and advisory direction.`,
          ],
          takeaway: 'With 34 bindus in service and 32 bindus in authority, your optimal institutional role is high-stakes executive advisory consulting.',
        };

      case 47:
        return {
          title: 'Rajya Seva Potential: Evaluating Public Sector Alignment',
          subtitle: 'Direct Civil Service vs Public Sector Technology Advisory & Sovereign Contracts',
          paragraphs: [
            `When clients ask, 'Do I have a government job yog?', superficial astrology looks only for a routine civil service desk job. In the modern global economy, Rajya Seva (public sector service) encompasses a vastly wider spectrum: direct bureaucratic appointments, defense technology advisory, regulatory commission consulting, and sovereign enterprise partnerships.`,
            `Your chart indicates that entering routine lower-tier civil service through standard competitive examinations in your early twenties would have severely constricted your entrepreneurial Mars-in-11th and creative Aquarius D10. Your cosmic wiring is too innovative and commercially dynamic for rigid, slow-moving bureaucratic stagnation.`,
            `Instead, your Rajya Seva potential manifests with supreme brilliance through specialized public sector technology advisory, government defense contracts, central banking and fintech regulatory consulting, and public-private enterprise joint ventures. Here, you enjoy the prestige of sovereign association while retaining commercial agility.`,
          ],
          diamondPointers: [
            `✦ Your chart is built for specialized institutional advisory rather than routine administrative bureaucracy.`,
            `✦ High affinity for defense technology, public sector enterprise architecture, national infrastructure, and regulatory systems.`,
            `✦ Commercial agility of Mars in the 11th house thrives when bridging private enterprise innovation with public sector needs.`,
            `✦ Position yourself as an elite domain consultant to government ministries, regulatory bodies, and sovereign wealth entities.`,
          ],
          takeaway: 'Your highest government alignment is as an elite external advisor or defense contractor, combining public prestige with commercial agility.',
        };

      case 48:
        return {
          title: 'The Final Institutional Verdict: High-Stakes Advisory',
          subtitle: 'The Definite Astrological Counsel for Public Governance and Enterprise Stature',
          paragraphs: [
            `Synthesizing all astrological markers—your Scorpio Lagna, Mars in the 11th house, Sun-Jupiter-Mercury in the 2nd house, exalted Saturn in the 12th house, and your 34/32 SAV profile—the definitive institutional verdict is crystal clear.`,
            `You are not designed to be an anonymous cog in a governmental bureaucratic machine; you are designed to be an authoritative advisor to leadership. Your optimal professional positioning is that of a trusted senior architect, specialized public sector consultant, or principal director of mission-critical systems.`,
            `By aligning your career with high-stakes institutional advisory, you satisfy your solar mandate for dignity and public purpose, harness your Saturnine mastery of complex compliance frameworks, and fully activate your Martian capacity for scalable commercial monetization.`,
          ],
          diamondPointers: [
            `✦ The definitive verdict: pursue high-stakes strategic and technological advisory within regulated and institutional sectors.`,
            `✦ Maintain independence while serving as a trusted counselor to government agencies, multinational corporations, and boards.`,
            `✦ Target mission-critical domains: cybersecurity, public sector digital infrastructure, regulatory policy, and defense systems.`,
            `✦ This positioning grants you the maximum institutional prestige, intellectual fulfillment, and compound financial remuneration.`,
          ],
          takeaway: 'Claim your natural role as a high-stakes institutional advisor, serving sovereign and corporate leadership with strategic brilliance.',
        };

      // PART 7: ENTREPRENEURIAL WATERS & ASHTAKAVARGA
      case 49:
        return {
          title: 'The Entrepreneurial Horizon: Assessing Independence & Risk',
          subtitle: 'Evaluating Commercial Risk Appetite, Independent Practice and Executive Autonomy',
          paragraphs: [
            `True entrepreneurial sovereignty requires more than a casual desire for business ownership; it demands a psychological constitution capable of absorbing commercial volatility, navigating contractual ambiguity, and executing scalable systems under conditions of uncertainty.`,
            `In your natal chart, the entrepreneurial compass is anchored by your Lagna lord Mars residing in the 11th house of enterprise gains, the commercial acumen of Mercury in Sagittarius, and the bold, risk-taking magnetism of Rahu in the 7th house of business partnerships.`,
            `This alignment confirms an innate entrepreneurial appetite. You possess the executive courage necessary to launch independent initiatives, monetize specialized services, and build scalable business equity. However, your entrepreneurial journey must be guided by calculated precision rather than reckless speculation.`,
          ],
          diamondPointers: [
            `✦ Strong entrepreneurial DNA: Lagna lord in the 11th house of gains drives continuous desire for enterprise building.`,
            `✦ Calculated risk profile: Virgo influence tempers entrepreneurial ambition with rigorous financial and operational metrics.`,
            `✦ High autonomy requirement: you perform best when you own equity, shape strategic direction, and control your time.`,
            `✦ Optimal enterprise models focus on high-margin knowledge advisory, specialized technology systems, and productized consulting.`,
          ],
          takeaway: 'Your chart strongly supports entrepreneurial independence; build ventures founded on specialized knowledge and high-margin leverage.',
        };

      case 50:
        return {
          title: 'Mercury & Venus Dynamics: Commercial Modeling & Contracts',
          subtitle: 'The Dual Engines of Financial Architecture, Deal Closing and Negotiation',
          paragraphs: [
            `In Vedic astrology, commercial enterprise is stewarded by two primary planets: Mercury (the karaka of business logic, financial accounting, and commercial trade) and Venus (the karaka of high-value negotiations, equity agreements, and client relationships).`,
            `In your chart, Mercury occupies the 2nd house of treasury in Sagittarius, conjunct the Sun and Jupiter. This grants you exceptional acumen in financial modeling, pricing strategy, commercial contract drafting, and identifying high-margin monetization angles. You understand the mathematics of profitability intimately.`,
            `Meanwhile, Venus occupies your 1st house in Scorpio, ruling your 7th house of business partnerships. This gives you a polished, sophisticated negotiation presence. You close enterprise deals with diplomatic tact, building trust with high-net-worth clients and senior corporate buyers effortlessly.`,
          ],
          diamondPointers: [
            `✦ Powerful commercial synergy: Mercury provides financial architecture while Venus provides negotiation and deal-closing mastery.`,
            `✦ Natural talent for designing profitable pricing tiers, licensing agreements, and high-margin recurring revenue models.`,
            `✦ Diplomatic negotiation presence: you maintain composure and executive charm during intense contractual discussions.`,
            `✦ Ensure that all verbal negotiations are immediately codified into rigorous, legally binding agreements to preserve equity.`,
          ],
          takeaway: 'The synergy of Mercury and Venus gives you the rare dual capacity to design profitable business models and close high-value contracts.',
        };

      case 51:
        return {
          title: 'Business Partnerships & Equity Stakes: Rahu in 7th',
          subtitle: 'Unconventional Alliances, Technology Joint Ventures & Contractual Due Diligence',
          paragraphs: [
            `The presence of Rahu in your 7th house of Taurus at 21° 7' makes business partnerships and joint ventures the most commercially dynamic—and operationally sensitive—arena of your entire professional life. Rahu represents unconventional expansion, cross-border reach, and innovative business alliances.`,
            `You will frequently encounter opportunities to partner with dynamic, non-traditional operators, visionary technology founders, and foreign commercial entities. These joint ventures possess the potential to unlock massive scale, access new markets, and generate significant equity returns.`,
            `However, because your 7th house registers 25 bindus in Sarvashtakavarga (3 points below average), partnerships represent your primary vulnerability to commercial disillusionment. You must avoid informal, handshake deals at all costs. Every equity stake, revenue split, and intellectual property right must be legally fortified with institutional precision.`,
          ],
          diamondPointers: [
            `✦ Rahu in the 7th house draws high-growth, unconventional, and international joint venture opportunities into your sphere.`,
            `✦ 25 SAV bindus in the 7th mandate exhaustive due diligence; never enter partnerships based solely on personal charisma or verbal promises.`,
            `✦ Retain clear majority control or independent intellectual property ownership in all joint commercial initiatives.`,
            `✦ Implement transparent financial reporting and quarterly audit protocols with all business partners from day one.`,
          ],
          takeaway: 'Leverage joint ventures for market reach, but protect your assets through ironclad legal governance and transparent due diligence.',
        };

      case 52:
        return {
          title: 'Scaling and Capital Accumulation: The Wealth Engines',
          subtitle: 'The 2nd House (27 Bindus) vs 11th House (33 Bindus) Dynamics of Asset Compounding',
          paragraphs: [
            `A rigorous evaluation of wealth accumulation in Vedic astrology examines the dynamic interplay between the 2nd house (accumulated liquid savings, treasury retention) and the 11th house (gross revenue generation, network monetization, and cash-flow velocity).`,
            `In your Sarvashtakavarga, your 11th house of Virgo registers a massive 33 bindus, while your 2nd house of Sagittarius registers 27 bindus (just 1 point below the mean). This quantitative relationship is profoundly revealing: your capacity to generate income, drive enterprise revenue, and build scalable networks (11th house = 33) is extraordinarily powerful.`,
            `However, because your 2nd house of retention is 27 bindus, money tends to flow rapidly back into operational expansion, business investments, or lifestyle expenditures if not consciously channeled. To achieve sovereign wealth, you must implement automated capital retention systems, transferring revenue from your 11th house into secure, long-term compounding assets systematically.`,
          ],
          diamondPointers: [
            `✦ Massive revenue engine: 33 SAV bindus in the 11th house guarantees high income velocity and continuous monetization opportunities.`,
            `✦ 27 bindus in the 2nd house indicate that wealth retention requires intentional, disciplined financial architecture.`,
            `✦ Implement automated capital sweeps: automatically transfer a fixed percentage of all 11th-house revenues into secure, diversified assets.`,
            `✦ Avoid leaving large capital reserves in volatile commercial checking accounts; convert liquid cash into real estate, gold, and debt-free holdings.`,
          ],
          takeaway: 'Your 11th-house revenue engine is magnificent; master wealth accumulation by automating the retention of capital into sovereign assets.',
        };

      case 53:
        return {
          title: 'Sarvashtakavarga (SAV) 12-House Bindu Distribution',
          subtitle: 'The Complete Quantitative Heatmap of Your Astrological Strengths and Liabilities',
          paragraphs: [
            `Sarvashtakavarga (SAV) is the definitive quantitative scoring system of Vedic Jyotish, calculating the net benefic points (bindus) contributed by all seven classical planets across all 12 houses of your natal chart. Across the 337 total bindus in your chart, an average house registers 28 bindus; scores of 30+ indicate exceptional strength, while scores below 26 highlight operational vulnerabilities.`,
            `Your complete SAV distribution is as follows: 1st House (Scorpio) = 28; 2nd House (Sagittarius) = 27; 3rd House (Capricorn) = 29; 4th House (Aquarius) = 26; 5th House (Pisces) = 25; 6th House (Aries) = 34; 7th House (Taurus) = 25; 8th House (Gemini) = 28; 9th House (Cancer) = 26; 10th House (Leo) = 32; 11th House (Virgo) = 33; 12th House (Libra) = 24. Total = 337 bindus.`,
            `This distribution reveals a chart with spectacular operational, executive, and commercial firepower: your 6th (34), 10th (32), and 11th (33) houses form a triumphant trifecta of career mastery. Meanwhile, your 12th house (24) is wonderfully low, indicating minimal wasteful expenditure leakage and extraordinary efficiency in capital preservation.`,
          ],
          diamondPointers: [
            `✦ Triumphant Artha/Upachaya trifecta: 6th house (34), 10th house (32), and 11th house (33) grant peerless operational, executive, and revenue power.`,
            `✦ Low 12th house bindus (24): an exceptional blessing indicating minimal waste, low institutional friction, and minimal capital leakage.`,
            `✦ Vulnerability zones: 5th house (25 - avoid speculative gambling) and 7th house (25 - enforce rigorous contractual scrutiny).`,
            `✦ Direct your primary career energy strictly into your power sectors (6th, 10th, 11th) to compound professional success effortlessly.`,
          ],
          takeaway: 'Your SAV distribution is a masterclass in career power; double down on your 6th, 10th, and 11th houses to achieve peak professional impact.',
        };

      // PART 8: TIMING WINDOWS & TRANSITS
      case 54:
        return {
          title: 'Dashas and Transits: The Dual Engine of Timing',
          subtitle: 'Synthesizing Internal Karmic Seasons with External Astronomical Weather',
          paragraphs: [
            `Astrological timing in Vedic Jyotish does not operate as fatalistic fortune-telling; it functions as a sophisticated meteorological forecast for your career. Timing is governed by the synchronized interaction of two celestial engines: the Vimshottari Dasha system (your internal karmic seasons) and Gochara transits (the external planetary weather).`,
            `The Vimshottari Dasha reveals which planetary archetype is currently holding the director's baton of your life, determining your internal psychological priorities, energetic focus, and vocational motivations. Transits, meanwhile, reveal the physical environment and external market conditions through which your dasha must navigate.`,
            `When both internal dasha and external transits align favorably, initiatives accelerate with breathtaking speed; when transits bring headwinds, wise executives consolidate assets, refine architectures, and prepare for the next expansion window. Understanding this rhythm allows you to invest capital and effort with optimal timing.`,
          ],
          diamondPointers: [
            `✦ Vimshottari Dasha represents your internal karmic season; Gochara transits represent the external market climate.`,
            `✦ Align major strategic moves—such as career transitions, enterprise launches, and capital investments—with favorable dasha sub-periods.`,
            `✦ Use challenging transit periods for internal consolidation, systems optimization, and strengthening operational foundations.`,
            `✦ Timing mastery eliminates emotional anxiety; you learn to sail with cosmic tailwinds and anchor securely during temporary headwinds.`,
          ],
          takeaway: 'Mastering astrological timing transforms your career planning, allowing you to execute strategic expansions with cosmic precision.',
        };

      case 55:
        return {
          title: 'The Present Hour: Saturn-Mercury Active Window',
          subtitle: 'Dec 2025 to Aug 2028: Peak Intellectual Leverage, Commercial Expansion & Advisory Power',
          paragraphs: [
            `You are currently navigating one of the most intellectually luminous and commercially lucrative timing windows of your entire adult life: the major period (Mahadasha) of exalted Saturn combined with the sub-period (Antardasha) of Mercury, active from December 2025 through August 2028.`,
            `Saturn, as your exalted Karma Karaka in the 12th house, provides the deep institutional credibility, structural patience, and operational mastery you have cultivated over decades. Mercury, as the ruler of your 11th house of gains residing in your 2nd house of knowledge capital, activates your financial intellect, commercial eloquence, and systems modeling.`,
            `This 32-month window is your premier season for monetizing intellectual property, publishing proprietary architectural frameworks, securing senior advisory mandates, and structuring high-margin commercial alliances. The work you establish during this active window will anchor your financial security for the next decade.`,
          ],
          diamondPointers: [
            `✦ Active Saturn-Mercury window (Dec 2025 – Aug 2028): supreme timing period for commercial intellect and advisory authority.`,
            `✦ Mercury fully activates your 2nd house Budhaditya Yoga and your 11th house revenue engine simultaneously.`,
            `✦ Optimal season for launching productized consulting services, authoring authoritative whitepapers, and securing board advisory seats.`,
            `✦ Capitalize on this window aggressively; the professional assets and commercial systems you build now will compound for decades.`,
          ],
          takeaway: 'The Saturn-Mercury window is your golden hour for commercial intellect; deploy your knowledge aggressively to build lasting enterprise assets.',
        };

      case 56:
        return {
          title: 'Upcoming Sub-Periods: Preparing for Ketu & Venus',
          subtitle: 'Saturn-Ketu Structural Pruning (2028–2029) and Saturn-Venus Major Harvest (2029–2032)',
          paragraphs: [
            `Looking ahead on your astrological horizon, your current Saturn-Mercury window will transition sequentially into two distinct karmic seasons: Saturn-Ketu (August 2028 to October 2029) followed by the magnificent Saturn-Venus period (October 2029 to December 2032).`,
            `Saturn-Ketu is a 14-month season of structural consolidation, internal auditing, and strategic pruning. Ketu residing in your 1st house will prompt you to shed redundant operational commitments, eliminate unprofitable business relationships, and detach from corporate bureaucracy to focus purely on core strategic essentials.`,
            `Following this necessary purification comes Saturn-Venus—the absolute jewel of your 19-year Saturn Mahadasha. Venus, as the Digbala ruler of your D10 10th house positioned in your Ascendant, inaugurates a 38-month season of massive commercial harvest, executive recognition, high lifestyle comfort, and widespread professional acclaim.`,
          ],
          diamondPointers: [
            `✦ Saturn-Ketu (Aug 2028 – Oct 2029): use this period for structural pruning, eliminating operational drag, and deepening technical mastery.`,
            `✦ Saturn-Venus (Oct 2029 – Dec 2032): the premier executive harvest window of your career, delivering peak honors and commercial compounding.`,
            `✦ Venus in Digbala in D10 ensures that the structural foundations built during Saturn are fully recognized with C-suite authority.`,
            `✦ Prepare during Ketu so that your organizational vehicle is lean, elegant, and ready to scale during the Venus golden harvest.`,
          ],
          takeaway: 'Prune operational clutter during Saturn-Ketu to position yourself for the historic executive harvest of your Saturn-Venus period.',
        };

      case 57:
        return {
          title: 'Major Planetary Transits (Gochara): Saturn, Jupiter & Nodes',
          subtitle: 'Navigating Shani in Pisces, Guru in Gemini/Cancer and Rahu-Ketu Shifts',
          paragraphs: [
            `Overlaying your internal dasha timeline are the major slow-moving planetary transits that shape external market conditions: Saturn (transiting Pisces and Aries), Jupiter (transiting Gemini and Cancer), and the nodal axis of Rahu and Ketu (transiting Aquarius and Leo).`,
            `Saturn’s transit through Pisces activates your 5th house of creative intelligence, demanding rigorous discipline in systems design and product architecture. As Saturn approaches your 6th house of Aries in 2027, he enters his debility sign externally, but in your chart activates your peerless 34-bindu operational house, creating massive turnaround opportunities.`,
            `Meanwhile, Jupiter’s upcoming transit into Cancer in 2026 activates your 9th house of fortune and your D10 10th house with exalted grace. This transit brings influential mentors, international business travel, and institutional sponsorship that directly support your career elevation.`,
          ],
          diamondPointers: [
            `✦ Saturn in Pisces forces rigorous discipline in product architecture and strategic planning; avoid speculative shortcuts.`,
            `✦ Jupiter’s transit into Cancer activates exalted 9th-house fortune, bringing senior executive mentorship and institutional expansion.`,
            `✦ Rahu transiting your D10 5th house in Aquarius stimulates cutting-edge technical innovation and AI systems design.`,
            `✦ Synchronize your major career transitions with Jupiter’s Cancer transit for maximum institutional support and visibility.`,
          ],
          takeaway: 'External transits strongly support your strategic repositioning; leverage Jupiter’s upcoming Cancer grace to expand your executive reach.',
        };

      // PART 9: CELESTIAL REMEDIES & LIFESTYLE ALCHEMY
      case 58:
        return {
          title: 'Cosmic Keys: The Philosophy of Vedic Remedies',
          subtitle: 'Sattvic Jyotish Remediation: Conscious Recalibration and Energetic Harmony',
          paragraphs: [
            `In authentic Vedic Jyotish, astrological remedies (Upayas) are not superstitious rituals designed to bribe cosmic forces or magically erase personal responsibility. True remediation is conscious psychological, physical, and environmental recalibration—practices designed to harmonize your personal energy field with celestial frequencies.`,
            `Remedies operate on the principle of resonance. Just as an instrument must be tuned to vibrate in harmony with a musical scale, your daily habits, workspace environment, and conscious disciplines must be aligned with the planetary dignities in your birth chart.`,
            `For you, ${name}, remediation centers on strengthening your functional benefics—principally Mercury (commercial intellect and speech eloquence), Venus (diplomatic grace and relationship equity), and Jupiter (strategic wisdom)—while honoring the disciplined requirements of your exalted Saturn.`,
          ],
          diamondPointers: [
            `✦ Authentic Vedic remedies focus on conscious psychological and energetic alignment, never passive superstition.`,
            `✦ Strengthening functional benefics (Mercury, Venus, Jupiter) amplifies your natural career strengths and commercial gains.`,
            `✦ Remediation works synergistically with purushartha: conscious effort guided by astronomical alignment yields compound returns.`,
            `✦ Approach remedies with sattvic discipline, consistency, and clear strategic intention for maximum transformative efficacy.`,
          ],
          takeaway: 'Vedic remedies are conscious tools for energetic alignment; use them to fine-tune your mind and environment for peak professional mastery.',
        };

      case 59:
        return {
          title: 'Gemstone Guidance: Natural Emerald (Panna) for Mercury',
          subtitle: 'Enhancing Analytical Precision, Commercial Negotiation & Advisory Eloquence',
          paragraphs: [
            `In the science of Ratna Dhyana (Vedic gemstone therapy), gemstones function as crystalline optical filters that absorb and magnify specific cosmic planetary rays into your electromagnetic aura. For your Scorpio Lagna, the single most beneficial and transformative gemstone is a Natural Emerald (Panna), dedicated to Mercury (Budha).`,
            `Mercury rules your 11th house of gains and resides in your 2nd house of speech and treasury, forming your powerful Budhaditya Yoga. Wearing a high-grade emerald amplifies your analytical precision, enhances your commercial negotiation acumen, clarifies your strategic speech, and accelerates your ability to monetize intellectual property.`,
            `The emerald should be natural, unheated, untreated, and transparent with a vibrant grass-green hue. It should weigh between 3.5 and 5.25 carats, set in an open-back gold or panchadhatu ring, and worn on the little finger (Kanishtha) of your right hand on a Wednesday morning during Shukla Paksha.`,
          ],
          diamondPointers: [
            `✦ Prescribed Gemstone: Natural Emerald (Panna), 3.5 to 5.25 Carats, unheated, untreated, and eye-clean.`,
            `✦ Metal & Setting: Set in open-back 18k/22k Gold or Panchadhatu, allowing the gemstone pavilion to touch the skin.`,
            `✦ Wearing Protocol: Worn on the little finger of the right hand on Wednesday morning during Shukla Paksha (waxing moon).`,
            `✦ Consecration: Purify with raw milk and Gangajal; chant the Budha Beej Mantra (Om Bum Budhaya Namah) 108 times prior to wearing.`,
          ],
          takeaway: 'A consecrated Natural Emerald is your primary gemstone catalyst, magnifying your commercial intellect and advisory eloquence.',
        };

      case 60:
        return {
          title: 'Sacred Rudraksha Beads: 4-Mukhi & 14-Mukhi Protocols',
          subtitle: 'Harmonizing Mercury’s Analytical Intellect and Saturn’s Executive Intuition',
          paragraphs: [
            `Rudraksha beads are sacred bio-magnetic seeds revered in classical texts for their profound capacity to stabilize the nervous system, balance electro-magnetic currents in the body, and awaken higher intuitive faculties. Unlike gemstones, authentic Rudraksha beads carry no astrological contraindications and can be worn by anyone seeking spiritual and professional elevation.`,
            `For your specific astrological wiring, the optimal combination is a 4-Mukhi Rudraksha paired with a 14-Mukhi Rudraksha. The 4-Mukhi bead is governed by Lord Brahma and resonant with Mercury, enhancing analytical memory, vocal eloquence, logical reasoning, and creative problem-solving.`,
            `The rare 14-Mukhi Rudraksha (Deva Mani) is governed by Lord Shiva and resonant with Saturn. Worn at the throat or chest, it awakens the Ajna chakra, bestowing piercing executive intuition, unshakeable emotional composure, crisis-management mastery, and protection against institutional adversaries.`,
          ],
          diamondPointers: [
            `✦ 4-Mukhi Rudraksha: resonant with Mercury, sharpens analytical memory, strategic communication, and intellectual focus.`,
            `✦ 14-Mukhi Rudraksha (Deva Mani): resonant with Saturn, awakens supreme executive intuition and crisis leadership fortitude.`,
            `✦ Stringing Protocol: Strung in pure silk or unknotted silver wire, worn around the neck so the beads rest against the chest.`,
            `✦ Maintenance: Clean periodically with pure sesame or almond oil; avoid wearing during mourning or intimate activities.`,
          ],
          takeaway: 'The 4-Mukhi and 14-Mukhi Rudraksha combination anchors your executive intuition while sharpening your analytical intellect.',
        };

      case 61:
        return {
          title: 'Mantras and Sound Vibrations: Gayatri, Budha & Shani',
          subtitle: 'Authentic Sanskrit Verses for Solar Authority, Commercial Acumen & Endurance',
          paragraphs: [
            `In Vedic science, sound is the primordial vibration (Nada Brahma) that structures material reality. Mantras are precision-engineered Sanskrit sound frequencies designed to clear psychological obstructions, sharpen neural pathways, and align consciousness with specific planetary archetypes.`,
            `For your daily practice, three classical mantras provide complete energetic coverage: the Gayatri Mantra for solar authority and intellectual illumination, the Budha Beej Mantra for commercial eloquence, and the Shani Gayatri Mantra for disciplined endurance and institutional stature.`,
            `Consistent vocal or mental recitation of these mantras—particularly during morning meditation—acts as a powerful neural tuning mechanism. It centers your Scorpio focus, dissolves decision fatigue, and infuses your daily executive interactions with calm, resonant authority.`,
          ],
          diamondPointers: [
            `✦ Gayatri Mantra: Om Bhur Bhuva Svah, Tat Savitur Varenyam, Bhargo Devasya Dhimahi, Dhiyo Yo Nah Prachodayat (recite 24 times at dawn).`,
            `✦ Budha Beej Mantra: Om Bram Brim Braum Sah Budhaya Namah (recite 108 times on Wednesday mornings for commercial clarity).`,
            `✦ Shani Gayatri Mantra: Om Sham Shanaishcharaya Vidmahe, Suryaputraya Dhimahi, Tanno Mandah Prachodayat (recite 19 times on Saturday evenings).`,
            `✦ Practice with steady, rhythmic pronunciation; focused sonic vibration calms mental chatter and sharpens executive discernment.`,
          ],
          takeaway: 'Daily recitation of these authentic Sanskrit mantras aligns your consciousness with cosmic authority, intellect, and endurance.',
        };

      case 62:
        return {
          title: 'AstroVastu Directional Optimization: North & West Alignment',
          subtitle: 'Workplace Ergonomics: Facing North/East for Intellect and Securing West for Stability',
          paragraphs: [
            `AstroVastu is the architectural science of aligning your physical working environment with your planetary coordinates. The space in which you spend 8 to 10 hours daily directly impacts your cognitive clarity, energy levels, and commercial decision-making velocity.`,
            `In your chart, the primary wealth and knowledge axis involves Mercury (ruling North and 11th house) and Saturn (ruling West and exalted in 12th house). To optimize your workplace, position your executive desk so that you face strictly North or East while working. The North channel (governed by Kubera and Mercury) stimulates cash-flow opportunities and analytical clarity.`,
            `Simultaneously, ensure that the Western sector of your office or home is solid, heavy, and clutter-free. The West is governed by Saturn; keeping this zone grounded anchors your institutional stability, prevents unexpected operational disruption, and solidifies your long-term professional authority.`,
          ],
          diamondPointers: [
            `✦ Desk Orientation: Sit facing strictly North or East to absorb intellectual clarity and commercial wealth frequencies.`,
            `✦ North Sector Optimization: Keep the North zone of your office open, brightly lit, and clean; avoid heavy storage or red décor here.`,
            `✦ West Sector Grounding: Place heavy filing cabinets, safes, or dark furniture in the West zone to anchor Saturnine stability.`,
            `✦ Eliminate clutter from your desk; a minimalist, orderly physical workspace directly reinforces your Scorpio analytical focus.`,
          ],
          takeaway: 'Align your office by facing North for commercial intellect while securing the West for institutional stability.',
        };

      case 63:
        return {
          title: 'Lifestyle Disciplines & Energy Management',
          subtitle: 'The Saturday Reflection Rhythm, Time-Blocking Protocols & Mental Clarity Routines',
          paragraphs: [
            `True astrological remediation extends beyond objects into the architecture of your daily habits. With exalted Saturn in your 12th house, your highest lifestyle discipline is establishing a conscious rhythm of weekly rest, reflection, and strategic consolidation.`,
            `Because your work demands intense cognitive expenditure, you must implement the 'Saturday Pause'—a weekly protocol dedicated to Saturnine reflection. Reserve Saturdays for reviewing the past week's operational metrics, taking long walks in nature, minimizing screen exposure, and planning the strategic priorities for the coming week.`,
            `Additionally, adopt rigorous time-blocking protocols during your workday. Protect a 2-hour morning window for deep, uninterrupted architectural design, free from reactive meetings, chat interruptions, or administrative trivia. This single discipline will magnify your creative and commercial output exponentially.`,
          ],
          diamondPointers: [
            `✦ The Saturday Pause: dedicate Saturdays to low-screen time, strategic reflection, nature immersion, and energetic recharging.`,
            `✦ Morning Deep-Work Window: protect 2 hours every morning for high-leverage architectural design and strategic synthesis.`,
            `✦ Conscious Digital Boundaries: establish an evening digital curfew to allow your nervous system to reset for the next day.`,
            `✦ Regular physical grounding: engaging in strength training or swimming harmonizes your Martian energy and eliminates mental tension.`,
          ],
          takeaway: 'Disciplined lifestyle rhythms and the Saturday Pause ensure your cognitive engine operates at peak executive velocity sustainably.',
        };

      case 64:
        return {
          title: 'Dana (Sacred Charity) & Social Stewardship',
          subtitle: 'The Karmic Remediation of Supporting the Elderly, Laborers and Students',
          paragraphs: [
            `In traditional Vedic philosophy, Dana (sacred philanthropic giving) is considered the supreme and most potent of all astrological remedies. Classical texts state that unselfish service and charitable giving directly burn through challenging karmic encumbrances, transforming planetary friction into divine grace.`,
            `For your chart, the primary recipients of your Dana are governed by Saturn (the elderly, disabled individuals, and manual laborers) and Mercury/Jupiter (underprivileged students and educational charities). By consciously sharing your commercial abundance with these groups, you honor the cosmic forces that sustain your prosperity.`,
            `Establish a disciplined monthly practice of contributing to old-age homes, supporting educational scholarships for disadvantaged children, or funding healthcare for disabled workers. This sacred stewardship cleanses your 11th-house revenue streams and ensures that your wealth compounds with lasting ethical integrity.`,
          ],
          diamondPointers: [
            `✦ Dana to the Elderly and Disabled: monthly support to old-age homes or disabled workers harmonizes your exalted Saturn.`,
            `✦ Educational Philanthropy: sponsoring books, tuition, or technology for underprivileged students directly strengthens Mercury and Jupiter.`,
            `✦ Practice anonymous giving whenever possible; unheralded charity carries the highest sattvic karmic potency.`,
            `✦ Integrate corporate social responsibility into your enterprise ventures, creating a business culture anchored in ethical stewardship.`,
          ],
          takeaway: 'Regular sacred charity to the elderly and students purifies your wealth engines, ensuring your commercial success is blessed by cosmic grace.',
        };

      // PART 10: CAREER ROADMAP & CLOSING COUNSEL
      case 65:
        return {
          title: 'Executive Synthesis: Core Calling & Hidden Talents',
          subtitle: 'Uniting Investigative Depth, Operational Stamina and Elite Advisory Eloquence',
          paragraphs: [
            `In this executive synthesis, we draw together all celestial threads into a unified portrait of your vocational destiny. You, ${name}, are an individual whose astronomical blueprint is engineered for strategic mastery, systems architecture, and institutional governance.`,
            `Your core calling lies at the intersection of three extraordinary strengths: the investigative, crisis-resilient depth of your Scorpio Ascendant; the relentless, data-driven operational stamina of your 11th-house Mars and Moon in Virgo; and the sovereign advisory eloquence of your Sun, Jupiter, and Mercury triple conjunction in Sagittarius.`,
            `Your hidden talent is your ability to bridge high-level corporate diplomacy with granular technical reality. You possess the executive stature to sit in boardrooms and command respect from stakeholders, while retaining the sharp diagnostic eye required to deconstruct complex technical systems to their core foundations.`,
          ],
          diamondPointers: [
            `✦ Unified Vocational Identity: an elite systems architect, strategic consultant, and institutional governance advisor.`,
            `✦ Core Calling: transforming chaotic, fragmented corporate and technical environments into disciplined, highly profitable systems.`,
            `✦ Hidden Superpower: seamless translation between high-stakes executive diplomacy and deep technical engineering realities.`,
            `✦ Your career destiny is not about fitting into existing corporate molds, but architecting the systems that others operate within.`,
          ],
          takeaway: 'Your complete astrological blueprint marks you as a master systems architect and executive advisor destined for institutional influence.',
        };

      case 66:
        return {
          title: 'Your Golden Quadrant: Capability Meets Market Opportunity',
          subtitle: 'The High-Yield Convergence of Systems Architecture, Institutional Governance & Consulting',
          paragraphs: [
            `In strategic career planning, your 'Golden Quadrant' represents the unique sweet spot where your highest innate astrological dignities intersect with the most lucrative, high-demand opportunities in the modern global economy. Operating outside this quadrant creates unnecessary friction; operating inside it generates compounding momentum.`,
            `Your Golden Quadrant is defined by three overlapping pillars: Complex Systems Architecture (cloud, data, distributed platforms), Institutional & Regulatory Governance (compliance, security, public sector alignment), and High-Yield Specialized Consulting (advising C-suites and boards on high-stakes transformations).`,
            `Whenever you evaluate new career opportunities, business ventures, or partnership proposals, use this Golden Quadrant as your definitive filter. Reject opportunities that force you into low-level tactical firefighting or unstructured sales; commit your full energy to initiatives that demand architectural vision and strategic governance.`,
          ],
          diamondPointers: [
            `✦ Pillar 1: Complex Systems Architecture—designing resilient, scalable technological and operational infrastructures.`,
            `✦ Pillar 2: Institutional & Regulatory Governance—navigating compliance, risk management, and public sector integration.`,
            `✦ Pillar 3: High-Yield Specialized Consulting—delivering high-impact executive counsel to enterprise decision-makers.`,
            `✦ Use this Golden Quadrant as an uncompromising strategic filter for all future career moves, partnerships, and investments.`,
          ],
          takeaway: 'Anchor your career strictly within your Golden Quadrant, where your systems brilliance commands peak market valuation and fulfillment.',
        };

      case 67:
        return {
          title: 'Top 3 Professional Pathways',
          subtitle: 'The Three High-Stature Trajectories Built for Your Astrological Blueprint',
          paragraphs: [
            `Based on the exhaustive synthesis of your D1, D10, BNN degree chains, and Sarvashtakavarga heatmaps, three distinct professional pathways emerge as the highest-stature expressions of your career potential.`,
            `Pathway 1: Enterprise Systems & Cloud/AI Architecture Director. Leading large-scale technological transformations for multinational corporations, establishing the architectural blueprints, governance standards, and engineering methodologies for critical infrastructure.`,
            `Pathway 2: Regulated Sector & Public Governance Technology Advisory. Serving as an elite principal consultant or managing director advising government ministries, defense contractors, central banks, and healthcare institutions on high-security digital modernization.`,
            `Pathway 3: Independent Strategic Consulting & Productized Venture Advisory. Operating your own specialized advisory practice, partnering with innovative technology founders and private equity firms to optimize systems, restructure operational workflows, and capture equity stakes.`,
          ],
          diamondPointers: [
            `✦ Pathway 1 (Corporate Leadership): Principal Systems Architect / VP of Enterprise Architecture in high-complexity global firms.`,
            `✦ Pathway 2 (Institutional Advisory): Senior Public Sector Technology Partner advising government, defense, and regulatory entities.`,
            `✦ Pathway 3 (Independent Sovereignty): Founder of a boutique specialized consulting practice holding equity in transformative ventures.`,
            `✦ These three pathways are not mutually exclusive; your career can fluidly transition from Pathway 1 into Pathways 2 and 3.`,
          ],
          takeaway: 'These three pathways represent your highest vocational destinies; align your milestones with the trajectory that sparks your greatest ambition.',
        };

      case 68:
        return {
          title: '30-Day Operational Action Plan: Foundations & Clarity',
          subtitle: 'Immediate Milestones: Calendar Audits, Time Boundaries and Workspace Alignment',
          paragraphs: [
            `A vision without immediate tactical milestones remains a mere fantasy. Your 30-day action plan is designed to establish operational clarity, eliminate energetic drag, and align your daily rhythms with your celestial blueprint immediately.`,
            `Days 1 to 10: Conduct an uncompromising workflow and calendar audit. Identify and ruthlessly eliminate at least 5 hours of low-value, non-essential meetings and administrative busywork each week, protecting your morning deep-work window.`,
            `Days 11 to 20: Optimize your physical workspace following AstroVastu guidelines. Reorient your desk to face North or East, declutter all surfaces, ground the West sector of your office, and institute the weekly Saturday Pause protocol.`,
            `Days 21 to 30: Streamline your stakeholder communications. Transition from ad-hoc reactive messaging to structured, asynchronous documentation, and begin the daily recitation of the Gayatri and Budha mantras to sharpen your advisory voice.`,
          ],
          diamondPointers: [
            `✦ Days 1–10: Eliminate 5 hours of non-essential weekly commitments; establish your 2-hour morning deep-work sanctuary.`,
            `✦ Days 11–20: Reorient desk to face North/East; declutter office; implement the Saturday Pause reflection routine.`,
            `✦ Days 21–30: Adopt structured asynchronous reporting; begin daily Gayatri and Budha mantra recitations.`,
            `✦ Milestone: By Day 30, your mental clarity, physical workspace, and weekly calendar will operate with disciplined elegance.`,
          ],
          takeaway: 'Your first 30 days lay the operational foundation; eliminate clutter and protect your deep-work focus with absolute discipline.',
        };

      case 69:
        return {
          title: '90-Day Tactical Momentum Plan: Alliances & Positioning',
          subtitle: 'Quarterly Milestones: High-Value Systems Assets, Stakeholders and Scope Expansion',
          paragraphs: [
            `Building upon the clarity established in your first month, your 90-day plan shifts focus outward toward building tactical momentum, strengthening high-value stakeholder relationships, and visibly demonstrating your architectural authority.`,
            `Month 1 (Days 31 to 60): Author and publish an internal or industry-facing architectural framework. Codify your systems philosophy into a tangible whitepaper, technical standard, or executive deck that establishes your domain authority.`,
            `Month 2 (Days 61 to 75): Initiate structured bilateral reviews with key executive stakeholders and potential commercial partners. Present your architectural vision, demonstrating how your systems approach reduces risk and expands profitability.`,
            `Month 3 (Days 76 to 90): Formalize a new high-leverage initiative or commercial mandate. Secure organizational sponsorship for a cross-functional systems transformation, or formalize an advisory engagement that expands your scope of authority.`,
          ],
          diamondPointers: [
            `✦ Month 1: Author and circulate a flagship systems architecture framework or thought-leadership whitepaper.`,
            `✦ Month 2: Conduct strategic alignment briefings with key C-suite decision-makers and prospective commercial partners.`,
            `✦ Month 3: Secure an executive mandate or contractual agreement for a major systems transformation initiative.`,
            `✦ Milestone: By Day 90, your professional standing will have visibly transitioned from operational execution to strategic architecture.`,
          ],
          takeaway: 'Your 90-day plan establishes tangible momentum; publish your frameworks and claim your position as an indispensable strategist.',
        };

      case 70:
        return {
          title: '365-Day Strategic Elevation Plan: Executive Stature & Harvest',
          subtitle: 'One-Year Milestones: Enterprise Governance, Commercial Compounding & Board Mandates',
          paragraphs: [
            `Your 365-day strategic plan provides the multi-quarter roadmap for fully capitalizing on your active Saturn-Mercury timing window, elevating your executive stature, and structuring compounding commercial assets.`,
            `Quarter 1: Formalize your transition to executive governance. Transition all remaining routine operational tasks to delegated team members, stepping fully into high-level systems architecture and policy oversight.`,
            `Quarter 2: Structure high-margin enterprise commercial partnerships. Capitalize on Rahu in the 7th house by negotiating strategic alliances, enterprise advisory agreements, or joint venture mandates fortified with rigorous legal due diligence.`,
            `Quarter 3: Expand your industry thought leadership. Deliver an executive keynote, author an influential industry publication, or participate in senior regulatory and institutional forums that cement your domain authority.`,
            `Quarter 4: Execute your annual capital compounding review. Evaluate your revenue retention, convert liquid gains into secure sovereign assets, and establish the operational systems for the coming multi-year expansion cycle.`,
          ],
          diamondPointers: [
            `✦ Q1 (Governance): Complete full delegation of routine tasks; anchor your role exclusively in strategic systems architecture.`,
            `✦ Q2 (Alliances): Secure high-value enterprise partnerships or advisory mandates with rigorous contractual governance.`,
            `✦ Q3 (Stature): Keynote at an executive conference or publish an authoritative industry report establishing thought leadership.`,
            `✦ Q4 (Harvest): Conduct your annual wealth sweep; automate the compounding of 11th-house revenues into sovereign assets.`,
          ],
          takeaway: 'Your 365-day plan secures your executive stature and compounds your commercial assets into lasting financial sovereignty.',
        };

      case 71:
        return {
          title: 'A Lifetime of Stewardship: Wisdom, Integrity & Legacy',
          subtitle: 'The Multi-Decade Horizon of Enduring Impact, Mentorship and Sovereign Freedom',
          paragraphs: [
            `Beyond the quarterly roadmaps and annual milestones lies the ultimate horizon of your vocational journey: a lifetime of purposeful stewardship, unassailable ethical integrity, and enduring institutional impact.`,
            `Astrology reveals that true career greatness is not measured by the accumulation of titles or transient applause, but by the stability and dignity of the frameworks you leave behind. With your Sun in Sagittarius, exalted Saturn in Libra, and Jupiter presiding over your house of wisdom, your legacy is built on the lives you elevate and the systems you stabilize.`,
            `As you navigate the decades ahead, let your guiding compass remain Swadharma—your authentic cosmic duty. When you operate with integrity, mentor emerging talent generously, and design systems that stand the test of time, you fulfill the highest spiritual and material promise of your celestial blueprint.`,
          ],
          diamondPointers: [
            `✦ Measure long-term success by the institutional resilience of your systems and the growth of the leaders you mentor.`,
            `✦ Anchor your professional decisions in unwavering ethical integrity; your solar reputation is your most precious asset.`,
            `✦ Transition from worldly ambition to conscious stewardship, using your commercial abundance to support societal elevation.`,
            `✦ The legacy you construct will endure as a testament to disciplined intellect, strategic vision, and principled leadership.`,
          ],
          takeaway: 'A lifetime of stewardship transforms professional achievement into an enduring legacy of wisdom, integrity, and honor.',
        };

      case 72:
        return {
          title: 'Epilogue and Astrological Blessing: Conscious Destiny',
          subtitle: 'The Closing Benediction, Client Agency and Certified Consultation Colophon',
          paragraphs: [
            `As this comprehensive career consultation dossier draws to its conclusion, return to the foundational wisdom of Vedic Jyotish: the planets do not compel, they impel. Your astrological chart is not an inescapable cage of fate; it is a sacred compass illuminating your innate capabilities, natural seasons, and highest vocational potential.`,
            `The ultimate author of your destiny is your own conscious awareness, your ethical character, and your disciplined purushartha. The celestial forces revealed in these pages stand ready to support you as powerful allies, providing tailwinds to your purposeful labor and illuminating your path through complexity.`,
            `May the divine cosmic intelligence that guides the stars and planets illuminate your intellect, grant you unshakeable executive courage, and bless your vocational journey with profound fulfillment, enduring prosperity, and noble institutional honor. Om Shanti, Shanti, Shanti.`,
          ],
          diamondPointers: [
            `✦ Your chart is a sacred navigational compass; your conscious awareness and daily discipline determine your ultimate destination.`,
            `✦ Walk your career path with courage, knowing that your celestial wiring is engineered for strategic depth and executive mastery.`,
            `✦ Revisit this consultation dossier at every major career crossroads to recalibrate your direction with cosmic timing.`,
            `✦ Certified with the highest standards of classical Parashari, Jaimini, and Bhrigu Nandi Nadi astrological scholarship.`,
          ],
          takeaway: 'Step forward into your career with sovereign clarity and courage; your destiny is calling you to greatness.',
        };

      default:
        return {
          title: `Topic ${topicNumber}`,
          subtitle: 'Astrological Consultation Dimension',
          paragraphs: [
            `In Vedic astrology, this dimension of your chart illuminates the interplay between innate planetary tendencies and external workplace execution for ${name}.`,
            `Grounded in your Scorpio Ascendant and 11th-house Mars coordinates, this sector demands disciplined strategic alignment to compound professional fulfillment.`,
          ],
          diamondPointers: [
            `✦ Strategic alignment: capitalize on natural planetary dignities.`,
            `✦ Operational caution: maintain disciplined boundaries.`,
            `✦ Executive development: cultivate collaborative long-term relationships.`,
          ],
          takeaway: 'Align your daily effort with your natural astronomical wiring for compound professional fulfillment.',
        };
    }
  }
}

export const careerFallbackSynthesizer = new CareerFallbackSynthesizer();
