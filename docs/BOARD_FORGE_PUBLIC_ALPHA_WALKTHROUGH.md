# BoardForge Public Alpha Walkthrough

1. Open the BoardForge website.
2. Pair the browser with the installed local BoardForge engine.
3. Run setup checks for KiCad, local engine status, and available supplier credentials.
4. Start with New Board, Custom Board Generator, or Import KiCad Project.
5. Approve the board brief before local project creation.
6. Use the dashboard to run Make Manufacturable.
7. Use the sourcing command center to run Make Sourcable when supplier credentials are configured.
8. Review DRC/ERC, sourcing, routeability, import-protection, and package reports.
9. Download clearly labeled artifacts and manufacturing packages only when evidence supports them.
10. Publish demo/project evidence only through the approved publish gate.

## Demo Path

Try Demo -> robotics controller -> Make Manufacturable -> Make Sourcable -> Evidence -> Downloads.

## What Users Should Understand

BoardForge is a command center connected to a local KiCad engine. The website does not secretly run arbitrary KiCad changes in the browser, and it does not claim supplier stock without live or cached evidence.
