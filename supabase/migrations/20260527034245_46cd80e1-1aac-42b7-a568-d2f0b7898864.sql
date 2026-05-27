
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'program';
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS unlock_hint text;

DELETE FROM public.badges;

INSERT INTO public.badges (slug, name, description, icon, tier, sort_order, xp_reward, category, unlock_hint) VALUES
('first-drop','First Drop','Logged your first blood sugar reading.','💧','bronze',1,5,'program','Log your first blood sugar reading'),
('full-plate','Full Plate','Logged your first compliant meal.','🍽️','bronze',2,10,'program','Log one fully compliant plate'),
('hydrated','Hydrated','First day water goal hit.','🥤','bronze',3,15,'program','Close the water ring once'),
('week-one-warrior','Week One Warrior','7-day streak achieved.','🔥','silver',4,50,'program','Maintain a 7-day streak'),
('move-it','Move It','First workout completed.','🏃','bronze',5,20,'program','Complete your first workout'),
('14-day-foundation','14-Day Foundation','Phase 1 complete.','🏗️','silver',6,75,'program','Complete Phase 1 (Day 14)'),
('night-faster','Night Faster','First intermittent fast completed.','🌙','silver',7,30,'program','Unlock IF and complete one fast'),
('a1c-entry','A1C Entry','First A1C value recorded.','🧪','bronze',8,20,'program','Enter your first A1C result'),
('dropping','Dropping','A1C decreased from a previous reading.','📉','gold',9,50,'program','Lower your A1C from any prior reading'),
('pre-diabetic-zone','Pre-Diabetic Zone','First fasting reading in pre-diabetic range.','🎯','silver',10,30,'program','Log a fasting reading 100–125 mg/dL'),
('normal-zone','Normal Zone','First fasting reading in normal range.','✅','gold',11,75,'program','Log a fasting reading under 100 mg/dL'),
('thirty-day-streak','30-Day Streak','30 consecutive days all rings closed.','⚡','gold',12,150,'program','Reach a 30-day streak'),
('weight-milestone','Weight Milestone','First 5% body weight reduction.','⚖️','gold',13,100,'program','Lose 5% of starting body weight'),
('full-house','Full House','7 days all 4 rings closed.','🏠','silver',14,75,'program','Close all 4 rings for 7 days straight'),
('freeze-earned','Freeze Earned','First streak freeze earned.','🛡️','silver',15,40,'program','Reach a 14-day streak'),
('month-1-complete','Month 1 Complete','30-day measurement submitted.','📏','silver',16,50,'program','Submit your Month 1 measurement'),
('90-day-warrior','90-Day Warrior','Month 3 measurement submitted.','🏆','gold',17,100,'program','Submit your Month 3 measurement'),
('cheat-and-fast','Cheat and Fast','First cheat meal + fast logged immediately after.','🍕','silver',18,30,'program','Log a cheat meal then an IF window'),
('full-6-months','Full 6 Months','Month 6 measurement submitted.','💎','gold',19,200,'program','Submit your Month 6 measurement'),
('first-question','First Question','First question posted in community.','❓','bronze',101,5,'community','Post your first question in Ask'),
('helper','Helper','Your answer was marked helpful.','🤝','silver',102,15,'community','Have an answer marked helpful'),
('voice-of-the-community','Voice of the Community','5 questions received DRM admin responses.','📢','gold',103,75,'community','5 questions with admin responses'),
('day-90-wisdom','Day 90 Wisdom','Answered a question while at Day 90.','🌿','silver',104,30,'community','Answer a question at Day 90'),
('day-180-wisdom','Day 180 Wisdom','Answered a question while at Day 180.','🌳','silver',105,40,'community','Answer a question at Day 180'),
('day-270-wisdom','Day 270 Wisdom','Answered a question while at Day 270.','🌲','gold',106,50,'community','Answer a question at Day 270'),
('featured','Featured','Your question was selected Question of the Day.','⭐','gold',107,50,'community','Have your question chosen QotD'),
('win-sharer','Win Sharer','Posted first achievement win.','🎉','bronze',108,15,'community','Post your first win');

ALTER TABLE public.daily_actions DROP CONSTRAINT IF EXISTS daily_actions_action_type_check;
ALTER TABLE public.daily_actions ADD CONSTRAINT daily_actions_action_type_check
  CHECK (action_type = ANY (ARRAY['education'::text,'habit'::text,'challenge'::text,'reflection'::text,'measurement'::text,'extension'::text]));

INSERT INTO public.daily_actions
  (phase_number, day_number, day_name, action_type, action_title, action_description, learning_objective, is_extension_day, sub_tasks, action_detail_content)
VALUES
 (1, 15, 'E1', 'extension', 'Label Reads', 'Read the nutrition label on every packaged food you ate today. What did you find?', 'Build awareness of hidden sugars and serving sizes.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 16, 'E2', 'extension', 'Protein Audit', 'Measure your protein portion at every meal. Is it really 25% of the plate?', 'Calibrate visual portion sizing for protein.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 17, 'E3', 'extension', 'Sugar Hunt', 'Find and name every source of added sugar in your house. Remove or replace them.', 'Eliminate environmental sugar triggers.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 18, 'E4', 'extension', 'No-Drink Day', 'Water only today. No juice, no sodas, no sweetened teas. Just water.', 'Reset liquid calorie habits.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 19, 'E5', 'extension', 'Eat Slowly', 'Put your fork down between every bite at every meal today.', 'Practice satiety awareness.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 20, 'E6', 'extension', 'Full Plate Every Meal', 'Three fully compliant plates today. No shortcuts. Prove you own this skill.', 'Demonstrate mastery of the plate method.', true, '[]'::jsonb, '{}'::jsonb),
 (1, 21, 'E7', 'extension', 'Reflection', 'Write 3 things you learned about your eating habits in the past 21 days.', 'Consolidate insights from the extension.', true, '[]'::jsonb, '{}'::jsonb);
