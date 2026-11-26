/** A session sign-up message exactly as it is shared, including its header and unused slots. */
export const SIGN_UP_MESSAGE = `Nov 23 Monday
7 to 10pm

1. Joseph
2. Aldritch (Carl QM+1)
3. Carl - QM
4. Stef
5. Glen
6. Eric
7. Carl
8. Ivan
9. Isa
10. Kor
11. Nico (Kor +1)
12. Regi
13. Bee
14. Mike
15. Zian
16. Gabs (Chris+2)
17. Judie (Glen +1)
18. Chris
19. Matt (Chris +1)
20. Ben
21. Jonathan
22. Alyssa
23. 
24.`;

export const HEADER_LINES = ['Nov 23 Monday', '7 to 10pm'];

/** Just the numbered list, which is what gets pasted to start a session. */
export const PLAYER_LIST = SIGN_UP_MESSAGE.slice(SIGN_UP_MESSAGE.indexOf('1. '));

/** The 22 names in sign-up order. */
export const PLAYERS = PLAYER_LIST.split('\n')
  .map((line) => line.replace(/^\d+\.\s*/, '').trim())
  .filter(Boolean);

/** Players signed up as somebody's guest, e.g. "Nico (Kor +1)". */
export const GUESTS = PLAYERS.filter((name) => /\+\d/.test(name));

/** The list split into groups of four: five full groups and one pair. */
export const GROUPS = Array.from({ length: Math.ceil(PLAYERS.length / 4) }, (_, i) =>
  PLAYERS.slice(i * 4, i * 4 + 4),
);
