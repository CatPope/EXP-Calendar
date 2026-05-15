package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Respond(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

func RespondErr(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
