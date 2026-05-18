사용자가 "반영", "commit", "push", "커밋", "푸시", "PR 올려", "PR 생성" 등 코드 반영을 요청하면 아래 파이프라인을 전체 실행한다. 중간 단계에서 멈추지 않는다.

1. 새 브랜치 생성 (기존 작업 브랜치가 있으면 그대로 사용, 브랜치명은 <type>/<part>-<설명> 형식 준수)
2. 변경 파일 stage + commit (Conventional Commits 형식, 제목 50자 이내)
3. push (`-u origin`)
4. `gh pr create` — `.github/pull_request_template.md` 템플릿의 모든 필드를 채워서 PR 생성
5. PR URL을 사용자에게 보고
