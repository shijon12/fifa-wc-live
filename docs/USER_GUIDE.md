# User guide

This guide explains the features visible in the deployed application.

## Dashboard

Open `/` to see:

- The next scheduled match or latest result
- Tournament totals
- Today’s matches, or upcoming matches when none are scheduled today
- All group standings
- The best third-place ranking
- The knockout bracket

The page refreshes in the background every 15 seconds. A browser refresh is normally unnecessary.

## Match center

Select a fixture from the dashboard or a group/team page.

The match page can show:

- Home and away teams, score, venue, stage, and status
- Possession, shots, shots on target, corners, fouls, and cards
- Goals, cards, substitutions, and penalties
- Up to 40 recent commentary entries
- Links from timeline events to player profiles
- An optional pre-match AI forecast

Some panels remain empty until the upstream provider publishes the relevant data. A scheduled match usually has less detail than a live or completed match.

## Standings and bracket

Select a group from the dashboard for its full table and fixtures.

The dashboard also ranks all third-place teams using:

1. Points
2. Goal difference
3. Goals scored
4. Wins
5. Team name as a stable final ordering

The top eight are marked as advancing. Placeholder teams in future knockout fixtures are replaced by the upstream feed as qualification is resolved.

## Statistics and player pages

Open **Stats** to see:

- Matches completed
- Total goals
- Players used
- Teams represented
- Goals, assists, shots on target, saves, and yellow-card leaders

Select a player to open their profile. Player pages include available biography fields, tournament totals, headshot, and per-match performance data.

Headshots are resolved in this order:

1. ESPN roster image
2. TheSportsDB search result
3. Initials placeholder

## Favorites

Select the star on a team card or team page. Favorites are saved in the current browser’s `localStorage`.

Important behavior:

- Favorites do not require an account.
- They do not synchronize between devices or browsers.
- Clearing site storage removes them.
- Private/incognito storage may disappear when the window closes.

## Browser notifications

1. Follow one or more teams.
2. Open **Favorites**.
3. Select **Enable notifications**.
4. Allow notification permission in the browser prompt.
5. Confirm that the “World Cup alerts enabled” test notification appears.

The background service checks scores approximately every minute and can alert on kickoff, a score increase, and full time for favorite teams. The service worker can receive alerts after the site is closed.

On iPhone and iPad, first add the site to the Home Screen, open it from the installed icon, and then enable notifications. Browser/operating-system power saving and upstream feed timing can delay delivery.

If permission is blocked, use the browser’s site settings to reset notification permission and try again.

Select **Disable notifications** to remove the current browser subscription from the service.

## Team comparison

Open **Compare**, choose two different teams, and review:

- Group points
- Goals scored and conceded
- Goal difference
- Wins
- Form from up to five completed tournament matches

The statistical comparison works without OpenAI.

If AI is configured, a signed-in user can select **Generate AI forecast**. The forecast consumes one message from the account's daily AI allowance.

## AI prediction tracker

Before a match is complete:

1. Sign in and open the match center.
2. Select **Generate AI prediction**.

The generated forecast contains outcome probabilities, predicted score, confidence, summary, and supporting factors. It is saved in the current browser.

Open **Predictions** to see saved forecasts and accuracy. Once a tracked match has a final score, the application marks the predicted outcome as correct or missed.

AI forecasts:

- Require an enabled OpenAI API key and credits
- Require a signed-in account
- Share the controlled daily allowance with the fantasy agent
- Are probabilistic
- Use only the current match context supplied by the application
- Are not betting advice

## Multi-league prediction desk

Open **Predictions**, then select a competition from the league dropdown. The page requests fixtures only for that competition and shows its next published matches. Select a fixture and choose **Generate AI forecast**.

The three outcome cards show the estimated chance of a home win, draw, and away win. A value of 42% means approximately 42 out of 100 similar situations; it is not a payout, wager, or guarantee. The model lean and predicted scoreline summarize the most likely scenario while the explanation lists the current evidence used.

Refreshing a forecast creates another timestamped probability snapshot. The movement chart plots those real saved snapshots so users can see whether the model view changes as kickoff approaches. One snapshot appears as a single flat observation and is labeled accordingly.

## Mobile use

The navigation keeps Fantasy, private Rooms, and Matches visible as the primary journey. Statistics, predictions, followed teams, comparison, account, and informational pages remain available from the compact More menu. Wide tables and the bracket scroll inside their own panels without widening the entire page.

If an older mobile layout is cached after a deployment, close and reopen the tab or perform a hard refresh.
# Fantasy virtual agent

Open **Fantasy**, select **Squad**, and choose **Open agent**, then chat naturally. For example, ask it to build a balanced XI, find a lower-cost midfielder, replace a selected forward, review the current team, or choose a captain.

The agent uses the current fantasy player pool and can carry out multi-step searches and squad planning. Requests to build or improve an XI are executed by The Matchroom's own optimizer, which evaluates player output, reliability, discipline, value, current picks, budget, preferences, locks, exclusions, transfer limits, and captaincy. Every result then passes through a separate rules harness that checks the 100-unit budget, 11-player formation, maximum of three players from one team, and captain selection. A proposed change appears in a review card. Select **Apply proposal** to update the squad or **Dismiss** to leave it unchanged. The agent cannot save changes without this approval.

The chat requires a signed-in account plus an enabled server-side OpenAI API key and API credits. Each account receives a limited daily allowance. The OpenAI request uses `store: false`; the displayed conversation remains in the current page session and is not written to the application database. Supabase stores only the daily request count used to enforce the allowance.

# Gameweeks, transfers, substitutions, and chips

The **Squad** tab shows the open gameweek deadline, free transfers, pending transfers, and any projected point deduction. Managers receive one free transfer each gameweek and can bank up to five. Each additional transfer costs four points. Squad edits save as a draft; the final saved squad is compared with the previous gameweek at the deadline, so an edit that is reverted before the deadline is not charged.

After an account save succeeds, the page displays **Saved for GW…** with the save time and deadline-lock explanation. An offline state explicitly warns that changes are only on the current device.

Choose 11 starters, a captain, a vice-captain, and order the four substitutes with the arrow controls. After a gameweek finishes, the engine applies valid automatic substitutions in bench order, moves the vice-captain into captaincy when required, and records gross points, transfer deductions, bench points, the effective lineup, and net points in gameweek history. Official FPL event totals naturally include double-gameweek fixtures and give zero fixture points in blank gameweeks.

Wildcard, Free Hit, Bench Boost, and Triple Captain are available once in each half of the season. Only one chip can be active for a gameweek. Free Hit restores the previous permanent squad after scoring; Bench Boost scores all substitutes; Triple Captain applies a three-times multiplier.

Fantasy and prediction leaderboards are separate competitions. Fantasy rankings contain only official gameweek squad scores; prediction rankings contain only match-result pick scores.

# Private league chat

Open **Fantasy → Private leagues**, find a room, and select **Open chat**. Only signed-in members of that private league can read or send messages. The chat refreshes while open and stops requesting messages when closed.
