# Lantz Screego Deploy

服务器克隆仓库后执行。首次部署推荐用环境变量配置域名：

```bash
git clone https://github.com/lantianz/lantz-screego.git
cd lantz-screego
chmod +x deploy.sh deploy/install.sh
LANTZ_SCREEGO_DOMAIN=share.example.com ./deploy.sh
```

如果没有域名，使用公网 IP：

```bash
LANTZ_SCREEGO_EXTERNAL_IP=1.2.3.4 ./deploy.sh
```

脚本会创建 `deploy/.env`，拉取 `ghcr.io/lantianz/lantz-screego:0.0.1`，并通过 `docker compose` 启动服务。

后续更新部署直接执行同一个脚本：

```bash
git pull --ff-only
./deploy.sh
```

已有 `deploy/.env` 时，脚本会直接读取配置并更新容器，不会重新要求传域名或公网 IP。

如果你想手动改配置，可以先复制模板：

```bash
cp deploy/env.example deploy/.env
vim deploy/.env
./deploy.sh
```

1Panel 反向代理目标：

```text
http://127.0.0.1:5050
```

必须给公网域名启用 HTTPS，否则浏览器不会允许屏幕共享。

如果域名使用 Cloudflare 等 DNS/CDN，TURN 需要真实服务器地址，域名请设置为仅 DNS 解析，不要走代理。

服务器防火墙和安全组需要放行：

- `3478/tcp`
- `3478/udp`
- `5050/tcp`，仅在不使用 1Panel 反代直连时需要；直连部署请用 `./deploy.sh --http-host 0.0.0.0`

使用域名也仍然需要放行 `3478/tcp` 和 `3478/udp`。域名/HTTPS 只负责网页入口，WebRTC 在复杂网络下还需要 TURN/STUN 端口参与连接。`3478/udp` 最关键，`3478/tcp` 用于 UDP 不可用时兜底。

升级版本时编辑 `deploy/.env`：

```env
LANTZ_SCREEGO_IMAGE=ghcr.io/lantianz/lantz-screego:0.0.2
LANTZ_SCREEGO_VERSION=0.0.2
```

然后执行：

```bash
./deploy.sh
```

不要使用 `docker compose down -v` 做常规升级。
