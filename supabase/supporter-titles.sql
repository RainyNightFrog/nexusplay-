-- Supporter subscription titles (not tied to achievements)
insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, null
from (
  values
    ('平台支持者', 'title-supporter-v1', 'common'),
    ('熱心支持者', 'title-supporter-v2', 'rare')
) as v(name, css_class, rarity_tier)
where not exists (
  select 1
  from public.titles t
  where t.name = v.name
);
