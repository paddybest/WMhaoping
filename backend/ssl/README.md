# SSL 证书目录

请在此目录放置您的 SSL 证书文件：

- `cert.pem` - 服务器证书
- `key.pem` - 私钥

如果您还没有 SSL 证书，可以使用 Let's Encrypt 免费获取：

```bash
# 使用 certbot 获取证书
sudo certbot certonly --nginx -d your-domain.com

# 将证书复制到此目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
```

注意：确保证书文件对所有用户可读但不可写：
```bash
chmod 644 cert.pem
chmod 600 key.pem
```