package auth

import "golang.org/x/crypto/bcrypt"

// 데모/개발용 cost. 운영 전환 시 DefaultCost 이상으로 상향 필요.
const bcryptCost = bcrypt.MinCost

// HashPassword 는 평문 비밀번호를 bcrypt 로 해시한다.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// VerifyPassword 는 저장된 hash 와 입력 평문이 일치하면 true.
// hash 가 빈 문자열이면 false 를 반환한다 — 호출자가 "해시가 없는 사용자"
// 분기를 별도로 처리해야 한다.
func VerifyPassword(hash, plain string) bool {
	if hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
