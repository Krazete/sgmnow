# Skullgirls Mobile Live Schedule

A site to quickly check current events and score histories in Skullgirls Mobile.

<img src="preview.png">

Powered by my [SGM Score Cutoffs](https://docs.google.com/spreadsheets/d/1hpmUc__uYo0-tq10tampy7CDIfALn6N5_sMELTBlTOs/edit#gid=814198727) sheet and [Google Chart API](https://developers.google.com/chart).

The website automatically updates at SGM's reset time whether refreshed or not.
This is possible despite normal API staleness due to an Apps Script trigger which forces the sheet to update at reset time every day, which in turn forces the API to make a fresh request.

Scheduling errors or delays may occur due to certain game updates or Daylight Saving Time offsets.

<details>
<summary>Concerns</summary>
There are several ways for this website to fail.

- Google could shut down their old Chart API.
- Scheduling precision may be lost if Apps Script fails.
- The chain of dependency could break.
  - Score data depends on the SGM Score Cutoffs sheet.
  - Sheet data depends on another Apps Script script.
  - The script depends on the Score Reports forum thread.
  - The thread depends on the developers (mainly Cellsai).
- Timezones may be misaligned (most likely due to DST).
  - The game's reset time is in PT.
  - The sheet is set to "(GMT-08:00) Pacific Time".
    - This is probably a display error. As of this note, the sheet correctly displays time in PDT (GMT-07:00).
  - The scripts are set to "(GMT-07:00) Pacific Time - Los Angeles".
  - The site is in local time.
  - The site also uses the built-in Intl library to check if PT is currently PST or PDT.
</details>
