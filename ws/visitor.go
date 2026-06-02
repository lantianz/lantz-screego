package ws

import (
	"fmt"
	"strings"

	"github.com/rs/xid"
)

func normalizeVisitorID(visitorID string, fallback xid.ID) string {
	normalized := strings.TrimSpace(visitorID)
	if normalized == "" {
		return fallback.String()
	}
	return normalized
}

func guestName(index int) string {
	return fmt.Sprintf("访客%d", index)
}

func (r *Room) nextGuestName(visitorID string) string {
	known := map[string]string{}
	used := map[string]bool{}
	for _, user := range r.Users {
		if user.VisitorID != "" {
			known[user.VisitorID] = user.Name
		}
		used[user.Name] = true
	}
	if name := known[visitorID]; name != "" {
		return name
	}

	for index := 1; ; index++ {
		name := guestName(index)
		if !used[name] {
			return name
		}
	}
}

func (r *Room) visitorOwner(visitorID string) bool {
	if visitorID == "" {
		return false
	}
	for _, user := range r.Users {
		if user.VisitorID == visitorID && user.Owner {
			return true
		}
	}
	return false
}

func (r *Room) hasVisitor(visitorID string) bool {
	if visitorID == "" {
		return false
	}
	for _, user := range r.Users {
		if user.VisitorID == visitorID {
			return true
		}
	}
	return false
}
