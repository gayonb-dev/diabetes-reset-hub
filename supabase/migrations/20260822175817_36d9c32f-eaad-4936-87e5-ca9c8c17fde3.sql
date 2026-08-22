
-- Batch 1 clinical content authority (appendix-governed). Additive/idempotent content updates only.

-- ============ 1. Daily actions: exact record replacements ============
UPDATE public.daily_actions SET action_description = 'Keep water available and take regular drinks during the day. If a healthcare professional has given you a fluid limit or different advice, follow that advice.' WHERE id = 'a040d92e-7ee5-4172-bcb8-6667ba489f60';

UPDATE public.daily_actions SET action_description = 'At one meal, try eating the non-starchy vegetables and protein foods before the carbohydrate portion. If you monitor glucose, you may record the meal and your usual readings to notice your own pattern. One comparison cannot prove cause and effect.', learning_objective = 'Practice a different meal sequence and observe your own pattern.' WHERE id = 'af58ac91-0772-4b65-8423-acbc6d98c67c';

UPDATE public.daily_actions SET action_description = 'Practice the plate method at your meals today where it fits. Focus on learning the structure, not being perfect.', learning_objective = 'Practice the plate method in daily life.' WHERE id = '9fb9c8a8-b977-425b-9007-3956c08ae356';

UPDATE public.daily_actions SET action_description = 'If glucose checking is part of your care plan, you may record a reading and its context in Progress. DRM organizes what you enter; it does not interpret the result or set your testing schedule.' WHERE day_number = 7 AND is_active;

UPDATE public.daily_actions SET action_description = 'Swap one food for an option that better fits your meal plan. One useful choice is enough for today.', learning_objective = 'Practice one realistic food substitution.' WHERE id = '8b0276f9-315b-42e7-8719-b53a06de946c';

UPDATE public.daily_actions SET action_description = 'Snacks are optional. If a snack fits your care plan, choose a time and food that work with your hunger, medicines, activity and daily schedule.' WHERE id = '2d097ba9-2e83-4ecb-939b-4bb177e1eef0';

UPDATE public.daily_actions SET day_name = 'Day 13: Practice the Full Routine', action_title = 'Practice the Full Routine', action_description = 'Practice today''s meal, movement, hydration and reflection routines. Completion is information, not a test of worth.', learning_objective = 'Practice the routine from start to finish.' WHERE id = '202aa6ac-f058-47cc-964d-e96da0babfe4';

UPDATE public.daily_actions SET action_description = 'Review what you practised during the first 14 days. You may record weight or glucose only if those measures are part of your usual plan. Treat short-term changes as information, not proof of an outcome.' WHERE day_number = 14 AND is_active;

UPDATE public.daily_actions SET action_description = 'If walking is safe for you, try a comfortable 10-minute walk after one meal today. Choose a pace and route that fit your ability. Stop if you feel unwell and follow your personal glucose-safety plan.', sub_tasks = '["Choose one safe after-meal movement", "Move for up to 10 comfortable minutes", "Log the activity if you want to"]'::jsonb WHERE id = '521ce932-0d81-4ec0-8bc3-6b74c4735e92';

UPDATE public.daily_actions SET action_description = 'If post-meal checking is already part of your care plan, record a reading at your usual time and note whether you walked. Compare patterns without assuming one action caused the result.', sub_tasks = '["Record a post-meal reading only if it is part of your plan", "Add a note about the meal and movement", "Review the pattern without judging it"]'::jsonb WHERE id = 'd5ebbea0-f306-4c68-8ccd-b5ed95eb0397';

UPDATE public.daily_actions SET action_description = 'Choose a comfortable indoor movement option for days when outdoor walking does not work. Rest is also appropriate when you are unwell.' WHERE id = '33eb46c2-5fab-4d91-a412-d304b64fa1f0';

UPDATE public.daily_actions SET day_name = 'Day 20: Review Your Routines', action_title = 'Day 20 — Review Your Routines', action_description = 'Review the routines you have practised so far and choose the ones you want to keep using this week.', sub_tasks = '["Use a meal routine that fits you", "Choose safe movement or rest", "Keep water available"]'::jsonb WHERE day_number = 20 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 21: Review a Helpful Routine' WHERE day_number = 21 AND is_active;

UPDATE public.daily_actions SET action_description = 'At one meal, try eating the non-starchy vegetables and protein foods before the carbohydrate portion. If you monitor glucose, you may record the meal and your usual readings to notice your own pattern. One comparison cannot prove cause and effect.', sub_tasks = '["Try the meal order at one meal", "Choose a safe movement break if you want to", "Record your usual reading only if it is part of your plan"]'::jsonb WHERE id = '3c95f02d-8467-475c-a4bb-de43588bc907';

UPDATE public.daily_actions SET action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.' WHERE id = 'fbea7eb7-a1cc-4db4-9673-f25ea57d23bd';

UPDATE public.daily_actions SET action_description = 'You have practised movement many times. Notice what makes it easier or harder and choose one routine you would like to continue.' WHERE id = '775ec303-4c00-433c-b7ea-cb068bccfbf8';

UPDATE public.daily_actions SET day_name = 'Day 26: Use the Plate Method Away From Home', action_title = 'Use the Plate Method Away From Home', action_description = 'When eating away from home, use the plate method as a flexible guide. Choose foods and portions that fit your preferences and care plan.' WHERE id = '46cee44c-a9e3-4f78-a46c-a9739c1708a4';

UPDATE public.daily_actions SET action_description = 'Two weeks of meal routines and two weeks with movement added. Tomorrow the workout library opens with short, joint-friendly options you can adapt. Rest well tonight.' WHERE day_number = 28 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 31: Strength and Everyday Movement', action_title = 'Strength and Everyday Movement', action_description = 'Strength activity can support general health and everyday function. Choose a routine that is safe for you and increase it gradually; ask your healthcare professional before changing your activity if you have safety concerns.' WHERE id = '27e5cc08-3010-47c1-aaac-400841f79974';

UPDATE public.daily_actions SET action_description = 'Repeat the same track or choose another — your call. Notice whether anything felt easier than the first time.' WHERE day_number = 33 AND is_active;

UPDATE public.daily_actions SET action_description = 'Weight and glucose can change at different rates. Review longer-term patterns without treating the scale or any single glucose reading as the only honest measure of success.' WHERE id = '507f1fde-da03-4d83-a1f5-1e493e2df631';

UPDATE public.daily_actions SET action_description = 'Review six weeks of routines and name one that feels more manageable now. Your healthcare professional decides when A1C testing is appropriate.' WHERE id = '039f96ab-6e3c-49c5-a4c1-151639681c97';

UPDATE public.daily_actions SET action_description = 'Forty-five days is worth noticing. Review the routines and trends you recorded without assuming they prove a particular change in insulin response.' WHERE id = '113f4e55-626c-4f73-9620-5c5adb677d01';

UPDATE public.daily_actions SET action_description = 'Include a protein food at meals today where it fits your preferences and meal plan. Portions do not need to be identical for everyone.', sub_tasks = '["Include a protein food at the meals that fit your plan", "Choose portions that work for you", "Keep water available"]'::jsonb WHERE id = '3943d932-701d-4b7b-ac3d-6f4600787407';

UPDATE public.daily_actions SET action_description = 'If it is safe and practical for you, break up one period of sitting with a short movement break. Any comfortable movement can count.' WHERE id = '410a3b86-592c-4926-be9e-8f572a4bf8c8';

UPDATE public.daily_actions SET action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.' WHERE id = '9d1bc757-12c4-4096-9141-f1f9055ffd6e';

UPDATE public.daily_actions SET day_name = 'Day 54: Build Strength Gradually', action_title = 'Build Strength Gradually', action_description = 'Strength activity can support general health and everyday function. Choose a routine that is safe for you and increase it gradually; ask your healthcare professional before changing your activity if you have safety concerns.' WHERE id = '3a42c511-8707-4b77-857a-a0bbb68d4555';

UPDATE public.daily_actions SET action_description = 'At one meal, try starting with non-starchy vegetables. If you monitor glucose, use your usual schedule and notice your own pattern without expecting a particular result.' WHERE id = '86581731-2604-4d68-aa79-600b3fcc2726';

UPDATE public.daily_actions SET day_name = 'Day 59: Review What Supports You', action_title = 'Review What Supports You', action_description = 'Choose one routine, person or tool that has helped you stay consistent and plan how to use it this week.', sub_tasks = '["Name one useful support", "Plan when you will use it", "Choose movement or rest that fits today"]'::jsonb WHERE id = 'da7da61c-effb-45d9-b2f6-41a5638172bf';

UPDATE public.daily_actions SET action_description = 'Review your Progress trends and write down one question for your next health visit. Testing schedules belong with your healthcare team.', sub_tasks = '["Review one Progress trend", "Write one question for your healthcare professional", "Choose one routine for today"]'::jsonb WHERE id = '7a84e8e4-c664-4a5f-ac6d-637d9e5df793';

UPDATE public.daily_actions SET day_name = 'Day 64: Review a Helpful Routine' WHERE day_number = 64 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 66: An After-Dinner Movement Option', action_title = 'An After-Dinner Movement Option', action_description = 'If it is safe for you, try a comfortable movement break after dinner. This is an option, not medicine or a requirement.', sub_tasks = '["Choose a safe after-dinner movement or rest", "Record a bedtime reading only if it is part of your plan", "Use a meal routine that fits you"]'::jsonb WHERE id = 'd51d41f9-d281-4179-bc31-5d21a5342cf9';

UPDATE public.daily_actions SET action_description = 'Stress can affect daily diabetes care and glucose differently from person to person. Try one short breathing or relaxation pause and notice whether it helps you feel more settled.' WHERE id = 'ffda58e6-33e7-42c7-a8a5-e3a1f84ba726';

-- ============ 2. Days 70-89: routine review and visit preparation only ============
UPDATE public.daily_actions SET action_description = 'Ten weeks of practice. Review one routine that has become easier and choose a comfortable wind-down tonight.', sub_tasks = '["Review one routine that helped", "Note what made it easier", "Choose safe movement or rest"]'::jsonb WHERE id = 'd85f5be9-3c67-4014-9ac1-774b78c12e0a';

UPDATE public.daily_actions SET action_description = 'Keep the routines that fit your week. There is no need to add anything new.', sub_tasks = '["Use a meal routine that fits you", "Choose safe movement or rest", "Keep water available"]'::jsonb WHERE id = '422baf37-6380-40fc-8c74-1f18dbe4f093';

UPDATE public.daily_actions SET day_name = 'Day 72: Vegetables on the Plate', action_title = 'Day 72 — Vegetables on the Plate', action_description = 'Try the plate method at one meal: about half non-starchy vegetables, one quarter protein foods and one quarter carbohydrate foods. Adjust the foods and portions to your preferences and care plan.', sub_tasks = '["Try the plate method at one meal", "Record a reading only if it is part of your plan", "Choose safe movement or rest"]'::jsonb WHERE day_number = 72 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 74: A Portion Check', action_title = 'Day 74 — A Portion Check', action_description = 'Portion sizes drift over time. If it helps, check one carbohydrate portion at a meal today. Portions are personal and do not need to be identical for everyone.', sub_tasks = '["Check one portion if it helps", "Use a meal routine that fits you", "Keep water available"]'::jsonb WHERE day_number = 74 AND is_active;

UPDATE public.daily_actions SET action_description = 'Seventy-five days of practice. Review the routines and trends you recorded. A trend is information, not a grade.', sub_tasks = '["Review one Progress trend", "Choose one routine for today", "Record readings only if they are part of your plan"]'::jsonb WHERE id = 'dccc9e96-780e-4aaa-aded-12fd80952d10';

UPDATE public.daily_actions SET day_name = 'Day 76: A Sleep-Supporting Step', action_title = 'Day 76 — A Sleep-Supporting Step', action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.', sub_tasks = '["Choose one sleep-supporting step", "Use a familiar evening routine", "Choose safe movement or rest"]'::jsonb WHERE day_number = 76 AND is_active;

UPDATE public.daily_actions SET action_description = 'Eleven weeks. Keep the routines that feel manageable.', sub_tasks = '["Use a familiar meal routine", "Choose safe movement or rest", "Write one question for your next health visit"]'::jsonb WHERE day_number = 77 AND is_active;

UPDATE public.daily_actions SET action_description = 'Review your Progress report and write down questions for your next health visit. Do not change medicine or daily care because of this app alone.', sub_tasks = '["Review your Progress report", "Write one question for your next health visit", "Choose one routine for today"]'::jsonb WHERE id = '6914fdb9-52e2-490b-82fb-d7db4f9e8801';

UPDATE public.daily_actions SET day_name = 'Day 79: A Movement Option', action_title = 'Day 79 — A Movement Option', action_description = 'Choose one comfortable movement break today. Walking, chair movement or another activity you enjoy can count. Build gradually and use the safety advice from your healthcare professional.', sub_tasks = '["Choose one comfortable movement break", "Use a meal routine that fits you", "Record a reading only if it is part of your plan"]'::jsonb WHERE id = 'ada920ee-79fa-43a9-a482-d9e368b8668d';

UPDATE public.daily_actions SET action_description = 'If A1C testing is already part of your care plan, you may record the result in Progress when you receive it. Review the meaning, target and testing schedule with your healthcare professional.', sub_tasks = '["Review your Progress report", "Write one question for your next health visit", "Follow your existing testing plan"]'::jsonb WHERE id = '7239841c-278d-4e2b-bbb9-39c299bcc998';

UPDATE public.daily_actions SET action_description = 'Review your Progress report and write down questions for your next health visit. Do not change medicine or daily care because of this app alone.', sub_tasks = '["Write questions for your healthcare professional", "Open your Progress report if useful", "Choose safe movement or rest"]'::jsonb WHERE id = '41ca6b1d-53f5-4f5e-8a00-0af7e181c832';

UPDATE public.daily_actions SET action_description = 'Repeat a day that worked well for you. Familiar routines are useful.', sub_tasks = '["Repeat a routine that worked for you", "Choose safe movement or rest", "Keep water available"]'::jsonb WHERE day_number = 82 AND is_active;

UPDATE public.daily_actions SET action_description = 'Twelve weeks of practice. Review what you have learned and choose one routine you want to continue.', sub_tasks = '["Review one Progress trend", "Choose one routine to continue", "Choose safe movement or rest"]'::jsonb WHERE id = '6f8b3e92-8fdf-4426-870a-cc66e11eaac1';

UPDATE public.daily_actions SET day_name = 'Day 85: Familiar Routines', action_title = 'Day 85 — Familiar Routines', action_description = 'Familiar routines are useful. Choose the meal, movement and sleep routines that fit today.', sub_tasks = '["Use a familiar meal routine", "Choose safe movement or rest", "Use a normal wind-down routine"]'::jsonb WHERE id = '30cdf68d-d8c1-491f-902e-d03ab82c39cd';

UPDATE public.daily_actions SET day_name = 'Day 86: Prepare for a Health Visit', action_title = 'Day 86 — Prepare for a Health Visit', action_description = 'Review your Progress report and write down questions for your next health visit. Do not change medicine or daily care because of this app alone.', sub_tasks = '["Open your Progress report", "Write down your questions", "Choose one routine for today"]'::jsonb WHERE day_number = 86 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 87: A Normal Evening', action_title = 'Day 87 — A Normal Evening', action_description = 'Use your normal evening routine. Do not change food, activity or medicine because a test may be approaching.', sub_tasks = '["Use a familiar dinner routine", "Choose safe movement or rest", "Use a normal wind-down routine"]'::jsonb WHERE id = 'f307b31b-e7de-4121-ab36-aef010c22e52';

UPDATE public.daily_actions SET day_name = 'Day 88: Keep It Simple', action_title = 'Day 88 — Keep It Simple', action_description = 'Keep today simple: familiar meals, regular hydration, and comfortable movement or rest.', sub_tasks = '["Use a familiar meal routine", "Keep water available", "Choose safe movement or rest"]'::jsonb WHERE id = 'ed6a151e-d943-40b3-8518-9b46ee12940f';

UPDATE public.daily_actions SET day_name = 'Day 89: Questions for Your Next Visit', action_title = 'Day 89 — Questions for Your Next Visit', action_description = 'Review your Progress report and write down questions for your next health visit. Do not change medicine or daily care because of this app alone.', sub_tasks = '["Review your Progress report", "Write one question for your next health visit", "Follow your existing testing plan"]'::jsonb WHERE id = '217c8ea8-d725-4c03-871a-65e9a5f6572a';

-- ============ 3. Days 90 onward ============
UPDATE public.daily_actions SET action_description = 'Review your first 90 days. If you receive an A1C result through your usual care, you may record it in Progress and discuss it with your healthcare professional. Sharing health information with the community is optional and is not a task.', sub_tasks = '["Review your 90-day routines", "Record measurements only if you choose", "Write one question for your next health visit"]'::jsonb WHERE id = '1220d61c-919c-46d0-b268-64ec722220ab';

UPDATE public.daily_actions SET action_description = 'A1C reflects average glucose over roughly the past three months, but it does not tell the whole story and can be affected by other factors. Review your result with your healthcare professional.' WHERE id = '6c6e4568-827a-4709-a43f-cdb9883169cb';

UPDATE public.daily_actions SET action_description = 'A1C values may be used for diagnosis or monitoring, but personal targets and interpretation belong with your healthcare professional. One result does not establish remission.', sub_tasks = '["Record the result if you choose", "Write down questions about what it means for you", "Review it with your healthcare professional"]'::jsonb WHERE id = '61af589b-61aa-4bac-a2b7-a13ce0b49641';

UPDATE public.daily_actions SET day_name = 'Day 93: Reviewing a Result', action_title = 'Day 93 — Reviewing a Result', action_description = 'An A1C result is one part of your health information. Review changes with your healthcare professional; do not assume one habit caused the result.', sub_tasks = '["Name one routine you kept consistently", "Choose one routine for today", "Record readings only if they are part of your plan"]'::jsonb WHERE id = '6641907f-86ee-4a77-9c5c-4b548f4ff8de';

UPDATE public.daily_actions SET action_description = 'People''s glucose and A1C patterns differ for many reasons. Use your usual monitoring plan and bring questions about unexpected patterns to your healthcare professional.' WHERE id = 'c82a9a67-bd6e-455a-9792-61f47e58c59f';

UPDATE public.daily_actions SET action_description = 'Bring your questions and Progress report to a qualified prescriber or pharmacist. Never start, stop, skip or change a medicine or dose because of DRM.', sub_tasks = '["Write down medicine questions for your prescriber or pharmacist", "Bring your Progress report if useful", "Do not change medicine because of the app"]'::jsonb WHERE id = '576353b0-1a19-458d-95ef-31ddd4139622';

UPDATE public.daily_actions SET day_name = 'Day 98: A Reliable Go-To Meal', action_title = 'A Reliable Go-To Meal' WHERE id = '5958d7d2-9bdd-4dc7-b860-0e85846c505c';

UPDATE public.daily_actions SET action_description = 'Include a protein food at meals where it fits your preferences and care plan. Choose portions that work for you; there are no app-imposed exceptions or mandatory portions.', sub_tasks = '["Include a protein food where it fits your plan", "Choose portions that work for you", "Record a reading only if it is part of your plan"]'::jsonb WHERE id = '1a6d2523-2fbf-4363-930d-c79aa687da17';

UPDATE public.daily_actions SET action_description = 'Keep the routines that fit your week. There is no need to add anything new.' WHERE day_number = 101 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 103: A Sleep-Supporting Step', action_title = 'Day 103 — A Sleep-Supporting Step', action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.', sub_tasks = '["Choose one sleep-supporting step", "Use a familiar evening routine", "Choose safe movement or rest"]'::jsonb WHERE id = '283fd408-9815-424b-8f1b-8cf5d70d0ea2';

UPDATE public.daily_actions SET day_name = 'Day 105: A Short Stress Pause', action_title = 'A Short Stress Pause', action_description = 'Stress can affect daily diabetes care and glucose differently from person to person. Try one short breathing or relaxation pause and notice whether it helps you feel more settled.' WHERE id = '12f942b1-8ea8-44cc-a9c0-9acf2f718eb2';

UPDATE public.daily_actions SET day_name = 'Day 114: Review a Helpful Routine' WHERE id = '177e9f10-972f-48af-ac68-fc5b59eb59af';

UPDATE public.daily_actions SET action_description = 'Strength activity can support general health and everyday function. Choose a routine that is safe for you and increase it gradually; ask your healthcare professional before changing your activity if you have safety concerns.' WHERE id = '0d41d8ee-f955-4aff-9b91-9e099e9cd1a7';

UPDATE public.daily_actions SET action_description = 'Weight and glucose can change at different rates. Review longer-term patterns without treating any one measure as the only honest sign of progress.' WHERE id = 'a58c516f-71e6-40f7-a0f6-cc1ed286e120';

UPDATE public.daily_actions SET action_description = 'A useful routine can also be affordable. Review this week''s shopping list and identify three ingredients that repeat across meals.' WHERE id = 'dedcc140-813c-4a11-9f33-b4956e0a01df';

UPDATE public.daily_actions SET day_name = 'Day 124: Review a Helpful Routine', action_title = 'Review one routine that helped', action_description = 'Look back at the routines you have used so far and note one that helped you stay consistent. Keep using that routine this week.', sub_tasks = '["Review one routine that helped", "Note why it worked for you", "Choose safe movement or rest"]'::jsonb WHERE id = '3ea964e5-b12c-4b7c-8fff-cc9fd7585a9f';

UPDATE public.daily_actions SET action_description = 'Bring your questions and Progress report to a qualified prescriber or pharmacist. Never start, stop, skip or change a medicine or dose because of DRM.', sub_tasks = '["Confirm a health appointment only if one is due", "Bring your Progress report if useful", "Do not change medicine because of the app"]'::jsonb WHERE id = '7456acbf-3cd4-4d98-8bca-9e9848b5fd8d';

UPDATE public.daily_actions SET day_name = 'Day 127: Understanding Type 2 Diabetes Remission', action_title = 'Understanding Type 2 Diabetes Remission', action_description = 'An international consensus group defines Type 2 diabetes remission as an A1C below 6.5% that lasts at least three months without usual glucose-lowering medication. Remission is not cure, is not established by one result, and still requires ongoing health follow-up. Only a qualified healthcare professional can assess whether the definition applies to you. DRM does not promise or diagnose remission.', sub_tasks = '["Read the remission education", "Write down questions for your healthcare professional", "Do not label yourself from one result"]'::jsonb WHERE id = '59c0886c-6dc6-417c-92cb-7073fb69af34';

UPDATE public.daily_actions SET action_description = 'Long-term health routines differ from person to person. If weight management is part of your care plan, discuss a safe and sustainable approach with your healthcare team.' WHERE id = 'c4c917d1-1ac1-487e-b044-60aa999876be';

UPDATE public.daily_actions SET action_description = 'Consistency can look ordinary from the inside. Choose one manageable routine today.' WHERE id = '7dd06aa4-d20c-4ea8-a33b-a8b33a0dc272';

UPDATE public.daily_actions SET day_name = 'Day 135: One Hundred and Thirty-Five Days', action_title = 'Day 135 — One Hundred and Thirty-Five Days', action_description = 'One hundred and thirty-five days of practice. Review the routines you have kept and choose the ones you want to continue.', sub_tasks = '["Review one routine you kept", "Choose one routine to continue", "Record readings only if they are part of your plan"]'::jsonb WHERE day_number = 135 AND is_active;

UPDATE public.daily_actions SET action_description = 'Look at your routine and find one thing you do out of obligation rather than benefit. It is fine to drop it. Sustainable means light enough to carry.', sub_tasks = '["Identify one habit that no longer helps", "Try a week without it", "Choose safe movement or rest"]'::jsonb WHERE day_number = 137 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 139: A Sleep-Supporting Step', action_title = 'Day 139 — A Sleep-Supporting Step', action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.', sub_tasks = '["Choose one sleep-supporting step", "Use a familiar evening routine", "Choose safe movement or rest"]'::jsonb WHERE day_number = 139 AND is_active;

UPDATE public.daily_actions SET action_description = 'Cook enough of one protein tonight to use it two ways tomorrow. Repetition can make meals simpler and more affordable.' WHERE day_number = 142 AND is_active;

UPDATE public.daily_actions SET action_description = 'If it is safe and practical for you, break up one period of sitting with a short movement break. Notice how it fits your day without expecting a particular glucose result.' WHERE id = 'd0ae92e1-5483-47a6-83bd-ecf7d963c46f';

UPDATE public.daily_actions SET action_description = 'If A1C testing is already part of your care plan, you may record the result in Progress when you receive it. Review the meaning, target and testing schedule with your healthcare professional.', sub_tasks = '["Review your Progress report", "Write one question for your next health visit", "Follow your existing testing plan"]'::jsonb WHERE id = 'ac954255-6291-4af5-8d6d-3649ecd072c7';

UPDATE public.daily_actions SET action_description = 'At one meal, try eating the non-starchy vegetables and protein foods before the carbohydrate portion. If you monitor glucose, you may record the meal and your usual readings to notice your own pattern. One comparison cannot prove cause and effect.' WHERE id = 'b30d5f78-d436-4141-896d-39f093faeb79';

UPDATE public.daily_actions SET day_name = 'Day 159: A Sleep-Supporting Step', action_title = 'Day 159 — A Sleep-Supporting Step', action_description = 'Choose one sleep-supporting step tonight, such as a consistent wake time, a comfortable room or a short screen-free wind-down. Sleep needs and glucose responses vary.', sub_tasks = '["Choose one sleep-supporting step", "Use a familiar evening routine", "Choose safe movement or rest"]'::jsonb WHERE id = '08d974e2-0000-4003-af7d-58cf87ff632c';

UPDATE public.daily_actions SET day_name = 'Day 160: One Hundred and Sixty', action_title = 'Day 160 — One Hundred and Sixty', action_description = 'Continue the routines that feel manageable. Do not make abrupt food, activity or medicine changes because a test is approaching.', sub_tasks = '["Use a familiar meal routine", "Choose safe movement or rest", "Keep water available"]'::jsonb WHERE id = 'f6f762ce-7efc-416c-bf20-750242783f94';

UPDATE public.daily_actions SET day_name = 'Day 165: A Movement Option', action_title = 'Day 165 — A Movement Option', action_description = 'Choose one comfortable movement break today. Walking, chair movement or another activity you enjoy can count. Build gradually and use the safety advice from your healthcare professional.', sub_tasks = '["Choose one comfortable movement break", "Use a meal routine that fits you", "Record a reading only if it is part of your plan"]'::jsonb WHERE id = '8eaad218-1601-404a-9a9b-1261e9b5ab6f';

UPDATE public.daily_actions SET action_description = 'If it is safe and practical for you, try a comfortable movement break before your first meal. Record a reading only if it is part of your plan.', sub_tasks = '["Choose a safe movement break before your first meal", "Record a reading only if it is part of your plan", "Use a meal routine that fits you"]'::jsonb WHERE day_number = 166 AND is_active;

UPDATE public.daily_actions SET day_name = 'Day 170: Preparing for a Health Visit', action_title = 'Day 170 — Preparing for a Health Visit', action_description = 'If A1C testing is already part of your care plan, you may record the result in Progress when you receive it. Review the meaning, target and testing schedule with your healthcare professional.', sub_tasks = '["Review your Progress report", "Write one question for your next health visit", "Follow your existing testing plan"]'::jsonb WHERE id = '19de3fa4-b8bc-4826-84f7-a84333049162';

UPDATE public.daily_actions SET day_name = 'Day 171: A Familiar Evening', action_title = 'Day 171 — A Familiar Evening', action_description = 'Use your familiar meal, movement and sleep routines. Do not change your routine to try to influence an upcoming test.', sub_tasks = '["Use a familiar dinner routine", "Choose safe movement or rest", "Use a normal wind-down routine"]'::jsonb WHERE id = '4f2458fa-6095-4238-94c0-c552912bd21d';

UPDATE public.daily_actions SET day_name = 'Day 175: Five Days', action_title = 'Day 175 — Five Days', action_description = 'Use the familiar routines that fit today. Ask your healthcare professional before making a health-related change.', sub_tasks = '["Use a familiar meal routine", "Keep water available", "Choose safe movement or rest"]'::jsonb WHERE id = 'f75bfa2c-4c14-4636-ae81-5beeadb49e71';

UPDATE public.daily_actions SET action_description = 'Keep today simple: choose familiar meals, regular hydration, comfortable movement or rest, and a normal sleep routine.' WHERE id = '6403e20e-2b27-400d-b0a3-c49a48a4739d';

UPDATE public.daily_actions SET action_description = 'You have reached the end of the 180-day guided sequence. Review what you learned and choose the routines you want to continue. If A1C testing is part of your usual care, you may record a result when you receive it and review it with your healthcare professional.', sub_tasks = '["Review your 180-day Progress report", "Record measurements only if you choose", "Plan which routines and app tools you want to keep using"]'::jsonb WHERE id = '2ffd2a1f-d490-458f-a10b-410386383c00';

-- ============ 4. VITA quotes: retire the pool, activate the approved set ============
UPDATE public.vita_quotes SET is_active = false, updated_at = now() WHERE is_active;

INSERT INTO public.vita_quotes (category, quote_text, is_active, day_range_start, day_range_end)
SELECT v.category, v.quote_text, true, 1, 180
FROM (VALUES
 ('program_tip','One useful action is enough for today. Choose the step that fits your life.'),
 ('mindset','Progress does not need to look perfect to be real. Notice what helped and try again.'),
 ('program_tip','A reading is information, not a grade. Follow your care plan and ask your healthcare professional about results you do not understand.'),
 ('program_tip','DRM organizes the information you enter. It does not diagnose the pattern or decide what treatment you need.'),
 ('program_tip','If glucose checking is part of your care plan, add context such as the time, meal and activity. Context can make your report easier to discuss.'),
 ('science','A1C reflects average glucose over roughly the past three months. Your personal target and testing schedule belong with your healthcare professional.'),
 ('program_tip','Never start, stop, skip or change medicine because of this app.'),
 ('program_tip','If an activity feels unsafe or you feel unwell, stop and follow your personal safety plan.'),
 ('program_tip','If walking is safe for you, a short comfortable walk can be one way to add movement to your day.'),
 ('science','Strength, balance, flexibility and aerobic activity can all support health. Choose activities that fit your ability.'),
 ('program_tip','The plate method is a flexible planning tool, not a pass-or-fail test.'),
 ('program_tip','Foods from your culture can fit a balanced plate. Choose combinations and portions that work for you.'),
 ('program_tip','Snacks are optional. Whether and when you need one can depend on hunger, medicines, activity and your care plan.'),
 ('program_tip','Keep water available during the day. Follow any fluid advice your healthcare professional has given you.'),
 ('science','Sleep and stress can affect daily diabetes care differently for different people. Small routines may help you feel more supported.'),
 ('mindset','A difficult day does not erase what you learned. Begin again with the next manageable action.'),
 ('program_tip','Use the meal swap when a planned meal does not suit you. A plan should be usable in real life.'),
 ('program_tip','Your Progress report can help you prepare questions for a health visit.'),
 ('program_tip','Sharing a health result with the community is always optional.'),
 ('program_tip','Supplements are not required for DRM. Ask a prescriber or pharmacist before adding one.'),
 ('program_tip','Fasting is not required for DRM, and fasting scheduling tools are unavailable.'),
 ('science','Type 2 diabetes remission has a specific clinical definition. DRM does not promise or diagnose it.'),
 ('program_tip','The guided sequence ends at Day 180, but the tracking, meals, education and report tools can continue to support your routine.'),
 ('program_tip','If you need help using DRM, open Support. For personal medical advice, contact a qualified healthcare professional.')
) AS v(category, quote_text)
WHERE NOT EXISTS (SELECT 1 FROM public.vita_quotes q WHERE q.quote_text = v.quote_text);

-- ============ 5. Content cards ============
UPDATE public.content_items SET summary = 'A make-ahead oat breakfast with apple and cinnamon. Review the portion and ingredients against your own meal plan.' WHERE id = '0139c885-fd58-4177-ac95-2961be0e9963';
UPDATE public.content_items SET summary = 'A yogurt-and-fruit snack option. Snacks are optional; choose one only when it fits your needs and care plan.' WHERE id = '01ea5a4e-b022-4c06-9fcd-d4fa4a854fe8';
UPDATE public.content_items SET summary = 'A source-linked look at short bouts of movement after meals. Individual glucose responses and activity safety vary.' WHERE id = '0bb970bd-6122-4cf8-ad14-98d53b219225';
UPDATE public.content_items SET summary = 'A salmon and cauliflower-rice dinner that can be prepared in about 20 minutes.' WHERE id = '0df75d95-1cc7-4fc9-9152-7001065e4d57';
UPDATE public.content_items SET title = 'What the DiRECT Study Reported About Remission', summary = 'A source-linked summary of remission outcomes reported in the DiRECT study, including limits on applying group results to an individual. DRM does not promise remission.' WHERE id = '0b1f9c56-77d6-49c3-be5a-44f2106feb5a';
UPDATE public.content_items SET summary = 'A practical introduction to a short post-meal walk for people for whom walking is safe.' WHERE id = '371dd455-5f10-487e-a9c1-0c53a60e9678';
UPDATE public.content_items SET title = 'Type 2 Diabetes Remission: Definition and Follow-Up', summary = 'Neutral education about the consensus definition of remission, why one result is not enough, and why ongoing follow-up remains important.' WHERE id = '68e1912c-a486-4a08-bd2a-645d265c222f';
UPDATE public.content_items SET title = 'Meal Order: What One Study Examined', summary = 'A source-linked explanation of research on food order. Results from a study do not guarantee the same effect for every person or meal.' WHERE id = '6c622229-64e6-4903-9c39-e598cfedc762';
UPDATE public.content_items SET summary = 'A source-linked explanation of how stress may affect diabetes self-management and glucose differently between people, plus general coping ideas.' WHERE id = '78d0e206-115a-4307-a11e-cfeecfbb136e';
UPDATE public.content_items SET title = 'Preparing a Personal Sick-Day Plan', summary = 'General questions to discuss with your healthcare team before illness occurs, including hydration, monitoring, medicines and when to seek help. Follow your personal sick-day plan.' WHERE id = '818424c0-c00d-4a28-a07e-f8844896e83c';
UPDATE public.content_items SET title = 'What Type 2 Diabetes Remission Means', summary = 'An international consensus group defines Type 2 diabetes remission as an A1C below 6.5% that lasts at least three months without usual glucose-lowering medication. Remission is not cure, is not established by one result, and still requires ongoing health follow-up. Only a qualified healthcare professional can assess whether the definition applies to you. DRM does not promise or diagnose remission.' WHERE id = '876c3165-7f46-4a85-a7f4-e9d643686465';
UPDATE public.content_items SET title = 'Strength Activity and Diabetes', summary = 'A source-linked overview of possible benefits and safety considerations for strength activity. It is education, not a treatment instruction.' WHERE id = '9de05eda-ecd5-4b10-8660-131a4739d72a';
UPDATE public.content_items SET title = 'Weight and Type 2 Diabetes Remission Research', summary = 'A source-linked overview of research connecting weight change and remission in some participants. Weight loss is not safe or appropriate for everyone, and DRM does not promise remission.' WHERE id = 'bfd9d9c5-0cbe-4867-bd20-f66e05dd99f3';
UPDATE public.content_items SET summary = 'Five chair-based movements with no equipment. Check that the routine is safe for your ability and health needs.' WHERE id = 'c5784bd4-cf6a-4072-b1d6-9c3c0ffab894';
UPDATE public.content_items SET summary = 'A source-linked explanation of movement after meals and why personal glucose responses and precautions can differ.' WHERE id = 'c9033016-e798-4140-b9a9-5c7aa48d151b';
UPDATE public.content_items SET summary = 'Questions you can take to a prescriber or pharmacist when discussing medicines and your recorded trends. DRM never recommends a dose change.' WHERE id = 'd245f1d1-73aa-4944-9285-359c3c4ce351';
UPDATE public.content_items SET title = 'Comparing Clinician-Led Type 2 Diabetes Programs', summary = 'A neutral, source-linked comparison of selected clinician-led programs, their requirements and costs. Their outcomes do not establish DRM outcomes.' WHERE id = 'e1198e3f-a659-4302-8846-3484957556ae';
UPDATE public.content_items SET title = 'Research on Timing Short Walks', summary = 'A source-linked study summary about walking patterns. Group findings do not predict an individual response, and activity should follow personal safety advice.' WHERE id = 'e4a044ce-9872-4d05-920d-03fdd47eb1b7';
UPDATE public.content_items SET title = 'Understanding Time in Range', summary = 'An introduction to time in range for people who use compatible glucose monitoring. Whether it applies and what target to use belong with the healthcare team.' WHERE id = 'eb4594fc-c6db-46d2-a24c-61f1ab7dd5e3';
UPDATE public.content_items SET summary = 'A quick guide to finding serving size, carbohydrate, fibre and other information on a nutrition label. What matters most depends on your meal plan.' WHERE id = 'f4b8feec-76a0-4901-9cd2-3f9fd969ed2b';
UPDATE public.content_items SET title = 'What a Five-Year DiRECT Follow-Up Reported', summary = 'A source-linked summary of long-term DiRECT findings and their limitations. Individual outcomes vary, and DRM does not promise remission.' WHERE id = 'f7bc81cc-1ac6-45dd-9a61-800d04b821cc';

-- ============ 6. Badge hint ============
UPDATE public.badges SET unlock_hint = 'Log one plate-method meal.' WHERE id = '2a8ac8f4-5e9a-426d-879a-41c4d3f2e895';
