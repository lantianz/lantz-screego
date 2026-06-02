# Lantz Screego

基于 [screego/server](https://github.com/screego/server/) 的二次开发版本，保留 Screego 的 WebRTC 屏幕共享核心和 Docker/单二进制部署路径，重做了中英文界面、交互布局和批注工具。

## Features

- 多人低延迟屏幕共享
- WebRTC 传输与内置 TURN 服务
- 默认中文界面，支持英文切换
- HeroUI v3 前端界面
- 房间内画笔、橡皮、撤销和清空批注
- 保留 Docker 镜像与单二进制发布方式

## Development

```powershell
go mod download
cd ui
yarn
yarn build
yarn testformat
cd ..
go build ./...
go test ./...
```

本地运行：

```powershell
$env:SCREEGO_EXTERNAL_IP="127.0.0.1"
$env:SCREEGO_SERVER_ADDRESS="127.0.0.1:5050"
$env:SCREEGO_AUTH_MODE="none"
go run . serve
```

打开 `http://127.0.0.1:5050`。

## Docker Release

镜像发布沿用 Screego 的 GoReleaser 流程：先构建 `ui/build` 和 Go 二进制，再由 `.goreleaser.yml` 使用 `Dockerfile` 打包。当前配置会在 tag release 时推送到：

```text
ghcr.io/<github-owner>/<github-repo>:<tag>
```

`Dockerfile` 不是独立多阶段构建文件，直接 `docker build .` 需要根目录已有 `screego` 二进制；推荐通过 GitHub Actions / GoReleaser 构建镜像。

## Server Deploy

服务器克隆仓库后可直接执行一键部署脚本：

```bash
git clone https://github.com/lantianz/lantz-screego.git
cd lantz-screego
chmod +x deploy.sh deploy/install.sh
./deploy.sh --domain share.example.com
```

1Panel 反向代理目标为 `http://127.0.0.1:5050`，公网域名必须启用 HTTPS。更多配置见 [deploy/README.md](deploy/README.md)。

## Upstream

核心服务来自 [screego/server](https://github.com/screego/server/)。配置项仍沿用 Screego 的环境变量与 `screego.config.example`。
