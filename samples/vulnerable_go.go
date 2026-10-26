package main

import (
	"database/sql"
	"fmt"
	"os/exec"
)

// 1. Command injection via shell wrapper
func executeCommand(userInput string) {
	cmd := exec.Command("sh", "-c", userInput)
	_ = cmd.Run() // Also ignores error return
}

// 2. SQL injection via fmt.Sprintf
func queryUser(db *sql.DB, userId string) (*sql.Rows, error) {
	query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userId)
	return db.Query(query)
}

// 3. Performance issue: String += in loop
func buildReport(items []string) string {
	s := ""
	for i := 0; i < len(items); i++ {
		s += items[i] // O(N^2) reallocation
	}
	return s
}
