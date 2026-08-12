-- ============================================================
-- MIRIFER: clear lesson descriptions left over from the 60-day course
-- Run in the Supabase SQL Editor.
-- ============================================================
--
-- Afraz opened Day 44 — "Talking About Habits", a lesson about wenn/als —
-- and the start overlay said:
--
--   "You've booked a table at a nice restaurant. Order food, ask for the
--    chef's recommendations, and pay."
--
-- That text is real, and it is correct — for the SIXTY-day curriculum this
-- project used to have, where Day 44 was "At the Restaurant". The 100-day
-- import replaced every lesson and every sentence; the descriptions
-- survived and now point at whatever that day number used to mean.
--
-- Comparing the two courses day by day: 89 of 90 days teach a DIFFERENT
-- lesson than the one their description describes. Day 1's is about self
-- introduction, Day 15's about public transport. It is not a handful of
-- stale rows, it is nearly all of them.
--
-- This got worse today. /proxy/converse takes the scenario from
-- scenarioDescription(), so the AI partner has been told it is in a
-- restaurant on a lesson about rainy days. A wrong description used to be
-- cosmetic; now it steers the conversation.
--
-- Clearing rather than rewriting. The fallback chain in the lesson page is
--
--   scenarioDescription() || scenarioTitle() || a generic line
--
-- and the titles were corrected earlier today to name the actual
-- situation, so a null description degrades to something TRUE. A wrong
-- sentence is worse than a missing one, for the learner and for the model.
--
-- Surgical on purpose: each statement clears one day and only if the text
-- still exactly matches the old course's. Anything since edited by hand is
-- left alone.
-- ============================================================

BEGIN;

UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 1 AND description = 'You''re meeting someone new for the first time. Introduce yourself and find out about them.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 2 AND description = 'You''re greeting different people throughout the day. Practice formal and informal ways to say hello and goodbye.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 3 AND description = 'A neighbor stops you on the street. Exchange pleasantries and ask how they''re doing.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 4 AND description = 'You''re filling out a form and chatting about ages and phone numbers.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 5 AND description = 'You''re making plans and need to talk about days of the week, months, and important dates.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 6 AND description = 'A new friend asks about your family. Describe who you live with and your family situation.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 7 AND description = 'You walk into a cozy café in Berlin. Order a drink and settle in.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 8 AND description = 'You''re lost in an unfamiliar part of town. Stop someone and ask for help.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 9 AND description = 'Someone is speaking too fast for you to understand. Ask them to slow down and repeat.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 10 AND description = 'You''re running late for a meeting and something has gone wrong. Apologize and explain.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 11 AND description = 'You''ve just met an interesting person at an event. Ask questions to learn more about them.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 12 AND description = 'You''re describing objects and places around you using colors and basic adjectives.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 13 AND description = 'You need to find a pharmacy in an unfamiliar neighborhood. Ask a passerby for simple directions.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 14 AND description = 'You''re looking for the post office in a complex area. Get more detailed directions using landmarks.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 15 AND description = 'You''re at a bus stop and need to find your connection. Ask about departure times and routes.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 16 AND description = 'You''ve just arrived at the airport and need to get to your hotel. Hail a taxi and discuss the fare.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 17 AND description = 'You''re checking in for your flight. Navigate check-in, baggage drop-off, and finding your gate.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 18 AND description = 'You''re chatting with a neighbor about today''s weather and plans for the week ahead.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 19 AND description = 'You''re describing your daily morning routine to a language exchange partner.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 20 AND description = 'A friend is visiting your apartment for the first time. Show them around the rooms.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 21 AND description = 'A friend comes over for dinner. Chat about what you''re cooking and whether they''re hungry.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 22 AND description = 'You''re trying to schedule a meeting with a colleague. Agree on a time that works for both.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 23 AND description = 'You''re at a party and start chatting with someone you''ve just met. Make some small talk.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 24 AND description = 'You''re getting to know a new colleague over coffee. Talk about hobbies and free time.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 25 AND description = 'It''s Thursday evening. You''re arranging plans with a friend for the weekend.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 26 AND description = 'You''re shopping at a weekend market. Ask about prices and pay for your items.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 27 AND description = 'You''re at the supermarket but can''t find what you need. Ask a staff member for help.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 28 AND description = 'It''s Saturday morning and you''re at the weekly farmers'' market. Buy some fresh bread and pastries.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 29 AND description = 'You''re in a clothing store and want to try something on. Talk to the sales assistant.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 30 AND description = 'You need a new laptop charger. Ask about availability, warranty, and payment options.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 31 AND description = 'You''re in a shop and can''t quite decide between two items. Think out loud and finally choose.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 32 AND description = 'It''s Monday morning at the office. Catch up with a colleague about tasks and pending messages.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 33 AND description = 'You need to speak to someone at a company. Call them, navigate the receptionist, and leave a message.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 34 AND description = 'You need to write a professional email to a business contact. Compose a polite, formal message.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 35 AND description = 'You''re at a new restaurant with a friend. Share opinions about the food and atmosphere.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 36 AND description = 'You want to join a German language school. Ask about levels, schedules, and how to enroll.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 37 AND description = 'Something has come up and you need to reschedule a work meeting. Handle it professionally.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 38 AND description = 'You''re not feeling well and a colleague notices. Explain your symptoms and decide what to do.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 39 AND description = 'You have an appointment with your GP. Describe your symptoms and receive medical advice.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 40 AND description = 'You have a cold and need something from the pharmacy. Describe symptoms and ask for a remedy.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 41 AND description = 'Your tooth has been hurting for two days. Call the dentist, describe the pain, and make an appointment.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 42 AND description = 'You''ve joined a gym and are chatting with another member about fitness routines and goals.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 43 AND description = 'You''re at a restaurant with dietary restrictions. Make sure the waiter fully understands your needs.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 44 AND description = 'You''ve booked a table at a nice restaurant. Order food, ask for the chef''s recommendations, and pay.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 45 AND description = 'You''re settling in at a café to work for a couple of hours. Order, ask about Wi-Fi, and get comfortable.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 46 AND description = 'You''ve been invited to a colleague''s birthday party. Bring a gift and join in the celebrations.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 47 AND description = 'You''re buying cinema tickets for tonight''s showing. Choose a film and get the best available seats.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 48 AND description = 'You''re at a social gathering and meet someone new. Pay compliments and strike up a conversation.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 49 AND description = 'It''s Friday afternoon. Chat with a friend about what you''re both doing this weekend.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 50 AND description = 'You''re calling a hotel in Munich to book a room for a business trip next week.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 51 AND description = 'You need to open a current account at a German bank. Ask all the right questions and fill in the forms.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 52 AND description = 'You need to send a parcel to Iran. Weigh it, fill in the customs form, and choose a delivery option.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 53 AND description = 'You''re at a car rental counter at the airport. Choose a vehicle class and sort out insurance.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 54 AND description = 'You want to join a language school. Ask about the placement test, class sizes, timetable, and fees.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 55 AND description = 'A busy day of mixed situations. You''ll revisit key phrases and structures from the first 54 lessons.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 56 AND description = 'You''ve found a flat you like online. Visit the apartment and negotiate the rental terms with the landlord.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 57 AND description = 'Your internet has gone down and you''ve been without connection for hours. Call the provider for help.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 58 AND description = 'At the station you realise you''ve missed your train and your flight is delayed. Get help from the information desk.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 59 AND description = 'You have a job interview at a German company. Answer questions about your experience and motivation.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 60 AND description = 'Your wallet has been stolen while sightseeing. Report the theft to the police and contact your embassy.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 61 AND description = 'Talk about your hobbies and personal interests with a German friend. Share what you enjoy doing in your spare time.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 62 AND description = 'Compare life today with the past. Talk about how technology, travel, and daily habits have changed over the decades.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 63 AND description = 'Ask a friend for advice on a personal problem. Learn to give and receive suggestions using polite conditional forms.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 64 AND description = 'Discuss a topic with a German speaker and practice expressing whether you agree or disagree, and how to handle differing opinions politely.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 65 AND description = 'Discuss current events and the news with a German speaker. Share your sources, opinions, and reactions to what''s happening in the world.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 66 AND description = 'Describe people''s personalities and character traits to a German friend. Talk about strengths, weaknesses, and what you value in others.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 67 AND description = 'Navigate German bureaucracy — visit the Bürgeramt, apply for permits, and deal with official paperwork and government letters.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 68 AND description = 'Handle professional apologies in German — take responsibility for mistakes, address client complaints, and promise corrective action.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 69 AND description = 'Discuss your future goals and ambitions with a German friend. Talk about career plans, personal dreams, and New Year''s resolutions.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 70 AND description = 'Discuss your favourite films, books and TV shows with a German friend. Share opinions, make recommendations, and plan a cinema trip.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 71 AND description = 'Talk about art, music, and entertainment in German. Discuss creative hobbies, cultural events, and opinions on different art forms.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 72 AND description = 'Plan a complex multi-city trip in German. Book flights, hotels, and rental cars, discuss itineraries, and handle all the practical details of travel preparation.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 73 AND description = 'Explain a cooking or baking process step by step in German. Use imperative verbs and sequencing language to guide someone through a recipe from start to finish.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 74 AND description = 'Handle workplace conflict in German with professionalism and empathy. Express misunderstandings, set boundaries, propose compromises, and work toward a resolution.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 75 AND description = 'Participate in a professional German meeting as both chair and attendee. Open and close sessions, ask questions, assign tasks, and manage time effectively.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 76 AND description = 'Deliver a professional presentation or speech in German. Structure your talk clearly, guide your audience through key points, and handle questions confidently.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 77 AND description = 'Explain a complex technical or logical problem in German. Break it down clearly, identify root causes, propose solutions, and check for understanding.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 78 AND description = 'Discuss environmental issues in German. Talk about climate change, pollution, renewable energy, and what individuals and governments can do to protect the planet.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 79 AND description = 'Express hypothetical situations, wishes, and polite requests in German using Konjunktiv II. Imagine different scenarios, give advice, and reflect on what could have been.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 80 AND description = 'Bargain and negotiate in German. Ask for discounts, make counter-offers, respond to a seller''s pitch, and work toward a deal that works for both sides.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 81 AND description = 'Talk about education, university life, and the learning process in German. Discuss subjects, exams, study habits, and your academic goals.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 82 AND description = 'Talk about relationships, dating, and love in German. Describe how you met someone, express your feelings, and discuss what makes a relationship work.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 83 AND description = 'Express sympathy, empathy, and condolences in German. Offer comfort to someone going through a difficult time, and find the right words to support them emotionally.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 84 AND description = 'Learn authentic German slang and idioms used in everyday conversation. Understand colorful expressions that native speakers use and practice using them naturally.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 85 AND description = 'Discuss technology, startups, and digital life in German. Talk about software development, AI, online security, and the challenges of building a product in the digital age.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 86 AND description = 'Express uncertainty, make guesses, and hedge your statements in German. Use probability language, modal verbs, and softening expressions to communicate what you think might be true.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 87 AND description = 'Learn about German traditions, holidays, and cultural customs. Discuss Christmas markets, Oktoberfest, social etiquette, and the unique cultural heritage of Germany.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 88 AND description = 'Express deep gratitude and appreciation in German. Learn heartfelt phrases for thanking people, acknowledging their help, and conveying sincere appreciation in both casual and formal contexts.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 89 AND description = 'Practice pitching a business idea to a friend in German. Learn vocabulary for startups, target audiences, monetization, and asking for honest feedback.';
UPDATE public.lessons SET description = NULL, description_fa = NULL
  WHERE day = 90 AND description = 'Practice negotiating large purchases in German. Learn the vocabulary and phrases needed to make offers, discuss financing, point out defects, and close a deal on real estate or a vehicle.';

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- What survived. Anything still here was either hand-written or does not
-- match the old course; read them against their titles before trusting.
SELECT day, title, left(description, 70) AS description
FROM public.lessons
WHERE description IS NOT NULL AND description <> ''
ORDER BY day;

-- How many days now fall back to their title.
SELECT count(*) FILTER (WHERE description IS NULL OR description = '') AS using_title,
       count(*) FILTER (WHERE description IS NOT NULL AND description <> '') AS has_description
FROM public.lessons;
