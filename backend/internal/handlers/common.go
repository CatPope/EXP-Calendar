package handlers

import (
	"net/http"
	"reflect"

	"github.com/gin-gonic/gin"
)

// Respond writes a {"data": ...} envelope. Nil slices/maps are normalized to
// empty containers so the frontend can always iterate/spread the result.
func Respond(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": normalizeNilContainer(data)})
}

func RespondErr(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

// BindAndValidate binds the JSON request body into *T and runs an optional
// validator. On failure it writes a BAD_REQUEST envelope and returns (nil, false)
// so the caller can simply `if !ok { return }`.
//
// validator may be nil when only JSON shape validation is required.
func BindAndValidate[T any](c *gin.Context, validator func(*T) error) (*T, bool) {
	var v T
	if err := c.ShouldBindJSON(&v); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return nil, false
	}
	if validator != nil {
		if err := validator(&v); err != nil {
			RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
			return nil, false
		}
	}
	return &v, true
}

func normalizeNilContainer(data any) any {
	if data == nil {
		return []any{}
	}
	v := reflect.ValueOf(data)
	switch v.Kind() {
	case reflect.Slice:
		if v.IsNil() {
			return reflect.MakeSlice(v.Type(), 0, 0).Interface()
		}
	case reflect.Map:
		if v.IsNil() {
			return reflect.MakeMap(v.Type()).Interface()
		}
	}
	return data
}
