# 上线前备份与回滚预案

## 上线前备份

1. 导出应用数据

```bash
curl -sS -H "Cookie: <session-cookie>" http://localhost/api/backup/export > backup-before-release.json
```

2. 备份数据库快照

```bash
docker compose exec -T db pg_dump -U postgres knowledge_graph > db-before-release.sql
```

## 回滚流程

1. 停止应用容器

```bash
docker compose stop app nginx
```

2. 恢复数据库

```bash
cat db-before-release.sql | docker compose exec -T db psql -U postgres -d knowledge_graph
```

3. 重启旧版本容器

```bash
docker compose up -d app nginx
```

4. 执行烟雾测试

```bash
./scripts/smoke-test.sh http://localhost
```
