package ws

import (
	"fmt"
)

func init() {
	register("join", func() Event {
		return &Join{}
	})
}

type Join struct {
	ID        string `json:"id"`
	UserName  string `json:"username,omitempty"`
	VisitorID string `json:"visitorId,omitempty"`
}

func (e *Join) Execute(rooms *Rooms, current ClientInfo) error {
	if rooms.connected[current.ID] != "" {
		return fmt.Errorf("cannot join room, you are already in one")
	}

	id, err := normalizeRoomID(e.ID)
	if err != nil {
		return err
	}
	e.ID = id

	room, ok := rooms.Rooms[e.ID]
	if !ok {
		return fmt.Errorf("room with id %s does not exist", e.ID)
	}
	visitorID := normalizeVisitorID(e.VisitorID, current.ID)
	name := room.nextGuestName(visitorID)

	room.Users[current.ID] = &User{
		ID:        current.ID,
		VisitorID: visitorID,
		Name:      name,
		Streaming: false,
		Owner:     room.visitorOwner(visitorID),
		Addr:      current.Addr,
		_write:    current.Write,
	}
	rooms.connected[current.ID] = room.ID
	room.notifyInfoChanged()
	usersJoinedTotal.Inc()

	v4, v6, err := rooms.config.TurnIPProvider.Get()
	if err != nil {
		return err
	}

	for _, user := range room.Users {
		if current.ID == user.ID || !user.Streaming {
			continue
		}
		room.newSession(user.ID, current.ID, rooms, v4, v6)
	}

	return nil
}
