# svpn 订阅方案管理

本文档说明 `svpn profile` 的订阅方案管理命令。所有操作只修改当前 Linux 用户自己的 `~/.config/SilverVPN`，不会修改 `/etc`、系统代理、TUN、路由、DNS 或其他用户的配置。

## 查看订阅方案

```bash
svpn profile list
```

当前正在使用的方案前会显示 `*`。

## 切换订阅方案

```bash
svpn profile use 1
svpn profile use 熊猫云
```

可以按编号、完整名称、profile id 或名称片段切换。若后台正在运行，切换后会自动重启当前用户自己的后台进程以应用新配置。

## 重命名订阅方案

如果导入订阅时忘记命名，或者名称不清楚，可以后续重命名：

```bash
svpn profile rename 1 熊猫云
svpn profile rename "Custom Subscription" Grempt
svpn profile rename custom-xxxxxx 自用订阅
```

说明：

- 第一个参数可以是编号、完整名称、profile id 或唯一名称片段；
- 第二个参数是新的显示名称；
- 重命名只改当前用户自己的 profile 记录，不会影响其他用户；
- 如果重命名的是当前正在使用的方案，会同步更新当前用户自己的 settings 元数据。

## 删除订阅方案

删除非当前方案：

```bash
svpn profile delete 2
```

删除当前正在使用的方案需要显式确认：

```bash
svpn profile delete 1 --yes
```

也可以使用别名：

```bash
svpn profile rm 1 --yes
svpn profile remove 1 --yes
```

说明：

- 删除会移除当前用户自己的 profile 记录；
- 如果存在对应的本地订阅 YAML 文件，也会删除当前用户自己的该 YAML 文件；
- 删除当前正在使用的方案时，active Clash 配置文件会保留，避免破坏正在运行的后台进程；
- 删除当前方案后，可以通过 `svpn profile use <其他方案>` 或 `svpn import <订阅链接> <方案名>` 重新绑定保存的方案。

## 安全边界

`svpn profile rename/delete` 遵守以下边界：

- 只操作当前用户自己的 `$HOME`；
- 不写 `/etc`；
- 不修改其他用户的 `/home/<user>`；
- 不启用 TUN；
- 不修改系统路由或 DNS；
- 不影响 Slurm。
