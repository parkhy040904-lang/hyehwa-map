# 🎭 혜화공연지도 배포 가이드

## 📁 파일 구조

```
hyehwa-map/
├── api/
│   └── performances.js   ← KOPIS API 서버 (Vercel 자동 실행)
├── public/
│   └── index.html        ← 앱 화면
├── vercel.json            ← Vercel 설정
└── README.md
```

---

## 🚀 배포 순서

### STEP 1. GitHub 레포 만들기

1. **github.com** 접속 → 로그인
2. 우상단 **`+`** 버튼 → **`New repository`**
3. Repository name: `hyehwa-map`
4. Public 선택 → **`Create repository`** 클릭

---

### STEP 2. 파일 올리기

터미널(윈도우: cmd / 맥: Terminal)에서:

```bash
# 폴더 이동
cd hyehwa-map

# Git 초기화
git init
git add .
git commit -m "🎭 혜화공연지도 첫 배포"

# GitHub 연결 (본인 username으로 변경!)
git remote add origin https://github.com/[내_username]/hyehwa-map.git
git branch -M main
git push -u origin main
```

> 💡 GitHub Desktop 앱 써도 돼요! 드래그앤드롭으로 올릴 수 있어요.

---

### STEP 3. Vercel 배포

1. **vercel.com** 접속 → **`Sign Up`**
2. **`Continue with GitHub`** 선택 (GitHub 계정으로 로그인)
3. 로그인 후 **`Add New Project`** 클릭
4. `hyehwa-map` 레포 찾아서 **`Import`** 클릭
5. 설정은 건드리지 말고 그냥 **`Deploy`** 클릭!
6. 🎉 배포 완료! `https://hyehwa-map.vercel.app` 같은 URL 생성됨

---

### STEP 4. 확인

배포된 URL 접속하면 바로 작동해요!
- 지도에 혜화 공연 핀들이 뜨면 성공 ✅
- 공연 목록 스크롤해서 확인
- 필터 눌러보기

---

## 🔄 코드 수정 후 재배포

파일 수정하고 GitHub에 push하면 Vercel이 **자동으로 재배포**해요!

```bash
git add .
git commit -m "UI 수정"
git push
```

---

## 🔑 API 키 정보

| 항목 | 키 |
|------|-----|
| KOPIS 인증키 | `541d34303da04a91bbe6919b7f130bbc` |
| 카카오맵 JS키 | `0dad24da06c62ebf54e664a8656fb043` |

> ⚠️ 카카오맵 키는 **카카오 디벨로퍼스 > 내 애플리케이션 > 플랫폼**에서  
> 배포된 Vercel 도메인을 등록해야 지도가 제대로 작동해요!
>
> 예) `https://hyehwa-map.vercel.app` 추가

---

## 📱 카카오맵 도메인 등록 방법

1. **developers.kakao.com** 로그인
2. 내 애플리케이션 → `혜화공연지도` 클릭
3. 왼쪽 메뉴 **`플랫폼`** → **`Web`** 섹션
4. **`사이트 도메인`**에 Vercel URL 추가
   - `https://hyehwa-map.vercel.app`
5. 저장!

---

## ❓ 문제 해결

**지도가 안 보여요**
→ 카카오맵 도메인 등록했는지 확인!

**공연 목록이 안 나와요**
→ Vercel 대시보드 → Functions 탭에서 에러 로그 확인

**배포가 안 돼요**
→ `vercel.json` 파일이 `hyehwa-map` 폴더 최상단에 있는지 확인!
