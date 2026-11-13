-- DIFSC 2026 - conference programme (English + Arabic)
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- programme_rooms = the halls/rooms (they double as the programme "tracks").
-- programme_items = every session and sub-session. A sub-session points at
--   its parent session through parent_id; deleting a session deletes its
--   sub-sessions too. Only the English title, the date and the start time are
--   required - everything else (Arabic title, end time, room, speakers,
--   moderator, live-stream link) is optional. Days are not stored separately:
--   a "day" is simply any date that has at least one item.
-- The data below was imported from "DIFSC Program 2026.xlsx". Speaker names
-- and titles are copied exactly; only the room names have an Arabic version
-- added. The import is skipped if the tables already contain rows, so
-- running this file twice will not create duplicates.

create table programme_rooms (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table programme_items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references programme_items(id) on delete cascade,
  day date not null,
  start_time time not null,
  end_time time,
  title_en text not null,
  title_ar text,
  room_id uuid references programme_rooms(id) on delete set null,
  speakers text,
  moderator text,
  live_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programme_items_day_idx on programme_items (day, start_time);
create index programme_items_parent_idx on programme_items (parent_id);

alter table programme_rooms enable row level security;
alter table programme_items enable row level security;

do $$
declare
  has_rows boolean;
begin
  select exists (select 1 from programme_rooms) or exists (select 1 from programme_items) into has_rows;
  if has_rows then
    raise notice 'Programme tables already contain data - import skipped.';
    return;
  end if;

  insert into programme_rooms (id, name_en, name_ar, sort_order) values
    ('b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Main Hall', 'القاعة الرئيسية', 0),
    ('2d9eb18c-9089-4dcc-bd61-1cb7e85d2366', 'Exhibition Hall', 'قاعة المعرض', 1),
    ('6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Youth Zone', 'منطقة الشباب', 2),
    ('27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Idea Hub', 'مركز الأفكار', 3),
    ('756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Abu Dhabi A', 'أبوظبي (أ)', 4),
    ('764b4243-12e9-4d8c-a48c-f0953a6612be', 'TBD', 'يُحدد لاحقًا', 5),
    ('c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Abu Dhabi B', 'أبوظبي (ب)', 6),
    ('62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Virtual', 'افتراضي', 7),
    ('cb7a6108-ff44-4c6d-bfb7-89e4d9e39588', 'Ajman D', 'عجمان (د)', 8),
    ('e80d80c1-8ff3-489f-9b7a-8defe31b1d40', 'Ajman Room', 'قاعة عجمان', 9);

  insert into programme_items (id, parent_id, day, start_time, end_time, title_en, title_ar, room_id, speakers, moderator, live_url, sort_order) values
    ('fe100de1-0bd4-413a-b93b-c709bf18a000', null, '2026-11-16', '09:45', '10:45', 'OPENING CEREMONY', 'حفل الافتتاح', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'H.E Marwan Bin Ghalita', null, 'https://dubai.coresee.com/events/awmbQAg', 0),
    ('24630191-009a-4eb1-a384-1b2e149165a2', 'fe100de1-0bd4-413a-b93b-c709bf18a000', '2026-11-16', '10:00', '10:05', 'Opening Video', 'عرض الفيديو الافتتاحي للمؤتمر', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 1),
    ('f5fd7806-ef13-47fb-9f0c-74cd5cff6c17', 'fe100de1-0bd4-413a-b93b-c709bf18a000', '2026-11-16', '10:10', '10:15', 'Keynote Address', 'الكلمة الرئيسية', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Dr. Naseem Mohammed Rafee', null, null, 2),
    ('bffcbd95-f61e-46d8-bcd7-2f6a04b273e3', 'fe100de1-0bd4-413a-b93b-c709bf18a000', '2026-11-16', '10:15', '10:22', 'DM Food Elite Program Recognition Ceremony', 'تكريم الفائزين بجائزة دبي للتميز في الأنظمة الغذائية', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 3),
    ('5df577cf-10a0-44a0-98fd-a3b707c08ee7', 'fe100de1-0bd4-413a-b93b-c709bf18a000', '2026-11-16', '10:22', '10:30', 'Sponsors and Supporters Recognition Ceremony', 'تكريم الرعاة والداعمين', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 4),
    ('080ff267-6cc6-4804-9075-b62cd698c101', 'fe100de1-0bd4-413a-b93b-c709bf18a000', '2026-11-16', '10:30', '10:35', 'Founders Recognition', 'تكريم مؤسسي المؤتمر', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 5),
    ('4c0a1ccf-67ac-4158-8f3b-5bfe96397568', null, '2026-11-16', '10:00', '17:00', 'INNOVATION AND TECHNOLOGY IN FOOD SAFETY SHOWCASE', 'معرض الابتكار والتكنولوجيا في مجال سلامة الغذاء', '2d9eb18c-9089-4dcc-bd61-1cb7e85d2366', null, null, null, 6),
    ('d600963f-01eb-44df-b98c-0a3944340780', null, '2026-11-16', '10:30', '13:00', 'YOUTH IN ACTION!', 'الشباب يصنعون التغيير!', '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 7),
    ('807144b3-85a9-4dfc-89f1-c942f13bfdf9', 'd600963f-01eb-44df-b98c-0a3944340780', '2026-11-16', '10:30', '11:30', 'Behind Every Success Is a Story', 'ورا كل نجاح قصة', '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 8),
    ('f0822a68-60fd-43d9-9a83-47e546f24d7c', 'd600963f-01eb-44df-b98c-0a3944340780', '2026-11-16', '11:45', '13:00', 'Youth Debate: Should We Expand the Use of Recycled Water to the Agricultural Industry to Strengthen Food Security?هل نوسّع استخدام المياه المعاد تدويرها إلى مجال الزراعة لتعزيز الأمن الغذائي؟', 'هل نوسّع استخدام المياه المعاد تدويرها إلى مجال الزراعة لتعزيز الأمن الغذائي؟', '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 9),
    ('20ce4494-761a-4966-b820-ecda6b6154c4', null, '2026-11-16', '10:45', '12:15', 'Memorandum of Cooperation Signing Ceremony', 'حفل توقيع مذكرة التعاون', '27dab9f4-8301-4c0f-be57-8a11b5ea4775', null, null, null, 10),
    ('a6a025ed-c5ad-4cc3-908f-d84f03841182', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '10:45', '11:00', 'UAE Food Bank', 'بنك الإمارات للطعام', null, null, null, null, 11),
    ('6cc34ec5-3ee9-433f-873f-33238b4f1b46', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '11:00', '11:15', 'Dubai Central Laboratory & Emirates Flight Catering', 'مختبر دبي المركزي وشركة الإمارات لتموين الطائرات', null, null, null, null, 12),
    ('a10c5874-8494-4a22-b0d1-69237eceec72', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '11:15', '11:30', 'Dubai Municipality & Emirates Bustanica', 'بلدية دبي وشركة الإمارات بستانيكا', null, null, null, null, 13),
    ('155df815-a83c-4097-8503-f90ff999f5da', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '11:30', '11:45', 'Dubai Municipality & Higher Colleges of Technology', 'بلدية دبي وكليات التقنية العليا', null, null, null, null, 14),
    ('63c9f844-22ce-4c94-b1a4-592ff4950449', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '11:45', '12:00', 'Dubai Municipality & SFS', 'بلدية دبي وSFS', null, null, null, null, 15),
    ('2582928e-0edf-488e-af5b-b84c7038ce5d', '20ce4494-761a-4966-b820-ecda6b6154c4', '2026-11-16', '12:00', '12:15', 'KHDA & Dubai Municipality', 'هيئة المعرفة والتنمية البشرية وبلدية دبي', null, null, null, null, 16),
    ('21274bcc-9d35-4736-a0b8-9a8b34146af5', null, '2026-11-16', '10:50', '11:15', 'The Food Ecosystem: Exploring Future Scenarios, Risks and Opportunities', 'منظومة الغذاء: استشراف السيناريوهات المستقبلية والمخاطر والفرص', 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Dr Sara Al Dallal', null, null, 17),
    ('1f1b6c02-2de1-4118-9926-e4beec01e9cf', null, '2026-11-16', '11:00', '13:00', 'JORDAN''S EXPEREINCE IN ADVANCING FOOD REGULATIONS AND MARKET OPPORTUNITIES', 'تجربة الأردن في تطوير التشريعات المتعلقة بسلامة الغذاء واستكشاف الفرص السوقية', '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, 'Rola Arab', null, 18),
    ('8255521c-f794-4a7c-85f2-3ef57551d6c5', '1f1b6c02-2de1-4118-9926-e4beec01e9cf', '2026-11-16', '11:00', '11:15', 'JFDA''s regulatory Roadmap for 2027 and priorities in food regulations', 'خارطة الطريق التنظيمية للمؤسسة العامة للغذاء والدواء الأردنية لعام 2027 وأولويات التشريعات المتعلقة بسلامة الغذاء', '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Tamador Maayah', null, null, 19),
    ('5132918e-fd73-401f-a5ff-04b69f815dfa', '1f1b6c02-2de1-4118-9926-e4beec01e9cf', '2026-11-16', '11:15', '11:30', 'Update on the national nutrition strategy and upcoming nutrition policies shaping the food sector including the nutrient profile model and food reformulation', 'مستجدات الاستراتيجية الوطنية للتغذية والسياسات التغذوية المرتقبة المؤثرة في قطاع الغذاء، بما في ذلك نموذج التصنيف الغذائي وإعادة صياغة المنتجات الغذائية', '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Safwan Dababneh', null, null, 20),
    ('73099b54-c240-4b38-8c9e-bc4f0e73aabd', '1f1b6c02-2de1-4118-9926-e4beec01e9cf', '2026-11-16', '11:30', '11:45', 'Regulatory developments and upcoming policy changes with practical guidance to the food and beverage industry', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Eng. Sharif Al Muhairat', null, null, 21),
    ('2fa8a090-8bba-45a7-b93c-e95fa8c39a8b', '1f1b6c02-2de1-4118-9926-e4beec01e9cf', '2026-11-16', '11:45', '12:00', 'Advancing plastic packaging recycling and the role of recycled PET (rPET) in sustainable packaging and upcoming changes shaping circularity and responsible packaging', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Reem Abuizz', null, null, 22),
    ('985e544b-041d-443a-8c52-4334f989a0b3', '1f1b6c02-2de1-4118-9926-e4beec01e9cf', '2026-11-16', '12:00', '13:00', 'Q&A and Developing recommendations', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, null, null, 23),
    ('3d42b040-6290-43bc-962e-119849c1eab3', null, '2026-11-16', '11:15', '11:45', 'From Hindsight to Foresight: How Data and Tech Can Prevent Outbreaks?', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Frank Yiannas', null, null, 24),
    ('48d28825-5237-4d29-846e-065bfbb3a897', null, '2026-11-16', '11:45', '12:45', 'AI Empowerment for Leaders: From Using AI to Commanding Its Power', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Fahed Bizzari', null, null, 25),
    ('cfc13cfd-52f4-4bb5-9109-dfaab4cf663c', null, '2026-11-16', '12:30', '13:00', 'Strategies to Reduce Food Waste- UAE Food Bank', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Manal Obaid Yaroof', null, null, 26),
    ('37da1523-82f1-4e6c-8753-157226d0e22f', null, '2026-11-16', '13:00', '14:30', 'LEADERS’ SESSION: SHAPING TOMORROW’S FOOD CHOICES', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Sophie Attwood; Julian Cox; Michael Rivera; Stephen Ritz', null, null, 27),
    ('fa009498-778f-4f05-ac0e-bcbab317f482', '37da1523-82f1-4e6c-8753-157226d0e22f', '2026-11-16', '13:00', '13:20', 'The Future of Food: Changing Children''s Choices', null, null, 'Sophie Attwood', null, null, 28),
    ('d2ba2bef-5bdd-44b1-a8f1-da72bd6f12bf', '37da1523-82f1-4e6c-8753-157226d0e22f', '2026-11-16', '13:20', '13:40', 'Growing a Healthier Future: Leadership Through Food and Education', null, null, 'Stephen Ritz', null, null, 29),
    ('d7139d8a-b40f-4e95-8d08-b0a07d94cd0b', '37da1523-82f1-4e6c-8753-157226d0e22f', '2026-11-16', '13:40', '14:00', 'Safer Food in Education: What Every Decision-Maker Should Know', null, null, 'Julian Cox', null, null, 30),
    ('fcbe0c06-e32c-49af-8851-1763fe6fd0f9', '37da1523-82f1-4e6c-8753-157226d0e22f', '2026-11-16', '14:00', '14:30', 'Panel Discussion and Q&A', null, '764b4243-12e9-4d8c-a48c-f0953a6612be', 'Michael Rivera; Stephen Ritz; Julian Cox; Sophie Attwood', null, null, 31),
    ('e421bd74-a02b-446f-b2f9-64f991e5cc2f', null, '2026-11-16', '13:30', '14:30', 'Preventing and Fighting Food Safety Fires', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Dominique Walch', null, null, 32),
    ('a55e2634-b11c-411d-ada1-853be1350a93', null, '2026-11-16', '14:00', '17:00', 'Balancing Food Safety, Innovation, and Trade Facilitation to Ensure Food Safety in Times of Crisis', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, 'Rola Arab', null, 33),
    ('57572ac2-9870-412f-bf61-4e3f7a2ae4ae', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '14:00', '14:10', 'SESSION 1: SHARING BEST PRACTICES AND ACHIEVEMENTS ON TRADE FACILITATION AND REGIONAL INTEGRATION', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'H.E Dr Muza Al MuhairI', null, null, 34),
    ('0ed3bb64-92e4-4445-8b93-f7a081579e08', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '14:10', '14:25', 'Best practices in the UAE to facilitate food control systems and promote food innovation', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'ADAFSA speaker (tbc) Tbc', null, null, 35),
    ('dfbbb8f3-df6f-45ef-831d-088bfb67e5a3', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '14:20', '14:55', 'Implementation of Codex Alimentarius safety principles in Syria and recent regulatory developments', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Ahmad Al-Husain', null, null, 36),
    ('a54eb390-9e95-4458-96f4-d162b9290201', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '14:25', '14:40', 'Simplifying import and export food control and certification requirements for trade facilitation in Morocco', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Samah Tahri', null, null, 37),
    ('c75cc7ae-86a0-454e-8753-cf762c18b891', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '14:55', '15:10', 'Importance of risk analysis and science in Codex Alimentarius as a benchmark for global regulations', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Markus Lipp', null, null, 38),
    ('f3d1e084-f121-4343-8544-f9ed6f01ea61', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '15:10', '15:30', 'Q&A', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, null, null, 39),
    ('72b15391-7078-4568-b74d-30841a14921b', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '15:30', '16:00', 'SESSION 2: PANEL DISCUSSION', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Sonia Baldi Baldi; Dr. Muna Al Olan; Mr. Benazzouz El Maati; Dr. Shaimaa Al Asfour; Dr. Intisar Algharibi Algharibi', null, null, 40),
    ('49e83df2-2948-46bb-9fd1-44bb521a9fe4', 'a55e2634-b11c-411d-ada1-853be1350a93', '2026-11-16', '16:00', '17:00', 'SESSION 3: RECOMMENDATIONS ON ENHANCING REGIONAL COLLABORATION BETWEEN THE PUBLIC AND PRIVATE SECTOR FOR CONSUMERS SAFETY AND BUILDING RESILIENT FOOD SAFETY SYSTEMS', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, null, null, 41),
    ('812a0a51-5d09-459f-86ee-cee3a213680b', null, '2026-11-16', '14:00', '18:00', 'FROM SCIENCE TO DECISIONS: ADVANCING FOOD RISK ASSESSMENT IN THE ARAB REGION', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, null, null, 42),
    ('3eb78dab-080f-4da4-9ca5-5fa1cfd214e0', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '14:00', '15:20', 'Development of Risk Assessment Capacity in Low and Medium Income country (LMIC) – A Proposed Approach', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Moez Sanaa', null, null, 43),
    ('eb3149b9-ca4c-454b-8d85-a782803c7724', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '14:20', '14:40', 'Sweeteners: From Hazard Identification to Risk Assessment and Regulatory Communication', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Dr. Greg Paoli', null, null, 44),
    ('2bcff4f4-b2c2-4da7-89f5-5edeca56fce2', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '14:40', '15:00', 'WHO’s Integrated Food Profiling Model: Regulatory Implications and Opportunities for Input', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Samuel Godefroy', null, null, 45),
    ('95c15fdd-82fc-4132-b90b-9fc5403ad474', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '15:00', '15:20', 'Cereulide in Infant Formula: Lessons from a Multi-Country Food Safety Incident for Risk Assessment and Regulatory Action', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Joseph Touma', null, null, 46),
    ('2a322df2-0143-4ef0-8531-406d1b86f677', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '15:20', '15:40', 'From National Data to Codex Action: Responding to Data Calls and Priorities Following CCCF19 - Focus on Aflatoxins in Cereals and Ochratoxin A in Dried Fruits', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Amine Kassouf', null, null, 47),
    ('b6936942-0063-45fa-b9f2-ceb735e5db9a', '812a0a51-5d09-459f-86ee-cee3a213680b', '2026-11-16', '16:00', '17:00', 'Roundtable: Advancing Food Risk Assessment in the Arab Region', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, 'Samuel Godefroy', null, 48),
    ('d8d5ae8f-7127-4e30-9e7d-72310f3dfb55', null, '2026-11-16', '14:00', '14:20', 'Building an Integrated System Based on Science and Data - Food Control Systems Assessment Project', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 49),
    ('8ca5eed8-d2d0-4b01-a474-c9a49bce734d', null, '2026-11-16', '14:30', '16:30', 'AI IN ACTION: HOW TECHNOLGY ADVANCEMENTS ARE TRANSFROMING FOOD SAFETY', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Nada Al Katheeri', null, null, 50),
    ('9feca483-750e-4ae2-924a-a2535136e9eb', '8ca5eed8-d2d0-4b01-a474-c9a49bce734d', '2026-11-16', '14:30', '15:00', 'Beyond Inspection: How the Safe to Trade Assurance Programme, AI and Data are Transforming Food Safety in Hospitality and Retail sectors', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Dr. Mark Flanagan', null, null, 51),
    ('e27b88bf-20cd-48cc-9f0e-45f51b863011', '8ca5eed8-d2d0-4b01-a474-c9a49bce734d', '2026-11-16', '15:00', '15:20', 'Transforming Seafood Traceability with AI in the UAE', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'His Excellency Sheikh Fahim Al Qasmi', null, null, 52),
    ('8d1758cd-e811-4a24-bdc1-7779d1dd299d', '8ca5eed8-d2d0-4b01-a474-c9a49bce734d', '2026-11-16', '15:20', '15:40', 'AI to Support Food Safety in Australian Red Meat Processing', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Ann McDonald', null, null, 53),
    ('509745c6-aaaa-4819-ad73-70309d53ddeb', '8ca5eed8-d2d0-4b01-a474-c9a49bce734d', '2026-11-16', '15:40', '16:00', 'Use of Artificial Intelligence To Enhance Food Inspection- ADAFSA''s Experience', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 54),
    ('377a04eb-079c-44fd-a709-519e91a2b064', null, '2026-11-16', '16:00', '16:30', 'Building Intelligence into Regulatory Systems- An Inspection Perspective', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Rance Baker', null, null, 55),
    ('8cf053a4-c7a9-4611-b5d7-8f4aafece4f9', null, '2026-11-16', '16:30', '17:45', 'IAFP Session: Are the Microbes Smarter Than Humans?', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Manpreet Singh; Julian Cox; Manan Sharma', null, null, 56),
    ('9e64bf8c-d3aa-4bca-823e-cbb3810169b5', '8cf053a4-c7a9-4611-b5d7-8f4aafece4f9', '2026-11-16', '16:30', '16:50', 'US Cyclospora Outbreak 2026 : What Do We Know bout this parasite?', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Manan Sharma', null, null, 57),
    ('98b14140-92f9-4a5e-a355-8254ecfe0b46', '8cf053a4-c7a9-4611-b5d7-8f4aafece4f9', '2026-11-16', '16:50', '17:10', 'Paraistes 101', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Julian Cox', null, null, 58),
    ('c8c2a2d3-62f9-4767-8652-95638b0a8abe', null, '2026-11-16', '17:00', '17:30', 'Non-Thermal Plasma Technologies for Pathogen Control', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', null, null, null, 59),
    ('d4228a68-6c1c-4837-b0bc-9c741cd82be9', null, '2026-11-16', '17:30', '18:00', 'Before You Let It Act: How to Test Agentic AI in Predictive Food Safety', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Asli Solmaz-Kaiser', null, 'https://teams.microsoft.com/meet/3768499649246393?p=J5ieiA7GwvYkkAElcY', 60),
    ('eb357c09-a8f7-418b-b7c9-ef4e0b4ca7f4', null, '2026-11-16', '18:00', '19:00', 'Seeing the Unseen: Using Science, Data and Decisions to Estimate Invisible Risks', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Frank Yiannas; Thomas Struckmeyer', null, null, 61),
    ('f81cd365-04ae-49d6-8468-a4a29769aee1', null, '2026-11-17', '08:30', '09:25', 'Food Safety and Social Media: Influencers Forum', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Julian Cox; Michael Rivera; Amona Yousef', null, null, 62),
    ('c74cab94-81f8-4fe2-a72b-f154d02711cc', null, '2026-11-17', '09:00', '11:00', 'RESEARCH AND FRESH INSIGHTS SHAPING FOOD SAFETY', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, 'Rouaa Daou', null, 63),
    ('45139342-592b-4839-8a83-225029f96c4a', 'c74cab94-81f8-4fe2-a72b-f154d02711cc', '2026-11-17', '09:00', '09:20', 'AI and Food Innovation', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Ibtesam Saeed', null, null, 64),
    ('35963370-a9e6-4f17-b6a0-989e2323fa9a', 'c74cab94-81f8-4fe2-a72b-f154d02711cc', '2026-11-17', '09:20', '09:40', 'Enhancing Safety and Shelf-Life of Ready-to-Eat Meat Products Using High-Pressure Processing (HPP)', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Tareq Osaili', null, null, 65),
    ('77346690-a497-492d-98de-f47e0fa515d0', 'c74cab94-81f8-4fe2-a72b-f154d02711cc', '2026-11-17', '09:40', '10:00', 'Food Safety Beyond Compliance: Natural Antimicrobials, Biofilm Control, Innovation and Regulatory Perspectives in GCC Food Systems', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Layal Karam', null, null, 66),
    ('430aea38-33c4-4820-aac3-b50270c85973', 'c74cab94-81f8-4fe2-a72b-f154d02711cc', '2026-11-17', '10:00', '10:20', 'Microbial Inactivation: Steam-Vacuum Pasteurization and Roasting', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Stella Mariem', null, null, 67),
    ('386e4f04-16c6-4fa2-8f9d-2c9e89cc8d15', 'c74cab94-81f8-4fe2-a72b-f154d02711cc', '2026-11-17', '10:20', '10:30', 'Formulating Meat Alternatives from the Novel Protein Sources', null, null, 'Sajid Maqsood', null, null, 68),
    ('0078a943-7695-4d50-87be-5bdfd3b33a0b', null, '2026-11-17', '09:00', '13:00', 'WHEN FOOD SAFETY GOES VIRAL: MANAGING SOCIAL MEDIA SCARES AND PUBLIC TRUST', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, null, null, 69),
    ('47af7525-5ad2-4670-86be-61277913ffad', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '09:00', '09:30', 'Risk Communication in the Age of Social Media: The Art of Addressing Misinformation', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, null, null, 70),
    ('156cd90a-787c-4d9a-b562-bc29c7099faf', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '09:00', '10:30', 'UAE Leadership Advances in One Health for Risk Based Food Safety', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 71),
    ('bec6ff2d-dafa-4a22-85ee-3c66c201542b', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '09:30', '10:00', 'Social Media as a Powerful Tool for Nutrition Communication: Truth or Illusion?', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Elie Bou Yazbeck', null, null, 72),
    ('2a40954c-7aa1-439f-8f05-a8339c5db1ec', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '10:00', '10:30', 'Evidence-Based Food Labelling: Striking the Balance Between Consumer Protection and Responsible Risk Communication', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Eng. Ikram Riahi', null, null, 73),
    ('9fdc4b31-e395-495b-b123-ed6b142b9a09', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '11:00', '11:30', 'Engaging Consumers in Food Regulatory Decisions: Oman’s Initiative on Alternatives to Plastic Bottles for Mineral Water', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Dr. Intisar Al-Gharibi', null, null, 74),
    ('c7e90afa-8523-4b09-a342-43af99054e68', '0078a943-7695-4d50-87be-5bdfd3b33a0b', '2026-11-17', '11:30', '12:30', 'Responding Together: Strengthening Regional Cooperation on Food Safety Misinformation', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, null, null, 75),
    ('2ec7c119-1b0e-4855-a9dc-12018ec09a0a', null, '2026-11-17', '09:00', '10:30', 'BEYOND TESTING NORMS: AI & EMERGING TECHNOLOGIES', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', null, 'Fatma AlMahri', null, 76),
    ('df32e397-ea5b-40fc-bf2d-987d240752dd', '2ec7c119-1b0e-4855-a9dc-12018ec09a0a', '2026-11-17', '09:00', '09:20', 'AI-assisted Near-Infrared (NIR) Chemometric Modeling for Rapid Food Quality Screening', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Mariam Hassan', null, null, 77),
    ('17e5a33d-3bd8-42b8-9236-1dccea1443b2', '2ec7c119-1b0e-4855-a9dc-12018ec09a0a', '2026-11-17', '09:20', '09:40', 'Beyond Novelty to Impact: Advancing DCL’s Pioneering Work in Insect Detection in Food', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Asma Al Mulla', null, null, 78),
    ('664c8dc9-1b88-4a60-b409-a6cce69cf4c5', '2ec7c119-1b0e-4855-a9dc-12018ec09a0a', '2026-11-17', '09:40', '10:00', 'Beyond the Lab: Role of NIR and Raman in Rapid Food Testing', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Rangarajan Ramanujam', null, null, 79),
    ('10a66dd8-0726-448c-9084-0737d9bc7de7', '2ec7c119-1b0e-4855-a9dc-12018ec09a0a', '2026-11-17', '10:00', '10:30', 'Panel Discussion - From Pilot to Practice: Bringing AI and Advanced Technologies into Routine Food Testing', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Asem Al Natour; Rangarajan Ramanujam', null, null, 80),
    ('6bce24fd-5e26-4fef-8b32-ea137f6e6db9', null, '2026-11-17', '09:30', '10:30', 'GRILL SAFE- GUINNESS RECORD ATTEMPT FOR FOOD SAFETY TRAINING', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', null, null, null, 81),
    ('da502646-3e4a-4d4e-b1e4-4ee34a679d8e', null, '2026-11-17', '10:30', '13:00', 'Memorandum of Cooperation Signing Ceremony', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', null, null, null, 82),
    ('56311b01-d93b-4b6e-b36d-bc9f331f8155', 'da502646-3e4a-4d4e-b1e4-4ee34a679d8e', '2026-11-17', '10:30', '10:45', 'Dubai Municipality & ADNH Catering', null, null, null, null, null, 83),
    ('cf796c86-4b57-4f98-9c0e-9d2a0b313819', 'da502646-3e4a-4d4e-b1e4-4ee34a679d8e', '2026-11-17', '10:45', '11:00', 'Dubai Municipality, GEMS Education & Slices Catering', null, null, null, null, null, 84),
    ('146de59b-6ce4-433b-88a6-8b646372c6d1', 'da502646-3e4a-4d4e-b1e4-4ee34a679d8e', '2026-11-17', '12:45', '13:00', 'DCL & Sharjah University', null, null, null, null, null, 85),
    ('52111531-387a-4d01-9cf7-08851dc24c43', null, '2026-11-17', '10:30', '12:30', 'Generation Next: Shaping the Future of Food', null, null, null, null, null, 86),
    ('aa33f648-dd7e-4652-bf53-d6bdaac14f28', '52111531-387a-4d01-9cf7-08851dc24c43', '2026-11-17', '10:30', '11:00', 'Growing the Future of Food', null, null, 'Stephen Ritz', null, null, 87),
    ('0709b0cc-0f1b-485f-a3e9-eff859f09a9d', '52111531-387a-4d01-9cf7-08851dc24c43', '2026-11-17', '11:00', '12:30', 'Future Food Innovation Challenge (Student Innovation Presentation) + Awarding', null, null, 'Carlo De Villa', null, null, 88),
    ('6c442783-afa7-45d1-8a21-b5ab08ee0385', null, '2026-11-17', '10:45', '11:20', 'India’s Food Safety Transformation: From Regulatory Modernization to Trusted Food Supply Chains for the UAE', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Nimish Shah', null, null, 89),
    ('26988452-8c5d-4d00-9e1f-f571676549f3', null, '2026-11-17', '11:00', '13:00', 'REGIONALS AND GLOBAL PERSPECTIVES IN FOOD SYSTEM TRANSFORMATION', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', null, 'Rameez AlDaour', null, 90),
    ('1734615c-c9b8-4db3-95f9-01962d8dcded', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '11:00', '11:20', 'Key Food Safety Initiatives in UAE', null, null, 'Basem Azzam', null, null, 91),
    ('93509e26-f5ed-4f67-b529-a330a0bff4bf', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '11:20', '11:40', 'Building a Healthy Restaurant System in Ras Al Khaimah', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Aamna Alshehhi', null, null, 92),
    ('2f560235-bfce-49ce-88d4-f685a2908570', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '11:40', '12:00', 'RAKFSI: Redefining Food Safety Training Through AI Foresight', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Erwa M. Mohamed', null, null, 93),
    ('a1691942-fbe2-4efd-99ca-2608ae3ecfec', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '12:00', '12:20', 'South America- Building Resilience and Sustainability of Food Systems in to Regulatory Framework', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Caludia Ruiz Reyna', null, null, 94),
    ('870bb16a-57db-4acc-8d2b-f5f49e9de7d8', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '12:20', '12:40', 'Food Safety Developments in Lebanon', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Dr. Hussein Hassan', null, null, 95),
    ('a35b5663-cb4e-488f-af6d-1b9a93065614', '26988452-8c5d-4d00-9e1f-f571676549f3', '2026-11-17', '12:40', '13:00', 'From the Ground Up: Transforming India’s Food Safety from Grassroots to Global Standards', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Chandan Pandey', null, null, 96),
    ('30749212-c1b7-48c3-84c0-172856f82b36', null, '2026-11-17', '11:00', '13:00', 'NEW FRONTIERS IN FOOD SAFETY RISK ASSESSMENT: EMERGING HAZARDS, INNOVATIVE METHODOLOGIES, AND REGULATORY APPLICATIONS', null, 'cb7a6108-ff44-4c6d-bfb7-89e4d9e39588', 'Dr. Abdel-Razak Kadry; Dr. Nicolle Tulve; Dr. Mohamed Saad; Amira Ahmed; Ishfaq Sheikh', null, null, 97),
    ('fb02a821-4435-4cd4-b015-476d498ed00a', null, '2026-11-17', '11:20', '11:40', 'Dubai Customs’ Role in Building Global Partnerships to Strengthen Food Security', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Ahmed Kazim', null, null, 98),
    ('834fd376-ef35-4a2f-a727-14cf098b42e4', null, '2026-11-17', '11:30', '13:00', 'Unlocking Bioactivity: A New Food Testing Dimension.', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', null, 'Mira Alkhatib', null, 99),
    ('00917a01-21b7-4d4b-b6ea-468579000c23', '834fd376-ef35-4a2f-a727-14cf098b42e4', '2026-11-17', '11:30', '11:50', 'Validating Bioactivity in UAE Food Products: Honey Quality and Date-Pit Innovation', null, null, 'Ali El-Keblawy', null, null, 100),
    ('8604c7c3-549b-42eb-999d-9f1d0a0ce538', '834fd376-ef35-4a2f-a727-14cf098b42e4', '2026-11-17', '11:50', '12:10', 'Integrated Assessment of Mycotoxins, Physicochemical Properties, and Microbiological Quality in Dates in UAE', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Shaima Askar', null, null, 101),
    ('63b7bb28-af16-4db9-b1c8-ab30def4e9fb', '834fd376-ef35-4a2f-a727-14cf098b42e4', '2026-11-17', '12:10', '12:30', 'Panel Discussion- From Laboratory Evidence to Market Value: Bioactivity Testing in UAE Food Products', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Rangarajan Ramanujam; Eng. Ibrahim Al-Yazidi; Asem Al Natour', null, null, 102),
    ('e822cfce-27ac-4f0b-8799-4866ece11f48', null, '2026-11-17', '12:00', '12:30', 'From Compliance to Culture: Developing the Modern Food Safety Regulator', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Andrew Wilson', null, null, 103),
    ('d1993144-02eb-44c6-b867-fca04a6f4e18', null, '2026-11-17', '12:30', '13:00', 'How to Become the Most Influential Person in the Room', null, 'b528e5cb-686b-408d-8bb5-073c21fa5ddf', 'Lone Jespersen', null, null, 104),
    ('f606d1e5-27fc-455e-9414-fa544f9d27de', null, '2026-11-17', '13:00', '14:00', 'SPECIAL SESSION: Emerging Issues Identified Through FAO''s Food Safety Foresight Program', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Vittorio Fattori', null, 'https://teams.microsoft.com/meet/3894548248255765?p=VmouLRIgbuypHmPow8', 105),
    ('38658b95-68bf-45c4-bdf7-964bc1182017', null, '2026-11-17', '13:30', '15:30', 'Future Food Frontiers - Connecting Behavior, Research and Policy', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 106),
    ('b6dd6c60-1307-41cf-b413-7665043b46eb', '38658b95-68bf-45c4-bdf7-964bc1182017', '2026-11-17', '13:30', '13:50', 'University Research in Action: Turning Evidence, Data and AI into Practical Solutions for Smarter Food Systems and National Development', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Lea Milan', null, null, 107),
    ('847add84-83be-4e17-9de1-781b53191407', '38658b95-68bf-45c4-bdf7-964bc1182017', '2026-11-17', '13:50', '14:10', 'Food Law for the Future: The Role of Universities in Shaping Regulation and Strengthening Compliance', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Vincent Hegarty', null, null, 108),
    ('f3fd16f5-293f-4a6d-9972-62a22a8614f8', '38658b95-68bf-45c4-bdf7-964bc1182017', '2026-11-17', '14:10', '14:30', 'Perspectives on Research that Shapes Food Safety', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Julian Cox', null, null, 109),
    ('112b5efc-8ed7-4d40-9bf9-2bd2847c1366', '38658b95-68bf-45c4-bdf7-964bc1182017', '2026-11-17', '14:30', '14:50', 'Understanding Human Behavior: What Research Reveals About Our Food Choices', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Sophie Attwood', null, null, 110),
    ('bcb54f06-0ec1-459e-b4ef-92eb8beccc73', '38658b95-68bf-45c4-bdf7-964bc1182017', '2026-11-17', '14:50', '15:30', 'Panel & Q&A', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', 'Michael Rivera; Vincent Hegarty; Sophie Attwood; Arooj Abid', null, null, 111),
    ('8509febf-a1b4-488d-ae3f-bf56778b70b4', null, '2026-11-17', '14:00', '17:30', 'UNLOCKING FOOD INNOVATION IN THE GCC AND ARAB REGION: Health Claims, Regulation and Market Access', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, null, null, 112),
    ('c1f23576-919f-4817-9c89-d041228fc3e6', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '14:00', '14:20', 'Advancing Innovation-Ready Food Regulatory Systems: The Asia Food Innovation-Ready Regulatory Systems (AFIRS) Initiative', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Mustafa Sultan', null, null, 113),
    ('ff97254b-e465-479d-baa1-82cfe6810ec2', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '14:20', '14:40', 'Supporting Concerted Actions for Food Regulatory Systems Development in Africa – Serving the Development of Food and Agri-food Systems in Africa', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Mamodou Bah', null, null, 114),
    ('79207f27-9bde-4087-b733-cca0f0937f91', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '14:40', '15:00', 'Addressing Food Innovation in Africa – Transforming Food Regulatory Systems to Support Value Addition', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Hakim B. Mufumbiro', null, null, 115),
    ('acbdd4ec-9a6c-46b6-b8d7-7e1aed3fbbf5', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '15:00', '15:20', 'Considerations for the Development of a Risk-Based, Innovation Enabling Regulatory Framework for Novel Foods and Novel Ingredients in Qatar', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Dr. Muna Al Olan', null, null, 116),
    ('456017c1-2297-4eab-9ef2-7ed0ab5e12af', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '16:00', '16:30', 'Building an Innovation-Ready Food Regulatory System: Key Pillars and Enabling Conditions', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', 'Dr. Ruba Goussous', null, null, 117),
    ('05ae0f3d-dd5e-4ee5-a100-9d74da8e49ba', '8509febf-a1b4-488d-ae3f-bf56778b70b4', '2026-11-17', '16:30', '17:30', 'Roundtable: Building an Innovation-Ready Food Regulatory System', null, 'c888dbb2-13b7-4106-a1a0-c2b4221f93be', null, 'Samuel Godefroy', null, 118),
    ('c6030f9a-4609-43a4-a389-403fe1aa4d55', null, '2026-11-17', '14:00', '14:30', 'Environmental Monitoring Trends: Turning Data Into Preventive Action', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Mualla Gültan', 'Alison Watson', null, 119),
    ('01eb9314-2401-4066-b66a-f4cd401b35b0', null, '2026-11-17', '14:00', '15:00', 'Caffeine Safety: A Risk Analysis Case Study for Intelligent Regulation', null, '756ecdb5-0d56-425f-9b6d-a9b8203fe25a', 'Glen Neal', null, null, 120),
    ('4afbe9ff-41a4-4b52-aae8-a47f0d9ee068', null, '2026-11-17', '14:00', '15:00', 'Preparing for Excellence: A Practical Guide to the DM Food Elite Award', null, 'e80d80c1-8ff3-489f-9b7a-8defe31b1d40', null, null, null, 121),
    ('41a82ebc-08c9-4f12-9ecc-98ad0e3bd627', null, '2026-11-17', '14:30', '16:00', 'LAB INNOVATION SHOWCASE', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Alison Watson', null, null, 122),
    ('497f27c3-4953-447d-9fd9-2afbaca9eef5', '41a82ebc-08c9-4f12-9ecc-98ad0e3bd627', '2026-11-17', '14:30', '14:50', 'Verify, Don''t Assume: Rapid Detection of Soils and Biofilm in Food & Beverage Production', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Mariza Fraser', null, null, 123),
    ('757fbe8c-a0e6-49a7-91cb-7f226f6dfc85', '41a82ebc-08c9-4f12-9ecc-98ad0e3bd627', '2026-11-17', '14:50', '15:10', 'The Next Generation Technology for Monitoring Hygiene & Sanitation', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Minori Ohshima', null, null, 124),
    ('9ed075c5-b3f1-4685-91db-e097bb5a4b79', '41a82ebc-08c9-4f12-9ecc-98ad0e3bd627', '2026-11-17', '15:10', '15:30', 'When No Specific Microbiological Criteria Exist: A Risk-Based Regulatory Decision Framework for Testing of Novel Foods', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Blessy Melapurakkal Ravindran', null, null, 125),
    ('a49a5d41-9017-4ff5-84c8-4876cda68e6b', null, '2026-11-17', '15:30', '16:00', 'Control the Risk You Can''t See: A Farm-to-Fork Approach to Mycotoxin Management', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Rouaa Daou', null, null, 126),
    ('e61c275a-5501-4aab-a487-375613545455', null, '2026-11-17', '16:15', '17:00', 'Breaking the Contamination Chain: The Critical Role of Training in Food Transport and Cleaning', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', 'Vladimir Surcinski', null, null, 127),
    ('aa478cbc-27c3-4075-abd5-166c0779139b', null, '2026-11-17', '16:30', '18:30', 'MOVIE PREMIERE: Generation Growth - The Green Bronx Machine', null, '6aafb9f3-bb45-4d28-8773-994ae5333c46', null, null, null, 128),
    ('23dc3f27-6f9c-4699-a7e4-8ef486748db5', null, '2026-11-17', '17:00', '18:00', 'People, Culture and Actions When No One is Watching', null, '27dab9f4-8301-4c0f-be57-8a11b5ea4775', null, null, null, 129),
    ('a3984d09-4ffb-4f9a-bd18-21aa7d7579da', null, '2026-11-18', '08:30', '09:30', 'Question. Test. Verify - Can We Trust AI to Keep Food Safe?', null, '764b4243-12e9-4d8c-a48c-f0953a6612be', 'Andrew Mathieson', null, null, 130),
    ('568c37e3-27a6-44ad-97b2-d2532ae60c5b', null, '2026-11-18', '11:00', '12:00', 'What is the Cost of NOT Doing AI', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Deepa Thiagarajan', null, 'https://dubai.coresee.com/events/awmbQAg', 131),
    ('d9b52903-2359-446b-bd0d-651d550f60ff', null, '2026-11-18', '12:00', '13:00', 'ENHANCING FOOD SAFETY TRAINING OUTCOMES WITH ARTIFICIAL INTELLIGENCE', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Alison Cousins', null, 'https://teams.microsoft.com/meet/314007768709069?p=mS0k2IK4pTNm7R1tog', 132),
    ('ee341d69-27bb-4129-b551-ce08640b01cf', null, '2026-11-18', '13:00', '15:00', 'TBC', null, null, null, null, null, 133),
    ('584391be-e72d-4592-8418-d0ad2acf0cb2', 'ee341d69-27bb-4129-b551-ce08640b01cf', '2026-11-18', '13:00', '15:00', 'Road to Success for DM Food ELite', null, null, null, null, null, 134),
    ('b0456ba9-bcd7-4504-8dfb-a55ee00a303b', 'ee341d69-27bb-4129-b551-ce08640b01cf', '2026-11-18', '13:00', '13:20', 'When does Sample Size Matter in Pathogen Detection', null, null, 'Victor Bandaly', null, null, 135),
    ('cda98a8b-ef5d-42ec-8681-2df237f85112', null, '2026-11-18', '15:00', '15:30', 'When does Sample Size Matter in Pathogen Detection', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', null, null, null, 136),
    ('f5f53f3a-dbfb-499f-9843-772ed4fed28d', null, '2026-11-18', '16:00', '18:00', 'ICMSF Symposium- Moving from Data to Insights to Manage Microbiological Risks', null, null, 'Anett Winkler; Marcel Zwietering; Darrell Donahue', 'Bobby Krishna', 'https://teams.microsoft.com/meet/3713262647582487?p=JpmSC84KRDBagVR8MV', 137),
    ('00eb1629-c9ca-4b83-9adf-cd3de34f2514', 'f5f53f3a-dbfb-499f-9843-772ed4fed28d', '2026-11-18', '16:05', '16:30', 'Sampling for Pathogens: More Difficult than Finding a Needle in a Haystack', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Marcel Zwietering', null, null, 138),
    ('2ccf065b-b46a-40be-9502-16a54ae82f63', 'f5f53f3a-dbfb-499f-9843-772ed4fed28d', '2026-11-18', '16:30', '16:55', 'Environmental Monitoring: Friend or Foe?', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Anett Winkler', null, null, 139),
    ('a696755b-7246-4ab6-87a2-eaab973bc145', 'f5f53f3a-dbfb-499f-9843-772ed4fed28d', '2026-11-18', '16:55', '17:20', 'From Trends to Strategic Risk', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Darrell Donahue', null, null, 140),
    ('97bb3f81-7639-42a6-971e-fa9923b76624', null, '2026-11-18', '18:00', '18:30', 'Safety of Cell-based Meat and Novel Proteins - Latest Developments from FAO', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Masami Takeuchi', null, 'https://teams.microsoft.com/meet/39470406772207?p=DeW6JiVGVDmjqaOzq0', 141),
    ('5ab2646a-df69-4a7c-9f91-c2f55f3324ce', null, '2026-11-18', '18:30', '19:00', 'Converting AI Capabilities to Practical Business Intelligence', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Dr. Vera Dickinson', null, 'https://teams.microsoft.com/meet/3814215469428575?p=7gct7b5aEfFqqADUC4', 142),
    ('b166d242-87b4-4a42-be8b-ff62c5206e4b', null, '2026-11-18', '19:00', '20:00', 'Beyond Checklists and Algorithms: The Human Side of Effective Food Safety Auditing', null, '62a82817-79cb-4aea-b844-cdb7a0cd4e52', 'Judi Lazaro', null, 'https://teams.microsoft.com/meet/3650992098550094?p=niJVzW1yEAORre3qly', 143);

end $$;
