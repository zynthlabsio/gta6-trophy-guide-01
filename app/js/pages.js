// pages.js — renders the Roadmap to Platinum and the Missables pages.
//
// Both pages are built from the official descriptions in trophies.json, not
// from a second data file: the roadmap groups trophies by their stage, and
// the missables page lists every trophy flagged missable, with the story
// trophies' safety notes alongside.

import { stageOf, tallyByKind } from './filtering.js';
import { gradeBadge } from './listview.js';

const STAGES = [
  {
    stage: 1,
    title: 'Story',
    time: 'About 60–80 hours',
    blurb:
      'Play the five chapters in order and take optional missions as they appear. Scan vehicles with the WAiNK app and study animals with the binoculars as you go — that progress already counts toward the 100% checklist. Keep a manual save at the start and end of each chapter: there is no mission replay. The one thing to do before Chapter 1 ends is the morning meditation at Jason’s house (see Missables).',
  },
  {
    stage: 2,
    title: 'Side quests & activities',
    time: 'During the story and just after',
    blurb:
      'Finish the character questlines — Andy, Kenton, Billy, Randy, Tyrone and Bret — plus the Strangers & Freaks strands, the 9 activity types, the 42 shooting-range gold medals, the 14 drone-race locations and 20 race wins. Everything here stays available in free-roam after the story, so nothing is urgent; do it as it appears and mop up the rest later.',
  },
  {
    stage: 3,
    title: 'The 100% checklist grind',
    time: 'About 100 hours',
    blurb:
      'After the credits the checklist opens under Progress > Stats > 100% Completion. It is lenient — closer to 60% true completion — but it is still the long pole of the platinum: 200 of 277 vehicles, 100 of 255 animals, 70 of 80 challenges, 300 of 397 stunts, 15 of 18 card sets and meditations, all 39 gang operations, all 8 bank vaults, 22 bank jobs, 34 smash ’n’ grabs and 50 stick-ups. Most of the grind trophies in this stage pop on the way there.',
  },
  {
    stage: 4,
    title: 'Cleanup & platinum',
    time: 'About 10 hours',
    blurb:
      'Whatever is left: the one-off stunts and easter eggs, the criminal-profile count, the last card sets and garages. When A Long Road (100%) pops, the platinum — Vice Got a Price! — follows immediately. Sources: PowerPyx GTA 6 Trophy Guide & Roadmap; Push Square 100% Completion Checklist.',
  },
];

function stageTrophyLine(trophy, earnedIds) {
  const item = document.createElement('li');
  const mark = document.createElement('span');
  mark.className = 'earned-mark';
  mark.textContent = earnedIds.has(trophy.id) ? '✓ ' : '○ ';
  item.appendChild(mark);
  item.appendChild(document.createTextNode(`${trophy.name} — ${trophy.description}`));
  return item;
}

// The roadmap: four stage cards, each with its trophies and earned counts.
export function renderRoadmap(container, trophies, earnedIds) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Roadmap to the Platinum — “Vice Got a Price!”';
  container.appendChild(heading);
  const intro = document.createElement('p');
  intro.className = 'intro';
  intro.textContent =
    'PowerPyx rates the set 4/10 and about 200 hours: one playthrough, no online trophies, no difficulty settings. The order below is built from the official descriptions — story chapters first, then side content, then the 100% checklist grind, then cleanup. Tick trophies off in the checklist and the counts here follow along.';
  container.appendChild(intro);

  const list = document.createElement('ol');
  list.className = 'stage-list';
  for (const stage of STAGES) {
    const members = trophies.filter((trophy) => stageOf(trophy) === stage.stage);
    const earned = members.filter((trophy) => earnedIds.has(trophy.id)).length;
    const card = document.createElement('li');
    card.className = 'stage-card';
    const title = document.createElement('h3');
    title.textContent = `${stage.title} — ${earned} of ${members.length} earned`;
    card.appendChild(title);
    const time = document.createElement('p');
    time.className = 'stage-time';
    time.textContent = stage.time;
    card.appendChild(time);
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    card.appendChild(blurb);
    const trophyList = document.createElement('ul');
    trophyList.className = 'stage-trophies';
    for (const trophy of members) trophyList.appendChild(stageTrophyLine(trophy, earnedIds));
    card.appendChild(trophyList);
    list.appendChild(card);
  }
  container.appendChild(list);
}

// The missables page: every flagged trophy, plus what is safe to leave.
export function renderMissables(container, trophies, earnedIds) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Missable trophies';
  container.appendChild(heading);

  const flagged = trophies.filter((trophy) => trophy.missable);
  const banner = document.createElement('div');
  banner.className = 'missable-banner';
  const bannerTitle = document.createElement('strong');
  bannerTitle.textContent =
    flagged.length === 1
      ? 'Only 1 trophy is flagged as potentially missable.'
      : `${flagged.length} trophies are flagged as potentially missable.`;
  banner.appendChild(bannerTitle);
  banner.appendChild(document.createTextNode(
    ' PowerPyx flags a single trophy, and only as a maybe. Everything else on the list can be finished in free-roam after the story — but keep chapter saves anyway, because there is no mission replay.',
  ));
  container.appendChild(banner);

  const list = document.createElement('ul');
  list.className = 'trophy-list';
  for (const trophy of flagged) {
    const row = document.createElement('li');
    row.className = 'trophy-row';
    const earned = earnedIds.has(trophy.id);
    if (earned) row.classList.add('is-earned');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = earned;
    checkbox.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    checkbox.addEventListener('change', () => {
      // The missables page is a read of the same store: toggling here must
      // reach boot.js, so it dispatches the same event the checklist uses.
      document.dispatchEvent(new CustomEvent('trophy-toggle', {
        detail: { id: trophy.id, checked: checkbox.checked },
      }));
    });
    row.appendChild(checkbox);
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = trophy.name;
    body.appendChild(name);
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = trophy.description;
    body.appendChild(desc);
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = trophy.guide;
    body.appendChild(guide);
    row.appendChild(body);
    row.appendChild(gradeBadge(trophy.grade));
    list.appendChild(row);
  }
  container.appendChild(list);

  const safe = document.createElement('div');
  safe.className = 'safe-note';
  const safeTitle = document.createElement('strong');
  safeTitle.textContent = 'Not missable — but save anyway';
  safe.appendChild(safeTitle);
  safe.appendChild(document.createTextNode(
    ' Story trophies (the chapter trophies, the final mission, Breakfast Run, The Cartel Heist, Child’s Play, Headliners, VCIA Takedown, Operation Savage Glory) unlock automatically and cannot be missed. Character questlines (Andy, Kenton, Billy, Randy, Tyrone, Bret) stay available after the story, and quest givers who vanish mid-story return later. Source: PowerPyx GTA 6 Trophy Guide & Roadmap.',
  ));
  container.appendChild(safe);

  const counts = tallyByKind(trophies, earnedIds);
  const footnote = document.createElement('p');
  footnote.className = 'intro';
  footnote.textContent =
    `Across the list: ${counts.story.earned} of ${counts.story.total} story, ` +
    `${counts.collectibles.earned} of ${counts.collectibles.total} collectibles, ` +
    `${counts.activities.earned} of ${counts.activities.total} activities earned.`;
  container.appendChild(footnote);
}
