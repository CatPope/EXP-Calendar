package handlers

import (
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
