INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_001', 'Stop scrolling if you have acne', 'beauty', 95, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_002', 'This is your sign to start that side hustle', 'finance', 92, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_003', 'Wait til the end, trust me', 'food', 90, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_004', 'I wish I knew this hack before spending $500', 'tech', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_005', 'POV: you finally fixed your sleep schedule', 'fitness', 84, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_006', 'No one tells you this about pet hair', 'pets', 83, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_007', 'If you''re still doing skincare like this, please stop', 'beauty', 89, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_008', 'This app saved me 10 hours a week', 'tech', 87, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_009', 'My gym routine changed after this', 'fitness', 82, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_010', 'The $20 gadget every remote worker needs', 'tech', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_011', 'I tried this meal prep trick for 7 days', 'food', 81, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_012', 'Your dog will thank you for this', 'pets', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_013', 'The money move I made at 25', 'finance', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_014', 'The 3-second trick to cleaner counters', 'food', 79, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_015', 'I replaced my coffee with this', 'fitness', 80, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_016', 'The easiest way to make your room look expensive', 'tech', 77, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_017', 'If you''re tired of breakouts, listen up', 'beauty', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_018', 'Budgeting made simple for busy people', 'finance', 81, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_019', 'This is why your cat keeps scratching', 'pets', 78, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_020', 'I finally found a lunch that keeps me full', 'food', 80, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_021', 'This $9 serum fixed my textured skin', 'beauty', 94, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_022', 'I stopped using foundation because of this', 'beauty', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_023', 'Don''t buy another cleanser until you see this', 'beauty', 87, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_024', 'My skin cleared in 14 days - here''s how', 'beauty', 93, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_025', 'The sunscreen trick dermatologists actually use', 'beauty', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_026', 'If you have oily skin, try this at night', 'beauty', 84, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_027', 'I found the viral toner that''s actually worth it', 'beauty', 90, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_028', 'I made my first $1,000 online with this', 'finance', 91, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_029', 'Stop doing this if you want to save money', 'finance', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_030', 'The budget method that finally worked for me', 'finance', 84, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_031', 'I automated my bills and saved $300/month', 'finance', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_032', 'Side hustle ideas nobody is talking about', 'finance', 82, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_033', 'I fixed my credit score in 90 days', 'finance', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_034', 'This app found me money I didn''t know I had', 'finance', 83, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_035', 'If you hate cooking, watch this', 'food', 87, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_036', 'This 5-minute recipe tastes expensive', 'food', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_037', 'I meal prepped for $25 this week', 'food', 82, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_038', 'The protein snack I keep rebuying', 'food', 80, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_039', 'Air fryer hack that saves so much time', 'food', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_040', 'You can make this in one pan', 'food', 79, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_041', 'This gadget replaced three things on my desk', 'tech', 89, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_042', 'The productivity shortcut I wish I knew sooner', 'tech', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_043', 'If you work from home, you need this', 'tech', 90, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_044', 'I upgraded my setup for under $50', 'tech', 84, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_045', 'The charger that finally stopped overheating', 'tech', 82, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_046', 'This app organizes my entire week', 'tech', 87, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_047', 'Stop stretching like this if you get sore', 'fitness', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_048', 'This 10-minute workout changed my mornings', 'fitness', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_049', 'The supplement I take before every workout', 'fitness', 83, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_050', 'I lost 5 pounds doing this simple switch', 'fitness', 90, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_051', 'If you hate the gym, try this', 'fitness', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_052', 'My back pain disappeared after this routine', 'fitness', 89, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_053', 'The habit that made me drink more water', 'fitness', 81, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_054', 'The toy that finally tires my dog out', 'pets', 88, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_055', 'If your cat ignores toys, try this', 'pets', 84, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_056', 'This fixed my dog''s pulling in one week', 'pets', 86, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_057', 'The pet odor hack I swear by', 'pets', 82, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_058', 'Every pet owner needs this brush', 'pets', 83, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_059', 'My dog stopped shedding after I used this', 'pets', 85, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('hook_060', 'This treat keeps my puppy calm', 'pets', 80, 'manual_curation', 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();