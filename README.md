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

- Score data depends on the cutoffs sheet, which depends on the Score Reports forum thread, which depends on Cellsai.
- Schedule precision depends on an old API and a hacky workaround.
- The cutoffs sheet is in PT (GMT-8). Apps Script is in PT (GMT-7). The site uses both UTC and local time. DST surely affects some of these too, but I'm not sure which or how.
</details>
