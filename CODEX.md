# Every Park — Product Brief

> Working source of truth for the product vision, initial scope, and unresolved product decisions.

## Working concept

Every Park is a location-based exploration and collection app that makes visiting real-world parks and landmarks feel like completing a satisfying game map.

The initial experience covers Vancouver Island. Users discover a curated set of worthwhile places, travel to them in person, and check them off only when their device confirms that they are there. The app turns outdoor exploration into a finite, legible set of accomplishments: visit both national park reserves, complete the provincial parks in an area, or finish a small collection of notable beaches or mountains.

The product should feel playful and rewarding without trivializing the outdoors. Its map should borrow the clarity, responsiveness, animation, and “juice” of a polished game-world map rather than feeling like a conventional GIS viewer or directory.

## Product promise

Open the app, see compelling places on Vancouver Island that you have not visited, go to one, record a location-verified visit, and make visible progress toward badges and meaningful collections.

## Initial audience

- Vancouver Island residents looking for reasons to explore nearby places
- Visitors who want a curated alternative to an exhaustive travel directory
- Completion-oriented users motivated by finite collections and visible progress
- Outdoor enthusiasts who enjoy documenting where they have been

The first release should remain useful to a casual explorer. It should not require advanced hiking ability or a commitment to visit remote backcountry locations.

## Representative users and journeys

### The new Island resident

They recently moved to Vancouver Island and want a long-running reason to understand their new home. They open the map without creating a social profile, wishlist several nearby parks, and choose one for the weekend. At the park they check in without cellular service, take a dual-camera photo, and immediately see the place light up as pending. Once home, the visit syncs and becomes a private postcard. After several outings they complete a regional collection, receive an illustrated badge, and share the badge card without sharing their visit photos.

### The casual visitor

They have only a few days on the Island and will never pursue Island-wide completion. They browse a small, understandable collection near their destination, save two places, and verify one visit. They decline the photo because of rain, receive a placeholder visit card, and still make meaningful progress toward a local badge. They never join the leaderboard and remain private throughout the experience.

### The committed explorer

They treat the catalogue as a multi-year pursuit. Their visits before installing Every Park do not count, so they begin a new verified record. They revisit major parks to satisfy handcrafted objectives, such as checking in at several distinct areas of Strathcona. They opt into the leaderboard, publish their unique-place count and badges, and separately decide whether their checked-off map is visible. Their private visit cards remain a personal chronological record.

## Product principles

### Curated, not exhaustive

The app should contain enough places to make exploration interesting, but not so many that completion feels arbitrary or impossible. Major and meaningful locations matter more than every named geographic feature.

### Presence is the achievement

A visit is earned by physically reaching a location. Users cannot retroactively upload a photo or manually claim a remote place without location verification.

### Progress should be legible

Collections must be small and clearly bounded. “8 of 10 beaches in Greater Victoria” is motivating; “842 of 40,000 geographic features” is not.

### The map is the product

Browsing, choosing a destination, seeing progress, and celebrating a visit should all feel excellent on the map. The interface should be responsive, tactile, cartoonish, and fun while keeping geographic information understandable.

### Outdoor reality comes first

The app should not pressure users into unsafe, illegal, inaccessible, or environmentally harmful behavior. A check-in rule must reflect where the public can responsibly go, not merely the mathematical center of a park polygon.

## V1 scope

### Geography

- Vancouver Island and a broad selection of its surrounding islands
- Island and nearby-island places should be represented in the catalogue even when they do not count toward a default completion target
- The exact geographic boundary of the launch catalogue still requires an explicit inclusion rule

### Included places

- National parks and national park reserves in the initial geography
- Provincial parks in the initial geography
- Regional parks in the initial geography
- A broad catalogue of eligible islands and park units, including difficult places that may sit outside the default completion target
- A deliberately small, editorially selected set of major points of interest, potentially including beaches, mountains, viewpoints, waterfalls, or other recognizable landmarks

The expected launch catalogue is roughly 150 provincial parks, 150 regional parks, two national park reserve systems, and approximately 50 islands, subject to data validation and editorial review. Pacific Rim and Gulf Islands contain multiple geographically separated areas, so each may also support handcrafted multi-location achievements.

All published places are manually reviewed before inclusion. V1 does not require authored access and safety notes for every record.

### Explicitly out of scope for v1

- Exhaustive coverage of every named mountain, lake, body of water, municipality, or Gazetteer feature
- Full coverage of all municipal parks
- Expansion beyond the Vancouver Island launch geography
- Requiring multiple visits or multiple check-in zones to complete every park
- User-submitted places
- A public community photo feed

## Core user journey

1. The user installs the app and is introduced to the Vancouver Island collection.
2. The app opens on the map. On first launch, the user briefly sees the whole Island before the map smoothly moves into their current region.
3. The user explores the map, opens a place, and sees why it is notable, how it contributes to a collection, and any relevant access or safety information.
4. The user travels to the place.
5. While the app is open inside an eligible polygon, a prominent place-specific check-in card appears.
6. The user deliberately taps the card to check in. The installed offline data validates the visit immediately and presents a satisfying confirmation and celebration.
7. The app then prompts the user to take a photo. The user must either capture one through the app or deliberately skip it.
8. The device records the visit locally, including capture time, location evidence, and any newly captured photo.
9. The place is marked as visited and all relevant place, badge, and XP progress updates immediately, even without connectivity.
10. The visit and any photo sync to the service when connectivity returns; sync status is separate from local visit validity.
11. Completing a collection produces a larger, durable badge with a celebratory animation.
12. The user can share a polished representation of the badge on social media.

## Visit verification

### V1 rule

A visit must be initiated in the app after installation while the device is within an approved check-in zone. The app records its own timestamp and device location as the visit evidence. Visits cannot be imported or claimed retroactively.

Historical visits from before installation are not represented, even as unverified memories. The personal record begins when the user starts using Every Park.

Taking a new photo through the app is strongly encouraged because the photo is the personal reward and memory attached to the check-in, but it is not required for a valid visit. When photography is unavailable or declined, the visit card uses a placeholder or no image. Existing library photos cannot be attached as contemporaneous visit evidence.

The capture experience may support a playful front-and-back-camera mode similar to a dual-camera social capture. A qualifying visit can be captured offline and verified or synced later.

### Private visit cards

Each visit becomes a private, postcard-like card containing the place, date, and optional in-app photo. These cards create a personal visual history similar to a collection of previously visited game locations. Photos, exact coordinates, precise check-in points, and timestamps are visible only to the account owner, although the service stores them to support sync and verification.

### Repeat visits

Every verified visit is retained as a separate event with its own date and optional photo. The first verified visit marks most places as visited. Later visits build a personal history without repeatedly granting the same first-visit achievement.

When the user returns to an already visited place, the eligibility card acknowledges the revisit with language such as “Back again” or “Visit again.” Completing it creates another private postcard without pretending that the place is newly discovered.

Repeat visits are not used for the initial leaderboard. If repeat-visit comparisons are introduced later, they should count distinct visit days rather than raw check-in or photo volume.

### Check-in zones

A park boundary alone is not always a good verification zone. Parks can be enormous, remote, marine-only, seasonally closed, or crossed by public roads. Each place should therefore support one or more curated check-in zones, such as:

- a visitor centre or signed entrance
- a trailhead or public access point
- a landmark-specific radius
- a safe public area within a larger park

The data model should allow stricter, multi-zone completion rules later without requiring them in v1.

The initial default is containment within the published place polygon. For an island, the user must be physically within its land polygon. Validation deliberately uses a generous tolerance when GPS accuracy is poor, because a legitimate user experience matters more than strict competitive integrity. Exceptions can receive manually curated check-in zones after the initial catalogue is tested.

When the user is eligible for one or more nearby places, the app presents the matching location or asks which place they are visiting. A single action never checks off multiple places automatically. There is no artificial cooldown: if several place zones genuinely overlap, the user may deliberately check them off one at a time.

### Offline behavior

- The app must allow an eligible visit to be recorded without a network connection.
- A lightweight Vancouver Island package ships with or is automatically stored by the app. It contains the complete launch catalogue, place polygons, check-in zones, collection rules, badge definitions, and a low-detail map sufficient to understand eligibility.
- The device validates location against the installed check-in data immediately. Internet access is not required to decide whether the visit qualifies.
- The client stores the check-in, timestamp, location evidence, and optional newly captured photo locally until sync succeeds.
- The local visited state and rewards appear immediately. Synchronization may be marked as pending without presenting the visit itself as unverified.
- After synchronization, the server independently checks leaderboard eligibility. A server-side validation problem does not remove the user’s local visit, private progress, or already presented personal reward; it only withholds that visit from public competitive totals until resolved.
- A visit or badge accepted under the device’s installed offline catalogue is permanent. It is not revoked because a place was disabled or its rules changed after the device last synchronized.
- Retrying sync must not create duplicate visits.
- The app should define basic handling for stale timestamps, implausible location readings, altered device clocks, and mocked locations, proportional to the actual stakes of the product.

## Catalogue, collections, achievements, and completion

The catalogue may be broad without making every catalogued place mandatory for completion. Users should be able to discover and record visits to difficult or unusual places while still having achievable goals.

Progress is organized into three related concepts:

- **Places:** individual destinations or visitable units, such as a park, island, beach, trailhead, or distinct area within a large park.
- **Collections:** finite groups based on jurisdiction, region, or theme. They define the requirements behind many badges.
- **Achievements and badges:** durable accomplishments whose rules may combine places, routes, or multiple objectives and which are designed to be celebrated and shared. Examples include visiting four distinct areas of Strathcona Provincial Park or completing both the Juan de Fuca Marine Trail and West Coast Trail.

A route achievement is different from arriving at a single place. The product must define what evidence counts as completing a route; a trailhead check-in alone should not imply that the trail was completed.

For most places, one verified visit is sufficient to mark the place as visited. Approximately five to ten major parks or park systems may receive handcrafted completion rules with multiple required locations or objectives. This deeper completed state is separate from the basic visited state.

Examples:

- National park reserves of Vancouver Island: 1 of 2
- Provincial parks in a defined region: 8 of 10
- Islands in a defined archipelago or region: 5 of 8
- Major beaches of Greater Victoria: 6 of 8
- Notable mountains in the Capital Regional District: 7 of 10

Good collections should be:

- understandable without reading an explanation
- small enough that completion feels possible
- meaningful enough that completion feels earned
- stable, so that users do not frequently lose a completed status when the catalogue changes
- built around places with legitimate public access

Badges are permanently grandfathered once earned. Each badge is tied to a timestamped, versioned set of requirements. If a collection later expands, users keep the original badge and a new superset badge or edition may recognize the expanded requirements.

Regions are organizational containers with authored badge sets. Their headline progress is expressed as badges earned, such as `CRD 2/21`, rather than raw places visited. Adding badges may increase the denominator and reduce the displayed completion ratio, which is acceptable; badges already earned remain permanent.

The badge system has three broad families:

- **Regional breadth badges:** visit the first place, five places, or another meaningful threshold within a region such as Nanaimo.
- **Global category badges:** visit the first beach, five beaches, the first provincial park, five provincial parks, and other Island-wide place-type milestones.
- **Handcrafted experience badges:** complete a meaningful combination such as the West Coast Trail and Juan de Fuca Marine Trail, or visit an authored group of Victoria-area beaches such as a “tourist pass.”

The system should avoid generating every possible combination of region, place type, and threshold. For example, “five provincial parks in Nanaimo” is unnecessary unless it represents completion of a deliberately authored regional collection. The goal is a moderate set of interesting badges rather than a dense matrix of incremental counters.

The regional badge set can mix approachable milestones with long-term accomplishments, for example:

- visit the first place in the region
- visit five and ten places in the region
- visit the first beach in the region
- visit the first provincial or national park in the region
- complete a selected category such as the region’s provincial parks or beaches

Individual place totals may still appear in detail views, but points of interest do not inflate the region’s primary progress denominator merely by existing.

Each place has one canonical parent region for progress accounting, selected initially by greatest polygon overlap and subject to manual override. A place that intersects another region may still be visible while browsing that region’s map even though it contributes to only one region’s canonical totals.

### Progress and motivation

The product should not center its experience on a single Vancouver Island completion percentage. Visiting the entire catalogue may reasonably be a lifetime pursuit, and presenting it as one dominant percentage would make ordinary progress feel insignificant.

Motivation should instead come from checking off individual places, filling small and achievable collections, earning distinctive badges, and receiving satisfying visual, sound, and haptic celebrations. Local progress counts can still be shown within a region, category, park, or collection where the denominator is meaningful.

Every first-time place visit grants some XP, so the core action always produces visible progression. Every badge also has an XP value or tier reflecting its difficulty. XP adds to a prominent total experience score and raises the user through named explorer levels. Broad Island-wide accomplishments, such as visiting at least one place in every region, can award substantial XP. This provides satisfying private progression without introducing a spendable currency. V2 may attach cosmetic map themes, postcard frames, badge animations, avatar items, or similar non-competitive rewards to levels. Coins and a broader economy are deferred.

### Badge sharing

Badges are designed to be shared outside the app. A shareable badge artifact should be visually recognizable, identify the accomplishment, and provide enough context to make sense on social media without exposing visit photos or precise check-in information. Badges use authored art—such as a regionally appropriate banana slug character—rather than a user’s private photos. Users may choose whether to include their name, completion date, or broad progress details.

### Leaderboards

The initial leaderboard ranks users by the number of unique places whose synchronized evidence has passed server validation. Repeat visits do not improve leaderboard standing. Users can open another person’s public profile and see their public achievement badges and, when separately enabled, which catalogue places are checked off on their map.

Social participation is entirely opt-in. Joining the leaderboard publishes the user’s unique-place count and badges. Publishing the checked-off map is a separate opt-in choice. Public profiles never expose visit photos, exact check-in coordinates, precise access points, or visit times. Leaderboard design must still account for location spoofing, different levels of mobility and free time, catalogue changes, and the safety risks of rewarding access to extreme locations.

## Identity and account behavior

- The Android app starts in a private, usable state without asking the user to create an account or join a leaderboard.
- Local progress must work before any social enrollment.
- Recoverable accounts support Google authentication or a first-party username and password.
- Account creation is deferred until the user chooses to synchronize for backup, cross-device recovery, or leaderboard participation.
- Creating an account links existing local progress rather than starting a new profile.
- First-party credentials are handled through a complete authentication system, including secure password hashing, session management, account recovery, abuse protection, and email or identity verification as appropriate; PostgreSQL stores account records but is not itself the authentication layer.
- Account deletion permanently removes private photos and precise visit evidence from the service, subject only to a clearly disclosed short backup-retention period if technically necessary.
- Leaderboard removal must be possible without deleting private visit history.

## Wishlist and community signals

Users can save places they want to visit. The wishlist supports personal trip inspiration and gives the product an aggregate signal of which places people most want to explore.

At sufficient usage, the app may show privacy-preserving popularity signals such as most wishlisted or most visited places on the Island or within a region. These features should not depend on critical mass to make the initial product useful, and public counts should avoid exposing individual travel patterns.

## Map experience

### Primary navigation

The app has three top-level destinations:

- **Map:** the default and primary screen for visually exploring the Island, drilling into regions, inspecting places, and checking in.
- **Places:** a discovery and planning area containing the wishlist, nearby unvisited places, search, filters, and optional list-based browsing.
- **My Stuff:** the user’s private visit journal, postcards, badges, XP, explorer level, account and backup controls, and entry point to the opt-in social profile and leaderboard.

Journal, badges, XP, and social features remain grouped inside My Stuff rather than competing with the map as separate primary destinations.

The visual direction is a stylized, welcoming map of Vancouver Island with game-like interaction quality. Potential elements include:

- an initial region-level hierarchy rather than hundreds of individual place markers
- badge-progress labels on regions, such as `CRD 2/21`
- selecting a region smoothly zooms into it and reveals its places
- nearby points of interest cluster as needed while major park and area polygons remain visually prominent
- filters for place types such as parks and islands, plus wishlist and unvisited states
- expressive markers and clear visual states for visited and unvisited places
- visible wishlist states for places the user wants to visit
- smooth zooming, panning, selection, and transitions between Island and regional views
- subtle animation, sound, and haptics for check-ins and milestones
- fog-of-war, stamps, trails, badges, or other playful progress treatments, provided they do not obscure the geography
- region and collection overlays that make finite goals visible
- a strong place-detail view with photography, short editorial context, progress, and access information

The tone should be cartoonish and joyful, not childish. Accessibility settings should reduce motion and provide alternatives to color-only states, sound, and haptic feedback.

The built-in map is for discovery, collection progress, and check-in eligibility rather than turn-by-turn navigation. Users can hand a destination off to an external navigation app such as Google Maps.

Visual browsing is the primary regional interaction. Search and an optional list view support users who want to find a specific place. Nearby unvisited suggestions belong on the home screen, where the user’s current location is relevant, rather than controlling the ordering of a region the user may be browsing remotely.

On the first launch, the map begins with the whole Island and smoothly zooms toward the user’s current region. Afterward, the app preserves and restores the last map position rather than resetting the user’s exploration context on every launch.

In v1, eligibility prompts and nearby-place detection run only while Every Park is in the foreground. Checking in is an intentional action. Background arrival detection and notifications are deferred to v2.

Richer place content and imagery can be fetched on demand. The app should keep a small rolling cache—initially around the ten most recently viewed places—while the lightweight catalogue and verification geometry remain permanently available offline.

## Place information

Each published place should have, at minimum:

- stable internal and source identifiers
- canonical name and place type
- jurisdiction and designation where applicable
- map geometry or representative location
- one or more approved check-in zones
- region and collection memberships
- short editorial description
- public-access and seasonal-status notes where relevant
- authoritative source and attribution metadata
- active, unavailable, or retired publication status
- an administrative check-in-enabled flag that can be changed without publishing a new app version

Authoritative government boundary data should be retained for accuracy and attribution. Curated check-in points and editorial POIs are a separate product layer, not replacements for the source geometry.

## Safety, privacy, and trust

- Explain why location and camera permissions are requested at the moment they are needed.
- Collect only the location evidence required for check-in; continuous background tracking is not part of the core concept.
- Treat visit photos, exact check-in coordinates, precise access points, and visit times as private account data.
- Leaderboard profiles expose the unique-place count and earned badges after explicit enrollment. Checked-off map visibility requires a separate explicit opt-in.
- V1 does not maintain a live closure feed. A published place normally remains visible and check-in eligible during a temporary closure, and the app must not imply that inclusion means the place is currently open or safe to enter.
- An administrative control can disable check-ins for an individual location in response to a wildfire, erroneous polygon, private-access dispute, or other urgent problem.
- Avoid incentives based on speed, first arrival, dangerous routes, or entry into restricted areas.
- Provide a correction path for bad coordinates, inaccessible zones, and catalogue mistakes.

## Potential later extensions

- Regional and municipal park collections
- More thematic POI collections
- Multiple required zones within large parks, including achievements such as visiting several distinct areas of Strathcona Provincial Park
- Route achievements for experiences such as the Juan de Fuca Marine Trail and West Coast Trail
- Seasonal visit achievements
- Background geofencing and optional arrival notifications
- Optional repeat-visit statistics or comparisons based on distinct visit days
- Expansion across British Columbia and later into other regions
- Friends, cooperative challenges, and richer leaderboard formats
- Aggregate popularity views based on visits and wishlists once the user base is large enough
- Personal trip history, journals, and richer photo memories
- Time-limited or seasonal collections that do not undermine permanent completion

## Product decisions still required

1. Can a user hide individual visited places after enabling public map visibility, and does disabling map visibility take effect immediately for other users?
2. Which approximately five to ten major parks or park systems receive handcrafted completion rules, and what does each require beyond its basic visited state?
3. Which exact designations count as “provincial parks” in v1: provincial parks only, or also conservancies, ecological reserves, protected areas, and recreation areas?
4. How are Vancouver Island and nearby islands bounded for catalogue purposes, especially for Gulf Islands National Park Reserve?
5. What broad XP tiers and level curve should be used once the initial badge catalogue is drafted?
6. How are difficult, remote, marine, permit-only, or rarely accessible parks represented without making ordinary completion impossible?
7. How is a private local identity recovered or transferred to a new device without forcing account creation during onboarding?
8. What evidence and appeal flow make a synchronized visit leaderboard-eligible when the server disagrees with the device’s immediate local validation?
9. How are successor or superset badges named and presented while preserving every previously earned badge?
10. Are POIs part of the v1 promise, or should the first launch prove the park loop before adding editorial landmark collections?
11. What evidence proves completion of a route rather than merely arrival at one of its access points?
12. Should the unique-places leaderboard be global, friends-only, regional, seasonal, or some combination of these?
13. How long are private visit photos and precise evidence retained, and can users export or permanently delete them without losing the public visited state?
14. Which polygons produce false positives or false negatives during testing and therefore require curated access zones or small accuracy tolerances?
15. What is the canonical region hierarchy above and below areas such as the Capital Regional District, and which overlapping geographic groupings are filters rather than parent regions?
16. What permission and notification controls should accompany optional background arrival detection in v2?
17. Do repeat visits grant XP, and if so, what cap or diminishing rule prevents one convenient park from becoming an unlimited XP source?

## Suggested v1 success signals

The initial product should test whether the core loop changes real behavior, not merely whether people browse a map. Useful signals include:

- users save or select an unvisited place and later complete an in-person check-in
- users return to make progress on the same collection
- users add places to a wishlist and later convert those intentions into verified visits
- offline check-ins sync reliably without support intervention
- users understand immediately why their current location does or does not qualify, while separately understanding whether the valid visit has synced
- a meaningful subset of users completes at least one small collection
- users voluntarily share earned badges
- users describe completion as motivating without feeling that the catalogue is impossible or unsafe

## V1 delivery sequence

### 1. Offline map and catalogue foundation

- finalize the launch region hierarchy and initial place catalogue
- normalize authoritative polygons and assign canonical parent regions
- generate the lightweight offline package
- render the Island, region hierarchy, major polygons, clusters, filters, and place states

### 2. Local exploration loop

- implement foreground location eligibility with generous, testable accuracy handling
- build the prominent check-in card and one-place-at-a-time chooser
- validate and award visits immediately on-device
- add the post-check-in photo-or-skip flow, private postcards, repeat visits, and offline persistence
- implement an initial badge set, XP awards, explorer levels, and celebrations

### 3. Planning and personal history

- add Places with wishlist, nearby unvisited places, search, filters, and optional list browsing
- add My Stuff with private journal, badges, XP, level, and visit history
- support external-navigation handoff and the rolling rich-content cache

### 4. Accounts, sync, and recovery

- link existing local progress through Google authentication or first-party credentials
- synchronize visits, private photos, badges, and account state idempotently
- define conflict handling, backup, deletion, and recovery behavior
- revalidate synchronized evidence for leaderboard eligibility without revoking local progress

### 5. Optional social and operational features

- implement opt-in leaderboard enrollment and public count and badges
- keep checked-map sharing behind a separate opt-in
- add the minimal administrative location-disable control
- add shareable illustrated badge cards

### 6. Release hardening

- field-test offline check-ins, polygon edges, overlapping places, poor GPS, interrupted uploads, and app restarts
- verify accessibility, permission explanations, privacy controls, data deletion, and app-store disclosures
- measure offline package and photo storage sizes and tune caching and compression

## Decisions required before release scope is locked

The product direction is sufficient to begin stages 1 and 2. Before committing to a fixed v1 release date and scope, decide:

- whether accounts, cloud backup, leaderboards, and badge sharing are launch requirements or a post-launch increment
- the exact launch catalogue, canonical region hierarchy, and minimum initial badge set
- the offline map technology, source licensing, package budget, and update mechanism
- the precise location-accuracy rule and synchronized evidence format
- photo compression, storage limits, retention, export, and deletion behavior
- the minimum supported Android versions and device capabilities
- the privacy policy, permission disclosures, and operational support path for incorrect polygons or failed check-ins

## One-sentence v1 definition

Every Park v1 is a playful, offline-capable Vancouver Island map where users record location-and-time-verified visits, optionally create private photographic postcards, check off national, provincial, and regional parks and selected islands, and earn shareable illustrated badges from finite regional or thematic collections.
