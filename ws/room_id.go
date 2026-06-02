package ws

import (
	"fmt"
	"strings"
)

const minRoomIDLength = 4

func normalizeRoomID(id string) (string, error) {
	normalized := strings.TrimSpace(id)
	if len(normalized) < minRoomIDLength {
		return "", fmt.Errorf("room id must be at least %d characters", minRoomIDLength)
	}
	return normalized, nil
}
