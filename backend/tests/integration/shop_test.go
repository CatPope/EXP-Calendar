package integration

import (
	"testing"
)

// FR-SHOP-01: 인앱 상점 — 시드 아이템 노출 (CUSTOMIZE x2, DEFENSE x1, PERSONA x1).
// FR-SHOP-03: 카테고리 3종.
func TestFR_SHOP_01_03_SeededCatalog(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("shop01")
	c.Onboard("NORMAL")
	items := c.ShopItems()
	if len(items) < 4 {
		t.Fatalf("expected >=4 seeded items (after persona redesign), got %d (%+v)", len(items), items)
	}
	cats := map[string]int{}
	for _, it := range items {
		cats[it.Category]++
		if it.Price <= 0 {
			t.Fatalf("item %s has non-positive price %d", it.Name, it.Price)
		}
	}
	for _, want := range []string{"CUSTOMIZE", "DEFENSE", "PERSONA"} {
		if cats[want] == 0 {
			t.Fatalf("missing category %s in shop: %+v", want, cats)
		}
	}
}

// 003 migration: legacy preset PERSONA items (tsundere/knight) removed.
func TestPersonaSeedHasOnlyTokenItem(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("shoplegacy")
	c.Onboard("NORMAL")
	for _, it := range c.ShopItems() {
		if it.Category == "PERSONA" && it.Effect != "persona:token" {
			t.Fatalf("legacy PERSONA item still present: %+v", it)
		}
	}
}

// FR-SHOP-01: 잔액 부족 시 구매 거절.
func TestFR_SHOP_01_InsufficientPointsRejected(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("shopins")
	c.Onboard("NORMAL")
	items := c.ShopItems()
	if len(items) == 0 {
		t.Fatal("empty shop")
	}
	_, err := c.Purchase(items[0].ID)
	if err == nil {
		t.Fatal("expected error, got success")
	}
	ae, ok := err.(*APIError)
	if !ok || ae.Code != "INSUFFICIENT_POINTS" {
		t.Fatalf("want INSUFFICIENT_POINTS, got %v", err)
	}
}

// FR-SHOP-03 + persona flow: PERSONA(persona:token) 구매 시 persona_tokens +1
// (persona_character_type 은 건드리지 않음).
func TestFR_SHOP_03_PersonaTokenItemGrantsToken(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("shopper")
	c.Onboard("NORMAL")

	for i := 0; i < 6; i++ {
		s := c.CreateSchedule("earn", "HIGH", time0Today23())
		c.CompleteSchedule(s.ID)
	}
	before := c.Me()
	if before.PersonaTokens != 0 {
		t.Fatalf("fresh persona_tokens want 0 got %d", before.PersonaTokens)
	}

	var tokenItem *Item
	for _, it := range c.ShopItems() {
		if it.Category == "PERSONA" && it.Effect == "persona:token" {
			copy := it
			tokenItem = &copy
			break
		}
	}
	if tokenItem == nil {
		t.Fatal("캐릭터 설정권 not seeded")
	}

	resp, err := c.Purchase(tokenItem.ID)
	if err != nil {
		t.Fatal(err)
	}
	if resp.RemainingPoints != before.CurrentPoints-tokenItem.Price {
		t.Fatalf("balance: want %d got %d",
			before.CurrentPoints-tokenItem.Price, resp.RemainingPoints)
	}
	after := c.Me()
	if after.PersonaTokens != 1 {
		t.Fatalf("persona_tokens want 1 got %d", after.PersonaTokens)
	}
	if after.PersonaCharacterType != before.PersonaCharacterType {
		t.Fatalf("persona_character_type must NOT change on token purchase: %q → %q",
			before.PersonaCharacterType, after.PersonaCharacterType)
	}
	// Note: stacking (>1 token via repeat purchases) cannot be verified in a
	// single test day because earning is capped at 200p/day and the token item
	// itself costs 200p. The +1 increment semantic is captured by the
	// AddPersonaTokens repo unit (UPDATE ... persona_tokens + $1).
}

// FR-SHOP-03: 비-PERSONA 구매는 persona 필드 어떤 것도 건드리지 않는다.
func TestFR_SHOP_03_NonPersonaDoesNotChangePersonaFields(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("shopnonpersona")
	c.Onboard("NORMAL")
	for i := 0; i < 3; i++ {
		s := c.CreateSchedule("earn", "HIGH", time0Today23())
		c.CompleteSchedule(s.ID)
	}
	var cust *Item
	for _, it := range c.ShopItems() {
		if it.Category == "CUSTOMIZE" {
			if cust == nil || it.Price < cust.Price {
				copy := it
				cust = &copy
			}
		}
	}
	if cust == nil {
		t.Fatal("no CUSTOMIZE item")
	}
	before := c.Me()
	if _, err := c.Purchase(cust.ID); err != nil {
		t.Fatal(err)
	}
	after := c.Me()
	if after.PersonaCharacterType != before.PersonaCharacterType {
		t.Fatalf("persona_character_type changed: %q → %q",
			before.PersonaCharacterType, after.PersonaCharacterType)
	}
	if after.PersonaTokens != before.PersonaTokens {
		t.Fatalf("persona_tokens changed: %d → %d",
			before.PersonaTokens, after.PersonaTokens)
	}
	if after.PersonaDefinition != before.PersonaDefinition {
		t.Fatal("persona_definition changed by non-persona purchase")
	}
}
