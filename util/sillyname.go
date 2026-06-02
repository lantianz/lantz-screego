package util

import (
	cryptorand "crypto/rand"
	"fmt"
	"io"
	mathrand "math/rand"
)

var userAdjectives = []string{
	"清晰", "稳定", "可靠", "高效", "专注", "友好", "灵活", "敏捷", "耐心", "协同",
	"认真", "从容", "直接", "明亮", "简洁", "稳妥", "可信", "积极", "细致", "准时",
}

var userNouns = []string{
	"成员", "访客", "用户", "观众", "伙伴", "协作者", "参与者", "同事", "演示者", "观察者",
}

func r(r *mathrand.Rand, l []string) string {
	return l[r.Intn(len(l)-1)]
}

func NewUserName(s *mathrand.Rand) string {
	return r(s, userAdjectives) + r(s, userNouns)
}

func NewRoomName(s *mathrand.Rand) string {
	var bytes [16]byte
	if _, err := io.ReadFull(cryptorand.Reader, bytes[:]); err != nil {
		for i := range bytes {
			if s != nil {
				bytes[i] = byte(s.Intn(256))
			} else {
				bytes[i] = byte(mathrand.Intn(256))
			}
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80

	return fmt.Sprintf(
		"%08x-%04x-%04x-%04x-%012x",
		bytes[0:4],
		bytes[4:6],
		bytes[6:8],
		bytes[8:10],
		bytes[10:16],
	)
}
