const http = require('http');
const https = require('https');

const KCISA_KEY = '0382dec6-c0b8-49c9-b56a-2cb44fbf0b6e';

// 대학로 193개 공연장 목록 (이름 + 좌표)
const VENUES = [
  { name: 'NOL 씨어터 대학로 (구. 대학로뮤지컬센터)', short: 'NOL 씨어터 대학로', lat: 37.5803, lng: 127.0014 },
  { name: '유니플렉스', short: '유니플렉스', lat: 37.58102, lng: 127.0025 },
  { name: '링크아트센터드림', short: '링크아트센터드림', lat: 37.58129, lng: 127.0015 },
  { name: '예스24 스테이지(구. DCF대명문화공장)', short: '예스24 스테이지', lat: 37.58093, lng: 127.0025 },
  { name: '링크아트센터', short: '링크아트센터', lat: 37.58297, lng: 127.0013 },
  { name: 'JTN 아트홀(구. 대학로예술마당)', short: 'JTN 아트홀', lat: 37.58188, lng: 127.003 },
  { name: '홍익대 대학로 아트센터', short: '홍익대 대학로 아트센터', lat: 37.583, lng: 127.002 },
  { name: '예스24아트원(구.대학로아트원씨어터)', short: '예스24아트원', lat: 37.58099, lng: 127.0025 },
  { name: 'NOL 서경스퀘어(구. 서경대학교 공연예술센터)', short: 'NOL 서경스퀘어', lat: 37.58144, lng: 127.0015 },
  { name: '한예극장', short: '한예극장', lat: 37.58188, lng: 127.003 },
  { name: '동양예술극장(구. 아트센터K)', short: '동양예술극장', lat: 37.58297, lng: 127.0013 },
  { name: '티오엠씨어터(구. 문화공간필링)', short: '티오엠씨어터', lat: 37.58065, lng: 127.0028 },
  { name: '민송아트홀 (구. 브로드웨이아트홀)', short: '민송아트홀', lat: 37.583, lng: 127.0022 },
  { name: '링크더스페이스(LINK THE SPACE)', short: '링크더스페이스', lat: 37.58065, lng: 127.0028 },
  { name: '동덕여대공연예술센터', short: '동덕여대공연예술센터', lat: 37.58138, lng: 127.0015 },
  { name: '한성아트홀(구. 인켈아트홀)', short: '한성아트홀', lat: 37.5813, lng: 127.0012 },
  { name: '미마지아트센터', short: '미마지아트센터', lat: 37.5845, lng: 127.0012 },
  { name: '명작극장 (구. 아츠플레이씨어터)', short: '명작극장', lat: 37.5808, lng: 127.0028 },
  { name: '대학로 판타스틱전용관', short: '대학로 판타스틱전용관', lat: 37.5832, lng: 127.0022 },
  { name: '학전 (폐관)', short: '학전', lat: 37.58108, lng: 127.0025 },
  { name: '대학로스타시티', short: '대학로스타시티', lat: 37.58179, lng: 127.0018 },
  { name: '아트포레스트 아트홀', short: '아트포레스트 아트홀', lat: 37.58096, lng: 127.0025 },
  { name: '라이브 썸데이즈홀 (구. 이수ENT)', short: '라이브 썸데이즈홀', lat: 37.5812, lng: 127.0025 },
  { name: '대학로 스카이씨어터', short: '대학로 스카이씨어터', lat: 37.58086, lng: 127.0028 },
  { name: '굿씨어터', short: '굿씨어터', lat: 37.583, lng: 127.0022 },
  { name: '플러스씨어터(구. 컬처스페이스 엔유 구. 쁘티첼 씨어터)', short: '플러스씨어터', lat: 37.58129, lng: 127.0025 },
  { name: '올웨이즈 씨어터(구.아티스탄홀)', short: '올웨이즈 씨어터', lat: 37.581, lng: 127.0019 },
  { name: '나인진홀 (구.청년극장)', short: '나인진홀', lat: 37.58141, lng: 127.0015 },
  { name: '파랑새극장(구. 샘터파랑새극장)', short: '파랑새극장', lat: 37.5813, lng: 127.0016 },
  { name: '하마씨어터(구. 가든씨어터)', short: '하마씨어터', lat: 37.58115, lng: 127.002 },
  { name: '상명아트홀', short: '상명아트홀', lat: 37.58159, lng: 127.0015 },
  { name: '문화공간 엘림홀', short: '문화공간 엘림홀', lat: 37.58212, lng: 127.003 },
  { name: 'VERY (베리컴퍼니)', short: 'VERY', lat: 37.582, lng: 127.002 },
  { name: '세우아트센터', short: '세우아트센터', lat: 37.58117, lng: 127.0025 },
  { name: 'SH아트홀', short: 'SH아트홀', lat: 37.58135, lng: 127.0015 },
  { name: '큐씨어터(구. 수상한흥신소전용관)', short: '큐씨어터', lat: 37.58107, lng: 127.0028 },
  { name: '틴틴홀', short: '틴틴홀', lat: 37.58082, lng: 127.002 },
  { name: '봄날아트홀 (구. 아리랑소극장)', short: '봄날아트홀', lat: 37.58177, lng: 127.0015 },
  { name: '대학로 자유극장 (자유문화발전소)', short: '대학로 자유극장', lat: 37.58123, lng: 127.0025 },
  { name: '도토리씨어터', short: '도토리씨어터', lat: 37.58099, lng: 127.0025 },
  { name: '대학로 극장가게 (구. 문씨어터, 구. 지구인씨어터)', short: '대학로 극장가게', lat: 37.58106, lng: 127.002 },
  { name: '순위아트홀1관 [대학로]', short: '순위아트홀1관 [대학로]', lat: 37.58103, lng: 127.002 },
  { name: '대학로 두레홀 3관', short: '대학로 두레홀 3관', lat: 37.5805, lng: 127.0028 },
  { name: 'D:BASE (디:베이스)', short: 'D:BASE', lat: 37.58088, lng: 127.002 },
  { name: '아트하우스', short: '아트하우스', lat: 37.58088, lng: 127.002 },
  { name: '대학로 A아트홀(구. 신연아트홀)', short: '대학로 A아트홀', lat: 37.58129, lng: 127.0015 },
  { name: '올림아트센터 (구.스튜디오76)', short: '올림아트센터', lat: 37.58227, lng: 127.003 },
  { name: '라온아트홀', short: '라온아트홀', lat: 37.58103, lng: 127.002 },
  { name: '제나아트홀 (구. 룸씨어터)', short: '제나아트홀', lat: 37.58106, lng: 127.002 },
  { name: '스타스테이지', short: '스타스테이지', lat: 37.58135, lng: 127.0025 },
  { name: '브릭스씨어터 (구. 콘텐츠 그라운드 구. 브로드웨이아트홀 [3관])', short: '브릭스씨어터', lat: 37.58105, lng: 127.0022 },
  { name: '예그린씨어터', short: '예그린씨어터', lat: 37.5815, lng: 127.0015 },
  { name: '해피씨어터', short: '해피씨어터', lat: 37.58085, lng: 127.002 },
  { name: '스콘뮤직홀', short: '스콘뮤직홀', lat: 37.58144, lng: 127.0015 },
  { name: '원패스아트홀 [폐관]', short: '원패스아트홀 [폐관]', lat: 37.58135, lng: 127.0025 },
  { name: '비유아트홀(구. 효천아트센터 그라운드씬)', short: '비유아트홀', lat: 37.58191, lng: 127.0005 },
  { name: 'JS아트홀 (구. 고스트씨어터 구.다소니씨어터)', short: 'JS아트홀', lat: 37.58162, lng: 127.0015 },
  { name: '씨어터 벙커', short: '씨어터 벙커', lat: 37.58188, lng: 127.003 },
  { name: '콘텐츠박스(구. 르메이에르 씨어터)', short: '콘텐츠박스', lat: 37.58165, lng: 127.0015 },
  { name: '극장 온 (ON) (구.CJ아지트)', short: '극장 온', lat: 37.58117, lng: 127.0025 },
  { name: '에이치씨어터', short: '에이치씨어터', lat: 37.58212, lng: 127.003 },
  { name: '라이프 씨어터', short: '라이프 씨어터', lat: 37.58088, lng: 127.0011 },
  { name: '스튜디오 블루', short: '스튜디오 블루', lat: 37.5805, lng: 127.0028 },
  { name: '졸탄극장', short: '졸탄극장', lat: 37.58224, lng: 127.003 },
  { name: '내유외강씨어터(구. 익스트림씨어터 1관)', short: '내유외강씨어터', lat: 37.5811, lng: 127.0018 },
  { name: '지인시어터(구. 알과핵소극장)', short: '지인시어터', lat: 37.58135, lng: 127.0015 },
  { name: 'JCC 아트센터', short: 'JCC 아트센터', lat: 37.58377, lng: 127.0015 },
  { name: '올래홀', short: '올래홀', lat: 37.58082, lng: 127.002 },
  { name: '공간아울', short: '공간아울', lat: 37.5812, lng: 127.0017 },
  { name: '보라 아트홀(구. 지구인아트홀, 구. 해오름 예술극장)', short: '보라 아트홀', lat: 37.5826, lng: 127.0008 },
  { name: '마루아트홀', short: '마루아트홀', lat: 37.5808, lng: 127.0028 },
  { name: '후암스튜디오(후암아트홀)', short: '후암스튜디오', lat: 37.58179, lng: 127.0018 },
  { name: '윈씨어터(구. 대학로갈갈이홀)', short: '윈씨어터', lat: 37.58083, lng: 127.0028 },
  { name: '대학로 무하아트센터', short: '대학로 무하아트센터', lat: 37.58206, lng: 127.003 },
  { name: '연극플레이스 혜화', short: '연극플레이스 혜화', lat: 37.58083, lng: 127.0028 },
  { name: '초록씨어터', short: '초록씨어터', lat: 37.5811, lng: 127.0018 },
  { name: '파랑씨어터 (구. 도향아트홀, 구. 뮤디스홀)', short: '파랑씨어터', lat: 37.58098, lng: 127.0028 },
  { name: '타이니앨리스', short: '타이니앨리스', lat: 37.58179, lng: 127.0018 },
  { name: '바탕골소극장', short: '바탕골소극장', lat: 37.58085, lng: 127.002 },
  { name: 'JH아트홀', short: 'JH아트홀', lat: 37.58062, lng: 127.0028 },
  { name: '업스테이지 (UP Stage)', short: '업스테이지', lat: 37.58123, lng: 127.0015 },
  { name: '이수스타홀', short: '이수스타홀', lat: 37.5812, lng: 127.0025 },
  { name: '서연아트홀 (구. 인아소극장)', short: '서연아트홀', lat: 37.58135, lng: 127.003 },
  { name: '열린극장', short: '열린극장', lat: 37.58375, lng: 127.0002 },
  { name: '동숭무대소극장', short: '동숭무대소극장', lat: 37.585, lng: 127.0015 },
  { name: '루미나아트홀 (구.시온아트홀)', short: '루미나아트홀', lat: 37.58086, lng: 127.0028 },
  { name: '한국방송통신대학교', short: '한국방송통신대학교', lat: 37.582, lng: 127.0018 },
  { name: '중앙대학교 공연예술원', short: '중앙대학교 공연예술원', lat: 37.58188, lng: 127.003 },
  { name: '룸어씨어터', short: '룸어씨어터', lat: 37.5808, lng: 127.0028 },
  { name: '익스트림씨어터 3관', short: '익스트림씨어터 3관', lat: 37.58175, lng: 127.00305 },
  { name: '노들장애인야학', short: '노들장애인야학', lat: 37.58135, lng: 127.0015 },
  { name: '삼형제극장(환상극장)', short: '삼형제극장', lat: 37.58206, lng: 127.003 },
  { name: '선돌극장', short: '선돌극장', lat: 37.58405, lng: 127.0008 },
  { name: 'R&J씨어터(구. 연진아트홀)', short: 'R&J씨어터', lat: 37.58012, lng: 127.0025 },
  { name: '드림시어터 [대학로]', short: '드림시어터 [대학로]', lat: 37.58115, lng: 127.002 },
  { name: '한양레퍼토리씨어터', short: '한양레퍼토리씨어터', lat: 37.583, lng: 127.0022 },
  { name: '대학로 위로홀(구. 몬스터홀)', short: '대학로 위로홀', lat: 37.58162, lng: 127.0015 },
  { name: '코델아트홀', short: '코델아트홀', lat: 37.58174, lng: 127.0015 },
  { name: 'SJA HALL', short: 'SJA HALL', lat: 37.58135, lng: 127.0003 },
  { name: '컬쳐씨어터(구. 휴먼시어터)', short: '컬쳐씨어터', lat: 37.5805, lng: 127.0028 },
  { name: '예술공간 서울', short: '예술공간 서울', lat: 37.58182, lng: 127.0005 },
  { name: '정극장 (구. M시어터, 구.하모니아트홀)', short: '정극장', lat: 37.58117, lng: 127.0025 },
  { name: '예술공간 유비누리 앱질 전용관', short: '예술공간 유비누리 앱질 전용관', lat: 37.58086, lng: 127.0028 },
  { name: '후암스테이지', short: '후암스테이지', lat: 37.58179, lng: 127.0018 },
  { name: '우리소극장 [대학로]', short: '우리소극장 [대학로]', lat: 37.58188, lng: 127.003 },
  { name: '씨어터 쿰', short: '씨어터 쿰', lat: 37.5817, lng: 127.0026 },
  { name: '예술공간 혜화', short: '예술공간 혜화', lat: 37.58379, lng: 127.001 },
  { name: '청운예술극장(구. 글로브극장)', short: '청운예술극장', lat: 37.58255, lng: 127.00145 },
  { name: '다케이씨어터 (구. 창조소극장, 구. 민아트홀)', short: '다케이씨어터', lat: 37.5815, lng: 127.0013 },
  { name: '달밤엔씨어터', short: '달밤엔씨어터', lat: 37.58324, lng: 127.0013 },
  { name: '나온씨어터', short: '나온씨어터', lat: 37.58441, lng: 127.001 },
  { name: '소극장 혜화당 (구. 까망소극장)', short: '소극장 혜화당', lat: 37.58099, lng: 127.0025 },
  { name: '소극장 축제', short: '소극장 축제', lat: 37.58204, lng: 127.0018 },
  { name: '예술공간 오르다(구. 우석레파토리극장)', short: '예술공간 오르다', lat: 37.58188, lng: 127.003 },
  { name: '탑아트홀', short: '탑아트홀', lat: 37.58156, lng: 127.0015 },
  { name: '씨어터조이 (구. 마당세실극장)', short: '씨어터조이', lat: 37.58224, lng: 127.003 },
  { name: '후암씨어터(콘텐츠룸)', short: '후암씨어터', lat: 37.58179, lng: 127.0018 },
  { name: '소극장 다르게놀자', short: '소극장 다르게놀자', lat: 37.58177, lng: 127.0015 },
  { name: '성균소극장', short: '성균소극장', lat: 37.58206, lng: 127.0005 },
  { name: '대학로 마로니에소극장(플레이더씨어터)', short: '대학로 마로니에소극장', lat: 37.5815, lng: 127.0015 },
  { name: '연우소극장', short: '연우소극장', lat: 37.58353, lng: 127.0015 },
  { name: '아름다운극장', short: '아름다운극장', lat: 37.58182, lng: 127.0005 },
  { name: '단막극장(구.대학로단막극장)', short: '단막극장', lat: 37.58268, lng: 127.0025 },
  { name: '대학로 달달씨어터', short: '대학로 달달씨어터', lat: 37.5809, lng: 127.001 },
  { name: '스폿라이트', short: '스폿라이트', lat: 37.58111, lng: 127.001 },
  { name: '나인 씨어터', short: '나인 씨어터', lat: 37.5808, lng: 127.0028 },
  { name: '우리네 극장', short: '우리네 극장', lat: 37.58165, lng: 127.0015 },
  { name: '호은아트홀 (구. 키득키득아트홀)', short: '호은아트홀', lat: 37.58144, lng: 127.0015 },
  { name: '제이원 씨어터 (구. 서완소극장, 구. 씨어터고리)', short: '제이원 씨어터', lat: 37.58124, lng: 127.0011 },
  { name: '정보소극장', short: '정보소극장', lat: 37.58144, lng: 127.0025 },
  { name: '아루또소극장 (구. 소담소극장, 구. 코메디컬센터)', short: '아루또소극장', lat: 37.58074, lng: 127.0028 },
  { name: '더 씨어터', short: '더 씨어터', lat: 37.58205, lng: 127.0026 },
  { name: '달빛극장', short: '달빛극장', lat: 37.5836, lng: 127.0008 },
  { name: '샤봉디씨어터', short: '샤봉디씨어터', lat: 37.58082, lng: 127.0011 },
  { name: '아스가르드 씨어터 (구. 낙산씨어터)', short: '아스가르드 씨어터', lat: 37.5812, lng: 127.0015 },
  { name: '공공그라운드', short: '공공그라운드', lat: 37.5813, lng: 127.0016 },
  { name: '피카소소극장', short: '피카소소극장', lat: 37.58224, lng: 127.0018 },
  { name: '지즐소극장', short: '지즐소극장', lat: 37.58182, lng: 127.0005 },
  { name: '댕로홀', short: '댕로홀', lat: 37.5812, lng: 127.0025 },
  { name: '극장 동국', short: '극장 동국', lat: 37.5815, lng: 127.0013 },
  { name: '스튜디오SK', short: '스튜디오SK', lat: 37.58215, lng: 127.0005 },
  { name: '노을소극장', short: '노을소극장', lat: 37.58068, lng: 127.0028 },
  { name: '한얼소극장', short: '한얼소극장', lat: 37.58401, lng: 127.0015 },
  { name: '소극장 무극', short: '소극장 무극', lat: 37.58204, lng: 127.0018 },
  { name: '소극장 공유', short: '소극장 공유', lat: 37.5835, lng: 127.0016 },
  { name: '소극장 꿈꾸는 공작소', short: '소극장 꿈꾸는 공작소', lat: 37.5831, lng: 127.0026 },
  { name: '오마이갓 전용관', short: '오마이갓 전용관', lat: 37.58144, lng: 127.0015 },
  { name: '소극장 플랫폼74', short: '소극장 플랫폼74', lat: 37.58162, lng: 127.0015 },
  { name: '연극실험실 혜화동1번지', short: '연극실험실 혜화동1번지', lat: 37.58371, lng: 127.0015 },
  { name: '진건아트홀', short: '진건아트홀', lat: 37.58227, lng: 127.0018 },
  { name: '미래아트홀', short: '미래아트홀', lat: 37.58368, lng: 127.0015 },
  { name: '안똔체홉극장', short: '안똔체홉극장', lat: 37.58179, lng: 127.0005 },
  { name: '해바라기소극장 (구. 훈아트홀)', short: '해바라기소극장', lat: 37.58168, lng: 127.0015 },
  { name: '동화소극장', short: '동화소극장', lat: 37.58188, lng: 127.0005 },
  { name: '물빛극장', short: '물빛극장', lat: 37.58077, lng: 127.0028 },
  { name: '대학로 김대범소극장', short: '대학로 김대범소극장', lat: 37.58179, lng: 127.0018 },
  { name: '써드베란다', short: '써드베란다', lat: 37.58225, lng: 127.00175 },
  { name: '최일화 스튜디오', short: '최일화 스튜디오', lat: 37.5822, lng: 127.00195 },
  { name: '풍월관', short: '풍월관', lat: 37.58405, lng: 127.0 },
  { name: '소울소극장', short: '소울소극장', lat: 37.58288, lng: 127.0013 },
  { name: 'Abnormal필운', short: 'Abnormal필운', lat: 37.5824, lng: 127.00105 },
  { name: '스페이스 아이', short: '스페이스 아이', lat: 37.58173, lng: 127.0018 },
  { name: '맛있는 극장', short: '맛있는 극장', lat: 37.581, lng: 127.0044 },
  { name: '국민대학교 제로원디자인센터', short: '국민대학교 제로원디자인센터', lat: 37.58126, lng: 127.0015 },
  { name: '홍해성 소극장', short: '홍해성 소극장', lat: 37.58132, lng: 127.0015 },
  { name: '예술공간 라푸푸', short: '예술공간 라푸푸', lat: 37.58232, lng: 127.0025 },
  { name: '북극곰소극장(구.아뮤스소극장)', short: '북극곰소극장', lat: 37.5822, lng: 127.00195 },
  { name: 'NC문화재단 홀', short: 'NC문화재단 홀', lat: 37.5817, lng: 127.003 },
  { name: '뮤지컬펍 커튼콜', short: '뮤지컬펍 커튼콜', lat: 37.58096, lng: 127.0025 },
  { name: '허수아비소극장', short: '허수아비소극장', lat: 37.58179, lng: 127.0005 },
  { name: '클래식고택 [경복궁]', short: '클래식고택 [경복궁]', lat: 37.5801, lng: 127.0004 },
  { name: '신명나눔 공간 마루채', short: '신명나눔 공간 마루채', lat: 37.5829, lng: 127.0007 },
  { name: '카페CIRCA1950', short: '카페CIRCA1950', lat: 37.58095, lng: 127.001 },
  { name: '스케치홀 (구.소극장 선물 1관)', short: '스케치홀', lat: 37.58135, lng: 127.0015 },
  { name: '사사사가', short: '사사사가', lat: 37.58155, lng: 127.00185 },
  { name: '명륜아트홀', short: '명륜아트홀', lat: 37.58194, lng: 127.0005 },
  { name: 'et theatre 1 (구. 눈빛극장)', short: 'et theatre 1', lat: 37.5845, lng: 127.0012 },
  { name: '시윤아트홀', short: '시윤아트홀', lat: 37.5813, lng: 127.0016 },
  { name: '모모씨어터', short: '모모씨어터', lat: 37.58215, lng: 127.0005 },
  { name: '라온씨어터', short: '라온씨어터', lat: 37.58106, lng: 127.002 },
  { name: '정화예술대학교 대학로캠퍼스 정화1관', short: '정화예술대학교 대학로캠퍼스 정화1관', lat: 37.58123, lng: 127.002 },
  { name: '혜화아트센터', short: '혜화아트센터', lat: 37.584, lng: 127.0023 },
  { name: '브이씨어터', short: '브이씨어터', lat: 37.58155, lng: 127.0029 },
  { name: '글루호텔 블루레인라운지', short: '글루호텔 블루레인라운지', lat: 37.5797, lng: 127.00235 },
  { name: '광복극장', short: '광복극장', lat: 37.58215, lng: 127.0005 },
  { name: '쿤스트카비넷', short: '쿤스트카비넷', lat: 37.58353, lng: 127.0015 },
  { name: '대학로 스타릿홀', short: '대학로 스타릿홀', lat: 37.58083, lng: 127.0028 },
  { name: '대학로 일대', short: '대학로 일대', lat: 37.58115, lng: 127.00255 },
  { name: '김동진빌딩(서울코미디클럽)[대학로]', short: '김동진빌딩[대학로]', lat: 37.58062, lng: 127.0028 },
  { name: '동성고등학교', short: '동성고등학교', lat: 37.584, lng: 127.0023 },
  { name: '원더러스트에이앤씨 (Wonderlust A&C)', short: '원더러스트에이앤씨', lat: 37.58027, lng: 127.0025 },
  { name: '아라아트홀', short: '아라아트홀', lat: 37.5808, lng: 127.0028 },
  { name: '소극장 선물 2관', short: '소극장 선물 2관', lat: 37.5813, lng: 127.0016 },
];

function getTagValue(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function parseXML(xml, tag) {
  const results = [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let match;
  while ((match = regex.exec(xml)) !== null) results.push(match[1]);
  return results;
}

function fetchAPI(keyword) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(keyword);
    const url = `https://api.kcisa.kr/openapi/CNV_060/request?serviceKey=${KCISA_KEY}&pageNo=1&numOfRows=10&keyword=${encoded}`;
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const today = getTodayStr();
    const seenTitles = new Set();
    const allPerfs = [];

    // 193개 공연장 병렬 검색 (배치로 나눠서)
    const BATCH = 20;
    for (let i = 0; i < VENUES.length; i += BATCH) {
      const batch = VENUES.slice(i, i + BATCH);
      await Promise.all(batch.map(async (venue) => {
        try {
          const xml = await fetchAPI(venue.short);
          const items = parseXML(xml, 'item');
          for (const item of items) {
            const title = getTagValue(item, 'title');
            const eventSite = getTagValue(item, 'eventSite');
            const eventPeriod = getTagValue(item, 'eventPeriod');

            // 공연장 이름 매칭 확인
            const shortName = venue.short.replace(/\s/g, '');
            const siteClean = eventSite.replace(/\s/g, '');
            if (!siteClean.includes(shortName.slice(0, 5)) && 
                !shortName.includes(siteClean.slice(0, 5))) continue;

            // 날짜 필터 (현재 이후)
            const endDate = eventPeriod.split('~').pop().trim().replace(/\s/g, '');
            if (endDate && endDate < today) continue;

            const key = `${title}-${eventSite}`;
            if (seenTitles.has(key)) continue;
            seenTitles.add(key);

            // 날짜 파싱
            const dates = eventPeriod.split('~').map(s => s.trim());
            const startDate = dates[0] ? `${dates[0].slice(0,4)}.${dates[0].slice(4,6)}.${dates[0].slice(6,8)}` : '';
            const endDateFmt = dates[1] ? `${dates[1].slice(0,4)}.${dates[1].slice(4,6)}.${dates[1].slice(6,8)}` : '';

            allPerfs.push({
              id: key,
              name: title,
              startDate,
              endDate: endDateFmt,
              venue: eventSite || venue.name,
              genre: getTagValue(item, 'type') || '공연',
              status: endDate >= today ? (dates[0] <= today ? '공연중' : '공연예정') : '공연종료',
              poster: getTagValue(item, 'imageObject'),
              url: getTagValue(item, 'url'),
              lat: venue.lat,
              lng: venue.lng,
            });
          }
        } catch(e) {}
      }));
    }

    res.status(200).json({
      success: true,
      total: allPerfs.length,
      data: allPerfs
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
