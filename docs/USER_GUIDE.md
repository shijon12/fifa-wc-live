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

If AI is configured, enter the shared AI access code and select **Generate AI forecast**. The code is stored only in `sessionStorage`, so it is cleared when the browser session ends.

## AI prediction tracker

Before a match is complete:

1. Open the match center.
2. Enter the shared AI access code.
3. Select **Generate AI prediction**.

The generated forecast contains outcome probabilities, predicted score, confidence, summary, and supporting factors. It is saved in the current browser.

Open **Predictions** to see saved forecasts and accuracy. Once a tracked match has a final score, the application marks the predicted outcome as correct or missed.

AI forecasts:

- Require an enabled OpenAI API key and credits
- Are probabilistic
- Use only the live match and standings context supplied by the application
- Are not betting advice

## Mobile use

The navigation becomes a compact two-row grid on phones. Wide tables and the bracket scroll inside their own panels without widening the entire page.

If an older mobile layout is cached after a deployment, close and reopen the tab or perform a hard refresh.
