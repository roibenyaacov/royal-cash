-- ============================================
-- מה קורה שם — טבלה אחת, שאילתה אחת.
--
-- זו לא מיגרציה: היא לא יוצרת כלום, לא משנה כלום, רק קוראת.
-- להדביק ב-Supabase SQL Editor ולהריץ. אפשר להריץ כמה פעמים שרוצים.
--
-- עמודת "פער" היא יציאות פחות כניסות. בשולחן שהסתדר היא 0; כל דבר אחר
-- אומר שהז'יטונים על המסך לא תאמו את הכסף, וזה הדבר הראשון לבדוק
-- כשחישוב נראה מוזר.
-- ============================================

SELECT
  gr.name                                   AS "חבורה",
  g.name                                    AS "שולחן",
  g.date                                    AS "תאריך",
  CASE
    WHEN g.status = 'active'        THEN 'פתוח — עוד משחקים'
    WHEN g.finalized_at IS NOT NULL THEN 'נסגר ונשמר'
    ELSE                                 'נסגר — לא נשמר'
  END                                       AS "מצב",
  m.players                                 AS "שחקנים",
  m.pot                                     AS "קופה",
  m.cashed_out                              AS "יצא",
  m.cashed_out - m.pot                      AS "פער",
  m.expenses                                AS "הוצאות",
  COALESCE(p.full_name, p.email)            AS "מי פתח",
  m.last_action                             AS "פעולה אחרונה",
  g.id                                      AS "מזהה שולחן"
FROM public.games g
JOIN public.groups gr        ON gr.id = g.group_id
LEFT JOIN public.profiles p  ON p.id  = g.created_by
LEFT JOIN LATERAL (
  SELECT
    (SELECT COUNT(DISTINCT b.player_id)
       FROM public.buy_ins b   WHERE b.game_id = g.id)::int         AS players,
    (SELECT COALESCE(SUM(b.amount), 0)
       FROM public.buy_ins b   WHERE b.game_id = g.id)::int         AS pot,
    (SELECT COALESCE(SUM(c.amount), 0)
       FROM public.cash_outs c WHERE c.game_id = g.id)::int         AS cashed_out,
    (SELECT COALESCE(SUM(e.amount), 0)
       FROM public.expenses e  WHERE e.game_id = g.id)::int         AS expenses,
    -- מתי נגעו בשולחן בפעם האחרונה, ולא רק מתי נפתח
    GREATEST(
      g.created_at,
      COALESCE(g.closed_at, g.created_at),
      COALESCE((SELECT MAX(b.created_at) FROM public.buy_ins b   WHERE b.game_id = g.id), g.created_at),
      COALESCE((SELECT MAX(c.updated_at) FROM public.cash_outs c WHERE c.game_id = g.id), g.created_at),
      COALESCE((SELECT MAX(e.created_at) FROM public.expenses e  WHERE e.game_id = g.id), g.created_at)
    )                                                               AS last_action
) m ON TRUE
ORDER BY m.last_action DESC
LIMIT 50;
