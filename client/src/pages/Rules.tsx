import { Button } from "@/components/ui/button";
import { Anchor, ExternalLink, Flag, Map, ScrollText, Shield, Swords, Waves } from "lucide-react";
import { Link } from "wouter";

const DISCORD_URL = "https://discord.gg/7vdWEQpQ68";
const DYNMAP_URL = "http://play.rtsg.org:8128/";

const playerRules = [
  "No discussions in the Minecraft chat which would be considered illegal in real life.",
  "No underground bases or farms unless they are in a mountain with a visible entrance.",
  "No nether roof glitch is allowed.",
  "No stashing chest hidden from sight. No secret chests.",
  "No forest fires and no reckless destruction of the environment. If caught, this will result in a temporary ban.",
  "No duplication glitches.",
  "No X-Ray texture packs.",
  "No hacking clients. OptiFine, Sodium, and Lunar are allowed, for example.",
  "You are only allowed one TP.",
  "Stealing from players' chests and shulker boxes is illegal if in your own claims. Nation community chests may be looted if designated as community chests.",
  "You are allowed to take player items if you kill them, granted you follow the combat rules.",
  "No mob farms or zero-tick farms. Only the following are allowed: cows, sheep, pigs, chickens, iron golems, piglins, zombified piglins, endermen farms, wolf farms, horse farms, and villagers.",
  "No automated farms. All farming must be done by hand and tools.",
  "Redstone is only allowed for doors and player-made mob or neutral mob farms that are allowed by the server.",
  "Griefing and PvPing are allowed in the Nether and End under all circumstances. Total anarchy.",
  "Players in a nation cannot make personal claims.",
  "No floating blocks.",
  "No lava casting.",
  "No massive terraforming projects unless approved by admins.",
  "No lag machines. Permanent ban if caught.",
  "No alt accounts.",
  "No glitches of any kind.",
  "No camping or using safe-zones during PvP. During a fight, you cannot run into the outpost.",
  "No disconnecting from the server during PvP.",
  "Outside of the nation, PvP is free game. Anything goes.",
  "If a fight begins outside nation borders, nation safe borders no longer apply. This includes if a player runs back into their town for backup. Anyone joining into a fight can be killed if the fight began outside the town.",
  "The one TP rule applies per player account. Once your one player-to-player teleport has been used, it is considered spent. Admins will not restore a teleport unless it was lost because of a confirmed server or plugin error.",
  "Teleports may not be used to escape an active PvP encounter, siege, pursuit, or other combat situation.",
  "Town, nation, outpost, home, spawn, or other teleport mechanics may not be used to circumvent the one TP rule where those teleport mechanics have been disabled by the server.",
  "AutoChop is permitted for legitimate tree harvesting. AutoChop may not be used to grief player structures, destroy decorative builds, intentionally damage another player's property, or circumvent Towny/WorldGuard protections.",
  "Players using AutoChop are responsible for the environmental consequences of cutting trees. Large areas may not be left covered in floating leaves, floating logs, or otherwise unnecessarily damaged terrain.",
  "QuickShop shops may only be created on land where the player has permission to create them. Do not use shops to bypass chest protection, Towny permissions, WorldGuard protections, or other ownership mechanics.",
  "Exploiting QuickShop, Towny banks, the economy plugin, admin shops, or any other monetary mechanic to duplicate money/items or generate unintended wealth is considered an economy exploit and is prohibited.",
  "Cannons may not be used against server spawn, administrative areas, protected infrastructure, or other WorldGuard safe-zones unless explicitly authorized by an admin.",
  "Cannons may not be used to exploit protection plugins or damage blocks which would otherwise be protected from the attacker.",
  "During declared wars and sieges, cannons may be used as part of legitimate warfare so long as their use follows the war rules and does not rely on bugs, exploits, or protection bypasses.",
  "Do not intentionally create excessive dropped items, entities, mobs, redstone activity, fires, explosions, or other sources of unnecessary server load.",
  "Attempts to evade the anti-cheat, CoreProtect logging, Towny protections, WorldGuard protections, or other server-management systems will be treated as exploiting.",
  "Safe-zones, spawn areas, protected outposts, or other administratively protected regions cannot be used as permanent storage or strategic shelters during an active fight.",
  "Players may use the Dynmap for legitimate navigation and territorial information. Any bug which exposes information intentionally hidden by the server must be reported rather than exploited.",
  "Rules concerning claims, PvP, war, theft, and safe-zones apply based on the actual circumstances of the event, not merely what a plugin technically allows. A plugin allowing an action does not automatically make that action legal under the server rules.",
  "No Curse of Vanishing.",
  "Killing player farmed mobs, such as animals and villagers, is prohibited.",
  "No mace and trident PvP.",
  "No vertical farms are allowed.",
];

const pluginRules = [
  "The server includes several plugins, including Towny/SiegeWar, Cannons, AutoChop, QuickShop, and Dynmap.",
  "To create a new town, use /t new <name>. To invite people to your town, use /t invite. All other town commands can be found with /t help.",
  "To create a new nation, use /n new <name>. You need at least 3 people in your town to create a nation. All other nation commands can be found with /n help.",
  "To toggle AutoChop, use /atc.",
];

const warRules = [
  "Wars are declared first in the proper Discord channel, #war-declarations. Nations must submit a piece of writing justifying their declaration that fits the tone and context of the conflict. Nations cannot declare war on everybody for no reason.",
  "If you are a town, but refuse to become a nation specifically to avoid being at war, that is a break of the rules of conduct. You may cooperate with other towns, but if you are essentially operating as a nation, admins may force you to become a nation or disband.",
  "If you are a town, you cannot join a war or start one unless you are part of a nation.",
  "You cannot join a nation specifically to join a war, then immediately leave after the war ends.",
  "When claiming land, especially outposts, do not exploit the claims system to overlap or block others from areas/resources surrounding their city.",
  "A war declaration must occur before deliberately beginning the corresponding SiegeWar siege. A siege started without the required Discord declaration may be cancelled by administrators.",
  "War declarations must identify the nation being attacked and provide a legitimate in-character or geopolitical justification. Obviously fabricated declarations whose only purpose is to bypass the declaration requirement may be rejected.",
  "A nation may not use temporary towns, fake nations, shell towns, alt-controlled settlements, or similar arrangements to manipulate the SiegeWar system.",
  "Once a siege or declared war is underway, towns and nations may not disband, transfer leadership, transfer ownership, abandon claims, or otherwise manipulate Towny mechanics for the primary purpose of escaping the consequences of the war.",
  "Do not deliberately exploit server restarts, crashes, maintenance periods, plugin reloads, or known SiegeWar bugs to gain an advantage in a siege.",
  "Do not intentionally obstruct a Siege Banner or other SiegeWar objective using illegal blocks, glitches, inaccessible terrain exploits, or administrative protections.",
  "Third-party nations and players are permitted to intervene in a conflict unless otherwise specified by the declaration or an administrator. By voluntarily participating in a battle, a player accepts that they may become a legitimate combat target.",
  "Territorial conquest must occur through the intended Towny/SiegeWar mechanics. Players may not bypass the system by forcing illegitimate claim transfers or abusing administrative/protection mechanics.",
  "Claim borders may not be deliberately shaped into excessive thin lines, isolated single chunks, rings, or other configurations whose primary purpose is to prevent another town from expanding rather than to control land genuinely used by the claiming town.",
  "Outposts must represent legitimate territorial, strategic, commercial, military, or logistical interests. Outposts created solely to claim-lock another nation may be removed by administrators.",
  "Normal combat rules remain in effect during wars unless this section specifically overrides them.",
];

const townyNationRules = [
  "A town represents an actual settlement or organized community and should claim land reasonably connected to its settlement, infrastructure, resources, or strategic territory.",
  "A nation represents a political organization of towns. Nations are expected to function as actual political entities rather than merely as a mechanic for receiving bonuses or avoiding other server systems.",
  "Players belonging to a nation may not use separate personal towns or claims as private protected estates in violation of server claim rules.",
  "Town mayors and nation leaders are responsible for understanding their own taxes, upkeep, claim costs, bank balances, permissions, residents, and diplomatic settings.",
  "Losing a town or nation because its bank cannot pay upkeep is normally considered a legitimate gameplay consequence. Admins are not required to restore settlements lost because their leadership failed to maintain sufficient funds.",
  "Town and nation banks belong to the corresponding political entity, not automatically to whichever player currently holds leadership.",
  "Leadership changes do not erase debts, treaties, wars, obligations, or other established political circumstances.",
  "Town permissions may be customized by town leadership, but settings cannot be used to circumvent server-wide rules.",
  "Players may gather, build, and destroy in wilderness wherever the server's current Towny wilderness settings permit it.",
  "Claimed land is governed by Towny permissions. Players are responsible for understanding whether they are entering wilderness, their own town, an allied town, an enemy town, or another protected area.",
  "Do not intentionally create claims solely to capture another player's active buildings without using the appropriate war/conquest mechanics.",
  "Do not abuse town deletion, nation deletion, renaming, leadership transfer, merging, or claim removal to hide assets or escape an active punishment, siege, debt, or administrative investigation.",
  "Administrators may order a town to join/form a nation, alter abusive claims, or remove claims where the settlement is clearly being used to circumvent the intended political system.",
];

const economyRules = [
  "The Towny/economy plugin has mechanics for the establishment of banks. Scams are allowed, so long as they are not exploiting mechanical systems or using glitches.",
  "The server economy includes personal balances, Towny town/nation banks, taxes, upkeep, claim costs, player shops, and server-owned admin shops.",
  "Scamming, misleading trades, bad investments, unfavorable loans, political corruption, and other player-created financial schemes are permitted unless they violate another rule.",
  "A scam becomes illegal when it relies on a plugin exploit, duplication method, fake item produced through a glitch, bugged shop, permission bypass, hacked client, alt account, or other prohibited mechanic.",
  "QuickShop transactions are considered legitimate economic transactions. Players are responsible for checking the item, amount, buying/selling direction, and price before confirming a transaction.",
  "Admin shops may have unlimited stock or unlimited purchasing power. Their existence is an intentional server mechanic and is not evidence of duplicated items or money.",
  "Players may create their own shops where they have permission to do so.",
  "Do not deliberately place misleading shops in a manner intended to imitate official server/admin shops.",
  "Town mayors may establish taxes and other internal economic policies using Towny mechanics.",
  "Nation leaders may establish nation-level economic arrangements, tribute, financial obligations, or shared funds where permitted by the plugins and server rules.",
  "Failure to pay upkeep, taxes, debts, or other mechanically enforced costs is normally a gameplay matter and not an administrative issue.",
  "Admins will generally not reimburse money lost through legitimate trades, scams, bad prices, town taxes, upkeep, death, warfare, or other normal gameplay.",
  "Money or items lost because of a confirmed server/plugin failure may be restored at administrator discretion when sufficient evidence exists.",
  "Duplication, infinite-money loops, shop exploits, bank exploits, negative-balance exploits, rounding exploits, or any other unintended economy-generation method must be reported immediately and must not be used.",
];

const adminRules = [
  "Admins must not use administrative powers to provide themselves, their town, their nation, their allies, or their friends with an unfair gameplay advantage.",
  "Administrative tools such as creative mode, teleportation, WorldEdit, WorldGuard, inventory editing, economy commands, vanish, rollback tools, and bypass permissions are for legitimate administrative purposes.",
  "Admins who participate normally in politics, towns, nations, trading, or PvP must separate their player role from their administrative role.",
  "Admins may use CoreProtect and other server logs to investigate theft, griefing, exploits, suspicious transactions, destruction, or other rule violations.",
  "CoreProtect records and server logs may be treated as evidence when resolving disputes.",
  "Admins should not reveal information obtained through administrative tools, logs, hidden player locations, vanish, spectator mode, or console access to benefit a player or political faction.",
  "Administrative intervention in active wars should generally be limited to rule enforcement, technical failures, exploits, or situations where server integrity is threatened.",
  "Admins should not reverse legitimate territorial, economic, PvP, or war outcomes merely because the result is unpopular.",
  "Rollbacks should generally be reserved for griefing that violates the rules, exploits, server/plugin failures, lag-related destruction, or other situations where the damage was not a legitimate gameplay outcome.",
  "If a plugin error materially affects a battle, siege, economy transaction, town, or nation, administrators may pause the relevant activity while determining a fair resolution.",
  "Admins may freeze, remove, or modify abusive claims when those claims clearly violate the anti-claim-blocking rules.",
  "Admins may intervene where towns deliberately avoid nation status despite clearly functioning collectively as a nation, as described in the War System rules.",
  "Punishments may include warnings, item removal, money removal, rollback, temporary bans, permanent bans, town/nation penalties, or other measures proportionate to the violation.",
  "Permanent bans should generally be reserved for severe offenses such as intentional lag machines, serious hacking, malicious exploitation, repeated ban evasion, or other major threats to server integrity.",
  "Players may appeal administrative decisions through the appropriate Discord channel.",
  "Admins should document significant interventions involving wars, nation borders, large rollbacks, major economic corrections, or permanent bans so that decisions can be reviewed later.",
  "Admins are responsible for enforcing the rules consistently regardless of the town, nation, or player involved.",
];

const howWarStarts = [
  "Declaring war in Discord does not automatically begin the war in Minecraft. The Discord declaration satisfies the server rules; afterward, the attacking nation must begin a siege through SiegeWar.",
  "Only a nation can initiate a normal conquest siege. A standalone town cannot attack another town through SiegeWar.",
  "The attacking side consists of the attacking nation and its allies. The defending side consists of the targeted town, its nation, and its allies.",
  "Before participating in a siege, players should be assigned military ranks. Nation leaders use /n rank add <player> <rank>. Town mayors can assign Guard with /t rank add <player> guard.",
  "Nation military ranks are Private, Sergeant, Lieutenant, Captain, Major, Colonel, and General. Military-ranked players can earn Battle Points. Generals can initiate and abandon sieges and carry out post-war occupation/plunder actions.",
  "To begin a siege, the attacking nation's King or General travels to the enemy town border, stands in wilderness outside the town claim, and places a non-white banner near the town.",
  "Under the default SiegeWar schedule, new sieges are initiated on Thursday and prepare for weekend Battle Sessions. The server's configured schedule takes precedence if it has changed.",
  "When the siege begins, the attacking nation must fund a War Chest. By default this costs $20 for every townblock owned by the town being attacked.",
  "A nation may have a maximum of three offensive sieges simultaneously under the default configuration.",
];

const siegeMechanics = [
  "A SiegeWar siege is a long-term Capture the Flag battle centered around the Siege Banner.",
  "Town protections continue functioning during sieges. Towns cannot normally be looted or destroyed merely because they are under siege.",
  "During an active Battle Session, the area around the Siege Banner becomes the Siege Zone. By default, PvP protections are removed within 300 blocks of the banner.",
  "A full siege contains seven Battle Sessions, normally spread across the weekend. Each Battle Session lasts one hour.",
  "Official siege participants contest the Siege Banner. A military-ranked player captures it by staying close to it for the configured capture time, documented by default as 7 minutes.",
  "Once your team controls the banner, it continuously generates Battle Points. The documented default is 30 Battle Points per minute per player on the Banner Control List.",
  "Taking banner control away from the enemy is a Banner Control Reversal. By default, a reversal gives the reversing side a 3x boost to timed Battle Point generation.",
  "Killing an enemy military-ranked siege participant inside the Siege Zone awards Battle Points. The documented default is 150 Battle Points.",
  "Players killed inside a Siege Zone do not normally drop equipment. Their equipment suffers durability degradation; the documented default is 5%.",
  "Players can monitor a siege with /sw hud <town>. Town and nation information screens also display siege information with /t <town> and /n <nation>.",
  "During a Battle Session, /sw spawn <town> can teleport eligible teammates to a qualified Battle Commander. This is a special battlefield mechanic, not ordinary player-to-player teleportation.",
];

const siegeOutcomes = [
  "After all seven Battle Sessions have occurred, SiegeWar uses the final Siege Balance to determine the winner.",
  "For a normal conquest siege, attacker victory means the Siege Balance is above 0. Defender victory means the Siege Balance is below 1.",
  "If defenders win, the defending side receives the War Chest, the town remains under its existing political control, and the town receives post-siege immunity.",
  "If attackers win, the attacking side receives the War Chest and may plunder and/or capture the town.",
  "The attacking side can abandon its siege by placing an all-white banner in the wilderness near the besieged town. Defenders can surrender the same way near the town.",
  "After winning as the attacker, an authorized King or General can plunder by placing a chest in the wilderness near the town. The documented default plunder amount is $40 per townblock.",
  "A victorious nation can capture a defeated town by placing another non-white banner in wilderness near the town. Nation capitals cannot be captured this way.",
  "Occupation does not erase the defeated town. The town continues existing with its residents, structures, claims, mayor, and internal community, but it is politically occupied by the victorious nation.",
  "The mayor of an occupied town can attempt to break free by starting a Revolt Siege with a non-white banner outside the town.",
  "After a completed siege, towns receive Siege Immunity. The documented default is 7 days for a normal town and 14 days for a nation capital.",
];

const quickFlow = [
  "Declare war in the Discord war-declarations channel.",
  "Prepare your nation's soldiers and assign military ranks.",
  "King or General travels to the enemy town.",
  "Place a non-white banner in wilderness beside the enemy town.",
  "SiegeWar creates the siege and War Chest.",
  "Battle Sessions occur.",
  "Attackers and defenders fight for the Siege Banner and kill enemy soldiers to earn Battle Points.",
  "Battle Points affect the overall Siege Balance.",
  "After the final Battle Session, SiegeWar determines the winner.",
  "Defender wins: town remains free. Attacker wins: attackers may plunder and/or occupy the town.",
  "Occupied towns may later attempt a Revolt Siege.",
];

const pluginHelp = [
  {
    id: "movecraft-help",
    title: "Movecraft Help",
    icon: Waves,
    points: [
      "Pilot a craft with /pilot <craft type>, or right-click a craft sign whose first line is the craft type.",
      "Use a Release sign, or the release command available on the server, before modifying or parking a craft near other blocks.",
      "Common movement signs include Cruise: OFF, [Helm], Ascend: OFF, and Descend: OFF.",
      "Craft types, speeds, and allowed signs are server-configured. Ask staff if a design will not pilot.",
    ],
  },
  {
    id: "towny-help",
    title: "Towny Help",
    icon: Shield,
    points: [
      "Create a town with /t new <name>, then use /t claim to claim the townblock where you stand.",
      "Invite players with /t invite <player> and check costs with /towny prices.",
      "Create a nation with /n new <name> once your town meets the server requirement of at least 3 people.",
      "Use /t help, /n help, /t here, and /towny map to inspect land, residents, and borders.",
    ],
  },
  {
    id: "siegewar-help",
    title: "SiegeWar Help",
    icon: Swords,
    points: [
      "Declare the war in Discord before starting the in-game siege.",
      "Assign military ranks with /n rank add <player> <rank> or /t rank add <player> guard.",
      "A King or General starts a conquest siege by placing a non-white banner in wilderness near the target town.",
      "Track the fight with /sw hud <town>; use /sw spawn <town> only when the Battle Commander conditions are met.",
    ],
  },
];

const ruleSections = [
  { id: "player-rules", title: "Player Rules", icon: Shield, items: playerRules, ordered: true },
  { id: "plugins", title: "Plugins", icon: Anchor, items: pluginRules },
  { id: "war-system", title: "War System", icon: Flag, items: warRules },
  { id: "towny-nation-system", title: "Towny/Nation System", icon: Map, items: townyNationRules },
  { id: "economy", title: "Economy", icon: ScrollText, items: economyRules },
  { id: "admin-rules", title: "Admin Rules And Responsibilities", icon: Shield, items: adminRules },
  { id: "how-war-starts", title: "How War Starts", icon: Flag, items: howWarStarts },
  { id: "siege-mechanics", title: "How Sieges Work", icon: Swords, items: siegeMechanics },
  { id: "siege-outcomes", title: "Ending A Siege", icon: Flag, items: siegeOutcomes },
  { id: "war-flow", title: "War Flow In Short", icon: ScrollText, items: quickFlow, ordered: true },
];

const navItems = [
  ...ruleSections.map(({ id, title }) => ({ id, title })),
  { id: "plugin-help", title: "Plugin Help" },
];

function RuleList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";

  return (
    <List className={ordered ? "space-y-3 text-sm leading-relaxed text-white/70" : "space-y-3 text-sm leading-relaxed text-white/70"}>
      {items.map((item) => (
        <li
          key={item}
          className={ordered ? "ml-5 list-decimal pl-2 marker:text-primary/90" : "ml-5 list-disc pl-2 marker:text-primary/90"}
        >
          {item}
        </li>
      ))}
    </List>
  );
}

export default function Rules() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <img
        src="/media/rtsg-nations-hero.png"
        alt=""
        className="fixed inset-0 h-full w-full object-cover opacity-40"
        aria-hidden="true"
      />
      <div className="fixed inset-0 bg-black/72" aria-hidden="true" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.54) 0%, rgba(0,0,0,0.82) 36%, rgba(0,0,0,0.96) 100%)",
        }}
      />

      <main className="container relative z-[1] max-w-7xl py-8 sm:py-12">
        <section className="mb-10 max-w-4xl">
          <Link href="/minecraft" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-red-300">
            <ScrollText className="h-4 w-4" />
            RTSG Nations
          </Link>
          <h1 className="text-4xl font-bold leading-tight tracking-normal text-white sm:text-6xl">
            Server Rules
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            The core rules for RTSG Nations, organized for quick reference during play.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <Button className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto">
                Join Discord
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <a href={DYNMAP_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="h-11 w-full rounded-lg border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
              >
                View Dynmap
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <nav className="rounded-lg border border-white/10 bg-black/50 p-3 backdrop-blur-xl">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                On This Page
              </p>
              <div className="grid gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-md px-2 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          <div className="space-y-6">
            {ruleSections.map(({ id, title, icon: Icon, items, ordered }) => (
              <section
                key={id}
                id={id}
                className="scroll-mt-32 rounded-lg border border-white/10 bg-black/50 p-5 backdrop-blur-xl sm:p-7"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <h2 className="text-2xl font-bold tracking-normal text-white">{title}</h2>
                </div>
                <RuleList items={items} ordered={ordered} />
              </section>
            ))}

            <section id="plugin-help" className="scroll-mt-32">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10">
                  <Anchor className="h-5 w-5 text-primary" />
                </span>
                <h2 className="text-2xl font-bold tracking-normal text-white">Plugin Help</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {pluginHelp.map(({ id, title, icon: Icon, points }) => (
                  <article key={id} id={id} className="scroll-mt-32 rounded-lg border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <RuleList items={points} />
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
