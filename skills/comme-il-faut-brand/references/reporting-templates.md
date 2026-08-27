# Comme Il Faut — Reporting Templates & Hebrew Phrasing Bank

## Standard Report Structure (Hebrew, for Modus/Jo)

### Document Setup
- **Format**: .docx, Modus Digital logo header
- **Direction**: RTL Hebrew throughout (`rightToLeft: true`, `bidirectional: true`, `AlignmentType.RIGHT`)
- **Font**: Frank Ruhl Libre or David (Hebrew-friendly)
- **Tone**: Professional, direct, clear recommendations

---

### Section 1: Executive Summary (סיכום מנהלים)
One page max. Include:
- Period covered
- Key metric vs. target (revenue, ROAS, return rate)
- Top 1-2 wins
- Top 1-2 concerns
- Single most important recommendation

### Section 2: Performance Overview (סקירת ביצועים)

**Table structure:**
| מדד | Meta (מדווח) | Shopify (אמיתי) | שינוי vs. תקופה קודמת |
|---|---|---|---|
| רכישות | X | Y | ±Z% |
| הכנסה | ₪X | ₪Y | ±Z% |
| ROAS | X | Y (מתוקן) | — |
| CTR | X% | — | ±Z% |

**Always include attribution note:**
> ⚠️ פער ייחוס: Meta מדווח בממוצע כ-47% פחות רכישות מהנתונים בפועל ב-Shopify. ה-Source of Truth הוא Shopify.

### Section 3: Creative Performance (ביצועי קריאייטיב)

**Winners table:**
| שם מודעה | הוצאה | רכישות | ROAS | CTR | המלצה |
|---|---|---|---|---|---|
| [name] | ₪X | Y | Z | W% | להמשיך / להעלות תקציב |

**Losers / Zero-conversion table:**
| שם מודעה | הוצאה | רכישות | סטטוס | המלצה |
|---|---|---|---|---|
| [name] | ₪X | 0 | ⚠️ אפס המרות | להשהות מיד |

### Section 4: Category Analysis (ניתוח קטגוריות)
- Revenue by category (footwear vs. apparel vs. accessories)
- Return rate by category (flag pants/jeans)
- ROAS by category

### Section 5: Google Ads Status (סטטוס גוגל)
- Impressions, Clicks, Cost, Conversions
- PMax conversion tracking status
- CPA if conversions exist

### Section 6: Recommendations (המלצות לפעולה)

Numbered, prioritized:
1. **דחוף** — [action] because [reason]
2. **השבוע** — [action]
3. **לחודש הבא** — [action]

---

## Hebrew Phrasing Bank

### Attribution Warning Phrases
- "הנתונים ב-Shopify הם ה-Source of Truth — Meta מדווח פחות בשל פערי ייחוס מבניים"
- "פער של כ-47% בין Meta ל-Shopify הוא נורמלי ומוכר — המספרים האמיתיים גבוהים יותר"

### Zero-Conversion Alert
- "מודעה זו הוציאה ₪X ולא הניבה אף רכישה — מומלץ להשהות מיד"
- "30% מהתקציב הלך למודעות ללא רכישות — נדרש ניקוי דחוף"

### Winning Ad Phrases
- "אחת ממודעות ה-Hidden Gems — ביצועים גבוהים ביחס להשקעה"
- "מומלץ להעלות תקציב ב-20–30% ולבחון scaling"

### Pants/Returns Warning
- "קטגוריית המכנסיים מציגה שיעור החזרות גבוה — חיוני לכלול מדריך מידות בכל תוכן"

### Footwear Opportunity
- "נעליים ממשיכות להוביל כ-~65% מההכנסה האונליין — לתעדף בתקציב ובקריאייטיב"

### Retargeting Strength
- "מודעות הרימרקטינג מציגות ROAS גבוה בעקביות — מומלץ להגדיל ל-25% מהתקציב הכולל"

### Technical Funnel Alert
- "יחס גבוה של הוספות לעגלה מול רכישות מצביע על בעיה טכנית — לבדוק פיקסל ו-checkout לפני שינוי קריאייטיב"

---

## Daily/Weekly Quick-Check Framework

```
יומי:
□ בדוק הוצאה vs. יעד
□ מודעות עם אפס רכישות ב-48+ שעות — השהה
□ ROAS כולל vs. יעד

שבועי:
□ Pull Supermetrics data (Meta + Google)
□ Cross-reference Shopify export
□ Top 3 winners / Bottom 3 (flag zero-conversion)
□ Creative fatigue check (CTR drop on existing ads)
□ Retargeting ROAS check

חודשי:
□ Full performance report (Hebrew .docx)
□ Category breakdown incl. return rates
□ Creative scorecard + scaling decisions
□ Google Ads conversion tracking status
```

---

## Supermetrics Query Reference

### Meta Ads
- `ds_id: FA`
- Account: `act_2331987126909924`
- Key metrics: `offsite_conversions_fb_pixel_purchase`, `offsite_conversion_value_fb_pixel_purchase`, `website_purchase_roas`, `link_CTR`
- Date pattern: `date_range_type: custom`, `start_date`/`end_date` YYYY-MM-DD, `timezone: Asia/Jerusalem`

### Google Ads
- `ds_id: AW`
- Account: `3094622943`
- Key fields: `Impressions`, `Clicks`, `Cost`, `Conversions`, `ConversionValue`, `ROAS`, `Currencycode`

### Query Pattern
1. Submit query → receive `schedule_id`
2. Poll `get_async_query_results` with schedule_id
3. Wait for status = complete
4. Parse results

### Always use field_discovery first for new queries:
```
Supermetrics:field_discovery ds_id: FA, field_type: metric
```
