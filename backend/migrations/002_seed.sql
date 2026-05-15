-- Seed: titles (master) + shop items
INSERT INTO titles (name, grade, color_hex, description, condition) VALUES
    ('첫걸음',              'COMMON',    '#06D6A0', '레벨 3 달성',                  'LEVEL:3'),
    ('초보 모험가',         'COMMON',    '#06D6A0', '레벨 5 달성',                  'LEVEL:5'),
    ('성실한 자',           'RARE',      '#8B5CF6', '레벨 10 달성',                 'LEVEL:10'),
    ('달인',                'EPIC',      '#FFD700', '레벨 20 달성',                 'LEVEL:20'),
    ('전설의 시간 마법사',  'LEGENDARY', '#FF6B6B', '레벨 50 달성',                 'LEVEL:50'),
    ('꾸준한 자',           'RARE',      '#8B5CF6', '7일 연속 일정 완료',            'STREAK:7')
ON CONFLICT (name) DO NOTHING;

INSERT INTO items (name, category, price, description, effect) VALUES
    ('캐릭터 컬러: 시안',   'CUSTOMIZE', 100, '캐릭터 색상을 시안으로 변경합니다.',         'color:cyan'),
    ('캐릭터 컬러: 골드',   'CUSTOMIZE', 200, '캐릭터 색상을 골드로 변경합니다.',           'color:gold'),
    ('등급 하락 방어권',     'DEFENSE',   300, '페널티 1회를 방어합니다.',                    'defense:1'),
    ('페르소나: 츤데레',     'PERSONA',   150, '페르소나 말투를 츤데레로 변경합니다.',        'persona:tsundere'),
    ('페르소나: 용감한 기사','PERSONA',   150, '페르소나 말투를 용감한 기사로 변경합니다.',   'persona:knight')
ON CONFLICT (name) DO NOTHING;
